import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProtocolEventBus } from '@/modules/forge/event-bus';
import { ProtocolValidator } from '@/modules/forge/protocol-validator';
import { ProtocolExecutionEngine } from '@/modules/forge/execution-engine';
import { BUILT_IN_TEMPLATES } from '@/modules/forge/templates';
import { SessionRecorder } from '@/modules/forge/session-recorder';
import { ProtocolStorage } from '@/modules/forge/protocol-storage';
import { createDefaultNode } from '@/modules/forge/node-registry';
import { ProtocolDefinition, ProtocolConnection } from '@/modules/forge/types';

describe('Omni Protocol Forge — Complete Test Suite', () => {
  beforeEach(() => {
    // Reset singleton state
    const bus = ProtocolEventBus.getInstance();
    bus.clearSubscriptions();
    bus.clearHistory();
    bus.setMuted(false);
  });

  afterEach(() => {
    const bus = ProtocolEventBus.getInstance();
    bus.clearSubscriptions();
    bus.clearHistory();
  });

  // =========================================================================
  // 1. TYPED PROTOCOL EVENT BUS
  // =========================================================================
  describe('ProtocolEventBus', () => {
    it('enforces singleton pattern', () => {
      const bus1 = ProtocolEventBus.getInstance();
      const bus2 = ProtocolEventBus.getInstance();
      expect(bus1).toBe(bus2);
    });

    it('publishes and receives typed events across modules', () => {
      const bus = ProtocolEventBus.getInstance();
      const received: any[] = [];

      const unsub = bus.subscribe(
        'FINGER_COUNT',
        (evt) => {
          received.push(evt);
        },
        'test-module'
      );

      bus.publish(
        'FINGER_COUNT',
        {
          stableCount: 3,
          rawCount: 3,
          handedness: 'Right',
          gestureName: '3 Fingers',
        },
        'fingers',
        0.98
      );

      expect(received).toHaveLength(1);
      expect(received[0].payload.stableCount).toBe(3);
      expect(received[0].payload.gestureName).toBe('3 Fingers');
      expect(received[0].sourceModule).toBe('fingers');
      expect(received[0].confidence).toBe(0.98);

      unsub();
    });

    it('unsubscribes listeners cleanly via returned teardown function', () => {
      const bus = ProtocolEventBus.getInstance();
      let callCount = 0;

      const unsub = bus.subscribe(
        'PINCH',
        () => {
          callCount++;
        },
        'test-module'
      );

      bus.publish(
        'PINCH',
        { state: 'start', position: { x: 100, y: 100 }, handedness: 'Right' },
        'hand'
      );
      expect(callCount).toBe(1);

      unsub();

      bus.publish(
        'PINCH',
        { state: 'release', position: { x: 100, y: 100 }, handedness: 'Right' },
        'hand'
      );
      expect(callCount).toBe(1);
    });

    it('supports wildcard * listener for session recording and telemetry', () => {
      const bus = ProtocolEventBus.getInstance();
      const events: string[] = [];

      const unsub = bus.subscribe(
        '*',
        (evt) => {
          events.push(evt.name);
        },
        'telemetry-recorder'
      );

      bus.publish(
        'HAND_GESTURE',
        { gesture: 'open_palm', confidence: 0.9, handedness: 'Right' },
        'hand'
      );
      bus.publish(
        'GAZE_DWELL',
        { targetName: 'btn_launch', normX: 0.5, normY: 0.5, durationMs: 700, isCalibrated: true },
        'eye'
      );

      expect(events).toEqual(['HAND_GESTURE', 'GAZE_DWELL']);
      unsub();
    });

    it('supports subscribeOnce and auto-removes listener after single invocation', () => {
      const bus = ProtocolEventBus.getInstance();
      let triggerCount = 0;

      bus.subscribeOnce(
        'WASTE_CLASSIFIED',
        () => {
          triggerCount++;
        },
        'test-once'
      );

      bus.publish(
        'WASTE_CLASSIFIED',
        { category: 'plastic', confidence: 0.95, recyclable: true, municipalTip: 'Rinse cleanly' },
        'waste'
      );
      bus.publish(
        'WASTE_CLASSIFIED',
        { category: 'paper', confidence: 0.92, recyclable: true, municipalTip: 'Keep dry' },
        'waste'
      );

      expect(triggerCount).toBe(1);
    });

    it('suppresses recursive cascade loops beyond max recursion depth', () => {
      const bus = ProtocolEventBus.getInstance();
      let cascadeCounter = 0;

      bus.subscribe(
        'SIMULATOR_STATE',
        () => {
          cascadeCounter++;
          // Publish recursively to test cycle guard
          bus.publish(
            'SIMULATOR_STATE',
            { speed: 80, positionX: 0, steeringAngle: 0, controlSource: 'GESTURE' },
            'drive'
          );
        },
        'recursive-agent'
      );

      bus.publish(
        'SIMULATOR_STATE',
        { speed: 0, positionX: 0, steeringAngle: 0, controlSource: 'GESTURE' },
        'drive'
      );

      // Max recursion depth is 5, so call count should not exceed 5 and never crash call stack
      expect(cascadeCounter).toBeLessThanOrEqual(5);
    });

    it('bounds event history to prevent memory leaks', () => {
      const bus = ProtocolEventBus.getInstance();
      for (let i = 0; i < 150; i++) {
        bus.publish(
          'AUDIO_ACTIVITY',
          { isVoiced: true, pitchHz: 200 + i, loudnessDb: -20, wpm: 140 },
          'speech'
        );
      }
      expect(bus.getHistory().length).toBeLessThanOrEqual(100);
    });

    it('unsubscribes all listeners for a given module cleanly', () => {
      const bus = ProtocolEventBus.getInstance();
      let moduleAEvents = 0;
      let moduleBEvents = 0;

      bus.subscribe('PINCH', () => { moduleAEvents++; }, 'module-alpha');
      bus.subscribe('HAND_GESTURE', () => { moduleAEvents++; }, 'module-alpha');
      bus.subscribe('PINCH', () => { moduleBEvents++; }, 'module-beta');

      bus.unsubscribeAllForModule('module-alpha');

      bus.publish('PINCH', { state: 'start', position: { x: 0, y: 0 }, handedness: 'Right' }, 'hand');
      bus.publish('HAND_GESTURE', { gesture: 'fist', confidence: 0.9, handedness: 'Right' }, 'hand');

      expect(moduleAEvents).toBe(0);
      expect(moduleBEvents).toBe(1);
    });
  });

  // =========================================================================
  // 2. GRAPH VALIDATOR & CYCLE DETECTION
  // =========================================================================
  describe('ProtocolValidator', () => {
    it('validates a correct linear DAG protocol', () => {
      const n1 = createDefaultNode('input-finger-count', 0, 0);
      const n2 = createDefaultNode('proc-compare', 200, 0);
      const n3 = createDefaultNode('output-toast', 400, 0);

      const connections: ProtocolConnection[] = [
        { id: 'c1', fromNode: n1.id, fromPort: 'count', toNode: n2.id, toPort: 'in' },
        { id: 'c2', fromNode: n2.id, fromPort: 'passed', toNode: n3.id, toPort: 'trigger' },
      ];

      const protocol: ProtocolDefinition = {
        id: 'test-linear-proto',
        name: 'Linear Test',
        description: 'Test protocol',
        version: '1.0.0',
        category: 'TEST',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes: [n1, n2, n3],
        connections,
        requiredModules: ['fingers'],
        executionSettings: { cooldownMs: 100, timeoutMs: 1000, maxEventsPerSec: 10, allowReplay: true },
      };

      const result = ProtocolValidator.validate(protocol);
      expect(result.isValid).toBe(true);
      expect(result.hasCycle).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    it('detects cycles using Kahn topological sort and rejects invalid graph', () => {
      const n1 = createDefaultNode('proc-cooldown', 0, 0);
      const n2 = createDefaultNode('proc-compare', 200, 0);

      // Create deliberate circular feedback: n1 -> n2 -> n1
      const connections: ProtocolConnection[] = [
        { id: 'c1', fromNode: n1.id, fromPort: 'out', toNode: n2.id, toPort: 'in' },
        { id: 'c2', fromNode: n2.id, fromPort: 'passed', toNode: n1.id, toPort: 'in' },
      ];

      const protocol: ProtocolDefinition = {
        id: 'test-cyclical-proto',
        name: 'Cyclic Test',
        description: 'Test cyclic protocol',
        version: '1.0.0',
        category: 'TEST',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes: [n1, n2],
        connections,
        requiredModules: [],
        executionSettings: { cooldownMs: 100, timeoutMs: 1000, maxEventsPerSec: 10, allowReplay: true },
      };

      const result = ProtocolValidator.validate(protocol);
      expect(result.isValid).toBe(false);
      expect(result.hasCycle).toBe(true);
      expect(result.cyclicalNodeIds).toBeDefined();
      expect(result.cyclicalNodeIds?.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.message.includes('cycle') || e.message.includes('Cyclic'))).toBe(true);
    });

    it('checks port type compatibility correctly', () => {
      expect(ProtocolValidator.arePortsCompatible('number', 'number')).toBe(true);
      expect(ProtocolValidator.arePortsCompatible('string', 'string')).toBe(true);
      expect(ProtocolValidator.arePortsCompatible('boolean', 'boolean')).toBe(true);
      expect(ProtocolValidator.arePortsCompatible('event', 'event')).toBe(true);
      expect(ProtocolValidator.arePortsCompatible('any', 'number')).toBe(true);
      expect(ProtocolValidator.arePortsCompatible('number', 'any')).toBe(true);

      // Incompatible
      expect(ProtocolValidator.arePortsCompatible('string', 'number')).toBe(false);
      expect(ProtocolValidator.arePortsCompatible('boolean', 'number')).toBe(false);
    });

    it('identifies disconnected orphaned nodes with non-fatal warnings', () => {
      const n1 = createDefaultNode('input-pinch', 0, 0);
      const n2 = createDefaultNode('output-fx', 200, 0);
      const orphan = createDefaultNode('proc-threshold', 100, 100);

      const protocol: ProtocolDefinition = {
        id: 'orphan-proto',
        name: 'Orphan Test',
        description: 'Test orphaned node warning',
        version: '1.0.0',
        category: 'TEST',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes: [n1, n2, orphan],
        connections: [
          { id: 'c1', fromNode: n1.id, fromPort: 'event', toNode: n2.id, toPort: 'trigger' },
        ],
        requiredModules: ['hand'],
        executionSettings: { cooldownMs: 100, timeoutMs: 1000, maxEventsPerSec: 10, allowReplay: true },
      };

      const result = ProtocolValidator.validate(protocol);
      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.message.includes('has no incoming'))).toBe(true);
    });
  });

  // =========================================================================
  // 3. EXECUTION ENGINE LIFECYCLE & EXECUTION
  // =========================================================================
  describe('ProtocolExecutionEngine', () => {
    it('manages lifecycle states correctly (READY -> RUNNING -> PAUSED -> STOPPED)', () => {
      const template = BUILT_IN_TEMPLATES[0]!;
      const engine = new ProtocolExecutionEngine(template);

      expect(engine.getState()).toBe('READY');

      const startOk = engine.start();
      expect(startOk).toBe(true);
      expect(engine.getState()).toBe('RUNNING');

      engine.pause();
      expect(engine.getState()).toBe('PAUSED');

      engine.start();
      expect(engine.getState()).toBe('RUNNING');

      engine.stop();
      expect(engine.getState()).toBe('STOPPED');
    });

    it('executes end-to-end dataflow from input to output node', () => {
      const bus = ProtocolEventBus.getInstance();
      const nInput = createDefaultNode('input-finger-count', 0, 0);
      nInput.params = { targetHand: 'Both' };

      const nCompare = createDefaultNode('proc-compare', 200, 0);
      nCompare.params = { operator: '==', targetValue: 3 };

      const nOutput = createDefaultNode('output-toast', 400, 0);
      nOutput.params = { title: 'TARGET REACHED', variant: 'sage' };

      const protocol: ProtocolDefinition = {
        id: 'test-flow',
        name: 'Flow Test',
        description: 'Flow test',
        version: '1.0.0',
        category: 'TEST',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes: [nInput, nCompare, nOutput],
        connections: [
          { id: 'c1', fromNode: nInput.id, fromPort: 'count', toNode: nCompare.id, toPort: 'in' },
          { id: 'c2', fromNode: nCompare.id, fromPort: 'passed', toNode: nOutput.id, toPort: 'trigger' },
        ],
        requiredModules: ['fingers'],
        executionSettings: { cooldownMs: 100, timeoutMs: 1000, maxEventsPerSec: 10, allowReplay: true },
      };

      const triggeredActions: any[] = [];
      const engine = new ProtocolExecutionEngine(protocol, {
        onActionTriggered: (type, payload) => {
          triggeredActions.push({ type, payload });
        },
      });

      engine.start();

      // Send count = 2 (should be filtered by compare == 3)
      bus.publish(
        'FINGER_COUNT',
        { stableCount: 2, rawCount: 2, handedness: 'Both', gestureName: '2 Fingers' },
        'fingers'
      );
      expect(triggeredActions).toHaveLength(0);

      // Send count = 3 (should pass compare and trigger toast)
      bus.publish(
        'FINGER_COUNT',
        { stableCount: 3, rawCount: 3, handedness: 'Both', gestureName: '3 Fingers' },
        'fingers'
      );
      expect(triggeredActions).toHaveLength(1);
      expect(triggeredActions[0].type).toBe('TOAST');

      engine.stop();
    });

    it('enforces cooldown window on proc-cooldown nodes', async () => {
      const bus = ProtocolEventBus.getInstance();
      const nInput = createDefaultNode('input-pinch', 0, 0);
      nInput.params = { triggerState: 'start' };

      const nCooldown = createDefaultNode('proc-cooldown', 200, 0);
      nCooldown.params = { cooldownMs: 1000 };

      const nFx = createDefaultNode('output-fx', 400, 0);

      const protocol: ProtocolDefinition = {
        id: 'cooldown-test',
        name: 'Cooldown Test',
        description: 'Cooldown test',
        version: '1.0.0',
        category: 'TEST',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes: [nInput, nCooldown, nFx],
        connections: [
          { id: 'c1', fromNode: nInput.id, fromPort: 'event', toNode: nCooldown.id, toPort: 'in' },
          { id: 'c2', fromNode: nCooldown.id, fromPort: 'out', toNode: nFx.id, toPort: 'trigger' },
        ],
        requiredModules: ['hand'],
        executionSettings: { cooldownMs: 100, timeoutMs: 1000, maxEventsPerSec: 10, allowReplay: true },
      };

      let fxCount = 0;
      const engine = new ProtocolExecutionEngine(protocol, {
        onActionTriggered: () => {
          fxCount++;
        },
      });

      engine.start();

      // Trigger 1: fires immediately
      bus.publish('PINCH', { state: 'start', position: { x: 10, y: 10 }, handedness: 'Right' }, 'hand');
      expect(fxCount).toBe(1);

      // Trigger 2: immediately after (suppressed by cooldown)
      bus.publish('PINCH', { state: 'start', position: { x: 10, y: 10 }, handedness: 'Right' }, 'hand');
      expect(fxCount).toBe(1);

      engine.stop();
    });

    it('executes manual triggers directly via executeManualTrigger()', () => {
      const nManual = createDefaultNode('input-manual', 0, 0);
      const nToast = createDefaultNode('output-toast', 200, 0);

      const protocol: ProtocolDefinition = {
        id: 'manual-test',
        name: 'Manual Test',
        description: 'Manual test',
        version: '1.0.0',
        category: 'TEST',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes: [nManual, nToast],
        connections: [
          { id: 'c1', fromNode: nManual.id, fromPort: 'event', toNode: nToast.id, toPort: 'trigger' },
        ],
        requiredModules: [],
        executionSettings: { cooldownMs: 100, timeoutMs: 1000, maxEventsPerSec: 10, allowReplay: true },
      };

      let actionFired = false;
      const engine = new ProtocolExecutionEngine(protocol, {
        onActionTriggered: () => {
          actionFired = true;
        },
      });

      engine.start();
      engine.executeManualTrigger(nManual.id);
      expect(actionFired).toBe(true);

      engine.stop();
    });
  });

  // =========================================================================
  // 4. BUILT-IN TEMPLATES VERIFICATION (A THROUGH E)
  // =========================================================================
  describe('All 5 Built-in Templates', () => {
    it('verifies all 5 templates pass schema validation and Kahn DAG check', () => {
      expect(BUILT_IN_TEMPLATES).toHaveLength(5);

      for (const template of BUILT_IN_TEMPLATES) {
        const result = ProtocolValidator.validate(template);
        expect(result.isValid, `Template "${template.name}" must be valid DAG`).toBe(true);
        expect(result.hasCycle, `Template "${template.name}" must not contain cycles`).toBe(false);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('executes Template A: GESTURE COMMAND DECK', () => {
      const bus = ProtocolEventBus.getInstance();
      const tmpl = BUILT_IN_TEMPLATES.find((t) => t.id === 'template-gesture-command-deck')!;
      expect(tmpl).toBeDefined();

      const actions: any[] = [];
      const engine = new ProtocolExecutionEngine(tmpl, {
        onActionTriggered: (action, payload) => {
          actions.push({ action, payload });
        },
      });

      engine.start();

      bus.publish(
        'HAND_GESTURE',
        { gesture: 'open_palm', confidence: 0.88, handedness: 'Right' },
        'hand',
        0.88
      );

      expect(actions.length).toBeGreaterThan(0);
      engine.stop();
    });

    it('executes Template B: GAZE NAVIGATION', () => {
      const bus = ProtocolEventBus.getInstance();
      const tmpl = BUILT_IN_TEMPLATES.find((t) => t.id === 'template-gaze-navigation')!;
      expect(tmpl).toBeDefined();

      const actions: any[] = [];
      const engine = new ProtocolExecutionEngine(tmpl, {
        onActionTriggered: (action, payload) => {
          actions.push({ action, payload });
        },
      });

      engine.start();

      bus.publish(
        'GAZE_DWELL',
        {
          targetName: 'NAV_MODULE_LAB',
          normX: 0.5,
          normY: 0.5,
          durationMs: 800,
          isCalibrated: true,
        },
        'eye'
      );

      expect(actions.length).toBeGreaterThan(0);
      engine.stop();
    });

    it('executes Template C: MOVEMENT LAB', () => {
      const bus = ProtocolEventBus.getInstance();
      const tmpl = BUILT_IN_TEMPLATES.find((t) => t.id === 'template-movement-lab')!;
      expect(tmpl).toBeDefined();

      const actions: any[] = [];
      const engine = new ProtocolExecutionEngine(tmpl, {
        onActionTriggered: (action, payload) => {
          actions.push({ action, payload });
        },
      });

      engine.start();

      bus.publish(
        'POSE_REP',
        { exercise: 'squat', repCount: 5, durationSec: 2.1, formScore: 92 },
        'pose'
      );

      expect(actions.length).toBeGreaterThan(0);
      engine.stop();
    });

    it('executes Template D: CLASSIFICATION WORKBENCH', () => {
      const bus = ProtocolEventBus.getInstance();
      const tmpl = BUILT_IN_TEMPLATES.find((t) => t.id === 'template-classification-workbench')!;
      expect(tmpl).toBeDefined();

      const actions: any[] = [];
      const engine = new ProtocolExecutionEngine(tmpl, {
        onActionTriggered: (action, payload) => {
          actions.push({ action, payload });
        },
      });

      engine.start();

      bus.publish(
        'WASTE_CLASSIFIED',
        {
          category: 'plastic',
          confidence: 0.94,
          recyclable: true,
          municipalTip: 'Rinse thoroughly',
        },
        'waste',
        0.94
      );

      expect(actions.length).toBeGreaterThan(0);
      engine.stop();
    });

    it('executes Template E: MULTIMODAL CHAIN', () => {
      const bus = ProtocolEventBus.getInstance();
      const tmpl = BUILT_IN_TEMPLATES.find((t) => t.id === 'template-multimodal-chain')!;
      expect(tmpl).toBeDefined();

      const actions: any[] = [];
      const engine = new ProtocolExecutionEngine(tmpl, {
        onActionTriggered: (action, payload) => {
          actions.push({ action, payload });
        },
      });

      engine.start();

      bus.publish(
        'FINGER_COUNT',
        {
          stableCount: 3,
          rawCount: 3,
          handedness: 'Both',
          gestureName: '3 Fingers',
        },
        'fingers'
      );

      expect(actions.length).toBeGreaterThan(0);
      engine.stop();
    });
  });

  // =========================================================================
  // 5. MULTIMODAL SESSION RECORDER & DETERMINISTIC REPLAY MODE
  // =========================================================================
  describe('SessionRecorder & Replay Mode', () => {
    it('records bus events with relative timestamps', () => {
      const bus = ProtocolEventBus.getInstance();
      const recorder = new SessionRecorder();

      recorder.startRecording('Session Alpha');

      bus.publish(
        'FINGER_COUNT',
        { stableCount: 4, rawCount: 4, handedness: 'Both', gestureName: '4 Fingers' },
        'fingers'
      );
      bus.publish(
        'AUDIO_ACTIVITY',
        { isVoiced: true, pitchHz: 220, loudnessDb: -15, wpm: 120 },
        'speech'
      );

      const session = recorder.stopRecording();

      expect(session).not.toBeNull();
      expect(session?.protocolName).toBe('Session Alpha');
      expect(session?.items.length).toBeGreaterThan(0);
    });

    it('exports and imports session recording with JSON schema defense', () => {
      const bus = ProtocolEventBus.getInstance();
      const recorder = new SessionRecorder();

      recorder.startRecording('Export Test');
      bus.publish(
        'PINCH',
        { state: 'start', position: { x: 50, y: 50 }, handedness: 'Right' },
        'hand'
      );
      const session = recorder.stopRecording()!;

      const jsonStr = recorder.exportSessionJson(session);
      expect(typeof jsonStr).toBe('string');
      expect(jsonStr).toContain('PINCH');

      const imported = recorder.importSessionJson(jsonStr);
      expect(imported.id).toBeDefined();
      expect(imported.items.length).toBeGreaterThan(0);
    });

    it('replays recorded session deterministically through event bus at accelerated speed', async () => {
      const bus = ProtocolEventBus.getInstance();
      const recorder = new SessionRecorder();

      const session = {
        id: 'replay-test-session',
        protocolId: 'proto-1',
        protocolName: 'Deterministic Replay',
        protocolVersion: '1.0.0',
        startTime: 0,
        totalEventsProcessed: 3,
        totalActionsExecuted: 0,
        items: [
          {
            id: 'i1',
            timestamp: 0,
            type: 'protocol_event' as const,
            eventName: 'FINGER_COUNT',
            payload: { stableCount: 1, rawCount: 1, handedness: 'Right' as const, gestureName: '1 Finger' },
          },
          {
            id: 'i2',
            timestamp: 10,
            type: 'protocol_event' as const,
            eventName: 'FINGER_COUNT',
            payload: { stableCount: 2, rawCount: 2, handedness: 'Right' as const, gestureName: '2 Fingers' },
          },
          {
            id: 'i3',
            timestamp: 20,
            type: 'protocol_event' as const,
            eventName: 'FINGER_COUNT',
            payload: { stableCount: 3, rawCount: 3, handedness: 'Right' as const, gestureName: '3 Fingers' },
          },
        ],
      };

      const received: number[] = [];
      const unsub = bus.subscribe(
        'FINGER_COUNT',
        (evt) => {
          received.push(evt.payload.stableCount);
        },
        'replay-listener'
      );

      await new Promise<void>((resolve) => {
        recorder.startReplay(session, {
          playbackSpeed: 10, // Accelerated 10x
          onComplete: () => {
            resolve();
          },
        });
      });

      expect(received).toEqual([1, 2, 3]);
      unsub();
    });
  });

  // =========================================================================
  // 6. PROTOCOL STORAGE & EXPORT/IMPORT
  // =========================================================================
  describe('ProtocolStorage', () => {
    it('retrieves built-in templates from storage', () => {
      const protocols = ProtocolStorage.getAllProtocols();
      expect(protocols.length).toBeGreaterThanOrEqual(5);

      const templateA = ProtocolStorage.getProtocolById('template-gesture-command-deck');
      expect(templateA).not.toBeNull();
      expect(templateA?.isTemplate).toBe(true);
    });

    it('protects built-in factory templates against overwrite', () => {
      const templateA = ProtocolStorage.getProtocolById('template-gesture-command-deck')!;
      expect(() => {
        ProtocolStorage.saveProtocol({
          ...templateA,
          name: 'Hacked Template',
        });
      }).toThrow();
    });

    it('saves, updates, and deletes user-defined custom protocols', () => {
      const customId = `custom-test-${Date.now()}`;
      const customProto: ProtocolDefinition = {
        id: customId,
        name: 'Custom User Protocol',
        description: 'User created protocol',
        version: '1.0.0',
        category: 'USER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isTemplate: false,
        nodes: [createDefaultNode('input-manual', 0, 0)],
        connections: [],
        requiredModules: [],
        executionSettings: { cooldownMs: 100, timeoutMs: 1000, maxEventsPerSec: 10, allowReplay: true },
      };

      ProtocolStorage.saveProtocol(customProto);
      const retrieved = ProtocolStorage.getProtocolById(customId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Custom User Protocol');

      // Update
      ProtocolStorage.saveProtocol({
        ...customProto,
        name: 'Updated Protocol Name',
      });
      expect(ProtocolStorage.getProtocolById(customId)?.name).toBe('Updated Protocol Name');

      // Delete
      const deleted = ProtocolStorage.deleteProtocol(customId);
      expect(deleted).toBe(true);
      expect(ProtocolStorage.getProtocolById(customId)).toBeNull();
    });

    it('exports protocol to JSON and imports with schema verification', () => {
      const template = BUILT_IN_TEMPLATES[0]!;
      const exportedJson = ProtocolStorage.exportProtocolJson(template);
      expect(typeof exportedJson).toBe('string');
      expect(exportedJson).toContain(template.name);

      const imported = ProtocolStorage.importProtocolJson(exportedJson);
      expect(imported.name).toContain(template.name);
      expect(imported.nodes.length).toBe(template.nodes.length);
      expect(imported.connections.length).toBe(template.connections.length);
    });
  });
});
