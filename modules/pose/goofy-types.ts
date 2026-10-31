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
  | 'CUSTOM_USER_AUDIO';

export type PoseTrackingStatus =
  | 'NO_POSE'
  | 'CANDIDATE'
  | 'STABLE_RECOGNIZED'
  | 'POSE_TRIGGERED'
  | 'POSE_RELEASED'
  | 'TRACKING_LOST';

export interface PoseClassificationResult {
  pose: GoofyPoseType | null;
  confidence: number;
  label: string;
  comicCaption: string;
  isDynamicAction?: boolean;
  actionCategory?: 'STATIC_POSE' | 'DYNAMIC_ACTION';
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

export interface SoundDefinition {
  id: GoofySoundId;
  name: string;
  category: 'MEME' | 'CARTOON' | 'DRAMATIC' | 'MUSICAL' | 'CUSTOM';
  description: string;
  durationSec: number;
}

export interface PoseSoundMapping {
  pose: GoofyPoseType;
  soundId: GoofySoundId;
  enabled: boolean;
  visualEnabled: boolean;
  customAudioUrl?: string; // Data URL for uploaded user audio
  customAudioName?: string;
  customCaption?: string;
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
}

export interface GoofyActionMetadata {
  label: string;
  defaultCaption: string;
  icon: string;
  description: string;
  actionType: 'STATIC_POSE' | 'DYNAMIC_ACTION';
  kinematicCues: string[];
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
];

export const DEFAULT_GOOFY_CONFIG: GoofyModeConfig = {
  volume: 0.8,
  isMuted: false,
  cooldownMs: 750,
  minHoldMs: 250,
  enableVisualFx: true,
  enableScreenShake: true,
  randomSoundMode: false,
  mappings: {
    T_POSE: {
      pose: 'T_POSE',
      soundId: 'INCEPTION_BRAAAM',
      enabled: true,
      visualEnabled: true,
    },
    HANDS_RAISED: {
      pose: 'HANDS_RAISED',
      soundId: 'CROWD_CHEER',
      enabled: true,
      visualEnabled: true,
    },
    HANDS_ON_HIPS: {
      pose: 'HANDS_ON_HIPS',
      soundId: 'CONFIDENT_ENTRANCE',
      enabled: true,
      visualEnabled: true,
    },
    ARMS_CROSSED: {
      pose: 'ARMS_CROSSED',
      soundId: 'DRAMATIC_SUSPENSE',
      enabled: true,
      visualEnabled: true,
    },
    SQUAT: {
      pose: 'SQUAT',
      soundId: 'CARTOON_IMPACT',
      enabled: true,
      visualEnabled: true,
    },
    SQUAT_STANCE: {
      pose: 'SQUAT_STANCE',
      soundId: 'CARTOON_BOING',
      enabled: true,
      visualEnabled: true,
    },
    JUMP: {
      pose: 'JUMP',
      soundId: 'CARTOON_JUMP',
      enabled: true,
      visualEnabled: true,
    },
    FLEX_POSE: {
      pose: 'FLEX_POSE',
      soundId: 'ANIME_POWER_UP',
      enabled: true,
      visualEnabled: true,
    },
    DOUBLE_BICEPS_FLEX: {
      pose: 'DOUBLE_BICEPS_FLEX',
      soundId: 'ANIME_POWER_UP',
      enabled: true,
      visualEnabled: true,
    },
    CLAP: {
      pose: 'CLAP',
      soundId: 'CARTOON_CLAP',
      enabled: true,
      visualEnabled: true,
    },
    DAB: {
      pose: 'DAB',
      soundId: 'RECORD_SCRATCH',
      enabled: true,
      visualEnabled: true,
    },
    DISCO_FEVER: {
      pose: 'DISCO_FEVER',
      soundId: 'DISCO_SLAP',
      enabled: true,
      visualEnabled: true,
    },
    ZEN_PRAYER: {
      pose: 'ZEN_PRAYER',
      soundId: 'SINGING_BOWL',
      enabled: true,
      visualEnabled: true,
    },
    THE_THINKER: {
      pose: 'THE_THINKER',
      soundId: 'CARTOON_SQUEAK',
      enabled: true,
      visualEnabled: true,
    },
    ZOMBIE_WALK: {
      pose: 'ZOMBIE_WALK',
      soundId: 'SAD_TROMBONE',
      enabled: true,
      visualEnabled: true,
    },
  },
};
