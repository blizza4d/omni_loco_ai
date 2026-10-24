import { Landmark3D } from '../hand/types';

export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

export type Handedness = 'Left' | 'Right';

export interface FingerDetail {
  name: FingerName;
  label: string;
  isOpen: boolean;
  confidence: number;
  extensionRatio: number;
  angleDeg: number;
}

export interface SingleHandFingerResult {
  handedness: Handedness;
  rawCount: number;
  stableCount: number;
  fingers: Record<FingerName, FingerDetail>;
  gestureName: string;
  confidence: number;
  trackingStatus: 'TRACKING_ACTIVE' | 'ADJUST_HAND_POSITION' | 'HAND_NOT_DETECTED';
  landmarks: Landmark3D[];
}

export interface DualHandFingerResult {
  leftHand: SingleHandFingerResult | null;
  rightHand: SingleHandFingerResult | null;
  totalRawCount: number;
  totalStableCount: number;
  activeGestures: string[];
  combinedTextOutput: string;
  timestamp: number;
}

export interface FingerActionMapping {
  count: number;
  label: string;
  actionId: string;
  description: string;
}

export const DEFAULT_ACTION_MAPPINGS: FingerActionMapping[] = [
  {
    count: 0,
    label: 'STOP / PAUSE',
    actionId: 'action_stop',
    description: 'Trigger full system halt or pause operation',
  },
  {
    count: 1,
    label: 'ACTION 1 (SELECT)',
    actionId: 'action_select',
    description: 'Activate primary target or cursor selection',
  },
  {
    count: 2,
    label: 'ACTION 2 (NAVIGATE NEXT)',
    actionId: 'action_next',
    description: 'Advance to next item or step in sequence',
  },
  {
    count: 3,
    label: 'ACTION 3 (CONFIRM / EXECUTE)',
    actionId: 'action_confirm',
    description: 'Acknowledge prompt or confirm current parameter',
  },
  {
    count: 4,
    label: 'ACTION 4 (SECONDARY TOGGLE)',
    actionId: 'action_toggle',
    description: 'Switch visual overlay layer or secondary mode',
  },
  {
    count: 5,
    label: 'ACTION 5 (OPEN PALM / RESET)',
    actionId: 'action_reset',
    description: 'Clear state or reset calibration to neutral',
  },
];

export interface CountHistoryItem {
  id: string;
  count: number;
  handedness: string;
  gesture: string;
  timestamp: string;
  triggeredAction?: string;
}
