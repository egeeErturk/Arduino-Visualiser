import { getCatalogByType } from "./plugins.js";
import { createComponentFromDefinition, createEmptyProject, createId } from "./project.js";
import type { CircuitConnection, CircuitProject, Position } from "./types.js";

export function placeComponent(type: string, position: Position, name?: string) {
  const definition = getCatalogByType()[type];
  if (!definition) {
    throw new Error(`Unknown component type: ${type}`);
  }

  const component = createComponentFromDefinition(definition, position);
  if (name) {
    component.name = name;
  }
  return component;
}

export function connect(
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

export function createProject(name = "Test Project"): CircuitProject {
  return createEmptyProject(name);
}
