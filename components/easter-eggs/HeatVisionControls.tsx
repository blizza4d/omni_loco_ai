'use client';

import React from 'react';
import {
  HeatVisionConfig,
  HeatVisionColor,
  DEFAULT_HEAT_VISION_CONFIG,
} from '@/modules/easter-eggs/heat-vision-renderer';
import { Flame, Volume2, VolumeX, Sparkles, ZapOff, RotateCcw, Crosshair, Eye } from 'lucide-react';

interface HeatVisionControlsProps {
  config: HeatVisionConfig;
  onChange: (config: HeatVisionConfig) => void;
  onDisengage: () => void;
  onReset?: () => void;
}

const COLOR_OPTIONS: { id: HeatVisionColor; label: string; preview: string }[] = [
  { id: 'CRIMSON', label: 'CRIMSON', preview: '#FF2A10' },
  { id: 'SOLAR', label: 'SOLAR', preview: '#FFB703' },
  { id: 'CYAN', label: 'CYAN', preview: '#00F5D4' },
  { id: 'VIOLET', label: 'VIOLET', preview: '#E879F9' },
];

export function HeatVisionControls({
  config,
  onChange,
  onDisengage,
  onReset,
}: HeatVisionControlsProps) {
  if (!config.enabled) return null;

  return (
    <aside
      aria-label="Heat Vision Apex Override Controls"
      className="absolute top-16 right-4 z-30 max-w-xs w-full bg-charcoal-pure/90 border-2 border-brick-red p-3.5 rounded-tactile shadow-[0_0_25px_rgba(255,42,16,0.3)] font-mono text-paper-cream backdrop-blur-md animate-in fade-in slide-in-from-right-4 duration-200"
    >
      {/* Title */}
      <div className="flex items-center justify-between border-b border-brick-red/40 pb-2 mb-3">
        <div className="flex items-center gap-1.5 text-brick-red">
          <Flame className="w-4 h-4 animate-pulse" />
          <span className="font-bold text-xs uppercase tracking-wider">
            HEAT VISION // APEX OVERRIDE
          </span>
        </div>
        <span className="text-[9px] bg-brick-red/20 text-brick-red px-1.5 py-0.5 rounded-[2px] font-bold animate-pulse">
          FIRING [V]
        </span>
      </div>

      <div className="space-y-3 text-[11px]">
        {/* Color Palette Selector */}
        <div>
          <span className="text-[10px] text-paper-cream/70 uppercase font-bold block mb-1.5">
            PLASMA EMISSION COLOR:
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {COLOR_OPTIONS.map((col) => (
              <button
                key={col.id}
                onClick={() => onChange({ ...config, colorScheme: col.id })}
                className={`flex flex-col items-center gap-1 p-1 rounded-[2px] border transition-all ${
                  config.colorScheme === col.id
                    ? 'border-white bg-white/10 scale-105'
                    : 'border-white/20 hover:border-white/60'
                }`}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full shadow-sm"
                  style={{ backgroundColor: col.preview }}
                />
                <span className="text-[9px] tracking-tight">{col.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Aiming Mode Selector */}
        <div>
          <span className="text-[10px] text-paper-cream/70 uppercase font-bold block mb-1.5">
            AIMING TARGET VECTOR:
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onChange({ ...config, aimMode: 'GAZE_VECTOR' })}
              className={`flex items-center justify-center gap-1 py-1 px-2 border rounded-[2px] text-[10px] transition-all ${
                config.aimMode !== 'MANUAL_RETICLE'
                  ? 'border-brick-red bg-brick-red/20 text-brick-red font-bold'
                  : 'border-white/20 text-paper-cream/70 hover:text-white'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>3D GAZE VECTOR</span>
            </button>
            <button
              onClick={() => onChange({ ...config, aimMode: 'MANUAL_RETICLE' })}
              className={`flex items-center justify-center gap-1 py-1 px-2 border rounded-[2px] text-[10px] transition-all ${
                config.aimMode === 'MANUAL_RETICLE'
                  ? 'border-brick-red bg-brick-red/20 text-brick-red font-bold'
                  : 'border-white/20 text-paper-cream/70 hover:text-white'
              }`}
            >
              <Crosshair className="w-3 h-3" />
              <span>MANUAL RETICLE</span>
            </button>
          </div>
        </div>

        {/* Beam Intensity Slider */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-paper-cream/70 uppercase font-bold">
              BEAM INTENSITY:
            </span>
            <span className="text-[10px] text-brick-red font-bold">
              {config.intensity.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min="0.6"
            max="2.0"
            step="0.1"
            value={config.intensity}
            onChange={(e) =>
              onChange({ ...config, intensity: parseFloat(e.target.value) })
            }
            className="w-full accent-brick-red h-1.5 bg-black/60 rounded cursor-pointer"
          />
        </div>

        {/* Toggle options: Sound, Sparks */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
          {/* Sound Toggle */}
          <button
            onClick={() => onChange({ ...config, soundEnabled: !config.soundEnabled })}
            className={`flex items-center justify-center gap-1.5 py-1 px-2 border rounded-[2px] transition-all ${
              config.soundEnabled
                ? 'border-sage-green text-sage-green bg-sage-green/10'
                : 'border-white/20 text-paper-cream/60 hover:text-white'
            }`}
          >
            {config.soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
            <span className="text-[10px]">{config.soundEnabled ? 'AUDIO ON' : 'MUTED'}</span>
          </button>

          {/* Sparks Toggle */}
          <button
            onClick={() => onChange({ ...config, sparksEnabled: !config.sparksEnabled })}
            className={`flex items-center justify-center gap-1.5 py-1 px-2 border rounded-[2px] transition-all ${
              config.sparksEnabled
                ? 'border-amber-400 text-amber-400 bg-amber-400/10'
                : 'border-white/20 text-paper-cream/60 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[10px]">{config.sparksEnabled ? 'SPARKS ON' : 'SPARKS OFF'}</span>
          </button>
        </div>

        {/* Actions: Reset & Disengage */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => {
              if (onReset) {
                onReset();
              } else {
                onChange({ ...DEFAULT_HEAT_VISION_CONFIG, enabled: true });
              }
            }}
            className="py-1.5 px-2 border border-white/20 rounded-[2px] hover:border-white/60 text-paper-cream/70 hover:text-white text-[10px] flex items-center justify-center gap-1 transition-all"
            title="Reset Heat Vision parameters to defaults"
          >
            <RotateCcw className="w-3 h-3" />
            <span>RESET</span>
          </button>

          <button
            onClick={onDisengage}
            className="flex-1 py-1.5 px-3 border-2 border-brick-red bg-brick-red text-white font-bold rounded-[2px] hover:bg-brick-red/90 active:scale-98 transition-all flex items-center justify-center gap-1.5 text-xs shadow-md"
          >
            <ZapOff className="w-3.5 h-3.5" />
            <span>DISENGAGE [V]</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
