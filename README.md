# Arduino Circuit Visualizer

Arduino Circuit Visualizer is a desktop-first Arduino design application for visual circuit planning, beginner-friendly project templates, project metadata management, starter sketch generation, and educational Arduino logic simulation. It is not a full real-world electrical simulator.

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
- project dashboard and local project library
- template library
- board abstraction
- runtime plugin loading
- starter Arduino code generation
- built-in Arduino code editor and import workflow
- beginner-friendly simulation and serial monitor workspace
- BOM and project documentation export

## Features

- Desktop application architecture with Electron `main` and `preload`
- Typed circuit schema with import normalization and backward-compatible JSON parsing
- React Flow visual editor with pan, zoom, fit view, node drag, edge selection, and pin wiring
- Project dashboard with blank-project, template, local-library, and recent-file workflows
- Custom `.avc` project format for primary save/load
- JSON import/export compatibility
- Built-in local project library stored in the Electron user-data directory
- Library project actions:
  - save to library
  - open from library
  - rename
  - duplicate
  - delete
  - reveal in folder
  - import into library
- Library search by name, description, and board type
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
  - ESP32 DevKit V1
  - ESP8266 NodeMCU
  - Raspberry Pi Pico
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
- Monaco-powered Arduino code editor with Circuit / Code / Simulation / Serial workspace tabs
- Arduino code import for `.ino`, `.cpp`, and `.h`
- Heuristic code pin detection from imported or manually edited sketches
- Beginner-focused Arduino logic simulation for a safe supported subset
- Simulated serial monitor output for `Serial.print` / `Serial.println`
- Runtime plugin loading from desktop `plugins/` directories
- Plugin manager panel with loaded and failed plugin visibility
- Bill of materials generation with CSV and Markdown export
- Project documentation generation with Markdown, HTML, and PDF export
- Arduino CLI integration for detection, compile, upload, and serial monitoring
- Smart circuit assistant findings panel
- Pin compatibility hints during connection creation
- Undo/redo
- Keyboard shortcuts help
- Settings screen
- About screen
- Heuristic educational validation warnings
- Windows packaging support through Electron Builder
- Release notes generator and release asset scaffolding

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

Run automated tests with coverage:

```bash
npm run test
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

Generate release notes assets:

```bash
npm run release:notes
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
- recent library projects
- all library projects
- external recent files
- fast project startup workflow

## Built-In Project Library

The desktop application now includes an internal project library so projects can be managed like a real desktop software workspace instead of only through file dialogs.

Projects are stored in the Electron user-data directory under:

- `projects/`

Inside that folder the app keeps:

- one internal `.avc` file per saved library project
- `index.json` as the project metadata index

The index stores:

- `id`
- `name`
- `description`
- `author`
- `boardType`
- `createdAt`
- `updatedAt`
- `lastOpenedAt`
- `filePath`
- `thumbnail`
- `status`
- `error`

Project-library save and export are different:

1. App Library Save
   - saves into the built-in user-data project library
   - updates `index.json`
   - lets the project appear in Recent Projects and All Projects
   - library autosave also updates the internal `.avc` copy

2. Save As External `.avc`
   - writes a user-chosen `.avc` file outside the library
   - works like a traditional file-based desktop save flow

If you want to back up the app library, copy the entire user-data `projects/` folder, including:

- `index.json`
- all internal `*.avc` files

## Board Support

Current built-in boards:

- Arduino Uno
- Arduino Nano
- ESP32 DevKit V1
- ESP8266 NodeMCU
- Raspberry Pi Pico

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

The code workspace also supports:

- editing Arduino/C++ code manually
- importing `.ino`, `.cpp`, and `.h`
- exporting the active sketch as `.ino`
- storing manual/imported/generated code inside `.avc` project files
- showing heuristic detected pins from code

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

## Code Editor And Simulation

The main workspace now includes four tabs:

- Circuit
- Code
- Simulation
- Serial Monitor

The Code tab uses Monaco Editor and supports:

- manual Arduino code editing
- generated code insertion
- code import
- `.ino` export

The Simulation tab is intentionally limited to a beginner-friendly Arduino subset. It currently supports:

- `pinMode`
- `digitalWrite`
- `digitalRead`
- `analogRead`
- `analogWrite`
- `delay`
- `millis`
- `Serial.begin`
- `Serial.print`
- `Serial.println`
- `Servo.attach`
- `Servo.write`

Current simulated component behaviors include:

- LED on/off
- button toggle inputs
- potentiometer slider input
- buzzer active/inactive state
- servo angle display
- ultrasonic distance input

Simulation notes:

- this is an educational logic simulator, not a full electrical simulator
- unsupported Arduino syntax is surfaced as simulation notes instead of being executed directly
- compile/upload with Arduino CLI and simulation are separate workflows

## Plugin Architecture

The shared model now includes interfaces for:

- `BoardPlugin`
- `ComponentPlugin`
- `GeneratorPlugin`
- `ValidationPlugin`

Runtime plugin manifests can now be loaded from:

- Electron user data `plugins/`
- workspace `plugins/`

The desktop app exposes a Plugin Manager panel so users can review loaded and failed manifests safely.

Current built-in and runtime registries live in `src/shared` and establish the extension path for:

- new board packs
- new sensors
- new component libraries
- new generator behaviors
- new validation heuristics

Runtime plugins are manifest-based JSON packs. Invalid plugins are isolated and reported in the UI instead of crashing the app.

## BOM And Documentation Export

The desktop app can now generate:

- Bill of materials
- Project documentation bundle

Supported BOM exports:

- CSV
- Markdown

Supported project documentation exports:

- Markdown
- HTML
- PDF

Documentation includes:

- project metadata
- component list
- connection list
- warnings
- generated code
- bill of materials

## Release Preparation

Release-preparation files now include:

- `CHANGELOG.md`
- `release-assets/download-page.md`
- generated release notes from `npm run release:notes`

Generated release notes are written to:

- `release-assets/release-notes-<version>.md`

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
  shared/     Schema, boards, runtime plugins, templates, BOM/docs generation, code generation, validation
plugins/      Runtime plugin manifests discovered by the desktop app
scripts/
  run-electron-builder.mjs
  verify-sketch-generator.mjs
  generate-release-notes.mjs
```

## Engineering Quality

The repository now includes:

- Vitest-based automated tests with coverage reporting
- GitHub Actions CI for lint, typecheck, test, and build
- GitHub Actions release automation for Windows packaging and release asset publishing

Coverage artifacts are written to:

- `coverage/index.html`
- `coverage/coverage-summary.json`

Contributor and engineering guides:

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [docs/plugin-development.md](./docs/plugin-development.md)
- [docs/architecture.md](./docs/architecture.md)

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
- Simulation supports only a safe beginner subset of Arduino-style logic and does not execute arbitrary C++.
- Runtime plugins are currently manifest-driven JSON packs rather than arbitrary executable extension code.
- Project-library thumbnails/previews are not generated yet.
- Generated code is intentionally starter-grade and not production firmware synthesis.
- Native Electron save/open/export/import flows were validated through build/runtime workflows, but not every manual UX path was exhaustively automated.
- Arduino CLI behavior depends on the user having `arduino-cli` installed and accessible or configured explicitly in Settings.
- PDF export depends on the Electron desktop runtime and falls back to HTML in a browser-only context.

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
