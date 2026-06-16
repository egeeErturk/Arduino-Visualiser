import { app, dialog, shell } from "electron";
import path from "node:path";
import { promises as fs } from "node:fs";
import { createId, parseProjectJson, serializeProject } from "../shared/project.js";
import type { CircuitProject, ProjectLibraryEntry, ProjectLibraryIndex } from "../shared/types.js";

function getProjectsDirectory() {
  return path.join(app.getPath("userData"), "projects");
}

function getIndexPath() {
  return path.join(getProjectsDirectory(), "index.json");
}

function toEntryFromProject(projectId: string, filePath: string, project: CircuitProject, previous?: ProjectLibraryEntry | null): ProjectLibraryEntry {
  return {
    id: projectId,
    name: project.metadata.name,
    description: project.metadata.description,
    author: project.metadata.author,
    boardType: project.metadata.boardType,
    createdAt: previous?.createdAt ?? project.metadata.createdAt,
    updatedAt: project.metadata.updatedAt,
    lastOpenedAt: previous?.lastOpenedAt ?? project.metadata.updatedAt,
    filePath,
    thumbnail: previous?.thumbnail ?? null,
    status: "available",
    error: null,
  };
}

async function ensureProjectsDirectory() {
  await fs.mkdir(getProjectsDirectory(), { recursive: true });
}

