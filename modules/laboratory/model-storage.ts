import {
  LaboratoryModel,
  LaboratoryDataset,
  LaboratoryExperiment,
  LaboratoryDraft,
  ModelVersionSnapshot,
  ModelLifecycleState,
} from './types';
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
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-10-20T00:00:00.000Z',
    isBuiltIn: true,
    isPublished: true,
    modelType: 'geometric_rules',
    lifecycleState: 'ENABLED',
    classes: ['open_palm', 'closed_fist', 'pointing', 'pinch', 'thumbs_up', 'peace_sign'],
    hyperparameters: {
      confidenceThreshold: 0.65,
      smoothingFrames: 2,
      pinchThreshold: 0.32,
      swipeSpeedThreshold: 1.2,
      detectionConfidence: 0.7,
      trackingConfidence: 0.6,
      maxHands: 2,
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
    createdAt: '2026-03-10T00:00:00.000Z',
    updatedAt: '2026-10-24T00:00:00.000Z',
    isBuiltIn: true,
    isPublished: true,
    modelType: 'centroid_prototype',
    lifecycleState: 'ENABLED',
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
      pinchThreshold: 0.32,
      swipeSpeedThreshold: 1.2,
      detectionConfidence: 0.7,
      trackingConfidence: 0.6,
      maxHands: 1,
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
    createdAt: '2026-05-18T00:00:00.000Z',
    updatedAt: '2026-10-25T00:00:00.000Z',
    isBuiltIn: true,
    isPublished: false,
    modelType: 'centroid_prototype',
    lifecycleState: 'SAVED',
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
      pinchThreshold: 0.32,
      swipeSpeedThreshold: 1.2,
      detectionConfidence: 0.7,
      trackingConfidence: 0.6,
      maxHands: 1,
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
const DATASETS_KEY = 'omni-laboratory-datasets-v1';
const EXPERIMENTS_KEY = 'omni-laboratory-experiments-v1';
const DRAFT_KEY = 'omni-laboratory-draft-v1';

// Strict validation to prevent prototype pollution and malformed payloads
function sanitizeObject<T>(input: any): T {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Invalid input payload: expected an object');
  }
  // Remove dangerous keys
  const forbidden = ['__proto__', 'constructor', 'prototype'];
  for (const key of forbidden) {
    if (key in input) {
      delete input[key];
    }
  }
  return input as T;
}

// -------------------------------------------------------------
// MODELS CRUD & REGISTRY
// -------------------------------------------------------------

export function getAllModels(): LaboratoryModel[] {
  if (typeof window === 'undefined') return BUILT_IN_MODELS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const userModels: LaboratoryModel[] = raw ? JSON.parse(raw) : [];

    const publishedRaw = localStorage.getItem(PUBLISHED_KEY);
    const publishedIds: string[] = publishedRaw
      ? JSON.parse(publishedRaw)
      : ['built-in-mediapipe-standard', 'built-in-triad-lock'];

    const combined = [...BUILT_IN_MODELS, ...userModels].map((m) => {
      const isPublished = publishedIds.includes(m.id);
      let lifecycleState: ModelLifecycleState = m.lifecycleState || 'SAVED';
      if (isPublished) lifecycleState = 'ENABLED';
      return {
        ...m,
        isPublished,
        lifecycleState,
      };
    });

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
  // Guard built-in models against overwriting
  if (BUILT_IN_MODELS.some((b) => b.id === model.id)) {
    throw new Error('Cannot overwrite protected built-in model. Create a custom variant instead.');
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const userModels: LaboratoryModel[] = raw ? JSON.parse(raw) : [];

    const existingIdx = userModels.findIndex((m) => m.id === model.id);
    const updated: LaboratoryModel = {
      ...model,
      updatedAt: new Date().toISOString(),
      lifecycleState: model.isPublished ? 'ENABLED' : model.trainingStats ? 'TRAINED' : 'CONFIGURED',
    };

    if (existingIdx >= 0) {
      userModels[existingIdx] = updated;
    } else {
      userModels.push({
        ...updated,
        createdAt: model.createdAt || new Date().toISOString(),
      });
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(userModels));
  } catch (err) {
    console.error('Failed to save laboratory model:', err);
    throw err;
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
    lifecycleState: 'CONFIGURED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    versionHistory: [],
  };

  saveModel(duplicate);
  return duplicate;
}

