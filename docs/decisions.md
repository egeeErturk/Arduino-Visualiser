# Architectural Decisions

## Desktop Stack

The application remains on:

- Electron
- React
- TypeScript
- Vite
- React Flow
- Zustand
- Zod

This stack is already stable in the project and supports maintainable desktop delivery, typed data flow, strong rendering behavior, and native file operations.

## React Flow As The Canvas Engine

React Flow remains the canvas engine because it already provides:

- pan
- zoom
- fit view
- draggable nodes
- selected edges
- stable interaction behavior

The application continues to layer Arduino-specific pin and component behavior on top of custom nodes and edges.

## Shared Domain Layer

`src/shared` is now the primary product-domain layer. It contains:

- schema and normalization
- board definitions
- plugin interfaces
- templates
- code generation
- validation

This keeps Electron, the renderer, and future extension systems anchored to the same typed model.

## Plugin Architecture

Plugin interfaces were added for:

- `BoardPlugin`
- `ComponentPlugin`
- `GeneratorPlugin`
- `ValidationPlugin`

The current project uses internal registries rather than third-party runtime plugin loading. That is intentional.

Reason:

- the architecture needs stable extension points first
- the application should not commit to external plugin loading before the core data model settles
- internal registries keep the system testable and maintainable while still preparing for future extension work

## Board Abstraction

Boards are now first-class definitions in `src/shared/boards.ts`.

Each board definition includes:

- board type
- board family
- description
- supported components
- pin capabilities
- default code generation language/extension

Current boards:

- Arduino Uno
- Arduino Nano

The structure is intentionally ready for future ESP32, ESP8266, Raspberry Pi Pico, and STM32 additions.

## Code Generation Architecture

The Arduino code generator remains outside the UI and now follows a more extensible structure.

The renderer only:

- triggers generation
- shows generated code
- copies/exports generated output

The shared generator layer:

- analyzes the circuit graph
- resolves board-connected components
- uses component-specific generator plugins
- composes final `setup()` / `loop()` output

This keeps code generation independent from Electron dialogs and React UI concerns.

## Arduino CLI Service Layer

Arduino CLI integration is handled in a dedicated Electron-side service:

- `src/main/arduinoService.ts`

Reason:

- compile/upload/serial workflows belong in the desktop shell, not in React components
- CLI execution and process streaming need Node/Electron APIs
- future board support should remain service-driven rather than UI-driven

The renderer only requests actions and displays results.

Current service responsibilities:

- detect Arduino CLI
- persist CLI path and baud-rate configuration
- detect ports and connected boards
- compile generated sketches
- upload generated sketches
- stream serial monitor output back to the renderer

## File Format Strategy

Primary project format:

- `.avc`

Meaning:

- Arduino Visual Circuit

Internally the format is JSON because:

- it is easy to validate with Zod
- it is easy to debug and migrate
- it preserves backward compatibility with earlier JSON-based project data

The product now presents `.avc` as the default save/open format while keeping JSON import/export compatibility.

## Project System

Project metadata is now stored directly in project files.

Metadata fields:

- `name`
- `description`
- `author`
- `boardType`
- `createdAt`
- `updatedAt`

This supports dashboard UX, recent projects, and future release-quality workflows without adding a separate project database.

## Smart Circuit Assistant

The smart circuit assistant is implemented as a shared analysis layer separate from renderer concerns.

Reason:

- the same graph-analysis rules can support future automated repair hints, reports, or export checks
- the assistant should not be coupled to one specific panel layout

It currently focuses on actionable workflow findings rather than full simulation.

## Pin Compatibility Engine

Pin compatibility is implemented in a shared rules module so connection validation and connection hints use the same logic.

Reason:

- avoids duplicated ad hoc checks inside React Flow callbacks
- makes future board-capability-aware connection rules easier to add
- keeps the UI responsible only for highlighting and messaging

## Recent Projects Storage

The Electron main process now stores desktop state using a lightweight JSON file under the Electron user-data directory instead of `electron-store`.

Reason:

- the packaged desktop app can now run using only built-in Node/Electron modules at runtime
- Electron Builder packaging no longer depends on a fragile npm-based runtime dependency scan for `electron-store`

This reduced packaging risk and kept the desktop runtime simpler.

## Packaging Wrapper

`scripts/run-electron-builder.mjs` remains the Windows packaging entrypoint.

Its responsibilities are now:

- clean stale `release/win-unpacked` targets
- provide stable Windows PATH setup
- inject a controlled `npm.cmd` shim for Electron Builder dependency-tree collection in runtimes where a normal global npm command is unavailable

This is an environment-hardening layer, not a product-feature layer.

## Validation Is Heuristic, Not Simulation

The product goal is design, planning, onboarding, and starter-code generation, not full electrical simulation.

Validation therefore stays heuristic and educational rather than claiming real-world electrical correctness.
