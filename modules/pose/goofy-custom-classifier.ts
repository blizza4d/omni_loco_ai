import { Landmark3D } from '../hand/types';
import {
  CustomGestureDefinition,
  CustomGestureSample,
  CustomClassificationResult,
  CrossValidationReport,
} from './goofy-types';

/**
 * Weighted feature extraction configuration
 */
const ANGLE_WEIGHT = 2.2;
const FINGERTIP_DIST_WEIGHT = 1.8;
const SPREAD_WEIGHT = 1.6;
const COORD_WEIGHT = 0.6;

/**
 * Mathematical Feature Extractor for 21-point hand landmarks.
 * Produces an 84-dimensional scale, translation, and articulation-invariant feature vector.
 */
export class CustomHandFeatureExtractor {
  /**
   * Angle in radians between vector b->a and vector b->c, normalized to [0, 1]
   */
  private static angle3D(a: Landmark3D, b: Landmark3D, c: Landmark3D): number {
    const v1x = a.x - b.x;
    const v1y = a.y - b.y;
    const v1z = (a.z ?? 0) - (b.z ?? 0);

    const v2x = c.x - b.x;
    const v2y = c.y - b.y;
    const v2z = (c.z ?? 0) - (b.z ?? 0);

    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z);

    if (mag1 < 1e-5 || mag2 < 1e-5) return 0;
    const dot = v1x * v2x + v1y * v2y + v1z * v2z;
    const cosVal = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return Math.acos(cosVal) / Math.PI; // Normalized 0..1
  }

  /**
   * Euclidean distance between two 3D landmarks
   */
  private static dist3D(a: Landmark3D, b: Landmark3D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (a.z ?? 0) - (b.z ?? 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Validates if the landmark array is genuine and meets quality criteria
   */
  public static validate(landmarks: Landmark3D[]): { valid: boolean; reason?: string } {
    if (!Array.isArray(landmarks) || landmarks.length !== 21) {
      return { valid: false, reason: `Expected 21 landmarks, received ${landmarks?.length || 0}` };
    }

    for (let i = 0; i < landmarks.length; i++) {
      const p = landmarks[i];
      if (!p || typeof p.x !== 'number' || typeof p.y !== 'number' || isNaN(p.x) || isNaN(p.y)) {
        return { valid: false, reason: `Landmark #${i} contains NaN or invalid coordinates` };
      }
      if (p.x < -0.6 || p.x > 1.6 || p.y < -0.6 || p.y > 1.6) {
        return { valid: false, reason: `Landmark #${i} out of bounding bounds [${p.x.toFixed(2)}, ${p.y.toFixed(2)}]` };
      }
    }

    // Wrist to middle finger MCP distance check for scale
    const palmScale = this.dist3D(landmarks[0]!, landmarks[9]!);
    if (palmScale < 0.035) {
      return { valid: false, reason: `Hand scale too small (${palmScale.toFixed(3)}). Move hand closer to camera.` };
    }
    if (palmScale > 0.85) {
      return { valid: false, reason: `Hand scale too large (${palmScale.toFixed(3)}). Move hand further from camera.` };
    }

    return { valid: true };
  }

  /**
   * Extracts an 84-dimensional invariant feature vector from 21 landmarks
   */
  public static extract(landmarks: Landmark3D[]): number[] {
    const wrist = landmarks[0]!;
    let palmScale = this.dist3D(wrist, landmarks[9]!);
    if (palmScale < 1e-4) palmScale = 0.2;

    const features: number[] = [];

    // 1. Normalized Translation-Invariant Coordinates (20 points * 3 = 60 features)
    // Points 1 through 20 relative to wrist (point 0), divided by palmScale
    for (let i = 1; i <= 20; i++) {
      const pt = landmarks[i]!;
      features.push((pt.x - wrist.x) / palmScale);
      features.push((pt.y - wrist.y) / palmScale);
      features.push(((pt.z ?? 0) - (wrist.z ?? 0)) / palmScale);
    }

    // 2. Anatomical Joint Flexion Angles (15 features, normalized [0, 1])
    // Thumb: (0,1,2), (1,2,3), (2,3,4)
    features.push(this.angle3D(landmarks[0]!, landmarks[1]!, landmarks[2]!));
    features.push(this.angle3D(landmarks[1]!, landmarks[2]!, landmarks[3]!));
    features.push(this.angle3D(landmarks[2]!, landmarks[3]!, landmarks[4]!));

    // Index: (0,5,6), (5,6,7), (6,7,8)
    features.push(this.angle3D(landmarks[0]!, landmarks[5]!, landmarks[6]!));
    features.push(this.angle3D(landmarks[5]!, landmarks[6]!, landmarks[7]!));
    features.push(this.angle3D(landmarks[6]!, landmarks[7]!, landmarks[8]!));

    // Middle: (0,9,10), (9,10,11), (10,11,12)
    features.push(this.angle3D(landmarks[0]!, landmarks[9]!, landmarks[10]!));
    features.push(this.angle3D(landmarks[9]!, landmarks[10]!, landmarks[11]!));
    features.push(this.angle3D(landmarks[10]!, landmarks[11]!, landmarks[12]!));

    // Ring: (0,13,14), (13,14,15), (14,15,16)
    features.push(this.angle3D(landmarks[0]!, landmarks[13]!, landmarks[14]!));
    features.push(this.angle3D(landmarks[13]!, landmarks[14]!, landmarks[15]!));
    features.push(this.angle3D(landmarks[14]!, landmarks[15]!, landmarks[16]!));

    // Pinky: (0,17,18), (17,18,19), (18,19,20)
    features.push(this.angle3D(landmarks[0]!, landmarks[17]!, landmarks[18]!));
    features.push(this.angle3D(landmarks[17]!, landmarks[18]!, landmarks[19]!));
    features.push(this.angle3D(landmarks[18]!, landmarks[19]!, landmarks[20]!));

    // 3. Fingertip-to-Wrist Distance Ratios (5 features)
    features.push(this.dist3D(landmarks[4]!, wrist) / palmScale);
    features.push(this.dist3D(landmarks[8]!, wrist) / palmScale);
    features.push(this.dist3D(landmarks[12]!, wrist) / palmScale);
    features.push(this.dist3D(landmarks[16]!, wrist) / palmScale);
    features.push(this.dist3D(landmarks[20]!, wrist) / palmScale);

    // 4. Inter-Fingertip Separation Ratios (4 features)
    features.push(this.dist3D(landmarks[4]!, landmarks[8]!) / palmScale);
    features.push(this.dist3D(landmarks[8]!, landmarks[12]!) / palmScale);
    features.push(this.dist3D(landmarks[12]!, landmarks[16]!) / palmScale);
    features.push(this.dist3D(landmarks[16]!, landmarks[20]!) / palmScale);

    return features;
  }

  /**
   * Computes weighted Euclidean distance between two feature vectors
   */
  public static weightedDistance(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 999;

    let sum = 0;
    const len = vecA.length;

    for (let i = 0; i < len; i++) {
      const diff = vecA[i]! - vecB[i]!;
      let weight = COORD_WEIGHT;

      if (i >= 60 && i < 75) {
        weight = ANGLE_WEIGHT; // Joint angles
      } else if (i >= 75 && i < 80) {
        weight = FINGERTIP_DIST_WEIGHT; // Fingertip distances
      } else if (i >= 80) {
        weight = SPREAD_WEIGHT; // Inter-fingertip spread
      }

      sum += weight * diff * diff;
    }

    return Math.sqrt(sum);
  }

  /**
   * Checks if an incoming landmark observation is sufficiently different from existing samples
   * (returns true if unique/deduplicated, false if too similar to a recent sample)
   */
  public static isSampleDeduplicated(
    newLandmarks: Landmark3D[],
    existingSamples: CustomGestureSample[],
    minDelta = 0.05
  ): boolean {
    if (existingSamples.length === 0) return true;
    const newFeatures = CustomHandFeatureExtractor.extract(newLandmarks);
    const recent = existingSamples.slice(-5);
    for (const s of recent) {
      const feat = s.normalizedFeatures || CustomHandFeatureExtractor.extract(s.landmarks);
      const dist = CustomHandFeatureExtractor.weightedDistance(newFeatures, feat);
      if (dist < minDelta) {
        return false;
      }
    }
    return true;
  }
}

/**
 * Lightweight Custom Hand Gesture Classifier using K-Nearest Neighbors (KNN)
 * and Centroid Distance matching over normalized hand features.
 */
export class GoofyCustomGestureClassifier {
  private customGestures: Map<string, CustomGestureDefinition> = new Map();
  private samples: CustomGestureSample[] = [];
  private centroids: Map<string, number[]> = new Map();
  private kNeighbors = 3;
  private defaultThreshold = 0.82;

  constructor(
    gestures: CustomGestureDefinition[] = [],
    samples: CustomGestureSample[] = [],
    k = 3
  ) {
    this.kNeighbors = k;
    this.train(gestures, samples);
  }

  /**
   * Updates classifier with custom gestures and training observations
   */
  public train(
    gestures: CustomGestureDefinition[],
    samples: CustomGestureSample[]
  ): void {
    this.customGestures.clear();
    this.samples = [];
    this.centroids.clear();

    for (const g of gestures) {
      if (g.enabled !== false) {
        this.customGestures.set(g.id, { ...g });
      }
    }

    // Process and store samples with precomputed normalized feature vectors
    for (const s of samples) {
      if (this.customGestures.has(s.gestureId)) {
        const feats = s.normalizedFeatures || CustomHandFeatureExtractor.extract(s.landmarks);
        this.samples.push({
          ...s,
          normalizedFeatures: feats,
        });
      }
    }

    // Compute class centroids
    const classSums: Map<string, { sum: number[]; count: number }> = new Map();
    for (const s of this.samples) {
      if (!s.normalizedFeatures) continue;
      const existing = classSums.get(s.gestureId) || {
        sum: new Array(s.normalizedFeatures.length).fill(0),
        count: 0,
      };
      for (let i = 0; i < s.normalizedFeatures.length; i++) {
        existing.sum[i]! += s.normalizedFeatures[i]!;
      }
      existing.count += 1;
      classSums.set(s.gestureId, existing);
    }

    for (const [gid, data] of Array.from(classSums.entries())) {
      if (data.count > 0) {
        this.centroids.set(
          gid,
          data.sum.map((v: number) => v / data.count)
        );
      }
    }
  }

  /**
   * Classifies an incoming 21-point hand landmark observation.
   * If distance to nearest gesture exceeds threshold, cleanly rejects as UNKNOWN.
   */
  public classify(
    landmarks: Landmark3D[],
    handedness: 'Left' | 'Right',
    sensitivity = 0.82
  ): CustomClassificationResult {
    const validation = CustomHandFeatureExtractor.validate(landmarks);
    if (!validation.valid || this.samples.length === 0 || this.customGestures.size === 0) {
      return {
        gestureId: null,
        label: null,
        confidence: 0,
        distance: 999,
        isMatch: false,
        rawDistance: 999,
        threshold: sensitivity,
      };
    }

    const testFeatures = CustomHandFeatureExtractor.extract(landmarks);

    // Compute distances to all valid training samples matching handedness
    const distances: { sample: CustomGestureSample; dist: number }[] = [];

    for (const s of this.samples) {
      const gDef = this.customGestures.get(s.gestureId);
      if (!gDef || gDef.enabled === false) continue;

      // Handedness filter check
      if (s.handedness !== 'Any' && s.handedness !== handedness) {
        continue;
      }
      if (gDef.handedness !== 'Any' && gDef.handedness !== handedness) {
        continue;
      }

      if (s.normalizedFeatures) {
        const dist = CustomHandFeatureExtractor.weightedDistance(testFeatures, s.normalizedFeatures);
        distances.push({ sample: s, dist });
      }
    }

    if (distances.length === 0) {
      return {
        gestureId: null,
        label: null,
        confidence: 0,
        distance: 999,
        isMatch: false,
        rawDistance: 999,
        threshold: sensitivity,
      };
    }

    // Sort by distance ascending
    distances.sort((a, b) => a.dist - b.dist);

    // K-Nearest Neighbors voting
    const k = Math.min(this.kNeighbors, distances.length);
    const votes: Map<string, { count: number; totalDist: number; minDist: number }> = new Map();

    for (let i = 0; i < k; i++) {
      const item = distances[i]!;
      const gid = item.sample.gestureId;
      const v = votes.get(gid) || { count: 0, totalDist: 0, minDist: item.dist };
      v.count += 1;
      v.totalDist += item.dist;
      v.minDist = Math.min(v.minDist, item.dist);
      votes.set(gid, v);
    }

    // Pick candidate with highest vote (and lowest distance tiebreak)
    let bestGid: string | null = null;
    let bestCount = -1;
    let bestAvgDist = 999;

    for (const [gid, vote] of Array.from(votes.entries())) {
      const avg = vote.totalDist / vote.count;
      if (vote.count > bestCount || (vote.count === bestCount && avg < bestAvgDist)) {
        bestGid = gid;
        bestCount = vote.count;
        bestAvgDist = avg;
      }
    }

    if (!bestGid) {
      return {
        gestureId: null,
        label: null,
        confidence: 0,
        distance: 999,
        isMatch: false,
        rawDistance: 999,
        threshold: sensitivity,
      };
    }

    const gDef = this.customGestures.get(bestGid);
    const effectiveThreshold = gDef?.minConfidence ?? sensitivity;

    // Convert weighted distance into confidence (0..1)
    // Typical matching distance is < 1.0; > 2.2 is completely different
    const maxReferenceDist = 2.4;
    const confidence = Math.max(0, Math.min(1, 1 - bestAvgDist / maxReferenceDist));

    const isMatch = confidence >= effectiveThreshold;

    return {
      gestureId: isMatch ? bestGid : null,
      label: isMatch && gDef ? gDef.name : null,
      confidence: Math.round(confidence * 100) / 100,
      distance: Math.round(bestAvgDist * 1000) / 1000,
      isMatch,
      rawDistance: bestAvgDist,
      threshold: effectiveThreshold,
    };
  }

  /**
   * Performs Leave-One-Out Cross-Validation on current samples to measure real empirical accuracy
   */
  public evaluateCrossValidation(): CrossValidationReport {
    const totalSamples = this.samples.length;
    if (totalSamples < 2) {
      return {
        totalSamples,
        correctPredictions: totalSamples,
        accuracyPercent: 100,
        classesCount: this.customGestures.size,
        confusionMatrix: {},
        evaluatedAt: Date.now(),
      };
    }

    let correct = 0;
    const confusion: Record<string, Record<string, number>> = {};

    for (const g of Array.from(this.customGestures.values())) {
      confusion[g.id] = {};
      for (const g2 of Array.from(this.customGestures.values())) {
        confusion[g.id]![g2.id] = 0;
      }
      confusion[g.id]!['UNKNOWN'] = 0;
    }

    // Leave-one-out validation
    for (let i = 0; i < totalSamples; i++) {
      const heldOut = this.samples[i]!;
      const trainSet = this.samples.filter((_, idx) => idx !== i);

      // Temporary sub-classifier without held-out sample
      const subClassifier = new GoofyCustomGestureClassifier(
        Array.from(this.customGestures.values()),
        trainSet,
        Math.min(this.kNeighbors, trainSet.length)
      );

      const res = subClassifier.classify(
        heldOut.landmarks,
        heldOut.handedness === 'Any' ? 'Right' : heldOut.handedness,
        0.5 // Lenient evaluation threshold for raw classifier discrimination
      );

      const actual = heldOut.gestureId;
      const predicted = res.isMatch && res.gestureId ? res.gestureId : 'UNKNOWN';

      if (!confusion[actual]) confusion[actual] = {};
      confusion[actual][predicted] = (confusion[actual][predicted] || 0) + 1;

      if (predicted === actual) {
        correct++;
      }
    }

    const accuracyPercent = Math.round((correct / totalSamples) * 1000) / 10;

    return {
      totalSamples,
      correctPredictions: correct,
      accuracyPercent,
      classesCount: this.customGestures.size,
      confusionMatrix: confusion,
      evaluatedAt: Date.now(),
    };
  }

  /**
   * Checks if an incoming landmark observation is sufficiently different from already captured
   * samples to avoid capturing 100 nearly identical consecutive frames.
   */
  public isSampleDeduplicated(
    newLandmarks: Landmark3D[],
    existingSamples: CustomGestureSample[],
    minDelta = 0.05
  ): boolean {
    if (existingSamples.length === 0) return true;

    const newFeatures = CustomHandFeatureExtractor.extract(newLandmarks);

    // Compare with the last 5 samples to check recent diversity
    const recent = existingSamples.slice(-5);
    for (const s of recent) {
      const feat = s.normalizedFeatures || CustomHandFeatureExtractor.extract(s.landmarks);
      const dist = CustomHandFeatureExtractor.weightedDistance(newFeatures, feat);
      if (dist < minDelta) {
        return false; // Too similar to recent sample
      }
    }

    return true;
  }

  public getGesturesCount(): number {
    return this.customGestures.size;
  }

  public getSamplesCount(): number {
    return this.samples.length;
  }
}
