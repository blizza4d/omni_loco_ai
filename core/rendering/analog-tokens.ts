/**
 * Shared Analog AI Visual Design System Tokens
 * Physical drafting desk aesthetic: Soft Charcoal, Sage Green, Brick Red.
 */

export const ANALOG_TOKENS = {
  colors: {
    softCharcoal: '#333333',
    softCharcoalDark: '#262626',
    sageGreen: '#8EA48C',
    sageGreenTranslucent: 'rgba(142, 164, 140, 0.4)',
    brickRed: '#B83B2F',
    brickRedTranslucent: 'rgba(184, 59, 47, 0.25)',
    paperCream: '#F4EEDC',
    paperCreamDark: '#EAE2CB',
    inkMuted: '#6B6B6B',
  },
  typography: {
    fontFamily: '"Courier Prime", Courier, monospace',
    microLabelSize: '9px',
    captionSize: '11px',
    bodySize: '13px',
    tracking: '0.12em',
  },
  geometry: {
    standardJointRadius: 3.5,
    activePointRadius: 6.0,
    standardLineWidth: 2.0,
    connectorLineWidth: 1.75,
    crosshairLength: 8,
  },
} as const;
