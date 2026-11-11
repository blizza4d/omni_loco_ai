'use client';

import React, { useState, useMemo } from 'react';
import {
  MemeVisualDefinition,
  GoofySoundId,
  PopupAnimationStyle,
  DEFAULT_SOUND_LIBRARY,
  GOOFY_HAND_METADATA,
  GoofyHandGestureType,
} from '../goofy-types';
import { Button } from '@/components/ui/Button';
import {
  X,
  Sparkles,
  Music,
  Check,
  Plus,
  Trash2,
  Sliders,
  Play,
  Layers,
  Wand2,
} from 'lucide-react';

interface PersonalMemeReactionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetActionId: string;
  targetActionLabel: string;
  allMemes: MemeVisualDefinition[];
  currentAssignedMemeId: string;
  currentSoundId: GoofySoundId;
  currentCaption: string;
  currentAnimationStyle?: PopupAnimationStyle;
  currentDurationMs?: number;
  currentCooldownMs?: number;
  currentMultiMemes?: string[];
  onSaveReaction: (params: {
    actionId: string;
    primaryMemeId: string;
    soundId: GoofySoundId;
    caption: string;
    animationStyle: PopupAnimationStyle;
    durationMs: number;
    cooldownMs: number;
    multiMemes: string[];
  }) => void;
  onPreviewReaction: (
    memeId: string,
    soundId: GoofySoundId,
    caption: string,
    style: PopupAnimationStyle
  ) => void;
}

