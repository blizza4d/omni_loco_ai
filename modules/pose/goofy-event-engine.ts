import {
  GoofyModeConfig,
  GoofySoundId,
  ActiveMemePopup,
  UnifiedMemeEvent,
  GOOFY_POSE_METADATA,
  GOOFY_HAND_METADATA,
  GOOFY_DUAL_COMBO_DEFINITIONS,
  BUILTIN_GESTURE_SEQUENCES,
  GestureSequenceDefinition,
  CustomGestureDefinition,
  IntelligentReactionCombo,
  BUILTIN_INTELLIGENT_COMBOS,
  GoofyPoseType,
  GoofyHandGestureType,
  GoofyDualHandComboId,
  GoofyFaceExpressionType,
  GoofyMultimodalComboId,
  GOOFY_FACE_METADATA,
  GOOFY_MULTIMODAL_COMBO_DEFINITIONS,
  MemeVisualDefinition,
  CustomReactionRule,
  GoofyActionSource,
} from './goofy-types';
import { GoofyAudioEngine } from './goofy-audio-engine';
import { GoofyVisualFXEngine } from './goofy-visual-fx';
import {
  DEFAULT_MEME_LIBRARY,
  getDefaultMemeForAction,
  getMemeById,
} from './goofy-meme-library';
import { SemanticMemeMatcher } from './goofy-semantic-matcher';

export type EventEngineListener = (
  event: UnifiedMemeEvent,
  activePopups: ActiveMemePopup[]
) => void;

export class GoofyEventEngine {
  private config: GoofyModeConfig;
  private audioEngine: GoofyAudioEngine;
  private visualFx: GoofyVisualFXEngine;
  private customMemes: MemeVisualDefinition[] = [];
  private semanticMatcher: SemanticMemeMatcher = new SemanticMemeMatcher();

  private activePopups: ActiveMemePopup[] = [];
  private eventHistory: UnifiedMemeEvent[] = [];
  private listeners: Set<EventEngineListener> = new Set();
  private maxHistorySize = 50;
  private lastMemeIdByAction: Map<string, string> = new Map();
  private recentMemeIds: string[] = [];
  private popupTimers: Set<ReturnType<typeof setTimeout>> = new Set();
  private popupRateTimestamps: number[] = [];

  private schedulePopupExpiry(id: string, durationMs: number): void {
    const timer = setTimeout(() => {
      this.popupTimers.delete(timer);
      this.removePopup(id);
    }, durationMs);
    this.popupTimers.add(timer);
  }

  /**
   * Enforces maxPopupsPerMinute cap (Chaos Mode rate limiter) using a rolling 60s window
   */
  private isRateLimited(nowWallMs = Date.now()): boolean {
    const maxPerMin = this.config.chaosMode?.enabled
      ? this.config.chaosMode.maxPopupsPerMinute
      : undefined;
    if (!maxPerMin || maxPerMin <= 0) return false;
    const cutoff = nowWallMs - 60_000;
    this.popupRateTimestamps = this.popupRateTimestamps.filter((ts) => ts >= cutoff);
    return this.popupRateTimestamps.length >= maxPerMin;
  }

  private recordPopupRateTimestamp(nowWallMs = Date.now()): void {
    const cutoff = nowWallMs - 60_000;
    this.popupRateTimestamps = this.popupRateTimestamps.filter((ts) => ts >= cutoff);
    this.popupRateTimestamps.push(nowWallMs);
  }

  constructor(
    config: GoofyModeConfig,
    audioEngine: GoofyAudioEngine,
    visualFx: GoofyVisualFXEngine
  ) {
    this.config = config;
    this.audioEngine = audioEngine;
    this.visualFx = visualFx;
  }

  getSemanticMatcher(): SemanticMemeMatcher {
    return this.semanticMatcher;
  }

  updateConfig(config: GoofyModeConfig): void {
    this.config = config;
    this.audioEngine.updateConfig(config);
  }

  setCustomMemes(memes: MemeVisualDefinition[]): void {
    this.customMemes = memes;
  }

  getRecentMemeIds(): string[] {
    return this.recentMemeIds;
  }

  getRecentlyUsedMemeIds(): string[] {
    return [...this.recentMemeIds];
  }

