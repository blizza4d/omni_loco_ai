/**
 * One Euro Filter
 * Adaptive low-pass filter designed for human-computer interaction.
 * Balances jitter reduction at low speeds with lag reduction at high speeds.
 * Reference: Casiez, G., Roussel, N. and Vogel, D. (2012)
 */

class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  setAlpha(alpha: number): void {
    if (alpha <= 0 || alpha > 1) {
      throw new Error(`Alpha must be in (0, 1], got ${alpha}`);
    }
    this.alpha = alpha;
  }

  constructor(private alpha: number, initVal?: number) {
    if (initVal !== undefined) {
      this.y = initVal;
      this.s = initVal;
    }
  }

  filter(val: number): number {
    if (this.y === null) {
      this.s = val;
    } else {
      this.s = this.alpha * val + (1.0 - this.alpha) * this.s!;
    }
    this.y = val;
    return this.s!;
  }

  filterWithAlpha(val: number, alpha: number): number {
    this.setAlpha(alpha);
    return this.filter(val);
  }

  hasLastRawValue(): boolean {
    return this.y !== null;
  }

  lastRawValue(): number {
    return this.y ?? 0;
  }

  reset(): void {
    this.y = null;
    this.s = null;
  }
}

export interface OneEuroParams {
  minCutoff?: number; // Minimum cutoff frequency (Hz)
  beta?: number;      // Speed coefficient
  dCutoff?: number;   // Cutoff frequency for derivative (Hz)
}

export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private x: LowPassFilter;
  private dx: LowPassFilter;
  private lastTime: number | null = null;

  constructor(
    freq = 60,
    { minCutoff = 1.0, beta = 0.007, dCutoff = 1.0 }: OneEuroParams = {}
  ) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.x = new LowPassFilter(this.alpha(minCutoff, freq));
    this.dx = new LowPassFilter(this.alpha(dCutoff, freq));
  }

  private alpha(cutoff: number, freq: number): number {
    const te = 1.0 / freq;
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / te);
  }

  filter(val: number, timestampMs: number): number {
    if (this.lastTime === null) {
      this.lastTime = timestampMs;
      return this.x.filter(val);
    }

    const dt = Math.max((timestampMs - this.lastTime) / 1000.0, 0.0001);
    this.lastTime = timestampMs;
    const freq = 1.0 / dt;

    // Estimate derivative
    const dVal = this.x.hasLastRawValue()
      ? (val - this.x.lastRawValue()) * freq
      : 0;
    const edVal = this.dx.filterWithAlpha(dVal, this.alpha(this.dCutoff, freq));

    // Dynamic cutoff frequency
    const cutoff = this.minCutoff + this.beta * Math.abs(edVal);
    return this.x.filterWithAlpha(val, this.alpha(cutoff, freq));
  }

  setParams({ minCutoff, beta, dCutoff }: OneEuroParams): void {
    if (minCutoff !== undefined) this.minCutoff = minCutoff;
    if (beta !== undefined) this.beta = beta;
    if (dCutoff !== undefined) this.dCutoff = dCutoff;
  }

  reset(): void {
    this.x.reset();
    this.dx.reset();
    this.lastTime = null;
  }
}

/**
 * Multi-dimensional One Euro filter for 2D/3D points (e.g. landmark coordinates)
 */
export class PointOneEuroFilter {
  private filters: OneEuroFilter[];

  constructor(dimensions = 3, freq = 60, params?: OneEuroParams) {
    this.filters = Array.from({ length: dimensions }, () => new OneEuroFilter(freq, params));
  }

  filter(point: number[], timestampMs: number): number[] {
    return point.map((val, i) => {
      const f = this.filters[i];
      return f ? f.filter(val, timestampMs) : val;
    });
  }

  reset(): void {
    this.filters.forEach((f) => f.reset());
  }
}
