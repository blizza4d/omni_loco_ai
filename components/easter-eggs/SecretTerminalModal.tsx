'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Terminal as TerminalIcon, X, Maximize2, Minimize2 } from 'lucide-react';
import {
  unlockAchievement,
  getAchievements,
  resetAchievements,
} from '@/modules/easter-eggs/achievements';
import { MODULE_REGISTRY } from '@/core/modules/registry';

interface SecretTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
}

export function SecretTerminalModal({ isOpen, onClose }: SecretTerminalModalProps) {
  const router = useRouter();
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: 'init-1',
      type: 'system',
      text: 'OMNI LOCO LAB OS v2.4.0 (x86_64-wasm-webgpu)',
    },
    {
      id: 'init-2',
      type: 'system',
      text: 'TYPE "help" FOR AVAILABLE COMMANDS. ALL COMMANDS EXECUTE 100% LOCALLY.',
    },
  ]);
  const [isMaximized, setIsMaximized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  if (!isOpen) return null;

  const handleCommand = (cmdStr: string) => {
    const raw = cmdStr.trim();
    if (!raw) return;

    // Record achievement
    unlockAchievement('GHOST_IN_MACHINE');

    const cmdLower = raw.toLowerCase();
    const args = cmdLower.split(/\s+/);
    const mainCmd = args[0];

    // Add input line
    const userLine: TerminalLine = {
      id: `in-${Date.now()}`,
      type: 'input',
      text: `root@omni-loco:~$ ${raw}`,
    };

    let responseLines: TerminalLine[] = [];

    switch (mainCmd) {
      case 'help':
        responseLines = [
          {
            id: `out-${Date.now()}-1`,
            type: 'output',
            text: 'AVAILABLE LABORATORY COMMANDS:',
          },
          {
            id: `out-${Date.now()}-2`,
            type: 'output',
            text: '  help              - Display this command index',
          },
          {
            id: `out-${Date.now()}-3`,
            type: 'output',
            text: '  status            - Telemetry of on-device neural runtimes',
          },
          {
            id: `out-${Date.now()}-4`,
            type: 'output',
            text: '  modules           - List all 11 active on-device AI modules',
          },
          {
            id: `out-${Date.now()}-5`,
            type: 'output',
            text: '  goto <module>     - Navigate directly (e.g. "goto gaze", "goto drive")',
          },
          {
            id: `out-${Date.now()}-6`,
            type: 'output',
            text: '  heatvision        - Launch Homelander ocular laser experiment',
          },
          {
            id: `out-${Date.now()}-7`,
            type: 'output',
            text: '  achievements      - Display local classified discoveries',
          },
          {
            id: `out-${Date.now()}-8`,
            type: 'output',
            text: '  matrix            - Stream neural phosphor stream',
          },
          {
            id: `out-${Date.now()}-9`,
            type: 'output',
            text: '  credits           - System architecture dossier',
          },
          {
            id: `out-${Date.now()}-10`,
            type: 'output',
            text: '  clear             - Clear terminal buffer',
          },
          {
            id: `out-${Date.now()}-11`,
            type: 'output',
            text: '  reset             - Wipe local experimental cache',
          },
          {
            id: `out-${Date.now()}-12`,
            type: 'output',
            text: '  exit              - Close terminal session',
          },
        ];
        break;

      case 'status':
        responseLines = [
          {
            id: `out-${Date.now()}-1`,
            type: 'output',
            text: 'SYSTEM HEALTH: OPTIMAL (100% LOCAL AIRGAP)',
          },
          {
            id: `out-${Date.now()}-2`,
            type: 'output',
            text: `USER AGENT: ${navigator.userAgent.slice(0, 48)}...`,
          },
          {
            id: `out-${Date.now()}-3`,
            type: 'output',
            text: `DEVICE MEMORY (EST): ${('deviceMemory' in navigator ? (navigator as unknown as { deviceMemory: number }).deviceMemory : 8)} GB`,
          },
          {
            id: `out-${Date.now()}-4`,
            type: 'output',
            text: `HARDWARE CONCURRENCY: ${navigator.hardwareConcurrency || 4} THREADS`,
          },
          {
            id: `out-${Date.now()}-5`,
            type: 'output',
            text: 'EXTERNAL NETWORK EGRESS: 0 BYTES TRANSMITTED',
          },
        ];
        break;

      case 'modules':
        responseLines = [
          {
            id: `out-${Date.now()}-1`,
            type: 'output',
            text: `REGISTERED ON-DEVICE AI MODULES (${MODULE_REGISTRY.length}):`,
          },
          ...MODULE_REGISTRY.map((m, idx) => ({
            id: `out-${Date.now()}-${idx + 2}`,
            type: 'output' as const,
            text: ` [${m.id.padEnd(10, ' ')}] ${m.route.padEnd(10, ' ')} -> ${m.title}`,
          })),
        ];
        break;

      case 'goto': {
        const target = args[1];
        if (!target) {
          responseLines = [
            {
              id: `err-${Date.now()}`,
              type: 'error',
              text: 'Usage: goto <module_id_or_route> (e.g. goto gaze, goto drive, goto fingers)',
            },
          ];
        } else {
          const mod = MODULE_REGISTRY.find(
            (m) =>
              m.id.toLowerCase() === target ||
              m.route.toLowerCase() === target ||
              m.route.toLowerCase() === `/${target}`
          );
          if (mod) {
            responseLines = [
              {
                id: `out-${Date.now()}`,
                type: 'system',
                text: `Routing to ${mod.title} (${mod.route})...`,
              },
            ];
            setTimeout(() => {
              onClose();
              router.push(mod.route);
            }, 500);
          } else {
            responseLines = [
              {
                id: `err-${Date.now()}`,
                type: 'error',
                text: `Module "${target}" not found. Type "modules" for valid IDs.`,
              },
            ];
          }
        }
        break;
      }

      case 'heatvision':
        responseLines = [
          {
            id: `out-${Date.now()}-1`,
            type: 'system',
            text: 'ENGAGING HEAT VISION OCULAR EXPERIMENT...',
          },
          {
            id: `out-${Date.now()}-2`,
            type: 'output',
            text: 'Switching route to /gaze. Press [V] or use the HUD controls to fire dual lasers.',
          },
        ];
        setTimeout(() => {
          onClose();
          router.push('/gaze');
        }, 600);
        break;

      case 'achievements': {
        const items = getAchievements();
        const unlocked = items.filter((a) => a.unlockedAt);
        responseLines = [
          {
            id: `out-${Date.now()}-1`,
            type: 'output',
            text: `CLASSIFIED DISCOVERIES UNLOCKED (${unlocked.length}/${items.length}):`,
          },
          ...items.map((a, i) => ({
            id: `out-${Date.now()}-${i + 2}`,
            type: 'output' as const,
            text: `  ${a.unlockedAt ? '[UNLOCKED]' : '[LOCKED]  '} ${a.title.padEnd(20, ' ')} - ${a.description}`,
          })),
        ];
        break;
      }

      case 'matrix':
        responseLines = [
          {
            id: `out-${Date.now()}-1`,
            type: 'output',
            text: '01001111 01001101 01001110 01001001 00100000 01001100 01001111 01000011 01001111',
          },
          {
            id: `out-${Date.now()}-2`,
            type: 'output',
            text: '>> WAKE UP, OPERATOR... THE ON-DEVICE NEURAL MESH HAS YOU.',
          },
          {
            id: `out-${Date.now()}-3`,
            type: 'output',
            text: '>> ZERO CLOUD DEPENDENCY. PURE CLIENT INFERENCE MATRIX ESTABLISHED.',
          },
        ];
        break;

      case 'credits':
        responseLines = [
          {
            id: `out-${Date.now()}-1`,
            type: 'output',
            text: 'OMNI LOCO AI ARCHITECTURE DOSSIER',
          },
          {
            id: `out-${Date.now()}-2`,
            type: 'output',
            text: 'Engineered with Next.js, Three.js, MediaPipe, TensorFlow.js, and Web Audio API.',
          },
          {
            id: `out-${Date.now()}-3`,
            type: 'output',
            text: 'A high-performance benchmark in private, client-side browser intelligence.',
          },
        ];
        break;

      case 'clear':
        setLines([]);
        setInputVal('');
        return;

      case 'reset':
        resetAchievements();
        responseLines = [
          {
            id: `out-${Date.now()}`,
            type: 'system',
            text: 'All local achievement flags and classified states have been reset.',
          },
        ];
        break;

      case 'exit':
        onClose();
        return;

      default:
        responseLines = [
          {
            id: `err-${Date.now()}`,
            type: 'error',
            text: `Command not recognized: "${raw}". Type "help" for valid commands.`,
          },
        ];
        break;
    }

    setLines((prev) => [...prev, userLine, ...responseLines]);
    setHistory((prev) => [...prev, raw]);
    setHistoryIdx(-1);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(inputVal);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(nextIdx);
        setInputVal(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx !== -1) {
        const nextIdx = historyIdx + 1;
        if (nextIdx < history.length) {
          setHistoryIdx(nextIdx);
          setInputVal(history[nextIdx]);
        } else {
          setHistoryIdx(-1);
          setInputVal('');
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-charcoal-pure/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full ${
          isMaximized ? 'h-[95vh] max-w-6xl' : 'h-[65vh] max-w-3xl'
        } bg-black/95 border-2 border-sage-green shadow-[0_0_35px_rgba(34,197,94,0.2)] rounded-tactile overflow-hidden flex flex-col font-mono text-sage-green transition-all`}
      >
        {/* Terminal Title Bar */}
        <div className="flex items-center justify-between border-b border-sage-green/40 bg-sage-green/10 px-4 py-2 select-none">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-sage-green" />
            <span className="text-xs font-bold tracking-wider uppercase text-sage-green">
              ROOT SHELL // OMNI-OPERATOR [LOCAL_SESSION]
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMaximized((prev) => !prev)}
              className="text-sage-green/60 hover:text-sage-green transition-colors focus:outline-none"
              aria-label="Toggle window size"
            >
              {isMaximized ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={onClose}
              className="text-sage-green/60 hover:text-sage-green transition-colors focus:outline-none"
              aria-label="Close terminal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Terminal Screen with phosphor scanlines */}
        <div
          onClick={() => inputRef.current?.focus()}
          className="flex-1 p-4 overflow-y-auto space-y-1.5 text-xs select-text cursor-text relative bg-black"
        >
          {lines.map((line) => {
            if (line.type === 'input') {
              return (
                <div key={line.id} className="text-white font-bold">
                  {line.text}
                </div>
              );
            }
            if (line.type === 'system') {
              return (
                <div key={line.id} className="text-amber-400 font-bold">
                  {line.text}
                </div>
              );
            }
            if (line.type === 'error') {
              return (
                <div key={line.id} className="text-brick-red">
                  {line.text}
                </div>
              );
            }
            return (
              <div key={line.id} className="text-sage-green/90 whitespace-pre-wrap">
                {line.text}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-sage-green/30 bg-black/80 px-4 py-2 flex items-center gap-2">
          <span className="text-white font-bold text-xs shrink-0">root@omni-loco:~$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none caret-sage-green"
            placeholder="Type command ('help', 'status', 'goto gaze')..."
            autoComplete="off"
            spellCheck="false"
          />
        </div>
      </div>
    </div>
  );
}
