/**
 * MediaPipe Tasks Vision Engine
 * Robust loader with GPU acceleration, CPU fallback, local WASM binaries,
 * monotonic timestamp enforcement, and single-flight execution.
 */

import type {
  HandLandmarker,
  FaceLandmarker,
  PoseLandmarker,
  ImageClassifier,
  HandLandmarkerResult,
  FaceLandmarkerResult,
  PoseLandmarkerResult,
  ImageClassifierResult,
} from '@mediapipe/tasks-vision';

export class MediaPipeTaskRunner {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static visionWasmLoaded: any = null;
  private handLandmarker: HandLandmarker | null = null;
  private faceLandmarker: FaceLandmarker | null = null;
  private poseLandmarker: PoseLandmarker | null = null;
  private imageClassifier: ImageClassifier | null = null;

  private isInitializing = false;
  private isProcessing = false;
  private lastTimestampMs = 0;
  private activeBackend: 'GPU' | 'CPU' | 'SYNTHETIC' = 'SYNTHETIC';

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

  // 1. Initialize Hand Landmarker
  async initHandLandmarker(modelPath = '/models/hand_landmarker.task'): Promise<boolean> {
    if (this.handLandmarker) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    try {
      const vision = await this.getVisionResolver();
      const { HandLandmarker } = await import('@mediapipe/tasks-vision');

      // Attempt GPU delegate first
      try {
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        this.activeBackend = 'GPU';
      } catch {
        // Fallback to CPU delegate
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
        });
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

  // Detect hands in video frame
  detectHands(video: HTMLVideoElement, timestamp: number): HandLandmarkerResult | null {
    if (!this.handLandmarker || this.isProcessing || video.readyState < 2) {
      return null;
    }

    // Enforce strictly monotonic timestamps for MediaPipe VIDEO mode
    const safeTimestamp = Math.max(timestamp, this.lastTimestampMs + 1);
    this.lastTimestampMs = safeTimestamp;

    try {
      this.isProcessing = true;
      const result = this.handLandmarker.detectForVideo(video, safeTimestamp);
      this.isProcessing = false;
      return result;
    } catch {
      this.isProcessing = false;
      return null;
    }
  }

  // 2. Initialize Face Landmarker (with blendshapes and matrix)
  async initFaceLandmarker(modelPath = '/models/face_landmarker.task'): Promise<boolean> {
    if (this.faceLandmarker) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    try {
      const vision = await this.getVisionResolver();
      const { FaceLandmarker } = await import('@mediapipe/tasks-vision');

      try {
        this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
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
        this.activeBackend = 'GPU';
      } catch {
        this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          numFaces: 1,
        });
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

  detectFace(video: HTMLVideoElement, timestamp: number): FaceLandmarkerResult | null {
    if (!this.faceLandmarker || this.isProcessing || video.readyState < 2) {
      return null;
    }

    const safeTimestamp = Math.max(timestamp, this.lastTimestampMs + 1);
    this.lastTimestampMs = safeTimestamp;

    try {
      this.isProcessing = true;
      const result = this.faceLandmarker.detectForVideo(video, safeTimestamp);
      this.isProcessing = false;
      return result;
    } catch {
      this.isProcessing = false;
      return null;
    }
  }

  // 3. Initialize Pose Landmarker
  async initPoseLandmarker(modelPath = '/models/pose_landmarker_full.task'): Promise<boolean> {
    if (this.poseLandmarker) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    try {
      const vision = await this.getVisionResolver();
      const { PoseLandmarker } = await import('@mediapipe/tasks-vision');

      try {
        this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
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
        this.activeBackend = 'GPU';
      } catch {
        this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
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

    this.isInitializing = true;
    try {
      const vision = await this.getVisionResolver();
      const { ImageClassifier } = await import('@mediapipe/tasks-vision');

      try {
        this.imageClassifier = await ImageClassifier.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'GPU',
          },
          runningMode: 'IMAGE',
          maxResults: 5,
        });
        this.activeBackend = 'GPU';
      } catch {
        this.imageClassifier = await ImageClassifier.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'CPU',
          },
          runningMode: 'IMAGE',
          maxResults: 5,
        });
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
    if (this.handLandmarker) {
      try {
        this.handLandmarker.close();
      } catch {}
      this.handLandmarker = null;
    }
    if (this.faceLandmarker) {
      try {
        this.faceLandmarker.close();
      } catch {}
      this.faceLandmarker = null;
    }
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
    this.lastTimestampMs = 0;
  }
}