export function createCustomVariant(builtInId: string, customName?: string): LaboratoryModel {
  const target = getModelById(builtInId);
  if (!target) {
    throw new Error(`Target model "${builtInId}" not found`);
  }

  const newId = `variant-${Date.now().toString(36)}`;
  const variant: LaboratoryModel = {
    ...target,
    id: newId,
    name: customName || `${target.name} [Custom Variant]`,
    version: '1.0.0',
    figureTag: `VAR. ${Math.floor(10 + Math.random() * 89)}`,
    author: 'Lab Researcher',
    isBuiltIn: false,
    isPublished: false,
    lifecycleState: 'CONFIGURED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    versionHistory: [
      {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        changeNote: `Created from factory baseline ${target.name}`,
        hyperparameters: { ...target.hyperparameters },
        trainingStats: target.trainingStats,
        modelData: target.modelData,
        pipelineConfig: target.pipelineConfig,
        fxMapping: target.fxMapping,
      },
    ],
  };

  saveModel(variant);
  return variant;
}

// -------------------------------------------------------------
// VERSION MANAGEMENT
// -------------------------------------------------------------

export function saveNewVersion(modelId: string, changeNote: string): LaboratoryModel {
  const model = getModelById(modelId);
  if (!model) throw new Error(`Model ${modelId} not found`);
  if (model.isBuiltIn) throw new Error('Cannot version a built-in model directly. Create a variant.');

  // Parse current version and increment minor
  const parts = model.version.split('.').map((p) => parseInt(p, 10) || 0);
  const major = parts[0] || 1;
  const minor = (parts[1] || 0) + 1;
  const newVersionStr = `${major}.${minor}.0`;

  const snapshot: ModelVersionSnapshot = {
    version: model.version,
    timestamp: new Date().toISOString(),
    changeNote: changeNote || `Snapshot of version ${model.version}`,
    hyperparameters: { ...model.hyperparameters },
    trainingStats: model.trainingStats ? { ...model.trainingStats } : undefined,
    modelData: model.modelData ? { ...model.modelData } : undefined,
    pipelineConfig: model.pipelineConfig ? { ...model.pipelineConfig } : undefined,
    fxMapping: model.fxMapping ? { ...model.fxMapping } : undefined,
  };

  const updated: LaboratoryModel = {
    ...model,
    version: newVersionStr,
    versionHistory: [...(model.versionHistory || []), snapshot],
    updatedAt: new Date().toISOString(),
  };

  saveModel(updated);
  return updated;
}

export function restoreVersion(modelId: string, targetVersion: string): LaboratoryModel {
  const model = getModelById(modelId);
  if (!model) throw new Error(`Model ${modelId} not found`);
  if (!model.versionHistory || model.versionHistory.length === 0) {
    throw new Error('No version history found for this model');
  }

  const snapshot = model.versionHistory.find((v) => v.version === targetVersion);
  if (!snapshot) {
    throw new Error(`Version ${targetVersion} not found in model history`);
  }

  // Restore configuration from snapshot while appending current state to history
  const currentSnapshot: ModelVersionSnapshot = {
    version: model.version,
    timestamp: new Date().toISOString(),
    changeNote: `Auto-snapshot prior to rollback to v${targetVersion}`,
    hyperparameters: { ...model.hyperparameters },
    trainingStats: model.trainingStats,
    modelData: model.modelData,
    pipelineConfig: model.pipelineConfig,
    fxMapping: model.fxMapping,
  };

  const restored: LaboratoryModel = {
    ...model,
    version: `${targetVersion}-restored`,
    hyperparameters: { ...snapshot.hyperparameters },
    trainingStats: snapshot.trainingStats,
    modelData: snapshot.modelData,
    pipelineConfig: snapshot.pipelineConfig,
    fxMapping: snapshot.fxMapping,
    versionHistory: [...model.versionHistory, currentSnapshot],
    updatedAt: new Date().toISOString(),
  };

  saveModel(restored);
  return restored;
}

// -------------------------------------------------------------
// PUBLISHING
// -------------------------------------------------------------

