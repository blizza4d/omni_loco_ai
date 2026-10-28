/**
 * OMNI PROTOCOL FORGE — NODE REGISTRY & FACTORIES
 * Declarative catalog of functional Input, Processing, and Output node definitions.
 */

import { ProtocolNode, ProtocolNodeType, NodeCategory, PortDefinition } from './types';

export interface NodeTemplate {
  type: ProtocolNodeType;
  label: string;
  category: NodeCategory;
  description: string;
  defaultParams: Record<string, any>;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
}

export const NODE_TEMPLATES: NodeTemplate[] = [
  // ==========================================
  // INPUT NODES
  // ==========================================
  {
    type: 'input-hand-gesture',
    label: 'Hand Gesture Input',
    category: 'INPUT',
    description: 'Emits events when a stable hand gesture is detected by FIG. 01 Hand Gesture Recognition.',
    defaultParams: {
      minConfidence: 0.7,
      handedness: 'Any', // 'Any' | 'Left' | 'Right'
    },
    inputs: [],
    outputs: [
      { id: 'event', label: 'Event', type: 'event', description: 'Raw gesture event' },
      { id: 'gesture', label: 'Gesture Name', type: 'string', description: 'e.g. open_palm, victory' },
      { id: 'confidence', label: 'Confidence', type: 'number', description: 'Detection confidence (0-1)' },
    ],
  },
  {
    type: 'input-finger-count',
    label: 'Finger Count Input',
    category: 'INPUT',
    description: 'Emits events when finger count changes from FIG. 12 Finger Counting module.',
    defaultParams: {
      targetHand: 'Both', // 'Left' | 'Right' | 'Both'
    },
    inputs: [],
    outputs: [
      { id: 'event', label: 'Event', type: 'event', description: 'Finger count event' },
      { id: 'count', label: 'Count', type: 'number', description: 'Stable finger count (0-10)' },
      { id: 'gesture', label: 'Pose Label', type: 'string', description: 'e.g. Peace Sign, Open Palm' },
    ],
  },
  {
    type: 'input-pinch',
    label: 'Pinch Interaction',
    category: 'INPUT',
    description: 'Emits events on index-to-thumb pinch transitions (start, release, hold).',
    defaultParams: {
      triggerState: 'start', // 'start' | 'release' | 'hold'
    },
    inputs: [],
    outputs: [
      { id: 'event', label: 'Event', type: 'event' },
      { id: 'state', label: 'State', type: 'string' },
    ],
  },
  {
    type: 'input-gaze-dwell',
    label: 'Gaze Dwell Input',
    category: 'INPUT',
    description: 'Triggers when user eye fixation dwells on an on-screen target from FIG. 07 / FIG. 08.',
    defaultParams: {
      minDwellMs: 600,
    },
    inputs: [],
    outputs: [
      { id: 'event', label: 'Event', type: 'event' },
      { id: 'target', label: 'Target Name', type: 'string' },
      { id: 'duration', label: 'Dwell Time (ms)', type: 'number' },
    ],
  },
  {
    type: 'input-pose',
    label: 'Kinematic Pose Event',
    category: 'INPUT',
    description: 'Emits events on movement stage changes or repetition completions from FIG. 03.',
    defaultParams: {
      exercise: 'any', // 'squat' | 'push_up' | 'bicep_curl' | 'any'
      eventType: 'rep_completed', // 'rep_completed' | 'stage_changed'
    },
    inputs: [],
    outputs: [
      { id: 'event', label: 'Event', type: 'event' },
      { id: 'repCount', label: 'Reps', type: 'number' },
      { id: 'exercise', label: 'Exercise', type: 'string' },
    ],
  },
  {
    type: 'input-audio',
    label: 'Audio Activity Input',
    category: 'INPUT',
    description: 'Detects voice activity, pitch contour, or cadence from FIG. 05 Speech Analytics.',
    defaultParams: {
      minLoudnessDb: -35,
    },
    inputs: [],
    outputs: [
      { id: 'event', label: 'Event', type: 'event' },
      { id: 'pitchHz', label: 'Pitch (Hz)', type: 'number' },
      { id: 'wpm', label: 'Pacing (WPM)', type: 'number' },
    ],
  },
  {
    type: 'input-waste',
    label: 'Waste Classification Input',
    category: 'INPUT',
    description: 'Emits item classification results from FIG. 06 Smart Waste Segregator.',
    defaultParams: {
      minConfidence: 0.65,
    },
    inputs: [],
    outputs: [
      { id: 'event', label: 'Event', type: 'event' },
      { id: 'category', label: 'Category', type: 'string' },
      { id: 'recyclable', label: 'Recyclable', type: 'boolean' },
    ],
  },
  {
    type: 'input-custom-model',
    label: 'Laboratory Custom Classifier',
    category: 'INPUT',
    description: 'References a custom trained gesture model from the Laboratory V2 workspace.',
    defaultParams: {
      modelId: 'built-in-triad-lock',
      modelVersion: '1.0.0',
      minConfidence: 0.70,
    },
    inputs: [],
    outputs: [
      { id: 'event', label: 'Event', type: 'event' },
      { id: 'label', label: 'Predicted Label', type: 'string' },
      { id: 'confidence', label: 'Confidence', type: 'number' },
    ],
  },
  {
    type: 'input-manual',
    label: 'Manual Trigger Input',
    category: 'INPUT',
    description: 'A manual button trigger for testing workflows or launching command sequences.',
    defaultParams: {
      buttonLabel: 'DISPATCH COMMAND',
    },
    inputs: [],
    outputs: [
      { id: 'event', label: 'Trigger', type: 'event' },
    ],
  },

  // ==========================================
  // PROCESSING NODES
  // ==========================================
  {
    type: 'proc-threshold',
    label: 'Confidence Threshold',
    category: 'PROCESSING',
    description: 'Filters out events where the numeric score or confidence is below threshold.',
    defaultParams: {
      threshold: 0.75,
    },
    inputs: [
      { id: 'in', label: 'Input', type: 'any' },
      { id: 'score', label: 'Score', type: 'number' },
    ],
    outputs: [
      { id: 'passed', label: 'Passed', type: 'any' },
    ],
  },
  {
    type: 'proc-filter',
    label: 'Value Match Filter',
    category: 'PROCESSING',
    description: 'Allows execution only when the string or number matches the target value.',
    defaultParams: {
      expectedValue: 'open_palm',
      caseSensitive: false,
    },
    inputs: [
      { id: 'in', label: 'Input', type: 'any' },
      { id: 'value', label: 'Value to Test', type: 'any' },
    ],
    outputs: [
      { id: 'passed', label: 'Matches', type: 'any' },
    ],
  },
  {
    type: 'proc-cooldown',
    label: 'Cooldown Debounce',
    category: 'PROCESSING',
    description: 'Suppresses duplicate activations within a specified cooldown window.',
    defaultParams: {
      cooldownMs: 800,
    },
    inputs: [
      { id: 'in', label: 'Input', type: 'any' },
    ],
    outputs: [
      { id: 'out', label: 'Output', type: 'any' },
    ],
  },
  {
    type: 'proc-compare',
    label: 'Numeric Comparison',
    category: 'PROCESSING',
    description: 'Evaluates numeric conditions: ==, >, <, >=, <=.',
    defaultParams: {
      operator: '==', // '==' | '>' | '<' | '>=' | '<='
      targetValue: 3,
    },
    inputs: [
      { id: 'in', label: 'Input Value', type: 'number' },
    ],
    outputs: [
      { id: 'result', label: 'Condition Met', type: 'boolean' },
      { id: 'passed', label: 'Passed', type: 'any' },
    ],
  },
  {
    type: 'proc-mapper',
    label: 'Label / Action Mapper',
    category: 'PROCESSING',
    description: 'Maps an input string or number to a customized output command string.',
    defaultParams: {
      mappingTable: {
        '1': 'NAV_NEXT',
        '2': 'NAV_PREV',
        '3': 'TRIGGER_SCAN',
        'open_palm': 'BURST_EFFECT',
        'fist': 'STOP_ALL',
      },
      fallbackValue: 'UNKNOWN_ACTION',
    },
    inputs: [
      { id: 'in', label: 'Key', type: 'any' },
    ],
    outputs: [
      { id: 'mapped', label: 'Action Tag', type: 'string' },
    ],
  },
  {
    type: 'proc-branch',
    label: 'Conditional Branch',
    category: 'PROCESSING',
    description: 'Routes data to True or False branch based on a boolean condition port.',
    defaultParams: {},
    inputs: [
      { id: 'in', label: 'Data', type: 'any' },
      { id: 'condition', label: 'Condition', type: 'boolean' },
    ],
    outputs: [
      { id: 'trueBranch', label: 'True Branch', type: 'any' },
      { id: 'falseBranch', label: 'False Branch', type: 'any' },
    ],
  },

  // ==========================================
  // OUTPUT NODES
  // ==========================================
  {
    type: 'output-fx',
    label: 'Trigger Visual Effect',
    category: 'OUTPUT',
    description: 'Triggers a registered canvas particle effect (holographic burst, spark burst, matrix scan).',
    defaultParams: {
      effectType: 'holographic_burst', // 'holographic_burst' | 'quantum_scan' | 'ember_burst' | 'laser_pulse'
      color: '#00E599',
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
    ],
    outputs: [
      { id: 'done', label: 'Executed', type: 'event' },
    ],
  },
  {
    type: 'output-toast',
    label: 'Display HUD Toast',
    category: 'OUTPUT',
    description: 'Presents an on-screen tactical HUD notification to the user.',
    defaultParams: {
      title: 'TACTICAL COMMAND DISPATCHED',
      variant: 'sage', // 'sage' | 'brick' | 'charcoal'
      timeoutMs: 3000,
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
      { id: 'message', label: 'Custom Message', type: 'string' },
    ],
    outputs: [
      { id: 'done', label: 'Displayed', type: 'event' },
    ],
  },
  {
    type: 'output-audio-chime',
    label: 'Synthesized Chime',
    category: 'OUTPUT',
    description: 'Plays a procedural synthesized Web Audio chime for acoustic feedback.',
    defaultParams: {
      frequencyHz: 880,
      waveType: 'sine', // 'sine' | 'triangle' | 'square'
      durationSec: 0.18,
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
    ],
    outputs: [
      { id: 'done', label: 'Played', type: 'event' },
    ],
  },
  {
    type: 'output-log',
    label: 'Session Event Logger',
    category: 'OUTPUT',
    description: 'Appends a structured, timestamped entry to the active experiment session log.',
    defaultParams: {
      tag: 'COMMAND_DISPATCH',
      level: 'action',
    },
    inputs: [
      { id: 'in', label: 'Log Data', type: 'any' },
    ],
    outputs: [
      { id: 'done', label: 'Logged', type: 'event' },
    ],
  },
  {
    type: 'output-simulator',
    label: 'Simulator Action',
    category: 'OUTPUT',
    description: 'Dispatches a registered simulator command (toggle afterburner, trigger brake).',
    defaultParams: {
      action: 'AFTERBURNER_TOGGLE', // 'AFTERBURNER_TOGGLE' | 'EMERGENCY_BRAKE' | 'RESET_POSITION'
    },
    inputs: [
      { id: 'trigger', label: 'Trigger', type: 'any' },
    ],
    outputs: [
      { id: 'done', label: 'Executed', type: 'event' },
    ],
  },
];

export function createNode(type: ProtocolNodeType, x = 100, y = 100): ProtocolNode {
  const template = NODE_TEMPLATES.find((t) => t.type === type);
  if (!template) {
    throw new Error(`Unknown node type: "${type}"`);
  }

  const id = `node-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  return {
    id,
    type,
    label: template.label,
    category: template.category,
    position: { x, y },
    inputs: template.inputs.map((p) => ({ ...p })),
    outputs: template.outputs.map((p) => ({ ...p })),
    params: { ...template.defaultParams },
  };
}

export const createDefaultNode = createNode;
