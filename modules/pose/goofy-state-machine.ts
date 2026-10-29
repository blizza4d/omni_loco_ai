import {
  GoofyPoseType,
  PoseTrackingStatus,
  PoseClassificationResult,
  GoofyTriggerEvent,
  GOOFY_POSE_METADATA,
} from './goofy-types';

export interface PoseStateMachineOptions {
  minHoldMs?: number;
  cooldownMs?: number;
}

export class GoofyPoseStateMachine {
  private status: PoseTrackingStatus = 'NO_POSE';
  private currentPose: GoofyPoseType | null = null;
  private candidatePose: GoofyPoseType | null = null;
  private candidateStartTime = 0;
  private lastTriggerTime = 0;
  private triggeredPose: GoofyPoseType | null = null;
  private minHoldMs: number;
  private cooldownMs: number;
  private holdProgress = 0; // 0 to 1

  constructor(options: PoseStateMachineOptions = {}) {
    this.minHoldMs = options.minHoldMs ?? 250;
    this.cooldownMs = options.cooldownMs ?? 750;
  }

  updateConfig(options: PoseStateMachineOptions): void {
    if (options.minHoldMs !== undefined) this.minHoldMs = options.minHoldMs;
    if (options.cooldownMs !== undefined) this.cooldownMs = options.cooldownMs;
  }

  getStatus(): PoseTrackingStatus {
    return this.status;
  }

  getCurrentPose(): GoofyPoseType | null {
    return this.currentPose;
  }

  getHoldProgress(): number {
    return this.holdProgress;
  }

  reset(): void {
    this.status = 'NO_POSE';
    this.currentPose = null;
    this.candidatePose = null;
    this.candidateStartTime = 0;
    this.triggeredPose = null;
    this.holdProgress = 0;
  }

  /**
   * Process a frame's classification result and return an event if a trigger condition is met
   */
  process(
    classification: PoseClassificationResult,
    now: number
  ): {
    status: PoseTrackingStatus;
    activePose: GoofyPoseType | null;
    holdProgress: number;
    triggerEvent: GoofyTriggerEvent | null;
  } {
    const rawPose = classification.pose;

    // 1. If tracking lost or no human detected
    if (classification.label === 'NO HUMAN DETECTED') {
      this.status = 'TRACKING_LOST';
      this.currentPose = null;
      this.candidatePose = null;
      this.candidateStartTime = 0;
      this.triggeredPose = null;
      this.holdProgress = 0;
      return {
        status: this.status,
        activePose: null,
        holdProgress: 0,
        triggerEvent: null,
      };
    }

    // 2. If no valid pose detected (neutral stance)
    if (!rawPose) {
      if (this.triggeredPose !== null) {
        this.status = 'POSE_RELEASED';
      } else {
        this.status = 'NO_POSE';
      }
      this.currentPose = null;
      this.candidatePose = null;
      this.candidateStartTime = 0;
      this.triggeredPose = null;
      this.holdProgress = 0;
      return {
        status: this.status,
        activePose: null,
        holdProgress: 0,
        triggerEvent: null,
      };
    }

    // 3. User is performing a recognizable pose!
    this.currentPose = rawPose;

    // Check if the user is still holding the pose that was ALREADY triggered
    if (this.triggeredPose === rawPose) {
      this.status = 'POSE_TRIGGERED';
      this.holdProgress = 1.0;
      return {
        status: this.status,
        activePose: rawPose,
        holdProgress: 1.0,
        triggerEvent: null, // NO repeated audio while holding!
      };
    }

    // If pose switched or starting fresh
    if (this.candidatePose !== rawPose) {
      this.candidatePose = rawPose;
      this.candidateStartTime = now;
      this.status = 'CANDIDATE';
      this.holdProgress = 0;
      return {
        status: this.status,
        activePose: rawPose,
        holdProgress: 0,
        triggerEvent: null,
      };
    }

    // Calculate hold elapsed time
    const holdDuration = now - this.candidateStartTime;
    this.holdProgress = Math.min(1.0, holdDuration / this.minHoldMs);

    // If held long enough to become stable
    if (holdDuration >= this.minHoldMs) {
      const cooldownElapsed = now - this.lastTriggerTime;

      if (cooldownElapsed >= this.cooldownMs) {
        // Trigger event!
        this.status = 'POSE_TRIGGERED';
        this.triggeredPose = rawPose;
        this.lastTriggerTime = now;
        this.holdProgress = 1.0;

        const meta = GOOFY_POSE_METADATA[rawPose];
        const event: GoofyTriggerEvent = {
          id: `goofy-evt-${now}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: now,
          pose: rawPose,
          poseLabel: meta.label,
          caption: classification.comicCaption || meta.defaultCaption,
          soundId: 'AIR_HORN', // will be mapped by audio engine
          soundName: '',
          confidence: classification.confidence,
        };

        return {
          status: this.status,
          activePose: rawPose,
          holdProgress: 1.0,
          triggerEvent: event,
        };
      } else {
        // Stable but still in cooldown from previous trigger
        this.status = 'STABLE_RECOGNIZED';
        return {
          status: this.status,
          activePose: rawPose,
          holdProgress: 1.0,
          triggerEvent: null,
        };
      }
    } else {
      // Accumulating candidate hold time
      this.status = 'CANDIDATE';
      return {
        status: this.status,
        activePose: rawPose,
        holdProgress: this.holdProgress,
        triggerEvent: null,
      };
    }
  }
}
