import {
  GoofyHandGestureType,
  GoofyDualHandComboId,
  MemeVisualDefinition,
  GoofyModeConfig,
  MemeCategory,
  GoofySoundId,
} from './goofy-types';

export interface GestureMatchingContext {
  actionId: string;
  source: 'HAND' | 'DUAL_HAND' | 'BODY';
  hand?: 'Left' | 'Right' | 'Both';
  fingerCount?: number;
  confidence?: number;
  isDynamic?: boolean;
  velocity?: { vx: number; vy: number; speed: number };
}

export interface MatchResult {
  meme: MemeVisualDefinition;
  score: number;
  reason: string;
  caption: string;
  soundId: GoofySoundId;
  candidateCount: number;
}

/**
 * Mapping of gestures to their primary semantic affinity categories
 */
const GESTURE_CATEGORY_AFFINITY: Record<string, MemeCategory[]> = {
  THUMBS_UP: ['APPROVAL_CONFIDENCE', 'CONFIDENCE', 'VICTORY_CELEBRATION', 'CELEBRATION'],
  THUMBS_DOWN: ['DISAPPROVAL_REJECTION', 'FAILURE_DISAPPOINTMENT', 'FAILURE'],
  CLOSED_FIST: ['ANGER_AGGRESSION', 'APPROVAL_CONFIDENCE', 'VICTORY_CELEBRATION'],
  OPEN_PALM: ['HAND_GESTURE_REACTION', 'DISAPPROVAL_REJECTION', 'CHAOS_UNEXPECTED'],
  PEACE_SIGN: ['VICTORY_CELEBRATION', 'CELEBRATION', 'APPROVAL_CONFIDENCE', 'HAND_GESTURE_REACTION'],
  POINTING: ['HAND_GESTURE_REACTION', 'APPROVAL_CONFIDENCE', 'CHAOS_UNEXPECTED'],
  PINCH: ['SUSPICION_JUDGEMENT', 'SUSPICIOUS', 'HAND_GESTURE_REACTION', 'VICTORY_CELEBRATION'],
  THREE_FINGERS: ['CHAOS_UNEXPECTED', 'CONFUSION', 'VICTORY_CELEBRATION'],
  FOUR_FINGERS: ['CHAOS_UNEXPECTED', 'SUSPICION_JUDGEMENT'],
  FIVE_FINGERS: ['SURPRISE_SHOCK', 'SHOCK', 'CHAOS_UNEXPECTED', 'VICTORY_CELEBRATION'],
  SWIPE_LEFT: ['DISAPPROVAL_REJECTION', 'FAILURE_DISAPPOINTMENT', 'CHAOS_UNEXPECTED'],
  SWIPE_RIGHT: ['APPROVAL_CONFIDENCE', 'CONFIDENCE', 'VICTORY_CELEBRATION'],

  // Dual Combos
  DOUBLE_THUMBS_UP: ['APPROVAL_CONFIDENCE', 'VICTORY_CELEBRATION'],
  BOTH_HANDS_OPEN: ['HAND_GESTURE_REACTION', 'SURPRISE_SHOCK', 'CHAOS_UNEXPECTED'],
  BOTH_HANDS_FIST: ['APPROVAL_CONFIDENCE', 'ANGER_AGGRESSION', 'VICTORY_CELEBRATION'],
  DOUBLE_PEACE: ['VICTORY_CELEBRATION', 'HAND_GESTURE_REACTION'],
  THUMBS_UP_AND_DOWN: ['CONFUSION', 'SUSPICION_JUDGEMENT'],
  PERFECT_TEN: ['SURPRISE_SHOCK', 'VICTORY_CELEBRATION', 'CHAOS_UNEXPECTED'],
  DOUBLE_THREE: ['CHAOS_UNEXPECTED', 'VICTORY_CELEBRATION'],
  ROCK_PAPER_SCISSORS: ['HAND_GESTURE_REACTION', 'ANGER_AGGRESSION'],
  SECRET_HEART_HANDS: ['HAND_GESTURE_REACTION', 'APPROVAL_CONFIDENCE'],
  SECRET_MATRIX_DODGE: ['VICTORY_CELEBRATION', 'APPROVAL_CONFIDENCE'],
  SECRET_YOU_ARE_BREATHTAKING: ['APPROVAL_CONFIDENCE', 'HAND_GESTURE_REACTION'],
};

