import { CARD_DEFINITIONS } from '../cards';
import { recycleRuneForPower } from '../rune';
import { applyAction, canWin } from '../solver';
import { awaken, channelPhase, drawPhase, endTurn, holdBattlefields, passTurn, startTurn } from '../turn';
import { CardDefinition, GameState, PlayerState, UnitInPlay } from '../types';

function makeCard(id: string): CardDefinition {
  return { id, name: id, type: 'Spell', domains: [], energyCost: 0, powerCost: {}, keywords: [], rulesText: '' };
}

function makeUnit(overrides: Partial<UnitInPlay>): UnitInPlay {
  return {
    instanceId: 'unit',
    cardId: 'test-card',
    controller: 'p1',
    location: 'base',
    baseMight: 1,
    might: 1,
    damage: 0,
    keywords: [],
    combatRole: null,
    ready: false,
    ...overrides,
  };
}

function makePlayer(id: string): PlayerState {
  return { id, points: 0, hand: [], deck: [], runeDeck: [], runesInPlay: [], energyPool: 0, powerPool: {}, trash: [] };
}

function makeState(): GameState {
  return {
    turnPlayer: 'p1',
    turnNumber: 1,
    chain: null,
    showdown: null,
    victoryScore: 8,
    players: { p1: makePlayer('p1'), p2: makePlayer('p2') },
    battlefields: [
      { id: 'bf1', controller: null, contested: false, scoredByThisTurn: [] },
      { id: 'bf2', controller: null, contested: false, scoredByThisTurn: [] },
    ],
    units: [],
  };
}

describe('awaken (rule 515.1)', () => {
  it("readies the Turn Player's units and runes, and nobody else's", () => {
    const state = makeState();
    state.units = [
      makeUnit({ instanceId: 'mine', controller: 'p1' }),
      makeUnit({ instanceId: 'theirs', controller: 'p2' }),
    ];
    state.players.p1.runesInPlay = [{ instanceId: 'r1', domain: 'Fury', ready: false }];
    state.players.p2.runesInPlay = [{ instanceId: 'r2', domain: 'Calm', ready: false }];

    awaken(state);

    expect(state.units.map((u) => u.ready)).toEqual([true, false]);
    expect(state.players.p1.runesInPlay[0].ready).toBe(true);
    expect(state.players.p2.runesInPlay[0].ready).toBe(false);
  });
});

describe('holdBattlefields (rule 515.2.b / 630.2)', () => {
  it('scores 1 point per battlefield the Turn Player controls, and not the opponent', () => {
    const state = makeState();
    state.battlefields[0].controller = 'p1';
    state.battlefields[1].controller = 'p2';

    holdBattlefields(state);

    expect(state.players.p1.points).toBe(1);
    expect(state.players.p2.points).toBe(0);
    expect(state.battlefields[0].scoredByThisTurn).toEqual(['p1']);
  });

  it('a Hold at 7 points grants the Final Point outright', () => {
    const state = makeState();
    state.battlefields[0].controller = 'p1';
    state.players.p1.points = 7;

    holdBattlefields(state);

    expect(state.players.p1.points).toBe(8);
  });
});

