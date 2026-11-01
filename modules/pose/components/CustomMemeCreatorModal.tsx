'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Upload,
  Sparkles,
  Type,
  Palette,
  Stamp,
  Sliders,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MemeVisualDefinition, MemeCategory } from '../goofy-types';
import { saveCustomMemeDefinitionToDB } from '../goofy-meme-library';

interface CustomMemeCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMeme: (meme: MemeVisualDefinition, targetAction?: string) => void;
  targetAction?: string | null;
}

const STAMP_PRESETS = [
  { id: 'NONE', label: 'NO STAMP' },
  { id: 'APPROVED', label: 'APPROVED', color: '#16A34A' },
  { id: 'FAIL', label: 'FAIL', color: '#DC2626' },
  { id: 'CENSORED', label: 'CENSORED', color: '#111827' },
  { id: 'AURA_1000', label: 'AURA +1000', color: '#EAB308' },
  { id: 'BRUH', label: 'BRUH MOMENT', color: '#9333EA' },
  { id: 'EMOTIONAL_DAMAGE', label: 'EMOTIONAL DAMAGE', color: '#EA580C' },
];

const BORDER_STYLES = [
  { id: 'NONE', label: 'NO BORDER' },
  { id: 'COMIC', label: 'COMIC POP (YELLOW/RED)' },
  { id: 'NOIR', label: 'NOIR FRAMED (BLACK/WHITE)' },
  { id: 'NEON', label: 'CYAN NEON GLOW' },
];

const COLOR_SWATCHES = ['#FFFFFF', '#FACC15', '#EF4444', '#06B6D4', '#22C55E', '#EC4899'];

