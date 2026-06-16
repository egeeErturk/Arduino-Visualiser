# Architecture Guide

## Overview

Arduino Circuit Visualizer is a desktop application built on:

- Electron
- React
- TypeScript
- Vite
- React Flow
- Zustand
- Zod

## Layering

### `src/shared`

Core domain logic:

- circuit schema
- project parsing and normalization
- board definitions
- component catalog
- plugin registry
- validation
- circuit assistant
- code generation
- BOM generation
- documentation generation

This layer is the main target for unit tests.

### `src/renderer`

Desktop UI:

- application shell
- canvas interactions
- inspector
- output panels
- settings and modal flows

The renderer should stay thin around domain logic and rely on `src/shared` whenever possible.

### `src/main`

Electron main-process concerns:

- file dialogs
- autosave persistence
- recent project persistence
- plugin directory loading
- Arduino CLI integration
- PDF export

### `src/preload`

Secure IPC bridge between renderer and main.

## Testing Strategy

Current automated tests focus on logic-heavy modules with low UI brittleness:

- plugin runtime
- project serialization
- BOM generation
- documentation generation
- circuit assistant
- code generation
- connection rules

## CI/CD Strategy

`ci.yml` validates:

- lint
- typecheck
- test
- build

`release.yml` handles:

- release-note generation
- Windows packaging
- artifact upload
- GitHub Release publishing for version tags

## Performance Notes

The renderer bundle is optimized with manual chunk splitting for:

- React vendor code
- React Flow
- Lucide icons
- remaining third-party vendor code

The application entry also lazy-loads `App` from the renderer bootstrap to reduce initial blocking work in the Vite entry bundle.
