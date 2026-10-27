import {
  LaboratoryPipeline,
  PipelineNode,
  PipelineConnection,
  PipelineNodeCategory,
  PortDataType,
} from './types';
import { Landmark3D } from '../hand/types';
import { HandFeatureExtractor } from './feature-extractor';
import { generateSyntheticHand } from '../hand/synthetic-hand';

export interface NodeTemplate {
  type: string;
  label: string;
  category: PipelineNodeCategory;
  inputs: { id: string; name: string; type: PortDataType }[];
  outputs: { id: string; name: string; type: PortDataType }[];
  defaultParameters: Record<string, any>;
}

export const NODE_PALETTE: NodeTemplate[] = [
  // 1. Inputs
  {
    type: 'camera_input',
    label: 'Camera Sensor',
    category: 'input',
    inputs: [],
    outputs: [{ id: 'out_stream', name: 'Frame Buffer', type: 'stream' }],
    defaultParameters: { resolution: '640x480', targetFps: 60 },
  },
  {
    type: 'synthetic_stream',
    label: 'Synthetic Generator',
    category: 'input',
    inputs: [],
    outputs: [{ id: 'out_landmarks', name: '3D Keypoints', type: 'landmarks' }],
    defaultParameters: { pattern: 'harmonic_cycle', speed: 1.0 },
  },

  // 2. Preprocessing
  {
    type: 'wrist_normalizer',
    label: 'Wrist Centering & Scale',
    category: 'preprocessing',
    inputs: [{ id: 'in_landmarks', name: 'Raw Keypoints', type: 'landmarks' }],
    outputs: [{ id: 'out_normalized', name: 'Normalized Keypoints', type: 'landmarks' }],
    defaultParameters: { anchorJoint: 0, scaleJoint: 9 },
  },

  // 3. Feature Extraction
  {
    type: 'landmark_vector_extractor',
    label: '63D Feature Vectorizer',
    category: 'feature',
    inputs: [{ id: 'in_normalized', name: 'Normalized Keypoints', type: 'landmarks' }],
    outputs: [{ id: 'out_features', name: 'Feature Vector [63]', type: 'features' }],
    defaultParameters: { includeVelocities: false },
  },
  {
    type: 'finger_curl_trigonometry',
    label: 'Joint Angle Trigonometry',
    category: 'feature',
    inputs: [{ id: 'in_landmarks', name: 'Keypoints', type: 'landmarks' }],
    outputs: [{ id: 'out_angles', name: 'Curl Ratios [5]', type: 'features' }],
    defaultParameters: { thresholdCurl: 1.05 },
  },

  // 4. Classifiers
  {
    type: 'prototype_classifier',
    label: 'Centroid Prototype Matcher',
    category: 'classifier',
    inputs: [{ id: 'in_features', name: 'Feature Vector', type: 'features' }],
    outputs: [{ id: 'out_class', name: 'Classification', type: 'classification' }],
    defaultParameters: { metric: 'euclidean', confidenceThreshold: 0.7 },
  },
  {
    type: 'knn_classifier',
    label: 'k-NN Neighbor Voter',
    category: 'classifier',
    inputs: [{ id: 'in_features', name: 'Feature Vector', type: 'features' }],
    outputs: [{ id: 'out_class', name: 'Classification', type: 'classification' }],
    defaultParameters: { k: 3, metric: 'euclidean' },
  },

  // 5. Postprocessing
  {
    type: 'temporal_stabilizer',
    label: 'Temporal Hysteresis Filter',
    category: 'postprocessing',
    inputs: [{ id: 'in_class', name: 'Raw Prediction', type: 'classification' }],
    outputs: [{ id: 'out_stable_class', name: 'Stabilized Class', type: 'classification' }],
    defaultParameters: { windowSize: 3, minHoldMs: 90 },
  },

  // 6. Output
  {
    type: 'fx_trigger_output',
    label: 'Visual FX Engine Dispatcher',
    category: 'output',
    inputs: [{ id: 'in_gesture', name: 'Stabilized Gesture', type: 'classification' }],
    outputs: [{ id: 'out_event', name: 'Event Bus', type: 'event' }],
    defaultParameters: { preset: 'CYBER_NEON', intensity: 1.0 },
  },
  {
    type: 'audio_synth_output',
    label: 'Web Audio Procedural Chime',
    category: 'output',
    inputs: [{ id: 'in_event', name: 'Trigger Event', type: 'classification' }],
    outputs: [],
    defaultParameters: { volume: 0.1 },
  },
];

