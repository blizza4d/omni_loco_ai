import { LaboratoryModel } from './types';
import { generateSyntheticHand } from '../hand/synthetic-hand';
import { HandFeatureExtractor } from './feature-extractor';

// Synthetic reference poses for pre-built custom templates
function createSyntheticPrototypes(): Record<string, number[]> {
  const baseLandmarks = generateSyntheticHand(1000);
  const baseVector = HandFeatureExtractor.extractNormalizedVector(baseLandmarks);

  // Triad lock: thumb, index, middle extended
  const triadVector = [...baseVector];
  for (let i = 13; i <= 20; i++) {
    // curl ring and pinky in
    triadVector[i * 3] = (triadVector[i * 3] || 0) * 0.4;
    triadVector[i * 3 + 1] = (triadVector[i * 3 + 1] || 0) * 0.4;
  }

  // Vulcan salute: gap between middle and ring
  const vulcanVector = [...baseVector];
  vulcanVector[8 * 3] = (vulcanVector[8 * 3] || 0) - 0.15; // index left
  vulcanVector[12 * 3] = (vulcanVector[12 * 3] || 0) - 0.1; // middle left
  vulcanVector[16 * 3] = (vulcanVector[16 * 3] || 0) + 0.15; // ring right
  vulcanVector[20 * 3] = (vulcanVector[20 * 3] || 0) + 0.2; // pinky right

  // Neutral rest
  const neutralVector = baseVector.map((v) => v * 0.6);

  return {
    TRIAD_LOCK: triadVector,
    CYBER_VULCAN: vulcanVector,
    NEUTRAL_REST: neutralVector,
  };
}

export const BUILT_IN_MODELS: LaboratoryModel[] = [
  {
    id: 'built-in-mediapipe-standard',
    name: 'MediaPipe 21-Landmark Kinematic Engine',
    description: 'Factory baseline multi-hand 3D keypoint pipeline with 21 degrees of freedom and Euclidean distance pinch/swipe classifiers.',
    version: '1.4.0',
    figureTag: 'EXP. 01',
    author: 'Omni Loco Core Systems',
    createdAt: '2026-01-15',
    updatedAt: '2026-10-20',
    isBuiltIn: true,
    isPublished: true,
    modelType: 'geometric_rules',
    classes: ['open_palm', 'closed_fist', 'pointing', 'pinch', 'thumbs_up', 'peace_sign'],
    hyperparameters: {
      confidenceThreshold: 0.65,
      smoothingFrames: 2,
      pinchThreshold: 0.32,
      swipeSpeedThreshold: 1.2,
    },
    trainingStats: {
      sampleCount: 12000,
      trainAccuracy: 0.985,
      valAccuracy: 0.978,
      classCounts: {
        open_palm: 2000,
        closed_fist: 2000,
        pointing: 2000,
        pinch: 2000,
        thumbs_up: 2000,
        peace_sign: 2000,
      },
      trainedAt: 'Factory Build',
    },
  },
  {
    id: 'built-in-triad-lock',
    name: 'Triad Lock Spatial Key',
    description: 'Specialized 3-finger trident lock gesture model trained on normalized 63D relative landmark prototypes with quantum gravity burst effects.',
    version: '1.1.0',
    figureTag: 'EXP. 02',
    author: 'Laboratory Neural Bench',
    createdAt: '2026-03-10',
    updatedAt: '2026-10-24',
    isBuiltIn: true,
    isPublished: true,
    modelType: 'centroid_prototype',
    classes: ['TRIAD_LOCK', 'NEUTRAL_REST'],
    modelData: {
      classes: ['TRIAD_LOCK', 'NEUTRAL_REST'],
      prototypes: {
        TRIAD_LOCK: createSyntheticPrototypes().TRIAD_LOCK!,
        NEUTRAL_REST: createSyntheticPrototypes().NEUTRAL_REST!,
      },
      kNearest: 3,
      metric: 'euclidean',
      confidenceThreshold: 0.7,
    },
    fxMapping: {
      TRIAD_LOCK: 'GRAVITY_LOCK',
      NEUTRAL_REST: 'NONE',
    },
    hyperparameters: {
      confidenceThreshold: 0.7,
      kNeighbors: 3,
      metric: 'euclidean',
      smoothingFrames: 2,
    },
    trainingStats: {
      sampleCount: 84,
      trainAccuracy: 0.988,
      valAccuracy: 0.976,
      classCounts: { TRIAD_LOCK: 42, NEUTRAL_REST: 42 },
      trainedAt: 'Lab Pre-train',
    },
  },
  {
    id: 'built-in-cyber-vulcan',
    name: 'Cyber Vulcan Telemetry Key',
    description: 'Split-finger bilateral beacon gesture model designed for high-precision dual-node spatial signaling with resonant energy arcs.',
    version: '1.0.2',
    figureTag: 'EXP. 03',
    author: 'Laboratory Neural Bench',
    createdAt: '2026-05-18',
    updatedAt: '2026-10-25',
    isBuiltIn: true,
    isPublished: false,
    modelType: 'centroid_prototype',
    classes: ['CYBER_VULCAN', 'NEUTRAL_REST'],
    modelData: {
      classes: ['CYBER_VULCAN', 'NEUTRAL_REST'],
      prototypes: {
        CYBER_VULCAN: createSyntheticPrototypes().CYBER_VULCAN!,
        NEUTRAL_REST: createSyntheticPrototypes().NEUTRAL_REST!,
      },
      kNearest: 3,
      metric: 'euclidean',
      confidenceThreshold: 0.68,
    },
    fxMapping: {
      CYBER_VULCAN: 'DUAL_BEACON',
      NEUTRAL_REST: 'NONE',
    },
    hyperparameters: {
      confidenceThreshold: 0.68,
      kNeighbors: 3,
      metric: 'euclidean',
      smoothingFrames: 2,
    },
    trainingStats: {
      sampleCount: 68,
      trainAccuracy: 0.97,
      valAccuracy: 0.955,
      classCounts: { CYBER_VULCAN: 34, NEUTRAL_REST: 34 },
      trainedAt: 'Lab Pre-train',
    },
  },
];

