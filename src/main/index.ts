import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promises as fs } from "node:fs";
import { createArduinoService } from "./arduinoService.js";
import type { ArduinoCliConfig, RecentProjectEntry } from "../shared/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let isDirty = false;

async function readDesktopState(): Promise<{
  autosave: string | null;
  recentProjects: RecentProjectEntry[];
  arduino: ArduinoCliConfig;
}> {
  const stateFile = path.join(app.getPath("userData"), "desktop-state.json");
  try {
    const raw = await fs.readFile(stateFile, "utf8");
    const parsed = JSON.parse(raw) as {
      autosave?: string | null;
      recentProjects?: RecentProjectEntry[];
      arduino?: Partial<ArduinoCliConfig>;
    };
    return {
      autosave: parsed.autosave ?? null,
      recentProjects: parsed.recentProjects ?? [],
      arduino: {
        cliPath: parsed.arduino?.cliPath ?? null,
        serialBaudRate: parsed.arduino?.serialBaudRate ?? 9600,
      },
    };
  } catch {
    return {
      autosave: null,
      recentProjects: [],
      arduino: {
        cliPath: null,
        serialBaudRate: 9600,
      },
    };
  }
}

async function writeDesktopState(nextState: {
  autosave: string | null;
  recentProjects: RecentProjectEntry[];
  arduino: ArduinoCliConfig;
}) {
  const stateFile = path.join(app.getPath("userData"), "desktop-state.json");
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  await fs.writeFile(stateFile, JSON.stringify(nextState, null, 2), "utf8");
}

async function rememberRecentProject(filePath: string, projectJson: string) {
  try {
    const parsed = JSON.parse(projectJson) as { metadata?: { name?: string; boardType?: string } };
    const nextEntry: RecentProjectEntry = {
      name: parsed.metadata?.name || path.basename(filePath),
      filePath,
      boardType: parsed.metadata?.boardType || "arduino-uno",
      lastOpenedAt: new Date().toISOString(),
    };

    const currentState = await readDesktopState();
    const current = currentState.recentProjects;
    const deduped = current.filter((entry) => entry.filePath !== filePath);
    await writeDesktopState({
      ...currentState,
      recentProjects: [nextEntry, ...deduped].slice(0, 8),
    });
  } catch {
    // Ignore recent-project metadata failures and keep the file workflow stable.
  }
}

const arduinoService = createArduinoService({
  readConfig: async () => (await readDesktopState()).arduino,
  writeConfig: async (config) => {
    const current = await readDesktopState();
    await writeDesktopState({
      ...current,
      arduino: config,
    });
  },
  getWindow: () => mainWindow,
});

function getRendererUrl() {
  return process.env.VITE_DEV_SERVER_URL || path.join(__dirname, "../../dist/index.html");
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1200,
    minHeight: 760,
    title: "Arduino Circuit Visualizer",
    autoHideMenuBar: true,
    backgroundColor: "#f4f7fb",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const entry = getRendererUrl();
  if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(entry);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    await mainWindow.loadFile(entry);
  }

  mainWindow.on("close", async (event) => {
    if (!isDirty) {
      return;
    }

    const { response } = await dialog.showMessageBox(mainWindow!, {
      type: "warning",
      buttons: ["Cancel", "Close Without Saving"],
      defaultId: 0,
      cancelId: 0,
      title: "Unsaved changes",
      message: "You have unsaved circuit changes. Close without saving?",
    });

    if (response === 0) {
      event.preventDefault();
    }
  });
}

