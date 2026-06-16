import { useEffect, useEffectEvent, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Clipboard,
  CodeXml,
  Download,
  FileInput,
  FolderOpen,
  Hammer,
  HelpCircle,
  Import,
  Info,
  LayoutGrid,
  Library,
  LoaderCircle,
  Moon,
  PanelBottom,
  Play,
  RotateCcw,
  RotateCw,
  Save,
  SaveAll,
  Settings,
  Sparkles,
  Square,
  Sun,
  Trash2,
  Usb,
} from "lucide-react";
import { analyzeCircuitProject } from "../shared/circuitAssistant";
import { boardByType, boardCatalog } from "../shared/boards";
import { generateArduinoSketch } from "../shared/arduinoSketch";
import { catalogByType } from "../shared/catalog";
import { createEmptyProject, parseProjectJson, serializeProject } from "../shared/project";
import { projectTemplates } from "../shared/templates";
import type { ArduinoCliConfig, ArduinoCliStatus, ArduinoDetectedPort, RecentProjectEntry } from "../shared/types";
import {
  confirmDiscard,
  downloadJson,
  downloadTextFile,
  getAutosave,
  getRecentProjects,
  readJsonFileFromBrowser,
  setAutosave,
} from "./lib/desktop";
import CircuitCanvas from "./components/CircuitCanvas";
import {
  componentLibrary,
  markProjectSaved,
  replaceLoadedProject,
  restoreInitialProject,
  useCircuitStore,
} from "./store/useCircuitStore";
import "./styles.css";

type BottomTab = "warnings" | "activity" | "code" | "assistant" | "arduino";

