import {
  CustomGestureDefinition,
  CustomGestureSample,
  GestureSequenceDefinition,
  IntelligentReactionCombo,
  V7LibraryExport,
} from './goofy-types';

const DB_NAME = 'OmniGoofyMemesDB';
const DB_VERSION = 2;

const STORES = {
  MEMES: 'user_memes',
  GESTURES: 'custom_gestures',
  SAMPLES: 'gesture_samples',
  SEQUENCES: 'custom_sequences',
  COMBOS: 'reaction_combos',
} as const;

function openCustomDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in current environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORES.MEMES)) {
        db.createObjectStore(STORES.MEMES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.GESTURES)) {
        db.createObjectStore(STORES.GESTURES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.SAMPLES)) {
        const sampleStore = db.createObjectStore(STORES.SAMPLES, { keyPath: 'id' });
        sampleStore.createIndex('gestureId', 'gestureId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.SEQUENCES)) {
        db.createObjectStore(STORES.SEQUENCES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.COMBOS)) {
        db.createObjectStore(STORES.COMBOS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// CUSTOM GESTURE CRUD
// ============================================================================

export async function saveCustomGestureDefinition(
  gesture: CustomGestureDefinition
): Promise<void> {
  try {
    const db = await openCustomDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.GESTURES, 'readwrite');
      const store = tx.objectStore(STORES.GESTURES);
      const req = store.put(gesture);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[GoofyCustomStore] IndexedDB put gesture failed, using localStorage fallback', err);
    if (typeof window !== 'undefined') {
      const existing = getStoredItemsFallback<CustomGestureDefinition>('omni-custom-gestures');
      const filtered = existing.filter((g) => g.id !== gesture.id);
      localStorage.setItem('omni-custom-gestures', JSON.stringify([...filtered, gesture]));
    }
  }
}

export async function loadAllCustomGestures(): Promise<CustomGestureDefinition[]> {
  try {
    const db = await openCustomDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.GESTURES, 'readonly');
      const store = tx.objectStore(STORES.GESTURES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[GoofyCustomStore] IndexedDB load gestures failed, checking fallback', err);
    return getStoredItemsFallback<CustomGestureDefinition>('omni-custom-gestures');
  }
}

export async function deleteCustomGestureDefinition(gestureId: string): Promise<void> {
  try {
    const db = await openCustomDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORES.GESTURES, STORES.SAMPLES], 'readwrite');
      const gestureStore = tx.objectStore(STORES.GESTURES);
      gestureStore.delete(gestureId);

      // Clean up associated samples
      const sampleStore = tx.objectStore(STORES.SAMPLES);
      const index = sampleStore.index('gestureId');
      const req = index.getAllKeys(gestureId);

      req.onsuccess = () => {
        const keys = req.result;
        for (const k of keys) {
          sampleStore.delete(k);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[GoofyCustomStore] IndexedDB delete gesture failed, fallback', err);
    if (typeof window !== 'undefined') {
      const existing = getStoredItemsFallback<CustomGestureDefinition>('omni-custom-gestures');
      localStorage.setItem(
        'omni-custom-gestures',
        JSON.stringify(existing.filter((g) => g.id !== gestureId))
      );
    }
  }
}

// ============================================================================
// GESTURE SAMPLES CRUD
// ============================================================================

export async function saveGestureSamples(samples: CustomGestureSample[]): Promise<void> {
  if (!samples || samples.length === 0) return;

  try {
    const db = await openCustomDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.SAMPLES, 'readwrite');
      const store = tx.objectStore(STORES.SAMPLES);
      for (const s of samples) {
        store.put(s);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[GoofyCustomStore] IndexedDB save samples failed, fallback', err);
    if (typeof window !== 'undefined') {
      const existing = getStoredItemsFallback<CustomGestureSample>('omni-gesture-samples');
      const sampleMap = new Map(existing.map((s) => [s.id, s]));
      for (const s of samples) {
        sampleMap.set(s.id, s);
      }
      localStorage.setItem('omni-gesture-samples', JSON.stringify(Array.from(sampleMap.values())));
    }
  }
}

export async function loadAllGestureSamples(): Promise<CustomGestureSample[]> {
  try {
    const db = await openCustomDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SAMPLES, 'readonly');
      const store = tx.objectStore(STORES.SAMPLES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[GoofyCustomStore] IndexedDB load samples failed, fallback', err);
    return getStoredItemsFallback<CustomGestureSample>('omni-gesture-samples');
  }
}

export async function deleteGestureSample(sampleId: string): Promise<void> {
  try {
    const db = await openCustomDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.SAMPLES, 'readwrite');
      const store = tx.objectStore(STORES.SAMPLES);
      const req = store.delete(sampleId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[GoofyCustomStore] IndexedDB delete sample failed, fallback', err);
    if (typeof window !== 'undefined') {
      const existing = getStoredItemsFallback<CustomGestureSample>('omni-gesture-samples');
      localStorage.setItem(
        'omni-gesture-samples',
        JSON.stringify(existing.filter((s) => s.id !== sampleId))
      );
    }
  }
}

// ============================================================================
// CUSTOM SEQUENCES & COMBOS CRUD
// ============================================================================

export async function saveCustomSequencesToDB(
  sequences: GestureSequenceDefinition[]
): Promise<void> {
  try {
    const db = await openCustomDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.SEQUENCES, 'readwrite');
      const store = tx.objectStore(STORES.SEQUENCES);
      store.clear();
      for (const s of sequences) {
        store.put(s);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[GoofyCustomStore] IndexedDB save sequences failed, fallback', err);
    if (typeof window !== 'undefined') {
      localStorage.setItem('omni-custom-sequences', JSON.stringify(sequences));
    }
  }
}

export async function loadCustomSequencesFromDB(): Promise<GestureSequenceDefinition[]> {
  try {
    const db = await openCustomDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SEQUENCES, 'readonly');
      const store = tx.objectStore(STORES.SEQUENCES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[GoofyCustomStore] IndexedDB load sequences failed, fallback', err);
    return getStoredItemsFallback<GestureSequenceDefinition>('omni-custom-sequences');
  }
}

// ============================================================================
// V7 FULL LIBRARY EXPORT & IMPORT (VALIDATING SCHEMA)
// ============================================================================

export async function exportV7FullLibrary(
  configOrMappings?: any,
  actionCustomCaptions: Record<string, string> = {},
  multiMemeAssignments: Record<string, string[]> = {}
): Promise<string> {
  const gestures = await loadAllCustomGestures();
  const samples = await loadAllGestureSamples();
  const sequences = await loadCustomSequencesFromDB();

  let mappings: Record<string, string> = {};
  let captions: Record<string, string> = {};
  let multi: Record<string, string[]> = {};

  if (configOrMappings && typeof configOrMappings === 'object') {
    if ('actionMemeMappings' in configOrMappings) {
      mappings = configOrMappings.actionMemeMappings || {};
      captions = configOrMappings.actionCustomCaptions || {};
      multi = configOrMappings.multiMemeAssignments || {};
    } else {
      mappings = configOrMappings;
      captions = actionCustomCaptions;
      multi = multiMemeAssignments;
    }
  }

  const exportPayload: V7LibraryExport = {
    version: '7.0.0',
    exportedAt: new Date().toISOString(),
    system: 'OmniLocoGoofyModel',
    customGestures: gestures,
    samples,
    customSequences: sequences,
    customMemes: [],
    actionMemeMappings: mappings,
    actionCustomCaptions: captions,
    multiMemeAssignments: multi,
  };

  return JSON.stringify(exportPayload, null, 2);
}

export async function importV7FullLibrary(
  jsonString: string
): Promise<{
  success: boolean;
  importedGestures: number;
  gesturesImported: number;
  importedSamples: number;
  importedSequences: number;
  sequencesImported: number;
  actionMemeMappings: Record<string, string>;
  actionCustomCaptions: Record<string, string>;
  multiMemeAssignments: Record<string, string[]>;
  error?: string;
}> {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    return {
      success: false,
      importedGestures: 0,
      gesturesImported: 0,
      importedSamples: 0,
      importedSequences: 0,
      sequencesImported: 0,
      actionMemeMappings: {},
      actionCustomCaptions: {},
      multiMemeAssignments: {},
      error: 'Invalid JSON format. Please verify the file integrity.',
    };
  }

  // Schema validation
  if (!parsed || typeof parsed !== 'object') {
    return {
      success: false,
      importedGestures: 0,
      gesturesImported: 0,
      importedSamples: 0,
      importedSequences: 0,
      sequencesImported: 0,
      actionMemeMappings: {},
      actionCustomCaptions: {},
      multiMemeAssignments: {},
      error: 'Import data must be a valid JSON object.',
    };
  }

  let importedGestures = 0;
  let importedSamples = 0;
  let importedSequences = 0;

  // 1. Gestures
  if (Array.isArray(parsed.customGestures)) {
    for (const g of parsed.customGestures) {
      if (g && g.id && (g.name || g.label)) {
        await saveCustomGestureDefinition({
          ...g,
          name: g.name || g.label,
        });
        importedGestures++;
      }
    }
  }

  // 2. Samples
  if (Array.isArray(parsed.samples)) {
    const validSamples: CustomGestureSample[] = [];
    for (const s of parsed.samples) {
      if (s && s.id && s.gestureId && Array.isArray(s.landmarks) && s.landmarks.length === 21) {
        validSamples.push(s);
      }
    }
    await saveGestureSamples(validSamples);
    importedSamples = validSamples.length;
  }

  // 3. Sequences
  if (Array.isArray(parsed.customSequences)) {
    const validSequences: GestureSequenceDefinition[] = [];
    for (const seq of parsed.customSequences) {
      if (seq && seq.id && seq.label && Array.isArray(seq.steps) && seq.steps.length >= 2) {
        validSequences.push(seq);
      }
    }
    await saveCustomSequencesToDB(validSequences);
    importedSequences = validSequences.length;
  }

  return {
    success: true,
    importedGestures,
    gesturesImported: importedGestures,
    importedSamples,
    importedSequences,
    sequencesImported: importedSequences,
    actionMemeMappings: parsed.actionMemeMappings || {},
    actionCustomCaptions: parsed.actionCustomCaptions || {},
    multiMemeAssignments: parsed.multiMemeAssignments || {},
  };
}

function getStoredItemsFallback<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
