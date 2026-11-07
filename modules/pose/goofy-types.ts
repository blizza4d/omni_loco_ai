import { PoseLandmark } from './types';

export type GoofyPoseType =
  | 'T_POSE'
  | 'HANDS_RAISED'
  | 'HANDS_ON_HIPS'
  | 'ARMS_CROSSED'
  | 'SQUAT'
  | 'SQUAT_STANCE'
  | 'JUMP'
  | 'FLEX_POSE'
  | 'DOUBLE_BICEPS_FLEX'
  | 'CLAP'
  | 'DAB'
  | 'DISCO_FEVER'
  | 'ZEN_PRAYER'
  | 'THE_THINKER'
  | 'ZOMBIE_WALK';

export type GoofyHandGestureType =
  | 'OPEN_PALM'
  | 'CLOSED_FIST'
  | 'THUMBS_UP'
  | 'THUMBS_DOWN'
  | 'PEACE_SIGN'
  | 'POINTING'
  | 'PINCH'
  | 'THREE_FINGERS'
  | 'FOUR_FINGERS'
  | 'FIVE_FINGERS'
  | 'SWIPE_LEFT'
  | 'SWIPE_RIGHT';

export type GoofyDualHandComboId =
  | 'DOUBLE_THUMBS_UP'
  | 'BOTH_HANDS_OPEN'
  | 'BOTH_HANDS_FIST'
  | 'DOUBLE_PEACE'
  | 'THUMBS_UP_AND_DOWN'
  | 'PERFECT_TEN'
  | 'DOUBLE_THREE'
  | 'ROCK_PAPER_SCISSORS'
  | 'SECRET_HEART_HANDS'
  | 'SECRET_MATRIX_DODGE'
  | 'SECRET_YOU_ARE_BREATHTAKING';

export type GoofyActionId = GoofyPoseType | GoofyHandGestureType | GoofyDualHandComboId;

export type GoofySoundId =
  | 'AIR_HORN'
  | 'INCEPTION_BRAAAM'
  | 'ANIME_POWER_UP'
  | 'CARTOON_BOING'
  | 'RECORD_SCRATCH'
  | 'BRASS_FANFARE'
  | 'SAD_TROMBONE'
  | 'DISCO_SLAP'
  | 'SINGING_BOWL'
  | 'CARTOON_SQUEAK'
  | 'CROWD_CHEER'
  | 'CONFIDENT_ENTRANCE'
  | 'DRAMATIC_SUSPENSE'
  | 'CARTOON_IMPACT'
  | 'CARTOON_JUMP'
  | 'CARTOON_CLAP'
  | 'LASER_BEAM'
  | 'SWIPE_WHOOSH'
  | 'VICTORY_BELL'
  | 'CHAD_GONG'
  | 'SUCTION_POP'
  | 'LEVEL_UP_NOTIFICATION'
  | 'CUSTOM_USER_AUDIO';

export type PoseTrackingStatus =
  | 'NO_POSE'
  | 'CANDIDATE'
  | 'STABLE_RECOGNIZED'
  | 'POSE_TRIGGERED'
  | 'POSE_RELEASED'
  | 'TRACKING_LOST';

export type HandTrackingStatus =
  | 'NO_HANDS'
  | 'HANDS_DETECTED'
  | 'GESTURE_RECOGNIZED'
  | 'GESTURE_TRIGGERED'
  | 'TRACKING_LOST';

export interface PoseClassificationResult {
  pose: GoofyPoseType | null;
  confidence: number;
  label: string;
  comicCaption: string;
  isDynamicAction?: boolean;
  actionCategory?: 'STATIC_POSE' | 'DYNAMIC_ACTION';
  visibilityState?: 'FULL_BODY' | 'UPPER_BODY_ONLY' | 'PARTIAL' | 'NO_BODY';
  visibilityWarning?: string;
  jointMetrics: {
    armElevationLeft?: number;
    armElevationRight?: number;
    elbowAngleLeft?: number;
    elbowAngleRight?: number;
    kneeAngleLeft?: number;
    kneeAngleRight?: number;
    torsoInclination?: number;
    wristDistance?: number;
    verticalVelocity?: number;
  };
}

export type HandRecognitionState =
  | 'NO_HANDS'
  | 'SEARCHING'
  | 'HAND_DETECTED'
  | 'LANDMARKS_UNSTABLE'
  | 'UNKNOWN_GESTURE'
  | 'CANDIDATE'
  | 'CONFIRMED'
  | 'TRIGGERED'
  | 'COOLDOWN'
  | 'TRACKING_LOST';

export interface HandClassificationResult {
  gesture: GoofyHandGestureType | null;
  handedness: 'Left' | 'Right';
  confidence: number;
  label: string;
  comicCaption: string;
  fingerCount?: number;
  isDynamic?: boolean;
  fingerStates?: {
    thumb: boolean;
    index: boolean;
    middle: boolean;
    ring: boolean;
    pinky: boolean;
  };
  rejectionReason?: string;
}

export interface HandStateMachineResult {
  triggered: boolean;
  gesture: GoofyHandGestureType | null;
  rawGesture: GoofyHandGestureType | null;
  stabilizedGesture: GoofyHandGestureType | null;
  handedness: 'Left' | 'Right';
  state: HandRecognitionState;
  holdDurationMs: number;
  confidence: number;
  rejectionReason: string | null;
}

export interface SoundDefinition {
  id: GoofySoundId;
  name: string;
  category: 'MEME' | 'CARTOON' | 'DRAMATIC' | 'MUSICAL' | 'CUSTOM';
  description: string;
  durationSec: number;
}

export type MemeCategory =
  | 'APPROVAL_CONFIDENCE'
  | 'DISAPPROVAL_REJECTION'
  | 'ANGER_AGGRESSION'
  | 'SURPRISE_SHOCK'
  | 'CONFUSION'
  | 'VICTORY_CELEBRATION'
  | 'SUSPICION_JUDGEMENT'
  | 'FAILURE_DISAPPOINTMENT'
  | 'CHAOS_UNEXPECTED'
  | 'HAND_GESTURE_REACTION'
  | 'SHOCK'
  | 'CONFIDENCE'
  | 'FAILURE'
  | 'SUSPICIOUS'
  | 'CELEBRATION'
  | 'SPECIAL'
  | 'REACTION'
  | 'CLASSIC'
  | 'CARTOON'
  | 'ANIME'
  | 'CUSTOM';

export interface SemanticCategoryMeta {
  id: MemeCategory;
  label: string;
  icon: string;
  description: string;
}

export const SEMANTIC_MEME_CATEGORIES: SemanticCategoryMeta[] = [
  { id: 'APPROVAL_CONFIDENCE', label: 'Approval & Confidence', icon: '👑', description: 'GigaChad, Keanu, Success Kid, absolute confidence.' },
  { id: 'DISAPPROVAL_REJECTION', label: 'Disapproval & Rejection', icon: '👎', description: 'Skill issue, facepalm, Gordon Ramsay, Homer bush.' },
  { id: 'ANGER_AGGRESSION', label: 'Anger & Aggression', icon: '✊', description: 'Arthur fist, desk slam, rage, intense frustration.' },
  { id: 'SURPRISE_SHOCK', label: 'Surprise & Shock', icon: '😲', description: 'Surprised Pikachu, Mind Blown, jaw drop, disbelief.' },
  { id: 'CONFUSION', label: 'Confusion', icon: '🤔', description: 'Confused Travolta, math lady, what just happened.' },
  { id: 'VICTORY_CELEBRATION', label: 'Victory & Celebration', icon: '🏆', description: 'Absolute Cinema, Shaq shimmy, DiCaprio toast, party.' },
  { id: 'SUSPICION_JUDGEMENT', label: 'Suspicion & Judgement', icon: '🤨', description: 'The Rock eyebrow, side eye, Fry squint, Gus Fring.' },
  { id: 'FAILURE_DISAPPOINTMENT', label: 'Failure & Disappointment', icon: '💀', description: 'Emotional damage, mission failed, sad trombone.' },
  { id: 'CHAOS_UNEXPECTED', label: 'Chaos & Unexpected', icon: '🔥', description: 'Elmo fire, This is Fine, Disaster Girl, sudden madness.' },
  { id: 'HAND_GESTURE_REACTION', label: 'Funny Hand Gestures', icon: '🤏', description: 'Spiderman pointing, salt bae, khaby lame, hands.' },
];

