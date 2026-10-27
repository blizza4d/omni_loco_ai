import { Landmark3D } from '../hand/types';

/**
 * Pure mathematical feature extractor for 21 3D hand landmarks.
 * Invariant to translation (wrist-centered) and scale (normalized by palm length).
 */
export class HandFeatureExtractor {
  /**
   * Generates a 63-dimensional normalized feature vector:
   * Translates wrist (joint 0) to origin (0, 0, 0) and normalizes coordinates
   * by the distance between wrist and middle MCP (joint 9).
   */
  static extractNormalizedVector(landmarks: Landmark3D[]): number[] {
    if (!landmarks || landmarks.length < 21) {
      return new Array(63).fill(0);
    }

    const wrist = landmarks[0]!;
    const middleMCP = landmarks[9]!;

    // Compute palm scale reference (wrist to middle MCP distance)
    const dx = middleMCP.x - wrist.x;
    const dy = middleMCP.y - wrist.y;
    const dz = middleMCP.z - wrist.z;
    const palmScale = Math.max(0.001, Math.sqrt(dx * dx + dy * dy + dz * dz));

    const features: number[] = new Array(63);

    for (let i = 0; i < 21; i++) {
      const pt = landmarks[i]!;
      const idx = i * 3;
      features[idx] = (pt.x - wrist.x) / palmScale;
      features[idx + 1] = (pt.y - wrist.y) / palmScale;
      features[idx + 2] = (pt.z - wrist.z) / palmScale;
    }

    return features;
  }

  /**
   * Euclidean distance between two feature vectors of equal length
   */
  static euclideanDistance(a: number[], b: number[]): number {
    const len = Math.min(a.length, b.length);
    let sum = 0;
    for (let i = 0; i < len; i++) {
      const diff = a[i]! - b[i]!;
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Cosine distance (1 - cosine_similarity) between two feature vectors
   */
  static cosineDistance(a: number[], b: number[]): number {
    const len = Math.min(a.length, b.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < len; i++) {
      const va = a[i]!;
      const vb = b[i]!;
      dot += va * vb;
      normA += va * va;
      normB += vb * vb;
    }

    if (normA <= 0 || normB <= 0) return 1.0;
    const sim = dot / (Math.sqrt(normA) * Math.sqrt(normB));
    return Math.max(0, 1.0 - sim);
  }

  /**
   * Computes the centroid (mean feature vector) across multiple sample vectors
   */
  static computeCentroid(samples: number[][]): number[] {
    if (!samples.length) return new Array(63).fill(0);
    const dim = samples[0]!.length;
    const centroid = new Array(dim).fill(0);

    for (const sample of samples) {
      for (let i = 0; i < dim; i++) {
        centroid[i] += sample[i]!;
      }
    }

    for (let i = 0; i < dim; i++) {
      centroid[i] /= samples.length;
    }

    return centroid;
  }

  /**
   * Simple 2D projection (PCA-like approximation) for plotting feature clusters
   */
  static projectTo2D(features: number[]): { x: number; y: number } {
    if (!features.length) return { x: 0, y: 0 };
    // Projection weights emphasizing fingertips (indices 4, 8, 12, 16, 20)
    let px = 0;
    let py = 0;
    const tipIndices = [4, 8, 12, 16, 20];
    for (let i = 0; i < tipIndices.length; i++) {
      const idx = tipIndices[i]! * 3;
      px += (features[idx] || 0) * (i + 1);
      py += (features[idx + 1] || 0) * (i + 1);
    }
    return { x: px / 15, y: py / 15 };
  }
}
