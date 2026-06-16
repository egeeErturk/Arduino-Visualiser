/// <reference types="vite/client" />

interface DesktopBridge {
  openCircuit(): Promise<{ canceled: boolean; projectJson?: string; filePath?: string }>;
  openRecentProject(filePath: string): Promise<{ canceled: boolean; projectJson?: string; filePath?: string; error?: string }>;
  listLibraryProjects(search?: string): Promise<{
    projectDirectory: string;
    recentProjects: import("./shared/types").ProjectLibraryEntry[];
    allProjects: import("./shared/types").ProjectLibraryEntry[];
  }>;
  saveLibraryProject(payload: { projectJson: string; projectId?: string | null }): Promise<{
    entry: import("./shared/types").ProjectLibraryEntry;
    project: import("./shared/types").CircuitProject;
  }>;
  autosaveLibraryProject(payload: { projectJson: string; projectId: string }): Promise<import("./shared/types").ProjectLibraryEntry>;
  openLibraryProject(projectId: string): Promise<{
    entry: import("./shared/types").ProjectLibraryEntry;
    project: import("./shared/types").CircuitProject;
  }>;
  renameLibraryProject(payload: { projectId: string; name: string }): Promise<{
    entry: import("./shared/types").ProjectLibraryEntry;
    project: import("./shared/types").CircuitProject;
  }>;
  duplicateLibraryProject(projectId: string): Promise<{
    entry: import("./shared/types").ProjectLibraryEntry;
    project: import("./shared/types").CircuitProject;
  }>;
  deleteLibraryProject(projectId: string): Promise<{ deleted: boolean }>;
  removeLibraryEntry(projectId: string): Promise<{ removed: boolean }>;
  revealLibraryProject(projectId: string): Promise<{ revealed: boolean; filePath: string }>;
  importProjectIntoLibrary(): Promise<{
    canceled: boolean;
    entry?: import("./shared/types").ProjectLibraryEntry;
    project?: import("./shared/types").CircuitProject;
  }>;
  saveCircuit(payload: { filePath?: string | null; projectJson: string }): Promise<{ canceled: boolean; filePath?: string }>;
  saveCircuitAs(payload: { defaultName: string; projectJson: string }): Promise<{ canceled: boolean; filePath?: string }>;
  exportCircuit(payload: { defaultName: string; projectJson: string }): Promise<{ canceled: boolean; filePath?: string }>;
  exportSketch(payload: { defaultName: string; sketchCode: string }): Promise<{ canceled: boolean; filePath?: string }>;
  importCode(): Promise<{ canceled: boolean; filePath?: string; fileName?: string; content?: string }>;
  exportTextFile(payload: { defaultName: string; extension: string; title: string; content: string; mimeLabel: string }): Promise<{ canceled: boolean; filePath?: string }>;
  exportPdfFile(payload: { defaultName: string; title: string; html: string }): Promise<{ canceled: boolean; filePath?: string }>;
  importCircuit(): Promise<{ canceled: boolean; projectJson?: string; filePath?: string }>;
  getPluginRuntime(): Promise<import("./shared/types").PluginRuntimeState>;
  reloadPluginRuntime(): Promise<import("./shared/types").PluginRuntimeState>;
  getRecentProjects(): Promise<Array<{ name: string; filePath: string; lastOpenedAt: string; boardType: string }>>;
  getAutosave(): Promise<string | null>;
  getArduinoConfig(): Promise<{ cliPath: string | null; serialBaudRate: number }>;
  setArduinoConfig(payload: { cliPath?: string | null; serialBaudRate?: number }): Promise<{ cliPath: string | null; serialBaudRate: number }>;
  detectArduinoCli(): Promise<{ found: boolean; cliPath: string | null; version: string | null; error: string | null }>;
  listArduinoPorts(): Promise<{
    success: boolean;
    output: string;
    error: string | null;
    ports: Array<{ address: string; label: string; protocol: string | null; boardName: string | null; fqbn: string | null }>;
  }>;
  compileSketch(payload: { sketchName: string; sketchCode: string; fqbn: string }): Promise<{
    success: boolean;
    command: string;
    output: string;
    error: string | null;
    sketchPath?: string;
  }>;
  uploadSketch(payload: { sketchName: string; sketchCode: string; fqbn: string; port: string }): Promise<{
    success: boolean;
    command: string;
    output: string;
    error: string | null;
    sketchPath?: string;
  }>;
  startSerialMonitor(payload: { port: string; baudRate?: number }): Promise<{ success: boolean; command: string }>;
  stopSerialMonitor(): Promise<{ success: boolean }>;
  onSerialMonitorData(listener: (payload: { stream: "stdout" | "stderr" | "status"; data: string }) => void): () => void;
  setAutosave(projectJson: string): Promise<void>;
  clearAutosave(): Promise<void>;
  confirmDiscard(message: string): Promise<boolean>;
  confirmAction(payload: { title: string; message: string; confirmLabel?: string }): Promise<boolean>;
  setDirtyState(dirty: boolean): void;
}

declare global {
  interface Window {
    desktop?: DesktopBridge;
  }
}

export {};