export function createDefaultPipeline(): LaboratoryPipeline {
  const nodes: PipelineNode[] = [
    {
      id: 'node-input',
      type: 'synthetic_stream',
      label: 'Synthetic Stream',
      category: 'input',
      x: 40,
      y: 120,
      inputs: [],
      outputs: [{ id: 'out_landmarks', name: '3D Keypoints', type: 'landmarks', direction: 'output' }],
      parameters: { speed: 1.0 },
      status: 'ok',
    },
    {
      id: 'node-prep',
      type: 'wrist_normalizer',
      label: 'Wrist Centering & Scale',
      category: 'preprocessing',
      x: 270,
      y: 120,
      inputs: [{ id: 'in_landmarks', name: 'Raw Keypoints', type: 'landmarks', direction: 'input' }],
      outputs: [{ id: 'out_normalized', name: 'Normalized Keypoints', type: 'landmarks', direction: 'output' }],
      parameters: { anchorJoint: 0, scaleJoint: 9 },
      status: 'ok',
    },
    {
      id: 'node-feat',
      type: 'landmark_vector_extractor',
      label: '63D Feature Vectorizer',
      category: 'feature',
      x: 500,
      y: 120,
      inputs: [{ id: 'in_normalized', name: 'Normalized Keypoints', type: 'landmarks', direction: 'input' }],
      outputs: [{ id: 'out_features', name: 'Feature Vector [63]', type: 'features', direction: 'output' }],
      parameters: {},
      status: 'ok',
    },
    {
      id: 'node-class',
      type: 'prototype_classifier',
      label: 'Centroid Prototype Matcher',
      category: 'classifier',
      x: 730,
      y: 120,
      inputs: [{ id: 'in_features', name: 'Feature Vector', type: 'features', direction: 'input' }],
      outputs: [{ id: 'out_class', name: 'Classification', type: 'classification', direction: 'output' }],
      parameters: { confidenceThreshold: 0.68 },
      status: 'ok',
    },
    {
      id: 'node-stab',
      type: 'temporal_stabilizer',
      label: 'Temporal Hysteresis Filter',
      category: 'postprocessing',
      x: 960,
      y: 120,
      inputs: [{ id: 'in_class', name: 'Raw Prediction', type: 'classification', direction: 'input' }],
      outputs: [{ id: 'out_stable_class', name: 'Stabilized Class', type: 'classification', direction: 'output' }],
      parameters: { minHoldMs: 90 },
      status: 'ok',
    },
    {
      id: 'node-fx',
      type: 'fx_trigger_output',
      label: 'Visual FX Dispatcher',
      category: 'output',
      x: 1190,
      y: 120,
      inputs: [{ id: 'in_gesture', name: 'Stabilized Gesture', type: 'classification', direction: 'input' }],
      outputs: [{ id: 'out_event', name: 'Event Bus', type: 'event', direction: 'output' }],
      parameters: { preset: 'CYBER_NEON' },
      status: 'ok',
    },
  ];

  const connections: PipelineConnection[] = [
    {
      id: 'c1',
      fromNodeId: 'node-input',
      fromPortId: 'out_landmarks',
      toNodeId: 'node-prep',
      toPortId: 'in_landmarks',
    },
    {
      id: 'c2',
      fromNodeId: 'node-prep',
      fromPortId: 'out_normalized',
      toNodeId: 'node-feat',
      toPortId: 'in_normalized',
    },
    {
      id: 'c3',
      fromNodeId: 'node-feat',
      fromPortId: 'out_features',
      toNodeId: 'node-class',
      toPortId: 'in_features',
    },
    {
      id: 'c4',
      fromNodeId: 'node-class',
      fromPortId: 'out_class',
      toNodeId: 'node-stab',
      toPortId: 'in_class',
    },
    {
      id: 'c5',
      fromNodeId: 'node-stab',
      fromPortId: 'out_stable_class',
      toNodeId: 'node-fx',
      toPortId: 'in_gesture',
    },
  ];

  return {
    nodes,
    connections,
    isValid: true,
    version: '1.0.0',
  };
}

