/**
 * MediaPipe Tasks Vision Engine
 * Robust loader with GPU acceleration, CPU fallback, local WASM binaries,
 * monotonic timestamp enforcement, and single-flight execution.
 */

import type {
  HandLandmarker,
  GestureRecognizer,
  FaceLandmarker,
  PoseLandmarker,
  ImageClassifier,
  HandLandmarkerResult,
  GestureRecognizerResult,
  FaceLandmarkerResult,
  PoseLandmarkerResult,
  ImageClassifierResult,
} from '@mediapipe/tasks-vision';

export interface HandPipelineConfig {
  numHands?: number;
  minHandDetectionConfidence?: number;
  minHandPresenceConfidence?: number;
  minTrackingConfidence?: number;
}

export type HandModelType = 'GESTURE_RECOGNIZER' | 'HAND_LANDMARKER' | 'SYNTHETIC' | 'NONE';

export interface UnifiedHandResult {
  landmarks: { x: number; y: number; z: number }[][];
  worldLandmarks: { x: number; y: number; z: number }[][];
  handedness: { index: number; score: number; categoryName: string; displayName: string }[][];
  handednesses: { index: number; score: number; categoryName: string; displayName: string }[][];
  gestures?: { index: number; score: number; categoryName: string; displayName: string }[][];
  modelType: HandModelType;
}

export type PipelineBackend = 'GPU' | 'CPU' | 'SYNTHETIC' | 'UNLOADED';

export interface ModelStatusSnapshot {
  handLoaded: boolean;
  faceLoaded: boolean;
  handModel: HandModelType;
  handBackend: PipelineBackend;
  faceBackend: PipelineBackend;
  activeBackend: string;
}

export class MediaPipeTaskRunner {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static visionWasmLoaded: any = null;
  private handLandmarker: HandLandmarker | null = null;
  private gestureRecognizer: GestureRecognizer | null = null;
  private faceLandmarker: FaceLandmarker | null = null;
  private poseLandmarker: PoseLandmarker | null = null;
  private imageClassifier: ImageClassifier | null = null;

  // Independent per-pipeline initialization & execution locks (V9)
  private isInitializingHand = false;
  private isInitializingFace = false;
  private isInitializing = false;
  private isProcessingHand = false;
  private isProcessingFace = false;
  private isProcessing = false;
  private isDisposed = false;

  // Independent strictly-monotonic timestamps per pipeline (V9)
  private lastHandTimestampMs = 0;
  private lastFaceTimestampMs = 0;
  private lastTimestampMs = 0;

