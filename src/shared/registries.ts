import { boardCatalog } from "./boards.js";
import { componentCatalog } from "./catalog.js";
import { getGeneratorPlugins, getRuntimePluginState } from "./plugins.js";
import { projectTemplates } from "./templates.js";
import type {
  BoardDefinition,
  BottomPanelTabDefinition,
  ComponentDefinition,
  ExporterDefinition,
  FeatureModuleDefinition,
  PluginRuntimeState,
  ProjectSchemaExtension,
  ProjectTemplate,
  SettingsSectionDefinition,
  SimulationComponentDefinition,
  ToolbarActionDefinition,
  UiPanelDefinition,
} from "./types.js";

const builtinSchemaExtensions: ProjectSchemaExtension[] = [
  {
    key: "extensions",
    description: "Namespaced feature-module project data bag for future extensions.",
    defaultValue: {},
  },
];

const builtinToolbarActions: ToolbarActionDefinition[] = [
  { id: "project:new", label: "New", description: "Create a blank project.", location: "topbar", order: 10 },
  { id: "project:open", label: "Open", description: "Open a saved project.", location: "topbar", order: 20 },
  { id: "project:save", label: "Save", description: "Save the current project.", location: "topbar", order: 30 },
  { id: "project:save-as", label: "Save As", description: "Save the current project to a new location.", location: "topbar", order: 40 },
  { id: "project:generate-code", label: "Generate Code", description: "Generate a starter Arduino sketch.", location: "topbar", order: 50 },
  { id: "project:monitor", label: "System Monitor", description: "Open project monitoring metrics.", location: "topbar", order: 60 },
];

const builtinBottomTabs: BottomPanelTabDefinition[] = [
  { id: "warnings", label: "Warnings", description: "Validation warnings and health hints.", order: 10 },
  { id: "assistant", label: "Analyze Circuit", description: "Circuit assistant findings.", order: 20 },
  { id: "activity", label: "Activity", description: "Recent app actions and events.", order: 30 },
  { id: "code", label: "Generated Code", description: "Starter sketch preview.", order: 40 },
  { id: "monitor", label: "System Monitor", description: "Live project and runtime metrics.", order: 45 },
  { id: "bom", label: "BOM", description: "Bill of materials summary.", order: 50 },
  { id: "docs", label: "Docs", description: "Project documentation outputs.", order: 60 },
  { id: "plugins", label: "Plugins", description: "Runtime plugin visibility.", order: 70 },
  { id: "arduino", label: "Arduino CLI", description: "Compile, upload, and serial workflows.", order: 80 },
];

const builtinSettingsSections: SettingsSectionDefinition[] = [
  { id: "appearance", label: "Appearance", description: "Theme and desktop UI preferences.", order: 10 },
  { id: "board", label: "Board", description: "Default board preferences.", order: 20 },
  { id: "arduino-cli", label: "Arduino CLI", description: "CLI path and serial settings.", order: 30 },
  { id: "plugins", label: "Plugins", description: "Plugin runtime and directory state.", order: 40 },
];

const builtinUiPanels: UiPanelDefinition[] = [
  { id: "dashboard", label: "Project Dashboard", location: "dashboard", description: "Project startup, recents, library, and templates." },
  { id: "inspector", label: "Inspector", location: "right", description: "Project, component, and connection detail panels." },
  { id: "monitor", label: "System Monitor", location: "bottom", description: "Task-manager style runtime and project health monitoring." },
];

const builtinSimulationComponents: SimulationComponentDefinition[] = [
  { type: "led", displayName: "LED", supportedInputs: ["digital", "analog"], supportedOutputs: ["on", "off"] },
  { type: "push-button", displayName: "Push Button", supportedInputs: ["toggle"], supportedOutputs: ["digitalRead"] },
  { type: "potentiometer", displayName: "Potentiometer", supportedInputs: ["0-1023 slider"], supportedOutputs: ["analogRead"] },
  { type: "buzzer", displayName: "Buzzer", supportedInputs: ["digital", "analog"], supportedOutputs: ["active", "inactive"] },
  { type: "servo-motor", displayName: "Servo Motor", supportedInputs: ["angle"], supportedOutputs: ["0-180 degrees"] },
  { type: "ultrasonic-sensor", displayName: "Ultrasonic Sensor", supportedInputs: ["distance"], supportedOutputs: ["pulseIn"] },
];

