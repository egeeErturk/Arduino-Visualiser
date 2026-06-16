import type { CircuitComponent, CircuitPin, CircuitProject } from "./types.js";

const passThroughTypes = new Set(["resistor", "breadboard", "jumper-wire"]);

export interface SimulationState {
  running: boolean;
  setupComplete: boolean;
  loopPointer: number;
  loopCount: number;
  millis: number;
  warnings: string[];
  serial: string[];
  detectedPins: string[];
  pinModes: Record<string, string>;
  digitalPins: Record<string, number>;
  analogPins: Record<string, number>;
  servoAngles: Record<string, number>;
  activeConnections: string[];
  componentStates: Record<string, string | number | boolean>;
}

interface PinLink {
  component: CircuitComponent;
  pin: CircuitPin;
}

interface ParsedProgram {
  setupStatements: string[];
  loopStatements: string[];
}

function normalizePinLabel(token: string, env: Record<string, unknown>) {
  const trimmed = token.trim();
  if (trimmed in env && typeof env[trimmed] === "string") {
    return String(env[trimmed]);
  }
  if (/^A\d+$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  if (/^\d+$/.test(trimmed)) {
    return `D${trimmed}`;
  }
  return trimmed.replace(/['"]/g, "");
}

function splitArguments(source: string) {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  for (const character of source) {
    if (character === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    if (character === "(") {
      depth += 1;
    }
    if (character === ")") {
      depth -= 1;
    }
    current += character;
  }
  if (current.trim()) {
    parts.push(current.trim());
  }
  return parts;
}

function parseFunctionBody(code: string, functionName: "setup" | "loop") {
  const marker = `void ${functionName}`;
  const start = code.indexOf(marker);
  if (start === -1) {
    return "";
  }
  const blockStart = code.indexOf("{", start);
  if (blockStart === -1) {
    return "";
  }
  let depth = 0;
  for (let index = blockStart; index < code.length; index += 1) {
    if (code[index] === "{") {
      depth += 1;
    } else if (code[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return code.slice(blockStart + 1, index);
      }
    }
  }
  return "";
}

function tokenizeStatements(body: string) {
  return body
    .split(";")
    .map((statement) => statement.replace(/\/\/.*$/gm, "").trim())
    .map((statement) => statement.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function parseArduinoProgram(code: string): ParsedProgram {
  return {
    setupStatements: tokenizeStatements(parseFunctionBody(code, "setup")),
    loopStatements: tokenizeStatements(parseFunctionBody(code, "loop")),
  };
}

function evaluateExpression(expression: string, env: Record<string, unknown>, state: SimulationState, project: CircuitProject): unknown {
  const sanitized = expression.trim();
  if (/^".*"$/.test(sanitized) || /^'.*'$/.test(sanitized)) {
    return sanitized.slice(1, -1);
  }

  const safeExpression = sanitized
    .replaceAll("HIGH", "1")
    .replaceAll("LOW", "0")
    .replaceAll("true", "1")
    .replaceAll("false", "0");

  if (!/^[\w\s()+\-*/%<>=!?:.,"]+$/.test(safeExpression)) {
    throw new Error(`Unsupported expression syntax: ${expression}`);
  }

  const digitalRead = (pin: string) => state.digitalPins[normalizePinLabel(pin, env)] ?? 0;
  const analogRead = (pin: string) => state.analogPins[normalizePinLabel(pin, env)] ?? 0;
  const millis = () => state.millis;
  const map = (value: number, start1: number, stop1: number, start2: number, stop2: number) =>
    start2 + ((value - start1) * (stop2 - start2)) / (stop1 - start1 || 1);
  const pulseIn = (pin: string) => {
    const boardBindings = buildBoardBindings(project);
    const pinLabel = normalizePinLabel(pin, env);
    const sensor = project.components.find((component) =>
      component.type === "ultrasonic-sensor" && boardBindings[component.id]?.echo === pinLabel,
    );
    const distance = sensor ? (project.simulation.ultrasonicDistances[sensor.id] ?? 30) : 30;
    return Math.round((distance * 2) / 0.0343);
  };

  const scope = {
    ...env,
    digitalRead,
    analogRead,
    millis,
    map,
    pulseIn,
  };

  return Function(...Object.keys(scope), `return (${safeExpression});`)(...Object.values(scope));
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

function buildBoardBindings(project: CircuitProject) {
  const board = project.components.find((component) => component.type === project.metadata.boardType) ??
    project.components.find((component) => ["arduino-uno", "arduino-nano", "esp32-devkit-v1", "esp8266-nodemcu", "raspberry-pi-pico"].includes(component.type));
  if (!board) {
    return {};
  }
  const pinLookup = createPinLookup(project);
  const bindings: Record<string, Record<string, string>> = {};

  for (const pin of board.pins) {
    for (const link of traverseFromPin(board, pin, pinLookup)) {
      bindings[link.component.id] = {
        ...(bindings[link.component.id] ?? {}),
        [link.pin.id]: pin.label,
      };
    }
  }

  return bindings;
}

function deriveComponentStates(project: CircuitProject, state: SimulationState) {
  const bindings = buildBoardBindings(project);
  const componentStates: SimulationState["componentStates"] = {};
  const activeConnections = new Set<string>();

  for (const component of project.components) {
    if (component.type === "led") {
      const pinLabel = bindings[component.id]?.anode;
      const active = pinLabel ? (state.digitalPins[pinLabel] ?? state.analogPins[pinLabel] ?? 0) > 0 : false;
      componentStates[component.id] = active;
    }
    if (component.type === "push-button") {
      componentStates[component.id] = project.simulation.buttonStates[component.id] ?? false;
    }
    if (component.type === "potentiometer") {
      componentStates[component.id] = project.simulation.potentiometerValues[component.id] ?? 512;
    }
    if (component.type === "buzzer") {
      const pinLabel = bindings[component.id]?.positive;
      componentStates[component.id] = pinLabel ? (state.digitalPins[pinLabel] ?? state.analogPins[pinLabel] ?? 0) > 0 : false;
    }
    if (component.type === "servo-motor") {
      const pinLabel = bindings[component.id]?.signal;
      componentStates[component.id] = pinLabel ? (state.servoAngles[pinLabel] ?? 0) : 0;
    }
    if (component.type === "ultrasonic-sensor") {
      componentStates[component.id] = project.simulation.ultrasonicDistances[component.id] ?? 30;
    }
  }

  for (const connection of project.connections) {
    const fromComponent = project.components.find((component) => component.id === connection.fromComponentId);
    const toComponent = project.components.find((component) => component.id === connection.toComponentId);
    const fromPinLabel = fromComponent ? bindings[fromComponent.id]?.[connection.fromPinId] ?? fromComponent.pins.find((pin) => pin.id === connection.fromPinId)?.label : null;
    const toPinLabel = toComponent ? bindings[toComponent.id]?.[connection.toPinId] ?? toComponent.pins.find((pin) => pin.id === connection.toPinId)?.label : null;
    if ((fromPinLabel && (state.digitalPins[fromPinLabel] ?? state.analogPins[fromPinLabel] ?? 0) > 0) ||
        (toPinLabel && (state.digitalPins[toPinLabel] ?? state.analogPins[toPinLabel] ?? 0) > 0)) {
      activeConnections.add(connection.id);
    }
  }

  state.componentStates = componentStates;
  state.activeConnections = [...activeConnections];
}

export function createInitialSimulationState(project: CircuitProject): SimulationState {
  return {
    running: false,
    setupComplete: false,
    loopPointer: 0,
    loopCount: 0,
    millis: 0,
    warnings: [],
    serial: [],
    detectedPins: project.code.detectedPins,
    pinModes: {},
    digitalPins: {},
    analogPins: {},
    servoAngles: {},
    activeConnections: [],
    componentStates: {},
  };
}

function interpretStatement(statement: string, env: Record<string, unknown>, state: SimulationState, project: CircuitProject) {
  if (!statement || statement === "{" || statement === "}") {
    return;
  }

  let match = statement.match(/^(?:const\s+)?(?:int|long|float|bool|String)\s+(\w+)\s*=\s*(.+)$/);
  if (match) {
    env[match[1]] = evaluateExpression(match[2], env, state, project);
    return;
  }

  match = statement.match(/^(\w+)\s*=\s*(.+)$/);
  if (match && !statement.startsWith("digitalWrite") && !statement.startsWith("analogWrite")) {
    env[match[1]] = evaluateExpression(match[2], env, state, project);
    return;
  }

  match = statement.match(/^pinMode\s*\((.+)\)$/);
  if (match) {
    const [pin, mode] = splitArguments(match[1]);
    state.pinModes[normalizePinLabel(pin, env)] = String(mode).trim();
    return;
  }

  match = statement.match(/^digitalWrite\s*\((.+)\)$/);
  if (match) {
    const [pin, value] = splitArguments(match[1]);
    state.digitalPins[normalizePinLabel(pin, env)] = Number(evaluateExpression(value, env, state, project)) ? 1 : 0;
    return;
  }

  match = statement.match(/^analogWrite\s*\((.+)\)$/);
  if (match) {
    const [pin, value] = splitArguments(match[1]);
    state.analogPins[normalizePinLabel(pin, env)] = Number(evaluateExpression(value, env, state, project)) || 0;
    return;
  }

  match = statement.match(/^delay\s*\((.+)\)$/);
  if (match) {
    state.millis += Number(evaluateExpression(match[1], env, state, project)) || 0;
    return;
  }

  match = statement.match(/^Serial\.begin\s*\((.+)\)$/);
  if (match) {
    return;
  }

  match = statement.match(/^Serial\.(print|println)\s*\((.*)\)$/);
  if (match) {
    const nextValue = match[2] ? evaluateExpression(match[2], env, state, project) : "";
    state.serial.push(`${nextValue}${match[1] === "println" ? "\n" : ""}`);
    return;
  }

  match = statement.match(/^(\w+)\.attach\s*\((.+)\)$/);
  if (match) {
    env[match[1]] = normalizePinLabel(match[2], env);
    return;
  }

  match = statement.match(/^(\w+)\.write\s*\((.+)\)$/);
  if (match) {
    const attachedPin = env[match[1]];
    if (typeof attachedPin === "string") {
      state.servoAngles[attachedPin] = Number(evaluateExpression(match[2], env, state, project)) || 0;
    }
    return;
  }

  if (statement.includes("digitalRead(")) {
    return;
  }

  if (statement.includes("analogRead(")) {
    return;
  }

  if (statement.startsWith("#include") || statement.includes("Servo ")) {
    return;
  }

  state.warnings.push(`Unsupported simulation statement: ${statement}`);
}

function seedInputs(project: CircuitProject, state: SimulationState) {
  const bindings = buildBoardBindings(project);
  for (const component of project.components) {
    if (component.type === "push-button") {
      const pinLabel = Object.values(bindings[component.id] ?? {})[0];
      if (pinLabel) {
        state.digitalPins[pinLabel] = project.simulation.buttonStates[component.id] ? 1 : 0;
      }
    }
    if (component.type === "potentiometer") {
      const pinLabel = bindings[component.id]?.signal;
      if (pinLabel) {
        state.analogPins[pinLabel] = project.simulation.potentiometerValues[component.id] ?? 512;
      }
    }
  }
}

export function stepSimulation(project: CircuitProject, previous?: SimulationState): SimulationState {
  const program = parseArduinoProgram(project.code.sketch || project.code.generatedSketch);
  const state = previous ? {
    ...previous,
    serial: [...previous.serial],
    warnings: [...previous.warnings],
    pinModes: { ...previous.pinModes },
    digitalPins: { ...previous.digitalPins },
    analogPins: { ...previous.analogPins },
    servoAngles: { ...previous.servoAngles },
    activeConnections: [...previous.activeConnections],
    componentStates: { ...previous.componentStates },
  } : createInitialSimulationState(project);

  seedInputs(project, state);
  const env: Record<string, unknown> = {};
  for (const pinLabel of project.code.detectedPins) {
    env[pinLabel] = pinLabel;
  }

  if (!state.setupComplete) {
    for (const statement of program.setupStatements) {
      interpretStatement(statement, env, state, project);
    }
    state.setupComplete = true;
  }

  if (program.loopStatements.length === 0) {
    deriveComponentStates(project, state);
    return state;
  }

  const nextStatement = program.loopStatements[state.loopPointer] ?? "";
  try {
    interpretStatement(nextStatement, env, state, project);
  } catch (error) {
    state.warnings.push(error instanceof Error ? error.message : "Unsupported simulation statement.");
  }
  state.loopPointer = (state.loopPointer + 1) % program.loopStatements.length;
  state.loopCount += 1;
  state.millis += 16 * project.simulation.speed;
  state.detectedPins = project.code.detectedPins;
  deriveComponentStates(project, state);
  return state;
}
