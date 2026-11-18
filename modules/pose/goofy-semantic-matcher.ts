import {
  GoofyHandGestureType,
  GoofyDualHandComboId,
  GoofyFaceExpressionType,
  GoofyMultimodalComboId,
  MemeVisualDefinition,
  GoofyModeConfig,
  MemeCategory,
  GoofySoundId,
  BUILTIN_INTELLIGENT_COMBOS,
  IntelligentReactionCombo,
  GOOFY_MULTIMODAL_COMBO_DEFINITIONS,
  GOOFY_FACE_METADATA,
  GOOFY_DUAL_COMBO_DEFINITIONS,
} from './goofy-types';

export interface GestureMatchingContext {
  actionId: string;
  source: 'HAND' | 'DUAL_HAND' | 'BODY' | 'SEQUENCE' | 'CUSTOM_GESTURE' | 'REACTION_COMBO' | 'FACE' | 'MULTIMODAL';
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
  ROCK_SIGN: ['MAXIMUM_AURA', 'APPROVAL_CONFIDENCE', 'CHAOS_UNEXPECTED'],
  OK_GESTURE: ['ABSOLUTE_CINEMA', 'APPROVAL_CONFIDENCE', 'VICTORY_CELEBRATION'],
  CALL_ME: ['HAND_GESTURE_REACTION', 'APPROVAL_CONFIDENCE'],
  FINGER_HEART: ['RARE_REACTIONS', 'HAND_GESTURE_REACTION', 'VICTORY_CELEBRATION'],
  THREE_FINGER_SALUTE: ['ABSOLUTE_CINEMA', 'VICTORY_CELEBRATION', 'APPROVAL_CONFIDENCE'],

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
  DOUBLE_ROCK: ['MAXIMUM_AURA', 'CHAOS_UNEXPECTED'],
  DOUBLE_CALL_ME: ['HAND_GESTURE_REACTION', 'APPROVAL_CONFIDENCE'],
  DOUBLE_OK: ['ABSOLUTE_CINEMA', 'APPROVAL_CONFIDENCE'],
  HEART_AND_PEACE: ['RARE_REACTIONS', 'VICTORY_CELEBRATION'],

  // Sequences
  SEQ_PEACE_TO_THUMBS: ['MAXIMUM_AURA', 'VICTORY_CELEBRATION'],
  SEQ_FIST_TO_PALM: ['MAXIMUM_AURA', 'CHAOS_UNEXPECTED'],
  SEQ_POINT_TO_PEACE: ['APPROVAL_CONFIDENCE', 'VICTORY_CELEBRATION'],
  SEQ_ROCK_TO_CALL: ['MAXIMUM_AURA', 'HAND_GESTURE_REACTION'],
  SEQ_OK_TO_HEART: ['RARE_REACTIONS', 'ABSOLUTE_CINEMA'],

  // V8 Face Expressions
  FACE_SMILE: ['APPROVAL_CONFIDENCE', 'VICTORY_CELEBRATION'],
  FACE_BIG_SMILE: ['VICTORY_CELEBRATION', 'APPROVAL_CONFIDENCE', 'MAXIMUM_AURA'],
  FACE_JAW_OPEN: ['SURPRISE_SHOCK', 'CHAOS_UNEXPECTED'],
  FACE_EYEBROWS_RAISED: ['SUSPICION_JUDGEMENT', 'CONFUSION'],
  FACE_EYES_WIDE: ['SURPRISE_SHOCK', 'CONFUSION'],
  FACE_BLINK: ['CONFUSION', 'SUSPICION_JUDGEMENT'],
  FACE_FROWN_PATTERN: ['DISAPPROVAL_REJECTION', 'FAILURE_DISAPPOINTMENT', 'ANGER_AGGRESSION'],
  FACE_LIP_PUCKER: ['HAND_GESTURE_REACTION', 'APPROVAL_CONFIDENCE'],
  FACE_CHEEK_RAISE: ['APPROVAL_CONFIDENCE', 'VICTORY_CELEBRATION'],
  FACE_SURPRISE: ['SURPRISE_SHOCK', 'ABSOLUTE_CINEMA', 'CHAOS_UNEXPECTED'],
  FACE_SUSPICIOUS: ['SUSPICION_JUDGEMENT', 'CONFUSION'],

  // V9 Multimodal Secret Sequences
  SECRET_SEQ_CHAOS_APPROVAL: ['APPROVAL_CONFIDENCE', 'MAXIMUM_AURA', 'VICTORY_CELEBRATION'],
  SECRET_SEQ_SHOCK_REVEAL: ['SURPRISE_SHOCK', 'CHAOS_UNEXPECTED', 'ABSOLUTE_CINEMA'],
  SECRET_SEQ_AURA_ASCENSION: ['MAXIMUM_AURA', 'RARE_REACTIONS', 'CHAOS_UNEXPECTED'],

