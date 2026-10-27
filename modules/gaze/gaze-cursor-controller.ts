import { OneEuroFilter } from '@/core/filters';
import { GazeFeatures, GazeCursorConfig, DEFAULT_GAZE_CURSOR_CONFIG } from './types';
import { GazeCalibrationEngine } from './calibration';

export interface GazeCursorState {
  x: number;
  y: number;
  rawX: number;
  rawY: number;
  normX: number;
  normY: number;
  isTracking: boolean;
  isCalibrated: boolean;
  isFixating: boolean;
  velocityPxSec: number;
  dwellProgress: number; // 0 to 1
  dwellTargetName: string | null;
  dwellLocked: boolean;
  trail: { x: number; y: number; alpha: number }[];
  lastUpdateTime: number;
}

export class GazeCursorController {
  private filterX: OneEuroFilter;
  private filterY: OneEuroFilter;
  private config: GazeCursorConfig = { ...DEFAULT_GAZE_CURSOR_CONFIG };
  private trail: { x: number; y: number; time: number }[] = [];

  // Dwell state
  private dwellElement: HTMLElement | null = null;
  private dwellStartTime = 0;
  private dwellTriggered = false;
  private dwellLockUntil = 0;
  private dwellAnchorPos = { x: 0, y: 0 };

  // Motion dynamics
  private lastX = 0;
  private lastY = 0;
  private lastTimestamp = 0;
  private currentVelocity = 0;
  private isFixating = true;

  constructor(config?: Partial<GazeCursorConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.filterX = new OneEuroFilter(60, {
      minCutoff: this.config.minCutoff,
      beta: this.config.smoothingBeta,
    });
    this.filterY = new OneEuroFilter(60, {
      minCutoff: this.config.minCutoff,
      beta: this.config.smoothingBeta,
    });
  }

  updateConfig(newConfig: Partial<GazeCursorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.filterX = new OneEuroFilter(60, {
      minCutoff: this.config.minCutoff,
      beta: this.config.smoothingBeta,
    });
    this.filterY = new OneEuroFilter(60, {
      minCutoff: this.config.minCutoff,
      beta: this.config.smoothingBeta,
    });
  }

  getConfig(): GazeCursorConfig {
    return this.config;
  }

  reset(): void {
    this.filterX.reset();
    this.filterY.reset();
    this.trail = [];
    this.dwellElement = null;
    this.dwellStartTime = 0;
    this.dwellTriggered = false;
    this.dwellLockUntil = 0;
    this.lastTimestamp = 0;
    this.currentVelocity = 0;
    this.isFixating = true;
  }

  /**
   * Process a single video frame with calibrated gaze prediction and dwell evaluation
   */
  process(
    features: GazeFeatures | null,
    calibrationEngine: GazeCalibrationEngine,
    viewportWidth: number,
    viewportHeight: number,
    now: number
  ): GazeCursorState {
    const dt = this.lastTimestamp > 0 ? Math.max(0.001, (now - this.lastTimestamp) / 1000) : 0.016;
    this.lastTimestamp = now;

    if (!features || !features.isTracking) {
      this.resetDwell();
      return {
        x: this.lastX,
        y: this.lastY,
        rawX: this.lastX,
        rawY: this.lastY,
        normX: this.lastX / Math.max(1, viewportWidth),
        normY: this.lastY / Math.max(1, viewportHeight),
        isTracking: false,
        isCalibrated: calibrationEngine.isReady(),
        isFixating: true,
        velocityPxSec: 0,
        dwellProgress: 0,
        dwellTargetName: null,
        dwellLocked: false,
        trail: [],
        lastUpdateTime: now,
      };
    }

    // 1. Predict raw gaze coordinates from calibrated engine
    const rawPrediction = calibrationEngine.predictGaze(features, viewportWidth, viewportHeight);

    // 2. Measure instantaneous velocity to detect ballistic saccades vs steady fixation
    const rawDist = Math.hypot(rawPrediction.x - this.lastX, rawPrediction.y - this.lastY);
    const instVelocity = rawDist / dt;
    this.currentVelocity = this.currentVelocity * 0.7 + instVelocity * 0.3;
    this.isFixating = this.currentVelocity < 280;

    // 3. Saccade-Adaptive One Euro Filtering:
    // If user eyes are jumping rapidly (> 380 px/s), increase filter responsiveness to eliminate lag
    if (this.currentVelocity > 380) {
      this.filterX.setParams({ minCutoff: 3.5, beta: 0.15 });
      this.filterY.setParams({ minCutoff: 3.5, beta: 0.15 });
    } else {
      this.filterX.setParams({ minCutoff: this.config.minCutoff, beta: this.config.smoothingBeta });
      this.filterY.setParams({ minCutoff: this.config.minCutoff, beta: this.config.smoothingBeta });
    }

    const smoothX = this.filterX.filter(rawPrediction.x, now);
    const smoothY = this.filterY.filter(rawPrediction.y, now);

    // 4. Viewport constraint
    const clampedX = Math.max(4, Math.min(viewportWidth - 4, smoothX));
    const clampedY = Math.max(4, Math.min(viewportHeight - 4, smoothY));

    this.lastX = clampedX;
    this.lastY = clampedY;

    // 5. Update Motion Trail
    if (this.config.showTrail) {
      this.trail.push({ x: clampedX, y: clampedY, time: now });
      const maxAgeMs = 380;
      this.trail = this.trail.filter((t) => now - t.time <= maxAgeMs);
      if (this.trail.length > this.config.trailLength) {
        this.trail.shift();
      }
    } else {
      this.trail = [];
    }

    // 6. Dwell Interaction Evaluation
    let dwellProgress = 0;
    let dwellTargetName: string | null = null;
    let isDwellLocked = false;

    if (this.config.dwellEnabled && typeof document !== 'undefined') {
      const dwellState = this.evaluateDwell(clampedX, clampedY, now);
      dwellProgress = dwellState.progress;
      dwellTargetName = dwellState.targetName;
      isDwellLocked = dwellState.locked;
    }

    // 7. Format trail with alpha decay
    const formattedTrail = this.trail.map((p, idx) => ({
      x: p.x,
      y: p.y,
      alpha: (idx + 1) / (this.trail.length + 1),
    }));

    return {
      x: clampedX,
      y: clampedY,
      rawX: rawPrediction.x,
      rawY: rawPrediction.y,
      normX: clampedX / viewportWidth,
      normY: clampedY / viewportHeight,
      isTracking: true,
      isCalibrated: calibrationEngine.isReady(),
      isFixating: this.isFixating,
      velocityPxSec: Math.round(this.currentVelocity),
      dwellProgress,
      dwellTargetName,
      dwellLocked: isDwellLocked,
      trail: formattedTrail,
      lastUpdateTime: now,
    };
  }

