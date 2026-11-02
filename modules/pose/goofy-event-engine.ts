import {
  GoofyModeConfig,
  GoofySoundId,
  ActiveMemePopup,
  UnifiedMemeEvent,
  GOOFY_POSE_METADATA,
  GOOFY_HAND_METADATA,
  GOOFY_DUAL_COMBO_DEFINITIONS,
  GoofyPoseType,
  GoofyHandGestureType,
  GoofyDualHandComboId,
  MemeVisualDefinition,
} from './goofy-types';
import { GoofyAudioEngine } from './goofy-audio-engine';
import { GoofyVisualFXEngine } from './goofy-visual-fx';
import {
  getDefaultMemeForAction,
  getMemeById,
  getRandomMemeForAction,
  getRareMeme,
} from './goofy-meme-library';

export type EventEngineListener = (
  event: UnifiedMemeEvent,
  activePopups: ActiveMemePopup[]
) => void;

export class GoofyEventEngine {
  private config: GoofyModeConfig;
  private audioEngine: GoofyAudioEngine;
  private visualFx: GoofyVisualFXEngine;
  private customMemes: MemeVisualDefinition[] = [];

  private activePopups: ActiveMemePopup[] = [];
  private eventHistory: UnifiedMemeEvent[] = [];
  private listeners: Set<EventEngineListener> = new Set();
  private maxHistorySize = 50;
  private lastMemeIdByAction: Map<string, string> = new Map();
  private recentMemeIds: string[] = [];

