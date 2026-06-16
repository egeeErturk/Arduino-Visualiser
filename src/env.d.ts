/// <reference types="vite/client" />

interface DesktopBridge {
  openCircuit(): Promise<{ canceled: boolean; projectJson?: string; filePath?: string }>;
  openRecentProject(filePath: string): Promise<{ canceled: boolean; projectJson?: string; filePath?: string; error?: string }>;
  saveCircuit(payload: { filePath?: string | null; projectJson: string }): Promise<{ canceled: boolean; filePath?: string }>;
  saveCircuitAs(payload: { defaultName: string; projectJson: string }): Promise<{ canceled: boolean; filePath?: string }>;
  exportCircuit(payload: { defaultName: string; projectJson: string }): Promise<{ canceled: boolean; filePath?: string }>;
  exportSketch(payload: { defaultName: string; sketchCode: string }): Promise<{ canceled: boolean; filePath?: string }>;
  importCircuit(): Promise<{ canceled: boolean; projectJson?: string; filePath?: string }>;
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
  setDirtyState(dirty: boolean): void;
}

declare global {
  interface Window {
    desktop?: DesktopBridge;
  }
}

export {};