export type MemeRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'LEGENDARY';

export type PopupAnimationStyle =
  | 'CLASSIC'
  | 'MINIMAL'
  | 'EXPLOSIVE'
  | 'RETRO_ARCADE'
  | 'CHAOS'
  | 'NO_ANIMATION';

export type MemePresetId =
  | 'DEFAULT'
  | 'CHAOS_MODE'
  | 'CLEAN_COMEDY'
  | 'ULTRA_DRAMA'
  | 'MAXIMUM_AURA'
  | 'FAILURE_COMPILATION'
  | 'UNHINGED_MODE'
  | 'CUSTOM_USER_PRESET';

export interface MemeVisualDefinition {
  id: string;
  title: string;
  category: MemeCategory;
  description: string;
  caption?: string; // Default comic caption
  dataUrl: string; // SVG data URL or image/GIF data/blob URL
  mediaType?: 'image' | 'gif' | 'video' | 'svg';
  sourceType?: 'REAL_MEDIA' | 'ORIGINAL_SVG' | 'USER_UPLOAD';
  aspectRatio?: number;
  tags?: string[];
  gestureTags?: GoofyHandGestureType[];
  comboTags?: GoofyDualHandComboId[];
  isCustom?: boolean;
  fileName?: string;
  soundId?: GoofySoundId;
  suggestedActions?: GoofyActionId[];
  rarity?: MemeRarity;
  isFavorite?: boolean;
  createdAt?: number;
  emotionalTone?: 'CONFIDENCE' | 'IRONY' | 'DISMAY' | 'RAGE' | 'HYPE' | 'SARCASM' | 'MYSTERY' | 'CHAOS' | 'VICTORY' | 'CONFUSED' | 'SURPRISED';
  thematicAngles?: string[];
}

export interface PoseSoundMapping {
  pose: GoofyActionId;
  soundId: GoofySoundId;
  enabled: boolean;
  visualEnabled: boolean;
  memeId?: string;
  customAudioUrl?: string; // Data URL for uploaded user audio
  customAudioName?: string;
  customCaption?: string;
  customImageUrl?: string;
  customImageName?: string;
}

export interface ActiveMemePopup {
  id: string;
  actionId: string;
  actionLabel: string;
  actionSource: 'BODY' | 'HAND' | 'DUAL_HAND';
  hand?: 'Left' | 'Right' | 'Both';
  memeId: string;
  memeTitle: string;
  memeUrl: string;
  mediaType?: 'image' | 'gif' | 'video' | 'svg';
  sourceType?: 'REAL_MEDIA' | 'ORIGINAL_SVG' | 'USER_UPLOAD';
  caption: string;
  soundId: GoofySoundId;
  soundName: string;
  soundUrl?: string;
  timestamp: number;
  durationMs: number;
  rotationDeg: number;
  isManualPreview?: boolean;
  category?: MemeCategory;
  rarity?: MemeRarity;
  animationStyle?: PopupAnimationStyle;
  matchScore?: number;
  matchReason?: string;
}

export interface UnifiedMemeEvent {
  id: string;
  timestamp: number;
  source: 'BODY' | 'HAND' | 'DUAL_HAND';
  actionId: string;
  actionLabel: string;
  hand?: 'Left' | 'Right' | 'Both';
  caption: string;
  soundId: GoofySoundId;
  soundName: string;
  memeId: string;
  memeTitle: string;
  confidence: number;
  isManualPreview?: boolean;
  category?: MemeCategory;
  rarity?: MemeRarity;
}

export interface GoofyModeConfig {
  volume: number; // 0.0 to 1.0
  isMuted: boolean;
  cooldownMs: number; // Minimum ms between consecutive triggers
  minHoldMs: number; // Minimum ms pose must be held before triggering (for static poses)
  enableVisualFx: boolean;
  enableScreenShake: boolean;
  randomSoundMode: boolean; // Randomly picks from enabled sounds
  mappings: Record<GoofyPoseType, PoseSoundMapping>;
  // V2 Multimodal Additions
  memeDurationMs: number; // Duration in ms to display meme pop-up (default 1500)
  enableMemePopups: boolean; // Display meme popups over live camera
  enableSound: boolean; // Play sound effects
  simultaneousPolicy: 'ALLOW_BOTH' | 'RIGHT_PRIORITY' | 'LEFT_PRIORITY' | 'HAND_PRIORITY' | 'BODY_PRIORITY' | 'REPLACE_OLDEST';
  handMappings: Record<GoofyHandGestureType, PoseSoundMapping>;
  dualHandMappings: Record<GoofyDualHandComboId, PoseSoundMapping>;
  actionMemeMappings: Record<string, string>; // action/gesture ID -> memeId
  actionCustomCaptions: Record<string, string>; // action/gesture ID -> custom caption
  // V3 Advanced Meme Additions
  randomMemeMode?: boolean; // When true, genuine action selects a random eligible meme
  enableRareReactions?: boolean; // When true, rare/legendary reactions can occasionally trigger
  rareReactionProbability?: number; // 0.01 to 0.30 (default 0.10)
  popupAnimationStyle?: PopupAnimationStyle; // 'CLASSIC' | 'MINIMAL' | 'EXPLOSIVE' | 'RETRO_ARCADE' | 'NO_ANIMATION'
  activePresetId?: string; // Current preset ID
  favoriteMemes?: string[]; // Array of favorite meme IDs
  recentMemes?: string[]; // Array of last-triggered meme IDs
  // Real Meme Recognition Engine Additions
  smartMatchingEnabled?: boolean; // AI-driven multi-candidate semantic selection
  preventImmediateRepetition?: boolean; // Discourages repeated meme triggers on consecutive gestures
  preferredCategories?: MemeCategory[]; // User's preferred reaction categories
  mediaTypeFilter?: 'ALL' | 'GIFS_ONLY' | 'IMAGES_ONLY'; // Filter active meme media
  multiMemeAssignments?: Record<string, string[]>; // Action ID -> array of meme IDs
  popupConcurrencyPolicy?: 'REPLACE_EXISTING' | 'ALLOW_SIMULTANEOUS' | 'QUEUE_SEQUENTIAL'; // Behavior when new gesture triggers during active popup
  maxSimultaneousPopups?: number; // Max concurrent on screen (default 2)
  recentlyUsedMemeIds?: string[]; // History of last 20 triggered memes for workspace review
  gestureSensitivity?: 'HIGH' | 'MEDIUM' | 'RELAXED'; // Classification threshold sensitivity
}

export interface GoofyTriggerEvent {
  id: string;
  timestamp: number;
  pose: GoofyPoseType;
  poseLabel: string;
  caption: string;
  soundId: GoofySoundId;
  soundName: string;
  confidence: number;
  isDynamic?: boolean;
  memeId?: string;
  memeTitle?: string;
}

export interface GoofyActionMetadata {
  label: string;
  defaultCaption: string;
  icon: string;
  description: string;
  actionType: 'STATIC_POSE' | 'DYNAMIC_ACTION';
  kinematicCues: string[];
}

