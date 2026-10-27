import { Landmark3D, GestureType } from './types';

export type GesturePhase = 'start' | 'active' | 'release';

export interface GestureEventPayload {
  gesture: GestureType | string;
  hand: 'Left' | 'Right';
  confidence: number;
  landmarks: Landmark3D[];
  palmCenter: { x: number; y: number };
  timestamp: number;
  phase: GesturePhase;
  durationMs: number;
}

export type GestureEventListener = (event: GestureEventPayload) => void;

export interface HandGestureState {
  currentGesture: GestureType | string;
  pendingGesture: GestureType | string;
  pendingStartTime: number;
  gestureStartTime: number;
  lastEmitTime: number;
  confidence: number;
}

/**
 * Calculates the 2D geometric centroid of the palm (wrist + MCP joints 0, 5, 9, 13, 17)
 */
export function calculatePalmCenter(landmarks: Landmark3D[]): { x: number; y: number } {
  if (!landmarks || landmarks.length < 21) {
    return { x: 0.5, y: 0.5 };
  }
  const palmIndices = [0, 5, 9, 13, 17];
  let sumX = 0;
  let sumY = 0;
  for (const idx of palmIndices) {
    const pt = landmarks[idx]!;
    sumX += pt.x;
    sumY += pt.y;
  }
  return {
    x: sumX / palmIndices.length,
    y: sumY / palmIndices.length,
  };
}

/**
 * State machine managing gesture transitions, temporal hysteresis, and start/active/release events
 */
export class GestureStateMachine {
  private states: Map<'Left' | 'Right', HandGestureState> = new Map();
  private listeners: Set<GestureEventListener> = new Set();
  private minHoldMs: number;

  constructor(options: { minHoldMs?: number } = {}) {
    this.minHoldMs = options.minHoldMs ?? 90; // 90ms hold required to eliminate transient noise
    this.reset();
  }

  reset(): void {
    const defaultState = (): HandGestureState => ({
      currentGesture: 'none',
      pendingGesture: 'none',
      pendingStartTime: 0,
      gestureStartTime: 0,
      lastEmitTime: 0,
      confidence: 0,
    });

    this.states.set('Left', defaultState());
    this.states.set('Right', defaultState());
  }

  subscribe(listener: GestureEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: GestureEventPayload): void {
    this.listeners.forEach((fn) => {
      try {
        fn(event);
      } catch (err) {
        console.error('Error in gesture listener:', err);
      }
    });
  }

  /**
   * Process a new frame observation for a hand
   */
  update(
    hand: 'Left' | 'Right',
    rawGesture: GestureType | string,
    confidence: number,
    landmarks: Landmark3D[],
    timestamp: number
  ): GestureEventPayload | null {
    let state = this.states.get(hand);
    if (!state) {
      state = {
        currentGesture: 'none',
        pendingGesture: 'none',
        pendingStartTime: 0,
        gestureStartTime: 0,
        lastEmitTime: 0,
        confidence: 0,
      };
      this.states.set(hand, state);
    }

    const palmCenter = calculatePalmCenter(landmarks);
    let emittedEvent: GestureEventPayload | null = null;

    // Check if the incoming gesture is different from the confirmed active gesture
    if (rawGesture !== state.currentGesture) {
      // Check if candidate matches pending gesture
      if (rawGesture === state.pendingGesture) {
        // Has candidate been stable for at least minHoldMs?
        if (timestamp - state.pendingStartTime >= this.minHoldMs) {
          // Release previous active gesture if it wasn't 'none'
          if (state.currentGesture !== 'none') {
            const releasePayload: GestureEventPayload = {
              gesture: state.currentGesture,
              hand,
              confidence: state.confidence,
              landmarks,
              palmCenter,
              timestamp,
              phase: 'release',
              durationMs: timestamp - state.gestureStartTime,
            };
            this.emit(releasePayload);
          }

          // Transition to new gesture
          state.currentGesture = rawGesture;
          state.gestureStartTime = timestamp;
          state.confidence = confidence;

          if (rawGesture !== 'none') {
            const startPayload: GestureEventPayload = {
              gesture: rawGesture,
              hand,
              confidence,
              landmarks,
              palmCenter,
              timestamp,
              phase: 'start',
              durationMs: 0,
            };
            this.emit(startPayload);
            emittedEvent = startPayload;
          }
        }
      } else {
        // New candidate gesture detected, start pending timer
        state.pendingGesture = rawGesture;
        state.pendingStartTime = timestamp;
      }
    } else {
      // Gesture is continuing
      state.pendingGesture = rawGesture;
      state.confidence = confidence;

      if (state.currentGesture !== 'none') {
        const activePayload: GestureEventPayload = {
          gesture: state.currentGesture,
          hand,
          confidence,
          landmarks,
          palmCenter,
          timestamp,
          phase: 'active',
          durationMs: timestamp - state.gestureStartTime,
        };
        // Emit continuous updates at throttled or per-frame rate
        this.emit(activePayload);
        emittedEvent = activePayload;
      }
    }

    state.lastEmitTime = timestamp;
    return emittedEvent;
  }

  getCurrentGesture(hand: 'Left' | 'Right'): GestureType | string {
    return this.states.get(hand)?.currentGesture || 'none';
  }
}