/**
 * Semantic Thematic Angles for distinct gesture connotations
 */
export const GESTURE_THEMATIC_ANGLES: Record<string, string[]> = {
  THUMBS_UP: ['CHAD_APPROVAL', 'MAXIMUM_AURA', 'PERFECT_EXECUTION', 'W_MOMENT', 'WISE_SANCTION'],
  THUMBS_DOWN: ['SKILL_ISSUE', 'SEVERE_L', 'DISAPPOINTMENT', 'GAME_OVER', 'ABSOLUTE_NO'],
  CLOSED_FIST: ['ANGER_UNLEASHED', 'BOSS_ENERGY', 'GOD_TIER_POWER', 'INFINITE_AURA', 'RAGE'],
  OPEN_PALM: ['STOP_RIGHT_THERE', 'WAIT_A_MINUTE', 'ACCEPTANCE_OF_DOOM', 'PEAK_SOLIDARITY'],
  PEACE_SIGN: ['W_MOMENT', 'CELEBRATION', 'HYPE_ENERGY', 'CHAD_APPROVAL'],
  POINTING: ['POINTING_REVELATION', 'I_KNOW_THAT_REFERENCE', 'DETECTIVE_SUSPICION', 'FLAVOR_FLEX'],
  PINCH: ['DELICATE_PRECISION', 'SKEPTICAL_DOUBT', 'SMUG_MOCKERY', 'QUESTION_MARKS'],
  THREE_FINGERS: ['BIG_BRAIN', 'TRANSCENDENCE', 'OVERCOMPLICATED_LOGIC', 'PHILOSOPHICAL_DILEMMA'],
  FOUR_FINGERS: ['BIG_BRAIN', 'INFINITE_WISDOM', 'SUPREME_INTELLECT'],
  FIVE_FINGERS: ['UNFATHOMABLE_TRUTH', 'BRAIN_EXPLODED', 'HIGH_DEMAND', 'SKY_SCREAM', 'HYPE_ENERGY'],
  SWIPE_LEFT: ['SKILL_ISSUE', 'DISMISSED', 'SEVERE_L', 'MARKET_CRASH'],
  SWIPE_RIGHT: ['ACTION_HERO', 'UNBOTHERED_AURA', 'FINANCIAL_WIN', 'BIG_GAINS', 'MAXIMUM_AURA'],

  // Dual Combos
  DOUBLE_THUMBS_UP: ['MAXIMUM_AURA', 'CHAD_APPROVAL', 'W_MOMENT', 'PEAK_SOLIDARITY'],
  BOTH_HANDS_OPEN: ['CHAOS_ENERGY', 'FIRE_EVERYWHERE', 'UNFATHOMABLE_TRUTH', 'SKY_SCREAM'],
  BOTH_HANDS_FIST: ['GOD_TIER_POWER', 'INFINITE_AURA', 'BOSS_ENERGY', 'GOAT_CELEBRATION'],
  DOUBLE_PEACE: ['CELEBRATION', 'HYPE_ENERGY', 'W_MOMENT'],
  THUMBS_UP_AND_DOWN: ['DILEMMA', 'TOTAL_BEWILDERMENT', 'SKILL_ISSUE'],
  PERFECT_TEN: ['TRANSCENDENCE', 'INFINITE_WISDOM', 'SUPREME_INTELLECT', 'HYPE_ENERGY'],
  DOUBLE_THREE: ['OVERCOMPLICATED_LOGIC', 'BIG_BRAIN'],
  ROCK_PAPER_SCISSORS: ['CHAOTIC_THREAT', 'DELICATE_PRECISION'],
  SECRET_HEART_HANDS: ['FLAVOR_FLEX', 'PEAK_SOLIDARITY', 'W_MOMENT'],
  SECRET_MATRIX_DODGE: ['ACTION_HERO', 'UNBOTHERED_AURA', 'MAXIMUM_AURA'],
  SECRET_YOU_ARE_BREATHTAKING: ['MAXIMUM_AURA', 'CHAD_APPROVAL', 'POINTING_REVELATION'],
};

