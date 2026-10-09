import { CARD_DEFINITIONS } from '../cards';
import { cleanupLethalUnits, performCleanup } from '../cleanup';
import { GameState, UnitInPlay } from '../types';

function makeUnit(overrides: Partial<UnitInPlay>): UnitInPlay {
  return {
    instanceId: overrides.instanceId ?? 'unit',
    cardId: overrides.cardId ?? 'test-card',
    controller: overrides.controller ?? 'p1',
    location: overrides.location ?? 'bf1',
    baseMight: overrides.baseMight ?? 1,
    might: overrides.might ?? 1,
    damage: overrides.damage ?? 0,
    keywords: overrides.keywords ?? [],
    combatRole: overrides.combatRole ?? null,
    ready: overrides.ready ?? true,
  };
}

function makeState(units: UnitInPlay[]): GameState {
  return {
    turnPlayer: 'p1',
    turnNumber: 1,
    chain: null,
    victoryScore: 8,
    players: {
      p1: { id: 'p1', points: 0, hand: [], deck: [], runeDeck: [], runesInPlay: [], energyPool: 0, powerPool: {}, trash: [] },
      p2: { id: 'p2', points: 0, hand: [], deck: [], runeDeck: [], runesInPlay: [], energyPool: 0, powerPool: {}, trash: [] },
    },
    battlefields: [],
    units,
  };
}

describe('cleanupLethalUnits (rule 524.1/525)', () => {
  it('removes a Unit with damage >= Might and returns it', () => {
    const unit = makeUnit({ instanceId: 'u1', might: 3, damage: 3 });
    const state = makeState([unit]);

    const killed = cleanupLethalUnits(state);

    expect(killed).toEqual([unit]);
    expect(state.units).toEqual([]);
  });

  it('leaves a Unit with damage below Might untouched', () => {
    const unit = makeUnit({ instanceId: 'u1', might: 3, damage: 2 });
    const state = makeState([unit]);

    const killed = cleanupLethalUnits(state);

    expect(killed).toEqual([]);
    expect(state.units).toEqual([unit]);
  });

  it('checks every Unit state-wide, not just one battlefield', () => {
    const here = makeUnit({ instanceId: 'here', might: 1, damage: 1, location: 'bf1' });
    const elsewhere = makeUnit({ instanceId: 'elsewhere', might: 1, damage: 1, location: 'bf2' });
    const state = makeState([here, elsewhere]);

    const killed = cleanupLethalUnits(state);

    expect(killed.map((u) => u.instanceId).sort()).toEqual(['elsewhere', 'here']);
  });

  it("places a killed registered CardDefinition in its owner's trash", () => {
    const unit = makeUnit({ instanceId: 'u1', cardId: 'OGN-011', controller: 'p1', might: 1, damage: 1 });
    const state = makeState([unit]);

    cleanupLethalUnits(state);

    expect(state.players.p1.trash).toEqual([CARD_DEFINITIONS['OGN-011']]);
  });

  it('skips the trash for an unregistered cardId', () => {
    const unit = makeUnit({ instanceId: 'u1', controller: 'p1', might: 1, damage: 1 });
    const state = makeState([unit]);

    cleanupLethalUnits(state);

    expect(state.players.p1.trash).toEqual([]);
  });
});

describe('performCleanup: "If a player has no Units at a Battlefield, they have no Control" (rule ~181)', () => {
  it('drops Control of a battlefield its controller has no Units at, and keeps it where they do', () => {
    const state = makeState([makeUnit({ instanceId: 'u1', controller: 'p1', location: 'bf-held' })]);
    state.battlefields = [
      { id: 'bf-held', controller: 'p1', contested: false, scoredByThisTurn: [] },
      { id: 'bf-empty', controller: 'p1', contested: false, scoredByThisTurn: [] },
    ];

    performCleanup(state);

    expect(state.battlefields.map((b) => b.controller)).toEqual(['p1', null]);
  });

  it("an opponent's Units being there doesn't count — the controller needs their own", () => {
    const state = makeState([makeUnit({ instanceId: 'u1', controller: 'p2', location: 'bf1', combatRole: 'attacking' })]);
    state.battlefields = [{ id: 'bf1', controller: 'p1', contested: true, scoredByThisTurn: [] }];

    performCleanup(state);

    expect(state.battlefields[0].controller).toBeNull();
  });

  it('kills lethal Units first, so a controller whose last Unit dies loses Control in the same Cleanup', () => {
    const state = makeState([makeUnit({ instanceId: 'u1', controller: 'p1', location: 'bf1', might: 2, damage: 2 })]);
    state.battlefields = [{ id: 'bf1', controller: 'p1', contested: false, scoredByThisTurn: [] }];

    performCleanup(state);

    expect(state.units).toEqual([]);
    expect(state.battlefields[0].controller).toBeNull();
  });
});
