/**
 * OMNI LOCO AI 2.0 — SEMANTIC EVENT REPLAY ENGINE
 * Deterministic reproduction of multi-modal perception events without raw camera recording.
 * Records semantic high-level events (gestures, expressions, gaze targets) and replays them
 * for headless debugging, regression testing, and reproducible workflow evaluation.
 */

import { PlatformEventBus, PlatformEvent, PlatformEventName } from '@/core/events/platform-event-bus';

export interface RecordedEventPackage {
  id: string;
  title: string;
  createdAt: string;
  durationMs: number;
  eventCount: number;
  events: {
    offsetMs: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: PlatformEvent<any>;
  }[];
}

export type ReplayState = 'IDLE' | 'RECORDING' | 'PLAYING' | 'PAUSED';

export class EventReplayEngine {
  private static instance: EventReplayEngine | null = null;

  private state: ReplayState = 'IDLE';
  private recordingStartTime = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recordedEvents: { offsetMs: number; event: PlatformEvent<any> }[] = [];
  private unsubscribeBus: (() => void) | null = null;

  private currentPlaybackPackage: RecordedEventPackage | null = null;
  private playbackTimeouts: ReturnType<typeof setTimeout>[] = [];
  private playbackStartTime = 0;
  private playbackElapsedOffset = 0;

  private listeners: Set<(state: ReplayState, progressNorm: number) => void> = new Set();

  private constructor() {}

  public static getInstance(): EventReplayEngine {
    if (!EventReplayEngine.instance) {
      EventReplayEngine.instance = new EventReplayEngine();
    }
    return EventReplayEngine.instance;
  }

  /**
   * Start recording live semantic events from PlatformEventBus.
   */
  public startRecording(): void {
    if (this.state === 'RECORDING') return;

    this.stopPlayback();
    this.recordedEvents = [];
    this.recordingStartTime = performance.now();
    this.state = 'RECORDING';

    const bus = PlatformEventBus.getInstance();
    this.unsubscribeBus = bus.subscribe('*', (event) => {
      if (this.state !== 'RECORDING') return;
      const offsetMs = Math.round(performance.now() - this.recordingStartTime);
      this.recordedEvents.push({
        offsetMs,
        event: {
          ...event,
          sourceModule: `${event.sourceModule} [RECORDED]`,
        },
      });
      this.notifyListeners(0);
    });

    this.notifyListeners(0);
  }

  /**
   * Stop recording and package the session.
   */
  public stopRecording(title = 'Perception Event Session'): RecordedEventPackage | null {
    if (this.state !== 'RECORDING') return null;

    if (this.unsubscribeBus) {
      this.unsubscribeBus();
      this.unsubscribeBus = null;
    }

    const durationMs = Math.round(performance.now() - this.recordingStartTime);
    const pkg: RecordedEventPackage = {
      id: `rec-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      createdAt: new Date().toISOString(),
      durationMs,
      eventCount: this.recordedEvents.length,
      events: [...this.recordedEvents],
    };

    this.state = 'IDLE';
    this.notifyListeners(0);
    return pkg;
  }

  /**
   * Play back a recorded event package.
   * Dispatches events to PlatformEventBus marked as replay.
   */
  public play(
    pkg: RecordedEventPackage,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onEvent?: (event: PlatformEvent<any>) => void,
    onComplete?: () => void
  ): void {
    this.stopPlayback();

    this.currentPlaybackPackage = pkg;
    this.state = 'PLAYING';
    this.playbackStartTime = performance.now();
    this.playbackElapsedOffset = 0;

    const bus = PlatformEventBus.getInstance();

    pkg.events.forEach((item) => {
      const timeout = setTimeout(() => {
        if (this.state !== 'PLAYING') return;

        // Republish to bus with confidence and [REPLAY] attribution
        bus.publish(
          item.event.name as PlatformEventName,
          item.event.payload,
          `${item.event.sourceModule} [REPLAY]`,
          item.event.confidence
        );

        if (onEvent) {
          onEvent(item.event);
        }

        const progress = pkg.durationMs > 0 ? item.offsetMs / pkg.durationMs : 1;
        this.notifyListeners(progress);
      }, item.offsetMs);

      this.playbackTimeouts.push(timeout);
    });

    // Schedule completion
    const completionTimeout = setTimeout(() => {
      this.state = 'IDLE';
      this.playbackTimeouts = [];
      this.notifyListeners(1.0);
      if (onComplete) onComplete();
    }, pkg.durationMs + 100);

    this.playbackTimeouts.push(completionTimeout);
    this.notifyListeners(0);
  }

  /**
   * Stop any in-progress playback.
   */
  public stopPlayback(): void {
    this.playbackTimeouts.forEach((t) => clearTimeout(t));
    this.playbackTimeouts = [];
    if (this.state === 'PLAYING' || this.state === 'PAUSED') {
      this.state = 'IDLE';
    }
    this.notifyListeners(0);
  }

  public getState(): ReplayState {
    return this.state;
  }

  public getRecordedEventsCount(): number {
    return this.recordedEvents.length;
  }

  public subscribe(listener: (state: ReplayState, progressNorm: number) => void): () => void {
    this.listeners.add(listener);
    listener(this.state, 0);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(progressNorm: number): void {
    this.listeners.forEach((l) => {
      try {
        l(this.state, progressNorm);
      } catch (err) {
        console.warn('[EventReplayEngine] Listener callback error:', err);
      }
    });
  }
}
