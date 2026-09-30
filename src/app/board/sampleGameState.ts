import { CARD_DEFINITIONS } from '@/rules-engine/cards';
import { CardDefinition, GameState } from '@/rules-engine/types';

// A real, already-solved position — the same 5-Might-attacker-vs-6-Might-
// defender scenario proven in solver.test.ts and written up in "The Solver
// — Engineering Notes" — used here to give the board UI real GameState data
// to render instead of inventing a new fixture.

function fillerCard(id: string): CardDefinition {
  return {
    id,
    name: id,
    type: 'Spell',
    domains: [],
    energyCost: 0,
    powerCost: {},
    keywords: [],
    rulesText: '',
  };
}

export const YOU_PLAYER_ID = 'p1';
export const OPPONENT_PLAYER_ID = 'p2';

export const SAMPLE_GAME_STATE: GameState = {
  turnPlayer: YOU_PLAYER_ID,
  victoryScore: 8,
  players: {
    [YOU_PLAYER_ID]: {
      id: YOU_PLAYER_ID,
      points: 7,
      hand: [CARD_DEFINITIONS['OGN-058'], CARD_DEFINITIONS['OGN-104']],
      deck: Array.from({ length: 22 }, (_, i) => fillerCard(`you-deck-${i}`)),
    },
    [OPPONENT_PLAYER_ID]: {
      id: OPPONENT_PLAYER_ID,
      points: 6,
      hand: Array.from({ length: 4 }, (_, i) => fillerCard(`opp-hand-${i}`)),
      deck: Array.from({ length: 24 }, (_, i) => fillerCard(`opp-deck-${i}`)),
    },
  },
  battlefields: [
    { id: 'bf1', controller: OPPONENT_PLAYER_ID, contested: true, scoredByThisTurn: [] },
    { id: 'bf2', controller: YOU_PLAYER_ID, contested: false, scoredByThisTurn: [YOU_PLAYER_ID] },
  ],
  units: [
    {
      instanceId: 'attacker',
      cardId: 'sample-unit',
      controller: YOU_PLAYER_ID,
      location: 'bf1',
      baseMight: 5,
      might: 5,
      damage: 0,
      keywords: [],
      combatRole: 'attacking',
    },
    {
      instanceId: 'defender',
      cardId: 'sample-unit',
      controller: OPPONENT_PLAYER_ID,
      location: 'bf1',
      baseMight: 6,
      might: 6,
      damage: 0,
      keywords: ['Tank'],
      combatRole: 'defending',
    },
    {
      instanceId: 'holder',
      cardId: 'sample-unit',
      controller: YOU_PLAYER_ID,
      location: 'bf2',
      baseMight: 3,
      might: 3,
      damage: 0,
      keywords: [],
      combatRole: null,
    },
  ],
};
