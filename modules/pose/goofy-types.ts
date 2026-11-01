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

export type GoofyActionId = GoofyPoseType | GoofyHandGestureType;

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

export interface HandClassificationResult {
  gesture: GoofyHandGestureType | null;
  handedness: 'Left' | 'Right';
  confidence: number;
  label: string;
  comicCaption: string;
  isDynamic?: boolean;
}

export interface SoundDefinition {
  id: GoofySoundId;
  name: string;
  category: 'MEME' | 'CARTOON' | 'DRAMATIC' | 'MUSICAL' | 'CUSTOM';
  description: string;
  durationSec: number;
}

export interface MemeVisualDefinition {
  id: string;
  title: string;
  category: 'REACTION' | 'CELEBRATION' | 'CLASSIC' | 'CARTOON' | 'ANIME' | 'CUSTOM';
  description: string;
  dataUrl: string; // SVG data URL or image/GIF data/blob URL
  aspectRatio?: number;
  tags?: string[];
  isCustom?: boolean;
  fileName?: string;
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
  actionSource: 'BODY' | 'HAND';
  hand?: 'Left' | 'Right' | 'Both';
  memeId: string;
  memeTitle: string;
  memeUrl: string;
  caption: string;
  soundId: GoofySoundId;
  soundName: string;
  timestamp: number;
  durationMs: number;
  rotationDeg: number;
  isManualPreview?: boolean;
}

