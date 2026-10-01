import { resolveCombat } from "./combat";
import { applyDiscipline, applyRetreat } from "./effects";
import { findUnit } from "./queries";
import { score, ScoreMethod } from "./scoring";
import { GameState, PlayerId, UnitInPlay } from "./types";

export type Action =
  | {
      type: "resolveCombat";
      battlefieldId: string;
      // The assigning player's chosen priority order among their own
      // equal-priority targets (see combat.ts's assignDamage) — undefined
      // when there's only 0 or 1 such target, so no real choice exists.
      attackerDamageOrder?: string[];
      defenderDamageOrder?: string[];
    }
  | {
      type: "score";
      playerId: PlayerId;
      battlefieldId: string;
      method: ScoreMethod;
    }
  | { type: "playDiscipline"; targetInstanceId: string; playerId: string }
  | { type: "playRetreat"; targetInstanceId: string };

// All orderings of `items` — used to turn "which equal-priority target gets
// damage first" into a set of distinct Actions for the search to try. Only
// called with the handful of units on one side of one battlefield, so the
// factorial blowup stays small in practice (same scope limit already noted
// for the rest of the solver — see CLAUDE.md's "Not modeled yet").
function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, i) => {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    return permutations(rest).map((p) => [item, ...p]);
  });
}

// Orderings to try for one side's damage assignment: every permutation when
// there's a real choice (more than one unit), or just "no preference" when
// there isn't — avoids generating redundant identical actions for the
// already-tested 1-unit-per-side case.
function damageOrderOptions(units: UnitInPlay[]): (string[] | undefined)[] {
  if (units.length <= 1) return [undefined];
  return permutations(units.map((u) => u.instanceId));
}

// Exported for direct unit testing of its action-generation shape (e.g. the
// damage-order permutation count) — canWin/SolveResult remain the intended
// public surface for actually driving the solver.
export function legalActions(state: GameState, playerId: PlayerId): Action[] {
  const combatActions: Action[] = state.battlefields
    .filter((bf) =>
      state.units.some((u) => u.location === bf.id && u.combatRole !== null),
    )
    .flatMap((bf) => {
      const attackers = state.units.filter(
        (u) => u.location === bf.id && u.combatRole === "attacking",
      );
      const defenders = state.units.filter(
        (u) => u.location === bf.id && u.combatRole === "defending",
      );
      return damageOrderOptions(attackers).flatMap((attackerDamageOrder) =>
        damageOrderOptions(defenders).map((defenderDamageOrder) => ({
          type: "resolveCombat" as const,
          battlefieldId: bf.id,
          attackerDamageOrder,
          defenderDamageOrder,
        })),
      );
    });

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
      resolveCombat(next, action.battlefieldId, {
        attackerDamageOrder: action.attackerDamageOrder,
        defenderDamageOrder: action.defenderDamageOrder,
      });
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
