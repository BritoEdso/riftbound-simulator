import { applyAction, canWin } from "@/rules-engine/solver";
import { GameState } from "@/rules-engine/types";
import { Action } from "@/rules-engine/solver";
import { ahriTwoFronts } from "../ahri/twoFronts";
import { describeAction } from "../describe";
import { findLegend, SCENARIOS } from "../index";
import { runOpponent, trialStatus } from "../play";

// Plays the learner's Actions in order, letting the automatic opponent reply
// in between — exactly what the trial UI does.
function play(state: GameState, learnerActions: Action[]): GameState {
  let current = runOpponent(state, "p1").state;
  for (const action of learnerActions) {
    current = runOpponent(applyAction(current, action), "p1").state;
  }
  return current;
}

const takeB: Action[] = [
  { type: "moveUnits", unitInstanceIds: ["recruit"], destination: "bf-b" },
  { type: "beginShowdown", battlefieldId: "bf-b" },
  { type: "pass", playerId: "p1" },
];

const ahriTakesA: Action[] = [
  { type: "moveUnits", unitInstanceIds: ["ahri"], destination: "bf-a" },
  { type: "beginShowdown", battlefieldId: "bf-a" },
  { type: "chooseTriggerTarget", playerId: "p1", targetInstanceId: "guardian" },
  { type: "pass", playerId: "p1" }, // let Ahri's trigger resolve: 5 -> 3
  { type: "exhaustRuneForEnergy", playerId: "p1", runeInstanceId: "p1-rune-0" },
  { type: "exhaustRuneForEnergy", playerId: "p1", runeInstanceId: "p1-rune-1" },
  { type: "playSpell", playerId: "p1", cardId: "OGN-058", targetInstanceId: "ahri" },
  { type: "pass", playerId: "p1" }, // Discipline resolves: Ahri 3 -> 5
  { type: "pass", playerId: "p1" }, // close the Showdown
  { type: "resolveCombat", battlefieldId: "bf-a" },
];

describe("Two Fronts (Ahri, Intermediate)", () => {
  it("is winnable from the start", () => {
    expect(canWin(ahriTwoFronts.initialState(), "p1").won).toBe(true);
  });

  it("the intended line wins: take B, then Ahri + trigger + Discipline takes A for the Final Point", () => {
    const end = play(ahriTwoFronts.initialState(), [...takeB, ...ahriTakesA]);

    expect(trialStatus(end, "p1")).toBe("won");
    expect(ahriTwoFronts.objectives.every((o) => o.isComplete(end))).toBe(true);
  });

  it("the other order wins too — A first draws instead of scoring, then B completes the board", () => {
    const end = play(ahriTwoFronts.initialState(), [...ahriTakesA, ...takeB]);

    expect(trialStatus(end, "p1")).toBe("won");
  });

  it("taking B first doesn't win on its own: the match-point Conquer draws a card instead", () => {
    const afterB = play(ahriTwoFronts.initialState(), takeB);

    expect(afterB.players.p1.points).toBe(7);
    expect(afterB.players.p1.hand).toHaveLength(2);
    expect(trialStatus(afterB, "p1")).toBe("playing");
  });

  it("sending both units to A is a dead end", () => {
    const state = play(ahriTwoFronts.initialState(), [
      { type: "moveUnits", unitInstanceIds: ["ahri", "recruit"], destination: "bf-a" },
    ]);

    expect(trialStatus(state, "p1")).toBe("deadEnd");
  });

  it("needs Ahri's trigger: the same board with a vanilla 3-Might unit can't be won", () => {
    const state = ahriTwoFronts.initialState();
    state.units.find((u) => u.instanceId === "ahri")!.cardId = "generic-unit";

    expect(canWin(state, "p1").won).toBe(false);
  });

  it("needs Discipline: without it, Ahri's 3 Might can't beat the reduced 3-Might defender and survive", () => {
    const state = ahriTwoFronts.initialState();
    state.players.p1.hand = [];

    expect(canWin(state, "p1").won).toBe(false);
  });

  it("every step of the intended line has a readable label", () => {
    let state = ahriTwoFronts.initialState();
    for (const action of [...takeB, ...ahriTakesA]) {
      expect(describeAction(ahriTwoFronts, state, action)).not.toMatch(/undefined/);
      state = runOpponent(applyAction(state, action), "p1").state;
    }
  });
});

describe("the trial registry", () => {
  it("trial ids are unique across every Legend (they're URL slugs looked up by id alone)", () => {
    const ids = SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every trial belongs to a registered Legend", () => {
    expect(SCENARIOS.every((s) => findLegend(s.legendId) !== undefined)).toBe(true);
  });
});
