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
