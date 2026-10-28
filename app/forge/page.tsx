'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GlobalNav } from '@/components/ui/GlobalNav';
import { StampBadge } from '@/components/ui/StampBadge';
import { PerformanceHUD } from '@/components/ui/PerformanceHUD';
import {
  ProtocolDefinition,
  ProtocolNode,
  ProtocolConnection,
  ProtocolExecutionState,
  ProtocolLogEntry,
  ProtocolNodeType,
} from '@/modules/forge/types';
import { BUILT_IN_PROTOCOLS } from '@/modules/forge/templates';
import { createNode } from '@/modules/forge/node-registry';
import { ProtocolExecutionEngine } from '@/modules/forge/execution-engine';
import { SessionRecorder } from '@/modules/forge/session-recorder';
import {
  getAllProtocols,
  saveProtocol,
  duplicateProtocol,
  exportProtocolToJSON,
  importProtocolFromJSON,
} from '@/modules/forge/protocol-storage';
import { ProtocolForgeCanvas } from '@/modules/forge/components/ProtocolForgeCanvas';
import { NodeInspector } from '@/modules/forge/components/NodeInspector';
import { NodeLibraryDrawer } from '@/modules/forge/components/NodeLibraryDrawer';
import { ProtocolToolbar } from '@/modules/forge/components/ProtocolToolbar';
import { ExecutionDiagnosticsPanel } from '@/modules/forge/components/ExecutionDiagnosticsPanel';
import { SessionRecorderModal } from '@/modules/forge/components/SessionRecorderModal';
import { useSystemStore } from '@/core/store';
import {
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export default function ProtocolForgePage() {
  const [protocols, setProtocols] = useState<ProtocolDefinition[]>(BUILT_IN_PROTOCOLS);
  const [activeProtocol, setActiveProtocol] = useState<ProtocolDefinition>(BUILT_IN_PROTOCOLS[0]!);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [executionState, setExecutionState] = useState<ProtocolExecutionState>('DRAFT');
  const [logs, setLogs] = useState<ProtocolLogEntry[]>([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [toastAlert, setToastAlert] = useState<{ title: string; message: string; variant: string } | null>(null);

  // Engines
  const engineRef = useRef<ProtocolExecutionEngine | null>(null);
  const recorderRef = useRef<SessionRecorder>(new SessionRecorder());
  const toastTimeoutRef = useRef<any>(null);
  const particlesRef = useRef<Particle[]>([]);
  const fxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const { setPerfStats } = useSystemStore();

  // Load saved protocols on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const all = getAllProtocols();
      setProtocols(all);
      if (all.length > 0) {
        setActiveProtocol(all[0]!);
      }
    }
  }, []);

  const spawnVisualEffectRef = useRef<(type: string, color?: string) => void>(() => {});
  const showHUDToastRef = useRef<(title: string, message: string, variant?: any) => void>(() => {});

  // Initialize execution engine with real-time callbacks
  useEffect(() => {
    const engine = new ProtocolExecutionEngine({
      onStateChange: (state) => {
        setExecutionState(state);
      },
      onLog: (entry) => {
        setLogs((prev) => [...prev.slice(-199), entry]);
        if (recorderRef.current.isSessionRecording()) {
          recorderRef.current.recordNodeExecution(
            entry.nodeId || 'unknown',
            entry.nodeLabel || 'system',
            entry.level,
            0,
            entry.data
          );
        }
      },
      onNodeExecuted: (nodeId, status, durationMs, data) => {
        if (recorderRef.current.isSessionRecording()) {
          recorderRef.current.recordNodeExecution(nodeId, 'node', status, durationMs, data);
        }
      },
      onActionTriggered: (actionType, payload) => {
        if (actionType === 'VISUAL_FX') {
          spawnVisualEffectRef.current(payload.effectType, payload.color);
        } else if (actionType === 'TOAST') {
          showHUDToastRef.current(payload.title, payload.message, payload.variant);
        }
        if (recorderRef.current.isSessionRecording()) {
          recorderRef.current.recordOutputAction(actionType, payload);
        }
      },
    });

    engine.loadProtocol(activeProtocol);
    engineRef.current = engine;

    return () => {
      engine.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update telemetry stats
  useEffect(() => {
    setPerfStats({
      activeModule: 'PROTOCOL FORGE // WORKFLOW ENGINE',
      activeModel: 'MULTIMODAL DAG RUNNER',
      fps: 60,
      p50Ms: 1.5,
      p95Ms: 3.2,
      trackingStatus: executionState === 'RUNNING' ? 'TRACKING_ACTIVE' : 'STANDBY',
      streamStatus: executionState === 'RUNNING' ? 'STREAMING' : 'STANDBY',
    });
  }, [executionState, setPerfStats]);

  // Visual Particle Effects Engine
  const spawnVisualEffect = useCallback((type: string, color = '#00E599') => {
    const canvas = fxCanvasRef.current;
    if (!canvas) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const count = type === 'quantum_scan' ? 32 : 24;
    const newParticles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 2.5 + Math.random() * 4.5;
      newParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 7,
        color,
        life: 0,
        maxLife: 28 + Math.random() * 14,
      });
    }

    particlesRef.current.push(...newParticles);
    if (particlesRef.current.length > 80) {
      particlesRef.current = particlesRef.current.slice(-80);
    }
  }, []);

  // Particle Animation Loop
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;
      const canvas = fxCanvasRef.current;
      if (canvas && particlesRef.current.length > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const p = particlesRef.current[i]!;
            p.x += p.vx;
            p.y += p.vy;
            p.life++;

            if (p.life >= p.maxLife) {
              particlesRef.current.splice(i, 1);
              continue;
            }

            const alpha = 1 - p.life / p.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const showHUDToast = useCallback((title: string, message: string, variant = 'sage') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastAlert({ title, message, variant });
    toastTimeoutRef.current = setTimeout(() => {
      setToastAlert(null);
    }, 3500);
  }, []);

  spawnVisualEffectRef.current = spawnVisualEffect;
  showHUDToastRef.current = showHUDToast;

  // Node Canvas Mutators
  const handleSelectTemplate = (templateId: string) => {
    const target = protocols.find((p) => p.id === templateId);
    if (!target) return;
    setActiveProtocol(target);
    setSelectedNodeId(null);
    engineRef.current?.loadProtocol(target);
  };

  const handleUpdateNodePosition = (nodeId: string, position: { x: number; y: number }) => {
    const updatedNodes = activeProtocol.nodes.map((n) =>
      n.id === nodeId ? { ...n, position } : n
    );
    const updatedProtocol = { ...activeProtocol, nodes: updatedNodes };
    setActiveProtocol(updatedProtocol);
  };

  const handleAddConnection = (conn: ProtocolConnection) => {
    const updated = {
      ...activeProtocol,
      connections: [...activeProtocol.connections, conn],
    };
    setActiveProtocol(updated);
    engineRef.current?.loadProtocol(updated);
  };

  const handleRemoveConnection = (connId: string) => {
    const updated = {
      ...activeProtocol,
      connections: activeProtocol.connections.filter((c) => c.id !== connId),
    };
    setActiveProtocol(updated);
    engineRef.current?.loadProtocol(updated);
  };

  const handleDeleteNode = (nodeId: string) => {
    const updated = {
      ...activeProtocol,
      nodes: activeProtocol.nodes.filter((n) => n.id !== nodeId),
      connections: activeProtocol.connections.filter(
        (c) => c.fromNode !== nodeId && c.toNode !== nodeId
      ),
    };
    setActiveProtocol(updated);
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    engineRef.current?.loadProtocol(updated);
  };

  const handleAddNode = (type: ProtocolNodeType) => {
    const newNode = createNode(type, 180 + Math.random() * 80, 140 + Math.random() * 80);
    const updated = {
      ...activeProtocol,
      nodes: [...activeProtocol.nodes, newNode],
    };
    setActiveProtocol(updated);
    setSelectedNodeId(newNode.id);
    engineRef.current?.loadProtocol(updated);
  };

  const handleUpdateNodeParams = (nodeId: string, params: Record<string, any>) => {
    const updatedNodes = activeProtocol.nodes.map((n) =>
      n.id === nodeId ? { ...n, params } : n
    );
    const updatedProtocol = { ...activeProtocol, nodes: updatedNodes };
    setActiveProtocol(updatedProtocol);
    engineRef.current?.loadProtocol(updatedProtocol);
  };

  const handleDuplicateNode = (nodeId: string) => {
    const original = activeProtocol.nodes.find((n) => n.id === nodeId);
    if (!original) return;

    const dup = createNode(original.type, original.position.x + 30, original.position.y + 30);
    dup.params = { ...original.params };
    dup.label = `${original.label} (Copy)`;

    const updated = {
      ...activeProtocol,
      nodes: [...activeProtocol.nodes, dup],
    };
    setActiveProtocol(updated);
    setSelectedNodeId(dup.id);
    engineRef.current?.loadProtocol(updated);
  };

  // Protocol Actions
  const handleStart = () => {
    engineRef.current?.start();
  };

  const handlePause = () => {
    engineRef.current?.pause();
  };

  const handleStop = () => {
    engineRef.current?.stop();
  };

  const handleReset = () => {
    const baseline = BUILT_IN_PROTOCOLS.find((p) => p.id === activeProtocol.id);
    if (baseline) {
      setActiveProtocol(JSON.parse(JSON.stringify(baseline)));
      engineRef.current?.loadProtocol(baseline);
    }
  };

  const handleSave = () => {
    saveProtocol(activeProtocol);
    setProtocols(getAllProtocols());
    showHUDToast('PROTOCOL SAVED', `"${activeProtocol.name}" stored in local database.`, 'sage');
  };

  const handleExport = () => {
    const jsonStr = exportProtocolToJSON(activeProtocol);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProtocol.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-v${activeProtocol.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const imported = importProtocolFromJSON(evt.target?.result as string);
          setProtocols(getAllProtocols());
          setActiveProtocol(imported);
          engineRef.current?.loadProtocol(imported);
          showHUDToast('PROTOCOL IMPORTED', `Imported "${imported.name}" successfully.`, 'sage');
        } catch (err: any) {
          alert(`Failed to import protocol: ${err?.message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleStartRecording = () => {
    recorderRef.current.startSession(activeProtocol.id, activeProtocol.name, activeProtocol.version);
    showHUDToast('SESSION RECORDING STARTED', 'Logging structured multimodal events & actions.', 'brick');
  };

  const handleStopRecording = () => {
    recorderRef.current.stopSession();
    showHUDToast('SESSION RECORDING FINISHED', 'Session log archived. Ready for export or replay.', 'sage');
  };

  const selectedNode = activeProtocol.nodes.find((n) => n.id === selectedNodeId) || null;
  const engineStats = engineRef.current?.getStats() || { eventsProcessed: 0, actionsExecuted: 0, lastEventTime: 0 };

  return (
    <div className="min-h-screen flex flex-col bg-paper-cream text-charcoal-soft font-mono relative">
      <GlobalNav />
      <PerformanceHUD />

      {/* Floating Tactical Particle FX Canvas Overlay */}
      <canvas
        ref={fxCanvasRef}
        width={960}
        height={640}
        className="fixed inset-0 w-full h-full pointer-events-none z-40"
      />

      {/* HUD Notification Toast */}
      {toastAlert && (
        <div
          role="alert"
          className={`fixed top-16 right-4 z-50 p-3.5 border-2 rounded-tactile shadow-tactile font-mono text-xs flex items-center gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            toastAlert.variant === 'brick'
              ? 'border-brick-red bg-paper-dark text-brick-red shadow-tactile-brick'
              : toastAlert.variant === 'charcoal'
              ? 'border-charcoal-soft bg-paper-dark text-charcoal-soft shadow-tactile'
              : 'border-sage-green bg-paper-dark text-sage-green shadow-tactile-sage'
          }`}
        >
          <Zap className="w-4 h-4 shrink-0 animate-pulse" />
          <div>
            <span className="font-bold uppercase tracking-technical block">{toastAlert.title}</span>
            <span className="text-[11px] text-charcoal-soft">{toastAlert.message}</span>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-5">
        {/* Desk Header Strip with Stamped Labels */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-charcoal-soft pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-bold text-xs uppercase tracking-technical text-ink-muted">
                FORGE // MULTIMODAL WORKFLOW ENGINE
              </span>
              <StampBadge label="EVENT BUS ACTIVE" variant="sage" />
              <StampBadge label={`${activeProtocol.nodes.length} NODES`} variant="charcoal" />
              <StampBadge label={`${activeProtocol.connections.length} WIRES`} variant="charcoal" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-technical text-charcoal-soft uppercase leading-snug">
              PROTOCOL FORGE // CROSS-MODEL INTELLIGENCE
            </h1>
            <p className="text-xs text-ink-muted max-w-2xl mt-1.5 leading-relaxed">
              Combine, filter, and automate multi-sensory AI capabilities. Connect hand gestures, finger counts, gaze dwell, full-body poses, speech DSP, and waste classification into verifiable, executable event workflows.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Manual Trigger Button */}
            <button
              onClick={() => {
                const manualNode = activeProtocol.nodes.find((n) => n.type === 'input-manual');
                if (manualNode) {
                  engineRef.current?.executeManualTrigger(manualNode.id);
                } else {
                  // Fallback: spawn a visual FX directly
                  spawnVisualEffect('quantum_scan', '#06B6D4');
                  showHUDToast('MANUAL PULSE DISPATCHED', 'Simulated tactile command trigger.', 'sage');
                }
              }}
              className="px-3 py-1.5 border-2 border-charcoal-soft bg-paper-dark hover:bg-paper-dark/80 text-charcoal-soft font-bold text-xs uppercase rounded-tactile flex items-center gap-1.5 shadow-tactile-sm transition-all"
              title="Dispatch manual test pulse"
            >
              <Zap className="w-3.5 h-3.5 text-brick-red" />
              <span>TEST PULSE</span>
            </button>
          </div>
        </div>

        {/* Protocol Execution Toolbar */}
        <ProtocolToolbar
          protocol={activeProtocol}
          executionState={executionState}
          onStart={handleStart}
          onPause={handlePause}
          onStop={handleStop}
          onReset={handleReset}
          onSave={handleSave}
          onExport={handleExport}
          onImport={handleImport}
          onSelectTemplate={handleSelectTemplate}
          onOpenLibrary={() => setIsLibraryOpen(true)}
          onToggleRecorder={() => setIsRecorderOpen(true)}
          isRecordingSession={recorderRef.current.isSessionRecording()}
        />

        {/* Blueprint Visual Canvas */}
        <div className="relative">
          <ProtocolForgeCanvas
            nodes={activeProtocol.nodes}
            connections={activeProtocol.connections}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onUpdateNodePosition={handleUpdateNodePosition}
            onAddConnection={handleAddConnection}
            onRemoveConnection={handleRemoveConnection}
            onDeleteNode={handleDeleteNode}
          />
        </div>

        {/* Bottom Split: Node Inspector & Execution Diagnostics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Node Inspector (4 Cols) */}
          <div className="lg:col-span-5">
            <NodeInspector
              node={selectedNode}
              onUpdateParams={handleUpdateNodeParams}
              onDuplicateNode={handleDuplicateNode}
              onDeleteNode={handleDeleteNode}
              onClose={() => setSelectedNodeId(null)}
            />
          </div>

          {/* Execution Diagnostics Panel (7 Cols) */}
          <div className="lg:col-span-7">
            <ExecutionDiagnosticsPanel
              logs={logs}
              eventsProcessed={engineStats.eventsProcessed}
              actionsExecuted={engineStats.actionsExecuted}
              lastEventTime={engineStats.lastEventTime}
              subscriptionCount={engineRef.current ? 4 : 0}
              onClearLogs={() => setLogs([])}
            />
          </div>
        </div>
      </main>

      {/* Node Library Drawer */}
      <NodeLibraryDrawer
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onAddNode={handleAddNode}
      />

      {/* Session Recorder & Replay Modal */}
      <SessionRecorderModal
        isOpen={isRecorderOpen}
        onClose={() => setIsRecorderOpen(false)}
        recorder={recorderRef.current}
        activeSession={recorderRef.current.getActiveSession()}
        isRecording={recorderRef.current.isSessionRecording()}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
      />
    </div>
  );
}
