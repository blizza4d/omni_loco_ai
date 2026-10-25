'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { StampBadge } from './StampBadge';
import { Button } from './Button';
import { NetworkTransparencyModal } from './NetworkTransparencyModal';
import { SystemStatusModal } from './SystemStatusModal';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import {
  ShieldCheck,
  Cpu,
  ArrowLeft,
  SlidersHorizontal,
  Hand,
  Sun,
  Moon,
  Keyboard,
} from 'lucide-react';
import { detectCapabilities } from '@/core/capabilities';
import { useSettingsStore, useSystemStore } from '@/core/store';

export interface GlobalNavProps {
  gestureNavEnabled?: boolean;
  onToggleGestureNav?: (enabled: boolean) => void;
  perfHudOpen?: boolean;
  onTogglePerfHud?: () => void;
}

export function GlobalNav({
  gestureNavEnabled = false,
  onToggleGestureNav,
  perfHudOpen,
  onTogglePerfHud,
}: GlobalNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isHub = pathname === '/';

  const [networkModalOpen, setNetworkModalOpen] = useState(false);
  const [systemModalOpen, setSystemModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [activeBackend, setActiveBackend] = useState<string>('DETECTING');
  const [mounted, setMounted] = useState(false);

  const { theme, toggleTheme } = useSettingsStore();
  const { togglePerfHud: storeTogglePerfHud, perfHudVisible, activeBackend: storeBackend, activeModule } = useSystemStore();

  const isHudActive = perfHudOpen !== undefined ? perfHudOpen : perfHudVisible;
  const handleToggleHud = onTogglePerfHud || storeTogglePerfHud;

  useEffect(() => {
    setMounted(true);
    detectCapabilities().then((caps) => {
      setActiveBackend(caps.recommendedBackend.toUpperCase());
    });
  }, []);

  // Display actual running backend if inside active module, otherwise detected recommendation
  const displayedBackend =
    !isHub && activeModule !== 'STANDBY' && storeBackend
      ? storeBackend.toUpperCase()
      : activeBackend;

  // Global Tactical Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input, textarea, or contentEditable
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        toggleTheme();
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        handleToggleHud();
      } else if (e.key === 'Escape') {
        if (shortcutsModalOpen) {
          setShortcutsModalOpen(false);
        } else if (networkModalOpen) {
          setNetworkModalOpen(false);
        } else if (systemModalOpen) {
          setSystemModalOpen(false);
        } else if (!isHub) {
          router.push('/');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcutsModalOpen, networkModalOpen, systemModalOpen, isHub, router, toggleTheme, handleToggleHud]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-paper-cream/95 backdrop-blur-[2px] border-b-2 border-charcoal-soft px-4 py-2.5 transition-colors select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left branding & return button */}
          <div className="flex items-center gap-3">
            {!isHub && (
              <Link href="/">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">HUB</span>
                  <span className="text-[9px] text-ink-muted hidden md:inline">[ESC]</span>
                </Button>
              </Link>
            )}

            <Link href="/" className="flex flex-col">
              <span className="font-mono text-base font-bold uppercase tracking-technical text-charcoal-soft flex items-center gap-2">
                OMNI LOCO AI
                <span className="text-[10px] text-sage-green border border-sage-green px-1 rounded-[2px] hidden sm:inline-block">
                  APEX TELEMETRY
                </span>
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-ink-muted hidden md:block">
                MULTIMODAL ON-DEVICE INTELLIGENCE LAB // ZERO CLOUD PIPELINE
              </span>
            </Link>
          </div>

          {/* Right status & control badges */}
          <div className="flex items-center gap-2">
            {/* 100% On-Device Badge */}
            <button
              onClick={() => setNetworkModalOpen(true)}
              className="group flex items-center gap-1.5 focus:outline-none"
              title="Click to view Network Transparency Auditor"
            >
              <StampBadge
                label="100% ON-DEVICE"
                variant="sage"
                icon={<ShieldCheck className="w-3 h-3 text-sage-green group-hover:scale-110 transition-transform" />}
              />
            </button>

            {/* Backend Status Badge */}
            <button
              onClick={() => setSystemModalOpen(true)}
              className="group hidden sm:flex items-center gap-1.5 focus:outline-none"
              title="Click to view Hardware Acceleration Status"
              aria-label="Hardware Acceleration Status"
            >
              <StampBadge
                label={`ACCEL: ${displayedBackend}`}
                variant="charcoal"
                icon={<Cpu className="w-3 h-3 text-charcoal-soft group-hover:scale-110 transition-transform" />}
              />
            </button>

            {/* Gesture Nav Toggle */}
            {onToggleGestureNav && (
              <button
                onClick={() => onToggleGestureNav(!gestureNavEnabled)}
                className={`hidden lg:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono font-bold uppercase border-2 rounded-tactile transition-all ${
                  gestureNavEnabled
                    ? 'border-brick-red bg-brick-red/10 text-brick-red shadow-tactile-sm'
                    : 'border-charcoal-soft text-charcoal-soft hover:bg-paper-dark'
                }`}
                title="Toggle Spatial Hand-Gesture Cursor Navigation"
                aria-label="Toggle Spatial Hand-Gesture Cursor Navigation"
              >
                <Hand className="w-3 h-3" />
                <span>SPATIAL CURSOR</span>
              </button>
            )}

            {/* Performance HUD Toggle */}
            <button
              onClick={handleToggleHud}
              className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono font-bold uppercase border-2 rounded-tactile transition-all ${
                isHudActive
                  ? 'border-charcoal-soft bg-charcoal-soft text-paper-cream'
                  : 'border-charcoal-soft text-charcoal-soft hover:bg-paper-dark'
              }`}
              title="Toggle Real-Time Telemetry HUD [H]"
              aria-label="Toggle Real-Time Telemetry HUD"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span className="hidden md:inline">HUD</span>
            </button>

            {/* Keyboard Shortcuts Trigger Button */}
            <button
              onClick={() => setShortcutsModalOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono font-bold uppercase border-2 border-charcoal-soft text-charcoal-soft hover:bg-paper-dark rounded-tactile transition-all"
              title="Tactical Keyboard Shortcuts Matrix [?]"
              aria-label="Tactical Keyboard Shortcuts Matrix"
            >
              <Keyboard className="w-3 h-3" />
              <span className="hidden lg:inline">[?] KEYS</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono font-bold uppercase border-2 border-charcoal-soft text-charcoal-soft hover:bg-paper-dark rounded-tactile transition-all"
              title={`Switch to ${mounted && theme === 'dark' ? 'Analog Drafting Light' : 'Motorsport Telemetry Dark'} [T]`}
              aria-label="Toggle Theme"
            >
              {mounted && theme === 'light' ? (
                <>
                  <Moon className="w-3 h-3 text-indigo-400" />
                  <span className="hidden xl:inline">APEX DARK</span>
                </>
              ) : (
                <>
                  <Sun className="w-3 h-3 text-amber-400" />
                  <span className="hidden xl:inline">LIGHT</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Modals */}
      <NetworkTransparencyModal
        isOpen={networkModalOpen}
        onClose={() => setNetworkModalOpen(false)}
      />

      <SystemStatusModal
        isOpen={systemModalOpen}
        onClose={() => setSystemModalOpen(false)}
      />

      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </>
  );
}
