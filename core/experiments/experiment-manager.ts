/**
 * OMNI LOCO AI 2.0 — AI EXPERIMENT MANAGER
 * Persists, indexes, compares and exports experimental perception configurations,
 * feature extraction parameters, and validation benchmarks across modules.
 */

export interface ExperimentRecord {
  id: string;
  name: string;
  moduleId: string;
  modelId: string;
  modelVersion: string;
  configuration: Record<string, unknown>;
  datasetReference?: string;
  metrics: {
    accuracy?: number;
    latencyMs?: number;
    fps?: number;
    samplesCount?: number;
    customScores?: Record<string, number>;
  };
  notes: string;
  createdAt: string;
  updatedAt: string;
  status: 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'ARCHIVED';
}

const STORAGE_KEY = 'omni_loco_experiments_v2';

export class ExperimentManager {
  private static instance: ExperimentManager | null = null;
  private experiments: Map<string, ExperimentRecord> = new Map();

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): ExperimentManager {
    if (!ExperimentManager.instance) {
      ExperimentManager.instance = new ExperimentManager();
    }
    return ExperimentManager.instance;
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as ExperimentRecord[];
        if (Array.isArray(parsed)) {
          parsed.forEach((exp) => this.experiments.set(exp.id, exp));
        }
      }
    } catch (err) {
      console.warn('[ExperimentManager] Failed to load experiments from storage:', err);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const list = Array.from(this.experiments.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.warn('[ExperimentManager] Failed to save experiments to storage:', err);
    }
  }

  public createExperiment(
    params: Omit<ExperimentRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): ExperimentRecord {
    const id = `exp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const exp: ExperimentRecord = {
      ...params,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.experiments.set(id, exp);
    this.saveToStorage();
    return exp;
  }

  public updateExperiment(id: string, updates: Partial<ExperimentRecord>): ExperimentRecord | null {
    const existing = this.experiments.get(id);
    if (!existing) return null;

    const updated: ExperimentRecord = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.experiments.set(id, updated);
    this.saveToStorage();
    return updated;
  }

  public getExperiment(id: string): ExperimentRecord | null {
    return this.experiments.get(id) ?? null;
  }

  public getAllExperiments(): ExperimentRecord[] {
    return Array.from(this.experiments.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public deleteExperiment(id: string): boolean {
    const deleted = this.experiments.delete(id);
    if (deleted) this.saveToStorage();
    return deleted;
  }

  public compareExperiments(idA: string, idB: string) {
    const a = this.getExperiment(idA);
    const b = this.getExperiment(idB);
    if (!a || !b) return null;

    return {
      experimentA: a,
      experimentB: b,
      isCompatible: a.moduleId === b.moduleId,
      metricDelta: {
        accuracy: (a.metrics.accuracy ?? 0) - (b.metrics.accuracy ?? 0),
        latencyMs: (a.metrics.latencyMs ?? 0) - (b.metrics.latencyMs ?? 0),
      },
    };
  }
}
