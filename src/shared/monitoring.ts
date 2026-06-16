import type {
  ArduinoCliStatus,
  ArduinoDetectedPort,
  BoardDefinition,
  CircuitComponent,
  CircuitPin,
  CircuitProject,
  PluginRuntimeState,
  ValidationWarning,
} from "./types.js";
import type { SimulationState } from "./simulation.js";
import { serializeProject } from "./project.js";

const boardComponentTypes = new Set([
  "arduino-uno",
  "arduino-nano",
  "esp32-devkit-v1",
  "esp8266-nodemcu",
  "raspberry-pi-pico",
]);
const passThroughTypes = new Set(["resistor", "breadboard", "jumper-wire"]);

export interface ProjectMetrics {
  projectName: string;
  selectedBoard: string;
  fileType: string;
  dirty: boolean;
  lastSavedAt: string | null;
  componentCount: number;
  connectionCount: number;
  warningCount: number;
}

export interface CircuitHealthMetrics {
  dangerCount: number;
  warningCount: number;
  infoCount: number;
  missingGroundCount: number;
  floatingInputCount: number;
  invalidPowerConnectionCount: number;
}

export interface UsageMeter {
  used: number;
  total: number;
  percentage: number;
}

export interface BoardUsageMetrics {
  boardName: string;
  digital: UsageMeter;
  analog: UsageMeter;
  pwm: UsageMeter;
  serial: UsageMeter;
  i2c: UsageMeter;
  spi: UsageMeter;
  usedPinLabels: string[];
  powerPinsUsed: number;
  groundPinsUsed: number;
}

export interface ComponentUsageMetrics {
  total: number;
  sensorsCount: number;
  actuatorsCount: number;
  passiveCount: number;
  boardsCount: number;
  byType: Array<{ type: string; count: number }>;
  mostConnectedComponent: { name: string; count: number } | null;
}

export interface SimulationMetrics {
  state: "running" | "paused" | "stopped";
  simulatedTimeMs: number;
  loopCount: number;
  activePins: number;
  highPinsCount: number;
  lowPinsCount: number;
  analogValuesCount: number;
  serialLinesCount: number;
}

export interface PluginMetrics {
  loadedPluginsCount: number;
  failedPluginsCount: number;
  pluginWarnings: string[];
  pluginSourceFolders: string[];
}

export interface ArduinoCliMetrics {
  cliDetected: boolean;
  cliPath: string | null;
  selectedPort: string | null;
  detectedBoardsCount: number;
  lastCompileStatus: "success" | "error" | "idle";
  lastUploadStatus: "success" | "error" | "idle";
  serialMonitorStatus: "running" | "stopped" | "idle";
}

export interface PerformanceMetrics {
  projectSizeBytes: number;
  projectSizeLabel: string;
  nodes: number;
  edges: number;
  autosaveStatus: "active" | "idle" | "unavailable";
  lastAction: string;
  undoStackSize: number;
  redoStackSize: number;
  rendererBundleStatus: "healthy" | "warning";
}