/**
 * Preset mode affinities towards emotional tones
 */
export const PRESET_EMOTIONAL_AFFINITIES: Record<string, string[]> = {
  CHAOS_MODE: ['CHAOS', 'RAGE', 'SURPRISED'],
  CLEAN_COMEDY: ['CONFIDENCE', 'VICTORY', 'WHOLESOME'],
  ULTRA_DRAMA: ['RAGE', 'MYSTERY', 'DISMAY'],
  MAXIMUM_AURA: ['CONFIDENCE', 'VICTORY'],
  FAILURE_COMPILATION: ['DISMAY', 'IRONY', 'SARCASM'],
  UNHINGED_MODE: ['CHAOS', 'RAGE', 'IRONY'],
};

export class SemanticMemeMatcher {
  // Recent meme memory per action to prevent immediate repetition
  private recentMemesByAction: Map<string, string[]> = new Map();
  private maxRecencyMemory = 4;

  /**
   * Reset internal repetition memory
   */
  reset(): void {
    this.recentMemesByAction.clear();
  }

  /**
   * Main semantic matching function.
   * Given an action context and available memes, scores all candidates and picks
   * an appropriate, diverse, semantically matching meme.
   */
  match(
    context: GestureMatchingContext,
    availableMemes: MemeVisualDefinition[],
    config: GoofyModeConfig
  ): MatchResult | null {
    if (!availableMemes || availableMemes.length === 0) return null;

    const actionId = context.actionId;

    // 1. Check if user configured strict single-meme assignment override
    const explicitMemeId =
      config.actionMemeMappings?.[actionId] ||
      (context.source === 'HAND'
        ? config.handMappings?.[actionId as GoofyHandGestureType]?.memeId
        : context.source === 'DUAL_HAND'
        ? config.dualHandMappings?.[actionId as GoofyDualHandComboId]?.memeId
        : undefined);

    // If user disabled smart matching, honor fixed assignment directly
    if (config.smartMatchingEnabled === false && explicitMemeId) {
      const fixedMeme = availableMemes.find((m) => m.id === explicitMemeId);
      if (fixedMeme) {
        return this.buildResult(fixedMeme, actionId, 100, 'Explicit user 1:1 mapping', config);
      }
    }

    // 2. Rare Reaction Lottery (if enabled and triggered)
    if (
      config.enableRareReactions &&
      Math.random() < (config.rareReactionProbability ?? 0.12)
    ) {
      const rarePool = availableMemes.filter(
        (m) => {
          if (config.mediaTypeFilter === 'GIFS_ONLY' && m.mediaType !== 'gif') return false;
          if (config.mediaTypeFilter === 'IMAGES_ONLY' && m.mediaType === 'gif') return false;
          return (
            (m.rarity === 'LEGENDARY' || m.rarity === 'RARE') &&
            this.isMemeEligibleForAction(m, actionId)
          );
        }
      );
      if (rarePool.length > 0) {
        const picked = rarePool[Math.floor(Math.random() * rarePool.length)]!;
        this.recordRecent(actionId, picked.id);
        return this.buildResult(picked, actionId, 150, 'Rare Legendary Surprise Reaction', config);
      }
    }

    // 3. User Multi-Meme Assignment Pool (if configured)
    const multiAssigned = config.multiMemeAssignments?.[actionId];
    if (multiAssigned && multiAssigned.length > 0) {
      const userPool = availableMemes.filter((m) => {
        if (config.mediaTypeFilter === 'GIFS_ONLY' && m.mediaType !== 'gif') return false;
        if (config.mediaTypeFilter === 'IMAGES_ONLY' && m.mediaType === 'gif') return false;
        return multiAssigned.includes(m.id);
      });
      if (userPool.length > 0) {
        const candidate = this.selectDiverseCandidate(actionId, userPool, config);
        this.recordRecent(actionId, candidate.id);
        return this.buildResult(candidate, actionId, 120, 'User custom pool match', config);
      }
    }

    // 4. Candidate Scoring Engine
    const scoredCandidates: { meme: MemeVisualDefinition; score: number }[] = [];
    const recentList = this.recentMemesByAction.get(actionId) || [];
    const affinities = GESTURE_CATEGORY_AFFINITY[actionId] || [];

    for (const meme of availableMemes) {
      // Check media type filter
      if (config.mediaTypeFilter === 'GIFS_ONLY' && meme.mediaType !== 'gif') continue;
      if (config.mediaTypeFilter === 'IMAGES_ONLY' && meme.mediaType === 'gif') continue;

      let score = 0;

      // Direct gesture tag match (+100)
      if (
        meme.gestureTags?.includes(actionId as GoofyHandGestureType) ||
        meme.comboTags?.includes(actionId as GoofyDualHandComboId) ||
        meme.suggestedActions?.includes(actionId as any)
      ) {
        score += 100;
      }

      // Explicit assigned meme gets strong affinity (+45)
      if (explicitMemeId && meme.id === explicitMemeId) {
        score += 45;
      }

      // Semantic category affinity match (+55)
      if (affinities.includes(meme.category)) {
        score += 55;
      }

      // Dynamic swipe / movement affinity (+35)
      if (context.isDynamic && (meme.tags?.includes('swipe') || meme.mediaType === 'gif')) {
        score += 35;
      }

      // Real media preference over generic SVGs (+30)
      if (meme.sourceType === 'REAL_MEDIA' || meme.dataUrl.startsWith('/memes/')) {
        score += 30;
      }

      // User favorite bonus (+30)
      if (config.favoriteMemes?.includes(meme.id) || meme.isFavorite) {
        score += 30;
      }

      // Preferred category bonus (+25)
      if (config.preferredCategories?.includes(meme.category)) {
        score += 25;
      }

      // Thematic angle resonance (+35 per angle match, up to +70)
      const actionThematics = GESTURE_THEMATIC_ANGLES[actionId];
      if (actionThematics && meme.thematicAngles && meme.thematicAngles.length > 0) {
        let matchingAngles = 0;
        for (const angle of meme.thematicAngles) {
          if (actionThematics.includes(angle)) matchingAngles++;
        }
        score += Math.min(70, matchingAngles * 35);
      }

      // Emotional tone preset synergy (+30)
      if (meme.emotionalTone && config.activePresetId) {
        const favoredTones = PRESET_EMOTIONAL_AFFINITIES[config.activePresetId];
        if (favoredTones && favoredTones.includes(meme.emotionalTone)) {
          score += 30;
        }
      }

      // High confidence gesture execution boost (+20)
      if (context.confidence && context.confidence > 0.85) {
        score += 20;
      }

      // Anti-Repetition Penalty: Heavily penalize recently played memes for this action
      if (config.preventImmediateRepetition !== false && recentList.length > 0) {
        const recencyIndex = recentList.indexOf(meme.id);
        if (recencyIndex === 0) {
          score -= 140; // Just played on the previous trigger
        } else if (recencyIndex === 1) {
          score -= 75; // Played 2 triggers ago
        } else if (recencyIndex === 2) {
          score -= 35; // Played 3 triggers ago
        }
      }

      if (score > 20) {
        scoredCandidates.push({ meme, score });
      }
    }

    // 5. Select from top candidates
    if (scoredCandidates.length === 0) {
      // Fallback: Pick any meme tagged with suggested action or first available matching media filter
      const pool = availableMemes.filter((m) => {
        if (config.mediaTypeFilter === 'GIFS_ONLY' && m.mediaType !== 'gif') return false;
        if (config.mediaTypeFilter === 'IMAGES_ONLY' && m.mediaType === 'gif') return false;
        return true;
      });
      const validPool = pool.length > 0 ? pool : availableMemes;
      const fallback =
        validPool.find((m) => m.suggestedActions?.includes(actionId as any)) ||
        validPool[0]!;
      return this.buildResult(fallback, actionId, 50, 'Fallback match', config);
    }

    scoredCandidates.sort((a, b) => b.score - a.score);

    // Pick among top 4 with weighted random to maintain variety
    const topSlice = scoredCandidates.slice(0, 4);
    const chosen = this.weightedPick(topSlice);

    this.recordRecent(actionId, chosen.meme.id);
    return this.buildResult(chosen.meme, actionId, chosen.score, 'Semantic affinity match', config);
  }

