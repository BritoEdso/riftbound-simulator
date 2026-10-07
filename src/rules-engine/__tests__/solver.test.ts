import { CARD_DEFINITIONS } from "../cards";
import { applyAction, canWin, legalActions } from "../solver";
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
    ready: overrides.ready ?? true,
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

describe("moveUnit is what gets a Unit into combat at all (rule 140-141)", () => {
  function makeUndeclaredFightState() {
    // Same 5-Might-vs-6-Might shape as "the example scenario" above, but
    // nobody has been declared Attacker/Defender yet — the attacker starts
    // at base, Ready, and canWin has to discover moveUnit is the first step.
    const attacker = makeUnit({
      instanceId: "attacker",
      controller: "p1",
      location: "base",
      baseMight: 5,
      might: 5,
      combatRole: null,
      ready: true,
    });
    const defender = makeUnit({
      instanceId: "defender",
      controller: "p2",
      location: "bf1",
      baseMight: 6,
      might: 6,
      combatRole: null,
      ready: true,
    });
    const state = makeGameState([attacker, defender]);
    state.players.p1.deck = [makeCard("draw-card")];
    state.players.p1.points = 7;
    state.players.p1.hand = [makeCard("OGN-058")]; // Discipline
    state.players.p1.energyPool = 2;
    return state;
  }

  it("finds the line: move to attack, then Discipline, combat, and score", () => {
    const state = makeUndeclaredFightState();

    const result = canWin(state, "p1");

    expect(result.won).toBe(true);
    // DFS tries actions in legalActions' order, so the winning line it finds
    // first isn't necessarily "move, then everything else" — playDiscipline
    // is offered before moveUnit and buffing the attacker before it moves
    // also leads to a win. What's actually being proven here is that *some*
    // moveUnit is required at all: without one, no unit's combatRole is
    // ever set, so resolveCombat is never even legalActions-eligible.
    expect(result.line.some((a) => a.type === "moveUnit" && a.unitInstanceId === "attacker")).toBe(true);
    expect(result.line.some((a) => a.type === "resolveCombat")).toBe(true);
  });

  it("can't win if the attacker is already Exhausted and so can never move to attack", () => {
    const state = makeUndeclaredFightState();
    state.units[0].ready = false; // the attacker, specifically

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

describe("playUnit (rule 719.1.d.1: base or a battlefield you control)", () => {
  function makeStateWithMagmaWurmInHand() {
    const state = makeGameState([]);
    state.battlefields = [
      { id: "bf-mine", controller: "p1", contested: false, scoredByThisTurn: [] },
      { id: "bf-theirs", controller: "p2", contested: false, scoredByThisTurn: [] },
    ];
    state.players.p1.hand = [CARD_DEFINITIONS["OGN-011"]]; // Magma Wurm: Energy 8, Power 1 Fury
    return state;
  }

  it("offers one Action per valid location — base plus battlefields you control, not ones you don't", () => {
    const state = makeStateWithMagmaWurmInHand();
    state.players.p1.energyPool = 8;
    state.players.p1.powerPool = { Fury: 1 };

    const playUnitActions = legalActions(state, "p1").filter((a) => a.type === "playUnit");

    expect(playUnitActions).toHaveLength(2);
    const locations = playUnitActions.map((a) => (a.type === "playUnit" ? a.location : null)).sort();
    expect(locations).toEqual(["base", "bf-mine"]);
  });

  it("offers nothing when the Energy or Power cost isn't met", () => {
    const short = makeStateWithMagmaWurmInHand();
    short.players.p1.energyPool = 7; // one short of Magma Wurm's 8
    short.players.p1.powerPool = { Fury: 1 };
    expect(legalActions(short, "p1").some((a) => a.type === "playUnit")).toBe(false);

    const noPower = makeStateWithMagmaWurmInHand();
    noPower.players.p1.energyPool = 8;
    noPower.players.p1.powerPool = {};
    expect(legalActions(noPower, "p1").some((a) => a.type === "playUnit")).toBe(false);
  });

  it("creates the UnitInPlay, pays both cost halves, and removes the card from hand", () => {
    const state = makeStateWithMagmaWurmInHand();
    state.players.p1.energyPool = 8;
    state.players.p1.powerPool = { Fury: 1 };

    const next = applyAction(state, {
      type: "playUnit",
      playerId: "p1",
      cardId: "OGN-011",
      instanceId: "p1-unit-0",
      location: "base",
    });

    expect(next.units).toEqual([
      {
        instanceId: "p1-unit-0",
        cardId: "OGN-011",
        controller: "p1",
        location: "base",
        baseMight: 8,
        might: 8,
        damage: 0,
        keywords: [],
        combatRole: null,
        ready: false, // rule 139.4 — enters Exhausted
      },
    ]);
    expect(next.players.p1.hand).toEqual([]);
    expect(next.players.p1.energyPool).toBe(0);
    expect(next.players.p1.powerPool).toEqual({ Fury: 0 });
  });

  it("end to end: recycling/exhausting Runes, then playing the Unit, via chained Actions", () => {
    const state = makeStateWithMagmaWurmInHand();
    state.players.p1.runesInPlay = [
      ...Array.from({ length: 8 }, (_, i) => ({ instanceId: `e${i}`, domain: "Calm" as const, ready: true })),
      { instanceId: "p", domain: "Fury" as const, ready: true },
    ];

    let working = state;
    for (let i = 0; i < 8; i++) {
      working = applyAction(working, { type: "exhaustRuneForEnergy", playerId: "p1", runeInstanceId: `e${i}` });
    }
    working = applyAction(working, { type: "recycleRuneForPower", playerId: "p1", runeInstanceId: "p" });

    expect(legalActions(working, "p1").some((a) => a.type === "playUnit")).toBe(true);

    const final = applyAction(working, {
      type: "playUnit",
      playerId: "p1",
      cardId: "OGN-011",
      instanceId: "p1-unit-0",
      location: "base",
    });

    expect(final.units.map((u) => u.cardId)).toEqual(["OGN-011"]);
    // Exhausting doesn't remove a rune from play, just flips it — the 8
    // Energy runes are still there, Exhausted. Only Recycling removes one.
    expect(final.players.p1.runesInPlay).toEqual(
      Array.from({ length: 8 }, (_, i) => ({ instanceId: `e${i}`, domain: "Calm", ready: false })),
    );
    expect(final.players.p1.runeDeck).toEqual(["Fury"]); // the Recycled one, back at the bottom
  });
});
