export type PinKind = "digital" | "analog" | "power" | "ground" | "signal" | "passive";

export type PinDirection = "input" | "output" | "bidirectional" | "passive" | "power" | "ground";

export type PinSide = "left" | "right" | "top" | "bottom";

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface PinDefinition {
  id: string;
  label: string;
  side: PinSide;
  offset: number;
  kind: PinKind;
  direction: PinDirection;
}

export interface ComponentDefinition {
  type: string;
  name: string;
  category: string;
  size: Size;
  accent: string;
  boardTargets?: string[];
  visualStyle:
    | "arduino-uno"
    | "arduino-nano"
    | "breadboard"
    | "led"
    | "resistor"
    | "button"
    | "potentiometer"
    | "buzzer"
    | "servo"
    | "sensor"
    | "wire"
    | "power"
    | "ground";
  pins: PinDefinition[];
}

export type CircuitPin = PinDefinition;

export interface CircuitComponent {
  id: string;
  type: string;
  name: string;
  category: string;
  position: Position;
  size: Size;
  accent: string;
  pins: CircuitPin[];
}

export interface CircuitConnection {
  id: string;
  fromComponentId: string;
  fromPinId: string;
  toComponentId: string;
  toPinId: string;
  color: string;
}

export interface CircuitProjectMetadata {
  name: string;
  description: string;
  author: string;
  boardType: string;
  createdAt: string;
  updatedAt: string;
}

export interface CircuitProject {
  schemaVersion: 1 | 2;
  metadata: CircuitProjectMetadata;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  components: CircuitComponent[];
  connections: CircuitConnection[];
}

export interface BoardPinCapability {
  pwm?: boolean;
  analog?: boolean;
  digital?: boolean;
  serial?: boolean;
}

export interface BoardDefinition {
  type: string;
  name: string;
  family: "arduino" | "esp" | "raspberry-pi" | "stm32";
  description: string;
  defaultFileExtension: "ino";
  codeLanguage: "arduino";
  fqbn: string;
  supportedComponentTypes: string[];
  pinCapabilities: Record<string, BoardPinCapability>;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  boardType: string;
  tags: string[];
  project: CircuitProject;
}

export interface RecentProjectEntry {
  name: string;
  filePath: string;
  lastOpenedAt: string;
  boardType: string;
}

export type EditorSelection =
  | { type: "component"; id: string }
  | { type: "connection"; id: string }
  | { type: "warning"; id: string }
  | null;

export interface ValidationWarning {
  id: string;
  severity: "info" | "warning" | "danger";
  title: string;
  description: string;
  componentIds: string[];
  connectionIds: string[];
  pinRefs: Array<{ componentId: string; pinId: string }>;
}

export interface CircuitAssistantFinding {
  id: string;
  severity: "info" | "warning" | "danger";
  title: string;
  description: string;
  category:
    | "missing-resistor"
    | "missing-ground"
    | "invalid-power"
    | "floating-input"
    | "missing-sensor-connection"
    | "duplicate-power-source";
  componentIds: string[];
  connectionIds: string[];
}

export interface PinCompatibilityResult {
  valid: boolean;
  level: "valid" | "warning" | "invalid";
  message: string;
}

export interface ArduinoCliConfig {
  cliPath: string | null;
  serialBaudRate: number;
}

export interface ArduinoCliStatus {
  found: boolean;
  cliPath: string | null;
  version: string | null;
  error: string | null;
}

export interface ArduinoDetectedPort {
  address: string;
  label: string;
  protocol: string | null;
  boardName: string | null;
  fqbn: string | null;
}

export interface ArduinoCommandResult {
  success: boolean;
  command: string;
  output: string;
  error: string | null;
  sketchPath?: string;
}

export interface BoardPlugin {
  kind: "board";
  id: string;
  board: BoardDefinition;
}

export interface ComponentPlugin {
  kind: "component";
  id: string;
  component: ComponentDefinition;
}

export interface GeneratorContext {
  project: CircuitProject;
  board: BoardDefinition | null;
}

export interface GeneratorSection {
  includes?: string[];
  definitions?: string[];
  setup?: string[];
  loop?: string[];
  notes?: string[];
}

export interface GeneratorPlugin {
  kind: "generator";
  id: string;
  supports(componentType: string): boolean;
  buildSection(context: GeneratorContext): GeneratorSection;
}

export interface ValidationPlugin {
  kind: "validation";
  id: string;
  validate(project: CircuitProject): ValidationWarning[];
}
