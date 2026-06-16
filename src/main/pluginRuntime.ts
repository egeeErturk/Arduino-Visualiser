import path from "node:path";
import { promises as fs } from "node:fs";
import { app } from "electron";
import { z } from "zod";
import type { PluginRuntimeState } from "../shared/types.js";

const pinSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  side: z.enum(["left", "right", "top", "bottom"]),
  offset: z.number(),
  kind: z.enum(["digital", "analog", "power", "ground", "signal", "passive"]),
  direction: z.enum(["input", "output", "bidirectional", "passive", "power", "ground"]),
});

const boardSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  family: z.enum(["arduino", "esp", "raspberry-pi", "stm32"]),
  description: z.string().min(1),
  defaultFileExtension: z.literal("ino"),
  codeLanguage: z.literal("arduino"),
  fqbn: z.string().min(1),
  supportedComponentTypes: z.array(z.string().min(1)),
  pinCapabilities: z.record(z.string(), z.object({
    pwm: z.boolean().optional(),
    analog: z.boolean().optional(),
    digital: z.boolean().optional(),
    serial: z.boolean().optional(),
  })),
});

const componentSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  size: z.object({ width: z.number().positive(), height: z.number().positive() }),
  accent: z.string().min(1),
  boardTargets: z.array(z.string()).optional(),
  visualStyle: z.enum([
    "arduino-uno",
    "arduino-nano",
    "breadboard",
    "led",
    "resistor",
    "button",
    "potentiometer",
    "buzzer",
    "servo",
    "sensor",
    "wire",
    "power",
    "ground",
  ]),
  pins: z.array(pinSchema),
});

const generatorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  supportedComponentTypes: z.array(z.string().min(1)),
  includes: z.array(z.string()).optional(),
  definitions: z.array(z.string()).optional(),
  setup: z.array(z.string()).optional(),
  loop: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional(),
});

const validationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rules: z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    severity: z.enum(["info", "warning", "danger"]),
    type: z.enum(["require-pin-connection", "max-component-count"]),
    componentTypes: z.array(z.string().min(1)),
    pinIds: z.array(z.string().min(1)).optional(),
    maxCount: z.number().int().positive().optional(),
  })),
});

export const pluginManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().optional(),
  author: z.string().optional(),
  boards: z.array(boardSchema).optional(),
  components: z.array(componentSchema).optional(),
  generators: z.array(generatorSchema).optional(),
  validations: z.array(validationSchema).optional(),
});

export function getPluginDirectories() {
  return [
    path.join(app.getPath("userData"), "plugins"),
    path.join(process.cwd(), "plugins"),
  ];
}

export async function findManifestFiles(directory: string) {
  try {
    await fs.mkdir(directory, { recursive: true });
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const manifests: string[] = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        manifests.push(path.join(directory, entry.name, "plugin.json"));
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        manifests.push(path.join(directory, entry.name));
      }
    }
    return manifests;
  } catch {
    return [];
  }
}

export function parsePluginManifest(raw: string) {
  return pluginManifestSchema.parse(JSON.parse(raw));
}

export async function loadRuntimePluginsFromDirectories(
  directories: string[],
  primaryDirectory: string,
): Promise<PluginRuntimeState> {
  const manifests = (await Promise.all(directories.map((directory) => findManifestFiles(directory)))).flat();
  const loaded: PluginRuntimeState["loaded"] = [];
  const failures: PluginRuntimeState["failures"] = [];

  for (const manifestPath of manifests) {
    try {
      const raw = await fs.readFile(manifestPath, "utf8");
      const manifest = parsePluginManifest(raw);
      loaded.push({ manifest, sourcePath: manifestPath });
    } catch (error) {
      failures.push({
        filePath: manifestPath,
        message: error instanceof Error ? error.message : "Unknown plugin error.",
      });
    }
  }

  return {
    pluginDirectory: primaryDirectory,
    loadedAt: new Date().toISOString(),
    loaded,
    failures,
  };
}

export async function loadRuntimePlugins(): Promise<PluginRuntimeState> {
  const primaryDirectory = path.join(app.getPath("userData"), "plugins");
  return loadRuntimePluginsFromDirectories(getPluginDirectories(), primaryDirectory);
}
