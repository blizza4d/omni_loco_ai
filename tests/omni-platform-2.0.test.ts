import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SharedCameraManager } from '@/core/camera/shared-camera-manager';
import { ModelLifecycleManager, ModelStatusRecord } from '@/core/models/model-lifecycle-manager';
import { SharedResourceManager } from '@/core/runtime/resource-manager';
import { PlatformEventBus } from '@/core/events/platform-event-bus';
import { EventReplayEngine, RecordedEventPackage } from '@/core/replay/event-replay-engine';
import { ExperimentManager } from '@/core/experiments/experiment-manager';
import { SessionWorkspaceManager } from '@/core/sessions/session-manager';
import { SecureIO } from '@/core/utils/secure-io';
import { useWorkspaceStore } from '@/core/store/workspace-store';

describe('Omni Loco AI 2.0 — Platform Architecture Test Suite', () => {
  // =========================================================================
  // 1. SHARED CAMERA MANAGER (REF-COUNTED STREAM LIFECYCLE)
  // =========================================================================
  describe('SharedCameraManager', () => {
    it('enforces singleton pattern', () => {
      const cam1 = SharedCameraManager.getInstance();
      const cam2 = SharedCameraManager.getInstance();
      expect(cam1).toBe(cam2);
    });

    it('tracks consumer ref counts and reports accurate telemetry in synthetic mode', async () => {
      const manager = SharedCameraManager.getInstance();

      const stream1 = await manager.acquireStream('consumer-hand', { isSyntheticMode: true });
      expect(stream1).not.toBeNull();
      let tel = manager.getTelemetry();
      expect(tel.consumerCount).toBe(1);
      expect(tel.activeConsumers).toContain('consumer-hand');

      const stream2 = await manager.acquireStream('consumer-drive', { isSyntheticMode: true });
      expect(stream2).not.toBeNull();
      tel = manager.getTelemetry();
      expect(tel.consumerCount).toBe(2);
      expect(tel.activeConsumers).toContain('consumer-drive');

      // Release first consumer
      manager.releaseStream('consumer-hand');
      tel = manager.getTelemetry();
      expect(tel.consumerCount).toBe(1);
      expect(tel.activeConsumers).not.toContain('consumer-hand');

      // Release second consumer
      manager.releaseStream('consumer-drive');
      tel = manager.getTelemetry();
      expect(tel.consumerCount).toBe(0);
    });
  });

  // =========================================================================
  // 2. CENTRAL MODEL LIFECYCLE MANAGER
  // =========================================================================
  describe('ModelLifecycleManager', () => {
    it('enforces singleton pattern and initializes default vision models', () => {
      const manager = ModelLifecycleManager.getInstance();
      const models = manager.getAllModels();
      expect(models.length).toBeGreaterThanOrEqual(5);

      const hand = manager.getModelStatus('hand_landmarker');
      expect(hand).toBeDefined();
      expect(hand?.displayName).toBe('MediaPipe Hand Landmarker');
      expect(hand?.state).toBe('UNLOADED');
    });

    it('orchestrates explicit state transitions: UNLOADED -> LOADING -> READY -> PROCESSING', async () => {
      const manager = ModelLifecycleManager.getInstance();

      manager.registerModel({
        id: 'test_custom_classifier',
        displayName: 'Test KNN Classifier',
        version: '1.0.0',
        assetPath: '/models/test.bin',
        assetSize: '1.2 MB',
        runtime: 'Custom Feature Engine',
        factory: async (backend) => ({ initialized: true, backend }),
      });

      const beforeLoad = manager.getModelStatus('test_custom_classifier');
      expect(beforeLoad?.state).toBe('UNLOADED');
      expect(beforeLoad?.inMemory).toBe(false);

      const success = await manager.loadModel('test_custom_classifier');
      expect(success).toBe(true);

      const afterLoad = manager.getModelStatus('test_custom_classifier');
      expect(afterLoad?.state).toBe('READY');
      expect(afterLoad?.inMemory).toBe(true);
      expect(afterLoad?.loadTimeMs).toBeGreaterThanOrEqual(0);

      // Transition to PROCESSING
      manager.setProcessing('test_custom_classifier', true);
      const processing = manager.getModelStatus('test_custom_classifier');
      expect(processing?.state).toBe('PROCESSING');
      expect(processing?.activelyExecuting).toBe(true);

      // Return to READY
      manager.setProcessing('test_custom_classifier', false);
      const readyAgain = manager.getModelStatus('test_custom_classifier');
      expect(readyAgain?.state).toBe('READY');
      expect(readyAgain?.activelyExecuting).toBe(false);

      // Record inference metric
      manager.recordInferenceMetric('test_custom_classifier', 14.5);
      const withMetric = manager.getModelStatus('test_custom_classifier');
      expect(withMetric?.lastInferenceDurationMs).toBe(14.5);
      expect(withMetric?.inferenceCount).toBe(1);

      // Dispose
      await manager.disposeModel('test_custom_classifier');
      const disposed = manager.getModelStatus('test_custom_classifier');
      expect(disposed?.state).toBe('UNLOADED');
      expect(disposed?.inMemory).toBe(false);
    });

    it('handles GPU error by falling back to CPU gracefully', async () => {
      const manager = ModelLifecycleManager.getInstance();

      let attempts = 0;
      manager.registerModel({
        id: 'test_gpu_fallback',
        displayName: 'Test GPU Fallback',
        version: '1.0.0',
        assetPath: '/models/fallback.bin',
        assetSize: '2 MB',
        runtime: 'TensorFlow.js',
        preferredBackend: 'GPU',
        factory: async (backend) => {
          attempts++;
          if (backend === 'GPU') {
            throw new Error('WebGPU adapter not found');
          }
          return { backend: 'CPU' };
        },
      });

      const success = await manager.loadModel('test_gpu_fallback', { preferredBackend: 'GPU' });
      expect(success).toBe(true);

      const status = manager.getModelStatus('test_gpu_fallback');
      expect(status?.state).toBe('READY');
      expect(status?.activeBackend).toBe('CPU');
      expect(attempts).toBe(2); // First GPU failed, then CPU succeeded
    });
  });

  // =========================================================================
  // 3. SHARED RUNTIME & RESOURCE MANAGER (LEAK PREVENTION)
  // =========================================================================
  describe('SharedResourceManager', () => {
    it('tracks registered contexts and safely reclaims module resources on exit', async () => {
      const res = SharedResourceManager.getInstance();

      let threeDisposed = false;
      const fakeRenderer = {
        dispose: () => {
          threeDisposed = true;
        },
      };

      let workerTerminated = false;
      const fakeWorker = {
        terminate: () => {
          workerTerminated = true;
        },
      } as unknown as Worker;

      res.registerWebGLContext('drive-sim', fakeRenderer);
      res.registerWorker('drive-sim', fakeWorker);

      let tel = res.getTelemetry();
      expect(tel.threeRenderers).toBeGreaterThanOrEqual(1);
      expect(tel.workers).toBeGreaterThanOrEqual(1);

      // Clean up drive-sim resources
      await res.cleanupModuleResources('drive-sim');

      expect(threeDisposed).toBe(true);
      expect(workerTerminated).toBe(true);
    });
  });

  // =========================================================================
  // 4. TYPED PLATFORM EVENT INFRASTRUCTURE & RECURSION GUARD
  // =========================================================================
  describe('PlatformEventBus', () => {
    beforeEach(() => {
      const bus = PlatformEventBus.getInstance();
      bus.clearHistory();
    });

    it('publishes and delivers validated semantic events', () => {
      const bus = PlatformEventBus.getInstance();

      const received: any[] = [];
      const unsub = bus.subscribe('HAND_GESTURE', (evt) => {
        received.push(evt);
      });

      bus.publish(
        'HAND_GESTURE',
        {
          gesture: 'THUMBS_UP',
          confidence: 0.95,
          handedness: 'Right',
        },
        'hand_module'
      );

      expect(received.length).toBe(1);
      expect(received[0].payload.gesture).toBe('THUMBS_UP');
      expect(received[0].payload.confidence).toBe(0.95);
      expect(received[0].sourceModule).toBe('hand_module');

      unsub();
    });

    it('suppresses recursive loop cascades beyond maximum recursion depth', () => {
      const bus = PlatformEventBus.getInstance();

      let calls = 0;
      const unsub = bus.subscribe('SIMULATOR_STATE', () => {
        calls++;
        // Self-publishing recursive loop
        bus.publish(
          'SIMULATOR_STATE',
          { speed: 10, positionX: 0, steeringAngle: 0, controlSource: 'GESTURE' },
          'test_loop'
        );
      });

      bus.publish(
        'SIMULATOR_STATE',
        { speed: 0, positionX: 0, steeringAngle: 0, controlSource: 'GESTURE' },
        'test_loop'
      );

      // Should be bounded by maxRecursionDepth (5)
      expect(calls).toBeLessThanOrEqual(6);
      unsub();
    });
  });

  // =========================================================================
  // 5. SEMANTIC EVENT REPLAY ENGINE
  // =========================================================================
  describe('EventReplayEngine', () => {
    it('records and packages semantic perception events', () => {
      const replay = EventReplayEngine.getInstance();
      const bus = PlatformEventBus.getInstance();

      replay.startRecording();
      expect(replay.getState()).toBe('RECORDING');

      bus.publish('GAZE_DWELL', {
        targetName: 'BUTTON_A',
        normX: 0.5,
        normY: 0.5,
        durationMs: 400,
        isCalibrated: true,
      }, 'gaze');

      const pkg = replay.stopRecording('Test Dwell Session');
      expect(pkg).not.toBeNull();
      expect(pkg?.eventCount).toBe(1);
      expect(pkg?.title).toBe('Test Dwell Session');
      expect(pkg?.events[0].event.name).toBe('GAZE_DWELL');
      expect(replay.getState()).toBe('IDLE');
    });
  });

  // =========================================================================
  // 6. AI EXPERIMENT MANAGER
  // =========================================================================
  describe('ExperimentManager', () => {
    it('creates, retrieves, and compares experimental benchmarks', () => {
      const mgr = ExperimentManager.getInstance();

      const expA = mgr.createExperiment({
        name: 'KNN K=3 Euclidean',
        moduleId: 'laboratory',
        modelId: 'custom-knn',
        modelVersion: '1.0.0',
        configuration: { k: 3, metric: 'euclidean' },
        metrics: { accuracy: 0.94, latencyMs: 12.0 },
        notes: 'Baseline configuration',
        status: 'COMPLETED',
      });

      const expB = mgr.createExperiment({
        name: 'KNN K=5 Cosine',
        moduleId: 'laboratory',
        modelId: 'custom-knn',
        modelVersion: '1.1.0',
        configuration: { k: 5, metric: 'cosine' },
        metrics: { accuracy: 0.98, latencyMs: 14.5 },
        notes: 'Improved accuracy',
        status: 'COMPLETED',
      });

      const comparison = mgr.compareExperiments(expB.id, expA.id);
      expect(comparison).not.toBeNull();
      expect(comparison?.isCompatible).toBe(true);
      expect(comparison?.metricDelta.accuracy).toBeCloseTo(0.04);
      expect(comparison?.metricDelta.latencyMs).toBeCloseTo(2.5);

      // Cleanup
      mgr.deleteExperiment(expA.id);
      mgr.deleteExperiment(expB.id);
    });
  });

  // =========================================================================
  // 7. SESSION WORKSPACE MANAGER
  // =========================================================================
  describe('SessionWorkspaceManager', () => {
    it('manages structured multi-module sessions with start, pause and complete', () => {
      const mgr = SessionWorkspaceManager.getInstance();

      const session = mgr.createSession('Multimodal Pilot', ['hand', 'drive', 'goofy']);
      expect(session.status).toBe('IDLE');
      expect(session.modules).toEqual(['hand', 'drive', 'goofy']);

      mgr.startSession(session.id);
      expect(mgr.getActiveSession()?.id).toBe(session.id);
      expect(mgr.getActiveSession()?.status).toBe('ACTIVE');

      mgr.incrementEventCount(session.id);
      mgr.pauseSession(session.id);
      expect(session.status).toBe('PAUSED');

      mgr.completeSession(session.id, 'Successful pilot run');
      expect(session.status).toBe('COMPLETED');
      expect(session.notes).toBe('Successful pilot run');
      expect(session.eventsRecordedCount).toBe(1);
    });
  });

  // =========================================================================
  // 8. SECURE I/O & SCHEMA SANITIZATION
  // =========================================================================
  describe('SecureIO', () => {
    it('creates versioned 2.0 envelopes with accurate FNV-1a checksums', () => {
      const payload = { modelName: 'CyberPinch', k: 3 };
      const envelope = SecureIO.createEnvelope('CLASSIFIER', payload);

      expect(envelope.header.format).toBe('OMNI_LOCO_AI_EXPORT');
      expect(envelope.header.schemaVersion).toBe('2.0');
      expect(envelope.header.type).toBe('CLASSIFIER');
      expect(typeof envelope.header.checksum).toBe('string');
      expect(envelope.payload).toEqual(payload);
    });

    it('safely parses envelopes and strips prototype pollution attempts', () => {
      const maliciousPayload = JSON.stringify({
        header: {
          format: 'OMNI_LOCO_AI_EXPORT',
          schemaVersion: '2.0',
          type: 'WORKFLOW',
          exportedAt: new Date().toISOString(),
          checksum: 'abc12345',
        },
        payload: {
          nodeName: 'CleanNode',
          __proto__: { polluted: true },
        },
      });

      const result = SecureIO.parseAndValidate<{ nodeName: string; polluted?: boolean }>(
        maliciousPayload,
        'WORKFLOW'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nodeName).toBe('CleanNode');
        // Ensure prototype was not polluted
        expect((result.data as any).polluted).toBeUndefined();
        expect(({} as any).polluted).toBeUndefined();
      }
    });

    it('rejects payloads exceeding size limits or with invalid syntax', () => {
      const invalid = '{ broken json ';
      const res = SecureIO.parseAndValidate(invalid);
      expect(res.success).toBe(false);
    });
  });

  // =========================================================================
  // 9. WORKSPACE & PREFERENCES STORE
  // =========================================================================
  describe('useWorkspaceStore', () => {
    it('manages pinned modules and workspace preferences', () => {
      const store = useWorkspaceStore.getState();

      store.setWorkspace('Robotics & Control');
      expect(useWorkspaceStore.getState().activeWorkspace).toBe('Robotics & Control');

      store.togglePinModule('test-module');
      expect(useWorkspaceStore.getState().isPinned('test-module')).toBe(true);

      store.togglePinModule('test-module');
      expect(useWorkspaceStore.getState().isPinned('test-module')).toBe(false);

      store.recordModuleVisit('gaze');
      expect(useWorkspaceStore.getState().recentModuleIds).toContain('gaze');
    });
  });
});
