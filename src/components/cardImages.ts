interface CardImageEntry {
    src: string;
    width: number;
    height: number;
    alt: string;
    type: string;
}

export const CARD_IMAGES: Record<string, CardImageEntry> = {
  'OGN-058': { src: '/cards/ogn-058-discipline.png', width: 744, height: 1039, alt: 'Discipline', type: 'Spell' },
  'OGN-104': { src: '/cards/ogn-104-retreat.png', width: 744, height: 1039, alt: 'Retreat', type: 'Spell'  },
  'OGN-007': { src: '/cards/ogn-007-fury-rune.png', width: 744, height: 1039, alt: 'Fury Rune', type: 'Rune' },
  'OGN-042': { src: '/cards/ogn-042-calm-rune.png', width: 744, height: 1039, alt: 'Calm Rune', type: 'Rune'  },
  'OGN-089': { src: '/cards/ogn-089-mind-rune.png', width: 744, height: 1039, alt: 'Mind Rune', type: 'Rune'  },
  'OGN-126': { src: '/cards/ogn-126-body-rune.png', width: 744, height: 1039, alt: 'Body Rune', type: 'Rune'  },
  'OGN-166': { src: '/cards/ogn-166-chaos-rune.png', width: 744, height: 1039, alt: 'Chaos Rune', type: 'Rune'  },
  'OGN-214': { src: '/cards/ogn-214-order-rune.png', width: 744, height: 1039, alt: 'Order Rune', type: 'Rune'  },
  'OGN-289': { src: '/cards/ogn-289-targons-peak.png', width: 1038, height: 744, alt: "Targon's Peak", type:'Battlefield'},
  'OGN-298': { src: '/cards/ogn-298-zaun-warrens.png', width: 1038, height: 744, alt: 'Zaun Warrens', type: 'Battlefield' },
  'OGN-293': { src: '/cards/ogn-293-the-grand-plaza.png', width: 1038, height: 744, alt: 'The Grand Plaza', type: 'Battlefield' },
  'OGN-303': { src: '/cards/ogn-303-nine-tailed-fox-legend.png', width: 1488, height: 2078, alt: 'Nine-Tailed Fox (Legend)', type: 'Legend' },
  // Ahri cards — base printings, from the official card gallery's image CDN
  // (see docs/cards/ahri.md). OGN-255 is the base Nine-Tailed Fox; OGN-303
  // above is its Showcase alt-art, which the Legend pages use.
  'OGN-255': { src: '/cards/ogn-255-nine-tailed-fox-legend.png', width: 744, height: 1039, alt: 'Nine-Tailed Fox (Legend)', type: 'Legend' },
  'OGN-066': { src: '/cards/ogn-066-ahri-alluring.png', width: 744, height: 1039, alt: 'Ahri, Alluring', type: 'Unit' },
  'OGN-119': { src: '/cards/ogn-119-ahri-inquisitive.png', width: 744, height: 1039, alt: 'Ahri, Inquisitive', type: 'Unit' },
  'RAD-038': { src: '/cards/rad-038-ahri-confident.png', width: 744, height: 1039, alt: 'Ahri, Confident', type: 'Unit' },
  'OGN-256': { src: '/cards/ogn-256-fox-fire.png', width: 744, height: 1039, alt: 'Fox-Fire', type: 'Spell' },
};