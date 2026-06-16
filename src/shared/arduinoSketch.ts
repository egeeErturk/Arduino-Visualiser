import type { CircuitComponent, CircuitPin, CircuitProject } from "./types.js";

type SupportedComponentType =
  | "led"
  | "push-button"
  | "servo-motor"
  | "potentiometer"
  | "buzzer"
  | "ultrasonic-sensor";

type ArduinoBoard = Extract<CircuitComponent["type"], "arduino-uno" | "arduino-nano">;

interface PinLink {
  component: CircuitComponent;
  pin: CircuitPin;
}

interface ArduinoDeviceBinding {
  component: CircuitComponent;
  pin: CircuitPin;
  arduinoPinLabel: string;
}

interface UltrasonicBinding {
  component: CircuitComponent;
  trigPinLabel: string | null;
  echoPinLabel: string | null;
}

export interface SketchAnalysis {
  board: CircuitComponent | null;
  boardType: ArduinoBoard | null;
  ledBindings: ArduinoDeviceBinding[];
  buttonBindings: ArduinoDeviceBinding[];
  servoBindings: ArduinoDeviceBinding[];
  potentiometerBindings: ArduinoDeviceBinding[];
  buzzerBindings: ArduinoDeviceBinding[];
  ultrasonicBindings: UltrasonicBinding[];
  notes: string[];
}

export interface GeneratedSketch {
  fileName: string;
  code: string;
  analysis: SketchAnalysis;
}

const passThroughTypes = new Set(["resistor", "breadboard", "jumper-wire"]);
const supportedTypes = new Set<SupportedComponentType>([
  "led",
  "push-button",
  "servo-motor",
  "potentiometer",
  "buzzer",
  "ultrasonic-sensor",
]);

function normalizeName(name: string) {
  const compact = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, character: string) => character.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "");

  if (!compact) {
    return "device";
  }

  return /^[0-9]/.test(compact) ? `device${compact}` : compact;
}

function indent(lines: string[], level = 1) {
  const prefix = "  ".repeat(level);
  return lines.map((line) => (line ? `${prefix}${line}` : ""));
}

function createPinLookup(project: CircuitProject) {
  const componentsById = new Map(project.components.map((component) => [component.id, component]));
  const keyToLinks = new Map<string, PinLink[]>();

  const addLink = (componentId: string, pinId: string, link: PinLink) => {
    const key = `${componentId}:${pinId}`;
    keyToLinks.set(key, [...(keyToLinks.get(key) ?? []), link]);
  };

  for (const connection of project.connections) {
    const fromComponent = componentsById.get(connection.fromComponentId);
    const toComponent = componentsById.get(connection.toComponentId);
    const fromPin = fromComponent?.pins.find((pin) => pin.id === connection.fromPinId);
    const toPin = toComponent?.pins.find((pin) => pin.id === connection.toPinId);

    if (!fromComponent || !toComponent || !fromPin || !toPin) {
      continue;
    }

    addLink(fromComponent.id, fromPin.id, { component: toComponent, pin: toPin });
    addLink(toComponent.id, toPin.id, { component: fromComponent, pin: fromPin });
  }

  return keyToLinks;
}

function traverseFromPin(
  component: CircuitComponent,
  pin: CircuitPin,
  pinLookup: Map<string, PinLink[]>,
  visited = new Set<string>(),
): PinLink[] {
  const key = `${component.id}:${pin.id}`;
  if (visited.has(key)) {
    return [];
  }
  visited.add(key);

  const directLinks = pinLookup.get(key) ?? [];
  const resolved: PinLink[] = [];

  for (const link of directLinks) {
    if (passThroughTypes.has(link.component.type)) {
      for (const nextPin of link.component.pins.filter((candidate) => candidate.id !== link.pin.id)) {
        resolved.push(...traverseFromPin(link.component, nextPin, pinLookup, visited));
      }
      continue;
    }

    resolved.push(link);
  }

  return resolved;
}

