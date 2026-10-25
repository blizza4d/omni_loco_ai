'use client';

import React, { useState, useEffect } from 'react';
import { detectCapabilities, SystemCapabilities } from '@/core/capabilities';
import { Button } from './Button';
import { StampBadge } from './StampBadge';
import { Cpu, Zap, Activity, HardDrive, X, RefreshCw } from 'lucide-react';

export interface SystemStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SystemStatusModal({ isOpen, onClose }: SystemStatusModalProps) {
  const [caps, setCaps] = useState<SystemCapabilities | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshCaps = async () => {
    setLoading(true);
    const result = await detectCapabilities();
    setCaps(result);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      refreshCaps();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hardware Acceleration & System Status"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-soft/50 backdrop-blur-[2px]"
    >
      <div className="relative w-full max-w-2xl bg-paper-cream border-2 border-charcoal-soft rounded-tactile shadow-tactile-lg p-6 max-h-[90vh] flex flex-col font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-charcoal-soft pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-charcoal-soft" />
            <h2 className="text-sm font-bold uppercase tracking-technical text-charcoal-soft">
              HARDWARE ACCELERATION & SYSTEM STATUS
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
          {/* Active Backend Recommendation */}
          <div className="border border-charcoal-soft bg-paper-dark p-3 rounded-[2px] flex items-center justify-between">
            <div>
              <span className="block text-[10px] text-ink-muted uppercase">
                ACTIVE INFERENCE BACKEND
              </span>
              <span className="text-base font-bold uppercase tracking-technical text-charcoal-soft">
                {caps?.recommendedBackend.toUpperCase() || 'EVALUATING...'}
              </span>
            </div>
            <StampBadge
              label={
                caps?.recommendedBackend === 'webgpu'
                  ? 'HIGH PERFORMANCE (GPU)'
                  : caps?.recommendedBackend === 'webgl'
                  ? 'ACCELERATED (WEBGL)'
                  : 'CPU INFERENCE (WASM SIMD)'
              }
              variant={caps?.recommendedBackend === 'webgpu' ? 'sage' : 'charcoal'}
            />
          </div>

          {/* Grid of hardware subsystems */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* WebGPU Specs */}
            <div className="border border-charcoal-soft p-3 bg-paper-cream space-y-1.5">
              <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-1">
                <span className="font-bold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-brick-red" /> WEBGPU ENGINE
                </span>
                <StampBadge
                  label={caps?.webgpu.supported ? 'ACTIVE' : 'FALLBACK'}
                  variant={caps?.webgpu.supported ? 'sage' : 'ink'}
                />
              </div>
              <div className="text-[11px] space-y-1">
                <p>
                  <span className="text-ink-muted">Adapter:</span>{' '}
                  {caps?.webgpu.adapterName || 'No WebGPU adapter detected'}
                </p>
                <p>
                  <span className="text-ink-muted">Tier:</span> {caps?.webgpu.tier || 'N/A'}
                </p>
                <p>
                  <span className="text-ink-muted">Architecture:</span>{' '}
                  {caps?.webgpu.architecture || 'Unified / Integrated'}
                </p>
              </div>
            </div>

            {/* WebGL Fallback */}
            <div className="border border-charcoal-soft p-3 bg-paper-cream space-y-1.5">
              <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-1">
                <span className="font-bold flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-sage-green" /> WEBGL2 RUNTIME
                </span>
                <StampBadge
                  label={caps?.webgl.supported ? `WEBGL ${caps.webgl.version}` : 'UNAVAILABLE'}
                  variant={caps?.webgl.supported ? 'sage' : 'ink'}
                />
              </div>
              <div className="text-[11px] space-y-1">
                <p className="truncate">
                  <span className="text-ink-muted">Renderer:</span>{' '}
                  {caps?.webgl.renderer || 'Default WebGL'}
                </p>
                <p className="truncate">
                  <span className="text-ink-muted">Vendor:</span>{' '}
                  {caps?.webgl.vendor || 'Standard Browser Vendor'}
                </p>
              </div>
            </div>

            {/* WASM & Threads */}
            <div className="border border-charcoal-soft p-3 bg-paper-cream space-y-1.5">
              <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-1">
                <span className="font-bold">WASM COMPILER</span>
                <StampBadge
                  label={caps?.wasm.simd ? 'SIMD 128-BIT' : 'BASIC WASM'}
                  variant={caps?.wasm.simd ? 'sage' : 'charcoal'}
                />
              </div>
              <div className="text-[11px] space-y-1">
                <p>
                  <span className="text-ink-muted">SIMD Acceleration:</span>{' '}
                  {caps?.wasm.simd ? 'Enabled (Fast Vector Math)' : 'Disabled'}
                </p>
                <p>
                  <span className="text-ink-muted">Threads (SharedMemory):</span>{' '}
                  {caps?.wasm.threads ? 'Enabled (Multi-core Worker Pool)' : 'Single Thread'}
                </p>
              </div>
            </div>

            {/* Host CPU & Memory */}
            <div className="border border-charcoal-soft p-3 bg-paper-cream space-y-1.5">
              <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-1">
                <span className="font-bold flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-charcoal-soft" /> HOST SPECS
                </span>
                <StampBadge
                  label={`${caps?.hardware.logicalCores || 4} CORES`}
                  variant="charcoal"
                />
              </div>
              <div className="text-[11px] space-y-1">
                <p>
                  <span className="text-ink-muted">Device Memory:</span>{' '}
                  {caps?.hardware.deviceMemoryGB ? `~${caps.hardware.deviceMemoryGB} GB` : 'Not Exposed'}
                </p>
                <p>
                  <span className="text-ink-muted">Offscreen Canvas:</span>{' '}
                  {caps?.workers.offscreenCanvas ? 'Supported (Zero Main-Thread Latency)' : 'Fallback'}
                </p>
                <p>
                  <span className="text-ink-muted">Video Frame Callback:</span>{' '}
                  {caps?.video.requestVideoFrameCallback ? 'Available (Precise vsync)' : 'rAF Mode'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-charcoal-soft flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={refreshCaps} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            RE-PROBE HARDWARE
          </Button>
          <Button variant="default" size="sm" onClick={onClose}>
            CLOSE STATUS
          </Button>
        </div>
      </div>
    </div>
  );
}
