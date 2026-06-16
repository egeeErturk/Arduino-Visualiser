import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "reactflow";

export default function CircuitEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<{ color: string; label: string; active?: boolean }>) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: data?.color || "#f97316",
          strokeWidth: selected ? 5 : data?.active ? 4.5 : 3.5,
          filter: selected || data?.active ? "drop-shadow(0 0 12px rgba(249, 115, 22, 0.4))" : "none",
          opacity: selected || data?.active ? 1 : 0.9,
          transition: "stroke-width 160ms ease, opacity 160ms ease, filter 160ms ease",
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={`edge-label ${selected ? "visible" : ""}`}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          {data?.label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
