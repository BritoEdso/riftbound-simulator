import { moveUnit, moveUnits } from '../movement';
import { Battlefield, GameState, UnitInPlay } from '../types';

function makeUnit(overrides: Partial<UnitInPlay>): UnitInPlay {
  return {
    instanceId: overrides.instanceId ?? 'unit',
    cardId: overrides.cardId ?? 'test-card',
    controller: overrides.controller ?? 'p1',
    location: overrides.location ?? 'base',
    baseMight: overrides.baseMight ?? 1,
    might: overrides.might ?? 1,
    damage: overrides.damage ?? 0,
    keywords: overrides.keywords ?? [],
    combatRole: overrides.combatRole ?? null,
    ready: overrides.ready ?? true,
  };
}

function makeState(units: UnitInPlay[], battlefields: Battlefield[]): GameState {
  return {
    turnPlayer: 'p1',
    turnNumber: 1,
    chain: null,
    showdown: null,
    victoryScore: 8,
    players: {
      p1: { id: 'p1', points: 0, hand: [], deck: [], runeDeck: [], runesInPlay: [], energyPool: 0, powerPool: {}, trash: [] },
      p2: { id: 'p2', points: 0, hand: [], deck: [], runeDeck: [], runesInPlay: [], energyPool: 0, powerPool: {}, trash: [] },
    },
    battlefields,
    units,
  };
}

describe('moveUnit (rule 140-141: Standard Move)', () => {
  it('exhausts the unit as the cost (rule 140.4)', () => {
    const unit = makeUnit({ instanceId: 'u1', ready: true, location: 'base' });
    const state = makeState([unit], [{ id: 'bf1', controller: null, contested: false, scoredByThisTurn: [] }]);

    moveUnit(state, 'u1', 'bf1');

    expect(unit.ready).toBe(false);
  });

  it('throws when the unit is already Exhausted', () => {
    const unit = makeUnit({ instanceId: 'u1', ready: false });
    const state = makeState([unit], [{ id: 'bf1', controller: null, contested: false, scoredByThisTurn: [] }]);

    expect(() => moveUnit(state, 'u1', 'bf1')).toThrow();
  });

  it('Contests an uncontrolled, empty Battlefield without taking Control yet — a non-combat Showdown decides that (rule 548.2)', () => {
    const unit = makeUnit({ instanceId: 'u1', controller: 'p1' });
    const state = makeState([unit], [{ id: 'bf1', controller: null, contested: false, scoredByThisTurn: [] }]);

    const result = moveUnit(state, 'u1', 'bf1');

    expect(result.contested).toBe(true);
    expect(state.battlefields[0]).toMatchObject({ controller: null, contested: true });
    expect(unit.combatRole).toBeNull(); // nobody's attacking anything
    expect(state.players.p1.points).toBe(0); // no Conquer until the Showdown ends
  });

  it('reinforcing a Battlefield you already control is not a contest', () => {
    const unit = makeUnit({ instanceId: 'u1', controller: 'p1' });
    const state = makeState([unit], [{ id: 'bf1', controller: 'p1', contested: false, scoredByThisTurn: [] }]);

    const result = moveUnit(state, 'u1', 'bf1');

    expect(result.contested).toBe(false);
    expect(state.battlefields[0].contested).toBe(false);
    expect(unit.combatRole).toBeNull();
  });

  it('moving into an opponent-controlled Battlefield Contests it and assigns Attacker/Defender to everyone there (rule 181.2, 626.1.d)', () => {
    const mover = makeUnit({ instanceId: 'mover', controller: 'p1', location: 'base' });
    const defender1 = makeUnit({ instanceId: 'd1', controller: 'p2', location: 'bf1' });
    const defender2 = makeUnit({ instanceId: 'd2', controller: 'p2', location: 'bf1' });
    const state = makeState(
      [mover, defender1, defender2],
      [{ id: 'bf1', controller: 'p2', contested: false, scoredByThisTurn: [] }],
    );

    const result = moveUnit(state, 'mover', 'bf1');

    expect(result.contested).toBe(true);
    expect(state.battlefields[0].contested).toBe(true);
    expect(state.battlefields[0].controller).toBe('p2'); // unchanged — rule 181.5
    expect(mover.combatRole).toBe('attacking');
    expect(defender1.combatRole).toBe('defending');
    expect(defender2.combatRole).toBe('defending');
  });

  it("moving into a Battlefield that's uncontrolled but already has an opponent's units also Contests it", () => {
    const mover = makeUnit({ instanceId: 'mover', controller: 'p1' });
    const existing = makeUnit({ instanceId: 'existing', controller: 'p2', location: 'bf1' });
    const state = makeState(
      [mover, existing],
      [{ id: 'bf1', controller: null, contested: false, scoredByThisTurn: [] }],
    );

    const result = moveUnit(state, 'mover', 'bf1');

    expect(result.contested).toBe(true);
    expect(mover.combatRole).toBe('attacking');
    expect(existing.combatRole).toBe('defending');
  });

  it('re-derives combatRole for a reinforcing unit joining an already-Contested fight', () => {
    const attacker1 = makeUnit({ instanceId: 'a1', controller: 'p1', location: 'bf1', combatRole: 'attacking' });
    const defender = makeUnit({ instanceId: 'd1', controller: 'p2', location: 'bf1', combatRole: 'defending' });
    const attacker2 = makeUnit({ instanceId: 'a2', controller: 'p1', location: 'base' });
    const state = makeState(
      [attacker1, defender, attacker2],
      [{ id: 'bf1', controller: 'p2', contested: true, scoredByThisTurn: [] }],
    );

    moveUnit(state, 'a2', 'bf1');

    expect(attacker1.combatRole).toBe('attacking');
    expect(attacker2.combatRole).toBe('attacking');
    expect(defender.combatRole).toBe('defending');
  });

  it('moving back to base clears combatRole and never Contests anything', () => {
    const unit = makeUnit({ instanceId: 'u1', controller: 'p1', location: 'bf1', combatRole: 'attacking' });
    const state = makeState([unit], [{ id: 'bf1', controller: 'p2', contested: true, scoredByThisTurn: [] }]);

    const result = moveUnit(state, 'u1', 'base');

    expect(result.contested).toBe(false);
    expect(unit.location).toBe('base');
    expect(unit.combatRole).toBeNull();
  });

  it('throws for an unknown battlefield', () => {
    const unit = makeUnit({ instanceId: 'u1' });
    const state = makeState([unit], []);

    expect(() => moveUnit(state, 'u1', 'nowhere')).toThrow();
  });
});

