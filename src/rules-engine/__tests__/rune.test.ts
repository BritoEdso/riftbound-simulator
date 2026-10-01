import { channel, exhaustRuneForEnergy, recycleRuneForPower } from '../rune';
import { GameState, RuneInPlay } from '../types';

function makeState(
  p1RuneDeck: GameState['players']['p1']['runeDeck'] = [],
  p1RunesInPlay: RuneInPlay[] = [],
  p2RuneDeck: GameState['players']['p1']['runeDeck'] = [],
): GameState {
  return {
    turnPlayer: 'p1',
    victoryScore: 8,
    players: {
      p1: { id: 'p1', points: 0, hand: [], deck: [], runeDeck: p1RuneDeck, runesInPlay: p1RunesInPlay, energyPool: 0, powerPool: {} },
      p2: { id: 'p2', points: 0, hand: [], deck: [], runeDeck: p2RuneDeck, runesInPlay: [], energyPool: 0, powerPool: {} },
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
    const state = makeState(['Calm'], [], ['Fury']);

    channel(state, 'p1');

    expect(state.players.p2.runesInPlay).toEqual([]);
    expect(state.players.p2.runeDeck).toEqual(['Fury']);
  });
});

describe('exhaustRuneForEnergy ("[T]: Add [1]", rule 156.2.a)', () => {
  it('exhausts a Ready rune and adds 1 Energy to the Rune Pool', () => {
    const state = makeState([], [{ instanceId: 'r1', domain: 'Calm', ready: true }]);

    exhaustRuneForEnergy(state, 'p1', 'r1');

    expect(state.players.p1.runesInPlay).toEqual([{ instanceId: 'r1', domain: 'Calm', ready: false }]);
    expect(state.players.p1.energyPool).toBe(1);
  });

  it('throws if the rune is already Exhausted (rule 592: cannot Exhaust an Exhausted Game Object)', () => {
    const state = makeState([], [{ instanceId: 'r1', domain: 'Calm', ready: false }]);

    expect(() => exhaustRuneForEnergy(state, 'p1', 'r1')).toThrow();
    expect(state.players.p1.energyPool).toBe(0);
  });

  it('throws for an unknown rune instanceId', () => {
    const state = makeState();

    expect(() => exhaustRuneForEnergy(state, 'p1', 'nope')).toThrow();
  });
});

describe('recycleRuneForPower ("Recycle this: Add [C]", rule 156.2.a)', () => {
  it("returns the rune to the bottom of the Rune Deck and adds 1 Power of its own domain", () => {
    const state = makeState(['Fury'], [{ instanceId: 'r1', domain: 'Calm', ready: true }]);

    recycleRuneForPower(state, 'p1', 'r1');

    expect(state.players.p1.runesInPlay).toEqual([]);
    expect(state.players.p1.runeDeck).toEqual(['Fury', 'Calm']);
    expect(state.players.p1.powerPool).toEqual({ Calm: 1 });
  });

  it("doesn't require the rune to be Ready — Recycling isn't an Exhaust action", () => {
    const state = makeState([], [{ instanceId: 'r1', domain: 'Mind', ready: false }]);

    expect(() => recycleRuneForPower(state, 'p1', 'r1')).not.toThrow();
    expect(state.players.p1.powerPool).toEqual({ Mind: 1 });
  });

  it('accumulates Power across multiple Recycles of the same domain', () => {
    const state = makeState(
      [],
      [
        { instanceId: 'r1', domain: 'Calm', ready: true },
        { instanceId: 'r2', domain: 'Calm', ready: true },
      ],
    );

    recycleRuneForPower(state, 'p1', 'r1');
    recycleRuneForPower(state, 'p1', 'r2');

    expect(state.players.p1.powerPool).toEqual({ Calm: 2 });
  });
});