  // V8 Multimodal Combos
  POSITIVE_APPROVAL: ['APPROVAL_CONFIDENCE', 'MAXIMUM_AURA'],
  SHOCKED_REACTION: ['SURPRISE_SHOCK', 'CHAOS_UNEXPECTED'],
  VICTORY_REACTION: ['VICTORY_CELEBRATION', 'APPROVAL_CONFIDENCE'],
  SUSPICIOUS_ACCUSATION: ['SUSPICION_JUDGEMENT', 'CONFUSION'],
  DRAMATIC_SURPRISE: ['SURPRISE_SHOCK', 'ABSOLUTE_CINEMA'],
  DISAPPOINTMENT_REACTION: ['FAILURE_DISAPPOINTMENT', 'DISAPPROVAL_REJECTION'],
  CELEBRATION: ['VICTORY_CELEBRATION', 'MAXIMUM_AURA'],
  MAXIMUM_AURA: ['MAXIMUM_AURA', 'VICTORY_CELEBRATION'],
  RAGE_ANGER: ['ANGER_AGGRESSION', 'DISAPPROVAL_REJECTION'],
  BLANK_DISBELIEF: ['CONFUSION', 'SURPRISE_SHOCK'],
  CHEF_KISS: ['ABSOLUTE_CINEMA', 'APPROVAL_CONFIDENCE'],
  CHEEK_HEART: ['RARE_REACTIONS', 'VICTORY_CELEBRATION'],
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
  ROCK_SIGN: ['MAXIMUM_AURA', 'GOD_TIER_POWER', 'HYPE_ENERGY', 'BOSS_ENERGY'],
  OK_GESTURE: ['PERFECT_EXECUTION', 'DELICATE_PRECISION', 'W_MOMENT', 'SUPREME_INTELLECT'],
  CALL_ME: ['UNBOTHERED_AURA', 'FLAVOR_FLEX', 'HYPE_ENERGY'],
  FINGER_HEART: ['FLAVOR_FLEX', 'PEAK_SOLIDARITY', 'W_MOMENT'],
  THREE_FINGER_SALUTE: ['PEAK_SOLIDARITY', 'W_MOMENT', 'CHAD_APPROVAL'],

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
  DOUBLE_ROCK: ['MAXIMUM_AURA', 'GOD_TIER_POWER', 'HYPE_ENERGY'],
  DOUBLE_CALL_ME: ['UNBOTHERED_AURA', 'FLAVOR_FLEX'],
  DOUBLE_OK: ['PERFECT_EXECUTION', 'DELICATE_PRECISION'],
  HEART_AND_PEACE: ['FLAVOR_FLEX', 'CELEBRATION', 'W_MOMENT'],

  // Sequences
  SEQ_PEACE_TO_THUMBS: ['MAXIMUM_AURA', 'W_MOMENT', 'CHAD_APPROVAL'],
  SEQ_FIST_TO_PALM: ['GOD_TIER_POWER', 'INFINITE_AURA', 'BOSS_ENERGY'],
  SEQ_POINT_TO_PEACE: ['POINTING_REVELATION', 'W_MOMENT', 'MAXIMUM_AURA'],
  SEQ_ROCK_TO_CALL: ['MAXIMUM_AURA', 'HYPE_ENERGY'],
  SEQ_OK_TO_HEART: ['PERFECT_EXECUTION', 'FLAVOR_FLEX', 'PEAK_SOLIDARITY'],
};

/**
 * Strict Gesture Eligible Meme Collections.
 * Every recognised hand gesture or dual combo is strictly partitioned into
 * eligible meme visual candidates. Random selection or scoring CANNOT pick
 * memes outside of these explicit associations.
 */
