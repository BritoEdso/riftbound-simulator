import { resolveCombat } from "./combat";
import { applyDiscipline, applyRetreat } from "./effects";
import { findUnit } from "./queries";
import { score, ScoreMethod } from "./scoring";
import { GameState, PlayerId } from "./types";

export type Action =
  | { type: "resolveCombat"; battlefieldId: string }
  | {
      type: "score";
      playerId: PlayerId;
      battlefieldId: string;
      method: ScoreMethod;
    }
  | { type: "playDiscipline"; targetInstanceId: string; playerId: string }
  | { type: "playRetreat"; targetInstanceId: string };

function legalActions(state: GameState, playerId: PlayerId): Action[] {
  const combatActions: Action[] = state.battlefields
    .filter((bf) =>
      state.units.some((u) => u.location === bf.id && u.combatRole !== null),
    )
    .map((bf) => ({ type: "resolveCombat", battlefieldId: bf.id }));

  const scoreActions: Action[] = state.battlefields
    .filter(
      (bf) =>
        bf.controller === playerId && !bf.scoredByThisTurn.includes(playerId),
    )
    .flatMap((bf) => [
      { type: "score", playerId, battlefieldId: bf.id, method: "hold" },
      { type: "score", playerId, battlefieldId: bf.id, method: "conquer" },
    ]);

  const retreatActions: Action[] = state.units
    .filter(
      (u) =>
        u.controller === playerId &&
        state.players[playerId].hand.some((c) => c.id === "OGN-104"),
    )
    .map((u) => ({ type: "playRetreat", targetInstanceId: u.instanceId }));

  const disciplineActions: Action[] = state.units
    .filter(() => state.players[playerId].hand.some((c) => c.id === "OGN-058"))
    .map((u) => ({
      type: "playDiscipline",
      targetInstanceId: u.instanceId,
      playerId,
    }));

  return [
    ...combatActions,
    ...scoreActions,
    ...retreatActions,
    ...disciplineActions,
  ];
}

function applyAction(state: GameState, action: Action): GameState {
  const next = structuredClone(state);
  switch (action.type) {
    case "resolveCombat":
      resolveCombat(next, action.battlefieldId);
      break;
    case "score":
      score(next, action.playerId, action.battlefieldId, action.method);
      break;
    case "playDiscipline":
      removeCardFromHand(next, action.playerId, "OGN-058");
      applyDiscipline(next, action.targetInstanceId, action.playerId);
      break;
    case "playRetreat":
      const targetUnit = findUnit(next, action.targetInstanceId);
      removeCardFromHand(next, targetUnit.controller, "OGN-104");
      applyRetreat(next, action.targetInstanceId);
      break;
  }
  return next;
}

export interface SolveResult {
  won: boolean;
  line: Action[];
}

export function canWin(
  state: GameState,
  playerId: PlayerId,
  line: Action[] = [],
): SolveResult {
  if (state.players[playerId].points >= state.victoryScore) {
    return { won: true, line };
  }

  for (const action of legalActions(state, playerId)) {
    const next = applyAction(state, action);
    const result = canWin(next, playerId, [...line, action]);
    if (result.won) return result;
  }

  return { won: false, line: [] };
}

function removeCardFromHand(
  state: GameState,
  playerId: PlayerId,
  cardId: string,
): void {
  const hand = state.players[playerId].hand;
  const cardIndex = hand.findIndex((c) => c.id === cardId);
  hand.splice(cardIndex, 1);
}
