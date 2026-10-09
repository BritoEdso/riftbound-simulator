import { CARD_DEFINITIONS } from '../cards';
import { passPriority, playSpell, priorityHolder } from '../chain';
import { canWin, legalActions } from '../solver';
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
  return { id, points: 0, hand: [], deck: [], runeDeck: [], runesInPlay: [], energyPool: 0, powerPool: {}, trash: [] };
}

// p1's Might-1 attacker vs p2's Might-3 defender at a contested bf1 — p1
// loses the fight honestly, but Hextech Ray (Deal 3) kills the defender
// first and p1 conquers unopposed for the win. Whether p2 can stop that is
// what these tests vary.
function makeRayState(): GameState {
  const state: GameState = {
    turnPlayer: 'p1',
    turnNumber: 1,
    chain: null,
    showdown: null,
    victoryScore: 8,
    players: { p1: makePlayer('p1'), p2: makePlayer('p2') },
    battlefields: [{ id: 'bf1', controller: 'p2', contested: true, scoredByThisTurn: [] }],
    units: [
      makeUnit({ instanceId: 'attacker', controller: 'p1', might: 1, baseMight: 1, combatRole: 'attacking' }),
      makeUnit({ instanceId: 'defender', controller: 'p2', might: 3, baseMight: 3, combatRole: 'defending' }),
    ],
  };
  state.players.p1.points = 7;
  state.players.p1.hand = [CARD_DEFINITIONS['OGN-009']]; // Hextech Ray
  state.players.p1.energyPool = 1;
  state.players.p1.powerPool = { Fury: 1 };
  state.players.p1.deck = [makeCard('p1-draw')];
  state.players.p2.deck = [makeCard('p2-draw')];
  return state;
}

describe('playSpell puts a Spell on the Chain instead of resolving it (rule 554/537)', () => {
  it('pays the cost and takes the card from hand, but nothing happens yet — the caster holds Priority', () => {
    const state = makeRayState();

    playSpell(state, 'p1', 'OGN-009', 'defender');

    expect(state.chain).toEqual({
      items: [{ cardId: 'OGN-009', controller: 'p1', targetInstanceId: 'defender' }],
      priority: 'p1',
      consecutivePasses: 0,
    });
    expect(state.players.p1.hand).toEqual([]);
    expect(state.players.p1.energyPool).toBe(0);
    expect(state.units.find((u) => u.instanceId === 'defender')?.damage).toBe(0);
    expect(state.players.p1.trash).toEqual([]); // not until it resolves
  });

  it('refuses to let a player without Priority play', () => {
    const state = makeRayState();
    state.players.p2.hand = [CARD_DEFINITIONS['OGN-058']];
    state.players.p2.energyPool = 2;

    expect(() => playSpell(state, 'p2', 'OGN-058', 'defender')).toThrow();
  });
});

describe('passPriority (rule 540)', () => {
  it('one pass hands Priority over; both passing in a row resolves the item, trashes it, and closes the Chain', () => {
    const state = makeRayState();
    playSpell(state, 'p1', 'OGN-009', 'defender');

    passPriority(state, 'p1');
    expect(state.chain?.priority).toBe('p2');
    expect(state.units).toHaveLength(2); // still unresolved

    passPriority(state, 'p2');
    expect(state.chain).toBeNull();
    expect(state.units.map((u) => u.instanceId)).toEqual(['attacker']); // killed at the Cleanup after resolving
    expect(state.players.p1.trash).toEqual([CARD_DEFINITIONS['OGN-009']]);
    expect(priorityHolder(state)).toBe('p1'); // back to the Turn Player, Open State
  });

  it('resolves newest-first; afterwards Priority goes to the controller of the next item and everyone must pass again', () => {
    const state = makeRayState();
    state.players.p2.hand = [CARD_DEFINITIONS['OGN-058']]; // Discipline
    state.players.p2.energyPool = 2;
    playSpell(state, 'p1', 'OGN-009', 'defender');
    passPriority(state, 'p1');
    playSpell(state, 'p2', 'OGN-058', 'defender'); // +2 Might in response
    passPriority(state, 'p2');
    passPriority(state, 'p1');

    // Discipline resolved first (LIFO); the Ray is still waiting.
    expect(state.units.find((u) => u.instanceId === 'defender')?.might).toBe(5);
    expect(state.chain).toEqual({
      items: [{ cardId: 'OGN-009', controller: 'p1', targetInstanceId: 'defender' }],
      priority: 'p1',
      consecutivePasses: 0,
    });

    passPriority(state, 'p1');
    passPriority(state, 'p2');
    // 3 damage no longer kills a Might-5 defender.
    expect(state.units.find((u) => u.instanceId === 'defender')).toMatchObject({ might: 5, damage: 3 });
  });
});

