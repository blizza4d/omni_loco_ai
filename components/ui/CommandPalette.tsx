'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MODULE_REGISTRY, GOOFY_MODEL_DEFINITION } from '@/core/modules/registry';
import { useWorkspaceStore, WorkspaceType } from '@/core/store/workspace-store';
import { useSettingsStore, useSystemStore } from '@/core/store';
import {
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  Activity,
  Sliders,
  Keyboard,
  Moon,
  Sun,
  FlaskConical,
  Workflow,
  Command,
  X,
  Compass,
  Database,
} from 'lucide-react';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPerfCentre?: () => void;
  onOpenShortcuts?: () => void;
  onOpenModelVault?: () => void;
}

interface CommandItem {
  id: string;
  category: 'MODULE' | 'MODEL' | 'WORKSPACE' | 'ACTION';
  categoryLabel: string;
  title: string;
  description: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onOpenPerfCentre,
  onOpenShortcuts,
  onOpenModelVault,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const { activeWorkspace, setWorkspace, recordModuleVisit } = useWorkspaceStore();
  const { toggleTheme, theme } = useSettingsStore();
  const { togglePerfHud } = useSystemStore();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Build command item registry
  const allCommands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [];

    // 1. All Modules
    const fullRegistry = [...MODULE_REGISTRY, GOOFY_MODEL_DEFINITION, {
      id: 'laboratory',
      figure: 'EXP. 01',
      route: '/laboratory',
      title: 'EXPERIMENTAL AI LABORATORY',
      shortTitle: 'Laboratory',
      description: 'Train custom lightweight feature classifiers, extract biometric embeddings & live workbench.',
      category: 'CLASSIFICATION' as const,
      categoryLabel: 'CLASSIFICATION & LABS',
      icon: FlaskConical,
      permissions: ['CAM' as const],
      modelUrl: '/wasm/ort-wasm-simd-threaded.wasm',
      modelSize: '12 MB',
      badge: 'CUSTOM KNN / SVM',
      accent: 'charcoal' as const,
      backend: 'Feature Embedder',
      features: ['Custom Classifiers', 'Feature Vectors', 'Interactive Bench'],
    }, {
      id: 'forge',
      figure: 'EXP. 02',
      route: '/forge',
      title: 'OMNI PROTOCOL FORGE',
      shortTitle: 'Protocol Forge',
      description: 'Node-based visual multimodal workflow engine connecting vision, audio & actuators.',
      category: 'SIMULATION' as const,
      categoryLabel: 'SPATIAL SIMULATION',
      icon: Workflow,
      permissions: ['CAM' as const],
      modelUrl: '',
      modelSize: '0 MB',
      badge: 'VISUAL FLOW GRAPH',
      accent: 'brick' as const,
      backend: 'Platform Event Bus',
      features: ['Visual Flow Nodes', 'Event Bus Links', 'Cross-Model Logic'],
    }];

    fullRegistry.forEach((m) => {
      list.push({
        id: `mod-${m.id}`,
        category: 'MODULE',
        categoryLabel: 'AI MODULES',
        title: m.title,
        description: m.description,
        icon: m.icon,
        action: () => {
          recordModuleVisit(m.id);
          onClose();
          router.push(m.route);
        },
      });
    });

    // 2. Workspaces
    const workspaces: WorkspaceType[] = [
      'Default',
      'Vision Research',
      'Robotics & Control',
      'Creative Labs',
      'Laboratory Studio',
    ];
    workspaces.forEach((ws) => {
      list.push({
        id: `ws-${ws}`,
        category: 'WORKSPACE',
        categoryLabel: 'WORKSPACES',
        title: `Switch to ${ws} Workspace`,
        description: `Organize pinned modules and filters for ${ws} workflows`,
        icon: Compass,
        action: () => {
          setWorkspace(ws);
          onClose();
        },
      });
    });

    // 3. Platform Actions
    list.push({
      id: 'act-perf-centre',
      category: 'ACTION',
      categoryLabel: 'DIAGNOSTICS & CONTROLS',
      title: 'Open Performance & Hardware Diagnostics Centre',
      description: 'View real-time inference latency, active models, camera telemetry and heap metrics',
      shortcut: 'H',
      icon: Activity,
      action: () => {
        onClose();
        if (onOpenPerfCentre) {
          onOpenPerfCentre();
        } else {
          togglePerfHud();
        }
      },
    });

    list.push({
      id: 'act-toggle-hud',
      category: 'ACTION',
      categoryLabel: 'DIAGNOSTICS & CONTROLS',
      title: 'Toggle Live Telemetry HUD Strip',
      description: 'Toggle persistent on-screen FPS, p50/p95 latency and tracking status',
      shortcut: 'H',
      icon: Activity,
      action: () => {
        onClose();
        togglePerfHud();
      },
    });

