import { CardDefinition } from './types';

// Card data provenance: CLAUDE.md's resolved sourcing decision is the
// official Riot card gallery (https://playriftbound.com/en-us/card-gallery/),
// not a fan site. OGN-058/OGN-104 below predate that decision being written
// down and their original source is disputed/unverified — see the
// "Inconsistency to resolve" note in CLAUDE.md's Card data section; don't
// treat either claim about them as settled. OGN-011 was transcribed directly
// from the official gallery.
export const CARD_DEFINITIONS: Record<string, CardDefinition> = {
  'OGN-058': {
    id: 'OGN-058',
    name: 'Discipline',
    type: 'Spell',
    domains: ['Calm'],
    energyCost: 2,
    powerCost: {},
    keywords: ['Reaction'],
    rulesText: 'Give a unit +2 Might this turn. Draw 1.',
  },
  'OGN-104': {
    id: 'OGN-104',
    name: 'Retreat',
    type: 'Spell',
    domains: ['Mind'],
    energyCost: 1,
    powerCost: {},
    keywords: ['Reaction'],
    rulesText: "Return a friendly unit to its owner's hand. Its owner channels 1 rune exhausted.",
  },
  'OGN-011': {
    id: 'OGN-011',
    name: 'Magma Wurm',
    type: 'Unit',
    domains: ['Fury'],
    energyCost: 8,
    powerCost: { Fury: 1 },
    might: 8,
    keywords: [],
    rulesText: 'Other friendly units enter ready.',
  },
};
