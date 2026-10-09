import { burnOut, draw } from '../deck';
import { CardDefinition, GameState } from '../types';

function makeCard(id: string): CardDefinition {
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

function makeState(
  p1Deck: CardDefinition[],
  p2Deck: CardDefinition[] = [],
  p1Trash: CardDefinition[] = [],
): GameState {
  return {
    turnPlayer: 'p1',
    turnNumber: 1,
    chain: null,
    showdown: null,
    victoryScore: 8,
    players: {
      p1: { id: 'p1', points: 0, hand: [], deck: p1Deck, runeDeck: [], runesInPlay: [], energyPool: 0, powerPool: {}, trash: p1Trash },
      p2: { id: 'p2', points: 0, hand: [], deck: p2Deck, runeDeck: [], runesInPlay: [], energyPool: 0, powerPool: {}, trash: [] },
    },
    battlefields: [],
    units: [],
  };
}

describe('draw', () => {
  it('moves the top card from deck to hand and returns it', () => {
    const state = makeState([makeCard('c1'), makeCard('c2')]);

    const drawn = draw(state, 'p1');

    expect(drawn).toEqual([makeCard('c1')]);
    expect(state.players.p1.hand).toEqual([makeCard('c1')]);
    expect(state.players.p1.deck).toEqual([makeCard('c2')]);
  });

  it('draws multiple cards in deck order when count > 1', () => {
    const state = makeState([makeCard('c1'), makeCard('c2'), makeCard('c3')]);

    const drawn = draw(state, 'p1', 2);

    expect(drawn).toEqual([makeCard('c1'), makeCard('c2')]);
    expect(state.players.p1.hand).toEqual([makeCard('c1'), makeCard('c2')]);
    expect(state.players.p1.deck).toEqual([makeCard('c3')]);
  });

  it('draws only what is available when the deck (and trash, to Burn Out into it) is empty', () => {
    const state = makeState([makeCard('c1')]);

    const drawn = draw(state, 'p1', 3);

    expect(drawn).toEqual([makeCard('c1')]);
    expect(state.players.p1.hand).toEqual([makeCard('c1')]);
    expect(state.players.p1.deck).toEqual([]);
    // The 2nd and 3rd draw attempts each found an empty deck and empty
    // trash, so each is its own Burn Out (rule 609) — p2 gains 2 points.
    expect(state.players.p2.points).toBe(2);
  });

  it('draws nothing and does not throw when the deck is empty, but still Burns Out (rule 607)', () => {
    const state = makeState([]);

    const drawn = draw(state, 'p1', 1);

    expect(drawn).toEqual([]);
    expect(state.players.p1.hand).toEqual([]);
    expect(state.players.p2.points).toBe(1);
  });

  it('only affects the drawing player, not their opponent', () => {
    const state = makeState([makeCard('c1')], [makeCard('other')]);

    draw(state, 'p1');

    expect(state.players.p2.hand).toEqual([]);
    expect(state.players.p2.deck).toEqual([makeCard('other')]);
  });
});

describe('burnOut (rule 607)', () => {
  it("shuffles the player's trash into their deck", () => {
    const state = makeState([], [], [makeCard('t1'), makeCard('t2')]);

    burnOut(state, 'p1');

    expect(state.players.p1.trash).toEqual([]);
    expect(state.players.p1.deck).toEqual([makeCard('t1'), makeCard('t2')]);
  });

  it('gives the opponent 1 point', () => {
    const state = makeState([], [], [makeCard('t1')]);

    burnOut(state, 'p1');

    expect(state.players.p2.points).toBe(1);
  });

  it('still gives the opponent a point even when the trash is also empty (rule 609)', () => {
    const state = makeState([]);

    burnOut(state, 'p1');

    expect(state.players.p2.points).toBe(1);
    expect(state.players.p1.deck).toEqual([]);
  });

  it("lets a subsequent draw succeed once there's trash to reshuffle", () => {
    const state = makeState([], [], [makeCard('t1')]);

    const drawn = draw(state, 'p1', 1);

    expect(drawn).toEqual([makeCard('t1')]);
    expect(state.players.p1.hand).toEqual([makeCard('t1')]);
    expect(state.players.p2.points).toBe(1);
  });
});