  private activeBackend: 'GPU' | 'CPU' | 'SYNTHETIC' = 'SYNTHETIC';
  private handBackend: PipelineBackend = 'UNLOADED';
  private faceBackend: PipelineBackend = 'UNLOADED';
  private activeHandModel: HandModelType = 'NONE';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getVisionResolver(): Promise<any> {
    if (MediaPipeTaskRunner.visionWasmLoaded) {
      return MediaPipeTaskRunner.visionWasmLoaded;
    }

    const { FilesetResolver } = await import('@mediapipe/tasks-vision');

    // Try local self-hosted WASM first, fallback to CDN if necessary
    try {
      const resolver = await FilesetResolver.forVisionTasks('/wasm');
      MediaPipeTaskRunner.visionWasmLoaded = resolver;
      return resolver;
    } catch {
      const resolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
      );
      MediaPipeTaskRunner.visionWasmLoaded = resolver;
      return resolver;
    }
  }

  // 1A. Initialize Gesture Recognizer (Primary Perception Pipeline)
  async initGestureRecognizer(
    modelPath = '/models/gesture_recognizer.task',
    config?: HandPipelineConfig
  ): Promise<boolean> {
    if (this.gestureRecognizer) return true;
    if (this.isInitializingHand) return false;

    const numHands = config?.numHands ?? 2;
    const minDetect = config?.minHandDetectionConfidence ?? 0.40;
    const minPresence = config?.minHandPresenceConfidence ?? 0.40;
    const minTrack = config?.minTrackingConfidence ?? 0.40;

    this.isDisposed = false;
    this.isInitializingHand = true;
    try {
      const vision = await this.getVisionResolver();
      const { GestureRecognizer } = await import('@mediapipe/tasks-vision');

      // Attempt GPU delegate first
      try {
        const created = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands,
          minHandDetectionConfidence: minDetect,
          minHandPresenceConfidence: minPresence,
          minTrackingConfidence: minTrack,
        });
        if (this.isDisposed) {
          try { created.close(); } catch {}
          this.isInitializingHand = false;
          return false;
        }
        this.gestureRecognizer = created;
        this.activeBackend = 'GPU';
        this.handBackend = 'GPU';
        this.activeHandModel = 'GESTURE_RECOGNIZER';
      } catch {
        // Fallback to CPU delegate
        const created = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands,
          minHandDetectionConfidence: minDetect,
          minHandPresenceConfidence: minPresence,
          minTrackingConfidence: minTrack,
        });
        if (this.isDisposed) {
          try { created.close(); } catch {}
          this.isInitializingHand = false;
          return false;
        }
        this.gestureRecognizer = created;
        this.activeBackend = 'CPU';
        this.handBackend = 'CPU';
        this.activeHandModel = 'GESTURE_RECOGNIZER';
      }

      this.isInitializingHand = false;
      return true;
    } catch {
      this.isInitializingHand = false;
      return false;
    }
  }

  // 1B. Initialize Hand Landmarker
  async initHandLandmarker(
    modelPath = '/models/hand_landmarker.task',
    config?: HandPipelineConfig
  ): Promise<boolean> {
    if (this.handLandmarker) return true;
    if (this.isInitializingHand) return false;

    const numHands = config?.numHands ?? 2;
    const minDetect = config?.minHandDetectionConfidence ?? 0.40;
    const minPresence = config?.minHandPresenceConfidence ?? 0.40;
    const minTrack = config?.minTrackingConfidence ?? 0.40;

    this.isDisposed = false;
    this.isInitializingHand = true;
    try {
      const vision = await this.getVisionResolver();
      const { HandLandmarker } = await import('@mediapipe/tasks-vision');

      // Attempt GPU delegate first
      try {
        const created = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands,
          minHandDetectionConfidence: minDetect,
          minHandPresenceConfidence: minPresence,
          minTrackingConfidence: minTrack,
        });
        if (this.isDisposed) {
          try { created.close(); } catch {}
          this.isInitializingHand = false;
          return false;
        }
        this.handLandmarker = created;
        this.activeBackend = 'GPU';
        this.handBackend = 'GPU';
        this.activeHandModel = 'HAND_LANDMARKER';
      } catch {
        // Fallback to CPU delegate
        const created = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands,
          minHandDetectionConfidence: minDetect,
          minHandPresenceConfidence: minPresence,
          minTrackingConfidence: minTrack,
        });
        if (this.isDisposed) {
          try { created.close(); } catch {}
          this.isInitializingHand = false;
          return false;
        }
        this.handLandmarker = created;
        this.activeBackend = 'CPU';
        this.handBackend = 'CPU';
        this.activeHandModel = 'HAND_LANDMARKER';
      }

      this.isInitializingHand = false;
      return true;
    } catch {
      this.isInitializingHand = false;
      this.activeBackend = 'SYNTHETIC';
      this.handBackend = 'SYNTHETIC';
      return false;
    }
  }

  // 1C. Unified Hand Perception Initializer: Prefers GestureRecognizer, seamlessly falls back to HandLandmarker
  async initHandPipeline(options?: {
    preferGestureRecognizer?: boolean;
    config?: HandPipelineConfig;
    gestureModelPath?: string;
    landmarkerModelPath?: string;
  }): Promise<boolean> {
    const preferGesture = options?.preferGestureRecognizer ?? true;

    if (preferGesture) {
      const gestureSuccess = await this.initGestureRecognizer(
        options?.gestureModelPath ?? '/models/gesture_recognizer.task',
        options?.config
      );
      if (gestureSuccess) return true;
    }

    return await this.initHandLandmarker(
      options?.landmarkerModelPath ?? '/models/hand_landmarker.task',
      options?.config
    );
  }

  // Detect hands in video frame (Supports GestureRecognizer and HandLandmarker)
  detectHands(video: HTMLVideoElement, timestamp: number): UnifiedHandResult | null {
    if ((!this.gestureRecognizer && !this.handLandmarker) || this.isProcessingHand || video.readyState < 2) {
      return null;
    }

    // Enforce strictly monotonic timestamps for MediaPipe Hand VIDEO mode
    const safeTimestamp = Math.max(timestamp, this.lastHandTimestampMs + 1);
    this.lastHandTimestampMs = safeTimestamp;

    try {
      this.isProcessingHand = true;

      if (this.gestureRecognizer) {
        const result = this.gestureRecognizer.recognizeForVideo(video, safeTimestamp);
        this.isProcessingHand = false;
        if (!result || !result.landmarks || result.landmarks.length === 0) {
          return null;
        }
        const handedness = result.handedness || result.handednesses || [];
        return {
          landmarks: result.landmarks,
          worldLandmarks: result.worldLandmarks || [],
          handedness,
          handednesses: handedness,
          gestures: result.gestures || [],
          modelType: 'GESTURE_RECOGNIZER',
        };
      }

      if (this.handLandmarker) {
        const result = this.handLandmarker.detectForVideo(video, safeTimestamp);
        this.isProcessingHand = false;
        if (!result || !result.landmarks || result.landmarks.length === 0) {
          return null;
        }
        const handedness = result.handedness || result.handednesses || [];
        return {
          landmarks: result.landmarks,
          worldLandmarks: result.worldLandmarks || [],
          handedness,
          handednesses: handedness,
          modelType: 'HAND_LANDMARKER',
        };
      }

      this.isProcessingHand = false;
      return null;
    } catch {
      this.isProcessingHand = false;
      return null;
    }
  }

  getActiveHandModel(): HandModelType {
    return this.activeHandModel;
  }

  // 2. Initialize Face Landmarker (with blendshapes and matrix)
  async initFaceLandmarker(modelPath = '/models/face_landmarker.task'): Promise<boolean> {
    if (this.faceLandmarker) return true;
    if (this.isInitializingFace) return false;

    this.isDisposed = false;
    this.isInitializingFace = true;
    try {
      const vision = await this.getVisionResolver();
      const { FaceLandmarker } = await import('@mediapipe/tasks-vision');

      try {
        const created = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        if (this.isDisposed) {
          try { created.close(); } catch {}
          this.isInitializingFace = false;
          return false;
        }
        this.faceLandmarker = created;
        this.activeBackend = 'GPU';
        this.faceBackend = 'GPU';
      } catch {
        const created = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          numFaces: 1,
        });
        if (this.isDisposed) {
          try { created.close(); } catch {}
          this.isInitializingFace = false;
          return false;
        }
        this.faceLandmarker = created;
        this.activeBackend = 'CPU';
        this.faceBackend = 'CPU';
      }

      this.isInitializingFace = false;
      return true;
    } catch {
      this.isInitializingFace = false;
      this.faceBackend = 'SYNTHETIC';
      return false;
    }
  }

  detectFace(video: HTMLVideoElement, timestamp: number): FaceLandmarkerResult | null {
    if (!this.faceLandmarker || this.isProcessingFace || video.readyState < 2) {
      return null;
    }

    const safeTimestamp = Math.max(timestamp, this.lastFaceTimestampMs + 1);
    this.lastFaceTimestampMs = safeTimestamp;

    try {
      this.isProcessingFace = true;
      const result = this.faceLandmarker.detectForVideo(video, safeTimestamp);
      this.isProcessingFace = false;
      return result;
    } catch {
      this.isProcessingFace = false;
      return null;
    }
  }

  isFaceLoaded(): boolean {
    return !!this.faceLandmarker;
  }

  isHandLoaded(): boolean {
    return !!(this.gestureRecognizer || this.handLandmarker);
  }

  getModelStatus(): ModelStatusSnapshot {
    return {
      handLoaded: this.isHandLoaded(),
      faceLoaded: this.isFaceLoaded(),
      handModel: this.activeHandModel,
      handBackend: this.handBackend,
      faceBackend: this.faceBackend,
      activeBackend: this.activeBackend,
    };
  }

  disposeFace(): void {
    if (this.faceLandmarker) {
      try { this.faceLandmarker.close(); } catch {}
      this.faceLandmarker = null;
    }
    this.faceBackend = 'UNLOADED';
    this.isProcessingFace = false;
    this.lastFaceTimestampMs = 0;
  }

  disposeHands(): void {
    if (this.gestureRecognizer) {
      try { this.gestureRecognizer.close(); } catch {}
      this.gestureRecognizer = null;
    }
    if (this.handLandmarker) {
      try { this.handLandmarker.close(); } catch {}
      this.handLandmarker = null;
    }
    this.activeHandModel = 'NONE';
    this.handBackend = 'UNLOADED';
    this.isProcessingHand = false;
    this.lastHandTimestampMs = 0;
  }

  // 3. Initialize Pose Landmarker
  async initPoseLandmarker(modelPath = '/models/pose_landmarker_full.task'): Promise<boolean> {
    if (this.poseLandmarker) return true;
    if (this.isInitializing) return false;

    this.isDisposed = false;
    this.isInitializing = true;
    try {
      const vision = await this.getVisionResolver();
      const { PoseLandmarker } = await import('@mediapipe/tasks-vision');

      try {
        const created = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        if (this.isDisposed) {
          try { created.close(); } catch {}
          this.isInitializing = false;
          return false;
        }
        this.poseLandmarker = created;
        this.activeBackend = 'GPU';
      } catch {
        const created = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
        if (this.isDisposed) {
          try { created.close(); } catch {}
          this.isInitializing = false;
          return false;
        }
        this.poseLandmarker = created;
        this.activeBackend = 'CPU';
      }

      this.isInitializing = false;
      return true;
    } catch {
      this.isInitializing = false;
      this.activeBackend = 'SYNTHETIC';
      return false;
    }
  }

  detectPose(video: HTMLVideoElement, timestamp: number): PoseLandmarkerResult | null {
    if (!this.poseLandmarker || this.isProcessing || video.readyState < 2) {
      return null;
    }

    const safeTimestamp = Math.max(timestamp, this.lastTimestampMs + 1);
    this.lastTimestampMs = safeTimestamp;

    try {
      this.isProcessing = true;
      const result = this.poseLandmarker.detectForVideo(video, safeTimestamp);
      this.isProcessing = false;
      return result;
    } catch {
      this.isProcessing = false;
      return null;
    }
  }

  // 4. Initialize Image Classifier
  async initImageClassifier(modelPath = '/models/classifier.tflite'): Promise<boolean> {
    if (this.imageClassifier) return true;
    if (this.isInitializing) return false;

    this.isDisposed = false;
    this.isInitializing = true;
    try {
      const vision = await this.getVisionResolver();
      const { ImageClassifier } = await import('@mediapipe/tasks-vision');

      try {
        const created = await ImageClassifier.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'GPU',
          },
          runningMode: 'IMAGE',
          maxResults: 5,
        });
        if (this.isDisposed) {
          try { created.close(); } catch {}
          this.isInitializing = false;
          return false;
        }
        this.imageClassifier = created;
        this.activeBackend = 'GPU';
      } catch {
        const created = await ImageClassifier.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'CPU',
          },
          runningMode: 'IMAGE',
          maxResults: 5,
        });
        if (this.isDisposed) {
          try { created.close(); } catch {}
          this.isInitializing = false;
          return false;
        }
        this.imageClassifier = created;
        this.activeBackend = 'CPU';
      }

      this.isInitializing = false;
      return true;
    } catch {
      this.isInitializing = false;
      return false;
    }
  }

  classifyImage(
    source: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement
  ): ImageClassifierResult | null {
    if (!this.imageClassifier || this.isProcessing) {
      return null;
    }

    try {
      this.isProcessing = true;
      const result = this.imageClassifier.classify(source);
      this.isProcessing = false;
      return result;
    } catch {
      this.isProcessing = false;
      return null;
    }
  }

  getBackend(): string {
    return this.activeBackend;
  }

  dispose(): void {
    this.isDisposed = true;
    this.disposeHands();
    this.disposeFace();
    if (this.poseLandmarker) {
      try {
        this.poseLandmarker.close();
      } catch {}
      this.poseLandmarker = null;
    }
    if (this.imageClassifier) {
      try {
        this.imageClassifier.close();
      } catch {}
      this.imageClassifier = null;
    }
    this.isProcessing = false;
    this.isInitializing = false;
    this.isInitializingHand = false;
    this.isInitializingFace = false;
    this.lastTimestampMs = 0;
  }
}