  /**
   * Helper to check if meme matches action directly
   */
  private isMemeEligibleForAction(meme: MemeVisualDefinition, actionId: string): boolean {
    return (
      meme.gestureTags?.includes(actionId as GoofyHandGestureType) ||
      meme.comboTags?.includes(actionId as GoofyDualHandComboId) ||
      meme.suggestedActions?.includes(actionId as any) ||
      false
    );
  }

  /**
   * Diverse candidate selection from a small pool
   */
  private selectDiverseCandidate(
    actionId: string,
    pool: MemeVisualDefinition[],
    config: GoofyModeConfig
  ): MemeVisualDefinition {
    if (pool.length === 1) return pool[0]!;
    const recent = this.recentMemesByAction.get(actionId) || [];
    const nonRecent = pool.filter((m) => !recent.includes(m.id));
    const targetPool = nonRecent.length > 0 ? nonRecent : pool;
    return targetPool[Math.floor(Math.random() * targetPool.length)]!;
  }

  /**
   * Temperature-based softmax lottery pick
   * Provides intelligent balance between top-scoring affinity and unexpected variety
   */
  private weightedPick(candidates: { meme: MemeVisualDefinition; score: number }[]): {
    meme: MemeVisualDefinition;
    score: number;
  } {
    if (candidates.length === 1) return candidates[0]!;

    // Softmax temperature distribution (T=30.0 gives responsive balance)
    const temperature = 30.0;
    const maxScore = candidates[0]!.score;
    const expWeights = candidates.map((c) => Math.exp((c.score - maxScore) / temperature));
    const totalExp = expWeights.reduce((sum, w) => sum + w, 0);

    let rand = Math.random() * totalExp;
    for (let i = 0; i < candidates.length; i++) {
      rand -= expWeights[i]!;
      if (rand <= 0) {
        return candidates[i]!;
      }
    }
    return candidates[0]!;
  }

