import { channel } from '../rune';
import { GameState } from '../types';

function makeState(p1RuneDeck: GameState['players']['p1']['runeDeck'], p2RuneDeck: GameState['players']['p1']['runeDeck'] = []): GameState {
  return {
    turnPlayer: 'p1',
    victoryScore: 8,
    players: {
      p1: { id: 'p1', points: 0, hand: [], deck: [], runeDeck: p1RuneDeck, runesInPlay: [] },
      p2: { id: 'p2', points: 0, hand: [], deck: [], runeDeck: p2RuneDeck, runesInPlay: [] },
    },
    battlefields: [],
    units: [],
  };
}

describe('channel', () => {
  it('moves the top rune from the Rune Deck onto the board, Ready by default', () => {
    const state = makeState(['Calm', 'Fury']);

    const channeled = channel(state, 'p1');

    expect(channeled).toEqual([{ instanceId: 'p1-rune-0', domain: 'Calm', ready: true }]);
    expect(state.players.p1.runesInPlay).toEqual(channeled);
    expect(state.players.p1.runeDeck).toEqual(['Fury']);
  });

  it('channels multiple runes in deck order when count > 1', () => {
    const state = makeState(['Calm', 'Fury', 'Mind']);

    const channeled = channel(state, 'p1', 2);

    expect(channeled.map((r) => r.domain)).toEqual(['Calm', 'Fury']);
    expect(state.players.p1.runeDeck).toEqual(['Mind']);
  });

  it('supports channeling Exhausted rather than Ready (e.g. Retreat: "channels 1 rune exhausted")', () => {
    const state = makeState(['Mind']);

    const channeled = channel(state, 'p1', 1, false);

    expect(channeled[0].ready).toBe(false);
  });

  it('channels only what is available when the Rune Deck has fewer runes than requested (rule 515.4.b.2)', () => {
    const state = makeState(['Calm']);

    const channeled = channel(state, 'p1', 3);

    expect(channeled).toHaveLength(1);
    expect(state.players.p1.runeDeck).toEqual([]);
  });

  it('assigns instanceIds that stay unique across multiple channels', () => {
    const state = makeState(['Calm', 'Fury', 'Mind']);

    channel(state, 'p1', 1);
    const second = channel(state, 'p1', 2);

    expect(state.players.p1.runesInPlay.map((r) => r.instanceId)).toEqual([
      'p1-rune-0',
      'p1-rune-1',
      'p1-rune-2',
    ]);
    expect(second.map((r) => r.instanceId)).toEqual(['p1-rune-1', 'p1-rune-2']);
  });

  it('only affects the channeling player, not their opponent', () => {
    const state = makeState(['Calm'], ['Fury']);

    channel(state, 'p1');

    expect(state.players.p2.runesInPlay).toEqual([]);
    expect(state.players.p2.runeDeck).toEqual(['Fury']);
  });
});
