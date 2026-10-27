'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  LaboratoryModel,
  LaboratoryPipeline,
  PipelineNode,
  PipelineConnection,
  PortDefinition,
} from '../types';
import {
  NODE_PALETTE,
  createDefaultPipeline,
  validatePipeline,
  executePipeline,
  arePortsCompatible,
} from '../pipeline-runner';
import { Button } from '@/components/ui/Button';
import { StampBadge } from '@/components/ui/StampBadge';
import { saveModel } from '../model-storage';
import { unlockAchievement } from '@/modules/easter-eggs/achievements';
import {
  Play,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  Cpu,
  Layers,
  Sparkles,
  Undo2,
  Redo2,
  Terminal,
  Activity,
  Sliders,
} from 'lucide-react';

export interface VisualPipelineEditorProps {
  model: LaboratoryModel;
  onModelUpdated: (updated: LaboratoryModel) => void;
}

export function VisualPipelineEditor({ model, onModelUpdated }: VisualPipelineEditorProps) {
  const [pipeline, setPipeline] = useState<LaboratoryPipeline>(
    model.pipelineConfig || createDefaultPipeline()
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Port wiring state
  const [wiringStart, setWiringStart] = useState<{
    nodeId: string;
    port: PortDefinition;
    startX: number;
    startY: number;
  } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Execution & Logs
  const [simulating, setSimulating] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [logOpen, setLogOpen] = useState(false);

  // Undo / Redo history
  const [history, setHistory] = useState<LaboratoryPipeline[]>([]);
  const [redoStack, setRedoStack] = useState<LaboratoryPipeline[]>([]);

  const [validation, setValidation] = useState<{ isValid: boolean; errors: string[]; executionOrder: string[] }>({
    isValid: true,
    errors: [],
    executionOrder: [],
  });

  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const val = validatePipeline(pipeline);
    setValidation(val);
  }, [pipeline]);

  const pushHistory = useCallback(
    (newPipeline: LaboratoryPipeline) => {
      setHistory((prev) => [...prev.slice(-20), pipeline]);
      setRedoStack([]);
      setPipeline(newPipeline);
    },
    [pipeline]
  );

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1]!;
    setRedoStack((r) => [pipeline, ...r]);
    setHistory((h) => h.slice(0, -1));
    setPipeline(prev);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0]!;
    setHistory((h) => [...h, pipeline]);
    setRedoStack((r) => r.slice(1));
    setPipeline(next);
  };

  // Node Dragging
  const handleMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    setDraggingNodeId(nodeId);

    const node = pipeline.nodes.find((n) => n.id === nodeId);
    if (node) {
      setDragOffset({
        x: e.clientX - node.x,
        y: e.clientY - node.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (canvasContainerRef.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }

    if (!draggingNodeId) return;

    setPipeline((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === draggingNodeId
          ? {
              ...n,
              x: Math.max(20, Math.min(1800, e.clientX - dragOffset.x)),
              y: Math.max(20, Math.min(800, e.clientY - dragOffset.y)),
            }
          : n
      ),
    }));
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
    setWiringStart(null);
  };

  // Port Wiring: Mouse down on output port
  const handlePortMouseDown = (e: React.MouseEvent, node: PipelineNode, port: PortDefinition) => {
    e.stopPropagation();
    const startX = node.x + 180;
    const startY = node.y + 40;
    setWiringStart({ nodeId: node.id, port, startX, startY });
  };

  // Port Wiring: Mouse up over input port
  const handlePortMouseUp = (e: React.MouseEvent, toNode: PipelineNode, toPort: PortDefinition) => {
    e.stopPropagation();
    if (!wiringStart) return;

    if (wiringStart.nodeId === toNode.id) {
      setWiringStart(null);
      return; // Cannot connect node to itself
    }

    if (!arePortsCompatible(wiringStart.port.type, toPort.type)) {
      alert(`Cannot connect port: "${wiringStart.port.name}" (${wiringStart.port.type}) is incompatible with "${toPort.name}" (${toPort.type}).`);
      setWiringStart(null);
      return;
    }

    // Check if connection already exists
    const exists = pipeline.connections.some(
      (c) =>
        c.fromNodeId === wiringStart.nodeId &&
        c.fromPortId === wiringStart.port.id &&
        c.toNodeId === toNode.id &&
        c.toPortId === toPort.id
    );

    if (exists) {
      setWiringStart(null);
      return;
    }

    const newConnection: PipelineConnection = {
      id: `c-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      fromNodeId: wiringStart.nodeId,
      fromPortId: wiringStart.port.id,
      toNodeId: toNode.id,
      toPortId: toPort.id,
    };

    const updated = {
      ...pipeline,
      connections: [...pipeline.connections, newConnection],
    };

    pushHistory(updated);
    setWiringStart(null);
  };

  const handleDeleteConnection = (connId: string) => {
    const updated = {
      ...pipeline,
      connections: pipeline.connections.filter((c) => c.id !== connId),
    };
    pushHistory(updated);
  };

  const handleAddNode = (template: typeof NODE_PALETTE[0]) => {
    const newNodeId = `node-${template.type}-${Date.now().toString(36)}`;
    const newNode: PipelineNode = {
      id: newNodeId,
      type: template.type,
      label: template.label,
      category: template.category,
      x: 80 + Math.random() * 200,
      y: 80 + Math.random() * 200,
      inputs: template.inputs.map((p) => ({ ...p, direction: 'input' })),
      outputs: template.outputs.map((p) => ({ ...p, direction: 'output' })),
      parameters: { ...template.defaultParameters },
      status: 'idle',
    };

    const updated = {
      ...pipeline,
      nodes: [...pipeline.nodes, newNode],
    };
    pushHistory(updated);
    setSelectedNodeId(newNodeId);
  };

  const handleDeleteNode = (id: string) => {
    const updated = {
      ...pipeline,
      nodes: pipeline.nodes.filter((n) => n.id !== id),
      connections: pipeline.connections.filter((c) => c.fromNodeId !== id && c.toNodeId !== id),
    };
    pushHistory(updated);
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const handleResetPipeline = () => {
    if (confirm('Reset pipeline to factory default configuration?')) {
      const def = createDefaultPipeline();
      pushHistory(def);
    }
  };

  const handleSavePipeline = () => {
    const updatedModel: LaboratoryModel = {
      ...model,
      pipelineConfig: pipeline,
      updatedAt: new Date().toISOString(),
    };
    saveModel(updatedModel);
    onModelUpdated(updatedModel);
    unlockAchievement('NEURAL_ARCHITECT');
  };

  const handleExecuteRealPipeline = () => {
    if (!validation.isValid) {
      alert(`Cannot execute pipeline: ${validation.errors.join('; ')}`);
      return;
    }

    try {
      setSimulating(true);
      const res = executePipeline(pipeline, null, model.modelData?.prototypes);
      setPipeline(res.pipeline);
      setExecutionLogs(res.executionLog);
      setLogOpen(true);
    } catch (err: any) {
      alert(`Pipeline execution error: ${err?.message}`);
    } finally {
      setTimeout(() => setSimulating(false), 500);
    }
  };

  const handleUpdateParameter = (paramKey: string, value: any) => {
    if (!selectedNodeId) return;
    const updated = {
      ...pipeline,
      nodes: pipeline.nodes.map((n) =>
        n.id === selectedNodeId
          ? {
              ...n,
              parameters: {
                ...n.parameters,
                [paramKey]: value,
              },
            }
          : n
      ),
    };
    setPipeline(updated);
  };

  const selectedNode = pipeline.nodes.find((n) => n.id === selectedNodeId);

  return (
    <div
      className="space-y-4 font-mono select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Toolbar Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-charcoal-soft pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-ink-muted px-1.5 py-0.5 border border-charcoal-soft rounded">
              {model.figureTag}
            </span>
            <span className="text-xs font-bold uppercase text-charcoal-soft">
              VISUAL PIPELINE GRAPH // INTERACTIVE DAG
            </span>
            {validation.isValid ? (
              <StampBadge label="DAG VALIDATED" variant="sage" />
            ) : (
              <StampBadge label="ERRORS DETECTED" variant="brick" />
            )}
          </div>
          <h2 className="text-base font-bold uppercase text-charcoal-soft">
            {model.name}
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="p-1.5 border-2 border-charcoal-soft rounded hover:bg-paper-dark disabled:opacity-40"
            title="Undo [Ctrl+Z]"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-1.5 border-2 border-charcoal-soft rounded hover:bg-paper-dark disabled:opacity-40"
            title="Redo [Ctrl+Y]"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <Button variant="outline" size="sm" onClick={handleResetPipeline} className="text-xs gap-1">
            <RotateCcw className="w-3.5 h-3.5 text-ink-muted" />
            RESET
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExecuteRealPipeline}
            disabled={simulating || !validation.isValid}
            className="text-xs gap-1"
          >
            <Play className={`w-3.5 h-3.5 ${simulating ? 'text-amber-500 animate-spin' : 'text-sage-green'}`} />
            {simulating ? 'EXECUTING...' : 'RUN PIPELINE'}
          </Button>

          <Button
            variant="sage"
            size="sm"
            onClick={handleSavePipeline}
            className="text-xs gap-1 bg-sage-green text-charcoal-soft border-charcoal-soft hover:bg-sage-green/90"
          >
            <Save className="w-3.5 h-3.5" />
            SAVE PIPELINE
          </Button>
        </div>
      </div>

      {/* Validation Warnings */}
      {!validation.isValid && (
        <div className="p-3 border-2 border-brick-red bg-brick-red/10 rounded-tactile text-xs text-brick-red space-y-1">
          <div className="flex items-center gap-1.5 font-bold uppercase">
            <AlertTriangle className="w-4 h-4" />
            <span>PIPELINE VALIDATION WARNINGS:</span>
          </div>
          {validation.errors.map((err, idx) => (
            <div key={idx} className="pl-5 text-[11px]">
              • {err}
            </div>
          ))}
        </div>
      )}

      {/* Main Canvas + Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Graph SVG & Node Canvas (9 Cols) */}
        <div
          ref={canvasContainerRef}
          className="lg:col-span-9 border-2 border-charcoal-soft rounded-tactile bg-paper-dark h-[560px] relative overflow-hidden shadow-tactile"
        >
          {/* Subtle Grid Backdrop */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #2d3748 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* SVG Connector Wires */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            {pipeline.connections.map((conn) => {
              const from = pipeline.nodes.find((n) => n.id === conn.fromNodeId);
              const to = pipeline.nodes.find((n) => n.id === conn.toNodeId);
              if (!from || !to) return null;

              const x1 = from.x + 180;
              const y1 = from.y + 40;
              const x2 = to.x;
              const y2 = to.y + 40;

              const dx = Math.abs(x2 - x1) * 0.5;
              const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

              return (
                <g key={conn.id} className="pointer-events-auto cursor-pointer group">
                  <path
                    d={d}
                    fill="none"
                    stroke="#4b5563"
                    strokeWidth={2.5}
                    className="group-hover:stroke-brick-red transition-all"
                  />
                  {/* Delete hit target */}
                  <circle
                    cx={(x1 + x2) / 2}
                    cy={(y1 + y2) / 2}
                    r={6}
                    fill="#ef4444"
                    className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => handleDeleteConnection(conn.id)}
                  />
                </g>
              );
            })}

            {/* Live Interactive Dragging Wire */}
            {wiringStart && (
              <path
                d={`M ${wiringStart.startX} ${wiringStart.startY} C ${
                  wiringStart.startX + Math.abs(mousePos.x - wiringStart.startX) * 0.5
                } ${wiringStart.startY}, ${
                  mousePos.x - Math.abs(mousePos.x - wiringStart.startX) * 0.5
                } ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
                fill="none"
                stroke="#00f3ff"
                strokeWidth={3}
                strokeDasharray="5,4"
              />
            )}
          </svg>

          {/* Draggable Node Cards */}
          {pipeline.nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                style={{
                  transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
                  width: '180px',
                }}
                className={`absolute top-0 left-0 z-20 border-2 rounded p-2.5 bg-paper-cream cursor-move transition-shadow ${
                  node.status === 'ok'
                    ? 'border-sage-green'
                    : isSelected
                    ? 'border-cyan-500 shadow-tactile-sm'
                    : 'border-charcoal-soft shadow-tactile'
                }`}
              >
                {/* Node Title & Delete */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold uppercase px-1 py-0.5 bg-paper-dark border rounded text-ink-muted">
                    {node.category}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNode(node.id);
                    }}
                    className="text-ink-muted hover:text-brick-red text-[10px]"
                  >
                    ✕
                  </button>
                </div>

                <div className="text-xs font-bold uppercase text-charcoal-soft line-clamp-1">
                  {node.label}
                </div>

                {/* Ports Strip with Interactive Drag Handles */}
                <div className="mt-2 pt-1 border-t border-charcoal-soft/20 flex justify-between text-[9px] text-ink-muted">
                  {/* Inputs on Left */}
                  <div className="space-y-1">
                    {node.inputs.map((inPort) => (
                      <div
                        key={inPort.id}
                        onMouseUp={(e) => handlePortMouseUp(e, node, inPort)}
                        className="flex items-center gap-1 hover:text-cyan-500 cursor-pointer"
                        title={`Input: ${inPort.name} (${inPort.type})`}
                      >
                        <span className="w-2 h-2 rounded-full bg-charcoal-soft hover:bg-cyan-400 inline-block" />
                        <span className="text-[8px] uppercase">{inPort.name}</span>
                      </div>
                    ))}
                  </div>

                  {/* Outputs on Right */}
                  <div className="space-y-1 text-right">
                    {node.outputs.map((outPort) => (
                      <div
                        key={outPort.id}
                        onMouseDown={(e) => handlePortMouseDown(e, node, outPort)}
                        className="flex items-center justify-end gap-1 hover:text-cyan-500 cursor-grab"
                        title={`Drag output to connect: ${outPort.name} (${outPort.type})`}
                      >
                        <span className="text-[8px] uppercase">{outPort.name}</span>
                        <span className="w-2 h-2 rounded-full bg-sage-green hover:bg-cyan-400 inline-block" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Real Output Snippet Badge if available */}
                {node.lastOutput && (
                  <div className="mt-1.5 p-1 bg-paper-dark/60 rounded text-[8px] text-charcoal-soft font-mono truncate">
                    {typeof node.lastOutput === 'object'
                      ? JSON.stringify(node.lastOutput).slice(0, 24) + '...'
                      : String(node.lastOutput)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar: Palette & Parameter Inspector (3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Node Palette */}
          <div className="border-2 border-charcoal-soft rounded-tactile p-3 bg-paper-cream space-y-2 shadow-tactile-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-soft flex items-center gap-1">
              <Plus className="w-3.5 h-3.5 text-sage-green" />
              ADD NODE TO GRAPH
            </h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {NODE_PALETTE.map((tpl) => (
                <button
                  key={tpl.type}
                  onClick={() => handleAddNode(tpl)}
                  className="w-full text-left p-2 border border-charcoal-soft/30 rounded hover:border-charcoal-soft bg-paper-dark/30 hover:bg-paper-dark text-xs transition-colors flex items-center justify-between"
                >
                  <span className="font-bold uppercase text-[11px]">{tpl.label}</span>
                  <span className="text-[8px] uppercase px-1 border rounded text-ink-muted">
                    {tpl.category}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Node Parameter Inspector */}
          {selectedNode ? (
            <div className="border-2 border-charcoal-soft rounded-tactile p-3 bg-paper-cream space-y-3 shadow-tactile-sm text-xs">
              <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-1.5">
                <span className="font-bold uppercase flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                  NODE PARAMETERS
                </span>
                <span className="text-[9px] text-ink-muted uppercase">{selectedNode.category}</span>
              </div>

              <div>
                <label className="font-bold block mb-1 text-[10px] text-ink-muted uppercase">NODE LABEL</label>
                <div className="font-bold">{selectedNode.label}</div>
              </div>

              {/* Dynamic Parameter Sliders & Inputs */}
              {Object.keys(selectedNode.parameters).length > 0 ? (
                <div className="space-y-2 pt-1 border-t border-charcoal-soft/20">
                  {Object.entries(selectedNode.parameters).map(([key, val]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="font-bold uppercase">{key}</span>
                        <span>{String(val)}</span>
                      </div>
                      {typeof val === 'number' ? (
                        <input
                          type="range"
                          min={val > 10 ? 10 : 0.05}
                          max={val > 10 ? 200 : 1.0}
                          step={val > 10 ? 5 : 0.05}
                          value={val}
                          onChange={(e) => handleUpdateParameter(key, parseFloat(e.target.value))}
                          className="w-full accent-charcoal-soft"
                        />
                      ) : (
                        <input
                          type="text"
                          value={String(val)}
                          onChange={(e) => handleUpdateParameter(key, e.target.value)}
                          className="w-full p-1 border rounded bg-paper-dark text-[10px]"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-ink-muted">No configurable parameters on this node.</div>
              )}

              {/* Last Calculated Output */}
              {selectedNode.lastOutput && (
                <div className="pt-2 border-t border-charcoal-soft/20 space-y-1">
                  <span className="font-bold uppercase text-[10px] text-sage-green">INTERMEDIATE OUTPUT:</span>
                  <pre className="p-1.5 bg-paper-dark rounded text-[9px] max-h-24 overflow-y-auto">
                    {JSON.stringify(selectedNode.lastOutput, null, 2)}
                  </pre>
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="brick"
                  size="sm"
                  onClick={() => handleDeleteNode(selectedNode.id)}
                  className="w-full text-[10px] gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  DELETE NODE
                </Button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-charcoal-soft/40 rounded-tactile p-4 text-center text-xs text-ink-muted">
              Click any node to tune hyperparameters and inspect real computational outputs.
            </div>
          )}
        </div>
      </div>

      {/* Execution Terminal Drawer */}
      {logOpen && (
        <div className="p-3 border-2 border-charcoal-soft rounded-tactile bg-paper-dark space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-charcoal-soft">
            <span className="flex items-center gap-1.5 text-sage-green">
              <Terminal className="w-4 h-4" />
              PIPELINE EXECUTION TRACE
            </span>
            <button onClick={() => setLogOpen(false)} className="text-ink-muted hover:text-charcoal-soft">
              ✕ CLOSE
            </button>
          </div>
          <div className="space-y-1 text-[11px] font-mono max-h-36 overflow-y-auto bg-charcoal-dark p-2 rounded text-paper-cream">
            {executionLogs.map((entry, idx) => (
              <div key={idx} className="leading-relaxed">
                • {entry}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
