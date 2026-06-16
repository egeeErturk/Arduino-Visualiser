const AUTOSAVE_KEY = "arduino-circuit-visualizer:autosave";
const RECENT_PROJECTS_KEY = "arduino-circuit-visualizer:recent-projects";

export async function getAutosave(): Promise<string | null> {
  if (window.desktop) {
    return window.desktop.getAutosave();
  }

  return localStorage.getItem(AUTOSAVE_KEY);
}

export async function setAutosave(projectJson: string) {
  if (window.desktop) {
    await window.desktop.setAutosave(projectJson);
    return;
  }

  localStorage.setItem(AUTOSAVE_KEY, projectJson);
}

export async function clearAutosave() {
  if (window.desktop) {
    await window.desktop.clearAutosave();
    return;
  }

  localStorage.removeItem(AUTOSAVE_KEY);
}

export async function confirmDiscard(message: string) {
  if (window.desktop) {
    return window.desktop.confirmDiscard(message);
  }

  return window.confirm(message);
}

export async function confirmAction(title: string, message: string, confirmLabel?: string) {
  if (window.desktop?.confirmAction) {
    return window.desktop.confirmAction({ title, message, confirmLabel });
  }

  return window.confirm(`${title}\n\n${message}`);
}

export async function readJsonFileFromBrowser(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".avc,.json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      resolve(await file.text());
    };
    input.click();
  });
}

export function downloadJson(defaultName: string, projectJson: string) {
  const blob = new Blob([projectJson], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${defaultName}.avc`;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadTextFile(defaultName: string, content: string, extension: string, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${defaultName}.${extension}`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportTextFile(
  defaultName: string,
  extension: string,
  title: string,
  content: string,
  mimeLabel: string,
) {
  if (window.desktop) {
    return window.desktop.exportTextFile({ defaultName, extension, title, content, mimeLabel });
  }

  downloadTextFile(defaultName, content, extension, mimeLabel === "HTML" ? "text/html" : "text/plain");
  return { canceled: false };
}

export async function exportPdfFile(defaultName: string, title: string, html: string) {
  if (window.desktop) {
    return window.desktop.exportPdfFile({ defaultName, title, html });
  }

  downloadTextFile(defaultName, html, "html", "text/html");
  return { canceled: false };
}

export async function getRecentProjects() {
  if (window.desktop) {
    return window.desktop.getRecentProjects();
  }

  try {
    return JSON.parse(localStorage.getItem(RECENT_PROJECTS_KEY) || "[]") as Array<{
      name: string;
      filePath: string;
      lastOpenedAt: string;
      boardType: string;
    }>;
  } catch {
    return [];
  }
}

export async function getLibraryProjects(search?: string) {
  if (window.desktop?.listLibraryProjects) {
    return window.desktop.listLibraryProjects(search);
  }

  return {
    projectDirectory: "",
    recentProjects: [],
    allProjects: [],
  };
}
