'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { StampBadge } from '@/components/ui/StampBadge';
import { DeskCard } from '@/components/ui/DeskCard';
import { RefreshCw } from 'lucide-react';

export interface MouseFreeDemoBoardProps {
  cursorRef: React.MutableRefObject<{
    x: number;
    y: number;
    isPinching: boolean;
    dwellProgress: number;
  }>;
  onRecalibrate: () => void;
  handedness: 'Left' | 'Right';
  onHandednessChange: (h: 'Left' | 'Right') => void;
}

export function MouseFreeDemoBoard({
  cursorRef,
  onRecalibrate,
  handedness,
  onHandednessChange,
}: MouseFreeDemoBoardProps) {
  const [buttonClickedCount, setButtonClickedCount] = useState(0);
  const [sliderVal, setSliderVal] = useState(45);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [lastAction, setLastAction] = useState<string>('READY FOR SPATIAL PINCH OR DWELL');

  const boardRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const sliderTrackRef = useRef<HTMLDivElement | null>(null);
  const cardStackRef = useRef<HTMLDivElement | null>(null);
  const reticleRef = useRef<HTMLDivElement | null>(null);

  const isDraggingCardRef = useRef(false);
  const cardOffsetRef = useRef({ x: 0, y: 0 });
  const lastActionTimeRef = useRef(0);

  // Cached bounding rects to prevent forced synchronous reflows
  const rectsCache = useRef<{
    board: DOMRect | null;
    button: DOMRect | null;
    slider: DOMRect | null;
    card: DOMRect | null;
  }>({ board: null, button: null, slider: null, card: null });

  const updateRects = useCallback(() => {
    if (boardRef.current) rectsCache.current.board = boardRef.current.getBoundingClientRect();
    if (buttonRef.current) rectsCache.current.button = buttonRef.current.getBoundingClientRect();
    if (sliderTrackRef.current) rectsCache.current.slider = sliderTrackRef.current.getBoundingClientRect();
    if (cardStackRef.current) rectsCache.current.card = cardStackRef.current.getBoundingClientRect();
  }, []);

  useEffect(() => {
    updateRects();
    window.addEventListener('resize', updateRects);
    window.addEventListener('scroll', updateRects, true);
    return () => {
      window.removeEventListener('resize', updateRects);
      window.removeEventListener('scroll', updateRects, true);
    };
  }, [updateRects]);

  // High-performance interaction loop decoupled from React state renders
  useEffect(() => {
    let animId: number;

    const checkInteraction = () => {
      const cursor = cursorRef.current;
      const bRect = rectsCache.current.board;

      if (bRect && reticleRef.current) {
        // Direct CSS transform update (0ms latency, 0 React re-renders)
        reticleRef.current.style.transform = `translate3d(${cursor.x * bRect.width}px, ${
          cursor.y * bRect.height
        }px, 0)`;

        if (cursor.isPinching) {
          reticleRef.current.style.borderColor = '#B83B2F';
          reticleRef.current.style.backgroundColor = 'rgba(184, 59, 47, 0.25)';
        } else {
          reticleRef.current.style.borderColor = '#333333';
          reticleRef.current.style.backgroundColor = 'transparent';
        }

        const screenX = bRect.left + cursor.x * bRect.width;
        const screenY = bRect.top + cursor.y * bRect.height;
        const now = performance.now();

        // 1. Button Collision
        const btnRect = rectsCache.current.button;
        if (btnRect && (cursor.isPinching || cursor.dwellProgress >= 0.98)) {
          if (
            screenX >= btnRect.left &&
            screenX <= btnRect.right &&
            screenY >= btnRect.top &&
            screenY <= btnRect.bottom
          ) {
            if (now - lastActionTimeRef.current > 400) {
              lastActionTimeRef.current = now;
              setButtonClickedCount((c) => c + 1);
              setLastAction(
                cursor.isPinching ? 'BUTTON PINCH-CLICKED' : 'BUTTON DWELL-TRIGGERED (800ms)'
              );
            }
          }
        }

        // 2. Slider Drag Collision
        const sRect = rectsCache.current.slider;
        if (sRect && cursor.isPinching) {
          if (
            screenX >= sRect.left - 20 &&
            screenX <= sRect.right + 20 &&
            screenY >= sRect.top - 20 &&
            screenY <= sRect.bottom + 20
          ) {
            const norm = Math.max(0, Math.min(1, (screenX - sRect.left) / sRect.width));
            const val = Math.round(norm * 100);
            setSliderVal(val);
            if (now - lastActionTimeRef.current > 150) {
              lastActionTimeRef.current = now;
              setLastAction(`SLIDER SET: ${val}%`);
            }
          }
        }

        // 3. Draggable Card Stack
        const cRect = rectsCache.current.card;
        if (cRect) {
          const inCard =
            screenX >= cRect.left &&
            screenX <= cRect.right &&
            screenY >= cRect.top &&
            screenY <= cRect.bottom;

          if (cursor.isPinching && (inCard || isDraggingCardRef.current)) {
            isDraggingCardRef.current = true;
            const dx = screenX - (cRect.left + cRect.width / 2);
            const dy = screenY - (cRect.top + cRect.height / 2);
            cardOffsetRef.current = {
              x: Math.max(-80, Math.min(80, dx)),
              y: Math.max(-40, Math.min(40, dy)),
            };
            if (cardStackRef.current) {
              cardStackRef.current.style.transform = `translate3d(${cardOffsetRef.current.x}px, ${cardOffsetRef.current.y}px, 0)`;
            }
          } else if (isDraggingCardRef.current) {
            isDraggingCardRef.current = false;
            if (Math.abs(cardOffsetRef.current.x) > 45) {
              setActiveCardIndex((i) => (i + 1) % 3);
              setLastAction('CARD CYCLED VIA SWIPE');
            }
            cardOffsetRef.current = { x: 0, y: 0 };
            if (cardStackRef.current) {
              cardStackRef.current.style.transform = 'translate3d(0px, 0px, 0)';
            }
          }
        }
      }

      animId = requestAnimationFrame(checkInteraction);
    };

    animId = requestAnimationFrame(checkInteraction);
    return () => cancelAnimationFrame(animId);
  }, [cursorRef]);

  return (
    <div
      ref={boardRef}
      className="relative border-2 border-charcoal-soft bg-paper-cream rounded-tactile p-5 shadow-tactile font-mono select-none overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b-2 border-charcoal-soft pb-3 mb-4 gap-2">
        <div className="flex items-center gap-2">
          <StampBadge label="SPATIAL TEST RIG" variant="charcoal" />
          <h3 className="text-xs font-bold uppercase tracking-technical text-charcoal-soft">
            MOUSE-FREE TACTILE DEMO BOARD
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onHandednessChange(handedness === 'Right' ? 'Left' : 'Right')}
            className="px-2 py-0.5 border border-charcoal-soft text-[10px] font-bold bg-paper-dark hover:bg-paper-cream rounded-[2px]"
          >
            HAND: {handedness.toUpperCase()}
          </button>
          <Button variant="outline" size="sm" onClick={onRecalibrate} className="gap-1">
            <RefreshCw className="w-3 h-3" />
            RECENTER
          </Button>
        </div>
      </div>

      {/* Target Interaction Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Target 1: Tactile Pushbutton */}
        <DeskCard
          figure="EXP. 01"
          title="PINCH / DWELL BUTTON"
          subtitle="Pinch fingers or dwell cursor for 800ms"
          inset
          className="flex flex-col justify-between"
        >
          <div className="py-6 flex flex-col items-center justify-center">
            <button
              ref={buttonRef}
              className="px-5 py-3 border-2 border-charcoal-soft bg-paper-cream text-charcoal-soft font-bold text-xs uppercase tracking-technical rounded-tactile shadow-tactile btn-tactile hover:bg-paper-dark"
            >
              TRIGGER [{buttonClickedCount}]
            </button>
          </div>
          <div className="text-[10px] text-ink-muted text-center border-t border-charcoal-soft/20 pt-2">
            Pinch or hold 800ms to click
          </div>
        </DeskCard>

        {/* Target 2: Mechanical Slider */}
        <DeskCard
          figure="EXP. 02"
          title="PINCH-DRAG SLIDER"
          subtitle="Pinch on track & drag horizontally"
          inset
          className="flex flex-col justify-between"
        >
          <div className="py-6 space-y-3">
            <div className="flex justify-between text-[11px] font-bold">
              <span>RESISTANCE</span>
              <span className="tabular-nums">{sliderVal}%</span>
            </div>

            <div
              ref={sliderTrackRef}
              className="relative h-6 bg-paper-cream border-2 border-charcoal-soft rounded-tactile p-1 flex items-center cursor-pointer"
            >
              <div
                className="h-full bg-sage-green border-r border-charcoal-soft transition-all"
                style={{ width: `${sliderVal}%` }}
              />
              <div
                className="absolute w-4 h-6 border-2 border-charcoal-soft bg-paper-cream shadow-tactile-sm -translate-x-1/2 cursor-grab"
                style={{ left: `${sliderVal}%` }}
              />
            </div>
          </div>
          <div className="text-[10px] text-ink-muted text-center border-t border-charcoal-soft/20 pt-2">
            Pinch-grab handle to adjust value
          </div>
        </DeskCard>

        {/* Target 3: Draggable Card Stack */}
        <DeskCard
          figure="EXP. 03"
          title="DRAGGABLE DECK"
          subtitle="Pinch to pick up, fling left/right"
          inset
          className="flex flex-col justify-between"
        >
          <div className="py-4 flex items-center justify-center min-h-[110px]">
            <div
              ref={cardStackRef}
              className="w-40 border-2 border-charcoal-soft bg-paper-cream p-3 rounded-tactile shadow-tactile cursor-grab flex flex-col items-center justify-center text-center transition-transform"
            >
              <span className="text-[9px] text-ink-muted font-bold">SPECIMEN CARD</span>
              <span className="font-bold text-xs uppercase text-brick-red">
                DECK ITEM #0{activeCardIndex + 1}
              </span>
              <span className="text-[9px] text-ink-muted mt-1">[HOLD PINCH TO DRAG]</span>
            </div>
          </div>
          <div className="text-[10px] text-ink-muted text-center border-t border-charcoal-soft/20 pt-2">
            Drag horizontally to cycle
          </div>
        </DeskCard>
      </div>

      {/* Action Telemetry Banner */}
      <div className="mt-4 p-2.5 border border-charcoal-soft bg-paper-dark rounded-[2px] flex items-center justify-between text-xs">
        <span className="text-ink-muted text-[10px] uppercase font-bold">LAST SPATIAL EVENT:</span>
        <span className="font-bold text-charcoal-soft">{lastAction}</span>
      </div>

      {/* Active Cursor Reticle positioned via zero-lag GPU transform3d */}
      <div
        ref={reticleRef}
        className="pointer-events-none absolute top-0 left-0 w-6 h-6 -translate-x-1/2 -translate-y-1/2 border-2 border-charcoal-soft rounded-full flex items-center justify-center will-change-transform"
      >
        <div className="w-1.5 h-1.5 bg-brick-red rounded-full" />
      </div>
    </div>
  );
}