    list.push({
      id: 'act-toggle-theme',
      category: 'ACTION',
      categoryLabel: 'DIAGNOSTICS & CONTROLS',
      title: `Switch Theme to ${theme === 'dark' ? 'Drafting Light' : 'Apex Dark'}`,
      description: 'Toggle between technical high-contrast dark and paper drafting palette',
      shortcut: 'T',
      icon: theme === 'dark' ? Sun : Moon,
      action: () => {
        toggleTheme();
        onClose();
      },
    });

    if (onOpenModelVault) {
      list.push({
        id: 'act-model-vault',
        category: 'ACTION',
        categoryLabel: 'DIAGNOSTICS & CONTROLS',
        title: 'Central Model Vault & Weight Verifier',
        description: 'Inspect verified model weight manifest, storage quota, and initialization state',
        shortcut: 'M',
        icon: Database,
        action: () => {
          onClose();
          onOpenModelVault();
        },
      });
    }

    list.push({
      id: 'act-shortcuts',
      category: 'ACTION',
      categoryLabel: 'DIAGNOSTICS & CONTROLS',
      title: 'Keyboard Shortcuts Matrix',
      description: 'View all keyboard shortcuts and navigation hotkeys',
      shortcut: '?',
      icon: Keyboard,
      action: () => {
        onClose();
        if (onOpenShortcuts) onOpenShortcuts();
      },
    });

    return list;
  }, [router, recordModuleVisit, onClose, setWorkspace, onOpenPerfCentre, togglePerfHud, theme, toggleTheme, onOpenShortcuts, onOpenModelVault]);

  // Filter commands by search query
  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCommands;
    return allCommands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.categoryLabel.toLowerCase().includes(q)
    );
  }, [allCommands, query]);

  // Keep selected index within bounds
  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(0);
    }
  }, [filteredCommands.length, selectedIndex]);

  // Keyboard navigation within palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredCommands.length > 0 ? (prev + 1) % filteredCommands.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredCommands.length > 0 ? (prev - 1 + filteredCommands.length) % filteredCommands.length : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredCommands[selectedIndex];
      if (selected) {
        selected.action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cmd-palette-title"
      className="fixed inset-0 z-50 bg-charcoal-soft/80 backdrop-blur-sm flex items-start justify-center pt-20 p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-paper-cream border-2 border-charcoal-soft w-full max-w-2xl rounded-tactile shadow-tactile-lg overflow-hidden font-mono flex flex-col max-h-[75vh]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-charcoal-soft bg-paper-dark">
          <Command className="w-4 h-4 text-brick-red shrink-0" />
          <input
            ref={inputRef}
            id="cmd-palette-title"
            type="text"
            placeholder="Type a command, module, model, or workspace..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent focus:outline-none text-xs font-mono uppercase tracking-wider text-charcoal-soft placeholder:text-ink-muted/70"
          />
          <span className="text-[10px] text-ink-muted px-1.5 py-0.5 border border-charcoal-soft/30 rounded shrink-0">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-charcoal-soft/10">
          {filteredCommands.length === 0 ? (
            <div className="text-center py-8 text-xs text-ink-muted">
              No matching commands, modules, or actions found for &quot;{query}&quot;.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = cmd.icon;
              return (
                <div
                  key={cmd.id}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-charcoal-soft text-paper-cream shadow-tactile-sm'
                      : 'hover:bg-paper-dark/60 text-charcoal-soft'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded border ${
                        isSelected
                          ? 'border-paper-cream/30 bg-paper-cream/10'
                          : 'border-charcoal-soft/30 bg-paper-cream'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs truncate">{cmd.title}</span>
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded border uppercase font-mono ${
                            isSelected
                              ? 'border-paper-cream/40 text-paper-cream/80'
                              : 'border-charcoal-soft/30 text-ink-muted'
                          }`}
                        >
                          {cmd.categoryLabel}
                        </span>
                      </div>
                      <p
                        className={`text-[10px] truncate max-w-md mt-0.5 ${
                          isSelected ? 'text-paper-cream/80' : 'text-ink-muted'
                        }`}
                      >
                        {cmd.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {cmd.shortcut && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${
                          isSelected
                            ? 'border-paper-cream/40 bg-paper-cream/10'
                            : 'border-charcoal-soft/30 bg-paper-dark text-ink-muted'
                        }`}
                      >
                        {cmd.shortcut}
                      </span>
                    )}
                    <ArrowRight
                      className={`w-3.5 h-3.5 ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-charcoal-soft/20 bg-paper-dark flex items-center justify-between text-[10px] text-ink-muted">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 border border-charcoal-soft/30 rounded bg-paper-cream text-charcoal-soft">
                ↑↓
              </kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 border border-charcoal-soft/30 rounded bg-paper-cream text-charcoal-soft">
                ENTER
              </kbd>{' '}
              Select
            </span>
            <span>
              <kbd className="px-1 py-0.5 border border-charcoal-soft/30 rounded bg-paper-cream text-charcoal-soft">
                ESC
              </kbd>{' '}
              Close
            </span>
          </div>
          <div>Workspace: <span className="font-bold text-charcoal-soft">{activeWorkspace}</span></div>
        </div>
      </div>
    </div>
  );
}
