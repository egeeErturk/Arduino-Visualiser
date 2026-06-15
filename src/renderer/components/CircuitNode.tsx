import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { getHandleId } from "../lib/graph";
import { useCircuitStore } from "../store/useCircuitStore";
import type { CircuitComponent, CircuitConnection } from "../../shared/types";

interface CircuitNodeData {
  component: CircuitComponent;
  connections: CircuitConnection[];
  isPending: (pinId: string) => boolean;
  isHighlighted: boolean;
  isWarningTarget: boolean;
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

function CircuitNode({ data, selected }: NodeProps<CircuitNodeData>) {
  const queuePin = useCircuitStore((state) => state.queuePin);
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
      <div className="node-header">
        <span className="node-badge">{component.category}</span>
        <strong>{component.name}</strong>
        <small>{component.type}</small>
      </div>
      <div className="node-visual">
        {component.type === "breadboard" && <div className="breadboard-grid" />}
        {(component.type === "arduino-uno" || component.type === "arduino-nano") && (
          <div className="board-glyph">
            <span>MCU</span>
            <span>I/O</span>
          </div>
        )}
        {component.type === "ultrasonic-sensor" && (
          <div className="sensor-eyes">
            <span />
            <span />
          </div>
        )}
        {component.type === "led" && <div className="led-glow" />}
        {component.type === "servo-motor" && <div className="servo-arm" />}
      </div>
      {component.pins.map((pin) => {
        const pinConnections = data.connections.filter(
          (connection) =>
            (connection.fromComponentId === component.id && connection.fromPinId === pin.id) ||
            (connection.toComponentId === component.id && connection.toPinId === pin.id),
        );
        return (
          <div
            key={pin.id}
            className={`pin pin-${pin.side} ${pinConnections.length > 0 ? "connected" : ""} ${data.isPending(pin.id) ? "pending" : ""}`}
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
