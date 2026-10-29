import { PoseLandmark } from './types';

export type GoofyPoseType =
  | 'T_POSE'
  | 'HANDS_RAISED'
  | 'DOUBLE_BICEPS_FLEX'
  | 'SQUAT_STANCE'
  | 'HANDS_ON_HIPS'
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
  jointMetrics: {
    armElevationLeft?: number;
    armElevationRight?: number;
    elbowAngleLeft?: number;
    elbowAngleRight?: number;
    kneeAngleLeft?: number;
    kneeAngleRight?: number;
    torsoInclination?: number;
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
  minHoldMs: number; // Minimum ms pose must be held before triggering
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
}

export const GOOFY_POSE_METADATA: Record<
  GoofyPoseType,
  { label: string; defaultCaption: string; icon: string; description: string }
> = {
  T_POSE: {
    label: 'T-POSE',
    defaultCaption: 'DOMINANCE ASSERTED // DEFAULT VECTOR LOADED',
    icon: '🧍',
    description: 'Both arms extended horizontally at shoulder height.',
  },
  HANDS_RAISED: {
    label: 'HANDS RAISED',
    defaultCaption: 'PRAISE THE SUN // TOUCHDOWN VICTORY!',
    icon: '🙌',
    description: 'Both arms reaching straight up into the air above the head.',
  },
  DOUBLE_BICEPS_FLEX: {
    label: 'DOUBLE BICEPS FLEX',
    defaultCaption: 'MASSIVE GAINS DETECTED // MAXIMUM BULK',
    icon: '💪',
    description: 'Classic bodybuilder pose: shoulders up, elbows bent 90°.',
  },
  SQUAT_STANCE: {
    label: 'DEEP SQUAT',
    defaultCaption: 'THICC GRAVITY DROP // SUMO OVERLOAD',
    icon: '🏋️',
    description: 'Deep squat with knees bent past 120° and hips lowered.',
  },
  HANDS_ON_HIPS: {
    label: 'HANDS ON HIPS',
    defaultCaption: 'HEROIC ENTRANCE // SASS LEVEL MAXIMUM',
    icon: '🦸',
    description: 'Both hands planted on hips with elbows flared out.',
  },
  DAB: {
    label: 'THE RETRO DAB',
    defaultCaption: 'MLG 360 NO SCOPE // PEAK 2016 ENERGY',
    icon: '🕺',
    description: 'One arm extended diagonally up, face tucked into opposite bent elbow.',
  },
  DISCO_FEVER: {
    label: 'DISCO FEVER',
    defaultCaption: 'STAYIN ALIVE // SATURDAY NIGHT FEVER',
    icon: '🪩',
    description: 'One arm pointing high into the sky, the other down at hip.',
  },
  ZEN_PRAYER: {
    label: 'ZEN PRAYER',
    defaultCaption: 'INNER PEACE ACHIEVED // NAMASTE NIRVANA',
    icon: '🙏',
    description: 'Hands pressed together at mid-chest sternum in prayer.',
  },
  THE_THINKER: {
    label: 'THE THINKER',
    defaultCaption: 'BIG BRAIN TIME // CALCULATING REALITY...',
    icon: '🤔',
    description: 'One hand resting under chin with body in contemplative stance.',
  },
  ZOMBIE_WALK: {
    label: 'ZOMBIE WALK',
    defaultCaption: 'BRAAAINS // THRILLER NIGHT MODE',
    icon: '🧟',
    description: 'Both arms extended straight forward at chest height.',
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
    description: 'Deep, rumbling low-frequency brass horn stinger.',
    durationSec: 1.8,
  },
  {
    id: 'ANIME_POWER_UP',
    name: 'Anime Super Saiyan Chime',
    category: 'MEME',
    description: 'High-energy ascending arpeggiated chime with aura shimmer.',
    durationSec: 1.4,
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
      soundId: 'AIR_HORN',
      enabled: true,
      visualEnabled: true,
    },
    DOUBLE_BICEPS_FLEX: {
      pose: 'DOUBLE_BICEPS_FLEX',
      soundId: 'ANIME_POWER_UP',
      enabled: true,
      visualEnabled: true,
    },
    SQUAT_STANCE: {
      pose: 'SQUAT_STANCE',
      soundId: 'CARTOON_BOING',
      enabled: true,
      visualEnabled: true,
    },
    HANDS_ON_HIPS: {
      pose: 'HANDS_ON_HIPS',
      soundId: 'BRASS_FANFARE',
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
