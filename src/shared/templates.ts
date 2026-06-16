import { createComponentFromDefinition, createEmptyProject, createId } from "./project.js";
import { catalogByType } from "./catalog.js";
import type { CircuitComponent, CircuitConnection, Position, ProjectTemplate } from "./types.js";

function place(type: string, position: Position, name?: string): CircuitComponent {
  const definition = catalogByType[type];
  if (!definition) {
    throw new Error(`Unknown component type: ${type}`);
  }
  const component = createComponentFromDefinition(definition, position);
  if (name) {
    component.name = name;
  }
  return component;
}

function connect(
  fromComponentId: string,
  fromPinId: string,
  toComponentId: string,
  toPinId: string,
  color = "#f97316",
): CircuitConnection {
  return {
    id: createId("connection"),
    fromComponentId,
    fromPinId,
    toComponentId,
    toPinId,
    color,
  };
}

function buildTemplate(
  id: string,
  name: string,
  description: string,
  tags: string[],
  boardType: string,
  components: CircuitComponent[],
  connections: CircuitConnection[],
): ProjectTemplate {
  const project = createEmptyProject(name);
  project.metadata.description = description;
  project.metadata.boardType = boardType;
  project.components = components;
  project.connections = connections;

  return {
    id,
    name,
    description,
    tags,
    boardType,
    project,
  };
}

export const projectTemplates: ProjectTemplate[] = (() => {
  const blinkArduino = place("arduino-uno", { x: 120, y: 120 }, "Arduino Uno");
  const blinkLed = place("led", { x: 480, y: 120 }, "LED 1");
  const blinkResistor = place("resistor", { x: 350, y: 130 }, "220R");

  const buttonArduino = place("arduino-uno", { x: 120, y: 120 }, "Arduino Uno");
  const buttonLed = place("led", { x: 520, y: 100 }, "LED 1");
  const buttonResistor = place("resistor", { x: 380, y: 110 }, "220R");
  const button = place("push-button", { x: 480, y: 260 }, "Button 1");

  const trafficArduino = place("arduino-uno", { x: 120, y: 140 }, "Arduino Uno");
  const redLed = place("led", { x: 540, y: 80 }, "Red LED");
  const yellowLed = place("led", { x: 540, y: 210 }, "Yellow LED");
  const greenLed = place("led", { x: 540, y: 340 }, "Green LED");

  const servoArduino = place("arduino-uno", { x: 120, y: 140 }, "Arduino Uno");
  const servo = place("servo-motor", { x: 500, y: 180 }, "Servo 1");

  const ultrasonicArduino = place("arduino-uno", { x: 120, y: 140 }, "Arduino Uno");
  const ultrasonic = place("ultrasonic-sensor", { x: 500, y: 150 }, "Ultrasonic 1");

  const potArduino = place("arduino-uno", { x: 120, y: 140 }, "Arduino Uno");
  const potentiometer = place("potentiometer", { x: 500, y: 180 }, "Potentiometer 1");
  const dimmerLed = place("led", { x: 700, y: 120 }, "LED 1");

  return [
    buildTemplate(
      "blink-led",
      "Blink LED",
      "Simple Arduino blink starter with one LED driven by D13.",
      ["led", "starter", "basic"],
      "arduino-uno",
      [blinkArduino, blinkResistor, blinkLed],
      [
        connect(blinkArduino.id, "d13", blinkResistor.id, "left"),
        connect(blinkResistor.id, "right", blinkLed.id, "anode"),
      ],
    ),
    buildTemplate(
      "button-led",
      "Push Button LED",
      "Button input controlling an LED output.",
      ["button", "led", "input"],
      "arduino-uno",
      [buttonArduino, buttonResistor, buttonLed, button],
      [
        connect(buttonArduino.id, "d13", buttonResistor.id, "left"),
        connect(buttonResistor.id, "right", buttonLed.id, "anode"),
        connect(buttonArduino.id, "d2", button.id, "a"),
      ],
    ),
    buildTemplate(
      "traffic-light",
      "Traffic Light",
      "Three LEDs connected to separate Arduino outputs for sequencing exercises.",
      ["led", "sequence"],
      "arduino-uno",
      [trafficArduino, redLed, yellowLed, greenLed],
      [
        connect(trafficArduino.id, "d13", redLed.id, "anode"),
        connect(trafficArduino.id, "d12", yellowLed.id, "anode"),
        connect(trafficArduino.id, "d11", greenLed.id, "anode"),
      ],
    ),
    buildTemplate(
      "servo-sweep",
      "Servo Sweep",
      "Servo motor starter connected to a PWM output pin.",
      ["servo", "pwm"],
      "arduino-uno",
      [servoArduino, servo],
      [connect(servoArduino.id, "d9", servo.id, "signal")],
    ),
    buildTemplate(
      "ultrasonic-distance",
      "Ultrasonic Distance Meter",
      "Ultrasonic sensor starter with TRIG and ECHO connected to digital pins.",
      ["sensor", "distance"],
      "arduino-uno",
      [ultrasonicArduino, ultrasonic],
      [
        connect(ultrasonicArduino.id, "d7", ultrasonic.id, "trig"),
        connect(ultrasonicArduino.id, "d8", ultrasonic.id, "echo"),
      ],
    ),
    buildTemplate(
      "potentiometer-dimmer",
      "Potentiometer Dimmer",
      "Analog potentiometer input plus LED output starter.",
      ["analog", "pwm", "led"],
      "arduino-uno",
      [potArduino, potentiometer, dimmerLed],
      [
        connect(potArduino.id, "a0", potentiometer.id, "signal"),
        connect(potArduino.id, "d9", dimmerLed.id, "anode"),
      ],
    ),
  ];
})();

export const templateById = Object.fromEntries(projectTemplates.map((template) => [template.id, template]));
