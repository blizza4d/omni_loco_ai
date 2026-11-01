'use client';

import React from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  MemeVisualDefinition,
  GoofyPoseType,
  GoofyHandGestureType,
  GOOFY_POSE_METADATA,
  GOOFY_HAND_METADATA,
} from '../goofy-types';

interface AssignMemeModalProps {
  meme: MemeVisualDefinition | null;
  currentMappings: Record<string, string>;
  onClose: () => void;
  onAssignToAction: (actionId: string, memeId: string) => void;
}

const BODY_ACTIONS: GoofyPoseType[] = [
  'T_POSE',
  'HANDS_RAISED',
  'HANDS_ON_HIPS',
  'ARMS_CROSSED',
  'SQUAT',
  'JUMP',
  'FLEX_POSE',
  'CLAP',
];

const HAND_GESTURES: GoofyHandGestureType[] = [
  'OPEN_PALM',
  'CLOSED_FIST',
  'THUMBS_UP',
  'THUMBS_DOWN',
  'PEACE_SIGN',
  'POINTING',
  'PINCH',
  'THREE_FINGERS',
  'FOUR_FINGERS',
  'FIVE_FINGERS',
  'SWIPE_LEFT',
  'SWIPE_RIGHT',
];

export function AssignMemeModal({
  meme,
  currentMappings,
  onClose,
  onAssignToAction,
}: AssignMemeModalProps) {
  if (!meme) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-paper-cream border-4 border-charcoal-soft rounded-tactile max-w-xl w-full p-4 md:p-6 shadow-tactile-lg max-h-[85vh] overflow-y-auto font-mono text-xs flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-charcoal-soft pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <div>
              <h3 className="font-black text-sm uppercase text-charcoal-dark">
                ASSIGN MEME TO ACTION
              </h3>
              <span className="text-[11px] text-amber-600 font-bold">
                {meme.title} ({meme.category})
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-1 h-7">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Thumbnail Preview */}
        <div className="flex items-center gap-3 p-2 bg-paper-dark/20 border border-charcoal-soft/30 rounded">
          <div className="w-16 h-12 bg-black rounded overflow-hidden shrink-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={meme.dataUrl} alt={meme.title} className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-xs truncate uppercase text-charcoal-dark">{meme.title}</p>
            <p className="text-[10px] text-ink-muted italic truncate">&quot;{meme.caption}&quot;</p>
          </div>
        </div>

        {/* Action Selection Sections */}
        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          {/* Body Actions */}
          <div>
            <h4 className="font-extrabold text-amber-600 uppercase border-b border-charcoal-soft/20 pb-1 mb-2">
              BODY ACTIONS (8)
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {BODY_ACTIONS.map((actionKey) => {
                const meta = GOOFY_POSE_METADATA[actionKey];
                const isAssigned = currentMappings[actionKey] === meme.id;
                return (
                  <button
                    key={actionKey}
                    onClick={() => {
                      onAssignToAction(actionKey, meme.id);
                      onClose();
                    }}
                    className={`p-2 border rounded text-left transition-all flex items-center justify-between ${
                      isAssigned
                        ? 'border-amber-500 bg-amber-100 text-charcoal-dark font-black'
                        : 'border-charcoal-soft/40 bg-paper-cream hover:border-amber-400 hover:bg-amber-50/40 text-charcoal-dark'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span>{meta.icon}</span>
                      <span className="text-[11px] truncate uppercase">{meta.label}</span>
                    </div>
                    {isAssigned && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hand Gestures */}
          <div>
            <h4 className="font-extrabold text-cyan-600 uppercase border-b border-charcoal-soft/20 pb-1 mb-2">
              HAND GESTURES (12)
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {HAND_GESTURES.map((actionKey) => {
                const meta = GOOFY_HAND_METADATA[actionKey];
                const isAssigned = currentMappings[actionKey] === meme.id;
                return (
                  <button
                    key={actionKey}
                    onClick={() => {
                      onAssignToAction(actionKey, meme.id);
                      onClose();
                    }}
                    className={`p-2 border rounded text-left transition-all flex items-center justify-between ${
                      isAssigned
                        ? 'border-cyan-500 bg-cyan-100 text-charcoal-dark font-black'
                        : 'border-charcoal-soft/40 bg-paper-cream hover:border-cyan-400 hover:bg-cyan-50/40 text-charcoal-dark'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span>{meta.icon}</span>
                      <span className="text-[11px] truncate uppercase">{meta.label}</span>
                    </div>
                    {isAssigned && <Check className="w-3.5 h-3.5 text-cyan-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-charcoal-soft/20 pt-2 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            CANCEL
          </Button>
        </div>
      </div>
    </div>
  );
}
