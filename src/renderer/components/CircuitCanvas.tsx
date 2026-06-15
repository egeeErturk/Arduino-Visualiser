import { useEffect, useMemo, type DragEventHandler } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  Panel,
  ReactFlowProvider,
  type NodePositionChange,
  type Edge,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
  useReactFlow,
} from "reactflow";
import { Maximize, Minus, Plus } from "lucide-react";
import CircuitNode from "./CircuitNode";
import CircuitEdge from "./CircuitEdge";
import { getHandleId } from "../lib/graph";
import { useCircuitStore } from "../store/useCircuitStore";

function CanvasInner() {
  const reactFlow = useReactFlow();
  const nodeTypes = useMemo(() => ({ circuitNode: CircuitNode }), []);
  const edgeTypes = useMemo(() => ({ circuitEdge: CircuitEdge }), []);
  const project = useCircuitStore((state) => state.project);
  const selection = useCircuitStore((state) => state.selection);
  const warnings = useCircuitStore((state) => state.warnings);
  const pendingPin = useCircuitStore((state) => state.pendingPin);
  const highlightedWarningId = useCircuitStore((state) => state.highlightedWarningId);
  const setSelection = useCircuitStore((state) => state.setSelection);
  const updatePosition = useCircuitStore((state) => state.updateComponentPosition);
  const beginMoveSnapshot = useCircuitStore((state) => state.beginMoveSnapshot);
  const finalizeMoveSnapshot = useCircuitStore((state) => state.finalizeMoveSnapshot);
  const setViewport = useCircuitStore((state) => state.setViewport);

  const highlightedWarning = warnings.find((warning) => warning.id === highlightedWarningId);

  useEffect(() => {
    reactFlow.setViewport(project.viewport);
  }, [project.viewport, reactFlow]);

  const nodes = useMemo<Node[]>(() => {
    return project.components.map((component) => ({
      id: component.id,
      type: "circuitNode",
      position: component.position,
      draggable: true,
      selected: selection?.type === "component" && selection.id === component.id,
      data: {
        component,
        connections: project.connections,
        isPending: (pinId: string) => pendingPin?.componentId === component.id && pendingPin.pinId === pinId,
        isHighlighted: selection?.type === "component" && selection.id === component.id,
        isWarningTarget: highlightedWarning?.componentIds.includes(component.id) ?? false,
      },
    }));
  }, [highlightedWarning?.componentIds, pendingPin, project.components, project.connections, selection]);

  const edges = useMemo<Edge[]>(() => {
    return project.connections.map((connection) => {
      const sourceComponent = project.components.find((component) => component.id === connection.fromComponentId);
      const sourcePin = sourceComponent?.pins.find((pin) => pin.id === connection.fromPinId);
      const targetComponent = project.components.find((component) => component.id === connection.toComponentId);
      const targetPin = targetComponent?.pins.find((pin) => pin.id === connection.toPinId);
      return {
        id: connection.id,
        type: "circuitEdge",
        source: connection.fromComponentId,
        sourceHandle: getHandleId(connection.fromPinId),
        target: connection.toComponentId,
        targetHandle: getHandleId(connection.toPinId),
        selected: selection?.type === "connection" && selection.id === connection.id,
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: connection.color },
        data: {
          color: connection.color,
          label: sourceComponent && sourcePin && targetComponent && targetPin
            ? `${sourceComponent.name} ${sourcePin.label} -> ${targetComponent.name} ${targetPin.label}`
            : "Wire",
        },
      };
    });
  }, [project.components, project.connections, selection]);

  const onNodesChange = (changes: NodeChange[]) => {
    const moved = changes.find(
      (change): change is NodePositionChange => change.type === "position" && !!change.position,
    );
    if (moved && moved.position) {
      updatePosition(moved.id, moved.position);
    }
  };

  const handleDrop: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/x-component-type");
    if (!type) {
      return;
    }
    const position = reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    useCircuitStore.getState().addComponent(type, position);
  };

  const onInit = (instance: ReactFlowInstance) => {
    instance.setViewport(project.viewport);
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultViewport={project.viewport}
      fitView={false}
      minZoom={0.45}
      maxZoom={1.8}
      onInit={onInit}
      onPaneClick={() => setSelection(null)}
      onMove={(_, viewport) => setViewport(viewport)}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={handleDrop}
      onNodeDragStart={() => beginMoveSnapshot()}
      onNodeDragStop={(_, node) => {
        updatePosition(node.id, node.position);
        finalizeMoveSnapshot();
      }}
      onNodeClick={(_, node) => setSelection({ type: "component", id: node.id })}
      onEdgeClick={(_, edge) => setSelection({ type: "connection", id: edge.id })}
      onNodesChange={onNodesChange}
      nodesDraggable
      deleteKeyCode={null}
      selectionKeyCode={null}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={24} color="rgba(148, 163, 184, 0.22)" />
      <Controls showInteractive={false} />
      <Panel position="top-right" className="zoom-panel">
        <button type="button" onClick={() => reactFlow.zoomIn()} title="Zoom in" aria-label="Zoom in">
          <Plus size={16} />
        </button>
        <button type="button" onClick={() => reactFlow.zoomOut()} title="Zoom out" aria-label="Zoom out">
          <Minus size={16} />
        </button>
        <button type="button" onClick={() => reactFlow.fitView({ padding: 0.2 })} title="Fit view" aria-label="Fit view">
          <Maximize size={16} />
        </button>
      </Panel>
    </ReactFlow>
  );
}

export default function CircuitCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