const builtinExporters: ExporterDefinition[] = [
  { id: "project:export-json", label: "Compatibility JSON", format: "json", description: "Export project JSON for compatibility." },
  { id: "project:export-sketch", label: "Arduino Sketch", format: "ino", description: "Export generated or edited Arduino code." },
  { id: "project:export-bom-csv", label: "BOM CSV", format: "csv", description: "Export bill of materials as CSV." },
  { id: "project:export-bom-md", label: "BOM Markdown", format: "md", description: "Export bill of materials as Markdown." },
  { id: "project:export-docs-md", label: "Documentation Markdown", format: "md", description: "Export project documentation as Markdown." },
  { id: "project:export-docs-html", label: "Documentation HTML", format: "html", description: "Export project documentation as HTML." },
  { id: "project:export-docs-pdf", label: "Documentation PDF", format: "pdf", description: "Export project documentation as PDF." },
];

const builtinFeatureModules: FeatureModuleDefinition[] = [
  {
    id: "core-project",
    name: "Core Project Workflow",
    description: "Project lifecycle, dashboard, save/load, and core editing shell.",
    toolbarActions: builtinToolbarActions.filter((item) => item.id.startsWith("project:") && item.id !== "project:generate-code" && item.id !== "project:monitor"),
    bottomPanelTabs: builtinBottomTabs.filter((item) => ["warnings", "activity"].includes(item.id)),
    settingsSections: builtinSettingsSections.filter((item) => ["appearance", "board"].includes(item.id)),
    uiPanels: builtinUiPanels.filter((item) => ["dashboard", "inspector"].includes(item.id)),
    schemaExtensions: builtinSchemaExtensions,
  },
  {
    id: "arduino-workflow",
    name: "Arduino Workflow",
    description: "Code generation, code editing, simulation, and CLI integration.",
    toolbarActions: builtinToolbarActions.filter((item) => item.id === "project:generate-code"),
    bottomPanelTabs: builtinBottomTabs.filter((item) => ["code", "arduino"].includes(item.id)),
    settingsSections: builtinSettingsSections.filter((item) => item.id === "arduino-cli"),
    simulationComponents: builtinSimulationComponents,
  },
  {
    id: "analysis-and-export",
    name: "Analysis And Export",
    description: "Circuit analysis, BOM, docs, plugins, and monitor outputs.",
    toolbarActions: builtinToolbarActions.filter((item) => item.id === "project:monitor"),
    bottomPanelTabs: builtinBottomTabs.filter((item) => ["assistant", "monitor", "bom", "docs", "plugins"].includes(item.id)),
    settingsSections: builtinSettingsSections.filter((item) => item.id === "plugins"),
    uiPanels: builtinUiPanels.filter((item) => item.id === "monitor"),
    exporterIds: builtinExporters.map((item) => item.id),
  },
];

function sortByOrder<T extends { order?: number }>(items: T[]) {
  return [...items].sort((left, right) => (left.order ?? 999) - (right.order ?? 999));
}

export function getFeatureModules(): FeatureModuleDefinition[] {
  return builtinFeatureModules;
}

export function getBoardRegistry(): BoardDefinition[] {
  return boardCatalog;
}

export function getComponentRegistry(): ComponentDefinition[] {
  return componentCatalog;
}

export function getTemplateRegistry(): ProjectTemplate[] {
  return projectTemplates;
}

export function getPluginRegistry(): PluginRuntimeState {
  return getRuntimePluginState();
}

export function getCodeGeneratorRegistry() {
  return getGeneratorPlugins();
}

export function getValidationRuleRegistry() {
  return [
    "led-without-resistor",
    "direct-power-to-ground",
    "missing-ground",
    "floating-input",
    "output-fanout",
    "invalid-power-connection",
    ...getRuntimePluginState().loaded.flatMap((record) => (record.manifest.validations ?? []).map((validation) => validation.id)),
  ];
}

export function getSimulationRegistry() {
  return builtinSimulationComponents;
}

export function getExporterRegistry() {
  return builtinExporters;
}

export function getToolbarActionRegistry() {
  return sortByOrder(getFeatureModules().flatMap((module) => module.toolbarActions ?? []));
}

export function getBottomPanelTabRegistry() {
  return sortByOrder(getFeatureModules().flatMap((module) => module.bottomPanelTabs ?? []));
}

export function getSettingsSectionRegistry() {
  return sortByOrder(getFeatureModules().flatMap((module) => module.settingsSections ?? []));
}

export function getUiPanelRegistry() {
  return getFeatureModules().flatMap((module) => module.uiPanels ?? []);
}

export function getProjectSchemaExtensionRegistry() {
  return getFeatureModules().flatMap((module) => module.schemaExtensions ?? []);
}