export interface UnifiedMemeEvent {
  id: string;
  timestamp: number;
  source: 'BODY' | 'HAND';
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
  simultaneousPolicy: 'ALLOW_BOTH' | 'HAND_PRIORITY' | 'BODY_PRIORITY' | 'REPLACE_OLDEST';
  handMappings: Record<GoofyHandGestureType, PoseSoundMapping>;
  actionMemeMappings: Record<string, string>; // action/gesture ID -> memeId
  actionCustomCaptions: Record<string, string>; // action/gesture ID -> custom caption
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
    defaultCaption: 'HALT! // MAXIMUM STOP ENERGY',
    icon: '✋',
    description: 'All 5 fingers extended flat toward camera.',
    cues: ['All 5 fingers extended', 'Flat palm orientation'],
  },
  CLOSED_FIST: {
    id: 'CLOSED_FIST',
    label: 'CLOSED FIST',
    defaultCaption: 'POWER LEVEL RISING // BROFIST LOADED',
    icon: '✊',
    description: 'All fingers curled tight into a solid fist.',
    cues: ['All 4 fingers curled', 'Thumb tucked over fingers'],
  },
  THUMBS_UP: {
    id: 'THUMBS_UP',
    label: 'THUMBS UP',
    defaultCaption: 'ABSOLUTE CHAD APPROVED // CERTIFIED BASED',
    icon: '👍',
    description: 'Fingers curled with thumb pointing straight up.',
    cues: ['Thumb extended vertical upward', '4 fingers fully curled'],
  },
  THUMBS_DOWN: {
    id: 'THUMBS_DOWN',
    label: 'THUMBS DOWN',
    defaultCaption: 'MAJOR DISAPPROVAL // CRINGE DETECTED',
    icon: '👎',
    description: 'Fingers curled with thumb pointing straight down.',
    cues: ['Thumb extended downward', '4 fingers fully curled'],
  },
  PEACE_SIGN: {
    id: 'PEACE_SIGN',
    label: 'PEACE SIGN',
    defaultCaption: 'PEACE OUT // ZERO DRAMA ZONE',
    icon: '✌️',
    description: 'Index and middle fingers extended in a V-shape.',
    cues: ['Index & middle extended', 'Ring & pinky curled', 'Fingertips separated'],
  },
  POINTING: {
    id: 'POINTING',
    label: 'POINTING',
    defaultCaption: 'TARGET ACQUIRED // YOU HAVE BEEN CHOSEN',
    icon: '👉',
    description: 'Index finger extended forward, others curled.',
    cues: ['Index finger extended', 'Middle, ring, pinky curled'],
  },
  PINCH: {
    id: 'PINCH',
    label: 'PINCH',
    defaultCaption: 'TINY OBJECT SECURED // ULTRA PRECISION',
    icon: '🤏',
    description: 'Thumb tip and index tip touching or near contact.',
    cues: ['Thumb & index tip distance < 0.35 palm scale'],
  },
  THREE_FINGERS: {
    id: 'THREE_FINGERS',
    label: 'THREE FINGERS',
    defaultCaption: 'TRIPLE THREAT // SACRED TRINITY',
    icon: '🤟',
    description: 'Index, middle, and ring fingers extended.',
    cues: ['Index, middle, ring extended', 'Pinky curled'],
  },
  FOUR_FINGERS: {
    id: 'FOUR_FINGERS',
    label: 'FOUR FINGERS',
    defaultCaption: 'QUAD CORE OVERCLOCK // 400% CAPACITY',
    icon: '🖖',
    description: 'Index, middle, ring, and pinky extended, thumb tucked.',
    cues: ['4 fingers extended', 'Thumb tucked across palm'],
  },
  FIVE_FINGERS: {
    id: 'FIVE_FINGERS',
    label: 'FIVE FINGERS',
    defaultCaption: 'FULL SPREAD CELEBRATION // HIGH FIVE!',
    icon: '🖐️',
    description: 'All 5 fingers spread wide.',
    cues: ['All 5 fingers extended and spread outward'],
  },
  SWIPE_LEFT: {
    id: 'SWIPE_LEFT',
    label: 'SWIPE LEFT',
    defaultCaption: 'SWIPE LEFT // ABSOLUTELY NOT',
    icon: '👈',
    description: 'Fast horizontal hand motion from right to left.',
    isDynamic: true,
    cues: ['Rapid leftward velocity > 1.2 screens/sec'],
  },
  SWIPE_RIGHT: {
    id: 'SWIPE_RIGHT',
    label: 'SWIPE RIGHT',
    defaultCaption: 'SWIPE RIGHT // IT’S AN INSTANT MATCH!',
    icon: '👉',
    description: 'Fast horizontal hand motion from left to right.',
    isDynamic: true,
    cues: ['Rapid rightward velocity > 1.2 screens/sec'],
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
      soundId: 'ANIME_POWER_UP',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_POW_IMPACT',
    },
    THUMBS_UP: {
      pose: 'THUMBS_UP',
      soundId: 'CHAD_GONG',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_CHAD_THUMBS_UP',
    },
    THUMBS_DOWN: {
      pose: 'THUMBS_DOWN',
      soundId: 'SAD_TROMBONE',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_THUMBS_DOWN_FAIL',
    },
    PEACE_SIGN: {
      pose: 'PEACE_SIGN',
      soundId: 'VICTORY_BELL',
      enabled: true,
      visualEnabled: true,
      memeId: 'MEME_PEACE_OUT',
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
      memeId: 'MEME_SUCCESS_KID',
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
    THUMBS_UP: 'MEME_CHAD_THUMBS_UP',
    THUMBS_DOWN: 'MEME_THUMBS_DOWN_FAIL',
    PEACE_SIGN: 'MEME_PEACE_OUT',
    POINTING: 'MEME_TARGET_LOCKED',
    PINCH: 'MEME_PINCH_GRAB',
    THREE_FINGERS: 'MEME_THREE_FINGER_SALUTE',
    FOUR_FINGERS: 'MEME_FOUR_FINGER_POWER',
    FIVE_FINGERS: 'MEME_SUCCESS_KID',
    SWIPE_LEFT: 'MEME_SWIPE_LEFT',
    SWIPE_RIGHT: 'MEME_SWIPE_RIGHT',
  },
  actionCustomCaptions: {},
};
