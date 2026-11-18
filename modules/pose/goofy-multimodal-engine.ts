import {
  GoofyFaceExpressionType,
  GoofyHandGestureType,
  GoofyDualHandComboId,
  GoofyMultimodalComboId,
  GoofyOperatingMode,
  MultimodalEvent,
  GOOFY_MULTIMODAL_COMBO_DEFINITIONS,
  GOOFY_FACE_METADATA,
  GOOFY_HAND_METADATA,
  GOOFY_DUAL_COMBO_DEFINITIONS,
  GoofyModeConfig,
  GoofySoundId,
} from './goofy-types';
import { GESTURE_ELIGIBLE_MEMES } from './goofy-semantic-matcher';

export interface RecentPerceptionSignal<T> {
  type: T;
  timestamp: number;
  confidence: number;
  sessionId: string;
  handIdentity?: 'Left' | 'Right' | 'Both';
  rawOutput?: Record<string, number>;
}

export interface MultimodalDiagnosticsSnapshot {
  operatingMode: GoofyOperatingMode;
  fusionWindowMs: number;
  cooldownMs: number;
  sessionId: string;
  lastFaceType: GoofyFaceExpressionType | null;
  lastHandType: GoofyHandGestureType | GoofyDualHandComboId | null;
  lastComboId: GoofyMultimodalComboId | null;
  lastRejectionReason: string | null;
}

export type MultimodalEventListener = (event: MultimodalEvent) => void;

export class GoofyMultimodalEngine {
  private config: GoofyModeConfig;
  private operatingMode: GoofyOperatingMode = 'MULTIMODAL';
  private fusionWindowMs = 800;
  private cooldownMs = 700;
  private sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  private lastFaceSignal: RecentPerceptionSignal<GoofyFaceExpressionType> | null = null;
  private lastHandSignal: RecentPerceptionSignal<GoofyHandGestureType | GoofyDualHandComboId> | null = null;

  private lastTriggeredTime = 0;
  private lastTriggeredKey = '';
  private lastTriggeredComboId: GoofyMultimodalComboId | null = null;
  private lastRejectionReason: string | null = null;
  private eventHistory: MultimodalEvent[] = [];
  private listeners: Set<MultimodalEventListener> = new Set();
  private maxHistorySize = 60;

  constructor(
    configOrMode?: Partial<GoofyModeConfig> | GoofyOperatingMode,
    fusionWindowMs?: number,
    cooldownMs?: number
  ) {
    if (typeof configOrMode === 'string') {
      this.operatingMode = configOrMode;
      this.fusionWindowMs = fusionWindowMs || 800;
      this.cooldownMs = cooldownMs || 700;
      this.config = {
        operatingMode: this.operatingMode,
        multimodalWindowMs: this.fusionWindowMs,
        cooldownMs: this.cooldownMs,
      } as GoofyModeConfig;
    } else {
      const cfg = configOrMode || {};
      this.config = cfg as GoofyModeConfig;
      this.operatingMode = cfg.operatingMode || 'MULTIMODAL';
      this.fusionWindowMs = cfg.fusionWindowMs || cfg.multimodalWindowMs || fusionWindowMs || 800;
      this.cooldownMs = cfg.cooldownMs || cooldownMs || 700;
    }
  }

  updateConfig(config: GoofyModeConfig): void {
    this.config = config;
    if (config.operatingMode) this.operatingMode = config.operatingMode;
    if (config.fusionWindowMs) this.fusionWindowMs = config.fusionWindowMs;
    else if (config.multimodalWindowMs) this.fusionWindowMs = config.multimodalWindowMs;
    if (config.cooldownMs) this.cooldownMs = config.cooldownMs;
  }

  setOperatingMode(mode: GoofyOperatingMode): void {
    if (this.operatingMode !== mode) {
      this.operatingMode = mode;
      // Flush stale cross-modality signals whenever operating mode switches
      this.lastFaceSignal = null;
      this.lastHandSignal = null;
    }
  }

  getOperatingMode(): GoofyOperatingMode {
    return this.operatingMode;
  }

  setFusionWindow(ms: number): void {
    this.fusionWindowMs = ms;
  }

