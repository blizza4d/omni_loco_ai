import { MemeVisualDefinition } from './goofy-types';

/**
 * Encodes SVG string into a clean, safe Data URL
 */
function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. BUILT-IN ORIGINAL VECTOR MEME GRAPHICS (21 Presets)
// Fully self-contained, lightweight vector art with bold comic aesthetics
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_MEME_LIBRARY: MemeVisualDefinition[] = [
  {
    id: 'MEME_SURPRISED_PIKACHU',
    title: 'Surprised Shock Face',
    category: 'REACTION',
    description: 'Electric yellow surprised reaction with wide mouth and shocked eyes.',
    aspectRatio: 4 / 3,
    tags: ['shocked', 'surprised', 't-pose', 'unexpected'],
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
        <defs>
          <radialGradient id="pika-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#FFE600"/>
            <stop offset="100%" stop-color="#E5B800"/>
          </radialGradient>
        </defs>
        <rect width="320" height="240" fill="url(#pika-bg)"/>
        <!-- Halftone dot background overlay -->
        <g opacity="0.12" fill="#000">
          <circle cx="20" cy="20" r="4"/><circle cx="60" cy="20" r="4"/><circle cx="100" cy="20" r="4"/><circle cx="140" cy="20" r="4"/><circle cx="180" cy="20" r="4"/><circle cx="220" cy="20" r="4"/><circle cx="260" cy="20" r="4"/><circle cx="300" cy="20" r="4"/>
          <circle cx="40" cy="40" r="4"/><circle cx="80" cy="40" r="4"/><circle cx="120" cy="40" r="4"/><circle cx="160" cy="40" r="4"/><circle cx="200" cy="40" r="4"/><circle cx="240" cy="40" r="4"/><circle cx="280" cy="40" r="4"/>
          <circle cx="20" cy="60" r="4"/><circle cx="60" cy="60" r="4"/><circle cx="100" cy="60" r="4"/><circle cx="140" cy="60" r="4"/><circle cx="180" cy="60" r="4"/><circle cx="220" cy="60" r="4"/><circle cx="260" cy="60" r="4"/><circle cx="300" cy="60" r="4"/>
        </g>
        <!-- Character Ears -->
        <polygon points="50,75 10,15 80,45" fill="#FFE600" stroke="#111827" stroke-width="6"/>
        <polygon points="10,15 35,30 25,48" fill="#111827"/>
        <polygon points="270,75 310,15 240,45" fill="#FFE600" stroke="#111827" stroke-width="6"/>
        <polygon points="310,15 285,30 295,48" fill="#111827"/>
        <!-- Head -->
        <ellipse cx="160" cy="120" rx="95" ry="75" fill="#FFE600" stroke="#111827" stroke-width="6"/>
        <!-- Red Cheeks -->
        <circle cx="95" cy="140" r="22" fill="#EF4444" stroke="#111827" stroke-width="4"/>
        <circle cx="225" cy="140" r="22" fill="#EF4444" stroke="#111827" stroke-width="4"/>
        <!-- Wide Eyes -->
        <ellipse cx="120" cy="105" rx="16" ry="22" fill="#111827"/>
        <circle cx="125" cy="98" r="6" fill="#FFF"/>
        <ellipse cx="200" cy="105" rx="16" ry="22" fill="#111827"/>
        <circle cx="205" cy="98" r="6" fill="#FFF"/>
        <!-- Gaping Open Mouth -->
        <ellipse cx="160" cy="150" rx="28" ry="32" fill="#881337" stroke="#111827" stroke-width="5"/>
        <ellipse cx="160" cy="162" rx="18" ry="14" fill="#F43F5E"/>
        <!-- Shock Exclamation Marks -->
        <text x="32" y="80" font-family="monospace" font-weight="900" font-size="44" fill="#111827" stroke="#FFF" stroke-width="3">?!</text>
        <text x="260" y="80" font-family="monospace" font-weight="900" font-size="44" fill="#111827" stroke="#FFF" stroke-width="3">!?</text>
        <!-- Bottom Comic Caption Bar -->
        <rect x="15" y="195" width="290" height="34" rx="6" fill="#111827" stroke="#FFE600" stroke-width="3"/>
        <text x="160" y="218" text-anchor="middle" font-family="monospace" font-weight="900" font-size="14" fill="#FFE600" letter-spacing="2">WHAT JUST HAPPENED?!</text>
      </svg>
    `),
  },
  {
    id: 'MEME_CHAD_THUMBS_UP',
    title: 'Absolute Chad Thumbs Up',
    category: 'CELEBRATION',
    description: 'Sharp jawline silhouette with sunglasses and glowing thumbs up approval.',
    aspectRatio: 4 / 3,
    tags: ['chad', 'thumbs_up', 'based', 'approved', 'hands_on_hips'],
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
        <defs>
          <linearGradient id="chad-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0F172A"/>
            <stop offset="50%" stop-color="#1E293B"/>
            <stop offset="100%" stop-color="#0284C7"/>
          </linearGradient>
        </defs>
        <rect width="320" height="240" fill="url(#chad-bg)"/>
        <!-- Victory Sunburst Lines -->
        <g stroke="#38BDF8" stroke-width="1.5" opacity="0.3">
          <line x1="160" y1="110" x2="20" y2="20"/><line x1="160" y1="110" x2="160" y2="10"/><line x1="160" y1="110" x2="300" y2="20"/>
          <line x1="160" y1="110" x2="310" y2="110"/><line x1="160" y1="110" x2="10" y2="110"/>
        </g>
        <!-- Chad Sharp Chiseled Face Silhouette -->
        <polygon points="120,40 190,40 205,75 220,110 185,155 160,175 135,155 100,110 115,75" fill="#38BDF8" stroke="#F8FAFC" stroke-width="4"/>
        <!-- Cool Sunglasses -->
        <polygon points="115,80 152,80 148,102 120,102" fill="#0F172A" stroke="#F8FAFC" stroke-width="2"/>
        <polygon points="158,80 195,80 190,102 162,102" fill="#0F172A" stroke="#F8FAFC" stroke-width="2"/>
        <line x1="148" y1="85" x2="158" y2="85" stroke="#F8FAFC" stroke-width="3"/>
        <!-- Chiseled Smile / Jaw -->
        <path d="M 140 135 Q 160 148 180 135" stroke="#0F172A" stroke-width="5" fill="none" stroke-linecap="round"/>
        <!-- Glowing Golden Thumbs Up in Foreground -->
        <g transform="translate(190, 80)">
          <circle cx="45" cy="45" r="40" fill="#EAB308" opacity="0.25"/>
          <path d="M 30,70 L 45,70 L 45,45 C 45,35 55,20 62,20 C 68,20 72,28 70,38 L 65,50 L 82,50 C 88,50 92,55 90,62 L 85,82 C 83,88 77,92 70,92 L 30,92 Z" fill="#FACC15" stroke="#111827" stroke-width="5" stroke-linejoin="round"/>
        </g>
        <!-- Bottom Banner -->
        <rect x="15" y="195" width="290" height="34" rx="6" fill="#0369A1" stroke="#38BDF8" stroke-width="2"/>
        <text x="160" y="218" text-anchor="middle" font-family="monospace" font-weight="900" font-size="14" fill="#F8FAFC" letter-spacing="2">ABSOLUTE CHAD // APPROVED</text>
      </svg>
    `),
  },
  {
    id: 'MEME_SUCCESS_KID',
    title: 'Success Kid Victory',
    category: 'CELEBRATION',
    description: 'Determined champion clenching fist on the beach.',
    aspectRatio: 4 / 3,
    tags: ['success', 'fist', 'hands_raised', 'victory', 'nailed_it'],
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
        <defs>
          <radialGradient id="succ-bg" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stop-color="#38BDF8"/>
            <stop offset="70%" stop-color="#0284C7"/>
            <stop offset="100%" stop-color="#0C4A6E"/>
          </radialGradient>
        </defs>
        <rect width="320" height="240" fill="url(#succ-bg)"/>
        <!-- Starburst Rays -->
        <g opacity="0.2" fill="#FFF">
          <polygon points="160,110 60,0 100,0"/><polygon points="160,110 220,0 260,0"/>
          <polygon points="160,110 320,80 320,120"/><polygon points="160,110 0,80 0,120"/>
        </g>
        <!-- Determined Face -->
        <circle cx="140" cy="100" r="50" fill="#FED7AA" stroke="#111827" stroke-width="5"/>
        <!-- Baby Hair Swoop -->
        <path d="M 105 75 Q 140 45 170 65 Q 150 72 135 72 Z" fill="#92400E" stroke="#111827" stroke-width="3"/>
        <!-- Fierce Determined Eyebrows -->
        <line x1="115" y1="88" x2="135" y2="94" stroke="#111827" stroke-width="4" stroke-linecap="round"/>
        <line x1="165" y1="88" x2="145" y2="94" stroke="#111827" stroke-width="4" stroke-linecap="round"/>
        <!-- Squinting Determined Eyes -->
        <ellipse cx="125" cy="98" rx="8" ry="5" fill="#111827"/>
        <ellipse cx="155" cy="98" rx="8" ry="5" fill="#111827"/>
        <!-- Clenched Mouth Lips -->
        <path d="M 125 125 Q 140 120 155 125" stroke="#111827" stroke-width="5" stroke-linecap="round"/>
        <!-- Shirt -->
        <path d="M 90 148 L 90 200 L 190 200 L 190 148 Z" fill="#10B981" stroke="#111827" stroke-width="5"/>
        <path d="M 115 148 L 115 200 L 165 200 L 165 148 Z" fill="#FFF"/>
        <!-- Clenched Victory Fist in Foreground -->
        <g transform="translate(160, 95)">
          <circle cx="45" cy="45" r="32" fill="#FED7AA" stroke="#111827" stroke-width="5"/>
          <path d="M 25 35 Q 35 25 50 32 Q 60 40 45 52" fill="none" stroke="#111827" stroke-width="4"/>
          <circle cx="35" cy="52" r="5" fill="#FB923C"/>
        </g>
        <!-- Bottom Banner -->
        <rect x="15" y="195" width="290" height="34" rx="6" fill="#111827" stroke="#10B981" stroke-width="3"/>
        <text x="160" y="218" text-anchor="middle" font-family="monospace" font-weight="900" font-size="14" fill="#10B981" letter-spacing="2">NAILED IT! // PURE WIN</text>
      </svg>
    `),
  },
  {
    id: 'MEME_POW_IMPACT',
    title: 'Comic POW Explosion',
    category: 'CARTOON',
    description: 'Vintage comic action burst bubble with explosive energy.',
    aspectRatio: 4 / 3,
    tags: ['punch', 'pow', 'impact', 'fist', 'power_up'],
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
        <defs>
          <radialGradient id="pow-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#DC2626"/>
            <stop offset="100%" stop-color="#7F1D1D"/>
          </radialGradient>
        </defs>
        <rect width="320" height="240" fill="url(#pow-bg)"/>
        <!-- Comic Speed Lines -->
        <g stroke="#EF4444" stroke-width="3" opacity="0.6">
          <line x1="160" y1="110" x2="10" y2="30"/><line x1="160" y1="110" x2="310" y2="30"/>
          <line x1="160" y1="110" x2="20" y2="210"/><line x1="160" y1="110" x2="300" y2="210"/>
        </g>
        <!-- Jagged Yellow Explosion Burst -->
        <polygon points="160,20 185,65 240,40 225,90 285,95 245,135 295,170 235,175 240,225 185,190 160,230 135,190 80,225 85,175 25,170 75,135 35,95 95,90 80,40 135,65" fill="#FACC15" stroke="#111827" stroke-width="7" stroke-linejoin="miter"/>
        <!-- Inner Orange Burst -->
        <polygon points="160,35 180,75 220,55 210,95 255,100 225,130 260,160 215,160 218,200 178,175 160,205 142,175 102,200 105,160 60,160 95,130 65,100 110,95 100,55 140,75" fill="#FB923C"/>
        <!-- Dramatic 3D POW Text -->
        <text x="163" y="133" text-anchor="middle" font-family="impact, sans-serif" font-weight="900" font-size="64" fill="#111827">POW!</text>
        <text x="160" y="130" text-anchor="middle" font-family="impact, sans-serif" font-weight="900" font-size="64" fill="#FFF">POW!</text>
        <!-- Caption -->
        <rect x="25" y="195" width="270" height="32" rx="6" fill="#111827" stroke="#FACC15" stroke-width="2"/>
        <text x="160" y="216" text-anchor="middle" font-family="monospace" font-weight="900" font-size="13" fill="#FACC15" letter-spacing="2">MAXIMUM KINETIC OVERLOAD</text>
      </svg>
    `),
  },
  {
    id: 'MEME_EXPLODING_HEAD',
    title: 'Galaxy Brain Exploding Head',
    category: 'REACTION',
    description: 'Silhouette whose head blossoms into cosmic nebula and mind blown sparkles.',
    aspectRatio: 4 / 3,
    tags: ['mind_blown', 'jump', 'thinker', 'cosmic', 'galaxy_brain'],
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
        <defs>
          <radialGradient id="space-bg" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stop-color="#4C1D95"/>
            <stop offset="60%" stop-color="#1E1B4B"/>
            <stop offset="100%" stop-color="#020617"/>
          </radialGradient>
          <linearGradient id="nebula" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#F43F5E"/>
            <stop offset="50%" stop-color="#A855F7"/>
            <stop offset="100%" stop-color="#06B6D4"/>
          </linearGradient>
        </defs>
        <rect width="320" height="240" fill="url(#space-bg)"/>
        <!-- Starfield -->
        <g fill="#FFF" opacity="0.6">
          <circle cx="30" cy="30" r="1.5"/><circle cx="80" cy="60" r="1"/><circle cx="280" cy="40" r="2"/><circle cx="240" cy="90" r="1.5"/><circle cx="45" cy="160" r="2"/><circle cx="290" cy="180" r="1.5"/>
        </g>
        <!-- Brain Explosion Cosmic Cloud -->
        <ellipse cx="160" cy="75" rx="80" ry="50" fill="url(#nebula)" opacity="0.85"/>
        <circle cx="110" cy="65" r="40" fill="#EC4899" opacity="0.6"/>
        <circle cx="210" cy="65" r="40" fill="#06B6D4" opacity="0.6"/>
        <circle cx="160" cy="45" r="35" fill="#FACC15" opacity="0.5"/>
        <!-- Lightning Sparks -->
        <polygon points="160,10 166,45 152,50 170,85 145,55 158,50" fill="#FFF"/>
        <polygon points="100,30 110,60 95,65 115,90 98,70 106,66" fill="#FACC15"/>
        <polygon points="220,30 210,60 225,65 205,90 222,70 214,66" fill="#FACC15"/>
        <!-- Silhouette Head (Bottom Half) -->
        <path d="M 120 120 Q 120 160 160 170 Q 200 160 200 120 Z" fill="#020617" stroke="#A855F7" stroke-width="4"/>
        <path d="M 100 190 Q 160 170 220 190 L 230 240 L 90 240 Z" fill="#020617"/>
        <!-- Wide Astonished Eyes -->
        <circle cx="140" cy="135" r="10" fill="#FFF"/>
        <circle cx="140" cy="135" r="4" fill="#020617"/>
        <circle cx="180" cy="135" r="10" fill="#FFF"/>
        <circle cx="180" cy="135" r="4" fill="#020617"/>
        <!-- Bottom Banner -->
        <rect x="25" y="195" width="270" height="32" rx="6" fill="#111827" stroke="#A855F7" stroke-width="2"/>
        <text x="160" y="216" text-anchor="middle" font-family="monospace" font-weight="900" font-size="13" fill="#A855F7" letter-spacing="2">MIND = OFFICIALLY BLOWN</text>
      </svg>
    `),
  },
  {
    id: 'MEME_STOP_SIGN',
    title: 'Neon Halt Stop Sign',
    category: 'CLASSIC',
    description: 'High-visibility octagonal STOP sign with open palm warning.',
    aspectRatio: 4 / 3,
    tags: ['stop', 'open_palm', 'halt', 'warning', 'wait'],
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
        <rect width="320" height="240" fill="#0F172A"/>
        <!-- Caution Hazard Stripes Top & Bottom -->
        <g fill="#FACC15">
          <polygon points="0,0 20,0 0,20"/><polygon points="30,0 60,0 40,20 10,20"/><polygon points="70,0 100,0 80,20 50,20"/><polygon points="110,0 140,0 120,20 90,20"/><polygon points="150,0 180,0 160,20 130,20"/><polygon points="190,0 220,0 200,20 170,20"/><polygon points="230,0 260,0 240,20 210,20"/><polygon points="270,0 300,0 280,20 250,20"/><polygon points="310,0 320,0 320,10 300,20"/>
        </g>
        <!-- Octagonal Red Stop Sign -->
        <polygon points="115,30 205,30 265,90 265,150 205,210 115,210 55,150 55,90" fill="#DC2626" stroke="#FFF" stroke-width="8"/>
        <!-- Inner Border -->
        <polygon points="118,36 202,36 258,92 258,148 202,204 118,204 62,148 62,92" fill="none" stroke="#FFF" stroke-width="3"/>
        <!-- Open Palm Hand Glyph -->
        <g fill="#FFF" transform="translate(130, 60)">
          <path d="M 12 30 C 12 18 16 14 20 14 C 24 14 28 18 28 30 L 28 20 C 28 12 32 8 36 8 C 40 8 44 12 44 20 L 44 24 C 44 14 48 10 52 10 C 56 10 60 14 60 24 L 60 30 C 60 20 64 16 68 16 C 72 16 76 20 76 30 L 76 56 C 76 74 60 88 44 88 C 28 88 12 74 12 56 Z"/>
          <!-- Thumb -->
          <path d="M 12 45 C 5 40 0 46 2 54 C 6 62 14 68 18 68 Z"/>
        </g>
        <!-- STOP Bold Text -->
        <text x="160" y="180" text-anchor="middle" font-family="impact, sans-serif" font-weight="900" font-size="34" fill="#FFF" letter-spacing="4">HALT!</text>
      </svg>
    `),
  },
  {
    id: 'MEME_CLAPPING_AWARD',
    title: 'Standing Ovation Applause',
    category: 'CELEBRATION',
    description: 'Golden hands vigorously clapping with impact stars and confetti celebration.',
    aspectRatio: 4 / 3,
    tags: ['clap', 'applause', 'celebration', 'cheer', 'award'],
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
        <defs>
          <linearGradient id="clap-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1E1B4B"/>
            <stop offset="100%" stop-color="#312E81"/>
          </linearGradient>
        </defs>
        <rect width="320" height="240" fill="url(#clap-bg)"/>
        <!-- Confetti Elements -->
        <g>
          <rect x="40" y="30" width="8" height="8" fill="#FACC15" transform="rotate(25 40 30)"/>
          <rect x="80" y="70" width="10" height="6" fill="#F43F5E" transform="rotate(-15 80 70)"/>
          <rect x="250" y="40" width="8" height="8" fill="#10B981" transform="rotate(45 250 40)"/>
          <rect x="220" y="80" width="12" height="6" fill="#06B6D4" transform="rotate(20 220 80)"/>
          <circle cx="160" cy="30" r="4" fill="#FACC15"/>
        </g>
        <!-- Central Impact Clapping Hands -->
        <g transform="translate(70, 45)">
          <!-- Left Hand -->
          <path d="M 20 110 L 60 70 C 65 65 75 65 80 70 L 95 85 L 60 120 Z" fill="#FBBF24" stroke="#111827" stroke-width="5"/>
          <!-- Right Hand Impacting -->
          <path d="M 160 110 L 120 70 C 115 65 105 65 100 70 L 85 85 L 120 120 Z" fill="#F59E0B" stroke="#111827" stroke-width="5"/>
          <!-- Impact Shockwave Stars -->
          <polygon points="90,45 94,55 105,55 96,62 100,72 90,65 80,72 84,62 75,55 86,55" fill="#FACC15" stroke="#111827" stroke-width="2"/>
          <polygon points="90,95 93,103 102,103 95,108 98,116 90,111 82,116 85,108 78,103 87,103" fill="#FACC15" stroke="#111827" stroke-width="2"/>
        </g>
        <!-- Bottom Banner -->
        <rect x="20" y="195" width="280" height="34" rx="6" fill="#111827" stroke="#FBBF24" stroke-width="3"/>
        <text x="160" y="218" text-anchor="middle" font-family="monospace" font-weight="900" font-size="14" fill="#FBBF24" letter-spacing="2">OUTSTANDING MOVE // 10/10</text>
      </svg>
    `),
  },
  {
    id: 'MEME_TARGET_LOCKED',
    title: 'Tactical Target Locked',
    category: 'CARTOON',
    description: 'High-tech tactical crosshair acquiring target with red dot laser.',
    aspectRatio: 4 / 3,
    tags: ['pointing', 'target', 'laser', 'aim', 'locked'],
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
        <rect width="320" height="240" fill="#090D16"/>
        <!-- Fine Telemetry Grid -->
        <g stroke="#06B6D4" stroke-width="0.8" opacity="0.25">
          <line x1="0" y1="60" x2="320" y2="60"/><line x1="0" y1="120" x2="320" y2="120"/><line x1="0" y1="180" x2="320" y2="180"/>
          <line x1="80" y1="0" x2="80" y2="240"/><line x1="160" y1="0" x2="160" y2="240"/><line x1="240" y1="0" x2="240" y2="240"/>
        </g>
        <!-- Tactical Reticle Rings -->
        <circle cx="160" cy="110" r="65" fill="none" stroke="#06B6D4" stroke-width="2.5" stroke-dasharray="15 6"/>
        <circle cx="160" cy="110" r="40" fill="none" stroke="#EF4444" stroke-width="2"/>
        <circle cx="160" cy="110" r="15" fill="none" stroke="#EF4444" stroke-width="2"/>
        <circle cx="160" cy="110" r="4" fill="#EF4444"/>
        <!-- Crosshairs -->
        <line x1="75" y1="110" x2="135" y2="110" stroke="#06B6D4" stroke-width="3"/>
        <line x1="185" y1="110" x2="245" y2="110" stroke="#06B6D4" stroke-width="3"/>
        <line x1="160" y1="25" x2="160" y2="85" stroke="#06B6D4" stroke-width="3"/>
        <line x1="160" y1="135" x2="160" y2="195" stroke="#06B6D4" stroke-width="3"/>
        <!-- Corner Brackets -->
        <path d="M 60 40 L 40 40 L 40 60" fill="none" stroke="#06B6D4" stroke-width="3"/>
        <path d="M 260 40 L 280 40 L 280 60" fill="none" stroke="#06B6D4" stroke-width="3"/>
        <path d="M 60 180 L 40 180 L 40 160" fill="none" stroke="#06B6D4" stroke-width="3"/>
        <path d="M 260 180 L 280 180 L 280 160" fill="none" stroke="#06B6D4" stroke-width="3"/>
        <!-- Bottom Banner -->
        <rect x="20" y="195" width="280" height="34" rx="6" fill="#111827" stroke="#EF4444" stroke-width="2"/>
        <text x="160" y="218" text-anchor="middle" font-family="monospace" font-weight="900" font-size="14" fill="#EF4444" letter-spacing="2">TARGET ACQUIRED // LOCKED</text>
      </svg>
    `),
  },
  {
    id: 'MEME_PEACE_OUT',
    title: 'Retro Vaporwave Peace Out',
    category: 'REACTION',
    description: 'Glowing neon peace sign with retro synthwave grid horizon.',
    aspectRatio: 4 / 3,
    tags: ['peace_sign', 'retro', 'chill', 'victory', 'disco'],
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
        <defs>
          <linearGradient id="vapor-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1E1B4B"/>
            <stop offset="60%" stop-color="#701A75"/>
            <stop offset="100%" stop-color="#F43F5E"/>
          </linearGradient>
        </defs>
        <rect width="320" height="150" fill="url(#vapor-sky)"/>
        <!-- Retro Grid Floor -->
        <rect x="0" y="150" width="320" height="90" fill="#09090B"/>
        <g stroke="#06B6D4" stroke-width="1.2" opacity="0.6">
          <line x1="0" y1="165" x2="320" y2="165"/><line x1="0" y1="185" x2="320" y2="185"/><line x1="0" y1="215" x2="320" y2="215"/>
          <line x1="160" y1="150" x2="40" y2="240"/><line x1="160" y1="150" x2="100" y2="240"/><line x1="160" y1="150" x2="160" y2="240"/>
          <line x1="160" y1="150" x2="220" y2="240"/><line x1="160" y1="150" x2="280" y2="240"/>
        </g>
        <!-- Neon Sun -->
        <circle cx="160" cy="110" r="45" fill="#FACC15"/>
        <g fill="url(#vapor-sky)">
          <rect x="110" y="95" width="100" height="4"/>
          <rect x="110" y="105" width="100" height="6"/>
          <rect x="110" y="118" width="100" height="8"/>
        </g>
        <!-- Peace Sign Hand (V-Sign) -->
        <g transform="translate(130, 45)">
          <path d="M 22 45 L 15 15 C 13 8 20 4 25 10 L 32 40 L 38 40 L 45 10 C 50 4 57 8 55 15 L 48 45 L 54 48 C 60 52 58 64 50 68 L 50 90 L 15 90 L 15 65 C 12 60 14 50 22 45 Z" fill="#F43F5E" stroke="#FFF" stroke-width="4"/>
        </g>
        <!-- Bottom Banner -->
        <rect x="25" y="195" width="270" height="32" rx="6" fill="#111827" stroke="#F43F5E" stroke-width="2"/>
        <text x="160" y="216" text-anchor="middle" font-family="monospace" font-weight="900" font-size="13" fill="#F43F5E" letter-spacing="2">PEACE OUT // ZERO STRESS</text>
      </svg>
    `),
  },
  {
    id: 'MEME_SUPERHERO_LANDING',
    title: 'Superhero Impact Landing',
    category: 'CARTOON',
    description: 'Ground crack crater with comic shockwave and superhero stance.',
    aspectRatio: 4 / 3,
    tags: ['squat', 'landing', 'impact', 'superhero', 'heavy'],
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
        <defs>
          <radialGradient id="crater-bg" cx="50%" cy="60%" r="55%">
            <stop offset="0%" stop-color="#EA580C"/>
            <stop offset="70%" stop-color="#7C2D12"/>
            <stop offset="100%" stop-color="#18181B"/>
          </radialGradient>
        </defs>
        <rect width="320" height="240" fill="url(#crater-bg)"/>
        <!-- Ground Cracks Radiating Outward -->
        <g stroke="#FDE047" stroke-width="3" stroke-linecap="round" fill="none">
          <path d="M 160 140 L 120 160 L 80 150 L 40 180"/>
          <path d="M 160 140 L 200 160 L 250 150 L 290 180"/>
          <path d="M 160 140 L 140 180 L 110 200"/>
          <path d="M 160 140 L 180 180 L 210 200"/>
        </g>
        <!-- Impact Dust Rings -->
        <ellipse cx="160" cy="140" rx="90" ry="25" fill="none" stroke="#FACC15" stroke-width="4" stroke-dasharray="20 10"/>
        <ellipse cx="160" cy="140" rx="55" ry="15" fill="none" stroke="#FFF" stroke-width="3"/>
        <!-- Hero Silhouette in 3-Point Stance -->
        <g fill="#18181B" stroke="#FDE047" stroke-width="2">
          <!-- Torso -->
          <ellipse cx="160" cy="100" rx="20" ry="22"/>
          <!-- Head -->
          <circle cx="160" cy="70" r="14"/>
          <!-- Fist to Ground -->
          <rect x="154" y="125" width="12" height="15" rx="3"/>
          <!-- Arms Bent -->
          <path d="M 145 95 L 125 110 L 135 130" stroke-width="6" stroke="#18181B"/>
          <path d="M 175 95 L 195 110 L 185 130" stroke-width="6" stroke="#18181B"/>
        </g>
        <!-- Banner -->
        <rect x="20" y="195" width="280" height="34" rx="6" fill="#18181B" stroke="#EA580C" stroke-width="2"/>
        <text x="160" y="218" text-anchor="middle" font-family="monospace" font-weight="900" font-size="13" fill="#FDE047" letter-spacing="2">SUPERHERO LANDING // 10/10</text>
      </svg>
    `),
  },
  {
    id: 'MEME_JUDGMENTAL_STARE',
    title: 'Judgmental Suspicious Stare',
    category: 'REACTION',
    description: 'Skeptical squinting eyes peering out of shadows with magnifying glass.',
    aspectRatio: 4 / 3,
    tags: ['arms_crossed', 'stare', 'judgment', 'suspicious', 'doubt'],
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
        <rect width="320" height="240" fill="#0B0F19"/>
        <!-- Spotlight Beam -->
        <polygon points="160,0 60,240 260,240" fill="#1E293B" opacity="0.4"/>
        <!-- Mysterious Shadow Mask -->
        <ellipse cx="160" cy="105" rx="100" ry="40" fill="#0F172A" stroke="#334155" stroke-width="3"/>
        <!-- Squinting Narrow Suspicious Eyes -->
        <g>
          <!-- Left Eye -->
          <ellipse cx="120" cy="105" rx="25" ry="12" fill="#FFF" stroke="#111827" stroke-width="3"/>
          <ellipse cx="128" cy="105" rx="8" ry="10" fill="#0284C7"/>
          <circle cx="128" cy="105" r="4" fill="#000"/>
          <!-- Heavy Eyelid Drop -->
          <path d="M 95 100 Q 120 108 145 100" stroke="#0F172A" stroke-width="6" fill="none"/>
          <!-- Right Eye -->
          <ellipse cx="200" cy="105" rx="25" ry="12" fill="#FFF" stroke="#111827" stroke-width="3"/>
          <ellipse cx="192" cy="105" rx="8" ry="10" fill="#0284C7"/>
          <circle cx="192" cy="105" r="4" fill="#000"/>
          <path d="M 175 100 Q 200 108 225 100" stroke="#0F172A" stroke-width="6" fill="none"/>
        </g>
        <!-- Eyebrow Ridge (Raised One Side) -->
        <path d="M 95 85 Q 120 80 145 88" stroke="#38BDF8" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M 175 88 Q 200 70 225 75" stroke="#38BDF8" stroke-width="4" fill="none" stroke-linecap="round"/>
        <!-- Question Mark -->
        <text x="245" y="80" font-family="monospace" font-weight="900" font-size="36" fill="#FACC15">?</text>
        <!-- Banner -->
        <rect x="25" y="195" width="270" height="32" rx="6" fill="#0F172A" stroke="#38BDF8" stroke-width="2"/>
        <text x="160" y="216" text-anchor="middle" font-family="monospace" font-weight="900" font-size="13" fill="#38BDF8" letter-spacing="2">I AM SILENTLY JUDGING YOU</text>
      </svg>
    `),
  },
  {
    id: 'MEME_THIS_IS_FINE',
    title: 'This Is Fine Dog',
    category: 'CLASSIC',
    description: 'Calm dog in fedora sipping coffee inside roaring cartoon flames.',
    aspectRatio: 4 / 3,
    tags: ['this_is_fine', 'dog', 'flames', 'zen_prayer', 'flex_pose', 'calm'],
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
        <defs>
          <linearGradient id="fire-bg" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="#7C2D12"/>
            <stop offset="60%" stop-color="#EA580C"/>
            <stop offset="100%" stop-color="#FACC15"/>
          </linearGradient>
        </defs>
        <rect width="320" height="240" fill="url(#fire-bg)"/>
        <!-- Background Cartoon Flame Waves -->
        <g fill="#EF4444" opacity="0.7">
          <path d="M 0 160 Q 40 80 80 160 Q 120 70 160 160 Q 200 60 240 160 Q 280 80 320 160 L 320 240 L 0 240 Z"/>
        </g>
        <g fill="#FACC15" opacity="0.8">
          <path d="M 20 180 Q 60 110 100 180 Q 140 100 180 180 Q 220 90 260 180 Q 300 110 320 180 L 320 240 L 20 240 Z"/>
        </g>
        <!-- Table -->
        <rect x="70" y="150" width="180" height="15" fill="#78350F" stroke="#111827" stroke-width="4"/>
        <rect x="85" y="165" width="12" height="40" fill="#78350F" stroke="#111827" stroke-width="4"/>
        <!-- Coffee Cup -->
        <rect x="95" y="130" width="22" height="20" rx="3" fill="#FFF" stroke="#111827" stroke-width="3"/>
        <path d="M 117 135 Q 125 140 117 145" fill="none" stroke="#111827" stroke-width="3"/>
        <!-- Dog Character -->
        <g transform="translate(135, 75)">
          <!-- Fedora Hat -->
          <ellipse cx="40" cy="22" rx="28" ry="6" fill="#1E293B" stroke="#111827" stroke-width="3"/>
          <path d="M 25 22 L 28 8 L 52 8 L 55 22 Z" fill="#334155" stroke="#111827" stroke-width="3"/>
          <!-- Head -->
          <circle cx="40" cy="45" r="24" fill="#F59E0B" stroke="#111827" stroke-width="4"/>
          <!-- Ears -->
          <ellipse cx="20" cy="40" rx="8" ry="16" fill="#D97706" stroke="#111827" stroke-width="3"/>
          <!-- Wide Oblivious Eyes -->
          <circle cx="34" cy="40" r="5" fill="#FFF" stroke="#111827" stroke-width="2"/>
          <circle cx="34" cy="40" r="2" fill="#000"/>
          <circle cx="48" cy="40" r="5" fill="#FFF" stroke="#111827" stroke-width="2"/>
          <circle cx="48" cy="40" r="2" fill="#000"/>
          <!-- Snout & Peaceful Grin -->
          <ellipse cx="40" cy="52" rx="10" ry="7" fill="#FDE68A" stroke="#111827" stroke-width="2"/>
          <circle cx="40" cy="48" r="3" fill="#111827"/>
          <path d="M 36 54 Q 40 57 44 54" stroke="#111827" stroke-width="2" fill="none"/>
        </g>
        <!-- Bottom Banner -->
        <rect x="25" y="195" width="270" height="32" rx="6" fill="#111827" stroke="#FACC15" stroke-width="2"/>
        <text x="160" y="216" text-anchor="middle" font-family="monospace" font-weight="900" font-size="13" fill="#FACC15" letter-spacing="2">THIS IS COMPLETELY FINE</text>
      </svg>
    `),
  },
  {
    id: 'MEME_DOGE_WOW',
    title: 'Classic Doge Much Wow',
    category: 'CLASSIC',
    description: 'Iconic Shiba Inu surrounded by colorful Comic Sans meme phrases.',
    aspectRatio: 4 / 3,
    tags: ['doge', 'wow', 'dab', 'shiba', 'classic'],
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
        <rect width="320" height="240" fill="#FEF3C7"/>
        <!-- Shiba Face -->
        <g transform="translate(100, 35)">
          <ellipse cx="60" cy="75" rx="55" ry="48" fill="#D97706" stroke="#111827" stroke-width="4"/>
          <!-- White Cheeks -->
          <ellipse cx="38" cy="85" rx="22" ry="24" fill="#FFFBEB"/>
          <ellipse cx="82" cy="85" rx="22" ry="24" fill="#FFFBEB"/>
          <!-- Ears -->
          <polygon points="20,40 10,10 40,25" fill="#D97706" stroke="#111827" stroke-width="4"/>
          <polygon points="100,40 110,10 80,25" fill="#D97706" stroke="#111827" stroke-width="4"/>
          <!-- Soft Concerned Eyes -->
          <ellipse cx="42" cy="65" rx="8" ry="10" fill="#111827"/>
          <circle cx="44" cy="62" r="3" fill="#FFF"/>
          <ellipse cx="78" cy="65" rx="8" ry="10" fill="#111827"/>
          <circle cx="80" cy="62" r="3" fill="#FFF"/>
          <!-- Muzzle & Snout -->
          <ellipse cx="60" cy="85" rx="14" ry="10" fill="#FFF" stroke="#111827" stroke-width="2"/>
          <circle cx="60" cy="80" r="5" fill="#111827"/>
          <!-- Eyebrows -->
          <ellipse cx="40" cy="50" rx="6" ry="3" fill="#FFFBEB"/>
          <ellipse cx="80" cy="50" rx="6" ry="3" fill="#FFFBEB"/>
        </g>
        <!-- Floating Doge Comic Phrases -->
        <text x="25" y="45" font-family="'Comic Sans MS', cursive, sans-serif" font-weight="bold" font-size="18" fill="#EC4899">so pose</text>
        <text x="220" y="55" font-family="'Comic Sans MS', cursive, sans-serif" font-weight="bold" font-size="20" fill="#06B6D4">much AI</text>
        <text x="35" y="160" font-family="'Comic Sans MS', cursive, sans-serif" font-weight="bold" font-size="19" fill="#10B981">very gesture</text>
        <text x="215" y="165" font-family="'Comic Sans MS', cursive, sans-serif" font-weight="bold" font-size="22" fill="#EAB308">SUCH WOW</text>
        <!-- Banner -->
        <rect x="25" y="195" width="270" height="32" rx="6" fill="#111827" stroke="#D97706" stroke-width="2"/>
        <text x="160" y="216" text-anchor="middle" font-family="monospace" font-weight="900" font-size="13" fill="#FDE68A" letter-spacing="2">MUCH ACCURACY // VERY SMART</text>
      </svg>
    `),
  },
  {
    id: 'MEME_PINCH_GRAB',
    title: 'Yoink Pinch Grab',
    category: 'CARTOON',
    description: 'Precision pinch lifting microscopic trophy with comic motion lines.',
    aspectRatio: 4 / 3,
    tags: ['pinch', 'grab', 'yoink', 'precision', 'lift'],
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
        <rect width="320" height="240" fill="#18181B"/>
        <!-- Precision Grid Circles -->
        <circle cx="160" cy="95" r="50" fill="none" stroke="#A855F7" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.4"/>
        <circle cx="160" cy="95" r="25" fill="none" stroke="#A855F7" stroke-width="1.5" stroke-dasharray="2 2" opacity="0.6"/>
        <!-- Pinching Fingers -->
        <!-- Thumb Finger (Left) -->
        <path d="M 80 120 C 100 120 125 105 145 98 C 150 96 155 94 158 95" fill="none" stroke="#FB923C" stroke-width="18" stroke-linecap="round"/>
        <!-- Index Finger (Right/Top) -->
        <path d="M 190 40 C 185 60 175 80 162 93" fill="none" stroke="#FDBA74" stroke-width="18" stroke-linecap="round"/>
        <!-- Tiny Lifted Diamond / Trophy -->
        <polygon points="160,110 168,122 160,134 152,122" fill="#FACC15" stroke="#FFF" stroke-width="2"/>
        <!-- Sparkle Lines around Contact -->
        <line x1="160" y1="80" x2="160" y2="70" stroke="#FFF" stroke-width="3" stroke-linecap="round"/>
        <line x1="140" y1="85" x2="130" y2="80" stroke="#FFF" stroke-width="3" stroke-linecap="round"/>
        <line x1="180" y1="85" x2="190" y2="80" stroke="#FFF" stroke-width="3" stroke-linecap="round"/>
        <!-- Banner -->
        <rect x="25" y="195" width="270" height="32" rx="6" fill="#111827" stroke="#A855F7" stroke-width="2"/>
        <text x="160" y="216" text-anchor="middle" font-family="monospace" font-weight="900" font-size="13" fill="#A855F7" letter-spacing="2">YOINK! // OBJECT SECURED</text>
      </svg>
    `),
  },
  {
    id: 'MEME_THUMBS_DOWN_FAIL',
    title: 'Disapproval Thumbs Down',
    category: 'REACTION',
    description: 'Giant downward thumb with comedy broken heart and fail buzzer.',
    aspectRatio: 4 / 3,
    tags: ['thumbs_down', 'fail', 'disapproval', 'cringe', 'reject'],
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
        <rect width="320" height="240" fill="#1E1B4B"/>
        <!-- Rain / Despair Lines -->
        <g stroke="#6366F1" stroke-width="1.5" opacity="0.3">
          <line x1="40" y1="20" x2="20" y2="60"/><line x1="120" y1="30" x2="100" y2="70"/>
          <line x1="220" y1="20" x2="200" y2="60"/><line x1="280" y1="40" x2="260" y2="80"/>
        </g>
        <!-- Big Downward Red Thumb -->
        <g transform="translate(100, 30)">
          <!-- Fist Base -->
          <rect x="35" y="30" width="60" height="50" rx="10" fill="#EF4444" stroke="#111827" stroke-width="5"/>
          <!-- Downward Extended Thumb -->
          <path d="M 35 60 C 25 70 20 85 20 100 C 20 115 35 125 45 110 L 55 80 Z" fill="#DC2626" stroke="#111827" stroke-width="5"/>
        </g>
        <!-- Broken Heart -->
        <g transform="translate(185, 55)" stroke="#111827" stroke-width="3">
          <path d="M 30 20 A 12 12 0 0 0 10 35 L 30 55 L 28 40 L 34 35 L 26 28 Z" fill="#F43F5E"/>
          <path d="M 30 20 A 12 12 0 0 1 50 35 L 30 55 L 32 40 L 26 35 L 34 28 Z" fill="#F43F5E"/>
        </g>
        <!-- Banner -->
        <rect x="25" y="195" width="270" height="32" rx="6" fill="#111827" stroke="#EF4444" stroke-width="2"/>
        <text x="160" y="216" text-anchor="middle" font-family="monospace" font-weight="900" font-size="13" fill="#EF4444" letter-spacing="2">MISSION FAILED // CRINGE</text>
      </svg>
    `),
  },
  {
    id: 'MEME_THREE_FINGER_SALUTE',
    title: 'Three Finger Power',
    category: 'CELEBRATION',
    description: 'Three fingers held up in heroic triangle with golden rays.',
    aspectRatio: 4 / 3,
    tags: ['three_fingers', 'salute', 'trinity', 'power'],
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
        <rect width="320" height="240" fill="#0C4A6E"/>
        <!-- Golden Starburst Rays -->
        <g stroke="#FACC15" stroke-width="2" opacity="0.35">
          <line x1="160" y1="120" x2="30" y2="30"/><line x1="160" y1="120" x2="160" y2="10"/><line x1="160" y1="120" x2="290" y2="30"/>
        </g>
        <!-- Hand with 3 Fingers Extended -->
        <g transform="translate(120, 45)" stroke="#111827" stroke-width="5" fill="#38BDF8">
          <!-- Palm -->
          <rect x="15" y="65" width="55" height="55" rx="10"/>
          <!-- Index Finger -->
          <rect x="15" y="15" width="14" height="60" rx="7"/>
          <!-- Middle Finger -->
          <rect x="35" y="5" width="14" height="70" rx="7"/>
          <!-- Ring Finger -->
          <rect x="55" y="18" width="14" height="57" rx="7"/>
        </g>
        <!-- Number 3 Badge -->
        <circle cx="70" cy="70" r="24" fill="#FACC15" stroke="#111827" stroke-width="4"/>
        <text x="70" y="78" text-anchor="middle" font-family="impact, sans-serif" font-size="26" fill="#111827">3</text>
        <!-- Banner -->
        <rect x="25" y="195" width="270" height="32" rx="6" fill="#111827" stroke="#38BDF8" stroke-width="2"/>
        <text x="160" y="216" text-anchor="middle" font-family="monospace" font-weight="900" font-size="13" fill="#38BDF8" letter-spacing="2">THE SACRED TRINITY // ACTIVATED</text>
      </svg>
    `),
  },
  {
    id: 'MEME_FOUR_FINGER_POWER',
    title: 'Quad Core Overclock',
    category: 'CELEBRATION',
    description: 'Four fingers glowing with neon elemental energy rings.',
    aspectRatio: 4 / 3,
    tags: ['four_fingers', 'quad', 'overclock', 'power'],
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
        <rect width="320" height="240" fill="#14532D"/>
        <!-- Neon Energy Waves -->
        <circle cx="160" cy="100" r="70" fill="none" stroke="#4ADE80" stroke-width="2" opacity="0.3"/>
        <circle cx="160" cy="100" r="45" fill="none" stroke="#22C55E" stroke-width="2" opacity="0.5"/>
        <!-- Hand with 4 Fingers Extended -->
        <g transform="translate(115, 45)" stroke="#111827" stroke-width="4" fill="#4ADE80">
          <rect x="10" y="65" width="65" height="55" rx="10"/>
          <rect x="10" y="15" width="12" height="60" rx="6"/>
          <rect x="26" y="8" width="12" height="67" rx="6"/>
          <rect x="42" y="12" width="12" height="63" rx="6"/>
          <rect x="58" y="22" width="12" height="53" rx="6"/>
        </g>
        <!-- Overclock Gauge -->
        <text x="70" y="65" font-family="monospace" font-weight="900" font-size="28" fill="#FACC15">400%</text>
        <!-- Banner -->
        <rect x="25" y="195" width="270" height="32" rx="6" fill="#111827" stroke="#4ADE80" stroke-width="2"/>
        <text x="160" y="216" text-anchor="middle" font-family="monospace" font-weight="900" font-size="13" fill="#4ADE80" letter-spacing="2">QUAD CORE OVERCLOCK // ENGAGED</text>
      </svg>
    `),
  },
  {
    id: 'MEME_SWIPE_LEFT',
    title: 'Swipe Left Nope',
    category: 'REACTION',
    description: 'Dynamic aerodynamic cyan air whoosh speeding to the left.',
    aspectRatio: 4 / 3,
    tags: ['swipe_left', 'nope', 'reject', 'fast', 'whoosh'],
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
        <rect width="320" height="240" fill="#0F172A"/>
        <!-- Motion Speed Blur Arrows to Left -->
        <g stroke="#06B6D4" stroke-width="4" stroke-linecap="round" opacity="0.8">
          <line x1="280" y1="60" x2="60" y2="60"/>
          <line x1="240" y1="100" x2="40" y2="100"/>
          <line x1="290" y1="140" x2="80" y2="140"/>
        </g>
        <!-- Big Leftward Arrow Head -->
        <polygon points="50,100 90,70 90,90 200,90 200,110 90,110 90,130" fill="#06B6D4" stroke="#FFF" stroke-width="3"/>
        <text x="175" y="150" font-family="impact, sans-serif" font-size="34" fill="#F43F5E">NOPE!</text>
        <!-- Banner -->
        <rect x="25" y="195" width="270" height="32" rx="6" fill="#111827" stroke="#06B6D4" stroke-width="2"/>
        <text x="160" y="216" text-anchor="middle" font-family="monospace" font-weight="900" font-size="13" fill="#06B6D4" letter-spacing="2">SWIPE LEFT // ABSOLUTELY NOT</text>
      </svg>
    `),
  },
  {
    id: 'MEME_SWIPE_RIGHT',
    title: 'Swipe Right Match',
    category: 'CELEBRATION',
    description: 'Neon emerald motion blur speeding to the right with floating hearts.',
    aspectRatio: 4 / 3,
    tags: ['swipe_right', 'match', 'yes', 'approved', 'whoosh'],
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
        <rect width="320" height="240" fill="#0F172A"/>
        <!-- Motion Speed Blur Arrows to Right -->
        <g stroke="#10B981" stroke-width="4" stroke-linecap="round" opacity="0.8">
          <line x1="40" y1="60" x2="260" y2="60"/>
          <line x1="60" y1="100" x2="280" y2="100"/>
          <line x1="30" y1="140" x2="240" y2="140"/>
        </g>
        <!-- Big Rightward Arrow Head -->
        <polygon points="270,100 230,70 230,90 120,90 120,110 230,110 230,130" fill="#10B981" stroke="#FFF" stroke-width="3"/>
        <!-- Floating Hearts -->
        <path d="M 80 80 Q 90 65 100 80 Q 110 65 120 80 Q 100 110 100 110 Z" fill="#EC4899"/>
        <text x="110" y="150" font-family="impact, sans-serif" font-size="30" fill="#FACC15">MATCH!</text>
        <!-- Banner -->
        <rect x="25" y="195" width="270" height="32" rx="6" fill="#111827" stroke="#10B981" stroke-width="2"/>
        <text x="160" y="216" text-anchor="middle" font-family="monospace" font-weight="900" font-size="13" fill="#10B981" letter-spacing="2">SWIPE RIGHT // IT’S A MATCH!</text>
      </svg>
    `),
  },
  {
    id: 'MEME_FACEPALM',
    title: 'Classic Facepalm',
    category: 'REACTION',
    description: 'Classic hand slapping forehead in utter disbelief.',
    aspectRatio: 4 / 3,
    tags: ['facepalm', 'zombie_walk', 'disbelief', 'fail'],
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
        <rect width="320" height="240" fill="#18181B"/>
        <!-- Dizzy Spiral / Stars -->
        <g fill="#FACC15">
          <polygon points="60,50 63,58 72,58 65,63 68,72 60,67 52,72 55,63 48,58 57,58"/>
          <polygon points="250,60 253,68 262,68 255,73 258,82 250,77 242,82 245,73 238,68 247,68"/>
        </g>
        <!-- Head Silhouette with Slapped Hand -->
        <g transform="translate(110, 45)">
          <ellipse cx="50" cy="55" rx="35" ry="40" fill="#FED7AA" stroke="#111827" stroke-width="4"/>
          <!-- Hand across forehead -->
          <path d="M 20 40 L 75 35 C 85 45 80 65 60 70 L 25 65 Z" fill="#FDBA74" stroke="#111827" stroke-width="4"/>
          <!-- Slap impact lines -->
          <line x1="85" y1="25" x2="95" y2="15" stroke="#EF4444" stroke-width="4" stroke-linecap="round"/>
          <line x1="90" y1="40" x2="105" y2="40" stroke="#EF4444" stroke-width="4" stroke-linecap="round"/>
        </g>
        <!-- Banner -->
        <rect x="25" y="195" width="270" height="32" rx="6" fill="#111827" stroke="#EF4444" stroke-width="2"/>
        <text x="160" y="216" text-anchor="middle" font-family="monospace" font-weight="900" font-size="13" fill="#EF4444" letter-spacing="2">WHY ARE YOU LIKE THIS</text>
      </svg>
    `),
  },
  {
    id: 'MEME_VICTORY_CROWN',
    title: 'Golden Victory Crown',
    category: 'CELEBRATION',
    description: 'Shining golden crown adorned with jewels and celebration rays.',
    aspectRatio: 4 / 3,
    tags: ['crown', 'champion', 'victory', 'gold', 'winner'],
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="100%" height="100%">
        <defs>
          <radialGradient id="crown-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#1E1B4B"/>
            <stop offset="100%" stop-color="#0F172A"/>
          </radialGradient>
          <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FDE047"/>
            <stop offset="50%" stop-color="#EAB308"/>
            <stop offset="100%" stop-color="#CA8A04"/>
          </linearGradient>
        </defs>
        <rect width="320" height="240" fill="url(#crown-bg)"/>
        <!-- Sunburst Radiance -->
        <g stroke="#FDE047" stroke-width="2" opacity="0.35">
          <line x1="160" y1="120" x2="160" y2="20"/>
          <line x1="160" y1="120" x2="260" y2="40"/>
          <line x1="160" y1="120" x2="60" y2="40"/>
          <line x1="160" y1="120" x2="290" y2="100"/>
          <line x1="160" y1="120" x2="30" y2="100"/>
        </g>
        <!-- Golden Crown Body -->
        <polygon points="50,150 70,75 115,115 160,55 205,115 250,75 270,150" fill="url(#gold-grad)" stroke="#111827" stroke-width="5"/>
        <rect x="50" y="145" width="220" height="25" rx="3" fill="#EAB308" stroke="#111827" stroke-width="4"/>
        <!-- Jewels -->
        <circle cx="160" cy="55" r="9" fill="#EF4444" stroke="#111827" stroke-width="3"/>
        <circle cx="70" cy="75" r="7" fill="#3B82F6" stroke="#111827" stroke-width="3"/>
        <circle cx="250" cy="75" r="7" fill="#3B82F6" stroke="#111827" stroke-width="3"/>
        <circle cx="115" cy="115" r="6" fill="#10B981" stroke="#111827" stroke-width="2"/>
        <circle cx="205" cy="115" r="6" fill="#10B981" stroke="#111827" stroke-width="2"/>
        <!-- Band Jewels -->
        <circle cx="85" cy="157" r="5" fill="#EF4444"/>
        <circle cx="125" cy="157" r="5" fill="#3B82F6"/>
        <circle cx="160" cy="157" r="6" fill="#10B981"/>
        <circle cx="195" cy="157" r="5" fill="#3B82F6"/>
        <circle cx="235" cy="157" r="5" fill="#EF4444"/>
        <!-- Bottom Banner -->
        <rect x="40" y="195" width="240" height="30" rx="4" fill="#000" stroke="#FDE047" stroke-width="2"/>
        <text x="160" y="215" text-anchor="middle" font-family="monospace" font-weight="900" font-size="12" fill="#FDE047" letter-spacing="3">ABSOLUTE CHAMPION</text>
      </svg>
    `),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. HELPER FUNCTIONS FOR RETRIEVAL & LOOKUP
// ─────────────────────────────────────────────────────────────────────────────

export function getMemeById(
  id: string,
  customMemes: MemeVisualDefinition[] = []
): MemeVisualDefinition | undefined {
  const fromCustom = customMemes.find((m) => m.id === id);
  if (fromCustom) return fromCustom;
  return DEFAULT_MEME_LIBRARY.find((m) => m.id === id);
}

export function getDefaultMemeForAction(actionId: string): MemeVisualDefinition {
  const mapping: Record<string, string> = {
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
  };

  const targetId = mapping[actionId] || 'MEME_SURPRISED_PIKACHU';
  return getMemeById(targetId) || DEFAULT_MEME_LIBRARY[0]!;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. INDEXED_DB PERSISTENCE FOR USER-UPLOADED MEMES / GIFS
// Keeps high-resolution binary images out of React state and localStorage quota
// ─────────────────────────────────────────────────────────────────────────────

const DB_NAME = 'OmniGoofyMemesDB';
const DB_VERSION = 1;
const STORE_NAME = 'user_memes';

function openMemeDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadCustomMemesFromDB(): Promise<MemeVisualDefinition[]> {
  try {
    const db = await openMemeDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[GoofyMemeLibrary] Could not load custom memes:', err);
    return [];
  }
}

export async function saveCustomMemeToDB(
  file: File,
  title: string
): Promise<MemeVisualDefinition> {
  const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a PNG, JPEG, WebP, or GIF image.');
  }

  // Max 8 MB limit
  const maxBytes = 8 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error('File exceeds maximum 8 MB limit.');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const customMeme: MemeVisualDefinition = {
    id: `custom-meme-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: title.trim() || file.name.replace(/\.[^/.]+$/, ''),
    category: 'CUSTOM',
    description: `User-uploaded meme (${(file.size / 1024).toFixed(1)} KB)`,
    dataUrl,
    aspectRatio: 4 / 3,
    isCustom: true,
    fileName: file.name,
    tags: ['custom', 'user_upload'],
  };

  const db = await openMemeDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(customMeme);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  return customMeme;
}

export async function deleteCustomMemeFromDB(id: string): Promise<boolean> {
  try {
    const db = await openMemeDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return true;
  } catch (err) {
    console.warn('[GoofyMemeLibrary] Could not delete meme:', err);
    return false;
  }
}