app.whenReady().then(async () => {
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("dialog:open-circuit", async () => {
  const window = BrowserWindow.getFocusedWindow() || mainWindow;
  const result = await dialog.showOpenDialog(window!, {
    title: "Open Circuit",
    properties: ["openFile"],
    filters: [{ name: "Arduino Visual Circuit", extensions: ["avc", "json"] }],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }
  const filePath = result.filePaths[0];
  const projectJson = await fs.readFile(filePath, "utf8");
  await rememberRecentProject(filePath, projectJson);
  return { canceled: false, filePath, projectJson };
});

ipcMain.handle("dialog:open-recent-project", async (_event, payload: { filePath: string }) => {
  try {
    const projectJson = await fs.readFile(payload.filePath, "utf8");
    await rememberRecentProject(payload.filePath, projectJson);
    return { canceled: false, filePath: payload.filePath, projectJson };
  } catch (error) {
    return { canceled: true, error: error instanceof Error ? error.message : "Could not open recent project." };
  }
});

ipcMain.handle("dialog:import-circuit", async () => {
  const window = BrowserWindow.getFocusedWindow() || mainWindow;
  const result = await dialog.showOpenDialog(window!, {
    title: "Import Circuit JSON",
    properties: ["openFile"],
    filters: [{ name: "Circuit Files", extensions: ["avc", "json"] }],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }
  const filePath = result.filePaths[0];
  const projectJson = await fs.readFile(filePath, "utf8");
  return { canceled: false, filePath, projectJson };
});

ipcMain.handle("dialog:save-circuit", async (_event, payload: { filePath?: string | null; projectJson: string }) => {
  if (!payload.filePath) {
    return { canceled: true };
  }
  await fs.writeFile(payload.filePath, payload.projectJson, "utf8");
  await rememberRecentProject(payload.filePath, payload.projectJson);
  return { canceled: false, filePath: payload.filePath };
});

ipcMain.handle("dialog:save-circuit-as", async (_event, payload: { defaultName: string; projectJson: string }) => {
  const window = BrowserWindow.getFocusedWindow() || mainWindow;
  const result = await dialog.showSaveDialog(window!, {
    title: "Save Circuit As",
    defaultPath: `${payload.defaultName}.avc`,
    filters: [{ name: "Arduino Visual Circuit", extensions: ["avc"] }],
  });
  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }
  await fs.writeFile(result.filePath, payload.projectJson, "utf8");
  await rememberRecentProject(result.filePath, payload.projectJson);
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle("dialog:export-circuit", async (_event, payload: { defaultName: string; projectJson: string }) => {
  const window = BrowserWindow.getFocusedWindow() || mainWindow;
  const result = await dialog.showSaveDialog(window!, {
    title: "Export Circuit JSON",
    defaultPath: `${payload.defaultName}.json`,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }
  await fs.writeFile(result.filePath, payload.projectJson, "utf8");
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle("dialog:export-sketch", async (_event, payload: { defaultName: string; sketchCode: string }) => {
  const window = BrowserWindow.getFocusedWindow() || mainWindow;
  const result = await dialog.showSaveDialog(window!, {
    title: "Save Arduino Sketch",
    defaultPath: `${payload.defaultName}.ino`,
    filters: [{ name: "Arduino Sketch", extensions: ["ino"] }],
  });
  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }
  await fs.writeFile(result.filePath, payload.sketchCode, "utf8");
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle("storage:get-autosave", async () => (await readDesktopState()).autosave);
ipcMain.handle("storage:get-recent-projects", async () => (await readDesktopState()).recentProjects);
ipcMain.handle("arduino:get-config", async () => arduinoService.getConfig());
ipcMain.handle("arduino:set-config", async (_event, payload: Partial<ArduinoCliConfig>) => arduinoService.setConfig(payload));
ipcMain.handle("arduino:detect-cli", async () => arduinoService.detectCli());
ipcMain.handle("arduino:list-ports", async () => arduinoService.listBoardsAndPorts());
ipcMain.handle("arduino:compile-sketch", async (_event, payload: { sketchName: string; sketchCode: string; fqbn: string }) =>
  arduinoService.compileSketch(payload),
);
ipcMain.handle("arduino:upload-sketch", async (_event, payload: { sketchName: string; sketchCode: string; fqbn: string; port: string }) =>
  arduinoService.uploadSketch(payload),
);
ipcMain.handle("arduino:start-monitor", async (_event, payload: { port: string; baudRate?: number }) =>
  arduinoService.startSerialMonitor(payload),
);
ipcMain.handle("arduino:stop-monitor", async () => arduinoService.stopSerialMonitor());
ipcMain.handle("storage:set-autosave", async (_event, payload: { projectJson: string }) => {
  const currentState = await readDesktopState();
  await writeDesktopState({
    ...currentState,
    autosave: payload.projectJson,
  });
});
ipcMain.handle("storage:clear-autosave", async () => {
  const currentState = await readDesktopState();
  await writeDesktopState({
    ...currentState,
    autosave: null,
  });
});

ipcMain.handle("dialog:confirm-discard", async (_event, payload: { message: string }) => {
  const window = BrowserWindow.getFocusedWindow() || mainWindow;
  const { response } = await dialog.showMessageBox(window!, {
    type: "warning",
    buttons: ["Cancel", "Discard Changes"],
    defaultId: 0,
    cancelId: 0,
    title: "Unsaved changes",
    message: payload.message,
  });
  return response === 1;
});

ipcMain.on("editor:set-dirty", (_event, payload: { dirty: boolean }) => {
  isDirty = payload.dirty;
});
