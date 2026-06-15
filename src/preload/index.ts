import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("desktop", {
  openCircuit: () => ipcRenderer.invoke("dialog:open-circuit"),
  saveCircuit: (payload: { filePath?: string | null; projectJson: string }) =>
    ipcRenderer.invoke("dialog:save-circuit", payload),
  saveCircuitAs: (payload: { defaultName: string; projectJson: string }) =>
    ipcRenderer.invoke("dialog:save-circuit-as", payload),
  exportCircuit: (payload: { defaultName: string; projectJson: string }) =>
    ipcRenderer.invoke("dialog:export-circuit", payload),
  importCircuit: () => ipcRenderer.invoke("dialog:import-circuit"),
  getAutosave: () => ipcRenderer.invoke("storage:get-autosave"),
  setAutosave: (projectJson: string) => ipcRenderer.invoke("storage:set-autosave", { projectJson }),
  clearAutosave: () => ipcRenderer.invoke("storage:clear-autosave"),
  confirmDiscard: (message: string) => ipcRenderer.invoke("dialog:confirm-discard", { message }),
  setDirtyState: (dirty: boolean) => ipcRenderer.send("editor:set-dirty", { dirty }),
});
