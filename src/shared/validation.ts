import type {
  CircuitComponent,
  CircuitConnection,
  CircuitPin,
  CircuitProject,
  ValidationWarning,
} from "./types.js";

interface PinRef {
  component: CircuitComponent;
  pin: CircuitPin;
}

function getPinRef(
  componentsById: Map<string, CircuitComponent>,
  componentId: string,
  pinId: string,
): PinRef | null {
  const component = componentsById.get(componentId);
  const pin = component?.pins.find((candidate: CircuitPin) => candidate.id === pinId);
  if (!component || !pin) {
    return null;
  }

  return { component, pin };
}

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

export function validateProject(project: CircuitProject): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const componentsById = new Map<string, CircuitComponent>(
    project.components.map((component: CircuitComponent) => [component.id, component]),
  );
  const connectionsByPin = new Map<string, CircuitConnection[]>();

  for (const connection of project.connections) {
    const fromKey = `${connection.fromComponentId}:${connection.fromPinId}`;
    const toKey = `${connection.toComponentId}:${connection.toPinId}`;
    connectionsByPin.set(fromKey, [...(connectionsByPin.get(fromKey) || []), connection]);
    connectionsByPin.set(toKey, [...(connectionsByPin.get(toKey) || []), connection]);
  }

  for (const connection of project.connections) {
    const source = getPinRef(componentsById, connection.fromComponentId, connection.fromPinId);
    const target = getPinRef(componentsById, connection.toComponentId, connection.toPinId);
    if (!source || !target) {
      continue;
    }

    const kinds = [source.pin.kind, target.pin.kind];
    if (kinds.includes("power") && kinds.includes("ground")) {
      warnings.push({
        id: `direct-short-${connection.id}`,
        severity: "danger",
        title: "Direct 5V to GND connection",
        description: "This wire connects a power pin directly to ground. Review the planned wiring.",
        componentIds: [source.component.id, target.component.id],
        connectionIds: [connection.id],
        pinRefs: [
          { componentId: source.component.id, pinId: source.pin.id },
          { componentId: target.component.id, pinId: target.pin.id },
        ],
      });
    }

    const invalidPowerConnection =
      (source.pin.kind === "power" && ["digital", "analog", "signal"].includes(target.pin.kind)) ||
      (target.pin.kind === "power" && ["digital", "analog", "signal"].includes(source.pin.kind));
    if (invalidPowerConnection) {
      warnings.push({
        id: `invalid-power-${connection.id}`,
        severity: "warning",
        title: "Possible invalid power connection",
        description: "A VCC-style pin is connected directly to a signal pin. Make sure this is intentional.",
        componentIds: [source.component.id, target.component.id],
        connectionIds: [connection.id],
        pinRefs: [
          { componentId: source.component.id, pinId: source.pin.id },
          { componentId: target.component.id, pinId: target.pin.id },
        ],
      });
    }

    if (
      source.pin.direction === "output" &&
      target.pin.direction === "output" &&
      source.component.type.startsWith("arduino")
    ) {
      warnings.push({
        id: `output-conflict-${connection.id}`,
        severity: "warning",
        title: "Output-to-output connection",
        description: "An Arduino output appears to be wired directly to another output-capable pin.",
        componentIds: [source.component.id, target.component.id],
        connectionIds: [connection.id],
        pinRefs: [
          { componentId: source.component.id, pinId: source.pin.id },
          { componentId: target.component.id, pinId: target.pin.id },
        ],
      });
    }
  }

  for (const component of project.components) {
    if (component.type === "led") {
      const related = project.connections.filter((connection: CircuitConnection) => connectionTouches(connection, component.id));
      if (related.length > 0) {
        const hasResistorInPath = related.some((connection) => {
          const nextId = connection.fromComponentId === component.id ? connection.toComponentId : connection.fromComponentId;
          return findPathHasResistor(nextId, new Set<string>(), componentsById, project.connections);
        });

        if (!hasResistorInPath) {
          warnings.push({
            id: `led-no-resistor-${component.id}`,
            severity: "warning",
            title: "LED without resistor",
            description: `${component.name} is connected, but a resistor is not visible in its path.`,
            componentIds: [component.id],
            connectionIds: related.map((connection: CircuitConnection) => connection.id),
            pinRefs: component.pins.map((pin: CircuitPin) => ({ componentId: component.id, pinId: pin.id })),
          });
        }
      }
    }

    if (["servo-motor", "ultrasonic-sensor", "arduino-uno", "arduino-nano", "buzzer"].includes(component.type)) {
      const hasPower = component.pins
        .filter((pin: CircuitPin) => pin.kind === "power")
        .some((pin: CircuitPin) => (connectionsByPin.get(`${component.id}:${pin.id}`) || []).length > 0);
      const hasGround = component.pins
        .filter((pin: CircuitPin) => pin.kind === "ground")
        .some((pin: CircuitPin) => (connectionsByPin.get(`${component.id}:${pin.id}`) || []).length > 0);

      if (hasPower && !hasGround) {
        warnings.push({
          id: `missing-ground-${component.id}`,
          severity: "warning",
          title: "Missing GND connection",
          description: `${component.name} has power but no visible ground connection.`,
          componentIds: [component.id],
          connectionIds: [],
          pinRefs: component.pins
            .filter((pin: CircuitPin) => pin.kind === "power" || pin.kind === "ground")
            .map((pin: CircuitPin) => ({ componentId: component.id, pinId: pin.id })),
        });
      }
    }

    if (["push-button", "ultrasonic-sensor", "potentiometer"].includes(component.type)) {
      const floatingPins = component.pins
        .filter((pin: CircuitPin) => pin.direction === "input" || pin.kind === "analog")
        .filter((pin: CircuitPin) => {
        return (connectionsByPin.get(`${component.id}:${pin.id}`) || []).length === 0;
        });
      if (floatingPins.length > 0) {
        warnings.push({
          id: `floating-input-${component.id}`,
          severity: "info",
          title: "Floating input",
          description: `${component.name} has one or more input-style pins with no visible connection.`,
          componentIds: [component.id],
          connectionIds: [],
            pinRefs: floatingPins.map((pin: CircuitPin) => ({ componentId: component.id, pinId: pin.id })),
        });
      }
    }

    if (component.type.startsWith("arduino")) {
      for (const pin of component.pins.filter((candidate: CircuitPin) => candidate.direction === "output")) {
        const related = connectionsByPin.get(`${component.id}:${pin.id}`) || [];
        const activeInputs = related.filter((connection: CircuitConnection) => {
          const otherRef = getPinRef(
            componentsById,
            connection.fromComponentId === component.id ? connection.toComponentId : connection.fromComponentId,
            connection.fromComponentId === component.id ? connection.toPinId : connection.fromPinId,
          );
          return otherRef?.pin.direction === "input";
        });
        if (activeInputs.length > 3) {
          warnings.push({
            id: `fanout-${component.id}-${pin.id}`,
            severity: "warning",
            title: "Heavy output fanout",
            description: `${component.name} pin ${pin.label} is driving ${activeInputs.length} input-style connections. The heuristic threshold is 3.`,
            componentIds: [component.id, ...activeInputs.map((connection: CircuitConnection) => (connection.fromComponentId === component.id ? connection.toComponentId : connection.fromComponentId))],
            connectionIds: activeInputs.map((connection: CircuitConnection) => connection.id),
            pinRefs: [{ componentId: component.id, pinId: pin.id }],
          });
        }
      }
    }
  }

  return warnings;
}
