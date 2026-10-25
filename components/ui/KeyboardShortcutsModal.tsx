'use client';

import React from 'react';
import { StampBadge } from './StampBadge';
import { Keyboard, Zap, X } from 'lucide-react';

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  action: string;
  scope: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['ESC'], action: 'Return to Hub / Dismiss Active Modal', scope: 'GLOBAL' },
  { keys: ['/'], action: 'Open Tactical Command Palette & Fast Search', scope: 'HUB' },
  { keys: ['\u2190', '\u2192', '\u2191', '\u2193'], action: 'Navigate Sandboxed Module Grid', scope: 'HUB' },
  { keys: ['ENTER'], action: 'Launch Selected Neural Sandbox', scope: 'HUB' },
  { keys: ['?'], action: 'Open Tactical Keyboard Shortcuts', scope: 'GLOBAL' },
  { keys: ['T'], action: 'Toggle Telemetry Dark / Analog Light Theme', scope: 'GLOBAL' },
  { keys: ['H'], action: 'Toggle Real-Time Diagnostics & Performance HUD', scope: 'GLOBAL' },
  { keys: ['SPACE'], action: 'Pause / Resume Live Sensor Stream', scope: 'WORKSPACES' },
  { keys: ['C'], action: 'Recalibrate Gaze Engine / Center Steering', scope: 'GAZE & DRIVE' },
  { keys: ['S'], action: 'Toggle Deterministic Synthetic Fallback Generator', scope: 'VISION' },
  { keys: ['P'], action: 'Export High-Resolution Canvas Snapshot (PNG)', scope: 'SESSION' },
  { keys: ['J'], action: 'Download Structured Telemetry Ledger (JSON)', scope: 'SESSION' },
  { keys: ['W', 'A', 'S', 'D'], action: 'Manual Keyboard Steering & Throttle Overrides', scope: 'DRIVE SIM' },
  { keys: ['V'], action: 'Toggle Heat Vision // Apex Laser Override', scope: 'GAZE & EYE' },
  { keys: ['N'], action: 'Toggle Cyberpunk Neon Afterburner Mode', scope: 'DRIVE SIM' },
  { keys: ['`'], action: 'Launch Classified Laboratory Shell (CLI)', scope: 'GLOBAL' },
  { keys: ['↑', '↑', '↓', '↓', '←', '→', '←', '→', 'B', 'A'], action: 'Apex Override Neural Defense Bypass', scope: 'GLOBAL' },
];

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tactical Keyboard Shortcuts Matrix"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-soft/50 backdrop-blur-[2px]"
    >
      <div className="relative w-full max-w-2xl bg-paper-cream border-2 border-charcoal-soft rounded-tactile shadow-tactile-lg p-6 max-h-[90vh] flex flex-col font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-charcoal-soft pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-brick-red" />
            <h2 className="text-sm font-bold uppercase tracking-technical text-charcoal-soft">
              TACTICAL KEYBOARD SHORTCUTS MATRIX
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-charcoal-soft hover:bg-paper-dark rounded-[2px] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 text-charcoal-soft" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          <div className="flex items-center justify-between">
            <p className="text-ink-muted text-[11px] leading-relaxed">
              Omni Loco AI is engineered for hands-free and keyboard-first tactical operation. Shortcuts are disabled during text entry.
            </p>
            <StampBadge label="ZERO-LATENCY BINDINGS" variant="sage" />
          </div>

          <div className="divide-y divide-charcoal-soft/20 border border-charcoal-soft rounded-tactile overflow-hidden bg-paper-dark/50">
            {SHORTCUTS.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 hover:bg-paper-dark transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-ink-muted w-24 shrink-0">
                    [{item.scope}]
                  </span>
                  <span className="text-charcoal-soft font-medium text-[11px]">{item.action}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-4">
                  {item.keys.map((k, kIdx) => (
                    <kbd
                      key={kIdx}
                      className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-paper-cream text-charcoal-soft border border-charcoal-soft rounded-[2px] shadow-tactile-sm"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-2.5 bg-paper-dark/40 border border-charcoal-soft/40 rounded-tactile text-[10px] text-ink-muted flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-sage-green" />
              Direct operator bindings active across all eleven sandboxed experiences.
            </span>
            <span className="text-charcoal-soft font-bold">[ESC TO CLOSE]</span>
          </div>
        </div>
      </div>
    </div>
  );
}
