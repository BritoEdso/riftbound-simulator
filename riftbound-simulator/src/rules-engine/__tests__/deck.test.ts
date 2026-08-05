import { draw } from '../deck';
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

function makeState(p1Deck: CardDefinition[], p2Deck: CardDefinition[] = []): GameState {
  return {
    turnPlayer: 'p1',
    victoryScore: 8,
    players: {
      p1: { id: 'p1', points: 0, hand: [], deck: p1Deck },
      p2: { id: 'p2', points: 0, hand: [], deck: p2Deck },
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

  it('draws only what is available when the deck has fewer cards than requested', () => {
    const state = makeState([makeCard('c1')]);

    const drawn = draw(state, 'p1', 3);

    expect(drawn).toEqual([makeCard('c1')]);
    expect(state.players.p1.hand).toEqual([makeCard('c1')]);
    expect(state.players.p1.deck).toEqual([]);
  });

  it('draws nothing and does not throw when the deck is empty', () => {
    const state = makeState([]);

    const drawn = draw(state, 'p1', 1);

    expect(drawn).toEqual([]);
    expect(state.players.p1.hand).toEqual([]);
  });

  it('only affects the drawing player, not their opponent', () => {
    const state = makeState([makeCard('c1')], [makeCard('other')]);

    draw(state, 'p1');

    expect(state.players.p2.hand).toEqual([]);
    expect(state.players.p2.deck).toEqual([makeCard('other')]);
  });
});
