import {
  GestureSequenceDefinition,
  BUILTIN_GESTURE_SEQUENCES,
  ActiveSequenceState,
  ActiveSequenceStepStatus,
  GOOFY_HAND_METADATA,
} from './goofy-types';

export interface SequenceStepProgress {
  sequenceId: string;
  stepIndex: number;
  timestamp: number;
}

export interface SequenceEngineResult {
  triggered: boolean;
  sequence: GestureSequenceDefinition | null;
  timestamp: number;
  progressPercent: number;
  activeState: ActiveSequenceState | null;
}

interface InternalProgress {
  currentStep: number;
  startTime: number;
  lastStepTime: number;
  stepCompletions: { stepIndex: number; timestamp: number }[];
}

export class GoofySequenceEngine {
  private sequences: GestureSequenceDefinition[] = [];
  private progressMap: Map<string, InternalProgress> = new Map();
  private lastTriggerTime = 0;
  private cooldownMs: number;

  private lastObservedGesture: string | null = null;
  private lastObservedHand: 'Left' | 'Right' | null = null;
  private lastObservedTime = 0;

  private trackingLostTime: number | null = null;
  private maxTrackingLossToleranceMs = 750;

  constructor(customSequences: GestureSequenceDefinition[] = [], cooldownMs = 1200) {
    this.cooldownMs = cooldownMs;
    this.updateSequences(customSequences);
  }

  public updateSequences(customSequences: GestureSequenceDefinition[] = []): void {
    const customIds = new Set(customSequences.map((s) => s.id));
    const builtins = BUILTIN_GESTURE_SEQUENCES.filter((s) => !customIds.has(s.id));
    this.sequences = [...builtins, ...customSequences].filter((s) => s.enabled !== false);
  }

  public setCooldown(cooldownMs: number): void {
    this.cooldownMs = cooldownMs;
  }

  /**
   * Informs engine of tracking loss. If tracking is lost longer than tolerance,
   * sequence progress safely expires.
   */
  public notifyTrackingLoss(timestamp = performance.now()): void {
    if (this.trackingLostTime === null) {
      this.trackingLostTime = timestamp;
    } else if (timestamp - this.trackingLostTime > this.maxTrackingLossToleranceMs) {
      this.resetProgress();
    }
  }

  /**
   * Informs engine of tracking restoration.
   */
  public notifyTrackingRestored(): void {
    this.trackingLostTime = null;
  }

  /**
   * Helper to resolve readable label and icon for a step gesture (built-in or custom)
   */
  private getStepVisuals(gestureId: string): { label: string; icon: string } {
    const meta = (GOOFY_HAND_METADATA as Record<string, any>)[gestureId];
    if (meta) {
      return { label: meta.label || gestureId, icon: meta.icon || '✋' };
    }
    return { label: gestureId.replace(/_/g, ' '), icon: '⚡' };
  }

