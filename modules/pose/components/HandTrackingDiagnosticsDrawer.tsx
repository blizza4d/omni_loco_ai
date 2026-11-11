'use client';

import React from 'react';
import { Landmark3D } from '../../hand/types';
import {
  GoofyHandGestureType,
  HandRecognitionState,
  ActiveSequenceState,
  CustomClassificationResult,
} from '../goofy-types';
import { Button } from '@/components/ui/Button';
import {
  X,
  Activity,
  Terminal,
  Cpu,
  Zap,
  CheckCircle2,
  AlertCircle,
  Eye,
  Hand,
  Clock,
  Layers,
} from 'lucide-react';

interface HandTrackingDiagnosticsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  latencyMs: number;
  fps: number;
  handCount: number;
  leftHandLandmarks: Landmark3D[] | null;
  rightHandLandmarks: Landmark3D[] | null;
  leftDiagnostics: {
    raw: GoofyHandGestureType | null;
    stabilized: GoofyHandGestureType | null;
    state: HandRecognitionState;
    holdDurationMs: number;
    confidence: number;
    rejectionReason: string | null;
    landmarksValid: boolean;
    customResult?: CustomClassificationResult | null;
  };
  rightDiagnostics: {
    raw: GoofyHandGestureType | null;
    stabilized: GoofyHandGestureType | null;
    state: HandRecognitionState;
    holdDurationMs: number;
    confidence: number;
    rejectionReason: string | null;
    landmarksValid: boolean;
    customResult?: CustomClassificationResult | null;
  };
  activeSequence: ActiveSequenceState | null;
  showFingertipMarkers: boolean;
  onToggleFingertipMarkers: (val: boolean) => void;
}

