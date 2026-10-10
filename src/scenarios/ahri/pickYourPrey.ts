import { GameState } from "@/rules-engine/types";
import { cards, player, unit } from "../builders";
import { Scenario } from "../types";

// Beginner Ahri trial: choosing the trigger's target. "-2 Might, to a minimum
// of 1" does nothing to a unit that's already at 1 — so it has to go on the
// bigger defender. Designed by the scenario-designer agent.

const BF_A = "bf-a";
const BF_B = "bf-b";

function initialState(): GameState {
  return {
    turnPlayer: "p1",
    turnNumber: 9,
    chain: null,
    showdown: null,
    victoryScore: 8,
    players: {
      p1: player("p1", { points: 7, deck: cards("OGN-119", "OGN-119") }),
      p2: player("p2", { points: 6, deck: cards("OGN-119") }),
    },
    battlefields: [
      { id: BF_A, controller: "p2", contested: false, scoredByThisTurn: [] },
      { id: BF_B, controller: "p1", contested: false, scoredByThisTurn: ["p1"] },
    ],
    units: [
      unit({ instanceId: "ahri", cardId: "OGN-119", controller: "p1", location: "base", might: 3 }),
      unit({ instanceId: "sentinel", cardId: "generic-unit", controller: "p1", location: BF_B, might: 2 }),
      unit({ instanceId: "brute", cardId: "generic-unit", controller: "p2", location: BF_A, might: 3 }),
      unit({ instanceId: "scout", cardId: "generic-unit", controller: "p2", location: BF_A, might: 1 }),
    ],
  };
}

export const ahriPickYourPrey: Scenario = {
  id: "pick-your-prey",
  title: "Pick Your Prey",
  difficulty: "Beginner",
  legendId: "ahri",
  learner: "p1",
  briefing:
    "You're on 7 points and already Held Battlefield B this turn. Conquer Battlefield A to win. " +
    "Two units guard it — a 3-Might Brute and a 1-Might Scout — and all you have is Ahri, Inquisitive (3 Might). " +
    "When she attacks, her ability gives one enemy unit -2 Might. Which one?",
  battlefieldNames: { [BF_A]: "Battlefield A", [BF_B]: "Battlefield B" },
  unitNames: {
    sentinel: "Your Sentinel",
    brute: "Opponent's 3-Might Brute",
    scout: "Opponent's 1-Might Scout",
  },
  objectives: [
    {
      label: "Conquer Battlefield A",
      isComplete: (state) => state.battlefields.find((b) => b.id === BF_A)?.scoredByThisTurn.includes("p1") ?? false,
    },
  ],
  initialState,
  explanation: [
    {
      title: "One Conquer wins",
      body: "Battlefield B was Held this turn, so it's already Scored — Conquering A is your Final Point.",
      rules: ["630.2 — Hold", "632 — the Final Point"],
    },
    {
      title: "Aim the -2 at the Brute",
      body:
        "Ahri's ability gives -2 Might \"to a minimum of 1\". On the Brute that's 3 → 1. On the Scout it does " +
        "nothing at all — it's already at 1.",
      rules: ["625 — Initial Chain", "582 — Triggered Abilities"],
    },
    {
      title: "Ahri takes on both",
      body:
        "Now the defenders total 1 + 1 = 2 Might. Ahri's 3 damage kills both (lethal damage goes to one unit before " +
        "the next), and their 2 damage doesn't kill her. You Conquer A and win.",
      rules: ["626 — Combat Damage", "627 — Resolution"],
    },
  ],
  commonMistakes: [
    {
      title: "Targeting the Scout",
      body:
        "The Scout is already at the 1-Might floor, so the ability is wasted. Ahri then faces 3 + 1 = 4 Might: she " +
        "can't kill both, and 4 damage kills her.",
    },
  ],
};
