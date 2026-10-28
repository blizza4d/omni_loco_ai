/**
 * OMNI PROTOCOL FORGE — EXECUTION ENGINE
 * Runtime execution layer: validates graphs, subscribes to event bus, executes node pipelines,
 * enforces cooldowns, executes output actions, and measures latency.
 */

import {
  ProtocolDefinition,
  ProtocolNode,
  ProtocolConnection,
  ProtocolExecutionState,
  ProtocolLogEntry,
  ProtocolEvent,
} from './types';
import { ProtocolEventBus } from './event-bus';
import { ProtocolValidator } from './protocol-validator';

export interface ExecutionEngineCallbacks {
  onStateChange?: (state: ProtocolExecutionState) => void;
  onLog?: (entry: ProtocolLogEntry) => void;
  onNodeExecuted?: (
    nodeId: string,
    status: 'success' | 'filtered' | 'error',
    durationMs: number,
    data?: any
  ) => void;
  onActionTriggered?: (actionType: string, payload: any) => void;
}

export class ProtocolExecutionEngine {
  private protocol: ProtocolDefinition | null = null;
  private state: ProtocolExecutionState = 'DRAFT';
  private eventBus = ProtocolEventBus.getInstance();
  private unsubscribeFns: (() => void)[] = [];
  private callbacks: ExecutionEngineCallbacks = {};

  // Runtime node state & cooldown tracking
  private lastNodeExecutionTime = new Map<string, number>();
  private nodeLastOutputs = new Map<string, Record<string, any>>();
  private logs: ProtocolLogEntry[] = [];
  private maxLogs = 200;

  // Rate limiting & statistics
  private eventsProcessed = 0;
  private actionsExecuted = 0;
  private lastEventTime = 0;
  private audioContext: AudioContext | null = null;

  constructor(
    protocolOrCallbacks?: ProtocolDefinition | ExecutionEngineCallbacks,
    callbacks?: ExecutionEngineCallbacks
  ) {
    if (protocolOrCallbacks && 'nodes' in protocolOrCallbacks) {
      if (callbacks) this.callbacks = callbacks;
      this.loadProtocol(protocolOrCallbacks);
    } else if (protocolOrCallbacks) {
      this.callbacks = protocolOrCallbacks as ExecutionEngineCallbacks;
    }
  }

