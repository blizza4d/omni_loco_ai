/**
 * OMNI PROTOCOL FORGE — TYPES AND SCHEMAS
 * Typed event interface, visual node specifications, protocol graphs, and execution schemas.
 */

export type ProtocolEventName =
  | 'HAND_GESTURE'
  | 'FINGER_COUNT'
  | 'PINCH'
  | 'GAZE_DWELL'
  | 'GAZE_TARGET'
  | 'POSE_STATE'
  | 'POSE_REP'
  | 'AUDIO_ACTIVITY'
  | 'WASTE_CLASSIFIED'
  | 'CUSTOM_CLASSIFIER'
  | 'SIMULATOR_STATE'
  | 'MANUAL_TRIGGER';

export interface ProtocolEventPayloads {
  HAND_GESTURE: {
    gesture: string;
    confidence: number;
    handedness: 'Left' | 'Right';
    position?: { x: number; y: number };
  };
  FINGER_COUNT: {
    stableCount: number;
    rawCount: number;
    handedness: 'Left' | 'Right' | 'Both';
    gestureName: string;
  };
  PINCH: {
    state: 'start' | 'release' | 'hold';
    position: { x: number; y: number };
    handedness: 'Left' | 'Right';
  };
  GAZE_DWELL: {
    targetName: string;
    normX: number;
    normY: number;
    durationMs: number;
    isCalibrated: boolean;
  };
  GAZE_TARGET: {
    targetName: string | null;
    normX: number;
    normY: number;
    isFixating: boolean;
    isCalibrated: boolean;
  };
  POSE_STATE: {
    exercise: string;
    stage: 'up' | 'down' | 'neutral';
    repCount: number;
    activeFaults: string[];
  };
  POSE_REP: {
    exercise: string;
    repCount: number;
    durationSec: number;
    formScore: number;
  };
  AUDIO_ACTIVITY: {
    isVoiced: boolean;
    pitchHz: number;
    loudnessDb: number;
    wpm: number;
  };
  WASTE_CLASSIFIED: {
    category: string;
    confidence: number;
    recyclable: boolean;
    municipalTip: string;
  };
  CUSTOM_CLASSIFIER: {
    modelId: string;
    modelName: string;
    label: string;
    confidence: number;
    isRecognized: boolean;
  };
  SIMULATOR_STATE: {
    speed: number;
    positionX: number;
    steeringAngle: number;
    controlSource: 'GESTURE' | 'KEYBOARD';
  };
  MANUAL_TRIGGER: {
    triggerId: string;
    label: string;
    timestamp: number;
  };
}

export interface ProtocolEvent<T extends ProtocolEventName = ProtocolEventName> {
  id: string;
  name: T;
  sourceModule: string;
  timestamp: number;
  payload: ProtocolEventPayloads[T];
  confidence?: number;
  sessionId?: string;
}

export type PortDataType = 'event' | 'number' | 'string' | 'boolean' | 'any';

export interface PortDefinition {
  id: string;
  label: string;
  type: PortDataType;
  description?: string;
}

export type NodeCategory = 'INPUT' | 'PROCESSING' | 'OUTPUT';

export type ProtocolNodeType =
  // INPUTS
  | 'input-hand-gesture'
  | 'input-finger-count'
  | 'input-pinch'
  | 'input-gaze-dwell'
  | 'input-pose'
  | 'input-audio'
  | 'input-waste'
  | 'input-custom-model'
  | 'input-manual'
  // PROCESSING
  | 'proc-threshold'
  | 'proc-filter'
  | 'proc-cooldown'
  | 'proc-mapper'
  | 'proc-compare'
  | 'proc-branch'
  // OUTPUTS
  | 'output-fx'
  | 'output-toast'
  | 'output-audio-chime'
  | 'output-log'
  | 'output-simulator'
  | 'output-lab';

export interface ProtocolNode {
  id: string;
  type: ProtocolNodeType;
  label: string;
  category: NodeCategory;
  position: { x: number; y: number };
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  params: Record<string, any>;
  lastExecution?: {
    timestamp: number;
    durationMs: number;
    status: 'idle' | 'success' | 'filtered' | 'error';
    outputData?: any;
    error?: string;
  };
}

export interface ProtocolConnection {
  id: string;
  fromNode: string;
  fromPort: string;
  toNode: string;
  toPort: string;
}

export type ProtocolExecutionState =
  | 'DRAFT'
  | 'VALIDATING'
  | 'READY'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'STOPPED'
  | 'CANCELLED';

export interface ProtocolDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  isTemplate?: boolean;
  createdAt: string;
  updatedAt: string;
  nodes: ProtocolNode[];
  connections: ProtocolConnection[];
  requiredModules: string[];
  executionSettings: {
    cooldownMs: number;
    timeoutMs: number;
    maxEventsPerSec: number;
    allowReplay: boolean;
  };
}

export interface ProtocolValidationIssue {
  type: 'error' | 'warning';
  nodeId?: string;
  connectionId?: string;
  message: string;
}

export interface ProtocolValidationResult {
  isValid: boolean;
  hasCycle?: boolean;
  cyclicalNodeIds?: string[];
  errors: ProtocolValidationIssue[];
  warnings: ProtocolValidationIssue[];
  sortedNodeIds: string[];
}

export interface ProtocolLogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'action';
  nodeId?: string;
  nodeLabel?: string;
  message: string;
  data?: any;
}

export interface SessionRecordItem {
  id: string;
  timestamp: number;
  type: 'protocol_event' | 'node_execution' | 'output_action' | 'lifecycle';
  eventName?: string;
  nodeId?: string;
  nodeType?: string;
  payload: any;
  durationMs?: number;
}

export interface ProtocolSessionLog {
  id: string;
  protocolId: string;
  protocolName: string;
  protocolVersion: string;
  startTime: number;
  endTime?: number;
  isReplaySession?: boolean;
  totalEventsProcessed: number;
  totalActionsExecuted: number;
  items: SessionRecordItem[];
}
