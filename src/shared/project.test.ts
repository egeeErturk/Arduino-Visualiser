import { describe, expect, it, vi } from "vitest";
import { normalizeImportedProject, parseProjectJson, serializeProject } from "./project.js";
import { connect, createProject, placeComponent } from "./testUtils.js";

describe("project serialization", () => {
  it("serializes and parses a project round-trip", () => {
    const project = createProject("Round Trip");
    const uno = placeComponent("arduino-uno", { x: 0, y: 0 }, "Uno");
    const led = placeComponent("led", { x: 120, y: 0 }, "LED");
    project.components = [uno, led];
    project.connections = [connect(uno.id, "d13", led.id, "anode")];

    const parsed = parseProjectJson(serializeProject(project));

    expect(parsed.metadata.name).toBe("Round Trip");
    expect(parsed.components).toHaveLength(2);
    expect(parsed.connections).toHaveLength(1);
  });

  it("repairs duplicate ids and removes unknown components during normalization", () => {
    const timestamp = "2026-06-16T00:00:00.000Z";
    vi.useFakeTimers();
    vi.setSystemTime(new Date(timestamp));

    const project = createProject("Normalize");
    const led = placeComponent("led", { x: 0, y: 0 }, "LED");
    const duplicateLed = { ...placeComponent("led", { x: 50, y: 0 }, "LED 2"), id: led.id };
    project.components = [
      led,
      duplicateLed,
      {
        ...placeComponent("led", { x: 80, y: 0 }, "Ghost"),
        type: "unknown-part",
      },
    ];
    project.connections = [
      connect(led.id, "anode", duplicateLed.id, "anode"),
      connect("missing", "a", led.id, "cathode"),
    ];

    const normalized = normalizeImportedProject(project);

    expect(normalized.components).toHaveLength(2);
    expect(normalized.components[0]?.id).not.toBe(normalized.components[1]?.id);
    expect(normalized.connections).toHaveLength(1);
    expect(normalized.metadata.updatedAt).toBe(timestamp);
    vi.useRealTimers();
  });
});
