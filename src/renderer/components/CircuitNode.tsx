import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { getHandleId } from "../lib/graph";
import { useCircuitStore } from "../store/useCircuitStore";
import type { CircuitComponent, CircuitConnection, PinCompatibilityResult } from "../../shared/types";

interface CircuitNodeData {
  component: CircuitComponent;
  connections: CircuitConnection[];
  isPending: (pinId: string) => boolean;
  isHighlighted: boolean;
  isWarningTarget: boolean;
  activeDragSource: { componentId: string; pinId: string } | null;
  canConnectPin: (componentId: string, pinId: string) => boolean;
  getCompatibility: (componentId: string, pinId: string) => PinCompatibilityResult | null;
}

function pinPosition(side: CircuitComponent["pins"][number]["side"]) {
  switch (side) {
    case "left":
      return Position.Left;
    case "right":
      return Position.Right;
    case "top":
      return Position.Top;
    case "bottom":
      return Position.Bottom;
  }
}

function renderVisual(component: CircuitComponent) {
  switch (component.type) {
    case "arduino-uno":
      return (
        <div className="board-uno">
          <div className="uno-usb" />
          <div className="uno-power-jack" />
          <div className="uno-chip">
            <span>ATmega</span>
          </div>
          <div className="uno-logo">UNO</div>
          <div className="uno-leds">
            <span>PWR</span>
            <span>TX</span>
            <span>RX</span>
          </div>
          <div className="uno-silkscreen uno-digital">DIGITAL</div>
          <div className="uno-silkscreen uno-analog">ANALOG IN</div>
          <div className="uno-silkscreen uno-power">POWER</div>
        </div>
      );
    case "arduino-nano":
      return (
        <div className="board-nano">
          <div className="nano-chip" />
          <div className="nano-usb" />
          <div className="nano-holes" />
        </div>
      );
    case "breadboard":
      return (
        <div className="breadboard-visual">
          <div className="breadboard-rail breadboard-rail-top">
            <span>+</span>
            <span>-</span>
          </div>
          <div className="breadboard-center-gap" />
          <div className="breadboard-rows">
            {Array.from({ length: 10 }, (_, index) => (
              <div key={index} className="breadboard-row">
                <span>{String.fromCharCode(65 + index)}</span>
              </div>
            ))}
          </div>
          <div className="breadboard-rail breadboard-rail-bottom">
            <span>+</span>
            <span>-</span>
          </div>
        </div>
      );
    case "led":
      return (
        <div className="led-visual">
          <div className="led-lens" />
          <div className="led-leg led-leg-short" />
          <div className="led-leg led-leg-long" />
        </div>
      );
    case "resistor":
      return (
        <div className="resistor-visual">
          <div className="resistor-wire resistor-wire-left" />
          <div className="resistor-body">
            <span className="band band-1" />
            <span className="band band-2" />
            <span className="band band-3" />
          </div>
          <div className="resistor-wire resistor-wire-right" />
        </div>
      );
    case "push-button":
      return (
        <div className="button-visual">
          <div className="button-cap" />
          <div className="button-base" />
        </div>
      );
    case "servo-motor":
      return (
        <div className="servo-visual">
          <div className="servo-horn" />
          <div className="servo-body" />
          <div className="servo-cable" />
        </div>
      );
    case "ultrasonic-sensor":
      return (
        <div className="sensor-visual">
          <div className="sensor-eye" />
          <div className="sensor-eye" />
          <div className="sensor-label">HC-SR04</div>
        </div>
      );
    case "potentiometer":
      return (
        <div className="pot-visual">
          <div className="pot-dial" />
          <div className="pot-slot" />
        </div>
      );
    case "buzzer":
      return (
        <div className="buzzer-visual">
          <div className="buzzer-top" />
          <div className="buzzer-wave wave-1" />
          <div className="buzzer-wave wave-2" />
        </div>
      );
    case "power-5v":
      return <div className="power-visual">5V</div>;
    case "ground":
      return <div className="ground-visual">GND</div>;
    case "jumper-wire":
      return (
        <div className="jumper-visual">
          <div className="jumper-line" />
        </div>
      );
    default:
      return null;
  }
}

function CircuitNode({ data, selected }: NodeProps<CircuitNodeData>) {
  const queuePin = useCircuitStore((state) => state.queuePin);
  const setConnectionHint = useCircuitStore((state) => state.setConnectionHint);
  const { component } = data;

  return (
    <div
      className={[
        "circuit-node",
        `visual-${component.type}`,
        selected ? "selected" : "",
        data.isHighlighted ? "node-highlighted" : "",
        data.isWarningTarget ? "warning-target" : "",
      ].join(" ")}
      style={{
        width: component.size.width,
        height: component.size.height,
        ["--accent" as string]: component.accent,
      }}
    >
      <div className="node-chrome" />
      <div className="node-header">
        <span className="node-badge">{component.category}</span>
        <strong>{component.name}</strong>
        <small>{component.type}</small>
      </div>
      <div className="node-visual">{renderVisual(component)}</div>
      {component.pins.map((pin) => {
        const pinConnections = data.connections.filter(
          (connection) =>
            (connection.fromComponentId === component.id && connection.fromPinId === pin.id) ||
            (connection.toComponentId === component.id && connection.toPinId === pin.id),
        );
        const isDragSource = data.activeDragSource?.componentId === component.id && data.activeDragSource.pinId === pin.id;
        const isDragTarget = data.canConnectPin(component.id, pin.id);
        const compatibility = data.getCompatibility(component.id, pin.id);
        const isInvalidTarget = !!data.activeDragSource && compatibility?.valid === false && !isDragSource;

        return (
          <div
            key={pin.id}
            className={[
              "pin",
              `pin-${pin.side}`,
              pinConnections.length > 0 ? "connected" : "",
              data.isPending(pin.id) ? "pending" : "",
              isDragSource ? "drag-source" : "",
              isDragTarget ? "drag-target" : "",
              isInvalidTarget ? "drag-invalid" : "",
            ].join(" ")}
            style={
              pin.side === "left" || pin.side === "right"
                ? { top: pin.offset }
                : { left: pin.offset }
            }
          >
            <Handle
              type={pin.direction === "input" ? "target" : "source"}
              position={pinPosition(pin.side)}
              id={getHandleId(pin.id)}
              className="pin-handle"
            />
            <button
              type="button"
              className="pin-hit"
              onClick={(event) => {
                event.stopPropagation();
                queuePin(component.id, pin.id);
              }}
              onMouseEnter={() => {
                if (data.activeDragSource && compatibility) {
                  setConnectionHint(compatibility);
                }
              }}
              title={`${pin.label} (${pin.kind}, ${pin.direction})`}
              aria-label={`${component.name} ${pin.label}`}
            >
              <span className="pin-dot" />
              <span className="pin-label">{pin.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default memo(CircuitNode);