export default function App() {
  const project = useCircuitStore((state) => state.project);
  const dirty = useCircuitStore((state) => state.dirty);
  const filePath = useCircuitStore((state) => state.filePath);
  const selection = useCircuitStore((state) => state.selection);
  const warnings = useCircuitStore((state) => state.warnings);
  const highlightedWarningId = useCircuitStore((state) => state.highlightedWarningId);
  const connectionHint = useCircuitStore((state) => state.connectionHint);
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
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true);
  const [bottomTab, setBottomTab] = useState<BottomTab>("warnings");
  const [dashboardOpen, setDashboardOpen] = useState(true);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProjectEntry[]>([]);
  const [activityLog, setActivityLog] = useState<string[]>(["Application started."]);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("Ready.");
  const [arduinoConfig, setArduinoConfig] = useState<ArduinoCliConfig>({ cliPath: null, serialBaudRate: 9600 });
  const [arduinoStatus, setArduinoStatus] = useState<ArduinoCliStatus>({ found: false, cliPath: null, version: null, error: null });
  const [arduinoPorts, setArduinoPorts] = useState<ArduinoDetectedPort[]>([]);
  const [selectedPort, setSelectedPort] = useState("");
  const [arduinoOutput, setArduinoOutput] = useState("Arduino CLI output will appear here.");
  const [serialOutput, setSerialOutput] = useState("Serial monitor is idle.");
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
  const assistantFindings = useMemo(() => analyzeCircuitProject(project), [project]);
  const currentBoard = boardByType[project.metadata.boardType] ?? boardCatalog[0];

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
          return { connection, otherComponent, otherPin };
        }),
      };
    });
  }, [project.components, project.connections, selectedComponent]);

  const addActivity = (message: string) => {
    setActivityLog((current) => [`${new Date().toLocaleTimeString()}: ${message}`, ...current].slice(0, 24));
  };

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
      setLoading(true);
      try {
        const [backup, recents, cliConfig] = await Promise.all([
          getAutosave(),
          getRecentProjects(),
          window.desktop?.getArduinoConfig?.() ?? Promise.resolve({ cliPath: null, serialBaudRate: 9600 }),
        ]);
        setRecentProjects(recents);
        setArduinoConfig(cliConfig);
        if (backup) {
          try {
            const restored = parseProjectJson(backup);
            restoreInitialProject(restored, null, false);
            setFeedback("Recovered autosave backup.");
            addActivity("Recovered autosave backup.");
            setDashboardOpen(false);
          } catch {
            setFeedback("Skipped invalid autosave backup.");
            addActivity("Skipped invalid autosave backup.");
          }
        }
      } catch (error) {
        setFatalError(error instanceof Error ? error.message : "Failed to initialize desktop workspace.");
      } finally {
        setLoading(false);
      }
    };

    void restore();
  }, []);

  useEffect(() => {
    if (!window.desktop?.onSerialMonitorData) {
      return;
    }
    return window.desktop.onSerialMonitorData((payload) => {
      setSerialOutput((current) => `${current}${payload.data}`);
      setBottomTab("arduino");
      setBottomPanelOpen(true);
    });
  }, []);

  useEffect(() => {
    if (!loading) {
      void refreshArduinoEnvironment();
    }
  }, [loading]);

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
    if (isMeta && event.key.toLowerCase() === "k") {
      event.preventDefault();
      setShortcutsOpen(true);
    }
    if (isMeta && event.key.toLowerCase() === "g") {
      event.preventDefault();
      setCodeModalOpen(true);
      setBottomTab("code");
      setBottomPanelOpen(true);
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
      setImportModalOpen(false);
      setCodeModalOpen(false);
      setShortcutsOpen(false);
      setAboutOpen(false);
      setSettingsOpen(false);
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

  async function refreshRecentProjects() {
    setRecentProjects(await getRecentProjects());
  }

  async function refreshArduinoEnvironment() {
    if (!window.desktop) {
      return;
    }

    const [status, portsResult] = await Promise.all([
      window.desktop.detectArduinoCli(),
      window.desktop.listArduinoPorts(),
    ]);

    setArduinoStatus(status);
    if (portsResult.success) {
      setArduinoPorts(portsResult.ports);
      setSelectedPort((current) => current || portsResult.ports[0]?.address || "");
    } else if (portsResult.error) {
      setArduinoOutput(portsResult.error);
    }
  }

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
    setDashboardOpen(true);
    setFeedback("Started a new circuit.");
    addActivity("Started a new circuit.");
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
        setFeedback(`Opened ${result.filePath?.split(/[\\/]/).pop() ?? "project file"}.`);
        addActivity(`Opened ${result.filePath?.split(/[\\/]/).pop() ?? "project file"}.`);
        setDashboardOpen(false);
        await refreshRecentProjects();
        return;
      }

      const json = await readJsonFileFromBrowser();
      if (!json) {
        return;
      }
      replaceLoadedProject(parseProjectJson(json), null, false);
      setFeedback("Opened project file.");
      addActivity("Opened project file from browser fallback.");
      setDashboardOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to open circuit.";
      setFeedback(message);
      addActivity(message);
    }
  }

  async function handleOpenRecent(filePathToOpen: string) {
    const allow = await maybeDiscardChanges();
    if (!allow || !window.desktop) {
      return;
    }

    const result = await window.desktop.openRecentProject(filePathToOpen);
    if (result.canceled || !result.projectJson) {
      setFeedback(result.error ?? "Could not open recent project.");
      addActivity(result.error ?? "Could not open recent project.");
      return;
    }

    replaceLoadedProject(parseProjectJson(result.projectJson), result.filePath ?? filePathToOpen, false);
    setDashboardOpen(false);
    setFeedback(`Opened recent project ${result.filePath?.split(/[\\/]/).pop() ?? ""}.`);
    addActivity(`Opened recent project ${result.filePath?.split(/[\\/]/).pop() ?? ""}.`);
    await refreshRecentProjects();
  }

  async function handleSave() {
    const projectJson = serializeProject(project);
    const defaultName = project.metadata.name.trim() || "arduino-circuit";

    if (window.desktop && filePath) {
      const result = await window.desktop.saveCircuit({ filePath, projectJson });
      if (!result.canceled) {
        markProjectSaved(project, result.filePath ?? filePath);
        setFeedback("Saved project.");
        addActivity(`Saved project to ${result.filePath?.split(/[\\/]/).pop() ?? filePath?.split(/[\\/]/).pop() ?? ""}.`);
        await refreshRecentProjects();
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
        setFeedback("Saved project as .avc.");
        addActivity(`Saved project as ${result.filePath?.split(/[\\/]/).pop() ?? `${baseName}.avc`}.`);
        await refreshRecentProjects();
      }
      return;
    }

    downloadJson(baseName, projectJson);
    markProjectSaved(project, null);
    setFeedback("Downloaded project as .avc.");
    addActivity("Downloaded project as .avc.");
  }

  async function handleExport() {
    const projectJson = serializeProject(project);
    const baseName = `${project.metadata.name.trim() || "arduino-circuit"}-export`;
    if (window.desktop) {
      const result = await window.desktop.exportCircuit({ defaultName: baseName, projectJson });
      if (!result.canceled) {
        setFeedback("Exported compatibility JSON.");
        addActivity("Exported compatibility JSON.");
      }
      return;
    }
    const blobName = `${baseName}.json`;
    downloadTextFile(baseName, projectJson, "json", "application/json");
    setFeedback(`Downloaded ${blobName}.`);
    addActivity(`Downloaded ${blobName}.`);
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
      setFeedback("Imported project data.");
      addActivity("Imported project data.");
      setDashboardOpen(false);
      setImportModalOpen(false);
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Failed to import project.");
    }
  }

  function handleImportFromText() {
    try {
      const imported = parseProjectJson(importText);
      replaceLoadedProject(imported, null, true);
      setDashboardOpen(false);
      setImportModalOpen(false);
      setImportError(null);
      setFeedback("Imported project from pasted JSON.");
      addActivity("Imported project from pasted JSON.");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Invalid JSON.");
    }
  }

  function handleTemplateStart(templateId: string) {
    const template = projectTemplates.find((candidate) => candidate.id === templateId);
    if (!template) {
      return;
    }
    restoreInitialProject(template.project, null, false);
    setDashboardOpen(false);
    setFeedback(`Started template: ${template.name}.`);
    addActivity(`Started template: ${template.name}.`);
  }

  async function handleCopyGeneratedCode() {
    try {
      await navigator.clipboard.writeText(generatedSketch.code);
      setFeedback("Copied starter Arduino sketch to clipboard.");
      addActivity("Copied starter Arduino sketch to clipboard.");
    } catch {
      setFeedback("Could not copy code automatically. Please copy it manually from the code window.");
      addActivity("Clipboard copy failed for generated code.");
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
        addActivity(`Saved Arduino sketch as ${result.filePath?.split(/[\\/]/).pop() ?? `${defaultName}.ino`}.`);
      }
      return;
    }

    downloadTextFile(defaultName, generatedSketch.code, "ino", "text/plain");
    setFeedback("Downloaded Arduino sketch as .ino.");
    addActivity("Downloaded Arduino sketch as .ino.");
  }

  async function handleAnalyzeCircuit() {
    setBottomTab("assistant");
    setBottomPanelOpen(true);
    setFeedback(`Circuit analysis generated ${assistantFindings.length} finding(s).`);
    addActivity(`Circuit analysis generated ${assistantFindings.length} finding(s).`);
  }

  async function handleCompileSketch() {
    if (!window.desktop) {
      setArduinoOutput("Arduino CLI compile is only available in the desktop app.");
      return;
    }

    const result = await window.desktop.compileSketch({
      sketchName: generatedSketch.fileName.replace(/\.ino$/i, ""),
      sketchCode: generatedSketch.code,
      fqbn: currentBoard.fqbn,
    });
    setArduinoOutput(`${result.command}\n\n${result.output}`);
    setBottomTab("arduino");
    setBottomPanelOpen(true);
    setFeedback(result.success ? "Sketch compiled successfully." : (result.error ?? "Sketch compile failed."));
    addActivity(result.success ? "Compiled generated Arduino sketch." : "Arduino sketch compile failed.");
  }

  async function handleUploadSketch() {
    if (!window.desktop) {
      setArduinoOutput("Arduino CLI upload is only available in the desktop app.");
      return;
    }
    if (!selectedPort) {
      setArduinoOutput("Select a serial port before uploading.");
      return;
    }

    const result = await window.desktop.uploadSketch({
      sketchName: generatedSketch.fileName.replace(/\.ino$/i, ""),
      sketchCode: generatedSketch.code,
      fqbn: currentBoard.fqbn,
      port: selectedPort,
    });
    setArduinoOutput(`${result.command}\n\n${result.output}`);
    setBottomTab("arduino");
    setBottomPanelOpen(true);
    setFeedback(result.success ? "Sketch uploaded successfully." : (result.error ?? "Sketch upload failed."));
    addActivity(result.success ? `Uploaded sketch to ${selectedPort}.` : `Arduino sketch upload failed on ${selectedPort}.`);
  }

  async function handleStartSerialMonitor() {
    if (!window.desktop || !selectedPort) {
      setSerialOutput("Select a serial port before starting the serial monitor.");
      return;
    }
    setSerialOutput(`Starting serial monitor on ${selectedPort}...\n`);
    await window.desktop.startSerialMonitor({
      port: selectedPort,
      baudRate: arduinoConfig.serialBaudRate,
    });
    setBottomTab("arduino");
    setBottomPanelOpen(true);
    addActivity(`Started serial monitor on ${selectedPort}.`);
  }

  async function handleStopSerialMonitor() {
    if (!window.desktop) {
      return;
    }
    await window.desktop.stopSerialMonitor();
    setSerialOutput((current) => `${current}\nSerial monitor stop requested.\n`);
    addActivity("Stopped serial monitor.");
  }

  if (loading) {
    return (
      <div className="splash-state">
        <LoaderCircle size={28} className="spin" />
        <h1>Loading Arduino Circuit Visualizer</h1>
        <p>Preparing your workspace, recent projects, and autosave recovery.</p>
      </div>
    );
  }

  if (fatalError) {
    return (
      <div className="splash-state error-state">
        <AlertTriangle size={28} />
        <h1>Startup Error</h1>
        <p>{fatalError}</p>
      </div>
    );
  }

  return (
    <div className="app-frame professional-shell">
      <header className="topbar">
        <div className="brand">
          <button type="button" className="brand-mark interactive" onClick={() => setDashboardOpen(true)} title="Open project dashboard">
            <Usb size={18} />
          </button>
          <div>
            <h1>Arduino Circuit Visualizer</h1>
            <p>
              {dirty ? "Unsaved changes" : "All changes saved"}
              {filePath ? ` | ${filePath.split(/[\\/]/).pop()}` : " | Desktop workspace"}
              {currentBoard ? ` | ${currentBoard.name}` : ""}
            </p>
          </div>
        </div>
        <div className="toolbar">
          <ToolbarButton icon={<LayoutGrid size={16} />} label="Dashboard" onClick={() => setDashboardOpen(true)} title="Project dashboard" />
          <ToolbarButton icon={<FileInput size={16} />} label="New" onClick={handleNewProject} title="New project" />
          <ToolbarButton icon={<FolderOpen size={16} />} label="Open" onClick={handleOpen} title="Open .avc or JSON project" />
          <ToolbarButton icon={<Save size={16} />} label="Save" onClick={() => void handleSave()} title="Save (Ctrl/Cmd+S)" />
          <ToolbarButton icon={<SaveAll size={16} />} label="Save As" onClick={() => void handleSaveAs()} title="Save As (Ctrl/Cmd+Shift+S)" />
          <ToolbarButton icon={<Download size={16} />} label="Export" onClick={() => void handleExport()} title="Export compatibility JSON (Ctrl/Cmd+E)" />
          <ToolbarButton icon={<Import size={16} />} label="Import" onClick={() => setImportModalOpen(true)} title="Import JSON or .avc" />
          <ToolbarButton
            icon={<CodeXml size={16} />}
            label="Generate Code"
            onClick={() => {
              setCodeModalOpen(true);
              setBottomPanelOpen(true);
              setBottomTab("code");
            }}
            title="Generate Arduino starter code (Ctrl/Cmd+G)"
          />
          <ToolbarButton icon={<AlertTriangle size={16} />} label="Analyze Circuit" onClick={() => void handleAnalyzeCircuit()} title="Analyze circuit" />
          <ToolbarButton icon={<RotateCcw size={16} />} label="Undo" onClick={undo} disabled={historyPast.length === 0} title="Undo (Ctrl/Cmd+Z)" />
          <ToolbarButton icon={<RotateCw size={16} />} label="Redo" onClick={redo} disabled={historyFuture.length === 0} title="Redo (Ctrl/Cmd+Shift+Z / Ctrl/Cmd+Y)" />
          <ToolbarButton icon={<Library size={16} />} label="Library" onClick={() => setLeftPanelOpen((value) => !value)} title="Toggle component library" />
          <ToolbarButton icon={<Info size={16} />} label="Inspector" onClick={() => setRightPanelOpen((value) => !value)} title="Toggle inspector" />
          <ToolbarButton icon={<PanelBottom size={16} />} label="Output" onClick={() => setBottomPanelOpen((value) => !value)} title="Toggle output panel" />
          <ToolbarButton
            icon={theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            label={theme === "light" ? "Dark" : "Light"}
            onClick={() => setTheme((value) => (value === "light" ? "dark" : "light"))}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          />
          <ToolbarButton icon={<HelpCircle size={16} />} label="Shortcuts" onClick={() => setShortcutsOpen(true)} title="Keyboard shortcuts (Ctrl/Cmd+K)" />
          <ToolbarButton icon={<Settings size={16} />} label="Settings" onClick={() => setSettingsOpen(true)} title="Settings" />
          <ToolbarButton icon={<Info size={16} />} label="About" onClick={() => setAboutOpen(true)} title="About" />
        </div>
      </header>

      <div className="workspace-shell">
        <div className="workspace-grid">
          {leftPanelOpen && (
            <aside className="side-panel left-panel resizable-panel">
              <div className="panel-title">
                <Library size={16} />
                <h2>Component Library</h2>
              </div>
              <p className="panel-copy">Drag parts into the design canvas or click to place them near the current viewport center.</p>
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
              <div className="project-header-fields">
                <input
                  className="project-name-input"
                  aria-label="Project name"
                  value={project.metadata.name}
                  onChange={(event) => updateMetadata({ name: event.target.value })}
                />
                <select
                  className="project-name-input"
                  aria-label="Board type"
                  value={project.metadata.boardType}
                  onChange={(event) => updateMetadata({ boardType: event.target.value })}
                >
                  {boardCatalog.map((board) => (
                    <option key={board.type} value={board.type}>{board.name}</option>
                  ))}
                </select>
              </div>
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
                    setBottomTab("warnings");
                    setBottomPanelOpen(true);
                  }}
                  title={warning.description}
                >
                  <AlertTriangle size={14} />
                  <span>{warning.title}</span>
                </button>
              ))}
              {warnings.length === 0 && <div className="warning-chip severity-ok">No educational warnings right now.</div>}
            </div>

            {connectionHint && (
              <div className={`connection-hint severity-${connectionHint.level === "invalid" ? "danger" : connectionHint.level === "warning" ? "warning" : "info"}`}>
                <strong>Connection Hint:</strong> <span>{connectionHint.message}</span>
              </div>
            )}

            <div className="canvas-area">
              <CircuitCanvas />
              {!project.components.length && !dashboardOpen && (
                <div className="empty-state">
                  <div>
                    <Sparkles size={22} />
                    <h3>Build from a template or start wiring visually</h3>
                    <p>Drag components from the library, open the dashboard, or generate starter Arduino code from your current design.</p>
                  </div>
                </div>
              )}
            </div>
          </main>

          {rightPanelOpen && (
            <aside className="side-panel right-panel resizable-panel">
              <div className="panel-title">
                <Info size={16} />
                <h2>Inspector</h2>
              </div>

              <div className="inspector-card">
                <div className="inspector-card-header">
                  <div>
                    <h3>Project</h3>
                    <p>{currentBoard?.description}</p>
                  </div>
                  <span className="inspector-chip">{currentBoard?.name}</span>
                </div>
                <label>
                  <span>Description</span>
                  <input value={project.metadata.description} onChange={(event) => updateMetadata({ description: event.target.value })} />
                </label>
                <label>
                  <span>Author</span>
                  <input value={project.metadata.author} onChange={(event) => updateMetadata({ author: event.target.value })} />
                </label>
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

        {bottomPanelOpen && (
          <section className="bottom-panel resizable-bottom-panel">
            <div className="bottom-panel-header">
              <div className="panel-title">
                <PanelBottom size={16} />
                <h2>Output</h2>
              </div>
              <div className="bottom-tabs">
                <button type="button" className={bottomTab === "warnings" ? "tab-active" : ""} onClick={() => setBottomTab("warnings")}>Warnings</button>
                <button type="button" className={bottomTab === "assistant" ? "tab-active" : ""} onClick={() => setBottomTab("assistant")}>Analyze Circuit</button>
                <button type="button" className={bottomTab === "activity" ? "tab-active" : ""} onClick={() => setBottomTab("activity")}>Activity</button>
                <button type="button" className={bottomTab === "code" ? "tab-active" : ""} onClick={() => setBottomTab("code")}>Generated Code</button>
                <button type="button" className={bottomTab === "arduino" ? "tab-active" : ""} onClick={() => setBottomTab("arduino")}>Arduino CLI</button>
              </div>
            </div>

            {bottomTab === "warnings" && (
              <div className="bottom-panel-body">
                {warnings.length === 0 ? (
                  <div className="professional-empty">No warnings. Your current circuit passes the active educational checks.</div>
                ) : (
                  warnings.map((warning) => (
                    <button
                      key={warning.id}
                      type="button"
                      className={`output-warning severity-${warning.severity}`}
                      onClick={() => {
                        setHighlightedWarning(warning.id);
                        setSelection({ type: "warning", id: warning.id });
                      }}
                    >
                      <strong>{warning.title}</strong>
                      <span>{warning.description}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {bottomTab === "activity" && (
              <div className="bottom-panel-body">
                {activityLog.map((entry) => (
                  <div key={entry} className="activity-entry">{entry}</div>
                ))}
              </div>
            )}

            {bottomTab === "assistant" && (
              <div className="bottom-panel-body">
                {assistantFindings.length === 0 ? (
                  <div className="professional-empty">No assistant findings right now.</div>
                ) : (
                  assistantFindings.map((finding) => (
                    <div key={finding.id} className={`output-warning severity-${finding.severity}`}>
                      <strong>{finding.title}</strong>
                      <span>{finding.description}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {bottomTab === "code" && (
              <div className="bottom-panel-body">
                <div className="codegen-summary">
                  <span className="inspector-chip">{generatedSketch.analysis.board?.name ?? "No Arduino detected"}</span>
                  <span className="status-pill">LEDs: {generatedSketch.analysis.ledBindings.length}</span>
                  <span className="status-pill">Buttons: {generatedSketch.analysis.buttonBindings.length}</span>
                  <span className="status-pill">Resistors: {generatedSketch.analysis.resistorBindings.length}</span>
                  <span className="status-pill">Servos: {generatedSketch.analysis.servoBindings.length}</span>
                  <span className="status-pill">Pots: {generatedSketch.analysis.potentiometerBindings.length}</span>
                  <span className="status-pill">Buzzers: {generatedSketch.analysis.buzzerBindings.length}</span>
                  <span className="status-pill">Ultrasonic: {generatedSketch.analysis.ultrasonicBindings.length}</span>
                </div>
                <pre className="code-output compact-code"><code>{generatedSketch.code}</code></pre>
              </div>
            )}

            {bottomTab === "arduino" && (
              <div className="bottom-panel-body">
                <div className="arduino-toolbar">
                  <button type="button" onClick={() => void refreshArduinoEnvironment()}><RotateCcw size={14} /> Refresh CLI & Ports</button>
                  <button type="button" className="primary-button" onClick={() => void handleCompileSketch()}><Hammer size={14} /> Compile</button>
                  <button type="button" className="primary-button" onClick={() => void handleUploadSketch()}><Download size={14} /> Upload</button>
                  <button type="button" onClick={() => void handleStartSerialMonitor()}><Play size={14} /> Serial Monitor</button>
                  <button type="button" onClick={() => void handleStopSerialMonitor()}><Square size={14} /> Stop Monitor</button>
                </div>
                <div className="arduino-grid">
                  <div className="arduino-card">
                    <strong>Arduino CLI</strong>
                    <span>{arduinoStatus.found ? (arduinoStatus.version ?? "Detected") : (arduinoStatus.error ?? "Not detected")}</span>
                  </div>
                  <div className="arduino-card">
                    <strong>Serial Port</strong>
                    <select value={selectedPort} onChange={(event) => setSelectedPort(event.target.value)}>
                      <option value="">Select port</option>
                      {arduinoPorts.map((port) => (
                        <option key={port.address} value={port.address}>
                          {port.address} | {port.boardName ?? "Unknown board"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <pre className="code-output compact-code"><code>{arduinoOutput}</code></pre>
                <pre className="code-output compact-code"><code>{serialOutput}</code></pre>
              </div>
            )}
          </section>
        )}
      </div>

      {dashboardOpen && (
        <ModalShell title="Project Dashboard" onClose={() => setDashboardOpen(false)}>
          <div className="dashboard-grid">
            <section className="dashboard-card">
              <div className="panel-title">
                <Sparkles size={16} />
                <h2>Start New</h2>
              </div>
              <p className="panel-copy">Start from a blank project or one of the built-in Arduino templates.</p>
              <div className="dashboard-actions">
                <button type="button" className="primary-button" onClick={() => { void handleNewProject(); setDashboardOpen(false); }}>
                  <FileInput size={14} /> Blank Project
                </button>
                <button type="button" onClick={() => void handleOpen()}>
                  <FolderOpen size={14} /> Open Project
                </button>
              </div>
            </section>

            <section className="dashboard-card">
              <div className="panel-title">
                <Library size={16} />
                <h2>Templates</h2>
              </div>
              <div className="template-list">
                {projectTemplates.map((template) => (
                  <button key={template.id} type="button" className="template-card" onClick={() => handleTemplateStart(template.id)}>
                    <strong>{template.name}</strong>
                    <small>{template.description}</small>
                    <span>{template.tags.join(" | ")}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="dashboard-card">
              <div className="panel-title">
                <FolderOpen size={16} />
                <h2>Open Recent</h2>
              </div>
              {recentProjects.length === 0 ? (
                <div className="professional-empty">No recent desktop projects recorded yet.</div>
              ) : (
                <div className="recent-list">
                  {recentProjects.map((entry) => (
                    <button key={entry.filePath} type="button" className="recent-card" onClick={() => void handleOpenRecent(entry.filePath)}>
                      <strong>{entry.name}</strong>
                      <small>{entry.filePath}</small>
                      <span>{entry.boardType} | {new Date(entry.lastOpenedAt).toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </ModalShell>
      )}

      {importModalOpen && (
        <ModalShell title="Import Circuit Data" onClose={() => setImportModalOpen(false)}>
          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            placeholder="Paste circuit JSON or AVC JSON here"
          />
          {importError && <p className="error-text">{importError}</p>}
          <div className="modal-actions">
            <button type="button" onClick={() => void handleImportFromFile()}><Import size={14} /> Import File</button>
            <button type="button" className="primary-button" onClick={handleImportFromText}><Hammer size={14} /> Apply Data</button>
          </div>
        </ModalShell>
      )}

      {codeModalOpen && (
        <ModalShell title="Generated Arduino Code" onClose={() => setCodeModalOpen(false)} className="code-modal-card">
          <p className="modal-copy">Generated code is a starter template and may require manual refinement.</p>
          <div className="codegen-summary">
            <span className="inspector-chip">{generatedSketch.analysis.board?.name ?? "No Arduino detected"}</span>
            <span className="status-pill">Board: {project.metadata.boardType}</span>
            <span className="status-pill">Components: {project.components.length}</span>
          </div>
          <pre className="code-output"><code>{generatedSketch.code}</code></pre>
          <div className="modal-actions">
            <button type="button" onClick={() => void handleCopyGeneratedCode()}><Clipboard size={14} /> Copy</button>
            <button type="button" className="primary-button" onClick={() => void handleSaveGeneratedCode()}><Save size={14} /> Save Code</button>
          </div>
        </ModalShell>
      )}

      {shortcutsOpen && (
        <ModalShell title="Keyboard Shortcuts" onClose={() => setShortcutsOpen(false)}>
          <div className="shortcut-list">
            {[
              ["Ctrl/Cmd + S", "Save project"],
              ["Ctrl/Cmd + Shift + S", "Save project as"],
              ["Ctrl/Cmd + O", "Open project"],
              ["Ctrl/Cmd + E", "Export compatibility JSON"],
              ["Ctrl/Cmd + G", "Generate Arduino code"],
              ["Ctrl/Cmd + K", "Open shortcut help"],
              ["Ctrl/Cmd + Z", "Undo"],
              ["Ctrl/Cmd + Shift + Z / Ctrl/Cmd + Y", "Redo"],
              ["Delete / Backspace", "Delete selected component or wire"],
              ["Escape", "Clear selection or close overlays"],
            ].map(([shortcut, description]) => (
              <div key={shortcut} className="shortcut-row">
                <strong>{shortcut}</strong>
                <span>{description}</span>
              </div>
            ))}
          </div>
        </ModalShell>
      )}

      {settingsOpen && (
        <ModalShell title="Settings" onClose={() => setSettingsOpen(false)}>
          <div className="settings-grid">
            <label>
              <span>Theme</span>
              <select value={theme} onChange={(event) => setTheme(event.target.value as "light" | "dark")}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label>
              <span>Default Board</span>
              <select value={project.metadata.boardType} onChange={(event) => updateMetadata({ boardType: event.target.value })}>
                {boardCatalog.map((board) => (
                  <option key={board.type} value={board.type}>{board.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Arduino CLI Path</span>
              <input
                value={arduinoConfig.cliPath ?? ""}
                placeholder="arduino-cli"
                onChange={(event) => setArduinoConfig((current) => ({ ...current, cliPath: event.target.value || null }))}
              />
            </label>
            <label>
              <span>Serial Baud Rate</span>
              <input
                type="number"
                value={arduinoConfig.serialBaudRate}
                onChange={(event) => setArduinoConfig((current) => ({ ...current, serialBaudRate: Number(event.target.value) || 9600 }))}
              />
            </label>
            <div className="dashboard-actions">
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  if (!window.desktop) {
                    return;
                  }
                  const saved = await window.desktop.setArduinoConfig(arduinoConfig);
                  setArduinoConfig(saved);
                  await refreshArduinoEnvironment();
                  setFeedback("Saved Arduino CLI settings.");
                  addActivity("Saved Arduino CLI settings.");
                }}
              >
                <Save size={14} /> Save Arduino Settings
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {aboutOpen && (
        <ModalShell title="About Arduino Circuit Visualizer" onClose={() => setAboutOpen(false)}>
          <div className="about-copy">
            <p>Arduino Circuit Visualizer is a desktop-first Arduino design application for planning, teaching, documenting, and generating starter firmware from visual circuit graphs.</p>
            <p>Built with Electron, React, TypeScript, React Flow, Zustand, and Zod.</p>
            <p>Current board support includes Arduino Uno and Arduino Nano, with architecture prepared for future ESP32, ESP8266, Raspberry Pi Pico, and STM32 board plugins.</p>
            <p>Version 1.0.0</p>
          </div>
        </ModalShell>
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

function ModalShell({
  title,
  onClose,
  children,
  className,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className={`modal-card ${className ?? ""}`.trim()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
