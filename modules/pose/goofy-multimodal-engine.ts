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

export interface RecentPerceptionSignal<T> {
  type: T;
  timestamp: number;
  confidence: number;
  handIdentity?: 'Left' | 'Right' | 'Both';
  rawOutput?: Record<string, number>;
}

export type MultimodalEventListener = (event: MultimodalEvent) => void;

export class GoofyMultimodalEngine {
  private config: GoofyModeConfig;
  private operatingMode: GoofyOperatingMode = 'MULTIMODAL';
  private fusionWindowMs = 800;
  private cooldownMs = 700;

  private lastFaceSignal: RecentPerceptionSignal<GoofyFaceExpressionType> | null = null;
  private lastHandSignal: RecentPerceptionSignal<GoofyHandGestureType | GoofyDualHandComboId> | null = null;

  private lastTriggeredTime = 0;
  private lastTriggeredKey = '';
  private lastTriggeredComboId: GoofyMultimodalComboId | null = null;
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
    this.operatingMode = mode;
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
    // 1. Check if face modality is active
    if (this.operatingMode === 'HAND_ONLY') {
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
        rejectionReason: 'MODALITY_DISABLED (HAND_ONLY_ACTIVE)',
      };
    }

    this.lastFaceSignal = {
      type: expression,
      timestamp,
      confidence,
    };

    // 2. Multimodal Fusion Check: Did we receive a compatible hand gesture recently?
    if (
      this.operatingMode === 'MULTIMODAL' &&
      this.lastHandSignal &&
      timestamp - this.lastHandSignal.timestamp <= this.fusionWindowMs
    ) {
      const matchedCombo = this.matchMultimodalCombo(
        expression,
        this.lastHandSignal.type
      );

      if (matchedCombo) {
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
    // 1. Check if hand modality is active
    if (this.operatingMode === 'FACE_ONLY') {
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
        rejectionReason: 'MODALITY_DISABLED (FACE_ONLY_ACTIVE)',
        handIdentity,
      };
    }

    this.lastHandSignal = {
      type: gesture,
      timestamp,
      confidence,
      handIdentity,
    };

    // 2. Multimodal Fusion Check: Did we receive a compatible face expression recently?
    if (
      this.operatingMode === 'MULTIMODAL' &&
      this.lastFaceSignal &&
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
        soundId: 'VICTORY_BELL',
        memeId: '',
        confidence,
        validity: 'REJECTED',
        rejectionReason: 'COOLDOWN_ACTIVE',
      };
    }

    this.lastTriggeredTime = timestamp;
    this.lastTriggeredKey = triggerKey;

    const mapping = this.config.faceMappings?.[expression];
    const memeId = mapping?.memeId || this.config.actionMemeMappings?.[expression] || 'REAL_MEME_SUCCESS_KID';
    const soundId: GoofySoundId = mapping?.soundId || 'VICTORY_BELL';
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
        soundId: 'CHAD_GONG',
        memeId: '',
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
      (isDual
        ? (meta as any).defaultMemeId
        : 'MEME_MAXIMUM_AURA');
    const soundId: GoofySoundId =
      mapping?.soundId ||
      (isDual
        ? (meta as any).defaultSoundId
        : 'CHAD_GONG');
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
