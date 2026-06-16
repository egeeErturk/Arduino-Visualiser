import { create } from "zustand";
import { catalogByType, componentCatalog } from "../../shared/catalog";
import { cloneProject, createComponentFromDefinition, createEmptyProject, createId, serializeProject } from "../../shared/project";
import { validateProject } from "../../shared/validation";
import type {
  CircuitProject,
  CircuitProjectMetadata,
  EditorSelection,
  Position,
  ValidationWarning,
} from "../../shared/types";

type PendingPin = { componentId: string; pinId: string } | null;

interface EditorState {
  project: CircuitProject;
  filePath: string | null;
  dirty: boolean;
  selection: EditorSelection;
  pendingPin: PendingPin;
  warnings: ValidationWarning[];
  highlightedWarningId: string | null;
  importModalOpen: boolean;
  importText: string;
  importError: string | null;
  historyPast: CircuitProject[];
  historyFuture: CircuitProject[];
  transientMoveSnapshot: CircuitProject | null;
  setProject(
    project: CircuitProject,
    options?: { filePath?: string | null; dirty?: boolean; resetHistory?: boolean; pushCurrentToHistory?: boolean },
  ): void;
  mutateProject(
    recipe: (draft: CircuitProject) => void,
    options?: { recordHistory?: boolean; markDirty?: boolean; clearFuture?: boolean },
  ): void;
  setSelection(selection: EditorSelection): void;
  setPendingPin(pin: PendingPin): void;
  addComponent(type: string, position: Position): void;
  queuePin(componentId: string, pinId: string): void;
  renameComponent(componentId: string, name: string): void;
  deleteSelected(): void;
  deleteConnection(connectionId: string): void;
  updateConnectionColor(connectionId: string, color: string): void;
  setViewport(viewport: CircuitProject["viewport"]): void;
  updateComponentPosition(componentId: string, position: Position): void;
  beginMoveSnapshot(): void;
  finalizeMoveSnapshot(): void;
  undo(): void;
  redo(): void;
  setImportModalOpen(open: boolean): void;
  setImportText(value: string): void;
  setImportError(value: string | null): void;
  setHighlightedWarning(id: string | null): void;
  updateMetadata(metadata: Partial<CircuitProjectMetadata>): void;
}

function withUpdatedTimestamp(project: CircuitProject) {
  project.metadata.updatedAt = new Date().toISOString();
}

function validate(project: CircuitProject) {
  return validateProject(project);
}

function getNextPlacementPosition(project: CircuitProject, requested: Position): Position {
  const matchingCount = project.components.filter(
    (component) =>
      Math.abs(component.position.x - requested.x) < 12 &&
      Math.abs(component.position.y - requested.y) < 12,
  ).length;

  if (matchingCount === 0) {
    return requested;
  }

  const offset = 36;
  return {
    x: requested.x + matchingCount * offset,
    y: requested.y + matchingCount * offset,
  };
}

