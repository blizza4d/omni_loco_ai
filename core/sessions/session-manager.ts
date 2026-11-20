/**
 * OMNI LOCO AI 2.0 — SESSION WORKSPACE MANAGER
 * Organizes structured perception sessions involving one or more compatible modules.
 * Explicit start, pause, stop, and save controls without auto-starting physical devices.
 */

export interface SessionWorkspaceRecord {
  id: string;
  title: string;
  modules: string[];
  status: 'IDLE' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  startTimeMs: number | null;
  elapsedMs: number;
  eventsRecordedCount: number;
  notes: string;
  createdAt: string;
}

const SESSION_STORAGE_KEY = 'omni_loco_sessions_v2';

export class SessionWorkspaceManager {
  private static instance: SessionWorkspaceManager | null = null;
  private sessions: Map<string, SessionWorkspaceRecord> = new Map();
  private activeSessionId: string | null = null;

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): SessionWorkspaceManager {
    if (!SessionWorkspaceManager.instance) {
      SessionWorkspaceManager.instance = new SessionWorkspaceManager();
    }
    return SessionWorkspaceManager.instance;
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const data = localStorage.getItem(SESSION_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as SessionWorkspaceRecord[];
        if (Array.isArray(parsed)) {
          parsed.forEach((s) => this.sessions.set(s.id, s));
        }
      }
    } catch (err) {
      console.warn('[SessionWorkspaceManager] Failed to load sessions:', err);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const list = Array.from(this.sessions.values());
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.warn('[SessionWorkspaceManager] Failed to save sessions:', err);
    }
  }

  public createSession(title: string, modules: string[]): SessionWorkspaceRecord {
    const id = `session-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const session: SessionWorkspaceRecord = {
      id,
      title,
      modules,
      status: 'IDLE',
      startTimeMs: null,
      elapsedMs: 0,
      eventsRecordedCount: 0,
      notes: '',
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(id, session);
    this.saveToStorage();
    return session;
  }

  public startSession(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;

    session.status = 'ACTIVE';
    session.startTimeMs = Date.now();
    this.activeSessionId = id;
    this.saveToStorage();
    return true;
  }

  public pauseSession(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session || session.status !== 'ACTIVE') return false;

    if (session.startTimeMs) {
      session.elapsedMs += Date.now() - session.startTimeMs;
      session.startTimeMs = null;
    }
    session.status = 'PAUSED';
    this.saveToStorage();
    return true;
  }

  public completeSession(id: string, notes?: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;

    if (session.status === 'ACTIVE' && session.startTimeMs) {
      session.elapsedMs += Date.now() - session.startTimeMs;
      session.startTimeMs = null;
    }
    session.status = 'COMPLETED';
    if (notes) session.notes = notes;
    if (this.activeSessionId === id) this.activeSessionId = null;
    this.saveToStorage();
    return true;
  }

  public incrementEventCount(id: string): void {
    const session = this.sessions.get(id);
    if (session) {
      session.eventsRecordedCount++;
    }
  }

  public getActiveSession(): SessionWorkspaceRecord | null {
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) ?? null;
  }

  public getAllSessions(): SessionWorkspaceRecord[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}
