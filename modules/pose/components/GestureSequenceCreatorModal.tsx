'use client';

import React, { useState, useMemo } from 'react';
import {
  GestureSequenceDefinition,
  CustomGestureDefinition,
  GoofyHandGestureType,
  MemeVisualDefinition,
  GoofySoundId,
  PopupAnimationStyle,
  DEFAULT_SOUND_LIBRARY,
  GOOFY_HAND_METADATA,
} from '../goofy-types';
import { Button } from '@/components/ui/Button';
import {
  X,
  Zap,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Music,
  Check,
  Hand,
  Clock,
} from 'lucide-react';

interface GestureSequenceCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSequences: GestureSequenceDefinition[];
  customGestures: CustomGestureDefinition[];
  allMemes: MemeVisualDefinition[];
  initialSequence?: GestureSequenceDefinition | null;
  onSaveSequence: (sequence: GestureSequenceDefinition) => void;
  onPreviewSequence?: (sequence: GestureSequenceDefinition) => void;
}

const BUILTIN_GESTURE_OPTIONS: GoofyHandGestureType[] = [
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
  'ROCK_SIGN',
  'OK_GESTURE',
  'CALL_ME',
  'FINGER_HEART',
  'THREE_FINGER_SALUTE',
];

export function GestureSequenceCreatorModal({
  isOpen,
  onClose,
  existingSequences,
  customGestures,
  allMemes,
  initialSequence,
  onSaveSequence,
  onPreviewSequence,
}: GestureSequenceCreatorModalProps) {
  const [seqName, setSeqName] = useState(initialSequence?.label || '');
  const [seqDescription, setSeqDescription] = useState(initialSequence?.description || '');
  const [seqIcon, setSeqIcon] = useState(initialSequence?.icon || '⚡');
  const [maxWindowMs, setMaxWindowMs] = useState(initialSequence?.maxWindowMs || 1800);
  const [assignedMemeId, setAssignedMemeId] = useState(
    initialSequence?.defaultMemeId || allMemes[0]?.id || 'MEME_MAXIMUM_AURA'
  );
  const [assignedSoundId, setAssignedSoundId] = useState<GoofySoundId>(
    initialSequence?.defaultSoundId || 'CHAD_GONG'
  );
  const [defaultCaption, setDefaultCaption] = useState(
    initialSequence?.defaultCaption || 'TEMPORAL COMBO UNLEASHED!'
  );
  const [animationStyle, setAnimationStyle] = useState<PopupAnimationStyle>(
    initialSequence?.animationStyle || 'CINEMATIC'
  );

  // Steps state: array of { gesture: string; hand: 'Any' | 'Left' | 'Right' }
  const [steps, setSteps] = useState<
    { gesture: string; hand: 'Any' | 'Left' | 'Right' }[]
  >(() => {
    if (initialSequence && initialSequence.steps) {
      return initialSequence.steps.map((st, idx) => ({
        gesture: st,
        hand: initialSequence.stepHands?.[idx] || 'Any',
      }));
    }
    return [
      { gesture: 'PEACE_SIGN', hand: 'Any' },
      { gesture: 'THUMBS_UP', hand: 'Any' },
    ];
  });

  const allAvailableGestureOptions = useMemo(() => {
    const list: { id: string; label: string; icon: string; isCustom: boolean }[] = [];

    // Built-in 17 gestures
    for (const g of BUILTIN_GESTURE_OPTIONS) {
      const meta = GOOFY_HAND_METADATA[g];
      list.push({
        id: g,
        label: meta?.label || g,
        icon: meta?.icon || '✋',
        isCustom: false,
      });
    }

    // User custom gestures
    for (const cg of customGestures) {
      list.push({
        id: cg.id,
        label: cg.name,
        icon: cg.icon || '✨',
        isCustom: true,
      });
    }

    return list;
  }, [customGestures]);

  if (!isOpen) return null;

  const handleAddStep = () => {
    if (steps.length >= 5) {
      alert('Sequences are limited to maximum 5 steps for reliable temporal execution.');
      return;
    }
    setSteps((prev) => [...prev, { gesture: 'CLOSED_FIST', hand: 'Any' }]);
  };

  const handleRemoveStep = (idx: number) => {
    if (steps.length <= 2) {
      alert('Sequences require at least 2 steps.');
      return;
    }
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMoveStep = (idx: number, direction: 'UP' | 'DOWN') => {
    const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    const cloned = [...steps];
    const temp = cloned[idx]!;
    cloned[idx] = cloned[targetIdx]!;
    cloned[targetIdx] = temp;
    setSteps(cloned);
  };

  const handleStepGestureChange = (idx: number, newGesture: string) => {
    const cloned = [...steps];
    cloned[idx]!.gesture = newGesture;
    setSteps(cloned);
  };

  const handleStepHandChange = (idx: number, newHand: 'Any' | 'Left' | 'Right') => {
    const cloned = [...steps];
    cloned[idx]!.hand = newHand;
    setSteps(cloned);
  };

  const handleSave = () => {
    if (!seqName.trim()) {
      alert('Please enter a sequence combo name.');
      return;
    }

    const seqId =
      initialSequence?.id || `SEQ_CUSTOM_${Date.now().toString(36).toUpperCase()}`;

    const newSeq: GestureSequenceDefinition = {
      id: seqId,
      label: seqName.trim().toUpperCase(),
      description: seqDescription.trim() || `Custom ${steps.length}-Step Gesture Sequence`,
      steps: steps.map((s) => s.gesture as any),
      stepHands: steps.map((s) => s.hand),
      maxWindowMs,
      defaultMemeId: assignedMemeId,
      defaultSoundId: assignedSoundId,
      defaultCaption: defaultCaption.trim() || `${seqName.toUpperCase()} COMPLETED!`,
      icon: seqIcon,
      isCustom: true,
      animationStyle,
      enabled: true,
    };

    onSaveSequence(newSeq);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-paper-cream border-4 border-charcoal-dark rounded-tactile max-w-3xl w-full p-4 md:p-6 shadow-tactile-lg space-y-4 font-mono text-xs flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-charcoal-soft pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded bg-amber-500 text-charcoal-dark">
              <Zap className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-black text-sm md:text-base uppercase tracking-wider text-charcoal-dark">
                GESTURE SEQUENCE CREATOR // TEMPORAL COMBOS
              </h3>
              <span className="text-[10px] text-ink-muted">
                COMPOSE MULTI-STEP GESTURE PROGRESSIONS (BUILT-IN + CUSTOM GESTURES)
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-paper-dark/30 rounded text-charcoal-dark transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* Sequence Name & Caption */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-ink-muted block">
                SEQUENCE COMBO NAME *
              </label>
              <input
                type="text"
                value={seqName}
                onChange={(e) => setSeqName(e.target.value)}
                placeholder="e.g. TRIPLE DRIP COMBO, ULTIMATE AURA FINISHER"
                className="w-full p-2 border-2 border-charcoal-soft rounded bg-paper-cream text-xs font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-ink-muted block">
                COMIC CAPTION BANNER
              </label>
              <input
                type="text"
                value={defaultCaption}
                onChange={(e) => setDefaultCaption(e.target.value)}
                placeholder="e.g. 3-STEP COMBO UNLEASHED // GOD TIER"
                className="w-full p-2 border-2 border-charcoal-soft rounded bg-paper-cream text-xs font-bold"
              />
            </div>
          </div>

          {/* Sequence Steps Builder Card */}
          <div className="p-3 border-2 border-charcoal-soft rounded-tactile bg-paper-cream space-y-2.5">
            <div className="flex items-center justify-between border-b border-charcoal-soft/20 pb-2">
              <span className="font-black text-xs uppercase text-charcoal-dark flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>COMBO STEPS SEQUENCE ({steps.length} STEPS)</span>
              </span>
              <Button
                size="sm"
                onClick={handleAddStep}
                disabled={steps.length >= 5}
                className="bg-amber-500 hover:bg-amber-600 text-charcoal-dark font-black text-xs gap-1 h-7 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>ADD STEP</span>
              </Button>
            </div>

            <div className="space-y-2">
              {steps.map((st, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded border border-charcoal-soft/30 bg-paper-dark/20 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-charcoal-dark text-paper-cream flex items-center justify-center font-black text-[10px] shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-[10px] uppercase text-ink-muted">STEP {idx + 1}:</span>
                  </div>

                  {/* Gesture selector */}
                  <select
                    value={st.gesture}
                    onChange={(e) => handleStepGestureChange(idx, e.target.value)}
                    className="p-1.5 border border-charcoal-soft rounded bg-paper-cream text-xs font-bold flex-1"
                  >
                    {allAvailableGestureOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.icon} {opt.label} {opt.isCustom ? '(CUSTOM)' : ''}
                      </option>
                    ))}
                  </select>

                  {/* Hand selector */}
                  <select
                    value={st.hand}
                    onChange={(e) => handleStepHandChange(idx, e.target.value as any)}
                    className="p-1.5 border border-charcoal-soft rounded bg-paper-cream text-xs font-bold w-28"
                  >
                    <option value="Any">ANY HAND</option>
                    <option value="Right">RIGHT ONLY</option>
                    <option value="Left">LEFT ONLY</option>
                  </select>

                  {/* Reorder and Delete controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleMoveStep(idx, 'UP')}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-paper-dark/30 disabled:opacity-30 cursor-pointer"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveStep(idx, 'DOWN')}
                      disabled={idx === steps.length - 1}
                      className="p-1 rounded hover:bg-paper-dark/30 disabled:opacity-30 cursor-pointer"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemoveStep(idx)}
                      disabled={steps.length <= 2}
                      className="p-1 rounded hover:bg-rose-100 text-rose-700 disabled:opacity-30 cursor-pointer"
                      title="Remove step"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Visual step chain preview */}
            <div className="p-2 bg-paper-dark/15 rounded flex items-center gap-1.5 text-[10px] font-mono flex-wrap">
              <span className="font-black text-ink-muted uppercase">FLOW:</span>
              {steps.map((s, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="text-amber-600 font-black">&rarr;</span>}
                  <span className="px-1.5 py-0.5 rounded bg-paper-cream border border-charcoal-soft/30 font-bold">
                    {allAvailableGestureOptions.find((o) => o.id === s.gesture)?.icon || '✋'} {s.gesture}
                    {s.hand !== 'Any' ? ` (${s.hand})` : ''}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Time Window Slider */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-[10px] font-black uppercase text-ink-muted flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>MAX ALLOWED TIME PER STEP TRANSITION</span>
              </label>
              <span className="font-black text-amber-700 text-xs">{maxWindowMs}ms</span>
            </div>
            <input
              type="range"
              min="600"
              max="3500"
              step="100"
              value={maxWindowMs}
              onChange={(e) => setMaxWindowMs(parseInt(e.target.value, 10))}
              className="w-full accent-charcoal-soft h-1.5"
            />
          </div>

          {/* Meme & Sound Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-ink-muted block">
                ASSIGNED MEME POP-UP REACTION
              </label>
              <select
                value={assignedMemeId}
                onChange={(e) => setAssignedMemeId(e.target.value)}
                className="w-full p-2 border-2 border-charcoal-soft rounded bg-paper-cream text-xs font-bold"
              >
                {allMemes.map((m) => (
                  <option key={m.id} value={m.id}>
                    🖼️ {m.title} ({m.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-ink-muted block">
                ASSIGNED SOUND EFFECT FX
              </label>
              <select
                value={assignedSoundId}
                onChange={(e) => setAssignedSoundId(e.target.value as GoofySoundId)}
                className="w-full p-2 border-2 border-charcoal-soft rounded bg-paper-cream text-xs font-bold"
              >
                {DEFAULT_SOUND_LIBRARY.map((s) => (
                  <option key={s.id} value={s.id}>
                    🎵 {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Animation Style Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-ink-muted block">
              ANIMATION PRESENTATION STYLE
            </label>
            <select
              value={animationStyle}
              onChange={(e) => setAnimationStyle(e.target.value as PopupAnimationStyle)}
              className="w-full p-2 border-2 border-charcoal-soft rounded bg-paper-cream text-xs font-bold"
            >
              <option value="CINEMATIC">CINEMATIC (LETTERBOX ZOOM)</option>
              <option value="EXPLOSIVE">EXPLOSIVE (COMIC STARBURST)</option>
              <option value="RETRO_ARCADE">RETRO ARCADE (PIXEL CRT)</option>
              <option value="CHAOS">CHAOS (COSMIC ROTATION)</option>
              <option value="CLEAN">CLEAN (STUDIO MINIMAL)</option>
              <option value="CLASSIC">CLASSIC (BOUNCE)</option>
              <option value="MINIMAL">MINIMAL (FADE)</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t-2 border-charcoal-soft pt-3">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs cursor-pointer">
            CANCEL
          </Button>

          <div className="flex items-center gap-2">
            {onPreviewSequence && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onPreviewSequence({
                    id: 'temp_preview',
                    label: seqName || 'PREVIEW COMBO',
                    description: seqDescription,
                    steps: steps.map((s) => s.gesture as any),
                    maxWindowMs,
                    defaultMemeId: assignedMemeId,
                    defaultSoundId: assignedSoundId,
                    defaultCaption,
                    icon: seqIcon,
                    animationStyle,
                  })
                }
                className="text-xs font-bold gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>TEST PREVIEW</span>
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-1.5 shadow-tactile-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>SAVE SEQUENCE COMBO</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Layers({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/>
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>
    </svg>
  );
}
