import { CARD_DEFINITIONS } from '../cards';
import { isPlayableNow, passPriority, playSpell, priorityHolder } from '../chain';
import { beginShowdown, combatDamageDue } from '../showdown';
import { applyAction, canWin, legalActions } from '../solver';
import { CardDefinition, GameState, PlayerState, UnitInPlay } from '../types';

function makeCard(id: string): CardDefinition {
  return { id, name: id, type: 'Spell', domains: [], energyCost: 0, powerCost: {}, keywords: [], rulesText: '' };
}

function makeUnit(overrides: Partial<UnitInPlay>): UnitInPlay {
  return {
    instanceId: 'unit',
    cardId: 'test-card',
    controller: 'p1',
    location: 'bf1',
    baseMight: 1,
    might: 1,
    damage: 0,
    keywords: [],
    combatRole: null,
    ready: true,
    ...overrides,
  };
}

function makePlayer(id: string): PlayerState {
  return { id, points: 0, hand: [], deck: [makeCard(`${id}-draw`)], runeDeck: [], runesInPlay: [], energyPool: 0, powerPool: {}, trash: [] };
}

function makeState(units: UnitInPlay[]): GameState {
  return {
    turnPlayer: 'p1',
    turnNumber: 1,
    chain: null,
    showdown: null,
    victoryScore: 8,
    players: { p1: makePlayer('p1'), p2: makePlayer('p2') },
    battlefields: [{ id: 'bf1', controller: 'p2', contested: true, scoredByThisTurn: [] }],
    units,
  };
}

// p1's Might-5 attacker vs p2's Might-6 defender: p1 needs Discipline (+2)
// to win the fight, and is at 7 points so the Conquer wins the game.
function makeDisciplineFight(): GameState {
  const state = makeState([
    makeUnit({ instanceId: 'attacker', controller: 'p1', might: 5, baseMight: 5, combatRole: 'attacking' }),
    makeUnit({ instanceId: 'defender', controller: 'p2', might: 6, baseMight: 6, combatRole: 'defending' }),
  ]);
  state.players.p1.points = 7;
  state.players.p1.hand = [CARD_DEFINITIONS['OGN-058']];
  state.players.p1.energyPool = 2;
  return state;
}

// p1 at 7 points walks a Might-2 scout onto an empty, uncontrolled bf1 — the
// only battlefield — so taking Control wins the game.
function makeScoutState(): GameState {
  const state = makeState([makeUnit({ instanceId: 'scout', controller: 'p1', location: 'base', might: 2, baseMight: 2 })]);
  state.battlefields = [{ id: 'bf1', controller: null, contested: false, scoredByThisTurn: [] }];
  state.players.p1.points = 7;
  return state;
}

function giveHextechRay(state: GameState, playerId: string): void {
  state.players[playerId].hand.push(CARD_DEFINITIONS['OGN-009']);
  state.players[playerId].energyPool += 1;
  state.players[playerId].powerPool = { Fury: 1 };
}

describe('beginShowdown (rules 548-550)', () => {
  it('opens a Combat when both sides have Units there, with Focus to the Attacker', () => {
    const state = makeDisciplineFight();

    beginShowdown(state, 'bf1');

    expect(state.showdown).toEqual({ battlefieldId: 'bf1', isCombat: true, focus: 'p1', consecutivePasses: 0 });
    expect(priorityHolder(state)).toBe('p1');
  });

  it('opens a non-combat Showdown at an uncontrolled battlefield, with Focus to the player who arrived', () => {
    const state = makeScoutState();
    const moved = applyAction(state, { type: 'moveUnit', unitInstanceId: 'scout', destination: 'bf1' });

    beginShowdown(moved, 'bf1');

    expect(moved.showdown).toMatchObject({ isCombat: false, focus: 'p1' });
  });
});

describe('a Contested battlefield forces its Showdown first (rule ~525-526)', () => {
  it('offers only beginShowdown — no moves, spells, or rune taps until it starts', () => {
    const state = makeDisciplineFight();
    state.units.push(makeUnit({ instanceId: 'other', controller: 'p1', location: 'base' }));
    state.players.p1.runesInPlay = [{ instanceId: 'r1', domain: 'Calm', ready: true }];

    expect(legalActions(state, 'p1')).toEqual([{ type: 'beginShowdown', battlefieldId: 'bf1' }]);
  });
});