async function readIndex(): Promise<ProjectLibraryIndex> {
  await ensureProjectsDirectory();
  try {
    const raw = await fs.readFile(getIndexPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<ProjectLibraryIndex>;
    return {
      version: 1,
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    };
  } catch {
    return { version: 1, projects: [] };
  }
}

async function writeIndex(index: ProjectLibraryIndex) {
  await ensureProjectsDirectory();
  await fs.writeFile(getIndexPath(), JSON.stringify(index, null, 2), "utf8");
}

async function inspectEntry(entry: ProjectLibraryEntry): Promise<ProjectLibraryEntry> {
  try {
    const raw = await fs.readFile(entry.filePath, "utf8");
    const parsed = parseProjectJson(raw);
    return {
      ...entry,
      name: parsed.metadata.name,
      description: parsed.metadata.description,
      author: parsed.metadata.author,
      boardType: parsed.metadata.boardType,
      updatedAt: parsed.metadata.updatedAt,
      createdAt: parsed.metadata.createdAt,
      status: "available",
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown project file error.";
    const missing = message.includes("ENOENT") || message.includes("no such file");
    return {
      ...entry,
      status: missing ? "missing" : "corrupted",
      error: message,
    };
  }
}

async function persistProjectFile(projectId: string, project: CircuitProject) {
  const filePath = path.join(getProjectsDirectory(), `${projectId}.avc`);
  await fs.writeFile(filePath, serializeProject(project), "utf8");
  return filePath;
}

export async function listLibraryProjects(search = "") {
  const index = await readIndex();
  const inspected = await Promise.all(index.projects.map((entry) => inspectEntry(entry)));
  await writeIndex({ version: 1, projects: inspected });

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = normalizedSearch
    ? inspected.filter((entry) =>
      [entry.name, entry.description, entry.boardType].some((value) => value.toLowerCase().includes(normalizedSearch)))
    : inspected;

  const recentProjects = [...filtered]
    .filter((entry) => entry.lastOpenedAt)
    .sort((left, right) => (right.lastOpenedAt ?? "").localeCompare(left.lastOpenedAt ?? ""))
    .slice(0, 8);

  const allProjects = [...filtered].sort((left, right) => (right.updatedAt).localeCompare(left.updatedAt));

  return {
    projectDirectory: getProjectsDirectory(),
    recentProjects,
    allProjects,
  };
}

export async function saveProjectToLibrary(project: CircuitProject, projectId?: string | null) {
  const index = await readIndex();
  const nextId = projectId ?? createId("project");
  const previous = index.projects.find((entry) => entry.id === nextId) ?? null;
  const now = new Date().toISOString();
  const normalizedProject: CircuitProject = {
    ...project,
    metadata: {
      ...project.metadata,
      createdAt: previous?.createdAt ?? project.metadata.createdAt,
      updatedAt: now,
    },
  };
  const filePath = await persistProjectFile(nextId, normalizedProject);
  const entry = toEntryFromProject(nextId, filePath, normalizedProject, previous);
  const deduped = index.projects.filter((candidate) => candidate.id !== nextId);
  deduped.unshift(entry);
  await writeIndex({ version: 1, projects: deduped });
  return { entry, project: normalizedProject };
}

export async function autosaveLibraryProject(projectId: string, project: CircuitProject) {
  const saved = await saveProjectToLibrary(project, projectId);
  return saved.entry;
}

export async function openLibraryProject(projectId: string) {
  const index = await readIndex();
  const existing = index.projects.find((entry) => entry.id === projectId);
  if (!existing) {
    throw new Error("Library project not found.");
  }

  const raw = await fs.readFile(existing.filePath, "utf8");
  const project = parseProjectJson(raw);
  const openedAt = new Date().toISOString();
  const updatedEntry: ProjectLibraryEntry = {
    ...toEntryFromProject(projectId, existing.filePath, project, existing),
    lastOpenedAt: openedAt,
  };
  await writeIndex({
    version: 1,
    projects: index.projects.map((entry) => entry.id === projectId ? updatedEntry : entry),
  });
  return { entry: updatedEntry, project };
}

export async function renameLibraryProject(projectId: string, name: string) {
  const opened = await openLibraryProject(projectId);
  const updatedProject: CircuitProject = {
    ...opened.project,
    metadata: {
      ...opened.project.metadata,
      name,
      updatedAt: new Date().toISOString(),
    },
  };
  return saveProjectToLibrary(updatedProject, projectId);
}

export async function duplicateLibraryProject(projectId: string) {
  const opened = await openLibraryProject(projectId);
  const duplicate: CircuitProject = {
    ...opened.project,
    metadata: {
      ...opened.project.metadata,
      name: `${opened.project.metadata.name} Copy`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
  return saveProjectToLibrary(duplicate, null);
}

export async function deleteLibraryProject(projectId: string) {
  const index = await readIndex();
  const existing = index.projects.find((entry) => entry.id === projectId);
  if (!existing) {
    throw new Error("Library project not found.");
  }
  try {
    await shell.trashItem(existing.filePath);
  } catch {
    await fs.rm(existing.filePath, { force: true });
  }
  await writeIndex({
    version: 1,
    projects: index.projects.filter((entry) => entry.id !== projectId),
  });
  return { deleted: true };
}

export async function revealLibraryProject(projectId: string) {
  const index = await readIndex();
  const existing = index.projects.find((entry) => entry.id === projectId);
  if (!existing) {
    throw new Error("Library project not found.");
  }
  shell.showItemInFolder(existing.filePath);
  return { revealed: true, filePath: existing.filePath };
}

export async function removeLibraryEntry(projectId: string) {
  const index = await readIndex();
  await writeIndex({
    version: 1,
    projects: index.projects.filter((entry) => entry.id !== projectId),
  });
  return { removed: true };
}

export async function importExternalProjectIntoLibrary(filePath: string) {
  const raw = await fs.readFile(filePath, "utf8");
  const project = parseProjectJson(raw);
  const saved = await saveProjectToLibrary(project, null);
  return { entry: saved.entry, project: saved.project };
}

export async function promptImportProjectIntoLibrary() {
  const result = await dialog.showOpenDialog({
    title: "Import Project Into Library",
    properties: ["openFile"],
    filters: [{ name: "Arduino Visual Circuit", extensions: ["avc", "json"] }],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }
  const imported = await importExternalProjectIntoLibrary(result.filePaths[0]);
  return { canceled: false, ...imported };
}
