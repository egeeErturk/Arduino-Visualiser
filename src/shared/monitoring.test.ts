import { describe, expect, it } from "vitest";
import { createInitialSimulationState } from "./simulation.js";
import {
  getArduinoCliMetrics,
  getBoardUsage,
  getCircuitHealth,
  getComponentUsage,
  getPerformanceMetrics,
  getPluginMetrics,
  getProjectMetrics,
  getSimulationMetrics,
} from "./monitoring.js";
import { getBoardByType } from "./plugins.js";
import { validateProject } from "./validation.js";
import { connect, createProject, placeComponent } from "./testUtils.js";

describe("monitoring metrics", () => {
  it("calculates board and component usage metrics", () => {
    const project = createProject("Monitor");
    const uno = placeComponent("arduino-uno", { x: 0, y: 0 }, "Uno");
    const led = placeComponent("led", { x: 120, y: 0 }, "LED 1");
    const resistor = placeComponent("resistor", { x: 60, y: 0 }, "220R");
    const button = placeComponent("push-button", { x: 120, y: 120 }, "Button 1");

    project.components = [uno, resistor, led, button];
    project.connections = [
      connect(uno.id, "d13", resistor.id, "left"),
      connect(resistor.id, "right", led.id, "anode"),
      connect(uno.id, "d2", button.id, "a"),
      connect(uno.id, "gnd-a", led.id, "cathode"),
    ];

    const boardUsage = getBoardUsage(project, getBoardByType()["arduino-uno"]);
    const componentUsage = getComponentUsage(project);

    expect(boardUsage.digital.used).toBeGreaterThanOrEqual(2);
    expect(boardUsage.usedPinLabels).toContain("D13");
    expect(componentUsage.total).toBe(4);
    expect(componentUsage.passiveCount).toBeGreaterThanOrEqual(1);
    expect(componentUsage.mostConnectedComponent?.name).toBe("Uno");
  });

  it("calculates health, project, plugin, cli, and performance metrics", () => {
    const project = createProject("Health");
    const uno = placeComponent("arduino-uno", { x: 0, y: 0 }, "Uno");
    const led = placeComponent("led", { x: 120, y: 0 }, "LED 1");
    project.components = [uno, led];
    project.connections = [connect(uno.id, "5v", led.id, "anode")];

    const warnings = validateProject(project);
    const health = getCircuitHealth(project, warnings);
    const projectMetrics = getProjectMetrics(project, warnings, {
      dirty: true,
      filePath: "C:\\projects\\demo.avc",
      lastSavedAt: "2026-06-16T10:00:00.000Z",
    });
    const pluginMetrics = getPluginMetrics({
      pluginDirectory: "C:\\plugins",
      loadedAt: "2026-06-16T10:00:00.000Z",
      loaded: [{
        manifest: { id: "demo", name: "Demo", version: "1.0.0" },
        sourcePath: "C:\\plugins\\demo\\plugin.json",
      }],
      failures: [{ filePath: "C:\\plugins\\bad.json", message: "Invalid manifest" }],
    });
    const cliMetrics = getArduinoCliMetrics({
      cliStatus: { found: true, cliPath: "arduino-cli", version: "1.0.0", error: null },
      ports: [{ address: "COM3", label: "COM3", protocol: "serial", boardName: "Arduino Uno", fqbn: "arduino:avr:uno" }],
      selectedPort: "COM3",
      lastCompileStatus: "success",
      lastUploadStatus: "idle",
      serialMonitorStatus: "running",
    });
    const performanceMetrics = getPerformanceMetrics(project, {
      undoStackSize: 3,
      redoStackSize: 1,
      autosaveStatus: "active",
      lastAction: "Added LED",
    });

    expect(health.invalidPowerConnectionCount).toBeGreaterThan(0);
    expect(projectMetrics.dirty).toBe(true);
    expect(pluginMetrics.loadedPluginsCount).toBe(1);
    expect(pluginMetrics.failedPluginsCount).toBe(1);
    expect(cliMetrics.cliDetected).toBe(true);
    expect(cliMetrics.serialMonitorStatus).toBe("running");
    expect(performanceMetrics.undoStackSize).toBe(3);
    expect(performanceMetrics.nodes).toBe(2);
  });

  it("calculates simulation metrics", () => {
    const project = createProject("Simulation");
    const state = createInitialSimulationState(project);
    state.setupComplete = true;
    state.loopCount = 4;
    state.millis = 250;
    state.digitalPins = { D13: 1, D2: 0 };
    state.analogPins = { A0: 512 };
    state.serial = ["Hello\n", "World\n"];

    const metrics = getSimulationMetrics(state);

    expect(metrics.state).toBe("paused");
    expect(metrics.loopCount).toBe(4);
    expect(metrics.highPinsCount).toBe(1);
    expect(metrics.lowPinsCount).toBe(1);
    expect(metrics.serialLinesCount).toBe(2);
  });
});