describe('Focus and passing (rules 553-555)', () => {
  it('alternates Focus; once both pass in a row a Combat is due for damage, with Focus back on the Attacker', () => {
    const state = makeDisciplineFight();
    beginShowdown(state, 'bf1');

    passPriority(state, 'p1');
    expect(state.showdown?.focus).toBe('p2');
    expect(combatDamageDue(state)).toBe(false);

    passPriority(state, 'p2');
    expect(combatDamageDue(state)).toBe(true);
    expect(priorityHolder(state)).toBe('p1');
    expect(legalActions(state, 'p1').map((a) => a.type)).toEqual(['resolveCombat']);
  });

  it('a Chain started mid-Showdown, once empty, passes Focus to the other player and resets the passes', () => {
    const state = makeDisciplineFight();
    beginShowdown(state, 'bf1');
    passPriority(state, 'p1'); // p1 passes Focus...
    state.players.p2.hand = [CARD_DEFINITIONS['OGN-058']];
    state.players.p2.energyPool = 2;
    playSpell(state, 'p2', 'OGN-058', 'defender'); // ...p2 uses theirs
    passPriority(state, 'p2');
    passPriority(state, 'p1'); // Discipline resolves

    expect(state.chain).toBeNull();
    expect(state.showdown).toMatchObject({ focus: 'p1', consecutivePasses: 0 });
  });

  it('a non-combat Showdown that everyone passes through hands the arriving player Control and a Conquer Score', () => {
    const state = makeScoutState();
    state.players.p1.points = 3;
    let next = applyAction(state, { type: 'moveUnit', unitInstanceId: 'scout', destination: 'bf1' });
    next = applyAction(next, { type: 'beginShowdown', battlefieldId: 'bf1' });
    next = applyAction(next, { type: 'pass', playerId: 'p1' });
    next = applyAction(next, { type: 'pass', playerId: 'p2' });

    expect(next.showdown).toBeNull();
    expect(next.battlefields[0]).toMatchObject({ controller: 'p1', contested: false, scoredByThisTurn: ['p1'] });
    expect(next.players.p1.points).toBe(4);
  });
});

describe('timing: the Action keyword means "playable in Showdowns" (rule 718)', () => {
  it('Hextech Ray (Action) is playable with Focus in a Showdown, but not as a response on a Chain', () => {
    const state = makeDisciplineFight();
    beginShowdown(state, 'bf1');
    expect(isPlayableNow(state, 'OGN-009')).toBe(true);

    playSpell(state, 'p1', 'OGN-058', 'attacker');
    expect(isPlayableNow(state, 'OGN-009')).toBe(false); // Closed State: Reactions only
    expect(isPlayableNow(state, 'OGN-058')).toBe(true);
  });

  it('no moves or unit plays during a Showdown', () => {
    const state = makeDisciplineFight();
    state.units.push(makeUnit({ instanceId: 'other', controller: 'p1', location: 'base' }));
    state.players.p1.hand.push(CARD_DEFINITIONS['OGN-011']);
    state.players.p1.energyPool = 10;
    state.players.p1.powerPool = { Fury: 1 };
    beginShowdown(state, 'bf1');

    const types = new Set(legalActions(state, 'p1').map((a) => a.type));

    expect(types.has('moveUnit')).toBe(false);
    expect(types.has('playUnit')).toBe(false);
    expect(types.has('playSpell')).toBe(true);
  });
});

describe('canWin across a Showdown', () => {
  it('Discipline wins the fight when the defender has nothing to do with their Focus', () => {
    expect(canWin(makeDisciplineFight(), 'p1').won).toBe(true);
  });

  it("…but the defender's Focus lets them Hextech Ray the attacker — an Action, so impossible before Showdowns existed", () => {
    const state = makeDisciplineFight();
    giveHextechRay(state, 'p2');

    // Whatever order p1 tries, p2 gets Focus at some point and Rays the
    // attacker for 3; even at 7 Might it can't then survive the defender's 6.
    expect(canWin(state, 'p1').won).toBe(false);
  });

  it('walking onto an empty battlefield wins at match point when nobody can stop it', () => {
    expect(canWin(makeScoutState(), 'p1').won).toBe(true);
  });

  it("…but not if the opponent can Ray the scout during the non-combat Showdown — it never takes Control", () => {
    const state = makeScoutState();
    giveHextechRay(state, 'p2');

    expect(canWin(state, 'p1').won).toBe(false);
  });
});
