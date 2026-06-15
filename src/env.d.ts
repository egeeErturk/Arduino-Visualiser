/// <reference types="vite/client" />

interface DesktopBridge {
  openCircuit(): Promise<{ canceled: boolean; projectJson?: string; filePath?: string }>;
  saveCircuit(payload: { filePath?: string | null; projectJson: string }): Promise<{ canceled: boolean; filePath?: string }>;
  saveCircuitAs(payload: { defaultName: string; projectJson: string }): Promise<{ canceled: boolean; filePath?: string }>;
  exportCircuit(payload: { defaultName: string; projectJson: string }): Promise<{ canceled: boolean; filePath?: string }>;
  importCircuit(): Promise<{ canceled: boolean; projectJson?: string; filePath?: string }>;
  getAutosave(): Promise<string | null>;
  setAutosave(projectJson: string): Promise<void>;
  clearAutosave(): Promise<void>;
  confirmDiscard(message: string): Promise<boolean>;
  setDirtyState(dirty: boolean): void;
}

declare global {
  interface Window {
    desktop?: DesktopBridge;
  }
}

export {};
