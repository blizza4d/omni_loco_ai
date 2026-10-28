'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  ProtocolNode,
  ProtocolConnection,
  PortDefinition,
  PortDataType,
} from '../types';
import { ProtocolValidator } from '../protocol-validator';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

interface ProtocolForgeCanvasProps {
  nodes: ProtocolNode[];
  connections: ProtocolConnection[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onUpdateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  onAddConnection: (conn: ProtocolConnection) => void;
  onRemoveConnection: (connId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  readOnly?: boolean;
}

export function ProtocolForgeCanvas({
  nodes,
  connections,
  selectedNodeId,
  onSelectNode,
  onUpdateNodePosition,
  onAddConnection,
  onRemoveConnection,
  onDeleteNode,
  readOnly = false,
}: ProtocolForgeCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Dragging node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Connecting ports state
  const [activeConnectionSource, setActiveConnectionSource] = useState<{
    nodeId: string;
    portId: string;
    portType: PortDataType;
    isOutput: boolean;
  } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const getPortColor = (type: PortDataType): string => {
    switch (type) {
      case 'event':
        return '#00E599'; // sage green
      case 'number':
        return '#F59E0B'; // amber
      case 'string':
        return '#06B6D4'; // cyan
      case 'boolean':
        return '#A855F7'; // purple
      case 'any':
      default:
        return '#E2E8F0'; // cream
    }
  };

  // Node Dragging Handlers
  const handleNodeMouseDown = (e: React.MouseEvent, node: ProtocolNode) => {
    if (readOnly) return;
    if ((e.target as HTMLElement).closest('.port-handle')) return;

    e.stopPropagation();
    onSelectNode(node.id);
    setDraggingNodeId(node.id);

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const currentMouseX = e.clientX - containerRect.left;
      const currentMouseY = e.clientY - containerRect.top;
      setMousePos({ x: currentMouseX, y: currentMouseY });

      if (draggingNodeId && !readOnly) {
        const snappedX = Math.max(20, Math.round((currentMouseX - dragOffsetRef.current.x) / 10) * 10);
        const snappedY = Math.max(20, Math.round((currentMouseY - dragOffsetRef.current.y) / 10) * 10);
        onUpdateNodePosition(draggingNodeId, { x: snappedX, y: snappedY });
      }
    },
    [draggingNodeId, onUpdateNodePosition, readOnly]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingNodeId(null);
  }, []);

