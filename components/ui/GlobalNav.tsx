'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { StampBadge } from './StampBadge';
import {
  ShieldCheck,
  Cpu,
  ArrowLeft,
  SlidersHorizontal,
  Hand,
  Sun,
  Moon,
  Keyboard,
  Trophy,
  Terminal,
  FlaskConical,
  Workflow,
  Command,
  Database,
} from 'lucide-react';
import { detectCapabilities } from '@/core/capabilities';
import { useSettingsStore, useSystemStore } from '@/core/store';
import { AchievementToast } from '@/components/easter-eggs/AchievementToast';
import { unlockAchievement, trackVisitedModule } from '@/modules/easter-eggs/achievements';
import { initTabWatcherAndConsoleEasterEgg } from '@/modules/easter-eggs/tab-watcher';

// Dynamic imports for heavy modals to ensure instantaneous navigation load
const NetworkTransparencyModal = dynamic(
  () => import('./NetworkTransparencyModal').then((m) => m.NetworkTransparencyModal),
  { ssr: false }
);
const ModelVaultModal = dynamic(
  () => import('./ModelVaultModal').then((m) => m.ModelVaultModal),
  { ssr: false }
);
const SystemStatusModal = dynamic(
  () => import('./SystemStatusModal').then((m) => m.SystemStatusModal),
  { ssr: false }
);
const KeyboardShortcutsModal = dynamic(
  () => import('./KeyboardShortcutsModal').then((m) => m.KeyboardShortcutsModal),
  { ssr: false }
);
const KonamiOverrideModal = dynamic(
  () => import('@/components/easter-eggs/KonamiOverrideModal').then((m) => m.KonamiOverrideModal),
  { ssr: false }
);
const ClassifiedExperimentModal = dynamic(
  () => import('@/components/easter-eggs/ClassifiedExperimentModal').then((m) => m.ClassifiedExperimentModal),
  { ssr: false }
);
const SecretTerminalModal = dynamic(
  () => import('@/components/easter-eggs/SecretTerminalModal').then((m) => m.SecretTerminalModal),
  { ssr: false }
);
const AchievementsModal = dynamic(
  () => import('@/components/easter-eggs/AchievementsModal').then((m) => m.AchievementsModal),
  { ssr: false }
);
const CommandPalette = dynamic(
  () => import('./CommandPalette').then((m) => m.CommandPalette),
  { ssr: false }
);

export interface GlobalNavProps {
  gestureNavEnabled?: boolean;
  onToggleGestureNav?: (enabled: boolean) => void;
  perfHudOpen?: boolean;
  onTogglePerfHud?: () => void;
}