  setCooldown(ms: number): void {
    this.cooldownMs = ms;
  }

  getLastTriggeredCombo(): GoofyMultimodalComboId | null {
    return this.lastTriggeredComboId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Starts a clean tracking session, invalidating any buffered face/hand signals
   * from a previous camera session so stale signals never fuse.
   */
  resetSession(): void {
    this.sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.lastFaceSignal = null;
    this.lastHandSignal = null;
    this.lastTriggeredTime = 0;
    this.lastTriggeredKey = '';
    this.lastRejectionReason = null;
  }

  getDiagnostics(): MultimodalDiagnosticsSnapshot {
    return {
      operatingMode: this.operatingMode,
      fusionWindowMs: this.fusionWindowMs,
      cooldownMs: this.cooldownMs,
      sessionId: this.sessionId,
      lastFaceType: this.lastFaceSignal?.type ?? null,
      lastHandType: this.lastHandSignal?.type ?? null,
      lastComboId: this.lastTriggeredComboId,
      lastRejectionReason: this.lastRejectionReason,
    };
  }

  /**
   * Prunes any buffered signal whose age exceeds the configured fusion window
   */
  private pruneStaleSignals(now: number): void {
    if (
      this.lastFaceSignal &&
      (this.lastFaceSignal.sessionId !== this.sessionId ||
        now - this.lastFaceSignal.timestamp > this.fusionWindowMs ||
        now < this.lastFaceSignal.timestamp)
    ) {
      this.lastFaceSignal = null;
    }
    if (
      this.lastHandSignal &&
      (this.lastHandSignal.sessionId !== this.sessionId ||
        now - this.lastHandSignal.timestamp > this.fusionWindowMs ||
        now < this.lastHandSignal.timestamp)
    ) {
      this.lastHandSignal = null;
    }
  }

  subscribe(listener: MultimodalEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(event: MultimodalEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('[GoofyMultimodalEngine] Listener error:', err);
      }
    });
  }

  getEventHistory(): MultimodalEvent[] {
    return this.eventHistory;
  }

  clearHistory(): void {
    this.eventHistory = [];
  }

  getLastFaceSignal(): RecentPerceptionSignal<GoofyFaceExpressionType> | null {
    return this.lastFaceSignal;
  }

  getLastHandSignal(): RecentPerceptionSignal<GoofyHandGestureType | GoofyDualHandComboId> | null {
    return this.lastHandSignal;
  }

  /**
   * Evaluates if a given face signal and hand signal match any registered multimodal combo.
   */
  public matchMultimodalCombo(
    faceExp: GoofyFaceExpressionType,
    handGesture: GoofyHandGestureType | GoofyDualHandComboId
  ): GoofyMultimodalComboId | null {
    // Support V9 FACE_SUSPICIOUS pairing with POINTING -> SUSPICIOUS_ACCUSATION
    if (faceExp === 'FACE_SUSPICIOUS' && handGesture === 'POINTING') {
      return 'SUSPICIOUS_ACCUSATION';
    }

    const comboKeys = Object.keys(
      GOOFY_MULTIMODAL_COMBO_DEFINITIONS
    ) as GoofyMultimodalComboId[];

    for (const key of comboKeys) {
      const def = GOOFY_MULTIMODAL_COMBO_DEFINITIONS[key];
      const faceMatches = Array.isArray(def.faceExpression)
        ? def.faceExpression.includes(faceExp)
        : def.faceExpression === faceExp;

      const handMatches = Array.isArray(def.handGesture)
        ? (def.handGesture as string[]).includes(handGesture)
        : def.handGesture === handGesture;

      if (faceMatches && handMatches) {
        return key;
      }
    }

    return null;
  }

  /**
   * Process an incoming validated face expression event
   */
  onFaceExpressionValidated(
    expression: GoofyFaceExpressionType,
    confidence: number,
    timestamp: number
  ): MultimodalEvent | null {
    this.pruneStaleSignals(timestamp);

    // 1. Check if face modality is active
    if (this.operatingMode === 'HAND_ONLY' || this.config.enableFaceExpressions === false) {
      this.lastRejectionReason = 'MODALITY_DISABLED (HAND_ONLY_ACTIVE)';
      return {
        id: `rej_face_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp,
        modality: 'FACE',
        source: 'FACE',
        faceExpression: expression,
        label: GOOFY_FACE_METADATA[expression]?.label || expression,
        caption: '',
        soundId: 'RECORD_SCRATCH',
        memeId: '',
        confidence,
        validity: 'REJECTED',
        rejectionReason: this.lastRejectionReason,
      };
    }

    // Require high intentional confidence to avoid triggering on transient expressions
    if (confidence < 0.70) {
      this.lastRejectionReason = 'CONFIDENCE_BELOW_THRESHOLD (>=0.70 REQUIRED)';
      return {
        id: `rej_face_conf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp,
        modality: 'FACE',
        source: 'FACE',
        faceExpression: expression,
        label: GOOFY_FACE_METADATA[expression]?.label || expression,
        caption: '',
        soundId: 'RECORD_SCRATCH',
        memeId: '',
        confidence,
        validity: 'REJECTED',
        rejectionReason: this.lastRejectionReason,
      };
    }

    this.lastFaceSignal = {
      type: expression,
      timestamp,
      confidence,
      sessionId: this.sessionId,
    };

    // 2. Multimodal Fusion Check: Did we receive a compatible hand gesture recently in this session?
    if (
      this.operatingMode === 'MULTIMODAL' &&
      this.config.enableMultimodalFusion !== false &&
      this.lastHandSignal &&
      this.lastHandSignal.sessionId === this.sessionId &&
      timestamp >= this.lastHandSignal.timestamp &&
      timestamp - this.lastHandSignal.timestamp <= this.fusionWindowMs
    ) {
      const matchedCombo = this.matchMultimodalCombo(
        expression,
        this.lastHandSignal.type
      );

      if (matchedCombo) {
        this.lastRejectionReason = null;
        return this.emitCombinedEvent(
          matchedCombo,
          expression,
          this.lastHandSignal.type,
          Math.min(confidence, this.lastHandSignal.confidence),
          timestamp,
          this.lastHandSignal.handIdentity
        );
      }
    }

    // 3. Otherwise, emit single Face Event if cooldown permits
    this.lastRejectionReason = null;
    return this.emitFaceOnlyEvent(expression, confidence, timestamp);
  }

  /**
   * Process an incoming validated hand gesture event
   */
  onHandGestureValidated(
    gesture: GoofyHandGestureType | GoofyDualHandComboId,
    confidence: number,
    timestamp: number,
    handIdentity: 'Left' | 'Right' | 'Both' = 'Both'
  ): MultimodalEvent | null {
    this.pruneStaleSignals(timestamp);

    // 1. Check if hand modality is active
    if (this.operatingMode === 'FACE_ONLY' || this.config.enableHandGestures === false) {
      this.lastRejectionReason = 'MODALITY_DISABLED (FACE_ONLY_ACTIVE)';
      return {
        id: `rej_hand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp,
        modality: 'HAND',
        source: 'HAND',
        handGesture: gesture as GoofyHandGestureType,
        label: (GOOFY_HAND_METADATA[gesture as GoofyHandGestureType]?.label ||
          GOOFY_DUAL_COMBO_DEFINITIONS[gesture as GoofyDualHandComboId]?.label ||
          gesture) as string,
        caption: '',
        soundId: 'RECORD_SCRATCH',
        memeId: '',
        confidence,
        validity: 'REJECTED',
        rejectionReason: this.lastRejectionReason,
        handIdentity,
      };
    }

    // Require high intentional confidence to avoid triggering on unintentional hand repositions
    if (confidence < 0.70) {
      this.lastRejectionReason = 'CONFIDENCE_BELOW_THRESHOLD (>=0.70 REQUIRED)';
      return {
        id: `rej_hand_conf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp,
        modality: 'HAND',
        source: 'HAND',
        handGesture: gesture as GoofyHandGestureType,
        label: (GOOFY_HAND_METADATA[gesture as GoofyHandGestureType]?.label ||
          GOOFY_DUAL_COMBO_DEFINITIONS[gesture as GoofyDualHandComboId]?.label ||
          gesture) as string,
        caption: '',
        soundId: 'RECORD_SCRATCH',
        memeId: '',
        confidence,
        validity: 'REJECTED',
        rejectionReason: this.lastRejectionReason,
        handIdentity,
      };
    }

    this.lastHandSignal = {
      type: gesture,
      timestamp,
      confidence,
      sessionId: this.sessionId,
      handIdentity,
    };

    // 2. Multimodal Fusion Check: Did we receive a compatible face expression recently in this session?
    if (
      this.operatingMode === 'MULTIMODAL' &&
      this.config.enableMultimodalFusion !== false &&
      this.lastFaceSignal &&
      this.lastFaceSignal.sessionId === this.sessionId &&
      timestamp >= this.lastFaceSignal.timestamp &&
      timestamp - this.lastFaceSignal.timestamp <= this.fusionWindowMs
    ) {
      const matchedCombo = this.matchMultimodalCombo(
        this.lastFaceSignal.type,
        gesture
      );

      if (matchedCombo) {
        return this.emitCombinedEvent(
          matchedCombo,
          this.lastFaceSignal.type,
          gesture,
          Math.min(confidence, this.lastFaceSignal.confidence),
          timestamp,
          handIdentity
        );
      }
    }

    // 3. Otherwise, emit single Hand Event if cooldown permits
    return this.emitHandOnlyEvent(gesture, confidence, timestamp, handIdentity);
  }

  /**
   * Helper to emit combined multimodal face+hand event
   */
  private emitCombinedEvent(
    comboId: GoofyMultimodalComboId,
    faceExp: GoofyFaceExpressionType,
    handGesture: GoofyHandGestureType | GoofyDualHandComboId,
    confidence: number,
    timestamp: number,
    handIdentity?: 'Left' | 'Right' | 'Both'
  ): MultimodalEvent {
    const def = GOOFY_MULTIMODAL_COMBO_DEFINITIONS[comboId];
    const triggerKey = `COMBO_${comboId}`;

    // Anti-repeat / cooldown check
    if (
      timestamp - this.lastTriggeredTime < this.cooldownMs &&
      this.lastTriggeredKey === triggerKey
    ) {
      return {
        id: `cooldown_${Date.now()}`,
        timestamp,
        modality: 'MULTIMODAL',
        source: 'MULTIMODAL',
        comboId,
        faceExpression: faceExp,
        handGesture: handGesture as GoofyHandGestureType,
        label: def.label,
        caption: def.defaultCaption,
        soundId: def.defaultSoundId,
        memeId: def.defaultMemeId,
        confidence,
        validity: 'REJECTED',
        rejectionReason: 'COOLDOWN_ACTIVE',
        handIdentity,
      };
    }

    this.lastTriggeredTime = timestamp;
    this.lastTriggeredKey = triggerKey;
    this.lastTriggeredComboId = comboId;

    // Reset perception buffers to avoid infinite repeating combos
    this.lastFaceSignal = null;
    this.lastHandSignal = null;

    const mapping = this.config.multimodalMappings?.[comboId];
    const memeId = mapping?.memeId || def.defaultMemeId;
    const soundId = mapping?.soundId || def.defaultSoundId;
    const caption = mapping?.customCaption || def.defaultCaption;

    const event: MultimodalEvent = {
      id: `mm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      modality: 'MULTIMODAL',
      source: 'MULTIMODAL',
      comboId,
      faceExpression: faceExp,
      handGesture: handGesture as GoofyHandGestureType,
      label: def.label,
      caption,
      soundId,
      memeId,
      confidence,
      validity: 'VALID',
      handIdentity,
    };

    this.recordEvent(event);
    this.notify(event);
    return event;
  }

  /**
   * Helper to emit Face-only event
   */
  private emitFaceOnlyEvent(
    expression: GoofyFaceExpressionType,
    confidence: number,
    timestamp: number
  ): MultimodalEvent {
    const meta = GOOFY_FACE_METADATA[expression];
    const triggerKey = `FACE_${expression}`;

    const canonicalFaceMeme =
      meta?.defaultMemeId ||
      this.config.actionMemeMappings?.[expression] ||
      'REAL_MEME_SUCCESS_KID';
    const canonicalFaceSound: GoofySoundId =
      meta?.defaultSoundId ||
      'VICTORY_BELL';

    if (
      timestamp - this.lastTriggeredTime < this.cooldownMs &&
      this.lastTriggeredKey === triggerKey
    ) {
      return {
        id: `cooldown_${Date.now()}`,
        timestamp,
        modality: 'FACE',
        source: 'FACE',
        faceExpression: expression,
        label: meta.label,
        caption: meta.defaultCaption,
        soundId: canonicalFaceSound,
        memeId: canonicalFaceMeme,
        confidence,
        validity: 'REJECTED',
        rejectionReason: 'COOLDOWN_ACTIVE',
      };
    }

    this.lastTriggeredTime = timestamp;
    this.lastTriggeredKey = triggerKey;

    const mapping = this.config.faceMappings?.[expression];
    const memeId = mapping?.memeId || this.config.actionMemeMappings?.[expression] || canonicalFaceMeme;
    const soundId: GoofySoundId = mapping?.soundId || canonicalFaceSound;
    const caption = mapping?.customCaption || meta.defaultCaption;

    const event: MultimodalEvent = {
      id: `face_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      modality: 'FACE',
      source: 'FACE',
      faceExpression: expression,
      label: meta.label,
      caption,
      soundId,
      memeId,
      confidence,
      validity: 'VALID',
    };

    this.recordEvent(event);
    this.notify(event);
    return event;
  }

  /**
   * Helper to emit Hand-only event
   */
  private emitHandOnlyEvent(
    gesture: GoofyHandGestureType | GoofyDualHandComboId,
    confidence: number,
    timestamp: number,
    handIdentity: 'Left' | 'Right' | 'Both'
  ): MultimodalEvent {
    const isDual = gesture in GOOFY_DUAL_COMBO_DEFINITIONS;
    const meta = isDual
      ? GOOFY_DUAL_COMBO_DEFINITIONS[gesture as GoofyDualHandComboId]
      : GOOFY_HAND_METADATA[gesture as GoofyHandGestureType];

    const label = meta?.label || gesture;
    const defaultCaption = meta?.defaultCaption || '';
    const triggerKey = `HAND_${gesture}`;

    const canonicalHandMeme = isDual
      ? (meta as any)?.defaultMemeId
      : (GESTURE_ELIGIBLE_MEMES[gesture as GoofyHandGestureType]?.[0] || 'REAL_MEME_GIGACHAD');

    const canonicalHandSound: GoofySoundId = isDual
      ? (meta as any)?.defaultSoundId
      : 'CHAD_GONG';

    if (
      timestamp - this.lastTriggeredTime < this.cooldownMs &&
      this.lastTriggeredKey === triggerKey
    ) {
      return {
        id: `cooldown_${Date.now()}`,
        timestamp,
        modality: 'HAND',
        source: 'HAND',
        handGesture: gesture as GoofyHandGestureType,
        label,
        caption: defaultCaption,
        soundId: canonicalHandSound,
        memeId: canonicalHandMeme,
        confidence,
        validity: 'REJECTED',
        rejectionReason: 'COOLDOWN_ACTIVE',
        handIdentity,
      };
    }

    this.lastTriggeredTime = timestamp;
    this.lastTriggeredKey = triggerKey;

    const mapping = isDual
      ? this.config.dualHandMappings?.[gesture as GoofyDualHandComboId]
      : this.config.handMappings?.[gesture as GoofyHandGestureType];

    const memeId =
      mapping?.memeId ||
      this.config.actionMemeMappings?.[gesture] ||
      canonicalHandMeme;
    const soundId: GoofySoundId =
      mapping?.soundId ||
      canonicalHandSound;
    const caption = mapping?.customCaption || defaultCaption;

    const event: MultimodalEvent = {
      id: `hand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      modality: 'HAND',
      source: 'HAND',
      handGesture: gesture as GoofyHandGestureType,
      label,
      caption,
      soundId,
      memeId,
      confidence,
      validity: 'VALID',
      handIdentity,
    };

    this.recordEvent(event);
    this.notify(event);
    return event;
  }

  private recordEvent(event: MultimodalEvent): void {
    this.eventHistory.unshift(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.pop();
    }
  }
}
