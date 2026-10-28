/**
 * OMNI PROTOCOL FORGE — STORAGE & PERSISTENCE
 * Manages protocol persistence, template libraries, session logs, and JSON export/import.
 */

import { ProtocolDefinition, ProtocolSessionLog } from './types';
import { BUILT_IN_PROTOCOLS } from './templates';

const PROTOCOLS_STORAGE_KEY = 'omni-forge-protocols-v1';
const SESSIONS_STORAGE_KEY = 'omni-forge-sessions-v1';

// In-memory fallback for non-browser / test environments
const memoryStore = new Map<string, string>();

function getStorageItem(key: string): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memoryStore.get(key) ?? null;
    }
  }
  return memoryStore.get(key) ?? null;
}

function setStorageItem(key: string, value: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Fallback to memory
    }
  }
  memoryStore.set(key, value);
}

export function getAllProtocols(): ProtocolDefinition[] {
  try {
    const raw = getStorageItem(PROTOCOLS_STORAGE_KEY);
    const userProtocols: ProtocolDefinition[] = raw ? JSON.parse(raw) : [];

    // Combine user protocols with factory built-ins
    const userIds = new Set(userProtocols.map((p) => p.id));
    const nonOverridden = BUILT_IN_PROTOCOLS.filter((b) => !userIds.has(b.id));

    return [...nonOverridden, ...userProtocols];
  } catch (err) {
    console.error('Failed to load protocols from storage:', err);
    return BUILT_IN_PROTOCOLS;
  }
}

export function getProtocolById(id: string): ProtocolDefinition | null {
  const all = getAllProtocols();
  return all.find((p) => p.id === id) || null;
}

export function saveProtocol(protocol: ProtocolDefinition): void {
  // Guard built-in factory templates against overwrite
  if (BUILT_IN_PROTOCOLS.some((b) => b.id === protocol.id)) {
    throw new Error('Cannot overwrite protected factory template');
  }

  try {
    const raw = getStorageItem(PROTOCOLS_STORAGE_KEY);
    const userProtocols: ProtocolDefinition[] = raw ? JSON.parse(raw) : [];

    const existingIdx = userProtocols.findIndex((p) => p.id === protocol.id);
    const updated: ProtocolDefinition = {
      ...protocol,
      updatedAt: new Date().toISOString(),
      isTemplate: false, // User saved variants are not protected factory templates
    };

    if (existingIdx >= 0) {
      userProtocols[existingIdx] = updated;
    } else {
      userProtocols.push(updated);
    }

    setStorageItem(PROTOCOLS_STORAGE_KEY, JSON.stringify(userProtocols));
  } catch (err) {
    console.error('Failed to save protocol:', err);
    throw err;
  }
}

export function duplicateProtocol(id: string): ProtocolDefinition | null {
  const target = getProtocolById(id);
  if (!target) return null;

  const newId = `protocol-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const duplicate: ProtocolDefinition = {
    ...target,
    id: newId,
    name: `${target.name} (Copy)`,
    version: '1.0.0',
    isTemplate: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveProtocol(duplicate);
  return duplicate;
}

export function deleteProtocol(id: string): boolean {
  // Protect factory templates
  if (BUILT_IN_PROTOCOLS.some((b) => b.id === id)) {
    return false;
  }

  try {
    const raw = getStorageItem(PROTOCOLS_STORAGE_KEY);
    if (!raw) return false;

    const userProtocols: ProtocolDefinition[] = JSON.parse(raw);
    const filtered = userProtocols.filter((p) => p.id !== id);
    setStorageItem(PROTOCOLS_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// EXPORT & IMPORT (JSON SCHEMA VALIDATION)
// ==========================================

export function exportProtocolToJSON(protocol: ProtocolDefinition): string {
  return JSON.stringify(protocol, null, 2);
}

export function importProtocolFromJSON(jsonStr: string): ProtocolDefinition {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('Malformed JSON: parsing failed');
  }

  // Deep sanitization to prevent prototype pollution
  const forbidden = ['__proto__', 'constructor', 'prototype'];
  const sanitize = (obj: any): void => {
    if (typeof obj !== 'object' || obj === null) return;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) sanitize(obj[i]);
    } else {
      for (const key of forbidden) {
        if (key in obj) delete obj[key];
      }
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'object' && obj[key] !== null) sanitize(obj[key]);
      }
    }
  };
  sanitize(parsed);

  if (!parsed.name || typeof parsed.name !== 'string') {
    throw new Error('Invalid schema: "name" must be a non-empty string');
  }
  if (!Array.isArray(parsed.nodes)) {
    throw new Error('Invalid schema: "nodes" must be an array');
  }
  if (!Array.isArray(parsed.connections)) {
    throw new Error('Invalid schema: "connections" must be an array');
  }

  const imported: ProtocolDefinition = {
    ...parsed,
    id: `imported-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
    name: `${parsed.name.slice(0, 60)} [Imported]`,
    isTemplate: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveProtocol(imported);
  return imported;
}

export const exportProtocolJson = exportProtocolToJSON;
export const importProtocolJson = importProtocolFromJSON;

// ==========================================
// SAVED SESSIONS MANAGEMENT
// ==========================================

export function getAllSavedSessions(): ProtocolSessionLog[] {
  try {
    const raw = getStorageItem(SESSIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSessionLog(session: ProtocolSessionLog): void {
  try {
    const sessions = getAllSavedSessions();
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.unshift(session);
    }
    // Limit to 25 saved sessions
    setStorageItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions.slice(0, 25)));
  } catch (err) {
    console.error('Failed to save session log:', err);
  }
}

export function deleteSavedSession(id: string): void {
  try {
    const sessions = getAllSavedSessions().filter((s) => s.id !== id);
    setStorageItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error('Failed to delete session:', err);
  }
}

export const ProtocolStorage = {
  getAllProtocols,
  getProtocolById,
  saveProtocol,
  duplicateProtocol,
  deleteProtocol,
  exportProtocolToJSON,
  exportProtocolJson,
  importProtocolFromJSON,
  importProtocolJson,
  getAllSavedSessions,
  saveSessionLog,
  deleteSavedSession,
};
