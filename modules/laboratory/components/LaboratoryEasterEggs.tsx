'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { unlockAchievement } from '@/modules/easter-eggs/achievements';
import { Atom, Compass, X, Sparkles, Terminal, ShieldAlert } from 'lucide-react';

export interface LaboratoryEasterEggsProps {
  blueprintMode: boolean;
  onToggleBlueprint: () => void;
  quantumTheme: boolean;
  onToggleQuantumTheme: () => void;
}

export function LaboratoryEasterEggs({
  blueprintMode,
  onToggleBlueprint,
  quantumTheme,
  onToggleQuantumTheme,
}: LaboratoryEasterEggsProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleTriggerSecretBlueprint = () => {
    onToggleBlueprint();
    unlockAchievement('NEURAL_ARCHITECT');
  };

  const handleTriggerQuantum = () => {
    onToggleQuantumTheme();
    unlockAchievement('THE_OVERRIDE');
  };

  return (
    <>
      {/* Floating Tactical Easter Egg Trigger Bar */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleTriggerSecretBlueprint}
          className={`px-2 py-1 text-[10px] font-mono font-bold uppercase border-2 rounded transition-all flex items-center gap-1 ${
            blueprintMode
              ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300 shadow-[0_0_10px_rgba(0,243,255,0.4)]'
              : 'border-charcoal-soft text-charcoal-soft hover:bg-paper-dark'
          }`}
          title="Toggle Neural Blueprint Hologram Overlay [B]"
        >
          <Compass className="w-3 h-3" />
          <span>BLUEPRINT [B]</span>
        </button>

        <button
          onClick={handleTriggerQuantum}
          className={`px-2 py-1 text-[10px] font-mono font-bold uppercase border-2 rounded transition-all flex items-center gap-1 ${
            quantumTheme
              ? 'border-indigo-400 bg-indigo-500/20 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.4)]'
              : 'border-charcoal-soft text-charcoal-soft hover:bg-paper-dark'
          }`}
          title="Toggle Quantum Core Flux State"
        >
          <Atom className="w-3 h-3 text-indigo-400" />
          <span>QUANTUM FLUX</span>
        </button>

        <button
          onClick={() => setModalOpen(true)}
          className="px-2 py-1 text-[10px] font-mono font-bold uppercase border-2 border-charcoal-soft text-charcoal-soft hover:bg-paper-dark rounded transition-all flex items-center gap-1"
          title="Laboratory System Classification Dossier"
        >
          <ShieldAlert className="w-3 h-3 text-amber-500" />
          <span>CLASSIFIED DOCS</span>
        </button>
      </div>

      {/* Blueprint Mode Screen Overlay */}
      {blueprintMode && (
        <div className="fixed inset-0 pointer-events-none z-40 border-8 border-cyan-500/30">
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage:
                'linear-gradient(to right, #00f3ff 1px, transparent 1px), linear-gradient(to bottom, #00f3ff 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div className="absolute top-4 left-6 text-cyan-400 font-mono text-[10px] tracking-widest font-bold">
            TOP SECRET // OMNI LOCO ADVANCED RESEARCH FACILITY // ARCHITECTURAL SCHEMATICS // 0.001 MICRON RESOLUTION
          </div>
          <div className="absolute bottom-4 right-6 text-cyan-400 font-mono text-[10px] tracking-widest font-bold">
            AXIS: [X: 2048.12, Y: 1024.88, Z: 0.00] // SECTOR 7G // ZERO LATENCY PIPELINE
          </div>
        </div>
      )}

      {/* Classified Docs Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-dark/75 backdrop-blur-sm font-mono">
          <div className="relative w-full max-w-xl bg-paper-cream border-2 border-charcoal-soft rounded-tactile shadow-tactile p-6 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-charcoal-soft pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm uppercase text-charcoal-soft">
                  CLASSIFIED FACILITY DOSSIER // DIRECTIVE 09
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-paper-dark rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-charcoal-soft leading-relaxed">
              <p>
                Welcome, Researcher. The <strong>OMNI LOCO LABORATORY</strong> is an isolated high-dimensional sandbox for synthesizing novel spatial neural models directly inside the browser viewport.
              </p>
              <div className="p-3 border border-charcoal-soft/30 rounded bg-paper-dark space-y-1 text-[11px]">
                <div className="font-bold uppercase text-sage-green">AVAILABLE LAB PROTOCOLS:</div>
                <div>• [B] Key: Architectural Blueprint Grid Mode</div>
                <div>• [1] Key: Model Library & Templates</div>
                <div>• [2] Key: Visual Graph Pipeline DAG Editor</div>
                <div>• [3] Key: Training Data Collector & Feature Extractor</div>
                <div>• [4] Key: Live Inference Test Bench</div>
                <div>• Custom Published Models automatically inject into Figure 01 (Hand Module)</div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-charcoal-soft/20">
              <Button variant="default" size="sm" onClick={() => setModalOpen(false)}>
                ACKNOWLEDGE & CLOSE
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
