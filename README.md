# Arduino Circuit Visualizer

Arduino Circuit Visualizer is a desktop-first Arduino design tool for planning circuits, generating starter sketches, managing projects, and teaching Arduino logic with a safe beginner-friendly simulator.

It is built with Electron, React, TypeScript, Vite, React Flow, Zustand, and Zod.

## Features

- Desktop application architecture with native save/open/import/export flows
- Visual circuit editor with pan, zoom, fit view, drag/drop placement, and pin-level wiring
- Structured inspector for projects, components, pins, wires, and warnings
- `.avc` project format with backward-compatible JSON import/export
- Local project library with recent projects, search, rename, duplicate, delete, and reveal-in-folder
- Built-in starter templates for common Arduino projects
- Arduino code generator with copy and `.ino` export
- Monaco-based code editor for manual or imported Arduino sketches
- Code import support for `.ino`, `.cpp`, and `.h`
- Heuristic pin detection from Arduino code
- Beginner-friendly simulation workspace with circuit, code, simulation, and serial monitor tabs
- Arduino CLI integration for compile, upload, and serial monitoring
- Heuristic validation warnings and smart circuit assistant findings
- BOM export in CSV and Markdown
- Project documentation export in Markdown, HTML, and PDF
- Runtime plugin manifest support for future boards, generators, components, and validations
- Windows desktop packaging via Electron Builder

## Screenshots

Release screenshots should be placed in `docs/screenshots/`.

Suggested screenshot set:

- Dashboard
- Circuit editor
- Inspector
- Code editor
- Simulation workspace
- BOM or documentation export

When screenshots are added, replace this section with Markdown image links such as:

```md
![Dashboard](docs/screenshots/dashboard.png)
![Circuit Editor](docs/screenshots/circuit-editor.png)
```

## Demo GIF

Add a short demo GIF to `docs/screenshots/demo.gif` and embed it here:

```md
![Demo](docs/screenshots/demo.gif)
```

Recommended demo flow:

1. Open the dashboard and start a template project.
2. Place and connect a few components in the circuit editor.
3. Generate starter Arduino code.
4. Switch to the code editor and show detected pins.
5. Run the simulation and show serial output.
6. Save the project to the local project library.

## Installation

### Download Desktop Builds

Windows release artifacts are generated into `release/` during packaging:

- `Arduino Circuit Visualizer Setup 1.0.0.exe`
- `Arduino Circuit Visualizer 1.0.0.exe`
- `win-unpacked/`

### Local Development Setup

Install dependencies:

```bash
npm install
```

Run the Vite renderer:

```bash
npm run dev
```

Run the Electron desktop app in development mode:

```bash
npm run electron:dev
```

## Build

Run quality checks:

```bash
npm run lint
npm run typecheck
```

Build the renderer and Electron bundles:

```bash
npm run build
```

Package the desktop application:

```bash
npm run electron:build
```

Generate release notes:

```bash
npm run release:notes
```

## Current Product Scope

Arduino Circuit Visualizer currently supports:

- Arduino Uno
- Arduino Nano
- ESP32 DevKit V1
- ESP8266 NodeMCU
- Raspberry Pi Pico

Supported educational simulation subset:

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

Supported simulated component behaviors:

- LED on/off
- button toggle input
- potentiometer slider input
- buzzer active/inactive state
- servo angle state
- ultrasonic distance input

## Roadmap

- Add richer simulation coverage for more Arduino language patterns
- Improve connection-creation UX with more direct drag wiring behavior
- Add project thumbnails and richer dashboard previews
- Expand runtime plugin packs and component libraries
- Add more board-specific code generation depth
- Improve release branding with final screenshots, demo GIFs, and polished installer assets

## Known Limitations

- This is not a full electrical simulator.
- The simulator intentionally supports only a safe beginner subset of Arduino-like logic.
- Imported code analysis is heuristic and not a full C++ parser.
- Arduino CLI workflows require a working local `arduino-cli` installation.
- Project thumbnails are not generated yet.

## Project Structure

```text
src/
  main/       Electron main process and native desktop services
  preload/    Safe renderer bridge
  renderer/   React desktop UI
  shared/     Schema, boards, generators, simulation, validation, exports
docs/         Project notes, decisions, prompts, screenshots
plugins/      Runtime plugin manifests
release-assets/ Release notes and public-release collateral
scripts/      Build and release helpers
```

## License

Add your preferred project license before the first public production release if you want explicit open-source terms on GitHub.
