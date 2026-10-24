/**
 * Worker Bridge & Frame Transport Protocol
 * Provides zero-copy ImageBitmap transferable passing to sandboxed Web Workers
 * with lifecycle termination and error boundary handling.
 */

export interface InferenceFrameMessage {
  type: 'process-frame';
  bitmap: ImageBitmap;
  timestamp: number;
}

export interface InferenceInitMessage {
  type: 'init';
  delegate: 'GPU' | 'CPU';
  modelUrl?: string;
  options?: Record<string, unknown>;
}

export interface InferenceTerminateMessage {
  type: 'terminate';
}

export type WorkerInMessage =
  | InferenceInitMessage
  | InferenceFrameMessage
  | InferenceTerminateMessage;

export interface InferenceResultMessage<T = unknown> {
  type: 'result';
  data: T;
  timestamp: number;
  inferenceDurationMs: number;
}

export interface InferenceErrorMessage {
  type: 'error';
  error: string;
}

export interface InferenceReadyMessage {
  type: 'ready';
  backend: 'webgpu' | 'webgl' | 'wasm';
}

export type WorkerOutMessage<T = unknown> =
  | InferenceResultMessage<T>
  | InferenceErrorMessage
  | InferenceReadyMessage;

export class WorkerBridge<TResult = unknown> {
  private worker: Worker | null = null;
  private isReady = false;
  private pendingResolvers = new Map<number, (res: TResult) => void>();

  constructor(
    private workerFactory: () => Worker,
    private onResult?: (result: TResult, durationMs: number) => void,
    private onError?: (error: string) => void,
    private onReady?: (backend: string) => void
  ) {}

  init(delegate: 'GPU' | 'CPU' = 'GPU', options: Record<string, unknown> = {}): void {
    this.terminate();

    try {
      this.worker = this.workerFactory();
      this.worker.onmessage = this.handleMessage;
      this.worker.onerror = (e) => {
        if (this.onError) this.onError(e.message || 'Worker thread execution error');
      };

      const initMsg: InferenceInitMessage = {
        type: 'init',
        delegate,
        options,
      };
      this.worker.postMessage(initMsg);
    } catch (err: unknown) {
      const e = err as Error;
      if (this.onError) this.onError(e.message || 'Failed to spawn worker thread');
    }
  }

  private handleMessage = (e: MessageEvent<WorkerOutMessage<TResult>>): void => {
    const msg = e.data;
    if (msg.type === 'ready') {
      this.isReady = true;
      if (this.onReady) this.onReady(msg.backend);
    } else if (msg.type === 'result') {
      if (this.onResult) {
        this.onResult(msg.data, msg.inferenceDurationMs);
      }
    } else if (msg.type === 'error') {
      if (this.onError) this.onError(msg.error);
    }
  };

  sendFrame(bitmap: ImageBitmap, timestamp: number): boolean {
    if (!this.worker || !this.isReady) {
      bitmap.close();
      return false;
    }

    try {
      const msg: InferenceFrameMessage = {
        type: 'process-frame',
        bitmap,
        timestamp,
      };
      // Zero-copy transfer of the ImageBitmap buffer
      this.worker.postMessage(msg, [bitmap]);
      return true;
    } catch {
      bitmap.close();
      return false;
    }
  }

  terminate(): void {
    if (this.worker) {
      try {
        this.worker.postMessage({ type: 'terminate' });
        this.worker.terminate();
      } catch {
        // Ignore terminate failure
      }
      this.worker = null;
    }
    this.isReady = false;
  }
}
