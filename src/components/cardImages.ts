interface CardImageEntry {
    src: string;
    width: number;
    height: number;
    alt: string;
}

export const CARD_IMAGES: Record<string, CardImageEntry> = {
  'OGN-058': { src: '/cards/ogn-058-discipline.png', width: 744, height: 1039, alt: 'Discipline' },
  'OGN-104': { src: '/cards/ogn-104-retreat.png', width: 744, height: 1039, alt: 'Retreat' },
  'OGN-007': { src: '/cards/ogn-007-fury-rune.png', width: 744, height: 1039, alt: 'Fury Rune' },
  'OGN-042': { src: '/cards/ogn-042-calm-rune.png', width: 744, height: 1039, alt: 'Calm Rune' },
  'OGN-089': { src: '/cards/ogn-089-mind-rune.png', width: 744, height: 1039, alt: 'Mind Rune' },
  'OGN-126': { src: '/cards/ogn-126-body-rune.png', width: 744, height: 1039, alt: 'Body Rune' },
  'OGN-166': { src: '/cards/ogn-166-chaos-rune.png', width: 744, height: 1039, alt: 'Chaos Rune' },
  'OGN-214': { src: '/cards/ogn-214-order-rune.png', width: 744, height: 1039, alt: 'Order Rune' },
  'OGN-289': { src: '/cards/ogn-289-targons-peak.png', width: 1038, height: 744, alt: "Targon's Peak" },
  'OGN-298': { src: '/cards/ogn-298-zaun-warrens.png', width: 1038, height: 744, alt: 'Zaun Warrens' },
  'OGN-293': { src: '/cards/ogn-293-the-grand-plaza.png', width: 1038, height: 744, alt: 'The Grand Plaza' },
  'OGN-303': { src: '/cards/ogn-303-nine-tailed-fox-legend.png', width: 1488, height: 2078, alt: 'Nine-Tailed Fox (Legend)' },
};