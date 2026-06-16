import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promises as fs } from "node:fs";
import Store from "electron-store";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const autosaveStore = new Store<{ autosave: string | null }>({
  name: "arduino-circuit-visualizer",
  defaults: {
    autosave: null,
  },
});

let mainWindow: BrowserWindow | null = null;
let isDirty = false;

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
    filters: [{ name: "Circuit JSON", extensions: ["json"] }],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }
  const filePath = result.filePaths[0];
  const projectJson = await fs.readFile(filePath, "utf8");
  return { canceled: false, filePath, projectJson };
});

ipcMain.handle("dialog:import-circuit", async () => {
  const window = BrowserWindow.getFocusedWindow() || mainWindow;
  const result = await dialog.showOpenDialog(window!, {
    title: "Import Circuit JSON",
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }],
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
  return { canceled: false, filePath: payload.filePath };
});

ipcMain.handle("dialog:save-circuit-as", async (_event, payload: { defaultName: string; projectJson: string }) => {
  const window = BrowserWindow.getFocusedWindow() || mainWindow;
  const result = await dialog.showSaveDialog(window!, {
    title: "Save Circuit As",
    defaultPath: `${payload.defaultName}.json`,
    filters: [{ name: "Circuit JSON", extensions: ["json"] }],
  });
  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }
  await fs.writeFile(result.filePath, payload.projectJson, "utf8");
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

ipcMain.handle("storage:get-autosave", async () => autosaveStore.get("autosave"));
ipcMain.handle("storage:set-autosave", async (_event, payload: { projectJson: string }) => {
  autosaveStore.set("autosave", payload.projectJson);
});
ipcMain.handle("storage:clear-autosave", async () => {
  autosaveStore.set("autosave", null);
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
