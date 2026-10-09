import { CARD_DEFINITIONS } from '@/rules-engine/cards';
import { CardDefinition, Domain, GameState, RuneInPlay } from '@/rules-engine/types';

// A real, already-solved position — the same 5-Might-attacker-vs-6-Might-
// defender scenario proven in solver.test.ts and written up in "The Solver
// — Engineering Notes" — used here to give the board UI real GameState data
// to render instead of inventing a new fixture.

function makeRune(instanceId: string, domain: Domain, ready: boolean): RuneInPlay {
  return { instanceId, domain, ready };
}

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
  turnNumber: 1,
  victoryScore: 8,
  players: {
    [YOU_PLAYER_ID]: {
      id: YOU_PLAYER_ID,
      points: 7,
      hand: [CARD_DEFINITIONS['OGN-058'], CARD_DEFINITIONS['OGN-104']],
      deck: Array.from({ length: 22 }, (_, i) => fillerCard(`you-deck-${i}`)),
      // 4 channeled (rule 606) + 8 still in the Rune Deck = 12 total (154.2.b).
      runesInPlay: [
        makeRune('you-rune-0', 'Calm', true),
        makeRune('you-rune-1', 'Calm', true),
        makeRune('you-rune-2', 'Mind', false),
        makeRune('you-rune-3', 'Fury', true),
      ],
      runeDeck: ['Calm', 'Mind', 'Fury', 'Body', 'Chaos', 'Order', 'Calm', 'Mind'],
      // The exhausted Mind rune above already paid for this Energy.
      energyPool: 1,
      powerPool: {},
      trash: [fillerCard('you-fallen-unit')],
    },
    [OPPONENT_PLAYER_ID]: {
      id: OPPONENT_PLAYER_ID,
      points: 6,
      hand: Array.from({ length: 4 }, (_, i) => fillerCard(`opp-hand-${i}`)),
      deck: Array.from({ length: 24 }, (_, i) => fillerCard(`opp-deck-${i}`)),
      // 3 channeled + 9 still in the Rune Deck = 12 total.
      runesInPlay: [
        makeRune('opp-rune-0', 'Body', true),
        makeRune('opp-rune-1', 'Chaos', true),
        makeRune('opp-rune-2', 'Order', false),
      ],
      runeDeck: ['Body', 'Chaos', 'Order', 'Body', 'Chaos', 'Order', 'Body', 'Chaos', 'Order'],
      // The exhausted Order rune above already paid for this Energy.
      energyPool: 1,
      powerPool: {},
      trash: [],
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
      ready: false,
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
      ready: false,
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
      ready: true,
    },
  ],
};