export function PersonalMemeReactionEditorModal({
  isOpen,
  onClose,
  targetActionId,
  targetActionLabel,
  allMemes,
  currentAssignedMemeId,
  currentSoundId,
  currentCaption,
  currentAnimationStyle = 'CLASSIC',
  currentDurationMs = 1500,
  currentCooldownMs = 600,
  currentMultiMemes = [],
  onSaveReaction,
  onPreviewReaction,
}: PersonalMemeReactionEditorModalProps) {
  const [primaryMemeId, setPrimaryMemeId] = useState(currentAssignedMemeId || allMemes[0]?.id || '');
  const [soundId, setSoundId] = useState<GoofySoundId>(currentSoundId || 'CHAD_GONG');
  const [caption, setCaption] = useState(currentCaption || '');
  const [animationStyle, setAnimationStyle] = useState<PopupAnimationStyle>(currentAnimationStyle);
  const [durationMs, setDurationMs] = useState(currentDurationMs);
  const [cooldownMs, setCooldownMs] = useState(currentCooldownMs);
  const [multiMemes, setMultiMemes] = useState<string[]>(currentMultiMemes);

  // Search filter for memes
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredMemes = useMemo(() => {
    return allMemes.filter((m) => {
      const matchSearch =
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ?? false);
      const matchCat = selectedCategory === 'ALL' || m.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [allMemes, searchQuery, selectedCategory]);

  const selectedPrimaryMeme = useMemo(() => {
    return allMemes.find((m) => m.id === primaryMemeId) || allMemes[0];
  }, [allMemes, primaryMemeId]);

  if (!isOpen) return null;

  const toggleMultiMeme = (memeId: string) => {
    setMultiMemes((prev) =>
      prev.includes(memeId) ? prev.filter((id) => id !== memeId) : [...prev, memeId]
    );
  };

  const handleSave = () => {
    onSaveReaction({
      actionId: targetActionId,
      primaryMemeId,
      soundId,
      caption,
      animationStyle,
      durationMs,
      cooldownMs,
      multiMemes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-paper-cream border-4 border-charcoal-dark rounded-tactile max-w-3xl w-full p-4 md:p-6 shadow-tactile-lg space-y-4 font-mono text-xs flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-charcoal-soft pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded bg-amber-500 text-charcoal-dark">
              <Sliders className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-black text-sm md:text-base uppercase tracking-wider text-charcoal-dark">
                PERSONAL REACTION EDITOR: {targetActionLabel}
              </h3>
              <span className="text-[10px] text-ink-muted">
                CUSTOMIZE MEME VISUALS, MULTI-CANDIDATE ROTATION, SOUND EFFECTS & ANIMATION
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

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* Active Primary Meme Card Preview */}
          <div className="p-3 border-2 border-charcoal-soft rounded-tactile bg-paper-cream flex flex-wrap sm:flex-nowrap gap-3 items-center">
            {selectedPrimaryMeme && (
              <div className="w-24 h-24 rounded bg-black flex items-center justify-center overflow-hidden shrink-0 border border-charcoal-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedPrimaryMeme.dataUrl}
                  alt={selectedPrimaryMeme.title}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-xs uppercase text-charcoal-dark truncate">
                  {selectedPrimaryMeme?.title || 'No meme selected'}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-amber-400 text-charcoal-dark font-black text-[9px]">
                  PRIMARY
                </span>
              </div>
              <p className="text-[11px] text-ink-muted italic truncate">
                &quot;{caption || selectedPrimaryMeme?.caption || 'Reaction Caption'}&quot;
              </p>
              <div className="flex items-center gap-2 text-[10px] text-ink-muted">
                <span>SOUND: {soundId}</span>
                <span>&bull;</span>
                <span>STYLE: {animationStyle}</span>
                <span>&bull;</span>
                <span>DURATION: {durationMs}ms</span>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onPreviewReaction(primaryMemeId, soundId, caption, animationStyle)
              }
              className="text-xs font-bold gap-1 shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>TEST PREVIEW</span>
            </Button>
          </div>

          {/* Comic Caption Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-ink-muted block">
              COMIC CAPTION BANNER
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. MAXIMUM POWER UNLEASHED // LEVEL 999"
              className="w-full p-2 border-2 border-charcoal-soft rounded bg-paper-cream text-xs font-mono font-bold"
            />
          </div>

          {/* Sound Effect & Animation Style Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-ink-muted block">
                SOUND EFFECT FX
              </label>
              <select
                value={soundId}
                onChange={(e) => setSoundId(e.target.value as GoofySoundId)}
                className="w-full p-2 border-2 border-charcoal-soft rounded bg-paper-cream text-xs font-mono font-bold"
              >
                {DEFAULT_SOUND_LIBRARY.map((s) => (
                  <option key={s.id} value={s.id}>
                    🎵 {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-ink-muted block">
                ANIMATION PRESENTATION STYLE
              </label>
              <select
                value={animationStyle}
                onChange={(e) => setAnimationStyle(e.target.value as PopupAnimationStyle)}
                className="w-full p-2 border-2 border-charcoal-soft rounded bg-paper-cream text-xs font-mono font-bold"
              >
                <option value="CINEMATIC">CINEMATIC (LETTERBOX ZOOM)</option>
                <option value="EXPLOSIVE">EXPLOSIVE (COMIC STARBURST)</option>
                <option value="RETRO_ARCADE">RETRO ARCADE (PIXEL CRT)</option>
                <option value="CHAOS">CHAOS (COSMIC ROTATION)</option>
                <option value="CLEAN">CLEAN (STUDIO MINIMAL)</option>
                <option value="CLASSIC">CLASSIC (BOUNCE)</option>
                <option value="MINIMAL">MINIMAL (FADE)</option>
                <option value="NO_ANIMATION">NO ANIMATION (INSTANT)</option>
              </select>
            </div>
          </div>

          {/* Duration & Cooldown Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] font-black uppercase text-ink-muted">
                  DISPLAY DURATION
                </label>
                <span className="font-bold text-amber-700 text-xs">{durationMs}ms</span>
              </div>
              <input
                type="range"
                min="500"
                max="4000"
                step="100"
                value={durationMs}
                onChange={(e) => setDurationMs(parseInt(e.target.value, 10))}
                className="w-full accent-charcoal-soft h-1.5"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] font-black uppercase text-ink-muted">
                  GESTURE COOLDOWN
                </label>
                <span className="font-bold text-amber-700 text-xs">{cooldownMs}ms</span>
              </div>
              <input
                type="range"
                min="200"
                max="2000"
                step="50"
                value={cooldownMs}
                onChange={(e) => setCooldownMs(parseInt(e.target.value, 10))}
                className="w-full accent-charcoal-soft h-1.5"
              />
            </div>
          </div>

          {/* Multi-Candidate Selection Pool */}
          <div className="space-y-2 border-t border-charcoal-soft/20 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-extrabold text-xs uppercase text-charcoal-dark block">
                  MEME REACTION CANDIDATES (POOL: {multiMemes.length} SELECTED)
                </span>
                <span className="text-[10px] text-ink-muted">
                  Assign multiple memes for variety. The engine randomly selects or dynamically alternates among them!
                </span>
              </div>
            </div>

            {/* Filter inputs */}
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memes by name or tag..."
                className="flex-1 p-1.5 border border-charcoal-soft rounded text-xs bg-paper-cream"
              />
            </div>

            {/* Meme Grid Picker */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
              {filteredMemes.map((m) => {
                const isPrimary = primaryMemeId === m.id;
                const isMulti = multiMemes.includes(m.id);

                return (
                  <div
                    key={m.id}
                    onClick={() => setPrimaryMemeId(m.id)}
                    className={`p-1.5 rounded border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isPrimary
                        ? 'border-amber-500 bg-amber-100 ring-2 ring-amber-500'
                        : isMulti
                        ? 'border-cyan-500 bg-cyan-50'
                        : 'border-charcoal-soft/30 bg-paper-dark/15 hover:bg-paper-dark/30'
                    }`}
                  >
                    <div>
                      <div className="aspect-[4/3] rounded bg-black overflow-hidden flex items-center justify-center mb-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.dataUrl}
                          alt={m.title}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="font-bold text-[10px] uppercase truncate block">
                        {m.title}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-charcoal-soft/10 text-[9px] mt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrimaryMemeId(m.id);
                        }}
                        className={`px-1 py-0.5 rounded font-black cursor-pointer ${
                          isPrimary ? 'bg-amber-500 text-charcoal-dark' : 'text-ink-muted hover:underline'
                        }`}
                      >
                        {isPrimary ? 'PRIMARY' : 'SET PRIMARY'}
                      </button>

                      <label
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 cursor-pointer"
                        title="Add to multi-meme rotation pool"
                      >
                        <input
                          type="checkbox"
                          checked={isMulti}
                          onChange={() => toggleMultiMeme(m.id)}
                          className="accent-cyan-600"
                        />
                        <span className="text-[9px]">POOL</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t-2 border-charcoal-soft pt-3">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs cursor-pointer">
            CANCEL
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-1.5 shadow-tactile-sm cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>SAVE PERSONAL REACTION</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
