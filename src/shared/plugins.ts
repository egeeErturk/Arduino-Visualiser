import { boardCatalog } from "./boards.js";
import { componentCatalog } from "./catalog.js";
import type {
  BoardDefinition,
  BoardPlugin,
  ComponentDefinition,
  ComponentPlugin,
  GeneratorContext,
  GeneratorPlugin,
  GeneratorSection,
  PinDefinition,
  PluginRuntimeState,
  RuntimePluginRecord,
  RuntimeValidationRule,
  ValidationPlugin,
  ValidationWarning,
} from "./types.js";

const builtinBoardPlugins: BoardPlugin[] = boardCatalog.map((board) => ({
  kind: "board",
  id: `board:${board.type}`,
  board,
}));

const builtinComponentPlugins: ComponentPlugin[] = componentCatalog.map((component) => ({
  kind: "component",
  id: `component:${component.type}`,
  component,
}));

let runtimeState: PluginRuntimeState = {
  pluginDirectory: "",
  loadedAt: new Date(0).toISOString(),
  loaded: [],
  failures: [],
};

function toGeneratorPlugin(record: RuntimePluginRecord): GeneratorPlugin[] {
  return (record.manifest.generators ?? []).map((generator) => ({
    kind: "generator" as const,
    id: `${record.manifest.id}:${generator.id}`,
    supports: (componentType: string) => generator.supportedComponentTypes.includes(componentType),
    buildSection: (): GeneratorSection => ({
      includes: generator.includes ?? [],
      definitions: generator.definitions ?? [],
      setup: generator.setup ?? [],
      loop: generator.loop ?? [],
      notes: generator.notes ?? [],
    }),
  }));
}

function buildWarningsFromRule(
  rule: RuntimeValidationRule,
  project: GeneratorContext["project"],
): ValidationWarning[] {
  if (rule.type === "max-component-count") {
    const matching = project.components.filter((component) => rule.componentTypes.includes(component.type));
    const maxCount = rule.maxCount ?? 0;
    if (matching.length <= maxCount) {
      return [];
    }
    return [{
      id: `${rule.id}:max-component-count`,
      severity: rule.severity,
      title: rule.title,
      description: `${rule.description} Current count: ${matching.length}. Configured limit: ${maxCount}.`,
      componentIds: matching.map((component) => component.id),
      connectionIds: [],
      pinRefs: [],
    }];
  }

  const warnings: ValidationWarning[] = [];
  for (const component of project.components.filter((candidate) => rule.componentTypes.includes(candidate.type))) {
    const targetPins = component.pins.filter((pin) => !rule.pinIds || rule.pinIds.includes(pin.id));
    const missingPins = targetPins.filter((pin) => {
      return !project.connections.some((connection) =>
        (connection.fromComponentId === component.id && connection.fromPinId === pin.id) ||
        (connection.toComponentId === component.id && connection.toPinId === pin.id),
      );
    });

    if (missingPins.length === 0) {
      continue;
    }

    warnings.push({
      id: `${rule.id}:${component.id}`,
      severity: rule.severity,
      title: rule.title,
      description: `${rule.description} Missing: ${missingPins.map((pin) => pin.label).join(", ")}.`,
      componentIds: [component.id],
      connectionIds: [],
      pinRefs: missingPins.map((pin) => ({ componentId: component.id, pinId: pin.id })),
    });
  }

  return warnings;
}

function toValidationPlugin(record: RuntimePluginRecord): ValidationPlugin[] {
  return (record.manifest.validations ?? []).map((validation) => ({
    kind: "validation" as const,
    id: `${record.manifest.id}:${validation.id}`,
    validate: (project) => validation.rules.flatMap((rule) => buildWarningsFromRule(rule, project)),
  }));
}

function dedupeByType<T extends { type: string }>(definitions: T[]) {
  const byType = new Map<string, T>();
  for (const definition of definitions) {
    byType.set(definition.type, definition);
  }
  return [...byType.values()];
}

export function setRuntimePluginState(nextState: PluginRuntimeState) {
  runtimeState = nextState;
}

export function getRuntimePluginState() {
  return runtimeState;
}

export function getBoardCatalog(): BoardDefinition[] {
  const runtimeBoards = runtimeState.loaded.flatMap((record) => record.manifest.boards ?? []);
  return dedupeByType([...boardCatalog, ...runtimeBoards]);
}

export function getComponentCatalog(): ComponentDefinition[] {
  const runtimeComponents = runtimeState.loaded.flatMap((record) => record.manifest.components ?? []);
  return dedupeByType([...componentCatalog, ...runtimeComponents]);
}

export function getCatalogByType() {
  return Object.fromEntries(getComponentCatalog().map((definition) => [definition.type, definition]));
}

export function getBoardByType() {
  return Object.fromEntries(getBoardCatalog().map((board) => [board.type, board]));
}

export function getBoardPlugins(): BoardPlugin[] {
  const runtimeBoards = runtimeState.loaded.flatMap((record) =>
    (record.manifest.boards ?? []).map((board) => ({
      kind: "board" as const,
      id: `${record.manifest.id}:board:${board.type}`,
      board,
    })),
  );
  return [...builtinBoardPlugins, ...runtimeBoards];
}

export function getComponentPlugins(): ComponentPlugin[] {
  const runtimeComponents = runtimeState.loaded.flatMap((record) =>
    (record.manifest.components ?? []).map((component) => ({
      kind: "component" as const,
      id: `${record.manifest.id}:component:${component.type}`,
      component,
    })),
  );
  return [...builtinComponentPlugins, ...runtimeComponents];
}

export function getGeneratorPlugins(): GeneratorPlugin[] {
  return runtimeState.loaded.flatMap((record) => toGeneratorPlugin(record));
}

export function getValidationPlugins(): ValidationPlugin[] {
  return runtimeState.loaded.flatMap((record) => toValidationPlugin(record));
}

export function isKnownPinDefinition(definition: PinDefinition) {
  return Boolean(definition.id && definition.label && definition.side && definition.kind && definition.direction);
}
