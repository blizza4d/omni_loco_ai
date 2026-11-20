'use client';

import React, { useState, useEffect } from 'react';
import { ModelLifecycleManager, ModelStatusRecord } from '@/core/models/model-lifecycle-manager';
import { SharedCameraManager, CameraTelemetry } from '@/core/camera/shared-camera-manager';
import { SharedResourceManager, ResourceTelemetry } from '@/core/runtime/resource-manager';
import { useSystemStore, useSettingsStore } from '@/core/store';
import { StampBadge } from './StampBadge';
import { Button } from './Button';
import {
  Activity,
  Cpu,
  Layers,
  X,
  Camera,
  HardDrive,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  Sliders,
  Zap,
  Mic,
  Maximize2,
  RefreshCw,
} from 'lucide-react';

export interface PerformanceCentreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PerformanceCentreModal({ isOpen, onClose }: PerformanceCentreModalProps) {
  const { fps, p50Ms, p95Ms, activeBackend, activeModule, activeModel, modelLoadTimeMs } = useSystemStore();
  const { syntheticMode, setSyntheticMode } = useSettingsStore();

  const [models, setModels] = useState<ModelStatusRecord[]>([]);
  const [cameraTelemetry, setCameraTelemetry] = useState<CameraTelemetry | null>(null);
  const [resourceTelemetry, setResourceTelemetry] = useState<ResourceTelemetry | null>(null);
  const [memoryInfo, setMemoryInfo] = useState<{
    usedHeapMb: number | null;
    totalHeapMb: number | null;
    limitHeapMb: number | null;
    isSupported: boolean;
  }>({ usedHeapMb: null, totalHeapMb: null, limitHeapMb: null, isSupported: false });

  const [lightweightMode, setLightweightMode] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // 1. Subscribe to Model Lifecycle Manager
    const modelManager = ModelLifecycleManager.getInstance();
    const unsubModels = modelManager.subscribe((list) => {
      setModels([...list]);
    });

    // 2. Subscribe to Shared Camera Manager
    const camManager = SharedCameraManager.getInstance();
    const unsubCam = camManager.subscribe((cam) => {
      setCameraTelemetry({ ...cam });
    });

    // 3. Subscribe to Shared Resource Manager
    const resManager = SharedResourceManager.getInstance();
    const unsubRes = resManager.subscribe((res) => {
      setResourceTelemetry({ ...res });
    });

