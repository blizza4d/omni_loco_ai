import { AcousticFeatures } from './types';

export class AcousticDSP {
  /**
   * Fast Normalized Autocorrelation algorithm for pitch extraction in human vocal range (75Hz - 500Hz)
   */
  static extractPitch(buffer: Float32Array, sampleRate = 44100): { pitchHz: number; isVoiced: boolean } {
    const size = buffer.length;
    let rms = 0;
    for (let i = 0; i < size; i++) {
      rms += buffer[i]! * buffer[i]!;
    }
    rms = Math.sqrt(rms / size);

    // If signal energy is too low, treat as silence / unvoiced
    if (rms < 0.015) {
      return { pitchHz: 0, isVoiced: false };
    }

    const minLag = Math.floor(sampleRate / 500); // 500 Hz
    const maxLag = Math.floor(sampleRate / 75);  // 75 Hz

    let bestCorrelation = 0;
    let bestLag = -1;

    for (let lag = minLag; lag <= maxLag; lag++) {
      let correlation = 0;
      for (let i = 0; i < size - lag; i++) {
        correlation += buffer[i]! * buffer[i + lag]!;
      }
      correlation = correlation / (size - lag);

      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestLag = lag;
      }
    }

    // Normalized correlation threshold for voice confidence
    const normalizedCorr = bestCorrelation / (rms * rms);
    if (normalizedCorr > 0.45 && bestLag > 0) {
      const pitch = Math.round(sampleRate / bestLag);
      return { pitchHz: pitch, isVoiced: true };
    }

    return { pitchHz: 0, isVoiced: false };
  }

  /**
   * Computes Root Mean Square (RMS) loudness and converts to dBFS
   */
  static computeLoudness(buffer: Float32Array): { rms: number; dbFs: number } {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i]! * buffer[i]!;
    }
    const rms = Math.sqrt(sum / (buffer.length || 1));
    const dbFs = rms > 0.00001 ? Math.max(-60, Math.min(0, 20 * Math.log10(rms))) : -60;
    return { rms: Math.min(1.0, rms * 3.0), dbFs: Math.round(dbFs * 10) / 10 };
  }

  /**
   * Computes Zero Crossing Rate (ZCR)
   */
  static computeZCR(buffer: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < buffer.length; i++) {
      if ((buffer[i]! >= 0 && buffer[i - 1]! < 0) || (buffer[i]! < 0 && buffer[i - 1]! >= 0)) {
        crossings++;
      }
    }
    return Math.round((crossings / buffer.length) * 1000) / 1000;
  }

  /**
   * Computes Spectral Centroid (Center of gravity of spectrum)
   */
  static computeSpectralCentroid(freqData: Uint8Array, sampleRate = 44100): number {
    let numerator = 0;
    let denominator = 0;
    const nyquist = sampleRate / 2;
    const binSize = nyquist / freqData.length;

    for (let i = 0; i < freqData.length; i++) {
      const magnitude = freqData[i]!;
      const freq = i * binSize;
      numerator += freq * magnitude;
      denominator += magnitude;
    }

    if (denominator === 0) return 0;
    return Math.round(numerator / denominator);
  }

  static analyze(
    timeBuffer: Float32Array,
    freqBuffer: Uint8Array,
    sampleRate = 44100
  ): AcousticFeatures {
    const { pitchHz, isVoiced } = this.extractPitch(timeBuffer, sampleRate);
    const { rms, dbFs } = this.computeLoudness(timeBuffer);
    const zcr = this.computeZCR(timeBuffer);
    const centroid = this.computeSpectralCentroid(freqBuffer, sampleRate);

    return {
      rms,
      dbFs,
      pitchHz,
      spectralCentroid: centroid,
      zeroCrossingRate: zcr,
      isVoiced,
    };
  }
}