describe('channelPhase (rule 515.3)', () => {
  it('channels 2 Ready runes normally', () => {
    const state = makeState();
    state.players.p1.runeDeck = ['Fury', 'Calm', 'Mind'];

    channelPhase(state);

    expect(state.players.p1.runesInPlay.map((r) => [r.domain, r.ready])).toEqual([
      ['Fury', true],
      ['Calm', true],
    ]);
  });

  it("channels 3 on turn 2 — Duel's extra rune for the player going second", () => {
    const state = makeState();
    state.turnPlayer = 'p2';
    state.turnNumber = 2;
    state.players.p2.runeDeck = ['Fury', 'Calm', 'Mind', 'Body'];

    channelPhase(state);

    expect(state.players.p2.runesInPlay).toHaveLength(3);
  });

  it('never reuses an instanceId still in play, even after a Recycle shrinks runesInPlay', () => {
    const state = makeState();
    state.players.p1.runeDeck = ['Fury', 'Calm', 'Mind', 'Body'];
    channelPhase(state); // p1-rune-0, p1-rune-1
    recycleRuneForPower(state, 'p1', 'p1-rune-0');

    channelPhase(state);

    const ids = state.players.p1.runesInPlay.map((r) => r.instanceId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('drawPhase (rule 515.4)', () => {
  it("draws 1, then empties every player's Rune Pool, not just the Turn Player's", () => {
    const state = makeState();
    state.players.p1.deck = [makeCard('a'), makeCard('b')];
    state.players.p1.energyPool = 3;
    state.players.p2.powerPool = { Fury: 1 };

    drawPhase(state);

    expect(state.players.p1.hand.map((c) => c.id)).toEqual(['a']);
    expect(state.players.p1.energyPool).toBe(0);
    expect(state.players.p2.powerPool).toEqual({});
  });
});

describe('startTurn', () => {
  it('stops once a Hold wins the game — no Draw afterwards to Burn Out and hand the opponent a point', () => {
    const state = makeState();
    state.battlefields[0].controller = 'p1';
    state.players.p1.points = 7;
    state.players.p1.runeDeck = ['Fury', 'Calm'];

    startTurn(state);

    expect(state.players.p1.points).toBe(8);
    expect(state.players.p2.points).toBe(0);
    expect(state.players.p1.runesInPlay).toEqual([]); // Channel never ran either
  });
});

describe('endTurn (rule 517)', () => {
  it('clears damage, expires "this turn" Might, empties pools, resets scoring, and passes the turn', () => {
    const state = makeState();
    state.units = [makeUnit({ baseMight: 3, might: 5, damage: 2 })]; // e.g. Discipline'd
    state.players.p1.energyPool = 2;
    state.battlefields[0].scoredByThisTurn = ['p1'];

    endTurn(state);

    expect(state.units[0]).toMatchObject({ might: 3, damage: 0 });
    expect(state.units).toHaveLength(1); // damage cleared before Cleanup — nothing dies
    expect(state.players.p1.energyPool).toBe(0);
    expect(state.battlefields[0].scoredByThisTurn).toEqual([]);
    expect(state.turnPlayer).toBe('p2');
    expect(state.turnNumber).toBe(2);
  });
});

describe('across turns: a Unit played this turn can attack on your next one', () => {
  it('Magma Wurm enters Exhausted (no win this turn), but after Awaken the solver finds the attack', () => {
    const state = makeState();
    // One battlefield, so Conquering it at 7 points satisfies the Final
    // Point's "Scored every battlefield this turn" requirement.
    state.battlefields = [{ id: 'bf1', controller: 'p2', contested: false, scoredByThisTurn: [] }];
    state.units = [makeUnit({ instanceId: 'blocker', controller: 'p2', location: 'bf1', baseMight: 3, might: 3 })];
    state.players.p1.points = 7;
    state.players.p1.energyPool = 8;
    state.players.p1.powerPool = { Fury: 1 };
    state.players.p1.hand = [CARD_DEFINITIONS['OGN-011']]; // Magma Wurm, Might 8
    state.players.p1.deck = [makeCard('a'), makeCard('b')];
    state.players.p2.deck = [makeCard('c')];

    const played = applyAction(state, {
      type: 'playUnit',
      playerId: 'p1',
      cardId: 'OGN-011',
      instanceId: 'wurm',
      location: 'base',
    });
    expect(canWin(played, 'p1').won).toBe(false); // rule 139.4: entered Exhausted

    passTurn(played); // p2's turn (they have nothing to do)
    passTurn(played); // back to p1 — Awaken readies the Wurm

    expect(played.turnPlayer).toBe('p1');
    expect(played.units.find((u) => u.instanceId === 'wurm')?.ready).toBe(true);
    const result = canWin(played, 'p1');
    expect(result.won).toBe(true);
    expect(result.line[0]).toEqual({ type: 'moveUnits', unitInstanceIds: ['wurm'], destination: 'bf1' });
  });
});

describe('Hold only scores battlefields you still have Units at', () => {
  it("abandoning a battlefield on your turn means you don't Hold it on your next", () => {
    const state = makeState();
    state.battlefields[0].controller = 'p1';
    state.units = [makeUnit({ instanceId: 'u1', controller: 'p1', location: 'bf1', ready: true })];
    state.players.p1.deck = [makeCard('a')];
    state.players.p2.deck = [makeCard('b')];

    const next = applyAction(state, { type: 'moveUnits', unitInstanceIds: ['u1'], destination: 'base' });
    passTurn(next);
    passTurn(next);

    expect(next.battlefields[0].controller).toBeNull();
    expect(next.players.p1.points).toBe(0);
  });

  it('stops Holding once the Final Point is scored — no points past Victory Score', () => {
    const state = makeState();
    state.battlefields[0].controller = 'p1';
    state.battlefields[1].controller = 'p1';
    state.players.p1.points = 7;

    holdBattlefields(state);

    expect(state.players.p1.points).toBe(8);
  });
});
