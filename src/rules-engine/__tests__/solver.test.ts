import { canWin, legalActions } from "../solver";
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
      p1: { id: "p1", points: 0, hand: [], deck: [], runeDeck: [], runesInPlay: [], energyPool: 0, powerPool: {} },
      p2: { id: "p2", points: 7, hand: [], deck: [], runeDeck: [], runesInPlay: [], energyPool: 0, powerPool: {} },
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
    // Discipline costs 2 Energy — pre-filled here since this test is about
    // combat/scoring, not the Energy-generation mechanic (see the dedicated
    // "Energy costs" describe block below for that).
    state.players.p1.energyPool = 2;

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

describe("Energy costs gate playing a card (rule 596.1)", () => {
  function makeFightState() {
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
    state.players.p1.hand = [makeCard("OGN-058")]; // Discipline, costs 2 Energy
    return state;
  }

  it("finds a line that exhausts Ready runes to afford Discipline's Energy cost from zero", () => {
    const state = makeFightState();
    state.players.p1.runesInPlay = [
      { instanceId: "r1", domain: "Calm", ready: true },
      { instanceId: "r2", domain: "Fury", ready: true },
    ];

    const result = canWin(state, "p1");

    expect(result.won).toBe(true);
    const exhaustCount = result.line.filter((a) => a.type === "exhaustRuneForEnergy").length;
    expect(exhaustCount).toBe(2); // Discipline costs 2 Energy, each rune gives 1
    expect(result.line.some((a) => a.type === "playDiscipline")).toBe(true);
  });

  it("reports no win when Discipline is in hand but there isn't enough Energy available", () => {
    const state = makeFightState();
    // Only 1 Ready rune — 1 Energy is short of Discipline's cost of 2.
    state.players.p1.runesInPlay = [{ instanceId: "r1", domain: "Calm", ready: true }];

    const result = canWin(state, "p1");

    expect(result.won).toBe(false);
  });
});

describe("legalActions: resolveCombat damage-order choices", () => {
  it("offers exactly one resolveCombat action for a 1-vs-1 fight (no real choice to make)", () => {
    const attacker = makeUnit({ instanceId: "attacker", combatRole: "attacking" });
    const defender = makeUnit({ instanceId: "defender", controller: "p2", combatRole: "defending" });
    const state = makeGameState([attacker, defender]);

    const combatActions = legalActions(state, "p1").filter((a) => a.type === "resolveCombat");

    expect(combatActions).toHaveLength(1);
    expect(combatActions[0]).toMatchObject({
      attackerDamageOrder: undefined,
      defenderDamageOrder: undefined,
    });
  });

  it("offers one resolveCombat action per attacker-order × defender-order permutation when both sides have 2+ units", () => {
    const attackers = [
      makeUnit({ instanceId: "a1", combatRole: "attacking" }),
      makeUnit({ instanceId: "a2", combatRole: "attacking" }),
    ];
    const defenders = [
      makeUnit({ instanceId: "d1", controller: "p2", combatRole: "defending" }),
      makeUnit({ instanceId: "d2", controller: "p2", combatRole: "defending" }),
    ];
    const state = makeGameState([...attackers, ...defenders]);

    const combatActions = legalActions(state, "p1").filter((a) => a.type === "resolveCombat");

    // 2! attacker orders x 2! defender orders = 4 distinct ways to resolve
    // this single battlefield's combat.
    expect(combatActions).toHaveLength(4);
    const serialized = combatActions.map((a) =>
      JSON.stringify([a.type === "resolveCombat" ? a.attackerDamageOrder : null, a.type === "resolveCombat" ? a.defenderDamageOrder : null]),
    );
    expect(new Set(serialized).size).toBe(4); // all 4 are actually distinct
  });
});
