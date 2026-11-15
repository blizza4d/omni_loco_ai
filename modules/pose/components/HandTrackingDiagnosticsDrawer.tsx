'use client';

import React from 'react';
import { Landmark3D } from '../../hand/types';
import {
  GoofyHandGestureType,
  HandRecognitionState,
  ActiveSequenceState,
  CustomClassificationResult,
} from '../goofy-types';
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
  Smile,
  Sliders,
  Sparkles,
} from 'lucide-react';

export interface HandTrackingDiagnosticsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  latencyMs: number;
  faceLatencyMs?: number;
  handLatencyMs?: number;
  fps: number;
  backend?: string;
  handCount: number;
  faceCount?: number;
  leftHandLandmarks: Landmark3D[] | null;
  rightHandLandmarks: Landmark3D[] | null;
  faceLandmarks?: any[] | null;
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
  faceDiagnostics?: {
    raw: string | null;
    stabilized: string | null;
    state: string;
    holdDurationMs: number;
    confidence: number;
    rejectionReason: string | null;
    landmarksValid: boolean;
    rawScores?: Record<string, number>;
  };
  multimodalDiagnostics?: {
    operatingMode: string;
    fusionWindowMs: number;
    lastEventId?: string;
    lastModality?: string;
    lastCombo?: string;
    lastMemeTitle?: string;
    lastRejectionReason?: string | null;
  };
  activeSequence: ActiveSequenceState | null;
  showFingertipMarkers: boolean;
  onToggleFingertipMarkers: (val: boolean) => void;
  showFaceMesh?: boolean;
  onToggleFaceMesh?: (val: boolean) => void;
  showFaceOverlay?: boolean;
  onToggleFaceOverlay?: (val: boolean) => void;
  showHandOverlay?: boolean;
  onToggleHandOverlay?: (val: boolean) => void;
}