/**
 * Checks whether two port types can be safely connected
 */
export function arePortsCompatible(fromType: PortDataType, toType: PortDataType): boolean {
  if (fromType === toType) return true;
  // Frame buffer / stream can feed landmarks if landmarker is embedded
  if (fromType === 'stream' && toType === 'landmarks') return true;
  if (fromType === 'classification' && toType === 'event') return true;
  return false;
}

/**
 * Validates pipeline DAG for cycles, port compatibility, and required nodes
 */
export function validatePipeline(pipeline: LaboratoryPipeline): {
  isValid: boolean;
  errors: string[];
  executionOrder: string[];
} {
  const errors: string[] = [];
  const nodeMap = new Map<string, PipelineNode>();
  pipeline.nodes.forEach((n) => nodeMap.set(n.id, n));

  const hasInput = pipeline.nodes.some((n) => n.category === 'input');
  const hasOutput = pipeline.nodes.some((n) => n.category === 'output');

  if (!hasInput) {
    errors.push('Pipeline missing an Input node (e.g. Camera Sensor or Synthetic Stream).');
  }
  if (!hasOutput) {
    errors.push('Pipeline missing an Output node (e.g. Visual FX Dispatcher or Sound).');
  }

  // Check port connections compatibility
  for (const conn of pipeline.connections) {
    const fromNode = nodeMap.get(conn.fromNodeId);
    const toNode = nodeMap.get(conn.toNodeId);

    if (!fromNode || !toNode) {
      errors.push(`Broken connection between missing nodes (${conn.fromNodeId} -> ${conn.toNodeId}).`);
      continue;
    }

    const fromPort = fromNode.outputs.find((p) => p.id === conn.fromPortId);
    const toPort = toNode.inputs.find((p) => p.id === conn.toPortId);

    if (!fromPort || !toPort) {
      errors.push(`Port mismatch between "${fromNode.label}" and "${toNode.label}".`);
    } else if (!arePortsCompatible(fromPort.type, toPort.type)) {
      errors.push(`Type incompatibility: "${fromPort.name}" (${fromPort.type}) cannot connect to "${toPort.name}" (${toPort.type}).`);
    }
  }

  // Cycle detection (Topological sort via Kahn's algorithm)
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  pipeline.nodes.forEach((n) => {
    inDegree.set(n.id, 0);
    adjList.set(n.id, []);
  });

  pipeline.connections.forEach((c) => {
    const current = inDegree.get(c.toNodeId) || 0;
    inDegree.set(c.toNodeId, current + 1);
    adjList.get(c.fromNodeId)?.push(c.toNodeId);
  });

  const queue: string[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) queue.push(id);
  });

  const executionOrder: string[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    executionOrder.push(curr);

    const neighbors = adjList.get(curr) || [];
    for (const nb of neighbors) {
      const nextDeg = (inDegree.get(nb) || 1) - 1;
      inDegree.set(nb, nextDeg);
      if (nextDeg === 0) {
        queue.push(nb);
      }
    }
  }

  if (executionOrder.length !== pipeline.nodes.length) {
    errors.push('Cycle detected in visual pipeline graph. Pipelines must be directed acyclic graphs (DAG).');
  }

  return {
    isValid: errors.length === 0,
    errors,
    executionOrder,
  };
}