  /**
   * Ingests a confirmed stable gesture event (built-in or custom) and evaluates sequence progression.
   * Flexibly accepts (gesture, timestamp?, hand?) or (gesture, hand?, timestamp?)
   */
  public processGesture(
    gesture: string,
    arg2?: number | 'Left' | 'Right',
    arg3?: number | 'Left' | 'Right'
  ): SequenceEngineResult {
    let hand: 'Left' | 'Right' = 'Right';
    let timestamp = performance.now();

    if (typeof arg2 === 'number') {
      timestamp = arg2;
      if (typeof arg3 === 'string') hand = arg3;
    } else if (typeof arg2 === 'string') {
      hand = arg2;
      if (typeof arg3 === 'number') timestamp = arg3;
    }

    if (!gesture) {
      return { triggered: false, sequence: null, timestamp, progressPercent: 0, activeState: null };
    }

    this.notifyTrackingRestored();

    // Cooldown check for entire sequence engine
    if (timestamp - this.lastTriggerTime < this.cooldownMs) {
      return { triggered: false, sequence: null, timestamp, progressPercent: 0, activeState: null };
    }

    // Debounce / anti-repetition: continuous frames of identical gesture on same hand are ignored
    if (
      gesture === this.lastObservedGesture &&
      hand === this.lastObservedHand &&
      timestamp - this.lastObservedTime < 380
    ) {
      const activeState = this.getActiveState(timestamp);
      return {
        triggered: false,
        sequence: null,
        timestamp,
        progressPercent: activeState?.progressPercent || 0,
        activeState,
      };
    }

    this.lastObservedGesture = gesture;
    this.lastObservedHand = hand;
    this.lastObservedTime = timestamp;

    let triggeredSequence: GestureSequenceDefinition | null = null;

    for (const seq of this.sequences) {
      if (!seq.steps || seq.steps.length < 2) continue;

      let prog = this.progressMap.get(seq.id);
      if (!prog) {
        prog = { currentStep: 0, startTime: timestamp, lastStepTime: 0, stepCompletions: [] };
      }

      const elapsedSinceLast = timestamp - prog.lastStepTime;

      // Check timeout expiry
      if (prog.currentStep > 0 && elapsedSinceLast > seq.maxWindowMs) {
        prog.currentStep = 0;
        prog.startTime = timestamp;
        prog.lastStepTime = 0;
        prog.stepCompletions = [];
      }

      const expectedGesture = seq.steps[prog.currentStep];
      const expectedHand = seq.stepHands?.[prog.currentStep] ?? 'Any';

      const handMatches = expectedHand === 'Any' || expectedHand === hand;

      if (gesture === expectedGesture && handMatches) {
        // Step completed!
        if (prog.currentStep === 0) {
          prog.startTime = timestamp;
        }
        prog.stepCompletions.push({ stepIndex: prog.currentStep, timestamp });
        prog.currentStep += 1;
        prog.lastStepTime = timestamp;

        if (prog.currentStep >= seq.steps.length) {
          // Completed full sequence!
          triggeredSequence = seq;
          prog.currentStep = 0;
          prog.lastStepTime = 0;
          prog.stepCompletions = [];
          this.progressMap.set(seq.id, prog);
          break;
        } else {
          this.progressMap.set(seq.id, prog);
        }
      } else {
        // Check if current gesture matches START of sequence instead
        const firstExpected = seq.steps[0];
        const firstHand = seq.stepHands?.[0] ?? 'Any';
        const firstHandMatches = firstHand === 'Any' || firstHand === hand;

        if (gesture === firstExpected && firstHandMatches) {
          prog.currentStep = 1;
          prog.startTime = timestamp;
          prog.lastStepTime = timestamp;
          prog.stepCompletions = [{ stepIndex: 0, timestamp }];
          this.progressMap.set(seq.id, prog);
        } else {
          // Reset progress on incorrect gesture
          prog.currentStep = 0;
          prog.lastStepTime = 0;
          prog.stepCompletions = [];
          this.progressMap.set(seq.id, prog);
        }
      }
    }

    if (triggeredSequence) {
      this.lastTriggerTime = timestamp;
      this.resetProgress();
      return {
        triggered: true,
        sequence: triggeredSequence,
        timestamp,
        progressPercent: 100,
        activeState: null,
      };
    }

    const activeState = this.getActiveState(timestamp);

    return {
      triggered: false,
      sequence: null,
      timestamp,
      progressPercent: activeState?.progressPercent || 0,
      activeState,
    };
  }

  /**
   * Retrieves current active sequence status for HUD rendering
   */
  public getActiveState(timestamp = performance.now()): ActiveSequenceState | null {
    let topSeq: GestureSequenceDefinition | null = null;
    let topProg: InternalProgress | null = null;
    let maxStep = 0;

    for (const seq of this.sequences) {
      const prog = this.progressMap.get(seq.id);
      if (prog && prog.currentStep > 0) {
        if (prog.currentStep > maxStep) {
          maxStep = prog.currentStep;
          topSeq = seq;
          topProg = prog;
        }
      }
    }

    if (!topSeq || !topProg || topProg.currentStep === 0) {
      return null;
    }

    const elapsed = timestamp - topProg.lastStepTime;
    const timeRemainingMs = Math.max(0, topSeq.maxWindowMs - elapsed);

    // If window expired, clean up
    if (timeRemainingMs <= 0) {
      topProg.currentStep = 0;
      topProg.stepCompletions = [];
      return null;
    }

    const stepsStatus: ActiveSequenceStepStatus[] = topSeq.steps.map((st, idx) => {
      const visuals = this.getStepVisuals(st);
      const isCompleted = idx < topProg!.currentStep;
      const completedInfo = topProg!.stepCompletions.find((c) => c.stepIndex === idx);

      return {
        stepIndex: idx,
        gesture: st,
        label: visuals.label,
        icon: visuals.icon,
        handedness: topSeq!.stepHands?.[idx] ?? 'Any',
        isCompleted,
        completedAt: completedInfo?.timestamp,
      };
    });

    const progressPercent = Math.round((topProg.currentStep / topSeq.steps.length) * 100);

    return {
      sequenceId: topSeq.id,
      sequenceLabel: topSeq.label,
      currentStepIndex: topProg.currentStep,
      totalSteps: topSeq.steps.length,
      steps: stepsStatus,
      progressPercent,
      timeRemainingMs: Math.round(timeRemainingMs),
      maxWindowMs: topSeq.maxWindowMs,
      startTime: topProg.startTime,
      lastStepTime: topProg.lastStepTime,
    };
  }

  public resetProgress(): void {
    this.progressMap.clear();
    this.lastObservedGesture = null;
    this.lastObservedHand = null;
    this.lastObservedTime = 0;
    this.trackingLostTime = null;
  }

  public reset(): void {
    this.resetProgress();
    this.lastTriggerTime = 0;
  }
}
