'use client';

import React, { useState, useEffect } from 'react';
import {
  CENTRAL_MODEL_MANIFEST,
  ModelManifestEntry,
  ModelVerificationResult,
  verifyModelAsset,
  verifyAllModelAssets,
} from '@/core/models/manifest';
import { ModelLifecycleManager, ModelStatusRecord } from '@/core/models/model-lifecycle-manager';
import { isModelCached, prefetchModel, clearModelAssetCache } from '@/core/cache';
import { StampBadge } from './StampBadge';
import { Button } from './Button';
import {
  Layers,
  HardDrive,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  X,
  FileCheck,
  Shield,
  Zap,
} from 'lucide-react';

export interface ModelVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ModelVaultModal({ isOpen, onClose }: ModelVaultModalProps) {
  const [manifest] = useState<ModelManifestEntry[]>(CENTRAL_MODEL_MANIFEST);
  const [modelStates, setModelStates] = useState<Record<string, ModelStatusRecord>>({});
  const [cachedMap, setCachedMap] = useState<Record<string, boolean>>({});
  const [verifications, setVerifications] = useState<Record<string, ModelVerificationResult>>({});
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelManifestEntry | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const manager = ModelLifecycleManager.getInstance();

  useEffect(() => {
    if (!isOpen) return;

    // 1. Subscribe to ModelLifecycleManager updates
    const unsub = manager.subscribe((models) => {
      const map: Record<string, ModelStatusRecord> = {};
      models.forEach((m) => {
        map[m.id] = m;
      });
      setModelStates(map);
    });

    // 2. Check local caching status for all models
    async function checkCaches() {
      const cMap: Record<string, boolean> = {};
      for (const m of CENTRAL_MODEL_MANIFEST) {
        if (m.weightAssetPath) {
          cMap[m.id] = await isModelCached(m.weightAssetPath);
        } else {
          cMap[m.id] = true;
        }
      }
      setCachedMap(cMap);
    }
    checkCaches();

    // Default select first model
    if (!selectedModel && manifest.length > 0) {
      setSelectedModel(manifest[0]);
    }

    return () => {
      unsub();
    };
  }, [isOpen, manager, manifest, selectedModel]);

  if (!isOpen) return null;