export function CustomMemeCreatorModal({
  isOpen,
  onClose,
  onSaveMeme,
  targetAction,
}: CustomMemeCreatorModalProps) {
  const [title, setTitle] = useState('MY CUSTOM MEME');
  const [topText, setTopText] = useState('WHEN YOU WRITE CODE');
  const [bottomText, setBottomText] = useState('AND IT COMPILES ON FIRST TRY');
  const [category, setCategory] = useState<MemeCategory>('CELEBRATION');
  const [fontSize, setFontSize] = useState<number>(32);
  const [textColor, setTextColor] = useState<string>('#FFFFFF');
  const [textAlign, setTextAlign] = useState<'center' | 'left' | 'right'>('center');
  const [borderStyle, setBorderStyle] = useState<string>('COMIC');
  const [stamp, setStamp] = useState<string>('APPROVED');
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [bgColor, setBgColor] = useState<string>('#1E293B');
  const [isSaving, setIsSaving] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load custom user image from disk
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setBgImage(img);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Live Canvas Rendering Routine
  const drawMemeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Background
    if (bgImage) {
      // Cover fit
      const scale = Math.max(width / bgImage.width, height / bgImage.height);
      const x = width / 2 - (bgImage.width / 2) * scale;
      const y = height / 2 - (bgImage.height / 2) * scale;
      ctx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);
    } else {
      // Procedural background pattern
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      // Radial halftone dots
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      for (let rx = 10; rx < width; rx += 25) {
        for (let ry = 10; ry < height; ry += 25) {
          ctx.beginPath();
          ctx.arc(rx, ry, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Default placeholder text if no image
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[UPLOAD IMAGE OR USE CANVAS]', width / 2, height / 2);
    }

    // 2. Draw Decorative Borders
    if (borderStyle === 'COMIC') {
      ctx.lineWidth = 14;
      ctx.strokeStyle = '#FACC15'; // Yellow
      ctx.strokeRect(7, 7, width - 14, height - 14);

      ctx.lineWidth = 4;
      ctx.strokeStyle = '#DC2626'; // Red
      ctx.strokeRect(16, 16, width - 32, height - 32);
    } else if (borderStyle === 'NOIR') {
      ctx.lineWidth = 18;
      ctx.strokeStyle = '#09090B';
      ctx.strokeRect(9, 9, width - 18, height - 18);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FFFFFF';
      ctx.strokeRect(20, 20, width - 40, height - 40);
    } else if (borderStyle === 'NEON') {
      ctx.shadowColor = '#06B6D4';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#06B6D4';
      ctx.strokeRect(4, 4, width - 8, height - 8);
      ctx.shadowBlur = 0;
    }

    // 3. Render Top Text
    const renderMemeText = (text: string, yPos: number, isTop: boolean) => {
      if (!text.trim()) return;
      ctx.save();
      ctx.font = `900 ${fontSize}px "Impact", "Arial Black", sans-serif`;
      ctx.fillStyle = textColor;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(4, Math.round(fontSize / 6));
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.textAlign = textAlign;
      ctx.textBaseline = isTop ? 'top' : 'bottom';

      let xPos = width / 2;
      if (textAlign === 'left') xPos = 24;
      if (textAlign === 'right') xPos = width - 24;

      const lines = text.toUpperCase().split('\n');
      const lineHeight = fontSize * 1.15;

      lines.forEach((line, idx) => {
        const offset = isTop ? idx * lineHeight : -(lines.length - 1 - idx) * lineHeight;
        ctx.strokeText(line, xPos, yPos + offset);
        ctx.fillText(line, xPos, yPos + offset);
      });
      ctx.restore();
    };

    renderMemeText(topText, 24, true);
    renderMemeText(bottomText, height - 24, false);

    // 4. Render Stamp Overlay
    const activeStampDef = STAMP_PRESETS.find((s) => s.id === stamp && s.id !== 'NONE');
    if (activeStampDef && activeStampDef.color) {
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate((-18 * Math.PI) / 180);

      // Stamp Box
      ctx.lineWidth = 5;
      ctx.strokeStyle = activeStampDef.color;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';

      const stampText = activeStampDef.label;
      ctx.font = '900 24px monospace';
      const textWidth = ctx.measureText(stampText).width;
      const boxW = textWidth + 30;
      const boxH = 46;

      ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
      ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

      // Inset dashed border
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.strokeRect(-boxW / 2 + 3, -boxH / 2 + 3, boxW - 6, boxH - 6);
      ctx.setLineDash([]);

      // Stamp Text
      ctx.fillStyle = activeStampDef.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stampText, 0, 0);

      ctx.restore();
    }
  }, [
    bgImage,
    bgColor,
    borderStyle,
    topText,
    bottomText,
    fontSize,
    textColor,
    textAlign,
    stamp,
  ]);

  useEffect(() => {
    if (isOpen) {
      drawMemeCanvas();
    }
  }, [isOpen, drawMemeCanvas]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const customId = `MEME_CUSTOM_${Date.now()}`;

      const newMeme: MemeVisualDefinition = {
        id: customId,
        title: title.trim() || 'CUSTOM MEME',
        category,
        dataUrl,
        isCustom: true,
        caption: (topText + ' ' + bottomText).trim() || 'CUSTOM COMEDY MOMENT',
        description: 'User-created custom meme via Canvas Creator.',
        rarity: 'UNCOMMON',
        createdAt: Date.now(),
        isFavorite: true,
        suggestedActions: targetAction ? [targetAction as any] : ['T_POSE', 'THUMBS_UP'],
      };

      await saveCustomMemeDefinitionToDB(newMeme);
      onSaveMeme(newMeme, targetAction || undefined);
      onClose();
    } catch (err) {
      console.error('[CustomMemeCreator] Failed to save custom meme:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-paper-cream border-4 border-charcoal-soft rounded-tactile max-w-4xl w-full p-4 md:p-6 shadow-tactile-lg max-h-[90vh] overflow-y-auto font-mono text-xs flex flex-col space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-charcoal-soft pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="font-black text-sm uppercase text-charcoal-dark">
              CUSTOM MEME CREATOR & STUDIO
            </h3>
            {targetAction && (
              <span className="px-2 py-0.5 rounded bg-amber-400 text-charcoal-dark font-extrabold text-[10px]">
                FOR: {targetAction}
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-1 h-7">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Studio Layout: Canvas Stage Left, Customizer Tools Right */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Canvas Preview Stage (5 Cols) */}
          <div className="md:col-span-5 space-y-3">
            <div className="border-4 border-charcoal-dark rounded-tactile overflow-hidden bg-black shadow-tactile-sm aspect-square flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={500}
                height={500}
                className="w-full h-full object-contain"
              />
            </div>

            <label className="border-2 border-dashed border-charcoal-soft rounded p-2 bg-paper-dark/30 hover:bg-paper-dark/50 cursor-pointer flex items-center justify-center gap-2 text-center text-charcoal-dark font-bold text-[11px]">
              <Upload className="w-3.5 h-3.5 text-amber-500" />
              <span>UPLOAD BACKGROUND IMAGE</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            {bgImage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBgImage(null)}
                className="w-full text-[10px] h-6 text-rose-600 gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>REMOVE BACKGROUND IMAGE</span>
              </Button>
            )}
          </div>

          {/* Controls Deck (7 Cols) */}
          <div className="md:col-span-7 space-y-3">
            {/* Title & Category */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-ink-muted uppercase block">
                  MEME TITLE
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My Custom Reaction"
                  className="w-full p-1.5 border border-charcoal-soft rounded bg-paper-cream text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-ink-muted uppercase block">
                  CATEGORY
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as MemeCategory)}
                  className="w-full p-1.5 border border-charcoal-soft rounded bg-paper-cream text-xs font-mono font-bold"
                >
                  <option value="CONFUSION">CONFUSION</option>
                  <option value="SHOCK">SHOCK & DISBELIEF</option>
                  <option value="CONFIDENCE">CONFIDENCE & VICTORY</option>
                  <option value="FAILURE">FAILURE & REGRET</option>
                  <option value="SUSPICIOUS">SUSPICIOUS & JUDGMENT</option>
                  <option value="CELEBRATION">CELEBRATION & CHAOS</option>
                  <option value="SPECIAL">SPECIAL / RARE</option>
                  <option value="CUSTOM">CUSTOM</option>
                </select>
              </div>
            </div>

            {/* Top Text */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-ink-muted uppercase flex items-center gap-1">
                <Type className="w-3 h-3" />
                TOP CAPTION (IMPACT OUTLINE)
              </span>
              <input
                type="text"
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                placeholder="TOP MEME TEXT..."
                className="w-full p-1.5 border border-charcoal-soft rounded bg-paper-cream text-xs font-mono font-bold uppercase"
              />
            </div>

            {/* Bottom Text */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-ink-muted uppercase flex items-center gap-1">
                <Type className="w-3 h-3" />
                BOTTOM CAPTION (IMPACT OUTLINE)
              </span>
              <input
                type="text"
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
                placeholder="BOTTOM MEME TEXT..."
                className="w-full p-1.5 border border-charcoal-soft rounded bg-paper-cream text-xs font-mono font-bold uppercase"
              />
            </div>

            {/* Font Size & Align */}
            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span>FONT SIZE</span>
                  <span className="text-amber-600">{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="18"
                  max="52"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                  className="w-full accent-charcoal-soft h-1.5"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-ink-muted uppercase block">
                  ALIGNMENT
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => setTextAlign(align)}
                      className={`p-1 rounded text-[10px] font-bold uppercase border ${
                        textAlign === align
                          ? 'bg-charcoal-soft text-paper-cream border-charcoal-soft'
                          : 'bg-paper-cream text-charcoal-dark border-charcoal-soft/30'
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Color Swatches */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-ink-muted uppercase flex items-center gap-1">
                <Palette className="w-3 h-3" />
                TEXT COLOR
              </span>
              <div className="flex items-center gap-2">
                {COLOR_SWATCHES.map((color) => (
                  <button
                    key={color}
                    onClick={() => setTextColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-6 h-6 rounded-full border-2 ${
                      textColor === color ? 'border-black ring-2 ring-amber-400' : 'border-black/30'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Border & Stamp Controls */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-ink-muted uppercase flex items-center gap-1">
                  <Sliders className="w-3 h-3" />
                  BORDER STYLE
                </span>
                <select
                  value={borderStyle}
                  onChange={(e) => setBorderStyle(e.target.value)}
                  className="w-full p-1.5 border border-charcoal-soft rounded bg-paper-cream text-xs font-mono font-bold"
                >
                  {BORDER_STYLES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-ink-muted uppercase flex items-center gap-1">
                  <Stamp className="w-3 h-3" />
                  COMIC STAMP
                </span>
                <select
                  value={stamp}
                  onChange={(e) => setStamp(e.target.value)}
                  className="w-full p-1.5 border border-charcoal-soft rounded bg-paper-cream text-xs font-mono font-bold"
                >
                  {STAMP_PRESETS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t-2 border-charcoal-soft pt-3 flex justify-between items-center">
          <Button variant="outline" size="sm" onClick={onClose}>
            CANCEL
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 text-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isSaving ? 'SAVING MEME...' : 'SAVE TO MEME LIBRARY'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
