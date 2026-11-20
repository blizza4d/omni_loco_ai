/**
 * OMNI LOCO AI 2.0 — SHARED RUNTIME & RESOURCE MANAGER
 * Tracks and safely reclaims WebGL contexts, Three.js renderers, AudioContexts,
 * Web Workers, animation loops, and large canvas allocations.
 * Prevents memory growth and context-exhaustion warnings during repeated route transitions.
 */

export interface RegisteredResource {
  id: string;
  moduleId: string;
  type: 'WEBGL' | 'THREE_RENDERER' | 'AUDIO_CONTEXT' | 'WORKER' | 'CANVAS' | 'RAF_LOOP';
  registeredAt: number;
  dispose: () => void | Promise<void>;
}

export interface ResourceTelemetry {
  webGlContexts: number;
  threeRenderers: number;
  audioContexts: number;
  workers: number;
  canvases: number;
  rafLoops: number;
  totalActive: number;
}

export class SharedResourceManager {
  private static instance: SharedResourceManager | null = null;

  private resources: Map<string, RegisteredResource> = new Map();
  private rafLoops: Map<string, number> = new Map();
  private listeners: Set<(telemetry: ResourceTelemetry) => void> = new Set();

  private constructor() {}

  public static getInstance(): SharedResourceManager {
    if (!SharedResourceManager.instance) {
      SharedResourceManager.instance = new SharedResourceManager();
    }
    return SharedResourceManager.instance;
  }

  /**
   * Register a Three.js WebGLRenderer or raw WebGLRenderingContext.
   */
  public registerWebGLContext(
    moduleId: string,
    contextOrRenderer: { dispose?: () => void; forceContextLoss?: () => void }
  ): string {
    const id = `webgl-${moduleId}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    this.resources.set(id, {
      id,
      moduleId,
      type: 'THREE_RENDERER',
      registeredAt: Date.now(),
      dispose: () => {
        try {
          if (contextOrRenderer.dispose) {
            contextOrRenderer.dispose();
          }
          if (contextOrRenderer.forceContextLoss) {
            contextOrRenderer.forceContextLoss();
          }
        } catch (err) {
          console.warn(`[SharedResourceManager] Error disposing WebGL resource ${id}:`, err);
        }
      },
    });
    this.notifyListeners();
    return id;
  }

  /**
   * Register an AudioContext or webkitAudioContext.
   */
  public registerAudioContext(moduleId: string, audioCtx: AudioContext): string {
    const id = `audio-${moduleId}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    this.resources.set(id, {
      id,
      moduleId,
      type: 'AUDIO_CONTEXT',
      registeredAt: Date.now(),
      dispose: async () => {
        try {
          if (audioCtx.state !== 'closed') {
            await audioCtx.close();
          }
        } catch (err) {
          console.warn(`[SharedResourceManager] Error closing AudioContext ${id}:`, err);
        }
      },
    });
    this.notifyListeners();
    return id;
  }

  /**
   * Register a dedicated Web Worker.
   */
  public registerWorker(moduleId: string, worker: Worker): string {
    const id = `worker-${moduleId}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    this.resources.set(id, {
      id,
      moduleId,
      type: 'WORKER',
      registeredAt: Date.now(),
      dispose: () => {
        try {
          worker.terminate();
        } catch (err) {
          console.warn(`[SharedResourceManager] Error terminating worker ${id}:`, err);
        }
      },
    });
    this.notifyListeners();
    return id;
  }

  /**
   * Register an offscreen or large scratch canvas for automatic clearing.
   */
  public registerCanvas(moduleId: string, canvas: HTMLCanvasElement): string {
    const id = `canvas-${moduleId}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    this.resources.set(id, {
      id,
      moduleId,
      type: 'CANVAS',
      registeredAt: Date.now(),
      dispose: () => {
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 1, 1);
        }
      },
    });
    this.notifyListeners();
    return id;
  }

  /**
   * Register a requestAnimationFrame loop with automatic cancellation support.
   */
  public registerRafLoop(moduleId: string, rafId: number): string {
    const id = `raf-${moduleId}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    this.rafLoops.set(id, rafId);
    this.resources.set(id, {
      id,
      moduleId,
      type: 'RAF_LOOP',
      registeredAt: Date.now(),
      dispose: () => {
        const currentRaf = this.rafLoops.get(id);
        if (currentRaf !== undefined && typeof cancelAnimationFrame !== 'undefined') {
          cancelAnimationFrame(currentRaf);
        }
        this.rafLoops.delete(id);
      },
    });
    this.notifyListeners();
    return id;
  }

  public updateRafLoop(id: string, newRafId: number): void {
    if (this.rafLoops.has(id)) {
      this.rafLoops.set(id, newRafId);
    }
  }

  /**
   * Release a single resource by its ID.
   */
  public async releaseResource(id: string): Promise<void> {
    const res = this.resources.get(id);
    if (!res) return;

    try {
      await res.dispose();
    } finally {
      this.resources.delete(id);
      this.rafLoops.delete(id);
      this.notifyListeners();
    }
  }

  /**
   * Clean up all resources belonging to a specific module when it unmounts.
   */
  public async cleanupModuleResources(moduleId: string): Promise<void> {
    const toDispose: RegisteredResource[] = [];
    this.resources.forEach((res) => {
      if (res.moduleId === moduleId) {
        toDispose.push(res);
      }
    });

    for (const res of toDispose) {
      try {
        await res.dispose();
      } catch (err) {
        console.warn(`[SharedResourceManager] Error cleaning resource ${res.id}:`, err);
      }
      this.resources.delete(res.id);
      this.rafLoops.delete(res.id);
    }

    this.notifyListeners();
  }

  /**
   * Get active resource telemetry.
   */
  public getTelemetry(): ResourceTelemetry {
    let webGlContexts = 0;
    let threeRenderers = 0;
    let audioContexts = 0;
    let workers = 0;
    let canvases = 0;
    let rafLoops = 0;

    this.resources.forEach((res) => {
      switch (res.type) {
        case 'WEBGL':
          webGlContexts++;
          break;
        case 'THREE_RENDERER':
          threeRenderers++;
          break;
        case 'AUDIO_CONTEXT':
          audioContexts++;
          break;
        case 'WORKER':
          workers++;
          break;
        case 'CANVAS':
          canvases++;
          break;
        case 'RAF_LOOP':
          rafLoops++;
          break;
      }
    });

    return {
      webGlContexts,
      threeRenderers,
      audioContexts,
      workers,
      canvases,
      rafLoops,
      totalActive: this.resources.size,
    };
  }

  /**
   * Subscribe to resource changes.
   */
  public subscribe(listener: (telemetry: ResourceTelemetry) => void): () => void {
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
        console.warn('[SharedResourceManager] Listener error:', err);
      }
    });
  }
}
