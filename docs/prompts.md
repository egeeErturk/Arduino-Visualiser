# Prompts

## Phase 1

- Build a visual Arduino circuit editor focused on component placement, pin relationships, and documentation rather than electrical simulation.

## Phase 2

- Convert the project into a downloadable desktop app using Electron + Vite + React + TypeScript.
- Fix explicit save/load, schema validation, structured inspector views, validation heuristics, iconography, animations, keyboard shortcuts, undo/redo, and documentation.

## Important Prompts Used Today

- Migrate the project away from the zero-dependency JavaScript prototype and onto a proper maintainable desktop stack.
- Add Electron desktop support with `main`, `preload`, safe IPC, packaging scripts, and native file operations.
- Implement a versioned circuit schema with TypeScript interfaces and runtime validation.
- Rebuild the editor around React Flow, Zustand, Zod, and Lucide React while preserving the working circuit-planning features.
- Verify typecheck, build, Electron startup, packaging readiness, and documentation accuracy before pausing work.
- Evolve the application from a circuit visualizer into a professional Arduino desktop software product.
- Add a professional desktop application shell with dashboard, recent projects, templates, output panel, settings, about screen, and shortcut help.
- Introduce plugin interfaces for boards, components, generators, and validation so future Arduino-related extensions can be added without changing core architecture.
- Add board abstraction, custom `.avc` project files, richer project metadata, and template-based project creation.
- Preserve Electron, React, TypeScript, React Flow, Zustand, Zod, undo/redo, save/load, and packaging stability while adding the new workflow features.
- Integrate Arduino CLI as a service layer for board detection, compile, upload, and serial monitor workflows.
- Add a smart circuit assistant and pin-compatibility engine without regressing the existing editor and packaging behavior.
- Add runtime plugin loading, BOM export, project documentation export, additional board support, and release-preparation assets without removing any existing desktop functionality.
- Add testing infrastructure, CI/CD workflows, release automation, performance-oriented bundle splitting, and contributor/architecture documentation without introducing new major end-user features.
- Add a professional Arduino code editor, code import workflow, and beginner-friendly simulation engine without claiming full electrical simulation or breaking Electron packaging.