export interface GoofyHandMetadata {
  id: GoofyHandGestureType;
  label: string;
  defaultCaption: string;
  icon: string;
  description: string;
  isDynamic?: boolean;
  cues: string[];
}

export const GOOFY_POSE_METADATA: Record<GoofyPoseType, GoofyActionMetadata> = {
  T_POSE: {
    label: 'T-POSE',
    defaultCaption: 'DOMINANCE ASSERTED // DEFAULT VECTOR LOADED',
    icon: '🧍',
    description: 'Both arms extended horizontally at shoulder height.',
    actionType: 'STATIC_POSE',
    kinematicCues: ['Elbows straight (>140°)', 'Shoulders elevated ~90°', 'Wrists level with shoulders'],
  },
  HANDS_RAISED: {
    label: 'HANDS RAISED',
    defaultCaption: 'PRAISE THE SUN // TOUCHDOWN VICTORY!',
    icon: '🙌',
    description: 'Both arms reaching straight up into the air above the head.',
    actionType: 'STATIC_POSE',
    kinematicCues: ['Wrists high above head', 'Shoulders elevated (>125°)', 'Arms separated'],
  },
  HANDS_ON_HIPS: {
    label: 'HANDS ON HIPS',
    defaultCaption: 'HEROIC ENTRANCE // SASS LEVEL MAXIMUM',
    icon: '🦸',
    description: 'Both hands planted on hips with elbows flared out.',
    actionType: 'STATIC_POSE',
    kinematicCues: ['Wrists at waist/hips', 'Elbows flared wide', 'Torso upright'],
  },
  ARMS_CROSSED: {
    label: 'ARMS CROSSED',
    defaultCaption: 'SKEPTICAL STANDOFF // DRAMATIC SUSPENSE',
    icon: '🙅',
    description: 'Both arms crossed across the chest in front of the torso.',
    actionType: 'STATIC_POSE',
    kinematicCues: ['Forearms folded across chest', 'Wrists cross torso midline', 'Elbows bent (45°-120°)'],
  },
  SQUAT: {
    label: 'SQUAT',
    defaultCaption: 'DEEP SUMO DROP // CARTOON IMPACT',
    icon: '🏋️',
    description: 'Recognisable lowering and raising of the body using leg and hip landmarks.',
    actionType: 'STATIC_POSE',
    kinematicCues: ['Knees flexed (<135°)', 'Hips lowered relative to knees', 'Torso balanced'],
  },
  SQUAT_STANCE: {
    label: 'DEEP SQUAT',
    defaultCaption: 'THICC GRAVITY DROP // SUMO OVERLOAD',
    icon: '🏋️',
    description: 'Deep squat with knees bent past 120° and hips lowered.',
    actionType: 'STATIC_POSE',
    kinematicCues: ['Knees flexed (<135°)', 'Hips lowered', 'Legs tracked'],
  },
  JUMP: {
    label: 'JUMP',
    defaultCaption: 'VERTICAL AIRTIME // TO THE MOON!',
    icon: '🦘',
    description: 'Dynamic temporal movement pattern involving rapid upward displacement followed by landing.',
    actionType: 'DYNAMIC_ACTION',
    kinematicCues: ['Pre-jump crouch', 'Upward vertical velocity (>0.4 H/s)', 'Airborne apex and landing'],
  },
  FLEX_POSE: {
    label: 'FLEX POSE',
    defaultCaption: 'MASSIVE GAINS DETECTED // MAXIMUM BULK',
    icon: '💪',
    description: 'Supported arms-flexed body configuration: shoulders up, elbows bent 90°.',
    actionType: 'STATIC_POSE',
    kinematicCues: ['Shoulders abducted 60°-130°', 'Elbows flexed 40°-112°', 'Wrists above elbows'],
  },
  DOUBLE_BICEPS_FLEX: {
    label: 'DOUBLE BICEPS FLEX',
    defaultCaption: 'MASSIVE GAINS DETECTED // MAXIMUM BULK',
    icon: '💪',
    description: 'Classic bodybuilder pose: shoulders up, elbows bent 90°.',
    actionType: 'STATIC_POSE',
    kinematicCues: ['Shoulders abducted 60°-130°', 'Elbows flexed 40°-112°', 'Wrists above elbows'],
  },
  CLAP: {
    label: 'CLAP',
    defaultCaption: 'APPLAUSE DETECTED // AUDIENCE REACTION',
    icon: '👏',
    description: 'Dynamic temporal sequence where hands rapidly approach each other, make contact, and recoil.',
    actionType: 'DYNAMIC_ACTION',
    kinematicCues: ['Hands start apart (>0.35 W)', 'Rapid inward approach velocity', 'Contact distance (<0.15 W)'],
  },
  DAB: {
    label: 'THE RETRO DAB',
    defaultCaption: 'MLG 360 NO SCOPE // PEAK 2016 ENERGY',
    icon: '🕺',
    description: 'One arm extended diagonally up, face tucked into opposite bent elbow.',
    actionType: 'STATIC_POSE',
    kinematicCues: ['One arm straight (>130°)', 'Opposite elbow bent across chest', 'Wrist near opposite shoulder'],
  },
  DISCO_FEVER: {
    label: 'DISCO FEVER',
    defaultCaption: 'STAYIN ALIVE // SATURDAY NIGHT FEVER',
    icon: '🪩',
    description: 'One arm pointing high into the sky, the other down at hip.',
    actionType: 'STATIC_POSE',
    kinematicCues: ['One arm pointing straight up', 'Opposite arm pointing down across hip'],
  },
  ZEN_PRAYER: {
    label: 'ZEN PRAYER',
    defaultCaption: 'INNER PEACE ACHIEVED // NAMASTE NIRVANA',
    icon: '🙏',
    description: 'Hands pressed together at mid-chest sternum in prayer.',
    actionType: 'STATIC_POSE',
    kinematicCues: ['Wrists touching at sternum', 'Elbows flared outwards', 'Forearms angled upward'],
  },
  THE_THINKER: {
    label: 'THE THINKER',
    defaultCaption: 'BIG BRAIN TIME // CALCULATING REALITY...',
    icon: '🤔',
    description: 'One hand resting under chin with body in contemplative stance.',
    actionType: 'STATIC_POSE',
    kinematicCues: ['Wrist resting under chin/nose', 'Elbow bent supporting head'],
  },
  ZOMBIE_WALK: {
    label: 'ZOMBIE WALK',
    defaultCaption: 'BRAAAINS // THRILLER NIGHT MODE',
    icon: '🧟',
    description: 'Both arms extended straight forward at chest height.',
    actionType: 'STATIC_POSE',
    kinematicCues: ['Both arms extended forward (>145°)', 'Wrists parallel at shoulder height'],
  },
};

