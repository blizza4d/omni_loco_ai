'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  LaboratoryModel,
  LaboratoryPipeline,
  PipelineNode,
  PipelineConnection,
} from '../types';
import {
  NODE_PALETTE,
  createDefaultPipeline,
  validatePipeline,
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
  const [simulating, setSimulating] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);
  const [validation, setValidation] = useState<{ isValid: boolean; errors: string[]; executionOrder: string[] }>({
    isValid: true,
    errors: [],
    executionOrder: [],
  });

  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const val = validatePipeline(pipeline);
    setValidation(val);
  }, [pipeline]);

  // Handle node dragging
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
  };

  const handleAddNode = (template: typeof NODE_PALETTE[0]) => {
    const newNodeId = `node-${template.type}-${Date.now().toString(36)}`;
    const newNode: PipelineNode = {
      id: newNodeId,
      type: template.type,
      label: template.label,
      category: template.category,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      inputs: template.inputs.map((p) => ({ ...p, direction: 'input' })),
      outputs: template.outputs.map((p) => ({ ...p, direction: 'output' })),
      parameters: { ...template.defaultParameters },
      status: 'idle',
    };

    setPipeline((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));
    setSelectedNodeId(newNodeId);
  };

  const handleDeleteNode = (id: string) => {
    setPipeline((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== id),
      connections: prev.connections.filter(
        (c) => c.fromNodeId !== id && c.toNodeId !== id
      ),
    }));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const handleResetPipeline = () => {
    if (confirm('Reset pipeline to default factory configuration?')) {
      const def = createDefaultPipeline();
      setPipeline(def);
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

  const handleSimulateExecution = () => {
    if (!validation.isValid) return;
    setSimulating(true);
    setActiveStepIndex(0);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= validation.executionOrder.length) {
        clearInterval(interval);
        setSimulating(false);
        setActiveStepIndex(-1);
      } else {
        setActiveStepIndex(step);
      }
    }, 450);
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
              VISUAL PIPELINE GRAPH EDITOR
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetPipeline}
            className="text-xs gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5 text-ink-muted" />
            RESET
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSimulateExecution}
            disabled={simulating || !validation.isValid}
            className="text-xs gap-1"
          >
            <Play className={`w-3.5 h-3.5 ${simulating ? 'text-amber-500 animate-spin' : 'text-sage-green'}`} />
            {simulating ? 'SIMULATING...' : 'SIMULATE DAG'}
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

      {/* Validation Banner if errors */}
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

      {/* Main Canvas + Node Palette Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Graph SVG & Node Canvas (9 Cols) */}
        <div className="lg:col-span-9 border-2 border-charcoal-soft rounded-tactile bg-paper-dark h-[520px] relative overflow-hidden shadow-tactile">
          {/* Subtle Grid Backdrop */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle, #2d3748 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* SVG Connector Wires */}
          <svg ref={svgRef} className="absolute inset-0 w-full h-full pointer-events-none z-10">
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

              const isExecuting =
                simulating &&
                validation.executionOrder[activeStepIndex] === from.id;

              return (
                <path
                  key={conn.id}
                  d={d}
                  fill="none"
                  stroke={isExecuting ? '#00f3ff' : '#4b5563'}
                  strokeWidth={isExecuting ? 3.5 : 2}
                  strokeDasharray={isExecuting ? '6,4' : undefined}
                  className="transition-all"
                />
              );
            })}
          </svg>

          {/* Draggable Node Cards */}
          {pipeline.nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isRunning =
              simulating && validation.executionOrder[activeStepIndex] === node.id;

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                style={{
                  transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
                  width: '180px',
                }}
                className={`absolute top-0 left-0 z-20 border-2 rounded p-2.5 bg-paper-cream cursor-move transition-shadow ${
                  isRunning
                    ? 'border-cyan-400 shadow-[0_0_15px_rgba(0,243,255,0.6)]'
                    : isSelected
                    ? 'border-sage-green shadow-tactile-sm'
                    : 'border-charcoal-soft shadow-tactile'
                }`}
              >
                {/* Node Title & Category */}
                <div className="flex items-center justify-between mb-1.5">
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

                {/* Ports */}
                <div className="mt-2 pt-1 border-t border-charcoal-soft/20 flex justify-between text-[9px] text-ink-muted">
                  <div>{node.inputs.length > 0 ? '● IN' : ''}</div>
                  <div>{node.outputs.length > 0 ? 'OUT ●' : ''}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar: Palette & Node Parameters (3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Node Palette */}
          <div className="border-2 border-charcoal-soft rounded-tactile p-3 bg-paper-cream space-y-2 shadow-tactile-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-soft flex items-center gap-1">
              <Plus className="w-3.5 h-3.5 text-sage-green" />
              ADD NODE TO GRAPH
            </h3>
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
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

          {/* Selected Node Inspector */}
          {selectedNode ? (
            <div className="border-2 border-charcoal-soft rounded-tactile p-3 bg-paper-cream space-y-2 shadow-tactile-sm text-xs">
              <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-1.5">
                <span className="font-bold uppercase">NODE INSPECTOR</span>
                <span className="text-[9px] text-ink-muted">{selectedNode.category}</span>
              </div>

              <div>
                <label className="font-bold block mb-1 text-[10px] text-ink-muted uppercase">LABEL</label>
                <div className="font-bold">{selectedNode.label}</div>
              </div>

              <div>
                <label className="font-bold block mb-1 text-[10px] text-ink-muted uppercase">TYPE</label>
                <code className="text-[10px] bg-paper-dark p-1 rounded block">{selectedNode.type}</code>
              </div>

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
              Select any node on the graph to inspect ports and parameters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