describe('moveUnit: Control and Conquer scoring', () => {
  it('moving your last Unit off a battlefield gives up Control of it (Cleanup after the Move)', () => {
    const unit = makeUnit({ instanceId: 'u1', controller: 'p1', location: 'bf1' });
    const state = makeState([unit], [{ id: 'bf1', controller: 'p1', contested: false, scoredByThisTurn: [] }]);

    moveUnit(state, 'u1', 'base');

    expect(state.battlefields[0].controller).toBeNull();
  });

  it('keeps Control while another friendly Unit stays behind', () => {
    const leaving = makeUnit({ instanceId: 'leaving', controller: 'p1', location: 'bf1' });
    const staying = makeUnit({ instanceId: 'staying', controller: 'p1', location: 'bf1' });
    const state = makeState([leaving, staying], [{ id: 'bf1', controller: 'p1', contested: false, scoredByThisTurn: [] }]);

    moveUnit(state, 'leaving', 'base');

    expect(state.battlefields[0].controller).toBe('p1');
  });
});

describe('moveUnits: several Units in one Standard Move (rule ~596)', () => {
  it('moves the whole group, from different origins, and makes all of them Attackers', () => {
    const a1 = makeUnit({ instanceId: 'a1', controller: 'p1', location: 'base' });
    const a2 = makeUnit({ instanceId: 'a2', controller: 'p1', location: 'base' });
    const d1 = makeUnit({ instanceId: 'd1', controller: 'p2', location: 'bf1' });
    const state = makeState([a1, a2, d1], [{ id: 'bf1', controller: 'p2', contested: false, scoredByThisTurn: [] }]);

    moveUnits(state, ['a1', 'a2'], 'bf1');

    expect([a1, a2].map((u) => [u.location, u.ready, u.combatRole])).toEqual([
      ['bf1', false, 'attacking'],
      ['bf1', false, 'attacking'],
    ]);
    expect(d1.combatRole).toBe('defending');
  });

  it("refuses Battlefield-to-Battlefield without Ganking (rule 722)", () => {
    const unit = makeUnit({ instanceId: 'u1', controller: 'p1', location: 'bf1' });
    const state = makeState([unit], [
      { id: 'bf1', controller: 'p1', contested: false, scoredByThisTurn: [] },
      { id: 'bf2', controller: null, contested: false, scoredByThisTurn: [] },
    ]);

    expect(() => moveUnits(state, ['u1'], 'bf2')).toThrow();
  });

  it("refuses to mix two players' Units in one Move", () => {
    const state = makeState(
      [makeUnit({ instanceId: 'mine', controller: 'p1', location: 'base' }), makeUnit({ instanceId: 'theirs', controller: 'p2', location: 'base' })],
      [{ id: 'bf1', controller: null, contested: false, scoredByThisTurn: [] }],
    );

    expect(() => moveUnits(state, ['mine', 'theirs'], 'bf1')).toThrow();
  });
});