export const DEFAULT_SOUND_LIBRARY: SoundDefinition[] = [
  {
    id: 'AIR_HORN',
    name: 'MLG Air Horn Triple Blast',
    category: 'MEME',
    description: 'Staggered three-burst classic MLG stadium meme horn.',
    durationSec: 1.2,
  },
  {
    id: 'INCEPTION_BRAAAM',
    name: 'Cinematic Inception BRAAAM',
    category: 'DRAMATIC',
    description: 'Deep, rumbling low-frequency brass horn stinger for dramatic reveals.',
    durationSec: 1.8,
  },
  {
    id: 'CROWD_CHEER',
    name: 'Crowd Cheering & Applause',
    category: 'MUSICAL',
    description: 'Multi-voice roaring stadium crowd applause and celebration.',
    durationSec: 1.6,
  },
  {
    id: 'CONFIDENT_ENTRANCE',
    name: 'Confident Heroic Fanfare',
    category: 'MUSICAL',
    description: 'Bold staccato trumpet fanfare with confident punchy presence.',
    durationSec: 1.4,
  },
  {
    id: 'DRAMATIC_SUSPENSE',
    name: 'Dramatic Suspense Drone',
    category: 'DRAMATIC',
    description: 'Tense low-register suspense chord with sinister cinematic sting.',
    durationSec: 1.5,
  },
  {
    id: 'CARTOON_IMPACT',
    name: 'Cartoon Heavy Thud Impact',
    category: 'CARTOON',
    description: 'Heavy bass thud with springy rubber comic recoil.',
    durationSec: 0.9,
  },
  {
    id: 'CARTOON_JUMP',
    name: 'Spring Launch Jump',
    category: 'CARTOON',
    description: 'Fast ascending spring wobble chirp with cartoon whoosh.',
    durationSec: 0.8,
  },
  {
    id: 'ANIME_POWER_UP',
    name: 'Anime Super Saiyan Chime',
    category: 'MEME',
    description: 'High-energy ascending arpeggiated chime with victory aura shimmer.',
    durationSec: 1.4,
  },
  {
    id: 'CARTOON_CLAP',
    name: 'Crisp Comic Hand Clap',
    category: 'CARTOON',
    description: 'Dual-transient percussive hand slap with room resonance.',
    durationSec: 0.5,
  },
  {
    id: 'CARTOON_BOING',
    name: 'Cartoon Spring Boing',
    category: 'CARTOON',
    description: 'Classic rubber spring wobble with pitch slide.',
    durationSec: 0.9,
  },
  {
    id: 'RECORD_SCRATCH',
    name: 'Record Scratch / Vinyl Stop',
    category: 'MEME',
    description: 'Sudden freeze frame needle screech.',
    durationSec: 0.6,
  },
  {
    id: 'BRASS_FANFARE',
    name: 'Triumphant Royal Fanfare',
    category: 'MUSICAL',
    description: 'Bright brass fanfare announcement for victorious moments.',
    durationSec: 1.5,
  },
  {
    id: 'SAD_TROMBONE',
    name: 'Sad Trombone (Wah-Wah)',
    category: 'CARTOON',
    description: 'Four-note descending comedic disappointment slide.',
    durationSec: 1.8,
  },
  {
    id: 'DISCO_SLAP',
    name: 'Funk Slap Bass Pluck',
    category: 'MUSICAL',
    description: 'Groovy resonant slap-bass burst with funk wah sweep.',
    durationSec: 0.8,
  },
  {
    id: 'SINGING_BOWL',
    name: 'Zen Tibetan Singing Bowl',
    category: 'DRAMATIC',
    description: 'Harmonic singing bowl gong with deep calming resonance.',
    durationSec: 2.2,
  },
  {
    id: 'CARTOON_SQUEAK',
    name: 'High-Pitch Squeaky Toy',
    category: 'CARTOON',
    description: 'Dual chirp cartoon squeak impact.',
    durationSec: 0.5,
  },
  {
    id: 'LASER_BEAM',
    name: 'Sci-Fi Targeting Laser',
    category: 'CARTOON',
    description: 'Futuristic targeting laser beam chirp with high-frequency pitch descent.',
    durationSec: 0.6,
  },
  {
    id: 'SWIPE_WHOOSH',
    name: 'Dynamic Motion Whoosh',
    category: 'CARTOON',
    description: 'Fast resonant white-noise air whoosh for dynamic gestures.',
    durationSec: 0.4,
  },
  {
    id: 'VICTORY_BELL',
    name: 'Sparkling Victory Chime',
    category: 'MUSICAL',
    description: 'Dual bell harmonic chime with shimmering decay.',
    durationSec: 1.1,
  },
  {
    id: 'CHAD_GONG',
    name: 'Triumphant Chad Gong',
    category: 'DRAMATIC',
    description: 'Low-frequency resonant metallic gong stinger with bold presence.',
    durationSec: 1.5,
  },
  {
    id: 'SUCTION_POP',
    name: 'Cartoon Suction Pop',
    category: 'CARTOON',
    description: 'Satisfying rubber suction pop transient with comic resonance.',
    durationSec: 0.4,
  },
  {
    id: 'LEVEL_UP_NOTIFICATION',
    name: 'Retro Level Up Stinger',
    category: 'MEME',
    description: 'Ascending 3-note arpeggiated synth chime for special gestures.',
    durationSec: 0.8,
  },
];

export const GOOFY_HAND_METADATA: Record<GoofyHandGestureType, GoofyHandMetadata> = {
  OPEN_PALM: {
    id: 'OPEN_PALM',
    label: 'OPEN PALM',
    defaultCaption: 'STOP RIGHT THERE',
    icon: '✋',
    description: 'All 5 fingers extended flat toward camera.',
    cues: ['All 5 fingers extended', 'Flat palm orientation'],
  },
  CLOSED_FIST: {
    id: 'CLOSED_FIST',
    label: 'CLOSED FIST',
    defaultCaption: 'ANGER UNLOCKED',
    icon: '✊',
    description: 'All fingers curled tight into a solid fist.',
    cues: ['All 4 fingers curled', 'Thumb tucked over fingers'],
  },
  THUMBS_UP: {
    id: 'THUMBS_UP',
    label: 'THUMBS UP',
    defaultCaption: 'MAXIMUM AURA',
    icon: '👍',
    description: 'Fingers curled with thumb pointing straight up.',
    cues: ['Thumb extended vertical upward', '4 fingers fully curled'],
  },
  THUMBS_DOWN: {
    id: 'THUMBS_DOWN',
    label: 'THUMBS DOWN',
    defaultCaption: 'SKILL ISSUE',
    icon: '👎',
    description: 'Fingers curled with thumb pointing straight down.',
    cues: ['Thumb extended downward', '4 fingers fully curled'],
  },
  PEACE_SIGN: {
    id: 'PEACE_SIGN',
    label: 'PEACE SIGN',
    defaultCaption: 'MAIN CHARACTER ENERGY',
    icon: '✌️',
    description: 'Index and middle fingers extended in a V-shape.',
    cues: ['Index & middle extended', 'Ring & pinky curled', 'Fingertips separated'],
  },
  POINTING: {
    id: 'POINTING',
    label: 'POINTING',
    defaultCaption: 'BRO IS TARGETING',
    icon: '👉',
    description: 'Index finger extended forward, others curled.',
    cues: ['Index finger extended', 'Middle, ring, pinky curled'],
  },
  PINCH: {
    id: 'PINCH',
    label: 'PINCH',
    defaultCaption: 'GOTCHA',
    icon: '🤏',
    description: 'Thumb tip and index tip touching or near contact.',
    cues: ['Thumb & index tip distance < 0.35 palm scale'],
  },
  THREE_FINGERS: {
    id: 'THREE_FINGERS',
    label: 'THREE FINGERS',
    defaultCaption: 'TRIPLE THREAT',
    icon: '🤟',
    description: 'Index, middle, and ring fingers extended.',
    cues: ['Index, middle, ring extended', 'Pinky curled'],
  },
  FOUR_FINGERS: {
    id: 'FOUR_FINGERS',
    label: 'FOUR FINGERS',
    defaultCaption: 'QUAD CORE',
    icon: '🖖',
    description: 'Index, middle, ring, and pinky extended, thumb tucked.',
    cues: ['4 fingers extended', 'Thumb tucked across palm'],
  },
  FIVE_FINGERS: {
    id: 'FIVE_FINGERS',
    label: 'FIVE FINGERS',
    defaultCaption: 'ABSOLUTE POWER',
    icon: '🖐️',
    description: 'All 5 fingers spread wide.',
    cues: ['All 5 fingers extended and spread outward'],
  },
  SWIPE_LEFT: {
    id: 'SWIPE_LEFT',
    label: 'SWIPE LEFT',
    defaultCaption: 'REJECTED',
    icon: '👈',
    description: 'Fast horizontal hand motion from right to left.',
    isDynamic: true,
    cues: ['Rapid leftward velocity > 1.2 screens/sec'],
  },
  SWIPE_RIGHT: {
    id: 'SWIPE_RIGHT',
    label: 'SWIPE RIGHT',
    defaultCaption: 'APPROVED',
    icon: '👉',
    description: 'Fast horizontal hand motion from left to right.',
    isDynamic: true,
    cues: ['Rapid rightward velocity > 1.2 screens/sec'],
  },
};

