/**
 * OMNI LOCO AI — APEX 3.0
 * SAFE LOCAL MODEL CACHE & STORAGE MANAGER
 * Manages Cache Storage API, storage quota discovery, and granular cache clearing.
 * Strict data preservation: NEVER wipes user custom models, datasets, or preferences
 * without explicit individual confirmation.
 */

export const MODEL_CACHE_NAME = 'omni-loco-models-v1';
export const TEMP_CACHE_NAME = 'omni-loco-temp-v1';

export type ModelAssetType = 'NEURAL_WEIGHT' | 'WASM_RUNTIME' | 'NATIVE_DSP_CORE';

export interface CachedModelMeta {
  id: string;
  name: string;
  url: string;
  sizeEstimateBytes: number;
  isCached: boolean;
  module: string;
  assetType: ModelAssetType;
}

export const REGISTERED_MODELS: CachedModelMeta[] = [
  {
    id: 'hand-landmarks',
    name: 'MediaPipe Hand Landmarker (21 3D Points)',
    url: '/models/hand_landmarker.task',
    sizeEstimateBytes: 7.8 * 1024 * 1024,
    isCached: false,
    module: 'hand',
    assetType: 'NEURAL_WEIGHT',
  },
  {
    id: 'face-landmarks',
    name: 'MediaPipe Face Mesh (478 Points & 52 Blendshapes)',
    url: '/models/face_landmarker.task',
    sizeEstimateBytes: 3.7 * 1024 * 1024,
    isCached: false,
    module: 'face',
    assetType: 'NEURAL_WEIGHT',
  },
  {
    id: 'pose-landmarks',
    name: 'MediaPipe Pose Landmarker Full (33 Joints)',
    url: '/models/pose_landmarker_full.task',
    sizeEstimateBytes: 9.4 * 1024 * 1024,
    isCached: false,
    module: 'pose',
    assetType: 'NEURAL_WEIGHT',
  },
  {
    id: 'waste-classifier',
    name: 'Waste Classifier & Specimen Scanner (TFLite)',
    url: '/models/classifier.tflite',
    sizeEstimateBytes: 18.5 * 1024 * 1024,
    isCached: false,
    module: 'waste',
    assetType: 'NEURAL_WEIGHT',
  },
  {
    id: 'drive-sim',
    name: 'Steering Gesture Controller (Hand)',
    url: '/models/hand_landmarker.task',
    sizeEstimateBytes: 7.8 * 1024 * 1024,
    isCached: false,
    module: 'drive',
    assetType: 'NEURAL_WEIGHT',
  },
  {
    id: 'gaze-heatmap',
    name: 'Iris Gaze Estimator & Calibrator (Face)',
    url: '/models/face_landmarker.task',
    sizeEstimateBytes: 3.7 * 1024 * 1024,
    isCached: false,
    module: 'gaze',
    assetType: 'NEURAL_WEIGHT',
  },
  {
    id: 'eye-tracking',
    name: 'Bilateral Eye & Iris Tracker (Face)',
    url: '/models/face_landmarker.task',
    sizeEstimateBytes: 3.7 * 1024 * 1024,
    isCached: false,
    module: 'eye',
    assetType: 'NEURAL_WEIGHT',
  },
  {
    id: 'fingers-classifier',
    name: 'Finger State Kinematics Pack (Hand)',
    url: '/models/hand_landmarker.task',
    sizeEstimateBytes: 7.8 * 1024 * 1024,
    isCached: false,
    module: 'fingers',
    assetType: 'NEURAL_WEIGHT',
  },
  {
    id: 'objects-yolo',
    name: 'ONNX Runtime Web WASM SIMD Kernel',
    url: '/wasm/ort-wasm-simd-threaded.wasm',
    sizeEstimateBytes: 1.2 * 1024 * 1024,
    isCached: false,
    module: 'objects',
    assetType: 'WASM_RUNTIME',
  },
  {
    id: 'segment-sam',
    name: 'Feature Mask Decoder Runtime WASM',
    url: '/wasm/ort-wasm-simd-threaded.wasm',
    sizeEstimateBytes: 1.2 * 1024 * 1024,
    isCached: false,
    module: 'segment',
    assetType: 'WASM_RUNTIME',
  },
  {
    id: 'depth-estimator',
    name: 'Scene Geometry Estimator Runtime WASM',
    url: '/wasm/ort-wasm-simd-threaded.wasm',
    sizeEstimateBytes: 1.2 * 1024 * 1024,
    isCached: false,
    module: 'depth',
    assetType: 'WASM_RUNTIME',
  },
  {
    id: 'speech-acoustic',
    name: 'Web Audio Native DSP Engine (Built-in AudioContext)',
    url: 'native://web-audio-dsp',
    sizeEstimateBytes: 0,
    isCached: true,
    module: 'speech',
    assetType: 'NATIVE_DSP_CORE',
  },
];

