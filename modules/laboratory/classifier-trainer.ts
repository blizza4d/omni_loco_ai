import { Landmark3D } from '../hand/types';
import { HandFeatureExtractor } from './feature-extractor';
import {
  TrainingSample,
  TrainingStats,
  ConfusionMatrixData,
  PrototypeModelData,
} from './types';

export interface PredictionResult {
  label: string;
  confidence: number;
  distances: Record<string, number>;
  isRecognized: boolean;
}

export class ClassifierTrainer {
  private prototypes: Record<string, number[]> = {};
  private trainingSamples: TrainingSample[] = [];
  private kNeighbors: number = 3;
  private metric: 'euclidean' | 'cosine' = 'euclidean';
  private confidenceThreshold: number = 0.65;
  private recentPredictions: string[] = [];
  private smoothingWindow: number = 2;

  constructor(options: {
    kNeighbors?: number;
    metric?: 'euclidean' | 'cosine';
    confidenceThreshold?: number;
    smoothingWindow?: number;
  } = {}) {
    this.kNeighbors = options.kNeighbors ?? 3;
    this.metric = options.metric ?? 'euclidean';
    this.confidenceThreshold = options.confidenceThreshold ?? 0.65;
    this.smoothingWindow = options.smoothingWindow ?? 2;
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
   * Train model with real train/validation split and confusion matrix calculation
   */
  train(
    samples: TrainingSample[],
    valSplit = 0.2
  ): {
    stats: TrainingStats;
    warnings: string[];
  } {
    if (!samples || samples.length === 0) {
      throw new Error('Cannot train classifier on empty dataset');
    }

    const warnings: string[] = [];
    const classCounts: Record<string, number> = {};
    const classGroups: Record<string, TrainingSample[]> = {};

    // Group samples by label
    for (const s of samples) {
      classCounts[s.label] = (classCounts[s.label] || 0) + 1;
      if (!classGroups[s.label]) classGroups[s.label] = [];
      classGroups[s.label]!.push(s);
    }

    const uniqueClasses = Object.keys(classGroups);
    if (uniqueClasses.length < 2) {
      warnings.push('Only 1 class present. At least 2 classes (e.g. gesture + neutral) are recommended.');
    }

    for (const [cls, count] of Object.entries(classCounts)) {
      if (count < 10) {
        warnings.push(`Class "${cls}" has only ${count} samples. 20+ samples recommended for reliable inference.`);
      }
    }

    // Stratified Train/Val split
    const trainSet: TrainingSample[] = [];
    const valSet: TrainingSample[] = [];

    for (const cls of uniqueClasses) {
      const grp = [...classGroups[cls]!];
      // Deterministic shuffle
      grp.sort((a, b) => a.id.localeCompare(b.id));

      const valCount = Math.max(1, Math.floor(grp.length * valSplit));
      const valSubset = grp.slice(0, valCount);
      const trainSubset = grp.slice(valCount);

      // If training subset would be empty on small sets, duplicate into train
      if (trainSubset.length === 0) {
        trainSubset.push(...valSubset);
      }

      valSet.push(...valSubset);
      trainSet.push(...trainSubset);
    }

    this.trainingSamples = trainSet;

    // Compute Centroid Prototypes for each class from train set
    this.prototypes = {};
    for (const cls of uniqueClasses) {
      const clsSamples = trainSet.filter((s) => s.label === cls).map((s) => s.normalizedFeatures);
      this.prototypes[cls] = HandFeatureExtractor.computeCentroid(clsSamples);
    }

    // Check separation between prototypes
    for (let i = 0; i < uniqueClasses.length; i++) {
      for (let j = i + 1; j < uniqueClasses.length; j++) {
        const c1 = uniqueClasses[i]!;
        const c2 = uniqueClasses[j]!;
        const dist = this.distance(this.prototypes[c1]!, this.prototypes[c2]!);
        if (dist < 0.25) {
          warnings.push(`Classes "${c1}" and "${c2}" are very close in feature space (distance: ${dist.toFixed(3)}). Consider refining landmark poses.`);
        }
      }
    }

    // Evaluate on Train Set
    let trainCorrect = 0;
    for (const s of trainSet) {
      const pred = this.predictRaw(s.normalizedFeatures);
      if (pred.label === s.label) {
        trainCorrect++;
      }
    }
    const trainAccuracy = trainSet.length > 0 ? trainCorrect / trainSet.length : 1.0;

    // Evaluate on Validation Set & Build Confusion Matrix
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

    const confusionMatrix: ConfusionMatrixData = {
      labels,
      matrix,
      overallAccuracy: Math.round(valAccuracy * 100) / 100,
      perClassAccuracy,
    };

    const stats: TrainingStats = {
      sampleCount: samples.length,
      trainAccuracy: Math.round(trainAccuracy * 1000) / 1000,
      valAccuracy: Math.round(valAccuracy * 1000) / 1000,
      classCounts,
      confusionMatrix,
      trainedAt: new Date().toLocaleTimeString(),
    };

    return { stats, warnings };
  }

  private predictRaw(features: number[]): { label: string; confidence: number; distances: Record<string, number> } {
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

    // Convert distance to confidence score:
    // A distance of 0 -> 1.0, distance of 1.0 -> ~0.36
    const confidence = Math.exp(-minDistance * 1.5);

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

    // Apply temporal smoothing
    this.recentPredictions.push(raw.label);
    if (this.recentPredictions.length > this.smoothingWindow) {
      this.recentPredictions.shift();
    }

    // Determine consensus label
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
