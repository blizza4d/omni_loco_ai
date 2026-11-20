/**
 * OMNI LOCO AI 2.0 — SHARED CAMERA MANAGER
 * Centralized, reference-counted hardware camera stream lifecycle manager.
 * Prevents device locking conflicts, eliminates redundant getUserMedia calls,
 * and ensures safe teardown when all consumers release the stream.
 */

export interface CameraResolution {
  width: number;
  height: number;
}

export interface SharedCameraOptions {
  preferredFacingMode?: 'user' | 'environment';
  preferredResolution?: CameraResolution;
  deviceId?: string;
  isSyntheticMode?: boolean;
}

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
}

export type CameraPermissionStatus = 'prompt' | 'granted' | 'denied' | 'error';

export interface CameraTelemetry {
  isStreaming: boolean;
  consumerCount: number;
  activeConsumers: string[];
  permissionState: CameraPermissionStatus;
  currentDeviceId: string | null;
  facingMode: 'user' | 'environment';
  resolution: CameraResolution | null;
  errorMessage: string | null;
}

export class SharedCameraManager {
  private static instance: SharedCameraManager | null = null;

  private physicalStream: MediaStream | null = null;
  private consumers: Set<string> = new Set();
  private isAcquiring = false;
  private permissionState: CameraPermissionStatus = 'prompt';
  private errorMessage: string | null = null;
  private devices: CameraDeviceInfo[] = [];
  private currentDeviceId: string | null = null;
  private currentFacingMode: 'user' | 'environment' = 'user';
  private currentResolution: CameraResolution | null = null;
  private isSyntheticActive = false;

  private listeners: Set<(telemetry: CameraTelemetry) => void> = new Set();

