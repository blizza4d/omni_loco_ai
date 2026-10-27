import { Landmark3D } from '../hand/types';
import { GestureFXType } from '../hand/fx/types';

export type ModelType =
  | 'knn_landmark'
  | 'centroid_prototype'
  | 'geometric_rules'
  | 'pipeline';

export interface TrainingSample {
  id: string;
  label: string;
  landmarks: Landmark3D[];
  normalizedFeatures: number[]; // 63 features (21 points * 3 relative coordinates)
  timestamp: number;
  hand: 'Left' | 'Right';
}

export interface ConfusionMatrixData {
  labels: string[];
  matrix: number[][]; // [actual][predicted]
  overallAccuracy: number;
  perClassAccuracy: Record<string, number>;
}

export interface TrainingStats {
  sampleCount: number;
  trainAccuracy: number;
  valAccuracy: number;
  classCounts: Record<string, number>;
  confusionMatrix?: ConfusionMatrixData;
  trainedAt: string;
}

export interface PrototypeModelData {
  classes: string[];
  prototypes: Record<string, number[]>; // label -> 63D centroid vector
  kNearest?: number;
  metric?: 'euclidean' | 'cosine';
  confidenceThreshold?: number;
  trainingSamples?: TrainingSample[];
}

export interface PortDefinition {
  id: string;
  name: string;
  type: 'stream' | 'landmarks' | 'features' | 'classification' | 'event' | 'config';
  direction?: 'input' | 'output';
}

export type PipelineNodeCategory =
  | 'input'
  | 'preprocessing'
  | 'feature'
  | 'classifier'
  | 'postprocessing'
  | 'output';

export interface PipelineNode {
  id: string;
  type: string;
  label: string;
  category: PipelineNodeCategory;
  x: number;
  y: number;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  parameters: Record<string, any>;
  status?: 'idle' | 'running' | 'error' | 'ok';
}

export interface PipelineConnection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
}

export interface LaboratoryPipeline {
  nodes: PipelineNode[];
  connections: PipelineConnection[];
  isValid: boolean;
  version: string;
}

export interface LaboratoryModel {
  id: string;
  name: string;
  description: string;
  version: string;
  figureTag: string; // e.g. "EXP. 01"
  author: string;
  createdAt: string;
  updatedAt: string;
  isBuiltIn: boolean;
  isPublished: boolean;
  modelType: ModelType;
  classes: string[];
  trainingStats?: TrainingStats;
  modelData?: PrototypeModelData;
  pipelineConfig?: LaboratoryPipeline;
  fxMapping?: Record<string, GestureFXType>;
  hyperparameters: {
    confidenceThreshold: number;
    kNeighbors?: number;
    metric?: 'euclidean' | 'cosine';
    smoothingFrames: number;
    pinchThreshold?: number;
    swipeSpeedThreshold?: number;
  };
}