export interface DualHandComboDefinition {
  id: GoofyDualHandComboId;
  label: string;
  leftGesture: GoofyHandGestureType | GoofyHandGestureType[];
  rightGesture: GoofyHandGestureType | GoofyHandGestureType[];
  defaultMemeId: string;
  defaultSoundId: GoofySoundId;
  defaultCaption: string;
  icon: string;
  description: string;
  isSecret?: boolean;
  requiredDigits?: number;
}

export const GOOFY_DUAL_COMBO_DEFINITIONS: Record<GoofyDualHandComboId, DualHandComboDefinition> = {
  DOUBLE_THUMBS_UP: {
    id: 'DOUBLE_THUMBS_UP',
    label: 'DOUBLE THUMBS UP',
    leftGesture: 'THUMBS_UP',
    rightGesture: 'THUMBS_UP',
    defaultMemeId: 'MEME_MAXIMUM_AURA',
    defaultSoundId: 'CHAD_GONG',
    defaultCaption: 'ULTRA CHAD OVERLOAD // AURA +1000',
    icon: '👍👍',
    description: 'Both hands displaying simultaneous thumbs up.',
  },
  BOTH_HANDS_OPEN: {
    id: 'BOTH_HANDS_OPEN',
    label: 'BOTH HANDS OPEN',
    leftGesture: ['OPEN_PALM', 'FIVE_FINGERS'],
    rightGesture: ['OPEN_PALM', 'FIVE_FINGERS'],
    defaultMemeId: 'MEME_STOP_SIGN',
    defaultSoundId: 'INCEPTION_BRAAAM',
    defaultCaption: 'HALT ON ALL FREQUENCIES // TOTAL SURRENDER',
    icon: '✋✋',
    description: 'Both palms held open toward the camera.',
  },
  BOTH_HANDS_FIST: {
    id: 'BOTH_HANDS_FIST',
    label: 'DOUBLE FISTS',
    leftGesture: 'CLOSED_FIST',
    rightGesture: 'CLOSED_FIST',
    defaultMemeId: 'MEME_FINAL_BOSS_ENERGY',
    defaultSoundId: 'ANIME_POWER_UP',
    defaultCaption: 'DOUBLE BROFIST // POWER LEVEL OVER 9000',
    icon: '✊✊',
    description: 'Both hands clenched in solid fists.',
  },
  DOUBLE_PEACE: {
    id: 'DOUBLE_PEACE',
    label: 'DOUBLE PEACE',
    leftGesture: 'PEACE_SIGN',
    rightGesture: 'PEACE_SIGN',
    defaultMemeId: 'MEME_ABSOLUTE_CINEMA',
    defaultSoundId: 'BRASS_FANFARE',
    defaultCaption: 'DOUBLE PEACE // ABSOLUTE CINEMA',
    icon: '✌️✌️',
    description: 'Both hands displaying peace V-signs.',
  },
  THUMBS_UP_AND_DOWN: {
    id: 'THUMBS_UP_AND_DOWN',
    label: 'THUMBS UP & DOWN',
    leftGesture: ['THUMBS_UP', 'THUMBS_DOWN'],
    rightGesture: ['THUMBS_UP', 'THUMBS_DOWN'],
    defaultMemeId: 'MEME_CONFUSED_BRAIN',
    defaultSoundId: 'RECORD_SCRATCH',
    defaultCaption: 'PERFECTLY BALANCED // BRUH MOMENT',
    icon: '👍👎',
    description: 'One hand thumbs up, other hand thumbs down.',
  },
  PERFECT_TEN: {
    id: 'PERFECT_TEN',
    label: 'PERFECT 10',
    leftGesture: 'FIVE_FINGERS',
    rightGesture: 'FIVE_FINGERS',
    defaultMemeId: 'MEME_PERFECT_TEN',
    defaultSoundId: 'LEVEL_UP_NOTIFICATION',
    defaultCaption: 'PERFECT 10 // MAXIMUM POWER UNLEASHED',
    icon: '🔟',
    description: 'All 10 fingers extended across both hands in counting gesture.',
    requiredDigits: 10,
  },
  DOUBLE_THREE: {
    id: 'DOUBLE_THREE',
    label: 'DOUBLE THREE',
    leftGesture: 'THREE_FINGERS',
    rightGesture: 'THREE_FINGERS',
    defaultMemeId: 'MEME_SIX_PACK_ENERGY',
    defaultSoundId: 'CONFIDENT_ENTRANCE',
    defaultCaption: 'DOUBLE TRIPLE // SIX PACK ENERGY',
    icon: '🤟🤟',
    description: 'Three fingers extended on each hand simultaneously (6 digits).',
    requiredDigits: 6,
  },
  ROCK_PAPER_SCISSORS: {
    id: 'ROCK_PAPER_SCISSORS',
    label: 'RPS SHOWDOWN',
    leftGesture: ['CLOSED_FIST', 'PEACE_SIGN', 'OPEN_PALM'],
    rightGesture: ['CLOSED_FIST', 'PEACE_SIGN', 'OPEN_PALM'],
    defaultMemeId: 'MEME_ROCK_PAPER_SCISSORS',
    defaultSoundId: 'CARTOON_IMPACT',
    defaultCaption: 'ROCK PAPER SCISSORS // CHOOSE YOUR FIGHTER',
    icon: '✊✌️',
    description: 'Two-hand duel: Fist vs Scissors or Open Palm.',
  },
  SECRET_HEART_HANDS: {
    id: 'SECRET_HEART_HANDS',
    label: 'HEART HANDS',
    leftGesture: 'PINCH',
    rightGesture: 'PINCH',
    defaultMemeId: 'MEME_SECRET_HEART_AURA',
    defaultSoundId: 'VICTORY_BELL',
    defaultCaption: 'SECRET UNLOCKED // WHOLESOME OVERLOAD',
    icon: '🫶',
    description: 'Secret combo: Both hands pinching to form a heart shape.',
    isSecret: true,
  },
  SECRET_MATRIX_DODGE: {
    id: 'SECRET_MATRIX_DODGE',
    label: 'NEURAL GLITCH',
    leftGesture: ['POINTING', 'PINCH'],
    rightGesture: ['POINTING', 'PINCH'],
    defaultMemeId: 'MEME_SECRET_MATRIX_GLITCH',
    defaultSoundId: 'LASER_BEAM',
    defaultCaption: 'SECRET UNLOCKED // MATRIX OVERRIDE ACTIVATED',
    icon: '🕶️',
    description: 'Secret combo: Pointing with one hand while pinching with the other.',
    isSecret: true,
  },
  SECRET_YOU_ARE_BREATHTAKING: {
    id: 'SECRET_YOU_ARE_BREATHTAKING',
    label: 'BREATHTAKING',
    leftGesture: ['THUMBS_UP', 'POINTING'],
    rightGesture: ['THUMBS_UP', 'POINTING'],
    defaultMemeId: 'MEME_SECRET_YOU_ARE_BREATHTAKING',
    defaultSoundId: 'BRASS_FANFARE',
    defaultCaption: 'SECRET UNLOCKED // YOU\'RE BREATHTAKING!',
    icon: '✨👉',
    description: 'Secret combo: Thumbs up with one hand while pointing at camera.',
    isSecret: true,
  },
};

