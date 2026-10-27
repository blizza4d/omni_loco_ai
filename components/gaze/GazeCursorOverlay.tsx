'use client';

import React from 'react';
import { GazeCursorState } from '@/modules/gaze/gaze-cursor-controller';
import { GazeCursorConfig } from '@/modules/gaze/types';

interface GazeCursorOverlayProps {
  cursorState: GazeCursorState;
  config: GazeCursorConfig;
}

export function GazeCursorOverlay({ cursorState, config }: GazeCursorOverlayProps) {
  if (!config.enabled || !config.visible || !cursorState.isTracking) {
    return null;
  }

  const { x, y, dwellProgress, dwellTargetName, dwellLocked, trail, isCalibrated } = cursorState;

  // Color scheme mappings
  const getColorStyles = () => {
    switch (config.colorScheme) {
      case 'SAGE':
        return {
          stroke: '#00E599',
          fill: '#00E599',
          rgbaGlow: 'rgba(0, 229, 153, 0.4)',
          text: 'text-sage-green',
        };
      case 'CYAN':
        return {
          stroke: '#06B6D4',
          fill: '#06B6D4',
          rgbaGlow: 'rgba(6, 182, 212, 0.4)',
          text: 'text-cyan-400',
        };
      case 'CRIMSON':
      default:
        return {
          stroke: '#FF2A10',
          fill: '#FF2A10',
          rgbaGlow: 'rgba(255, 42, 16, 0.4)',
          text: 'text-brick-red',
        };
    }
  };

  const colors = getColorStyles();
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - dwellProgress * circumference;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden select-none"
    >
      {/* SVG Motion Trail */}
      {config.showTrail && trail.length > 1 && (
        <svg className="absolute inset-0 w-full h-full">
          <polyline
            points={trail.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={colors.stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.35"
            strokeDasharray="2 3"
          />
          {trail.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={Math.max(1, p.alpha * 3.5)}
              fill={colors.fill}
              opacity={p.alpha * 0.45}
            />
          ))}
        </svg>
      )}

      {/* Reticle & Dwell Indicator Container */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 will-change-transform"
        style={{
          transform: `translate3d(${x}px, ${y}px, 0)`,
          transition: 'transform 0.016s linear',
        }}
      >
        <svg width="64" height="64" viewBox="0 0 64 64" className="overflow-visible">
          {/* Subtle Outer Pulsing Halo */}
          <circle
            cx="32"
            cy="32"
            r="17"
            fill="none"
            stroke={colors.stroke}
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.6"
          />

          {/* Dwell Progress Ring */}
          {config.dwellEnabled && dwellProgress > 0 && (
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="none"
              stroke={colors.stroke}
              strokeWidth="2.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 32 32)"
              className={dwellLocked ? 'animate-ping' : ''}
              style={{
                filter: `drop-shadow(0 0 6px ${colors.rgbaGlow})`,
                transition: 'stroke-dashoffset 0.04s linear',
              }}
            />
          )}

          {/* Precision Crosshair Lines */}
          <line x1="32" y1="18" x2="32" y2="25" stroke={colors.stroke} strokeWidth="1.5" />
          <line x1="32" y1="39" x2="32" y2="46" stroke={colors.stroke} strokeWidth="1.5" />
          <line x1="18" y1="32" x2="25" y2="32" stroke={colors.stroke} strokeWidth="1.5" />
          <line x1="39" y1="32" x2="46" y2="32" stroke={colors.stroke} strokeWidth="1.5" />

          {/* Center Point */}
          <circle cx="32" cy="32" r="2.2" fill={colors.fill} />
        </svg>

        {/* Micro Telemetry & Dwell Feedback Label */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap flex flex-col items-center gap-0.5">
          <div className="px-1.5 py-0.5 bg-black/85 border border-charcoal-soft rounded-[2px] shadow-sm font-mono text-[9px] font-bold tracking-tight text-paper-cream flex items-center gap-1">
            <span className={colors.text}>GAZE</span>
            <span>[{Math.round(x)}, {Math.round(y)}]</span>
            {!isCalibrated && (
              <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1 rounded-[1px]">
                PRIOR
              </span>
            )}
          </div>

          {config.dwellEnabled && dwellTargetName && (
            <div className="px-1.5 py-0.5 bg-charcoal-pure/90 border border-brick-red/60 rounded-[2px] font-mono text-[8px] text-paper-cream font-bold tracking-wider animate-in fade-in zoom-in-95 duration-100">
              {dwellLocked ? `ACTIVATED: ${dwellTargetName}` : `DWELL: ${dwellTargetName} (${Math.round(dwellProgress * 100)}%)`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
