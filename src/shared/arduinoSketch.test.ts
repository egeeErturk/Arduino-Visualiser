import { describe, expect, it } from "vitest";
import { analyzeCircuitForSketch, generateArduinoSketch } from "./arduinoSketch.js";
import { templateById } from "./templates.js";

describe("Arduino sketch generator", () => {
  it("detects LED and button bindings in the button template", () => {
    const project = templateById["button-led"].project;
    const analysis = analyzeCircuitForSketch(project);

    expect(analysis.boardType).toBe("arduino-uno");
    expect(analysis.ledBindings.length).toBeGreaterThan(0);
    expect(analysis.buttonBindings.length).toBeGreaterThan(0);
  });

  it("generates servo and ultrasonic starter code patterns", () => {
    const servoSketch = generateArduinoSketch(templateById["servo-sweep"].project);
    const ultrasonicSketch = generateArduinoSketch(templateById["ultrasonic-distance"].project);

    expect(servoSketch.code).toContain("#include <Servo.h>");
    expect(servoSketch.code).toContain(".attach(");
    expect(ultrasonicSketch.code).toContain("pulseIn");
    expect(ultrasonicSketch.code).toContain("Serial.println");
  });
});