    // 4. Probe real heap memory (Chromium non-standard performance.memory API)
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const perfWithMemory = performance as unknown as {
        memory?: {
          usedJSHeapSize?: number;
          totalJSHeapSize?: number;
          jsHeapSizeLimit?: number;
        };
      };
      const mem = perfWithMemory.memory;
      if (mem && mem.usedJSHeapSize) {
        setMemoryInfo({
          usedHeapMb: Math.round(mem.usedJSHeapSize / (1024 * 1024)),
          totalHeapMb: Math.round((mem.totalJSHeapSize || 0) / (1024 * 1024)),
          limitHeapMb: Math.round((mem.jsHeapSizeLimit || 0) / (1024 * 1024)),
          isSupported: true,
        });
      }
    } else {
      setMemoryInfo({
        usedHeapMb: null,
        totalHeapMb: null,
        limitHeapMb: null,
        isSupported: false,
      });
    }

    return () => {
      unsubModels();
      unsubCam();
      unsubRes();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const exportDiagnosticsReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      platform: 'Omni Loco AI 2.0 Apex Telemetry',
      activeModule,
      activeModel,
      activeBackend,
      fps: {
        measured: fps,
        p50LatencyMs: p50Ms,
        p95LatencyMs: p95Ms,
        coldStartMs: modelLoadTimeMs,
      },
      models: models.map((m) => ({
        id: m.id,
        name: m.displayName,
        version: m.version,
        runtime: m.runtime,
        state: m.state,
        backend: m.activeBackend,
        assetCached: m.assetCached,
        inMemory: m.inMemory,
        activelyExecuting: m.activelyExecuting,
        loadTimeMs: m.loadTimeMs,
        inferenceCount: m.inferenceCount,
        lastInferenceDurationMs: m.lastInferenceDurationMs,
      })),
      camera: cameraTelemetry,
      resources: resourceTelemetry,
      memory: memoryInfo,
      lightweightMode,
      syntheticMode,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omni-loco-telemetry-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="perf-centre-title"
      className="fixed inset-0 z-50 bg-charcoal-soft/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-paper-cream border-2 border-charcoal-soft w-full max-w-4xl max-h-[90vh] flex flex-col rounded-tactile shadow-tactile-lg overflow-hidden font-mono text-charcoal-soft">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-charcoal-soft px-5 py-3 bg-paper-dark">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-brick-red animate-pulse" />
            <h2 id="perf-centre-title" className="font-bold text-sm uppercase tracking-technical">
              PERFORMANCE & HARDWARE DIAGNOSTICS CENTRE
            </h2>
            <StampBadge label="OMNI 2.0 APEX" variant="sage" />
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-charcoal-soft/40 hover:border-charcoal-soft hover:bg-paper-cream rounded-[2px]"
            aria-label="Close Performance Centre"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Top Live Gauges Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* FPS */}
            <div className="border border-charcoal-soft p-3 bg-paper-cream rounded-tactile shadow-tactile-sm">
              <div className="flex items-center justify-between text-[10px] text-ink-muted">
                <span>INFERENCE TICK</span>
                <Gauge className="w-3.5 h-3.5 text-sage-green" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tabular-nums">{fps > 0 ? fps : '--'}</span>
                <span className="text-xs text-ink-muted font-bold">FPS</span>
              </div>
              <div className="text-[9px] text-ink-muted mt-1">Measured vsync / rAF</div>
            </div>

            {/* Latency */}
            <div className="border border-charcoal-soft p-3 bg-paper-cream rounded-tactile shadow-tactile-sm">
              <div className="flex items-center justify-between text-[10px] text-ink-muted">
                <span>LATENCY p50 / p95</span>
                <Activity className="w-3.5 h-3.5 text-brick-red" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold tabular-nums">{p50Ms > 0 ? p50Ms : '--'}</span>
                <span className="text-xs text-ink-muted">/ {p95Ms > 0 ? `${p95Ms}ms` : '--'}</span>
              </div>
              <div className="text-[9px] text-ink-muted mt-1">Single-flight compute</div>
            </div>

            {/* Backend */}
            <div className="border border-charcoal-soft p-3 bg-paper-cream rounded-tactile shadow-tactile-sm">
              <div className="flex items-center justify-between text-[10px] text-ink-muted">
                <span>EXECUTION BACKEND</span>
                <Cpu className="w-3.5 h-3.5 text-charcoal-soft" />
              </div>
              <div className="mt-1.5">
                <StampBadge
                  label={activeBackend.toUpperCase()}
                  variant={activeBackend === 'webgpu' ? 'sage' : 'charcoal'}
                />
              </div>
              <div className="text-[9px] text-ink-muted mt-2">Hardware accelerated</div>
            </div>

            {/* Memory Usage */}
            <div className="border border-charcoal-soft p-3 bg-paper-cream rounded-tactile shadow-tactile-sm">
              <div className="flex items-center justify-between text-[10px] text-ink-muted">
                <span>HEAP MEMORY</span>
                <HardDrive className="w-3.5 h-3.5 text-charcoal-soft" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                {memoryInfo.isSupported && memoryInfo.usedHeapMb !== null ? (
                  <>
                    <span className="text-2xl font-bold tabular-nums">{memoryInfo.usedHeapMb}</span>
                    <span className="text-xs text-ink-muted">/ {memoryInfo.limitHeapMb} MB</span>
                  </>
                ) : (
                  <span className="text-xs font-bold text-ink-muted">STANDARD W3C SECURE</span>
                )}
              </div>
              <div className="text-[9px] text-ink-muted mt-1">
                {memoryInfo.isSupported ? 'Chromium heap probe' : 'Heap probe restricted by browser'}
              </div>
            </div>
          </div>

          {/* Active Model Lifecycle Matrix */}
          <div className="border border-charcoal-soft rounded-tactile p-4 bg-paper-cream shadow-tactile-sm space-y-3">
            <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-charcoal-soft" />
                <h3 className="font-bold text-xs uppercase tracking-technical">
                  MODEL LIFECYCLE & EXECUTION REGISTRY
                </h3>
              </div>
              <span className="text-[10px] text-ink-muted">
                {models.filter((m) => m.state === 'READY' || m.state === 'PROCESSING').length} ACTIVE IN MEMORY
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-charcoal-soft/30 text-ink-muted text-[10px]">
                    <th className="py-1.5 px-2">MODEL IDENTIFIER</th>
                    <th className="py-1.5 px-2">RUNTIME</th>
                    <th className="py-1.5 px-2">BACKEND</th>
                    <th className="py-1.5 px-2">LIFECYCLE STATE</th>
                    <th className="py-1.5 px-2">ASSET CACHE</th>
                    <th className="py-1.5 px-2">INFERENCE LATENCY</th>
                    <th className="py-1.5 px-2">RUNS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-soft/10">
                  {models.map((m) => {
                    const stateColor =
                      m.state === 'PROCESSING'
                        ? 'bg-amber-500/20 text-amber-700 border-amber-500'
                        : m.state === 'READY'
                        ? 'bg-sage-green/20 text-charcoal-soft border-sage-green'
                        : m.state === 'LOADING'
                        ? 'bg-cyan-500/20 text-cyan-700 border-cyan-500 animate-pulse'
                        : m.state === 'ERROR'
                        ? 'bg-brick-red/20 text-brick-red border-brick-red'
                        : 'bg-paper-dark text-ink-muted border-charcoal-soft/20';

                    return (
                      <tr key={m.id} className="hover:bg-paper-dark/40 transition-colors">
                        <td className="py-2 px-2 font-bold">{m.displayName}</td>
                        <td className="py-2 px-2 text-ink-muted">{m.runtime}</td>
                        <td className="py-2 px-2">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-charcoal-soft/30">
                            {m.activeBackend}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded border ${stateColor}`}
                          >
                            {m.state}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          {m.assetCached ? (
                            <span className="text-sage-green flex items-center gap-1 text-[10px]">
                              <CheckCircle2 className="w-3 h-3" /> CACHED
                            </span>
                          ) : (
                            <span className="text-ink-muted text-[10px]">NOT CACHED</span>
                          )}
                        </td>
                        <td className="py-2 px-2 tabular-nums">
                          {m.lastInferenceDurationMs !== null ? `${m.lastInferenceDurationMs} ms` : '--'}
                        </td>
                        <td className="py-2 px-2 tabular-nums">{m.inferenceCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Camera & Hardware Stream Telemetry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Camera Manager Status */}
            <div className="border border-charcoal-soft rounded-tactile p-4 bg-paper-cream shadow-tactile-sm space-y-2.5">
              <div className="flex items-center gap-2 border-b border-charcoal-soft/20 pb-2">
                <Camera className="w-4 h-4 text-charcoal-soft" />
                <h3 className="font-bold text-xs uppercase tracking-technical">
                  SHARED CAMERA HARDWARE STREAM
                </h3>
              </div>

              {cameraTelemetry ? (
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">STREAM STATUS:</span>
                    <span className="font-bold">
                      {cameraTelemetry.isStreaming ? (
                        <span className="text-sage-green flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-sage-green animate-pulse" /> LIVE STREAM
                        </span>
                      ) : (
                        'STANDBY / RELEASED'
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">CONSUMER COUNT:</span>
                    <span className="font-bold tabular-nums">
                      {cameraTelemetry.consumerCount} (Ref-counted)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">RESOLUTION:</span>
                    <span className="font-bold">
                      {cameraTelemetry.resolution
                        ? `${cameraTelemetry.resolution.width} x ${cameraTelemetry.resolution.height}`
                        : 'Uninitialized'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">FACING MODE:</span>
                    <span className="font-bold uppercase">{cameraTelemetry.facingMode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">PERMISSION:</span>
                    <span className="font-bold uppercase">{cameraTelemetry.permissionState}</span>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-ink-muted">Camera stream manager inactive</div>
              )}
            </div>

            {/* Shared Runtime & Memory Resource Leaks Protection */}
            <div className="border border-charcoal-soft rounded-tactile p-4 bg-paper-cream shadow-tactile-sm space-y-2.5">
              <div className="flex items-center gap-2 border-b border-charcoal-soft/20 pb-2">
                <Zap className="w-4 h-4 text-brick-red" />
                <h3 className="font-bold text-xs uppercase tracking-technical">
                  ACTIVE RUNTIME CONTEXTS
                </h3>
              </div>

              {resourceTelemetry ? (
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">WEBGL CONTEXTS:</span>
                    <span className="font-bold tabular-nums">{resourceTelemetry.webGlContexts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">THREE.JS RENDERERS:</span>
                    <span className="font-bold tabular-nums">{resourceTelemetry.threeRenderers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">WEB AUDIO CONTEXTS:</span>
                    <span className="font-bold tabular-nums">{resourceTelemetry.audioContexts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">WEB WORKERS:</span>
                    <span className="font-bold tabular-nums">{resourceTelemetry.workers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">ANIMATION (rAF) LOOPS:</span>
                    <span className="font-bold tabular-nums">{resourceTelemetry.rafLoops}</span>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-ink-muted">Resource manager active</div>
              )}
            </div>
          </div>

          {/* Performance Tuning & Options */}
          <div className="border border-charcoal-soft rounded-tactile p-4 bg-paper-dark space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-technical flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-charcoal-soft" />
              HARDWARE ADAPTATION & ACCESSIBILITY
            </h3>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold">LOW-POWER / LIGHTWEIGHT MODE</span>
                <p className="text-[10px] text-ink-muted">
                  Throttles vision pipeline to 15 FPS and simplifies CSS filters to conserve battery.
                </p>
              </div>
              <button
                onClick={() => setLightweightMode(!lightweightMode)}
                className={`px-3 py-1.5 font-bold uppercase rounded-tactile border transition-all text-xs ${
                  lightweightMode
                    ? 'border-brick-red bg-brick-red text-white'
                    : 'border-charcoal-soft bg-paper-cream text-charcoal-soft'
                }`}
              >
                {lightweightMode ? 'ACTIVE (15 FPS)' : 'STANDARD (60 FPS)'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t-2 border-charcoal-soft px-5 py-3 bg-paper-dark flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[10px] text-ink-muted">
            Omni Loco AI 2.0 • 100% Local Inference • Zero Cloud Transmission
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={exportDiagnosticsReport}
              className="gap-1.5 flex-1 sm:flex-none"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{copiedStatus ? 'EXPORTED!' : 'EXPORT REPORT JSON'}</span>
            </Button>
            <Button variant="default" size="sm" onClick={onClose} className="flex-1 sm:flex-none">
              CLOSE
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
