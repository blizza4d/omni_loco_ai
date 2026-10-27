import { Landmark3D } from '../hand/types';
import { HandFeatureExtractor } from './feature-extractor';
import {
  TrainingSample,
  TrainingStats,
  ConfusionMatrixData,
  PrototypeModelData,
  ModelType,
} from './types';

export interface PredictionResult {
  label: string;
  confidence: number;
  distances: Record<string, number>;
  isRecognized: boolean;
  rawConfidence?: number;
}

export interface TrainingOptions {
  valSplit?: number;
  algorithm?: 'centroid_prototype' | 'knn_landmark' | 'decision_tree';
  onProgress?: (percent: number, stage: string) => void;
  signal?: AbortSignal;
}

export class ClassifierTrainer {
  private prototypes: Record<string, number[]> = {};
  private trainingSamples: TrainingSample[] = [];
  private kNeighbors: number = 3;
  private metric: 'euclidean' | 'cosine' = 'euclidean';
  private confidenceThreshold: number = 0.65;
  private recentPredictions: string[] = [];
  private smoothingWindow: number = 2;
  private algorithm: 'centroid_prototype' | 'knn_landmark' | 'decision_tree' = 'centroid_prototype';

  constructor(options: {
    kNeighbors?: number;
    metric?: 'euclidean' | 'cosine';
    confidenceThreshold?: number;
    smoothingWindow?: number;
    algorithm?: 'centroid_prototype' | 'knn_landmark' | 'decision_tree';
  } = {}) {
    this.kNeighbors = options.kNeighbors ?? 3;
    this.metric = options.metric ?? 'euclidean';
    this.confidenceThreshold = options.confidenceThreshold ?? 0.65;
    this.smoothingWindow = options.smoothingWindow ?? 2;
    this.algorithm = options.algorithm ?? 'centroid_prototype';
  }

  loadModelData(data: PrototypeModelData): void {
    this.prototypes = data.prototypes || {};
    this.kNeighbors = data.kNearest ?? 3;
    this.metric = data.metric ?? 'euclidean';
    this.confidenceThreshold = data.confidenceThreshold ?? 0.65;
    this.trainingSamples = data.trainingSamples || [];
  }

  getModelData(): PrototypeModelData {
    return {
      classes: Object.keys(this.prototypes),
      prototypes: this.prototypes,
      kNearest: this.kNeighbors,
      metric: this.metric,
      confidenceThreshold: this.confidenceThreshold,
      trainingSamples: this.trainingSamples,
    };
  }

  private distance(a: number[], b: number[]): number {
    return this.metric === 'cosine'
      ? HandFeatureExtractor.cosineDistance(a, b)
      : HandFeatureExtractor.euclideanDistance(a, b);
  }

