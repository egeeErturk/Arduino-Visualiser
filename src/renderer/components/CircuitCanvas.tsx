import { useCallback, useEffect, useMemo, useState, type DragEventHandler } from "react";
import ReactFlow, {
  Background,
  Connection,
  ConnectionMode,
  Controls,
  ConnectionLineType,
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
import { assessPinCompatibility } from "../../shared/connectionRules";

const nodeTypes = { circuitNode: CircuitNode };
const edgeTypes = { circuitEdge: CircuitEdge };
const handlePrefix = "pin:";

interface SimulationOverlay {
  activeConnectionIds: string[];
  activePins: string[];
  componentStates: Record<string, string | number | boolean>;
}

function parsePinId(handleId: string | null | undefined) {
  if (!handleId?.startsWith(handlePrefix)) {
    return null;
  }
  return handleId.slice(handlePrefix.length);
}

function CanvasInner({ simulationOverlay }: { simulationOverlay?: SimulationOverlay }) {
  const reactFlow = useReactFlow();
  const project = useCircuitStore((state) => state.project);
  const selection = useCircuitStore((state) => state.selection);
  const warnings = useCircuitStore((state) => state.warnings);
  const pendingPin = useCircuitStore((state) => state.pendingPin);
  const highlightedWarningId = useCircuitStore((state) => state.highlightedWarningId);
  const setSelection = useCircuitStore((state) => state.setSelection);
  const queuePin = useCircuitStore((state) => state.queuePin);
  const setConnectionHint = useCircuitStore((state) => state.setConnectionHint);
  const updatePosition = useCircuitStore((state) => state.updateComponentPosition);
  const beginMoveSnapshot = useCircuitStore((state) => state.beginMoveSnapshot);
  const finalizeMoveSnapshot = useCircuitStore((state) => state.finalizeMoveSnapshot);
  const setViewport = useCircuitStore((state) => state.setViewport);
  const [activeDragSource, setActiveDragSource] = useState<{ componentId: string; pinId: string } | null>(null);

  const highlightedWarning = warnings.find((warning) => warning.id === highlightedWarningId);

  const getCompatibility = useCallback((componentId: string, pinId: string) => {
    if (!activeDragSource) {
      return null;
    }

    if (activeDragSource.componentId === componentId && activeDragSource.pinId === pinId) {
      return {
        valid: false,
        level: "invalid",
        message: "Choose a different component pin.",
      } as const;
    }

    const sourceComponent = project.components.find((component) => component.id === activeDragSource.componentId);
    const sourcePin = sourceComponent?.pins.find((pin) => pin.id === activeDragSource.pinId);
    const targetComponent = project.components.find((component) => component.id === componentId);
    const targetPin = targetComponent?.pins.find((pin) => pin.id === pinId);

    if (!sourceComponent || !sourcePin || !targetComponent || !targetPin) {
      return null;
    }

    return assessPinCompatibility(sourceComponent, sourcePin, targetComponent, targetPin, project.connections);
  }, [activeDragSource, project.components, project.connections]);

  const canConnectPin = useCallback((componentId: string, pinId: string) => {
    const result = getCompatibility(componentId, pinId);
    return result?.valid ?? false;
  }, [getCompatibility]);

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
        activeDragSource,
        canConnectPin,
        getCompatibility,
        simulationOverlay,
      },
    }));
  }, [activeDragSource, canConnectPin, getCompatibility, highlightedWarning?.componentIds, pendingPin, project.components, project.connections, selection, simulationOverlay]);

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
        animated: selection?.type === "connection" && selection.id === connection.id,
        data: {
          color: connection.color,
          label: sourceComponent && sourcePin && targetComponent && targetPin
            ? `${sourceComponent.name} ${sourcePin.label} -> ${targetComponent.name} ${targetPin.label}`
            : "Wire",
          active: simulationOverlay?.activeConnectionIds.includes(connection.id) ?? false,
        },
      };
    });
  }, [project.components, project.connections, selection, simulationOverlay?.activeConnectionIds]);

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

  const onConnect = (connection: Connection) => {
    const sourcePinId = parsePinId(connection.sourceHandle);
    const targetPinId = parsePinId(connection.targetHandle);

    if (!connection.source || !connection.target || !sourcePinId || !targetPinId) {
      return;
    }

    const compatibility = getCompatibility(connection.target, targetPinId);
    if (!compatibility?.valid) {
      setConnectionHint(compatibility ?? {
        valid: false,
        level: "invalid",
        message: "This connection is not allowed.",
      });
      setActiveDragSource(null);
      return;
    }

    queuePin(connection.source, sourcePinId);
    queuePin(connection.target, targetPinId);
    setConnectionHint(compatibility);
    setActiveDragSource(null);
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
      connectionLineType={ConnectionLineType.Bezier}
      connectionMode={ConnectionMode.Loose}
      connectionRadius={28}
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
      onConnect={onConnect}
      onConnectStart={(_, params) => {
        const pinId = parsePinId(params.handleId);
        if (!params.nodeId || !pinId) {
          setActiveDragSource(null);
          setConnectionHint(null);
          return;
        }
        setActiveDragSource({ componentId: params.nodeId, pinId });
        setConnectionHint({
          valid: true,
          level: "valid",
          message: "Drag to another compatible pin to create a connection.",
        });
      }}
      onConnectEnd={() => {
        setActiveDragSource(null);
      }}
      onNodeClick={(_, node) => setSelection({ type: "component", id: node.id })}
      onEdgeClick={(_, edge) => setSelection({ type: "connection", id: edge.id })}
      onNodesChange={onNodesChange}
      nodesDraggable
      deleteKeyCode={null}
      selectionKeyCode={null}
      defaultEdgeOptions={{ type: "circuitEdge" }}
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

export default function CircuitCanvas({ simulationOverlay }: { simulationOverlay?: SimulationOverlay }) {
  return (
    <ReactFlowProvider>
      <CanvasInner simulationOverlay={simulationOverlay} />
    </ReactFlowProvider>
  );
}
