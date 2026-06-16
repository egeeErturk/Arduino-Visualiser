# Arduino Circuit Visualizer

Arduino Circuit Visualizer is a desktop-first Arduino circuit planning tool for visual design, learning, documentation, and pin-to-pin wiring review. It is not an electrical simulator.

## Current Project Status

The project has been migrated to:

- React
- TypeScript
- Vite
- Electron
- React Flow
- Zustand
- Zod

The desktop architecture, typed schema, renderer UI, and packaging scripts are in place. Web build, typecheck, Electron development startup, and Windows desktop packaging are now passing in this environment.

## Features

- Desktop application structure with Electron `main` and `preload`
- Typed circuit schema with validation and import normalization
- React Flow canvas with pan, zoom, fit view, drag, and wire selection
- Component library for Arduino-focused parts
- Click-to-connect pin workflow
- Structured inspector for components, pins, and wires
- Manual `Open`, `Save`, `Save As`, `Import JSON`, and `Export JSON`
- Autosave backup
- Dirty-state tracking
- Undo and redo
- Keyboard shortcuts
- Heuristic educational warnings
- Arduino sketch generation with starter `.ino` export

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

## How To Build

Run lint:

```bash
npm run lint
```

Run typecheck:

```bash
npm run typecheck
```

Build the renderer and Electron TypeScript output:

```bash
npm run build
```

Verify the Arduino sketch generator scenarios:

```bash
npm run verify:sketch
```

## How To Package The Desktop App

Run:

```bash
npm run electron:build
```

Electron Builder is configured for:

- Windows: `nsis`, `portable`
- macOS: `dmg`
- Linux: `AppImage`

Packaged output is written to `release/`.

Generated Windows artifacts:

- `release/Arduino Circuit Visualizer Setup 1.0.0.exe`
- `release/Arduino Circuit Visualizer 1.0.0.exe`
- `release/win-unpacked/`

## Project Architecture

```text
src/
  main/       Electron main process
  preload/    Safe IPC bridge
  renderer/   React app, canvas, UI, store
  shared/     Schema, catalog, validation logic
```

## Save / Load System

- `Save` writes to the existing project path when available
- `Save As` prompts for a `.json` file destination
- `Open` loads a saved circuit file
- `Import JSON` supports file import or pasted JSON
- `Export JSON` writes the current project to a chosen location
- `Autosave` stores a recovery backup

## Arduino Sketch Generator

- `Generate Code` analyzes the current circuit graph and looks for Arduino-connected:
  - LEDs
  - buttons
  - servos
  - potentiometers
  - buzzers
  - ultrasonic sensors
- The generator produces:
  - pin definitions
  - `setup()`
  - `loop()`
- Output is shown in a dedicated modal.
- You can copy the generated code to the clipboard or save it as an `.ino` file.
- Generated code is a starter template and may require manual refinement.

## Keyboard Shortcuts

- `Ctrl/Cmd + S` Save
- `Ctrl/Cmd + Shift + S` Save As
- `Ctrl/Cmd + O` Open
- `Ctrl/Cmd + E` Export
- `Ctrl/Cmd + Z` Undo
- `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y` Redo
- `Delete` or `Backspace` Delete selected item
- `Escape` Cancel pending connection or clear selection

## Known Limitations

- Validation is heuristic, not simulation-grade.
- Native Electron save/open/export/import flows still need a complete manual click-through verification pass.
- There are no automated tests yet.
- Drag-from-handle wire authoring is not implemented; the editor still uses the click-pin-to-click-pin model.
- Sketch generation is heuristic and only emits starter code for the currently supported Arduino-related components.

## Troubleshooting

### `npm` not recognized

Install Node.js and reopen the terminal. On Windows:

```powershell
where.exe node
where.exe npm
```

### Packaging issues

If `npm run electron:build` fails:

1. run `npm run typecheck`
2. run `npm run build`
3. retry packaging
4. confirm `node`, `npm`, and `powershell.exe` are available from your terminal
5. if Electron Builder reports `No JSON content found in output`, verify your npm shim is valid and not a broken wrapper

This repository now routes `npm run electron:build` through `scripts/run-electron-builder.mjs`, which injects a working `npm.cmd` shim for Electron Builder subprocesses when the surrounding runtime does not expose one correctly.
The same wrapper also removes stale `release/win-unpacked` staging folders before packaging so repeated Windows builds do not fail on a leftover rename target.
