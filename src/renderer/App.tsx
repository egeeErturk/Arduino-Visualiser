import { useEffect, useEffectEvent, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Clipboard,
  CodeXml,
  Download,
  FileInput,
  FolderOpen,
  Hammer,
  Import,
  Info,
  Library,
  Moon,
  RotateCcw,
  RotateCw,
  Save,
  SaveAll,
  Settings,
  Sun,
  Trash2,
  Usb,
} from "lucide-react";
import { generateArduinoSketch } from "../shared/arduinoSketch";
import { catalogByType } from "../shared/catalog";
import { createEmptyProject, parseProjectJson, serializeProject } from "../shared/project";
import { confirmDiscard, downloadJson, downloadTextFile, getAutosave, readJsonFileFromBrowser, setAutosave } from "./lib/desktop";
import CircuitCanvas from "./components/CircuitCanvas";
import { useCircuitStore, componentLibrary, markProjectSaved, replaceLoadedProject, restoreInitialProject } from "./store/useCircuitStore";
import "./styles.css";

export default function App() {
  const project = useCircuitStore((state) => state.project);
  const dirty = useCircuitStore((state) => state.dirty);
  const filePath = useCircuitStore((state) => state.filePath);
  const selection = useCircuitStore((state) => state.selection);
  const warnings = useCircuitStore((state) => state.warnings);
  const highlightedWarningId = useCircuitStore((state) => state.highlightedWarningId);
  const setSelection = useCircuitStore((state) => state.setSelection);
  const setPendingPin = useCircuitStore((state) => state.setPendingPin);
  const addComponent = useCircuitStore((state) => state.addComponent);
  const deleteSelected = useCircuitStore((state) => state.deleteSelected);
  const deleteConnection = useCircuitStore((state) => state.deleteConnection);
  const renameComponent = useCircuitStore((state) => state.renameComponent);
  const updateConnectionColor = useCircuitStore((state) => state.updateConnectionColor);
  const setImportModalOpen = useCircuitStore((state) => state.setImportModalOpen);
  const importModalOpen = useCircuitStore((state) => state.importModalOpen);
  const importText = useCircuitStore((state) => state.importText);
  const setImportText = useCircuitStore((state) => state.setImportText);
  const importError = useCircuitStore((state) => state.importError);
  const setImportError = useCircuitStore((state) => state.setImportError);
  const setProject = useCircuitStore((state) => state.setProject);
  const undo = useCircuitStore((state) => state.undo);
  const redo = useCircuitStore((state) => state.redo);
  const historyPast = useCircuitStore((state) => state.historyPast);
  const historyFuture = useCircuitStore((state) => state.historyFuture);
  const setHighlightedWarning = useCircuitStore((state) => state.setHighlightedWarning);
  const updateMetadata = useCircuitStore((state) => state.updateMetadata);

  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [feedback, setFeedback] = useState("Ready.");
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") {
      return "light";
    }
    return window.localStorage.getItem("arduino-theme") === "dark" ? "dark" : "light";
  });

  const selectedComponent = selection?.type === "component"
    ? project.components.find((component) => component.id === selection.id) ?? null
    : null;
  const selectedConnection = selection?.type === "connection"
    ? project.connections.find((connection) => connection.id === selection.id) ?? null
    : null;

  const warningLookup = warnings.find((warning) => warning.id === highlightedWarningId) ?? null;
  const generatedSketch = useMemo(() => generateArduinoSketch(project), [project]);

  const componentConnections = useMemo(() => {
    if (!selectedComponent) {
      return [];
    }
    return selectedComponent.pins.map((pin) => {
      const related = project.connections.filter(
        (connection) =>
          (connection.fromComponentId === selectedComponent.id && connection.fromPinId === pin.id) ||
          (connection.toComponentId === selectedComponent.id && connection.toPinId === pin.id),
      );
      return {
        pin,
        related: related.map((connection) => {
          const isSource = connection.fromComponentId === selectedComponent.id && connection.fromPinId === pin.id;
          const otherComponentId = isSource ? connection.toComponentId : connection.fromComponentId;
          const otherPinId = isSource ? connection.toPinId : connection.fromPinId;
          const otherComponent = project.components.find((component) => component.id === otherComponentId);
          const otherPin = otherComponent?.pins.find((candidate) => candidate.id === otherPinId);
          return {
            connection,
            otherComponent,
            otherPin,
          };
        }),
      };
    });
  }, [project.components, project.connections, selectedComponent]);

  useEffect(() => {
    const autosave = async () => {
      await setAutosave(serializeProject(project));
    };
    void autosave();
  }, [project]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("arduino-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (window.desktop?.setDirtyState) {
      window.desktop.setDirtyState(dirty);
    }
  }, [dirty]);

  useEffect(() => {
    const restore = async () => {
      const backup = await getAutosave();
      if (!backup) {
        return;
      }
      try {
        const restored = parseProjectJson(backup);
        restoreInitialProject(restored, null, false);
        setFeedback("Recovered autosave backup.");
      } catch {
        setFeedback("Skipped invalid autosave backup.");
      }
    };
    void restore();
  }, []);

  const handleKeyboardShortcut = useEffectEvent(async (event: KeyboardEvent) => {
    const isMeta = event.ctrlKey || event.metaKey;
    if (isMeta && event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (event.shiftKey) {
        await handleSaveAs();
      } else {
        await handleSave();
      }
    }
    if (isMeta && event.key.toLowerCase() === "o") {
      event.preventDefault();
      await handleOpen();
    }
    if (isMeta && event.key.toLowerCase() === "e") {
      event.preventDefault();
      await handleExport();
    }
    if (isMeta && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
    }
    if (isMeta && event.key.toLowerCase() === "y") {
      event.preventDefault();
      redo();
    }
    if (event.key === "Escape") {
      setPendingPin(null);
      setSelection(null);
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      const active = document.activeElement?.tagName;
      if (active !== "INPUT" && active !== "TEXTAREA") {
        deleteSelected();
      }
    }
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      void handleKeyboardShortcut(event);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  async function maybeDiscardChanges() {
    if (!dirty) {
      return true;
    }
    return confirmDiscard("You have unsaved changes. Discard them and continue?");
  }

  async function handleNewProject() {
    const allow = await maybeDiscardChanges();
    if (!allow) {
      return;
    }
    setProject(createEmptyProject(), { filePath: null, dirty: false, resetHistory: true });
    setFeedback("Started a new circuit.");
  }

  async function handleOpen() {
    const allow = await maybeDiscardChanges();
    if (!allow) {
      return;
    }

    try {
      if (window.desktop) {
        const result = await window.desktop.openCircuit();
        if (result.canceled || !result.projectJson) {
          return;
        }
        const loaded = parseProjectJson(result.projectJson);
        replaceLoadedProject(loaded, result.filePath ?? null, false);
        setFeedback(`Opened ${result.filePath?.split(/[\\/]/).pop() ?? "circuit file"}.`);
        return;
      }

      const json = await readJsonFileFromBrowser();
      if (!json) {
        return;
      }
      replaceLoadedProject(parseProjectJson(json), null, false);
      setFeedback("Opened circuit JSON.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to open circuit.");
    }
  }

  async function handleSave() {
    const projectJson = serializeProject(project);
    const defaultName = project.metadata.name.trim() || "arduino-circuit";

    if (window.desktop && filePath) {
      const result = await window.desktop.saveCircuit({ filePath, projectJson });
      if (!result.canceled) {
        markProjectSaved(project, result.filePath ?? filePath);
        setFeedback("Saved circuit.");
      }
      return;
    }

    await handleSaveAs(defaultName);
  }

  async function handleSaveAs(defaultName?: string) {
    const projectJson = serializeProject(project);
    const baseName = defaultName ?? (project.metadata.name.trim() || "arduino-circuit");

    if (window.desktop) {
      const result = await window.desktop.saveCircuitAs({ defaultName: baseName, projectJson });
      if (!result.canceled) {
        markProjectSaved(project, result.filePath ?? null);
        setFeedback("Saved circuit as file.");
      }
      return;
    }

    downloadJson(baseName, projectJson);
    markProjectSaved(project, null);
    setFeedback("Downloaded circuit JSON.");
  }

  async function handleExport() {
    const projectJson = serializeProject(project);
    const baseName = `${project.metadata.name.trim() || "arduino-circuit"}-export`;
    if (window.desktop) {
      const result = await window.desktop.exportCircuit({ defaultName: baseName, projectJson });
      if (!result.canceled) {
        setFeedback("Exported circuit JSON.");
      }
      return;
    }
    downloadJson(baseName, projectJson);
    setFeedback("Downloaded export JSON.");
  }

  async function handleImportFromFile() {
    try {
      const projectJson = window.desktop
        ? (await window.desktop.importCircuit()).projectJson ?? null
        : await readJsonFileFromBrowser();
      if (!projectJson) {
        return;
      }
      const imported = parseProjectJson(projectJson);
      replaceLoadedProject(imported, null, true);
      setFeedback("Imported circuit JSON.");
      setImportModalOpen(false);
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Failed to import JSON.");
    }
  }

  function handleImportFromText() {
    try {
      const imported = parseProjectJson(importText);
      replaceLoadedProject(imported, null, true);
      setImportModalOpen(false);
      setImportError(null);
      setFeedback("Imported JSON from pasted text.");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Invalid JSON.");
    }
  }

  async function handleCopyGeneratedCode() {
    try {
      await navigator.clipboard.writeText(generatedSketch.code);
      setFeedback("Copied starter Arduino sketch to clipboard.");
    } catch {
      setFeedback("Could not copy code automatically. Please copy it manually from the modal.");
    }
  }

  async function handleSaveGeneratedCode() {
    const defaultName = generatedSketch.fileName.replace(/\.ino$/i, "");

    if (window.desktop) {
      const result = await window.desktop.exportSketch({
        defaultName,
        sketchCode: generatedSketch.code,
      });
      if (!result.canceled) {
        setFeedback("Saved Arduino sketch as .ino.");
      }
      return;
    }

    downloadTextFile(defaultName, generatedSketch.code, "ino", "text/plain");
    setFeedback("Downloaded Arduino sketch as .ino.");
  }

  return (
    <div className="app-frame">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Usb size={18} /></div>
          <div>
            <h1>Arduino Circuit Visualizer</h1>
            <p>{dirty ? "Unsaved changes" : "All changes saved"}{filePath ? ` | ${filePath.split(/[\\/]/).pop()}` : ""}</p>
          </div>
        </div>
        <div className="toolbar">
          <ToolbarButton icon={<FileInput size={16} />} label="New" onClick={handleNewProject} title="New circuit" />
          <ToolbarButton icon={<FolderOpen size={16} />} label="Open" onClick={handleOpen} title="Open circuit" />
          <ToolbarButton icon={<Save size={16} />} label="Save" onClick={() => void handleSave()} title="Save (Ctrl/Cmd+S)" />
          <ToolbarButton icon={<SaveAll size={16} />} label="Save As" onClick={() => void handleSaveAs()} title="Save As (Ctrl/Cmd+Shift+S)" />
          <ToolbarButton icon={<Download size={16} />} label="Export" onClick={() => void handleExport()} title="Export JSON (Ctrl/Cmd+E)" />
          <ToolbarButton icon={<Import size={16} />} label="Import" onClick={() => setImportModalOpen(true)} title="Import JSON" />
          <ToolbarButton icon={<CodeXml size={16} />} label="Generate Code" onClick={() => setCodeModalOpen(true)} title="Generate Arduino starter code" />
          <ToolbarButton icon={<RotateCcw size={16} />} label="Undo" onClick={undo} disabled={historyPast.length === 0} title="Undo (Ctrl/Cmd+Z)" />
          <ToolbarButton icon={<RotateCw size={16} />} label="Redo" onClick={redo} disabled={historyFuture.length === 0} title="Redo (Ctrl/Cmd+Shift+Z / Ctrl/Cmd+Y)" />
          <ToolbarButton icon={<Library size={16} />} label="Library" onClick={() => setLeftPanelOpen((value) => !value)} title="Toggle component library" />
          <ToolbarButton icon={<Info size={16} />} label="Inspector" onClick={() => setRightPanelOpen((value) => !value)} title="Toggle inspector" />
          <ToolbarButton icon={<AlertTriangle size={16} />} label="Warnings" onClick={() => setRightPanelOpen(true)} title="Focus warnings" />
          <ToolbarButton
            icon={theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            label={theme === "light" ? "Dark" : "Light"}
            onClick={() => setTheme((value) => (value === "light" ? "dark" : "light"))}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          />
          <ToolbarButton icon={<Settings size={16} />} label="Settings" onClick={() => setFeedback("Settings panel placeholder: desktop preferences can be added here.")} title="Settings" />
        </div>
      </header>

      <div className="workspace-grid">
        {leftPanelOpen && (
          <aside className="side-panel left-panel">
            <div className="panel-title">
              <Library size={16} />
              <h2>Component Library</h2>
            </div>
            <p className="panel-copy">Drag components into the canvas or click to place them near the current viewport center.</p>
            {Array.from(new Set(componentLibrary.map((item) => item.category))).map((category) => (
              <section key={category} className="library-group">
                <h3>{category}</h3>
                <div className="library-list">
                  {componentLibrary.filter((item) => item.category === category).map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      className="library-card"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("application/x-component-type", item.type);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() =>
                        addComponent(item.type, {
                          x: (project.viewport.x * -1 + 420) / project.viewport.zoom,
                          y: (project.viewport.y * -1 + 220) / project.viewport.zoom,
                        })}
                    >
                      <span className="swatch" style={{ background: item.accent }} />
                      <span className="library-card-copy">
                        <strong>{item.name}</strong>
                        <small>{item.category} | {item.pins.length} pins</small>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </aside>
        )}

        <main className="canvas-shell">
          <div className="canvas-header">
            <div>
              <h2>{project.metadata.name}</h2>
              <p>{feedback}</p>
            </div>
            <input
              className="project-name-input"
              aria-label="Project name"
              value={project.metadata.name}
              onChange={(event) => updateMetadata({ name: event.target.value })}
            />
          </div>

          <div className="warning-panel">
            {warnings.map((warning) => (
              <button
                key={warning.id}
                type="button"
                className={`warning-chip severity-${warning.severity} ${highlightedWarningId === warning.id ? "active" : ""}`}
                onClick={() => {
                  setHighlightedWarning(warning.id);
                  setSelection({ type: "warning", id: warning.id });
                }}
                title={warning.description}
              >
                <AlertTriangle size={14} />
                <span>{warning.title}</span>
              </button>
            ))}
            {warnings.length === 0 && <div className="warning-chip severity-ok">No educational warnings right now.</div>}
          </div>

          <div className="canvas-area">
            <CircuitCanvas />
            {!project.components.length && (
              <div className="empty-state">
                <h3>Start building visually</h3>
                <p>Drag components from the sidebar and connect pins to build a circuit.</p>
              </div>
            )}
          </div>
        </main>

        {rightPanelOpen && (
          <aside className="side-panel right-panel">
            <div className="panel-title">
              <Info size={16} />
              <h2>Inspector</h2>
            </div>

            {selectedComponent && (
              <div className="inspector-stack">
                <div className="inspector-card">
                  <div className="inspector-card-header">
                    <div>
                      <h3>{selectedComponent.name}</h3>
                      <p>{catalogByType[selectedComponent.type]?.name ?? selectedComponent.type}</p>
                    </div>
                    <span className="inspector-chip">{selectedComponent.category}</span>
                  </div>
                  <label>
                    <span>Name</span>
                    <input value={selectedComponent.name} onChange={(event) => renameComponent(selectedComponent.id, event.target.value)} />
                  </label>
                  <dl className="detail-grid">
                    <div><dt>Type</dt><dd>{catalogByType[selectedComponent.type]?.name ?? selectedComponent.type}</dd></div>
                    <div><dt>Category</dt><dd>{selectedComponent.category}</dd></div>
                    <div><dt>Position</dt><dd>{Math.round(selectedComponent.position.x)}, {Math.round(selectedComponent.position.y)}</dd></div>
                    <div><dt>Pins</dt><dd>{selectedComponent.pins.length}</dd></div>
                    <div><dt>Connections</dt><dd>{componentConnections.reduce((sum, row) => sum + row.related.length, 0)}</dd></div>
                  </dl>
                  <button type="button" className="danger-button" onClick={deleteSelected}>
                    <Trash2 size={14} /> Delete component
                  </button>
                </div>

                <div className="inspector-card">
                  <h3>Pin Table</h3>
                  <div className="pin-table">
                    {componentConnections.map(({ pin, related }) => (
                      <div key={pin.id} className="pin-row">
                        <div className="pin-row-meta">
                          <strong>{pin.label}</strong>
                          <small>{pin.kind} | {pin.direction}</small>
                        </div>
                        <div className="pin-row-links">
                          {related.length === 0 && <span className="status-pill">Not connected</span>}
                          {related.map(({ connection, otherComponent, otherPin }) => (
                            <span key={connection.id} className="connection-action">
                              <button
                                type="button"
                                className="connection-link"
                                onClick={() => setSelection({ type: "connection", id: connection.id })}
                              >
                                <span className="color-dot" style={{ background: connection.color }} />
                                {otherComponent?.name ?? "Unknown"} {otherPin?.label ?? "Pin"}
                              </button>
                              <button
                                type="button"
                                className="mini-delete"
                                aria-label={`Delete ${pin.label} connection`}
                                title="Delete connection"
                                onClick={() => deleteConnection(connection.id)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedConnection && (() => {
              const sourceComponent = project.components.find((component) => component.id === selectedConnection.fromComponentId);
              const targetComponent = project.components.find((component) => component.id === selectedConnection.toComponentId);
              const sourcePin = sourceComponent?.pins.find((pin) => pin.id === selectedConnection.fromPinId);
              const targetPin = targetComponent?.pins.find((pin) => pin.id === selectedConnection.toPinId);
              return (
                <div className="inspector-card">
                  <h3>Connection</h3>
                  <dl className="detail-grid">
                    <div><dt>Source</dt><dd>{sourceComponent?.name} | {sourcePin?.label}</dd></div>
                    <div><dt>Source kind</dt><dd>{sourcePin?.kind} | {sourcePin?.direction}</dd></div>
                    <div><dt>Target</dt><dd>{targetComponent?.name} | {targetPin?.label}</dd></div>
                    <div><dt>Target kind</dt><dd>{targetPin?.kind} | {targetPin?.direction}</dd></div>
                  </dl>
                  <label>
                    <span>Wire color</span>
                    <input type="color" value={selectedConnection.color} onChange={(event) => updateConnectionColor(selectedConnection.id, event.target.value)} />
                  </label>
                  <button type="button" className="danger-button" onClick={deleteSelected}>
                    <Trash2 size={14} /> Delete connection
                  </button>
                </div>
              );
            })()}

            {selection?.type === "warning" && warningLookup && (
              <div className="inspector-card">
                <div className={`warning-summary severity-${warningLookup.severity}`}>
                  <AlertTriangle size={16} />
                  <strong>{warningLookup.title}</strong>
                </div>
                <p>{warningLookup.description}</p>
                <small>Affected components: {warningLookup.componentIds.length || "none"}</small>
              </div>
            )}

            {!selection && (
              <div className="inspector-card">
                <h3>No selection</h3>
                <p>Select a component, wire, or warning to inspect it.</p>
              </div>
            )}
          </aside>
        )}
      </div>

      {importModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="import-title">
            <div className="modal-header">
              <h2 id="import-title">Import Circuit JSON</h2>
              <button type="button" onClick={() => setImportModalOpen(false)}>Close</button>
            </div>
            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder="Paste circuit JSON here"
            />
            {importError && <p className="error-text">{importError}</p>}
            <div className="modal-actions">
              <button type="button" onClick={() => void handleImportFromFile()}><Import size={14} /> Import File</button>
              <button type="button" className="primary-button" onClick={handleImportFromText}><Hammer size={14} /> Apply JSON</button>
            </div>
          </div>
        </div>
      )}

      {codeModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card code-modal-card" role="dialog" aria-modal="true" aria-labelledby="codegen-title">
            <div className="modal-header">
              <div>
                <h2 id="codegen-title">Generated Arduino Code</h2>
                <p className="modal-copy">Generated code is a starter template and may require manual refinement.</p>
              </div>
              <button type="button" onClick={() => setCodeModalOpen(false)}>Close</button>
            </div>

            <div className="codegen-summary">
              <span className="inspector-chip">{generatedSketch.analysis.board?.name ?? "No Arduino detected"}</span>
              <span className="status-pill">LEDs: {generatedSketch.analysis.ledBindings.length}</span>
              <span className="status-pill">Buttons: {generatedSketch.analysis.buttonBindings.length}</span>
              <span className="status-pill">Servos: {generatedSketch.analysis.servoBindings.length}</span>
              <span className="status-pill">Pots: {generatedSketch.analysis.potentiometerBindings.length}</span>
              <span className="status-pill">Buzzers: {generatedSketch.analysis.buzzerBindings.length}</span>
              <span className="status-pill">Ultrasonic: {generatedSketch.analysis.ultrasonicBindings.length}</span>
            </div>

            <pre className="code-output"><code>{generatedSketch.code}</code></pre>

            <div className="modal-actions">
              <button type="button" onClick={() => void handleCopyGeneratedCode()}><Clipboard size={14} /> Copy</button>
              <button type="button" className="primary-button" onClick={() => void handleSaveGeneratedCode()}><Save size={14} /> Save .ino</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
  disabled,
  title,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title: string;
}) {
  return (
    <button type="button" className="toolbar-button" onClick={onClick} disabled={disabled} title={title} aria-label={label}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
