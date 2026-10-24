'use client';

import React from 'react';
import { StampBadge } from './StampBadge';

export interface CrosshairViewportProps {
  children: React.ReactNode;
  isStreaming?: boolean;
  isRecording?: boolean;
  fps?: number;
  resolution?: string;
  backend?: string;
  title?: string;
  className?: string;
  controls?: React.ReactNode;
  overlayText?: string;
}

export function CrosshairViewport({
  children,
  isStreaming = false,
  isRecording = false,
  fps,
  resolution,
  backend,
  title = 'OPTICAL SENSOR FEED',
  className = '',
  controls,
  overlayText,
}: CrosshairViewportProps) {
  return (
    <div
      className={`relative flex flex-col border-2 border-charcoal-soft bg-black rounded-tactile overflow-hidden shadow-tactile ${className}`}
    >
      {/* Top Instrument Header Strip */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-paper-dark border-b-2 border-charcoal-soft font-mono text-[10px] uppercase font-bold tracking-technical text-charcoal-soft select-none z-10">
        <div className="flex items-center gap-2">
          {isRecording ? (
            <StampBadge label="REC LIVE" variant="brick" pulse />
          ) : isStreaming ? (
            <StampBadge label="FEED ACTIVE" variant="sage" />
          ) : (
            <StampBadge label="STANDBY" variant="ink" />
          )}
          <span className="truncate">{title}</span>
        </div>

        <div className="flex items-center gap-3">
          {backend && (
            <span className="hidden sm:inline-block px-1.5 py-0.5 border border-charcoal-soft bg-paper-cream text-[9px]">
              {backend}
            </span>
          )}
          {fps !== undefined && (
            <span className="tabular-nums">
              {fps.toFixed(0)} <span className="text-ink-muted">FPS</span>
            </span>
          )}
          {resolution && (
            <span className="text-ink-muted hidden md:inline-block">[{resolution}]</span>
          )}
        </div>
      </div>

      {/* Viewport Frame with Substantial Height and Mechanical Crosshairs */}
      <div className="relative flex-1 min-h-[380px] md:min-h-[460px] h-[460px] flex items-center justify-center overflow-hidden bg-[#181818]">
        {/* Render child video and canvas elements */}
        {children}

        {/* Standby Message if not streaming */}
        {!isStreaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 text-center select-none">
            <span className="font-mono text-xs font-bold uppercase tracking-technical text-sage-green mb-1">
              [ OPTICAL SENSOR FEED STANDBY ]
            </span>
            <span className="font-mono text-[10px] text-ink-muted">
              WEBCAM READY &mdash; CLICK &apos;ACTIVATE CAM&apos; OR USE &apos;SYNTHETIC MODE&apos;
            </span>
          </div>
        )}

        {/* Center Registration Crosshair */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute w-full h-[1px] bg-sage-green" />
            <div className="absolute h-full w-[1px] bg-sage-green" />
            <div className="w-2 h-2 rounded-full border border-sage-green" />
          </div>
        </div>

        {/* Corner Registration Brackets */}
        <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-sage-green/60 pointer-events-none" />
        <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-sage-green/60 pointer-events-none" />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-sage-green/60 pointer-events-none" />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-sage-green/60 pointer-events-none" />

        {/* Overlay notification banner if provided */}
        {overlayText && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-charcoal-soft/90 border border-paper-cream px-3 py-1 font-mono text-[11px] uppercase tracking-technical text-paper-cream rounded-[2px] shadow-tactile pointer-events-none z-10">
            {overlayText}
          </div>
        )}
      </div>

      {/* Bottom Instrument Controls / Ticks */}
      {controls && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-paper-cream border-t-2 border-charcoal-soft z-10">
          {controls}
        </div>
      )}
    </div>
  );
}
