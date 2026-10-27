'use client';

import React, { useEffect, useState } from 'react';
import { GazeCalibrationEngine } from '@/modules/gaze/calibration';
import { Button } from '@/components/ui/Button';
import { StampBadge } from '@/components/ui/StampBadge';
import { Target, CheckCircle2, RotateCcw, X, ShieldAlert, Sparkles, Compass } from 'lucide-react';

interface GazeCalibrationModalProps {
  isOpen: boolean;
  engine: GazeCalibrationEngine;
  onClose: () => void;
  onCalibrationComplete: () => void;
}

export function GazeCalibrationModal({
  isOpen,
  engine,
  onClose,
  onCalibrationComplete,
}: GazeCalibrationModalProps) {
  const [completed, setCompleted] = useState(false);
  const [activeTarget, setActiveTarget] = useState(engine.getActiveTarget());
  const [activeTargetIndex, setActiveTargetIndex] = useState(engine.getActiveTargetIndex());
  const [sampleCount, setSampleCount] = useState(0);
  const [accuracy, setAccuracy] = useState(engine.getAccuracy());

  // Listen for Spacebar or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        engine.cancelCalibration();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, engine, onClose]);

  // Sync active target state with engine in rapid poll
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const current = engine.getActiveTarget();
      const currentIndex = engine.getActiveTargetIndex();
      setActiveTarget(current);
      setActiveTargetIndex(currentIndex);
      setSampleCount(current?.sampleCount || 0);

      if (engine.isReady() && !completed) {
        setCompleted(true);
        setAccuracy(engine.getAccuracy());
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isOpen, engine, completed]);

  if (!isOpen) return null;

  const handleStart = () => {
    setCompleted(false);
    engine.startCalibration();
    setActiveTarget(engine.getActiveTarget());
    setActiveTargetIndex(0);
    setSampleCount(0);
  };

  const handleReset = () => {
    engine.resetCalibration();
    setCompleted(false);
    setActiveTarget(null);
    setAccuracy(engine.getAccuracy());
  };

  return (
    <div className="fixed inset-0 z-50 bg-paper-cream/95 backdrop-blur-md font-mono flex flex-col justify-between p-4 md:p-6 select-none animate-in fade-in duration-200">
      {/* Top Technical Control Header */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between border-b-2 border-charcoal-soft pb-3">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-brick-red animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-technical text-charcoal-soft">
                9-POINT OCULAR GAZE CALIBRATION
              </span>
              <StampBadge
                label={completed ? 'CALIBRATION LOCKED' : `TARGET 0${activeTargetIndex + 1} / 09`}
                variant={completed ? 'sage' : 'brick'}
              />
            </div>
            <p className="text-[11px] text-ink-muted">
              {completed
                ? 'Polynomial Ridge Regression solved. Eye geometry mapped to viewport coordinates.'
                : 'Look steadily at the highlighted dot. Hold your gaze fixed until the ring fills.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              engine.cancelCalibration();
              onClose();
            }}
            className="gap-1 text-xs"
          >
            <X className="w-3.5 h-3.5" />
            <span>DISMISS [ESC]</span>
          </Button>
        </div>
      </div>

      {/* Main Viewport Target Canvas */}
      <div className="relative flex-1 w-full max-w-6xl mx-auto my-4 border-2 border-dashed border-charcoal-soft/40 rounded-tactile overflow-hidden bg-paper-cream-dark/30">
        {!completed && activeTarget && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 pointer-events-none"
            style={{
              left: `${activeTarget.normX * 100}%`,
              top: `${activeTarget.normY * 100}%`,
            }}
          >
            {/* Concentric Pulsing Radar Rings */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-brick-red/50 animate-ping" />
              <div className="absolute inset-1 rounded-full border border-brick-red/30 animate-pulse" />

              {/* SVG Circular Progress Meter (22 samples target) */}
              <svg className="w-16 h-16 -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="24"
                  fill="none"
                  stroke="rgba(0, 0, 0, 0.15)"
                  strokeWidth="3"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="24"
                  fill="none"
                  stroke="#FF2A10"
                  strokeWidth="3.5"
                  strokeDasharray={2 * Math.PI * 24}
                  strokeDashoffset={2 * Math.PI * 24 * (1 - Math.min(1, sampleCount / 22))}
                  strokeLinecap="round"
                  className="transition-all duration-75"
                />
              </svg>

              {/* Center Bullseye Reticle */}
              <div className="absolute w-3.5 h-3.5 bg-brick-red rounded-full shadow-[0_0_12px_rgba(255,42,16,0.8)] flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>

            {/* Micro Tag Below Target */}
            <div className="absolute top-16 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 bg-black/80 text-paper-cream text-[9px] font-bold rounded-[2px]">
              LOOK HERE [{sampleCount}/22]
            </div>
          </div>
        )}

        {/* Completion Result Screen */}
        {completed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-paper-cream/90 backdrop-blur-sm animate-in zoom-in-95 duration-200">
            <div className="max-w-md w-full border-2 border-charcoal-soft bg-paper-dark p-6 rounded-tactile shadow-tactile-lg text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-sage-green/20 border-2 border-sage-green flex items-center justify-center text-sage-green">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <span className="text-xs font-bold text-ink-muted uppercase">
                  CALIBRATION COMPLETE // 9 OF 9 REGIONS SAMPLED
                </span>
                <h3 className="text-xl font-bold uppercase tracking-technical text-charcoal-soft mt-1">
                  VIEWPORT MAPPING LOCKED
                </h3>
              </div>

              {/* Accuracy Benchmarks Card */}
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="p-3 border border-charcoal-soft/40 bg-paper-cream rounded-[2px]">
                  <span className="text-[10px] text-ink-muted block uppercase">MEAN RESIDUAL ERROR</span>
                  <span className="text-xl font-bold text-charcoal-soft tabular-nums">
                    {accuracy.errorPx} px
                  </span>
                  <span className="text-[9px] text-sage-green block mt-0.5 font-bold">
                    &plusmn;{accuracy.errorDeg}&deg; VISUAL ANGLE
                  </span>
                </div>

                <div className="p-3 border border-charcoal-soft/40 bg-paper-cream rounded-[2px]">
                  <span className="text-[10px] text-ink-muted block uppercase">POLYNOMIAL R² SCORE</span>
                  <span className="text-xl font-bold text-charcoal-soft tabular-nums">
                    {(accuracy.r2Score * 100).toFixed(1)}%
                  </span>
                  <span className="text-[9px] text-ink-muted block mt-0.5">
                    10-DOF RIDGE FIT
                  </span>
                </div>
              </div>

              <div className="p-2.5 border border-charcoal-soft/30 bg-paper-cream/60 rounded-[2px] text-[10px] text-ink-muted text-left flex items-start gap-2">
                <Compass className="w-4 h-4 shrink-0 text-charcoal-soft mt-0.5" />
                <span>
                  Calibration is stored in local browser memory. Accuracy is optimal when maintaining your current head distance and room illumination.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    onCalibrationComplete();
                    onClose();
                  }}
                  className="flex-1 py-2 font-bold"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>ENGAGE GAZE CURSOR</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStart}
                  className="gap-1 py-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RECALIBRATE</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Technical Status Bar */}
      <div className="w-full max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs border-t-2 border-charcoal-soft pt-3">
        <div className="flex items-center gap-4 text-ink-muted text-[11px]">
          <span>HEAD DISTANCE: ~50-65 CM RECOMMENDED</span>
          <span>LIGHTING: DIRECT FRONTAL ILLUMINATION</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1 text-xs">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET CALIBRATION DATA</span>
          </Button>

          {!completed && (
            <Button variant="brick" size="sm" onClick={handleStart} className="gap-1 text-xs">
              <Target className="w-3.5 h-3.5" />
              <span>RESTART 9-POINT SEQUENCE</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