describe('a Spell whose target became illegal still resolves (rule 563.2.c)', () => {
  it("Hextech Ray does nothing to a unit Retreated in response, but still goes to the Trash", () => {
    const state = makeRayState();
    state.units[1].cardId = 'OGN-011'; // a real card, so Retreat can return it to hand
    state.players.p2.hand = [CARD_DEFINITIONS['OGN-104']]; // Retreat
    state.players.p2.energyPool = 1;
    playSpell(state, 'p1', 'OGN-009', 'defender');
    passPriority(state, 'p1');
    playSpell(state, 'p2', 'OGN-104', 'defender');
    for (const p of ['p2', 'p1', 'p1', 'p2']) passPriority(state, p);

    expect(state.chain).toBeNull();
    expect(state.players.p2.hand).toEqual([CARD_DEFINITIONS['OGN-011']]);
    expect(state.players.p1.trash).toEqual([CARD_DEFINITIONS['OGN-009']]);
  });

  it("Discipline's \"Draw 1\" still happens when its target is gone", () => {
    const state = makeRayState();
    state.players.p1.hand = [CARD_DEFINITIONS['OGN-058']];
    state.players.p1.energyPool = 2;
    state.players.p2.hand = [CARD_DEFINITIONS['OGN-104']];
    state.players.p2.energyPool = 1;
    // p1 Disciplines p2's defender; p2 Retreats it in response (LIFO: Retreat resolves first).
    playSpell(state, 'p1', 'OGN-058', 'defender');
    passPriority(state, 'p1');
    playSpell(state, 'p2', 'OGN-104', 'defender');
    for (const p of ['p2', 'p1', 'p1', 'p2']) passPriority(state, p);

    expect(state.units.some((u) => u.instanceId === 'defender')).toBe(false);
    expect(state.players.p1.hand.map((c) => c.id)).toEqual(['p1-draw']);
  });
});

describe('legalActions respects Priority and the Closed State (rules 510-512)', () => {
  it('offers nothing to a player without Priority', () => {
    const state = makeRayState();
    state.players.p2.hand = [CARD_DEFINITIONS['OGN-058']];
    state.players.p2.energyPool = 2;

    expect(legalActions(state, 'p2')).toEqual([]);
  });

  it('while a Chain exists: Reactions and passing only — no Action-speed spells, moves, combat, or units', () => {
    const state = makeRayState();
    state.players.p1.hand.push(CARD_DEFINITIONS['OGN-009'], CARD_DEFINITIONS['OGN-058']);
    state.players.p1.energyPool = 5;
    state.players.p1.powerPool = { Fury: 2 };
    state.units.push(makeUnit({ instanceId: 'mover', controller: 'p1', location: 'base' }));
    playSpell(state, 'p1', 'OGN-009', 'defender');

    const types = new Set(legalActions(state, 'p1').map((a) => (a.type === 'playSpell' ? a.cardId : a.type)));

    expect(types).toEqual(new Set(['pass', 'OGN-058'])); // Discipline is a Reaction; Hextech Ray is an Action
  });
});

describe('canWin must survive every opponent response', () => {
  it('Hextech Ray wins when the opponent has nothing to respond with', () => {
    expect(canWin(makeRayState(), 'p1').won).toBe(true);
  });

  it("…but not when the opponent can Discipline their defender in response — +2 Might survives the Ray", () => {
    const state = makeRayState();
    state.players.p2.hand = [CARD_DEFINITIONS['OGN-058']];
    state.players.p2.energyPool = 2;

    expect(canWin(state, 'p1').won).toBe(false);
  });

  it("…and a response that doesn't help them (Retreating the defender just abandons the battlefield) doesn't change the verdict", () => {
    const state = makeRayState();
    state.players.p2.hand = [CARD_DEFINITIONS['OGN-104']];
    state.players.p2.energyPool = 1;

    expect(canWin(state, 'p1').won).toBe(true);
  });

  it("the opponent's response is only as good as their Rune Pool — Discipline they can't pay for changes nothing", () => {
    const state = makeRayState();
    state.players.p2.hand = [CARD_DEFINITIONS['OGN-058']];
    state.players.p2.energyPool = 1; // one short

    expect(canWin(state, 'p1').won).toBe(true);
  });
});
