# Arduino Circuit Visualizer v1.0.0

## Public Release Summary

Arduino Circuit Visualizer is now available as a desktop-first Arduino workflow tool for circuit planning, code generation, project management, and beginner-friendly logic simulation.

## Highlights

- Desktop Electron app with native save/open/import/export flows
- Visual circuit editor with inspector, templates, undo/redo, and validation warnings
- Local app project library with recent projects and search
- Arduino starter sketch generation with `.ino` export
- Monaco-based code editor with `.ino`, `.cpp`, and `.h` import
- Beginner-friendly simulation workspace with serial monitor output
- Arduino CLI integration for compile, upload, and serial monitoring
- BOM and project documentation export
- Runtime plugin manifest support for future extension packs
- Windows packaging with installer and portable executable output

## Installer Output

- Windows installer: `release/Arduino Circuit Visualizer Setup 1.0.0.exe`
- Windows portable: `release/Arduino Circuit Visualizer 1.0.0.exe`

## Important Notes

- Generated code is a starter template and may require manual refinement.
- Simulation supports an educational Arduino subset and is not a full electrical simulator.
- Arduino CLI workflows require a local `arduino-cli` installation.

## Changelog

# Changelog

## Unreleased

- No unreleased changes yet.

## v1.0.0 - 2026-06-16

### Desktop Application

- Released Arduino Circuit Visualizer as a desktop-first Electron application for Windows packaging, with React, TypeScript, Vite, and React Flow.
- Added native desktop save, save as, open, import, export, autosave recovery, and dirty-state handling.
- Added a local project library stored in the Electron user data directory with recent projects, project search, rename, duplicate, reveal, delete, and import flows.

### Circuit Editing And Inspection

- Added a visual circuit editor with pan, zoom, fit view, drag-and-drop component placement, click-to-connect wiring, and edge selection.
- Added structured inspector panels for projects, components, pins, wires, and warnings.
- Added undo/redo, keyboard shortcuts, settings, about screen, and project dashboard workflows.

### Arduino Workflow

- Added starter Arduino code generation with `.ino` export.
- Added Monaco-based code editing for Arduino sketches.
- Added Arduino code import for `.ino`, `.cpp`, and `.h` files.
- Added heuristic pin detection from imported and edited sketches.
- Added a beginner-friendly Arduino logic simulation workspace with circuit, code, simulation, and serial monitor tabs.
- Added simulated support for `pinMode`, digital and analog read/write, `delay`, `millis`, `Serial.print`, `Serial.println`, `Servo.attach`, and `Servo.write`.
- Added Arduino CLI detection, configuration, compile, upload, and serial monitor integration.

### Boards, Components, And Validation

- Added built-in board support for Arduino Uno, Arduino Nano, ESP32 DevKit V1, ESP8266 NodeMCU, and Raspberry Pi Pico.
- Added built-in templates for common starter projects such as Blink, Button + LED, Servo Sweep, Ultrasonic Distance Meter, and Potentiometer Dimmer.
- Added heuristic educational validation warnings and a smart circuit assistant for common wiring issues.
- Added pin compatibility hints during connection creation.

### Extensibility And Output

- Added runtime plugin manifest loading for boards, components, generators, and validation rules.
- Added bill of materials generation with CSV and Markdown export.
- Added project documentation generation with Markdown, HTML, and PDF export.
- Added GitHub Actions CI, release automation scaffolding, and release note generation assets.