function dedupeBindings(bindings: ArduinoDeviceBinding[]) {
  const seen = new Set<string>();
  return bindings.filter((binding) => {
    const key = `${binding.component.id}:${binding.pin.id}:${binding.arduinoPinLabel}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function findBoard(project: CircuitProject) {
  return project.components.find((component) =>
    component.type === "arduino-uno" || component.type === "arduino-nano",
  ) ?? null;
}

function analyzeCircuit(project: CircuitProject): SketchAnalysis {
  const board = findBoard(project);
  const empty: SketchAnalysis = {
    board,
    boardType: board ? (board.type as ArduinoBoard) : null,
    ledBindings: [],
    buttonBindings: [],
    servoBindings: [],
    potentiometerBindings: [],
    buzzerBindings: [],
    ultrasonicBindings: [],
    notes: [],
  };

  if (!board) {
    empty.notes.push("No Arduino Uno or Nano was found in the current circuit.");
    return empty;
  }

  const pinLookup = createPinLookup(project);
  const byComponentPin = new Map<string, string[]>();

  for (const pin of board.pins.filter((candidate) => candidate.label.startsWith("D") || candidate.label.startsWith("A"))) {
    const links = traverseFromPin(board, pin, pinLookup);
    for (const link of links) {
      const key = `${link.component.id}:${link.pin.id}`;
      byComponentPin.set(key, [...(byComponentPin.get(key) ?? []), pin.label]);
    }
  }

  for (const component of project.components) {
    if (!supportedTypes.has(component.type as SupportedComponentType)) {
      continue;
    }

    if (component.type === "ultrasonic-sensor") {
      const trigPin = component.pins.find((pin) => pin.id === "trig");
      const echoPin = component.pins.find((pin) => pin.id === "echo");
      const trigBinding = trigPin ? byComponentPin.get(`${component.id}:${trigPin.id}`)?.[0] ?? null : null;
      const echoBinding = echoPin ? byComponentPin.get(`${component.id}:${echoPin.id}`)?.[0] ?? null : null;

      if (trigBinding || echoBinding) {
        empty.ultrasonicBindings.push({
          component,
          trigPinLabel: trigBinding,
          echoPinLabel: echoBinding,
        });
      }
      continue;
    }

    for (const pin of component.pins) {
      const arduinoPins = byComponentPin.get(`${component.id}:${pin.id}`) ?? [];
      for (const arduinoPinLabel of arduinoPins) {
        const binding = { component, pin, arduinoPinLabel };
        if (component.type === "led" && pin.id === "anode") {
          empty.ledBindings.push(binding);
        }
        if (component.type === "push-button") {
          empty.buttonBindings.push(binding);
        }
        if (component.type === "servo-motor" && pin.id === "signal") {
          empty.servoBindings.push(binding);
        }
        if (component.type === "potentiometer" && pin.id === "signal") {
          empty.potentiometerBindings.push(binding);
        }
        if (component.type === "buzzer" && pin.id === "positive") {
          empty.buzzerBindings.push(binding);
        }
      }
    }
  }

  empty.ledBindings = dedupeBindings(empty.ledBindings);
  empty.buttonBindings = dedupeBindings(empty.buttonBindings);
  empty.servoBindings = dedupeBindings(empty.servoBindings);
  empty.potentiometerBindings = dedupeBindings(empty.potentiometerBindings);
  empty.buzzerBindings = dedupeBindings(empty.buzzerBindings);

  if (
    empty.ledBindings.length === 0 &&
    empty.buttonBindings.length === 0 &&
    empty.servoBindings.length === 0 &&
    empty.potentiometerBindings.length === 0 &&
    empty.buzzerBindings.length === 0 &&
    empty.ultrasonicBindings.length === 0
  ) {
    empty.notes.push("No supported Arduino-connected components were detected for starter sketch generation.");
  }

  return empty;
}

function generateCode(project: CircuitProject, analysis: SketchAnalysis) {
  const includes = new Set<string>();
  const definitions: string[] = [];
  const setupLines: string[] = ["Serial.begin(9600);"];
  const loopLines: string[] = [];
  const notes = [...analysis.notes];
  const usedNames = new Set<string>();

  const reserveName = (base: string) => {
    let candidate = normalizeName(base);
    let suffix = 2;
    while (usedNames.has(candidate)) {
      candidate = `${normalizeName(base)}${suffix}`;
      suffix += 1;
    }
    usedNames.add(candidate);
    return candidate;
  };

  const ledVars = analysis.ledBindings.map((binding) => ({
    name: reserveName(`${binding.component.name}Pin`),
    binding,
  }));
  const buttonVars = analysis.buttonBindings.map((binding) => ({
    name: reserveName(`${binding.component.name}Pin`),
    binding,
  }));
  const servoVars = analysis.servoBindings.map((binding) => ({
    objectName: reserveName(`${binding.component.name}Servo`),
    pinName: reserveName(`${binding.component.name}Pin`),
    binding,
  }));
  const potentiometerVars = analysis.potentiometerBindings.map((binding) => ({
    name: reserveName(`${binding.component.name}Pin`),
    binding,
  }));
  const buzzerVars = analysis.buzzerBindings.map((binding) => ({
    name: reserveName(`${binding.component.name}Pin`),
    binding,
  }));
  const ultrasonicVars = analysis.ultrasonicBindings.map((binding) => ({
    trigName: reserveName(`${binding.component.name}TrigPin`),
    echoName: reserveName(`${binding.component.name}EchoPin`),
    binding,
  }));

  for (const led of ledVars) {
    definitions.push(`const int ${led.name} = ${led.binding.arduinoPinLabel};`);
    setupLines.push(`pinMode(${led.name}, OUTPUT);`);
  }

  for (const button of buttonVars) {
    definitions.push(`const int ${button.name} = ${button.binding.arduinoPinLabel};`);
    setupLines.push(`pinMode(${button.name}, INPUT_PULLUP);`);
  }

  if (servoVars.length > 0) {
    includes.add("#include <Servo.h>");
  }

  for (const servo of servoVars) {
    definitions.push(`const int ${servo.pinName} = ${servo.binding.arduinoPinLabel};`);
    definitions.push(`Servo ${servo.objectName};`);
    setupLines.push(`${servo.objectName}.attach(${servo.pinName});`);
  }

  for (const potentiometer of potentiometerVars) {
    definitions.push(`const int ${potentiometer.name} = ${potentiometer.binding.arduinoPinLabel};`);
  }

  for (const buzzer of buzzerVars) {
    definitions.push(`const int ${buzzer.name} = ${buzzer.binding.arduinoPinLabel};`);
    setupLines.push(`pinMode(${buzzer.name}, OUTPUT);`);
  }

  for (const sensor of ultrasonicVars) {
    if (sensor.binding.trigPinLabel) {
      definitions.push(`const int ${sensor.trigName} = ${sensor.binding.trigPinLabel};`);
      setupLines.push(`pinMode(${sensor.trigName}, OUTPUT);`);
    }
    if (sensor.binding.echoPinLabel) {
      definitions.push(`const int ${sensor.echoName} = ${sensor.binding.echoPinLabel};`);
      setupLines.push(`pinMode(${sensor.echoName}, INPUT);`);
    }
  }

  if (buttonVars.length > 0 && ledVars.length > 0) {
    const button = buttonVars[0];
    const led = ledVars[0];
    loopLines.push(`int ${button.name}State = digitalRead(${button.name});`);
    loopLines.push(`digitalWrite(${led.name}, ${button.name}State == LOW ? HIGH : LOW);`);
    loopLines.push("delay(20);");
  } else if (ledVars.length > 0) {
    for (const led of ledVars) {
      loopLines.push(`digitalWrite(${led.name}, HIGH);`);
      loopLines.push("delay(500);");
      loopLines.push(`digitalWrite(${led.name}, LOW);`);
      loopLines.push("delay(500);");
    }
  }

  if (servoVars.length > 0) {
    const controlPot = potentiometerVars[0];
    for (const servo of servoVars) {
      if (controlPot) {
        const readingName = reserveName(`${controlPot.binding.component.name}Value`);
        const angleName = reserveName(`${servo.binding.component.name}Angle`);
        loopLines.push(`int ${readingName} = analogRead(${controlPot.name});`);
        loopLines.push(`int ${angleName} = map(${readingName}, 0, 1023, 0, 180);`);
        loopLines.push(`${servo.objectName}.write(${angleName});`);
      } else {
        loopLines.push(`${servo.objectName}.write(0);`);
        loopLines.push("delay(600);");
        loopLines.push(`${servo.objectName}.write(90);`);
        loopLines.push("delay(600);");
        loopLines.push(`${servo.objectName}.write(180);`);
        loopLines.push("delay(600);");
      }
    }
  }

  for (const sensor of ultrasonicVars) {
    if (!sensor.binding.trigPinLabel || !sensor.binding.echoPinLabel) {
      notes.push(`${sensor.binding.component.name} is missing either TRIG or ECHO Arduino pin detection.`);
      continue;
    }

    const durationName = reserveName(`${sensor.binding.component.name}Duration`);
    const distanceName = reserveName(`${sensor.binding.component.name}DistanceCm`);
    loopLines.push(`digitalWrite(${sensor.trigName}, LOW);`);
    loopLines.push("delayMicroseconds(2);");
    loopLines.push(`digitalWrite(${sensor.trigName}, HIGH);`);
    loopLines.push("delayMicroseconds(10);");
    loopLines.push(`digitalWrite(${sensor.trigName}, LOW);`);
    loopLines.push(`long ${durationName} = pulseIn(${sensor.echoName}, HIGH);`);
    loopLines.push(`float ${distanceName} = ${durationName} * 0.0343 / 2.0;`);
    loopLines.push(`Serial.print("${sensor.binding.component.name} distance (cm): ");`);
    loopLines.push(`Serial.println(${distanceName});`);
    loopLines.push("delay(250);");
  }

  for (const buzzer of buzzerVars) {
    loopLines.push(`tone(${buzzer.name}, 880, 180);`);
    loopLines.push("delay(280);");
  }

  if (loopLines.length === 0) {
    loopLines.push("// Add your control logic here.");
    loopLines.push("delay(100);");
  }

  const orderedIncludes = [...includes];
  const codeSections = [
    ...orderedIncludes,
    ...orderedIncludes.length ? [""] : [],
    "// Generated code is a starter template and may require manual refinement.",
    ...notes.map((note) => `// Note: ${note}`),
    ...notes.length ? [""] : [],
    ...definitions,
    ...definitions.length ? [""] : [],
    "void setup() {",
    ...indent(setupLines),
    "}",
    "",
    "void loop() {",
    ...indent(loopLines),
    "}",
    "",
  ];

  return codeSections.join("\n");
}

export function analyzeCircuitForSketch(project: CircuitProject) {
  return analyzeCircuit(project);
}

export function generateArduinoSketch(project: CircuitProject): GeneratedSketch {
  const analysis = analyzeCircuit(project);
  const sketchBaseName = project.metadata.name.trim().replace(/[^a-zA-Z0-9-_]/g, "_") || "ArduinoCircuit";

  return {
    fileName: `${sketchBaseName}.ino`,
    code: generateCode(project, analysis),
    analysis,
  };
}
