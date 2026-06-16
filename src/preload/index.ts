import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("desktop", {
  openCircuit: () => ipcRenderer.invoke("dialog:open-circuit"),
  openRecentProject: (filePath: string) => ipcRenderer.invoke("dialog:open-recent-project", { filePath }),
  saveCircuit: (payload: { filePath?: string | null; projectJson: string }) =>
    ipcRenderer.invoke("dialog:save-circuit", payload),
  saveCircuitAs: (payload: { defaultName: string; projectJson: string }) =>
    ipcRenderer.invoke("dialog:save-circuit-as", payload),
  exportCircuit: (payload: { defaultName: string; projectJson: string }) =>
    ipcRenderer.invoke("dialog:export-circuit", payload),
  exportSketch: (payload: { defaultName: string; sketchCode: string }) =>
    ipcRenderer.invoke("dialog:export-sketch", payload),
  importCode: () => ipcRenderer.invoke("dialog:import-code"),
  exportTextFile: (payload: { defaultName: string; extension: string; title: string; content: string; mimeLabel: string }) =>
    ipcRenderer.invoke("dialog:export-text-file", payload),
  exportPdfFile: (payload: { defaultName: string; title: string; html: string }) =>
    ipcRenderer.invoke("dialog:export-pdf-file", payload),
  importCircuit: () => ipcRenderer.invoke("dialog:import-circuit"),
  listLibraryProjects: (search?: string) => ipcRenderer.invoke("library:list-projects", { search }),
  saveLibraryProject: (payload: { projectJson: string; projectId?: string | null }) => ipcRenderer.invoke("library:save-project", payload),
  autosaveLibraryProject: (payload: { projectJson: string; projectId: string }) => ipcRenderer.invoke("library:autosave-project", payload),
  openLibraryProject: (projectId: string) => ipcRenderer.invoke("library:open-project", { projectId }),
  renameLibraryProject: (payload: { projectId: string; name: string }) => ipcRenderer.invoke("library:rename-project", payload),
  duplicateLibraryProject: (projectId: string) => ipcRenderer.invoke("library:duplicate-project", { projectId }),
  deleteLibraryProject: (projectId: string) => ipcRenderer.invoke("library:delete-project", { projectId }),
  removeLibraryEntry: (projectId: string) => ipcRenderer.invoke("library:remove-entry", { projectId }),
  revealLibraryProject: (projectId: string) => ipcRenderer.invoke("library:reveal-project", { projectId }),
  importProjectIntoLibrary: () => ipcRenderer.invoke("library:import-project"),
  getPluginRuntime: () => ipcRenderer.invoke("plugins:get-runtime"),
  reloadPluginRuntime: () => ipcRenderer.invoke("plugins:reload-runtime"),
  getRecentProjects: () => ipcRenderer.invoke("storage:get-recent-projects"),
  getAutosave: () => ipcRenderer.invoke("storage:get-autosave"),
  getArduinoConfig: () => ipcRenderer.invoke("arduino:get-config"),
  setArduinoConfig: (payload: { cliPath?: string | null; serialBaudRate?: number }) =>
    ipcRenderer.invoke("arduino:set-config", payload),
  detectArduinoCli: () => ipcRenderer.invoke("arduino:detect-cli"),
  listArduinoPorts: () => ipcRenderer.invoke("arduino:list-ports"),
  compileSketch: (payload: { sketchName: string; sketchCode: string; fqbn: string }) =>
    ipcRenderer.invoke("arduino:compile-sketch", payload),
  uploadSketch: (payload: { sketchName: string; sketchCode: string; fqbn: string; port: string }) =>
    ipcRenderer.invoke("arduino:upload-sketch", payload),
  startSerialMonitor: (payload: { port: string; baudRate?: number }) => ipcRenderer.invoke("arduino:start-monitor", payload),
  stopSerialMonitor: () => ipcRenderer.invoke("arduino:stop-monitor"),
  onSerialMonitorData: (listener: (payload: { stream: "stdout" | "stderr" | "status"; data: string }) => void) => {
    const wrapped = (_event: unknown, payload: { stream: "stdout" | "stderr" | "status"; data: string }) => listener(payload);
    ipcRenderer.on("arduino:monitor-data", wrapped);
    return () => ipcRenderer.removeListener("arduino:monitor-data", wrapped);
  },
  setAutosave: (projectJson: string) => ipcRenderer.invoke("storage:set-autosave", { projectJson }),
  clearAutosave: () => ipcRenderer.invoke("storage:clear-autosave"),
  confirmDiscard: (message: string) => ipcRenderer.invoke("dialog:confirm-discard", { message }),
  confirmAction: (payload: { title: string; message: string; confirmLabel?: string }) => ipcRenderer.invoke("dialog:confirm-action", payload),
  setDirtyState: (dirty: boolean) => ipcRenderer.send("editor:set-dirty", { dirty }),
});
