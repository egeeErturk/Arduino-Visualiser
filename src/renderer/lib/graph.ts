import type { CircuitComponent, CircuitConnection, CircuitPin } from "../../shared/types";

export function getHandleId(pinId: string) {
  return `pin:${pinId}`;
}

export function getPinPoint(component: CircuitComponent, pin: CircuitPin) {
  const point = { x: component.position.x, y: component.position.y };
  switch (pin.side) {
    case "left":
      point.y += pin.offset;
      break;
    case "right":
      point.x += component.size.width;
      point.y += pin.offset;
      break;
    case "top":
      point.x += pin.offset;
      break;
    case "bottom":
      point.x += pin.offset;
      point.y += component.size.height;
      break;
  }
  return point;
}

export function findPinConnection(
  connections: CircuitConnection[],
  componentId: string,
  pinId: string,
) {
  return connections.filter(
    (connection) =>
      (connection.fromComponentId === componentId && connection.fromPinId === pinId) ||
      (connection.toComponentId === componentId && connection.toPinId === pinId),
  );
}
