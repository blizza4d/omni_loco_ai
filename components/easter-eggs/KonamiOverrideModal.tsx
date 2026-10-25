'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Zap, ShieldAlert, Terminal, Eye, Car, X, Flame } from 'lucide-react';

interface KonamiOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTerminal: () => void;
  onOpenSpecimen: () => void;
}

export function KonamiOverrideModal({
  isOpen,
  onClose,
  onOpenTerminal,
  onOpenSpecimen,
}: KonamiOverrideModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-pure/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-xl bg-charcoal-pure border-2 border-brick-red shadow-[0_0_50px_rgba(239,68,68,0.35)] rounded-tactile overflow-hidden flex flex-col font-mono text-paper-cream relative">
        {/* CRT Scanline effect overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] opacity-40 z-10" />

        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-brick-red bg-brick-red/20 px-4 py-3 z-20">
          <div className="flex items-center gap-2 text-brick-red">
            <Zap className="w-5 h-5 animate-pulse" />
            <span className="font-bold text-sm tracking-widest uppercase">
              APEX OVERRIDE // PROTOCOL 1986
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-brick-red hover:text-white transition-colors focus:outline-none"
            aria-label="Close override"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 z-20 text-xs">
          <div className="p-3 border border-brick-red/40 bg-brick-red/10 rounded-[2px] space-y-1">
            <div className="flex items-center gap-2 text-brick-red font-bold">
              <ShieldAlert className="w-4 h-4" />
              <span>NEURAL DEFENSE BYPASS SUCCESSFUL</span>
            </div>
            <p className="text-paper-cream/80 text-[11px] leading-relaxed">
              Konami sequence verified. All local sandbox safety limiters have been temporarily
              overridden. Hardware tensor pipelines are executing in apex unrestricted mode.
            </p>
          </div>

          {/* Fictional Diagnostics Matrix */}
          <div className="p-3 border border-white/20 bg-black/40 rounded-[2px] font-mono text-[10px] space-y-1">
            <div className="text-sage-green flex justify-between">
              <span>OMNI TENSOR ACCELERATION:</span>
              <span>100% UNLOCKED</span>
            </div>
            <div className="text-sage-green flex justify-between">
              <span>CLOUD NETWORK AIRGAP:</span>
              <span>ISOLATED (ZERO LEAKAGE)</span>
            </div>
            <div className="text-amber-400 flex justify-between">
              <span>HEAT VISION LASER EMITTERS:</span>
              <span>HOT STANDBY (PRESS &apos;V&apos;)</span>
            </div>
            <div className="text-amber-400 flex justify-between">
              <span>NEON AFTERBURNER MATRIX:</span>
              <span>ARMED (PRESS &apos;N&apos; IN SIM)</span>
            </div>
            <div className="text-brick-red flex justify-between">
              <span>SECURITY LOG CLEARANCE:</span>
              <span>LEVEL 5 // EXPERIMENTAL</span>
            </div>
          </div>

          {/* Action Quick Launchers */}
          <div className="space-y-2 pt-1">
            <div className="text-[10px] uppercase text-paper-cream/60 font-bold">
              EXPERIMENTAL SANDBOX SHORTCUTS:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2 border-brick-red text-brick-red hover:bg-brick-red hover:text-white"
                onClick={() => {
                  onClose();
                  router.push('/gaze');
                }}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>HEAT VISION LAB</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2 border-sage-green text-sage-green hover:bg-sage-green hover:text-charcoal-pure"
                onClick={() => {
                  onClose();
                  router.push('/drive');
                }}
              >
                <Car className="w-3.5 h-3.5" />
                <span>NEON AFTERBURNER</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2 border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-charcoal-pure"
                onClick={() => {
                  onClose();
                  onOpenTerminal();
                }}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>SECRET TERMINAL</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2 border-indigo-400 text-indigo-400 hover:bg-indigo-400 hover:text-charcoal-pure"
                onClick={() => {
                  onClose();
                  onOpenSpecimen();
                }}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>SPECIMEN DOSSIER</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-brick-red/30 p-3 bg-black/60 flex items-center justify-between z-20">
          <span className="text-[9px] text-paper-cream/50">SEQUENCE: ↑ ↑ ↓ ↓ ← → ← → B A</span>
          <Button variant="outline" size="sm" onClick={onClose}>
            DISENGAGE
          </Button>
        </div>
      </div>
    </div>
  );
}
