'use client';

import React, { useState } from 'react';
import {
  CustomReactionRule,
  CustomRuleTriggerType,
  GoofyFaceExpressionType,
  GoofyHandGestureType,
  GoofyDualHandComboId,
  GoofyMultimodalComboId,
  GoofySoundId,
  MemeVisualDefinition,
  PopupAnimationStyle,
  GOOFY_FACE_METADATA,
  GOOFY_HAND_METADATA,
  GOOFY_DUAL_COMBO_DEFINITIONS,
  GOOFY_MULTIMODAL_COMBO_DEFINITIONS,
  DEFAULT_SOUND_LIBRARY,
} from '../goofy-types';
import {
  validateCustomReactionRule,
  duplicateCustomReactionRule,
} from '../goofy-custom-rules';

interface CustomReactionStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: CustomReactionRule[];
  allMemes: MemeVisualDefinition[];
  onSaveRules: (updatedRules: CustomReactionRule[]) => void;
  onPreviewRule: (rule: CustomReactionRule) => void;
  onPreviewSound: (soundId: GoofySoundId) => void;
  onUploadMemeFile?: (file: File) => Promise<MemeVisualDefinition | null>;
}

const ANIMATION_PRESETS: { id: PopupAnimationStyle; label: string }[] = [
  { id: 'CLASSIC', label: 'CLASSIC' },
  { id: 'EXPLOSIVE', label: 'EXPLOSIVE' },
  { id: 'CINEMATIC', label: 'CINEMATIC' },
  { id: 'RETRO_ARCADE', label: 'RETRO ARCADE' },
  { id: 'GLITCH', label: 'GLITCH' },
  { id: 'CHAOS', label: 'CHAOS' },
  { id: 'MINIMAL', label: 'MINIMAL' },
];

