/**
 * 1D and 2D Kalman Filter
 * Optimal recursive data processing algorithm for noisy sensor observations.
 */

export class KalmanFilter1D {
  private q: number; // process noise covariance
  private r: number; // measurement noise covariance
  private x: number; // state estimate
  private p: number; // estimation error covariance
  private k = 0;     // Kalman gain
  private initialized = false;

  constructor(processNoise = 0.008, measurementNoise = 0.1, initialValue = 0) {
    this.q = processNoise;
    this.r = measurementNoise;
    this.x = initialValue;
    this.p = 1.0;
  }

  filter(measurement: number): number {
    if (!this.initialized) {
      this.x = measurement;
      this.initialized = true;
      return this.x;
    }

    // Prediction update
    this.p = this.p + this.q;

    // Measurement update
    this.k = this.p / (this.p + this.r);
    this.x = this.x + this.k * (measurement - this.x);
    this.p = (1 - this.k) * this.p;

    return this.x;
  }

  reset(initialValue = 0): void {
    this.x = initialValue;
    this.p = 1.0;
    this.initialized = false;
  }
}

export class KalmanFilter2D {
  private kx: KalmanFilter1D;
  private ky: KalmanFilter1D;

  constructor(processNoise = 0.008, measurementNoise = 0.1) {
    this.kx = new KalmanFilter1D(processNoise, measurementNoise);
    this.ky = new KalmanFilter1D(processNoise, measurementNoise);
  }

  filter(x: number, y: number): [number, number] {
    return [this.kx.filter(x), this.ky.filter(y)];
  }

  reset(): void {
    this.kx.reset();
    this.ky.reset();
  }
}
