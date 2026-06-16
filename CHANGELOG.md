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