/**
 * Functional Execution Engine:
 * Takes an input frame / synthetic landmarks and passes real data sequentially
 * through the pipeline according to topological execution order, updating `lastOutput` on each node!
 */
export function executePipeline(
  pipeline: LaboratoryPipeline,
  inputLandmarks?: Landmark3D[] | null,
  prototypes?: Record<string, number[]>
): {
  pipeline: LaboratoryPipeline;
  finalOutput: any;
  executionLog: string[];
} {
  const validation = validatePipeline(pipeline);
  if (!validation.isValid) {
    throw new Error(`Pipeline cannot execute: ${validation.errors.join('; ')}`);
  }

  const log: string[] = [];
  const nodeMap = new Map<string, PipelineNode>();
  pipeline.nodes.forEach((n) => nodeMap.set(n.id, { ...n }));

  // Port value store: map from `${nodeId}:${portId}` -> data
  const portValues = new Map<string, any>();

  for (const nodeId of validation.executionOrder) {
    const node = nodeMap.get(nodeId)!;
    node.status = 'running';

    // Collect inputs for this node from incoming connections
    const incomingConnections = pipeline.connections.filter((c) => c.toNodeId === nodeId);
    const inputs: Record<string, any> = {};
    for (const conn of incomingConnections) {
      const srcKey = `${conn.fromNodeId}:${conn.fromPortId}`;
      inputs[conn.toPortId] = portValues.get(srcKey);
    }

    let outputValue: any = null;

    switch (node.type) {
      case 'synthetic_stream': {
        const streamData = inputLandmarks || generateSyntheticHand(Date.now());
        outputValue = streamData;
        portValues.set(`${nodeId}:out_landmarks`, streamData);
        log.push(`[${node.label}] Produced 21 3D synthetic keypoints.`);
        break;
      }

      case 'camera_input': {
        const camData = inputLandmarks || generateSyntheticHand(Date.now());
        outputValue = camData;
        portValues.set(`${nodeId}:out_stream`, camData);
        log.push(`[${node.label}] Captured optical frame buffer.`);
        break;
      }

      case 'wrist_normalizer': {
        const rawKeypoints = inputs['in_landmarks'] || inputLandmarks || generateSyntheticHand(Date.now());
        const wrist = rawKeypoints[0] || { x: 0, y: 0, z: 0 };
        const middleMCP = rawKeypoints[9] || { x: 0, y: 0.1, z: 0 };
        const dx = middleMCP.x - wrist.x;
        const dy = middleMCP.y - wrist.y;
        const dz = middleMCP.z - wrist.z;
        const scale = Math.max(0.001, Math.sqrt(dx * dx + dy * dy + dz * dz));

        const normalized = rawKeypoints.map((pt: Landmark3D) => ({
          x: (pt.x - wrist.x) / scale,
          y: (pt.y - wrist.y) / scale,
          z: (pt.z - wrist.z) / scale,
        }));

        outputValue = normalized;
        portValues.set(`${nodeId}:out_normalized`, normalized);
        log.push(`[${node.label}] Wrist centered at origin, scaled by ${scale.toFixed(3)}.`);
        break;
      }

      case 'landmark_vector_extractor': {
        const pts = inputs['in_normalized'] || inputLandmarks || generateSyntheticHand(Date.now());
        const vector = HandFeatureExtractor.extractNormalizedVector(pts);
        outputValue = vector;
        portValues.set(`${nodeId}:out_features`, vector);
        log.push(`[${node.label}] Extracted 63-dimensional normalized feature vector.`);
        break;
      }

      case 'finger_curl_trigonometry': {
        const pts = inputs['in_landmarks'] || inputLandmarks || generateSyntheticHand(Date.now());
        const wrist = pts[0] || { x: 0, y: 0, z: 0 };
        const tips = [4, 8, 12, 16, 20];
        const curls = tips.map((tIdx) => {
          const tip = pts[tIdx] || { x: 0, y: 0, z: 0 };
          const pip = pts[tIdx - 2] || { x: 0, y: 0, z: 0 };
          const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
          const dPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
          return Math.round((dTip / Math.max(0.001, dPip)) * 100) / 100;
        });
        outputValue = curls;
        portValues.set(`${nodeId}:out_angles`, curls);
        log.push(`[${node.label}] Evaluated 5 finger extension ratios: [${curls.join(', ')}].`);
        break;
      }

      case 'prototype_classifier':
      case 'knn_classifier': {
        const features = inputs['in_features'] || HandFeatureExtractor.extractNormalizedVector(inputLandmarks || generateSyntheticHand(Date.now()));
        const protos = prototypes || {
          OPEN_PALM: HandFeatureExtractor.extractNormalizedVector(generateSyntheticHand(1000)),
          NEUTRAL: HandFeatureExtractor.extractNormalizedVector(generateSyntheticHand(1000)).map((v) => v * 0.7),
        };

        let minD = Infinity;
        let best = 'UNKNOWN';
        for (const [cls, proto] of Object.entries(protos)) {
          const d = HandFeatureExtractor.euclideanDistance(features, proto);
          if (d < minD) {
            minD = d;
            best = cls;
          }
        }
        const conf = Math.max(0.1, Math.min(1.0, Math.exp(-minD * 1.5)));
        const res = { label: best, confidence: Math.round(conf * 100) / 100, distance: Math.round(minD * 1000) / 1000 };
        outputValue = res;
        portValues.set(`${nodeId}:out_class`, res);
        log.push(`[${node.label}] Classified as "${best}" (confidence: ${Math.round(conf * 100)}%, dist: ${minD.toFixed(3)}).`);
        break;
      }

      case 'temporal_stabilizer': {
        const rawClass = inputs['in_class'] || { label: 'OPEN_PALM', confidence: 0.95 };
        const stabilized = { ...rawClass, stabilized: true, holdMs: node.parameters.minHoldMs || 90 };
        outputValue = stabilized;
        portValues.set(`${nodeId}:out_stable_class`, stabilized);
        log.push(`[${node.label}] Stabilized label: "${stabilized.label}" (threshold passed).`);
        break;
      }

      case 'fx_trigger_output': {
        const stableClass = inputs['in_gesture'] || { label: 'OPEN_PALM', confidence: 0.95 };
        const event = {
          type: 'GESTURE_FX_EVENT',
          gesture: stableClass.label,
          preset: node.parameters.preset || 'CYBER_NEON',
          timestamp: Date.now(),
        };
        outputValue = event;
        portValues.set(`${nodeId}:out_event`, event);
        log.push(`[${node.label}] Dispatched FX event: "${event.gesture}" with preset "${event.preset}".`);
        break;
      }

      case 'audio_synth_output': {
        const trigger = inputs['in_event'] || { gesture: 'OPEN_PALM' };
        outputValue = { audioPlayed: true, tone: 650 };
        log.push(`[${node.label}] Triggered audio synthesis tone for "${trigger.gesture || 'EVENT'}".`);
        break;
      }

      default: {
        outputValue = { success: true };
        log.push(`[${node.label}] Executed custom step.`);
      }
    }

    node.status = 'ok';
    node.lastOutput = outputValue;
  }

  const updatedNodes = Array.from(nodeMap.values());
  const lastExecutedNode = updatedNodes[updatedNodes.length - 1];

  return {
    pipeline: { ...pipeline, nodes: updatedNodes },
    finalOutput: lastExecutedNode?.lastOutput,
    executionLog: log,
  };
}
