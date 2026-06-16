# Arduino Circuit Visualizer

Arduino Circuit Visualizer is a desktop-first Arduino design application for visual circuit planning, beginner-friendly project templates, project metadata management, and starter sketch generation. It is not an electrical simulator.

## Current Product Status

The application now ships as a downloadable Electron desktop app built with:

- React
- TypeScript
- Vite
- Electron
- React Flow
- Zustand
- Zod

The current release direction is a professional Arduino design workstation with:

- visual circuit authoring
- `.avc` project files
- project dashboard and recent projects
- template library
- board abstraction
- plugin-oriented architecture
- starter Arduino code generation

## Features

- Desktop application architecture with Electron `main` and `preload`
- Typed circuit schema with import normalization and backward-compatible JSON parsing
- React Flow visual editor with pan, zoom, fit view, node drag, edge selection, and pin wiring
- Project dashboard with blank-project, template, and recent-project workflows
- Custom `.avc` project format for primary save/load
- JSON import/export compatibility
- Recent desktop projects tracking
- Project metadata:
  - name
  - description
  - author
  - board type
  - created
  - modified
- Built-in board support:
  - Arduino Uno
  - Arduino Nano
- Built-in templates:
  - Blink LED
  - Push Button LED
  - Traffic Light
  - Servo Sweep
  - Ultrasonic Distance Meter
  - Potentiometer Dimmer
- Structured inspector for project, component, pin, wire, and warning details
- Bottom output panel for warnings, activity, and generated code
- Arduino starter sketch generation with `.ino` export
- Arduino CLI integration for detection, compile, upload, and serial monitoring
- Smart circuit assistant findings panel
- Pin compatibility hints during connection creation
- Undo/redo
- Keyboard shortcuts help
- Settings screen
- About screen
- Heuristic educational validation warnings
- Windows packaging support through Electron Builder

## How To Run Locally

Install dependencies:

```bash
npm install
```

Start the browser renderer only:

```bash
npm run dev
```

Start the desktop app in development mode:

```bash
npm run electron:dev
```

## Verification Commands

Run lint:

```bash
npm run lint
```

Run typecheck:

```bash
npm run typecheck
```

Build the renderer and Electron outputs:

```bash
npm run build
```

Verify Arduino sketch generation scenarios:

```bash
npm run verify:sketch
```

Package the desktop app:

```bash
npm run electron:build
```

Build the packaged desktop app:

```bash
npm run electron:build
```

## Desktop Packaging

Electron Builder is configured for:

- Windows: `nsis`, `portable`
- macOS: `dmg`
- Linux: `AppImage`

Packaged output is written to `release/`.

Current Windows artifacts:

- `release/Arduino Circuit Visualizer Setup 1.0.0.exe`
- `release/Arduino Circuit Visualizer 1.0.0.exe`
- `release/win-unpacked/`

## Project File Format

Primary project extension:

- `.avc`

Meaning:

- Arduino Visual Circuit

Internally, `.avc` files are JSON documents using the shared circuit schema and project metadata model.

Compatibility:

- `Open` accepts `.avc` and legacy `.json`
- `Import` accepts `.avc` and `.json`
- `Export` writes compatibility `.json`

## Project Metadata

Stored inside project files:

- `name`
- `description`
- `author`
- `boardType`
- `createdAt`
- `updatedAt`

## Project Dashboard

The dashboard provides:

- blank project creation
- template selection
- recent projects
- fast project startup workflow

## Board Support

Current built-in boards:

- Arduino Uno
- Arduino Nano

The board abstraction is designed for future support of:

- ESP32
- ESP8266
- Raspberry Pi Pico
- STM32

Each board definition includes:

- board identity
- pin capabilities
- supported component list
- default code generation behavior

## Arduino Sketch Generator And CLI Workflow

The `Generate Code` action analyzes the current circuit graph and currently looks for:

