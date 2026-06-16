# Plugin Development Guide

## Runtime Model

The desktop app currently supports manifest-based runtime plugins.

Plugin discovery locations:

- workspace `plugins/`
- Electron user-data `plugins/`

Each plugin is loaded from a `plugin.json` manifest. Invalid manifests are reported in the Plugin Manager and do not crash the app.

## Supported Plugin Types

- board plugins
- component plugins
- generator plugins
- validation plugins

## Manifest Shape

Example:

```json
{
  "id": "plugin.example-pack",
  "name": "Example Pack",
  "version": "1.0.0",
  "description": "Adds a sample sensor.",
  "components": [
    {
      "type": "example-sensor",
      "name": "Example Sensor",
      "category": "Sensors",
      "size": { "width": 160, "height": 120 },
      "accent": "#16a34a",
      "visualStyle": "sensor",
      "pins": [
        { "id": "vcc", "label": "VCC", "side": "bottom", "offset": 24, "kind": "power", "direction": "power" },
        { "id": "sig", "label": "SIG", "side": "bottom", "offset": 80, "kind": "signal", "direction": "output" },
        { "id": "gnd", "label": "GND", "side": "bottom", "offset": 136, "kind": "ground", "direction": "ground" }
      ]
    }
  ]
}
```

## Generator Plugins

Runtime generator plugins are declarative today. They can contribute:

- `includes`
- `definitions`
- `setup`
- `loop`
- `notes`

This keeps runtime plugins safe and packaging-friendly.

## Validation Plugins

Runtime validation plugins currently support declarative rules:

- `require-pin-connection`
- `max-component-count`

## Best Practices

- Use stable, unique plugin IDs.
- Keep new component types visually compatible with the built-in visual styles.
- Prefer additive validation guidance over overly strict blocking behavior.
- Test plugin manifests locally through the Plugin Manager reload action.

## Testing Plugin Changes

Run:

```bash
npm run test
npm run build
```

Then reload plugins from the desktop Settings or Plugins panel.