export const DEFAULT_GOOFY_CONFIG: GoofyModeConfig = {
  volume: 0.8,
  isMuted: false,
  cooldownMs: 750,
  minHoldMs: 250,
  enableVisualFx: true,
  enableScreenShake: true,
  randomSoundMode: false,
  memeDurationMs: 1500,
  enableMemePopups: true,
  enableSound: true,
  simultaneousPolicy: 'ALLOW_BOTH',
  mappings: {
    T_POSE: {
      pose: 'T_POSE',
      soundId: 'INCEPTION_BRAAAM',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_SURPRISED_PIKACHU',
    },
    HANDS_RAISED: {
      pose: 'HANDS_RAISED',
      soundId: 'CROWD_CHEER',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_SUCCESS_KID',
    },
    HANDS_ON_HIPS: {
      pose: 'HANDS_ON_HIPS',
      soundId: 'CONFIDENT_ENTRANCE',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_CHAD_THUMBS_UP',
    },
    ARMS_CROSSED: {
      pose: 'ARMS_CROSSED',
      soundId: 'DRAMATIC_SUSPENSE',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_JUDGMENTAL_STARE',
    },
    SQUAT: {
      pose: 'SQUAT',
      soundId: 'CARTOON_IMPACT',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_SUPERHERO_LANDING',
    },
    SQUAT_STANCE: {
      pose: 'SQUAT_STANCE',
      soundId: 'CARTOON_BOING',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_SUPERHERO_LANDING',
    },
    JUMP: {
      pose: 'JUMP',
      soundId: 'CARTOON_JUMP',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_EXPLODING_HEAD',
    },
    FLEX_POSE: {
      pose: 'FLEX_POSE',
      soundId: 'ANIME_POWER_UP',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_THIS_IS_FINE',
    },
    DOUBLE_BICEPS_FLEX: {
      pose: 'DOUBLE_BICEPS_FLEX',
      soundId: 'ANIME_POWER_UP',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_THIS_IS_FINE',
    },
    CLAP: {
      pose: 'CLAP',
      soundId: 'CARTOON_CLAP',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_CLAPPING_AWARD',
    },
    DAB: {
      pose: 'DAB',
      soundId: 'RECORD_SCRATCH',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_DOGE_WOW',
    },
    DISCO_FEVER: {
      pose: 'DISCO_FEVER',
      soundId: 'DISCO_SLAP',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_PEACE_OUT',
    },
    ZEN_PRAYER: {
      pose: 'ZEN_PRAYER',
      soundId: 'SINGING_BOWL',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_THIS_IS_FINE',
    },
    THE_THINKER: {
      pose: 'THE_THINKER',
      soundId: 'CARTOON_SQUEAK',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_EXPLODING_HEAD',
    },
    ZOMBIE_WALK: {
      pose: 'ZOMBIE_WALK',
      soundId: 'SAD_TROMBONE',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_FACEPALM',
    },
  },
  handMappings: {
    OPEN_PALM: {
      pose: 'OPEN_PALM',
      soundId: 'RECORD_SCRATCH',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_STOP_SIGN',
    },
    CLOSED_FIST: {
      pose: 'CLOSED_FIST',
      soundId: 'CARTOON_IMPACT',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_POW_IMPACT',
    },
    THUMBS_UP: {
      pose: 'THUMBS_UP',
      soundId: 'CHAD_GONG',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_MAXIMUM_AURA',
    },
    THUMBS_DOWN: {
      pose: 'THUMBS_DOWN',
      soundId: 'SAD_TROMBONE',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_SKILL_ISSUE',
    },
    PEACE_SIGN: {
      pose: 'PEACE_SIGN',
      soundId: 'VICTORY_BELL',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_MAIN_CHARACTER',
    },
    POINTING: {
      pose: 'POINTING',
      soundId: 'LASER_BEAM',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_TARGET_LOCKED',
    },
    PINCH: {
      pose: 'PINCH',
      soundId: 'SUCTION_POP',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_PINCH_GRAB',
    },
    THREE_FINGERS: {
      pose: 'THREE_FINGERS',
      soundId: 'LEVEL_UP_NOTIFICATION',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_THREE_FINGER_SALUTE',
    },
    FOUR_FINGERS: {
      pose: 'FOUR_FINGERS',
      soundId: 'CONFIDENT_ENTRANCE',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_FOUR_FINGER_POWER',
    },
    FIVE_FINGERS: {
      pose: 'FIVE_FINGERS',
      soundId: 'CROWD_CHEER',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_UNSTOPPABLE',
    },
    SWIPE_LEFT: {
      pose: 'SWIPE_LEFT',
      soundId: 'SWIPE_WHOOSH',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_SWIPE_LEFT',
    },
    SWIPE_RIGHT: {
      pose: 'SWIPE_RIGHT',
      soundId: 'SWIPE_WHOOSH',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_SWIPE_RIGHT',
    },
  },
  dualHandMappings: {
    DOUBLE_THUMBS_UP: {
      pose: 'DOUBLE_THUMBS_UP' as any,
      soundId: 'CHAD_GONG',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_MAXIMUM_AURA',
    },
    BOTH_HANDS_OPEN: {
      pose: 'BOTH_HANDS_OPEN' as any,
      soundId: 'INCEPTION_BRAAAM',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_STOP_SIGN',
    },
    BOTH_HANDS_FIST: {
      pose: 'BOTH_HANDS_FIST' as any,
      soundId: 'ANIME_POWER_UP',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_FINAL_BOSS_ENERGY',
    },
    DOUBLE_PEACE: {
      pose: 'DOUBLE_PEACE' as any,
      soundId: 'BRASS_FANFARE',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_ABSOLUTE_CINEMA',
    },
    THUMBS_UP_AND_DOWN: {
      pose: 'THUMBS_UP_AND_DOWN' as any,
      soundId: 'RECORD_SCRATCH',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_CONFUSED_BRAIN',
    },
    PERFECT_TEN: {
      pose: 'PERFECT_TEN' as any,
      soundId: 'LEVEL_UP_NOTIFICATION',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_PERFECT_TEN',
    },
    DOUBLE_THREE: {
      pose: 'DOUBLE_THREE' as any,
      soundId: 'CONFIDENT_ENTRANCE',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_SIX_PACK_ENERGY',
    },
    ROCK_PAPER_SCISSORS: {
      pose: 'ROCK_PAPER_SCISSORS' as any,
      soundId: 'CARTOON_IMPACT',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_ROCK_PAPER_SCISSORS',
    },
    SECRET_HEART_HANDS: {
      pose: 'SECRET_HEART_HANDS' as any,
      soundId: 'VICTORY_BELL',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_SECRET_HEART_AURA',
    },
    SECRET_MATRIX_DODGE: {
      pose: 'SECRET_MATRIX_DODGE' as any,
      soundId: 'LASER_BEAM',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_SECRET_MATRIX_GLITCH',
    },
    SECRET_YOU_ARE_BREATHTAKING: {
      pose: 'SECRET_YOU_ARE_BREATHTAKING' as any,
      soundId: 'BRASS_FANFARE',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_SECRET_YOU_ARE_BREATHTAKING',
    },
  },
  actionMemeMappings: {
    T_POSE: 'MEME_SURPRISED_PIKACHU',
    HANDS_RAISED: 'MEME_SUCCESS_KID',
    HANDS_ON_HIPS: 'MEME_CHAD_THUMBS_UP',
    ARMS_CROSSED: 'MEME_JUDGMENTAL_STARE',
    SQUAT: 'MEME_SUPERHERO_LANDING',
    SQUAT_STANCE: 'MEME_SUPERHERO_LANDING',
    JUMP: 'MEME_EXPLODING_HEAD',
    FLEX_POSE: 'MEME_THIS_IS_FINE',
    DOUBLE_BICEPS_FLEX: 'MEME_THIS_IS_FINE',
    CLAP: 'MEME_CLAPPING_AWARD',
    DAB: 'MEME_DOGE_WOW',
    DISCO_FEVER: 'MEME_PEACE_OUT',
    ZEN_PRAYER: 'MEME_THIS_IS_FINE',
    THE_THINKER: 'MEME_EXPLODING_HEAD',
    ZOMBIE_WALK: 'MEME_FACEPALM',
    OPEN_PALM: 'MEME_STOP_SIGN',
    CLOSED_FIST: 'MEME_POW_IMPACT',
    THUMBS_UP: 'MEME_MAXIMUM_AURA',
    THUMBS_DOWN: 'MEME_SKILL_ISSUE',
    PEACE_SIGN: 'MEME_MAIN_CHARACTER',
    POINTING: 'MEME_TARGET_LOCKED',
    PINCH: 'MEME_PINCH_GRAB',
    THREE_FINGERS: 'MEME_THREE_FINGER_SALUTE',
    FOUR_FINGERS: 'MEME_FOUR_FINGER_POWER',
    FIVE_FINGERS: 'MEME_UNSTOPPABLE',
    SWIPE_LEFT: 'MEME_SWIPE_LEFT',
    SWIPE_RIGHT: 'MEME_SWIPE_RIGHT',
    DOUBLE_THUMBS_UP: 'MEME_MAXIMUM_AURA',
    BOTH_HANDS_OPEN: 'MEME_STOP_SIGN',
    BOTH_HANDS_FIST: 'MEME_FINAL_BOSS_ENERGY',
    DOUBLE_PEACE: 'MEME_ABSOLUTE_CINEMA',
    THUMBS_UP_AND_DOWN: 'MEME_CONFUSED_BRAIN',
    PERFECT_TEN: 'MEME_PERFECT_TEN',
    DOUBLE_THREE: 'MEME_SIX_PACK_ENERGY',
    ROCK_PAPER_SCISSORS: 'MEME_ROCK_PAPER_SCISSORS',
    SECRET_HEART_HANDS: 'MEME_SECRET_HEART_AURA',
    SECRET_MATRIX_DODGE: 'MEME_SECRET_MATRIX_GLITCH',
    SECRET_YOU_ARE_BREATHTAKING: 'MEME_SECRET_YOU_ARE_BREATHTAKING',
  },
  actionCustomCaptions: {},
  randomMemeMode: false,
  enableRareReactions: true,
  rareReactionProbability: 0.10,
  popupAnimationStyle: 'CLASSIC',
  activePresetId: 'DEFAULT',
  favoriteMemes: [],
  recentMemes: [],
  smartMatchingEnabled: true,
  preventImmediateRepetition: true,
  preferredCategories: [],
  mediaTypeFilter: 'ALL',
  multiMemeAssignments: {},
  popupConcurrencyPolicy: 'ALLOW_SIMULTANEOUS',
  maxSimultaneousPopups: 2,
  recentlyUsedMemeIds: [],
  gestureSensitivity: 'HIGH',
};