  subscribe(listener: EventEngineListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(event: UnifiedMemeEvent): void {
    const popupsCopy = [...this.activePopups];
    this.listeners.forEach((fn) => {
      try {
        fn(event, popupsCopy);
      } catch (err) {
        console.error('[GoofyEventEngine] Listener error:', err);
      }
    });
  }

  getActivePopups(): ActiveMemePopup[] {
    return this.activePopups;
  }

  getEventHistory(): UnifiedMemeEvent[] {
    return this.eventHistory;
  }

  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Main dispatch: receives a genuine action trigger from Body or Hand
   */
  dispatchActionTrigger(
    actionId: string,
    source: 'BODY' | 'HAND' | 'DUAL_HAND' | 'SEQUENCE' | 'CUSTOM_GESTURE' | 'REACTION_COMBO' | 'FACE' | 'MULTIMODAL',
    hand?: 'Left' | 'Right' | 'Both',
    confidence = 0.95,
    context?: {
      fingerCount?: number;
      isDynamic?: boolean;
      velocity?: { vx: number; vy: number; speed: number };
    }
  ): UnifiedMemeEvent | null {
    // 1. Check if action is enabled in config
    const faceDef = source === 'FACE' ? GOOFY_FACE_METADATA[actionId as GoofyFaceExpressionType] : undefined;
    const multimodalDef = source === 'MULTIMODAL' ? GOOFY_MULTIMODAL_COMBO_DEFINITIONS[actionId as GoofyMultimodalComboId] : undefined;
    const comboDef = GOOFY_DUAL_COMBO_DEFINITIONS[actionId as GoofyDualHandComboId];
    const seqDef =
      source === 'SEQUENCE' || actionId.startsWith('SEQ_')
        ? [...BUILTIN_GESTURE_SEQUENCES, ...(this.config.customSequences || [])].find(
            (s) => s.id === actionId
          )
        : undefined;
    const customDef = this.config.customGestures?.find((cg) => cg.id === actionId);
    const reactionComboDef = (this.config.reactionCombos || BUILTIN_INTELLIGENT_COMBOS)?.find(
      (rc) => rc.id === actionId
    );

    let mapping = multimodalDef
      ? this.config.multimodalMappings?.[actionId as GoofyMultimodalComboId]
      : faceDef
      ? this.config.faceMappings?.[actionId as GoofyFaceExpressionType]
      : comboDef
      ? this.config.dualHandMappings?.[actionId as GoofyDualHandComboId]
      : source === 'BODY'
      ? this.config.mappings[actionId as GoofyPoseType]
      : this.config.handMappings[actionId as GoofyHandGestureType];

    if (!mapping && !comboDef && !seqDef && !faceDef && !multimodalDef) {
      mapping = this.config.mappings[actionId as GoofyPoseType];
    }
    if (mapping && !mapping.enabled) {
      return null;
    }

    // 2. Resolve label & caption
    let actionLabel = actionId;
    let defaultCaption = 'MEME ACTION DETECTED!';
    if (multimodalDef) {
      actionLabel = `MULTIMODAL: ${multimodalDef.label}`;
      defaultCaption = multimodalDef.defaultCaption;
    } else if (faceDef) {
      actionLabel = `FACE: ${faceDef.label}`;
      defaultCaption = faceDef.defaultCaption;
    } else if (customDef) {
      actionLabel = `CUSTOM: ${customDef.label}`;
      defaultCaption = customDef.defaultCaption || 'CUSTOM GESTURE RECOGNISED!';
    } else if (reactionComboDef) {
      actionLabel = `COMBO: ${reactionComboDef.label}`;
      defaultCaption = reactionComboDef.caption || 'INTELLIGENT COMBO RECOGNISED!';
    } else if (seqDef) {
      actionLabel = `SEQUENCE: ${seqDef.label}`;
      defaultCaption = seqDef.defaultCaption;
    } else if (comboDef) {
      actionLabel = comboDef.label;
      defaultCaption = comboDef.defaultCaption;
    } else if (source === 'BODY') {
      const meta = GOOFY_POSE_METADATA[actionId as GoofyPoseType];
      if (meta) {
        actionLabel = meta.label;
        defaultCaption = meta.defaultCaption;
      }
    } else {
      const meta = GOOFY_HAND_METADATA[actionId as GoofyHandGestureType];
      if (meta) {
        actionLabel = meta.label;
        defaultCaption = meta.defaultCaption;
      }
    }

    // 3. Resolve sound & meme visual via Semantic Matcher (or fallback)
    let soundId: GoofySoundId =
      (mapping && mapping.soundId) ||
      (multimodalDef && multimodalDef.defaultSoundId) ||
      (faceDef && 'VICTORY_BELL') ||
      (customDef && customDef.defaultSoundId) ||
      (reactionComboDef && reactionComboDef.soundId) ||
      (seqDef && seqDef.defaultSoundId) ||
      (comboDef && comboDef.defaultSoundId) ||
      'CHAD_GONG';
      (reactionComboDef && reactionComboDef.soundId) ||
      (seqDef && seqDef.defaultSoundId) ||
      (comboDef && comboDef.defaultSoundId) ||
      'CHAD_GONG';
    let memeDef: MemeVisualDefinition | null = null;
    let matchScore: number | undefined;
    let matchReason: string | undefined;

    if (this.config.smartMatchingEnabled !== false) {
      const allAvailableMemes = [...DEFAULT_MEME_LIBRARY, ...this.customMemes];
      const matchResult = this.semanticMatcher.match(
        {
          actionId,
          source,
          hand,
          confidence,
          fingerCount: context?.fingerCount,
          isDynamic: context?.isDynamic,
          velocity: context?.velocity,
        },
        allAvailableMemes,
        this.config
      );

      if (matchResult) {
        memeDef = matchResult.meme;
        soundId = matchResult.soundId;
        matchScore = matchResult.score;
        matchReason = matchResult.reason;
      } else {
        // STRICT: If no eligible meme matches, do NOT display an unrelated fallback meme!
        memeDef = null;
        matchReason = 'No eligible meme assigned for gesture';
      }
    } else if (this.config.randomMemeMode) {
      // Pick random strictly among eligible memes for this gesture
      const eligible = this.semanticMatcher.getCandidatesForAction(
        actionId,
        [...DEFAULT_MEME_LIBRARY, ...this.customMemes],
        this.config
      );
      if (eligible.length > 0) {
        const lastId = this.lastMemeIdByAction.get(actionId);
        const filtered = eligible.filter((m) => m.id !== lastId);
        memeDef = filtered.length > 0
          ? filtered[Math.floor(Math.random() * filtered.length)]!
          : eligible[0]!;
      } else {
        memeDef = null;
        matchReason = 'No eligible meme found in random mode';
      }
    } else {
      const assignedMemeId =
        (mapping && mapping.memeId) ||
        this.config.actionMemeMappings[actionId] ||
        (multimodalDef && multimodalDef.defaultMemeId) ||
        (faceDef && (faceDef as any).defaultMemeId) ||
        (comboDef && comboDef.defaultMemeId);

      if (assignedMemeId) {
        memeDef = getMemeById(assignedMemeId, this.customMemes) || null;
      } else {
        memeDef = getDefaultMemeForAction(actionId) || null;
      }
    }

    if (this.config.randomSoundMode) {
      const lib = this.audioEngine.getSoundLibrary();
      soundId = lib[Math.floor(Math.random() * lib.length)]!.id;
    }

    const caption =
      (mapping && mapping.customCaption) ||
      this.config.actionCustomCaptions[actionId] ||
      memeDef?.caption ||
      defaultCaption;

    if (memeDef) {
      this.lastMemeIdByAction.set(actionId, memeDef.id);
      this.recentMemeIds = [
        memeDef.id,
        ...this.recentMemeIds.filter((id) => id !== memeDef.id),
      ].slice(0, 15);
    }

    // 5. Simultaneous Event, Rate-Limit & Concurrency Arbitration
    if (this.isRateLimited()) {
      return null;
    }

    const now = performance.now();
    const durationMs = this.config.memeDurationMs || 1500;
    const concurrency = this.config.popupConcurrencyPolicy || 'ALLOW_SIMULTANEOUS';
    const maxSimultaneous = this.config.maxSimultaneousPopups || 2;

    if (concurrency === 'REPLACE_EXISTING' || source === 'DUAL_HAND') {
      // Dual-hand combos and REPLACE_EXISTING take center stage by clearing active popups
      this.activePopups = [];
    } else if (concurrency === 'QUEUE_SEQUENTIAL' && this.activePopups.length > 0) {
      // Sequentially wait until previous active popup duration finishes
      return null;
    } else if (this.activePopups.length > 0) {
      const policy = this.config.simultaneousPolicy || 'ALLOW_BOTH';
      if (policy === 'REPLACE_OLDEST') {
        this.activePopups = [];
      } else if (policy === 'RIGHT_PRIORITY') {
        if (hand === 'Left' && this.activePopups.some((p) => p.hand === 'Right')) {
          return null; // Yield to active right hand
        }
        if (hand === 'Right') {
          this.activePopups = this.activePopups.filter((p) => p.hand !== 'Left');
        }
      } else if (policy === 'LEFT_PRIORITY') {
        if (hand === 'Right' && this.activePopups.some((p) => p.hand === 'Left')) {
          return null; // Yield to active left hand
        }
        if (hand === 'Left') {
          this.activePopups = this.activePopups.filter((p) => p.hand !== 'Right');
        }
      } else if (policy === 'HAND_PRIORITY' && source === 'BODY') {
        const hasActiveHand = this.activePopups.some((p) => p.actionSource === 'HAND' || p.actionSource === 'DUAL_HAND');
        if (hasActiveHand) return null; // Yield to hand
      } else if (policy === 'BODY_PRIORITY' && source === 'HAND') {
        const hasActiveBody = this.activePopups.some((p) => p.actionSource === 'BODY');
        if (hasActiveBody) return null; // Yield to body
      } else {
        // ALLOW_SIMULTANEOUS: Cap to configured maxSimultaneous (default 2)
        while (this.activePopups.length >= maxSimultaneous) {
          this.activePopups.shift();
        }
      }
    }

    // 6. Play audio (if enabled)
    let playedSoundName: string = soundId;
    if (this.config.enableSound && !this.config.isMuted) {
      if (mapping && mapping.customAudioUrl) {
        this.audioEngine.preview('CUSTOM_USER_AUDIO', mapping.customAudioUrl, this.config.volume);
        playedSoundName = mapping.customAudioName || 'Custom Audio';
      } else {
        this.audioEngine.playSound(soundId, this.config.volume);
        const def = this.audioEngine.getSoundLibrary().find((s) => s.id === soundId);
        if (def) playedSoundName = def.name;
      }
    }

    // 7. Trigger particle FX & screen shake
    if (this.config.enableVisualFx) {
      const color = source === 'DUAL_HAND' ? '#A855F7' : source === 'HAND' ? '#06B6D4' : '#FFE600';
      this.visualFx.triggerPoseReaction(color, this.config.enableScreenShake);
    }

    // 8. Create & add active meme popup (if enabled)
    const eventId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const rotationDeg = Math.round((Math.random() * 6 - 3) * 10) / 10;

    if (this.config.enableMemePopups && memeDef) {
      const popup: ActiveMemePopup = {
        id: eventId,
        actionId,
        actionLabel,
        actionSource: source,
        hand,
        memeId: memeDef.id,
        memeTitle: memeDef.title,
        memeUrl: (mapping && mapping.customImageUrl) || memeDef.dataUrl,
        mediaType: memeDef.mediaType || (memeDef.dataUrl.endsWith('.gif') ? 'gif' : 'image'),
        sourceType: memeDef.sourceType || (memeDef.dataUrl.startsWith('/memes/') ? 'REAL_MEDIA' : 'ORIGINAL_SVG'),
        caption,
        soundId,
        soundName: playedSoundName,
        soundUrl: mapping?.customAudioUrl,
        timestamp: now,
        durationMs,
        rotationDeg,
        isManualPreview: false,
        category: memeDef.category,
        rarity: memeDef.rarity,
        animationStyle: this.config.popupAnimationStyle || 'CLASSIC',
        matchScore,
        matchReason,
      };

      this.activePopups.push(popup);
      this.recordPopupRateTimestamp();

      // Auto-expire popup after duration (tracked timer for leak-free disposal)
      this.schedulePopupExpiry(eventId, durationMs);
    }

    // 9. Append to unified event history
    const unifiedEvent: UnifiedMemeEvent = {
      id: eventId,
      timestamp: Date.now(),
      source,
      actionId,
      actionLabel,
      hand,
      caption,
      soundId,
      soundName: playedSoundName,
      memeId: memeDef ? memeDef.id : 'NONE',
      memeTitle: memeDef ? memeDef.title : 'No Matching Meme',
      confidence,
      isManualPreview: false,
      category: memeDef?.category,
      rarity: memeDef?.rarity,
    };

    this.eventHistory.unshift(unifiedEvent);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.pop();
    }

    this.notify(unifiedEvent);
    return unifiedEvent;
  }

