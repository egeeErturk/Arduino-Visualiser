import type { CircuitAssistantFinding, CircuitComponent, CircuitConnection, CircuitProject } from "./types.js";

function connectionTouches(connection: CircuitConnection, componentId: string, pinId?: string) {
  if (pinId) {
    return (
      (connection.fromComponentId === componentId && connection.fromPinId === pinId) ||
      (connection.toComponentId === componentId && connection.toPinId === pinId)
    );
  }

  return connection.fromComponentId === componentId || connection.toComponentId === componentId;
}

function findPathHasResistor(
  componentId: string,
  visited: Set<string>,
  componentsById: Map<string, CircuitComponent>,
  connections: CircuitConnection[],
): boolean {
  if (visited.has(componentId)) {
    return false;
  }

  visited.add(componentId);
  const component = componentsById.get(componentId);
  if (!component) {
    return false;
  }

  if (component.type === "resistor") {
    return true;
  }

  return connections.some((connection) => {
    if (!connectionTouches(connection, componentId)) {
      return false;
    }
    const nextId = connection.fromComponentId === componentId ? connection.toComponentId : connection.fromComponentId;
    return findPathHasResistor(nextId, visited, componentsById, connections);
  });
}

export function analyzeCircuitProject(project: CircuitProject): CircuitAssistantFinding[] {
  const findings: CircuitAssistantFinding[] = [];
  const componentsById = new Map(project.components.map((component) => [component.id, component]));
  const connectionsByPin = new Map<string, CircuitConnection[]>();

  for (const connection of project.connections) {
    const fromKey = `${connection.fromComponentId}:${connection.fromPinId}`;
    const toKey = `${connection.toComponentId}:${connection.toPinId}`;
    connectionsByPin.set(fromKey, [...(connectionsByPin.get(fromKey) ?? []), connection]);
    connectionsByPin.set(toKey, [...(connectionsByPin.get(toKey) ?? []), connection]);
  }

  const powerSources = project.components.filter((component) =>
    component.type === "power-5v" || component.pins.some((pin) => pin.kind === "power" && pin.label === "5V"),
  );
  if (powerSources.length > 1) {
    findings.push({
      id: "duplicate-power-sources",
      severity: "warning",
      title: "Duplicate power sources detected",
      description: "More than one 5V power source is present. Confirm that the circuit should be powered from multiple sources.",
      category: "duplicate-power-source",
      componentIds: powerSources.map((component) => component.id),
      connectionIds: [],
    });
  }

  for (const connection of project.connections) {
    const source = componentsById.get(connection.fromComponentId);
    const target = componentsById.get(connection.toComponentId);
    const sourcePin = source?.pins.find((pin) => pin.id === connection.fromPinId);
    const targetPin = target?.pins.find((pin) => pin.id === connection.toPinId);
    if (!source || !target || !sourcePin || !targetPin) {
      continue;
    }

    const invalidPowerConnection =
      (sourcePin.kind === "power" && ["digital", "analog", "signal"].includes(targetPin.kind)) ||
      (targetPin.kind === "power" && ["digital", "analog", "signal"].includes(sourcePin.kind));
    if (invalidPowerConnection) {
      findings.push({
        id: `assistant-invalid-power-${connection.id}`,
        severity: "warning",
        title: "Invalid power-style connection",
        description: `${source.name} ${sourcePin.label} is connected directly to ${target.name} ${targetPin.label}. Review whether a signal pin is receiving raw supply voltage.`,
        category: "invalid-power",
        componentIds: [source.id, target.id],
        connectionIds: [connection.id],
      });
    }
  }

  for (const component of project.components) {
    if (component.type === "led") {
      const related = project.connections.filter((connection) => connectionTouches(connection, component.id));
      const hasResistor = related.some((connection) => {
        const nextId = connection.fromComponentId === component.id ? connection.toComponentId : connection.fromComponentId;
        return findPathHasResistor(nextId, new Set<string>(), componentsById, project.connections);
      });
      if (related.length > 0 && !hasResistor) {
        findings.push({
          id: `assistant-led-resistor-${component.id}`,
          severity: "warning",
          title: "LED path missing resistor",
          description: `${component.name} appears to be connected without a resistor path.`,
          category: "missing-resistor",
          componentIds: [component.id],
          connectionIds: related.map((connection) => connection.id),
        });
      }
    }

    if (["servo-motor", "ultrasonic-sensor", "arduino-uno", "arduino-nano", "buzzer"].includes(component.type)) {
      const hasPower = component.pins
        .filter((pin) => pin.kind === "power")
        .some((pin) => (connectionsByPin.get(`${component.id}:${pin.id}`) ?? []).length > 0);
      const hasGround = component.pins
        .filter((pin) => pin.kind === "ground")
        .some((pin) => (connectionsByPin.get(`${component.id}:${pin.id}`) ?? []).length > 0);

      if (hasPower && !hasGround) {
        findings.push({
          id: `assistant-ground-${component.id}`,
          severity: "warning",
          title: "Missing ground connection",
          description: `${component.name} has a power connection but no visible ground return.`,
          category: "missing-ground",
          componentIds: [component.id],
          connectionIds: [],
        });
      }
    }

    if (["push-button", "ultrasonic-sensor", "potentiometer"].includes(component.type)) {
      const floatingPins = component.pins.filter((pin) =>
        (pin.direction === "input" || pin.kind === "analog") &&
        (connectionsByPin.get(`${component.id}:${pin.id}`) ?? []).length === 0,
      );
      if (floatingPins.length > 0) {
        findings.push({
          id: `assistant-floating-${component.id}`,
          severity: "info",
          title: "Floating input detected",
          description: `${component.name} has ${floatingPins.length} input-style pin(s) without a visible connection.`,
          category: "floating-input",
          componentIds: [component.id],
          connectionIds: [],
        });
      }
    }

    if (component.type === "ultrasonic-sensor") {
      const requiredPins = ["trig", "echo", "vcc", "gnd"];
      const missingPins = requiredPins.filter((pinId) => (connectionsByPin.get(`${component.id}:${pinId}`) ?? []).length === 0);
      if (missingPins.length > 0) {
        findings.push({
          id: `assistant-sensor-${component.id}`,
          severity: "warning",
          title: "Sensor is missing required connections",
          description: `${component.name} is missing ${missingPins.map((pinId) => pinId.toUpperCase()).join(", ")} connection(s).`,
          category: "missing-sensor-connection",
          componentIds: [component.id],
          connectionIds: [],
        });
      }
    }
  }

  return findings;
}
