# Codex Notes

## What Was Built Today

- Migrated the project from a plain JavaScript static app to a React + TypeScript + Vite + Electron desktop app structure.
- Added Electron `main` and `preload` layers with context isolation and a narrow file-operation bridge.
- Added a typed, versioned circuit schema with Zod validation and import normalization.
- Rebuilt the visual editor on React Flow with custom circuit nodes and edges.
- Added manual `Open`, `Save`, `Save As`, `Import`, `Export`, autosave backup, dirty-state handling, undo/redo, and keyboard shortcuts.
- Added a structured inspector for components, pins, wires, and warnings.
- Added heuristic validation warnings for common Arduino wiring mistakes.
- Added desktop packaging scripts and Electron Builder configuration.
- Fixed the Windows desktop packaging path so `npm run electron:build` completes successfully in this Codex environment.

## What Features Work

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run electron:dev` startup wiring
- `npm run electron:build`
- React renderer loads successfully in Vite
- Electron processes launch in dev mode
- Component library rendering
- Canvas pan/zoom/fit view
- Click-to-connect pin workflow
- Drag-and-drop placement from the sidebar
- Undo/redo state history
- Save/load/import/export architecture in code
- Autosave recovery
- Warning generation and warning selection

## What Features Are Incomplete

- Native desktop flows were not fully click-tested end-to-end through the Electron window in this environment.
- There are no automated tests yet.
- React Flow drag-from-handle connection creation is not implemented; the editor still uses the click-pin-to-click-pin model.
- Packaging verification for macOS and Linux was not possible on this Windows environment.

## Packaging Issue, Root Cause, Fix, And Result

- Original packaging failure: `No JSON content found in output`
- Immediate trigger: Electron Builder failed while collecting production node modules with npm.
- Root cause: this runtime did not expose a working global `npm` command to Electron Builder subprocesses. Once `npm` was made discoverable, the bundled `npm.cmd` wrapper still failed because it pointed at a non-standard tool layout and could not resolve its own `npm-cli.js`.
- Fix: resynced `package-lock.json` with `npm install`, then changed `npm run electron:build` to call `scripts/run-electron-builder.mjs`. That wrapper preserves normal local behavior while injecting:
  - the current Node executable into `PATH`
  - Windows PowerShell system paths into `PATH`
  - a temporary runtime-generated `npm.cmd` shim that points directly to the active `node` and `npm_execpath`
- Verification result: `npm run electron:build` now succeeds and produces Windows artifacts in `release/`.

## What Needs To Be Done Tomorrow

- Run a full manual Electron app interaction pass:
  - open the desktop window
  - add components
  - connect pins
  - save to file
  - save as
  - open/load a saved circuit
  - import malformed JSON and confirm graceful failure
  - export JSON
- Investigate and retry `npm run electron:build` to get a successful packaged artifact.
- Add automated tests for:
  - schema import normalization
  - validation rules
  - store undo/redo behavior
- Consider refining:
  - wire creation UX
  - richer component visuals
  - more detailed warning navigation

## Commands To Run The Project

```bash
npm install
npm run lint
npm run typecheck
npm run build
npm run electron:dev
npm run electron:build
```

## 2026-06-16 QA Stabilization Pass

### Bugs Found

- Sidebar click placement stacked new components on top of each other, which made node selection unreliable.
- React Flow warned that `nodeTypes` and `edgeTypes` were being recreated during runtime.
- Undo could succeed while redo was silently disabled because non-history mutations like viewport updates cleared `historyFuture`.
- The global keyboard shortcut effect re-registered on every render, which risked duplicate shortcut handlers.
- Rename actions were not tracked in undo history even though rename is meant to be undoable.
- Save and Save As marked the project clean but also polluted undo history by pushing the current state as if it were a loaded project.
- Windows packaging could fail on repeat runs when `release/win-unpacked` already existed.

### Bugs Fixed

- Added collision-aware automatic offset placement for sidebar-added components.
- Hoisted React Flow type maps out of the canvas render path.
- Preserved the redo stack for non-history mutations.
- Added stable dependencies to the keyboard shortcut effect so listeners are not duplicated on rerender.
- Made rename operations participate in history tracking.
- Added a dedicated saved-state helper so save actions stop adding bogus undo entries.
- Cleaned stale Windows unpacked output in the Electron Builder wrapper before packaging.

### QA Results

- Verified in the live renderer:
  - app loads
  - component add flow works
  - zoom controls work
  - undo works
  - redo works after fix
  - malformed JSON import shows an error instead of crashing
  - warning generation is active
- Verified from process/build checks:
  - Electron dev processes launch
  - Windows packaging completes after stabilization fixes
- Not fully verified end-to-end in this environment:
  - native Electron file dialogs
  - packaged EXE click-through UX
  - full inspector rename/delete flow by Windows automation

### Environment Limitation

- The Windows Computer Use runtime failed to bootstrap in this session, so full native desktop click-through automation was not trustworthy. Renderer QA was completed through the in-app browser and desktop build/process verification was completed through shell checks.

## 2026-06-16 Arduino Sketch Generator

### What Was Added

- Added a reusable shared Arduino sketch generation layer in `src/shared/arduinoSketch.ts`.
- Added a new `Generate Code` action in the renderer toolbar.
- Added a dedicated generated-code modal with:
  - starter code output
  - copy-to-clipboard
  - save as `.ino`
- Added desktop IPC support for native `.ino` save dialogs.
- Added a reusable verification script for required generation scenarios.

### Supported Detection

- Arduino Uno / Nano
- LED
- Push Button
- Servo Motor
- Potentiometer
- Buzzer
- Ultrasonic Sensor

### Verification Result

- `lint` passed
- `typecheck` passed
- `build` passed
- `verify:sketch` passed for:
  - LED circuit
  - Button + LED
  - Servo
  - Ultrasonic sensor

### Notes

- Generated code is intentionally a starter template and not a claim of complete automatic firmware synthesis.
- The generator follows circuit graph connections through simple passive pass-through parts like resistor, breadboard, and jumper wire so Arduino-linked devices can still be recognized in common beginner layouts.

## 2026-06-16 Professional Arduino Software Pass

### Features Added

- Professional desktop application shell with:
  - top toolbar
  - left component library
  - center design canvas
  - right inspector
  - bottom output panel
- Project dashboard with:
  - blank project start
  - template-based project creation
  - recent projects
- Settings screen
- About screen
- Keyboard shortcut help screen
- Project metadata support:
  - name
  - description
  - author
  - board type
- Board abstraction for:
  - Arduino Uno
  - Arduino Nano
- Template library for:
  - Blink LED
  - Push Button LED
  - Traffic Light
  - Servo Sweep
  - Ultrasonic Distance Meter
  - Potentiometer Dimmer
- Custom `.avc` project format as the primary save/open extension
- JSON compatibility retained for import/export
- Recent projects tracking in desktop state
- Plugin interfaces for:
  - boards
  - components
  - generators
  - validation
- Generator engine update to support component-specific generator plugin composition
- Added resistor awareness to sketch analysis output

### Packaging Stabilization Update

- Removed `electron-store` from the desktop runtime path.
- Replaced it with lightweight JSON state storage in the Electron user-data directory.
- Hardened `scripts/run-electron-builder.mjs` with a custom npm shim that returns a clean dependency tree in this environment.
- Result: Windows packaging now succeeds again after the professional-software expansion.

### Verification Results

- `lint` passed
- `typecheck` passed
- `build` passed
- `verify:sketch` passed
- `electron:build` passed

### Existing Functionality Status

- Save/load preserved
- JSON import/export preserved
- Undo/redo preserved
- Validation preserved
- Desktop packaging preserved

### Remaining Limitations

- Plugin interfaces and registries are present, but external runtime plugin loading is not implemented yet.
- Board support is still limited to Arduino Uno and Arduino Nano.
- Generated sketches remain starter templates rather than production-ready firmware.
- Docking is lightweight and panel resizing is intentionally simple rather than a full IDE-style docking framework.

## 2026-06-16 Arduino Workflow Integration Pass

### Features Added

- Arduino CLI service layer in the Electron main process
- Arduino CLI configuration support:
  - detect CLI
  - set CLI path
  - set serial baud rate
- Connected board / serial port detection via Arduino CLI
- Compile generated sketches from the desktop app
- Upload generated sketches from the desktop app
- Serial monitor output streaming into the renderer
- Dedicated Arduino CLI output panel in the bottom workspace
- Smart circuit assistant analysis panel
- Pin compatibility rules with:
  - valid target highlighting
  - invalid target highlighting
  - incompatibility explanations

### Architecture Added

- `src/main/arduinoService.ts`
- `src/shared/circuitAssistant.ts`
- `src/shared/connectionRules.ts`

### Verification Results

- `lint` passed
- `typecheck` passed
- `build` passed
- `electron:build` passed

### Notes

- Arduino CLI-dependent actions still require a real local `arduino-cli` installation to fully function at runtime.
- The renderer now surfaces CLI failures cleanly instead of assuming the tool exists.
