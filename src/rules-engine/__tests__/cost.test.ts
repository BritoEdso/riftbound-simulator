import { canAffordCost, canAffordEnergyCost, canAffordPowerCost, payCost, payEnergyCost, payPowerCost } from '../cost';
import { CardDefinition, GameState, PowerPool } from '../types';

function makeCard(energyCost: number, powerCost: CardDefinition['powerCost'] = {}): CardDefinition {
  return {
    id: 'test-card',
    name: 'test-card',
    type: 'Spell',
    domains: [],
    energyCost,
    powerCost,
    keywords: [],
    rulesText: '',
  };
}

function makeState(energyPool: number, powerPool: PowerPool = {}): GameState {
  return {
    turnPlayer: 'p1',
    turnNumber: 1,
    chain: null,
    showdown: null,
    victoryScore: 8,
    players: {
      p1: { id: 'p1', points: 0, hand: [], deck: [], runeDeck: [], runesInPlay: [], energyPool, powerPool, trash: [] },
      p2: { id: 'p2', points: 0, hand: [], deck: [], runeDeck: [], runesInPlay: [], energyPool: 0, powerPool: {}, trash: [] },
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

describe('canAffordPowerCost (rule 159.1: Universal Power covers any Domain)', () => {
  it("is true when the card's own Domain has enough Power", () => {
    const state = makeState(0, { Fury: 1 });
    expect(canAffordPowerCost(state, 'p1', makeCard(0, { Fury: 1 }))).toBe(true);
  });

  it('is true when Universal Power covers a shortfall in the needed Domain', () => {
    const state = makeState(0, { Fury: 0, Universal: 1 });
    expect(canAffordPowerCost(state, 'p1', makeCard(0, { Fury: 1 }))).toBe(true);
  });

  it('is true when own-Domain Power and Universal Power combine to cover the cost', () => {
    const state = makeState(0, { Fury: 1, Universal: 1 });
    expect(canAffordPowerCost(state, 'p1', makeCard(0, { Fury: 2 }))).toBe(true);
  });

  it('is false when neither own-Domain nor Universal Power covers the cost', () => {
    const state = makeState(0, { Fury: 1, Universal: 0 });
    expect(canAffordPowerCost(state, 'p1', makeCard(0, { Fury: 2 }))).toBe(false);
  });

  it('sums shortfalls across multiple Domains against one shared Universal pool', () => {
    // Needs 1 Calm (have 0) and 1 Mind (have 0) — 2 Universal covers both.
    const affordable = makeState(0, { Universal: 2 });
    expect(canAffordPowerCost(affordable, 'p1', makeCard(0, { Calm: 1, Mind: 1 }))).toBe(true);

    const short = makeState(0, { Universal: 1 });
    expect(canAffordPowerCost(short, 'p1', makeCard(0, { Calm: 1, Mind: 1 }))).toBe(false);
  });

  it('a free (empty powerCost) card is always affordable', () => {
    expect(canAffordPowerCost(makeState(0), 'p1', makeCard(0))).toBe(true);
  });

  it("throws on a 'Universal' entry in the cost itself — not modeled, no card has one", () => {
    const state = makeState(0, { Universal: 5 });
    expect(() => canAffordPowerCost(state, 'p1', makeCard(0, { Universal: 1 }))).toThrow();
  });
});

describe('payPowerCost', () => {
  it("deducts from the card's own Domain first", () => {
    const state = makeState(0, { Fury: 3 });

    payPowerCost(state, 'p1', makeCard(0, { Fury: 2 }));

    expect(state.players.p1.powerPool).toEqual({ Fury: 1 });
  });

  it('draws Universal Power only for the shortfall beyond the own-Domain pool', () => {
    const state = makeState(0, { Fury: 1, Universal: 3 });

    payPowerCost(state, 'p1', makeCard(0, { Fury: 2 }));

    expect(state.players.p1.powerPool).toEqual({ Fury: 0, Universal: 2 });
  });

  it("throws rather than letting a player's Power go negative", () => {
    const state = makeState(0, { Fury: 1 });

    expect(() => payPowerCost(state, 'p1', makeCard(0, { Fury: 2 }))).toThrow();
    expect(state.players.p1.powerPool).toEqual({ Fury: 1 }); // unchanged
  });
});

describe('canAffordCost / payCost (rule 740: Energy and Power together)', () => {
  it('needs both the Energy and the Power halves satisfied', () => {
    const energyOnly = makeState(8, { Fury: 0 });
    expect(canAffordCost(energyOnly, 'p1', makeCard(8, { Fury: 1 }))).toBe(false);

    const powerOnly = makeState(0, { Fury: 1 });
    expect(canAffordCost(powerOnly, 'p1', makeCard(8, { Fury: 1 }))).toBe(false);

    const both = makeState(8, { Fury: 1 });
    expect(canAffordCost(both, 'p1', makeCard(8, { Fury: 1 }))).toBe(true);
  });

  it('pays both halves — Magma Wurm (OGN-011): Energy 8, Power 1 Fury', () => {
    const state = makeState(8, { Fury: 1 });

    payCost(state, 'p1', makeCard(8, { Fury: 1 }));

    expect(state.players.p1.energyPool).toBe(0);
    expect(state.players.p1.powerPool).toEqual({ Fury: 0 });
  });
});