- Arduino Uno
- Arduino Nano
- LEDs
- Buttons
- Resistors
- Buzzers
- Potentiometers
- Servos
- Ultrasonic Sensors

The generator produces starter code with:

- pin definitions
- `setup()`
- `loop()`

The generated code window supports:

- copy to clipboard
- save/export as `.ino`

The desktop application now also supports Arduino CLI workflow features:

- detect installed Arduino CLI
- configure Arduino CLI path
- detect connected boards and serial ports
- compile generated sketches
- upload generated sketches
- view build output
- view upload output
- view serial monitor output

Important:

- Generated code is a starter template and may require manual refinement.

## Plugin Architecture

The shared model now includes interfaces for:

- `BoardPlugin`
- `ComponentPlugin`
- `GeneratorPlugin`
- `ValidationPlugin`

Current built-in registries live in `src/shared` and establish the extension path for future:

- new board packs
- new sensors
- new component libraries
- new generator behaviors
- new validation heuristics

## Smart Circuit Assistant

The `Analyze Circuit` workflow adds a dedicated findings panel for:

- missing resistor
- missing ground
- invalid power connection
- floating input
- missing required sensor connections
- duplicate power sources

This sits alongside, rather than replacing, the existing educational validation system.

## Pin Compatibility Engine

During connection creation, the editor now evaluates pin compatibility and provides:

- valid target highlighting
- invalid target highlighting
- connection hints
- incompatibility explanations

## Code Generation Architecture

Code generation is separated from the renderer UI.

Current architecture:

- `src/shared/arduinoSketch.ts`
  - graph analysis
  - board-aware sketch generation
  - component-specific generator plugins
- `src/shared/boards.ts`
  - board definitions and capabilities
- renderer
  - triggers generation
  - displays generated code
  - handles copy/save actions

## Template System

Built-in templates are defined in:

- `src/shared/templates.ts`

Templates provide starter project graphs and metadata for common beginner scenarios.

## Architecture Summary

```text
src/
  main/       Electron main process and native desktop file workflow
  preload/    Safe renderer bridge
  renderer/   React application shell, canvas, inspector, dashboard, output panels
  shared/     Schema, boards, plugins, templates, code generation, validation
scripts/
  run-electron-builder.mjs
  verify-sketch-generator.mjs
```

## Keyboard Shortcuts

- `Ctrl/Cmd + S` Save project
- `Ctrl/Cmd + Shift + S` Save project as
- `Ctrl/Cmd + O` Open project
- `Ctrl/Cmd + E` Export compatibility JSON
- `Ctrl/Cmd + G` Generate Arduino code
- `Ctrl/Cmd + K` Open keyboard shortcut help
- `Ctrl/Cmd + Z` Undo
- `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y` Redo
- `Delete` or `Backspace` Delete selected item
- `Escape` Clear selection or close overlays

## Known Limitations

- Validation remains heuristic and is not a circuit simulator.
- The plugin interfaces and registries are in place, but external third-party plugin loading is not implemented yet.
- Board support is currently limited to Arduino Uno and Arduino Nano.
- Generated code is intentionally starter-grade and not production firmware synthesis.
- Native Electron save/open/export/import flows were validated through build/runtime workflows, but not every manual UX path was exhaustively automated.
- Arduino CLI behavior depends on the user having `arduino-cli` installed and accessible or configured explicitly in Settings.

## Troubleshooting

### `npm` not recognized

Install Node.js and reopen the terminal. On Windows:

```powershell
where.exe node
where.exe npm
```

### Packaging issues

If `npm run electron:build` fails:

1. run `npm run lint`
2. run `npm run typecheck`
3. run `npm run build`
4. retry `npm run electron:build`

This repository includes `scripts/run-electron-builder.mjs`, which stabilizes Windows packaging in runtimes where Electron Builder cannot rely on a normal global `npm` command. It now injects a controlled npm shim for dependency-tree collection so Windows packaging remains repeatable in this environment.
