/**
 * OMNI LOCO AI 2.0 — TYPED PLATFORM EVENT INFRASTRUCTURE
 * Centralized semantic event bus connecting vision, audio, simulator, and laboratory modules.
 * Enforces strict schemas, recursion guards, subscriber isolation, and event history recording for replay.
 */

export type PlatformEventName =
  | 'HAND_GESTURE'
  | 'FACE_EXPRESSION'
  | 'FINGER_COUNT'
  | 'PINCH'
  | 'GAZE_DWELL'
  | 'GAZE_TARGET'
  | 'POSE_STATE'
  | 'POSE_REP'
  | 'AUDIO_ACTIVITY'
  | 'WASTE_CLASSIFIED'
  | 'CUSTOM_CLASSIFIER'
  | 'SIMULATOR_STATE'
  | 'GOOFY_MEME_TRIGGER'
  | 'MANUAL_TRIGGER';

export interface PlatformEventPayloads {
  HAND_GESTURE: {
    gesture: string;
    confidence: number;
    handedness: 'Left' | 'Right';
    position?: { x: number; y: number };
  };
  FACE_EXPRESSION: {
    expression: string;
    confidence: number;
    blendshapes?: Record<string, number>;
  };
  FINGER_COUNT: {
    stableCount: number;
    rawCount: number;
    handedness: 'Left' | 'Right' | 'Both';
    gestureName: string;
  };
  PINCH: {
    state: 'start' | 'release' | 'hold';
    position: { x: number; y: number };
    handedness: 'Left' | 'Right';
  };
  GAZE_DWELL: {
    targetName: string;
    normX: number;
    normY: number;
    durationMs: number;
    isCalibrated: boolean;
  };
  GAZE_TARGET: {
    targetName: string | null;
    normX: number;
    normY: number;
    isFixating: boolean;
    isCalibrated: boolean;
  };
  POSE_STATE: {
    exercise: string;
    stage: 'up' | 'down' | 'neutral';
    repCount: number;
    activeFaults: string[];
  };
  POSE_REP: {
    exercise: string;
    repCount: number;
    durationSec: number;
    formScore: number;
  };
  AUDIO_ACTIVITY: {
    isVoiced: boolean;
    pitchHz: number;
    loudnessDb: number;
    wpm: number;
  };
  WASTE_CLASSIFIED: {
    category: string;
    confidence: number;
    recyclable: boolean;
    municipalTip: string;
  };
  CUSTOM_CLASSIFIER: {
    modelId: string;
    modelName: string;
    label: string;
    confidence: number;
    isRecognized: boolean;
  };
  SIMULATOR_STATE: {
    speed: number;
    positionX: number;
    steeringAngle: number;
    controlSource: 'GESTURE' | 'KEYBOARD';
  };
  GOOFY_MEME_TRIGGER: {
    triggerType: 'HAND' | 'FACE' | 'MULTIMODAL' | 'CUSTOM' | 'SEQUENCE';
    memeId: string;
    memeTitle: string;
    confidence: number;
  };
  MANUAL_TRIGGER: {
    triggerId: string;
    label: string;
    timestamp: number;
  };
}

export interface PlatformEvent<T extends PlatformEventName = PlatformEventName> {
  id: string;
  name: T;
  sourceModule: string;
  timestamp: number;
  payload: PlatformEventPayloads[T];
  confidence?: number;
}

export type PlatformEventListener<T extends PlatformEventName = PlatformEventName> = (
  event: PlatformEvent<T>
) => void;

interface Subscription {
  id: string;
  eventName: PlatformEventName | '*';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listener: PlatformEventListener<any>;
  subscriberModule: string;
  once?: boolean;
}

export class PlatformEventBus {
  private static instance: PlatformEventBus | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private eventHistory: PlatformEvent<any>[] = [];
  private maxHistorySize = 150;
  private recursionDepth = 0;
  private maxRecursionDepth = 5;
  private isMuted = false;

  private constructor() {}

  public static getInstance(): PlatformEventBus {
    if (!PlatformEventBus.instance) {
      PlatformEventBus.instance = new PlatformEventBus();
    }
    return PlatformEventBus.instance;
  }

  /**
   * Subscribe to a typed platform event.
   * Returns an unsubscribe function.
   */
  public subscribe<T extends PlatformEventName>(
    eventName: T | '*',
    listener: PlatformEventListener<T>,
    subscriberModule = 'anonymous',
    once = false
  ): () => void {
    const id = `sub-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    this.subscriptions.set(id, {
      id,
      eventName,
      listener,
      subscriberModule,
      once,
    });

    return () => {
      this.subscriptions.delete(id);
    };
  }

  /**
   * Subscribe once.
   */
  public subscribeOnce<T extends PlatformEventName>(
    eventName: T,
    listener: PlatformEventListener<T>,
    subscriberModule = 'anonymous'
  ): () => void {
    return this.subscribe(eventName, listener, subscriberModule, true);
  }

  /**
   * Publish a semantic typed event.
   * Enforces recursion bounds, bounds history, and safely executes callbacks.
   */
  public publish<T extends PlatformEventName>(
    name: T,
    payload: PlatformEventPayloads[T],
    sourceModule: string,
    confidence?: number
  ): PlatformEvent<T> | null {
    if (this.isMuted) return null;

    if (this.recursionDepth >= this.maxRecursionDepth) {
      console.warn(
        `[PlatformEventBus] Event loop cascade suppressed: depth ${this.recursionDepth} on event ${name}`
      );
      return null;
    }

    const event: PlatformEvent<T> = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      sourceModule,
      timestamp: performance.now(),
      payload,
      confidence,
    };

    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    this.recursionDepth++;
    const toRemove: string[] = [];

    try {
      this.subscriptions.forEach((sub, id) => {
        if (sub.eventName === '*' || sub.eventName === name) {
          try {
            sub.listener(event);
          } catch (err) {
            console.error(
              `[PlatformEventBus] Error in listener for "${name}" from module "${sub.subscriberModule}":`,
              err
            );
          }
          if (sub.once) {
            toRemove.push(id);
          }
        }
      });
    } finally {
      this.recursionDepth--;
      for (const id of toRemove) {
        this.subscriptions.delete(id);
      }
    }

    return event;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getHistory(limit = 30): PlatformEvent<any>[] {
    return this.eventHistory.slice(-limit);
  }

  public clearHistory(): void {
    this.eventHistory = [];
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  public getSubscriberCount(): number {
    return this.subscriptions.size;
  }
}
