/**
 * Local Model Cache Manager
 * Uses browser Cache Storage API (versioned keys) with progress tracking
 * to ensure offline resilience and fast module cold starts.
 */

export const MODEL_CACHE_NAME = 'omni-loco-models-v1';

export interface CachedModelMeta {
  id: string;
  name: string;
  url: string;
  sizeEstimateBytes: number;
  isCached: boolean;
  module: string;
}

export const REGISTERED_MODELS: CachedModelMeta[] = [
  {
    id: 'hand-landmarks',
    name: 'Hand Landmarker & Gesture Pack',
    url: '/models/hand_landmarker.task',
    sizeEstimateBytes: 8.4 * 1024 * 1024,
    isCached: false,
    module: 'hand',
  },
  {
    id: 'face-landmarks',
    name: 'Face Mesh & 52 Blendshapes',
    url: '/models/face_landmarker.task',
    sizeEstimateBytes: 11.2 * 1024 * 1024,
    isCached: false,
    module: 'face',
  },
  {
    id: 'pose-landmarks',
    name: 'Pose Landmarker (Full)',
    url: '/models/pose_landmarker_full.task',
    sizeEstimateBytes: 9.8 * 1024 * 1024,
    isCached: false,
    module: 'pose',
  },
  {
    id: 'waste-classifier',
    name: 'Waste Classifier & Specimen Scanner',
    url: '/models/classifier.tflite',
    sizeEstimateBytes: 18.5 * 1024 * 1024,
    isCached: false,
    module: 'waste',
  },
  {
    id: 'speech-acoustic',
    name: 'Acoustic Feature DSP Core',
    url: '/wasm/acoustic_dsp.wasm',
    sizeEstimateBytes: 1.8 * 1024 * 1024,
    isCached: false,
    module: 'speech',
  },
  {
    id: 'eye-pupillometry',
    name: 'Ocular Iris & Pupillometry Mesh',
    url: '/models/face_landmarker.task',
    sizeEstimateBytes: 3.7 * 1024 * 1024,
    isCached: false,
    module: 'eye',
  },
  {
    id: 'objects-yolo',
    name: 'YOLO Multi-Object Detector & Tracker',
    url: '/wasm/ort-wasm-simd-threaded.wasm',
    sizeEstimateBytes: 14.2 * 1024 * 1024,
    isCached: false,
    module: 'objects',
  },
  {
    id: 'segment-sam',
    name: 'Promptable Feature Mask Decoder',
    url: '/wasm/ort-wasm-simd-threaded.wasm',
    sizeEstimateBytes: 12.5 * 1024 * 1024,
    isCached: false,
    module: 'segment',
  },
  {
    id: 'depth-estimator',
    name: 'Monocular Depth & Scene Geometry',
    url: '/wasm/ort-wasm-simd-threaded.wasm',
    sizeEstimateBytes: 9.6 * 1024 * 1024,
    isCached: false,
    module: 'depth',
  },
  {
    id: 'fingers-classifier',
    name: 'Finger State Classifier & Gesture Pack',
    url: '/models/hand_landmarker.task',
    sizeEstimateBytes: 8.4 * 1024 * 1024,
    isCached: false,
    module: 'fingers',
  },
];

/**
 * Checks if a specific model URL is already stored in Cache Storage
 */
export async function isModelCached(url: string): Promise<boolean> {
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
      // If file doesn't exist yet in static assets, we register mock cached state
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
 * Clears the entire model cache and resets IndexedDB session records
 */
export async function clearAllLocalCache(): Promise<void> {
  if (typeof caches !== 'undefined') {
    try {
      await caches.delete(MODEL_CACHE_NAME);
    } catch {
      // Ignore
    }
  }
  if (typeof indexedDB !== 'undefined') {
    try {
      indexedDB.deleteDatabase('keyval-store');
      indexedDB.deleteDatabase('omni-loco-db');
    } catch {
      // Ignore
    }
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
}
