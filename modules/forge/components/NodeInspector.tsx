'use client';

import React, { useEffect, useState } from 'react';
import { ProtocolNode } from '../types';
import { getAllModels } from '@/modules/laboratory/model-storage';
import { LaboratoryModel } from '@/modules/laboratory/types';
import {
  Copy,
  Cpu,
  Sliders,
  Trash2,
  X,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface NodeInspectorProps {
  node: ProtocolNode | null;
  onUpdateParams: (nodeId: string, params: Record<string, any>) => void;
  onDuplicateNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
}

export function NodeInspector({
  node,
  onUpdateParams,
  onDuplicateNode,
  onDeleteNode,
  onClose,
}: NodeInspectorProps) {
  const [labModels, setLabModels] = useState<LaboratoryModel[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLabModels(getAllModels());
    }
  }, []);

  if (!node) {
    return (
      <div className="p-4 border-2 border-charcoal-soft bg-paper-dark rounded-tactile font-mono text-xs text-ink-muted text-center space-y-2">
        <Sliders className="w-5 h-5 mx-auto opacity-50" />
        <p>SELECT A NODE ON THE CANVAS TO CONFIGURE ITS PARAMETERS & TELEMETRY</p>
      </div>
    );
  }

  const handleChangeParam = (key: string, value: any) => {
    onUpdateParams(node.id, {
      ...node.params,
      [key]: value,
    });
  };

  return (
    <div className="p-4 border-2 border-charcoal-soft bg-paper-dark rounded-tactile font-mono text-xs space-y-4 shadow-tactile">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-2.5">
        <div>
          <span className="text-[10px] text-ink-muted uppercase block tracking-technical">
            NODE INSPECTOR // {node.category}
          </span>
          <h4 className="font-bold text-sm text-charcoal-soft uppercase tracking-technical">
            {node.label}
          </h4>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-ink-muted hover:text-charcoal-soft transition-colors"
          title="Close inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Parameter Fields */}
      <div className="space-y-3">
        {/* Specific input-custom-model Laboratory integration */}
        {node.type === 'input-custom-model' && (
          <div className="space-y-1.5 p-2.5 border border-cyan-500/40 bg-cyan-500/5 rounded">
            <label className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 block uppercase">
              LABORATORY CLASSIFIER MODEL
            </label>
            <select
              value={node.params.modelId || ''}
              onChange={(e) => {
                const targetModel = labModels.find((m) => m.id === e.target.value);
                handleChangeParam('modelId', e.target.value);
                if (targetModel) {
                  handleChangeParam('modelVersion', targetModel.version);
                }
              }}
              className="w-full bg-paper-cream border border-charcoal-soft px-2 py-1 text-xs rounded text-charcoal-soft"
            >
              {labModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} (v{m.version}) - {m.figureTag}
                </option>
              ))}
            </select>

            <div className="flex items-center justify-between text-[10px] text-ink-muted pt-1">
              <span>ACTIVE VERSION: {node.params.modelVersion || '1.0.0'}</span>
              <Link href="/laboratory" className="text-cyan-500 hover:underline inline-flex items-center gap-0.5">
                <span>OPEN LAB</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Hand gesture parameter */}
        {node.type === 'input-hand-gesture' && (
          <div className="space-y-1">
            <label className="text-[10px] text-ink-muted uppercase block">MIN CONFIDENCE</label>
            <input
              type="number"
              step="0.05"
              min="0.1"
              max="1.0"
              value={node.params.minConfidence ?? 0.7}
              onChange={(e) => handleChangeParam('minConfidence', parseFloat(e.target.value))}
              className="w-full bg-paper-cream border border-charcoal-soft px-2 py-1 text-xs rounded text-charcoal-soft"
            />
          </div>
        )}

        {/* Finger count parameter */}
        {node.type === 'input-finger-count' && (
          <div className="space-y-1">
            <label className="text-[10px] text-ink-muted uppercase block">TARGET HAND</label>
            <select
              value={node.params.targetHand ?? 'Both'}
              onChange={(e) => handleChangeParam('targetHand', e.target.value)}
              className="w-full bg-paper-cream border border-charcoal-soft px-2 py-1 text-xs rounded text-charcoal-soft"
            >
              <option value="Both">Both Hands Combined (0-10)</option>
              <option value="Right">Right Hand Only (0-5)</option>
              <option value="Left">Left Hand Only (0-5)</option>
            </select>
          </div>
        )}

        {/* Gaze dwell parameter */}
        {node.type === 'input-gaze-dwell' && (
          <div className="space-y-1">
            <label className="text-[10px] text-ink-muted uppercase block">MIN DWELL TIME (MS)</label>
            <input
              type="number"
              step="50"
              min="200"
              max="3000"
              value={node.params.minDwellMs ?? 600}
              onChange={(e) => handleChangeParam('minDwellMs', parseInt(e.target.value, 10))}
              className="w-full bg-paper-cream border border-charcoal-soft px-2 py-1 text-xs rounded text-charcoal-soft"
            />
          </div>
        )}

        {/* Custom Trained Model parameter */}
        {node.type === 'input-custom-model' && (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-ink-muted uppercase block">LABORATORY MODEL</label>
                <Link
                  href="/laboratory"
                  target="_blank"
                  className="text-[9px] text-accent-cyan hover:underline flex items-center gap-0.5"
                >
                  <span>OPEN LAB</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              </div>
              <select
                value={node.params.modelId ?? ''}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const found = labModels.find((m) => m.id === selectedId);
                  onUpdateParams(node.id, {
                    ...node.params,
                    modelId: selectedId,
                    modelName: found ? found.name : 'Unknown Model',
                  });
                }}
                className="w-full bg-paper-cream border border-charcoal-soft px-2 py-1 text-xs rounded text-charcoal-soft font-mono"
              >
                <option value="">Any Custom Classifier</option>
                {labModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.isBuiltIn ? 'Factory' : 'Custom'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-ink-muted uppercase block">MIN CONFIDENCE</label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="1.0"
                value={node.params.minConfidence ?? 0.7}
                onChange={(e) => handleChangeParam('minConfidence', parseFloat(e.target.value))}
                className="w-full bg-paper-cream border border-charcoal-soft px-2 py-1 text-xs rounded text-charcoal-soft"
              />
            </div>
          </div>
        )}

        {/* Confidence threshold parameter */}
        {node.type === 'proc-threshold' && (
          <div className="space-y-1">
            <label className="text-[10px] text-ink-muted uppercase block">THRESHOLD VALUE (0.0 - 1.0)</label>
            <input
              type="number"
              step="0.05"
              min="0.1"
              max="1.0"
              value={node.params.threshold ?? 0.75}
              onChange={(e) => handleChangeParam('threshold', parseFloat(e.target.value))}
              className="w-full bg-paper-cream border border-charcoal-soft px-2 py-1 text-xs rounded text-charcoal-soft"
            />
          </div>
        )}

        {/* Value match filter */}
        {node.type === 'proc-filter' && (
          <div className="space-y-1">
            <label className="text-[10px] text-ink-muted uppercase block">EXPECTED MATCH VALUE</label>
            <input
              type="text"
              value={node.params.expectedValue ?? ''}
              onChange={(e) => handleChangeParam('expectedValue', e.target.value)}
              placeholder="e.g. open_palm, 3, plastic"
              className="w-full bg-paper-cream border border-charcoal-soft px-2 py-1 text-xs rounded text-charcoal-soft"
            />
          </div>
        )}

        {/* Cooldown parameter */}
        {node.type === 'proc-cooldown' && (
          <div className="space-y-1">
            <label className="text-[10px] text-ink-muted uppercase block">COOLDOWN WINDOW (MS)</label>
            <input
              type="number"
              step="100"
              min="100"
              max="10000"
              value={node.params.cooldownMs ?? 800}
              onChange={(e) => handleChangeParam('cooldownMs', parseInt(e.target.value, 10))}
              className="w-full bg-paper-cream border border-charcoal-soft px-2 py-1 text-xs rounded text-charcoal-soft"
            />
          </div>
        )}

        {/* Numeric comparison parameter */}
        {node.type === 'proc-compare' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-ink-muted uppercase block">OPERATOR</label>
              <select
                value={node.params.operator ?? '=='}
                onChange={(e) => handleChangeParam('operator', e.target.value)}
                className="w-full bg-paper-cream border border-charcoal-soft px-2 py-1 text-xs rounded text-charcoal-soft"
              >
                <option value="==">Equal (==)</option>
                <option value=">">Greater (&gt;)</option>
                <option value="<">Less (&lt;)</option>
                <option value=">=">Greater/Eq (&gt;=)</option>
                <option value="<=">Less/Eq (&lt;=)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-ink-muted uppercase block">TARGET VALUE</label>
              <input
                type="number"
                value={node.params.targetValue ?? 3}
                onChange={(e) => handleChangeParam('targetValue', parseFloat(e.target.value))}
                className="w-full bg-paper-cream border border-charcoal-soft px-2 py-1 text-xs rounded text-charcoal-soft"
              />
            </div>
          </div>
        )}

        {/* Output visual FX parameter */}
        {node.type === 'output-fx' && (
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-ink-muted uppercase block">EFFECT TYPE</label>
              <select
                value={node.params.effectType ?? 'holographic_burst'}
                onChange={(e) => handleChangeParam('effectType', e.target.value)}
                className="w-full bg-paper-cream border border-charcoal-soft px-2 py-1 text-xs rounded text-charcoal-soft"
              >
                <option value="holographic_burst">Holographic Burst</option>
                <option value="quantum_scan">Matrix Quantum Scan</option>
                <option value="ember_burst">Spark Ember Burst</option>
                <option value="laser_pulse">Heat Laser Pulse</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-ink-muted uppercase block">PARTICLE COLOR</label>
              <input
                type="color"
                value={node.params.color ?? '#00E599'}
                onChange={(e) => handleChangeParam('color', e.target.value)}
                className="w-full h-8 bg-paper-cream border border-charcoal-soft px-1 rounded cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Output Toast parameter */}
        {node.type === 'output-toast' && (
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-ink-muted uppercase block">TOAST TITLE</label>
              <input
                type="text"
                value={node.params.title ?? 'COMMAND EXECUTED'}
                onChange={(e) => handleChangeParam('title', e.target.value)}
                className="w-full bg-paper-cream border border-charcoal-soft px-2 py-1 text-xs rounded text-charcoal-soft"
              />
            </div>
            <div>
              <label className="text-[10px] text-ink-muted uppercase block">ALERT VARIANT</label>
              <select
                value={node.params.variant ?? 'sage'}
                onChange={(e) => handleChangeParam('variant', e.target.value)}
                className="w-full bg-paper-cream border border-charcoal-soft px-2 py-1 text-xs rounded text-charcoal-soft"
              >
                <option value="sage">Tactical Sage (Green)</option>
                <option value="brick">Critical Brick (Red)</option>
                <option value="charcoal">Neutral Charcoal (Slate)</option>
              </select>
            </div>
          </div>
        )}

        {/* Output Audio chime parameter */}
        {node.type === 'output-audio-chime' && (
          <div className="space-y-1">
            <label className="text-[10px] text-ink-muted uppercase block">CHIME FREQUENCY (HZ)</label>
            <input
              type="number"
              step="50"
              min="200"
              max="2400"
              value={node.params.frequencyHz ?? 880}
              onChange={(e) => handleChangeParam('frequencyHz', parseInt(e.target.value, 10))}
              className="w-full bg-paper-cream border border-charcoal-soft px-2 py-1 text-xs rounded text-charcoal-soft"
            />
          </div>
        )}

        {/* Output Simulator action */}
        {node.type === 'output-simulator' && (
          <div className="space-y-1">
            <label className="text-[10px] text-ink-muted uppercase block">SIMULATOR ACTION</label>
            <select
              value={node.params.action ?? 'AFTERBURNER_TOGGLE'}
              onChange={(e) => handleChangeParam('action', e.target.value)}
              className="w-full bg-paper-cream border border-charcoal-soft px-2 py-1 text-xs rounded text-charcoal-soft"
            >
              <option value="AFTERBURNER_TOGGLE">Toggle Neon Afterburner</option>
              <option value="EMERGENCY_BRAKE">Trigger Emergency Brake</option>
              <option value="RESET_POSITION">Reset Vehicle Position</option>
            </select>
          </div>
        )}
      </div>

      {/* Node Telemetry Footer */}
      {node.lastExecution && (
        <div className="pt-2 border-t border-charcoal-soft/20 text-[10px] space-y-1 text-ink-muted">
          <div className="flex justify-between">
            <span>LAST EXECUTION:</span>
            <span className="font-bold text-charcoal-soft">
              {node.lastExecution.status.toUpperCase()} ({node.lastExecution.durationMs.toFixed(1)}ms)
            </span>
          </div>
          {node.lastExecution.outputData && (
            <div className="p-1.5 bg-paper-cream border border-charcoal-soft rounded text-[9px] break-all font-mono">
              {JSON.stringify(node.lastExecution.outputData)}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-charcoal-soft/20">
        <button
          onClick={() => onDuplicateNode(node.id)}
          className="flex-1 py-1 px-2 border border-charcoal-soft bg-paper-cream hover:bg-paper-cream-dark text-charcoal-soft rounded flex items-center justify-center gap-1 font-bold text-[10px]"
        >
          <Copy className="w-3 h-3" />
          <span>DUPLICATE</span>
        </button>
        <button
          onClick={() => onDeleteNode(node.id)}
          className="py-1 px-2 border border-brick-red text-brick-red hover:bg-brick-red/10 rounded flex items-center justify-center gap-1 font-bold text-[10px]"
          title="Delete node"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
