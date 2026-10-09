import { CARD_DEFINITIONS } from "@/rules-engine/cards";
import { Action } from "@/rules-engine/solver";
import { GameState, UnitInPlay } from "@/rules-engine/types";
import { Scenario } from "./types";

// Plain-English labels for engine objects and Actions, for the trial UI and
// its move log. Everything a learner reads about the game passes through
// here, so names stay consistent between buttons, hints and the log.

export function unitName(scenario: Scenario, unit: UnitInPlay | undefined, fallbackId?: string): string {
  if (!unit) return fallbackId ? (scenario.unitNames[fallbackId] ?? "a unit that's gone") : "a unit";
  return scenario.unitNames[unit.instanceId] ?? CARD_DEFINITIONS[unit.cardId]?.name ?? `${unit.might}-Might Unit`;
}

export function locationName(scenario: Scenario, location: string): string {
  return location === "base" ? "base" : (scenario.battlefieldNames[location] ?? location);
}

function findUnit(state: GameState, instanceId: string): UnitInPlay | undefined {
  return state.units.find((u) => u.instanceId === instanceId);
}

export function describeAction(scenario: Scenario, state: GameState, action: Action): string {
  switch (action.type) {
    case "moveUnits": {
      const names = action.unitInstanceIds.map((id) => unitName(scenario, findUnit(state, id), id));
      return `Move ${names.join(" + ")} to ${locationName(scenario, action.destination)}`;
    }
    case "beginShowdown": {
      const unitsThere = state.units.filter((u) => u.location === action.battlefieldId);
      const isCombat = new Set(unitsThere.map((u) => u.controller)).size > 1;
      return `${isCombat ? "Start the Combat" : "Start the Showdown"} at ${locationName(scenario, action.battlefieldId)}`;
    }
    case "chooseTriggerTarget": {
      const trigger = state.showdown?.pendingTriggers[0];
      const source = trigger ? CARD_DEFINITIONS[trigger.cardId]?.name : "The ability";
      return `${source}'s ability targets ${unitName(scenario, findUnit(state, action.targetInstanceId))}`;
    }
    case "playSpell":
      return `Play ${CARD_DEFINITIONS[action.cardId].name} on ${unitName(scenario, findUnit(state, action.targetInstanceId))}`;
    case "pass":
      return state.chain !== null ? "Pass (let the Chain resolve)" : "Pass Focus";
    case "resolveCombat":
      return "Deal combat damage";
    case "exhaustRuneForEnergy": {
      const rune = state.players[action.playerId].runesInPlay.find((r) => r.instanceId === action.runeInstanceId);
      return `Exhaust a ${rune?.domain ?? ""} rune for 1 Energy`;
    }
    case "recycleRuneForPower": {
      const rune = state.players[action.playerId].runesInPlay.find((r) => r.instanceId === action.runeInstanceId);
      return `Recycle a ${rune?.domain ?? ""} rune for 1 ${rune?.domain ?? ""} Power`;
    }
    case "playUnit":
      return `Play ${CARD_DEFINITIONS[action.cardId].name} to ${locationName(scenario, action.location)}`;
  }
}

// The board objects an Action involves — unit/rune instanceIds and
// battlefield ids — so the UI can highlight them while the learner hovers
// the Action's button.
export function actionSubjects(action: Action): string[] {
  switch (action.type) {
    case "moveUnits":
      return [...action.unitInstanceIds, action.destination];
    case "beginShowdown":
    case "resolveCombat":
      return [action.battlefieldId];
    case "chooseTriggerTarget":
    case "playSpell":
      return [action.targetInstanceId];
    case "exhaustRuneForEnergy":
    case "recycleRuneForPower":
      return [action.runeInstanceId];
    case "playUnit":
      return [action.location];
    case "pass":
      return [];
  }
}
