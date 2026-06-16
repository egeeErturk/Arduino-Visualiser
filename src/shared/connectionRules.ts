import type { CircuitComponent, CircuitConnection, CircuitPin, PinCompatibilityResult } from "./types.js";

function isPassive(pin: CircuitPin) {
  return pin.kind === "passive" || pin.direction === "passive";
}

function isPower(pin: CircuitPin) {
  return pin.kind === "power" || pin.direction === "power";
}

function isGround(pin: CircuitPin) {
  return pin.kind === "ground" || pin.direction === "ground";
}

function isSignal(pin: CircuitPin) {
  return ["digital", "analog", "signal"].includes(pin.kind);
}

export function assessPinCompatibility(
  sourceComponent: CircuitComponent,
  sourcePin: CircuitPin,
  targetComponent: CircuitComponent,
  targetPin: CircuitPin,
  connections: CircuitConnection[],
): PinCompatibilityResult {
  if (sourceComponent.id === targetComponent.id) {
    return {
      valid: false,
      level: "invalid",
      message: "Pins on the same component should not be directly wired together here.",
    };
  }

  const duplicateConnection = connections.some((connection) =>
    (connection.fromComponentId === sourceComponent.id &&
      connection.fromPinId === sourcePin.id &&
      connection.toComponentId === targetComponent.id &&
      connection.toPinId === targetPin.id) ||
    (connection.toComponentId === sourceComponent.id &&
      connection.toPinId === sourcePin.id &&
      connection.fromComponentId === targetComponent.id &&
      connection.fromPinId === targetPin.id),
  );

  if (duplicateConnection) {
    return {
      valid: false,
      level: "invalid",
      message: "These pins are already connected.",
    };
  }

  if (isPassive(sourcePin) || isPassive(targetPin)) {
    return {
      valid: true,
      level: "valid",
      message: "Passive connection path looks acceptable.",
    };
  }

  if ((isPower(sourcePin) && isGround(targetPin)) || (isGround(sourcePin) && isPower(targetPin))) {
    return {
      valid: false,
      level: "invalid",
      message: "This would directly connect power to ground.",
    };
  }

  if (isPower(sourcePin) && isPower(targetPin)) {
    return {
      valid: true,
      level: "warning",
      message: "You are tying two power pins together. Confirm they are intended to share the same rail.",
    };
  }

  if (isGround(sourcePin) && isGround(targetPin)) {
    return {
      valid: true,
      level: "warning",
      message: "This connection joins two ground pins together.",
    };
  }

  if ((isPower(sourcePin) && isSignal(targetPin)) || (isPower(targetPin) && isSignal(sourcePin))) {
    return {
      valid: false,
      level: "invalid",
      message: "A power pin should not be directly connected to a signal pin.",
    };
  }

  if (sourcePin.direction === "output" && targetPin.direction === "output") {
    return {
      valid: false,
      level: "invalid",
      message: "Two output pins should not drive each other directly.",
    };
  }

  if (sourcePin.direction === "input" && targetPin.direction === "input") {
    return {
      valid: true,
      level: "warning",
      message: "Input-to-input wiring is unusual and may not provide a meaningful signal source.",
    };
  }

  if (sourcePin.kind === "analog" && targetPin.kind === "digital") {
    return {
      valid: true,
      level: "warning",
      message: "Analog-to-digital wiring may work physically, but verify the intended board behavior.",
    };
  }

  if (sourcePin.kind === "digital" && targetPin.kind === "analog") {
    return {
      valid: true,
      level: "warning",
      message: "Digital-to-analog wiring may be valid depending on the board pin mode.",
    };
  }

  return {
    valid: true,
    level: "valid",
    message: "This connection looks compatible.",
  };
}
