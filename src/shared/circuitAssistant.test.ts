import { describe, expect, it } from "vitest";
import { analyzeCircuitProject } from "./circuitAssistant.js";
import { connect, createProject, placeComponent } from "./testUtils.js";

describe("circuit assistant", () => {
  it("detects duplicate power sources and missing resistor path", () => {
    const project = createProject("Assistant");
    const powerA = placeComponent("power-5v", { x: 0, y: 0 }, "Power A");
    const powerB = placeComponent("power-5v", { x: 0, y: 120 }, "Power B");
    const led = placeComponent("led", { x: 200, y: 0 }, "LED 1");
    project.components = [powerA, powerB, led];
    project.connections = [connect(powerA.id, "out", led.id, "anode")];

    const findings = analyzeCircuitProject(project);

    expect(findings.some((finding) => finding.category === "duplicate-power-source")).toBe(true);
    expect(findings.some((finding) => finding.category === "missing-resistor")).toBe(true);
  });

  it("detects missing ultrasonic sensor connections", () => {
    const project = createProject("Ultrasonic");
    const sensor = placeComponent("ultrasonic-sensor", { x: 0, y: 0 }, "Sensor");
    project.components = [sensor];

    const findings = analyzeCircuitProject(project);

    expect(findings.some((finding) => finding.category === "missing-sensor-connection")).toBe(true);
  });
});