// Konami code sequence
const KONAMI_SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
];

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
  const [modelVaultOpen, setModelVaultOpen] = useState(false);
  const [systemModalOpen, setSystemModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [konamiModalOpen, setKonamiModalOpen] = useState(false);
  const [specimenModalOpen, setSpecimenModalOpen] = useState(false);
  const [terminalModalOpen, setTerminalModalOpen] = useState(false);
  const [achievementsModalOpen, setAchievementsModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [activeBackend, setActiveBackend] = useState<string>('DETECTING');
  const [mounted, setMounted] = useState(false);

  const konamiIndexRef = useRef(0);
  const logoClicksRef = useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: 0 });

  const { theme, toggleTheme } = useSettingsStore();
  const { togglePerfHud: storeTogglePerfHud, perfHudVisible, activeBackend: storeBackend, activeModule } = useSystemStore();

  const isHudActive = perfHudOpen !== undefined ? perfHudOpen : perfHudVisible;
  const handleToggleHud = onTogglePerfHud || storeTogglePerfHud;

  useEffect(() => {
    setMounted(true);
    initTabWatcherAndConsoleEasterEgg();
    detectCapabilities().then((caps) => {
      setActiveBackend(caps.recommendedBackend.toUpperCase());
    });
  }, []);

  useEffect(() => {
    if (pathname) {
      trackVisitedModule(pathname);
    }
  }, [pathname]);

  // Display actual running backend if inside active module, otherwise detected recommendation
  const displayedBackend =
    !isHub && activeModule !== 'STANDBY' && storeBackend
      ? storeBackend.toUpperCase()
      : activeBackend;

  // Global Tactical Keyboard Shortcuts Listener & Easter Egg triggers
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

      // Check Konami Code
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const expectedKey = KONAMI_SEQUENCE[konamiIndexRef.current].toLowerCase();

      if (key === expectedKey) {
        konamiIndexRef.current += 1;
        if (konamiIndexRef.current === KONAMI_SEQUENCE.length) {
          konamiIndexRef.current = 0;
          unlockAchievement('THE_OVERRIDE');
          setKonamiModalOpen(true);
        }
      } else {
        konamiIndexRef.current = 0;
      }

      // Global Command Palette via Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Secret Terminal toggle via backquote
      if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        setTerminalModalOpen((prev) => !prev);
        return;
      }

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        toggleTheme();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setModelVaultOpen((prev) => !prev);
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        handleToggleHud();
      } else if (e.key === 'Escape') {
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
        } else if (modelVaultOpen) {
          setModelVaultOpen(false);
        } else if (terminalModalOpen) {
          setTerminalModalOpen(false);
        } else if (konamiModalOpen) {
          setKonamiModalOpen(false);
        } else if (specimenModalOpen) {
          setSpecimenModalOpen(false);
        } else if (achievementsModalOpen) {
          setAchievementsModalOpen(false);
        } else if (shortcutsModalOpen) {
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
  }, [
    shortcutsModalOpen,
    modelVaultOpen,
    networkModalOpen,
    systemModalOpen,
    terminalModalOpen,
    commandPaletteOpen,
    konamiModalOpen,
    specimenModalOpen,
    achievementsModalOpen,
    isHub,
    router,
    toggleTheme,
    handleToggleHud,
  ]);

  const handleLogoClick = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - logoClicksRef.current.lastTime < 2000) {
      logoClicksRef.current.count += 1;
    } else {
      logoClicksRef.current.count = 1;
    }
    logoClicksRef.current.lastTime = now;

    if (logoClicksRef.current.count >= 5) {
      e.preventDefault();
      logoClicksRef.current.count = 0;
      unlockAchievement('SPECIMEN_EXAMINED');
      setSpecimenModalOpen(true);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-paper-cream border-b-2 border-charcoal-soft px-4 py-2.5 transition-colors select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left branding & return button */}
          <div className="flex items-center gap-3">
            {!isHub && (
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold uppercase border-2 border-charcoal-soft rounded-tactile bg-paper-cream hover:bg-paper-dark text-charcoal-soft shadow-tactile transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">HUB</span>
                <span className="text-[9px] text-ink-muted hidden md:inline">[ESC]</span>
              </Link>
            )}

            <div onClick={handleLogoClick} className="flex flex-col cursor-pointer select-none">
              <span className="font-mono text-base font-bold uppercase tracking-technical text-charcoal-soft flex items-center gap-2">
                OMNI LOCO AI
                <span className="text-[10px] text-sage-green border border-sage-green px-1 rounded-[2px] hidden sm:inline-block">
                  APEX TELEMETRY
                </span>
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-ink-muted hidden md:block">
                MULTIMODAL ON-DEVICE INTELLIGENCE LAB // ZERO CLOUD PIPELINE
              </span>
            </div>
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

            {/* Central Model Vault Navigation Button */}
            <button
              onClick={() => setModelVaultOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold uppercase border-2 border-charcoal-soft text-charcoal-soft hover:bg-paper-dark hover:border-sage-green hover:text-sage-green rounded-tactile transition-all"
              title="Open Central Model Vault & Asset Inspector [M]"
              aria-label="Open Central Model Vault"
            >
              <Database className="w-3.5 h-3.5 text-sage-green" />
              <span className="hidden sm:inline">VAULT</span>
              <span className="sm:hidden">VAULT</span>
            </button>

            {/* Laboratory Navigation Button */}
            <Link
              href="/laboratory"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold uppercase border-2 rounded-tactile transition-all ${
                pathname === '/laboratory'
                  ? 'border-cyan-500 bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 shadow-tactile-sm'
                  : 'border-charcoal-soft text-charcoal-soft hover:bg-paper-dark hover:border-cyan-500 hover:text-cyan-600'
              }`}
              title="Open Omni Loco Experimental AI Laboratory Workspace"
              aria-label="Open Laboratory Workspace"
            >
              <FlaskConical className="w-3.5 h-3.5 text-cyan-500" />
              <span className="hidden sm:inline">LABORATORY</span>
              <span className="sm:hidden">LAB</span>
            </Link>

            {/* Goofy Mode Navigation Button */}
            <Link
              href="/goofy"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold uppercase border-2 rounded-tactile transition-all ${
                pathname === '/goofy'
                  ? 'border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-400 shadow-tactile-sm'
                  : 'border-charcoal-soft text-charcoal-soft hover:bg-paper-dark hover:border-amber-500 hover:text-amber-600'
              }`}
              title="Launch Goofy Model Multimodal Engine"
              aria-label="Launch Goofy Model"
            >
              <span className="text-xs">🤪</span>
              <span className="hidden sm:inline">GOOFY</span>
              <span className="sm:hidden">GOOFY</span>
            </Link>

            {/* Protocol Forge Navigation Button */}
            <Link
              href="/forge"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold uppercase border-2 rounded-tactile transition-all ${
                pathname === '/forge' || pathname === '/protocols'
                  ? 'border-brick-red bg-brick-red/20 text-brick-red shadow-tactile-sm'
                  : 'border-charcoal-soft text-charcoal-soft hover:bg-paper-dark hover:border-brick-red hover:text-brick-red'
              }`}
              title="Open Omni Protocol Forge Multimodal Workflow Engine"
              aria-label="Open Protocol Forge"
            >
              <Workflow className="w-3.5 h-3.5 text-brick-red" />
              <span className="hidden sm:inline">FORGE</span>
              <span className="sm:hidden">FORGE</span>
            </Link>

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

            {/* Classified Discoveries / Achievements Button */}
            <button
              onClick={() => setAchievementsModalOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono font-bold uppercase border-2 border-charcoal-soft text-charcoal-soft hover:bg-paper-dark rounded-tactile transition-all"
              title="View Classified Discoveries & Achievements Dossier"
              aria-label="View Discoveries Dossier"
            >
              <Trophy className="w-3 h-3 text-amber-500" />
              <span className="hidden xl:inline">DOSSIER</span>
            </button>

            {/* Secret Terminal Trigger Button */}
            <button
              onClick={() => setTerminalModalOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono font-bold uppercase border-2 border-charcoal-soft text-charcoal-soft hover:bg-paper-dark rounded-tactile transition-all"
              title="Open Classified Laboratory Shell [`]"
              aria-label="Open Classified Terminal"
            >
              <Terminal className="w-3 h-3 text-sage-green" />
              <span className="hidden xl:inline">CLI [`]</span>
            </button>

            {/* Global Command Palette Trigger Button */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono font-bold uppercase border-2 border-charcoal-soft text-charcoal-soft hover:bg-paper-dark rounded-tactile transition-all"
              title="Open Global Command Palette [Ctrl+K]"
              aria-label="Open Command Palette"
            >
              <Command className="w-3 h-3 text-brick-red" />
              <span className="hidden lg:inline">PALETTE</span>
            </button>

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

      <ModelVaultModal
        isOpen={modelVaultOpen}
        onClose={() => setModelVaultOpen(false)}
      />

      <SystemStatusModal
        isOpen={systemModalOpen}
        onClose={() => setSystemModalOpen(false)}
      />

      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {/* Easter Egg & Discovery Modals */}
      <AchievementToast />

      <KonamiOverrideModal
        isOpen={konamiModalOpen}
        onClose={() => setKonamiModalOpen(false)}
        onOpenTerminal={() => setTerminalModalOpen(true)}
        onOpenSpecimen={() => setSpecimenModalOpen(true)}
      />

      <ClassifiedExperimentModal
        isOpen={specimenModalOpen}
        onClose={() => setSpecimenModalOpen(false)}
      />

      <SecretTerminalModal
        isOpen={terminalModalOpen}
        onClose={() => setTerminalModalOpen(false)}
      />

      <AchievementsModal
        isOpen={achievementsModalOpen}
        onClose={() => setAchievementsModalOpen(false)}
      />

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
        onOpenModelVault={() => setModelVaultOpen(true)}
      />
    </>
  );
}
