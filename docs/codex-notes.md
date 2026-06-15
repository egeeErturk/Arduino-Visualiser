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

## What Features Work

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run electron:dev` startup wiring
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
- `npm run electron:build` is configured and starts packaging, but the packaging run hit an external `ECONNRESET` failure while downloading/building packaging assets.
- There are no automated tests yet.
- React Flow drag-from-handle connection creation is not implemented; the editor still uses the click-pin-to-click-pin model.
- Packaging verification for macOS and Linux was not possible on this Windows environment.

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