export interface MemePresetDefinition {
  id: MemePresetId;
  name: string;
  description: string;
  icon: string;
  animationStyle: PopupAnimationStyle;
  randomMemeMode: boolean;
  randomSoundMode: boolean;
  enableRareReactions: boolean;
  actionMemeMappings: Partial<Record<GoofyActionId, string>>;
}

export const BUILTIN_MEME_PRESETS: MemePresetDefinition[] = [
  {
    id: 'DEFAULT',
    name: 'BALANCED COMEDY',
    description: 'Curated blend of classic memes, sound effects, and comic reactions.',
    icon: '⚡',
    animationStyle: 'CLASSIC',
    randomMemeMode: false,
    randomSoundMode: false,
    enableRareReactions: true,
    actionMemeMappings: {},
  },
  {
    id: 'CHAOS_MODE',
    name: 'CHAOS MODE',
    description: 'High volatility, explosive screen popups, random reactions, and wild sound triggers.',
    icon: '🔥',
    animationStyle: 'CHAOS',
    randomMemeMode: true,
    randomSoundMode: true,
    enableRareReactions: true,
    actionMemeMappings: {
      T_POSE: 'MEME_CHAOS_UNLEASHED',
      JUMP: 'MEME_EXPLODING_HEAD',
      CLAP: 'MEME_PARTY_MODE',
      CLOSED_FIST: 'MEME_FINAL_BOSS_ENERGY',
    },
  },
  {
    id: 'CLEAN_COMEDY',
    name: 'CLEAN COMEDY',
    description: 'Family-friendly cartoon boings, wholesome memes, and playful reactions.',
    icon: '✨',
    animationStyle: 'CLASSIC',
    randomMemeMode: false,
    randomSoundMode: false,
    enableRareReactions: false,
    actionMemeMappings: {
      T_POSE: 'MEME_SURPRISED_PIKACHU',
      HANDS_RAISED: 'MEME_SUCCESS_KID',
      CLAP: 'MEME_CLAPPING_AWARD',
      THUMBS_UP: 'MEME_CHAD_THUMBS_UP',
      PEACE_SIGN: 'MEME_PEACE_OUT',
    },
  },
  {
    id: 'ULTRA_DRAMA',
    name: 'ULTRA DRAMA',
    description: 'Shock, suspense, jaw drops, unexpected plot twists, and dramatic brass fanfares.',
    icon: '🎭',
    animationStyle: 'EXPLOSIVE',
    randomMemeMode: false,
    randomSoundMode: false,
    enableRareReactions: true,
    actionMemeMappings: {
      T_POSE: 'MEME_ABSOLUTE_CINEMA',
      OPEN_PALM: 'MEME_PLOT_TWIST',
      ARMS_CROSSED: 'MEME_JUDGMENTAL_STARE',
      POINTING: 'MEME_CAUGHT_IN_ACT',
      ZEN_PRAYER: 'MEME_THIS_IS_FINE',
    },
  },
  {
    id: 'MAXIMUM_AURA',
    name: 'MAXIMUM AURA',
    description: 'Unstoppable confidence, Chad jawlines, golden crowns, and +100,000 aura moments.',
    icon: '👑',
    animationStyle: 'CLASSIC',
    randomMemeMode: false,
    randomSoundMode: false,
    enableRareReactions: true,
    actionMemeMappings: {
      T_POSE: 'MEME_MAIN_CHARACTER',
      HANDS_RAISED: 'MEME_VICTORY_CROWN',
      HANDS_ON_HIPS: 'MEME_MAXIMUM_AURA',
      FLEX_POSE: 'MEME_ABSOLUTE_CHAD_CHIN',
      THUMBS_UP: 'MEME_PERFECT_EXECUTION',
    },
  },
  {
    id: 'FAILURE_COMPILATION',
    name: 'FAILURE COMPILATION',
    description: 'Skill issues, critical failures, emotional damage, and sad trombone regret.',
    icon: '💀',
    animationStyle: 'RETRO_ARCADE',
    randomMemeMode: false,
    randomSoundMode: false,
    enableRareReactions: false,
    actionMemeMappings: {
      T_POSE: 'MEME_SKILL_ISSUE',
      SQUAT: 'MEME_CRITICAL_FAILURE',
      ZOMBIE_WALK: 'MEME_FACEPALM',
      THUMBS_DOWN: 'MEME_EMOTIONAL_DAMAGE',
      CLOSED_FIST: 'MEME_MISSION_FAILED',
    },
  },
  {
    id: 'UNHINGED_MODE',
    name: 'UNHINGED MODE',
    description: 'Rapid-fire chaotic triggers, retro arcade styling, random sounds, and maximum rare spawns.',
    icon: '🌀',
    animationStyle: 'RETRO_ARCADE',
    randomMemeMode: true,
    randomSoundMode: true,
    enableRareReactions: true,
    actionMemeMappings: {},
  },
];