export function HandTrackingDiagnosticsDrawer({
  isOpen,
  onClose,
  latencyMs,
  fps,
  handCount,
  leftHandLandmarks,
  rightHandLandmarks,
  leftDiagnostics,
  rightDiagnostics,
  activeSequence,
  showFingertipMarkers,
  onToggleFingertipMarkers,
}: HandTrackingDiagnosticsDrawerProps) {
  if (!isOpen) return null;

  const getTrackingStatusLabel = () => {
    if (handCount === 0) return { label: 'NO HANDS DETECTED', color: 'text-amber-500 bg-amber-100 border-amber-300' };
    if (!leftDiagnostics.landmarksValid && !rightDiagnostics.landmarksValid) {
      return { label: 'LANDMARKS INVALID', color: 'text-rose-600 bg-rose-100 border-rose-300' };
    }
    return { label: 'TRACKING SYNCHRONIZED (3D)', color: 'text-emerald-700 bg-emerald-100 border-emerald-300' };
  };

  const status = getTrackingStatusLabel();

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-paper-cream border-l-4 border-charcoal-dark shadow-2xl font-mono text-xs flex flex-col">
      {/* Header */}
      <div className="p-3.5 border-b-2 border-charcoal-soft flex items-center justify-between bg-charcoal-dark text-paper-cream">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h3 className="font-black text-xs uppercase tracking-wider">
            HAND TRACKING & GESTURE DIAGNOSTICS
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded text-paper-cream transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Telemetry Strip */}
      <div className="p-2.5 bg-paper-dark/20 border-b border-charcoal-soft/30 flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-ink-muted">FPS:</span>
          <span className="font-black text-charcoal-dark">{fps}</span>
          <span className="text-charcoal-soft/30">&bull;</span>
          <span className="font-bold text-ink-muted">LATENCY:</span>
          <span className="font-black text-cyan-700">{latencyMs.toFixed(1)}ms</span>
        </div>

        <div className={`px-2 py-0.5 rounded border font-black text-[9px] ${status.color}`}>
          {status.label}
        </div>
      </div>

      {/* Content Container */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {/* Sequence Progress State Indicator (Phase 2 Requirement) */}
        {activeSequence && (
          <div className="p-3 rounded-tactile border-2 border-amber-500 bg-amber-50 space-y-2 shadow-sm">
            <div className="flex items-center justify-between border-b border-amber-300 pb-1.5">
              <span className="font-black uppercase text-amber-900 flex items-center gap-1.5 text-xs">
                <Zap className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
                SEQUENCE IN PROGRESS: {activeSequence.sequenceLabel}
              </span>
              <span className="text-[10px] font-black text-amber-800 bg-amber-200 px-1.5 py-0.5 rounded">
                {activeSequence.progressPercent}%
              </span>
            </div>

            {/* Step-by-step checkmark progression display */}
            <div className="space-y-1 text-[11px] font-bold">
              {activeSequence.steps.map((st) => (
                <div
                  key={st.stepIndex}
                  className={`p-1.5 rounded flex items-center justify-between border ${
                    st.isCompleted
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-400 font-black'
                      : st.stepIndex === activeSequence.currentStepIndex
                      ? 'bg-amber-100 text-amber-900 border-amber-400 animate-pulse'
                      : 'bg-paper-dark/15 text-ink-muted border-charcoal-soft/20'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{st.icon}</span>
                    <span>
                      STEP {st.stepIndex + 1}: {st.label} {st.handedness !== 'Any' ? `(${st.handedness})` : ''}
                    </span>
                  </div>
                  <span>{st.isCompleted ? '✓ CONFIRMED' : st.stepIndex === activeSequence.currentStepIndex ? '...AWAITING' : 'PENDING'}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-[10px] text-amber-800 pt-1 font-bold">
              <span>TIME REMAINING: {activeSequence.timeRemainingMs}ms</span>
              <span>WINDOW: {activeSequence.maxWindowMs}ms</span>
            </div>
          </div>
        )}

        {/* Right Hand Diagnostics Card */}
        <div className="p-3 rounded border-2 border-charcoal-soft bg-paper-cream space-y-2">
          <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-1.5">
            <span className="font-extrabold uppercase text-xs text-charcoal-dark flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              RIGHT HAND
            </span>
            <span
              className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                rightDiagnostics.state === 'CONFIRMED' || rightDiagnostics.state === 'TRIGGERED'
                  ? 'bg-emerald-500 text-white'
                  : rightDiagnostics.state === 'CANDIDATE'
                  ? 'bg-amber-400 text-charcoal-dark'
                  : 'bg-paper-dark/30 text-ink-muted'
              }`}
            >
              {rightDiagnostics.state}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-ink-muted text-[10px] block">RAW CLASSIFICATION:</span>
              <span className="font-black text-charcoal-dark">{rightDiagnostics.raw || 'NONE'}</span>
            </div>
            <div>
              <span className="text-ink-muted text-[10px] block">STABILIZED GESTURE:</span>
              <span className="font-black text-cyan-700">{rightDiagnostics.stabilized || 'NONE'}</span>
            </div>
            <div>
              <span className="text-ink-muted text-[10px] block">CUSTOM CLASSIFIER:</span>
              <span className="font-black text-emerald-700">
                {rightDiagnostics.customResult?.isMatch
                  ? `${rightDiagnostics.customResult.label} (${Math.round(rightDiagnostics.customResult.confidence * 100)}%)`
                  : 'UNKNOWN / NO MATCH'}
              </span>
            </div>
            <div>
              <span className="text-ink-muted text-[10px] block">HOLD TIME:</span>
              <span className="font-black">{rightDiagnostics.holdDurationMs}ms</span>
            </div>
          </div>

          {rightDiagnostics.rejectionReason && (
            <div className="p-1.5 rounded bg-paper-dark/20 text-[10px] text-ink-muted truncate">
              <span>GATE REJECTION: </span>
              <span className="font-mono text-charcoal-dark">{rightDiagnostics.rejectionReason}</span>
            </div>
          )}
        </div>

        {/* Left Hand Diagnostics Card */}
        <div className="p-3 rounded border-2 border-charcoal-soft bg-paper-cream space-y-2">
          <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-1.5">
            <span className="font-extrabold uppercase text-xs text-purple-900 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              LEFT HAND
            </span>
            <span
              className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                leftDiagnostics.state === 'CONFIRMED' || leftDiagnostics.state === 'TRIGGERED'
                  ? 'bg-emerald-500 text-white'
                  : leftDiagnostics.state === 'CANDIDATE'
                  ? 'bg-amber-400 text-charcoal-dark'
                  : 'bg-paper-dark/30 text-ink-muted'
              }`}
            >
              {leftDiagnostics.state}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-ink-muted text-[10px] block">RAW CLASSIFICATION:</span>
              <span className="font-black text-charcoal-dark">{leftDiagnostics.raw || 'NONE'}</span>
            </div>
            <div>
              <span className="text-ink-muted text-[10px] block">STABILIZED GESTURE:</span>
              <span className="font-black text-purple-700">{leftDiagnostics.stabilized || 'NONE'}</span>
            </div>
            <div>
              <span className="text-ink-muted text-[10px] block">CUSTOM CLASSIFIER:</span>
              <span className="font-black text-emerald-700">
                {leftDiagnostics.customResult?.isMatch
                  ? `${leftDiagnostics.customResult.label} (${Math.round(leftDiagnostics.customResult.confidence * 100)}%)`
                  : 'UNKNOWN / NO MATCH'}
              </span>
            </div>
            <div>
              <span className="text-ink-muted text-[10px] block">HOLD TIME:</span>
              <span className="font-black">{leftDiagnostics.holdDurationMs}ms</span>
            </div>
          </div>

          {leftDiagnostics.rejectionReason && (
            <div className="p-1.5 rounded bg-paper-dark/20 text-[10px] text-ink-muted truncate">
              <span>GATE REJECTION: </span>
              <span className="font-mono text-charcoal-dark">{leftDiagnostics.rejectionReason}</span>
            </div>
          )}
        </div>

        {/* Visual Inspection Controls */}
        <div className="p-3 bg-paper-dark/20 rounded border border-charcoal-soft/30 space-y-2">
          <span className="font-black uppercase text-[10px] text-charcoal-dark block">
            VISUAL OVERLAY DEBUGGING
          </span>
          <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-charcoal-dark">
            <input
              type="checkbox"
              checked={showFingertipMarkers}
              onChange={(e) => onToggleFingertipMarkers(e.target.checked)}
              className="accent-cyan-600 w-4 h-4"
            />
            <span>RENDER FINGERTIP COLOR HIGHLIGHTS</span>
          </label>
        </div>
      </div>
    </div>
  );
}
