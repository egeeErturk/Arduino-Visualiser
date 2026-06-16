import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { findManifestFiles, loadRuntimePluginsFromDirectories, parsePluginManifest } from "./pluginRuntime.js";

const pluginManifest = {
  id: "plugin.test-pack",
  name: "Test Pack",
  version: "1.0.0",
  components: [
    {
      type: "test-sensor",
      name: "Test Sensor",
      category: "Sensors",
      size: { width: 100, height: 80 },
      accent: "#22c55e",
      visualStyle: "sensor",
      pins: [
        { id: "vcc", label: "VCC", side: "bottom", offset: 20, kind: "power", direction: "power" },
        { id: "gnd", label: "GND", side: "bottom", offset: 60, kind: "ground", direction: "ground" },
      ],
    },
  ],
};

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("plugin runtime", () => {
  it("parses a valid plugin manifest", () => {
    const manifest = parsePluginManifest(JSON.stringify(pluginManifest));
    expect(manifest.id).toBe("plugin.test-pack");
    expect(manifest.components?.[0]?.type).toBe("test-sensor");
  });

  it("finds plugin manifests in subdirectories", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "plugin-runtime-"));
    tempDirs.push(directory);
    const pluginDirectory = path.join(directory, "sample-pack");
    await mkdir(pluginDirectory, { recursive: true });
    await writeFile(path.join(pluginDirectory, "plugin.json"), JSON.stringify(pluginManifest, null, 2), "utf8");

    const manifests = await findManifestFiles(directory);
    expect(manifests).toHaveLength(1);
    expect(manifests[0]).toMatch(/plugin\.json$/);
  });

  it("loads valid plugins and reports malformed ones without throwing", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "plugin-runtime-"));
    tempDirs.push(directory);
    const validDirectory = path.join(directory, "valid");
    const invalidDirectory = path.join(directory, "invalid");
    await mkdir(validDirectory, { recursive: true });
    await mkdir(invalidDirectory, { recursive: true });
    await writeFile(path.join(validDirectory, "plugin.json"), JSON.stringify(pluginManifest, null, 2), "utf8");
    await writeFile(path.join(invalidDirectory, "plugin.json"), "{\"id\":42}", "utf8");

    const runtime = await loadRuntimePluginsFromDirectories([directory], directory);

    expect(runtime.loaded).toHaveLength(1);
    expect(runtime.loaded[0]?.manifest.name).toBe("Test Pack");
    expect(runtime.failures).toHaveLength(1);
    expect(runtime.failures[0]?.filePath).toMatch(/invalid/);
  });
});
