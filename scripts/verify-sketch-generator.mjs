/* global console, process */

import { generateArduinoSketch } from "../dist-electron/shared/arduinoSketch.js";

function createProject(name, components, connections) {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    metadata: {
      name,
      createdAt: now,
      updatedAt: now,
    },
    viewport: {
      x: 0,
      y: 0,
      zoom: 1,
    },
    components,
    connections,
  };
}

function createArduino() {
  return {
    id: "arduino-1",
    type: "arduino-uno",
    name: "Arduino Uno",
    category: "Controllers",
    position: { x: 0, y: 0 },
    size: { width: 280, height: 360 },
    accent: "#2563eb",
    pins: [
      ...Array.from({ length: 14 }, (_, index) => ({
        id: `d${index}`,
        label: `D${index}`,
        side: "left",
        offset: 44 + index * 18,
        kind: "digital",
        direction: "output",
      })),
      ...Array.from({ length: 6 }, (_, index) => ({
        id: `a${index}`,
        label: `A${index}`,
        side: "right",
        offset: 74 + index * 30,
        kind: "analog",
        direction: "bidirectional",
      })),
      { id: "5v", label: "5V", side: "top", offset: 62, kind: "power", direction: "power" },
      { id: "gnd-a", label: "GND", side: "bottom", offset: 86, kind: "ground", direction: "ground" },
    ],
  };
}

function createLed() {
  return {
    id: "led-1",
    type: "led",
    name: "LED 1",
    category: "Outputs",
    position: { x: 320, y: 40 },
    size: { width: 140, height: 132 },
    accent: "#f43f5e",
    pins: [
      { id: "anode", label: "Anode", side: "left", offset: 66, kind: "signal", direction: "input" },
      { id: "cathode", label: "Cathode", side: "right", offset: 66, kind: "ground", direction: "ground" },
    ],
  };
}

function createButton() {
  return {
    id: "button-1",
    type: "push-button",
    name: "Button 1",
    category: "Inputs",
    position: { x: 320, y: 200 },
    size: { width: 140, height: 120 },
    accent: "#6366f1",
    pins: [
      { id: "a", label: "Pin A", side: "left", offset: 60, kind: "signal", direction: "input" },
      { id: "b", label: "Pin B", side: "right", offset: 60, kind: "signal", direction: "input" },
    ],
  };
}

function createServo() {
  return {
    id: "servo-1",
    type: "servo-motor",
    name: "Servo 1",
    category: "Actuators",
    position: { x: 320, y: 200 },
    size: { width: 180, height: 128 },
    accent: "#0f766e",
    pins: [
      { id: "signal", label: "Signal", side: "bottom", offset: 42, kind: "signal", direction: "input" },
      { id: "vcc", label: "VCC", side: "bottom", offset: 90, kind: "power", direction: "power" },
      { id: "gnd", label: "GND", side: "bottom", offset: 138, kind: "ground", direction: "ground" },
    ],
  };
}

function createUltrasonic() {
  return {
    id: "ultra-1",
    type: "ultrasonic-sensor",
    name: "Ultrasonic 1",
    category: "Sensors",
    position: { x: 320, y: 200 },
    size: { width: 220, height: 144 },
    accent: "#1d4ed8",
    pins: [
      { id: "vcc", label: "VCC", side: "bottom", offset: 38, kind: "power", direction: "power" },
      { id: "trig", label: "TRIG", side: "bottom", offset: 86, kind: "signal", direction: "input" },
      { id: "echo", label: "ECHO", side: "bottom", offset: 134, kind: "signal", direction: "output" },
      { id: "gnd", label: "GND", side: "bottom", offset: 182, kind: "ground", direction: "ground" },
    ],
  };
}

function connection(id, fromComponentId, fromPinId, toComponentId, toPinId) {
  return { id, fromComponentId, fromPinId, toComponentId, toPinId, color: "#f97316" };
}

const scenarios = [
  {
    name: "LED circuit",
    project: createProject("Led Circuit", [createArduino(), createLed()], [
      connection("c1", "arduino-1", "d13", "led-1", "anode"),
    ]),
    expect: ["pinMode(", "digitalWrite(", "D13"],
  },
  {
    name: "Button + LED",
    project: createProject("Button Led Circuit", [createArduino(), createLed(), createButton()], [
      connection("c1", "arduino-1", "d13", "led-1", "anode"),
      connection("c2", "arduino-1", "d2", "button-1", "a"),
    ]),
    expect: ["INPUT_PULLUP", "digitalRead(", "? HIGH : LOW"],
  },
  {
    name: "Servo",
    project: createProject("Servo Circuit", [createArduino(), createServo()], [
      connection("c1", "arduino-1", "d9", "servo-1", "signal"),
    ]),
    expect: ["#include <Servo.h>", ".attach(", ".write("],
  },
  {
    name: "Ultrasonic sensor",
    project: createProject("Ultrasonic Circuit", [createArduino(), createUltrasonic()], [
      connection("c1", "arduino-1", "d7", "ultra-1", "trig"),
      connection("c2", "arduino-1", "d8", "ultra-1", "echo"),
    ]),
    expect: ["pulseIn(", "distance (cm)", "delayMicroseconds(10)"],
  },
];

let failures = 0;

for (const scenario of scenarios) {
  const result = generateArduinoSketch(scenario.project);
  const missing = scenario.expect.filter((snippet) => !result.code.includes(snippet));
  if (missing.length > 0) {
    failures += 1;
    console.error(`[FAIL] ${scenario.name}: missing ${missing.join(", ")}`);
  } else {
    console.log(`[PASS] ${scenario.name}`);
  }
}

if (failures > 0) {
  process.exitCode = 1;
}