export function CustomReactionStudioModal({
  isOpen,
  onClose,
  rules,
  allMemes,
  onSaveRules,
  onPreviewRule,
  onPreviewSound,
  onUploadMemeFile,
}: CustomReactionStudioModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('MY CUSTOM REACTION');
  const [triggerType, setTriggerType] = useState<CustomRuleTriggerType>('COMBINED');
  const [faceCondition, setFaceCondition] = useState<GoofyFaceExpressionType>('FACE_SMILE');
  const [handCondition, setHandCondition] = useState<GoofyHandGestureType | GoofyDualHandComboId>('THUMBS_UP');
  const [combinedCondition, setCombinedCondition] = useState<GoofyMultimodalComboId | ''>('');
  const [memeId, setMemeId] = useState<string>(allMemes[0]?.id || 'REAL_MEME_GIGACHAD');
  const [soundId, setSoundId] = useState<GoofySoundId>('CHAD_GONG');
  const [caption, setCaption] = useState('CERTIFIED LEGENDARY MOMENT');
  const [animationStyle, setAnimationStyle] = useState<PopupAnimationStyle>('CINEMATIC');
  const [durationMs, setDurationMs] = useState<number>(2000);
  const [priority, setPriority] = useState<number>(75);
  const [memeSearch, setMemeSearch] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const faceOptions = Object.values(GOOFY_FACE_METADATA);
  const handOptions = Object.values(GOOFY_HAND_METADATA);
  const dualOptions = Object.values(GOOFY_DUAL_COMBO_DEFINITIONS);
  const comboOptions = Object.values(GOOFY_MULTIMODAL_COMBO_DEFINITIONS);

  const filteredMemes = allMemes
    .filter((m) => {
      if (!memeSearch.trim()) return true;
      const q = memeSearch.toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        (m.caption || '').toLowerCase().includes(q)
      );
    })
    .slice(0, 24);

  const buildDraftCandidate = (): Partial<CustomReactionRule> => ({
    id: editingId || undefined,
    name,
    enabled: true,
    triggerType,
    faceCondition: triggerType === 'FACE' || (triggerType === 'COMBINED' && !combinedCondition) ? faceCondition : undefined,
    handCondition: triggerType === 'HAND' || (triggerType === 'COMBINED' && !combinedCondition) ? handCondition : undefined,
    combinedCondition: triggerType === 'COMBINED' && combinedCondition ? combinedCondition : undefined,
    memeId,
    soundId,
    caption,
    animationStyle,
    durationMs,
    priority,
  });

  const handlePreview = () => {
    const res = validateCustomReactionRule(buildDraftCandidate());
    if (!res.valid || !res.sanitized) {
      setValidationErrors(res.errors);
      return;
    }
    setValidationErrors([]);
    onPreviewRule(res.sanitized);
  };

  const handleSave = () => {
    const res = validateCustomReactionRule(buildDraftCandidate());
    if (!res.valid || !res.sanitized) {
      setValidationErrors(res.errors);
      return;
    }
    setValidationErrors([]);
    const saved = res.sanitized;
    const exists = rules.some((r) => r.id === saved.id);
    const next = exists
      ? rules.map((r) => (r.id === saved.id ? saved : r))
      : [saved, ...rules];
    onSaveRules(next);
    setEditingId(null);
  };

  const handleEditRule = (rule: CustomReactionRule) => {
    setEditingId(rule.id);
    setName(rule.name);
    setTriggerType(rule.triggerType);
    if (rule.faceCondition) setFaceCondition(rule.faceCondition);
    if (rule.handCondition) setHandCondition(rule.handCondition);
    setCombinedCondition(rule.combinedCondition || '');
    setMemeId(rule.memeId);
    setSoundId(rule.soundId);
    setCaption(rule.caption);
    setAnimationStyle(rule.animationStyle);
    setDurationMs(rule.durationMs);
    setPriority(rule.priority ?? 50);
    setValidationErrors([]);
  };

  const handleDuplicateRule = (rule: CustomReactionRule) => {
    const copy = duplicateCustomReactionRule(rule);
    onSaveRules([copy, ...rules]);
  };

  const handleToggleRule = (id: string) => {
    onSaveRules(rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const handleDeleteRule = (id: string) => {
    onSaveRules(rules.filter((r) => r.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadMemeFile) return;
    setUploadStatus('Uploading media...');
    const created = await onUploadMemeFile(file);
    if (created) {
      setMemeId(created.id);
      setUploadStatus(`Uploaded & selected: ${created.title}`);
    } else {
      setUploadStatus('Upload failed — use PNG, JPG, WEBP, or GIF');
    }
  };

  const selectedMeme = allMemes.find((m) => m.id === memeId);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-950 border-2 border-cyan-500/40 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/90 border-b border-white/10">
          <div>
            <h2 className="font-mono text-sm font-black uppercase tracking-widest text-cyan-300">
              CUSTOM REACTION STUDIO // V9 DECLARATIVE RULE ENGINE
            </h2>
            <p className="font-mono text-[10px] text-slate-400">
              Build face, hand, or combined multimodal reaction rules with validated safe conditions & isolated live preview.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold"
          >
            CLOSE ✕
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-5 overflow-y-auto flex-1">
          {/* Left Column: Rule Builder Form */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={64}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Trigger Modality
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(['FACE', 'HAND', 'COMBINED'] as CustomRuleTriggerType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTriggerType(t)}
                      className={`py-2 rounded-lg font-mono text-[10px] font-black transition-all ${
                        triggerType === t
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-900 text-slate-400 border border-slate-700 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Trigger Condition Selectors */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
              {(triggerType === 'FACE' || triggerType === 'COMBINED') && (
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase text-amber-300 mb-1">
                    Face Expression Condition
                  </label>
                  <select
                    value={faceCondition}
                    onChange={(e) => {
                      setFaceCondition(e.target.value as GoofyFaceExpressionType);
                      setCombinedCondition('');
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs"
                  >
                    {faceOptions.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.icon} {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(triggerType === 'HAND' || triggerType === 'COMBINED') && (
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase text-cyan-300 mb-1">
                    Hand Gesture / Dual Combo Condition
                  </label>
                  <select
                    value={handCondition}
                    onChange={(e) => {
                      setHandCondition(e.target.value as GoofyHandGestureType | GoofyDualHandComboId);
                      setCombinedCondition('');
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs"
                  >
                    <optgroup label="Single-Hand Gestures">
                      {handOptions.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.icon} {h.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Dual-Hand Combos">
                      {dualOptions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.icon} {d.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}

              {triggerType === 'COMBINED' && (
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase text-fuchsia-300 mb-1">
                    Or Override Built-in Combined Event (Optional)
                  </label>
                  <select
                    value={combinedCondition}
                    onChange={(e) => setCombinedCondition(e.target.value as GoofyMultimodalComboId | '')}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs"
                  >
                    <option value="">Use Custom Face + Hand Pair Above</option>
                    {comboOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Caption, Sound, Animation, Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Reaction Caption
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={140}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Sound Effect
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={soundId}
                    onChange={(e) => setSoundId(e.target.value as GoofySoundId)}
                    className="flex-1 px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                  >
                    {DEFAULT_SOUND_LIBRARY.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onPreviewSound(soundId)}
                    className="px-2.5 py-2 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-300 font-mono text-[10px] font-bold hover:bg-amber-500/30"
                  >
                    ▶
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Animation Preset
                </label>
                <select
                  value={animationStyle}
                  onChange={(e) => setAnimationStyle(e.target.value as PopupAnimationStyle)}
                  className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                >
                  {ANIMATION_PRESETS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Display Duration: {durationMs}ms
                </label>
                <input
                  type="range"
                  min={500}
                  max={6000}
                  step={100}
                  value={durationMs}
                  onChange={(e) => setDurationMs(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Priority: {priority}
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-full accent-fuchsia-400"
                />
              </div>
            </div>

            {/* Meme Picker & Upload */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-mono text-[10px] font-black uppercase text-emerald-300">
                  Selected Meme: {selectedMeme?.title || memeId}
                </span>
                {onUploadMemeFile && (
                  <label className="cursor-pointer px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-mono text-[10px] font-bold hover:bg-emerald-500/30">
                    + UPLOAD IMAGE / GIF
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              {uploadStatus && (
                <p className="font-mono text-[10px] text-amber-300">{uploadStatus}</p>
              )}
              <input
                type="text"
                placeholder="Search meme library..."
                value={memeSearch}
                onChange={(e) => setMemeSearch(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs"
              />
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto pr-1">
                {filteredMemes.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMemeId(m.id)}
                    className={`rounded-lg overflow-hidden border-2 text-left transition-all ${
                      memeId === m.id
                        ? 'border-cyan-400 ring-2 ring-cyan-400/40'
                        : 'border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="aspect-square bg-black flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.dataUrl}
                        alt={m.title}
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="px-1 py-0.5 bg-slate-950 font-mono text-[8px] text-slate-300 truncate">
                      {m.title}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {validationErrors.length > 0 && (
              <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/50 font-mono text-[11px] text-rose-300">
                {validationErrors.map((err, i) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handlePreview}
                className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-400 text-amber-300 font-mono text-xs font-black hover:bg-amber-500/30"
              >
                👁 PREVIEW REACTION
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-black"
              >
                {editingId ? 'UPDATE RULE' : '+ SAVE CUSTOM RULE'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs font-bold"
                >
                  CANCEL EDIT
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Saved Rules List */}
          <div className="lg:col-span-5 flex flex-col bg-slate-900/50 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-mono text-xs font-black uppercase text-white">
                SAVED RULES ({rules.length})
              </h3>
              <span className="font-mono text-[9px] text-slate-400">
                PERSISTED LOCALLY
              </span>
            </div>

            {rules.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center p-6 font-mono text-xs text-slate-500">
                No custom rules yet. Configure a Face, Hand, or Combined trigger on the left and save it here.
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[540px] pr-1">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-2.5 rounded-lg border transition-all ${
                      rule.enabled
                        ? 'bg-slate-950/90 border-slate-700'
                        : 'bg-slate-950/40 border-slate-800 opacity-55'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-black text-white truncate">
                        {rule.name}
                      </span>
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {rule.triggerType}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-400 mt-1">
                      {rule.combinedCondition
                        ? `Combo: ${rule.combinedCondition}`
                        : [rule.faceCondition, rule.handCondition].filter(Boolean).join(' + ')}
                      {' • '}
                      {rule.animationStyle} ({rule.durationMs}ms)
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onPreviewRule(rule)}
                        className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px] font-bold"
                      >
                        PREVIEW
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditRule(rule)}
                        className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[9px] font-bold"
                      >
                        EDIT
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateRule(rule)}
                        className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[9px] font-bold"
                      >
                        DUPLICATE
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleRule(rule.id)}
                        className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[9px] font-bold"
                      >
                        {rule.enabled ? 'DISABLE' : 'ENABLE'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[9px] font-bold ml-auto"
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
