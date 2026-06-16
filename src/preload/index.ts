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
  importCircuit: () => ipcRenderer.invoke("dialog:import-circuit"),
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
  setDirtyState: (dirty: boolean) => ipcRenderer.send("editor:set-dirty", { dirty }),
});
