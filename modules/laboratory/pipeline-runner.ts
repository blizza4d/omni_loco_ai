import {
  LaboratoryPipeline,
  PipelineNode,
  PipelineConnection,
  PipelineNodeCategory,
} from './types';

export interface NodeTemplate {
  type: string;
  label: string;
  category: PipelineNodeCategory;
  inputs: { id: string; name: string; type: any }[];
  outputs: { id: string; name: string; type: any }[];
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
    outputs: [{ id: 'out_landmarks', name: 'Raw 3D Keypoints', type: 'landmarks' }],
    defaultParameters: { pattern: 'harmonic_cycle', speed: 1.0 },
  },

  // 2. Preprocessing
  {
    type: 'wrist_normalizer',
    label: 'Wrist Centering & Scale',
    category: 'preprocessing',
    inputs: [{ id: 'in_landmarks', name: 'Raw Landmarks', type: 'landmarks' }],
    outputs: [{ id: 'out_normalized', name: 'Normalized Landmarks', type: 'landmarks' }],
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
    inputs: [{ id: 'in_landmarks', name: 'Normalized Keypoints', type: 'landmarks' }],
    outputs: [{ id: 'out_angles', name: 'Bone Angles [5]', type: 'features' }],
    defaultParameters: { thresholdCurl: 1.05 },
  },

  // 4. Classifiers
  {
    type: 'prototype_classifier',
    label: 'Centroid Prototype Matcher',
    category: 'classifier',
    inputs: [{ id: 'in_features', name: 'Feature Vector', type: 'features' }],
    outputs: [{ id: 'out_class', name: 'Class Prediction', type: 'classification' }],
    defaultParameters: { metric: 'euclidean', confidenceThreshold: 0.7 },
  },
  {
    type: 'knn_classifier',
    label: 'k-NN Neighbor Voter',
    category: 'classifier',
    inputs: [{ id: 'in_features', name: 'Feature Vector', type: 'features' }],
    outputs: [{ id: 'out_class', name: 'Class Prediction', type: 'classification' }],
    defaultParameters: { k: 3, metric: 'euclidean' },
  },

  // 5. Postprocessing
  {
    type: 'temporal_stabilizer',
    label: 'One Euro & Voting Filter',
    category: 'postprocessing',
    inputs: [{ id: 'in_class', name: 'Raw Class', type: 'classification' }],
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
      id: 'node-camera',
      type: 'camera_input',
      label: 'Camera Sensor',
      category: 'input',
      x: 50,
      y: 120,
      inputs: [],
      outputs: [{ id: 'out_stream', name: 'Frame Buffer', type: 'stream' }],
      parameters: { resolution: '640x480' },
      status: 'ok',
    },
    {
      id: 'node-prep',
      type: 'wrist_normalizer',
      label: 'Wrist Centering & Scale',
      category: 'preprocessing',
      x: 270,
      y: 120,
      inputs: [{ id: 'in_landmarks', name: 'Raw Landmarks', type: 'landmarks' }],
      outputs: [{ id: 'out_normalized', name: 'Normalized Landmarks', type: 'landmarks' }],
      parameters: {},
      status: 'ok',
    },
    {
      id: 'node-feat',
      type: 'landmark_vector_extractor',
      label: '63D Feature Vectorizer',
      category: 'feature',
      x: 510,
      y: 120,
      inputs: [{ id: 'in_normalized', name: 'Normalized Keypoints', type: 'landmarks' }],
      outputs: [{ id: 'out_features', name: 'Feature Vector [63]', type: 'features' }],
      parameters: {},
      status: 'ok',
    },
    {
      id: 'node-class',
      type: 'prototype_classifier',
      label: 'Centroid Prototype Matcher',
      category: 'classifier',
      x: 750,
      y: 120,
      inputs: [{ id: 'in_features', name: 'Feature Vector', type: 'features' }],
      outputs: [{ id: 'out_class', name: 'Class Prediction', type: 'classification' }],
      parameters: { confidenceThreshold: 0.7 },
      status: 'ok',
    },
    {
      id: 'node-stab',
      type: 'temporal_stabilizer',
      label: 'One Euro & Voting Filter',
      category: 'postprocessing',
      x: 990,
      y: 120,
      inputs: [{ id: 'in_class', name: 'Raw Class', type: 'classification' }],
      outputs: [{ id: 'out_stable_class', name: 'Stabilized Class', type: 'classification' }],
      parameters: { minHoldMs: 90 },
      status: 'ok',
    },
    {
      id: 'node-fx',
      type: 'fx_trigger_output',
      label: 'Visual FX Engine Dispatcher',
      category: 'output',
      x: 1230,
      y: 120,
      inputs: [{ id: 'in_gesture', name: 'Stabilized Gesture', type: 'classification' }],
      outputs: [{ id: 'out_event', name: 'Event Bus', type: 'event' }],
      parameters: { preset: 'CYBER_NEON' },
      status: 'ok',
    },
  ];

  const connections: PipelineConnection[] = [
    {
      id: 'c1',
      fromNodeId: 'node-camera',
      fromPortId: 'out_stream',
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
 * Validates pipeline DAG for cycles, disconnected critical nodes, and port compatibility
 */
export function validatePipeline(pipeline: LaboratoryPipeline): {
  isValid: boolean;
  errors: string[];
  executionOrder: string[];
} {
  const errors: string[] = [];
  const nodeMap = new Map<string, PipelineNode>();
  pipeline.nodes.forEach((n) => nodeMap.set(n.id, n));

  // Check that input and output nodes exist
  const hasInput = pipeline.nodes.some((n) => n.category === 'input');
  const hasOutput = pipeline.nodes.some((n) => n.category === 'output');

  if (!hasInput) {
    errors.push('Pipeline missing an Input node (e.g. Camera Sensor or Synthetic Stream).');
  }
  if (!hasOutput) {
    errors.push('Pipeline missing an Output node (e.g. Visual FX or Sound Trigger).');
  }

  // Check port connections compatibility
  for (const conn of pipeline.connections) {
    const fromNode = nodeMap.get(conn.fromNodeId);
    const toNode = nodeMap.get(conn.toNodeId);

    if (!fromNode || !toNode) {
      errors.push(`Broken connection between non-existent nodes (${conn.fromNodeId} -> ${conn.toNodeId}).`);
      continue;
    }

    const fromPort = fromNode.outputs.find((p) => p.id === conn.fromPortId);
    const toPort = toNode.inputs.find((p) => p.id === conn.toPortId);

    if (!fromPort || !toPort) {
      errors.push(`Port mismatch on link between "${fromNode.label}" and "${toNode.label}".`);
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
