/**
 * OMNI LOCO AI — APEX 3.0
 * CENTRAL MODEL VAULT MANIFEST & ASSET VERIFIER
 * Authoritative dependency manifest mapping every model to its real weight assets,
 * runtime binaries, license attribution, and execution providers.
 * Strictly separates neural network weights from runtime execution engines.
 */

export type ModelFamily =
  | 'MediaPipe Tasks Vision'
  | 'TensorFlow Lite'
  | 'ONNX Runtime Web'
  | 'Web Audio Native DSP'
  | 'Laboratory Custom Rig';

export type ManifestRuntime =
  | 'MediaPipe'
  | 'TensorFlow.js'
  | 'ONNX Runtime'
  | 'Web Audio'
  | 'Custom Feature Engine';

export interface ModelManifestEntry {
  id: string;
  displayName: string;
  version: string;
  moduleId: string;
  moduleRoute: string;
  modelFamily: ModelFamily;
  runtime: ManifestRuntime;
  weightAssetPath: string | null;
  runtimeBinaryPath: string | null;
  storageSizeBytes: number;
  supportedBackends: ('GPU' | 'CPU' | 'WASM')[];
  license: string;
  hasNeuralWeights: boolean;
  notes: string;
}

export interface ModelVerificationResult {
  modelId: string;
  weightExists: boolean;
  runtimeExists: boolean;
  actualSizeBytes?: number;
  httpStatus?: number;
  verifiedAt: string;
  errorMessage?: string;
}

export const CENTRAL_MODEL_MANIFEST: ModelManifestEntry[] = [
  {
    id: 'hand_landmarker',
    displayName: 'MediaPipe Hand Landmarker (21 3D Points)',
    version: '0.10.35',
    moduleId: 'hand',
    moduleRoute: '/hand',
    modelFamily: 'MediaPipe Tasks Vision',
    runtime: 'MediaPipe',
    weightAssetPath: '/models/hand_landmarker.task',
    runtimeBinaryPath: '/wasm/vision_wasm_internal.wasm',
    storageSizeBytes: 7.8 * 1024 * 1024,
    supportedBackends: ['GPU', 'CPU'],
    license: 'Apache 2.0 (Google MediaPipe)',
    hasNeuralWeights: true,
    notes: '21 3D landmarks with left/right handedness classification and pinch geometry.',
  },
  {
    id: 'face_landmarker',
    displayName: 'MediaPipe Face Mesh (478 Dense Landmarks & 52 Blendshapes)',
    version: '0.10.35',
    moduleId: 'face',
    moduleRoute: '/face',
    modelFamily: 'MediaPipe Tasks Vision',
    runtime: 'MediaPipe',
    weightAssetPath: '/models/face_landmarker.task',
    runtimeBinaryPath: '/wasm/vision_wasm_internal.wasm',
    storageSizeBytes: 3.7 * 1024 * 1024,
    supportedBackends: ['GPU', 'CPU'],
    license: 'Apache 2.0 (Google MediaPipe)',
    hasNeuralWeights: true,
    notes: 'Dense facial geometry, ARKit-compatible 52 blendshapes, and bilateral iris vectors.',
  },
  {
    id: 'pose_landmarker',
    displayName: 'MediaPipe Full Body Pose (33 World Coordinates)',
    version: '0.10.35',
    moduleId: 'pose',
    moduleRoute: '/pose',
    modelFamily: 'MediaPipe Tasks Vision',
    runtime: 'MediaPipe',
    weightAssetPath: '/models/pose_landmarker_full.task',
    runtimeBinaryPath: '/wasm/vision_wasm_internal.wasm',
    storageSizeBytes: 9.4 * 1024 * 1024,
    supportedBackends: ['GPU', 'CPU'],
    license: 'Apache 2.0 (Google MediaPipe)',
    hasNeuralWeights: true,
    notes: 'Full-body kinematic tracking with 3D joint angle calculation.',
  },
  {
    id: 'gesture_recognizer',
    displayName: 'MediaPipe Gesture Recognizer Pack',
    version: '0.10.35',
    moduleId: 'goofy',
    moduleRoute: '/goofy',
    modelFamily: 'MediaPipe Tasks Vision',
    runtime: 'MediaPipe',
    weightAssetPath: '/models/gesture_recognizer.task',
    runtimeBinaryPath: '/wasm/vision_wasm_internal.wasm',
    storageSizeBytes: 7.8 * 1024 * 1024,
    supportedBackends: ['GPU', 'CPU'],
    license: 'Apache 2.0 (Google MediaPipe)',
    hasNeuralWeights: true,
    notes: 'Multi-class hand gesture recognizer feeding Goofy Model V9 Chaos Engine.',
  },
  {
    id: 'waste_classifier',
    displayName: 'Municipal Waste Segregator (10-Class TFLite)',
    version: '2.1.0',
    moduleId: 'waste',
    moduleRoute: '/waste',
    modelFamily: 'TensorFlow Lite',
    runtime: 'TensorFlow.js',
    weightAssetPath: '/models/classifier.tflite',
    runtimeBinaryPath: null,
    storageSizeBytes: 18.5 * 1024 * 1024,
    supportedBackends: ['GPU', 'CPU'],
    license: 'Custom Commercial Local',
    hasNeuralWeights: true,
    notes: 'Local mobile neural network for recyclable, organic, and hazardous waste sorting.',
  },
  {
    id: 'objects_runtime',
    displayName: 'ONNX Runtime Web SIMD (Object Intelligence Engine)',
    version: '1.20.0',
    moduleId: 'objects',
    moduleRoute: '/objects',
    modelFamily: 'ONNX Runtime Web',
    runtime: 'ONNX Runtime',
    weightAssetPath: null,
    runtimeBinaryPath: '/wasm/ort-wasm-simd-threaded.wasm',
    storageSizeBytes: 1.2 * 1024 * 1024,
    supportedBackends: ['WASM'],
    license: 'MIT (Microsoft ONNX Runtime)',
    hasNeuralWeights: false,
    notes: 'WASM SIMD execution engine powering COCO visual feature extraction & IoU tracking.',
  },
  {
    id: 'segment_runtime',
    displayName: 'Promptable Segmentation Feature Mask Decoder',
    version: '1.20.0',
    moduleId: 'segment',
    moduleRoute: '/segment',
    modelFamily: 'ONNX Runtime Web',
    runtime: 'ONNX Runtime',
    weightAssetPath: null,
    runtimeBinaryPath: '/wasm/ort-wasm-simd-threaded.wasm',
    storageSizeBytes: 1.2 * 1024 * 1024,
    supportedBackends: ['WASM'],
    license: 'MIT (Microsoft ONNX Runtime)',
    hasNeuralWeights: false,
    notes: 'Interactive point/box geodesic distance mask decoder runtime.',
  },
  {
    id: 'depth_runtime',
    displayName: 'Monocular Scene Geometry & Luminance Gradient Engine',
    version: '1.20.0',
    moduleId: 'depth',
    moduleRoute: '/depth',
    modelFamily: 'ONNX Runtime Web',
    runtime: 'ONNX Runtime',
    weightAssetPath: null,
    runtimeBinaryPath: '/wasm/ort-wasm-simd-threaded.wasm',
    storageSizeBytes: 1.2 * 1024 * 1024,
    supportedBackends: ['WASM'],
    license: 'MIT (Microsoft ONNX Runtime)',
    hasNeuralWeights: false,
    notes: 'Relative scene depth estimator with surface normal probe.',
  },
  {
    id: 'speech_dsp',
    displayName: 'Web Audio Native DSP (Autocorrelation & RMS Core)',
    version: '2.0.0',
    moduleId: 'speech',
    moduleRoute: '/speech',
    modelFamily: 'Web Audio Native DSP',
    runtime: 'Web Audio',
    weightAssetPath: null,
    runtimeBinaryPath: null,
    storageSizeBytes: 0,
    supportedBackends: ['WASM'],
    license: 'W3C Web Audio Standard',
    hasNeuralWeights: false,
    notes: 'Zero-download native browser DSP pipeline for voice activity and pitch tracking.',
  },
];

