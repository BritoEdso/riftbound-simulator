import { CARD_DEFINITIONS } from '../cards';
import { resolveCombat } from '../combat';
import { applyDiscipline, applyHextechRay } from '../effects';
import { score } from '../scoring';
import { CardDefinition, GameState, UnitInPlay } from '../types';

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

function makeUnit(overrides: Partial<UnitInPlay>): UnitInPlay {
  return {
    instanceId: overrides.instanceId ?? 'unit',
    cardId: overrides.cardId ?? 'test-card',
    controller: overrides.controller ?? 'p1',
    location: overrides.location ?? 'bf1',
    baseMight: overrides.baseMight ?? 0,
    might: overrides.might ?? 0,
    damage: overrides.damage ?? 0,
    keywords: overrides.keywords ?? [],
    combatRole: overrides.combatRole ?? null,
    ready: overrides.ready ?? true,
  };
}

function makeGameState(units: UnitInPlay[]): GameState {
  return {
    turnPlayer: 'p1',
    victoryScore: 8,
    players: {
      p1: { id: 'p1', points: 0, hand: [], deck: [], runeDeck: [], runesInPlay: [], energyPool: 0, powerPool: {}, trash: [] },
      p2: { id: 'p2', points: 7, hand: [], deck: [], runeDeck: [], runesInPlay: [], energyPool: 0, powerPool: {}, trash: [] },
    },
    battlefields: [{ id: 'bf1', controller: 'p2', contested: true, scoredByThisTurn: [] }],
    units,
  };
}

describe('the example scenario: 5-Might attacker vs 6-Might defender', () => {
  it('without Discipline, the attacker dies and the defender holds the battlefield', () => {
    const attacker = makeUnit({
      instanceId: 'attacker',
      controller: 'p1',
      baseMight: 5,
      might: 5,
      combatRole: 'attacking',
    });
    const defender = makeUnit({
      instanceId: 'defender',
      controller: 'p2',
      baseMight: 6,
      might: 6,
      combatRole: 'defending',
    });
    const state = makeGameState([attacker, defender]);

    const result = resolveCombat(state, 'bf1');

    expect(result.killed).toEqual(['attacker']);
    expect(result.conquered).toBe(false);
    expect(state.units.map((u) => u.instanceId)).toEqual(['defender']);
    expect(state.battlefields[0].controller).toBe('p2');
  });

  it('with Discipline (+2 Might) on the attacker, it survives, kills the defender, and conquers', () => {
    const attacker = makeUnit({
      instanceId: 'attacker',
      controller: 'p1',
      baseMight: 5,
      might: 5,
      combatRole: 'attacking',
    });
    const defender = makeUnit({
      instanceId: 'defender',
      controller: 'p2',
      baseMight: 6,
      might: 6,
      combatRole: 'defending',
    });
    const state = makeGameState([attacker, defender]);
    state.players.p1.deck = [makeCard('draw-card')];

    applyDiscipline(state, 'attacker', 'p1');
    expect(attacker.might).toBe(7);
    // Discipline's "Draw 1" — the top card of the attacker's controller's
    // deck should now be in their hand.
    expect(state.players.p1.hand).toEqual([makeCard('draw-card')]);

    const result = resolveCombat(state, 'bf1');

    expect(result.killed).toEqual(['defender']);
    expect(result.conquered).toBe(true);
    expect(result.newController).toBe('p1');
    expect(state.units.map((u) => u.instanceId)).toEqual(['attacker']);
    expect(state.battlefields[0].controller).toBe('p1');

    // Surviving attacker took 6 damage but isn't lethal at 7 Might, and
    // damage clears after combat resolves.
    expect(attacker.damage).toBe(0);
  });

  it('conquering does not win the game at match point unless every battlefield was scored this turn', () => {
    const attacker = makeUnit({
      instanceId: 'attacker',
      controller: 'p1',
      baseMight: 5,
      might: 5,
      combatRole: 'attacking',
    });
    const defender = makeUnit({
      instanceId: 'defender',
      controller: 'p2',
      baseMight: 6,
      might: 6,
      combatRole: 'defending',
    });
    const state = makeGameState([attacker, defender]);
    state.players.p1.points = 7; // one point from Victory Score (8)
    state.battlefields.push({ id: 'bf2', controller: 'p2', contested: false, scoredByThisTurn: [] });
    // Two cards queued up: one for Discipline's "Draw 1", one for the
    // Conquer-at-match-point-without-full-board "draw a card instead" case.
    state.players.p1.deck = [makeCard('discipline-draw'), makeCard('score-draw')];

    applyDiscipline(state, 'attacker', 'p1');
    expect(state.players.p1.hand).toEqual([makeCard('discipline-draw')]);
    resolveCombat(state, 'bf1');

    const result = score(state, 'p1', 'bf1', 'conquer');

    expect(result.scored).toBe(true);
    expect(result.wonGame).toBe(false);
    expect(result.drewCardInstead).toBe(true);
    expect(state.players.p1.points).toBe(7);
    expect(state.players.p1.hand).toEqual([makeCard('discipline-draw'), makeCard('score-draw')]);

    // Now p1 also scores their other battlefield (bf2) this turn — the next
    // Conquer/Hold there would grant the Final Point. Here we simulate that
    // bf2 was Held instead.
    const finalResult = score(state, 'p1', 'bf2', 'hold');
    expect(finalResult.wonGame).toBe(true);
    expect(state.players.p1.points).toBe(8);
  });
});

