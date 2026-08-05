import { resolveCombat } from '../combat';
import { applyDiscipline } from '../effects';
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
  };
}

function makeGameState(units: UnitInPlay[]): GameState {
  return {
    turnPlayer: 'p1',
    victoryScore: 8,
    players: {
      p1: { id: 'p1', points: 0, hand: [], deck: [] },
      p2: { id: 'p2', points: 7, hand: [], deck: [] },
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

    applyDiscipline(state, 'attacker');
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

    applyDiscipline(state, 'attacker');
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