  /**
   * Records meme in recency ring buffer
   */
  private recordRecent(actionId: string, memeId: string): void {
    const list = this.recentMemesByAction.get(actionId) || [];
    const updated = [memeId, ...list.filter((id) => id !== memeId)].slice(0, this.maxRecencyMemory);
    this.recentMemesByAction.set(actionId, updated);
  }

  /**
   * Builds standardized MatchResult
   */
  private buildResult(
    meme: MemeVisualDefinition,
    actionId: string,
    score: number,
    reason: string,
    config: GoofyModeConfig
  ): MatchResult {
    const customCaption = config.actionCustomCaptions?.[actionId];
    const caption = customCaption || meme.caption || meme.title;

    const mapping =
      config.handMappings?.[actionId as GoofyHandGestureType] ||
      config.dualHandMappings?.[actionId as GoofyDualHandComboId] ||
      (config.mappings as Record<string, any>)?.[actionId];

    const soundId: GoofySoundId =
      (mapping && mapping.soundId) ||
      meme.soundId ||
      'CHAD_GONG';

    return {
      meme,
      score,
      reason,
      caption,
      soundId,
      candidateCount: 1,
    };
  }

  /**
   * Retrieves all candidate memes for a given action
   */
  getCandidatesForAction(
    actionId: string,
    availableMemes: MemeVisualDefinition[]
  ): MemeVisualDefinition[] {
    const affinities = GESTURE_CATEGORY_AFFINITY[actionId] || [];
    return availableMemes.filter(
      (m) =>
        m.gestureTags?.includes(actionId as GoofyHandGestureType) ||
        m.comboTags?.includes(actionId as GoofyDualHandComboId) ||
        m.suggestedActions?.includes(actionId as any) ||
        affinities.includes(m.category)
    );
  }
}
