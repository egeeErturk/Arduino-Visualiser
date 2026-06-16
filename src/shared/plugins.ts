import { boardCatalog } from "./boards.js";
import { componentCatalog } from "./catalog.js";
import type {
  BoardPlugin,
  ComponentPlugin,
  GeneratorPlugin,
  ValidationPlugin,
} from "./types.js";

export const boardPlugins: BoardPlugin[] = boardCatalog.map((board) => ({
  kind: "board",
  id: `board:${board.type}`,
  board,
}));

export const componentPlugins: ComponentPlugin[] = componentCatalog.map((component) => ({
  kind: "component",
  id: `component:${component.type}`,
  component,
}));

export const generatorPlugins: GeneratorPlugin[] = [];

export const validationPlugins: ValidationPlugin[] = [];