describe('damage assignment order (rule 627: equal-priority targets, assigning player chooses)', () => {
  // The defender's Might (3) is both its health and what it deals back —
  // enough to kill B (1) but not A (4), so whichever of A/B is prioritized
  // determines who's actually at risk. The defender itself dies either way
  // (attackers' combined Might, 5, exceeds its own, 3) — a full wipe is
  // order-independent in this engine; only which specific units survive a
  // *partial* wipe depends on the chosen order. Fresh units per scenario —
  // resolveCombat mutates them, so they can't be shared across two runs.
  function makeTrio() {
    return [
      makeUnit({ instanceId: 'A', controller: 'p1', might: 4, combatRole: 'attacking' }),
      makeUnit({ instanceId: 'B', controller: 'p1', might: 1, combatRole: 'attacking' }),
      makeUnit({ instanceId: 'defender', controller: 'p2', might: 3, combatRole: 'defending' }),
    ];
  }

  it("lets the assigning player choose which of two equal-priority targets is put at risk", () => {
    const prioritizeA = makeGameState(makeTrio());
    const resultA = resolveCombat(prioritizeA, 'bf1', { defenderDamageOrder: ['A', 'B'] });
    // All 3 damage goes to A (nonlethal, needs 4); B is never reached.
    expect(resultA.killed).toEqual(['defender']);
    expect(prioritizeA.units.map((u) => u.instanceId).sort()).toEqual(['A', 'B']);
    expect(resultA.conquered).toBe(true);

    const prioritizeB = makeGameState(makeTrio());
    const resultB = resolveCombat(prioritizeB, 'bf1', { defenderDamageOrder: ['B', 'A'] });
    // B gets its 1 lethal and dies too; the remaining 2 go to A (still nonlethal).
    expect(resultB.killed.sort()).toEqual(['B', 'defender']);
    expect(prioritizeB.units.map((u) => u.instanceId)).toEqual(['A']);
    expect(resultB.conquered).toBe(true);
  });

  it('cannot override Tank priority — a Tank still goes first even if the hint orders it last', () => {
    const tank = makeUnit({ instanceId: 'tank', controller: 'p2', might: 2, keywords: ['Tank'], combatRole: 'defending' });
    const nonTank = makeUnit({ instanceId: 'nonTank', controller: 'p2', might: 5, combatRole: 'defending' });
    const attacker = makeUnit({ instanceId: 'attacker', controller: 'p1', might: 2, combatRole: 'attacking' });
    const state = makeGameState([attacker, tank, nonTank]);

    // Hint tries to put the non-Tank first; Tank priority must still win.
    const result = resolveCombat(state, 'bf1', { attackerDamageOrder: ['nonTank', 'tank'] });

    expect(result.killed.sort()).toEqual(['attacker', 'tank']);
    expect(state.units.map((u) => u.instanceId)).toEqual(['nonTank']);
  });
});

describe('killed Units are placed in their owner\'s Trash (rule 524.1/525)', () => {
  it('places a killed registered CardDefinition in its owner\'s trash', () => {
    const attacker = makeUnit({
      instanceId: 'attacker',
      cardId: 'OGN-011', // Magma Wurm — a real, registered CardDefinition
      controller: 'p1',
      might: 10,
      combatRole: 'attacking',
    });
    const defender = makeUnit({
      instanceId: 'defender',
      cardId: 'OGN-011',
      controller: 'p2',
      might: 1,
      combatRole: 'defending',
    });
    const state = makeGameState([attacker, defender]);

    resolveCombat(state, 'bf1');

    expect(state.players.p2.trash).toEqual([CARD_DEFINITIONS['OGN-011']]);
    expect(state.players.p1.trash).toEqual([]); // the attacker survived
  });

  it('skips the trash for an unregistered test cardId (no CardDefinition to place)', () => {
    const attacker = makeUnit({ instanceId: 'attacker', controller: 'p1', might: 10, combatRole: 'attacking' });
    const defender = makeUnit({ instanceId: 'defender', controller: 'p2', might: 1, combatRole: 'defending' });
    const state = makeGameState([attacker, defender]);

    resolveCombat(state, 'bf1');

    expect(state.players.p2.trash).toEqual([]);
  });
});

describe('applyHextechRay (OGN-009): "Deal 3 to a unit at a battlefield."', () => {
  it('deals 3 damage to the target', () => {
    const unit = makeUnit({ instanceId: 'u1', controller: 'p2', might: 10 });
    const state = makeGameState([unit]);

    applyHextechRay(state, 'u1');

    expect(unit.damage).toBe(3);
  });

  it('kills the target outright (via Cleanup, rule 522) when 3 damage is lethal', () => {
    const unit = makeUnit({ instanceId: 'u1', cardId: 'OGN-011', controller: 'p2', might: 3 });
    const state = makeGameState([unit]);

    applyHextechRay(state, 'u1');

    expect(state.units).toEqual([]);
    expect(state.players.p2.trash).toEqual([CARD_DEFINITIONS['OGN-011']]);
  });

  it('leaves a unit with more Might than the damage dealt alive', () => {
    const unit = makeUnit({ instanceId: 'u1', controller: 'p2', might: 4 });
    const state = makeGameState([unit]);

    applyHextechRay(state, 'u1');

    expect(state.units).toEqual([unit]);
  });
});