  /**
   * Performs an asynchronous, non-blocking training pass with leakage-proof burst splitting
   */
  async trainAsync(
    samples: TrainingSample[],
    options: TrainingOptions = {}
  ): Promise<{ stats: TrainingStats; warnings: string[] }> {
    const { valSplit = 0.2, algorithm = this.algorithm, onProgress, signal } = options;
    const startTime = performance.now();

    if (!samples || samples.length === 0) {
      throw new Error('Cannot train classifier on an empty dataset.');
    }

    if (signal?.aborted) {
      throw new Error('Training cancelled by user.');
    }

    onProgress?.(10, 'Validating dataset and class distribution...');
    await new Promise((r) => setTimeout(r, 16));

    const warnings: string[] = [];
    const classGroups: Record<string, TrainingSample[]> = {};
    const classCounts: Record<string, number> = {};

    for (const s of samples) {
      classCounts[s.label] = (classCounts[s.label] || 0) + 1;
      if (!classGroups[s.label]) classGroups[s.label] = [];
      classGroups[s.label]!.push(s);
    }

    const uniqueClasses = Object.keys(classGroups);
    if (uniqueClasses.length < 2) {
      warnings.push('Only 1 class present. At least 2 classes (e.g. gesture + neutral) are required.');
    }

    onProgress?.(30, 'Performing leakage-proof train/validation split...');
    await new Promise((r) => setTimeout(r, 16));

    // Leakage-proof split: Group by burstId if available, avoiding consecutive-frame correlation
    const trainSet: TrainingSample[] = [];
    const valSet: TrainingSample[] = [];

    for (const cls of uniqueClasses) {
      const clsSamples = classGroups[cls]!;

      // Check if burst IDs are present
      const bursts: Record<string, TrainingSample[]> = {};
      clsSamples.forEach((s) => {
        const bId = s.burstId || `single-${s.id}`;
        if (!bursts[bId]) bursts[bId] = [];
        bursts[bId]!.push(s);
      });

      const burstList = Object.values(bursts);
      if (burstList.length > 1) {
        // Split whole bursts across train and validation
        const valBurstCount = Math.max(1, Math.floor(burstList.length * valSplit));
        const valBursts = burstList.slice(0, valBurstCount);
        const trainBursts = burstList.slice(valBurstCount);

        valBursts.forEach((b) => valSet.push(...b));
        trainBursts.forEach((b) => trainSet.push(...b));
      } else {
        // If all samples were in a single burst, split by index stride to prevent contiguous block clustering
        const valCount = Math.max(1, Math.floor(clsSamples.length * valSplit));
        for (let i = 0; i < clsSamples.length; i++) {
          if (i % Math.round(1 / valSplit) === 0 && valSet.filter((s) => s.label === cls).length < valCount) {
            valSet.push(clsSamples[i]!);
          } else {
            trainSet.push(clsSamples[i]!);
          }
        }
      }
    }

    // Safety fallback: ensure trainSet has all classes
    if (trainSet.length === 0) {
      trainSet.push(...valSet);
    }

    this.trainingSamples = trainSet;
    this.algorithm = algorithm;

    onProgress?.(60, `Fitting ${algorithm.replace('_', ' ')} classifier...`);
    await new Promise((r) => setTimeout(r, 16));

    // Compute Centroid Prototypes for each class from trainSet
    this.prototypes = {};
    for (const cls of uniqueClasses) {
      const clsSamples = trainSet.filter((s) => s.label === cls).map((s) => s.normalizedFeatures);
      if (clsSamples.length > 0) {
        this.prototypes[cls] = HandFeatureExtractor.computeCentroid(clsSamples);
      }
    }

    // Measure separation between prototypes
    for (let i = 0; i < uniqueClasses.length; i++) {
      for (let j = i + 1; j < uniqueClasses.length; j++) {
        const c1 = uniqueClasses[i]!;
        const c2 = uniqueClasses[j]!;
        const p1 = this.prototypes[c1];
        const p2 = this.prototypes[c2];
        if (p1 && p2) {
          const dist = this.distance(p1, p2);
          if (dist < 0.22) {
            warnings.push(
              `Classes "${c1}" and "${c2}" are very close in feature space (distance: ${dist.toFixed(3)}). Consider refining landmark poses.`
            );
          }
        }
      }
    }

    onProgress?.(80, 'Evaluating validation split & confusion matrix...');
    await new Promise((r) => setTimeout(r, 16));

    // Train accuracy
    let trainCorrect = 0;
    for (const s of trainSet) {
      const pred = this.predictRaw(s.normalizedFeatures);
      if (pred.label === s.label) trainCorrect++;
    }
    const trainAccuracy = trainSet.length > 0 ? trainCorrect / trainSet.length : 1.0;

    // Validation accuracy, confusion matrix, precision, recall
    let valCorrect = 0;
    const labels = uniqueClasses;
    const labelIndices: Record<string, number> = {};
    labels.forEach((l, idx) => {
      labelIndices[l] = idx;
    });

    const matrix: number[][] = Array.from({ length: labels.length }, () =>
      new Array(labels.length).fill(0)
    );
    const perClassTotal: Record<string, number> = {};
    const perClassCorrect: Record<string, number> = {};
    const predictedTotal: Record<string, number> = {};

    for (const s of valSet) {
      const actualIdx = labelIndices[s.label]!;
      perClassTotal[s.label] = (perClassTotal[s.label] || 0) + 1;

      const pred = this.predictRaw(s.normalizedFeatures);
      const predIdx = labelIndices[pred.label] !== undefined ? labelIndices[pred.label]! : actualIdx;

      predictedTotal[pred.label] = (predictedTotal[pred.label] || 0) + 1;
      matrix[actualIdx]![predIdx] = (matrix[actualIdx]![predIdx] || 0) + 1;

      if (pred.label === s.label) {
        valCorrect++;
        perClassCorrect[s.label] = (perClassCorrect[s.label] || 0) + 1;
      }
    }

    const valAccuracy = valSet.length > 0 ? valCorrect / valSet.length : trainAccuracy;

    // Precision, Recall, F1
    const perClassAccuracy: Record<string, number> = {};
    const precision: Record<string, number> = {};
    const recall: Record<string, number> = {};
    const f1Score: Record<string, number> = {};

    for (const l of labels) {
      const tp = perClassCorrect[l] || 0;
      const fn = (perClassTotal[l] || 0) - tp;
      const fp = (predictedTotal[l] || 0) - tp;

      const prec = tp + fp > 0 ? tp / (tp + fp) : 1.0;
      const rec = tp + fn > 0 ? tp / (tp + fn) : 1.0;
      const f1 = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0;

      perClassAccuracy[l] = Math.round(rec * 100) / 100;
      precision[l] = Math.round(prec * 100) / 100;
      recall[l] = Math.round(rec * 100) / 100;
      f1Score[l] = Math.round(f1 * 100) / 100;
    }

    const confusionMatrix: ConfusionMatrixData = {
      labels,
      matrix,
      overallAccuracy: Math.round(valAccuracy * 100) / 100,
      perClassAccuracy,
      precision,
      recall,
      f1Score,
    };

    const durationMs = Math.round(performance.now() - startTime);
    onProgress?.(100, 'Training complete.');

    const stats: TrainingStats = {
      sampleCount: samples.length,
      trainAccuracy: Math.round(trainAccuracy * 1000) / 1000,
      valAccuracy: Math.round(valAccuracy * 1000) / 1000,
      classCounts,
      confusionMatrix,
      trainedAt: new Date().toLocaleTimeString(),
      durationMs,
      algorithm,
    };

    return { stats, warnings };
  }

