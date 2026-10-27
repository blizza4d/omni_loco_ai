'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { GestureFXConfig, FXPreset, GestureFXType } from '../fx/types';
import { FX_PRESET_PALETTES, resetFXConfig, saveFXConfig } from '../fx/fx-registry';
import { Sparkles, Volume2, VolumeX, Sliders, RotateCcw, X, Layers, Sun } from 'lucide-react';

export interface GestureFXControlsProps {
  config: GestureFXConfig;
  onChange: (config: GestureFXConfig) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function GestureFXControls({
  config,
  onChange,
  isOpen,
  onClose,
}: GestureFXControlsProps) {
  if (!isOpen) return null;

  const presets: FXPreset[] = ['CYBER_NEON', 'SOLAR_FLARE', 'QUANTUM_VOID', 'RETRO_PHOSPHOR'];
  const effectTypes: GestureFXType[] = [
    'HOLOGRAM_BURST',
    'POWER_CHARGE',
    'SPATIAL_RAY',
    'DUAL_BEACON',
    'STATUS_PULSE',
    'GRAVITY_LOCK',
    'AFTERIMAGE_TRAIL',
    'DIGIT_PROTOCOL',
    'NONE',
  ];

  const handleUpdate = (updates: Partial<GestureFXConfig>) => {
    const updated = { ...config, ...updates };
    onChange(updated);
    saveFXConfig(updated);
  };

  const handleMappingChange = (gesture: string, fxType: GestureFXType) => {
    const newMappings = { ...config.mappings, [gesture]: fxType };
    handleUpdate({ mappings: newMappings });
  };

  const handleReset = () => {
    const fresh = resetFXConfig();
    onChange(fresh);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-dark/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-paper-cream border-2 border-charcoal-soft rounded-tactile shadow-tactile p-6 space-y-5 max-h-[90vh] overflow-y-auto font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-charcoal-soft pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sage-green" />
            <h2 className="text-base font-bold uppercase tracking-technical text-charcoal-soft">
              GESTURE FX ENGINE // CONFIGURATION MATRIX
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-charcoal-soft hover:bg-paper-dark rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Master Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* FX Enabled */}
          <button
            onClick={() => handleUpdate({ enabled: !config.enabled })}
            className={`p-3 border-2 rounded-tactile text-left flex flex-col justify-between transition-all ${
              config.enabled
                ? 'border-sage-green bg-sage-green/10 text-charcoal-soft'
                : 'border-charcoal-soft text-ink-muted'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase">FX ENGINE</span>
              <span className={`text-[10px] px-1 border rounded ${config.enabled ? 'border-sage-green text-sage-green' : 'border-ink-muted'}`}>
                {config.enabled ? 'ONLINE' : 'BYPASS'}
              </span>
            </div>
            <span className="text-[10px] text-ink-muted mt-2">Master visual effect layer render</span>
          </button>

          {/* Audio Synthesizer */}
          <button
            onClick={() => handleUpdate({ audioEnabled: !config.audioEnabled })}
            className={`p-3 border-2 rounded-tactile text-left flex flex-col justify-between transition-all ${
              config.audioEnabled
                ? 'border-brick-red bg-brick-red/10 text-charcoal-soft'
                : 'border-charcoal-soft text-ink-muted'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase">SYNTH AUDIO</span>
              {config.audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-brick-red" /> : <VolumeX className="w-3.5 h-3.5" />}
            </div>
            <span className="text-[10px] text-ink-muted mt-2">Zero-asset Web Audio procedural tone</span>
          </button>

          {/* Phosphor Glow */}
          <button
            onClick={() => handleUpdate({ glowEnabled: !config.glowEnabled })}
            className={`p-3 border-2 rounded-tactile text-left flex flex-col justify-between transition-all ${
              config.glowEnabled
                ? 'border-indigo-500 bg-indigo-500/10 text-charcoal-soft'
                : 'border-charcoal-soft text-ink-muted'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase">PHOTON GLOW</span>
              <Sun className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <span className="text-[10px] text-ink-muted mt-2">Radial bloom & blur canvas filters</span>
          </button>
        </div>

        {/* Color Presets */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-charcoal-soft flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sage-green" />
            COLOR SIGNATURE PALETTES
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {presets.map((preset) => {
              const pal = FX_PRESET_PALETTES[preset];
              const isSelected = config.preset === preset;
              return (
                <button
                  key={preset}
                  onClick={() => handleUpdate({ preset })}
                  className={`p-2.5 border-2 rounded-tactile text-left transition-all ${
                    isSelected ? 'border-charcoal-soft bg-paper-dark shadow-tactile-sm' : 'border-paper-dark hover:border-charcoal-soft/50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: pal.primary }} />
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: pal.secondary }} />
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: pal.accent }} />
                  </div>
                  <span className="text-[11px] font-bold uppercase block">{preset.replace('_', ' ')}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sliders: Intensity & Particle Density */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-charcoal-soft/20 p-3 rounded-tactile bg-paper-dark/30">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-bold">EFFECT INTENSITY</span>
              <span>{Math.round(config.intensity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={config.intensity}
              onChange={(e) => handleUpdate({ intensity: parseFloat(e.target.value) })}
              className="w-full accent-charcoal-soft cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-bold">PARTICLE DENSITY</span>
              <span>{Math.round(config.particleCountMultiplier * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={config.particleCountMultiplier}
              onChange={(e) => handleUpdate({ particleCountMultiplier: parseFloat(e.target.value) })}
              className="w-full accent-charcoal-soft cursor-pointer"
            />
          </div>
        </div>

        {/* Gesture -> FX Mapping Matrix */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-charcoal-soft flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-brick-red" />
            GESTURE BINDINGS DISPATCH TABLE
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {Object.entries(config.mappings).map(([gestureName, fxType]) => (
              <div
                key={gestureName}
                className="flex items-center justify-between p-2 border border-charcoal-soft/30 rounded bg-paper-dark/20"
              >
                <span className="font-bold uppercase text-[11px] text-charcoal-soft">
                  {gestureName.replace('_', ' ')}
                </span>
                <select
                  value={fxType}
                  onChange={(e) => handleMappingChange(gestureName, e.target.value as GestureFXType)}
                  className="bg-paper-cream border border-charcoal-soft text-[10px] font-mono px-2 py-1 rounded"
                >
                  {effectTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-3 border-t-2 border-charcoal-soft">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
            <RotateCcw className="w-3 h-3" />
            RESET FACTORY DEFAULTS
          </Button>

          <Button variant="default" size="sm" onClick={onClose} className="text-xs px-5">
            APPLY & CLOSE
          </Button>
        </div>
      </div>
    </div>
  );
}
