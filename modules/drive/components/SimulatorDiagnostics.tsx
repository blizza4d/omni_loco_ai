'use client';

import React from 'react';
import { VehicleState } from '../types';
import { StampBadge } from '@/components/ui/StampBadge';
import { ShieldCheck, AlertTriangle, Cpu, Radio, RotateCcw, Activity } from 'lucide-react';

export interface SimulatorDiagnosticsProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleState: VehicleState;
  detectedHandsCount: number;
  isTracking: boolean;
  fps: number;
  latencyMs: number;
  lastTrackingUpdateMs: number;
  isCalibrating: boolean;
  calibrationProgress: number;
  onRecalibrate: () => void;
}

export function SimulatorDiagnostics({
  isOpen,
  onClose,
  vehicleState,
  detectedHandsCount,
  isTracking,
  fps,
  latencyMs,
  lastTrackingUpdateMs,
  isCalibrating,
  calibrationProgress,
  onRecalibrate,
}: SimulatorDiagnosticsProps) {
  if (!isOpen) return null;

  // Normalized steering value from -1.00 to +1.00
  const normalizedSteer = Math.max(-1, Math.min(1, vehicleState.steeringAngle / 42));
  const steerDirection =
    Math.abs(vehicleState.steeringAngle) < 2
      ? 'NEUTRAL (CENTER)'
      : vehicleState.steeringAngle > 0
      ? `RIGHT (+${vehicleState.steeringAngle}°)`
      : `LEFT (${vehicleState.steeringAngle}°);`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-soft/50 backdrop-blur-[2px] font-mono select-none">
      <div className="relative w-full max-w-2xl bg-paper-cream border-2 border-charcoal-soft rounded-tactile shadow-tactile-lg p-5 max-h-[90vh] flex flex-col text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-charcoal-soft pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-brick-red" />
            <h3 className="font-bold uppercase tracking-technical text-charcoal-soft text-sm">
              SIMULATOR TELEMETRY & HARDWARE DIAGNOSTICS
            </h3>
          </div>
          <button
            onClick={onClose}
            className="px-2 py-0.5 border border-charcoal-soft rounded-[2px] hover:bg-paper-dark text-charcoal-soft font-bold"
          >
            [CLOSE ESC]
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Status Warning Banner */}
          {!isTracking && (
            <div className="p-3 bg-brick-red/10 border border-brick-red rounded-tactile flex items-center justify-between text-brick-red">
              <span className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4" />
                OPTICAL TRACKING UNAVAILABLE &mdash; VEHICLE IN SAFE COAST
              </span>
              <span className="text-[10px]">KEYBOARD OVERRIDE ACTIVE</span>
            </div>
          )}

          {/* Grid of Diagnostics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Tracking Status */}
            <div className="p-3 border border-charcoal-soft bg-paper-dark rounded-tactile space-y-1">
              <span className="text-[10px] text-ink-muted block uppercase">HAND TRACKING STATUS</span>
              <span className="font-bold text-sm block">
                {isTracking ? 'CONNECTED' : 'SEARCHING'}
              </span>
              <StampBadge
                label={isTracking ? 'SIGNAL LOCKED' : 'SIGNAL LOST'}
                variant={isTracking ? 'sage' : 'brick'}
              />
            </div>

            {/* Detected Hands */}
            <div className="p-3 border border-charcoal-soft bg-paper-dark rounded-tactile space-y-1">
              <span className="text-[10px] text-ink-muted block uppercase">HANDS DETECTED</span>
              <span className="font-bold text-sm block tabular-nums">
                {detectedHandsCount === 2
                  ? '2 (DUAL WHEEL)'
                  : detectedHandsCount === 1
                  ? '1 (PALM TILT)'
                  : '0 (NO HANDS)'}
              </span>
              <span className="text-[10px] text-ink-muted">
                {detectedHandsCount === 2
                  ? 'Dual-wrist tilt matrix active'
                  : detectedHandsCount === 1
                  ? 'Single hand tilt fallback'
                  : 'Awaiting hand entry'}
              </span>
            </div>

            {/* Frame Timing */}
            <div className="p-3 border border-charcoal-soft bg-paper-dark rounded-tactile space-y-1">
              <span className="text-[10px] text-ink-muted block uppercase">FRAME TIMING</span>
              <span className="font-bold text-sm block tabular-nums text-sage-green">
                {fps} FPS
              </span>
              <span className="text-[10px] text-ink-muted">INFERENCE LATENCY: {latencyMs}ms</span>
            </div>

            {/* Normalized Input */}
            <div className="p-3 border border-charcoal-soft bg-paper-dark rounded-tactile space-y-1">
              <span className="text-[10px] text-ink-muted block uppercase">NORMALIZED INPUT</span>
              <span className="font-bold text-sm block tabular-nums">
                {normalizedSteer > 0 ? `+${normalizedSteer.toFixed(2)}` : normalizedSteer.toFixed(2)}
              </span>
              <span className="text-[10px] text-ink-muted">RANGE: [-1.00 to +1.00]</span>
            </div>

            {/* Steering Direction */}
            <div className="p-3 border border-charcoal-soft bg-paper-dark rounded-tactile space-y-1">
              <span className="text-[10px] text-ink-muted block uppercase">STEER ORIENTATION</span>
              <span className="font-bold text-sm block text-charcoal-soft">
                {steerDirection}
              </span>
              <span className="text-[10px] text-ink-muted">DEADZONE: &plusmn;4.0&deg;</span>
            </div>

            {/* Control Source */}
            <div className="p-3 border border-charcoal-soft bg-paper-dark rounded-tactile space-y-1">
              <span className="text-[10px] text-ink-muted block uppercase">CONTROL SOURCE</span>
              <span className="font-bold text-sm block text-brick-red">
                {vehicleState.controlSource}
              </span>
              <span className="text-[10px] text-ink-muted">
                {vehicleState.controlSource === 'GESTURE' ? 'Camera Optical' : 'WASD Keyboard'}
              </span>
            </div>
          </div>

          {/* Live Synchronized Steering Indicator Visualizer */}
          <div className="p-4 border-2 border-charcoal-soft bg-paper-dark rounded-tactile flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 max-w-sm">
              <span className="font-bold uppercase tracking-technical text-charcoal-soft block">
                LIVE PHYSICAL STEERING ANGLE GAUGE
              </span>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                This indicator reflects the EXACT floating-point angular control input currently steering the vehicle simulation in Three.js.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={onRecalibrate}
                  className="px-2.5 py-1 bg-paper-cream border border-charcoal-soft hover:bg-paper-dark rounded-[2px] font-bold text-[10px] uppercase flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>RECENTER NEUTRAL STEERING</span>
                </button>
              </div>
            </div>

            {/* SVG Steering Wheel */}
            <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full transition-transform duration-75"
                style={{ transform: `rotate(${vehicleState.steeringAngle}deg)` }}
              >
                {/* Outer Wheel Rim */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-charcoal-soft"
                />
                {/* 12 o'clock Apex Marker */}
                <rect x="47" y="5" width="6" height="8" fill="#00E599" rx="1" />
                {/* Center Hub */}
                <circle cx="50" cy="50" r="14" fill="#3A3A3A" />
                <circle cx="50" cy="50" r="5" fill="#FF3B30" />
                {/* Left and Right Spokes */}
                <line x1="8" y1="50" x2="36" y2="50" stroke="#3A3A3A" strokeWidth="6" />
                <line x1="64" y1="50" x2="92" y2="50" stroke="#3A3A3A" strokeWidth="6" />
                <line x1="50" y1="64" x2="50" y2="92" stroke="#3A3A3A" strokeWidth="6" />
              </svg>
            </div>
          </div>

          {/* Keyboard Controls Reference */}
          <div className="p-3 border border-charcoal-soft/40 bg-paper-cream-dark/30 rounded-tactile text-xs space-y-1">
            <span className="font-bold text-charcoal-soft uppercase block">
              OPERATOR KEYBOARD OVERRIDES (ACTIVE AT ALL TIMES):
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] pt-1 text-ink-muted">
              <div><kbd className="px-1 border border-charcoal-soft bg-paper-cream rounded-[2px] font-bold">A / &larr;</kbd> Steer Left</div>
              <div><kbd className="px-1 border border-charcoal-soft bg-paper-cream rounded-[2px] font-bold">D / &rarr;</kbd> Steer Right</div>
              <div><kbd className="px-1 border border-charcoal-soft bg-paper-cream rounded-[2px] font-bold">W / &uarr;</kbd> Throttle</div>
              <div><kbd className="px-1 border border-charcoal-soft bg-paper-cream rounded-[2px] font-bold">S / &darr;</kbd> Brake</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