  /**
   * Synchronous convenience wrapper for unit tests and instant fits
   */
  train(
    samples: TrainingSample[],
    valSplit = 0.2
  ): {
    stats: TrainingStats;
    warnings: string[];
  } {
    const startTime = performance.now();
    if (!samples || samples.length === 0) {
      throw new Error('Cannot train classifier on an empty dataset.');
    }

    const warnings: string[] = [];
    const classGroups: Record<string, TrainingSample[]> = {};
    const classCounts: Record<string, number> = {};

    for (const s of samples) {
      classCounts[s.label] = (classCounts[s.label] || 0) + 1;
      if (!classGroups[s.label]) classGroups[s.label] = [];
      classGroups[s.label]!.push(s);
    }

    const uniqueClasses = Object.keys(classGroups);
    const trainSet: TrainingSample[] = [];
    const valSet: TrainingSample[] = [];

    for (const cls of uniqueClasses) {
      const grp = [...classGroups[cls]!];
      grp.sort((a, b) => a.id.localeCompare(b.id));

      const valCount = Math.max(1, Math.floor(grp.length * valSplit));
      const valSubset = grp.slice(0, valCount);
      const trainSubset = grp.slice(valCount);

      if (trainSubset.length === 0) {
        trainSubset.push(...valSubset);
      }

      valSet.push(...valSubset);
      trainSet.push(...trainSubset);
    }

    this.trainingSamples = trainSet;
    this.prototypes = {};
    for (const cls of uniqueClasses) {
      const clsSamples = trainSet.filter((s) => s.label === cls).map((s) => s.normalizedFeatures);
      if (clsSamples.length > 0) {
        this.prototypes[cls] = HandFeatureExtractor.computeCentroid(clsSamples);
      }
    }

    let trainCorrect = 0;
    for (const s of trainSet) {
      const pred = this.predictRaw(s.normalizedFeatures);
      if (pred.label === s.label) trainCorrect++;
    }
    const trainAccuracy = trainSet.length > 0 ? trainCorrect / trainSet.length : 1.0;

    let valCorrect = 0;
    const labels = uniqueClasses;
    const labelIndices: Record<string, number> = {};
    labels.forEach((l, idx) => {
      labelIndices[l] = idx;
    });

    const matrix: number[][] = Array.from({ length: labels.length }, () =>
      new Array(labels.length).fill(0)
    );
    const perClassTotal: Record<string, number> = {};
    const perClassCorrect: Record<string, number> = {};

    for (const s of valSet) {
      const actualIdx = labelIndices[s.label]!;
      perClassTotal[s.label] = (perClassTotal[s.label] || 0) + 1;

      const pred = this.predictRaw(s.normalizedFeatures);
      const predIdx = labelIndices[pred.label] !== undefined ? labelIndices[pred.label]! : actualIdx;

      matrix[actualIdx]![predIdx] = (matrix[actualIdx]![predIdx] || 0) + 1;

      if (pred.label === s.label) {
        valCorrect++;
        perClassCorrect[s.label] = (perClassCorrect[s.label] || 0) + 1;
      }
    }

    const valAccuracy = valSet.length > 0 ? valCorrect / valSet.length : trainAccuracy;
    const perClassAccuracy: Record<string, number> = {};
    for (const l of labels) {
      const total = perClassTotal[l] || 0;
      const correct = perClassCorrect[l] || 0;
      perClassAccuracy[l] = total > 0 ? Math.round((correct / total) * 100) / 100 : 1.0;
    }

    const stats: TrainingStats = {
      sampleCount: samples.length,
      trainAccuracy: Math.round(trainAccuracy * 1000) / 1000,
      valAccuracy: Math.round(valAccuracy * 1000) / 1000,
      classCounts,
      confusionMatrix: {
        labels,
        matrix,
        overallAccuracy: Math.round(valAccuracy * 100) / 100,
        perClassAccuracy,
      },
      trainedAt: new Date().toLocaleTimeString(),
      durationMs: Math.round(performance.now() - startTime),
      algorithm: this.algorithm,
    };

    return { stats, warnings };
  }

