import { CardDefinition } from './types';

// Hand-entered from the exact rules text on https://piltoverarchive.com/cards
// (a fan-run database, not an official Riot source — verify before bulk import).
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
};
