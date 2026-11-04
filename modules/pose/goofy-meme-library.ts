import {
  MemeVisualDefinition,
  MemeCategory,
  MemeRarity,
  MemePresetId,
  MemePresetDefinition,
  BUILTIN_MEME_PRESETS,
  GOOFY_ACTION_RECOMMENDED_MEMES,
} from './goofy-types';

/**
 * Encodes SVG string into a clean, safe Data URL
 */
function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 0. AUTHENTIC VIRAL REAL MEME MEDIA (42 Real Media Assets)
// Animated GIFs and High-Res Images served locally from /memes/
// ─────────────────────────────────────────────────────────────────────────────

export const REAL_MEDIA_MEMES: MemeVisualDefinition[] = [
  // ── 1. APPROVAL & CONFIDENCE ──
  {
    id: 'REAL_MEME_GIGACHAD',
    title: 'GigaChad (Ernest Khalimov)',
    category: 'APPROVAL_CONFIDENCE',
    caption: 'AVERAGE HAND ENTHUSIAST // AURA +100,000',
    description: 'Chiseled jawline monochrome portrait radiating pure peak confidence.',
    dataUrl: '/memes/gigachad.png',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'LEGENDARY',
    soundId: 'CHAD_GONG',
    aspectRatio: 1,
    gestureTags: ['THUMBS_UP'],
    comboTags: ['DOUBLE_THUMBS_UP'],
    suggestedActions: ['THUMBS_UP', 'DOUBLE_THUMBS_UP'],
    tags: ['gigachad', 'chad', 'based', 'aura', 'confidence', 'thumbs_up'],
  },
  {
    id: 'REAL_MEME_KEANU_BREATHTAKING_GIF',
    title: "You're Breathtaking! (Keanu Reeves)",
    category: 'APPROVAL_CONFIDENCE',
    caption: "NO, YOU'RE BREATHTAKING!",
    description: 'Keanu Reeves on stage at E3 pointing back at the audience with pure charisma.',
    dataUrl: '/memes/keanu_breathtaking.gif',
    mediaType: 'gif',
    sourceType: 'REAL_MEDIA',
    rarity: 'LEGENDARY',
    soundId: 'BRASS_FANFARE',
    aspectRatio: 16 / 9,
    gestureTags: ['POINTING', 'THUMBS_UP'],
    comboTags: ['SECRET_YOU_ARE_BREATHTAKING'],
    suggestedActions: ['POINTING', 'SECRET_YOU_ARE_BREATHTAKING'],
    tags: ['keanu', 'breathtaking', 'pointing', 'wholesome', 'e3'],
  },
  {
    id: 'REAL_MEME_DICAPRIO_TOAST_GIF',
    title: 'Great Gatsby Champagne Toast',
    category: 'APPROVAL_CONFIDENCE',
    caption: 'A TOAST TO EXCELLENCE // REFINED AURA',
    description: 'Leonardo DiCaprio raising a champagne coupe with fireworks and smooth confidence.',
    dataUrl: '/memes/dicaprio_toast.gif',
    mediaType: 'gif',
    sourceType: 'REAL_MEDIA',
    rarity: 'UNCOMMON',
    soundId: 'CONFIDENT_ENTRANCE',
    aspectRatio: 16 / 9,
    gestureTags: ['THUMBS_UP', 'PEACE_SIGN'],
    comboTags: ['DOUBLE_THUMBS_UP'],
    suggestedActions: ['THUMBS_UP', 'DOUBLE_THUMBS_UP'],
    tags: ['gatsby', 'dicaprio', 'toast', 'celebrate', 'aura'],
  },
  {
    id: 'REAL_MEME_BUFF_DOGE',
    title: 'Buff Doge (Swole Doge)',
    category: 'APPROVAL_CONFIDENCE',
    caption: 'BUILT DIFFERENT // ABSOLUTE GAINS',
    description: 'Ultra muscular Shiba Inu representing sheer physical and mental superiority.',
    dataUrl: '/memes/buff_doge.png',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'UNCOMMON',
    soundId: 'CHAD_GONG',
    aspectRatio: 1,
    gestureTags: ['CLOSED_FIST', 'THUMBS_UP'],
    comboTags: ['BOTH_HANDS_FIST'],
    suggestedActions: ['CLOSED_FIST', 'BOTH_HANDS_FIST'],
    tags: ['doge', 'buff', 'muscle', 'swole', 'built different'],
  },
  {
    id: 'REAL_MEME_ROLL_SAFE',
    title: 'Roll Safe (Kayode Ewumi)',
    category: 'APPROVAL_CONFIDENCE',
    caption: "CAN'T LOSE IF YOU DON'T PLAY // BIG BRAIN",
    description: 'Tapping temple with index finger and grinning slyly with 200 IQ wisdom.',
    dataUrl: '/memes/roll_safe.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'SUCTION_POP',
    aspectRatio: 1,
    gestureTags: ['POINTING'],
    suggestedActions: ['POINTING'],
    tags: ['roll safe', 'big brain', 'thinking', 'pointing', 'smart'],
  },
  {
    id: 'REAL_MEME_GUS_FRING',
    title: 'Gus Fring: We Are Not The Same',
    category: 'APPROVAL_CONFIDENCE',
    caption: 'WE ARE NOT THE SAME // COLD PRECISION',
    description: 'Gus Fring adjusting his necktie in pristine suit with calculating authority.',
    dataUrl: '/memes/gus_fring.png',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'RARE',
    soundId: 'DRAMATIC_SUSPENSE',
    aspectRatio: 1,
    gestureTags: ['PINCH', 'THUMBS_UP'],
    suggestedActions: ['PINCH', 'THUMBS_UP'],
    tags: ['gus fring', 'breaking bad', 'suit', 'not the same', 'aura'],
  },

  // ── 2. DISAPPROVAL & REJECTION ──
  {
    id: 'REAL_MEME_DRAKE_HOTLINE',
    title: 'Drake Hotline Bling (Disapproval / Approval)',
    category: 'DISAPPROVAL_REJECTION',
    caption: 'NAH // SWIPED AWAY',
    description: 'Drake turning away with raised hand in stern rejection.',
    dataUrl: '/memes/drake_hotline.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'RECORD_SCRATCH',
    aspectRatio: 1,
    gestureTags: ['THUMBS_DOWN', 'SWIPE_LEFT', 'SWIPE_RIGHT'],
    suggestedActions: ['THUMBS_DOWN', 'SWIPE_LEFT'],
    tags: ['drake', 'reject', 'disapproval', 'swipe', 'thumbs_down'],
  },
  {
    id: 'REAL_MEME_SPONGEBOB_AIGHT_GIF',
    title: 'Aight Imma Head Out (SpongeBob)',
    category: 'DISAPPROVAL_REJECTION',
    caption: 'AIGHT IMMA HEAD OUT ✌️',
    description: 'SpongeBob standing up from his chair in resignation to leave the scene.',
    dataUrl: '/memes/spongebob_head_out.gif',
    mediaType: 'gif',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'SWIPE_WHOOSH',
    aspectRatio: 4 / 3,
    gestureTags: ['SWIPE_LEFT', 'SWIPE_RIGHT'],
    suggestedActions: ['SWIPE_LEFT', 'SWIPE_RIGHT'],
    tags: ['spongebob', 'head out', 'leave', 'done', 'swipe'],
  },
  {
    id: 'REAL_MEME_HOMER_BUSHES_GIF',
    title: 'Homer Backs Into Bushes',
    category: 'DISAPPROVAL_REJECTION',
    caption: 'SLOWLY DISAPPEARING // NOTHING TO SEE',
    description: 'Homer Simpson slowly fading backwards into green foliage in awkward retreat.',
    dataUrl: '/memes/homer_bushes.gif',
    mediaType: 'gif',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'CARTOON_SQUEAK',
    aspectRatio: 4 / 3,
    gestureTags: ['SWIPE_LEFT', 'OPEN_PALM'],
    suggestedActions: ['SWIPE_LEFT', 'OPEN_PALM'],
    tags: ['homer', 'bushes', 'fade', 'retreat', 'awkward'],
  },
  {
    id: 'REAL_MEME_BATMAN_SLAP',
    title: 'Batman Slapping Robin',
    category: 'DISAPPROVAL_REJECTION',
    caption: 'ENOUGH EXCUSES // GET REAL',
    description: 'Batman interrupting Robin with a classic comic book hand slap.',
    dataUrl: '/memes/batman_slap.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'CARTOON_IMPACT',
    aspectRatio: 4 / 3,
    gestureTags: ['SWIPE_LEFT', 'OPEN_PALM'],
    suggestedActions: ['SWIPE_LEFT', 'OPEN_PALM'],
    tags: ['batman', 'robin', 'slap', 'comic', 'reject'],
  },
  {
    id: 'REAL_MEME_UNO_DRAW_25',
    title: 'Draw 25 UNO Cards',
    category: 'DISAPPROVAL_REJECTION',
    caption: 'OR DRAW 25 // CHOSE THE HARD WAY',
    description: 'Holding an absurdly giant hand of 25 UNO cards rather than conceding.',
    dataUrl: '/memes/uno_draw_25.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'RECORD_SCRATCH',
    aspectRatio: 4 / 3,
    gestureTags: ['FOUR_FINGERS', 'FIVE_FINGERS'],
    suggestedActions: ['FOUR_FINGERS', 'FIVE_FINGERS'],
    tags: ['uno', 'draw 25', 'stubborn', 'cards', 'rejection'],
  },

  // ── 3. ANGER & AGGRESSION ──
  {
    id: 'REAL_MEME_ARTHURS_FIST',
    title: "Arthur's Clenched Fist",
    category: 'ANGER_AGGRESSION',
    caption: 'PURE UNFILTERED RAGE // CHILL BRO',
    description: 'Close-up on yellow anthropomorphic aardvark fist clenched in boiling frustration.',
    dataUrl: '/memes/arthurs_fist.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'CARTOON_IMPACT',
    aspectRatio: 1,
    gestureTags: ['CLOSED_FIST'],
    comboTags: ['BOTH_HANDS_FIST'],
    suggestedActions: ['CLOSED_FIST', 'BOTH_HANDS_FIST'],
    tags: ['arthur', 'fist', 'rage', 'anger', 'clenched'],
  },
  {
    id: 'REAL_MEME_WOMAN_YELLING_CAT',
    title: 'Woman Yelling at Smudge the Cat',
    category: 'ANGER_AGGRESSION',
    caption: 'ACCUSATIONS FLYING // CONFUSED CAT',
    description: 'Taylor Armstrong sobbing and screaming while pointing at deadpan dinner cat.',
    dataUrl: '/memes/woman_yelling_cat.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'RECORD_SCRATCH',
    aspectRatio: 16 / 9,
    gestureTags: ['POINTING', 'CLOSED_FIST'],
    suggestedActions: ['POINTING', 'CLOSED_FIST'],
    tags: ['woman yelling', 'cat', 'smudge', 'pointing', 'fight'],
  },

  // ── 4. SURPRISE & SHOCK ──
  {
    id: 'REAL_MEME_SURPRISED_PIKACHU',
    title: 'Surprised Pikachu (Original Anime)',
    category: 'SURPRISE_SHOCK',
    caption: 'WHAT JUST HAPPENED?! // UNBELIEVABLE',
    description: 'Classic open-mouthed stunned anime reaction from Pokemon episode 10.',
    dataUrl: '/memes/surprised_pikachu.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'CARTOON_SQUEAK',
    aspectRatio: 4 / 3,
    gestureTags: ['FIVE_FINGERS', 'OPEN_PALM'],
    comboTags: ['BOTH_HANDS_OPEN'],
    suggestedActions: ['FIVE_FINGERS', 'OPEN_PALM', 'BOTH_HANDS_OPEN'],
    tags: ['pikachu', 'surprised', 'shock', 'pokemon', 'anime'],
  },
  {
    id: 'REAL_MEME_MIND_BLOWN_GIF',
    title: 'Mind Blown Galaxy (Tim & Eric)',
    category: 'SURPRISE_SHOCK',
    caption: 'MIND = BLOWN 💥 // 4D REALITY COLLAPSE',
    description: 'Actor fingers fluttering away from temples as digital cosmic cosmos explodes.',
    dataUrl: '/memes/mind_blown.gif',
    mediaType: 'gif',
    sourceType: 'REAL_MEDIA',
    rarity: 'UNCOMMON',
    soundId: 'AIR_HORN',
    aspectRatio: 16 / 9,
    gestureTags: ['FIVE_FINGERS'],
    comboTags: ['PERFECT_TEN', 'BOTH_HANDS_OPEN'],
    suggestedActions: ['FIVE_FINGERS', 'PERFECT_TEN'],
    tags: ['mind blown', 'explosion', 'galaxy', 'shock', 'five fingers'],
  },
  {
    id: 'REAL_MEME_ALWAYS_HAS_BEEN',
    title: 'Always Has Been (Astronauts)',
    category: 'SURPRISE_SHOCK',
    caption: 'WAIT, IT IS ALL HAND TRACKING? // ALWAYS HAS BEEN',
    description: 'Two astronauts gazing at Earth in orbit before the shocking sudden betrayal.',
    dataUrl: '/memes/always_has_been.png',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'RARE',
    soundId: 'INCEPTION_BRAAAM',
    aspectRatio: 16 / 9,
    gestureTags: ['POINTING'],
    suggestedActions: ['POINTING'],
    tags: ['always has been', 'astronaut', 'space', 'gun', 'shock'],
  },

  // ── 5. CONFUSION ──
  {
    id: 'REAL_MEME_CONFUSED_TRAVOLTA_GIF',
    title: 'Confused Vincent Vega (Pulp Fiction)',
    category: 'CONFUSION',
    caption: 'WHERE IS EVERYBODY?! // 100% LOST',
    description: 'John Travolta looking around empty room with open trenchcoat and bewildered gesture.',
    dataUrl: '/memes/confused_travolta.gif',
    mediaType: 'gif',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'RECORD_SCRATCH',
    aspectRatio: 16 / 9,
    gestureTags: ['OPEN_PALM'],
    comboTags: ['BOTH_HANDS_OPEN', 'THUMBS_UP_AND_DOWN'],
    suggestedActions: ['OPEN_PALM', 'BOTH_HANDS_OPEN'],
    tags: ['travolta', 'confused', 'pulp fiction', 'lost', 'open palm'],
  },
  {
    id: 'REAL_MEME_TWO_BUTTONS',
    title: 'Two Buttons Sweating Dilemma',
    category: 'CONFUSION',
    caption: 'IMPOSSIBLE CHOICE // NERVOUS SWEATING',
    description: 'Superhero character agonizing over which red button to press with cloth on forehead.',
    dataUrl: '/memes/two_buttons.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'DRAMATIC_SUSPENSE',
    aspectRatio: 1,
    gestureTags: ['PINCH', 'POINTING'],
    suggestedActions: ['PINCH', 'POINTING'],
    tags: ['two buttons', 'dilemma', 'choice', 'sweat', 'confusion'],
  },
  {
    id: 'REAL_MEME_THREE_DRAGONS',
    title: 'Three-Headed Dragon (King Ghidorah)',
    category: 'CONFUSION',
    caption: 'TWO FEARSOME // ONE COMPLETELY DERP',
    description: 'Two terrifying realistic dragon heads glaring while the third head derps cross-eyed.',
    dataUrl: '/memes/three_dragons.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'UNCOMMON',
    soundId: 'CARTOON_BOING',
    aspectRatio: 16 / 9,
    gestureTags: ['THREE_FINGERS'],
    comboTags: ['DOUBLE_THREE'],
    suggestedActions: ['THREE_FINGERS', 'DOUBLE_THREE'],
    tags: ['three dragons', 'ghidorah', 'kevin', 'derp', 'three fingers'],
  },
  {
    id: 'REAL_MEME_GETTING_PAID',
    title: 'You Guys Are Getting Paid?',
    category: 'CONFUSION',
    caption: 'WAIT... YOU GUYS ARE GETTING PAID?!',
    description: 'Will Poulter asking the awkward question in We Are the Millers.',
    dataUrl: '/memes/you_guys_getting_paid.png',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'CARTOON_BOING',
    aspectRatio: 16 / 9,
    gestureTags: ['OPEN_PALM', 'THREE_FINGERS'],
    suggestedActions: ['OPEN_PALM', 'THREE_FINGERS'],
    tags: ['getting paid', 'millers', 'confused', 'eyebrows', 'shock'],
  },

  // ── 6. VICTORY & CELEBRATION ──
  {
    id: 'REAL_MEME_SUCCESS_KID_GIF',
    title: 'Success Kid (Sammy Griner)',
    category: 'VICTORY_CELEBRATION',
    caption: 'TOTAL VICTORY // FIST PUMP OF DESTINY',
    description: 'Toddler on beach clutching sand fist with determined champion expression.',
    dataUrl: '/memes/success_kid.gif',
    mediaType: 'gif',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'VICTORY_BELL',
    aspectRatio: 1,
    gestureTags: ['CLOSED_FIST', 'THUMBS_UP'],
    comboTags: ['DOUBLE_THUMBS_UP'],
    suggestedActions: ['CLOSED_FIST', 'THUMBS_UP'],
    tags: ['success kid', 'victory', 'fist', 'champion', 'win'],
  },
  {
    id: 'REAL_MEME_ABSOLUTE_CINEMA_IMG',
    title: 'Absolute Cinema (Martin Scorsese)',
    category: 'VICTORY_CELEBRATION',
    caption: 'ABSOLUTE CINEMA 🎬 // PURE ART',
    description: 'Martin Scorsese holding both hands up in transcendental cinematic appreciation.',
    dataUrl: '/memes/absolute_cinema.png',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'LEGENDARY',
    soundId: 'BRASS_FANFARE',
    aspectRatio: 16 / 9,
    gestureTags: ['FIVE_FINGERS', 'PEACE_SIGN'],
    comboTags: ['DOUBLE_PEACE', 'BOTH_HANDS_OPEN'],
    suggestedActions: ['DOUBLE_PEACE', 'BOTH_HANDS_OPEN', 'FIVE_FINGERS'],
    tags: ['absolute cinema', 'scorsese', 'hands', 'masterpiece', 'peace'],
  },
  {
    id: 'REAL_MEME_SHAQ_SHIMMY_GIF',
    title: 'Shaquille O’Neal Shimmy Wiggle',
    category: 'VICTORY_CELEBRATION',
    caption: 'VIBES ARE IMMACULATE // SHIMMY TIME',
    description: 'Shaq wiggling his shoulders back and forth with playful mischievous delight.',
    dataUrl: '/memes/shaq_shimmy.gif',
    mediaType: 'gif',
    sourceType: 'REAL_MEDIA',
    rarity: 'RARE',
    soundId: 'DISCO_SLAP',
    aspectRatio: 1,
    gestureTags: ['PEACE_SIGN', 'THREE_FINGERS'],
    comboTags: ['DOUBLE_PEACE'],
    suggestedActions: ['PEACE_SIGN', 'DOUBLE_PEACE'],
    tags: ['shaq', 'shimmy', 'wiggle', 'celebrate', 'vibes'],
  },
  {
    id: 'REAL_MEME_LAUGHING_LEO',
    title: 'Laughing Leonardo (Django Unchained)',
    category: 'VICTORY_CELEBRATION',
    caption: 'LOOK AT HIM GO // PURE GLOATING',
    description: 'Calvin Candie laughing hysterically with a drink in hand at high society dinner.',
    dataUrl: '/memes/laughing_leo.png',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'DISCO_SLAP',
    aspectRatio: 1,
    gestureTags: ['PEACE_SIGN', 'THUMBS_UP'],
    suggestedActions: ['PEACE_SIGN', 'THUMBS_UP'],
    tags: ['leo', 'laughing', 'django', 'gloating', 'victory'],
  },
  {
    id: 'REAL_MEME_MATRIX_DODGE_GIF',
    title: 'Neo Matrix Rooftop Bullet Dodge',
    category: 'VICTORY_CELEBRATION',
    caption: 'BULLET DODGE ACTIVATED // HE IS THE ONE',
    description: 'Neo arching backwards in slow motion as ripple trail bullets fly harmlessly past.',
    dataUrl: '/memes/matrix_dodge.gif',
    mediaType: 'gif',
    sourceType: 'REAL_MEDIA',
    rarity: 'LEGENDARY',
    soundId: 'LASER_BEAM',
    aspectRatio: 16 / 9,
    gestureTags: ['POINTING', 'PINCH'],
    comboTags: ['SECRET_MATRIX_DODGE'],
    suggestedActions: ['POINTING', 'SECRET_MATRIX_DODGE'],
    tags: ['neo', 'matrix', 'dodge', 'bullet', 'secret'],
  },

  // ── 7. SUSPICION & JUDGEMENT ──
  {
    id: 'REAL_MEME_THE_ROCK_EYEBROW_GIF',
    title: 'The Rock Eyebrow Raise (Vine Boom)',
    category: 'SUSPICION_JUDGEMENT',
    caption: '🤨 VINE BOOM // BRO WHAT DID YOU JUST DO?',
    description: 'Dwayne Johnson arching single eyebrow in razor sharp suspicion.',
    dataUrl: '/memes/the_rock_eyebrow.gif',
    mediaType: 'gif',
    sourceType: 'REAL_MEDIA',
    rarity: 'RARE',
    soundId: 'CHAD_GONG',
    aspectRatio: 1,
    gestureTags: ['PINCH', 'THUMBS_UP'],
    comboTags: ['THUMBS_UP_AND_DOWN'],
    suggestedActions: ['PINCH', 'THUMBS_UP'],
    tags: ['the rock', 'eyebrow', 'vine boom', 'suspicious', 'judgement'],
  },
  {
    id: 'REAL_MEME_FUTURAMA_FRY',
    title: 'Not Sure If... (Fry Squint)',
    category: 'SUSPICION_JUDGEMENT',
    caption: 'NOT SURE IF SERIOUS // OR TROLLING',
    description: 'Philip J. Fry squinting eyes skeptically in detective mode.',
    dataUrl: '/memes/futurama_fry.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'DRAMATIC_SUSPENSE',
    aspectRatio: 4 / 3,
    gestureTags: ['PINCH'],
    comboTags: ['THUMBS_UP_AND_DOWN'],
    suggestedActions: ['PINCH'],
    tags: ['fry', 'squint', 'futurama', 'skeptical', 'suspicious'],
  },
  {
    id: 'REAL_MEME_MONKEY_PUPPET',
    title: 'Awkward Look Monkey Puppet',
    category: 'SUSPICION_JUDGEMENT',
    caption: 'LOOKS AWAY // PRETENDS NOT TO HEAR',
    description: 'Japanese television puppet looking forward then glancing sideways in guilt.',
    dataUrl: '/memes/monkey_puppet.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'CARTOON_SQUEAK',
    aspectRatio: 16 / 9,
    gestureTags: ['PINCH', 'SWIPE_LEFT'],
    suggestedActions: ['PINCH', 'SWIPE_LEFT'],
    tags: ['monkey', 'puppet', 'side eye', 'awkward', 'guilty'],
  },
  {
    id: 'REAL_MEME_SAME_PICTURE',
    title: 'They Are The Same Picture (Pam Beesly)',
    category: 'SUSPICION_JUDGEMENT',
    caption: 'CORPORATE NEEDS YOU TO FIND THE DIFFERENCE',
    description: 'Pam from The Office holding up two identical pictures with deadpan smile.',
    dataUrl: '/memes/they_are_same_picture.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'CONFIDENT_ENTRANCE',
    aspectRatio: 4 / 3,
    gestureTags: ['PEACE_SIGN', 'PINCH'],
    suggestedActions: ['PEACE_SIGN', 'PINCH'],
    tags: ['the office', 'pam', 'same picture', 'identical', 'judge'],
  },

  // ── 8. FAILURE & DISAPPOINTMENT ──
  {
    id: 'REAL_MEME_SAD_PABLO',
    title: 'Sad Pablo Escobar Waiting',
    category: 'FAILURE_DISAPPOINTMENT',
    caption: 'STILL WAITING // EMOTIONAL VOID',
    description: 'Wagner Moura as Pablo sitting alone in swings and gazing blankly across empty patio.',
    dataUrl: '/memes/sad_pablo_escobar.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'SAD_TROMBONE',
    aspectRatio: 16 / 9,
    gestureTags: ['THUMBS_DOWN'],
    suggestedActions: ['THUMBS_DOWN'],
    tags: ['pablo', 'narcos', 'waiting', 'sad', 'thumbs_down'],
  },
  {
    id: 'REAL_MEME_HAROLD',
    title: 'Hide The Pain Harold (András Arató)',
    category: 'FAILURE_DISAPPOINTMENT',
    caption: 'INTERNAL SCREAMING // KEEP SMILING',
    description: 'Stock photo icon smiling through existential anguish over coffee mug.',
    dataUrl: '/memes/hide_pain_harold.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'SAD_TROMBONE',
    aspectRatio: 1,
    gestureTags: ['THUMBS_UP', 'THUMBS_DOWN'],
    suggestedActions: ['THUMBS_UP', 'THUMBS_DOWN'],
    tags: ['harold', 'pain', 'smile', 'hide the pain', 'struggle'],
  },
  {
    id: 'REAL_MEME_GRIM_REAPER',
    title: 'Grim Reaper Knocking On Doors',
    category: 'FAILURE_DISAPPOINTMENT',
    caption: 'WHO IS NEXT // INEVITABLE DOOM',
    description: 'Scythe wielding cloaked reaper leaving trail of blood behind numbered hallway doors.',
    dataUrl: '/memes/grim_reaper_door.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'UNCOMMON',
    soundId: 'INCEPTION_BRAAAM',
    aspectRatio: 16 / 9,
    gestureTags: ['CLOSED_FIST', 'SWIPE_RIGHT'],
    suggestedActions: ['CLOSED_FIST', 'SWIPE_RIGHT'],
    tags: ['grim reaper', 'doors', 'eliminated', 'game over', 'loss'],
  },

  // ── 9. CHAOS & UNEXPECTED ──
  {
    id: 'REAL_MEME_ELMO_FIRE_GIF',
    title: 'Elmo Rise in Hellfire',
    category: 'CHAOS_UNEXPECTED',
    caption: 'CHAOS CONSUMES ALL 🔥 // MAXIMUM MAYHEM',
    description: 'Red furry Sesame puppet throwing arms to the sky amidst roaring computer flames.',
    dataUrl: '/memes/elmo_fire.gif',
    mediaType: 'gif',
    sourceType: 'REAL_MEDIA',
    rarity: 'RARE',
    soundId: 'INCEPTION_BRAAAM',
    aspectRatio: 4 / 3,
    gestureTags: ['FIVE_FINGERS', 'OPEN_PALM'],
    comboTags: ['BOTH_HANDS_OPEN', 'PERFECT_TEN'],
    suggestedActions: ['FIVE_FINGERS', 'BOTH_HANDS_OPEN', 'PERFECT_TEN'],
    tags: ['elmo', 'fire', 'chaos', 'flames', 'arms up'],
  },
  {
    id: 'REAL_MEME_THIS_IS_FINE',
    title: 'This Is Fine (KC Green)',
    category: 'CHAOS_UNEXPECTED',
    caption: 'THIS IS FINE // CAFE ENTIRELY ON FIRE',
    description: 'Yellow fedora dog calmly drinking coffee at cafe counter while walls burn down.',
    dataUrl: '/memes/this_is_fine.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'INCEPTION_BRAAAM',
    aspectRatio: 4 / 3,
    gestureTags: ['PINCH', 'THUMBS_UP'],
    comboTags: ['THUMBS_UP_AND_DOWN'],
    suggestedActions: ['PINCH', 'THUMBS_UP'],
    tags: ['this is fine', 'fire', 'dog', 'coffee', 'calm'],
  },
  {
    id: 'REAL_MEME_DISASTER_GIRL',
    title: 'Disaster Girl Smirk (Zoe Roth)',
    category: 'CHAOS_UNEXPECTED',
    caption: 'ACCORDING TO PLAN // SMIRKING FIRESTORM',
    description: 'Four year old girl looking back at camera with devilish grin while house blazes.',
    dataUrl: '/memes/disaster_girl.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'RARE',
    soundId: 'DISCO_SLAP',
    aspectRatio: 4 / 3,
    gestureTags: ['PEACE_SIGN', 'CLOSED_FIST'],
    suggestedActions: ['PEACE_SIGN', 'CLOSED_FIST'],
    tags: ['disaster girl', 'house fire', 'smirk', 'villain', 'chaos'],
  },
  {
    id: 'REAL_MEME_LEFT_EXIT',
    title: 'Left Exit 12 Off Ramp Drift',
    category: 'CHAOS_UNEXPECTED',
    caption: 'HARD DRIFT // SUDDEN CHANGE OF HEART',
    description: 'Silver car drastically skidding across highway lanes into the sharp right exit.',
    dataUrl: '/memes/left_exit_ramp.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'SWIPE_WHOOSH',
    aspectRatio: 16 / 9,
    gestureTags: ['SWIPE_LEFT', 'SWIPE_RIGHT'],
    suggestedActions: ['SWIPE_LEFT', 'SWIPE_RIGHT'],
    tags: ['exit ramp', 'drift', 'swerve', 'highway', 'swipe'],
  },
  {
    id: 'REAL_MEME_DISTRACTED_BF',
    title: 'Distracted Boyfriend (Antonio Guillem)',
    category: 'CHAOS_UNEXPECTED',
    caption: 'IMMEDIATELY DISTRACTED // EYE CONTACT LOST',
    description: 'Man walking with girlfriend turning head around to check out passing woman.',
    dataUrl: '/memes/distracted_boyfriend.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'RECORD_SCRATCH',
    aspectRatio: 16 / 9,
    gestureTags: ['POINTING', 'SWIPE_RIGHT'],
    suggestedActions: ['POINTING', 'SWIPE_RIGHT'],
    tags: ['distracted boyfriend', 'stock photo', 'looking back', 'betrayal'],
  },

  // ── 10. FUNNY HAND GESTURES ──
  {
    id: 'REAL_MEME_SPIDERMAN_POINTING',
    title: 'Spider-Man Pointing at Spider-Man',
    category: 'HAND_GESTURE_REACTION',
    caption: 'BRO THAT IS YOU // TARGET DETECTED',
    description: '1967 cartoon twin Spidermen pointing fingers accusingly at each other.',
    dataUrl: '/memes/spiderman_pointing.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'LASER_BEAM',
    aspectRatio: 4 / 3,
    gestureTags: ['POINTING'],
    comboTags: ['ROCK_PAPER_SCISSORS'],
    suggestedActions: ['POINTING'],
    tags: ['spiderman', 'pointing', 'imposter', 'clone', 'target'],
  },
  {
    id: 'REAL_MEME_TRADE_OFFER',
    title: 'Trade Offer (Custom Hands)',
    category: 'HAND_GESTURE_REACTION',
    caption: 'I RECEIVE: HAND GESTURE / YOU RECEIVE: VIRAL MEME',
    description: 'Briskett looking sharply dressed in suit offering formal business deal.',
    dataUrl: '/memes/trade_offer.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'SUCTION_POP',
    aspectRatio: 1,
    gestureTags: ['OPEN_PALM', 'PINCH'],
    suggestedActions: ['OPEN_PALM', 'PINCH'],
    tags: ['trade offer', 'deal', 'suit', 'open palm', 'hands'],
  },
  {
    id: 'REAL_MEME_KPOP_HEART_GIF',
    title: 'Finger Heart (K-Pop Idol Gesture)',
    category: 'HAND_GESTURE_REACTION',
    caption: 'SARANGHAE 🫶 // WHOLESOME HEART UNLOCKED',
    description: 'Thumb and index finger crossed to form mini heart with glowing sparkle aura.',
    dataUrl: '/memes/kpop_heart.gif',
    mediaType: 'gif',
    sourceType: 'REAL_MEDIA',
    rarity: 'RARE',
    soundId: 'VICTORY_BELL',
    aspectRatio: 1,
    gestureTags: ['PINCH'],
    comboTags: ['SECRET_HEART_HANDS'],
    suggestedActions: ['PINCH', 'SECRET_HEART_HANDS'],
    tags: ['finger heart', 'kpop', 'heart', 'pinch', 'wholesome'],
  },
  {
    id: 'REAL_MEME_BERNIE_SUPPORT',
    title: 'I Am Once Again Asking For Support',
    category: 'HAND_GESTURE_REACTION',
    caption: 'I AM ONCE AGAIN ASKING FOR RECOGNITION',
    description: 'Bernie Sanders in brown winter jacket speaking outdoors with plea expression.',
    dataUrl: '/memes/bernie_support.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'COMMON',
    soundId: 'SUCTION_POP',
    aspectRatio: 4 / 3,
    gestureTags: ['OPEN_PALM', 'PINCH'],
    suggestedActions: ['OPEN_PALM', 'PINCH'],
    tags: ['bernie', 'once again asking', 'support', 'gloves', 'open palm'],
  },
  {
    id: 'REAL_MEME_EXPANDING_BRAIN',
    title: 'Expanding Galaxy Brain Levels',
    category: 'APPROVAL_CONFIDENCE',
    caption: 'GALAXY BRAIN ACTIVATED // 999 IQ',
    description: 'Four-tier progression from normal human brain to illuminated cosmic entity.',
    dataUrl: '/memes/expanding_brain.jpg',
    mediaType: 'image',
    sourceType: 'REAL_MEDIA',
    rarity: 'UNCOMMON',
    soundId: 'LEVEL_UP_NOTIFICATION',
    aspectRatio: 1,
    gestureTags: ['THREE_FINGERS', 'FOUR_FINGERS', 'FIVE_FINGERS'],
    comboTags: ['PERFECT_TEN'],
    suggestedActions: ['THREE_FINGERS', 'FOUR_FINGERS', 'FIVE_FINGERS'],
    tags: ['galaxy brain', 'expanding brain', 'iq', 'levels', 'enlightened'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. BUILT-IN ORIGINAL VECTOR MEME GRAPHICS (68 Vector Presets)
// Fully self-contained, lightweight vector art with bold comic aesthetics
// ─────────────────────────────────────────────────────────────────────────────

export const ORIGINAL_VECTOR_MEMES: MemeVisualDefinition[] = [
  {
    id: 'MEME_SURPRISED_PIKACHU',
    title: 'Surprised Shock Face',
    category: 'SHOCK',
    caption: "WHAT JUST HAPPENED?!",
    rarity: 'COMMON',
    suggestedActions: ["T_POSE","OPEN_PALM"],
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
    category: 'CONFIDENCE',
    caption: "ABSOLUTE CHAD // APPROVED",
    rarity: 'COMMON',
    suggestedActions: ["THUMBS_UP","HANDS_ON_HIPS"],
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
    category: 'CONFIDENCE',
    caption: "MISSION SUCCESS // YES!!",
    rarity: 'COMMON',
    suggestedActions: ["CLOSED_FIST","HANDS_RAISED"],
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
    category: 'CELEBRATION',
    caption: "BOOOM // MAXIMUM POWER!",
    rarity: 'COMMON',
    suggestedActions: ["JUMP","SWIPE_RIGHT"],
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
    category: 'SHOCK',
    caption: "BRAIN EXPANSION OVERLOAD",
    rarity: 'UNCOMMON',
    suggestedActions: ["T_POSE","OPEN_PALM"],
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
    category: 'CONFUSION',
    caption: "HALT // CEASE ALL ACTIVITY",
    rarity: 'COMMON',
    suggestedActions: ["OPEN_PALM","ARMS_CROSSED"],
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
    caption: "STANDING OVATION // 10/10",
    rarity: 'COMMON',
    suggestedActions: ["CLAP","HANDS_RAISED"],
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
    category: 'CONFIDENCE',
    caption: "TARGET ACQUIRED // LOCKED IN",
    rarity: 'COMMON',
    suggestedActions: ["POINTING","HANDS_ON_HIPS"],
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
    category: 'CONFIDENCE',
    caption: "PEACE OUT // ZERO STRESS",
    rarity: 'COMMON',
    suggestedActions: ["PEACE_SIGN","HANDS_ON_HIPS"],
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
    category: 'CONFIDENCE',
    caption: "SUPERHERO LANDING // 10/10",
    rarity: 'RARE',
    suggestedActions: ["SQUAT","FLEX_POSE"],
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
    category: 'SUSPICIOUS',
    caption: "VERY SUSPICIOUS // EXTREME DOUBT",
    rarity: 'UNCOMMON',
    suggestedActions: ["ARMS_CROSSED","POINTING"],
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
    category: 'FAILURE',
    caption: "THIS IS COMPLETELY FINE",
    rarity: 'UNCOMMON',
    suggestedActions: ["THUMBS_DOWN","ARMS_CROSSED"],
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
    category: 'SPECIAL',
    caption: "MUCH CODE // VERY TALENT // WOW",
    rarity: 'LEGENDARY',
    suggestedActions: ["T_POSE","FIVE_FINGERS"],
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
    category: 'CONFUSION',
    caption: "HOLDING TINY BRAIN CELLS",
    rarity: 'COMMON',
    suggestedActions: ["PINCH","POINTING"],
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
    category: 'FAILURE',
    caption: "DISAPPROVED // MAJOR L",
    rarity: 'COMMON',
    suggestedActions: ["THUMBS_DOWN","ARMS_CROSSED"],
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
    category: 'CONFIDENCE',
    caption: "TRIFORCE SQUAD ASSEMBLE",
    rarity: 'COMMON',
    suggestedActions: ["THREE_FINGERS","HANDS_RAISED"],
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
    category: 'CONFIDENCE',
    caption: "FOUR ELEMENTS // QUAD POWER",
    rarity: 'COMMON',
    suggestedActions: ["FOUR_FINGERS","FLEX_POSE"],
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
    category: 'CONFUSION',
    caption: "REJECTED // SWIPED OUT",
    rarity: 'COMMON',
    suggestedActions: ["SWIPE_LEFT","OPEN_PALM"],
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
    caption: "SUPER MATCH // SWIPED RIGHT",
    rarity: 'COMMON',
    suggestedActions: ["SWIPE_RIGHT","PEACE_SIGN"],
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
    category: 'FAILURE',
    caption: "WHY ARE YOU LIKE THIS?!",
    rarity: 'COMMON',
    suggestedActions: ["THUMBS_DOWN","ARMS_CROSSED"],
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
    caption: "ABSOLUTE MONARCH // PEAK",
    rarity: 'RARE',
    suggestedActions: ["HANDS_RAISED","FLEX_POSE"],
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

  // ─── V3 ADVANCED MEME ADDITIONS (41 NEW MEMES) ───
  {
    id: 'MEME_WHAT_JUST_HAPPENED',
    title: "What Just Happened?",
    category: 'CONFUSION',
    description: "Swirling spiral eyes and question marks floating around a bewildered cartoon face.",
    caption: "WAIT... WHAT JUST HAPPENED?!",
    aspectRatio: 1.3333333333333333,
    tags: ["confusion","spiral","bewildered","open_palm","dazed"],
    soundId: 'SAD_TROMBONE',
    suggestedActions: ["OPEN_PALM","ZOMBIE_WALK","PINCH"],
    rarity: 'COMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%23312E81%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%22120%22%20r%3D%22100%22%20fill%3D%22%234338CA%22%20opacity%3D%220.4%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Floating%20Question%20Marks%20--%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%2240%22%20y%3D%2260%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2232%22%20fill%3D%22%23A5B4FC%22%20opacity%3D%220.6%22%3E%3F%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22260%22%20y%3D%2270%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2240%22%20fill%3D%22%23A5B4FC%22%20opacity%3D%220.8%22%3E%3F%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22280%22%20y%3D%22160%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2228%22%20fill%3D%22%23A5B4FC%22%20opacity%3D%220.5%22%3E%3F%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%2235%22%20y%3D%22170%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2236%22%20fill%3D%22%23A5B4FC%22%20opacity%3D%220.7%22%3E%3F%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Head%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22160%22%20cy%3D%22115%22%20rx%3D%2265%22%20ry%3D%2260%22%20fill%3D%22%23FED7AA%22%20stroke%3D%22%23111827%22%20stroke-width%3D%225%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Spiral%20Eyes%20--%3E%0A%20%20%20%20%20%20%20%20%3Cg%20stroke%3D%22%23111827%22%20stroke-width%3D%223%22%20fill%3D%22none%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20135%20105%20A%206%206%200%200%201%20141%20111%20A%2012%2012%200%200%201%20129%20111%20A%2018%2018%200%200%201%20147%20111%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20185%20105%20A%206%206%200%200%201%20191%20111%20A%2012%2012%200%200%201%20179%20111%20A%2018%2018%200%200%201%20197%20111%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Wiggly%20Mouth%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20140%20145%20Q%20150%20152%20160%20145%20Q%20170%20138%20180%20145%22%20fill%3D%22none%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Dizzy%20Stars%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22120%2C45%20123%2C53%20131%2C53%20125%2C58%20127%2C66%20120%2C61%20113%2C66%20115%2C58%20109%2C53%20117%2C53%22%20fill%3D%22%23FACC15%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22200%2C45%20203%2C53%20211%2C53%20205%2C58%20207%2C66%20200%2C61%20193%2C66%20195%2C58%20189%2C53%20197%2C53%22%20fill%3D%22%23FACC15%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%23111827%22%20stroke%3D%22%23A5B4FC%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23A5B4FC%22%20letter-spacing%3D%222%22%3EWHAT%20JUST%20HAPPENED%3F!%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_CONFUSED_BRAIN',
    title: "Confused Brain",
    category: 'CONFUSION',
    description: "Cartoon pink brain tangled with tangled electrical sparks and knots.",
    caption: "BRAIN NOT BRAINING RIGHT NOW",
    aspectRatio: 1.3333333333333333,
    tags: ["brain","thinking","overload","knots","the_thinker"],
    soundId: 'CARTOON_SQUEAK',
    suggestedActions: ["THE_THINKER","ZEN_PRAYER"],
    rarity: 'UNCOMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%231E1B4B%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Tangled%20Sparks%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%2040%2080%20Q%2080%2030%20110%2080%20T%20170%2040%20T%20240%2090%20T%20280%2060%22%20fill%3D%22none%22%20stroke%3D%22%23F43F5E%22%20stroke-width%3D%222%22%20stroke-dasharray%3D%224%2C4%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%2050%20160%20Q%2090%20200%20130%20150%20T%20210%20180%20T%20270%20140%22%20fill%3D%22none%22%20stroke%3D%22%2338BDF8%22%20stroke-width%3D%222%22%20stroke-dasharray%3D%224%2C4%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Pink%20Brain%20Lobes%20--%3E%0A%20%20%20%20%20%20%20%20%3Cg%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22125%22%20cy%3D%22110%22%20rx%3D%2245%22%20ry%3D%2240%22%20fill%3D%22%23F472B6%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22195%22%20cy%3D%22110%22%20rx%3D%2245%22%20ry%3D%2240%22%20fill%3D%22%23F472B6%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%2295%22%20r%3D%2235%22%20fill%3D%22%23FB7185%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20120%2090%20C%20110%20110%20135%20125%20120%20140%20C%20145%20130%20150%20110%20160%20120%20C%20170%20110%20175%20130%20200%20140%20C%20185%20125%20210%20110%20200%2090%22%20fill%3D%22none%22%20stroke%3D%22%23BE185D%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Dizzy%20X%20Eyes%20--%3E%0A%20%20%20%20%20%20%20%20%3Cg%20stroke%3D%22%23111827%22%20stroke-width%3D%223%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22135%22%20y1%3D%22105%22%20x2%3D%22147%22%20y2%3D%22117%22%2F%3E%3Cline%20x1%3D%22147%22%20y1%3D%22105%22%20x2%3D%22135%22%20y2%3D%22117%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22173%22%20y1%3D%22105%22%20x2%3D%22185%22%20y2%3D%22117%22%2F%3E%3Cline%20x1%3D%22185%22%20y1%3D%22105%22%20x2%3D%22173%22%20y2%3D%22117%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Drooping%20Sweat%20Drop%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22230%22%20cy%3D%22100%22%20rx%3D%226%22%20ry%3D%2210%22%20fill%3D%22%2338BDF8%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%230F172A%22%20stroke%3D%22%23F472B6%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23F472B6%22%20letter-spacing%3D%221%22%3EBRAIN%20NOT%20BRAINING%20RIGHT%20NOW%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_CALCULATING',
    title: "Calculating...",
    category: 'CONFUSION',
    description: "Complex math formulas, trigonometry, and a spinning loading circle around a confused face.",
    caption: "CALCULATING COMPLEXITY (0% DONE)",
    aspectRatio: 1.3333333333333333,
    tags: ["math","calculating","formulas","the_thinker","geometry"],
    soundId: 'SINGING_BOWL',
    suggestedActions: ["THE_THINKER","THREE_FINGERS","ZEN_PRAYER"],
    rarity: 'COMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%230F172A%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Math%20Formulas%20Floating%20--%3E%0A%20%20%20%20%20%20%20%20%3Cg%20fill%3D%22%2338BDF8%22%20font-family%3D%22monospace%22%20font-size%3D%2211%22%20opacity%3D%220.6%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ctext%20x%3D%2230%22%20y%3D%2245%22%3Esin%C2%B2%CE%B8%20%2B%20cos%C2%B2%CE%B8%20%3D%201%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22190%22%20y%3D%2245%22%3EE%20%3D%20mc%C2%B2%20%3F%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ctext%20x%3D%2225%22%20y%3D%22105%22%3E%E2%88%AB%20x%C2%B2%20dx%20%3D%20x%C2%B3%2F3%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22210%22%20y%3D%22115%22%3Ef'(x)%20%3D%20lim%20%CE%94x%E2%86%920%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ctext%20x%3D%2235%22%20y%3D%22165%22%3E%CF%80%20%E2%89%88%203.14159...%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22205%22%20y%3D%22170%22%3E%E2%88%9A(-1)%20%3D%202%20%2B%202%20%3D%205%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Confused%20Character%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%22115%22%20r%3D%2245%22%20fill%3D%22%23FEF08A%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22145%22%20cy%3D%22108%22%20rx%3D%226%22%20ry%3D%228%22%20fill%3D%22%23111827%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22175%22%20cy%3D%22108%22%20rx%3D%226%22%20ry%3D%228%22%20fill%3D%22%23111827%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20One%20Raised%20Eyebrow%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20138%2095%20Q%20145%2090%20152%2095%22%20fill%3D%22none%22%20stroke%3D%22%23111827%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20168%2090%20Q%20175%2080%20182%2090%22%20fill%3D%22none%22%20stroke%3D%22%23111827%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22160%22%20cy%3D%22130%22%20rx%3D%225%22%20ry%3D%226%22%20fill%3D%22%23111827%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Spinning%20Dashed%20Wheel%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%22115%22%20r%3D%2258%22%20fill%3D%22none%22%20stroke%3D%22%23F59E0B%22%20stroke-width%3D%223%22%20stroke-dasharray%3D%2216%2C8%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%230284C7%22%20stroke%3D%22%23FFF%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2211%22%20fill%3D%22%23FFF%22%20letter-spacing%3D%221%22%3ECALCULATING%20COMPLEXITY%20(0%25%20DONE)%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_ERROR_404_LOGIC',
    title: "Error 404: Logic Not Found",
    category: 'CONFUSION',
    description: "Retro CRT blue-screen terminal with giant flashing 404 block text.",
    caption: "ERROR 404: REASON NOT FOUND",
    aspectRatio: 1.3333333333333333,
    tags: ["404","error","terminal","glitch","retro","four_fingers"],
    soundId: 'RECORD_SCRATCH',
    suggestedActions: ["FOUR_FINGERS","ZOMBIE_WALK"],
    rarity: 'UNCOMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%231E3A8A%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Scanlines%20--%3E%0A%20%20%20%20%20%20%20%20%3Cg%20stroke%3D%22%231D4ED8%22%20stroke-width%3D%221%22%20opacity%3D%220.3%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%220%22%20y1%3D%2220%22%20x2%3D%22320%22%20y2%3D%2220%22%2F%3E%3Cline%20x1%3D%220%22%20y1%3D%2240%22%20x2%3D%22320%22%20y2%3D%2240%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%220%22%20y1%3D%2260%22%20x2%3D%22320%22%20y2%3D%2260%22%2F%3E%3Cline%20x1%3D%220%22%20y1%3D%2280%22%20x2%3D%22320%22%20y2%3D%2280%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%220%22%20y1%3D%22100%22%20x2%3D%22320%22%20y2%3D%22100%22%2F%3E%3Cline%20x1%3D%220%22%20y1%3D%22120%22%20x2%3D%22320%22%20y2%3D%22120%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%220%22%20y1%3D%22140%22%20x2%3D%22320%22%20y2%3D%22140%22%2F%3E%3Cline%20x1%3D%220%22%20y1%3D%22160%22%20x2%3D%22320%22%20y2%3D%22160%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%220%22%20y1%3D%22180%22%20x2%3D%22320%22%20y2%3D%22180%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Blue%20Screen%20Sad%20Face%20--%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%2250%22%20y%3D%2285%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2252%22%20fill%3D%22%23FFF%22%3E%3A(%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22135%22%20y%3D%2285%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2244%22%20fill%3D%22%23F87171%22%3E404%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Terminal%20Body%20Lines%20--%3E%0A%20%20%20%20%20%20%20%20%3Cg%20fill%3D%22%2393C5FD%22%20font-family%3D%22monospace%22%20font-size%3D%2211%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ctext%20x%3D%2235%22%20y%3D%22120%22%3E%3E%20SYSTEM_HALT%3A%20BRAIN_THREAD_CRASH%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ctext%20x%3D%2235%22%20y%3D%22140%22%3E%3E%20ATTEMPTING%20TO%20REBOOT%20COGNITION...%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ctext%20x%3D%2235%22%20y%3D%22160%22%3E%3E%20STATUS%3A%20LOGIC_MODULE_NOT_FOUND%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%224%22%20fill%3D%22%23000%22%20stroke%3D%22%23F87171%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23F87171%22%20letter-spacing%3D%222%22%3EERROR%20404%3A%20REASON%20NOT%20FOUND%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_WAIT_WHAT',
    title: "Wait, What?",
    category: 'CONFUSION',
    description: "Cartoon double-take expression with oversized magnifying glass and tilted head.",
    caption: "EXCUSE ME... WAIT, WHAT?",
    aspectRatio: 1.3333333333333333,
    tags: ["magnifying_glass","double_take","pinch","open_palm"],
    soundId: 'CARTOON_BOING',
    suggestedActions: ["OPEN_PALM","PINCH"],
    rarity: 'COMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%23475569%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Giant%20Monocle%20%2F%20Magnifying%20Glass%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22130%22%20cy%3D%22105%22%20r%3D%2248%22%20fill%3D%22%23BAE6FD%22%20stroke%3D%22%23F59E0B%22%20stroke-width%3D%227%22%20opacity%3D%220.9%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cline%20x1%3D%2295%22%20y1%3D%22140%22%20x2%3D%2260%22%20y2%3D%22175%22%20stroke%3D%22%23F59E0B%22%20stroke-width%3D%228%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Giant%20Eye%20inside%20glass%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22130%22%20cy%3D%22105%22%20rx%3D%2222%22%20ry%3D%2226%22%20fill%3D%22%23111827%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22136%22%20cy%3D%2298%22%20r%3D%228%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Normal%20Eye%20Outside%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22215%22%20cy%3D%22105%22%20r%3D%2214%22%20fill%3D%22%23FEF08A%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22215%22%20cy%3D%22105%22%20r%3D%225%22%20fill%3D%22%23111827%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Raised%20Eyebrows%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20105%2055%20Q%20130%2040%20155%2055%22%20fill%3D%22none%22%20stroke%3D%22%23F59E0B%22%20stroke-width%3D%225%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20200%2080%20Q%20215%2070%20230%2080%22%20fill%3D%22none%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Tiny%20Shock%20Mouth%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22175%22%20cy%3D%22155%22%20rx%3D%228%22%20ry%3D%2212%22%20fill%3D%22%23111827%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%230F172A%22%20stroke%3D%22%23F59E0B%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2213%22%20fill%3D%22%23F59E0B%22%20letter-spacing%3D%222%22%3EEXCUSE%20ME...%20WAIT%2C%20WHAT%3F%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_QUESTION_MARK_OVERLOAD',
    title: "Question Mark Overload",
    category: 'CONFUSION',
    description: "Gigantic glowing neon 3D question mark bursting from a cloud of comic confusion.",
    caption: "???????????????",
    aspectRatio: 1.3333333333333333,
    tags: ["question","neon","overload","clouds","the_thinker"],
    soundId: 'DRAMATIC_SUSPENSE',
    suggestedActions: ["THE_THINKER","PINCH"],
    rarity: 'UNCOMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Cdefs%3E%0A%20%20%20%20%20%20%20%20%20%20%3ClinearGradient%20id%3D%22q-grad%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23C084FC%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%237E22CE%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3C%2FlinearGradient%3E%0A%20%20%20%20%20%20%20%20%3C%2Fdefs%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%23171717%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Comic%20Puff%20Clouds%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%2280%22%20cy%3D%22150%22%20r%3D%2235%22%20fill%3D%22%23404040%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22240%22%20cy%3D%22150%22%20r%3D%2235%22%20fill%3D%22%23404040%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%22170%22%20r%3D%2245%22%20fill%3D%22%23525252%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Giant%20Glowing%20Question%20Mark%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20125%2075%20C%20125%2045%20195%2045%20195%2075%20C%20195%2095%20160%20105%20160%20130%22%20fill%3D%22none%22%20stroke%3D%22url(%23q-grad)%22%20stroke-width%3D%2222%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%22158%22%20r%3D%2211%22%20fill%3D%22url(%23q-grad)%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Outer%20Glow%20Outline%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20125%2075%20C%20125%2045%20195%2045%20195%2075%20C%20195%2095%20160%20105%20160%20130%22%20fill%3D%22none%22%20stroke%3D%22%23E9D5FF%22%20stroke-width%3D%226%22%20stroke-linecap%3D%22round%22%20opacity%3D%220.7%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%22158%22%20r%3D%224%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2225%22%20y%3D%22195%22%20width%3D%22270%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%233B0764%22%20stroke%3D%22%23C084FC%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22217%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2216%22%20fill%3D%22%23F3E8FF%22%20letter-spacing%3D%224%22%3E%3F%3F%3F%3F%3F%3F%3F%3F%3F%3F%3F%3F%3F%3F%3F%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_JAW_DROP',
    title: "Jaw Drop",
    category: 'SHOCK',
    description: "Cartoon face with an elastic jaw stretched all the way to the floor in disbelief.",
    caption: "JAW PHYSICALLY DETACHED",
    aspectRatio: 1.3333333333333333,
    tags: ["jaw_drop","shock","stunned","t_pose","open_palm"],
    soundId: 'CARTOON_BOING',
    suggestedActions: ["T_POSE","OPEN_PALM"],
    rarity: 'COMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%23881337%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Head%20Top%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22160%22%20cy%3D%2270%22%20rx%3D%2260%22%20ry%3D%2245%22%20fill%3D%22%23FED7AA%22%20stroke%3D%22%23111827%22%20stroke-width%3D%225%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Staring%20Huge%20Eyes%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22140%22%20cy%3D%2265%22%20rx%3D%2216%22%20ry%3D%2220%22%20fill%3D%22%23FFF%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22142%22%20cy%3D%2265%22%20r%3D%227%22%20fill%3D%22%23111827%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22180%22%20cy%3D%2265%22%20rx%3D%2216%22%20ry%3D%2220%22%20fill%3D%22%23FFF%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22178%22%20cy%3D%2265%22%20r%3D%227%22%20fill%3D%22%23111827%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Dropping%20Jaw%20Tube%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%22135%22%20y%3D%2285%22%20width%3D%2250%22%20height%3D%2295%22%20fill%3D%22%234C0519%22%20stroke%3D%22%23111827%22%20stroke-width%3D%225%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22160%22%20cy%3D%22180%22%20rx%3D%2228%22%20ry%3D%2212%22%20fill%3D%22%23FED7AA%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Teeth%20Visible%20in%20Chasm%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%22142%22%20y%3D%2288%22%20width%3D%228%22%20height%3D%2210%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%22154%22%20y%3D%2288%22%20width%3D%228%22%20height%3D%2210%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%22166%22%20y%3D%2288%22%20width%3D%228%22%20height%3D%2210%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Impact%20Sparkles%20at%20Floor%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22120%2C180%20125%2C170%20130%2C180%22%20fill%3D%22%23FACC15%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22190%2C180%20195%2C170%20200%2C180%22%20fill%3D%22%23FACC15%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%23111827%22%20stroke%3D%22%23FDA4AF%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23FDA4AF%22%20letter-spacing%3D%222%22%3EJAW%20PHYSICALLY%20DETACHED%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_ABSOLUTE_SHOCK',
    title: "Absolute Shock",
    category: 'SHOCK',
    description: "High voltage comic lightning strike with electric skeleton flash and upright hair.",
    caption: "ABSOLUTE UNFILTERED SHOCK",
    aspectRatio: 1.3333333333333333,
    tags: ["electric","lightning","shock","jump","open_palm"],
    soundId: 'INCEPTION_BRAAAM',
    suggestedActions: ["JUMP","OPEN_PALM"],
    rarity: 'COMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%23020617%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Big%20Lightning%20Bolt%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22175%2C10%20130%2C95%20165%2C95%20125%2C185%20190%2C85%20155%2C85%22%20fill%3D%22%23FACC15%22%20stroke%3D%22%23FEF08A%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Electrified%20Silhouette%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%22115%22%20r%3D%2245%22%20fill%3D%22%2338BDF8%22%20opacity%3D%220.3%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22160%22%20cy%3D%22115%22%20rx%3D%2235%22%20ry%3D%2232%22%20fill%3D%22%230F172A%22%20stroke%3D%22%2338BDF8%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Spiky%20Hair%20standing%20straight%20up%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22135%2C85%20130%2C55%20145%2C80%20155%2C45%20165%2C80%20175%2C50%20185%2C85%22%20fill%3D%22%23FACC15%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Shocked%20Eyes%20%26%20Mouth%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22148%22%20cy%3D%22112%22%20r%3D%228%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22172%22%20cy%3D%22112%22%20r%3D%228%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22160%22%20cy%3D%22132%22%20rx%3D%2210%22%20ry%3D%228%22%20fill%3D%22%23F87171%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Sparks%20--%3E%0A%20%20%20%20%20%20%20%20%3Cg%20stroke%3D%22%23FACC15%22%20stroke-width%3D%222%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%2270%22%20y1%3D%2290%22%20x2%3D%2290%22%20y2%3D%22100%22%2F%3E%3Cline%20x1%3D%22250%22%20y1%3D%2290%22%20x2%3D%22230%22%20y2%3D%22100%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%2280%22%20y1%3D%22140%22%20x2%3D%22105%22%20y2%3D%22135%22%2F%3E%3Cline%20x1%3D%22240%22%20y1%3D%22140%22%20x2%3D%22215%22%20y2%3D%22135%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%230F172A%22%20stroke%3D%22%23FACC15%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23FACC15%22%20letter-spacing%3D%222%22%3EABSOLUTE%20UNFILTERED%20SHOCK%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_PLOT_TWIST',
    title: "Unexpected Plot Twist",
    category: 'SHOCK',
    description: "Dramatic vintage cinema projector with bold top 10 anime plot twist warning.",
    caption: "NOBODY PREDICTED THIS PLOT TWIST",
    aspectRatio: 1.3333333333333333,
    tags: ["plot_twist","cinema","dramatic","open_palm","arms_crossed"],
    soundId: 'DRAMATIC_SUSPENSE',
    suggestedActions: ["OPEN_PALM","ARMS_CROSSED"],
    rarity: 'UNCOMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%2309090B%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Dramatic%20Red%20Spotlight%20Cone%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22160%2C25%2030%2C190%20290%2C190%22%20fill%3D%22%23DC2626%22%20opacity%3D%220.25%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Film%20Reel%20Circles%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%2265%22%20r%3D%2230%22%20fill%3D%22%2327272A%22%20stroke%3D%22%23E4E4E7%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%2265%22%20r%3D%228%22%20fill%3D%22%23E4E4E7%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Dramatic%20Warning%20Stamp%20Card%20--%3E%0A%20%20%20%20%20%20%20%20%3Cg%20transform%3D%22translate(45%2C%20105)%20rotate(-3)%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Crect%20width%3D%22230%22%20height%3D%2250%22%20rx%3D%224%22%20fill%3D%22%23FEF08A%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22115%22%20y%3D%2228%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2214%22%20fill%3D%22%23DC2626%22%3ETOP%2010%20ANIME%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22115%22%20y%3D%2244%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2215%22%20fill%3D%22%23111827%22%20letter-spacing%3D%222%22%3EPLOT%20TWISTS%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%2318181B%22%20stroke%3D%22%23DC2626%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2211%22%20fill%3D%22%23FEF08A%22%20letter-spacing%3D%221%22%3ENOBODY%20PREDICTED%20THIS%20PLOT%20TWIST%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_EYES_WIDE_OPEN',
    title: "Eyes Wide Open",
    category: 'SHOCK',
    description: "Massive cartoon eyeballs popping straight out on steel spring coils.",
    caption: "CANNOT UNSEE WHAT WAS SEEN",
    aspectRatio: 1.3333333333333333,
    tags: ["eyes","springs","cartoon","pointing","open_palm"],
    soundId: 'CARTOON_SQUEAK',
    suggestedActions: ["POINTING","OPEN_PALM"],
    rarity: 'COMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%231C1917%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Spring%20Coils%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20120%20140%20Q%20110%20120%20120%20100%20Q%20130%2080%20120%2060%22%20fill%3D%22none%22%20stroke%3D%22%23A8A29E%22%20stroke-width%3D%226%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20200%20140%20Q%20210%20120%20200%20100%20Q%20190%2080%20200%2060%22%20fill%3D%22none%22%20stroke%3D%22%23A8A29E%22%20stroke-width%3D%226%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Popped%20Giant%20Eyeballs%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22120%22%20cy%3D%2265%22%20r%3D%2235%22%20fill%3D%22%23FFF%22%20stroke%3D%22%23111827%22%20stroke-width%3D%225%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22120%22%20cy%3D%2265%22%20r%3D%2214%22%20fill%3D%22%230284C7%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22120%22%20cy%3D%2265%22%20r%3D%226%22%20fill%3D%22%23111827%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22125%22%20cy%3D%2260%22%20r%3D%224%22%20fill%3D%22%23FFF%22%2F%3E%0A%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22200%22%20cy%3D%2265%22%20r%3D%2235%22%20fill%3D%22%23FFF%22%20stroke%3D%22%23111827%22%20stroke-width%3D%225%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22200%22%20cy%3D%2265%22%20r%3D%2214%22%20fill%3D%22%230284C7%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22200%22%20cy%3D%2265%22%20r%3D%226%22%20fill%3D%22%23111827%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22205%22%20cy%3D%2260%22%20r%3D%224%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Open%20Gaping%20Mouth%20at%20Base%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22160%22%20cy%3D%22160%22%20rx%3D%2230%22%20ry%3D%2220%22%20fill%3D%22%23DC2626%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%230C0A09%22%20stroke%3D%22%2338BDF8%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%2338BDF8%22%20letter-spacing%3D%221%22%3ECANNOT%20UNSEE%20WHAT%20WAS%20SEEN%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_BRO_WHAT',
    title: "Bro What?",
    category: 'SHOCK',
    description: "High contrast dramatic skull / stunned face bathed in moody half-tone shadows.",
    caption: "BRO... ARE YOU SERIOUS RIGHT NOW?",
    aspectRatio: 1.3333333333333333,
    tags: ["bro_what","skull","serious","open_palm","arms_crossed"],
    soundId: 'CHAD_GONG',
    suggestedActions: ["OPEN_PALM","ARMS_CROSSED"],
    rarity: 'UNCOMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%23000%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Comic%20Half-tone%20Stunned%20Silhouette%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%22100%22%20r%3D%2260%22%20fill%3D%22%231E293B%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Deep%20Shadow%20Face%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20120%2075%20Q%20160%2065%20200%2075%20L%20195%20140%20Q%20160%20160%20125%20140%20Z%22%20fill%3D%22%23334155%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Staring%20Black%20Hollow%20Eye%20Sockets%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22140%22%20cy%3D%2295%22%20rx%3D%2214%22%20ry%3D%2218%22%20fill%3D%22%23000%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22180%22%20cy%3D%2295%22%20rx%3D%2214%22%20ry%3D%2218%22%20fill%3D%22%23000%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Tiny%20white%20pupil%20glint%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22140%22%20cy%3D%2295%22%20r%3D%223%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22180%22%20cy%3D%2295%22%20r%3D%223%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Flat%20Unimpressed%20Line%20Mouth%20--%3E%0A%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22140%22%20y1%3D%22135%22%20x2%3D%22180%22%20y2%3D%22135%22%20stroke%3D%22%23000%22%20stroke-width%3D%225%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bold%20Comic%20Vignette%20Lines%20--%3E%0A%20%20%20%20%20%20%20%20%3Cline%20x1%3D%2220%22%20y1%3D%2220%22%20x2%3D%2270%22%20y2%3D%2260%22%20stroke%3D%22%23475569%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22300%22%20y1%3D%2220%22%20x2%3D%22250%22%20y2%3D%2260%22%20stroke%3D%22%23475569%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%230F172A%22%20stroke%3D%22%23E2E8F0%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23FFF%22%20letter-spacing%3D%221%22%3EBRO...%20ARE%20YOU%20SERIOUS%20RIGHT%20NOW%3F%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_SYSTEM_OVERLOAD',
    title: "System Overload",
    category: 'SHOCK',
    description: "Robot head with exploding steam vents and emergency meter redlined at 999%.",
    caption: "CRITICAL SYSTEM OVERLOAD!",
    aspectRatio: 1.3333333333333333,
    tags: ["robot","overload","critical","closed_fist","jump"],
    soundId: 'AIR_HORN',
    suggestedActions: ["CLOSED_FIST","JUMP"],
    rarity: 'COMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%23450A0A%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Steam%20Clouds%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%2280%22%20cy%3D%2270%22%20rx%3D%2235%22%20ry%3D%2225%22%20fill%3D%22%23E2E8F0%22%20opacity%3D%220.6%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22240%22%20cy%3D%2270%22%20rx%3D%2235%22%20ry%3D%2225%22%20fill%3D%22%23E2E8F0%22%20opacity%3D%220.6%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Robot%20Head%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%22110%22%20y%3D%2260%22%20width%3D%22100%22%20height%3D%2295%22%20rx%3D%228%22%20fill%3D%22%2371717A%22%20stroke%3D%22%23111827%22%20stroke-width%3D%225%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Antenna%20with%20Sparks%20--%3E%0A%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22160%22%20y1%3D%2260%22%20x2%3D%22160%22%20y2%3D%2230%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%2225%22%20r%3D%228%22%20fill%3D%22%23EF4444%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Red%20Glowing%20Eyes%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%22125%22%20y%3D%2285%22%20width%3D%2228%22%20height%3D%2218%22%20fill%3D%22%23EF4444%22%20stroke%3D%22%23111827%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%22167%22%20y%3D%2285%22%20width%3D%2228%22%20height%3D%2218%22%20fill%3D%22%23EF4444%22%20stroke%3D%22%23111827%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Gauge%20at%20999%25%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%22125%22%20y%3D%22120%22%20width%3D%2270%22%20height%3D%2222%22%20rx%3D%223%22%20fill%3D%22%23000%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22136%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23EF4444%22%3E999%25%20HEAT%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%2318181B%22%20stroke%3D%22%23EF4444%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2213%22%20fill%3D%22%23EF4444%22%20letter-spacing%3D%222%22%3ECRITICAL%20SYSTEM%20OVERLOAD!%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_MAIN_CHARACTER',
    title: "Main Character Energy",
    category: 'CONFIDENCE',
    description: "Dramatic golden sunburst backlighting with heroic windblown anime silhouette.",
    caption: "MAIN CHARACTER ENERGY UNLOCKED",
    aspectRatio: 1.3333333333333333,
    tags: ["main_character","aura","anime","t_pose","flex_pose"],
    soundId: 'CONFIDENT_ENTRANCE',
    suggestedActions: ["T_POSE","FLEX_POSE","DOUBLE_BICEPS_FLEX"],
    rarity: 'UNCOMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Cdefs%3E%0A%20%20%20%20%20%20%20%20%20%20%3CradialGradient%20id%3D%22mc-sun%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2250%25%22%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23FEF08A%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%2260%25%22%20stop-color%3D%22%23F59E0B%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%2378350F%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3C%2FradialGradient%3E%0A%20%20%20%20%20%20%20%20%3C%2Fdefs%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22url(%23mc-sun)%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Radiant%20Starburst%20Lines%20--%3E%0A%20%20%20%20%20%20%20%20%3Cg%20stroke%3D%22%23FFF%22%20stroke-width%3D%223%22%20opacity%3D%220.4%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22160%22%20y1%3D%22120%22%20x2%3D%2230%22%20y2%3D%2220%22%2F%3E%3Cline%20x1%3D%22160%22%20y1%3D%22120%22%20x2%3D%22290%22%20y2%3D%2220%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22160%22%20y1%3D%22120%22%20x2%3D%220%22%20y2%3D%22120%22%2F%3E%3Cline%20x1%3D%22160%22%20y1%3D%22120%22%20x2%3D%22320%22%20y2%3D%22120%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22160%22%20y1%3D%22120%22%20x2%3D%2240%22%20y2%3D%22220%22%2F%3E%3Cline%20x1%3D%22160%22%20y1%3D%22120%22%20x2%3D%22280%22%20y2%3D%22220%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Hero%20Silhouette%20--%3E%0A%20%20%20%20%20%20%20%20%3Cg%20fill%3D%22%2318181B%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%2275%22%20r%3D%2228%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3C!--%20Windblown%20Cape%20--%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22135%2C100%2070%2C175%20140%2C140%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22185%2C100%20250%2C175%20180%2C140%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3C!--%20Torso%20--%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22135%2C100%20185%2C100%20170%2C175%20150%2C175%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Gleaming%20Sunglasses%20Lens%20Flare%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%22145%22%20y%3D%2270%22%20width%3D%2230%22%20height%3D%228%22%20rx%3D%222%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22135%22%20y1%3D%2274%22%20x2%3D%22185%22%20y2%3D%2274%22%20stroke%3D%22%2338BDF8%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2215%22%20y%3D%22195%22%20width%3D%22290%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%23000%22%20stroke%3D%22%23FEF08A%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23FEF08A%22%20letter-spacing%3D%221%22%3EMAIN%20CHARACTER%20ENERGY%20UNLOCKED%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_MAXIMUM_AURA',
    title: "Maximum Aura",
    category: 'CONFIDENCE',
    description: "Celestial purple flames with pixel sunglasses and +1,000,000 AURA badge.",
    caption: "+1,000,000 AURA // UNTOUCHABLE",
    aspectRatio: 1.3333333333333333,
    tags: ["aura","confidence","shades","hands_on_hips","thumbs_up"],
    soundId: 'ANIME_POWER_UP',
    suggestedActions: ["HANDS_ON_HIPS","THUMBS_UP","FLEX_POSE"],
    rarity: 'RARE',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%232E1065%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Aura%20Flame%20Waves%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%2090%20180%20C%2070%20120%20110%2080%20160%2040%20C%20210%2080%20250%20120%20230%20180%20Z%22%20fill%3D%22%23A855F7%22%20opacity%3D%220.6%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20110%20180%20C%2095%20130%20125%20100%20160%2065%20C%20195%20100%20225%20130%20210%20180%20Z%22%20fill%3D%22%23C084FC%22%20opacity%3D%220.8%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Pixel%20Sunglasses%20--%3E%0A%20%20%20%20%20%20%20%20%3Cg%20fill%3D%22%23000%22%20stroke%3D%22%23FFF%22%20stroke-width%3D%221.5%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Crect%20x%3D%22115%22%20y%3D%2295%22%20width%3D%2240%22%20height%3D%2216%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Crect%20x%3D%22165%22%20y%3D%2295%22%20width%3D%2240%22%20height%3D%2216%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Crect%20x%3D%22155%22%20y%3D%2299%22%20width%3D%2210%22%20height%3D%226%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3C!--%20Lens%20Glint%20--%3E%0A%20%20%20%20%20%20%20%20%20%20%3Crect%20x%3D%22120%22%20y%3D%2298%22%20width%3D%226%22%20height%3D%224%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Crect%20x%3D%22170%22%20y%3D%2298%22%20width%3D%226%22%20height%3D%224%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Smirk%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20148%20135%20Q%20160%20145%20174%20133%22%20fill%3D%22none%22%20stroke%3D%22%23FEF08A%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Golden%20Aura%20Badge%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2285%22%20y%3D%22152%22%20width%3D%22150%22%20height%3D%2224%22%20rx%3D%224%22%20fill%3D%22%23FACC15%22%20stroke%3D%22%23111827%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22168%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2211%22%20fill%3D%22%23000%22%3E%2B1%2C000%2C000%20AURA%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2215%22%20y%3D%22195%22%20width%3D%22290%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%23000%22%20stroke%3D%22%23A855F7%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23E9D5FF%22%20letter-spacing%3D%221%22%3E%2B1%2C000%2C000%20AURA%20%2F%2F%20UNTOUCHABLE%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_ABSOLUTE_CHAD_CHIN',
    title: "Absolute Chad Jawline",
    category: 'CONFIDENCE',
    description: "Chiseled Grecian statue jawline with sparkling white tooth twinkle star.",
    caption: "AVERAGE ACTION ENJOYER",
    aspectRatio: 1.3333333333333333,
    tags: ["chad","jawline","chiseled","thumbs_up","hands_on_hips"],
    soundId: 'CHAD_GONG',
    suggestedActions: ["THUMBS_UP","HANDS_ON_HIPS","FLEX_POSE"],
    rarity: 'UNCOMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%231C1917%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Marble%20Statue%20Contour%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22120%2C40%20200%2C40%20220%2C105%20180%2C165%20140%2C165%20100%2C105%22%20fill%3D%22%23D6D3D1%22%20stroke%3D%22%23111827%22%20stroke-width%3D%226%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Ultra%20Chiseled%20Chin%20Cutout%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22140%2C165%20180%2C165%20170%2C185%20150%2C185%22%20fill%3D%22%23A8A29E%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Determined%20Narrow%20Brow%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22115%2C75%20155%2C85%20155%2C75%20115%2C65%22%20fill%3D%22%2344403C%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22205%2C75%20165%2C85%20165%2C75%20205%2C65%22%20fill%3D%22%2344403C%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Sparkling%20Star%20Glint%20on%20Tooth%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22175%2C135%20178%2C125%20181%2C135%20191%2C138%20181%2C141%20178%2C151%20175%2C141%20165%2C138%22%20fill%3D%22%23FACC15%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22178%22%20cy%3D%22138%22%20r%3D%223%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%230C0A09%22%20stroke%3D%22%23E7E5E4%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2213%22%20fill%3D%22%23E7E5E4%22%20letter-spacing%3D%222%22%3EAVERAGE%20ACTION%20ENJOYER%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_VICTORY_ACHIEVED',
    title: "Victory Achieved",
    category: 'CONFIDENCE',
    description: "Golden championship cup with royal laurel wreath and celebratory ribbons.",
    caption: "VICTORY SECURED // FLAWLESS",
    aspectRatio: 1.3333333333333333,
    tags: ["trophy","victory","winner","hands_raised","five_fingers"],
    soundId: 'VICTORY_BELL',
    suggestedActions: ["HANDS_RAISED","FIVE_FINGERS"],
    rarity: 'COMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%23064E3B%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Laurel%20Leaves%20--%3E%0A%20%20%20%20%20%20%20%20%3Cg%20fill%3D%22%2310B981%22%20stroke%3D%22%23111827%22%20stroke-width%3D%222%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%2290%22%20cy%3D%2290%22%20rx%3D%2214%22%20ry%3D%228%22%20transform%3D%22rotate(-30%2090%2090)%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%2285%22%20cy%3D%22120%22%20rx%3D%2214%22%20ry%3D%228%22%20transform%3D%22rotate(-15%2085%20120)%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%2295%22%20cy%3D%22150%22%20rx%3D%2214%22%20ry%3D%228%22%20transform%3D%22rotate(10%2095%20150)%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22230%22%20cy%3D%2290%22%20rx%3D%2214%22%20ry%3D%228%22%20transform%3D%22rotate(30%20230%2090)%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22235%22%20cy%3D%22120%22%20rx%3D%2214%22%20ry%3D%228%22%20transform%3D%22rotate(15%20235%20120)%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22225%22%20cy%3D%22150%22%20rx%3D%2214%22%20ry%3D%228%22%20transform%3D%22rotate(-10%20225%20150)%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Golden%20Trophy%20Cup%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20120%2050%20L%20200%2050%20L%20190%20120%20C%20190%20145%20130%20145%20130%20120%20Z%22%20fill%3D%22%23FACC15%22%20stroke%3D%22%23111827%22%20stroke-width%3D%225%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Handles%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20120%2065%20C%2095%2065%2095%20105%20125%20105%22%20fill%3D%22none%22%20stroke%3D%22%23FACC15%22%20stroke-width%3D%226%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20200%2065%20C%20225%2065%20225%20105%20195%20105%22%20fill%3D%22none%22%20stroke%3D%22%23FACC15%22%20stroke-width%3D%226%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Stem%20%26%20Base%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%22150%22%20y%3D%22138%22%20width%3D%2220%22%20height%3D%2225%22%20fill%3D%22%23EAB308%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%22125%22%20y%3D%22163%22%20width%3D%2270%22%20height%3D%2216%22%20rx%3D%223%22%20fill%3D%22%23B45309%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Star%20on%20Trophy%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22160%2C80%20163%2C88%20171%2C88%20165%2C93%20167%2C101%20160%2C96%20153%2C101%20155%2C93%20149%2C88%20157%2C88%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%23065F46%22%20stroke%3D%22%23FACC15%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23FACC15%22%20letter-spacing%3D%222%22%3EVICTORY%20SECURED%20%2F%2F%20FLAWLESS%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_UNSTOPPABLE',
    title: "Unstoppable Momentum",
    category: 'CONFIDENCE',
    description: "Blazing fireball comet hurtling forward with sunglasses leaving a trail of sparks.",
    caption: "NOTHING CAN STOP THIS MOMENTUM",
    aspectRatio: 1.3333333333333333,
    tags: ["unstoppable","comet","fireball","swipe_right","flex_pose"],
    soundId: 'LASER_BEAM',
    suggestedActions: ["SWIPE_RIGHT","FLEX_POSE"],
    rarity: 'COMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%2318181B%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Comet%20Flame%20Trail%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%2250%2C110%20160%2C40%20220%2C110%20160%2C180%22%20fill%3D%22%23EA580C%22%20opacity%3D%220.8%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%2280%2C110%20170%2C60%20210%2C110%20170%2C160%22%20fill%3D%22%23F59E0B%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Flaming%20Core%20Sphere%20with%20Sunglasses%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22200%22%20cy%3D%22110%22%20r%3D%2242%22%20fill%3D%22%23FACC15%22%20stroke%3D%22%23111827%22%20stroke-width%3D%225%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%22180%22%20y%3D%2298%22%20width%3D%2245%22%20height%3D%2214%22%20rx%3D%222%22%20fill%3D%22%23111827%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22185%2C102%20195%2C102%20190%2C108%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22210%2C102%20220%2C102%20215%2C108%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Speed%20Streaks%20--%3E%0A%20%20%20%20%20%20%20%20%3Cline%20x1%3D%2220%22%20y1%3D%2270%22%20x2%3D%22110%22%20y2%3D%2270%22%20stroke%3D%22%23F97316%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cline%20x1%3D%2240%22%20y1%3D%22150%22%20x2%3D%22130%22%20y2%3D%22150%22%20stroke%3D%22%23F97316%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2215%22%20y%3D%22195%22%20width%3D%22290%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%23000%22%20stroke%3D%22%23F97316%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2211%22%20fill%3D%22%23FEF08A%22%20letter-spacing%3D%221%22%3ENOTHING%20CAN%20STOP%20THIS%20MOMENTUM%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_PERFECT_EXECUTION',
    title: "Perfect Execution",
    category: 'CONFIDENCE',
    description: "Glowing 100/100 score card with golden SSS-Rank royal stamp.",
    caption: "100/100 // PERFECT EXECUTION",
    aspectRatio: 1.3333333333333333,
    tags: ["perfect","score","sss_rank","clap","thumbs_up"],
    soundId: 'LEVEL_UP_NOTIFICATION',
    suggestedActions: ["CLAP","THUMBS_UP"],
    rarity: 'COMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%230F172A%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Score%20Card%20Board%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2260%22%20y%3D%2235%22%20width%3D%22200%22%20height%3D%22140%22%20rx%3D%228%22%20fill%3D%22%23F8FAFC%22%20stroke%3D%22%231E293B%22%20stroke-width%3D%226%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Red%20Triple%20S%20Rank%20Badge%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%2285%22%20r%3D%2234%22%20fill%3D%22%23DC2626%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%2296%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2228%22%20fill%3D%22%23FEF08A%22%3ESSS%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3C!--%20100%2F100%20Score%20--%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22150%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2224%22%20fill%3D%22%230F172A%22%20letter-spacing%3D%222%22%3E100%20%2F%20100%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Gold%20Stars%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%2285%2C145%2088%2C138%2095%2C138%2090%2C143%2092%2C150%2085%2C146%2078%2C150%2080%2C143%2075%2C138%2082%2C138%22%20fill%3D%22%23EAB308%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22235%2C145%20238%2C138%20245%2C138%20240%2C143%20242%2C150%20235%2C146%20228%2C150%20230%2C143%20225%2C138%20232%2C138%22%20fill%3D%22%23EAB308%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%231E293B%22%20stroke%3D%22%23FEF08A%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23FEF08A%22%20letter-spacing%3D%222%22%3E100%2F100%20%2F%2F%20PERFECT%20EXECUTION%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_SKILL_ISSUE',
    title: "Skill Issue",
    category: 'FAILURE',
    description: "Deflating pixel balloon with giant red down-vote arrow and critical miss indicator.",
    caption: "PURE AND UNADULTERATED SKILL ISSUE",
    aspectRatio: 1.3333333333333333,
    tags: ["skill_issue","failure","balloon","thumbs_down","squat"],
    soundId: 'SAD_TROMBONE',
    suggestedActions: ["THUMBS_DOWN","SQUAT","SWIPE_LEFT"],
    rarity: 'COMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%233F3F46%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Deflated%20Squeezed%20Balloon%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22160%22%20cy%3D%2290%22%20rx%3D%2245%22%20ry%3D%2230%22%20fill%3D%22%23EF4444%22%20stroke%3D%22%23111827%22%20stroke-width%3D%225%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22115%2C90%20100%2C85%20100%2C95%22%20fill%3D%22%23EF4444%22%20stroke%3D%22%23111827%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Escaping%20Air%20Whistle%20Lines%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%2090%2090%20Q%2070%2080%2050%2090%22%20fill%3D%22none%22%20stroke%3D%22%23FFF%22%20stroke-width%3D%223%22%20stroke-dasharray%3D%224%2C4%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Giant%20Down%20Arrow%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22160%2C180%20135%2C135%20150%2C135%20150%2C115%20170%2C115%20170%2C135%20185%2C135%22%20fill%3D%22%23DC2626%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%2285%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2218%22%20fill%3D%22%23FFF%22%3EL%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2215%22%20y%3D%22195%22%20width%3D%22290%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%2318181B%22%20stroke%3D%22%23EF4444%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2211%22%20fill%3D%22%23FCA5A5%22%20letter-spacing%3D%221%22%3EPURE%20AND%20UNADULTERATED%20SKILL%20ISSUE%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_EMOTIONAL_DAMAGE',
    title: "Emotional Damage",
    category: 'FAILURE',
    description: "Shattered crystal heart with -99,999 HP critical hit damage pop.",
    caption: "CRITICAL HIT: EMOTIONAL DAMAGE",
    aspectRatio: 1.3333333333333333,
    tags: ["emotional_damage","heart","broken","closed_fist","thumbs_down"],
    soundId: 'CARTOON_IMPACT',
    suggestedActions: ["CLOSED_FIST","THUMBS_DOWN"],
    rarity: 'COMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%2327272A%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Shattered%20Heart%20Halves%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20155%2070%20C%20130%2040%2095%2060%2095%2090%20C%2095%20125%20155%20160%20155%20160%20Z%22%20fill%3D%22%23E11D48%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20165%2070%20C%20190%2040%20225%2060%20225%2090%20C%20225%20125%20165%20160%20165%20160%20Z%22%20fill%3D%22%23BE123C%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Jagged%20Crack%20Between%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20158%2055%20L%20163%2080%20L%20153%20105%20L%20165%20130%20L%20160%20160%22%20fill%3D%22none%22%20stroke%3D%22%23FEF08A%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Damage%20Pop%20Number%20--%3E%0A%20%20%20%20%20%20%20%20%3Cg%20transform%3D%22translate(160%2C%2095)%20rotate(-8)%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Crect%20x%3D%22-70%22%20y%3D%22-18%22%20width%3D%22140%22%20height%3D%2232%22%20rx%3D%224%22%20fill%3D%22%23000%22%20stroke%3D%22%23EF4444%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ctext%20x%3D%220%22%20y%3D%225%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2216%22%20fill%3D%22%23F87171%22%3E-99%2C999%20HP%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%2309090B%22%20stroke%3D%22%23E11D48%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23FDA4AF%22%20letter-spacing%3D%221%22%3ECRITICAL%20HIT%3A%20EMOTIONAL%20DAMAGE%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_MISSION_FAILED',
    title: "Mission Failed",
    category: 'FAILURE',
    description: "Retro military HUD overlay with flashing red text: MISSION FAILED.",
    caption: "MISSION FAILED // WE'LL GET 'EM NEXT TIME",
    aspectRatio: 1.3333333333333333,
    tags: ["mission_failed","hud","game_over","squat","swipe_left"],
    soundId: 'SAD_TROMBONE',
    suggestedActions: ["SQUAT","SWIPE_LEFT","CLOSED_FIST"],
    rarity: 'COMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%2309090B%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Tactical%20Reticle%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%22100%22%20r%3D%2260%22%20fill%3D%22none%22%20stroke%3D%22%23EF4444%22%20stroke-width%3D%222%22%20stroke-dasharray%3D%2212%2C6%22%20opacity%3D%220.4%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Huge%20Red%20Stamp%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2235%22%20y%3D%2270%22%20width%3D%22250%22%20height%3D%2255%22%20rx%3D%224%22%20fill%3D%22%237F1D1D%22%20stroke%3D%22%23EF4444%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22105%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2222%22%20fill%3D%22%23FEF2F2%22%20letter-spacing%3D%223%22%3EMISSION%20FAILED%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Static%20Subtitle%20--%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22150%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22bold%22%20font-size%3D%2212%22%20fill%3D%22%23EF4444%22%3EWE'LL%20GET%20'EM%20NEXT%20TIME%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%2318181B%22%20stroke%3D%22%23DC2626%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2210%22%20fill%3D%22%23FECACA%22%20letter-spacing%3D%221%22%3EMISSION%20FAILED%20%2F%2F%20WE'LL%20GET%20'EM%20NEXT%20TIME%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_NOT_PROUDEST_MOMENT',
    title: "Not My Proudest Moment",
    category: 'FAILURE',
    description: "Cardboard box hiding on the floor with two timid cartoon eyes peeking out.",
    caption: "NOT MY PROUDEST MOMENT HONESTLY",
    aspectRatio: 1.3333333333333333,
    tags: ["box","hiding","shame","zombie_walk","squat"],
    soundId: 'CARTOON_SQUEAK',
    suggestedActions: ["ZOMBIE_WALK","SQUAT"],
    rarity: 'UNCOMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%23292524%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Cardboard%20Box%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%2280%2C95%20160%2C65%20240%2C95%20160%2C125%22%20fill%3D%22%23D97706%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%2280%2C95%20160%2C125%20160%2C180%2080%2C150%22%20fill%3D%22%23B45309%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22240%2C95%20160%2C125%20160%2C180%20240%2C150%22%20fill%3D%22%2392400E%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Eye%20Slit%20Opening%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%22135%22%20y%3D%22135%22%20width%3D%2250%22%20height%3D%2215%22%20rx%3D%223%22%20fill%3D%22%23000%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Peeking%20Eyes%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22150%22%20cy%3D%22142%22%20rx%3D%225%22%20ry%3D%224%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22151%22%20cy%3D%22142%22%20r%3D%222%22%20fill%3D%22%23000%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22170%22%20cy%3D%22142%22%20rx%3D%225%22%20ry%3D%224%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22171%22%20cy%3D%22142%22%20r%3D%222%22%20fill%3D%22%23000%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%231C1917%22%20stroke%3D%22%23D97706%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2211%22%20fill%3D%22%23FDE68A%22%20letter-spacing%3D%221%22%3ENOT%20MY%20PROUDEST%20MOMENT%20HONESTLY%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_CRITICAL_FAILURE',
    title: "Critical Failure",
    category: 'FAILURE',
    description: "Flaming 20-sided D&D dice showing a natural 1 engulfed in embers.",
    caption: "NATURAL 1 // CRITICAL DISASTER",
    aspectRatio: 1.3333333333333333,
    tags: ["d20","natural_1","critical_fail","closed_fist","squat"],
    soundId: 'CARTOON_IMPACT',
    suggestedActions: ["CLOSED_FIST","SQUAT"],
    rarity: 'UNCOMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%2318181B%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Flames%20Behind%20Dice%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22160%2C20%20120%2C90%20200%2C90%22%20fill%3D%22%23EA580C%22%20opacity%3D%220.7%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22140%2C40%20100%2C110%20180%2C110%22%20fill%3D%22%23F59E0B%22%20opacity%3D%220.8%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20D20%20Triangle%20Shape%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22160%2C50%2095%2C150%20225%2C150%22%20fill%3D%22%23450A0A%22%20stroke%3D%22%23DC2626%22%20stroke-width%3D%225%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22160%2C50%20160%2C150%2095%2C150%22%20fill%3D%22%237F1D1D%22%20stroke%3D%22%23DC2626%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Big%20Number%201%20on%20Dice%20--%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22125%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2244%22%20fill%3D%22%23FEF08A%22%3E1%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Embers%20%26%20Sparks%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%2290%22%20cy%3D%2260%22%20r%3D%223%22%20fill%3D%22%23F59E0B%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22230%22%20cy%3D%2270%22%20r%3D%224%22%20fill%3D%22%23F59E0B%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%2230%22%20r%3D%223%22%20fill%3D%22%23EF4444%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%2309090B%22%20stroke%3D%22%23DC2626%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23FCA5A5%22%20letter-spacing%3D%222%22%3ENATURAL%201%20%2F%2F%20CRITICAL%20DISASTER%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_SIDE_EYE',
    title: "Bombastic Side Eye",
    category: 'SUSPICIOUS',
    description: "Unreal horizontal side-glance with single high eyebrow and criminal suspicion.",
    caption: "CRIMINAL OFFENSIVE SIDE EYE",
    aspectRatio: 1.3333333333333333,
    tags: ["side_eye","suspicious","judgment","arms_crossed","pointing"],
    soundId: 'DISCO_SLAP',
    suggestedActions: ["ARMS_CROSSED","POINTING"],
    rarity: 'COMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%2314532D%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Silhouette%20Face%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22160%22%20cy%3D%22110%22%20rx%3D%2275%22%20ry%3D%2260%22%20fill%3D%22%23FEF08A%22%20stroke%3D%22%23111827%22%20stroke-width%3D%225%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Extreme%20Side%20Glance%20Eyes%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22130%22%20cy%3D%22105%22%20rx%3D%2222%22%20ry%3D%2214%22%20fill%3D%22%23FFF%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22114%22%20cy%3D%22105%22%20rx%3D%226%22%20ry%3D%228%22%20fill%3D%22%23111827%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22190%22%20cy%3D%22105%22%20rx%3D%2222%22%20ry%3D%2214%22%20fill%3D%22%23FFF%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22174%22%20cy%3D%22105%22%20rx%3D%226%22%20ry%3D%228%22%20fill%3D%22%23111827%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Sky%20High%20Raised%20Right%20Eyebrow%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20112%2085%20Q%20130%2085%20148%2085%22%20fill%3D%22none%22%20stroke%3D%22%23111827%22%20stroke-width%3D%225%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20172%2075%20Q%20190%2055%20208%2070%22%20fill%3D%22none%22%20stroke%3D%22%23111827%22%20stroke-width%3D%225%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Skeptical%20Mouth%20--%3E%0A%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22140%22%20y1%3D%22145%22%20x2%3D%22180%22%20y2%3D%22140%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2215%22%20y%3D%22195%22%20width%3D%22290%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%23052E16%22%20stroke%3D%22%234ADE80%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%234ADE80%22%20letter-spacing%3D%221%22%3ECRIMINAL%20OFFENSIVE%20SIDE%20EYE%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_VERY_SUSPICIOUS',
    title: "Very Suspicious",
    category: 'SUSPICIOUS',
    description: "Noir detective hat and trenchcoat with flashlight beam piercing the shadows.",
    caption: "SOMETHING DOES NOT ADD UP HERE",
    aspectRatio: 1.3333333333333333,
    tags: ["detective","noir","suspicious","pinch","arms_crossed"],
    soundId: 'DRAMATIC_SUSPENSE',
    suggestedActions: ["PINCH","ARMS_CROSSED"],
    rarity: 'COMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%230A0A0A%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Flashlight%20Beam%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%2260%2C130%20290%2C50%20290%2C190%22%20fill%3D%22%23FEF08A%22%20opacity%3D%220.3%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Noir%20Detective%20Silhouette%20--%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Fedora%20Hat%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22140%22%20cy%3D%2270%22%20rx%3D%2265%22%20ry%3D%2214%22%20fill%3D%22%233F3F46%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%22105%22%20y%3D%2240%22%20width%3D%2270%22%20height%3D%2232%22%20rx%3D%224%22%20fill%3D%22%2327272A%22%20stroke%3D%22%23111827%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Trenchcoat%20Collar%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22100%2C105%20140%2C165%20180%2C105%22%20fill%3D%22%2352525B%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Glowing%20Eyes%20in%20Shadow%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22125%22%20cy%3D%2285%22%20rx%3D%228%22%20ry%3D%224%22%20fill%3D%22%23FACC15%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22155%22%20cy%3D%2285%22%20rx%3D%228%22%20ry%3D%224%22%20fill%3D%22%23FACC15%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%2318181B%22%20stroke%3D%22%23FACC15%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2211%22%20fill%3D%22%23FEF08A%22%20letter-spacing%3D%221%22%3ESOMETHING%20DOES%20NOT%20ADD%20UP%20HERE%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_CAUGHT_IN_ACT',
    title: "Caught in the Act",
    category: 'SUSPICIOUS',
    description: "High-power police spotlight snapping onto frozen caught hands.",
    caption: "CAUGHT IN 4K ULTRA HD!",
    aspectRatio: 1.3333333333333333,
    tags: ["caught","spotlight","pointing","hands_raised"],
    soundId: 'AIR_HORN',
    suggestedActions: ["POINTING","HANDS_RAISED"],
    rarity: 'UNCOMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%23030712%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Prison%20Spotlight%20Circle%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%22105%22%20r%3D%2275%22%20fill%3D%22%23FFF%22%20opacity%3D%220.9%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Frozen%20Character%20Silhouette%20inside%20beam%20--%3E%0A%20%20%20%20%20%20%20%20%3Cg%20fill%3D%22%23111827%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%2275%22%20r%3D%2222%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3C!--%20Hands%20Raised%20in%20Surrender%20--%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22130%22%20y1%3D%2290%22%20x2%3D%22115%22%20y2%3D%2260%22%20stroke%3D%22%23111827%22%20stroke-width%3D%226%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22190%22%20y1%3D%2290%22%20x2%3D%22205%22%20y2%3D%2260%22%20stroke%3D%22%23111827%22%20stroke-width%3D%226%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22160%22%20cy%3D%22125%22%20rx%3D%2225%22%20ry%3D%2235%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Shocked%20Big%20Eyes%20inside%20head%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22153%22%20cy%3D%2273%22%20r%3D%224%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22167%22%20cy%3D%2273%22%20r%3D%224%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Red%204K%20Rec%20Indicator%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%2245%22%20cy%3D%2235%22%20r%3D%226%22%20fill%3D%22%23EF4444%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%2260%22%20y%3D%2239%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23EF4444%22%3EREC%20%2F%2F%204K%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%23000%22%20stroke%3D%22%23EF4444%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2213%22%20fill%3D%22%23EF4444%22%20letter-spacing%3D%222%22%3ECAUGHT%20IN%204K%20ULTRA%20HD!%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_BRO_IS_THINKING',
    title: "Bro is Thinking",
    category: 'SUSPICIOUS',
    description: "Deep chin-stroke silhouette with spinning golden gears and smoky question marks.",
    caption: "HOLD ON... BRO IS COOKING",
    aspectRatio: 1.3333333333333333,
    tags: ["cooking","thinking","gears","the_thinker","pointing"],
    soundId: 'CHAD_GONG',
    suggestedActions: ["THE_THINKER","POINTING"],
    rarity: 'COMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%2318181B%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Spinning%20Mechanical%20Gears%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22210%22%20cy%3D%2270%22%20r%3D%2226%22%20fill%3D%22none%22%20stroke%3D%22%23F59E0B%22%20stroke-width%3D%226%22%20stroke-dasharray%3D%2210%2C6%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22210%22%20cy%3D%2270%22%20r%3D%228%22%20fill%3D%22%23F59E0B%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22245%22%20cy%3D%22115%22%20r%3D%2218%22%20fill%3D%22none%22%20stroke%3D%22%23EAB308%22%20stroke-width%3D%225%22%20stroke-dasharray%3D%228%2C4%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Thinker%20Face%20with%20Hand%20on%20Chin%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22140%22%20cy%3D%22100%22%20rx%3D%2250%22%20ry%3D%2245%22%20fill%3D%22%23FBBF24%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Hand%20stroked%20under%20chin%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%22120%22%20y%3D%22135%22%20width%3D%2235%22%20height%3D%2218%22%20rx%3D%226%22%20fill%3D%22%23F59E0B%22%20stroke%3D%22%23111827%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Eyes%20squinting%20thoughtfully%20--%3E%0A%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22120%22%20y1%3D%2295%22%20x2%3D%22135%22%20y2%3D%2295%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22150%22%20y1%3D%2295%22%20x2%3D%22165%22%20y2%3D%2295%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Smoke%20Puffs%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%2295%22%20cy%3D%2265%22%20r%3D%228%22%20fill%3D%22%23A1A1AA%22%20opacity%3D%220.6%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%2285%22%20cy%3D%2245%22%20r%3D%2212%22%20fill%3D%22%23A1A1AA%22%20opacity%3D%220.4%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%2309090B%22%20stroke%3D%22%23F59E0B%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23FDE68A%22%20letter-spacing%3D%221%22%3EHOLD%20ON...%20BRO%20IS%20COOKING%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_QUESTIONABLE_DECISION',
    title: "Questionable Decision",
    category: 'SUSPICIOUS',
    description: "Sweating cartoon hand trembling between two big red self-destruct buttons.",
    caption: "HIGHLY QUESTIONABLE LIFE CHOICE",
    aspectRatio: 1.3333333333333333,
    tags: ["buttons","choice","dilemma","pinch","arms_crossed"],
    soundId: 'DRAMATIC_SUSPENSE',
    suggestedActions: ["PINCH","ARMS_CROSSED"],
    rarity: 'UNCOMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%23374151%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Control%20Panel%20Desk%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2240%22%20y%3D%2290%22%20width%3D%22240%22%20height%3D%2285%22%20rx%3D%226%22%20fill%3D%22%231F2937%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Two%20Big%20Red%20Push%20Buttons%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22100%22%20cy%3D%22130%22%20r%3D%2226%22%20fill%3D%22%23EF4444%22%20stroke%3D%22%237F1D1D%22%20stroke-width%3D%225%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22220%22%20cy%3D%22130%22%20r%3D%2226%22%20fill%3D%22%23EF4444%22%20stroke%3D%22%237F1D1D%22%20stroke-width%3D%225%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Trembling%20Sweaty%20Finger%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20160%2050%20L%20155%20105%20Q%20160%20115%20165%20105%20Z%22%20fill%3D%22%23FED7AA%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Sweat%20Drops%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22140%22%20cy%3D%2270%22%20rx%3D%224%22%20ry%3D%227%22%20fill%3D%22%2338BDF8%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22180%22%20cy%3D%2275%22%20rx%3D%224%22%20ry%3D%227%22%20fill%3D%22%2338BDF8%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2215%22%20y%3D%22195%22%20width%3D%22290%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%23111827%22%20stroke%3D%22%23EF4444%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2211%22%20fill%3D%22%23FCA5A5%22%20letter-spacing%3D%221%22%3EHIGHLY%20QUESTIONABLE%20LIFE%20CHOICE%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_INNOCENT_MAYBE_NOT',
    title: "Innocent? Maybe Not",
    category: 'SUSPICIOUS',
    description: "Golden halo over a smiling angel face holding cartoon dynamite behind back.",
    caption: "LOOKS INNOCENT... PLOTTING CHAOS",
    aspectRatio: 1.3333333333333333,
    tags: ["halo","dynamite","innocent","pointing","thumbs_up"],
    soundId: 'DISCO_SLAP',
    suggestedActions: ["POINTING","THUMBS_UP"],
    rarity: 'UNCOMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%231E1B4B%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Floating%20Golden%20Halo%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22160%22%20cy%3D%2245%22%20rx%3D%2236%22%20ry%3D%2210%22%20fill%3D%22none%22%20stroke%3D%22%23FACC15%22%20stroke-width%3D%226%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Innocent%20Smiling%20Face%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%22105%22%20r%3D%2248%22%20fill%3D%22%23FED7AA%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22142%22%20cy%3D%22100%22%20r%3D%226%22%20fill%3D%22%23111827%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22178%22%20cy%3D%22100%22%20r%3D%226%22%20fill%3D%22%23111827%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Cheeky%20Smile%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20145%20125%20Q%20160%20140%20175%20125%22%20fill%3D%22none%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Stick%20of%20TNT%20Dynamite%20behind%20back%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%22225%22%20y%3D%22115%22%20width%3D%2218%22%20height%3D%2240%22%20rx%3D%223%22%20fill%3D%22%23DC2626%22%20stroke%3D%22%23111827%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20234%20115%20Q%20236%20100%20242%2095%22%20fill%3D%22none%22%20stroke%3D%22%23F59E0B%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22242%2C93%20245%2C88%20247%2C94%22%20fill%3D%22%23FACC15%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%230F172A%22%20stroke%3D%22%23FACC15%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2211%22%20fill%3D%22%23FEF08A%22%20letter-spacing%3D%221%22%3ELOOKS%20INNOCENT...%20PLOTTING%20CHAOS%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_VICTORY_DANCE',
    title: "Victory Dance",
    category: 'CELEBRATION',
    description: "Neon dancing figure busting energetic funky moves with colorful sound waves.",
    caption: "BUSTING MOVES // CANNOT BE TAMED",
    aspectRatio: 1.3333333333333333,
    tags: ["dance","disco","groove","disco_fever","peace_sign"],
    soundId: 'DISCO_SLAP',
    suggestedActions: ["DISCO_FEVER","PEACE_SIGN"],
    rarity: 'COMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%234A044E%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Colorful%20Musical%20Waves%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%2020%2060%20Q%2060%2020%20100%2060%20T%20180%2060%20T%20260%2060%20T%20320%2060%22%20fill%3D%22none%22%20stroke%3D%22%23F472B6%22%20stroke-width%3D%223%22%20opacity%3D%220.6%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%2010%20160%20Q%2050%20120%2090%20160%20T%20170%20160%20T%20250%20160%20T%20310%20160%22%20fill%3D%22none%22%20stroke%3D%22%2322D3EE%22%20stroke-width%3D%223%22%20opacity%3D%220.6%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Dancing%20Groovy%20Figure%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%2265%22%20r%3D%2220%22%20fill%3D%22%23FACC15%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22160%22%20y1%3D%2285%22%20x2%3D%22160%22%20y2%3D%22135%22%20stroke%3D%22%23FACC15%22%20stroke-width%3D%228%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Flailing%20Funky%20Arms%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolyline%20points%3D%22110%2C80%20160%2C95%20210%2C75%22%20fill%3D%22none%22%20stroke%3D%22%23FACC15%22%20stroke-width%3D%227%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Funky%20Kicking%20Legs%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolyline%20points%3D%22125%2C175%20160%2C135%20195%2C165%22%20fill%3D%22none%22%20stroke%3D%22%23FACC15%22%20stroke-width%3D%227%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%232E0234%22%20stroke%3D%22%23F472B6%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2211%22%20fill%3D%22%23F472B6%22%20letter-spacing%3D%221%22%3EBUSTING%20MOVES%20%2F%2F%20CANNOT%20BE%20TAMED%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_ABSOLUTE_CINEMA',
    title: "Absolute Cinema",
    category: 'CELEBRATION',
    description: "Hands raised in majestic awe before a giant glowing cinema screen with tears of joy.",
    caption: "THIS IS ABSOLUTE CINEMA",
    aspectRatio: 1.3333333333333333,
    tags: ["cinema","masterpiece","t_pose","clap","rare"],
    soundId: 'BRASS_FANFARE',
    suggestedActions: ["T_POSE","CLAP"],
    rarity: 'RARE',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%23000%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Giant%20Cinema%20Screen%20Glowing%20Light%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2240%22%20y%3D%2225%22%20width%3D%22240%22%20height%3D%22115%22%20rx%3D%226%22%20fill%3D%22%23F8FAFC%22%20stroke%3D%22%2338BDF8%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2245%22%20y%3D%2230%22%20width%3D%22230%22%20height%3D%22105%22%20fill%3D%22%23E0F2FE%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Screen%20Text%20--%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%2290%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2224%22%20fill%3D%22%230369A1%22%20letter-spacing%3D%223%22%3ECINEMA%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Audience%20Silhouette%20Hands%20Raised%20in%20Awe%20--%3E%0A%20%20%20%20%20%20%20%20%3Cg%20fill%3D%22%2318181B%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22160%22%20cy%3D%22180%22%20rx%3D%2235%22%20ry%3D%2230%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3C!--%20Raised%20worship%20hands%20--%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22120%22%20y1%3D%22180%22%20x2%3D%22105%22%20y2%3D%22135%22%20stroke%3D%22%2318181B%22%20stroke-width%3D%228%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22200%22%20y1%3D%22180%22%20x2%3D%22215%22%20y2%3D%22135%22%20stroke%3D%22%2318181B%22%20stroke-width%3D%228%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%230C4A6E%22%20stroke%3D%22%2338BDF8%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2213%22%20fill%3D%22%23BAE6FD%22%20letter-spacing%3D%222%22%3ETHIS%20IS%20ABSOLUTE%20CINEMA%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_PARTY_MODE',
    title: "Party Mode",
    category: 'CELEBRATION',
    description: "Glittering rainbow disco ball scattering beams with blowout party horn.",
    caption: "PARTY MODE FULLY ENGAGED",
    aspectRatio: 1.3333333333333333,
    tags: ["party","disco_ball","confetti","disco_fever","peace_sign"],
    soundId: 'CROWD_CHEER',
    suggestedActions: ["DISCO_FEVER","PEACE_SIGN"],
    rarity: 'COMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%2318181B%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Disco%20Ball%20Facets%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%2270%22%20r%3D%2238%22%20fill%3D%22%23E4E4E7%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cg%20stroke%3D%22%2371717A%22%20stroke-width%3D%221.5%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22122%22%20y1%3D%2270%22%20x2%3D%22198%22%20y2%3D%2270%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22130%22%20y1%3D%2252%22%20x2%3D%22190%22%20y2%3D%2252%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22130%22%20y1%3D%2288%22%20x2%3D%22190%22%20y2%3D%2288%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22160%22%20y1%3D%2232%22%20x2%3D%22160%22%20y2%3D%22108%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Hanging%20string%20--%3E%0A%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22160%22%20y1%3D%220%22%20x2%3D%22160%22%20y2%3D%2232%22%20stroke%3D%22%23A1A1AA%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Multi-colored%20Confetti%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%2260%22%20cy%3D%2260%22%20r%3D%225%22%20fill%3D%22%23EF4444%22%2F%3E%3Ccircle%20cx%3D%22260%22%20cy%3D%2250%22%20r%3D%226%22%20fill%3D%22%233B82F6%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%2290%22%20cy%3D%22140%22%20r%3D%226%22%20fill%3D%22%23FACC15%22%2F%3E%3Ccircle%20cx%3D%22230%22%20cy%3D%22130%22%20r%3D%225%22%20fill%3D%22%2310B981%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2280%22%20y%3D%2290%22%20width%3D%2212%22%20height%3D%226%22%20fill%3D%22%23A855F7%22%20transform%3D%22rotate(30%2080%2090)%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%22235%22%20y%3D%2285%22%20width%3D%2212%22%20height%3D%226%22%20fill%3D%22%23F97316%22%20transform%3D%22rotate(-25%20235%2085)%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%23000%22%20stroke%3D%22%23FACC15%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23FACC15%22%20letter-spacing%3D%222%22%3EPARTY%20MODE%20FULLY%20ENGAGED%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_LEVEL_UP',
    title: "Level Up!",
    category: 'CELEBRATION',
    description: "Radiant RPG pillar of light surging from the ground with floating golden +99 stats.",
    caption: "LEVEL UP! SKILLS +999",
    aspectRatio: 1.3333333333333333,
    tags: ["level_up","rpg","stats","five_fingers","jump"],
    soundId: 'LEVEL_UP_NOTIFICATION',
    suggestedActions: ["FIVE_FINGERS","JUMP","SWIPE_RIGHT"],
    rarity: 'COMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%23042F2E%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Holy%20Ascension%20Light%20Column%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22110%2C20%20210%2C20%20240%2C190%2080%2C190%22%20fill%3D%22%232DD4BF%22%20opacity%3D%220.3%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22135%2C20%20185%2C20%20205%2C190%20115%2C190%22%20fill%3D%22%235EEAD4%22%20opacity%3D%220.6%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Floating%20%2B999%20Badge%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2285%22%20y%3D%2270%22%20width%3D%22150%22%20height%3D%2240%22%20rx%3D%226%22%20fill%3D%22%23FACC15%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%2297%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2218%22%20fill%3D%22%23111827%22%20letter-spacing%3D%222%22%3E%2B999%20STATS%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Sparkle%20Rings%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22160%22%20cy%3D%22150%22%20rx%3D%2260%22%20ry%3D%2214%22%20fill%3D%22none%22%20stroke%3D%22%23FACC15%22%20stroke-width%3D%223%22%20stroke-dasharray%3D%228%2C4%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%23134E4A%22%20stroke%3D%22%235EEAD4%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2213%22%20fill%3D%22%235EEAD4%22%20letter-spacing%3D%222%22%3ELEVEL%20UP!%20SKILLS%20%2B999%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_CROWD_GOES_WILD',
    title: "Crowd Goes Wild",
    category: 'CELEBRATION',
    description: "Packed stadium silhouette with waving ocean of hands and camera flashbulbs.",
    caption: "THE ENTIRE STADIUM ERUPTS!",
    aspectRatio: 1.3333333333333333,
    tags: ["stadium","crowd","applause","clap","hands_raised"],
    soundId: 'CROWD_CHEER',
    suggestedActions: ["CLAP","HANDS_RAISED","FIVE_FINGERS"],
    rarity: 'COMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%231E1B4B%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Flashing%20Camera%20Strobe%20Stars%20--%3E%0A%20%20%20%20%20%20%20%20%3Cg%20fill%3D%22%23FFF%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%2250%22%20cy%3D%2240%22%20r%3D%224%22%2F%3E%3Ccircle%20cx%3D%22120%22%20cy%3D%2230%22%20r%3D%226%22%2F%3E%3Ccircle%20cx%3D%22210%22%20cy%3D%2245%22%20r%3D%225%22%2F%3E%3Ccircle%20cx%3D%22280%22%20cy%3D%2235%22%20r%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%2280%22%20cy%3D%2270%22%20r%3D%225%22%2F%3E%3Ccircle%20cx%3D%22180%22%20cy%3D%2265%22%20r%3D%227%22%2F%3E%3Ccircle%20cx%3D%22250%22%20cy%3D%2275%22%20r%3D%226%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Stadium%20Lights%20Beam%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%2220%2C10%20160%2C140%2070%2C180%22%20fill%3D%22%23FBBF24%22%20opacity%3D%220.15%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22300%2C10%20160%2C140%20250%2C180%22%20fill%3D%22%23FBBF24%22%20opacity%3D%220.15%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Sea%20of%20Cheering%20Hands%20Silhouette%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%200%20160%20Q%2030%20135%2060%20160%20Q%2090%20130%20120%20160%20Q%20150%20125%20180%20160%20Q%20210%20130%20240%20160%20Q%20270%20135%20300%20160%20L%20320%20190%20L%200%20190%20Z%22%20fill%3D%22%230F172A%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%23000%22%20stroke%3D%22%23FBBF24%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23FBBF24%22%20letter-spacing%3D%222%22%3ETHE%20ENTIRE%20STADIUM%20ERUPTS!%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_CHAOS_UNLEASHED',
    title: "Chaos Unleashed",
    category: 'CELEBRATION',
    description: "Joyous cartoon figure dancing happily in front of an inferno of fire.",
    caption: "SOME PEOPLE JUST WANT TO WATCH",
    aspectRatio: 1.3333333333333333,
    tags: ["chaos","fire","inferno","jump","disco_fever"],
    soundId: 'AIR_HORN',
    suggestedActions: ["JUMP","DISCO_FEVER"],
    rarity: 'UNCOMMON',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%23450A0A%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Hellish%20Inferno%20Flames%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%2220%2C180%2050%2C60%2090%2C140%20130%2C40%20170%2C130%20220%2C50%20260%2C120%20300%2C30%20310%2C180%22%20fill%3D%22%23DC2626%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%2240%2C180%2070%2C90%20110%2C150%20150%2C70%20190%2C140%20240%2C80%20280%2C180%22%20fill%3D%22%23F97316%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%2270%2C180%20100%2C120%20140%2C160%20170%2C100%20210%2C150%20250%2C180%22%20fill%3D%22%23FACC15%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Cute%20Happy%20Character%20in%20front%20of%20flames%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%22135%22%20r%3D%2228%22%20fill%3D%22%23FEF08A%22%20stroke%3D%22%23111827%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22150%22%20cy%3D%22130%22%20r%3D%224%22%20fill%3D%22%23111827%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22170%22%20cy%3D%22130%22%20r%3D%224%22%20fill%3D%22%23111827%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Cheerful%20Smile%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20148%20145%20Q%20160%20156%20172%20145%22%20fill%3D%22none%22%20stroke%3D%22%23111827%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2215%22%20y%3D%22195%22%20width%3D%22290%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%23000%22%20stroke%3D%22%23F97316%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2211%22%20fill%3D%22%23FEF08A%22%20letter-spacing%3D%221%22%3ESOME%20PEOPLE%20JUST%20WANT%20TO%20WATCH%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_NPC_MODE',
    title: "NPC Mode",
    category: 'SPECIAL',
    description: "Monochrome mannequin standing in standby pose with a spinning loading circle above head.",
    caption: "NPC BEHAVIOR DETECTED",
    aspectRatio: 1.3333333333333333,
    tags: ["npc","loading","monochrome","zombie_walk","t_pose"],
    soundId: 'RECORD_SCRATCH',
    suggestedActions: ["ZOMBIE_WALK","T_POSE"],
    rarity: 'RARE',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%2318181B%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Loading%20Spinner%20overhead%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%2240%22%20r%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%2371717A%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20160%2024%20A%2016%2016%200%200%201%20176%2040%22%20fill%3D%22none%22%20stroke%3D%22%2322D3EE%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Mannequin%20Head%20%26%20Torso%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22160%22%20cy%3D%2285%22%20rx%3D%2226%22%20ry%3D%2232%22%20fill%3D%22%23A1A1AA%22%20stroke%3D%22%2327272A%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22145%22%20y1%3D%2285%22%20x2%3D%22155%22%20y2%3D%2285%22%20stroke%3D%22%233F3F46%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22165%22%20y1%3D%2285%22%20x2%3D%22175%22%20y2%3D%2285%22%20stroke%3D%22%233F3F46%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22125%2C120%20195%2C120%20180%2C185%20140%2C185%22%20fill%3D%22%2371717A%22%20stroke%3D%22%2327272A%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Dialogue%20Bubble%20with%20...%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%22200%22%20y%3D%2255%22%20width%3D%2255%22%20height%3D%2226%22%20rx%3D%224%22%20fill%3D%22%23FFF%22%20stroke%3D%22%23000%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22227%22%20y%3D%2273%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2214%22%20fill%3D%22%23000%22%3E...%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%2309090B%22%20stroke%3D%22%2322D3EE%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2213%22%20fill%3D%22%2322D3EE%22%20letter-spacing%3D%222%22%3ENPC%20BEHAVIOR%20DETECTED%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_NO_THOUGHTS',
    title: "No Thoughts, Head Empty",
    category: 'SPECIAL',
    description: "Serene cartoon creature with the classic DVD screensaver bouncing inside skull.",
    caption: "NO THOUGHTS // HEAD TOTALLY EMPTY",
    aspectRatio: 1.3333333333333333,
    tags: ["dvd","head_empty","zen","zen_prayer","zombie_walk"],
    soundId: 'SINGING_BOWL',
    suggestedActions: ["ZEN_PRAYER","ZOMBIE_WALK"],
    rarity: 'RARE',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%23022C22%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Big%20Round%20Empty%20Head%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%22105%22%20r%3D%2270%22%20fill%3D%22%23ECFDF5%22%20stroke%3D%22%23065F46%22%20stroke-width%3D%226%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20DVD%20Logo%20in%20Corner%20of%20Head%20--%3E%0A%20%20%20%20%20%20%20%20%3Cg%20transform%3D%22translate(130%2C%2085)%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%2230%22%20cy%3D%2215%22%20rx%3D%2232%22%20ry%3D%2214%22%20fill%3D%22%2310B981%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ctext%20x%3D%2230%22%20y%3D%2220%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23FFF%22%3EDVD%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Blissful%20Curved%20Closed%20Eyes%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20125%20125%20Q%20135%20115%20145%20125%22%20fill%3D%22none%22%20stroke%3D%22%23065F46%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20175%20125%20Q%20185%20115%20195%20125%22%20fill%3D%22none%22%20stroke%3D%22%23065F46%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22160%22%20cy%3D%22142%22%20rx%3D%224%22%20ry%3D%224%22%20fill%3D%22%23065F46%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2215%22%20y%3D%22195%22%20width%3D%22290%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%23064E3B%22%20stroke%3D%22%2334D399%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2211%22%20fill%3D%22%23A7F3D0%22%20letter-spacing%3D%221%22%3ENO%20THOUGHTS%20%2F%2F%20HEAD%20TOTALLY%20EMPTY%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_BRAIN_LEFT_CHAT',
    title: "Brain Left The Chat",
    category: 'SPECIAL',
    description: "Cute cartoon brain wearing angel wings and suitcase floating away into clouds.",
    caption: "BRAIN HAS LEFT THE SERVER",
    aspectRatio: 1.3333333333333333,
    tags: ["brain_left","angel","cloud","zen_prayer","swipe_left"],
    soundId: 'SWIPE_WHOOSH',
    suggestedActions: ["ZEN_PRAYER","SWIPE_LEFT"],
    rarity: 'RARE',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%2338BDF8%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Heavenly%20Cloud%20Base%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%2280%22%20cy%3D%22180%22%20rx%3D%2260%22%20ry%3D%2235%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22160%22%20cy%3D%22190%22%20rx%3D%2280%22%20ry%3D%2240%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22240%22%20cy%3D%22180%22%20rx%3D%2260%22%20ry%3D%2235%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Angel%20Wings%20on%20Brain%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22105%22%20cy%3D%2285%22%20rx%3D%2230%22%20ry%3D%2215%22%20fill%3D%22%23FFF%22%20stroke%3D%22%23E0F2FE%22%20stroke-width%3D%223%22%20transform%3D%22rotate(-30%20105%2085)%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22215%22%20cy%3D%2285%22%20rx%3D%2230%22%20ry%3D%2215%22%20fill%3D%22%23FFF%22%20stroke%3D%22%23E0F2FE%22%20stroke-width%3D%223%22%20transform%3D%22rotate(30%20215%2085)%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Flying%20Brain%20Body%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22160%22%20cy%3D%2295%22%20rx%3D%2238%22%20ry%3D%2230%22%20fill%3D%22%23F472B6%22%20stroke%3D%22%23BE185D%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Tiny%20Suitcase%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%22180%22%20y%3D%22115%22%20width%3D%2222%22%20height%3D%2216%22%20rx%3D%222%22%20fill%3D%22%23B45309%22%20stroke%3D%22%2378350F%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20186%20115%20L%20186%20110%20L%20196%20110%20L%20196%20115%22%20fill%3D%22none%22%20stroke%3D%22%2378350F%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Tiny%20Halo%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22160%22%20cy%3D%2255%22%20rx%3D%2220%22%20ry%3D%226%22%20fill%3D%22none%22%20stroke%3D%22%23FACC15%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%230C4A6E%22%20stroke%3D%22%23FFF%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23FFF%22%20letter-spacing%3D%222%22%3EBRAIN%20HAS%20LEFT%20THE%20SERVER%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_LEGENDARY_MOMENT',
    title: "Legendary Moment",
    category: 'SPECIAL',
    description: "Blinding iridescent diamond crystalline starburst radiating prismatic rainbow rays.",
    caption: "★ 0.001% DROP RATE MOMENT ★",
    aspectRatio: 1.3333333333333333,
    tags: ["legendary","prismatic","rainbow","peace_sign","hands_raised"],
    soundId: 'VICTORY_BELL',
    suggestedActions: ["PEACE_SIGN","HANDS_RAISED"],
    rarity: 'LEGENDARY',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Cdefs%3E%0A%20%20%20%20%20%20%20%20%20%20%3ClinearGradient%20id%3D%22rainbow-ray%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23F43F5E%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%2225%25%22%20stop-color%3D%22%23F59E0B%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%2250%25%22%20stop-color%3D%22%2310B981%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%2275%25%22%20stop-color%3D%22%233B82F6%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%238B5CF6%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3C%2FlinearGradient%3E%0A%20%20%20%20%20%20%20%20%3C%2Fdefs%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%2309090B%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Prismatic%20Starburst%20Rays%20--%3E%0A%20%20%20%20%20%20%20%20%3Cg%20stroke%3D%22url(%23rainbow-ray)%22%20stroke-width%3D%224%22%20opacity%3D%220.8%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22160%22%20y1%3D%22105%22%20x2%3D%22160%22%20y2%3D%2210%22%2F%3E%3Cline%20x1%3D%22160%22%20y1%3D%22105%22%20x2%3D%22160%22%20y2%3D%22200%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22160%22%20y1%3D%22105%22%20x2%3D%2230%22%20y2%3D%22105%22%2F%3E%3Cline%20x1%3D%22160%22%20y1%3D%22105%22%20x2%3D%22290%22%20y2%3D%22105%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22160%22%20y1%3D%22105%22%20x2%3D%2260%22%20y2%3D%2230%22%2F%3E%3Cline%20x1%3D%22160%22%20y1%3D%22105%22%20x2%3D%22260%22%20y2%3D%22180%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22160%22%20y1%3D%22105%22%20x2%3D%22260%22%20y2%3D%2230%22%2F%3E%3Cline%20x1%3D%22160%22%20y1%3D%22105%22%20x2%3D%2260%22%20y2%3D%22180%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Radiant%20Central%20Diamond%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22160%2C50%20205%2C105%20160%2C160%20115%2C105%22%20fill%3D%22%23FFF%22%20stroke%3D%22url(%23rainbow-ray)%22%20stroke-width%3D%226%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpolygon%20points%3D%22160%2C75%20185%2C105%20160%2C135%20135%2C105%22%20fill%3D%22%23E0F2FE%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Sparkle%20Dots%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22100%22%20cy%3D%2250%22%20r%3D%224%22%20fill%3D%22%23FEF08A%22%2F%3E%3Ccircle%20cx%3D%22220%22%20cy%3D%2250%22%20r%3D%224%22%20fill%3D%22%23FEF08A%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%2318181B%22%20stroke%3D%22url(%23rainbow-ray)%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23FDE047%22%20letter-spacing%3D%222%22%3E%E2%98%85%200.001%25%20DROP%20RATE%20MOMENT%20%E2%98%85%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_UNEXPECTED_GENIUS',
    title: "Unexpected Genius",
    category: 'SPECIAL',
    description: "Blazing 1000-watt cartoon bulb lighting up a deep space nebula galaxy with equations.",
    caption: "SOMETIMES MY GENIUS IS FRIGHTENING",
    aspectRatio: 1.3333333333333333,
    tags: ["genius","lightbulb","galaxy","the_thinker","pointing"],
    soundId: 'LEVEL_UP_NOTIFICATION',
    suggestedActions: ["THE_THINKER","POINTING"],
    rarity: 'RARE',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Cdefs%3E%0A%20%20%20%20%20%20%20%20%20%20%3CradialGradient%20id%3D%22space-grad%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2250%25%22%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%234C1D95%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%230F172A%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3C%2FradialGradient%3E%0A%20%20%20%20%20%20%20%20%3C%2Fdefs%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22url(%23space-grad)%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Radiant%20Bulb%20Glow%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%2285%22%20r%3D%2265%22%20fill%3D%22%23FACC15%22%20opacity%3D%220.25%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%2285%22%20r%3D%2245%22%20fill%3D%22%23FEF08A%22%20opacity%3D%220.6%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Glass%20Bulb%20Body%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20130%2085%20C%20130%2055%20190%2055%20190%2085%20C%20190%20105%20175%20115%20175%20130%20L%20145%20130%20C%20145%20115%20130%20105%20130%2085%20Z%22%20fill%3D%22%23FFF%22%20stroke%3D%22%23111827%22%20stroke-width%3D%225%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Glowing%20Filament%20--%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M%20150%20115%20L%20150%2085%20L%20160%2095%20L%20170%2085%20L%20170%20115%22%20fill%3D%22none%22%20stroke%3D%22%23F59E0B%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bulb%20Screw%20Base%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%22145%22%20y%3D%22130%22%20width%3D%2230%22%20height%3D%2218%22%20rx%3D%222%22%20fill%3D%22%2371717A%22%20stroke%3D%22%23111827%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22145%22%20y1%3D%22136%22%20x2%3D%22175%22%20y2%3D%22136%22%20stroke%3D%22%23111827%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22145%22%20y1%3D%22142%22%20x2%3D%22175%22%20y2%3D%22142%22%20stroke%3D%22%23111827%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2210%22%20y%3D%22195%22%20width%3D%22300%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%23000%22%20stroke%3D%22%23FACC15%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2210%22%20fill%3D%22%23FEF08A%22%20letter-spacing%3D%221%22%3ESOMETIMES%20MY%20GENIUS%20IS%20FRIGHTENING%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_FINAL_BOSS_ENERGY',
    title: "Final Boss Energy",
    category: 'SPECIAL',
    description: "Colossal glowing red HP bar with skull crest and menacing fiery dark eyes.",
    caption: "WHY DO I HEAR BOSS MUSIC?!",
    aspectRatio: 1.3333333333333333,
    tags: ["final_boss","boss_music","hp_bar","t_pose","closed_fist"],
    soundId: 'INCEPTION_BRAAAM',
    suggestedActions: ["T_POSE","CLOSED_FIST"],
    rarity: 'LEGENDARY',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%2309090B%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Dark%20Aura%20Red%20Haze%20--%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%22110%22%20r%3D%2285%22%20fill%3D%22%23450A0A%22%20opacity%3D%220.6%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Boss%20HP%20Bar%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2235%22%20y%3D%2245%22%20width%3D%22250%22%20height%3D%2216%22%20rx%3D%224%22%20fill%3D%22%2318181B%22%20stroke%3D%22%23991B1B%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2238%22%20y%3D%2248%22%20width%3D%22244%22%20height%3D%2210%22%20rx%3D%222%22%20fill%3D%22%23DC2626%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%2238%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2211%22%20fill%3D%22%23EF4444%22%20letter-spacing%3D%222%22%3EFINAL%20BOSS%3A%20OMNI%20OVERLORD%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Piercing%20Fiery%20Red%20Eyes%20--%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22125%22%20cy%3D%22115%22%20rx%3D%2222%22%20ry%3D%2212%22%20fill%3D%22%23000%22%20stroke%3D%22%23EF4444%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cellipse%20cx%3D%22195%22%20cy%3D%22115%22%20rx%3D%2222%22%20ry%3D%2212%22%20fill%3D%22%23000%22%20stroke%3D%22%23EF4444%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22125%22%20cy%3D%22115%22%20r%3D%225%22%20fill%3D%22%23EF4444%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22195%22%20cy%3D%22115%22%20r%3D%225%22%20fill%3D%22%23EF4444%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Menacing%20Angry%20Brow%20--%3E%0A%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22100%22%20y1%3D%2295%22%20x2%3D%22148%22%20y2%3D%22108%22%20stroke%3D%22%23EF4444%22%20stroke-width%3D%225%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cline%20x1%3D%22220%22%20y1%3D%2295%22%20x2%3D%22172%22%20y2%3D%22108%22%20stroke%3D%22%23EF4444%22%20stroke-width%3D%225%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C!--%20Bottom%20Banner%20--%3E%0A%20%20%20%20%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%22195%22%20width%3D%22280%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%23000%22%20stroke%3D%22%23DC2626%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23EF4444%22%20letter-spacing%3D%222%22%3EWHY%20DO%20I%20HEAR%20BOSS%20MUSIC%3F!%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_PERFECT_TEN',
    title: "Perfect 10 High Ten",
    category: 'CELEBRATION',
    description: "Dual open glowing hands creating a cosmic high-ten shockwave with starbursts.",
    caption: "PERFECT TEN! MAXIMUM OVERDRIVE!",
    aspectRatio: 1.3333333333333333,
    tags: ["high_ten", "ten_fingers", "perfect_ten", "open_hands", "double_hands"],
    soundId: 'BRASS_FANFARE',
    suggestedActions: ["PERFECT_TEN", "FIVE_FINGERS"],
    rarity: 'LEGENDARY',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%230F172A%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%22110%22%20r%3D%2280%22%20fill%3D%22%230284C7%22%20opacity%3D%220.35%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%22110%22%20r%3D%2245%22%20fill%3D%22%2338BDF8%22%20opacity%3D%220.5%22%2F%3E%0A%20%20%3C!--%20Left%20Hand%205%20Fingers%20--%3E%0A%20%20%3Cg%20transform%3D%22translate(70%2C%2060)%20rotate(-15)%22%3E%0A%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%2240%22%20width%3D%2240%22%20height%3D%2245%22%20rx%3D%2210%22%20fill%3D%22%23F59E0B%22%20stroke%3D%22%23FFF%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%3Crect%20x%3D%225%22%20y%3D%2235%22%20width%3D%2214%22%20height%3D%2225%22%20rx%3D%227%22%20fill%3D%22%23FBBF24%22%20stroke%3D%22%23FFF%22%20stroke-width%3D%223%22%20transform%3D%22rotate(-25%2012%2045)%22%2F%3E%0A%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%2210%22%20width%3D%2210%22%20height%3D%2235%22%20rx%3D%225%22%20fill%3D%22%23FBBF24%22%20stroke%3D%22%23FFF%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%3Crect%20x%3D%2232%22%20y%3D%225%22%20width%3D%2210%22%20height%3D%2240%22%20rx%3D%225%22%20fill%3D%22%23FBBF24%22%20stroke%3D%22%23FFF%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%3Crect%20x%3D%2244%22%20y%3D%228%22%20width%3D%2210%22%20height%3D%2237%22%20rx%3D%225%22%20fill%3D%22%23FBBF24%22%20stroke%3D%22%23FFF%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%3Crect%20x%3D%2256%22%20y%3D%2218%22%20width%3D%229%22%20height%3D%2228%22%20rx%3D%224%22%20fill%3D%22%23FBBF24%22%20stroke%3D%22%23FFF%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%3C%2Fg%3E%0A%20%20%3C!--%20Right%20Hand%205%20Fingers%20--%3E%0A%20%20%3Cg%20transform%3D%22translate(180%2C%2040)%20rotate(15)%22%3E%0A%20%20%20%20%3Crect%20x%3D%2220%22%20y%3D%2240%22%20width%3D%2240%22%20height%3D%2245%22%20rx%3D%2210%22%20fill%3D%22%2306B6D4%22%20stroke%3D%22%23FFF%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%3Crect%20x%3D%2260%22%20y%3D%2235%22%20width%3D%2214%22%20height%3D%2225%22%20rx%3D%227%22%20fill%3D%22%2322D3EE%22%20stroke%3D%22%23FFF%22%20stroke-width%3D%223%22%20transform%3D%22rotate(25%2068%2045)%22%2F%3E%0A%20%20%20%20%3Crect%20x%3D%2250%22%20y%3D%2210%22%20width%3D%2210%22%20height%3D%2235%22%20rx%3D%225%22%20fill%3D%22%2322D3EE%22%20stroke%3D%22%23FFF%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%3Crect%20x%3D%2238%22%20y%3D%225%22%20width%3D%2210%22%20height%3D%2240%22%20rx%3D%225%22%20fill%3D%22%2322D3EE%22%20stroke%3D%22%23FFF%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%3Crect%20x%3D%2226%22%20y%3D%228%22%20width%3D%2210%22%20height%3D%2237%22%20rx%3D%225%22%20fill%3D%22%2322D3EE%22%20stroke%3D%22%23FFF%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%3Crect%20x%3D%2215%22%20y%3D%2218%22%20width%3D%229%22%20height%3D%2228%22%20rx%3D%224%22%20fill%3D%22%2322D3EE%22%20stroke%3D%22%23FFF%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%3C%2Fg%3E%0A%20%20%3C!--%20Flash%20Spark%20--%3E%0A%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%2295%22%20r%3D%2214%22%20fill%3D%22%23FFF%22%2F%3E%0A%20%20%3C!--%20Banner%20--%3E%0A%20%20%3Crect%20x%3D%2220%22%20y%3D%22192%22%20width%3D%22280%22%20height%3D%2236%22%20rx%3D%228%22%20fill%3D%22%230284C7%22%20stroke%3D%22%2338BDF8%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2213%22%20fill%3D%22%23FFF%22%20letter-spacing%3D%222%22%3EPERFECT%20TEN!%20HIGH%20TEN!%3C%2Ftext%3E%0A%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_SIX_PACK_ENERGY',
    title: "Double Three 6 Energy",
    category: 'CONFIDENCE',
    description: "Two hands showing 3 fingers emitting neon lightning bolts with maximum hype.",
    caption: "3 + 3 = 6000 MEGAWATTS OF ENERGY!",
    aspectRatio: 1.3333333333333333,
    tags: ["three", "double_three", "six_pack", "energy", "double_hands"],
    soundId: 'AIR_HORN',
    suggestedActions: ["DOUBLE_THREE", "THREE_FINGERS"],
    rarity: 'RARE',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%231E1B4B%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%22110%22%20r%3D%2275%22%20fill%3D%22%239333EA%22%20opacity%3D%220.4%22%2F%3E%0A%20%20%3C!--%20Lightning%20bolts%20--%3E%0A%20%20%3Cpath%20d%3D%22M%20160%2020%20L%20145%2080%20L%20170%2080%20L%20150%20150%20L%20185%2075%20L%20165%2075%20Z%22%20fill%3D%22%23FACC15%22%20stroke%3D%22%23EA580C%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%3Ctext%20x%3D%2280%22%20y%3D%22115%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-weight%3D%22900%22%20font-size%3D%2260%22%20fill%3D%22%23A855F7%22%3E3%3C%2Ftext%3E%0A%20%20%3Ctext%20x%3D%22240%22%20y%3D%22115%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-weight%3D%22900%22%20font-size%3D%2260%22%20fill%3D%22%23EC4899%22%3E3%3C%2Ftext%3E%0A%20%20%3Crect%20x%3D%2220%22%20y%3D%22192%22%20width%3D%22280%22%20height%3D%2236%22%20rx%3D%228%22%20fill%3D%22%23581C87%22%20stroke%3D%22%23C084FC%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23F3E8FF%22%20letter-spacing%3D%222%22%3EUNLIMITED%203%2B3%20POWER!%3C%2Ftext%3E%0A%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_ROCK_PAPER_SCISSORS',
    title: "Rock Paper Scissors Duel",
    category: 'REACTION',
    description: "Epic comic book split clash between fist, open palm, and peace scissors.",
    caption: "WHO WINS?! DESTINY IS IN YOUR HANDS!",
    aspectRatio: 1.3333333333333333,
    tags: ["rps", "rock_paper_scissors", "versus", "duel", "double_hands"],
    soundId: 'DRAMATIC_SUSPENSE',
    suggestedActions: ["ROCK_PAPER_SCISSORS"],
    rarity: 'RARE',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%2318181B%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M%200%200%20L%20180%200%20L%20140%20240%20L%200%20240%20Z%22%20fill%3D%22%23DC2626%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M%20180%200%20L%20320%200%20L%20320%20240%20L%20140%20240%20Z%22%20fill%3D%22%232563EB%22%2F%3E%0A%20%20%3Ctext%20x%3D%2275%22%20y%3D%22115%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2236%22%20fill%3D%22%23FFF%22%3EROCK%3C%2Ftext%3E%0A%20%20%3Ctext%20x%3D%22245%22%20y%3D%22115%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2236%22%20fill%3D%22%23FFF%22%3EPAPER%3C%2Ftext%3E%0A%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%22105%22%20r%3D%2230%22%20fill%3D%22%23FACC15%22%20stroke%3D%22%23000%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%3Ctext%20x%3D%22160%22%20y%3D%22113%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-weight%3D%22900%22%20font-size%3D%2222%22%20fill%3D%22%23000%22%3EVS%3C%2Ftext%3E%0A%20%20%3Crect%20x%3D%2220%22%20y%3D%22192%22%20width%3D%22280%22%20height%3D%2236%22%20rx%3D%228%22%20fill%3D%22%23000%22%20stroke%3D%22%23FACC15%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2212%22%20fill%3D%22%23FACC15%22%20letter-spacing%3D%222%22%3EROCK%20PAPER%20SCISSORS%20DUEL!%3C%2Ftext%3E%0A%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_SECRET_HEART_AURA',
    title: "Secret Heart Hands Aura",
    category: 'SPECIAL',
    description: "Two hands forming a glowing heart surrounded by radiant pink love aura and sparkles.",
    caption: "SARANGHAE! UNCONDITIONAL LOVE ACTIVATED!",
    aspectRatio: 1.3333333333333333,
    tags: ["secret", "heart", "heart_hands", "kpop", "love", "legendary"],
    soundId: 'LEVEL_UP_NOTIFICATION',
    suggestedActions: ["SECRET_HEART_HANDS"],
    rarity: 'LEGENDARY',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%232A0845%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%22100%22%20r%3D%2275%22%20fill%3D%22%23F43F5E%22%20opacity%3D%220.35%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%22100%22%20r%3D%2250%22%20fill%3D%22%23FB7185%22%20opacity%3D%220.5%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M%20160%20140%20C%20160%20140%20110%20100%20110%2070%20C%20110%2045%20135%2045%20160%2075%20C%20185%2045%20210%2045%20210%2070%20C%20210%20100%20160%20140%20160%20140%20Z%22%20fill%3D%22%23E11D48%22%20stroke%3D%22%23FFF%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%3Crect%20x%3D%2220%22%20y%3D%22192%22%20width%3D%22280%22%20height%3D%2236%22%20rx%3D%228%22%20fill%3D%22%23881337%22%20stroke%3D%22%23FB7185%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2211%22%20fill%3D%22%23FFE4E6%22%20letter-spacing%3D%222%22%3ESECRET%3A%20HEART%20HANDS%20AURA!%3C%2Ftext%3E%0A%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_SECRET_MATRIX_GLITCH',
    title: "Secret Matrix Dodge Glitch",
    category: 'SPECIAL',
    description: "Cyberpunk green binary matrix glitch with bullet-time ripple effects.",
    caption: "HE IS BEGINNING TO BELIEVE. DODGE THIS.",
    aspectRatio: 1.3333333333333333,
    tags: ["secret", "matrix", "dodge", "bullet_time", "glitch", "legendary"],
    soundId: 'RECORD_SCRATCH',
    suggestedActions: ["SECRET_MATRIX_DODGE"],
    rarity: 'LEGENDARY',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%23022C22%22%2F%3E%0A%20%20%3Ctext%20x%3D%2220%22%20y%3D%2240%22%20font-family%3D%22monospace%22%20font-size%3D%2214%22%20fill%3D%22%2322C55E%22%20opacity%3D%220.7%22%3E01010011%2001000101%2001000011%3C%2Ftext%3E%0A%20%20%3Ctext%20x%3D%2240%22%20y%3D%2280%22%20font-family%3D%22monospace%22%20font-size%3D%2214%22%20fill%3D%22%234ADE80%22%3EBULLET-TIME%20ACTIVE%3C%2Ftext%3E%0A%20%20%3Ctext%20x%3D%2230%22%20y%3D%22120%22%20font-family%3D%22monospace%22%20font-size%3D%2218%22%20font-weight%3D%22900%22%20fill%3D%22%2386EFAC%22%3E%5B%20MATRIX%20DODGE%20SUCCESS%20%5D%3C%2Ftext%3E%0A%20%20%3Ctext%20x%3D%2250%22%20y%3D%22160%22%20font-family%3D%22monospace%22%20font-size%3D%2214%22%20fill%3D%22%2322C55E%22%20opacity%3D%220.7%22%3E01000100%2001001111%2001000100%3C%2Ftext%3E%0A%20%20%3Crect%20x%3D%2220%22%20y%3D%22192%22%20width%3D%22280%22%20height%3D%2236%22%20rx%3D%228%22%20fill%3D%22%23064E3B%22%20stroke%3D%22%234ADE80%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2211%22%20fill%3D%22%2386EFAC%22%20letter-spacing%3D%222%22%3ESECRET%3A%20MATRIX%20BULLET%20DODGE!%3C%2Ftext%3E%0A%3C%2Fsvg%3E",
  },
  {
    id: 'MEME_SECRET_YOU_ARE_BREATHTAKING',
    title: "Secret You Are Breathtaking",
    category: 'CELEBRATION',
    description: "Golden radiant dual pointing finger salute with celestial halo and star flare.",
    caption: "NO, YOU'RE BREATHTAKING! YOU'RE ALL BREATHTAKING!",
    aspectRatio: 1.3333333333333333,
    tags: ["secret", "keanu", "breathtaking", "pointing", "legendary", "double_hands"],
    soundId: 'CHAD_GONG',
    suggestedActions: ["SECRET_YOU_ARE_BREATHTAKING"],
    rarity: 'LEGENDARY',
    dataUrl: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%23451A03%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%2295%22%20r%3D%2270%22%20fill%3D%22%23F59E0B%22%20opacity%3D%220.4%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%22160%22%20cy%3D%2295%22%20r%3D%2245%22%20fill%3D%22%23FCD34D%22%20opacity%3D%220.7%22%2F%3E%0A%20%20%3Ctext%20x%3D%22160%22%20y%3D%22115%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2224%22%20fill%3D%22%2378350F%22%3E%E2%9C%A8%20%F0%9F%91%89%20%F0%9F%91%88%20%E2%9C%A8%3C%2Ftext%3E%0A%20%20%3Crect%20x%3D%2220%22%20y%3D%22192%22%20width%3D%22280%22%20height%3D%2236%22%20rx%3D%228%22%20fill%3D%22%2378350F%22%20stroke%3D%22%23FBBF24%22%20stroke-width%3D%222%22%2F%3E%0A%20%20%3Ctext%20x%3D%22160%22%20y%3D%22216%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2211%22%20fill%3D%22%23FEF3C7%22%20letter-spacing%3D%222%22%3EYOU'RE%20BREATHTAKING!%20%E2%98%85%3C%2Ftext%3E%0A%3C%2Fsvg%3E",
  },
];

export const DEFAULT_MEME_LIBRARY: MemeVisualDefinition[] = [
  ...REAL_MEDIA_MEMES,
  ...ORIGINAL_VECTOR_MEMES,
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
    // Gestures
    OPEN_PALM: 'REAL_MEME_CONFUSED_TRAVOLTA_GIF',
    CLOSED_FIST: 'REAL_MEME_ARTHURS_FIST',
    THUMBS_UP: 'REAL_MEME_GIGACHAD',
    THUMBS_DOWN: 'REAL_MEME_SAD_PABLO',
    PEACE_SIGN: 'REAL_MEME_SHAQ_SHIMMY_GIF',
    POINTING: 'REAL_MEME_SPIDERMAN_POINTING',
    PINCH: 'REAL_MEME_THE_ROCK_EYEBROW_GIF',
    THREE_FINGERS: 'REAL_MEME_THREE_DRAGONS',
    FOUR_FINGERS: 'REAL_MEME_UNO_DRAW_25',
    FIVE_FINGERS: 'REAL_MEME_MIND_BLOWN_GIF',
    SWIPE_LEFT: 'REAL_MEME_SPONGEBOB_AIGHT_GIF',
    SWIPE_RIGHT: 'REAL_MEME_LEFT_EXIT',
    // Dual Combos
    DOUBLE_THUMBS_UP: 'REAL_MEME_GIGACHAD',
    BOTH_HANDS_OPEN: 'REAL_MEME_CONFUSED_TRAVOLTA_GIF',
    BOTH_HANDS_FIST: 'REAL_MEME_BUFF_DOGE',
    DOUBLE_PEACE: 'REAL_MEME_ABSOLUTE_CINEMA_IMG',
    THUMBS_UP_AND_DOWN: 'REAL_MEME_THIS_IS_FINE',
    PERFECT_TEN: 'REAL_MEME_MIND_BLOWN_GIF',
    DOUBLE_THREE: 'REAL_MEME_THREE_DRAGONS',
    ROCK_PAPER_SCISSORS: 'REAL_MEME_ARTHURS_FIST',
    SECRET_HEART_HANDS: 'REAL_MEME_KPOP_HEART_GIF',
    SECRET_MATRIX_DODGE: 'REAL_MEME_MATRIX_DODGE_GIF',
    SECRET_YOU_ARE_BREATHTAKING: 'REAL_MEME_KEANU_BREATHTAKING_GIF',
    // Poses fallback
    T_POSE: 'REAL_MEME_SURPRISED_PIKACHU',
    HANDS_RAISED: 'REAL_MEME_SUCCESS_KID_GIF',
    HANDS_ON_HIPS: 'REAL_MEME_GIGACHAD',
    ARMS_CROSSED: 'REAL_MEME_FUTURAMA_FRY',
    SQUAT: 'REAL_MEME_THIS_IS_FINE',
    SQUAT_STANCE: 'REAL_MEME_THIS_IS_FINE',
    JUMP: 'REAL_MEME_MIND_BLOWN_GIF',
    FLEX_POSE: 'REAL_MEME_BUFF_DOGE',
    DOUBLE_BICEPS_FLEX: 'REAL_MEME_BUFF_DOGE',
    CLAP: 'REAL_MEME_DICAPRIO_TOAST_GIF',
    DAB: 'REAL_MEME_LAUGHING_LEO',
    DISCO_FEVER: 'REAL_MEME_SHAQ_SHIMMY_GIF',
    ZEN_PRAYER: 'REAL_MEME_THIS_IS_FINE',
    THE_THINKER: 'REAL_MEME_ROLL_SAFE',
    ZOMBIE_WALK: 'REAL_MEME_SAD_PABLO',
  };

  const targetId = mapping[actionId] || 'REAL_MEME_SURPRISED_PIKACHU';
  return getMemeById(targetId) || DEFAULT_MEME_LIBRARY[0]!;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filter memes by category or special tabs (ALL, FAVOURITES, CUSTOM, GIFS, REAL_MEDIA)
 */
export function filterMemesByCategory(
  category: string,
  builtInMemes: MemeVisualDefinition[] = DEFAULT_MEME_LIBRARY,
  customMemes: MemeVisualDefinition[] = [],
  favoriteIds: string[] = []
): MemeVisualDefinition[] {
  const allMemes = [...builtInMemes, ...customMemes];
  const upper = category.toUpperCase().trim();

  if (upper === 'ALL' || upper === '') {
    return allMemes;
  }
  if (upper === 'FAVOURITES' || upper === 'FAVORITES') {
    return allMemes.filter((m) => favoriteIds.includes(m.id));
  }
  if (upper === 'CUSTOM') {
    return customMemes;
  }
  if (upper === 'GIFS' || upper === 'GIF') {
    return allMemes.filter((m) => m.mediaType === 'gif');
  }
  if (upper === 'REAL_MEDIA' || upper === 'REAL') {
    return allMemes.filter((m) => m.sourceType === 'REAL_MEDIA' || m.dataUrl.startsWith('/memes/'));
  }
  return allMemes.filter((m) => m.category === upper);
}

/**
 * Real-time search across meme titles, captions, descriptions, and tags
 */
export function searchMemes(
  query: string,
  builtInMemes: MemeVisualDefinition[] = DEFAULT_MEME_LIBRARY,
  customMemes: MemeVisualDefinition[] = []
): MemeVisualDefinition[] {
  const allMemes = [...builtInMemes, ...customMemes];
  const q = query.toLowerCase().trim();
  if (!q) return allMemes;

  return allMemes.filter((m) => {
    return (
      m.title.toLowerCase().includes(q) ||
      (m.caption && m.caption.toLowerCase().includes(q)) ||
      m.description.toLowerCase().includes(q) ||
      (m.tags && m.tags.some((t) => t.toLowerCase().includes(q)))
    );
  });
}

/**
 * Selects an eligible random meme for a triggered action, avoiding immediate repetition
 */
export function getRandomMemeForAction(
  actionId: string,
  excludeMemeIdOrCustomMemes?: string | MemeVisualDefinition[],
  customMemesOrExcludeMemeId?: MemeVisualDefinition[] | string
): MemeVisualDefinition {
  let excludeMemeId: string | undefined;
  let customMemes: MemeVisualDefinition[] = [];

  if (typeof excludeMemeIdOrCustomMemes === 'string') {
    excludeMemeId = excludeMemeIdOrCustomMemes;
    if (Array.isArray(customMemesOrExcludeMemeId)) {
      customMemes = customMemesOrExcludeMemeId;
    }
  } else if (Array.isArray(excludeMemeIdOrCustomMemes)) {
    customMemes = excludeMemeIdOrCustomMemes;
    if (typeof customMemesOrExcludeMemeId === 'string') {
      excludeMemeId = customMemesOrExcludeMemeId;
    }
  }

  const allMemes = [...DEFAULT_MEME_LIBRARY, ...customMemes];
  const recommendedIds = GOOFY_ACTION_RECOMMENDED_MEMES[actionId as keyof typeof GOOFY_ACTION_RECOMMENDED_MEMES] || [];
  
  let candidates = allMemes.filter((m) => recommendedIds.includes(m.id));
  if (candidates.length === 0) {
    candidates = allMemes;
  }

  if (excludeMemeId && candidates.length > 1) {
    const withoutRepeat = candidates.filter((m) => m.id !== excludeMemeId);
    if (withoutRepeat.length > 0) {
      candidates = withoutRepeat;
    }
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  return chosen || DEFAULT_MEME_LIBRARY[0]!;
}

/**
 * Returns a rare or legendary meme from the special collection
 */
export function getRareMeme(customMemes: MemeVisualDefinition[] = []): MemeVisualDefinition {
  const allMemes = [...DEFAULT_MEME_LIBRARY, ...customMemes];
  const rarePool = allMemes.filter((m) => m.rarity === 'RARE' || m.rarity === 'LEGENDARY' || m.category === 'SPECIAL');
  if (rarePool.length > 0) {
    return rarePool[Math.floor(Math.random() * rarePool.length)]!;
  }
  return DEFAULT_MEME_LIBRARY[0]!;
}

/**
 * Retrieve preset by ID
 */
export function getPresetById(id: string): MemePresetDefinition | undefined {
  return BUILTIN_MEME_PRESETS.find((p) => p.id === id);
}

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

export async function saveCustomMemeDefinitionToDB(
  meme: MemeVisualDefinition
): Promise<MemeVisualDefinition> {
  const db = await openMemeDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(meme);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  return meme;
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