  // Port Connection Handlers
  const handlePortMouseDown = (
    e: React.MouseEvent,
    nodeId: string,
    portId: string,
    portType: PortDataType,
    isOutput: boolean
  ) => {
    if (readOnly) return;
    e.stopPropagation();

    if (!activeConnectionSource) {
      // Start connecting
      setActiveConnectionSource({ nodeId, portId, portType, isOutput });
    } else {
      // Target clicked: evaluate compatibility
      const src = activeConnectionSource;
      if (src.nodeId === nodeId) {
        setActiveConnectionSource(null);
        return;
      }

      const fromNode = src.isOutput ? src.nodeId : nodeId;
      const fromPort = src.isOutput ? src.portId : portId;
      const toNode = src.isOutput ? nodeId : src.nodeId;
      const toPort = src.isOutput ? portId : src.portId;

      const outType = src.isOutput ? src.portType : portType;
      const inType = src.isOutput ? portType : src.portType;

      if (src.isOutput !== isOutput && ProtocolValidator.arePortsCompatible(outType, inType)) {
        onAddConnection({
          id: `conn-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          fromNode,
          fromPort,
          toNode,
          toPort,
        });
      }
      setActiveConnectionSource(null);
    }
  };

  const getPortCoords = (node: ProtocolNode, portId: string, isOutput: boolean) => {
    const nodeWidth = 220;
    const headerHeight = 36;
    const portRowHeight = 22;

    const portList = isOutput ? node.outputs : node.inputs;
    const portIdx = portList.findIndex((p) => p.id === portId);
    const yOffset = headerHeight + 14 + (portIdx >= 0 ? portIdx : 0) * portRowHeight;

    return {
      x: node.position.x + (isOutput ? nodeWidth : 0),
      y: node.position.y + yOffset,
    };
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={() => {
        onSelectNode(null);
        setActiveConnectionSource(null);
      }}
      className="relative w-full h-[640px] bg-paper-cream border-2 border-charcoal-soft rounded-tactile overflow-hidden select-none cursor-default shadow-tactile"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
      }}
    >
      {/* SVG Layer for Bezier Connection Cables */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
        <defs>
          <linearGradient id="cable-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00E599" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>

        {/* Existing Connections */}
        {connections.map((conn) => {
          const fromNode = nodes.find((n) => n.id === conn.fromNode);
          const toNode = nodes.find((n) => n.id === conn.toNode);
          if (!fromNode || !toNode) return null;

          const p1 = getPortCoords(fromNode, conn.fromPort, true);
          const p2 = getPortCoords(toNode, conn.toPort, false);

          const dx = Math.abs(p2.x - p1.x) * 0.5;
          const pathD = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;

          const isNodeActive = fromNode.lastExecution?.status === 'success';

          return (
            <g key={conn.id} className="pointer-events-auto cursor-pointer group">
              {/* Invisible wider stroke for easy click */}
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth={14}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!readOnly) onRemoveConnection(conn.id);
                }}
              />
              {/* Outer cable outline */}
              <path
                d={pathD}
                fill="none"
                stroke={isNodeActive ? '#00E599' : '#3A3A3A'}
                strokeWidth={isNodeActive ? 2.5 : 2}
                strokeDasharray={isNodeActive ? '6 3' : 'none'}
                className="transition-colors group-hover:stroke-brick-red"
              />
              {/* Directional flow point */}
              <circle
                cx={(p1.x + p2.x) / 2}
                cy={(p1.y + p2.y) / 2}
                r={3}
                fill="#3A3A3A"
                className="group-hover:fill-brick-red"
              />
            </g>
          );
        })}

        {/* Active connection currently being drawn by user */}
        {activeConnectionSource && (
          (() => {
            const srcNode = nodes.find((n) => n.id === activeConnectionSource.nodeId);
            if (!srcNode) return null;
            const p1 = getPortCoords(
              srcNode,
              activeConnectionSource.portId,
              activeConnectionSource.isOutput
            );
            const p2 = mousePos;
            const dx = Math.abs(p2.x - p1.x) * 0.5;
            const pathD = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;

            return (
              <path
                d={pathD}
                fill="none"
                stroke="#06B6D4"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            );
          })()
        )}
      </svg>

      {/* Interactive Visual Nodes Layer */}
      {nodes.map((node) => {
        const isSelected = selectedNodeId === node.id;
        const isExecuting = node.lastExecution && performance.now() - node.lastExecution.timestamp < 350;

        let badgeBg = 'bg-paper-dark';
        let badgeBorder = 'border-charcoal-soft';
        if (node.category === 'INPUT') {
          badgeBg = 'bg-sage-green/10';
          badgeBorder = 'border-sage-green';
        } else if (node.category === 'OUTPUT') {
          badgeBg = 'bg-brick-red/10';
          badgeBorder = 'border-brick-red';
        } else {
          badgeBg = 'bg-cyan-500/10';
          badgeBorder = 'border-cyan-500';
        }

        return (
          <div
            key={node.id}
            onMouseDown={(e) => handleNodeMouseDown(e, node)}
            style={{
              transform: `translate(${node.position.x}px, ${node.position.y}px)`,
              width: '220px',
            }}
            className={`absolute top-0 left-0 bg-paper-dark border-2 rounded-tactile font-mono select-none z-20 transition-shadow duration-100 ${
              isSelected
                ? 'border-brick-red shadow-tactile-brick'
                : isExecuting
                ? 'border-sage-green shadow-tactile-sage'
                : 'border-charcoal-soft shadow-tactile'
            }`}
          >
            {/* Header */}
            <div
              className={`px-2.5 py-1.5 border-b border-charcoal-soft/30 flex items-center justify-between text-xs font-bold uppercase tracking-technical ${badgeBg}`}
            >
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span
                  className={`w-2 h-2 rounded-full ${
                    node.category === 'INPUT'
                      ? 'bg-sage-green'
                      : node.category === 'OUTPUT'
                      ? 'bg-brick-red'
                      : 'bg-cyan-400'
                  }`}
                />
                <span className="truncate text-[11px] text-charcoal-soft">{node.label}</span>
              </div>

              {!readOnly && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNode(node.id);
                  }}
                  className="p-0.5 text-ink-muted hover:text-brick-red transition-colors"
                  title="Delete node"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Ports Area */}
            <div className="p-2 space-y-1.5 text-[10px]">
              {/* Inputs */}
              {node.inputs.map((inPort) => (
                <div key={inPort.id} className="flex items-center gap-1.5">
                  <div
                    onClick={(e) =>
                      handlePortMouseDown(e, node.id, inPort.id, inPort.type, false)
                    }
                    className="port-handle w-3 h-3 rounded-full border border-charcoal-soft cursor-pointer hover:scale-125 transition-transform shrink-0 flex items-center justify-center -ml-3.5 bg-paper-dark"
                    style={{ borderColor: getPortColor(inPort.type) }}
                    title={`Input: ${inPort.label} (${inPort.type})`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: getPortColor(inPort.type) }}
                    />
                  </div>
                  <span className="text-ink-muted truncate">{inPort.label}</span>
                </div>
              ))}

              {/* Outputs */}
              {node.outputs.map((outPort) => (
                <div key={outPort.id} className="flex items-center justify-end gap-1.5">
                  <span className="text-ink-muted truncate">{outPort.label}</span>
                  <div
                    onClick={(e) =>
                      handlePortMouseDown(e, node.id, outPort.id, outPort.type, true)
                    }
                    className="port-handle w-3 h-3 rounded-full border border-charcoal-soft cursor-pointer hover:scale-125 transition-transform shrink-0 flex items-center justify-center -mr-3.5 bg-paper-dark"
                    style={{ borderColor: getPortColor(outPort.type) }}
                    title={`Output: ${outPort.label} (${outPort.type})`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: getPortColor(outPort.type) }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Execution Status Footer */}
            {node.lastExecution && (
              <div className="px-2 py-1 bg-paper-cream-dark/60 border-t border-charcoal-soft/20 text-[9px] flex items-center justify-between text-ink-muted">
                <span className="truncate">
                  {node.lastExecution.status === 'success'
                    ? 'FIRED'
                    : node.lastExecution.status === 'filtered'
                    ? 'FILTERED'
                    : 'ERR'}
                </span>
                <span>{node.lastExecution.durationMs.toFixed(1)}ms</span>
              </div>
            )}
          </div>
        );
      })}

      {/* Watermark Drafting Coordinates */}
      <div className="absolute bottom-2 right-3 font-mono text-[9px] text-ink-muted/50 pointer-events-none select-none">
        OMNI FORGE DAG ENGINE // GRID 24PX // COORD: [{mousePos.x}, {mousePos.y}]
      </div>
    </div>
  );
}
