import { boardByType } from "./boards.js";
import type {
  CircuitComponent,
  CircuitPin,
  CircuitProject,
  GeneratorContext,
  GeneratorPlugin,
  GeneratorSection,
} from "./types.js";

type ArduinoBoard = "arduino-uno" | "arduino-nano";
type SupportedComponentType =
  | "led"
  | "push-button"
  | "resistor"
  | "buzzer"
  | "potentiometer"
  | "servo-motor"
  | "ultrasonic-sensor";

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
  resistorBindings: ArduinoDeviceBinding[];
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
  "resistor",
  "buzzer",
  "potentiometer",
  "servo-motor",
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

function dedupe<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
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
    } else {
      resolved.push(link);
    }
  }

  return resolved;
}

function analyzeCircuit(project: CircuitProject): SketchAnalysis {
  const board = project.components.find((component) =>
    component.type === "arduino-uno" || component.type === "arduino-nano",
  ) ?? null;

  const analysis: SketchAnalysis = {
    board,
    boardType: board?.type as ArduinoBoard | null,
    ledBindings: [],
    buttonBindings: [],
    resistorBindings: [],
    servoBindings: [],
    potentiometerBindings: [],
    buzzerBindings: [],
    ultrasonicBindings: [],
    notes: [],
  };

  if (!board) {
    analysis.notes.push("No Arduino Uno or Nano was found in the current circuit.");
    return analysis;
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
      analysis.ultrasonicBindings.push({
        component,
        trigPinLabel: byComponentPin.get(`${component.id}:trig`)?.[0] ?? null,
        echoPinLabel: byComponentPin.get(`${component.id}:echo`)?.[0] ?? null,
      });
      continue;
    }

    for (const pin of component.pins) {
      const arduinoPins = byComponentPin.get(`${component.id}:${pin.id}`) ?? [];
      for (const arduinoPinLabel of arduinoPins) {
        const binding = { component, pin, arduinoPinLabel };

        if (component.type === "led" && pin.id === "anode") {
          analysis.ledBindings.push(binding);
        }
        if (component.type === "push-button") {
          analysis.buttonBindings.push(binding);
        }
        if (component.type === "resistor") {
          analysis.resistorBindings.push(binding);
        }
        if (component.type === "servo-motor" && pin.id === "signal") {
          analysis.servoBindings.push(binding);
        }
        if (component.type === "potentiometer" && pin.id === "signal") {
          analysis.potentiometerBindings.push(binding);
        }
        if (component.type === "buzzer" && pin.id === "positive") {
          analysis.buzzerBindings.push(binding);
        }
      }
    }
  }

  analysis.ledBindings = dedupe(analysis.ledBindings, (item) => `${item.component.id}:${item.arduinoPinLabel}`);
  analysis.buttonBindings = dedupe(analysis.buttonBindings, (item) => `${item.component.id}:${item.arduinoPinLabel}`);
  analysis.resistorBindings = dedupe(analysis.resistorBindings, (item) => `${item.component.id}:${item.arduinoPinLabel}`);
  analysis.servoBindings = dedupe(analysis.servoBindings, (item) => `${item.component.id}:${item.arduinoPinLabel}`);
  analysis.potentiometerBindings = dedupe(analysis.potentiometerBindings, (item) => `${item.component.id}:${item.arduinoPinLabel}`);
  analysis.buzzerBindings = dedupe(analysis.buzzerBindings, (item) => `${item.component.id}:${item.arduinoPinLabel}`);
  analysis.ultrasonicBindings = dedupe(
    analysis.ultrasonicBindings.filter((binding) => binding.trigPinLabel || binding.echoPinLabel),
    (item) => item.component.id,
  );

  if (analysis.resistorBindings.length > 0) {
    analysis.notes.push(`Detected ${analysis.resistorBindings.length} Arduino-connected resistor path(s).`);
  }

  if (
    analysis.ledBindings.length === 0 &&
    analysis.buttonBindings.length === 0 &&
    analysis.servoBindings.length === 0 &&
    analysis.potentiometerBindings.length === 0 &&
    analysis.buzzerBindings.length === 0 &&
    analysis.ultrasonicBindings.length === 0
  ) {
    analysis.notes.push("No supported Arduino-connected components were detected for starter sketch generation.");
  }

  return analysis;
}

