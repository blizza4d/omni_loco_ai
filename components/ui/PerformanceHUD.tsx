'use client';

import React from 'react';
import { useSystemStore } from '@/core/store';
import { StampBadge } from './StampBadge';
import {
  Activity,
  Cpu,
  Layers,
  X,
  Gauge,
  ChevronDown,
  ChevronUp,
  Camera,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';

export function PerformanceHUD() {
  const {
    fps,
    p50Ms,
    p95Ms,
    activeBackend,
    workerQueueDepth,
    activeModule,
    activeModel,
    modelLoadTimeMs,
    trackingStatus,
    streamStatus,
    warningMessage,
    perfHudVisible,
    hudExpanded,
    togglePerfHud,
    toggleHudExpanded,
  } = useSystemStore();

  if (!perfHudVisible) return null;

  const trackingColor =
    trackingStatus === 'TRACKING_ACTIVE'
      ? 'border-sage-green text-charcoal-soft bg-sage-green/20'
      : trackingStatus === 'SEARCHING' || trackingStatus === 'INITIALIZING'
      ? 'border-charcoal-soft text-charcoal-soft bg-paper-cream animate-pulse'
      : trackingStatus === 'LOST'
      ? 'border-brick-red text-brick-red bg-brick-red/10'
      : 'border-ink-muted text-ink-muted bg-paper-dark';

  return (
    <aside
      aria-label="Diagnostics HUD"
      className="fixed bottom-4 right-4 z-50 w-80 bg-paper-dark border-2 border-charcoal-soft rounded-tactile shadow-tactile-lg p-3 font-mono text-xs select-none transition-all duration-150"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-charcoal-soft/30 pb-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-brick-red animate-pulse" />
          <span className="font-bold text-[10px] uppercase tracking-technical text-charcoal-soft">
            TELEMETRY DIAGNOSTICS
          </span>
          <span className="text-[9px] px-1 py-0.2 bg-paper-cream border border-charcoal-soft rounded-[2px] text-ink-muted">
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleHudExpanded}
            className="p-1 hover:bg-paper-cream border border-charcoal-soft/30 rounded-[2px] text-charcoal-soft"
            title={hudExpanded ? 'Collapse HUD' : 'Expand HUD'}
            aria-label={hudExpanded ? 'Collapse HUD' : 'Expand HUD'}
          >
            {hudExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
          <button
            onClick={togglePerfHud}
            className="p-1 hover:bg-paper-cream border border-charcoal-soft/30 rounded-[2px] text-charcoal-soft"
            title="Close HUD"
            aria-label="Close HUD"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Primary Metrics (Always Visible) */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {/* Frame Rate */}
        <div className="border border-charcoal-soft p-1.5 bg-paper-cream">
          <div className="flex items-center justify-between text-[9px] text-ink-muted">
            <span>RENDER / TICK</span>
            <Gauge className="w-3 h-3 text-sage-green" />
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold text-charcoal-soft tabular-nums">
              {fps > 0 ? fps : '--'}
            </span>
            <span className="text-[9px] text-ink-muted">FPS</span>
          </div>
        </div>

        {/* Latency (p50 / p95) */}
        <div className="border border-charcoal-soft p-1.5 bg-paper-cream">
          <div className="flex items-center justify-between text-[9px] text-ink-muted">
            <span>LATENCY p50/p95</span>
            <Activity className="w-3 h-3 text-brick-red" />
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold text-charcoal-soft tabular-nums">
              {p50Ms > 0 ? p50Ms : '--'}
            </span>
            <span className="text-[9px] text-ink-muted">/ {p95Ms > 0 ? `${p95Ms}ms` : '--'}</span>
          </div>
        </div>
      </div>

      {/* Expanded Telemetry Section */}
      {hudExpanded && (
        <div className="space-y-1.5 text-[10px] border-t border-charcoal-soft/20 pt-2 animate-fadeIn">
          {/* Active Module & Model */}
          <div className="flex items-center justify-between">
            <span className="text-ink-muted flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-charcoal-soft" /> MODULE:
            </span>
            <span className="font-bold text-charcoal-soft truncate max-w-[150px] text-right">
              {activeModule}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-ink-muted flex items-center gap-1">
              <Layers className="w-3 h-3 text-charcoal-soft" /> MODEL:
            </span>
            <span className="font-mono text-[9px] text-charcoal-soft truncate max-w-[150px] text-right">
              {activeModel}
            </span>
          </div>

          {/* Execution Backend */}
          <div className="flex items-center justify-between">
            <span className="text-ink-muted flex items-center gap-1">
              <Cpu className="w-3 h-3" /> BACKEND:
            </span>
            <StampBadge
              label={activeBackend.toUpperCase()}
              variant={activeBackend === 'webgpu' ? 'sage' : 'charcoal'}
            />
          </div>

          {/* Tracking Status */}
          <div className="flex items-center justify-between">
            <span className="text-ink-muted flex items-center gap-1">
              <Activity className="w-3 h-3" /> TRACKING:
            </span>
            <span
              className={`px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded-[2px] border ${trackingColor}`}
            >
              {trackingStatus.replace('_', ' ')}
            </span>
          </div>

          {/* Media Stream State */}
          <div className="flex items-center justify-between">
            <span className="text-ink-muted flex items-center gap-1">
              <Camera className="w-3 h-3" /> SENSOR STREAM:
            </span>
            <span className="font-bold text-charcoal-soft">{streamStatus}</span>
          </div>

          {/* Model Load Latency */}
          {modelLoadTimeMs !== null && (
            <div className="flex items-center justify-between">
              <span className="text-ink-muted flex items-center gap-1">
                <Clock className="w-3 h-3" /> COLD START:
              </span>
              <span className="font-mono tabular-nums text-charcoal-soft font-bold">
                {modelLoadTimeMs} ms
              </span>
            </div>
          )}

          {/* Worker Queue Depth */}
          <div className="flex items-center justify-between">
            <span className="text-ink-muted flex items-center gap-1">
              <Layers className="w-3 h-3" /> QUEUE DEPTH:
            </span>
            <span className="font-bold tabular-nums">
              {workerQueueDepth} <span className="text-ink-muted text-[8px]">(MAX 1)</span>
            </span>
          </div>

          {/* Warning Banner */}
          {warningMessage && (
            <div className="mt-2 p-1.5 rounded-[2px] border border-brick-red bg-brick-red/10 text-brick-red text-[9px] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="leading-tight">{warningMessage}</span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