  constructor(
    config: GoofyModeConfig,
    audioEngine: GoofyAudioEngine,
    visualFx: GoofyVisualFXEngine
  ) {
    this.config = config;
    this.audioEngine = audioEngine;
    this.visualFx = visualFx;
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
    source: 'BODY' | 'HAND' | 'DUAL_HAND',
    hand?: 'Left' | 'Right' | 'Both',
    confidence = 0.95
  ): UnifiedMemeEvent | null {
    // 1. Check if action is enabled in config
    const comboDef = GOOFY_DUAL_COMBO_DEFINITIONS[actionId as GoofyDualHandComboId];
    let mapping = comboDef
      ? this.config.dualHandMappings?.[actionId as GoofyDualHandComboId]
      : source === 'BODY'
      ? this.config.mappings[actionId as GoofyPoseType]
      : this.config.handMappings[actionId as GoofyHandGestureType];

    if (!mapping && !comboDef) {
      mapping = this.config.mappings[actionId as GoofyPoseType];
    }
    if (mapping && !mapping.enabled) {
      return null;
    }

    // 2. Resolve label & caption
    let actionLabel = actionId;
    let defaultCaption = 'MEME ACTION DETECTED!';
    if (comboDef) {
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

    const caption =
      (mapping && mapping.customCaption) ||
      this.config.actionCustomCaptions[actionId] ||
      defaultCaption;

    // 3. Resolve sound
    let soundId: GoofySoundId =
      (mapping && mapping.soundId) ||
      (comboDef && comboDef.defaultSoundId) ||
      'INCEPTION_BRAAAM';
    if (this.config.randomSoundMode) {
      const lib = this.audioEngine.getSoundLibrary();
      soundId = lib[Math.floor(Math.random() * lib.length)]!.id;
    }

    // 4. Resolve meme visual
    let memeDef: MemeVisualDefinition;

    if (
      this.config.enableRareReactions &&
      Math.random() < (this.config.rareReactionProbability ?? 0.10)
    ) {
      memeDef = getRareMeme(this.customMemes);
    } else if (this.config.randomMemeMode) {
      const lastId = this.lastMemeIdByAction.get(actionId);
      memeDef = getRandomMemeForAction(actionId, this.customMemes, lastId);
    } else {
      const assignedMemeId =
        (mapping && mapping.memeId) ||
        this.config.actionMemeMappings[actionId] ||
        (comboDef && comboDef.defaultMemeId) ||
        getDefaultMemeForAction(actionId).id;

      memeDef =
        getMemeById(assignedMemeId, this.customMemes) ||
        getDefaultMemeForAction(actionId);
    }

    this.lastMemeIdByAction.set(actionId, memeDef.id);
    this.recentMemeIds = [
      memeDef.id,
      ...this.recentMemeIds.filter((id) => id !== memeDef.id),
    ].slice(0, 15);

    // 5. Simultaneous Event Arbitration
    const now = performance.now();
    const durationMs = this.config.memeDurationMs || 1500;

    if (this.activePopups.length > 0) {
      const policy = this.config.simultaneousPolicy || 'ALLOW_BOTH';
      if (policy === 'REPLACE_OLDEST') {
        this.activePopups = [];
      } else if (policy === 'HAND_PRIORITY' && source === 'BODY') {
        const hasActiveHand = this.activePopups.some((p) => p.actionSource === 'HAND');
        if (hasActiveHand) return null; // Yield to hand
      } else if (policy === 'BODY_PRIORITY' && source === 'HAND') {
        const hasActiveBody = this.activePopups.some((p) => p.actionSource === 'BODY');
        if (hasActiveBody) return null; // Yield to body
      } else if (policy === 'ALLOW_BOTH') {
        // Cap simultaneous popups to 2
        if (this.activePopups.length >= 2) {
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

    if (this.config.enableMemePopups) {
      const popup: ActiveMemePopup = {
        id: eventId,
        actionId,
        actionLabel,
        actionSource: source,
        hand,
        memeId: memeDef.id,
        memeTitle: memeDef.title,
        memeUrl: (mapping && mapping.customImageUrl) || memeDef.dataUrl,
        caption,
        soundId,
        soundName: playedSoundName,
        timestamp: now,
        durationMs,
        rotationDeg,
        isManualPreview: false,
        category: memeDef.category,
        rarity: memeDef.rarity,
        animationStyle: this.config.popupAnimationStyle || 'CLASSIC',
      };

      this.activePopups.push(popup);

      // Auto-expire popup after duration
      setTimeout(() => {
        this.removePopup(eventId);
      }, durationMs);
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
      memeId: memeDef.id,
      memeTitle: memeDef.title,
      confidence,
      isManualPreview: false,
      category: memeDef.category,
      rarity: memeDef.rarity,
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
    confidence = 0.98
  ): UnifiedMemeEvent | null {
    return this.dispatchActionTrigger(comboId, 'DUAL_HAND', 'Both', confidence);
  }

  /**
   * Manual Preview: triggers sound and meme popup without treating it as an AI detection
   */
  previewAction(
    actionId: string,
    source: 'BODY' | 'HAND' | 'DUAL_HAND',
    soundOverride?: GoofySoundId,
    memeOverride?: string
  ): ActiveMemePopup {
    const comboDef = GOOFY_DUAL_COMBO_DEFINITIONS[actionId as GoofyDualHandComboId];
    let mapping = comboDef
      ? this.config.dualHandMappings?.[actionId as GoofyDualHandComboId]
      : source === 'BODY'
      ? this.config.mappings[actionId as GoofyPoseType]
      : this.config.handMappings[actionId as GoofyHandGestureType];

    if (!mapping && !comboDef) {
      mapping = this.config.mappings[actionId as GoofyPoseType];
    }

    const soundId =
      soundOverride ||
      (mapping && mapping.soundId) ||
      (comboDef && comboDef.defaultSoundId) ||
      'INCEPTION_BRAAAM';
    const memeId =
      memeOverride ||
      (mapping && mapping.memeId) ||
      this.config.actionMemeMappings[actionId] ||
      (comboDef && comboDef.defaultMemeId) ||
      getDefaultMemeForAction(actionId).id;

    const memeDef = getMemeById(memeId, this.customMemes) || getDefaultMemeForAction(actionId);

    let actionLabel = actionId;
    let defaultCaption = 'TEST PREVIEW';
    if (comboDef) {
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

    const caption =
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

    setTimeout(() => {
      this.removePopup(eventId);
    }, durationMs);

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
    this.activePopups = [];
    this.audioEngine.stopAll();
    this.visualFx.clear();
  }
}