  private constructor() {
    if (typeof window !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', () => {
        this.enumerateDevices();
      });
    }
  }

  public static getInstance(): SharedCameraManager {
    if (!SharedCameraManager.instance) {
      SharedCameraManager.instance = new SharedCameraManager();
    }
    return SharedCameraManager.instance;
  }

  /**
   * Acquire a shared camera stream handle for a consumer.
   * If a stream is already active with live tracks, returns the existing stream and registers the consumer.
   * Otherwise requests hardware access and starts the physical stream.
   */
  public async acquireStream(
    consumerId: string,
    options: SharedCameraOptions = {}
  ): Promise<MediaStream | null> {
    const {
      preferredFacingMode = 'user',
      preferredResolution = { width: 640, height: 480 },
      deviceId,
      isSyntheticMode = false,
    } = options;

    this.isSyntheticActive = isSyntheticMode;

    if (isSyntheticMode) {
      this.consumers.add(consumerId);
      this.permissionState = 'granted';
      this.notifyListeners();
      return this.getSyntheticStream(preferredResolution);
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.permissionState = 'error';
      this.errorMessage = 'MediaDevices getUserMedia API is unavailable in this environment.';
      this.notifyListeners();
      return null;
    }

    // If an existing stream with live tracks exists, reuse it immediately
    if (this.physicalStream && !deviceId && !this.isAcquiring) {
      const liveTracks = this.physicalStream.getVideoTracks().filter((t) => t.readyState === 'live');
      if (liveTracks.length > 0) {
        this.consumers.add(consumerId);
        this.permissionState = 'granted';
        this.notifyListeners();
        return this.physicalStream;
      }
    }

    // Wait if an acquisition is already in flight to prevent concurrent getUserMedia locks
    while (this.isAcquiring) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (this.physicalStream) {
        const liveTracks = this.physicalStream.getVideoTracks().filter((t) => t.readyState === 'live');
        if (liveTracks.length > 0) {
          this.consumers.add(consumerId);
          this.notifyListeners();
          return this.physicalStream;
        }
      }
    }

    this.isAcquiring = true;
    this.errorMessage = null;

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        width: { ideal: preferredResolution.width },
        height: { ideal: preferredResolution.height },
        ...(deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: preferredFacingMode }),
      },
    };

    try {
      // If switching devices, close existing physical tracks first
      if (this.physicalStream && deviceId && deviceId !== this.currentDeviceId) {
        this.stopPhysicalTracks();
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.physicalStream = stream;
      this.consumers.add(consumerId);
      this.permissionState = 'granted';
      this.currentFacingMode = preferredFacingMode;

      const track = stream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings();
        if (settings.deviceId) this.currentDeviceId = settings.deviceId;
        if (settings.width && settings.height) {
          this.currentResolution = { width: settings.width, height: settings.height };
        }
      }

      await this.enumerateDevices();
      this.isAcquiring = false;
      this.notifyListeners();
      return stream;
    } catch (err: unknown) {
      this.isAcquiring = false;
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.permissionState = 'denied';
        this.errorMessage = 'Camera access was denied by user permission policy.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        this.permissionState = 'error';
        this.errorMessage = 'No video capture hardware was detected.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        this.permissionState = 'error';
        this.errorMessage = 'Webcam is locked by another process or application.';
      } else {
        this.permissionState = 'error';
        this.errorMessage = error.message || 'Failed to acquire camera stream.';
      }
      this.notifyListeners();
      return null;
    }
  }

  /**
   * Release a stream handle for a consumer.
   * Decrements reference count. If consumer count reaches 0, releases physical camera hardware cleanly.
   */
  public releaseStream(consumerId: string): void {
    this.consumers.delete(consumerId);

    // If no active consumers remain, release the hardware tracks
    if (this.consumers.size === 0) {
      this.stopPhysicalTracks();
      this.currentResolution = null;
    }
    this.notifyListeners();
  }

  /**
   * Stop physical camera tracks immediately.
   */
  private stopPhysicalTracks(): void {
    if (this.physicalStream) {
      this.physicalStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore close errors
        }
      });
      this.physicalStream = null;
    }
  }

  /**
   * Switch video input device.
   */
  public async switchDevice(deviceId: string): Promise<MediaStream | null> {
    this.currentDeviceId = deviceId;
    const activeConsumers = Array.from(this.consumers);
    this.stopPhysicalTracks();
    if (activeConsumers.length > 0) {
      return await this.acquireStream(activeConsumers[0], {
        deviceId,
        preferredFacingMode: this.currentFacingMode,
      });
    }
    return null;
  }

  /**
   * Enumerate available video inputs.
   */
  public async enumerateDevices(): Promise<CameraDeviceInfo[]> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      this.devices = allDevices
        .filter((d) => d.kind === 'videoinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${index + 1}`,
        }));
      return this.devices;
    } catch {
      return [];
    }
  }

  /**
   * Create an in-memory synthetic stream fallback for headless testing or camera-free environments.
   */
  private getSyntheticStream(resolution: CameraResolution): MediaStream {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = resolution.width;
      canvas.height = resolution.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#121212';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      if ('captureStream' in canvas) {
        return (canvas as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream }).captureStream(30);
      }
    }
    if (typeof MediaStream !== 'undefined') {
      return new MediaStream();
    }
    return {
      getVideoTracks: () => [{ readyState: 'live', getSettings: () => ({}) }],
      getTracks: () => [],
    } as unknown as MediaStream;
  }

  /**
   * Subscribe to camera telemetry changes.
   */
  public subscribe(listener: (telemetry: CameraTelemetry) => void): () => void {
    this.listeners.add(listener);
    listener(this.getTelemetry());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const telemetry = this.getTelemetry();
    this.listeners.forEach((l) => {
      try {
        l(telemetry);
      } catch (err) {
        console.warn('[SharedCameraManager] Listener error:', err);
      }
    });
  }

  /**
   * Get current telemetry snapshot.
   */
  public getTelemetry(): CameraTelemetry {
    const isStreaming =
      this.isSyntheticActive ||
      (this.physicalStream !== null &&
        this.physicalStream.getVideoTracks().some((t) => t.readyState === 'live'));

    return {
      isStreaming,
      consumerCount: this.consumers.size,
      activeConsumers: Array.from(this.consumers),
      permissionState: this.permissionState,
      currentDeviceId: this.currentDeviceId,
      facingMode: this.currentFacingMode,
      resolution: this.currentResolution,
      errorMessage: this.errorMessage,
    };
  }

  public getStream(): MediaStream | null {
    return this.physicalStream;
  }

  public getDevices(): CameraDeviceInfo[] {
    return [...this.devices];
  }
}