export function HandTrackingDiagnosticsDrawer({
  isOpen,
  onClose,
  latencyMs,
  faceLatencyMs = 0,
  handLatencyMs = 0,
  fps,
  backend = 'WebGPU / WASM',
  handCount,
  faceCount = 0,
  leftDiagnostics,
  rightDiagnostics,
  faceDiagnostics,
  multimodalDiagnostics,
  activeSequence,
  showFingertipMarkers,
  onToggleFingertipMarkers,
  showFaceMesh = false,
  onToggleFaceMesh,
  showFaceOverlay = true,
  onToggleFaceOverlay,
  showHandOverlay = true,
  onToggleHandOverlay,
}: HandTrackingDiagnosticsDrawerProps) {
  if (!isOpen) return null;

  const isFaceValid = faceDiagnostics?.landmarksValid ?? faceCount > 0;
  const isHandValid = leftDiagnostics.landmarksValid || rightDiagnostics.landmarksValid;

  const getOverallStatus = () => {
    if (isFaceValid && isHandValid) {
      return { label: 'MULTIMODAL SYNCHRONIZED', color: 'text-emerald-700 bg-emerald-100 border-emerald-300' };
    }
    if (isFaceValid) {
      return { label: 'FACE TRACKING SYNCHRONIZED', color: 'text-cyan-700 bg-cyan-100 border-cyan-300' };
    }
    if (isHandValid) {
      return { label: 'HAND TRACKING SYNCHRONIZED', color: 'text-purple-700 bg-purple-100 border-purple-300' };
    }
    return { label: 'AWAITING USER PERCEPTION', color: 'text-amber-700 bg-amber-100 border-amber-300' };
  };

  const status = getOverallStatus();
  const rawFaceScores = faceDiagnostics?.rawScores || {};

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] bg-paper-cream border-l-4 border-charcoal-dark shadow-2xl font-mono text-xs flex flex-col">
      {/* Header */}
      <div className="p-3.5 border-b-2 border-charcoal-soft flex items-center justify-between bg-charcoal-dark text-paper-cream">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h3 className="font-black text-xs uppercase tracking-wider">
            MULTIMODAL ACCURACY & DIAGNOSTICS WORKSPACE
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded text-paper-cream transition-colors cursor-pointer"
          aria-label="Close diagnostics drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Telemetry Strip */}
      <div className="p-2.5 bg-paper-dark/20 border-b border-charcoal-soft/30 flex items-center justify-between text-[10px] flex-wrap gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-ink-muted">FPS:</span>
          <span className="font-black text-charcoal-dark">{fps}</span>
          <span className="text-charcoal-soft/30">&bull;</span>
          <span className="font-bold text-ink-muted">FACE LAT:</span>
          <span className="font-black text-cyan-700">{faceLatencyMs > 0 ? `${faceLatencyMs.toFixed(1)}ms` : 'N/A'}</span>
          <span className="text-charcoal-soft/30">&bull;</span>
          <span className="font-bold text-ink-muted">HAND LAT:</span>
          <span className="font-black text-purple-700">{handLatencyMs > 0 ? `${handLatencyMs.toFixed(1)}ms` : 'N/A'}</span>
          <span className="text-charcoal-soft/30">&bull;</span>
          <span className="font-bold text-ink-muted">DEV:</span>
          <span className="font-black text-charcoal-dark">{backend}</span>
        </div>

        <div className={`px-2 py-0.5 rounded border font-black text-[9px] ${status.color}`}>
          {status.label}
        </div>
      </div>

      {/* Content Container */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {/* 1. Multimodal Event Engine Card */}
        {multimodalDiagnostics && (
          <div className="p-3 rounded border-2 border-amber-600/40 bg-amber-50/60 space-y-2">
            <div className="flex items-center justify-between border-b border-amber-300 pb-1.5">
              <span className="font-black uppercase text-xs text-amber-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                MULTIMODAL FUSION ENGINE
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded font-black uppercase bg-amber-200 text-amber-900 border border-amber-300">
                MODE: {multimodalDiagnostics.operatingMode}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-ink-muted text-[10px] block">FUSION WINDOW:</span>
                <span className="font-black text-charcoal-dark">{multimodalDiagnostics.fusionWindowMs}ms</span>
              </div>
              <div>
                <span className="text-ink-muted text-[10px] block">ACTIVE MODALITY:</span>
                <span className="font-black text-amber-800">{multimodalDiagnostics.lastModality || 'STANDBY'}</span>
              </div>
              <div>
                <span className="text-ink-muted text-[10px] block">LATEST COMBO:</span>
                <span className="font-black text-emerald-700">{multimodalDiagnostics.lastCombo || 'NONE'}</span>
              </div>
              <div>
                <span className="text-ink-muted text-[10px] block">MATCHED MEME:</span>
                <span className="font-black text-charcoal-dark truncate block">
                  {multimodalDiagnostics.lastMemeTitle || 'NONE'}
                </span>
              </div>
            </div>

            {multimodalDiagnostics.lastRejectionReason && (
              <div className="p-1.5 rounded bg-amber-100/70 border border-amber-200 text-[10px] text-amber-900">
                <span className="font-bold">FUSION GATE: </span>
                <span className="font-mono">{multimodalDiagnostics.lastRejectionReason}</span>
              </div>
            )}
          </div>
        )}

        {/* 2. Face Recognition & Blendshapes Card */}
        <div className="p-3 rounded border-2 border-cyan-600/40 bg-cyan-50/50 space-y-2">
          <div className="flex items-center justify-between border-b border-cyan-300 pb-1.5">
            <span className="font-black uppercase text-xs text-cyan-900 flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 text-cyan-700" />
              FACE EXPRESSION DIAGNOSTICS (478 LANDMARKS)
            </span>
            <span
              className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                faceDiagnostics?.state === 'EXPRESSION_TRIGGERED'
                  ? 'bg-emerald-500 text-white'
                  : faceDiagnostics?.state === 'EXPRESSION_RECOGNIZED'
                  ? 'bg-cyan-500 text-white'
                  : isFaceValid
                  ? 'bg-cyan-200 text-cyan-900 border border-cyan-300'
                  : 'bg-paper-dark/30 text-ink-muted'
              }`}
            >
              {faceDiagnostics?.state || (isFaceValid ? 'FACE_DETECTED' : 'NO_FACE')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-ink-muted text-[10px] block">RAW EXPRESSION:</span>
              <span className="font-black text-charcoal-dark">{faceDiagnostics?.raw || 'NEUTRAL'}</span>
            </div>
            <div>
              <span className="text-ink-muted text-[10px] block">STABILIZED PATTERN:</span>
              <span className="font-black text-cyan-800">{faceDiagnostics?.stabilized || 'NEUTRAL'}</span>
            </div>
            <div>
              <span className="text-ink-muted text-[10px] block">CONFIDENCE / HOLD:</span>
              <span className="font-black">
                {faceDiagnostics?.confidence ? `${Math.round(faceDiagnostics.confidence * 100)}%` : '0%'} &bull; {faceDiagnostics?.holdDurationMs || 0}ms
              </span>
            </div>
            <div>
              <span className="text-ink-muted text-[10px] block">LANDMARKS VALID:</span>
              <span className={`font-black ${isFaceValid ? 'text-emerald-700' : 'text-rose-600'}`}>
                {isFaceValid ? 'YES (478 3D PTS)' : 'NO / MISSING'}
              </span>
            </div>
          </div>

          {/* Raw Blendshape Telemetry Bars */}
          {Object.keys(rawFaceScores).length > 0 && (
            <div className="pt-2 border-t border-cyan-200 space-y-1.5">
              <span className="text-[10px] font-black uppercase text-cyan-900 block">
                ARKit Blendshape Feature Meters
              </span>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {[
                  { label: 'Smile Avg', val: rawFaceScores['smileAvg'] || 0 },
                  { label: 'Jaw Open', val: rawFaceScores['jawOpen'] || 0 },
                  { label: 'Brow Up', val: rawFaceScores['browUpAvg'] || 0 },
                  { label: 'Eyes Wide', val: rawFaceScores['eyeWideAvg'] || 0 },
                  { label: 'Eye Blink', val: rawFaceScores['blinkAvg'] || 0 },
                  { label: 'Frown', val: rawFaceScores['frownScore'] || 0 },
                  { label: 'Lip Pucker', val: rawFaceScores['mouthPucker'] || 0 },
                  { label: 'Cheek Raise', val: rawFaceScores['cheekRaiseAvg'] || 0 },
                ].map(({ label, val }) => (
                  <div key={label} className="space-y-0.5">
                    <div className="flex justify-between text-ink-muted text-[9px]">
                      <span>{label}</span>
                      <span className="font-mono font-bold">{(val * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-cyan-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-600 rounded-full transition-all duration-75"
                        style={{ width: `${Math.min(100, Math.max(0, val * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {faceDiagnostics?.rejectionReason && (
            <div className="p-1.5 rounded bg-cyan-100/60 border border-cyan-200 text-[10px] text-cyan-900 truncate">
              <span className="font-bold">FACE GATE: </span>
              <span className="font-mono">{faceDiagnostics.rejectionReason}</span>
            </div>
          )}
        </div>

        {/* 3. Hand Tracking Diagnostics Card - Right Hand */}
        <div className="p-3 rounded border-2 border-charcoal-soft bg-paper-cream space-y-2">
          <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-1.5">
            <span className="font-extrabold uppercase text-xs text-charcoal-dark flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              RIGHT HAND (21 LANDMARKS)
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

        {/* 4. Hand Tracking Diagnostics Card - Left Hand */}
        <div className="p-3 rounded border-2 border-charcoal-soft bg-paper-cream space-y-2">
          <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-1.5">
            <span className="font-extrabold uppercase text-xs text-purple-900 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              LEFT HAND (21 LANDMARKS)
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

        {/* 5. Sequence Progress Indicator */}
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

        {/* 6. Visual Inspection Controls */}
        <div className="p-3 bg-paper-dark/20 rounded border border-charcoal-soft/30 space-y-2.5">
          <span className="font-black uppercase text-[10px] text-charcoal-dark block">
            VISUAL OVERLAY & MESH CONTROLS
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {onToggleFaceOverlay && (
              <label className="flex items-center gap-2 cursor-pointer font-bold text-charcoal-dark">
                <input
                  type="checkbox"
                  checked={showFaceOverlay}
                  onChange={(e) => onToggleFaceOverlay(e.target.checked)}
                  className="accent-cyan-600 w-4 h-4"
                />
                <span>FACE LANDMARKS</span>
              </label>
            )}

            {onToggleFaceMesh && (
              <label className="flex items-center gap-2 cursor-pointer font-bold text-charcoal-dark">
                <input
                  type="checkbox"
                  checked={showFaceMesh}
                  onChange={(e) => onToggleFaceMesh(e.target.checked)}
                  className="accent-cyan-600 w-4 h-4"
                />
                <span>FACE MESH WIREFRAME</span>
              </label>
            )}

            {onToggleHandOverlay && (
              <label className="flex items-center gap-2 cursor-pointer font-bold text-charcoal-dark">
                <input
                  type="checkbox"
                  checked={showHandOverlay}
                  onChange={(e) => onToggleHandOverlay(e.target.checked)}
                  className="accent-purple-600 w-4 h-4"
                />
                <span>HAND SKELETON</span>
              </label>
            )}

            <label className="flex items-center gap-2 cursor-pointer font-bold text-charcoal-dark">
              <input
                type="checkbox"
                checked={showFingertipMarkers}
                onChange={(e) => onToggleFingertipMarkers(e.target.checked)}
                className="accent-cyan-600 w-4 h-4"
              />
              <span>FINGERTIP HIGHLIGHTS</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