interface PinLink {
  component: CircuitComponent;
  pin: CircuitPin;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function toUsageMeter(used: number, total: number): UsageMeter {
  return {
    used,
    total,
    percentage: total > 0 ? Math.round((used / total) * 100) : 0,
  };
}

function buildPinLookup(project: CircuitProject) {
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

function getActiveBoardComponent(project: CircuitProject) {
  return project.components.find((component) => component.type === project.metadata.boardType)
    ?? project.components.find((component) => boardComponentTypes.has(component.type))
    ?? null;
}

function countWarningsByMatch(warnings: ValidationWarning[], matcher: (warning: ValidationWarning) => boolean) {
  return warnings.filter(matcher).length;
}

export function getProjectMetrics(
  project: CircuitProject,
  validationResults: ValidationWarning[],
  options?: {
    dirty?: boolean;
    filePath?: string | null;
    libraryProjectId?: string | null;
    lastSavedAt?: string | null;
  },
): ProjectMetrics {
  return {
    projectName: project.metadata.name,
    selectedBoard: project.metadata.boardType,
    fileType: options?.libraryProjectId ? ".avc (Library)" : options?.filePath?.endsWith(".json") ? ".json" : ".avc",
    dirty: options?.dirty ?? false,
    lastSavedAt: options?.lastSavedAt ?? null,
    componentCount: project.components.length,
    connectionCount: project.connections.length,
    warningCount: validationResults.length,
  };
}

export function getCircuitHealth(project: CircuitProject, validationResults: ValidationWarning[]): CircuitHealthMetrics {
  void project;
  return {
    dangerCount: validationResults.filter((warning) => warning.severity === "danger").length,
    warningCount: validationResults.filter((warning) => warning.severity === "warning").length,
    infoCount: validationResults.filter((warning) => warning.severity === "info").length,
    missingGroundCount: countWarningsByMatch(validationResults, (warning) => warning.title.toLowerCase().includes("missing gnd")),
    floatingInputCount: countWarningsByMatch(validationResults, (warning) => warning.title.toLowerCase().includes("floating input")),
    invalidPowerConnectionCount: countWarningsByMatch(validationResults, (warning) =>
      warning.title.toLowerCase().includes("invalid power") || warning.title.toLowerCase().includes("direct 5v"),
    ),
  };
}

export function getBoardUsage(project: CircuitProject, boardDefinition: BoardDefinition | null): BoardUsageMetrics {
  const boardComponent = getActiveBoardComponent(project);
  if (!boardDefinition) {
    return {
      boardName: "No board selected",
      digital: toUsageMeter(0, 0),
      analog: toUsageMeter(0, 0),
      pwm: toUsageMeter(0, 0),
      serial: toUsageMeter(0, 0),
      i2c: toUsageMeter(0, 0),
      spi: toUsageMeter(0, 0),
      usedPinLabels: [],
      powerPinsUsed: 0,
      groundPinsUsed: 0,
    };
  }

  if (!boardComponent) {
    const digitalTotal = Object.values(boardDefinition.pinCapabilities).filter((pin) => pin.digital).length;
    const analogTotal = Object.values(boardDefinition.pinCapabilities).filter((pin) => pin.analog).length;
    const pwmTotal = Object.values(boardDefinition.pinCapabilities).filter((pin) => pin.pwm).length;
    const serialTotal = Object.values(boardDefinition.pinCapabilities).filter((pin) => pin.serial).length;
    const i2cTotal = Object.values(boardDefinition.pinCapabilities).filter((pin) => pin.i2c).length;
    const spiTotal = Object.values(boardDefinition.pinCapabilities).filter((pin) => pin.spi).length;
    return {
      boardName: boardDefinition.name,
      digital: toUsageMeter(0, digitalTotal),
      analog: toUsageMeter(0, analogTotal),
      pwm: toUsageMeter(0, pwmTotal),
      serial: toUsageMeter(0, serialTotal),
      i2c: toUsageMeter(0, i2cTotal),
      spi: toUsageMeter(0, spiTotal),
      usedPinLabels: [],
      powerPinsUsed: 0,
      groundPinsUsed: 0,
    };
  }

  const pinLookup = buildPinLookup(project);
  const usedPinLabels = new Set<string>();

  for (const pin of boardComponent.pins.filter((candidate) => candidate.label in boardDefinition.pinCapabilities)) {
    const connections = traverseFromPin(boardComponent, pin, pinLookup);
    if (connections.length > 0) {
      usedPinLabels.add(pin.label);
    }
  }

  const digitalTotal = Object.values(boardDefinition.pinCapabilities).filter((pin) => pin.digital).length;
  const analogTotal = Object.values(boardDefinition.pinCapabilities).filter((pin) => pin.analog).length;
  const pwmTotal = Object.values(boardDefinition.pinCapabilities).filter((pin) => pin.pwm).length;
  const serialTotal = Object.values(boardDefinition.pinCapabilities).filter((pin) => pin.serial).length;
  const i2cTotal = Object.values(boardDefinition.pinCapabilities).filter((pin) => pin.i2c).length;
  const spiTotal = Object.values(boardDefinition.pinCapabilities).filter((pin) => pin.spi).length;

  const digitalUsed = [...usedPinLabels].filter((label) => boardDefinition.pinCapabilities[label]?.digital).length;
  const analogUsed = [...usedPinLabels].filter((label) => boardDefinition.pinCapabilities[label]?.analog).length;
  const pwmUsed = [...usedPinLabels].filter((label) => boardDefinition.pinCapabilities[label]?.pwm).length;
  const serialUsed = [...usedPinLabels].filter((label) => boardDefinition.pinCapabilities[label]?.serial).length;
  const i2cUsed = [...usedPinLabels].filter((label) => boardDefinition.pinCapabilities[label]?.i2c).length;
  const spiUsed = [...usedPinLabels].filter((label) => boardDefinition.pinCapabilities[label]?.spi).length;

  const powerPinsUsed = boardComponent.pins
    .filter((pin) => pin.kind === "power")
    .filter((pin) => (pinLookup.get(`${boardComponent.id}:${pin.id}`) ?? []).length > 0).length;
  const groundPinsUsed = boardComponent.pins
    .filter((pin) => pin.kind === "ground")
    .filter((pin) => (pinLookup.get(`${boardComponent.id}:${pin.id}`) ?? []).length > 0).length;

  return {
    boardName: boardDefinition.name,
    digital: toUsageMeter(digitalUsed, digitalTotal),
    analog: toUsageMeter(analogUsed, analogTotal),
    pwm: toUsageMeter(pwmUsed, pwmTotal),
    serial: toUsageMeter(serialUsed, serialTotal),
    i2c: toUsageMeter(i2cUsed, i2cTotal),
    spi: toUsageMeter(spiUsed, spiTotal),
    usedPinLabels: [...usedPinLabels].sort(),
    powerPinsUsed,
    groundPinsUsed,
  };
}

export function getComponentUsage(project: CircuitProject): ComponentUsageMetrics {
  const counts = new Map<string, number>();
  for (const component of project.components) {
    counts.set(component.type, (counts.get(component.type) ?? 0) + 1);
  }

  const connectionCounts = project.components.map((component) => ({
    name: component.name,
    count: project.connections.filter((connection) =>
      connection.fromComponentId === component.id || connection.toComponentId === component.id,
    ).length,
  }));

  const mostConnected = connectionCounts.sort((left, right) => right.count - left.count)[0];

  return {
    total: project.components.length,
    sensorsCount: project.components.filter((component) => component.category === "Sensors" || component.type === "ultrasonic-sensor").length,
    actuatorsCount: project.components.filter((component) => ["Actuators", "Outputs"].includes(component.category)).length,
    passiveCount: project.components.filter((component) => ["Passive", "Wiring", "Prototyping"].includes(component.category)).length,
    boardsCount: project.components.filter((component) => boardComponentTypes.has(component.type)).length,
    byType: [...counts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((left, right) => right.count - left.count || left.type.localeCompare(right.type)),
    mostConnectedComponent: mostConnected && mostConnected.count > 0 ? mostConnected : null,
  };
}

export function getSimulationMetrics(simulationState: SimulationState): SimulationMetrics {
  const digitalValues = Object.values(simulationState.digitalPins);
  const highPinsCount = digitalValues.filter((value) => value > 0).length;
  const lowPinsCount = digitalValues.filter((value) => value <= 0).length;
  return {
    state: simulationState.running ? "running" : simulationState.setupComplete || simulationState.loopCount > 0 ? "paused" : "stopped",
    simulatedTimeMs: simulationState.millis,
    loopCount: simulationState.loopCount,
    activePins: [...Object.keys(simulationState.digitalPins), ...Object.keys(simulationState.analogPins)].length,
    highPinsCount,
    lowPinsCount,
    analogValuesCount: Object.keys(simulationState.analogPins).length,
    serialLinesCount: simulationState.serial.join("").split(/\r?\n/).filter(Boolean).length,
  };
}

export function getPluginMetrics(pluginState: PluginRuntimeState): PluginMetrics {
  const sourceFolders = [...new Set(pluginState.loaded.map((plugin) => plugin.sourcePath))];
  return {
    loadedPluginsCount: pluginState.loaded.length,
    failedPluginsCount: pluginState.failures.length,
    pluginWarnings: pluginState.failures.map((failure) => failure.message),
    pluginSourceFolders: sourceFolders,
  };
}

export function getArduinoCliMetrics(options: {
  cliStatus: ArduinoCliStatus;
  ports: ArduinoDetectedPort[];
  selectedPort: string | null;
  lastCompileStatus: "success" | "error" | "idle";
  lastUploadStatus: "success" | "error" | "idle";
  serialMonitorStatus: "running" | "stopped" | "idle";
}): ArduinoCliMetrics {
  return {
    cliDetected: options.cliStatus.found,
    cliPath: options.cliStatus.cliPath,
    selectedPort: options.selectedPort,
    detectedBoardsCount: options.ports.filter((port) => port.boardName).length,
    lastCompileStatus: options.lastCompileStatus,
    lastUploadStatus: options.lastUploadStatus,
    serialMonitorStatus: options.serialMonitorStatus,
  };
}

export function getPerformanceMetrics(project: CircuitProject, options: {
  undoStackSize: number;
  redoStackSize: number;
  autosaveStatus: "active" | "idle" | "unavailable";
  lastAction: string;
}): PerformanceMetrics {
  const projectSizeBytes = new Blob([serializeProject(project)]).size;
  return {
    projectSizeBytes,
    projectSizeLabel: formatBytes(projectSizeBytes),
    nodes: project.components.length,
    edges: project.connections.length,
    autosaveStatus: options.autosaveStatus,
    lastAction: options.lastAction,
    undoStackSize: options.undoStackSize,
    redoStackSize: options.redoStackSize,
    rendererBundleStatus: projectSizeBytes > 500_000 ? "warning" : "healthy",
  };
}
