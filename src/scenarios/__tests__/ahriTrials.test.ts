import { Action, applyAction, canWin } from "@/rules-engine/solver";
import { GameState } from "@/rules-engine/types";
import { ahriAnswerLast } from "../ahri/answerLast";
import { ahriFoxAndFriend } from "../ahri/foxAndFriend";
import { ahriPickYourPrey } from "../ahri/pickYourPrey";
import { describeAction } from "../describe";
import { runOpponent, trialStatus } from "../play";
import { Scenario } from "../types";

// Plays the learner's Actions in order, letting the automatic opponent reply
// in between — exactly what the trial UI does.
function play(state: GameState, learnerActions: Action[]): GameState {
  let current = runOpponent(state, "p1").state;
  for (const action of learnerActions) {
    current = runOpponent(applyAction(current, action), "p1").state;
  }
  return current;
}

function expectReadableLine(scenario: Scenario, actions: Action[]) {
  let state = scenario.initialState();
  for (const action of actions) {
    expect(describeAction(scenario, state, action)).not.toMatch(/undefined/);
    state = runOpponent(applyAction(state, action), "p1").state;
  }
}

describe("Fox and Friend (Ahri, Beginner)", () => {
  const winningLine: Action[] = [
    { type: "moveUnits", unitInstanceIds: ["ahri", "recruit"], destination: "bf-a" },
    { type: "beginShowdown", battlefieldId: "bf-a" },
    { type: "chooseTriggerTarget", playerId: "p1", targetInstanceId: "guardian" },
    { type: "pass", playerId: "p1" }, // trigger resolves: 6 → 4
    { type: "pass", playerId: "p1" }, // close the Showdown
    { type: "resolveCombat", battlefieldId: "bf-a" },
  ];

  it("is winnable from the start", () => {
    expect(canWin(ahriFoxAndFriend.initialState(), "p1").won).toBe(true);
  });

  it("moving both units in together wins", () => {
    const end = play(ahriFoxAndFriend.initialState(), winningLine);
    expect(trialStatus(end, "p1")).toBe("won");
    expect(ahriFoxAndFriend.objectives.every((o) => o.isComplete(end))).toBe(true);
  });

  it("Ahri alone is a dead end", () => {
    const state = play(ahriFoxAndFriend.initialState(), [
      { type: "moveUnits", unitInstanceIds: ["ahri"], destination: "bf-a" },
    ]);
    expect(trialStatus(state, "p1")).toBe("deadEnd");
  });

  it("the 2-Might unit alone is a dead end", () => {
    const state = play(ahriFoxAndFriend.initialState(), [
      { type: "moveUnits", unitInstanceIds: ["recruit"], destination: "bf-a" },
    ]);
    expect(trialStatus(state, "p1")).toBe("deadEnd");
  });

  it("needs Ahri's trigger: with a vanilla 3-Might unit instead, it can't be won", () => {
    const state = ahriFoxAndFriend.initialState();
    state.units.find((u) => u.instanceId === "ahri")!.cardId = "generic-unit";
    expect(canWin(state, "p1").won).toBe(false);
  });

  it("every step has a readable label", () => expectReadableLine(ahriFoxAndFriend, winningLine));
});

describe("Pick Your Prey (Ahri, Beginner)", () => {
  const winningLine: Action[] = [
    { type: "moveUnits", unitInstanceIds: ["ahri"], destination: "bf-a" },
    { type: "beginShowdown", battlefieldId: "bf-a" },
    { type: "chooseTriggerTarget", playerId: "p1", targetInstanceId: "brute" },
    { type: "pass", playerId: "p1" },
    { type: "pass", playerId: "p1" },
    { type: "resolveCombat", battlefieldId: "bf-a" },
  ];

  it("is winnable from the start", () => {
    expect(canWin(ahriPickYourPrey.initialState(), "p1").won).toBe(true);
  });

  it("targeting the Brute wins", () => {
    expect(trialStatus(play(ahriPickYourPrey.initialState(), winningLine), "p1")).toBe("won");
  });

  it("targeting the Scout (already at the 1-Might floor) is a dead end", () => {
    const state = play(ahriPickYourPrey.initialState(), [
      { type: "moveUnits", unitInstanceIds: ["ahri"], destination: "bf-a" },
      { type: "beginShowdown", battlefieldId: "bf-a" },
      { type: "chooseTriggerTarget", playerId: "p1", targetInstanceId: "scout" },
    ]);
    expect(trialStatus(state, "p1")).toBe("deadEnd");
  });

  it("every step has a readable label", () => expectReadableLine(ahriPickYourPrey, winningLine));
});

describe("Answer Last (Ahri, Advanced)", () => {
  it("is winnable from the start — against an opponent holding Hextech Ray", () => {
    expect(canWin(ahriAnswerLast.initialState(), "p1").won).toBe(true);
  });

  it("the opponent really can afford exactly one Ray (tap + recycle their Fury rune)", () => {
    const p2 = ahriAnswerLast.initialState().players.p2;
    expect(p2.hand.map((c) => c.id)).toEqual(["OGN-009"]);
    expect(p2.runesInPlay).toHaveLength(1);
  });

  it("Ahri to A first, then the 2-Might unit to B, wins (the opponent may Ray either one)", () => {
    const afterA = play(ahriAnswerLast.initialState(), [
      { type: "moveUnits", unitInstanceIds: ["ahri"], destination: "bf-a" },
    ]);
    expect(trialStatus(afterA, "p1")).toBe("playing");
  });

  it("the 2-Might unit to B first also keeps the win alive", () => {
    const state = play(ahriAnswerLast.initialState(), [
      { type: "moveUnits", unitInstanceIds: ["recruit"], destination: "bf-b" },
    ]);
    expect(trialStatus(state, "p1")).toBe("playing");
  });

  it("playing Discipline before the opponent commits is a dead end", () => {
    const state = play(ahriAnswerLast.initialState(), [
      { type: "exhaustRuneForEnergy", playerId: "p1", runeInstanceId: "p1-rune-0" },
      { type: "exhaustRuneForEnergy", playerId: "p1", runeInstanceId: "p1-rune-1" },
      { type: "playSpell", playerId: "p1", cardId: "OGN-058", targetInstanceId: "ahri" },
    ]);
    expect(trialStatus(state, "p1")).toBe("deadEnd");
  });

  it("sending both units to A is a dead end", () => {
    const state = play(ahriAnswerLast.initialState(), [
      { type: "moveUnits", unitInstanceIds: ["ahri", "recruit"], destination: "bf-a" },
    ]);
    expect(trialStatus(state, "p1")).toBe("deadEnd");
  });

  it("without Discipline, the opponent's Ray always wins them the turn", () => {
    const state = ahriAnswerLast.initialState();
    state.players.p1.hand = state.players.p1.hand.filter((c) => c.id !== "OGN-058");
    expect(canWin(state, "p1").won).toBe(false);
  });

  it("without the opponent's Ray, it's just Two Fronts minus the buff — still winnable", () => {
    const state = ahriAnswerLast.initialState();
    state.players.p2.hand = [];
    expect(canWin(state, "p1").won).toBe(true);
  });
});
