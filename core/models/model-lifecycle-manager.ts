/**
 * OMNI LOCO AI 2.0 — CENTRAL MODEL LIFECYCLE MANAGER
 * Explicit lifecycle orchestration: UNLOADED → LOADING → READY → PROCESSING → ERROR → DISPOSING.
 * Distinguishes asset caching from memory residency, manages execution backends,
 * prevents duplicate instances, and provides structured error recovery.
 */

import { isModelCached } from '@/core/cache';

export type ModelLifecycleState =
  | 'UNLOADED'
  | 'LOADING'
  | 'READY'
  | 'PROCESSING'
  | 'ERROR'
  | 'DISPOSING';

export type ExecutionBackend = 'GPU' | 'CPU' | 'WASM' | 'UNLOADED';

export type ModelRuntime =
  | 'MediaPipe'
  | 'ONNX Runtime'
  | 'TensorFlow.js'
  | 'Web Audio'
  | 'Custom Feature Engine';

export interface ModelRegistrationOptions {
  id: string;
  displayName: string;
  version: string;
  assetPath: string;
  assetSize: string;
  runtime: ModelRuntime;
  preferredBackend?: ExecutionBackend;
  factory?: (backend: ExecutionBackend) => Promise<unknown>;
}

export interface ModelStatusRecord {
  id: string;
  displayName: string;
  version: string;
  assetPath: string;
  assetSize: string;
  runtime: ModelRuntime;
  preferredBackend: ExecutionBackend;
  activeBackend: ExecutionBackend;
  state: ModelLifecycleState;
  assetCached: boolean;
  inMemory: boolean;
  activelyExecuting: boolean;
  loadTimeMs: number | null;
  lastInferenceDurationMs: number | null;
  inferenceCount: number;
  error: string | null;
  refCount: number;
}

export class ModelLifecycleManager {
  private static instance: ModelLifecycleManager | null = null;

  private registry: Map<string, ModelRegistrationOptions> = new Map();
  private states: Map<string, ModelStatusRecord> = new Map();
  private loadedInstances: Map<string, unknown> = new Map();
  private listeners: Set<(models: ModelStatusRecord[]) => void> = new Set();

  private constructor() {
    this.registerDefaultModels();
  }

  public static getInstance(): ModelLifecycleManager {
    if (!ModelLifecycleManager.instance) {
      ModelLifecycleManager.instance = new ModelLifecycleManager();
    }
    return ModelLifecycleManager.instance;
  }

  /**
   * Register default foundational perception models of Omni Loco AI
   */
  private registerDefaultModels(): void {
    const defaults: ModelRegistrationOptions[] = [
      {
        id: 'hand_landmarker',
        displayName: 'MediaPipe Hand Landmarker',
        version: '0.10.35',
        assetPath: '/models/hand_landmarker.task',
        assetSize: '7.8 MB',
        runtime: 'MediaPipe',
        preferredBackend: 'GPU',
      },
      {
        id: 'gesture_recognizer',
        displayName: 'MediaPipe Gesture Recognizer',
        version: '0.10.35',
        assetPath: '/models/gesture_recognizer.task',
        assetSize: '7.8 MB',
        runtime: 'MediaPipe',
        preferredBackend: 'GPU',
      },
      {
        id: 'face_landmarker',
        displayName: 'MediaPipe Face Landmarker & Iris',
        version: '0.10.35',
        assetPath: '/models/face_landmarker.task',
        assetSize: '3.7 MB',
        runtime: 'MediaPipe',
        preferredBackend: 'GPU',
      },
      {
        id: 'pose_landmarker',
        displayName: 'MediaPipe Full Body Pose',
        version: '0.10.35',
        assetPath: '/models/pose_landmarker_full.task',
        assetSize: '9.4 MB',
        runtime: 'MediaPipe',
        preferredBackend: 'GPU',
      },
      {
        id: 'waste_classifier',
        displayName: 'Waste Segregator TFLite',
        version: '2.1.0',
        assetPath: '/models/classifier.tflite',
        assetSize: '18.5 MB',
        runtime: 'TensorFlow.js',
        preferredBackend: 'GPU',
      },
      {
        id: 'object_detector_yolo',
        displayName: 'YOLOv8 Small Object Detector',
        version: '1.4.0',
        assetPath: '/wasm/ort-wasm-simd-threaded.wasm',
        assetSize: '14.2 MB',
        runtime: 'ONNX Runtime',
        preferredBackend: 'WASM',
      },
      {
        id: 'depth_estimator_midas',
        displayName: 'MiDaS Relative Depth Estimator',
        version: '1.2.0',
        assetPath: '/wasm/ort-wasm-simd-threaded.wasm',
        assetSize: '9.6 MB',
        runtime: 'ONNX Runtime',
        preferredBackend: 'WASM',
      },
      {
        id: 'speech_dsp_worklet',
        displayName: 'AudioWorklet DSP & VAD',
        version: '1.1.0',
        assetPath: '/wasm/acoustic_dsp.wasm',
        assetSize: '1.8 MB',
        runtime: 'Web Audio',
        preferredBackend: 'WASM',
      },
    ];

    defaults.forEach((m) => this.registerModel(m));
  }