export const GOOFY_ACTION_RECOMMENDED_MEMES: Record<GoofyActionId, string[]> = {
  T_POSE: ['MEME_ABSOLUTE_CINEMA', 'MEME_MAIN_CHARACTER', 'MEME_SURPRISED_PIKACHU', 'MEME_FINAL_BOSS_ENERGY'],
  HANDS_RAISED: ['MEME_VICTORY_ACHIEVED', 'MEME_VICTORY_CROWN', 'MEME_SUCCESS_KID', 'MEME_CROWD_GOES_WILD'],
  HANDS_ON_HIPS: ['MEME_ABSOLUTE_CHAD_CHIN', 'MEME_MAXIMUM_AURA', 'MEME_CHAD_THUMBS_UP', 'MEME_PERFECT_EXECUTION'],
  ARMS_CROSSED: ['MEME_JUDGMENTAL_STARE', 'MEME_SIDE_EYE', 'MEME_VERY_SUSPICIOUS', 'MEME_QUESTIONABLE_DECISION'],
  SQUAT: ['MEME_SUPERHERO_LANDING', 'MEME_MISSION_FAILED', 'MEME_POW_IMPACT', 'MEME_CRITICAL_FAILURE'],
  SQUAT_STANCE: ['MEME_SUPERHERO_LANDING', 'MEME_SKILL_ISSUE', 'MEME_POW_IMPACT'],
  JUMP: ['MEME_EXPLODING_HEAD', 'MEME_LEVEL_UP', 'MEME_CHAOS_UNLEASHED', 'MEME_PARTY_MODE'],
  FLEX_POSE: ['MEME_MAIN_CHARACTER', 'MEME_MAXIMUM_AURA', 'MEME_ABSOLUTE_CHAD_CHIN', 'MEME_UNSTOPPABLE'],
  DOUBLE_BICEPS_FLEX: ['MEME_MAIN_CHARACTER', 'MEME_MAXIMUM_AURA', 'MEME_ABSOLUTE_CHAD_CHIN'],
  CLAP: ['MEME_CLAPPING_AWARD', 'MEME_CROWD_GOES_WILD', 'MEME_PERFECT_EXECUTION', 'MEME_ABSOLUTE_CINEMA'],
  DAB: ['MEME_DOGE_WOW', 'MEME_SKILL_ISSUE', 'MEME_PARTY_MODE', 'MEME_VICTORY_DANCE'],
  DISCO_FEVER: ['MEME_VICTORY_DANCE', 'MEME_PARTY_MODE', 'MEME_PEACE_OUT', 'MEME_CHAOS_UNLEASHED'],
  ZEN_PRAYER: ['MEME_THIS_IS_FINE', 'MEME_NO_THOUGHTS', 'MEME_BRAIN_LEFT_CHAT', 'MEME_CALCULATING'],
  THE_THINKER: ['MEME_BRO_IS_THINKING', 'MEME_CALCULATING', 'MEME_UNEXPECTED_GENIUS', 'MEME_CONFUSED_BRAIN'],
  ZOMBIE_WALK: ['MEME_FACEPALM', 'MEME_NPC_MODE', 'MEME_NO_THOUGHTS', 'MEME_NOT_PROUDEST_MOMENT'],
  OPEN_PALM: ['MEME_STOP_SIGN', 'MEME_WAIT_WHAT', 'MEME_BRO_WHAT', 'MEME_WHAT_JUST_HAPPENED'],
  CLOSED_FIST: ['MEME_POW_IMPACT', 'MEME_EMOTIONAL_DAMAGE', 'MEME_CRITICAL_FAILURE', 'MEME_FINAL_BOSS_ENERGY'],
  THUMBS_UP: ['MEME_CHAD_THUMBS_UP', 'MEME_ABSOLUTE_CHAD_CHIN', 'MEME_MAXIMUM_AURA', 'MEME_PERFECT_EXECUTION'],
  THUMBS_DOWN: ['MEME_THUMBS_DOWN_FAIL', 'MEME_SKILL_ISSUE', 'MEME_EMOTIONAL_DAMAGE', 'MEME_MISSION_FAILED'],
  PEACE_SIGN: ['MEME_PEACE_OUT', 'MEME_VICTORY_DANCE', 'MEME_PARTY_MODE', 'MEME_LEGENDARY_MOMENT'],
  POINTING: ['MEME_TARGET_LOCKED', 'MEME_CAUGHT_IN_ACT', 'MEME_INNOCENT_MAYBE_NOT', 'MEME_SIDE_EYE'],
  PINCH: ['MEME_PINCH_GRAB', 'MEME_VERY_SUSPICIOUS', 'MEME_QUESTIONABLE_DECISION'],
  THREE_FINGERS: ['MEME_THREE_FINGER_SALUTE', 'MEME_CALCULATING', 'MEME_LEVEL_UP'],
  FOUR_FINGERS: ['MEME_FOUR_FINGER_POWER', 'MEME_ERROR_404_LOGIC', 'MEME_UNSTOPPABLE'],
  FIVE_FINGERS: ['MEME_SUCCESS_KID', 'MEME_CROWD_GOES_WILD', 'MEME_LEVEL_UP', 'MEME_VICTORY_ACHIEVED'],
  SWIPE_LEFT: ['MEME_SWIPE_LEFT', 'MEME_MISSION_FAILED', 'MEME_SKILL_ISSUE'],
  SWIPE_RIGHT: ['MEME_SWIPE_RIGHT', 'MEME_LEVEL_UP', 'MEME_UNSTOPPABLE'],
  DOUBLE_THUMBS_UP: ['MEME_MAXIMUM_AURA', 'MEME_CHAD_THUMBS_UP', 'MEME_ABSOLUTE_CHAD_CHIN'],
  BOTH_HANDS_OPEN: ['MEME_STOP_SIGN', 'MEME_ABSOLUTE_SHOCK', 'MEME_WAIT_WHAT'],
  BOTH_HANDS_FIST: ['MEME_FINAL_BOSS_ENERGY', 'MEME_POW_IMPACT', 'MEME_UNSTOPPABLE'],
  DOUBLE_PEACE: ['MEME_ABSOLUTE_CINEMA', 'MEME_PEACE_OUT', 'MEME_VICTORY_DANCE'],
  THUMBS_UP_AND_DOWN: ['MEME_CONFUSED_BRAIN', 'MEME_WHAT_JUST_HAPPENED', 'MEME_SIDE_EYE'],
  PERFECT_TEN: ['MEME_PERFECT_TEN', 'MEME_LEVEL_UP', 'MEME_UNSTOPPABLE'],
  DOUBLE_THREE: ['MEME_SIX_PACK_ENERGY', 'MEME_MAXIMUM_AURA', 'MEME_LEVEL_UP'],
  ROCK_PAPER_SCISSORS: ['MEME_ROCK_PAPER_SCISSORS', 'MEME_POW_IMPACT', 'MEME_FINAL_BOSS_ENERGY'],
  SECRET_HEART_HANDS: ['MEME_SECRET_HEART_AURA', 'MEME_VICTORY_ACHIEVED', 'MEME_MAIN_CHARACTER'],
  SECRET_MATRIX_DODGE: ['MEME_SECRET_MATRIX_GLITCH', 'MEME_TARGET_LOCKED', 'MEME_FINAL_BOSS_ENERGY'],
  SECRET_YOU_ARE_BREATHTAKING: ['MEME_SECRET_YOU_ARE_BREATHTAKING', 'MEME_MAXIMUM_AURA', 'MEME_CHAD_THUMBS_UP'],
};