  private resetDwell(): void {
    this.dwellElement = null;
    this.dwellStartTime = 0;
    this.dwellTriggered = false;
  }

  private evaluateDwell(
    x: number,
    y: number,
    now: number
  ): { progress: number; targetName: string | null; locked: boolean } {
    // Check if under temporary post-click lock
    if (now < this.dwellLockUntil) {
      return { progress: 1.0, targetName: this.dwellElement?.innerText?.trim().slice(0, 20) || 'LOCKED', locked: true };
    }

    // Query element under gaze point
    const element = document.elementFromPoint(x, y);
    if (!element) {
      this.resetDwell();
      return { progress: 0, targetName: null, locked: false };
    }

    // Find closest interactive target (button, link, interactive role)
    const target = element.closest<HTMLElement>(
      'button, a, input, select, [role="button"], [data-gaze-clickable="true"]'
    );

    // Ignore if not interactive or explicitly marked as ignore/destructive
    if (!target || target.getAttribute('data-gaze-ignore') === 'true' || target.hasAttribute('disabled')) {
      this.resetDwell();
      return { progress: 0, targetName: null, locked: false };
    }

    const targetLabel =
      target.getAttribute('aria-label') ||
      target.getAttribute('title') ||
      target.innerText?.trim().slice(0, 24) ||
      'INTERACTIVE CONTROL';

    // If target changed or moved out of radius
    if (this.dwellElement !== target) {
      this.dwellElement = target;
      this.dwellStartTime = now;
      this.dwellTriggered = false;
      this.dwellAnchorPos = { x, y };
      return { progress: 0, targetName: targetLabel, locked: false };
    }

    // If gaze shifted too far from anchor point, reset
    const distFromAnchor = Math.hypot(x - this.dwellAnchorPos.x, y - this.dwellAnchorPos.y);
    if (distFromAnchor > this.config.dwellRadiusPx) {
      this.dwellStartTime = now;
      this.dwellAnchorPos = { x, y };
      return { progress: 0, targetName: targetLabel, locked: false };
    }

    // Accumulate dwell progress
    const elapsed = now - this.dwellStartTime;
    const progress = Math.min(1.0, elapsed / Math.max(200, this.config.dwellDurationMs));

    if (progress >= 1.0 && !this.dwellTriggered) {
      this.dwellTriggered = true;
      this.dwellLockUntil = now + 1200; // 1.2s post-trigger lock

      // Dispatch standard DOM click
      try {
        target.click();
      } catch {
        // Fallback
      }

      return { progress: 1.0, targetName: `ACTIVATED: ${targetLabel}`, locked: true };
    }

    return { progress, targetName: targetLabel, locked: false };
  }
}
