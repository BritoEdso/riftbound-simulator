import { CARD_DEFINITIONS } from "@/rules-engine/cards";
import { GameState, UnitInPlay } from "@/rules-engine/types";
import { Scenario } from "../types";

// The first Ahri trial: both players at 7, two battlefields. The learner has
// to Score *both* this turn (the Final Point rule), which means splitting
// their two Units — and Ahri can only take the defended battlefield with
// her attack trigger and Discipline together.

const BF_A = "bf-a";
const BF_B = "bf-b";

function unit(overrides: Partial<UnitInPlay> & Pick<UnitInPlay, "instanceId" | "cardId" | "controller" | "location" | "might">): UnitInPlay {
  return {
    baseMight: overrides.might,
    damage: 0,
    keywords: [],
    combatRole: null,
    ready: true,
    ...overrides,
  };
}

function initialState(): GameState {
  const discipline = CARD_DEFINITIONS["OGN-058"];
  const magmaWurm = CARD_DEFINITIONS["OGN-011"];
  return {
    turnPlayer: "p1",
    turnNumber: 9,
    chain: null,
    showdown: null,
    victoryScore: 8,
    players: {
      p1: {
        id: "p1",
        points: 7,
        hand: [discipline],
        // Two draws can happen this turn (Discipline's "Draw 1", and the
        // Conquer-at-match-point "draw instead") — a deck that ran out
        // would Burn Out and hand the opponent their 8th point. Magma Wurm
        // (8 Energy) can't be cast with two runes, so drawing it can't
        // open an unintended solution the way a second Discipline would.
        deck: [magmaWurm, magmaWurm, magmaWurm],
        runeDeck: [],
        runesInPlay: [
          { instanceId: "p1-rune-0", domain: "Calm", ready: true },
          { instanceId: "p1-rune-1", domain: "Mind", ready: true },
        ],
        energyPool: 0,
        powerPool: {},
        trash: [],
      },
      p2: {
        id: "p2",
        points: 7,
        hand: [],
        deck: [magmaWurm],
        runeDeck: [],
        runesInPlay: [
          { instanceId: "p2-rune-0", domain: "Fury", ready: false },
          { instanceId: "p2-rune-1", domain: "Fury", ready: false },
          { instanceId: "p2-rune-2", domain: "Body", ready: false },
        ],
        energyPool: 0,
        powerPool: {},
        trash: [],
      },
    },
    battlefields: [
      { id: BF_A, controller: "p2", contested: false, scoredByThisTurn: [] },
      { id: BF_B, controller: null, contested: false, scoredByThisTurn: [] },
    ],
    units: [
      unit({ instanceId: "ahri", cardId: "OGN-119", controller: "p1", location: "base", might: 3 }),
      unit({ instanceId: "recruit", cardId: "generic-unit", controller: "p1", location: "base", might: 2 }),
      unit({ instanceId: "guardian", cardId: "generic-unit", controller: "p2", location: BF_A, might: 5 }),
    ],
  };
}

function scoredThisTurn(state: GameState, battlefieldId: string): boolean {
  return state.battlefields.find((bf) => bf.id === battlefieldId)?.scoredByThisTurn.includes("p1") ?? false;
}

export const ahriTwoFronts: Scenario = {
  id: "ahri-two-fronts",
  title: "Two Fronts",
  difficulty: "Intermediate",
  legendCardId: "OGN-303",
  legendName: "Nine-Tailed Fox (Ahri)",
  learner: "p1",
  briefing:
    "Both players are at 7 points — the next point wins. Your opponent holds Battlefield A with a single 5-Might unit, " +
    "has nothing at base, and every one of their runes is exhausted. Battlefield B is empty. " +
    "You have Ahri, Inquisitive (3 Might) and a 2-Might unit at base, both ready, plus Discipline in hand and two ready runes. " +
    "Find the line that wins this turn.",
  battlefieldNames: { [BF_A]: "Battlefield A", [BF_B]: "Battlefield B" },
  unitNames: { recruit: "2-Might Unit", guardian: "Opponent's 5-Might Unit" },
  objectives: [
    { label: "Conquer Battlefield B", isComplete: (state) => scoredThisTurn(state, BF_B) },
    { label: "Conquer Battlefield A", isComplete: (state) => scoredThisTurn(state, BF_A) },
  ],
  initialState,
  explanation: [
    {
      title: "Why one big attack isn't enough",
      body:
        "At 7 points, the next point is your Final Point. A Conquer only grants the Final Point if you have Scored " +
        "every battlefield this turn — otherwise you draw a card instead and stay on 7. So you need to Score both " +
        "Battlefield A and Battlefield B this turn, which means sending your two units to different places.",
      rules: ["632 — the Final Point", "631 — once per battlefield per turn"],
    },
    {
      title: "Take Battlefield B with the 2-Might unit",
      body:
        "Moving onto an empty, uncontrolled battlefield opens a Showdown with no Combat. Your opponent has no runes " +
        "ready to respond, so when everyone passes you take Control and Score a Conquer. Since A isn't Scored yet, " +
        "that Conquer draws you a card instead of the 8th point — but B now counts as Scored.",
      rules: ["140 — Standard Move", "548.2 — Showdowns at uncontrolled battlefields", "630.1 — Conquer"],
    },
    {
      title: "Attack Battlefield A with Ahri",
      body:
        "Ahri moving in starts a Combat. Her \"When I attack\" ability goes on the Combat's Initial Chain and, " +
        "when it resolves, gives the defender -2 Might this turn: 5 becomes 3.",
      rules: ["625 — the Showdown Step and Initial Chain", "582 — Triggered Abilities"],
    },
    {
      title: "Discipline Ahri",
      body:
        "Discipline is a Reaction, so you can play it during the Combat's Showdown. Exhaust both runes for 2 Energy " +
        "and give Ahri +2 Might this turn: 3 becomes 5.",
      rules: ["725 — Reaction", "158 — the Rune Pool"],
    },
    {
      title: "Damage, and the win",
      body:
        "Combat damage: Ahri deals 5 to a 3-Might defender (lethal) and takes only 3 back (not lethal at 5 Might). " +
        "The defender is removed, Ahri Conquers A, and since B was already Scored this turn, this Conquer grants the Final Point.",
      rules: ["626 — Combat Damage", "627 — Resolution", "632 — the Final Point"],
    },
  ],
  commonMistakes: [
    {
      title: "Discipline without Ahri's trigger",
      body:
        "Ahri at 5 Might against an unreduced 5-Might defender: both deal lethal damage, both die, and nobody Conquers.",
    },
    {
      title: "Sending both units to Battlefield A",
      body:
        "2 + 3 Might does beat the reduced defender, so you Conquer A — but B hasn't been Scored, so you draw instead " +
        "of winning, and both units are now exhausted, so nobody can go take B.",
    },
  ],
};
