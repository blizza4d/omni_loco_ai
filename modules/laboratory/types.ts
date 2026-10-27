import { Landmark3D } from '../hand/types';
import { GestureFXType } from '../hand/fx/types';

export type ModelLifecycleState =
  | 'DRAFT'
  | 'CONFIGURED'
  | 'DATA_READY'
  | 'TRAINED'
  | 'VALIDATED'
  | 'SAVED'
  | 'ENABLED';

export type ModelType =
  | 'knn_landmark'
  | 'centroid_prototype'
  | 'decision_tree'
  | 'geometric_rules'
  | 'pipeline';

export interface TrainingSample {
  id: string;
  label: string;
  landmarks: Landmark3D[];
  normalizedFeatures: number[]; // 63 features (21 points * 3 relative coordinates)
  timestamp: number;
  hand: 'Left' | 'Right';
  burstId?: string; // Grouping identifier for consecutive frames from the same recording session
  qualityScore?: number; // 0 to 1 based on hand landmark visibility and stability
}

export interface DatasetQualityReport {
  totalSamples: number;
  classCounts: Record<string, number>;
  imbalanceRatio: number; // max / min class count
  nearDuplicateCount: number;
  meanFeatureVariance: number;
  isValidForTraining: boolean;
  warnings: string[];
  recommendations: string[];
}

export interface LaboratoryDataset {
  id: string;
  name: string;
  description: string;
  version: string;
  classes: string[];
  samples: TrainingSample[];
  createdAt: string;
  updatedAt: string;
  qualityReport?: DatasetQualityReport;
}

export interface ConfusionMatrixData {
  labels: string[];
  matrix: number[][]; // [actual][predicted]
  overallAccuracy: number;
  perClassAccuracy: Record<string, number>;
  precision?: Record<string, number>;
  recall?: Record<string, number>;
  f1Score?: Record<string, number>;
}

export interface TrainingStats {
  sampleCount: number;
  trainAccuracy: number;
  valAccuracy: number;
  classCounts: Record<string, number>;
  confusionMatrix?: ConfusionMatrixData;
  trainedAt: string;
  durationMs?: number;
  algorithm?: string;
}

export interface PrototypeModelData {
  classes: string[];
  prototypes: Record<string, number[]>; // label -> 63D centroid vector
  kNearest?: number;
  metric?: 'euclidean' | 'cosine';
  confidenceThreshold?: number;
  trainingSamples?: TrainingSample[];
  decisionTreeNodes?: any;
}

export type PortDataType =
  | 'stream'
  | 'landmarks'
  | 'features'
  | 'classification'
  | 'event'
  | 'config'
  | 'number'
  | 'string';

export interface PortDefinition {
  id: string;
  name: string;
  type: PortDataType;
  direction?: 'input' | 'output';
  description?: string;
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
  lastOutput?: any;
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

export interface ModelHyperparameters {
  confidenceThreshold: number;
  kNeighbors?: number;
  metric?: 'euclidean' | 'cosine';
  smoothingFrames: number;
  pinchThreshold?: number;
  swipeSpeedThreshold?: number;
  detectionConfidence?: number;
  trackingConfidence?: number;
  maxHands?: number;
}

export interface ModelVersionSnapshot {
  version: string;
  timestamp: string;
  changeNote: string;
  hyperparameters: ModelHyperparameters;
  trainingStats?: TrainingStats;
  modelData?: PrototypeModelData;
  pipelineConfig?: LaboratoryPipeline;
  fxMapping?: Record<string, GestureFXType>;
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
  lifecycleState: ModelLifecycleState;
  classes: string[];
  datasetId?: string;
  trainingStats?: TrainingStats;
  modelData?: PrototypeModelData;
  pipelineConfig?: LaboratoryPipeline;
  fxMapping?: Record<string, GestureFXType>;
  hyperparameters: ModelHyperparameters;
  versionHistory?: ModelVersionSnapshot[];
}

export interface LaboratoryExperiment {
  id: string;
  name: string;
  modelId: string;
  modelName: string;
  modelVersion: string;
  datasetId?: string;
  datasetName?: string;
  algorithm: string;
  hyperparameters: ModelHyperparameters;
  stats: TrainingStats;
  notes: string;
  createdAt: string;
}

export interface LaboratoryDraft {
  modelId: string;
  mode: string;
  timestamp: number;
  unsavedModel?: Partial<LaboratoryModel>;
  unsavedDataset?: Partial<LaboratoryDataset>;
  unsavedPipeline?: Partial<LaboratoryPipeline>;
}
