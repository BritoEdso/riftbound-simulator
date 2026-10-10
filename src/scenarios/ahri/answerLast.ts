import { GameState } from "@/rules-engine/types";
import { cards, player, runes, unit } from "../builders";
import { Scenario } from "../types";

// Advanced Ahri trial: the opponent holds one Hextech Ray and can afford it
// exactly once. You hold one Discipline. Whichever of your two fronts they
// Ray, Discipline — played in *response* — saves that unit. Play it early
// and they simply Ray the other one. Designed by the scenario-designer agent.

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
      p1: player("p1", {
        points: 7,
        hand: cards("OGN-058", "OGN-104"), // Discipline, Retreat
        runesInPlay: runes("p1", ["Calm", "Mind"]),
        runeDeck: ["Calm", "Mind"],
        // Up to two draws this turn (Discipline, and the match-point
        // "draw instead"); an Ahri copy is unaffordable with two runes.
        deck: cards("OGN-119", "OGN-119", "OGN-119"),
      }),
      p2: player("p2", {
        points: 6,
        hand: cards("OGN-009"), // Hextech Ray
        // Tap + recycle: exactly 1 Energy + 1 Fury Power — one Ray.
        runesInPlay: runes("p2", ["Fury"]),
        deck: cards("OGN-119"),
      }),
    },
    battlefields: [
      { id: BF_A, controller: "p2", contested: false, scoredByThisTurn: [] },
      { id: BF_B, controller: null, contested: false, scoredByThisTurn: [] },
    ],
    units: [
      unit({ instanceId: "ahri", cardId: "OGN-119", controller: "p1", location: "base", might: 3 }),
      unit({ instanceId: "recruit", cardId: "generic-unit", controller: "p1", location: "base", might: 2 }),
      unit({ instanceId: "defender", cardId: "generic-unit", controller: "p2", location: BF_A, might: 3 }),
    ],
  };
}

function scored(state: GameState, battlefieldId: string): boolean {
  return state.battlefields.find((b) => b.id === battlefieldId)?.scoredByThisTurn.includes("p1") ?? false;
}

export const ahriAnswerLast: Scenario = {
  id: "answer-last",
  title: "Answer Last",
  difficulty: "Advanced",
  legendId: "ahri",
  learner: "p1",
  briefing:
    "You're on 7. Your opponent holds Battlefield A with a 3-Might unit; Battlefield B is empty. You have Ahri, " +
    "Inquisitive (3 Might) and a 2-Might unit, Discipline and Retreat in hand, and two ready runes. " +
    "This time your opponent isn't helpless: they're holding a Hextech Ray (deal 3 to a unit at a battlefield) " +
    "and have just enough to cast it once. Win anyway.",
  battlefieldNames: { [BF_A]: "Battlefield A", [BF_B]: "Battlefield B" },
  unitNames: { recruit: "2-Might Unit", defender: "Opponent's 3-Might Unit" },
  objectives: [
    { label: "Conquer Battlefield A", isComplete: (state) => scored(state, BF_A) },
    { label: "Conquer Battlefield B", isComplete: (state) => scored(state, BF_B) },
  ],
  initialState,
  explanation: [
    {
      title: "Two fronts again",
      body:
        "At 7 points you need to Score both battlefields this turn for a Conquer to grant the Final Point. Ahri takes " +
        "A (her trigger drops the defender 3 → 1), and the 2-Might unit walks onto empty B.",
      rules: ["632 — the Final Point", "548.2 — Showdowns at uncontrolled battlefields"],
    },
    {
      title: "Their Ray can kill either unit",
      body:
        "Hextech Ray is an Action, so your opponent can play it during either Showdown. 3 damage kills a 2-Might unit " +
        "outright, and finishes a 3-Might Ahri along with the defender's 1 combat damage.",
      rules: ["718 — Action", "545–553 — Showdowns and Focus"],
    },
    {
      title: "So hold Discipline until they commit",
      body:
        "Discipline is a Reaction: you can play it on top of their Ray, and it resolves first. Whichever unit they Ray " +
        "gets +2 Might in time — Ahri at 5 survives 3 + 1, the 2-Might unit at 4 survives 3. They only have the runes " +
        "for one Ray, so the other front is safe. If they never Ray at all, you just win.",
      rules: ["725 — Reaction", "532–544 — the Chain (last in, first out)", "158 — the Rune Pool"],
    },
    {
      title: "Tap your runes before you move",
      body:
        "Energy you tap floats for the rest of the turn, so tap both runes up front: then Discipline is already " +
        "paid for when the Ray arrives. (Basic rune abilities don't have the Reaction keyword, so whether you may " +
        "tap them while a Chain is open is unclear in the rules — tapping early sidesteps the question.)",
      rules: ["158 — the Rune Pool", "510 — Closed States"],
    },
    {
      title: "Don't waste Discipline on a front you've already won",
      body:
        "If you take A first, your opponent may Ray Ahri while you're taking B. Let it happen: A is already Scored " +
        "this turn, so losing Ahri costs you nothing. Save Discipline for the 2-Might unit at B.",
      rules: ["631 — Scored this turn", "632 — the Final Point"],
    },
  ],
  commonMistakes: [
    {
      title: "Playing Discipline first",
      body:
        "Once Discipline is spent they Ray the other unit and that front is lost. Even Disciplining the unit they'd " +
        "target doesn't help if you cast it before they commit — they'll respond by Raying it before your buff resolves.",
    },
    {
      title: "Answering the Ray with Retreat",
      body: "The unit is saved to your hand, but now nobody is there to take Control, so that battlefield is never Scored.",
    },
    {
      title: "Sending both units to A",
      body: "You'd Conquer A, but B is never Scored this turn and both units are exhausted — no Final Point.",
    },
  ],
};
