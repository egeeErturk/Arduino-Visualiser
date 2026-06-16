# Architectural Decisions

## React + TypeScript + Vite + Electron

The earlier zero-dependency JavaScript build was useful only as a rescue path. The project now uses React, TypeScript, Vite, and Electron because the product goal is a maintainable desktop application with typed state, reusable UI structure, and native file operations.

## React Flow As The Canvas Engine

React Flow was chosen because it already solves pan, zoom, fit view, draggable nodes, selected edges, and stable canvas behavior. The editor layers the Arduino-specific pin model on top of React Flow custom nodes and edges instead of maintaining a fully custom scene graph.

## Shared Schema And Validation Layer

`src/shared` holds the circuit schema, component catalog, and validation heuristics so the renderer and desktop shell can rely on the same definitions. Zod is used for runtime validation of imported JSON.

## File Save/Load Architecture

Electron handles open/save dialogs and file reads/writes in the main process. The renderer only sees a narrow preload bridge. Autosave remains a backup mechanism, while explicit file save/load is the primary workflow.

## Packaging Wrapper For Electron Builder

Electron Builder was kept as the packaging tool, but `electron:build` now runs through `scripts/run-electron-builder.mjs`. The wrapper does not change the packaged app itself. It only stabilizes packaging by ensuring Electron Builder subprocesses can find:

- the active Node executable
- Windows PowerShell
- a valid `npm.cmd` entry point derived from the current `npm_execpath`

This approach is cleaner than hardcoding machine-specific tool paths into `package.json`, and it keeps normal local developer environments working unchanged.

## Validation Is Heuristic, Not Simulation

The product goal is planning and documentation, not physical simulation. Validation rules therefore focus on educational heuristics like direct power shorts, floating inputs, resistor visibility, and suspicious fanout rather than claiming exact electrical correctness.