export const GESTURE_ELIGIBLE_MEMES: Record<string, string[]> = {
  THUMBS_UP: [
    'REAL_MEME_GIGACHAD',
    'REAL_MEME_KEANU_BREATHTAKING_GIF',
    'REAL_MEME_DICAPRIO_TOAST_GIF',
    'REAL_MEME_SUCCESS_KID_GIF',
    'REAL_MEME_RONALDO_SIU_GIF',
    'REAL_MEME_SALT_BAE_GIF',
    'REAL_MEME_NODDING_GANDALF_GIF',
    'REAL_MEME_EPIC_HANDSHAKE',
    'REAL_MEME_GREAT_GATSBY_CHEERS_GIF',
    'PRESET_MEME_GIGACHAD',
    'PRESET_MEME_SUCCESS_KID',
  ],
  THUMBS_DOWN: [
    'REAL_MEME_SAD_PABLO',
    'REAL_MEME_EMOTIONAL_DAMAGE_GIF',
    'REAL_MEME_NOT_STONKS_FALLING',
    'REAL_MEME_NO_GOD_PLEASE_NO_GIF',
    'REAL_MEME_GRUMPY_CAT_NO',
    'REAL_MEME_FACEPALM_PICARD',
    'REAL_MEME_DANCING_COFFIN_GIF',
    'REAL_MEME_BAD_LUCK_BRIAN',
    'REAL_MEME_FINE_DOG_FIRE_GIF',
    'REAL_MEME_THIS_IS_FINE',
    'PRESET_MEME_SAD_KEANU',
    'PRESET_MEME_DISASTER_GIRL',
  ],
  CLOSED_FIST: [
    'REAL_MEME_ARTHURS_FIST',
    'REAL_MEME_BUFF_DOGE',
    'REAL_MEME_ULTRA_INSTINCT_SHAGGY_GIF',
    'REAL_MEME_BATMAN_SLAP',
    'REAL_MEME_CAT_WITH_KNIFE',
    'REAL_MEME_EXPLOSION_WALK_GIF',
    'REAL_MEME_SUCCESS_KID_GIF',
    'PRESET_MEME_ANGRY_CAT',
    'PRESET_MEME_BUFF_DOGE',
  ],
  OPEN_PALM: [
    'REAL_MEME_CONFUSED_TRAVOLTA_GIF',
    'REAL_MEME_BLINKING_GUY_GIF',
    'REAL_MEME_SURPRISED_PIKACHU',
    'REAL_MEME_SPONGEBOB_AIGHT_GIF',
    'REAL_MEME_HOMER_BUSHES_GIF',
    'REAL_MEME_CONFUSED_NICK_YOUNG',
    'REAL_MEME_FINE_DOG_FIRE_GIF',
    'REAL_MEME_THIS_IS_FINE',
    'PRESET_MEME_SURPRISED_PIKACHU',
    'PRESET_MEME_CONFUSED_NICK',
  ],
  PEACE_SIGN: [
    'REAL_MEME_SHAQ_SHIMMY_GIF',
    'REAL_MEME_ABSOLUTE_CINEMA_IMG',
    'REAL_MEME_NODDING_GANDALF_GIF',
    'REAL_MEME_CELEBRATION_DANCE_GIF',
    'REAL_MEME_RONALDO_SIU_GIF',
    'REAL_MEME_DICAPRIO_TOAST_GIF',
    'REAL_MEME_KPOP_HEART_GIF',
    'PRESET_MEME_DOGE_COOL',
  ],
  POINTING: [
    'REAL_MEME_SPIDERMAN_POINTING',
    'REAL_MEME_LEONARDO_POINTING_TV',
    'REAL_MEME_KEANU_BREATHTAKING_GIF',
    'REAL_MEME_ROLL_SAFE',
    'REAL_MEME_ROLL_SAFE_THINK_HD',
    'REAL_MEME_MEGAMIND_NO_BITCHES',
    'REAL_MEME_WOMAN_YELLING_CAT',
    'PRESET_MEME_POINTING_SPIDERMAN',
    'PRESET_MEME_ROLL_SAFE',
  ],
  PINCH: [
    'REAL_MEME_THE_ROCK_EYEBROW_GIF',
    'REAL_MEME_SALT_BAE_GIF',
    'REAL_MEME_FUTURAMA_FRY',
    'REAL_MEME_SQUINTING_THOR',
    'REAL_MEME_DOUBT_PRESS_X',
    'REAL_MEME_IS_THIS_A_PIGEON',
    'REAL_MEME_TRADE_OFFER',
    'PRESET_MEME_SALT_BAE',
    'PRESET_MEME_FUTURAMA_FRY',
  ],
  THREE_FINGERS: [
    'REAL_MEME_THREE_DRAGONS',
    'REAL_MEME_MATH_LADY_CALCULATION',
    'REAL_MEME_PHILOSORAPTOR_THOUGHT',
    'REAL_MEME_EXPANDING_BRAIN',
    'REAL_MEME_EXPANDING_BRAIN_ASCENSION',
    'PRESET_MEME_EXPANDING_BRAIN',
  ],
  FOUR_FINGERS: [
    'REAL_MEME_UNO_DRAW_25',
    'REAL_MEME_TWO_BUTTONS',
    'REAL_MEME_TWO_BUTTONS_CHOICE',
    'REAL_MEME_GALAXY_BRAIN_ASCENDING_GIF',
    'REAL_MEME_MIND_BLOWN_GALAXY_GIF',
    'PRESET_MEME_BIG_BRAIN',
  ],
  FIVE_FINGERS: [
    'REAL_MEME_MIND_BLOWN_GIF',
    'REAL_MEME_MIND_BLOWN_GALAXY_GIF',
    'REAL_MEME_GALAXY_BRAIN_ASCENDING_GIF',
    'REAL_MEME_SCREAMING_COWBOY_GIF',
    'REAL_MEME_CONFUSED_TRAVOLTA_GIF',
    'REAL_MEME_BLINKING_GUY_GIF',
    'PRESET_MEME_MIND_BLOWN',
    'PRESET_MEME_EXPLODING_HEAD',
  ],
  SWIPE_LEFT: [
    'REAL_MEME_SPONGEBOB_AIGHT_GIF',
    'REAL_MEME_HOMER_BUSHES_GIF',
    'REAL_MEME_NOT_STONKS_FALLING',
    'REAL_MEME_EMOTIONAL_DAMAGE_GIF',
    'REAL_MEME_DISTRACTED_BF',
    'REAL_MEME_DISTRACTED_CAT',
    'PRESET_MEME_DISTRACTED_BF',
  ],
  SWIPE_RIGHT: [
    'REAL_MEME_LEFT_EXIT',
    'REAL_MEME_STONKS_RISING',
    'REAL_MEME_EXPLOSION_WALK_GIF',
    'REAL_MEME_SUCCESS_KID_GIF',
    'REAL_MEME_RONALDO_SIU_GIF',
    'PRESET_MEME_SUCCESS_KID',
  ],
  ROCK_SIGN: [
    'MEME_ROCK_STAR',
    'REAL_MEME_ULTRA_INSTINCT_SHAGGY_GIF',
    'REAL_MEME_EXPLOSION_WALK_GIF',
    'REAL_MEME_BUFF_DOGE',
  ],
  OK_GESTURE: [
    'MEME_OK_CHEFS_KISS',
    'REAL_MEME_SALT_BAE_GIF',
    'REAL_MEME_ABSOLUTE_CINEMA_IMG',
  ],
  CALL_ME: [
    'MEME_CALL_ME_MAYBE',
    'REAL_MEME_SPONGEBOB_AIGHT_GIF',
    'REAL_MEME_SHAQ_SHIMMY_GIF',
  ],
  FINGER_HEART: [
    'MEME_KPOP_HEART',
    'REAL_MEME_KPOP_HEART_GIF',
    'MEME_SECRET_HEART_AURA',
  ],
  THREE_FINGER_SALUTE: [
    'MEME_THREE_FINGER_DISTRICT',
    'REAL_MEME_ABSOLUTE_CINEMA_IMG',
    'REAL_MEME_NODDING_GANDALF_GIF',
  ],

  // Dual Combos
  DOUBLE_THUMBS_UP: [
    'REAL_MEME_GIGACHAD',
    'REAL_MEME_GREAT_GATSBY_CHEERS_GIF',
    'REAL_MEME_RONALDO_SIU_GIF',
    'REAL_MEME_EPIC_HANDSHAKE',
    'REAL_MEME_SUCCESS_KID_GIF',
    'PRESET_MEME_GIGACHAD',
  ],
  BOTH_HANDS_OPEN: [
    'REAL_MEME_CONFUSED_TRAVOLTA_GIF',
    'REAL_MEME_BLINKING_GUY_GIF',
    'REAL_MEME_FINE_DOG_FIRE_GIF',
    'REAL_MEME_SCREAMING_COWBOY_GIF',
    'PRESET_MEME_SURPRISED_PIKACHU',
  ],
  BOTH_HANDS_FIST: [
    'REAL_MEME_BUFF_DOGE',
    'REAL_MEME_ULTRA_INSTINCT_SHAGGY_GIF',
    'REAL_MEME_ARTHURS_FIST',
    'PRESET_MEME_BUFF_DOGE',
  ],
  DOUBLE_PEACE: [
    'REAL_MEME_ABSOLUTE_CINEMA_IMG',
    'REAL_MEME_SHAQ_SHIMMY_GIF',
    'REAL_MEME_NODDING_GANDALF_GIF',
    'REAL_MEME_CELEBRATION_DANCE_GIF',
  ],
  THUMBS_UP_AND_DOWN: [
    'REAL_MEME_THIS_IS_FINE',
    'REAL_MEME_FINE_DOG_FIRE_GIF',
    'REAL_MEME_TWO_BUTTONS',
    'REAL_MEME_TWO_BUTTONS_CHOICE',
  ],
  PERFECT_TEN: [
    'REAL_MEME_MIND_BLOWN_GIF',
    'REAL_MEME_MIND_BLOWN_GALAXY_GIF',
    'REAL_MEME_GALAXY_BRAIN_ASCENDING_GIF',
    'REAL_MEME_ABSOLUTE_CINEMA_IMG',
  ],
  DOUBLE_THREE: [
    'REAL_MEME_THREE_DRAGONS',
    'REAL_MEME_MATH_LADY_CALCULATION',
    'REAL_MEME_EXPANDING_BRAIN_ASCENSION',
  ],
  ROCK_PAPER_SCISSORS: [
    'REAL_MEME_ARTHURS_FIST',
    'REAL_MEME_SPIDERMAN_POINTING',
    'REAL_MEME_BATMAN_SLAP',
  ],
  SECRET_HEART_HANDS: ['REAL_MEME_KPOP_HEART_GIF', 'MEME_SECRET_HEART_AURA', 'MEME_KPOP_HEART'],
  SECRET_MATRIX_DODGE: ['REAL_MEME_MATRIX_DODGE_GIF', 'MEME_SECRET_MATRIX_GLITCH'],
  SECRET_YOU_ARE_BREATHTAKING: [
    'REAL_MEME_KEANU_BREATHTAKING_GIF',
    'REAL_MEME_LEONARDO_POINTING_TV',
    'MEME_SECRET_YOU_ARE_BREATHTAKING',
  ],
  DOUBLE_ROCK: [
    'MEME_ROCK_STAR',
    'REAL_MEME_BUFF_DOGE',
    'REAL_MEME_ULTRA_INSTINCT_SHAGGY_GIF',
  ],
  DOUBLE_CALL_ME: [
    'MEME_CALL_ME_MAYBE',
    'REAL_MEME_SHAQ_SHIMMY_GIF',
  ],
  DOUBLE_OK: [
    'MEME_OK_CHEFS_KISS',
    'REAL_MEME_ABSOLUTE_CINEMA_IMG',
  ],
  HEART_AND_PEACE: [
    'MEME_KPOP_HEART',
    'REAL_MEME_KPOP_HEART_GIF',
    'MEME_SECRET_HEART_AURA',
  ],

  // Sequences
  SEQ_PEACE_TO_THUMBS: [
    'REAL_MEME_GIGACHAD',
    'REAL_MEME_GREAT_GATSBY_CHEERS_GIF',
    'REAL_MEME_SUCCESS_KID_GIF',
  ],
  SEQ_FIST_TO_PALM: [
    'REAL_MEME_ULTRA_INSTINCT_SHAGGY_GIF',
    'REAL_MEME_EXPLOSION_WALK_GIF',
    'REAL_MEME_ARTHURS_FIST',
  ],
  SEQ_POINT_TO_PEACE: [
    'REAL_MEME_KEANU_BREATHTAKING_GIF',
    'REAL_MEME_SHAQ_SHIMMY_GIF',
    'REAL_MEME_LEONARDO_POINTING_TV',
  ],
  SEQ_ROCK_TO_CALL: [
    'MEME_ROCK_STAR',
    'MEME_CALL_ME_MAYBE',
    'REAL_MEME_SHAQ_SHIMMY_GIF',
  ],
  SEQ_OK_TO_HEART: [
    'MEME_KPOP_HEART',
    'REAL_MEME_KPOP_HEART_GIF',
    'MEME_OK_CHEFS_KISS',
  ],

  // V8 Multimodal Combos
  POSITIVE_APPROVAL: [
    'REAL_MEME_GIGACHAD',
    'REAL_MEME_GREAT_GATSBY_CHEERS_GIF',
    'REAL_MEME_SUCCESS_KID_GIF',
  ],
  SHOCKED_REACTION: [
    'REAL_MEME_SURPRISED_PIKACHU',
    'REAL_MEME_MIND_BLOWN_GIF',
    'REAL_MEME_CONFUSED_TRAVOLTA_GIF',
  ],
  VICTORY_REACTION: [
    'REAL_MEME_DICAPRIO_TOAST_GIF',
    'REAL_MEME_RONALDO_SIU_GIF',
    'REAL_MEME_SHAQ_SHIMMY_GIF',
  ],
  SUSPICIOUS_ACCUSATION: [
    'REAL_MEME_THE_ROCK_EYEBROW_GIF',
    'REAL_MEME_SPIDERMAN_POINTING',
    'REAL_MEME_FUTURAMA_FRY',
  ],
  DRAMATIC_SURPRISE: [
    'REAL_MEME_MIND_BLOWN_GIF',
    'REAL_MEME_SURPRISED_PIKACHU',
    'REAL_MEME_GALAXY_BRAIN_ASCENDING_GIF',
  ],
  DISAPPOINTMENT_REACTION: [
    'REAL_MEME_EMOTIONAL_DAMAGE_GIF',
    'REAL_MEME_SAD_PABLO',
    'REAL_MEME_NOT_STONKS_FALLING',
  ],
  CELEBRATION: [
    'REAL_MEME_RONALDO_SIU_GIF',
    'REAL_MEME_CELEBRATION_DANCE_GIF',
    'REAL_MEME_SHAQ_SHIMMY_GIF',
  ],
  MAXIMUM_AURA: [
    'REAL_MEME_ULTRA_INSTINCT_SHAGGY_GIF',
    'REAL_MEME_GIGACHAD',
    'REAL_MEME_EXPLOSION_WALK_GIF',
  ],
  RAGE_ANGER: [
    'REAL_MEME_ARTHURS_FIST',
    'REAL_MEME_BUFF_DOGE',
    'REAL_MEME_BATMAN_SLAP',
  ],
  BLANK_DISBELIEF: [
    'REAL_MEME_BLINKING_GUY_GIF',
    'REAL_MEME_CONFUSED_TRAVOLTA_GIF',
    'REAL_MEME_SPONGEBOB_AIGHT_GIF',
  ],
  CHEF_KISS: [
    'REAL_MEME_SALT_BAE_GIF',
    'MEME_OK_CHEFS_KISS',
    'REAL_MEME_ABSOLUTE_CINEMA_IMG',
  ],
  CHEEK_HEART: [
    'REAL_MEME_KPOP_HEART_GIF',
    'MEME_KPOP_HEART',
    'MEME_SECRET_HEART_AURA',
  ],

  // V8 Face Expressions
  FACE_SMILE: [
    'REAL_MEME_SUCCESS_KID',
    'REAL_MEME_SUCCESS_KID_GIF',
    'REAL_MEME_NODDING_GANDALF_GIF',
  ],
  FACE_BIG_SMILE: [
    'REAL_MEME_DICAPRIO_TOAST_GIF',
    'REAL_MEME_GREAT_GATSBY_CHEERS_GIF',
    'REAL_MEME_RONALDO_SIU_GIF',
  ],
  FACE_JAW_OPEN: [
    'REAL_MEME_SURPRISED_PIKACHU',
    'REAL_MEME_MIND_BLOWN_GIF',
    'REAL_MEME_SCREAMING_COWBOY_GIF',
  ],
  FACE_EYEBROWS_RAISED: [
    'REAL_MEME_THE_ROCK_EYEBROW_GIF',
    'REAL_MEME_FUTURAMA_FRY',
    'REAL_MEME_DOUBT_PRESS_X',
  ],
  FACE_EYES_WIDE: [
    'REAL_MEME_CONFUSED_TRAVOLTA_GIF',
    'REAL_MEME_BLINKING_GUY_GIF',
    'REAL_MEME_FINE_DOG_FIRE_GIF',
  ],
  FACE_BLINK: [
    'REAL_MEME_BLINKING_GUY_GIF',
    'REAL_MEME_CONFUSED_TRAVOLTA_GIF',
  ],
  FACE_FROWN_PATTERN: [
    'REAL_MEME_EMOTIONAL_DAMAGE_GIF',
    'REAL_MEME_SAD_PABLO',
    'REAL_MEME_GRUMPY_CAT_NO',
  ],
  FACE_LIP_PUCKER: [
    'REAL_MEME_SALT_BAE_GIF',
    'MEME_OK_CHEFS_KISS',
  ],
  FACE_CHEEK_RAISE: [
    'REAL_MEME_KPOP_HEART_GIF',
    'MEME_KPOP_HEART',
  ],
  FACE_SURPRISE: [
    'REAL_MEME_MIND_BLOWN_GIF',
    'REAL_MEME_SURPRISED_PIKACHU',
    'REAL_MEME_GALAXY_BRAIN_ASCENDING_GIF',
  ],
  FACE_SUSPICIOUS: [
    'REAL_MEME_THE_ROCK_EYEBROW',
    'REAL_MEME_THE_ROCK_EYEBROW_GIF',
    'REAL_MEME_SIDE_EYE_DOG',
    'REAL_MEME_FRY_SQUINT',
    'MEME_SIDE_EYE',
    'MEME_VERY_SUSPICIOUS',
  ],
  SECRET_SEQ_CHAOS_APPROVAL: [
    'REAL_MEME_GIGACHAD',
    'REAL_MEME_ABSOLUTE_CINEMA',
    'REAL_MEME_KEANU_BREATHTAKING_GIF',
    'MEME_MAXIMUM_AURA',
  ],
  SECRET_SEQ_SHOCK_REVEAL: [
    'REAL_MEME_MIND_BLOWN_EXPLOSION',
    'REAL_MEME_MIND_BLOWN_GIF',
    'REAL_MEME_SURPRISED_PIKACHU',
    'MEME_EXPLODING_HEAD',
  ],
  SECRET_SEQ_AURA_ASCENSION: [
    'MEME_MAXIMUM_AURA',
    'REAL_MEME_GIGACHAD',
    'MEME_FINAL_BOSS_ENERGY',
    'MEME_ROCK_STAR',
  ],
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
   * STRICT: Only memes eligible for this specific gesture are considered.
   * If no eligible meme exists, returns null (no random or unrelated memes).
   */
  match(
    context: GestureMatchingContext,
    availableMemes: MemeVisualDefinition[],
    config: GoofyModeConfig
  ): MatchResult | null {
    if (!availableMemes || availableMemes.length === 0) return null;

    const actionId = context.actionId;

    // 1. Resolve explicit single-meme assignment or canonical default mapping
    const explicitMemeId =
      config.actionMemeMappings?.[actionId] ||
      (context.source === 'HAND'
        ? config.handMappings?.[actionId as GoofyHandGestureType]?.memeId
        : context.source === 'DUAL_HAND'
        ? config.dualHandMappings?.[actionId as GoofyDualHandComboId]?.memeId
        : context.source === 'MULTIMODAL'
        ? config.multimodalMappings?.[actionId as GoofyMultimodalComboId]?.memeId
        : context.source === 'FACE'
        ? config.faceMappings?.[actionId as GoofyFaceExpressionType]?.memeId
        : undefined) ||
      GOOFY_MULTIMODAL_COMBO_DEFINITIONS[actionId as GoofyMultimodalComboId]?.defaultMemeId ||
      GOOFY_FACE_METADATA[actionId as GoofyFaceExpressionType]?.defaultMemeId ||
      GOOFY_DUAL_COMBO_DEFINITIONS[actionId as GoofyDualHandComboId]?.defaultMemeId ||
      GESTURE_ELIGIBLE_MEMES[actionId]?.[0];

    // 2. Filter candidate pool strictly to memes eligible for this action & media filter
    const eligiblePool = availableMemes.filter((m) => {
      if (config.mediaTypeFilter === 'GIFS_ONLY' && m.mediaType !== 'gif') return false;
      if (config.mediaTypeFilter === 'IMAGES_ONLY' && m.mediaType === 'gif') return false;
      return this.isMemeEligibleForAction(m, actionId, config);
    });

    // STRICT REJECTION: If no meme is eligible for this gesture, return null.
    // Never fall back to arbitrary or unrelated memes.
    if (eligiblePool.length === 0) {
      return null;
    }

    // 3. Surprise Mode / Aura Twist (ONLY if explicitly enabled in user settings)
    if (
      config.surpriseMode &&
      (config.auraTwistProbability ?? 0) > 0 &&
      Math.random() < (config.auraTwistProbability ?? 0)
    ) {
      const auraPool = eligiblePool.filter(
        (m) =>
          m.category === 'MAXIMUM_AURA' ||
          m.category === 'ABSOLUTE_CINEMA' ||
          m.category === 'RARE_REACTIONS' ||
          m.rarity === 'LEGENDARY'
      );
      if (auraPool.length > 0) {
        const picked = auraPool[Math.floor(Math.random() * auraPool.length)]!;
        this.recordRecent(actionId, picked.id);
        return this.buildResult(picked, actionId, 160, 'Aura Twist Surprise Variant', config);
      }
    }

    // 3b. Rare Reaction Lottery (ONLY if explicitly enabled in user settings)
    if (
      config.enableRareReactions &&
      (config.rareReactionProbability ?? 0) > 0 &&
      Math.random() < (config.rareReactionProbability ?? 0)
    ) {
      const rarePool = eligiblePool.filter(
        (m) => m.rarity === 'LEGENDARY' || m.rarity === 'RARE'
      );
      if (rarePool.length > 0) {
        const picked = rarePool[Math.floor(Math.random() * rarePool.length)]!;
        this.recordRecent(actionId, picked.id);
        return this.buildResult(picked, actionId, 150, 'Rare Legendary Surprise Reaction', config);
      }
    }

    // 4. User Multi-Meme Assignment Pool (if configured)
    const multiAssigned = config.multiMemeAssignments?.[actionId];
    if (multiAssigned && multiAssigned.length > 0) {
      const userPool = eligiblePool.filter((m) => multiAssigned.includes(m.id));
      if (userPool.length > 0) {
        const candidate = this.selectDiverseCandidate(actionId, userPool, config);
        this.recordRecent(actionId, candidate.id);
        return this.buildResult(candidate, actionId, 120, 'User custom pool match', config);
      }
    }

    // 4b. V9 CHAOS MODE // UNPREDICTABLE REACTIONS (Strictly bounded to suitable eligiblePool!)
    const chaos = config.chaosMode;
    const recent = this.recentMemesByAction.get(actionId) || [];
    if (chaos?.enabled) {
      // Rare reaction drop check within eligiblePool
      const rareFreq = Math.max(0, Math.min(0.4, chaos.rareReactionFrequency ?? 0.15));
      if (rareFreq > 0 && Math.random() < rareFreq) {
        const rarePool = eligiblePool.filter(
          (m) => m.rarity === 'LEGENDARY' || m.rarity === 'RARE'
        );
        if (rarePool.length > 0) {
          const filteredRare = chaos.repeatAvoidance
            ? rarePool.filter((m) => !recent.includes(m.id))
            : rarePool;
          const targetRare = filteredRare.length > 0 ? filteredRare : rarePool;
          const pickedRare = targetRare[Math.floor(Math.random() * targetRare.length)]!;
          this.recordRecent(actionId, pickedRare.id);
          return this.buildResult(
            pickedRare,
            actionId,
            155,
            'Chaos Mode Rare Drop (Eligible)',
            config
          );
        }
      }

      // Score all strictly eligible candidates with contextual affinity + favorites + repeat avoidance
      const affinityCats = GESTURE_CATEGORY_AFFINITY[actionId] || [];
      const favorites = new Set(config.favoriteMemes || []);
      const preferredCats = new Set(config.preferredCategories || []);

      const scored = eligiblePool.map((meme) => {
        let score = 60;
        if (meme.id === explicitMemeId) score += 25;
        if (affinityCats.includes(meme.category)) score += 18;
        if (favorites.has(meme.id)) score += 30;
        if (preferredCats.has(meme.category)) score += 15;
        if (meme.mediaType === 'gif') score += 8;

        if (chaos.repeatAvoidance) {
          const recencyIdx = recent.indexOf(meme.id);
          if (recencyIdx === 0) score -= 90;
          else if (recencyIdx > 0) score -= 45 / recencyIdx;
        }

        // Add bounded chaos jitter proportional to chaosIntensity (0..100)
        const intensityNorm = Math.max(0, Math.min(100, chaos.chaosIntensity ?? 65)) / 100;
        score += Math.random() * 45 * intensityNorm;
        return { meme, score };
      });

      scored.sort((a, b) => b.score - a.score);

      // Variety controls how wide into the ranked eligible pool the softmax picker reaches
      const varietyNorm = Math.max(0, Math.min(100, chaos.reactionVariety ?? 75)) / 100;
      const topK = Math.max(1, Math.ceil(scored.length * Math.max(0.25, varietyNorm)));
      const narrowed = scored.slice(0, topK);

      // If repeatAvoidance is on and there is >1 candidate, filter out the immediate last shown meme if possible
      const finalCandidates =
        chaos.repeatAvoidance && recent.length > 0 && narrowed.length > 1
          ? narrowed.filter((c) => c.meme.id !== recent[0])
          : narrowed;
      const pickPool = finalCandidates.length > 0 ? finalCandidates : narrowed;
      const picked = this.weightedPick(pickPool);
      this.recordRecent(actionId, picked.meme.id);
      return this.buildResult(
        picked.meme,
        actionId,
        Math.min(100, Math.max(70, Math.round(picked.score))),
        `Chaos Mode Contextual Match (Intensity ${Math.round(chaos.chaosIntensity ?? 65)}%)`,
        config
      );
    }

    // 5. Anti-Repetition Check (if preventImmediateRepetition or randomMemeMode is enabled)
    if ((config.preventImmediateRepetition || config.randomMemeMode) && eligiblePool.length > 1) {
      const nonRecent = eligiblePool.filter((m) => !recent.includes(m.id));
      const poolToPick = nonRecent.length > 0 ? nonRecent : eligiblePool.filter((m) => m.id !== recent[0]);
      if (poolToPick.length > 0) {
        const candidate = config.randomMemeMode
          ? poolToPick[Math.floor(Math.random() * poolToPick.length)]!
          : (poolToPick.find((m) => m.id === explicitMemeId) || poolToPick[0]!);
        this.recordRecent(actionId, candidate.id);
        return this.buildResult(
          candidate,
          actionId,
          100,
          config.randomMemeMode ? 'Random eligible meme pick' : 'Anti-repetition diversified candidate',
          config
        );
      }
    }

    // 6. Deterministic Default: Return primary canonical eligible candidate (boosting user favorites if tied)
    const primaryCandidate = eligiblePool.find((m) => m.id === explicitMemeId) || eligiblePool[0]!;
    this.recordRecent(actionId, primaryCandidate.id);
    return this.buildResult(primaryCandidate, actionId, 100, 'Canonical action-to-meme binding', config);
  }

  /**
   * Helper to check if a meme is strictly eligible for an action.
   * A meme is eligible IF AND ONLY IF:
   * 1. Its ID is in GESTURE_ELIGIBLE_MEMES[actionId], OR
   * 2. Its gestureTags / comboTags / faceTags / multimodalTags / suggestedActions explicitly mention actionId, OR
   * 3. The user explicitly assigned it in config mappings / multiMemeAssignments / customReactionRules.
   */
  public isMemeEligibleForAction(
    meme: MemeVisualDefinition,
    actionId: string,
    config?: GoofyModeConfig
  ): boolean {
    const list = GESTURE_ELIGIBLE_MEMES[actionId];
    if (list && list.includes(meme.id)) return true;

    if (
      meme.gestureTags?.includes(actionId as GoofyHandGestureType) ||
      meme.comboTags?.includes(actionId as GoofyDualHandComboId) ||
      meme.faceTags?.includes(actionId as GoofyFaceExpressionType) ||
      meme.multimodalTags?.includes(actionId as GoofyMultimodalComboId) ||
      meme.suggestedActions?.includes(actionId as any)
    ) {
      return true;
    }

    if (config?.multiMemeAssignments?.[actionId]?.includes(meme.id)) return true;
    if (config?.actionMemeMappings?.[actionId] === meme.id) return true;
    if (config?.handMappings?.[actionId as GoofyHandGestureType]?.memeId === meme.id) return true;
    if (config?.dualHandMappings?.[actionId as GoofyDualHandComboId]?.memeId === meme.id) return true;
    if (config?.faceMappings?.[actionId as GoofyFaceExpressionType]?.memeId === meme.id) return true;
    if (config?.multimodalMappings?.[actionId as GoofyMultimodalComboId]?.memeId === meme.id) return true;
    if (
      config?.customReactionRules?.some(
        (r) =>
          r.enabled &&
          r.memeId === meme.id &&
          (r.faceCondition === actionId ||
            r.handCondition === actionId ||
            r.combinedCondition === actionId ||
            r.id === actionId)
      )
    ) {
      return true;
    }

    // V7 Custom Gestures & Intelligent Reaction Combos
    const customDef = config?.customGestures?.find((cg) => cg.id === actionId);
    if (customDef) {
      if (customDef.defaultMemeId === meme.id) return true;
      if (customDef.rotationMemeIds?.includes(meme.id)) return true;
    }
    const reactionComboDef = (config?.reactionCombos || BUILTIN_INTELLIGENT_COMBOS)?.find(
      (rc: IntelligentReactionCombo) => rc.id === actionId
    );
    if (reactionComboDef) {
      if (reactionComboDef.memeId === meme.id) return true;
    }

    return false;
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
      config.multimodalMappings?.[actionId as GoofyMultimodalComboId] ||
      config.faceMappings?.[actionId as GoofyFaceExpressionType] ||
      (config.mappings as Record<string, any>)?.[actionId];

    const soundId: GoofySoundId =
      (mapping && mapping.soundId) ||
      GOOFY_MULTIMODAL_COMBO_DEFINITIONS[actionId as GoofyMultimodalComboId]?.defaultSoundId ||
      GOOFY_FACE_METADATA[actionId as GoofyFaceExpressionType]?.defaultSoundId ||
      GOOFY_DUAL_COMBO_DEFINITIONS[actionId as GoofyDualHandComboId]?.defaultSoundId ||
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
   * Retrieves all strictly eligible candidate memes for a given action
   */
  getCandidatesForAction(
    actionId: string,
    availableMemes: MemeVisualDefinition[],
    config?: GoofyModeConfig
  ): MemeVisualDefinition[] {
    return availableMemes.filter((m) => this.isMemeEligibleForAction(m, actionId, config));
  }
}
