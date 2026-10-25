'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { FileText, Shield, AlertTriangle, X, CheckCircle, Fingerprint } from 'lucide-react';

interface ClassifiedExperimentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ClassifiedExperimentModal({
  isOpen,
  onClose,
}: ClassifiedExperimentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-pure/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-paper-cream dark:bg-charcoal-pure border-2 border-amber-500 shadow-tactile-lg rounded-tactile overflow-hidden flex flex-col font-mono text-charcoal-soft dark:text-paper-cream">
        {/* Header with classified dossier stamp */}
        <div className="flex items-center justify-between border-b-2 border-amber-500 bg-amber-500/10 px-4 py-3">
          <div className="flex items-center gap-2 text-amber-500">
            <FileText className="w-4 h-4" />
            <span className="font-bold text-xs uppercase tracking-wider">
              DOSSIER FILE // SPECIMEN-OMEGA-01
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-charcoal-soft dark:hover:text-white transition-colors focus:outline-none"
            aria-label="Close classified dossier"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Top Stamp Banner */}
          <div className="border border-dashed border-amber-500/60 p-2.5 rounded-[2px] flex items-center justify-between bg-amber-500/5">
            <div>
              <div className="text-[10px] text-amber-500 font-bold uppercase">
                CLEARANCE LEVEL: TOP SECRET // EYE-ONLY
              </div>
              <div className="text-[9px] text-ink-muted">
                PROJECT: OMNI LOCO MULTIMODAL HUMAN-MACHINE COUPLING
              </div>
            </div>
            <div className="border-2 border-amber-500 text-amber-500 px-2 py-0.5 text-[9px] font-bold uppercase rotate-[-3deg]">
              CLASSIFIED
            </div>
          </div>

          {/* Specimen Telemetry Table */}
          <div className="border border-charcoal-soft/20 dark:border-white/10 rounded-[2px] overflow-hidden text-[11px]">
            <div className="bg-paper-dark dark:bg-charcoal-soft/30 px-3 py-1.5 font-bold flex items-center gap-1.5 text-ink-muted">
              <Fingerprint className="w-3.5 h-3.5 text-amber-500" />
              <span>SUBJECT TELEMETRY MATRIX</span>
            </div>
            <div className="divide-y divide-charcoal-soft/10 dark:divide-white/10 px-3 py-2 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-ink-muted">SPECIMEN ID:</span>
                <span className="font-bold">HUMAN-OPERATOR-LOC-01</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-ink-muted">PHYSICAL SENSORS:</span>
                <span className="text-sage-green font-bold">RGB OPTICAL FEED ACTIVE</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-ink-muted">NEURAL WORKLOAD:</span>
                <span className="font-bold">11 MULTIMODAL INFERENCE MODELS</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-ink-muted">DATA TRANSMISSION:</span>
                <span className="text-sage-green font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  0 BYTES EXFILTRATED (AIRGAP PASS)
                </span>
              </div>
            </div>
          </div>

          {/* Observer Notes */}
          <div className="space-y-1 text-[11px] leading-relaxed text-ink-muted dark:text-paper-cream/80">
            <span className="font-bold text-charcoal-soft dark:text-white uppercase block">
              LABORATORY CHIEF OBSERVER LOG:
            </span>
            <p>
              &ldquo;The human specimen continues to interact with the multimodal sensory grid.
              Landmark alignment across ocular, facial, and metacarpal nodes exhibits exceptional
              temporal fidelity. In-browser neural execution speed matches dedicated edge silicon.&rdquo;
            </p>
          </div>

          {/* Warning notice */}
          <div className="flex items-start gap-2 p-2.5 bg-paper-dark dark:bg-charcoal-soft/20 border-l-2 border-amber-500 rounded-r-[2px] text-[10px] text-ink-muted">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span>
              NOTICE: This experiment record is stored strictly within browser memory on this local
              machine. No telemetry has been dispatched to any external server.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-charcoal-soft/20 dark:border-white/10 p-3 bg-paper-dark dark:bg-charcoal-soft/20 flex items-center justify-between">
          <span className="text-[9px] text-ink-muted">STATUS: VERIFIED HUMAN INTELLIGENCE</span>
          <Button variant="default" size="sm" onClick={onClose}>
            SEAL DOSSIER
          </Button>
        </div>
      </div>
    </div>
  );
}