  /**
   * Dispatches a simultaneous dual-hand gesture combination trigger
   */
  dispatchDualHandTrigger(
    comboId: GoofyDualHandComboId,
    confidence = 0.98,
    context?: {
      fingerCount?: number;
      isDynamic?: boolean;
      velocity?: { vx: number; vy: number; speed: number };
    }
  ): UnifiedMemeEvent | null {
    return this.dispatchActionTrigger(comboId, 'DUAL_HAND', 'Both', confidence, context);
  }

  /**
   * Dispatches a multi-step temporal gesture sequence combo
   */
  dispatchSequenceTrigger(
    sequence: GestureSequenceDefinition,
    confidence = 0.98
  ): UnifiedMemeEvent | null {
    return this.dispatchActionTrigger(sequence.id, 'SEQUENCE', 'Both', confidence, {
      isDynamic: true,
    });
  }

  /**
   * Dispatches a custom user-created hand gesture trigger (V7)
   */
  dispatchCustomGestureTrigger(
    customGesture: CustomGestureDefinition,
    hand: 'Left' | 'Right' = 'Right',
    confidence = 0.95
  ): UnifiedMemeEvent | null {
    return this.dispatchActionTrigger(
      customGesture.id,
      'CUSTOM_GESTURE',
      hand,
      confidence,
      { isDynamic: false }
    );
  }

