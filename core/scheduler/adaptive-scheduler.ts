/**
 * OMNI LOCO AI 3.0 — ADAPTIVE INFERENCE FRAME SCHEDULER
 * Ensures UI thread stays at 60fps by dropping incoming camera frames
 * if inference latency exceeds the frame budget. Zero queue backlog.
 * Features strict ImageBitmap leak prevention, lifetime frame accounting,
 * dual video/render FPS telemetry, and generation token cancellation.
 */

export interface LatencyStats {
  p50Ms: number;
  p95Ms: number;
  fps: number; // Backward-compatible alias for renderFps
  renderFps: number;
  videoFps: number;
  attemptedFrames: number;
  processedFrames: number; // Lifetime cumulative
  droppedFrames: number; // Lifetime cumulative
  inferenceDurationMs: number;
  isBusy: boolean;
}

export class AdaptiveFrameScheduler {
  private isBusy = false;
  private isRunning = false;
  private runGeneration = 0;
  private videoElement: HTMLVideoElement | null = null;
  private onFrameCallback: ((bitmap: ImageBitmap, timestamp: number) => Promise<void>) | null = null;
  private frameId: number | null = null;
  private rvfcHandle: number | null = null;

  // Latency & frame statistics
  private latencies: number[] = [];
  private maxLatencyHistory = 60;
  private attemptedCount = 0;
  private processedCount = 0;
  private droppedCount = 0;
  private videoTickCount = 0;
  private renderTickCount = 0;
  private currentRenderFps = 0;
  private currentVideoFps = 0;
  private lastInferenceMs = 0;
  private lastFpsCalcTime = performance.now();

  constructor(
    private targetFps = 30,
    private onStatsUpdate?: (stats: LatencyStats) => void
  ) {}

  setVideoElement(video: HTMLVideoElement | null): void {
    this.videoElement = video;
  }

  start(onFrame: (bitmap: ImageBitmap, timestamp: number) => Promise<void>): void {
    this.onFrameCallback = onFrame;
    this.isRunning = true;
    this.isBusy = false;
    this.runGeneration++;

    // Listen to tab visibility
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    this.scheduleNextFrame();
  }

  stop(): void {
    this.isRunning = false;
    this.isBusy = false;
    this.runGeneration++;

    if (this.rvfcHandle !== null && this.videoElement && 'cancelVideoFrameCallback' in this.videoElement) {
      (this.videoElement as unknown as { cancelVideoFrameCallback: (handle: number) => void }).cancelVideoFrameCallback(this.rvfcHandle);
      this.rvfcHandle = null;
    }

    if (this.frameId !== null) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.frameId);
      }
      this.frameId = null;
    }

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      // Pause processing
      this.isBusy = false;
      this.runGeneration++;
    } else if (this.isRunning) {
      this.runGeneration++;
      this.scheduleNextFrame();
    }
  };

  private scheduleNextFrame(): void {
    if (!this.isRunning || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) {
      return;
    }

    // Prefer requestVideoFrameCallback for exact vsync alignment with video decoders
    if (this.videoElement && 'requestVideoFrameCallback' in this.videoElement) {
      this.rvfcHandle = (this.videoElement as unknown as {
        requestVideoFrameCallback: (cb: (now: number, meta: unknown) => void) => number;
      }).requestVideoFrameCallback((now) => {
        this.processFrame(now);
      });
    } else if (typeof requestAnimationFrame !== 'undefined') {
      this.frameId = requestAnimationFrame((now) => {
        this.processFrame(now);
      });
    }
  }

  private async processFrame(timestamp: number): Promise<void> {
    const generation = this.runGeneration;
    if (!this.isRunning) return;

    this.attemptedCount++;
    this.videoTickCount++;

    // Measure FPS
    const now = performance.now();
    if (now - this.lastFpsCalcTime >= 1000) {
      const elapsed = (now - this.lastFpsCalcTime) / 1000;
      this.currentRenderFps = Math.round(this.renderTickCount / elapsed);
      this.currentVideoFps = Math.round(this.videoTickCount / elapsed);
      this.renderTickCount = 0;
      this.videoTickCount = 0;
      this.lastFpsCalcTime = now;
      this.emitStats();
    }

    // If worker is still computing, drop this frame to prevent queue lag
    if (this.isBusy || !this.videoElement || this.videoElement.readyState < 2) {
      this.droppedCount++;
      this.scheduleNextFrame();
      return;
    }

    let bitmap: ImageBitmap | null = null;
    try {
      this.isBusy = true;
      const start = performance.now();

      // Convert video frame to ImageBitmap transferrable
      bitmap = await createImageBitmap(this.videoElement);

      if (this.isRunning && generation === this.runGeneration && this.onFrameCallback) {
        await this.onFrameCallback(bitmap, timestamp);

        const duration = performance.now() - start;
        this.lastInferenceMs = Math.round(duration * 10) / 10;
        this.latencies.push(duration);
        if (this.latencies.length > this.maxLatencyHistory) {
          this.latencies.shift();
        }
        this.processedCount++;
        this.renderTickCount++;
      }
    } catch {
      // Frame conversion or worker error
      this.droppedCount++;
    } finally {
      // Crucial: Explicitly close bitmap to prevent GPU texture memory leaks
      if (bitmap) {
        try {
          bitmap.close();
        } catch {
          // Ignore if transferred to worker or already closed
        }
      }
      this.isBusy = false;
      if (this.isRunning && generation === this.runGeneration) {
        this.scheduleNextFrame();
      }
    }
  }

  private emitStats(): void {
    if (!this.onStatsUpdate) return;
    this.onStatsUpdate(this.getStats());
  }

  getStats(): LatencyStats {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || p50;

    return {
      p50Ms: Math.round(p50 * 10) / 10,
      p95Ms: Math.round(p95 * 10) / 10,
      fps: this.currentRenderFps,
      renderFps: this.currentRenderFps,
      videoFps: this.currentVideoFps,
      attemptedFrames: this.attemptedCount,
      droppedFrames: this.droppedCount,
      processedFrames: this.processedCount,
      inferenceDurationMs: this.lastInferenceMs,
      isBusy: this.isBusy,
    };
  }
}
