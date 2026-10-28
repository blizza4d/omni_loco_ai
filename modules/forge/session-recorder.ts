/**
 * OMNI PROTOCOL FORGE — MULTIMODAL SESSION RECORDER & REPLAY ENGINE
 * Records structured experiment sessions, exports/imports JSON logs,
 * and deterministically replays semantic events for camera-less testing and debugging.
 */

import { ProtocolSessionLog, SessionRecordItem, ProtocolEvent } from './types';
import { ProtocolEventBus } from './event-bus';

export class SessionRecorder {
  private activeSession: ProtocolSessionLog | null = null;
  private isRecording = false;
  private isReplaying = false;
  private replayTimer: any = null;
  private busUnsub: (() => void) | null = null;
  private eventBus = ProtocolEventBus.getInstance();

  startSession(protocolId: string, protocolName: string, protocolVersion = '1.0.0'): ProtocolSessionLog {
    const session: ProtocolSessionLog = {
      id: `session-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      protocolId,
      protocolName,
      protocolVersion,
      startTime: Date.now(),
      totalEventsProcessed: 0,
      totalActionsExecuted: 0,
      items: [
        {
          id: `item-${Date.now()}-init`,
          timestamp: Date.now(),
          type: 'lifecycle',
          payload: { action: 'SESSION_STARTED', protocolId, protocolName },
        },
      ],
    };

    this.activeSession = session;
    this.isRecording = true;
    return session;
  }

  startRecording(name = 'Session Record'): ProtocolSessionLog {
    const session = this.startSession('session-record', name);
    this.busUnsub = this.eventBus.subscribe(
      '*',
      (evt) => {
        this.recordEvent(evt);
      },
      'session-recorder'
    );
    return session;
  }

  stopRecording(): ProtocolSessionLog | null {
    if (this.busUnsub) {
      this.busUnsub();
      this.busUnsub = null;
    }
    return this.stopSession();
  }

  recordEvent(event: ProtocolEvent<any>): void {
    if (!this.isRecording || !this.activeSession) return;

    this.activeSession.totalEventsProcessed++;
    this.activeSession.items.push({
      id: `rec-evt-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: Date.now(),
      type: 'protocol_event',
      eventName: event.name,
      payload: event.payload,
    });
  }

  recordNodeExecution(nodeId: string, nodeType: string, status: string, durationMs: number, data?: any): void {
    if (!this.isRecording || !this.activeSession) return;

    this.activeSession.items.push({
      id: `rec-node-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: Date.now(),
      type: 'node_execution',
      nodeId,
      nodeType,
      durationMs,
      payload: { status, data },
    });
  }

  recordOutputAction(actionType: string, payload: any): void {
    if (!this.isRecording || !this.activeSession) return;

    this.activeSession.totalActionsExecuted++;
    this.activeSession.items.push({
      id: `rec-act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: Date.now(),
      type: 'output_action',
      payload: { actionType, payload },
    });
  }

  stopSession(): ProtocolSessionLog | null {
    if (!this.activeSession) return null;

    this.activeSession.endTime = Date.now();
    this.activeSession.items.push({
      id: `item-${Date.now()}-end`,
      timestamp: Date.now(),
      type: 'lifecycle',
      payload: {
        action: 'SESSION_STOPPED',
        totalEvents: this.activeSession.totalEventsProcessed,
        totalActions: this.activeSession.totalActionsExecuted,
      },
    });

    this.isRecording = false;
    const finished = { ...this.activeSession };
    return finished;
  }

  getActiveSession(): ProtocolSessionLog | null {
    return this.activeSession;
  }

  isSessionRecording(): boolean {
    return this.isRecording;
  }

  // ==========================================
  // EXPORT / IMPORT (With Schema Validation)
  // ==========================================

  exportSessionJSON(session: ProtocolSessionLog): string {
    return JSON.stringify(session, null, 2);
  }

  exportSessionJson(session: ProtocolSessionLog): string {
    return this.exportSessionJSON(session);
  }

  importSessionJSON(rawJson: string): ProtocolSessionLog {
    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      throw new Error('Malformed JSON: parsing failed');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid session payload: expected JSON object');
    }

    // Prototype pollution prevention
    const forbidden = ['__proto__', 'constructor', 'prototype'];
    const sanitizeRecursive = (obj: any): void => {
      if (typeof obj !== 'object' || obj === null) return;
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) sanitizeRecursive(obj[i]);
      } else {
        for (const key of forbidden) {
          if (key in obj) delete obj[key];
        }
        for (const key of Object.keys(obj)) {
          if (typeof obj[key] === 'object' && obj[key] !== null) sanitizeRecursive(obj[key]);
        }
      }
    };
    sanitizeRecursive(parsed);

    const items = parsed.items || parsed.events || [];
    if (!Array.isArray(items)) {
      throw new Error('Invalid schema: "items" must be an array of session records');
    }

    const imported: ProtocolSessionLog = {
      id: parsed.id || `imported-session-${Date.now().toString(36)}`,
      protocolId: parsed.protocolId || 'imported',
      protocolName: `${parsed.protocolName || parsed.name || 'Imported Protocol'} [REPLAY]`,
      protocolVersion: parsed.protocolVersion || '1.0.0',
      startTime: parsed.startTime || Date.now(),
      endTime: parsed.endTime || Date.now(),
      isReplaySession: true,
      totalEventsProcessed: parsed.totalEventsProcessed || items.length,
      totalActionsExecuted: parsed.totalActionsExecuted || 0,
      items: items.map((it: any) => ({
        id: it.id || `item-${Date.now()}`,
        timestamp: it.timestamp || Date.now(),
        type: it.type || (it.event ? 'protocol_event' : 'lifecycle'),
        eventName: it.eventName || it.event?.name,
        payload: it.payload || it.event?.payload,
        event: it.event,
      })),
    };

    return imported;
  }

  importSessionJson(rawJson: string): ProtocolSessionLog {
    return this.importSessionJSON(rawJson);
  }

  // ==========================================
  // DETERMINISTIC REPLAY ENGINE
  // ==========================================

  startReplay(
    session: any,
    optionsOrProgress?:
      | ((index: number, total: number, item: any) => void)
      | {
          playbackSpeed?: number;
          onProgress?: (index: number, total: number, item: any) => void;
          onComplete?: () => void;
        },
    onComplete?: () => void
  ): () => void {
    this.stopReplay();
    this.isReplaying = true;

    let progressCb: ((index: number, total: number, item: any) => void) | undefined;
    let completeCb = onComplete;
    let playbackSpeed = 1;

    if (typeof optionsOrProgress === 'function') {
      progressCb = optionsOrProgress;
    } else if (typeof optionsOrProgress === 'object' && optionsOrProgress !== null) {
      progressCb = optionsOrProgress.onProgress;
      completeCb = optionsOrProgress.onComplete || onComplete;
      playbackSpeed = optionsOrProgress.playbackSpeed || 1;
    }

    const rawList = session.items || session.events || [];
    const eventItems = rawList.filter(
      (item: any) => (item.type === 'protocol_event' && item.eventName) || item.event
    );

    if (eventItems.length === 0) {
      this.isReplaying = false;
      completeCb?.();
      return () => {};
    }

    let currentIndex = 0;
    const intervalMs = Math.max(10, Math.round(150 / playbackSpeed));

    this.replayTimer = setInterval(() => {
      if (!this.isReplaying || currentIndex >= eventItems.length) {
        this.stopReplay();
        completeCb?.();
        return;
      }

      const item = eventItems[currentIndex]!;
      currentIndex++;

      const eventName = item.eventName || item.event?.name;
      const payload = item.payload || item.event?.payload;

      if (eventName) {
        this.eventBus.publish(
          eventName,
          payload,
          `REPLAY_SANDBOX (${session.protocolName || session.name || 'SESSION'})`
        );
      }

      progressCb?.(currentIndex, eventItems.length, item);
    }, intervalMs);

    return () => {
      this.stopReplay();
    };
  }

  stopReplay(): void {
    this.isReplaying = false;
    if (this.replayTimer) {
      clearInterval(this.replayTimer);
      this.replayTimer = null;
    }
  }

  isSessionReplaying(): boolean {
    return this.isReplaying;
  }
}
