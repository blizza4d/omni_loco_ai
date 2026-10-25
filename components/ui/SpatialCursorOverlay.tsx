'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useCamera } from '@/core/camera/useCamera';
import { useHandGestures } from '@/modules/hand/useHandGestures';
import { StampBadge } from './StampBadge';
import { Hand, Camera, X, Check } from 'lucide-react';

export interface SpatialCursorOverlayProps {
  isActive: boolean;
  onClose: () => void;
}

export function SpatialCursorOverlay({ isActive, onClose }: SpatialCursorOverlayProps) {
  const [cursorPos, setCursorPos] = useState<{
    x: number;
    y: number;
    isPinching: boolean;
    dwell: number;
    visible: boolean;
  }>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 400,
    isPinching: false,
    dwell: 0,
    visible: false,
  });

  const [clickedTarget, setClickedTarget] = useState<string | null>(null);
  const lastClickTimeRef = useRef<number>(0);

  const {
    videoRef,
    isStreaming,
    startCamera,
    stopCamera,
    errorMessage,
  } = useCamera({ autoStart: isActive });

  const handleFrameRender = useCallback(
    (
      landmarks: any,
      cursor: { x: number; y: number; isPinching: boolean; dwellProgress: number }
    ) => {
      if (!landmarks || landmarks.length === 0) {
        setCursorPos((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      if (typeof window === 'undefined') return;

      const screenX = Math.round(cursor.x * window.innerWidth);
      const screenY = Math.round(cursor.y * window.innerHeight);

      setCursorPos({
        x: screenX,
        y: screenY,
        isPinching: cursor.isPinching,
        dwell: cursor.dwellProgress,
        visible: true,
      });

      const now = performance.now();
      // Click trigger when pinch detected or dwell completes
      if ((cursor.isPinching || cursor.dwellProgress >= 0.98) && now - lastClickTimeRef.current > 1000) {
        lastClickTimeRef.current = now;
        const elem = document.elementFromPoint(screenX, screenY);
        if (elem) {
          const clickable = elem.closest('a, button, [tabindex="0"]') as HTMLElement | null;
          if (clickable) {
            setClickedTarget(clickable.innerText?.slice(0, 20) || 'ELEMENT');
            clickable.click();
            setTimeout(() => setClickedTarget(null), 800);
          }
        }
      }
    },
    []
  );

  const { isTracking, fps } = useHandGestures({
    videoRef,
    isActive: isActive && isStreaming,
    isMirrored: true,
    onFrameRender: handleFrameRender,
  });

  useEffect(() => {
    if (!isActive && isStreaming) {
      stopCamera();
    } else if (isActive && !isStreaming) {
      startCamera();
    }
  }, [isActive, isStreaming, startCamera, stopCamera]);

  if (!isActive) return null;

  return (
    <>
      {/* Hidden camera stream feeding inference */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
        aria-hidden="true"
      />

      {/* Floating Tactical Status Banner (Bottom-Left) */}
      <div className="fixed bottom-6 left-6 z-50 bg-paper-cream border-2 border-charcoal-soft rounded-tactile shadow-tactile-lg p-3 font-mono text-xs max-w-sm flex items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-tactile border border-charcoal-soft bg-paper-dark flex items-center justify-center">
            <Hand className="w-4 h-4 text-brick-red animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold uppercase tracking-technical text-charcoal-soft text-[11px]">
                SPATIAL CURSOR ACTIVE
              </span>
              <StampBadge
                label={isTracking ? `${fps} FPS` : 'TRACKING'}
                variant={isTracking ? 'sage' : 'brick'}
              />
            </div>
            <p className="text-[10px] text-ink-muted">
              Point index finger. Dwell on card or pinch to launch.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 border border-charcoal-soft hover:bg-paper-dark rounded-[2px]"
          title="Disable Spatial Cursor"
          aria-label="Disable Spatial Cursor"
        >
          <X className="w-3.5 h-3.5 text-charcoal-soft" />
        </button>
      </div>

      {/* Virtual Crosshair Laser Cursor on Screen */}
      {cursorPos.visible && (
        <div
          className="fixed pointer-events-none z-[9999] transition-transform duration-75 ease-out"
          style={{
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Tactical Crosshair Reticle */}
          <div className="relative w-10 h-10 flex items-center justify-center">
            {/* Center Dot */}
            <div
              className={`w-2.5 h-2.5 rounded-full border border-charcoal-soft transition-colors ${
                cursorPos.isPinching
                  ? 'bg-brick-red scale-125'
                  : cursorPos.dwell > 0.5
                  ? 'bg-sage-green scale-110'
                  : 'bg-paper-cream'
              }`}
            />

            {/* Crosshair Lines */}
            <div className="absolute w-8 h-[1px] bg-charcoal-soft opacity-60" />
            <div className="absolute h-8 w-[1px] bg-charcoal-soft opacity-60" />

            {/* Dwell Progress Radial Gauge */}
            {cursorPos.dwell > 0 && (
              <svg className="absolute inset-0 w-10 h-10 -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke="var(--sage-green, #00E599)"
                  strokeWidth="2.5"
                  strokeDasharray="100"
                  strokeDashoffset={100 - cursorPos.dwell * 100}
                  className="transition-all duration-75"
                />
              </svg>
            )}

            {/* Click Feedback Pill */}
            {clickedTarget && (
              <div className="absolute top-12 left-1/2 -translate-x-1/2 px-2 py-0.5 border border-charcoal-soft bg-paper-cream text-[9px] font-mono font-bold uppercase rounded-[2px] shadow-tactile-sm text-charcoal-soft whitespace-nowrap">
                ACTIVATED: {clickedTarget}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