export const GOOFY_MODEL_CACHE_ENTRY: CachedModelMeta = {
  id: 'goofy-action-recognition',
  name: 'Goofy Model Multimodal Hand & Face Core',
  url: '/models/hand_landmarker.task',
  sizeEstimateBytes: 7.8 * 1024 * 1024,
  isCached: false,
  module: 'goofy',
  assetType: 'NEURAL_WEIGHT',
};

/**
 * Checks if a specific model URL is already stored in Cache Storage
 */
export async function isModelCached(url: string): Promise<boolean> {
  if (url.startsWith('native://')) return true;
  if (typeof caches === 'undefined') return false;
  try {
    const cache = await caches.open(MODEL_CACHE_NAME);
    const match = await cache.match(url);
    return !!match;
  } catch {
    return false;
  }
}

/**
 * Prefetches and stores a model file into Cache Storage with progress notification
 */
export async function prefetchModel(
  url: string,
  onProgress?: (progress0to1: number) => void
): Promise<boolean> {
  if (url.startsWith('native://')) {
    if (onProgress) onProgress(1.0);
    return true;
  }
  if (typeof caches === 'undefined') return false;
  try {
    const cache = await caches.open(MODEL_CACHE_NAME);
    const existing = await cache.match(url);
    if (existing) {
      if (onProgress) onProgress(1.0);
      return true;
    }

    const response = await fetch(url);
    if (!response.ok) {
      return false;
    }

    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body || totalBytes === 0) {
      await cache.put(url, response.clone());
      if (onProgress) onProgress(1.0);
      return true;
    }

    const reader = response.body.getReader();
    let receivedBytes = 0;
    const chunks: BlobPart[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value.buffer as ArrayBuffer);
        receivedBytes += value.length;
        if (onProgress && totalBytes > 0) {
          onProgress(Math.min(1.0, receivedBytes / totalBytes));
        }
      }
    }

    const blob = new Blob(chunks, {
      type: response.headers.get('content-type') || 'application/octet-stream',
    });
    const cachedResponse = new Response(blob, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    await cache.put(url, cachedResponse);
    if (onProgress) onProgress(1.0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Calculates total bytes currently stored in the model cache
 */
export async function calculateCacheSize(): Promise<number> {
  if (typeof caches === 'undefined') return 0;
  try {
    const cache = await caches.open(MODEL_CACHE_NAME);
    const requests = await cache.keys();
    let totalBytes = 0;
    for (const req of requests) {
      const res = await cache.match(req);
      if (res) {
        const blob = await res.blob();
        totalBytes += blob.size;
      }
    }
    return totalBytes;
  } catch {
    return 0;
  }
}

/**
 * Get device storage quota and usage information via NavigatorStorage API
 */
export async function getStorageQuota(): Promise<{
  usageBytes: number;
  quotaBytes: number;
  usagePercentage: number;
  isSupported: boolean;
}> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentage = quota > 0 ? (usage / quota) * 100 : 0;
      return {
        usageBytes: usage,
        quotaBytes: quota,
        usagePercentage: Math.round(percentage * 10) / 10,
        isSupported: true,
      };
    } catch {
      // Fallback
    }
  }
  return {
    usageBytes: 0,
    quotaBytes: 0,
    usagePercentage: 0,
    isSupported: false,
  };
}

/**
 * Granular operation: Clear ONLY cached model assets from Cache Storage.
 * User data, custom memes, and Laboratory models are strictly PRESERVED.
 */
export async function clearModelAssetCache(): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  try {
    await caches.delete(MODEL_CACHE_NAME);
    return true;
  } catch (err) {
    console.warn('[Storage] Error deleting model cache:', err);
    return false;
  }
}

/**
 * Granular operation: Clear temporary rendering/intermediate caches.
 */
export async function clearTemporaryCaches(): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  try {
    await caches.delete(TEMP_CACHE_NAME);
    return true;
  } catch {
    return false;
  }
}

/**
 * Granular operation: Purge user custom gesture models with explicit confirmation.
 */
export async function purgeUserCustomModels(confirmed: boolean): Promise<boolean> {
  if (!confirmed) return false;
  if (typeof indexedDB !== 'undefined') {
    try {
      indexedDB.deleteDatabase('omni-loco-custom-gestures-v7');
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Granular operation: Purge Laboratory training datasets with explicit confirmation.
 */
export async function purgeUserDatasets(confirmed: boolean): Promise<boolean> {
  if (!confirmed) return false;
  if (typeof indexedDB !== 'undefined') {
    try {
      indexedDB.deleteDatabase('omni-loco-laboratory-v2');
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Safe clear: Purges ONLY model binary Cache Storage.
 * Retains custom memes, user gesture libraries, Laboratory datasets, calibration, and preferences.
 */
export async function clearAllLocalCache(): Promise<void> {
  await clearModelAssetCache();
  await clearTemporaryCaches();
}