  const handleVerifyAll = async () => {
    setIsVerifying(true);
    setActionMessage('Verifying local model assets and HTTP endpoints...');
    try {
      const results = await verifyAllModelAssets();
      setVerifications(results);
      setActionMessage('Asset verification complete.');
    } catch {
      setActionMessage('Verification encountered errors.');
    } finally {
      setIsVerifying(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleDownload = async (model: ModelManifestEntry) => {
    if (!model.weightAssetPath) return;
    setActionMessage(`Downloading weight binary for ${model.displayName}...`);
    const success = await prefetchModel(model.weightAssetPath);
    if (success) {
      setCachedMap((prev) => ({ ...prev, [model.id]: true }));
      setActionMessage(`Successfully cached ${model.displayName}.`);
    } else {
      setActionMessage(`Download failed for ${model.displayName}.`);
    }
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleInitialise = async (model: ModelManifestEntry) => {
    setActionMessage(`Initialising ${model.displayName} in volatile RAM...`);
    const success = await manager.loadModel(model.id);
    if (success) {
      setActionMessage(`${model.displayName} is now READY in memory.`);
    } else {
      setActionMessage(`Initialisation failed for ${model.displayName}.`);
    }
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleDispose = async (model: ModelManifestEntry) => {
    setActionMessage(`Disposing ${model.displayName}...`);
    await manager.disposeModel(model.id);
    setActionMessage(`${model.displayName} disposed from memory.`);
    setTimeout(() => setActionMessage(null), 3000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Central Model Vault"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-soft/60 backdrop-blur-[2px] animate-fadeIn"
    >
      <div className="relative w-full max-w-5xl bg-paper-cream border-2 border-charcoal-soft rounded-tactile shadow-tactile-lg p-6 max-h-[90vh] flex flex-col font-mono text-charcoal-soft">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-charcoal-soft pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-brick-red" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-technical">
                CENTRAL MODEL VAULT // DEPENDENCY MANIFEST
              </h2>
              <span className="text-[10px] text-ink-muted">
                Authoritative on-device perception models, runtime binaries, and weight assets
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleVerifyAll}
              disabled={isVerifying}
              className="gap-1.5 text-xs"
            >
              <FileCheck className="w-3.5 h-3.5 text-sage-green" />
              <span>{isVerifying ? 'VERIFYING...' : 'VERIFY ALL ASSETS'}</span>
            </Button>
            <button
              onClick={onClose}
              className="p-1 border border-charcoal-soft/40 hover:border-charcoal-soft hover:bg-paper-dark rounded-[2px]"
              aria-label="Close Model Vault"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action status toast banner */}
        {actionMessage && (
          <div className="mb-3 p-2 bg-paper-dark border border-charcoal-soft text-xs text-charcoal-soft flex items-center gap-2 animate-fadeIn">
            <Zap className="w-3.5 h-3.5 text-brick-red animate-pulse" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Content Body: Split View (List left, Details right) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Models Table / List */}
          <div className="md:col-span-7 border border-charcoal-soft rounded-[2px] bg-paper-dark flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-charcoal-soft/20 text-[10px] text-ink-muted uppercase font-bold flex justify-between">
              <span>REGISTERED DEPENDENCIES ({manifest.length})</span>
              <span>LIFECYCLE STATUS</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-charcoal-soft/10 text-xs">
              {manifest.map((m) => {
                const state = modelStates[m.id];
                const isSelected = selectedModel?.id === m.id;
                const isCached = cachedMap[m.id];
                const isReady = state?.state === 'READY' || state?.state === 'PROCESSING';

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedModel(m)}
                    className={`p-3 cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-paper-cream text-charcoal-soft shadow-tactile-xs border-l-4 border-brick-red'
                        : 'hover:bg-paper-cream/30 text-charcoal-soft'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[11px] truncate">{m.displayName}</span>
                      </div>
                      <div className="text-[10px] text-ink-muted flex items-center gap-2 mt-0.5">
                        <span>v{m.version}</span>
                        <span>&bull;</span>
                        <span>{m.modelFamily}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <StampBadge
                        label={isReady ? 'IN MEMORY' : state?.state === 'LOADING' ? 'LOADING' : isCached ? 'CACHED' : 'UNLOADED'}
                        variant={isReady ? 'sage' : state?.state === 'LOADING' ? 'brick' : isCached ? 'charcoal' : 'ink'}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Model Inspector Panel */}
          <div className="md:col-span-5 border border-charcoal-soft rounded-[2px] bg-paper-cream p-4 flex flex-col justify-between overflow-y-auto text-xs space-y-4">
            {selectedModel ? (
              <>
                <div className="space-y-3">
                  <div>
                    <span className="text-[9px] text-ink-muted uppercase block font-bold">
                      MODEL INSPECTOR
                    </span>
                    <h3 className="text-sm font-bold uppercase tracking-technical text-charcoal-soft">
                      {selectedModel.displayName}
                    </h3>
                    <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
                      {selectedModel.notes}
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-charcoal-soft/20 pt-2 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-ink-muted">MODEL ID:</span>
                      <span className="font-mono font-bold">{selectedModel.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">ASSOCIATED ROUTE:</span>
                      <span className="font-bold">{selectedModel.moduleRoute}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">INFERENCE RUNTIME:</span>
                      <span className="font-bold">{selectedModel.runtime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">MODEL WEIGHT ASSET:</span>
                      <span className="font-mono text-[10px] truncate max-w-[180px]">
                        {selectedModel.weightAssetPath || 'None (Native / Algorithmic)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">WASM BINARY:</span>
                      <span className="font-mono text-[10px] truncate max-w-[180px]">
                        {selectedModel.runtimeBinaryPath || 'None required'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">STORAGE ESTIMATE:</span>
                      <span className="font-bold">
                        {selectedModel.storageSizeBytes > 0
                          ? `~${(selectedModel.storageSizeBytes / (1024 * 1024)).toFixed(1)} MB`
                          : '0 MB (Web Standard)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">SUPPORTED BACKENDS:</span>
                      <span className="font-bold">{selectedModel.supportedBackends.join(', ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">ATTRIBUTION / LICENSE:</span>
                      <span className="text-[10px]">{selectedModel.license}</span>
                    </div>
                  </div>

                  {/* Verification result if available */}
                  {verifications[selectedModel.id] && (
                    <div className="p-2.5 rounded-[2px] bg-paper-dark border border-charcoal-soft/30 text-[10px] space-y-1">
                      <span className="font-bold block text-charcoal-soft">VERIFICATION STATUS:</span>
                      <div className="flex justify-between">
                        <span>Weight binary reachable:</span>
                        <span className={verifications[selectedModel.id].weightExists ? 'text-sage-green font-bold' : 'text-brick-red font-bold'}>
                          {verifications[selectedModel.id].weightExists ? 'YES' : 'UNREACHABLE'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Runtime WASM binary reachable:</span>
                        <span className={verifications[selectedModel.id].runtimeExists ? 'text-sage-green font-bold' : 'text-brick-red font-bold'}>
                          {verifications[selectedModel.id].runtimeExists ? 'YES' : 'UNREACHABLE'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2 border-t border-charcoal-soft/20 pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    {selectedModel.weightAssetPath && !cachedMap[selectedModel.id] ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(selectedModel)}
                        className="gap-1 text-xs"
                      >
                        <Download className="w-3 h-3" />
                        PREFETCH
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleInitialise(selectedModel)}
                        className="gap-1 text-xs"
                      >
                        <RefreshCw className="w-3 h-3" />
                        INITIALISE
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDispose(selectedModel)}
                      className="gap-1 text-xs"
                    >
                      <Trash2 className="w-3 h-3" />
                      DISPOSE
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-ink-muted">
                Select a model from the manifest to inspect dependencies.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 mt-4 border-t-2 border-charcoal-soft flex items-center justify-between text-[11px] text-ink-muted">
          <div>
            Omni Loco 3.0 Manifest &bull; Strict separation of neural weights from runtime WASM binaries.
          </div>
          <Button variant="default" size="sm" onClick={onClose} className="text-xs">
            CLOSE VAULT
          </Button>
        </div>
      </div>
    </div>
  );
}
