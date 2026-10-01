import { canAffordEnergyCost, payEnergyCost } from '../cost';
import { CardDefinition, GameState } from '../types';

function makeCard(energyCost: number): CardDefinition {
  return {
    id: 'test-card',
    name: 'test-card',
    type: 'Spell',
    domains: [],
    energyCost,
    powerCost: {},
    keywords: [],
    rulesText: '',
  };
}

function makeState(energyPool: number): GameState {
  return {
    turnPlayer: 'p1',
    victoryScore: 8,
    players: {
      p1: { id: 'p1', points: 0, hand: [], deck: [], runeDeck: [], runesInPlay: [], energyPool, powerPool: {} },
      p2: { id: 'p2', points: 0, hand: [], deck: [], runeDeck: [], runesInPlay: [], energyPool: 0, powerPool: {} },
    },
    battlefields: [],
    units: [],
  };
}

describe('canAffordEnergyCost', () => {
  it('is true when the Rune Pool has at least the Energy cost', () => {
    expect(canAffordEnergyCost(makeState(2), 'p1', makeCard(2))).toBe(true);
    expect(canAffordEnergyCost(makeState(3), 'p1', makeCard(2))).toBe(true);
  });

  it('is false when the Rune Pool has less than the Energy cost', () => {
    expect(canAffordEnergyCost(makeState(1), 'p1', makeCard(2))).toBe(false);
    expect(canAffordEnergyCost(makeState(0), 'p1', makeCard(1))).toBe(false);
  });

  it('a free (0 Energy cost) card is always affordable', () => {
    expect(canAffordEnergyCost(makeState(0), 'p1', makeCard(0))).toBe(true);
  });
});

describe('payEnergyCost', () => {
  it('deducts the Energy cost from the Rune Pool', () => {
    const state = makeState(3);

    payEnergyCost(state, 'p1', makeCard(2));

    expect(state.players.p1.energyPool).toBe(1);
  });

  it("throws rather than letting a player's Energy go negative", () => {
    const state = makeState(1);

    expect(() => payEnergyCost(state, 'p1', makeCard(2))).toThrow();
    expect(state.players.p1.energyPool).toBe(1); // unchanged
  });

  it('only affects the paying player', () => {
    const state = makeState(3);

    payEnergyCost(state, 'p1', makeCard(2));

    expect(state.players.p2.energyPool).toBe(0);
  });
});