function createReserveName() {
  const usedNames = new Set<string>();
  return (base: string) => {
    let candidate = normalizeName(base);
    let suffix = 2;
    while (usedNames.has(candidate)) {
      candidate = `${normalizeName(base)}${suffix}`;
      suffix += 1;
    }
    usedNames.add(candidate);
    return candidate;
  };
}

function combineSections(sections: GeneratorSection[]) {
  return sections.reduce<Required<GeneratorSection>>(
    (accumulator, section) => ({
      includes: [...accumulator.includes, ...(section.includes ?? [])],
      definitions: [...accumulator.definitions, ...(section.definitions ?? [])],
      setup: [...accumulator.setup, ...(section.setup ?? [])],
      loop: [...accumulator.loop, ...(section.loop ?? [])],
      notes: [...accumulator.notes, ...(section.notes ?? [])],
    }),
    { includes: [], definitions: [], setup: [], loop: [], notes: [] },
  );
}

function createGeneratorPlugins(analysis: SketchAnalysis): GeneratorPlugin[] {
  return [
    {
      kind: "generator",
      id: "generator:led",
      supports: (componentType) => componentType === "led",
      buildSection: () => {
        const reserveName = createReserveName();
        const definitions: string[] = [];
        const setup: string[] = [];
        const loop: string[] = [];

        const ledVars = analysis.ledBindings.map((binding) => ({
          name: reserveName(`${binding.component.name}Pin`),
          binding,
        }));
        const buttonVars = analysis.buttonBindings.map((binding) => ({
          name: reserveName(`${binding.component.name}Pin`),
          binding,
        }));

        for (const led of ledVars) {
          definitions.push(`const int ${led.name} = ${led.binding.arduinoPinLabel};`);
          setup.push(`pinMode(${led.name}, OUTPUT);`);
        }

        for (const button of buttonVars) {
          definitions.push(`const int ${button.name} = ${button.binding.arduinoPinLabel};`);
          setup.push(`pinMode(${button.name}, INPUT_PULLUP);`);
        }

        if (buttonVars.length > 0 && ledVars.length > 0) {
          loop.push(`int ${buttonVars[0].name}State = digitalRead(${buttonVars[0].name});`);
          loop.push(`digitalWrite(${ledVars[0].name}, ${buttonVars[0].name}State == LOW ? HIGH : LOW);`);
          loop.push("delay(20);");
        } else {
          for (const led of ledVars) {
            loop.push(`digitalWrite(${led.name}, HIGH);`);
            loop.push("delay(500);");
            loop.push(`digitalWrite(${led.name}, LOW);`);
            loop.push("delay(500);");
          }
        }

        return { definitions, setup, loop };
      },
    },
    {
      kind: "generator",
      id: "generator:servo",
      supports: (componentType) => componentType === "servo-motor" || componentType === "potentiometer",
      buildSection: () => {
        const reserveName = createReserveName();
        const includes = analysis.servoBindings.length > 0 ? ["#include <Servo.h>"] : [];
        const definitions: string[] = [];
        const setup: string[] = [];
        const loop: string[] = [];
        const notes: string[] = [];

        const servoVars = analysis.servoBindings.map((binding) => ({
          objectName: reserveName(`${binding.component.name}Servo`),
          pinName: reserveName(`${binding.component.name}Pin`),
          binding,
        }));
        const potentiometerVars = analysis.potentiometerBindings.map((binding) => ({
          name: reserveName(`${binding.component.name}Pin`),
          binding,
        }));

        for (const potentiometer of potentiometerVars) {
          definitions.push(`const int ${potentiometer.name} = ${potentiometer.binding.arduinoPinLabel};`);
        }

        for (const servo of servoVars) {
          definitions.push(`const int ${servo.pinName} = ${servo.binding.arduinoPinLabel};`);
          definitions.push(`Servo ${servo.objectName};`);
          setup.push(`${servo.objectName}.attach(${servo.pinName});`);
          if (potentiometerVars[0]) {
            const readingName = reserveName(`${potentiometerVars[0].binding.component.name}Value`);
            const angleName = reserveName(`${servo.binding.component.name}Angle`);
            loop.push(`int ${readingName} = analogRead(${potentiometerVars[0].name});`);
            loop.push(`int ${angleName} = map(${readingName}, 0, 1023, 0, 180);`);
            loop.push(`${servo.objectName}.write(${angleName});`);
          } else {
            loop.push(`${servo.objectName}.write(0);`);
            loop.push("delay(600);");
            loop.push(`${servo.objectName}.write(90);`);
            loop.push("delay(600);");
            loop.push(`${servo.objectName}.write(180);`);
            loop.push("delay(600);");
          }
        }

        if (analysis.servoBindings.length > 0 && analysis.potentiometerBindings.length === 0) {
          notes.push("Servo template uses a sweep pattern because no potentiometer control input was detected.");
        }

        return { includes, definitions, setup, loop, notes };
      },
    },
    {
      kind: "generator",
      id: "generator:buzzer",
      supports: (componentType) => componentType === "buzzer",
      buildSection: () => {
        const reserveName = createReserveName();
        const definitions: string[] = [];
        const setup: string[] = [];
        const loop: string[] = [];

        for (const binding of analysis.buzzerBindings) {
          const pinName = reserveName(`${binding.component.name}Pin`);
          definitions.push(`const int ${pinName} = ${binding.arduinoPinLabel};`);
          setup.push(`pinMode(${pinName}, OUTPUT);`);
          loop.push(`tone(${pinName}, 880, 180);`);
          loop.push("delay(280);");
        }

        return { definitions, setup, loop };
      },
    },
    {
      kind: "generator",
      id: "generator:ultrasonic",
      supports: (componentType) => componentType === "ultrasonic-sensor",
      buildSection: () => {
        const reserveName = createReserveName();
        const definitions: string[] = [];
        const setup: string[] = [];
        const loop: string[] = [];
        const notes: string[] = [];

        for (const binding of analysis.ultrasonicBindings) {
          const trigName = reserveName(`${binding.component.name}TrigPin`);
          const echoName = reserveName(`${binding.component.name}EchoPin`);

          if (binding.trigPinLabel) {
            definitions.push(`const int ${trigName} = ${binding.trigPinLabel};`);
            setup.push(`pinMode(${trigName}, OUTPUT);`);
          }
          if (binding.echoPinLabel) {
            definitions.push(`const int ${echoName} = ${binding.echoPinLabel};`);
            setup.push(`pinMode(${echoName}, INPUT);`);
          }

          if (!binding.trigPinLabel || !binding.echoPinLabel) {
            notes.push(`${binding.component.name} is missing either TRIG or ECHO Arduino pin detection.`);
            continue;
          }

          const durationName = reserveName(`${binding.component.name}Duration`);
          const distanceName = reserveName(`${binding.component.name}DistanceCm`);
          loop.push(`digitalWrite(${trigName}, LOW);`);
          loop.push("delayMicroseconds(2);");
          loop.push(`digitalWrite(${trigName}, HIGH);`);
          loop.push("delayMicroseconds(10);");
          loop.push(`digitalWrite(${trigName}, LOW);`);
          loop.push(`long ${durationName} = pulseIn(${echoName}, HIGH);`);
          loop.push(`float ${distanceName} = ${durationName} * 0.0343 / 2.0;`);
          loop.push(`Serial.print("${binding.component.name} distance (cm): ");`);
          loop.push(`Serial.println(${distanceName});`);
          loop.push("delay(250);");
        }

        return { definitions, setup, loop, notes };
      },
    },
  ];
}

function generateCode(project: CircuitProject, analysis: SketchAnalysis) {
  const board = analysis.boardType ? boardByType[analysis.boardType] : null;
  const context: GeneratorContext = { project, board };
  const plugins = createGeneratorPlugins(analysis);

  const activePlugins = plugins.filter((plugin) =>
    project.components.some((component) => plugin.supports(component.type)),
  );

  const combined = combineSections(activePlugins.map((plugin) => plugin.buildSection(context)));
  const includes = dedupe(combined.includes, (item) => item);
  const definitions = dedupe(combined.definitions, (item) => item);
  const setup = ["Serial.begin(9600);", ...combined.setup];
  const loop = combined.loop.length > 0 ? combined.loop : ["// Add your control logic here.", "delay(100);"];
  const notes = [...analysis.notes, ...combined.notes];

  return [
    ...includes,
    ...includes.length ? [""] : [],
    "// Generated code is a starter template and may require manual refinement.",
    ...notes.map((note) => `// Note: ${note}`),
    ...notes.length ? [""] : [],
    ...definitions,
    ...definitions.length ? [""] : [],
    "void setup() {",
    ...indent(setup),
    "}",
    "",
    "void loop() {",
    ...indent(loop),
    "}",
    "",
  ].join("\n");
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
