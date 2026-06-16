const AUTOSAVE_KEY = "arduino-circuit-visualizer:autosave";

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

export async function readJsonFileFromBrowser(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
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
  link.download = `${defaultName}.json`;
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
