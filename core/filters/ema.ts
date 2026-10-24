/**
 * Exponential Moving Average (EMA) Filter
 * Lightweight smoothing for scalar measurements, joint angles, and velocities.
 */

export class EMAFilter {
  private alpha: number;
  private current: number | null = null;

  constructor(alpha = 0.2) {
    this.alpha = Math.max(0.01, Math.min(1.0, alpha));
  }

  setAlpha(alpha: number): void {
    this.alpha = Math.max(0.01, Math.min(1.0, alpha));
  }

  filter(val: number): number {
    if (this.current === null) {
      this.current = val;
    } else {
      this.current = this.alpha * val + (1.0 - this.alpha) * this.current;
    }
    return this.current;
  }

  get(): number {
    return this.current ?? 0;
  }

  reset(): void {
    this.current = null;
  }
}

/**
 * Vector EMA filter for multi-dimensional coordinate arrays
 */
export class VectorEMAFilter {
  private alpha: number;
  private current: number[] | null = null;

  constructor(alpha = 0.2) {
    this.alpha = Math.max(0.01, Math.min(1.0, alpha));
  }

  filter(vector: number[]): number[] {
    if (this.current === null || this.current.length !== vector.length) {
      this.current = [...vector];
      return this.current;
    }
    this.current = this.current.map((curr, idx) => {
      const v = vector[idx] ?? curr;
      return this.alpha * v + (1.0 - this.alpha) * curr;
    });
    return [...this.current];
  }

  reset(): void {
    this.current = null;
  }
}
