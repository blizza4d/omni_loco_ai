import { describe, it, expect } from 'vitest';
import {
  MODULE_REGISTRY,
  getCategorySummaries,
  ModuleCategory,
} from '../core/modules/registry';
import { REGISTERED_MODELS } from '../core/cache';

describe('Omni Loco AI: Platform Architecture, Registry & UI Validation', () => {
  it('registers all 11 advertised multimodal neural modules', () => {
    expect(MODULE_REGISTRY).toHaveLength(11);

    const expectedFigures = [
      'FIG. 01',
      'FIG. 02',
      'FIG. 03',
      'FIG. 04',
      'FIG. 05',
      'FIG. 06',
      'FIG. 07',
      'FIG. 08',
      'FIG. 09',
      'FIG. 10',
      'FIG. 11',
    ];

    const actualFigures = MODULE_REGISTRY.map((m) => m.figure);
    expect(actualFigures).toEqual(expectedFigures);
  });

  it('guarantees unique IDs and valid routes for all modules', () => {
    const ids = new Set<string>();
    const routes = new Set<string>();

    for (const mod of MODULE_REGISTRY) {
      expect(ids.has(mod.id)).toBe(false);
      ids.add(mod.id);

      expect(routes.has(mod.route)).toBe(false);
      routes.add(mod.route);

      expect(mod.route.startsWith('/')).toBe(true);
      expect(mod.title.length).toBeGreaterThan(0);
      expect(mod.description.length).toBeGreaterThan(0);
      expect(mod.modelUrl.length).toBeGreaterThan(0);
      expect(mod.features.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('calculates category summaries dynamically from registry without hardcoded totals', () => {
    const summaries = getCategorySummaries();
    expect(summaries).toHaveLength(5);

    const allSummary = summaries.find((s) => s.id === 'ALL');
    expect(allSummary).toBeDefined();
    expect(allSummary?.count).toBe(11);

    const visionSummary = summaries.find((s) => s.id === 'VISION');
    const simSummary = summaries.find((s) => s.id === 'SIMULATION');
    const audioSummary = summaries.find((s) => s.id === 'AUDIO');
    const classSummary = summaries.find((s) => s.id === 'CLASSIFICATION');

    expect(visionSummary?.count).toBe(7);
    expect(simSummary?.count).toBe(1);
    expect(audioSummary?.count).toBe(1);
    expect(classSummary?.count).toBe(2);

    // Sum of categorized counts must equal total
    const sum =
      (visionSummary?.count || 0) +
      (simSummary?.count || 0) +
      (audioSummary?.count || 0) +
      (classSummary?.count || 0);
    expect(sum).toBe(11);
  });

  it('synchronizes cache registry with active modules', () => {
    expect(REGISTERED_MODELS).toHaveLength(11);

    const cacheModuleIds = REGISTERED_MODELS.map((m) => m.module);
    const registryIds = MODULE_REGISTRY.map((m) => m.id);

    // Every module must have a corresponding cache definition
    for (const id of registryIds) {
      expect(cacheModuleIds).toContain(id);
    }
  });

  it('verifies strict on-device model paths (no remote or cloud API endpoints)', () => {
    for (const mod of MODULE_REGISTRY) {
      // Must be self-hosted local asset paths (/models/... or /wasm/...)
      expect(
        mod.modelUrl.startsWith('/models/') || mod.modelUrl.startsWith('/wasm/')
      ).toBe(true);

      // Must not contain remote cloud domains or telemetry trackers
      expect(mod.modelUrl).not.toContain('http://');
      expect(mod.modelUrl).not.toContain('https://');
      expect(mod.modelUrl).not.toContain('api.google.com');
      expect(mod.modelUrl).not.toContain('amazonaws.com');
    }
  });
});
