import { z } from "zod";
import { getCatalogByType } from "./plugins.js";
import type {
  CircuitComponent,
  CircuitConnection,
  CircuitPin,
  CircuitProject,
  ComponentDefinition,
  Position,
} from "./types.js";

const pinSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  side: z.enum(["left", "right", "top", "bottom"]),
  offset: z.number(),
  kind: z.enum(["digital", "analog", "power", "ground", "signal", "passive"]),
  direction: z.enum(["input", "output", "bidirectional", "passive", "power", "ground"]),
});

const componentSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  position: z.object({ x: z.number(), y: z.number() }),
  size: z.object({ width: z.number().positive(), height: z.number().positive() }),
  accent: z.string().min(1),
  pins: z.array(pinSchema),
});

const connectionSchema = z.object({
  id: z.string().min(1),
  fromComponentId: z.string().min(1),
  fromPinId: z.string().min(1),
  toComponentId: z.string().min(1),
  toPinId: z.string().min(1),
  color: z.string().min(1),
});

export const circuitProjectSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  metadata: z.object({
    name: z.string().min(1),
    description: z.string().optional().default(""),
    author: z.string().optional().default(""),
    boardType: z.string().optional().default("arduino-uno"),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  }),
  viewport: z.object({
    x: z.number(),
    y: z.number(),
    zoom: z.number().positive(),
  }),
  components: z.array(componentSchema),
  connections: z.array(connectionSchema),
  code: z.object({
    sketch: z.string().optional().default(""),
    generatedSketch: z.string().optional().default(""),
    source: z.enum(["generated", "manual", "imported"]).optional().default("generated"),
    fileName: z.string().optional().default("sketch.ino"),
    detectedPins: z.array(z.string()).optional().default([]),
  }).optional().default({
    sketch: "",
    generatedSketch: "",
    source: "generated",
    fileName: "sketch.ino",
    detectedPins: [],
  }),
  simulation: z.object({
    speed: z.number().positive().optional().default(1),
    buttonStates: z.record(z.string(), z.boolean()).optional().default({}),
    potentiometerValues: z.record(z.string(), z.number()).optional().default({}),
    ultrasonicDistances: z.record(z.string(), z.number()).optional().default({}),
  }).optional().default({
    speed: 1,
    buttonStates: {},
    potentiometerValues: {},
    ultrasonicDistances: {},
  }),
  extensions: z.record(z.string(), z.unknown()).optional().default({}),
});

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function cloneProject(project: CircuitProject): CircuitProject {
  return JSON.parse(JSON.stringify(project)) as CircuitProject;
}

export function createComponentFromDefinition(definition: ComponentDefinition, position: Position): CircuitComponent {
  return {
    id: createId("component"),
    type: definition.type,
    name: definition.name,
    category: definition.category,
    position,
    size: { ...definition.size },
    accent: definition.accent,
    pins: definition.pins.map((pin: ComponentDefinition["pins"][number]) => ({ ...pin })),
  };
}

export function createEmptyProject(name = "Untitled Circuit"): CircuitProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: 2,
    metadata: {
      name,
      description: "",
      author: "",
      boardType: "arduino-uno",
      createdAt: now,
      updatedAt: now,
    },
    viewport: {
      x: 240,
      y: 120,
      zoom: 1,
    },
    components: [],
    connections: [],
    code: {
      sketch: "",
      generatedSketch: "",
      source: "generated",
      fileName: "sketch.ino",
      detectedPins: [],
    },
    simulation: {
      speed: 1,
      buttonStates: {},
      potentiometerValues: {},
      ultrasonicDistances: {},
    },
    extensions: {},
  };
}

export function serializeProject(project: CircuitProject) {
  return JSON.stringify(project, null, 2);
}

export function parseProjectJson(projectJson: string) {
  const parsed = JSON.parse(projectJson) as unknown;
  const validated = circuitProjectSchema.parse(parsed);
  return normalizeImportedProject(validated);
}

export function normalizeImportedProject(project: CircuitProject): CircuitProject {
  const componentIdMap = new Map<string, string>();
  const connectionIdSet = new Set<string>();
  const nextComponents: CircuitComponent[] = [];

  for (const component of project.components) {
    const definition = getCatalogByType()[component.type];
    if (!definition) {
      continue;
    }

    const nextComponentId = componentIdMap.has(component.id) ? createId("component") : component.id;
    componentIdMap.set(component.id, nextComponentId);

    const pins = definition.pins.map((definitionPin: ComponentDefinition["pins"][number]) => {
      const imported = component.pins.find((candidate: CircuitPin) => candidate.id === definitionPin.id);
      return {
        ...definitionPin,
        ...(imported || {}),
      } satisfies CircuitPin;
    });

    nextComponents.push({
      ...component,
      id: nextComponentId,
      category: definition.category,
      size: { ...definition.size },
      accent: definition.accent,
      pins,
    });
  }

  const componentLookup = new Map<string, CircuitComponent>(
    nextComponents.map((component: CircuitComponent) => [component.id, component]),
  );
  const nextConnections: CircuitConnection[] = [];

  for (const connection of project.connections) {
    const remappedFrom = componentIdMap.get(connection.fromComponentId);
    const remappedTo = componentIdMap.get(connection.toComponentId);
    if (!remappedFrom || !remappedTo) {
      continue;
    }

    const source = componentLookup.get(remappedFrom);
    const target = componentLookup.get(remappedTo);
    if (
      !source?.pins.some((pin: CircuitPin) => pin.id === connection.fromPinId) ||
      !target?.pins.some((pin: CircuitPin) => pin.id === connection.toPinId)
    ) {
      continue;
    }

    const nextConnectionId = connectionIdSet.has(connection.id) ? createId("connection") : connection.id;
    connectionIdSet.add(nextConnectionId);
    nextConnections.push({
      ...connection,
      id: nextConnectionId,
      fromComponentId: remappedFrom,
      toComponentId: remappedTo,
    });
  }

  const normalizedMetadata = {
    name: project.metadata.name,
    description: project.metadata.description ?? "",
    author: project.metadata.author ?? "",
    boardType: project.metadata.boardType ?? "arduino-uno",
    createdAt: project.metadata.createdAt,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...project,
    schemaVersion: 2,
    metadata: normalizedMetadata,
    components: nextComponents,
    connections: nextConnections,
    code: {
      sketch: project.code?.sketch ?? "",
      generatedSketch: project.code?.generatedSketch ?? "",
      source: project.code?.source ?? "generated",
      fileName: project.code?.fileName ?? "sketch.ino",
      detectedPins: project.code?.detectedPins ?? [],
    },
    simulation: {
      speed: project.simulation?.speed ?? 1,
      buttonStates: project.simulation?.buttonStates ?? {},
      potentiometerValues: project.simulation?.potentiometerValues ?? {},
      ultrasonicDistances: project.simulation?.ultrasonicDistances ?? {},
    },
    extensions: project.extensions ?? {},
  };
}
