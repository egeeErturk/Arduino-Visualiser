# Contributing

## Prerequisites

- Node.js 22 or newer
- npm
- Windows is recommended for packaging verification
- `arduino-cli` is optional unless you are testing compile, upload, or serial workflows

## Local Setup

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

Run the desktop app in development mode:

```bash
npm run electron:dev
```

## Expected Quality Gates

Before opening a PR, run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

If you changed desktop packaging behavior, also run:

```bash
npm run electron:build
```

## Development Guidelines

- Keep domain logic in `src/shared` whenever it can be reused by renderer and Electron.
- Keep Electron-only behaviors in `src/main` and expose them through `src/preload`.
- Prefer adding tests for shared logic before touching UI code.
- Avoid introducing runtime-only plugin execution without an explicit security review.
- Do not regress save/load, validation, packaging, or Arduino CLI flows while making unrelated changes.

## Test Areas

Current automated tests cover:

- plugin runtime loading
- BOM generation
- project documentation generation
- circuit assistant findings
- Arduino code generation
- pin compatibility rules
- project serialization and normalization

## CI/CD

GitHub Actions currently enforce:

- lint
- typecheck
- test
- build

Tagged releases also build Windows artifacts and attach release assets to GitHub Releases.