export const useCircuitStore = create<EditorState>((set, get) => ({
  project: createEmptyProject(),
  filePath: null,
  dirty: false,
  selection: null,
  pendingPin: null,
  warnings: validate(createEmptyProject()),
  highlightedWarningId: null,
  importModalOpen: false,
  importText: "",
  importError: null,
  historyPast: [],
  historyFuture: [],
  transientMoveSnapshot: null,
  setProject(project, options) {
    set((state) => ({
      ...state,
      project: cloneProject(project),
      filePath: options?.filePath ?? state.filePath,
      dirty: options?.dirty ?? state.dirty,
      selection: null,
      pendingPin: null,
      warnings: validate(project),
      highlightedWarningId: null,
      historyPast: options?.resetHistory
        ? []
        : options?.pushCurrentToHistory
          ? [...state.historyPast, cloneProject(state.project)]
          : state.historyPast,
      historyFuture: options?.resetHistory ? [] : state.historyFuture,
      transientMoveSnapshot: null,
    }));
  },
  mutateProject(recipe, options) {
    const current = cloneProject(get().project);
    const before = cloneProject(get().project);
    recipe(current);
    withUpdatedTimestamp(current);
    const shouldRecordHistory = options?.recordHistory !== false;
    const shouldClearFuture = options?.clearFuture ?? shouldRecordHistory;
    set((state) => ({
      ...state,
      project: current,
      dirty: options?.markDirty ?? true,
      warnings: validate(current),
      historyPast: shouldRecordHistory ? [...state.historyPast, before] : state.historyPast,
      historyFuture: shouldClearFuture ? [] : state.historyFuture,
    }));
  },
  setSelection(selection) {
    set((state) => ({ ...state, selection }));
  },
  setPendingPin(pin) {
    set((state) => ({ ...state, pendingPin: pin }));
  },
  addComponent(type, position) {
    const definition = catalogByType[type];
    if (!definition) {
      return;
    }
    get().mutateProject((draft) => {
      const nextPosition = getNextPlacementPosition(draft, position);
      const component = createComponentFromDefinition(definition, nextPosition);
      draft.components.push(component);
    });
  },
  queuePin(componentId, pinId) {
    const pendingPin = get().pendingPin;
    if (!pendingPin) {
      set((state) => ({ ...state, pendingPin: { componentId, pinId } }));
      return;
    }

    if (pendingPin.componentId === componentId && pendingPin.pinId === pinId) {
      set((state) => ({ ...state, pendingPin: null }));
      return;
    }

    get().mutateProject((draft) => {
      draft.connections.push({
        id: createId("connection"),
        fromComponentId: pendingPin.componentId,
        fromPinId: pendingPin.pinId,
        toComponentId: componentId,
        toPinId: pinId,
        color: "#f97316",
      });
    });
    set((state) => ({
      ...state,
      pendingPin: null,
      selection: null,
    }));
  },
  renameComponent(componentId, name) {
    get().mutateProject((draft) => {
      const component = draft.components.find((candidate) => candidate.id === componentId);
      if (component) {
        component.name = name;
      }
    });
  },
  deleteSelected() {
    const selection = get().selection;
    if (!selection) {
      return;
    }
    get().mutateProject((draft) => {
      if (selection.type === "component") {
        draft.components = draft.components.filter((component) => component.id !== selection.id);
        draft.connections = draft.connections.filter(
          (connection) => connection.fromComponentId !== selection.id && connection.toComponentId !== selection.id,
        );
      }

      if (selection.type === "connection") {
        draft.connections = draft.connections.filter((connection) => connection.id !== selection.id);
      }
    });
    set((state) => ({ ...state, selection: null }));
  },
  deleteConnection(connectionId) {
    get().mutateProject((draft) => {
      draft.connections = draft.connections.filter((connection) => connection.id !== connectionId);
    });
  },
  updateConnectionColor(connectionId, color) {
    get().mutateProject((draft) => {
      const connection = draft.connections.find((candidate) => candidate.id === connectionId);
      if (connection) {
        connection.color = color;
      }
    });
  },
  setViewport(viewport) {
    get().mutateProject((draft) => {
      draft.viewport = viewport;
    }, { recordHistory: false, markDirty: false });
  },
  updateComponentPosition(componentId, position) {
    const moveSnapshot = get().transientMoveSnapshot;
    if (!moveSnapshot) {
      set((state) => ({ ...state, transientMoveSnapshot: cloneProject(state.project) }));
    }
    get().mutateProject((draft) => {
      const component = draft.components.find((candidate) => candidate.id === componentId);
      if (component) {
        component.position = position;
      }
    }, { recordHistory: false });
  },
  beginMoveSnapshot() {
    if (!get().transientMoveSnapshot) {
      set((state) => ({ ...state, transientMoveSnapshot: cloneProject(state.project) }));
    }
  },
  finalizeMoveSnapshot() {
    const snapshot = get().transientMoveSnapshot;
    if (!snapshot) {
      return;
    }
    set((state) => ({
      ...state,
      historyPast: [...state.historyPast, snapshot],
      historyFuture: [],
      transientMoveSnapshot: null,
      dirty: true,
    }));
  },
  undo() {
    const { historyPast, project } = get();
    const previous = historyPast.at(-1);
    if (!previous) {
      return;
    }
    set((state) => ({
      ...state,
      project: cloneProject(previous),
      warnings: validate(previous),
      historyPast: state.historyPast.slice(0, -1),
      historyFuture: [cloneProject(project), ...state.historyFuture],
      selection: null,
      pendingPin: null,
      dirty: true,
    }));
  },
  redo() {
    const { historyPast, historyFuture, project } = get();
    const next = historyFuture[0];
    if (!next) {
      return;
    }
    set((state) => ({
      ...state,
      project: cloneProject(next),
      warnings: validate(next),
      historyPast: [...historyPast, cloneProject(project)],
      historyFuture: state.historyFuture.slice(1),
      selection: null,
      pendingPin: null,
      dirty: true,
    }));
  },
  setImportModalOpen(open) {
    set((state) => ({ ...state, importModalOpen: open, importError: open ? state.importError : null }));
  },
  setImportText(value) {
    set((state) => ({ ...state, importText: value }));
  },
  setImportError(value) {
    set((state) => ({ ...state, importError: value }));
  },
  setHighlightedWarning(id) {
    set((state) => ({
      ...state,
      highlightedWarningId: id,
      selection: id ? { type: "warning", id } : state.selection,
    }));
  },
  updateMetadata(metadata) {
    get().mutateProject((draft) => {
      draft.metadata = { ...draft.metadata, ...metadata };
    }, { recordHistory: false });
  },
}));

export const componentLibrary = componentCatalog;

export function exportProjectJson() {
  return serializeProject(useCircuitStore.getState().project);
}

export function replaceLoadedProject(project: CircuitProject, filePath: string | null, dirty = false) {
  useCircuitStore.getState().setProject(project, {
    filePath,
    dirty,
    pushCurrentToHistory: true,
  });
}

export function restoreInitialProject(project: CircuitProject, filePath: string | null, dirty = false) {
  useCircuitStore.getState().setProject(project, {
    filePath,
    dirty,
    resetHistory: true,
  });
}

export function markProjectSaved(project: CircuitProject, filePath: string | null) {
  useCircuitStore.getState().setProject(project, {
    filePath,
    dirty: false,
    resetHistory: false,
    pushCurrentToHistory: false,
  });
}
