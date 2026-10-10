import { GameState } from "@/rules-engine/types";
import { cards, player, unit } from "../builders";
import { Scenario } from "../types";

// Beginner Ahri trial: Ahri's attack trigger is what makes a two-unit attack
// work — 5 Might can't beat a 6-Might defender, but it beats the 4 that's
// left after "-2 Might this turn". Designed by the scenario-designer agent.

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
      // No draws happen on the winning line; an unaffordable Ahri as filler.
      p1: player("p1", { points: 7, deck: cards("OGN-119", "OGN-119") }),
      p2: player("p2", { points: 6, deck: cards("OGN-119") }),
    },
    battlefields: [
      { id: BF_A, controller: "p2", contested: false, scoredByThisTurn: [] },
      // Held at the start of this turn — that already counts as Scored.
      { id: BF_B, controller: "p1", contested: false, scoredByThisTurn: ["p1"] },
    ],
    units: [
      unit({ instanceId: "ahri", cardId: "OGN-119", controller: "p1", location: "base", might: 3 }),
      unit({ instanceId: "recruit", cardId: "generic-unit", controller: "p1", location: "base", might: 2 }),
      // Exhausted: it can't reach A anyway (no Ganking), and a Ready one
      // would only add a pointless "move back to base" option.
      unit({ instanceId: "sentinel", cardId: "generic-unit", controller: "p1", location: BF_B, might: 2, ready: false }),
      unit({ instanceId: "guardian", cardId: "generic-unit", controller: "p2", location: BF_A, might: 6 }),
    ],
  };
}

export const ahriFoxAndFriend: Scenario = {
  id: "fox-and-friend",
  title: "Fox and Friend",
  difficulty: "Beginner",
  legendId: "ahri",
  learner: "p1",
  briefing:
    "You're on 7 points and you already Held Battlefield B at the start of this turn, so B counts as Scored. " +
    "Conquer Battlefield A and you win. The problem: a 6-Might unit guards it, and you only have Ahri, " +
    "Inquisitive (3 Might) and a 2-Might unit. No cards in hand, no runes.",
  battlefieldNames: { [BF_A]: "Battlefield A", [BF_B]: "Battlefield B" },
  unitNames: {
    recruit: "2-Might Unit",
    sentinel: "Your Sentinel",
    guardian: "Opponent's 6-Might Unit",
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
      title: "You only need one more battlefield",
      body:
        "Holding Battlefield B at the start of your turn Scored it. At 7 points a Conquer only grants the Final Point " +
        "if every battlefield was Scored this turn — B already is, so Conquering A wins.",
      rules: ["630.2 — Hold", "632 — the Final Point"],
    },
    {
      title: "Move both units in together",
      body:
        "Units that share a destination can move as one Standard Move, and the Combat starts right after. " +
        "Together they bring 3 + 2 = 5 Might.",
      rules: ["140 — Standard Move", "620 — Combat"],
    },
    {
      title: "Ahri shrinks the defender",
      body:
        "As the Combat opens, Ahri's \"When I attack\" ability goes on the Chain and gives the defender -2 Might " +
        "this turn: 6 becomes 4. Now your 5 Might is enough to kill it.",
      rules: ["625 — Initial Chain", "582 — Triggered Abilities"],
    },
    {
      title: "Win the fight",
      body:
        "Your 5 damage kills the 4-Might defender. Its 4 damage can kill one of your units, but the other survives, " +
        "so you Conquer A — and with B already Scored, that's the Final Point.",
      rules: ["626 — Combat Damage", "627 — Resolution", "632 — the Final Point"],
    },
  ],
  commonMistakes: [
    {
      title: "Sending Ahri alone",
      body: "Her trigger takes the defender to 4, but her 3 Might can't kill it — and 4 damage kills her.",
    },
    {
      title: "Sending the 2-Might unit first",
      body: "Without Ahri there's no -2: 2 Might against 6 just dies, and Ahri alone can't finish the job afterwards.",
    },
  ],
};
