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

## Runtime Plugin Architecture

Plugin interfaces were added for:

- `BoardPlugin`
- `ComponentPlugin`
- `GeneratorPlugin`
- `ValidationPlugin`

The project now supports runtime plugin loading through manifest-based JSON files rather than arbitrary executable extensions.

Reason:

- runtime plugin packs should be safe to load in packaged desktop builds
- packaging should not depend on evaluating third-party JavaScript inside the renderer or Electron main process
- manifest validation keeps failures isolated and debuggable
- the shared registry layer can merge built-in and runtime boards/components/generators/validations without changing the rest of the app

Runtime plugin discovery currently scans:

- Electron user-data `plugins/`
- workspace `plugins/`

Invalid plugin manifests are reported in the Plugin Manager UI and do not crash the application.

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

Built-in board support now includes:

- ESP32 DevKit V1
- ESP8266 NodeMCU
- Raspberry Pi Pico

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

## Code Editor Architecture

The code editor is integrated into the renderer workspace, but code storage and interpretation remain in shared typed models.

Reason:

- the editor UI should be replaceable without changing project serialization
- imported code, generated code, and manual code need to coexist in the same project model
- simulation and future Arduino tooling need a stable shared source of sketch data

Monaco Editor was chosen because:

- it gives desktop-grade code editing behavior
- Arduino/C++ syntax highlighting is readily available
- it fits the professional desktop workflow goal better than a plain textarea

## Simulation Architecture

The simulation system is intentionally a safe interpreted subset, not raw C++ execution.

Reason:

- running arbitrary user C++ in the renderer or Electron process would be unsafe and brittle
- the product goal is beginner-friendly logic feedback, not full hardware emulation
- a constrained interpreter keeps behavior understandable and extensible

The simulation engine lives in `src/shared/simulation.ts` and:

- parses `setup()` and `loop()` bodies
- interprets a supported Arduino-style subset
- derives visual component and wire state from the shared circuit graph
- feeds renderer overlays and the simulated serial monitor

This keeps simulation logic separate from React components and separate from Arduino CLI compile/upload workflows.

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

## Local Project Library

The desktop app now uses a dedicated Electron-side project-library service instead of trying to make the renderer manage a directory of files directly.

Reason:

- project-library storage belongs to the desktop shell, not the React editor
- the renderer should ask for library operations through safe IPC rather than perform filesystem work itself
- a project index allows fast dashboard listing, recent-project sorting, and metadata search without forcing every UI action to scan directories blindly

Storage structure:

- Electron user-data `projects/`
- `projects/index.json`
- `projects/<project-id>.avc`

The index is treated as a cacheable metadata catalog, while the `.avc` files remain the project source of truth.

If a file is missing or corrupted, the dashboard marks it unavailable instead of crashing the app.

## Save Model: Library vs External

The save system now intentionally supports two desktop workflows:

1. App-library save
2. External Save As `.avc`

Reason:

- many users want a software-style internal project dashboard
- advanced users still expect explicit external files for sharing, versioning, or manual backups
- the application should support both without forcing one model onto every workflow

Library autosave updates the internal library copy when the active project belongs to the library, while the separate desktop autosave backup remains available as a safety net.

## BOM And Documentation Export

BOM generation and project-documentation export are implemented in the shared domain layer.

Reason:

- the same project summary data should be reusable for desktop export, future dashboards, and release assets
- BOM and documentation should reflect the validated project state rather than ad hoc UI snapshots
- Electron only handles native save dialogs and PDF rendering, while content generation stays framework-agnostic

Current export formats:

- BOM: CSV, Markdown
- Documentation: Markdown, HTML, PDF

PDF export is handled in Electron using an off-screen BrowserWindow and `printToPDF`.

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

## Testing Strategy

Vitest was chosen for the automated test layer.

Reason:

- it integrates cleanly with Vite and TypeScript
- it is fast enough for frequent local and CI execution
- coverage reporting is straightforward with the V8 provider
- the highest-value logic in this app lives in shared TypeScript modules that do not need heavy browser automation

The current test strategy prioritizes:

- domain logic
- serialization
- plugin loading
- analysis and generation rules

over brittle renderer snapshot tests.

## CI/CD Strategy

GitHub Actions now uses two workflow layers:

- `ci.yml` for every push, PR, and manual run
- `release.yml` for version tags and manual release execution

Reason:

- routine quality checks should stay fast and deterministic
- desktop packaging is heavier and better isolated in a release-focused workflow
- tagged releases should generate release notes and publish packaged artifacts automatically

## Bundle Optimization Approach

The renderer performance pass did not introduce product-level behavior changes.

Instead it uses:

- Vite manual chunk splitting for large third-party libraries
- lazy loading of the renderer `App` entry

Reason:

- removes the earlier `>500kB` single-bundle warning
- improves cacheability of heavy dependencies like React Flow
- keeps the optimization strategy understandable and low-risk

## Release Preparation Structure

Release preparation now uses lightweight repository assets instead of a full release-management subsystem.

Current release assets:

- `CHANGELOG.md`
- `release-assets/download-page.md`
- `scripts/generate-release-notes.mjs`

Reason:

- the project needs repeatable versioned release notes and download-page copy now
- a lightweight Markdown-based release flow is sufficient at this product stage
- this keeps public-release prep under source control without introducing new infrastructure

## Validation Is Heuristic, Not Simulation

The product goal is design, planning, onboarding, and starter-code generation, not full electrical simulation.

Validation therefore stays heuristic and educational rather than claiming real-world electrical correctness.
