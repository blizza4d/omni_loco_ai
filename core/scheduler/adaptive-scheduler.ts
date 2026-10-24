/**
 * Adaptive Inference Frame Scheduler
 * Ensures UI thread stays at 60fps by dropping incoming camera frames
 * if inference latency exceeds the frame budget. Zero queue backlog.
 */

export interface LatencyStats {
  p50Ms: number;
  p95Ms: number;
  fps: number;
  droppedFrames: number;
  processedFrames: number;
  isBusy: boolean;
}

export class AdaptiveFrameScheduler {
  private isBusy = false;
  private isRunning = false;
  private videoElement: HTMLVideoElement | null = null;
  private onFrameCallback: ((bitmap: ImageBitmap, timestamp: number) => Promise<void>) | null = null;
  private frameId: number | null = null;
  private rvfcHandle: number | null = null;

  // Latency & frame statistics
  private latencies: number[] = [];
  private maxLatencyHistory = 60;
  private lastFrameTime = performance.now();
  private frameCount = 0;
  private droppedCount = 0;
  private currentFps = 0;
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

    // Listen to tab visibility
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    this.scheduleNextFrame();
  }

  stop(): void {
    this.isRunning = false;
    this.isBusy = false;

    if (this.rvfcHandle !== null && this.videoElement && 'cancelVideoFrameCallback' in this.videoElement) {
      (this.videoElement as unknown as { cancelVideoFrameCallback: (handle: number) => void }).cancelVideoFrameCallback(this.rvfcHandle);
      this.rvfcHandle = null;
    }

    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
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
    } else if (this.isRunning) {
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
    } else {
      this.frameId = requestAnimationFrame((now) => {
        this.processFrame(now);
      });
    }
  }

  private async processFrame(timestamp: number): Promise<void> {
    if (!this.isRunning) return;

    // Measure FPS
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsCalcTime >= 1000) {
      this.currentFps = (this.frameCount * 1000) / (now - this.lastFpsCalcTime);
      this.frameCount = 0;
      this.lastFpsCalcTime = now;
      this.emitStats();
    }

    // If worker is still computing, drop this frame to prevent queue lag
    if (this.isBusy || !this.videoElement || this.videoElement.readyState < 2) {
      this.droppedCount++;
      this.scheduleNextFrame();
      return;
    }

    try {
      this.isBusy = true;
      const start = performance.now();

      // Convert video frame to ImageBitmap transferrable
      const bitmap = await createImageBitmap(this.videoElement);

      if (this.onFrameCallback) {
        await this.onFrameCallback(bitmap, timestamp);
      }

      const duration = performance.now() - start;
      this.latencies.push(duration);
      if (this.latencies.length > this.maxLatencyHistory) {
        this.latencies.shift();
      }
    } catch {
      // Frame conversion or worker error
      this.droppedCount++;
    } finally {
      this.isBusy = false;
      this.scheduleNextFrame();
    }
  }

  private emitStats(): void {
    if (!this.onStatsUpdate) return;

    const sorted = [...this.latencies].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || p50;

    this.onStatsUpdate({
      p50Ms: Math.round(p50 * 10) / 10,
      p95Ms: Math.round(p95 * 10) / 10,
      fps: Math.round(this.currentFps),
      droppedFrames: this.droppedCount,
      processedFrames: this.latencies.length,
      isBusy: this.isBusy,
    });
  }

  getStats(): LatencyStats {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || p50;

    return {
      p50Ms: Math.round(p50 * 10) / 10,
      p95Ms: Math.round(p95 * 10) / 10,
      fps: Math.round(this.currentFps),
      droppedFrames: this.droppedCount,
      processedFrames: this.latencies.length,
      isBusy: this.isBusy,
    };
  }
}
