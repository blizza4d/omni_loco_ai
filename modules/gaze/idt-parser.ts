import { GazeSample, Fixation } from './types';

export class IDTFixationParser {
  private window: GazeSample[] = [];
  private fixations: Fixation[] = [];
  private fixationCounter = 0;
  private minDurationMs = 120;
  private maxDispersionPx = 45;

  processSample(x: number, y: number, timestamp: number): Fixation[] {
    this.window.push({ x, y, timestamp });

    // Prune window if duration too long without fixation
    while (this.window.length > 0 && timestamp - this.window[0]!.timestamp > 1500) {
      this.window.shift();
    }

    if (this.window.length < 3) {
      return [...this.fixations];
    }

    const duration = timestamp - this.window[0]!.timestamp;
    if (duration >= this.minDurationMs) {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      for (const pt of this.window) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }

      const dispersion = (maxX - minX) + (maxY - minY);

      if (dispersion <= this.maxDispersionPx) {
        // Fixation detected: compute centroid
        const avgX = this.window.reduce((sum, p) => sum + p.x, 0) / this.window.length;
        const avgY = this.window.reduce((sum, p) => sum + p.y, 0) / this.window.length;

        const lastFixation = this.fixations[this.fixations.length - 1];

        // Check if continuing previous fixation
        if (
          lastFixation &&
          Math.hypot(avgX - lastFixation.x, avgY - lastFixation.y) < this.maxDispersionPx
        ) {
          lastFixation.durationMs = timestamp - lastFixation.startTime;
          lastFixation.x = (lastFixation.x + avgX) / 2;
          lastFixation.y = (lastFixation.y + avgY) / 2;
        } else {
          this.fixationCounter++;
          this.fixations.push({
            id: this.fixationCounter,
            x: Math.round(avgX),
            y: Math.round(avgY),
            startTime: this.window[0]!.timestamp,
            durationMs: duration,
          });

          if (this.fixations.length > 50) {
            this.fixations.shift();
          }
        }
      } else {
        // Saccade occurred: remove oldest point
        this.window.shift();
      }
    }

    return [...this.fixations];
  }

  getFixations(): Fixation[] {
    return this.fixations;
  }

  reset(): void {
    this.window = [];
    this.fixations = [];
    this.fixationCounter = 0;
  }
}
