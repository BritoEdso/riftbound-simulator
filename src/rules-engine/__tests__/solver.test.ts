import { canWin } from "../solver";
import { CardDefinition, GameState, UnitInPlay } from "../types";

function makeCard(id: string): CardDefinition {
  return {
    id,
    name: id,
    type: "Spell",
    domains: [],
    energyCost: 0,
    powerCost: {},
    keywords: [],
    rulesText: "",
  };
}

function makeUnit(overrides: Partial<UnitInPlay>): UnitInPlay {
  return {
    instanceId: overrides.instanceId ?? "unit",
    cardId: overrides.cardId ?? "test-card",
    controller: overrides.controller ?? "p1",
    location: overrides.location ?? "bf1",
    baseMight: overrides.baseMight ?? 0,
    might: overrides.might ?? 0,
    damage: overrides.damage ?? 0,
    keywords: overrides.keywords ?? [],
    combatRole: overrides.combatRole ?? null,
  };
}

function makeGameState(units: UnitInPlay[]): GameState {
  return {
    turnPlayer: "p1",
    victoryScore: 8,
    players: {
      p1: { id: "p1", points: 0, hand: [], deck: [] },
      p2: { id: "p2", points: 7, hand: [], deck: [] },
    },
    battlefields: [
      { id: "bf1", controller: "p2", contested: true, scoredByThisTurn: [] },
    ],
    units,
  };
}

describe("the example scenario: 5-Might attacker vs 6-Might defender", () => {
  it("with Discipline (+2 Might) on the attacker, it survives, kills the defender, and conquers", () => {
    const attacker = makeUnit({
      instanceId: "attacker",
      controller: "p1",
      baseMight: 5,
      might: 5,
      combatRole: "attacking",
    });
    const defender = makeUnit({
      instanceId: "defender",
      controller: "p2",
      baseMight: 6,
      might: 6,
      combatRole: "defending",
    });
    const state = makeGameState([attacker, defender]);
    state.players.p1.deck = [makeCard("draw-card")];
    state.players.p1.points = 7;
    state.players.p1.hand = [makeCard("OGN-058")];

    const result = canWin(state, "p1");
    expect(result.won).toBe(true);
  });
  it("does not play Discipline (+2 Might) on the attacker, it dies, kills the attacker, and does not conquer", () => {
    const attacker = makeUnit({
      instanceId: "attacker",
      controller: "p1",
      baseMight: 5,
      might: 5,
      combatRole: "attacking",
    });
    const defender = makeUnit({
      instanceId: "defender",
      controller: "p2",
      baseMight: 6,
      might: 6,
      combatRole: "defending",
    });
    const state = makeGameState([attacker, defender]);
    state.players.p1.deck = [makeCard("draw-card")];
    state.players.p1.points = 7;

    const result = canWin(state, "p1");
    expect(result.won).toBe(false);
  });
});
