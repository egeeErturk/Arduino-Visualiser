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
  createdAt: string;
  updatedAt: string;
}

export interface CircuitProject {
  schemaVersion: 1;
  metadata: CircuitProjectMetadata;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  components: CircuitComponent[];
  connections: CircuitConnection[];
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
