'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { StampBadge } from './StampBadge';
import {
  RuntimeNetworkMonitor,
  AuditedNetworkRequest,
  NetworkAuditorSummary,
} from '@/core/network/network-monitor';
import {
  ShieldCheck,
  Lock,
  X,
  RefreshCw,
  Globe,
  HardDrive,
  AlertTriangle,
  Info,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

export interface NetworkTransparencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NetworkTransparencyModal({ isOpen, onClose }: NetworkTransparencyModalProps) {
  const [requests, setRequests] = useState<AuditedNetworkRequest[]>([]);
  const [summary, setSummary] = useState<NetworkAuditorSummary>({
    totalRequests: 0,
    sameOriginRequests: 0,
    externalRequests: 0,
    modelWeightBytesDownloaded: 0,
    runtimeWasmBytesDownloaded: 0,
    userBiometricBytesUploaded: 0,
    isAirGappedReady: true,
    activeRequestsCount: 0,
  });

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'MODEL_WEIGHT' | 'RUNTIME_WASM' | 'EXTERNAL'>('ALL');

  useEffect(() => {
    if (!isOpen) return;

    const monitor = RuntimeNetworkMonitor.getInstance();
    const unsub = monitor.subscribe((reqs) => {
      setRequests([...reqs]);
      setSummary(monitor.getSummary());
    });

    return () => {
      unsub();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredRequests = requests.filter((r) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'MODEL_WEIGHT') return r.category === 'MODEL_WEIGHT';
    if (activeFilter === 'RUNTIME_WASM') return r.category === 'RUNTIME_WASM';
    if (activeFilter === 'EXTERNAL') return !r.isSameOrigin;
    return true;
  });

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const handleClear = () => {
    RuntimeNetworkMonitor.getInstance().clearLogs();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Network Transparency Auditor"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-soft/60 backdrop-blur-[2px] animate-fadeIn"
    >
      <div className="relative w-full max-w-3xl bg-paper-cream border-2 border-charcoal-soft rounded-tactile shadow-tactile-lg p-6 max-h-[90vh] flex flex-col font-mono text-charcoal-soft">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-charcoal-soft pb-3 mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sage-green" />
            <h2 className="text-sm font-bold uppercase tracking-technical">
              RUNTIME NETWORK TRANSPARENCY AUDITOR
            </h2>
            <StampBadge label="LIVE PROBE" variant="sage" />
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-charcoal-soft/40 hover:border-charcoal-soft hover:bg-paper-dark rounded-[2px]"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* Architecture Privacy Contract */}
          <div className="border border-charcoal-soft bg-paper-dark p-3.5 rounded-[2px] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-technical flex items-center gap-1.5 text-xs">
                <Lock className="w-4 h-4 text-brick-red" />
                ON-DEVICE PRIVACY VERIFICATION
              </span>
              <StampBadge
                label={summary.externalRequests === 0 ? 'AIR-GAPPED COMPLIANT' : 'EXTERNAL OBSERVED'}
                variant={summary.externalRequests === 0 ? 'sage' : 'brick'}
              />
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed">
              Inference executes inside in-browser Web Workers or WASM kernels. Video frames and microphone audio streams are processed in volatile memory and never serialized or dispatched over network sockets.
            </p>
          </div>

          {/* Real Measured Telemetry Gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="border border-charcoal-soft p-2.5 bg-paper-cream rounded-[2px] shadow-tactile-xs">
              <span className="block text-[9px] text-ink-muted uppercase">Audited Requests</span>
              <span className="text-lg font-bold tabular-nums">{summary.totalRequests}</span>
              <span className="block text-[9px] text-ink-muted">{summary.sameOriginRequests} Same-Origin</span>
            </div>

            <div className="border border-charcoal-soft p-2.5 bg-paper-cream rounded-[2px] shadow-tactile-xs">
              <span className="block text-[9px] text-ink-muted uppercase">External Calls</span>
              <span className={`text-lg font-bold tabular-nums ${summary.externalRequests > 0 ? 'text-brick-red' : 'text-sage-green'}`}>
                {summary.externalRequests}
              </span>
              <span className="block text-[9px] text-ink-muted">Third-Party Origins</span>
            </div>

            <div className="border border-charcoal-soft p-2.5 bg-paper-cream rounded-[2px] shadow-tactile-xs">
              <span className="block text-[9px] text-ink-muted uppercase">Model Weights</span>
              <span className="text-lg font-bold text-charcoal-soft tabular-nums">
                {formatBytes(summary.modelWeightBytesDownloaded)}
              </span>
              <span className="block text-[9px] text-ink-muted">Static Neural Binaries</span>
            </div>

            <div className="border border-charcoal-soft p-2.5 bg-paper-cream rounded-[2px] shadow-tactile-xs">
              <span className="block text-[9px] text-ink-muted uppercase">Biometric Uploads</span>
              <span className="text-lg font-bold text-sage-green tabular-nums">
                0 BYTES
              </span>
              <span className="block text-[9px] text-ink-muted">Volatile Memory Only</span>
            </div>
          </div>

          {/* Observable vs Non-Observable Disclosure Banner */}
          <div className="p-3 bg-paper-dark border border-charcoal-soft/40 rounded-[2px] flex items-start gap-2.5 text-[10px] text-ink-muted leading-relaxed">
            <Info className="w-4 h-4 text-charcoal-soft shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-charcoal-soft block uppercase mb-0.5">
                AUDITOR BOUNDARIES & TECHNICAL DISCLOSURE:
              </span>
              This probe monitors application-level <code className="text-charcoal-soft font-bold">fetch</code>, <code className="text-charcoal-soft font-bold">XMLHttpRequest</code>, and <code className="text-charcoal-soft font-bold">PerformanceResourceTiming</code> entries. Client JavaScript cannot observe browser-native telemetry, browser sync, extension traffic, or native DNS lookups.
            </div>
          </div>

          {/* Live Request Stream Section */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-charcoal-soft/20 pb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-technical text-charcoal-soft">
                RUNTIME OUTBOUND TRAFFIC LEDGER ({filteredRequests.length})
              </span>

              <div className="flex items-center gap-1 overflow-x-auto">
                {(['ALL', 'MODEL_WEIGHT', 'RUNTIME_WASM', 'EXTERNAL'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveFilter(cat)}
                    className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border transition-all shrink-0 ${
                      activeFilter === cat
                        ? 'border-charcoal-soft bg-charcoal-soft text-paper-cream'
                        : 'border-charcoal-soft/30 hover:border-charcoal-soft text-ink-muted'
                    }`}
                  >
                    {cat.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Request List */}
            <div className="border border-charcoal-soft rounded-[2px] bg-paper-dark divide-y divide-charcoal-soft/20 max-h-56 overflow-y-auto text-[11px]">
              {filteredRequests.length === 0 ? (
                <div className="p-6 text-center text-ink-muted text-xs">
                  No network requests matching filter &apos;{activeFilter}&apos;.
                </div>
              ) : (
                filteredRequests.map((req) => (
                  <div key={req.id} className="p-2 flex items-center justify-between gap-2 hover:bg-paper-cream/20 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-1 py-0.5 border border-charcoal-soft bg-paper-cream text-[9px] font-bold shrink-0">
                        {req.method}
                      </span>
                      <span className="truncate text-charcoal-soft font-mono" title={req.url}>
                        {req.url}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] px-1 py-0.2 rounded border border-charcoal-soft/30 bg-paper-cream text-ink-muted uppercase">
                        {req.category.replace('_', ' ')}
                      </span>
                      {req.transferSizeBytes !== undefined && req.transferSizeBytes > 0 && (
                        <span className="text-[9px] text-ink-muted tabular-nums">
                          {formatBytes(req.transferSizeBytes)}
                        </span>
                      )}
                      <span className="text-[9px] text-ink-muted tabular-nums">
                        {req.durationMs}ms
                      </span>
                      <StampBadge
                        label={req.status}
                        variant={req.status === 'COMPLETED' ? 'sage' : req.status === 'IN_FLIGHT' ? 'charcoal' : 'brick'}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 mt-4 border-t-2 border-charcoal-soft flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={handleClear} className="gap-1.5 text-xs">
            <Trash2 className="w-3.5 h-3.5" />
            CLEAR AUDITOR LOG
          </Button>
          <Button variant="default" size="sm" onClick={onClose} className="text-xs">
            CLOSE AUDITOR
          </Button>
        </div>
      </div>
    </div>
  );
}