  /**
   * Register a new model configuration into the lifecycle manager
   */
  public registerModel(options: ModelRegistrationOptions): void {
    this.registry.set(options.id, options);
    if (!this.states.has(options.id)) {
      this.states.set(options.id, {
        id: options.id,
        displayName: options.displayName,
        version: options.version,
        assetPath: options.assetPath,
        assetSize: options.assetSize,
        runtime: options.runtime,
        preferredBackend: options.preferredBackend || 'GPU',
        activeBackend: 'UNLOADED',
        state: 'UNLOADED',
        assetCached: false,
        inMemory: false,
        activelyExecuting: false,
        loadTimeMs: null,
        lastInferenceDurationMs: null,
        inferenceCount: 0,
        error: null,
        refCount: 0,
      });
    }
  }

  /**
   * Check whether model asset is cached locally in Cache API
   */
  public async checkAssetCached(modelId: string): Promise<boolean> {
    const meta = this.registry.get(modelId);
    if (!meta) return false;
    const isCached = await isModelCached(meta.assetPath);
    const rec = this.states.get(modelId);
    if (rec) {
      rec.assetCached = isCached;
      this.notifyListeners();
    }
    return isCached;
  }

  /**
   * Load model into memory with state transitions UNLOADED → LOADING → READY / ERROR.
   */
  public async loadModel(
    modelId: string,
    options: {
      preferredBackend?: ExecutionBackend;
      forceReload?: boolean;
      customFactory?: (backend: ExecutionBackend) => Promise<unknown>;
    } = {}
  ): Promise<boolean> {
    const meta = this.registry.get(modelId);
    if (!meta) {
      console.warn(`[ModelLifecycleManager] Unknown modelId: ${modelId}`);
      return false;
    }

    const rec = this.states.get(modelId)!;

    // Reuse existing instance if ready and not forceReload
    if (rec.state === 'READY' && this.loadedInstances.has(modelId) && !options.forceReload) {
      rec.refCount++;
      this.notifyListeners();
      return true;
    }

    rec.state = 'LOADING';
    rec.error = null;
    this.notifyListeners();

    const startTime = performance.now();
    const targetBackend = options.preferredBackend || meta.preferredBackend || 'GPU';

    try {
      let instance: unknown = null;
      const factory = options.customFactory || meta.factory;

      if (factory) {
        try {
          instance = await factory(targetBackend);
          rec.activeBackend = targetBackend;
        } catch (firstErr) {
          // If GPU failed, attempt CPU fallback
          if (targetBackend === 'GPU') {
            console.warn(`[ModelLifecycleManager] GPU initialization failed for ${modelId}, falling back to CPU:`, firstErr);
            instance = await factory('CPU');
            rec.activeBackend = 'CPU';
          } else {
            throw firstErr;
          }
        }
      } else {
        // Fallback for default models where factory is managed by task runner
        rec.activeBackend = targetBackend;
      }

      const elapsed = Math.round(performance.now() - startTime);
      rec.loadTimeMs = elapsed;
      rec.state = 'READY';
      rec.inMemory = true;
      rec.refCount++;
      if (instance) {
        this.loadedInstances.set(modelId, instance);
      }

      // Also check caching status
      this.checkAssetCached(modelId).catch(() => {});

      this.notifyListeners();
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      rec.state = 'ERROR';
      rec.inMemory = false;
      rec.error = error.message || 'Model initialization failed';
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Acquire a loaded instance handle. Increments ref count.
   */
  public async acquireInstance<T>(modelId: string): Promise<T | null> {
    const rec = this.states.get(modelId);
    if (!rec) return null;

    if (rec.state !== 'READY') {
      const success = await this.loadModel(modelId);
      if (!success) return null;
    } else {
      rec.refCount++;
    }

    return (this.loadedInstances.get(modelId) as T) ?? null;
  }

  /**
   * Release instance handle. Decrements ref count.
   */
  public releaseInstance(modelId: string): void {
    const rec = this.states.get(modelId);
    if (!rec) return;

    rec.refCount = Math.max(0, rec.refCount - 1);
    this.notifyListeners();
  }

  /**
   * Explicitly set actively executing status during inference
   */
  public setProcessing(modelId: string, isProcessing: boolean): void {
    const rec = this.states.get(modelId);
    if (!rec) return;

    if (rec.state === 'READY' || rec.state === 'PROCESSING') {
      rec.state = isProcessing ? 'PROCESSING' : 'READY';
      rec.activelyExecuting = isProcessing;
      this.notifyListeners();
    }
  }

  /**
   * Record inference metrics (latency and count)
   */
  public recordInferenceMetric(modelId: string, durationMs: number): void {
    const rec = this.states.get(modelId);
    if (!rec) return;

    rec.lastInferenceDurationMs = Math.round(durationMs * 10) / 10;
    rec.inferenceCount++;
    this.notifyListeners();
  }

  /**
   * Dispose model instance and free memory
   */
  public async disposeModel(modelId: string): Promise<void> {
    const rec = this.states.get(modelId);
    if (!rec || rec.state === 'UNLOADED') return;

    rec.state = 'DISPOSING';
    this.notifyListeners();

    const instance = this.loadedInstances.get(modelId);
    if (instance && typeof instance === 'object' && 'close' in instance && typeof (instance as { close: () => void }).close === 'function') {
      try {
        (instance as { close: () => void }).close();
      } catch (err) {
        console.warn(`[ModelLifecycleManager] Error closing ${modelId}:`, err);
      }
    }

    this.loadedInstances.delete(modelId);
    rec.state = 'UNLOADED';
    rec.inMemory = false;
    rec.activelyExecuting = false;
    rec.activeBackend = 'UNLOADED';
    rec.refCount = 0;
    this.notifyListeners();
  }

  /**
   * Get single model status
   */
  public getModelStatus(modelId: string): ModelStatusRecord | undefined {
    return this.states.get(modelId);
  }

  /**
   * Get all registered models and their current lifecycle states
   */
  public getAllModels(): ModelStatusRecord[] {
    return Array.from(this.states.values());
  }

  /**
   * Subscribe to model lifecycle and metric updates
   */
  public subscribe(listener: (models: ModelStatusRecord[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllModels());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const models = this.getAllModels();
    this.listeners.forEach((l) => {
      try {
        l(models);
      } catch (err) {
        console.warn('[ModelLifecycleManager] Listener callback error:', err);
      }
    });
  }
}
