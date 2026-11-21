import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NetworkMonitor } from '@/core/network/network-monitor';
import {
  clearModelAssetCache,
  clearTemporaryCaches,
  getStorageQuota,
  isModelCached,
} from '@/core/cache';
import {
  ModelLifecycleManager,
  detectSupportedBackends,
} from '@/core/models/model-lifecycle-manager';
import { SharedCameraManager } from '@/core/camera/shared-camera-manager';
import { AdaptiveFrameScheduler } from '@/core/scheduler/adaptive-scheduler';
import {
  CENTRAL_MODEL_MANIFEST,
  verifyModelAsset,
} from '@/core/models/manifest';

describe('Omni Loco AI — APEX 3.0 Platform Architecture Test Suite', () => {
  // =========================================================================
  // 1. RUNTIME NETWORK MONITOR & PRIVACY AUDITOR
  // =========================================================================
  describe('NetworkMonitor & Transparency Auditor', () => {
    it('enforces singleton pattern and initializes telemetry state', () => {
      const mon1 = NetworkMonitor.getInstance();
      const mon2 = NetworkMonitor.getInstance();
      expect(mon1).toBe(mon2);

      const telemetry = mon1.getTelemetry();
      expect(telemetry.privacyStatus).toBe('COMPLIANT_ZERO_UPLOAD');
      expect(telemetry.totalBiometricBytesUploaded).toBe(0);
      expect(Array.isArray(telemetry.requests)).toBe(true);
    });

    it('correctly categorizes requests into MODEL_WEIGHT, RUNTIME_WASM, and STATIC_CHUNK', () => {
      const mon = NetworkMonitor.getInstance();
      mon.clearLedger();

      // Simulate tracked network entries
      mon.recordRequest({
        url: 'http://localhost:3000/models/hand_landmarker.task',
        method: 'GET',
        status: 200,
        bytesTransferred: 7800000,
        durationMs: 45,
        initiatorType: 'fetch',
      });

      mon.recordRequest({
        url: 'http://localhost:3000/wasm/ort-wasm-simd-threaded.wasm',
        method: 'GET',
        status: 200,
        bytesTransferred: 1200000,
        durationMs: 30,
        initiatorType: 'fetch',
      });

      mon.recordRequest({
        url: 'http://localhost:3000/_next/static/chunks/app.js',
        method: 'GET',
        status: 200,
        bytesTransferred: 250000,
        durationMs: 15,
        initiatorType: 'script',
      });

      const tel = mon.getTelemetry();
      expect(tel.totalRequestsObserved).toBe(3);
      expect(tel.totalBiometricBytesUploaded).toBe(0);

      const weightReq = tel.requests.find((r) => r.category === 'MODEL_WEIGHT');
      expect(weightReq).toBeDefined();
      expect(weightReq?.url).toContain('hand_landmarker.task');

      const wasmReq = tel.requests.find((r) => r.category === 'RUNTIME_WASM');
      expect(wasmReq).toBeDefined();
      expect(wasmReq?.url).toContain('ort-wasm-simd-threaded.wasm');

      const chunkReq = tel.requests.find((r) => r.category === 'STATIC_CHUNK');
      expect(chunkReq).toBeDefined();
      expect(chunkReq?.url).toContain('chunks/app.js');
    });

    it('flags outgoing payload on non-model requests and maintains privacy compliance', () => {
      const mon = NetworkMonitor.getInstance();
      mon.clearLedger();

      mon.recordRequest({
        url: 'http://localhost:3000/api/local-session',
        method: 'POST',
        status: 200,
        bytesTransferred: 512,
        durationMs: 10,
        initiatorType: 'fetch',
      });

      const tel = mon.getTelemetry();
      expect(tel.totalRequestsObserved).toBe(1);
      // Non-biometric internal API traffic
      expect(tel.requests[0].category).toBe('API_INTERNAL');
    });
  });

  // =========================================================================
  // 2. SAFE STORAGE & CACHE PRESERVATION
  // =========================================================================
  describe('Safe Storage & Granular Cache Manager', () => {
    it('provides valid storage quota schema', async () => {
      const quota = await getStorageQuota();
      expect(typeof quota.usageBytes).toBe('number');
      expect(typeof quota.quotaBytes).toBe('number');
      expect(typeof quota.usagePercentage).toBe('number');
      expect(typeof quota.isSupported).toBe('boolean');
    });

    it('safely handles model cache purge without throwing in non-browser env', async () => {
      const res = await clearModelAssetCache();
      expect(typeof res).toBe('boolean');

      const tempRes = await clearTemporaryCaches();
      expect(typeof tempRes).toBe('boolean');
    });

    it('handles native:// pseudo-protocol as cached DSP without network fetch', async () => {
      const isCached = await isModelCached('native://web-audio-dsp');
      expect(isCached).toBe(true);
    });
  });

  // =========================================================================
  // 3. MODEL LIFECYCLE MANAGER 2.0 (DEDUPLICATION & REF COUNTING)
  // =========================================================================
  describe('ModelLifecycleManager 2.0', () => {
    it('detects available execution backends for current platform', () => {
      const backends = detectSupportedBackends();
      expect(backends).toContain('CPU');
      expect(backends).toContain('WASM'); // WebAssembly exists in Node/modern browsers
    });

    it('deduplicates concurrent loading requests into a single flight', async () => {
      const manager = ModelLifecycleManager.getInstance();
      let factoryInvocations = 0;

      manager.registerModel({
        id: 'apex_dedup_test',
        displayName: 'Apex Deduplication Model',
        version: '1.0.0',
        assetPath: '/models/dedup.bin',
        assetSize: '5 MB',
        runtime: 'Custom Feature Engine',
        preferredBackend: 'CPU',
        factory: async (backend) => {
          factoryInvocations++;
          await new Promise((resolve) => setTimeout(resolve, 50));
          return { initialized: true, backend };
        },
      });

      // Fire 3 simultaneous load requests
      const [r1, r2, r3] = await Promise.all([
        manager.loadModel('apex_dedup_test'),
        manager.loadModel('apex_dedup_test'),
        manager.loadModel('apex_dedup_test'),
      ]);

      expect(r1).toBe(true);
      expect(r2).toBe(true);
      expect(r3).toBe(true);

      // Single-flight guarantee: Factory should only have been called ONCE
      expect(factoryInvocations).toBe(1);

      const status = manager.getModelStatus('apex_dedup_test');
      expect(status?.state).toBe('READY');
      expect(status?.inMemory).toBe(true);
    });

    it('guards instance disposal when active consumer refCount > 0', async () => {
      const manager = ModelLifecycleManager.getInstance();

      manager.registerModel({
        id: 'apex_refcount_test',
        displayName: 'Apex RefCount Model',
        version: '1.0.0',
        assetPath: '/models/refcount.bin',
        assetSize: '2 MB',
        runtime: 'Custom Feature Engine',
        preferredBackend: 'CPU',
        factory: async () => ({ instanceHandle: 'active_session' }),
      });

      // Acquire instance (increments refCount)
      const instance = await manager.acquireInstance('apex_refcount_test');
      expect(instance).not.toBeNull();

      let status = manager.getModelStatus('apex_refcount_test');
      expect(status?.refCount).toBe(1);

      // Attempt disposal without force: should be rejected
      const disposedSafely = await manager.disposeModel('apex_refcount_test', false);
      expect(disposedSafely).toBe(false);

      status = manager.getModelStatus('apex_refcount_test');
      expect(status?.state).toBe('READY');
      expect(status?.inMemory).toBe(true);

      // Release consumer reference
      manager.releaseInstance('apex_refcount_test');
      status = manager.getModelStatus('apex_refcount_test');
      expect(status?.refCount).toBe(0);

      // Now disposal should succeed
      const disposedNow = await manager.disposeModel('apex_refcount_test', false);
      expect(disposedNow).toBe(true);

      status = manager.getModelStatus('apex_refcount_test');
      expect(status?.state).toBe('UNLOADED');
      expect(status?.inMemory).toBe(false);
    });

    it('allows forced disposal even if refCount > 0 when force is true', async () => {
      const manager = ModelLifecycleManager.getInstance();

      manager.registerModel({
        id: 'apex_forced_dispose',
        displayName: 'Apex Force Dispose Model',
        version: '1.0.0',
        assetPath: '/models/force.bin',
        assetSize: '1 MB',
        runtime: 'Custom Feature Engine',
        preferredBackend: 'CPU',
        factory: async () => ({ active: true }),
      });

      await manager.acquireInstance('apex_forced_dispose');
      const disposed = await manager.disposeModel('apex_forced_dispose', true);
      expect(disposed).toBe(true);

      const status = manager.getModelStatus('apex_forced_dispose');
      expect(status?.state).toBe('UNLOADED');
    });
  });

  // =========================================================================
  // 4. SHARED CAMERA MANAGER 2.0 (PROFILE COMPATIBILITY & CONCURRENCY)
  // =========================================================================
  describe('SharedCameraManager 2.0', () => {
    it('reuses active stream when profile is compatible in synthetic mode', async () => {
      const cam = SharedCameraManager.getInstance();

      const stream1 = await cam.acquireStream('apex-consumer-1', { isSyntheticMode: true });
      expect(stream1).not.toBeNull();

      const stream2 = await cam.acquireStream('apex-consumer-2', { isSyntheticMode: true });
      expect(stream2).not.toBeNull();

      const tel = cam.getTelemetry();
      expect(tel.consumerCount).toBe(2);
      expect(tel.activeConsumers).toContain('apex-consumer-1');
      expect(tel.activeConsumers).toContain('apex-consumer-2');

      // Cleanup
      cam.releaseStream('apex-consumer-1');
      cam.releaseStream('apex-consumer-2');
      expect(cam.getTelemetry().consumerCount).toBe(0);
    });

    it('provides coordinated facing mode switching method', async () => {
      const cam = SharedCameraManager.getInstance();

      await cam.acquireStream('facing-test', {
        preferredFacingMode: 'user',
        isSyntheticMode: true,
      });

      expect(cam.getTelemetry().facingMode).toBe('user');

      // Coordinated switch
      await cam.switchFacingMode('environment');
      expect(cam.getTelemetry().facingMode).toBe('environment');

      cam.releaseStream('facing-test');
    });
  });

  // =========================================================================
  // 5. ADAPTIVE SCHEDULER 2.0 (FRAME ACCOUNTING & LEAK PREVENTION)
  // =========================================================================
  describe('AdaptiveFrameScheduler 2.0', () => {
    it('initializes latency stats with cumulative lifetime counters', () => {
      const scheduler = new AdaptiveFrameScheduler(30);
      const stats = scheduler.getStats();

      expect(stats.attemptedFrames).toBe(0);
      expect(stats.processedFrames).toBe(0);
      expect(stats.droppedFrames).toBe(0);
      expect(stats.isBusy).toBe(false);
      expect(stats.renderFps).toBe(0);
      expect(stats.videoFps).toBe(0);
    });

    it('tracks lifetime cumulative frames without rolling truncation', async () => {
      const scheduler = new AdaptiveFrameScheduler(30);
      let closedCount = 0;

      // Mock ImageBitmap with explicit close tracker
      const mockBitmap = {
        width: 640,
        height: 480,
        close: vi.fn(() => {
          closedCount++;
        }),
      } as unknown as ImageBitmap;

      // Mock global createImageBitmap
      vi.stubGlobal('createImageBitmap', async () => mockBitmap);

      const mockVideo = {
        readyState: 4, // HAVE_ENOUGH_DATA
      } as unknown as HTMLVideoElement;

      scheduler.setVideoElement(mockVideo);

      let processedCount = 0;
      scheduler.start(async (_bitmap, _ts) => {
        processedCount++;
      });

      // Force process 5 simulated ticks
      const schedulerInternal = scheduler as unknown as {
        processFrame: (ts: number) => Promise<void>;
      };

      for (let i = 0; i < 5; i++) {
        await schedulerInternal.processFrame(i * 33.3);
      }

      const stats = scheduler.getStats();
      expect(stats.attemptedFrames).toBe(5);
      expect(stats.processedFrames).toBe(5);
      expect(stats.droppedFrames).toBe(0);

      // Verify ImageBitmap memory leak prevention: Every single frame was explicitly closed!
      expect(closedCount).toBe(5);

      scheduler.stop();
      vi.unstubAllGlobals();
    });

    it('closes ImageBitmap even if onFrameCallback throws an error', async () => {
      const scheduler = new AdaptiveFrameScheduler(30);
      let closedCount = 0;

      const mockBitmap = {
        close: vi.fn(() => {
          closedCount++;
        }),
      } as unknown as ImageBitmap;

      vi.stubGlobal('createImageBitmap', async () => mockBitmap);

      const mockVideo = {
        readyState: 4,
      } as unknown as HTMLVideoElement;

      scheduler.setVideoElement(mockVideo);

      scheduler.start(async () => {
        throw new Error('Neural inference failure');
      });

      const schedulerInternal = scheduler as unknown as {
        processFrame: (ts: number) => Promise<void>;
      };

      await schedulerInternal.processFrame(100);

      const stats = scheduler.getStats();
      expect(stats.attemptedFrames).toBe(1);
      expect(stats.droppedFrames).toBe(1);

      // Guarantee leak prevention on exception path
      expect(closedCount).toBe(1);

      scheduler.stop();
      vi.unstubAllGlobals();
    });
  });

  // =========================================================================
  // 6. CENTRAL MODEL MANIFEST & ASSET VERIFICATION
  // =========================================================================
  describe('Central Model Manifest & Asset Verifier', () => {
    it('contains all 9 foundational platform models with truth-in-weights attribution', () => {
      expect(CENTRAL_MODEL_MANIFEST.length).toBeGreaterThanOrEqual(9);

      const hand = CENTRAL_MODEL_MANIFEST.find((m) => m.id === 'hand_landmarker');
      expect(hand).toBeDefined();
      expect(hand?.hasNeuralWeights).toBe(true);
      expect(hand?.weightAssetPath).toBe('/models/hand_landmarker.task');

      // Verify that YOLO and MiDaS heuristic WASM modules do NOT falsely claim neural weights
      const yolo = CENTRAL_MODEL_MANIFEST.find((m) => m.id === 'objects_runtime');
      expect(yolo).toBeDefined();
      expect(yolo?.hasNeuralWeights).toBe(false);
      expect(yolo?.runtimeBinaryPath).toContain('ort-wasm-simd-threaded.wasm');

      const midas = CENTRAL_MODEL_MANIFEST.find((m) => m.id === 'depth_runtime');
      expect(midas).toBeDefined();
      expect(midas?.hasNeuralWeights).toBe(false);

      // Verify Web Audio DSP has 0 MB download
      const speech = CENTRAL_MODEL_MANIFEST.find((m) => m.id === 'speech_dsp');
      expect(speech).toBeDefined();
      expect(speech?.hasNeuralWeights).toBe(false);
      expect(speech?.storageSizeBytes).toBe(0);
    });

    it('accurately verifies native DSP model without network overhead', async () => {
      const speech = CENTRAL_MODEL_MANIFEST.find((m) => m.id === 'speech_dsp')!;
      const result = await verifyModelAsset(speech);

      expect(result.modelId).toBe('speech_dsp');
      expect(result.weightExists).toBe(true);
      expect(result.runtimeExists).toBe(true);
      expect(result.actualSizeBytes).toBe(0);
    });
  });
});
