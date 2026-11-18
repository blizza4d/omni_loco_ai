import {
  CustomReactionRule,
  CustomRuleTriggerType,
  GoofyFaceExpressionType,
  GoofyHandGestureType,
  GoofyDualHandComboId,
  GoofyMultimodalComboId,
  GoofySoundId,
  PopupAnimationStyle,
  GOOFY_FACE_METADATA,
  GOOFY_HAND_METADATA,
  GOOFY_DUAL_COMBO_DEFINITIONS,
  GOOFY_MULTIMODAL_COMBO_DEFINITIONS,
  DEFAULT_SOUND_LIBRARY,
} from './goofy-types';

const ALLOWED_TRIGGER_TYPES: ReadonlySet<CustomRuleTriggerType> = new Set<CustomRuleTriggerType>([
  'FACE',
  'HAND',
  'COMBINED',
]);

const ALLOWED_ANIMATIONS: ReadonlySet<PopupAnimationStyle> = new Set<PopupAnimationStyle>([
  'CLASSIC',
  'MINIMAL',
  'EXPLOSIVE',
  'RETRO_ARCADE',
  'CINEMATIC',
  'GLITCH',
  'CHAOS',
  'CLEAN',
  'NO_ANIMATION',
]);

const ALLOWED_SOUNDS: ReadonlySet<string> = new Set([
  ...DEFAULT_SOUND_LIBRARY.map((s) => s.id),
  'CUSTOM_USER_AUDIO',
]);

