import {
  GoofyHandGestureType,
  GestureSequenceDefinition,
  BUILTIN_GESTURE_SEQUENCES,
} from './goofy-types';

export interface SequenceStepProgress {
  sequenceId: string;
  stepIndex: number; // Index in sequence.steps that was just completed
  timestamp: number;
}

export interface SequenceEngineResult {
  triggered: boolean;
  sequence: GestureSequenceDefinition | null;
  timestamp: number;
  progressPercent: number;
}

export class GoofySequenceEngine {
  private sequences: GestureSequenceDefinition[] = [];
  private progressMap: Map<string, { currentStep: number; lastStepTime: number }> = new Map();
  private lastTriggerTime = 0;
  private cooldownMs: number;
  private lastObservedGesture: GoofyHandGestureType | null = null;
  private lastObservedTime = 0;

  constructor(customSequences: GestureSequenceDefinition[] = [], cooldownMs = 1200) {
    this.cooldownMs = cooldownMs;
    this.updateSequences(customSequences);
  }

  updateSequences(customSequences: GestureSequenceDefinition[] = []): void {
    const customIds = new Set(customSequences.map((s) => s.id));
    const builtins = BUILTIN_GESTURE_SEQUENCES.filter((s) => !customIds.has(s.id));
    this.sequences = [...builtins, ...customSequences];
  }

  setCooldown(cooldownMs: number): void {
    this.cooldownMs = cooldownMs;
  }

  /**
   * Ingests a confirmed stable gesture event and checks for multi-step sequence completion.
   * Call this when a gesture is newly confirmed by the HandStateMachine.
   */
  processGesture(
    gesture: GoofyHandGestureType,
    timestamp = performance.now()
  ): SequenceEngineResult {
    if (!gesture) {
      return { triggered: false, sequence: null, timestamp, progressPercent: 0 };
    }

    // Cooldown check for entire sequence engine
    if (timestamp - this.lastTriggerTime < this.cooldownMs) {
      return { triggered: false, sequence: null, timestamp, progressPercent: 0 };
    }

    // Avoid redundant steps if same gesture fired consecutively without change
    if (gesture === this.lastObservedGesture && timestamp - this.lastObservedTime < 350) {
      return { triggered: false, sequence: null, timestamp, progressPercent: 0 };
    }
    this.lastObservedGesture = gesture;
    this.lastObservedTime = timestamp;

    let triggeredSequence: GestureSequenceDefinition | null = null;
    let maxProgress = 0;

    for (const seq of this.sequences) {
      if (!seq.steps || seq.steps.length < 2) continue;

      const progress = this.progressMap.get(seq.id) || { currentStep: 0, lastStepTime: 0 };
      const elapsedSinceLast = timestamp - progress.lastStepTime;

      // Reset progress if window expired
      if (progress.currentStep > 0 && elapsedSinceLast > seq.maxWindowMs) {
        progress.currentStep = 0;
        progress.lastStepTime = 0;
      }

      const expectedGesture = seq.steps[progress.currentStep];

      if (gesture === expectedGesture) {
        progress.currentStep += 1;
        progress.lastStepTime = timestamp;

        if (progress.currentStep >= seq.steps.length) {
          // Completed full sequence!
          triggeredSequence = seq;
          progress.currentStep = 0;
          progress.lastStepTime = 0;
          this.progressMap.set(seq.id, progress);
          break;
        } else {
          this.progressMap.set(seq.id, progress);
          const pct = (progress.currentStep / seq.steps.length) * 100;
          if (pct > maxProgress) maxProgress = pct;
        }
      } else {
        // Check if current gesture matches the START of the sequence instead
        if (gesture === seq.steps[0]) {
          progress.currentStep = 1;
          progress.lastStepTime = timestamp;
          this.progressMap.set(seq.id, progress);
          const pct = (1 / seq.steps.length) * 100;
          if (pct > maxProgress) maxProgress = pct;
        } else {
          progress.currentStep = 0;
          progress.lastStepTime = 0;
          this.progressMap.set(seq.id, progress);
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
      };
    }

    return {
      triggered: false,
      sequence: null,
      timestamp,
      progressPercent: maxProgress,
    };
  }

  resetProgress(): void {
    this.progressMap.clear();
    this.lastObservedGesture = null;
    this.lastObservedTime = 0;
  }

  reset(): void {
    this.resetProgress();
    this.lastTriggerTime = 0;
  }
}
