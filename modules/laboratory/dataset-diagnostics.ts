import { TrainingSample, DatasetQualityReport } from './types';
import { HandFeatureExtractor } from './feature-extractor';

/**
 * Analyzes a gesture dataset for training readiness, class balance, near-duplicates, and feature diversity.
 */
export function analyzeDataset(samples: TrainingSample[], classes: string[]): DatasetQualityReport {
  const classCounts: Record<string, number> = {};
  classes.forEach((c) => {
    classCounts[c] = 0;
  });

  for (const s of samples) {
    classCounts[s.label] = (classCounts[s.label] || 0) + 1;
  }

  const counts = Object.values(classCounts);
  const minCount = counts.length > 0 ? Math.min(...counts) : 0;
  const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
  const imbalanceRatio = minCount > 0 ? Math.round((maxCount / minCount) * 10) / 10 : maxCount > 0 ? Infinity : 1;

  // Near duplicate detection using Euclidean distance threshold on 63D features
  let nearDuplicateCount = 0;
  const featureVectors = samples.map((s) => s.normalizedFeatures);

  for (let i = 0; i < featureVectors.length; i++) {
    for (let j = i + 1; j < Math.min(i + 15, featureVectors.length); j++) {
      const dist = HandFeatureExtractor.euclideanDistance(featureVectors[i]!, featureVectors[j]!);
      if (dist < 0.04) {
        nearDuplicateCount++;
      }
    }
  }

  // Mean feature variance across all features
  let meanFeatureVariance = 0;
  if (samples.length > 1) {
    const dim = 63;
    let totalVar = 0;
    for (let d = 0; d < dim; d++) {
      let sum = 0;
      for (let i = 0; i < samples.length; i++) {
        sum += samples[i]!.normalizedFeatures[d] || 0;
      }
      const mean = sum / samples.length;
      let varSum = 0;
      for (let i = 0; i < samples.length; i++) {
        const diff = (samples[i]!.normalizedFeatures[d] || 0) - mean;
        varSum += diff * diff;
      }
      totalVar += varSum / samples.length;
    }
    meanFeatureVariance = Math.round((totalVar / dim) * 1000) / 1000;
  }

  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (samples.length === 0) {
    warnings.push('Dataset is currently empty. Record or import gesture samples.');
  } else {
    for (const [cls, count] of Object.entries(classCounts)) {
      if (count === 0) {
        warnings.push(`Class "${cls}" has 0 samples.`);
        recommendations.push(`Record at least 15–30 samples for class "${cls}".`);
      } else if (count < 10) {
        warnings.push(`Class "${cls}" has only ${count} samples (marginal sample count).`);
        recommendations.push(`Capture additional variations in hand orientation for "${cls}".`);
      }
    }

    if (imbalanceRatio > 3.0 && minCount > 0) {
      warnings.push(`Severe class imbalance detected: ${imbalanceRatio}:1 ratio between largest and smallest class.`);
      recommendations.push('Collect more examples for the underrepresented class to prevent majority-class bias.');
    }

    if (nearDuplicateCount > samples.length * 0.4) {
      warnings.push(`High proportion of near-identical frames (${nearDuplicateCount} duplicates).`);
      recommendations.push('Move hand slightly during recording bursts to capture natural spatial variation.');
    }

    if (meanFeatureVariance < 0.005 && samples.length > 10) {
      warnings.push('Low feature variance detected across samples.');
      recommendations.push('Introduce slight changes in hand tilt and distance to improve model generalization.');
    }
  }

  const isValidForTraining =
    samples.length >= 6 &&
    classes.length >= 2 &&
    classes.every((c) => (classCounts[c] || 0) >= 2);

  return {
    totalSamples: samples.length,
    classCounts,
    imbalanceRatio: isFinite(imbalanceRatio) ? imbalanceRatio : 999,
    nearDuplicateCount,
    meanFeatureVariance,
    isValidForTraining,
    warnings,
    recommendations,
  };
}