export function publishModel(id: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const publishedRaw = localStorage.getItem(PUBLISHED_KEY);
    const publishedIds: string[] = publishedRaw
      ? JSON.parse(publishedRaw)
      : ['built-in-mediapipe-standard', 'built-in-triad-lock'];
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

// -------------------------------------------------------------
// EXPORT / IMPORT
// -------------------------------------------------------------

export function exportModelToJSON(id: string): string | null {
  const model = getModelById(id);
  if (!model) return null;
  return JSON.stringify(model, null, 2);
}

export function importModelFromJSON(jsonStr: string): LaboratoryModel {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('Malformed JSON: parsing failed');
  }

  sanitizeObject(parsed);

  if (!parsed.name || typeof parsed.name !== 'string') {
    throw new Error('Invalid schema: "name" must be a non-empty string');
  }
  if (!parsed.modelType || typeof parsed.modelType !== 'string') {
    throw new Error('Invalid schema: "modelType" is required');
  }
  if (!Array.isArray(parsed.classes)) {
    throw new Error('Invalid schema: "classes" must be an array of strings');
  }

  const importedModel: LaboratoryModel = {
    ...parsed,
    id: `imported-${Date.now().toString(36)}`,
    name: `${parsed.name.slice(0, 80)} [Imported]`,
    isBuiltIn: false,
    isPublished: false,
    lifecycleState: 'SAVED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveModel(importedModel);
  return importedModel;
}

// -------------------------------------------------------------
// DATASETS CRUD & EXPORT / IMPORT
// -------------------------------------------------------------

export function getAllDatasets(): LaboratoryDataset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DATASETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getDatasetById(id: string): LaboratoryDataset | null {
  const datasets = getAllDatasets();
  return datasets.find((d) => d.id === id) || null;
}

export function saveDataset(dataset: LaboratoryDataset): void {
  if (typeof window === 'undefined') return;
  try {
    const datasets = getAllDatasets();
    const idx = datasets.findIndex((d) => d.id === dataset.id);
    const updated: LaboratoryDataset = {
      ...dataset,
      updatedAt: new Date().toISOString(),
    };

    if (idx >= 0) {
      datasets[idx] = updated;
    } else {
      datasets.push({
        ...updated,
        createdAt: dataset.createdAt || new Date().toISOString(),
      });
    }

    localStorage.setItem(DATASETS_KEY, JSON.stringify(datasets));
  } catch (err) {
    console.error('Failed to save dataset:', err);
    throw err;
  }
}

export function deleteDataset(id: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const datasets = getAllDatasets().filter((d) => d.id !== id);
    localStorage.setItem(DATASETS_KEY, JSON.stringify(datasets));
    return true;
  } catch {
    return false;
  }
}

export function exportDatasetToJSON(id: string): string | null {
  const dataset = getDatasetById(id);
  if (!dataset) return null;
  return JSON.stringify(dataset, null, 2);
}

export function importDatasetFromJSON(jsonStr: string): LaboratoryDataset {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('Malformed JSON: parsing failed');
  }

  sanitizeObject(parsed);

  if (!parsed.name || typeof parsed.name !== 'string') {
    throw new Error('Invalid dataset schema: "name" is required');
  }
  if (!Array.isArray(parsed.samples)) {
    throw new Error('Invalid dataset schema: "samples" must be an array');
  }

  // Validate samples
  for (const s of parsed.samples) {
    if (!s.label || !Array.isArray(s.normalizedFeatures) || s.normalizedFeatures.length !== 63) {
      throw new Error(`Malformed sample detected (ID: ${s?.id || 'unknown'}). Normalized 63D feature vector is required.`);
    }
  }

  const imported: LaboratoryDataset = {
    ...parsed,
    id: `ds-${Date.now().toString(36)}`,
    name: `${parsed.name} [Imported]`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveDataset(imported);
  return imported;
}

// -------------------------------------------------------------
// EXPERIMENTS CRUD
// -------------------------------------------------------------

export function getAllExperiments(): LaboratoryExperiment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EXPERIMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveExperiment(experiment: LaboratoryExperiment): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getAllExperiments();
    list.unshift(experiment);
    // Keep last 30 experiments
    const trimmed = list.slice(0, 30);
    localStorage.setItem(EXPERIMENTS_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save experiment:', err);
  }
}

export function deleteExperiment(id: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const list = getAllExperiments().filter((e) => e.id !== id);
    localStorage.setItem(EXPERIMENTS_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// AUTOSAVE / DRAFT MANAGEMENT
// -------------------------------------------------------------

export function saveDraft(draft: LaboratoryDraft): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore quota errors
  }
}

export function getDraft(modelId?: string): LaboratoryDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft: LaboratoryDraft = JSON.parse(raw);
    if (modelId && draft.modelId !== modelId) return null;
    return draft;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