  /**
   * Dispatches an intelligent reaction combo (V7)
   */
  dispatchReactionComboTrigger(
    combo: IntelligentReactionCombo,
    confidence = 0.98
  ): UnifiedMemeEvent | null {
    return this.dispatchActionTrigger(
      combo.id,
      'REACTION_COMBO',
      'Both',
      confidence,
      { isDynamic: true }
    );
  }

  /**
   * Manual Preview: triggers sound and meme popup without treating it as an AI detection
   */
  previewAction(
    actionId: string,
    source: 'BODY' | 'HAND' | 'DUAL_HAND' | 'SEQUENCE' | 'CUSTOM_GESTURE' | 'REACTION_COMBO' | 'FACE' | 'MULTIMODAL',
    soundOverride?: GoofySoundId,
    memeOverride?: string,
    labelOverride?: string,
    captionOverride?: string
  ): ActiveMemePopup {
    const comboDef = GOOFY_DUAL_COMBO_DEFINITIONS[actionId as GoofyDualHandComboId];
    const mmDef = GOOFY_MULTIMODAL_COMBO_DEFINITIONS[actionId as GoofyMultimodalComboId];
    const faceMeta = GOOFY_FACE_METADATA[actionId as GoofyFaceExpressionType];

    let mapping = comboDef
      ? this.config.dualHandMappings?.[actionId as GoofyDualHandComboId]
      : mmDef
      ? this.config.multimodalMappings?.[actionId as GoofyMultimodalComboId]
      : faceMeta
      ? this.config.faceMappings?.[actionId as GoofyFaceExpressionType]
      : source === 'BODY'
      ? this.config.mappings[actionId as GoofyPoseType]
      : this.config.handMappings[actionId as GoofyHandGestureType];

    if (!mapping && !comboDef && !mmDef && !faceMeta) {
      mapping = this.config.mappings[actionId as GoofyPoseType];
    }

    const soundId =
      soundOverride ||
      (mapping && mapping.soundId) ||
      (comboDef && comboDef.defaultSoundId) ||
      (mmDef && mmDef.defaultSoundId) ||
      (faceMeta && faceMeta.defaultSoundId) ||
      'INCEPTION_BRAAAM';
    const memeId =
      memeOverride ||
      (mapping && mapping.memeId) ||
      this.config.actionMemeMappings[actionId] ||
      (comboDef && comboDef.defaultMemeId) ||
      (mmDef && mmDef.defaultMemeId) ||
      (faceMeta && faceMeta.defaultMemeId) ||
      getDefaultMemeForAction(actionId).id;

    const memeDef = getMemeById(memeId, this.customMemes) || getDefaultMemeForAction(actionId);

    let actionLabel = labelOverride || actionId;
    let defaultCaption = captionOverride || 'TEST PREVIEW';
    if (!labelOverride) {
      const customDef = this.config.customGestures?.find((cg) => cg.id === actionId);
      const reactionComboDef = (this.config.reactionCombos || BUILTIN_INTELLIGENT_COMBOS)?.find(
        (rc) => rc.id === actionId
      );
      if (customDef) {
        actionLabel = `CUSTOM: ${customDef.label}`;
        defaultCaption = customDef.defaultCaption || 'CUSTOM GESTURE';
      } else if (reactionComboDef) {
        actionLabel = `COMBO: ${reactionComboDef.label}`;
        defaultCaption = reactionComboDef.caption || 'INTELLIGENT COMBO';
      } else if (mmDef) {
        actionLabel = mmDef.label;
        defaultCaption = mmDef.defaultCaption;
      } else if (faceMeta) {
        actionLabel = faceMeta.label;
        defaultCaption = faceMeta.defaultCaption;
      } else if (comboDef) {
        actionLabel = comboDef.label;
        defaultCaption = comboDef.defaultCaption;
      } else if (source === 'BODY') {
        const meta = GOOFY_POSE_METADATA[actionId as GoofyPoseType];
        if (meta) {
          actionLabel = meta.label;
          defaultCaption = meta.defaultCaption;
        }
      } else {
        const meta = GOOFY_HAND_METADATA[actionId as GoofyHandGestureType];
        if (meta) {
          actionLabel = meta.label;
          defaultCaption = meta.defaultCaption;
        }
      }
    }

    const caption =
      captionOverride ||
      (mapping && mapping.customCaption) ||
      this.config.actionCustomCaptions[actionId] ||
      defaultCaption;

    // Play sound
    let soundName: string = soundId;
    if (mapping && mapping.customAudioUrl) {
      this.audioEngine.preview('CUSTOM_USER_AUDIO', mapping.customAudioUrl, this.config.volume);
      soundName = mapping.customAudioName || 'Custom Audio';
    } else {
      this.audioEngine.playSound(soundId, this.config.volume);
      const def = this.audioEngine.getSoundLibrary().find((s) => s.id === soundId);
      if (def) soundName = def.name;
    }

    // Trigger visual pop-up
    const now = performance.now();
    const durationMs = this.config.memeDurationMs || 1500;
    const eventId = `preview-${Date.now()}`;
    const rotationDeg = Math.round((Math.random() * 6 - 3) * 10) / 10;

    const popup: ActiveMemePopup = {
      id: eventId,
      actionId,
      actionLabel: `${actionLabel} [PREVIEW]`,
      actionSource: source,
      memeId: memeDef.id,
      memeTitle: memeDef.title,
      memeUrl: (mapping && mapping.customImageUrl) || memeDef.dataUrl,
      caption: `[PREVIEW] ${caption}`,
      soundId,
      soundName,
      timestamp: now,
      durationMs,
      rotationDeg,
      isManualPreview: true,
      category: memeDef.category,
      rarity: memeDef.rarity,
      animationStyle: this.config.popupAnimationStyle || 'CLASSIC',
    };

    this.activePopups = [popup]; // Clear existing and show preview
    this.schedulePopupExpiry(eventId, durationMs);

    const dummyEvent: UnifiedMemeEvent = {
      id: eventId,
      timestamp: Date.now(),
      source,
      actionId,
      actionLabel: `${actionLabel} [PREVIEW]`,
      caption: `[PREVIEW] ${caption}`,
      soundId,
      soundName,
      memeId: memeDef.id,
      memeTitle: memeDef.title,
      confidence: 1.0,
      isManualPreview: true,
      category: memeDef.category,
      rarity: memeDef.rarity,
    };

    this.notify(dummyEvent);
    return popup;
  }