const STORAGE_KEY = 'omni-laboratory-models-v1';
const PUBLISHED_KEY = 'omni-published-gesture-models-v1';

export function getAllModels(): LaboratoryModel[] {
  if (typeof window === 'undefined') return BUILT_IN_MODELS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const userModels: LaboratoryModel[] = raw ? JSON.parse(raw) : [];

    // Check published statuses from PUBLISHED_KEY
    const publishedRaw = localStorage.getItem(PUBLISHED_KEY);
    const publishedIds: string[] = publishedRaw ? JSON.parse(publishedRaw) : ['built-in-mediapipe-standard', 'built-in-triad-lock'];

    const combined = [...BUILT_IN_MODELS, ...userModels].map((m) => ({
      ...m,
      isPublished: publishedIds.includes(m.id),
    }));

    return combined;
  } catch {
    return BUILT_IN_MODELS;
  }
}

export function getModelById(id: string): LaboratoryModel | null {
  const models = getAllModels();
  return models.find((m) => m.id === id) || null;
}

export function saveModel(model: LaboratoryModel): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const userModels: LaboratoryModel[] = raw ? JSON.parse(raw) : [];

    const existingIdx = userModels.findIndex((m) => m.id === model.id);
    if (existingIdx >= 0) {
      userModels[existingIdx] = { ...model, updatedAt: new Date().toISOString() };
    } else {
      userModels.push({
        ...model,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(userModels));
  } catch (err) {
    console.error('Failed to save laboratory model:', err);
  }
}

export function deleteModel(id: string): boolean {
  if (typeof window === 'undefined') return false;
  // Prevent deletion of built-ins
  if (BUILT_IN_MODELS.some((m) => m.id === id)) return false;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const userModels: LaboratoryModel[] = JSON.parse(raw);
    const filtered = userModels.filter((m) => m.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    // Also remove from published
    unpublishModel(id);
    return true;
  } catch {
    return false;
  }
}

export function duplicateModel(id: string): LaboratoryModel | null {
  const target = getModelById(id);
  if (!target) return null;

  const newId = `custom-model-${Date.now().toString(36)}`;
  const duplicate: LaboratoryModel = {
    ...target,
    id: newId,
    name: `${target.name} (Copy)`,
    version: '1.0.0',
    figureTag: `EXP. ${Math.floor(10 + Math.random() * 89)}`,
    author: 'Lab Researcher',
    isBuiltIn: false,
    isPublished: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveModel(duplicate);
  return duplicate;
}

export function publishModel(id: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const publishedRaw = localStorage.getItem(PUBLISHED_KEY);
    const publishedIds: string[] = publishedRaw ? JSON.parse(publishedRaw) : ['built-in-mediapipe-standard', 'built-in-triad-lock'];
    if (!publishedIds.includes(id)) {
      publishedIds.push(id);
      localStorage.setItem(PUBLISHED_KEY, JSON.stringify(publishedIds));
    }
    return true;
  } catch {
    return false;
  }
}

export function unpublishModel(id: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const publishedRaw = localStorage.getItem(PUBLISHED_KEY);
    if (!publishedRaw) return false;
    const publishedIds: string[] = JSON.parse(publishedRaw);
    const updated = publishedIds.filter((item) => item !== id);
    localStorage.setItem(PUBLISHED_KEY, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}

export function getPublishedModels(): LaboratoryModel[] {
  const models = getAllModels();
  return models.filter((m) => m.isPublished);
}

export function exportModelToJSON(id: string): string | null {
  const model = getModelById(id);
  if (!model) return null;
  return JSON.stringify(model, null, 2);
}

export function importModelFromJSON(jsonStr: string): LaboratoryModel {
  const parsed = JSON.parse(jsonStr) as LaboratoryModel;
  if (!parsed.name || !parsed.modelType) {
    throw new Error('Invalid Laboratory Model schema: missing name or modelType');
  }

  const importedModel: LaboratoryModel = {
    ...parsed,
    id: `imported-${Date.now().toString(36)}`,
    isBuiltIn: false,
    isPublished: false,
    updatedAt: new Date().toISOString(),
  };

  saveModel(importedModel);
  return importedModel;
}
