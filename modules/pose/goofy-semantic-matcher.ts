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
        (m) =>
          (m.rarity === 'LEGENDARY' || m.rarity === 'RARE') &&
          this.isMemeEligibleForAction(m, actionId)
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
      const userPool = availableMemes.filter((m) => multiAssigned.includes(m.id));
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
      // Fallback: Pick any meme tagged with suggested action or first available
      const fallback =
        availableMemes.find((m) => m.suggestedActions?.includes(actionId as any)) ||
        availableMemes[0]!;
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
   * Weighted lottery pick
   */
  private weightedPick(candidates: { meme: MemeVisualDefinition; score: number }[]): {
    meme: MemeVisualDefinition;
    score: number;
  } {
    if (candidates.length === 1) return candidates[0]!;

    // Normalize positive scores
    const minScore = Math.min(...candidates.map((c) => c.score));
    const baseOffset = minScore < 1 ? Math.abs(minScore) + 5 : 0;
    const adjusted = candidates.map((c) => ({
      ...c,
      weight: Math.max(5, c.score + baseOffset),
    }));

    const totalWeight = adjusted.reduce((acc, c) => acc + c.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const item of adjusted) {
      if (rand <= item.weight) return item;
      rand -= item.weight;
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
