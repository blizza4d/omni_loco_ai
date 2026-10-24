export type WasteCategory =
  | 'plastic'
  | 'paper'
  | 'cardboard'
  | 'glass'
  | 'metal'
  | 'organic'
  | 'e-waste'
  | 'textile'
  | 'hazardous'
  | 'general';

export type BinType = 'RECYCLE' | 'COMPOST' | 'E-WASTE' | 'HAZARDOUS' | 'LANDFILL';

export interface WasteClassMeta {
  id: WasteCategory;
  name: string;
  bin: BinType;
  binChipVariant: 'sage' | 'charcoal' | 'brick';
  disposalTip: string;
}

export const WASTE_CLASSES: Record<WasteCategory, WasteClassMeta> = {
  plastic: {
    id: 'plastic',
    name: 'PLASTIC (PETE / HDPE)',
    bin: 'RECYCLE',
    binChipVariant: 'sage',
    disposalTip: 'Rinse liquid residue thoroughly, collapse container, and secure cap back onto bottle.',
  },
  paper: {
    id: 'paper',
    name: 'PAPER / NEWSPRINT',
    bin: 'RECYCLE',
    binChipVariant: 'sage',
    disposalTip: 'Keep dry and unsoiled; remove plastic window envelopes and staple bindings.',
  },
  cardboard: {
    id: 'cardboard',
    name: 'CORRUGATED CARDBOARD',
    bin: 'RECYCLE',
    binChipVariant: 'sage',
    disposalTip: 'Break down and flatten boxes; strip plastic packing tape and polystyrene foam.',
  },
  glass: {
    id: 'glass',
    name: 'GLASS CONTAINER',
    bin: 'RECYCLE',
    binChipVariant: 'sage',
    disposalTip: 'Rinse food jars and beverage bottles; do not mix with drinking ceramics or window pane glass.',
  },
  metal: {
    id: 'metal',
    name: 'ALUMINUM & TIN METAL',
    bin: 'RECYCLE',
    binChipVariant: 'sage',
    disposalTip: 'Rinse food tins and beverage cans; paper labels are acceptable during smelting.',
  },
  organic: {
    id: 'organic',
    name: 'ORGANIC FOOD BIOMASS',
    bin: 'COMPOST',
    binChipVariant: 'sage',
    disposalTip: 'Place in aerated organic composting bin; omit animal bones, high oils, and plastic wraps.',
  },
  'e-waste': {
    id: 'e-waste',
    name: 'ELECTRONIC WASTE (E-WASTE)',
    bin: 'E-WASTE',
    binChipVariant: 'brick',
    disposalTip: 'Contains heavy metals and solder; never place in municipal garbage. Take to designated depot.',
  },
  textile: {
    id: 'textile',
    name: 'FABRIC / TEXTILE',
    bin: 'LANDFILL',
    binChipVariant: 'charcoal',
    disposalTip: 'Clean dry fabrics can be redirected to community textile collection or industrial shredding.',
  },
  hazardous: {
    id: 'hazardous',
    name: 'HAZARDOUS CHEMICAL / CELL',
    bin: 'HAZARDOUS',
    binChipVariant: 'brick',
    disposalTip: 'Toxic corrosive or flammable item. Deposit at civic hazardous waste facility in sealed tub.',
  },
  general: {
    id: 'general',
    name: 'GENERAL / NON-RECYCLABLE',
    bin: 'LANDFILL',
    binChipVariant: 'charcoal',
    disposalTip: 'Multilayer composite film and mixed materials; deposit in municipal residual landfill bin.',
  },
};

export interface ClassificationPrediction {
  category: WasteCategory;
  confidence: number;
  label: string;
}

export interface ClassificationResult {
  lockedCategory: WasteCategory | null;
  isStable: boolean;
  top3: ClassificationPrediction[];
  backend: string;
  inferenceDurationMs: number;
}