  /**
   * V9: Dispatches a validated declarative CustomReactionRule.
   * When isPreview is true, isolates preview completely from genuine eventHistory & rate caps.
   */
  dispatchCustomRuleTrigger(
    rule: CustomReactionRule,
    confidence = 0.96,
    isPreview = false
  ): UnifiedMemeEvent | null {
    if (!isPreview && !rule.enabled) return null;
    if (!isPreview && this.isRateLimited()) return null;

    const memeDef = getMemeById(rule.memeId, this.customMemes);
    const soundId: GoofySoundId = rule.soundId || 'CHAD_GONG';
    let playedSoundName: string = soundId;

    if ((isPreview || this.config.enableSound) && !this.config.isMuted) {
      this.audioEngine.playSound(soundId, this.config.volume);
      const def = this.audioEngine.getSoundLibrary().find((s) => s.id === soundId);
      if (def) playedSoundName = def.name;
    }

    if (!isPreview && this.config.enableVisualFx) {
      this.visualFx.triggerPoseReaction('#10B981', this.config.enableScreenShake);
    }

    const now = performance.now();
    const durationMs = Math.max(500, Math.min(6000, rule.durationMs || 1800));
    const eventId = `${isPreview ? 'preview-rule' : 'rule'}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const rotationDeg = Math.round((Math.random() * 6 - 3) * 10) / 10;
    const source: GoofyActionSource = 'CUSTOM_RULE';

    if ((isPreview || this.config.enableMemePopups) && memeDef) {
      const popup: ActiveMemePopup = {
        id: eventId,
        actionId: rule.id,
        actionLabel: isPreview ? `${rule.name} [PREVIEW]` : `RULE: ${rule.name}`,
        actionSource: source,
        memeId: memeDef.id,
        memeTitle: memeDef.title,
        memeUrl: memeDef.dataUrl,
        mediaType: memeDef.mediaType || (memeDef.dataUrl.endsWith('.gif') ? 'gif' : 'image'),
        sourceType: memeDef.sourceType || (memeDef.dataUrl.startsWith('/memes/') ? 'REAL_MEDIA' : 'ORIGINAL_SVG'),
        caption: isPreview ? `[PREVIEW] ${rule.caption}` : rule.caption,
        soundId,
        soundName: playedSoundName,
        timestamp: now,
        durationMs,
        rotationDeg,
        isManualPreview: isPreview,
        category: memeDef.category,
        rarity: memeDef.rarity,
        animationStyle: rule.animationStyle || this.config.popupAnimationStyle || 'CLASSIC',
        matchScore: 100,
        matchReason: isPreview ? 'Custom Rule Preview' : `Custom Rule: ${rule.name}`,
      };

      if (isPreview) {
        this.activePopups = [popup];
      } else {
        const maxSimultaneous = this.config.maxSimultaneousPopups || 2;
        while (this.activePopups.length >= maxSimultaneous) {
          this.activePopups.shift();
        }
        this.activePopups.push(popup);
        this.recordPopupRateTimestamp();
      }
      this.schedulePopupExpiry(eventId, durationMs);
    }

    const event: UnifiedMemeEvent = {
      id: eventId,
      timestamp: Date.now(),
      source,
      actionId: rule.id,
      actionLabel: isPreview ? `${rule.name} [PREVIEW]` : `RULE: ${rule.name}`,
      caption: isPreview ? `[PREVIEW] ${rule.caption}` : rule.caption,
      soundId,
      soundName: playedSoundName,
      memeId: memeDef ? memeDef.id : 'NONE',
      memeTitle: memeDef ? memeDef.title : 'No Matching Meme',
      confidence: isPreview ? 1.0 : confidence,
      isManualPreview: isPreview,
      category: memeDef?.category,
      rarity: memeDef?.rarity,
    };

    if (!isPreview) {
      if (memeDef) {
        this.recentMemeIds = [
          memeDef.id,
          ...this.recentMemeIds.filter((id) => id !== memeDef.id),
        ].slice(0, 15);
      }
      this.eventHistory.unshift(event);
      if (this.eventHistory.length > this.maxHistorySize) {
        this.eventHistory.pop();
      }
    }

    this.notify(event);
    return event;
  }

  private removePopup(id: string): void {
    const idx = this.activePopups.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.activePopups.splice(idx, 1);
      const dummyEvent: UnifiedMemeEvent = {
        id: `expire-${Date.now()}`,
        timestamp: Date.now(),
        source: 'BODY',
        actionId: 'POPUP_EXPIRED',
        actionLabel: 'POPUP_EXPIRED',
        caption: '',
        soundId: 'INCEPTION_BRAAAM',
        soundName: '',
        memeId: '',
        memeTitle: '',
        confidence: 0,
      };
      this.notify(dummyEvent);
    }
  }

  stopAll(): void {
    this.popupTimers.forEach((t) => clearTimeout(t));
    this.popupTimers.clear();
    this.activePopups = [];
    this.audioEngine.stopAll();
    this.visualFx.clear();
  }

  dispose(): void {
    this.stopAll();
    this.listeners.clear();
    this.popupRateTimestamps = [];
  }
}