// Security guard: strictly disallow script injection or executable JS tokens in declarative rules
const UNSAFE_CODE_PATTERN =
  /(<\s*script|javascript\s*:|\beval\s*\(|\bnew\s+Function\s*\(|on(load|error|click|mouseover)\s*=)/i;

export interface RuleValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: CustomReactionRule;
}

export function sanitizeRuleText(input: string, maxLength = 140): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Strictly validates a declarative CustomReactionRule.
 * Guarantees zero arbitrary JS execution and valid enum conditions.
 */
export function validateCustomReactionRule(
  candidate: Partial<CustomReactionRule>
): RuleValidationResult {
  const errors: string[] = [];

  if (!candidate || typeof candidate !== 'object') {
    return { valid: false, errors: ['Rule must be a valid object'] };
  }

  const rawName = typeof candidate.name === 'string' ? candidate.name : '';
  const rawCaption = typeof candidate.caption === 'string' ? candidate.caption : '';
  const rawDesc = typeof candidate.description === 'string' ? candidate.description : '';

  if (
    UNSAFE_CODE_PATTERN.test(rawName) ||
    UNSAFE_CODE_PATTERN.test(rawCaption) ||
    UNSAFE_CODE_PATTERN.test(rawDesc)
  ) {
    errors.push('Rule text contains disallowed executable or script-like syntax');
  }

  const name = sanitizeRuleText(rawName, 64);
  if (!name) {
    errors.push('Rule name is required');
  }

  const triggerType = candidate.triggerType;
  if (!triggerType || !ALLOWED_TRIGGER_TYPES.has(triggerType)) {
    errors.push('Invalid triggerType (must be FACE, HAND, or COMBINED)');
  }

  const validFaces = new Set(Object.keys(GOOFY_FACE_METADATA));
  const validHands = new Set([
    ...Object.keys(GOOFY_HAND_METADATA),
    ...Object.keys(GOOFY_DUAL_COMBO_DEFINITIONS),
  ]);
  const validCombos = new Set(Object.keys(GOOFY_MULTIMODAL_COMBO_DEFINITIONS));

  if (triggerType === 'FACE') {
    if (!candidate.faceCondition || !validFaces.has(candidate.faceCondition)) {
      errors.push('FACE rule requires a valid faceCondition');
    }
  } else if (triggerType === 'HAND') {
    if (!candidate.handCondition || !validHands.has(candidate.handCondition)) {
      errors.push('HAND rule requires a valid handCondition');
    }
  } else if (triggerType === 'COMBINED') {
    const hasPair =
      candidate.faceCondition &&
      validFaces.has(candidate.faceCondition) &&
      candidate.handCondition &&
      validHands.has(candidate.handCondition);
    const hasPresetCombo =
      candidate.combinedCondition && validCombos.has(candidate.combinedCondition);

    if (!hasPair && !hasPresetCombo) {
      errors.push(
        'COMBINED rule requires either (valid faceCondition + valid handCondition) or a valid combinedCondition'
      );
    }
  }

  const memeId = typeof candidate.memeId === 'string' ? candidate.memeId.trim() : '';
  if (!memeId || UNSAFE_CODE_PATTERN.test(memeId)) {
    errors.push('A valid memeId is required');
  }

  const soundId: GoofySoundId =
    candidate.soundId && ALLOWED_SOUNDS.has(candidate.soundId)
      ? candidate.soundId
      : 'CHAD_GONG';

  const animationStyle: PopupAnimationStyle =
    candidate.animationStyle && ALLOWED_ANIMATIONS.has(candidate.animationStyle)
      ? candidate.animationStyle
      : 'CLASSIC';

  const rawDuration = typeof candidate.durationMs === 'number' ? candidate.durationMs : 1800;
  const durationMs = Math.max(500, Math.min(6000, Math.round(rawDuration)));

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const now = Date.now();
  const sanitized: CustomReactionRule = {
    id:
      candidate.id && typeof candidate.id === 'string' && candidate.id.trim().length > 0
        ? sanitizeRuleText(candidate.id, 64)
        : `rule_${now}_${Math.random().toString(36).substring(2, 7)}`,
    name,
    description: sanitizeRuleText(rawDesc, 160),
    enabled: candidate.enabled !== false,
    triggerType: triggerType!,
    faceCondition: candidate.faceCondition,
    handCondition: candidate.handCondition,
    combinedCondition: candidate.combinedCondition,
    memeId,
    soundId,
    caption: sanitizeRuleText(rawCaption, 140) || name.toUpperCase(),
    animationStyle,
    durationMs,
    priority:
      typeof candidate.priority === 'number' && Number.isFinite(candidate.priority)
        ? Math.max(0, Math.min(100, Math.round(candidate.priority)))
        : 50,
    createdAt: candidate.createdAt || now,
    updatedAt: now,
  };

  return { valid: true, errors: [], sanitized };
}

/**
 * Duplicates an existing CustomReactionRule with a fresh ID and (Copy) label
 */
export function duplicateCustomReactionRule(rule: CustomReactionRule): CustomReactionRule {
  const now = Date.now();
  return {
    ...rule,
    id: `rule_${now}_${Math.random().toString(36).substring(2, 7)}`,
    name: sanitizeRuleText(`${rule.name} (Copy)`, 64),
    createdAt: now,
    updatedAt: now,
  };
}

export interface RuleEvaluationContext {
  faceExpression?: GoofyFaceExpressionType | null;
  handGesture?: GoofyHandGestureType | GoofyDualHandComboId | null;
  comboId?: GoofyMultimodalComboId | null;
  operatingMode?: 'MULTIMODAL' | 'FACE_ONLY' | 'HAND_ONLY';
}

/**
 * Evaluates active CustomReactionRules against a validated multimodal perception context.
 * Priority order: COMBINED rules > higher priority > most recently updated.
 */
export function evaluateCustomReactionRules(
  rules: CustomReactionRule[] | undefined,
  context: RuleEvaluationContext
): CustomReactionRule | null {
  if (!rules || rules.length === 0) return null;

  const mode = context.operatingMode || 'MULTIMODAL';
  const enabledRules = rules.filter((r) => r && r.enabled);
  if (enabledRules.length === 0) return null;

  const matches: { rule: CustomReactionRule; specificity: number }[] = [];

  for (const rule of enabledRules) {
    if (rule.triggerType === 'COMBINED') {
      if (mode !== 'MULTIMODAL') continue;

      const pairMatch =
        !!rule.faceCondition &&
        !!rule.handCondition &&
        context.faceExpression === rule.faceCondition &&
        context.handGesture === rule.handCondition;

      const comboMatch =
        !!rule.combinedCondition && context.comboId === rule.combinedCondition;

      if (pairMatch || comboMatch) {
        matches.push({ rule, specificity: 3 });
      }
    } else if (rule.triggerType === 'FACE') {
      if (mode === 'HAND_ONLY') continue;
      if (rule.faceCondition && context.faceExpression === rule.faceCondition) {
        matches.push({ rule, specificity: 2 });
      }
    } else if (rule.triggerType === 'HAND') {
      if (mode === 'FACE_ONLY') continue;
      if (rule.handCondition && context.handGesture === rule.handCondition) {
        matches.push({ rule, specificity: 2 });
      }
    }
  }

  if (matches.length === 0) return null;

  matches.sort((a, b) => {
    if (b.specificity !== a.specificity) return b.specificity - a.specificity;
    const pA = a.rule.priority ?? 50;
    const pB = b.rule.priority ?? 50;
    if (pB !== pA) return pB - pA;
    return (b.rule.updatedAt || 0) - (a.rule.updatedAt || 0);
  });

  return matches[0]!.rule;
}