/**
 * Perform genuine HTTP verification of local model assets
 */
export async function verifyModelAsset(entry: ModelManifestEntry): Promise<ModelVerificationResult> {
  const result: ModelVerificationResult = {
    modelId: entry.id,
    weightExists: !entry.hasNeuralWeights,
    runtimeExists: !entry.runtimeBinaryPath,
    verifiedAt: new Date().toLocaleTimeString(),
  };

  // Native DSP cores with 0 weights and 0 binaries are self-verified
  if (!entry.hasNeuralWeights && !entry.runtimeBinaryPath) {
    result.actualSizeBytes = 0;
    return result;
  }

  if (typeof window === 'undefined') {
    return result;
  }

  // 1. Verify neural weight file if required
  if (entry.weightAssetPath) {
    try {
      const resp = await fetch(entry.weightAssetPath, { method: 'HEAD' });
      result.httpStatus = resp.status;
      result.weightExists = resp.ok;
      const cl = resp.headers.get('content-length');
      if (cl) {
        result.actualSizeBytes = parseInt(cl, 10);
      }
    } catch (err) {
      result.weightExists = false;
      result.errorMessage = (err as Error).message;
    }
  }

  // 2. Verify runtime binary if required
  if (entry.runtimeBinaryPath) {
    try {
      const resp = await fetch(entry.runtimeBinaryPath, { method: 'HEAD' });
      result.runtimeExists = resp.ok;
    } catch {
      result.runtimeExists = false;
    }
  }

  return result;
}

/**
 * Alias export for backward and lifecycle compatibility
 */
export const MODEL_MANIFEST = CENTRAL_MODEL_MANIFEST;
export async function verifyAllModelAssets(): Promise<Record<string, ModelVerificationResult>> {
  const results: Record<string, ModelVerificationResult> = {};
  await Promise.all(
    CENTRAL_MODEL_MANIFEST.map(async (m) => {
      results[m.id] = await verifyModelAsset(m);
    })
  );
  return results;
}