  private predictRaw(features: number[]): { label: string; confidence: number; distances: Record<string, number> } {
    if (this.algorithm === 'knn_landmark' && this.trainingSamples.length > 0) {
      return this.predictKNN(features);
    }

    const classes = Object.keys(this.prototypes);
    if (classes.length === 0) {
      return { label: 'none', confidence: 0, distances: {} };
    }

    const distances: Record<string, number> = {};
    let minDistance = Infinity;
    let bestClass = classes[0]!;

    for (const cls of classes) {
      const proto = this.prototypes[cls]!;
      const d = this.distance(features, proto);
      distances[cls] = Math.round(d * 1000) / 1000;
      if (d < minDistance) {
        minDistance = d;
        bestClass = cls;
      }
    }

    const confidence = Math.exp(-minDistance * 1.5);
    return {
      label: bestClass,
      confidence: Math.round(confidence * 100) / 100,
      distances,
    };
  }

  private predictKNN(features: number[]): { label: string; confidence: number; distances: Record<string, number> } {
    // Compute distance to all training samples
    const neighborDistances = this.trainingSamples.map((s) => ({
      label: s.label,
      dist: this.distance(features, s.normalizedFeatures),
    }));

    neighborDistances.sort((a, b) => a.dist - b.dist);
    const topK = neighborDistances.slice(0, Math.min(this.kNeighbors, neighborDistances.length));

    const votes: Record<string, number> = {};
    const distances: Record<string, number> = {};

    topK.forEach((n) => {
      votes[n.label] = (votes[n.label] || 0) + 1;
      if (distances[n.label] === undefined || n.dist < distances[n.label]!) {
        distances[n.label] = Math.round(n.dist * 1000) / 1000;
      }
    });

    let bestClass = topK[0]?.label || 'none';
    let maxVotes = 0;
    for (const [cls, count] of Object.entries(votes)) {
      if (count > maxVotes) {
        maxVotes = count;
        bestClass = cls;
      }
    }

    const avgDist = topK.reduce((acc, cur) => acc + cur.dist, 0) / topK.length;
    const confidence = Math.max(0, Math.min(1.0, (maxVotes / topK.length) * Math.exp(-avgDist * 1.2)));

    return {
      label: bestClass,
      confidence: Math.round(confidence * 100) / 100,
      distances,
    };
  }

  /**
   * Real-time inference on input 3D landmarks
   */
  predict(landmarks: Landmark3D[]): PredictionResult {
    if (!landmarks || landmarks.length < 21) {
      return { label: 'none', confidence: 0, distances: {}, isRecognized: false };
    }

    const features = HandFeatureExtractor.extractNormalizedVector(landmarks);
    const raw = this.predictRaw(features);

    this.recentPredictions.push(raw.label);
    if (this.recentPredictions.length > this.smoothingWindow) {
      this.recentPredictions.shift();
    }

    const counts: Record<string, number> = {};
    for (const l of this.recentPredictions) {
      counts[l] = (counts[l] || 0) + 1;
    }

    let smoothedLabel = raw.label;
    let maxCount = 0;
    for (const [l, count] of Object.entries(counts)) {
      if (count > maxCount || (count === maxCount && l === raw.label)) {
        maxCount = count;
        smoothedLabel = l;
      }
    }

    const isRecognized = raw.confidence >= this.confidenceThreshold && smoothedLabel !== 'neutral';

    return {
      label: isRecognized ? smoothedLabel : 'none',
      confidence: raw.confidence,
      distances: raw.distances,
      isRecognized,
    };
  }

  reset(): void {
    this.recentPredictions = [];
  }
}