  setCallbacks(callbacks: ExecutionEngineCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  loadProtocol(protocol: ProtocolDefinition): boolean {
    this.stop();
    this.protocol = protocol;
    this.setState('VALIDATING');

    const validation = ProtocolValidator.validate(protocol);
    if (!validation.isValid) {
      this.setState('FAILED');
      for (const err of validation.errors) {
        this.addLog('error', err.message, err.nodeId);
      }
      return false;
    }

    for (const warn of validation.warnings) {
      this.addLog('warn', warn.message, warn.nodeId);
    }

    this.setState('READY');
    this.addLog('info', `Protocol "${protocol.name}" v${protocol.version} validated and ready.`);
    return true;
  }

  start(): boolean {
    if (!this.protocol) {
      this.addLog('error', 'Cannot start: no protocol loaded.');
      return false;
    }

    if (this.state === 'RUNNING') return true;

    // Validate graph if not ready or paused
    if (this.state !== 'READY' && this.state !== 'PAUSED') {
      const ok = this.loadProtocol(this.protocol);
      if (!ok) return false;
    }

    this.clearSubscriptions();
    this.setState('RUNNING');
    this.addLog('info', `Protocol execution started.`);

    // Subscribe input nodes to relevant event types
    const inputNodes = this.protocol.nodes.filter((n) => n.category === 'INPUT');
    for (const inputNode of inputNodes) {
      this.bindInputNode(inputNode);
    }

    return true;
  }

  pause(): void {
    if (this.state === 'RUNNING') {
      this.clearSubscriptions();
      this.setState('PAUSED');
      this.addLog('info', 'Protocol execution paused.');
    }
  }

  stop(): void {
    this.clearSubscriptions();
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
    this.setState('STOPPED');
    this.addLog('info', 'Protocol execution stopped.');
  }

  cancel(): void {
    this.clearSubscriptions();
    this.setState('CANCELLED');
    this.addLog('warn', 'Protocol execution cancelled by user.');
  }

  getState(): ProtocolExecutionState {
    return this.state;
  }

  getProtocol(): ProtocolDefinition | null {
    return this.protocol;
  }

  getLogs(): ProtocolLogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  getStats() {
    return {
      eventsProcessed: this.eventsProcessed,
      actionsExecuted: this.actionsExecuted,
      lastEventTime: this.lastEventTime,
    };
  }

  /**
   * Binds an Input node to the corresponding ProtocolEventBus topic
   */
  private bindInputNode(node: ProtocolNode): void {
    const subscriberId = `forge-exec-${node.id}`;

    switch (node.type) {
      case 'input-hand-gesture': {
        const unsub = this.eventBus.subscribe(
          'HAND_GESTURE',
          (evt) => {
            if (this.state !== 'RUNNING') return;
            const minConf = node.params.minConfidence ?? 0.7;
            const targetHand = node.params.handedness ?? 'Any';

            if (evt.payload.confidence < minConf) return;
            if (targetHand !== 'Any' && evt.payload.handedness !== targetHand) return;

            this.triggerInputNode(node, {
              event: evt,
              gesture: evt.payload.gesture,
              confidence: evt.payload.confidence,
            });
          },
          subscriberId
        );
        this.unsubscribeFns.push(unsub);
        break;
      }

      case 'input-finger-count': {
        const unsub = this.eventBus.subscribe(
          'FINGER_COUNT',
          (evt) => {
            if (this.state !== 'RUNNING') return;
            const targetHand = node.params.targetHand ?? 'Both';
            if (targetHand !== 'Both' && evt.payload.handedness !== targetHand) return;

            this.triggerInputNode(node, {
              event: evt,
              count: evt.payload.stableCount,
              gesture: evt.payload.gestureName,
            });
          },
          subscriberId
        );
        this.unsubscribeFns.push(unsub);
        break;
      }

      case 'input-pinch': {
        const unsub = this.eventBus.subscribe(
          'PINCH',
          (evt) => {
            if (this.state !== 'RUNNING') return;
            const reqState = node.params.triggerState ?? 'start';
            if (evt.payload.state !== reqState) return;

            this.triggerInputNode(node, {
              event: evt,
              state: evt.payload.state,
            });
          },
          subscriberId
        );
        this.unsubscribeFns.push(unsub);
        break;
      }

      case 'input-gaze-dwell': {
        const unsub = this.eventBus.subscribe(
          'GAZE_DWELL',
          (evt) => {
            if (this.state !== 'RUNNING') return;
            const minDwell = node.params.minDwellMs ?? 600;
            if (evt.payload.durationMs < minDwell) return;

            this.triggerInputNode(node, {
              event: evt,
              target: evt.payload.targetName,
              duration: evt.payload.durationMs,
            });
          },
          subscriberId
        );
        this.unsubscribeFns.push(unsub);
        break;
      }

      case 'input-pose': {
        const unsub = this.eventBus.subscribe(
          'POSE_REP',
          (evt) => {
            if (this.state !== 'RUNNING') return;
            const reqEx = node.params.exercise ?? 'any';
            if (reqEx !== 'any' && evt.payload.exercise !== reqEx) return;

            this.triggerInputNode(node, {
              event: evt,
              repCount: evt.payload.repCount,
              exercise: evt.payload.exercise,
            });
          },
          subscriberId
        );
        this.unsubscribeFns.push(unsub);
        break;
      }

      case 'input-audio': {
        const unsub = this.eventBus.subscribe(
          'AUDIO_ACTIVITY',
          (evt) => {
            if (this.state !== 'RUNNING') return;
            const minLoud = node.params.minLoudnessDb ?? -35;
            if (evt.payload.loudnessDb < minLoud) return;

            this.triggerInputNode(node, {
              event: evt,
              pitchHz: evt.payload.pitchHz,
              wpm: evt.payload.wpm,
            });
          },
          subscriberId
        );
        this.unsubscribeFns.push(unsub);
        break;
      }

      case 'input-waste': {
        const unsub = this.eventBus.subscribe(
          'WASTE_CLASSIFIED',
          (evt) => {
            if (this.state !== 'RUNNING') return;
            const minConf = node.params.minConfidence ?? 0.65;
            if (evt.payload.confidence < minConf) return;

            this.triggerInputNode(node, {
              event: evt,
              category: evt.payload.category,
              recyclable: evt.payload.recyclable,
            });
          },
          subscriberId
        );
        this.unsubscribeFns.push(unsub);
        break;
      }

      case 'input-custom-model': {
        const unsub = this.eventBus.subscribe(
          'CUSTOM_CLASSIFIER',
          (evt) => {
            if (this.state !== 'RUNNING') return;
            const targetModelId = node.params.modelId;
            const minConf = node.params.minConfidence ?? 0.70;

            if (targetModelId && evt.payload.modelId !== targetModelId) return;
            if (evt.payload.confidence < minConf) return;

            this.triggerInputNode(node, {
              event: evt,
              label: evt.payload.label,
              confidence: evt.payload.confidence,
            });
          },
          subscriberId
        );
        this.unsubscribeFns.push(unsub);
        break;
      }

      case 'input-manual': {
        // Manual triggers are invoked directly via executeManualTrigger()
        break;
      }
    }
  }

  /**
   * Manually trigger a manual trigger node (useful for testing or direct button click)
   */
  executeManualTrigger(nodeId: string): void {
    if (this.state !== 'RUNNING' || !this.protocol) return;
    const node = this.protocol.nodes.find((n) => n.id === nodeId);
    if (!node || node.type !== 'input-manual') return;

    this.addLog('info', `Manual trigger activated on node "${node.label}".`, node.id);
    this.triggerInputNode(node, {
      event: {
        id: `manual-${Date.now()}`,
        name: 'MANUAL_TRIGGER',
        sourceModule: 'forge',
        timestamp: performance.now(),
        payload: { triggerId: node.id, label: node.label, timestamp: Date.now() },
      },
    });
  }

  /**
   * Ingest and propagate data from an input node down through connected downstream nodes
   */
  private triggerInputNode(node: ProtocolNode, outputData: Record<string, any>): void {
    const start = performance.now();
    this.eventsProcessed++;
    this.lastEventTime = start;
    this.nodeLastOutputs.set(node.id, outputData);

    const duration = performance.now() - start;
    node.lastExecution = {
      timestamp: start,
      durationMs: duration,
      status: 'success',
      outputData,
    };

    this.callbacks.onNodeExecuted?.(node.id, 'success', duration, outputData);
    this.propagateFrom(node.id, outputData);
  }

  /**
   * Propagates data along all outgoing connections from a given node
   */
  private propagateFrom(fromNodeId: string, outputData: Record<string, any>): void {
    if (!this.protocol) return;

    const outgoing = this.protocol.connections.filter((c) => c.fromNode === fromNodeId);
    for (const conn of outgoing) {
      const targetNode = this.protocol.nodes.find((n) => n.id === conn.toNode);
      if (!targetNode) continue;

      const passedValue = outputData[conn.fromPort] !== undefined
        ? outputData[conn.fromPort]
        : outputData['event'] || outputData;

      this.executeNode(targetNode, conn.toPort, passedValue);
    }
  }

  /**
   * Executes a processing or output node with passed input
   */
  private executeNode(node: ProtocolNode, inPortId: string, inputValue: any): void {
    const start = performance.now();
    let status: 'success' | 'filtered' | 'error' = 'success';
    let outputData: Record<string, any> = {};

    try {
      switch (node.type) {
        // --- PROCESSING NODES ---
        case 'proc-threshold': {
          const threshold = Number(node.params.threshold ?? 0.75);
          let score =
            typeof inputValue === 'number'
              ? inputValue
              : inputValue?.confidence ??
                inputValue?.payload?.confidence ??
                inputValue?.score ??
                inputValue?.payload?.score ??
                0;
          if (score < threshold) {
            status = 'filtered';
            this.addLog(
              'info',
              `Node "${node.label}": score ${score.toFixed(2)} < threshold ${threshold}. Filtered.`,
              node.id
            );
          } else {
            outputData = { passed: inputValue };
          }
          break;
        }

        case 'proc-filter': {
          const expected = String(node.params.expectedValue ?? '').trim().toLowerCase();
          const candidate =
            inputValue?.payload?.gesture ??
            inputValue?.gesture ??
            inputValue?.payload?.count ??
            inputValue?.count ??
            inputValue?.payload?.category ??
            inputValue?.category ??
            inputValue;
          const actual = String(candidate ?? '').trim().toLowerCase();
          const match = actual === expected;

          if (!match) {
            status = 'filtered';
          } else {
            outputData = { passed: inputValue };
          }
          break;
        }

        case 'proc-cooldown': {
          const cooldownMs = Number(node.params.cooldownMs ?? 800);
          const lastTime = this.lastNodeExecutionTime.get(node.id) || 0;
          if (lastTime > 0 && start - lastTime < cooldownMs) {
            status = 'filtered';
          } else {
            this.lastNodeExecutionTime.set(node.id, start);
            outputData = { out: inputValue };
          }
          break;
        }

        case 'proc-compare': {
          const op = node.params.operator ?? '==';
          const target = Number(node.params.targetValue ?? 0);
          const num =
            typeof inputValue === 'number'
              ? inputValue
              : Number(
                  inputValue?.payload?.repCount ??
                    inputValue?.repCount ??
                    inputValue?.payload?.count ??
                    inputValue?.count ??
                    inputValue?.payload?.stableCount ??
                    inputValue?.stableCount ??
                    0
                );

          let pass = false;
          if (op === '==') pass = num === target;
          else if (op === '>') pass = num > target;
          else if (op === '<') pass = num < target;
          else if (op === '>=') pass = num >= target;
          else if (op === '<=') pass = num <= target;

          outputData = { result: pass, passed: pass ? inputValue : null };
          if (!pass) status = 'filtered';
          break;
        }

        case 'proc-mapper': {
          const table: Record<string, string> = node.params.mappingTable || {};
          const fallback = node.params.fallbackValue || 'UNKNOWN';
          const key = String(
            typeof inputValue === 'object' && inputValue !== null
              ? inputValue?.payload?.category ??
                inputValue?.category ??
                inputValue?.payload?.gesture ??
                inputValue?.gesture ??
                inputValue?.payload?.targetName ??
                inputValue?.targetName ??
                inputValue?.payload?.count ??
                inputValue?.count ??
                ''
              : inputValue
          );
          const mapped = table[key] || fallback;
          outputData = { mapped };
          break;
        }

        case 'proc-branch': {
          const condition = Boolean(inputValue?.result ?? inputValue);
          if (condition) {
            outputData = { trueBranch: inputValue };
          } else {
            outputData = { falseBranch: inputValue };
          }
          break;
        }

        // --- OUTPUT NODES ---
        case 'output-fx': {
          const effectType = node.params.effectType || 'holographic_burst';
          this.actionsExecuted++;
          this.addLog('action', `Visual effect "${effectType}" dispatched.`, node.id);
          this.callbacks.onActionTriggered?.('VISUAL_FX', { effectType, color: node.params.color });
          outputData = { done: { effectType, timestamp: Date.now() } };
          break;
        }

        case 'output-toast': {
          const title = node.params.title || 'PROTOCOL ALERT';
          const customMsg = typeof inputValue === 'string' ? inputValue : inputValue?.mapped || node.params.title;
          this.actionsExecuted++;
          this.addLog('action', `HUD Toast displayed: "${customMsg}".`, node.id);
          this.callbacks.onActionTriggered?.('TOAST', {
            title,
            message: customMsg,
            variant: node.params.variant || 'sage',
          });
          outputData = { done: { title, message: customMsg } };
          break;
        }

        case 'output-audio-chime': {
          this.actionsExecuted++;
          this.playProceduralChime(node.params.frequencyHz ?? 880, node.params.durationSec ?? 0.18);
          this.addLog('action', `Synthesized chime played (${node.params.frequencyHz ?? 880}Hz).`, node.id);
          outputData = { done: true };
          break;
        }

        case 'output-log': {
          this.actionsExecuted++;
          const tag = node.params.tag || 'EXPERIMENT_EVENT';
          this.addLog('action', `[${tag}] ${JSON.stringify(inputValue)}`, node.id, inputValue);
          outputData = { done: true };
          break;
        }

        case 'output-simulator': {
          const action = node.params.action || 'AFTERBURNER_TOGGLE';
          this.actionsExecuted++;
          this.addLog('action', `Simulator command dispatched: ${action}`, node.id);
          this.callbacks.onActionTriggered?.('SIMULATOR_ACTION', { action });
          if (action === 'AFTERBURNER_TOGGLE') {
            this.eventBus.publish(
              'MANUAL_TRIGGER',
              {
                triggerId: 'TOGGLE_AFTERBURNER',
                label: 'Toggle Afterburner',
                timestamp: Date.now(),
              },
              'forge'
            );
          }
          outputData = { done: { action } };
          break;
        }
      }
    } catch (err: any) {
      status = 'error';
      this.addLog('error', `Execution error in node "${node.label}": ${err?.message}`, node.id);
    }

    const duration = performance.now() - start;
    node.lastExecution = {
      timestamp: start,
      durationMs: duration,
      status,
      outputData,
    };

    this.callbacks.onNodeExecuted?.(node.id, status, duration, outputData);

    // Continue propagation if step succeeded and produced outputs
    if (status === 'success' && Object.keys(outputData).length > 0) {
      this.nodeLastOutputs.set(node.id, outputData);
      this.propagateFrom(node.id, outputData);
    }
  }

  /**
   * Safe procedural audio chime using Web Audio API
   */
  private playProceduralChime(freqHz: number, durationSec: number): void {
    if (typeof window === 'undefined') return;
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqHz, this.audioContext.currentTime);

      gain.gain.setValueAtTime(0.12, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + durationSec);
    } catch {
      // Audio autoplay policy or unavailable context
    }
  }

  private clearSubscriptions(): void {
    for (const unsub of this.unsubscribeFns) {
      try {
        unsub();
      } catch {}
    }
    this.unsubscribeFns = [];
  }

  private setState(state: ProtocolExecutionState): void {
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }

  private addLog(level: 'info' | 'warn' | 'error' | 'action', message: string, nodeId?: string, data?: any): void {
    const entry: ProtocolLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: performance.now(),
      level,
      message,
      nodeId,
      nodeLabel: nodeId && this.protocol ? this.protocol.nodes.find((n) => n.id === nodeId)?.label : undefined,
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    this.callbacks.onLog?.(entry);
  }
}
