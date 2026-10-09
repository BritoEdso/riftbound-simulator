import { CARD_DEFINITIONS } from "./cards";
import { resolveCombat } from "./combat";
import { canAffordCost, payCost } from "./cost";
import { applyDiscipline, applyHextechRay, applyRetreat } from "./effects";
import { findUnit } from "./queries";
import { moveUnit } from "./movement";
import { exhaustRuneForEnergy, recycleRuneForPower } from "./rune";
import { score } from "./scoring";
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
  | { type: "playDiscipline"; targetInstanceId: string; playerId: string }
  | { type: "playRetreat"; targetInstanceId: string }
  | { type: "playHextechRay"; targetInstanceId: string; playerId: string }
  | { type: "exhaustRuneForEnergy"; playerId: PlayerId; runeInstanceId: string }
  | { type: "recycleRuneForPower"; playerId: PlayerId; runeInstanceId: string }
  | {
      type: "playUnit";
      playerId: PlayerId;
      cardId: string;
      // Generated when the Action is built, not when it's applied — see
      // legalActions's playUnitActions for why that's safe here.
      instanceId: string;
      // Rules text in the 718/725 Action/Reaction examples (not 719, which is
      // Assault): a Unit can only be played to its controller's base
      // or a battlefield they already control.
      location: string;
    }
  | { type: "moveUnit"; unitInstanceId: string; destination: string };

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

  // No "score" Action: Scoring isn't something a player chooses to do
  // (rule 630). Conquer happens automatically when Control is gained — see
  // applyAction's resolveCombat/moveUnit cases — and Hold only happens in
  // the Beginning Phase, which is already over by the time the solver's
  // single Action Phase search starts.

  const canAffordRetreat =
    state.players[playerId].hand.some((c) => c.id === "OGN-104") &&
    canAffordCost(state, playerId, CARD_DEFINITIONS["OGN-104"]);
  const retreatActions: Action[] = state.units
    .filter((u) => u.controller === playerId && canAffordRetreat)
    .map((u) => ({ type: "playRetreat", targetInstanceId: u.instanceId }));

  const canAffordDiscipline =
    state.players[playerId].hand.some((c) => c.id === "OGN-058") &&
    canAffordCost(state, playerId, CARD_DEFINITIONS["OGN-058"]);
  const disciplineActions: Action[] = state.units
    .filter(() => canAffordDiscipline)
    .map((u) => ({
      type: "playDiscipline",
      targetInstanceId: u.instanceId,
      playerId,
    }));

  // "Deal 3 to a unit at a battlefield" — restricted to units whose
  // location is a battlefield, not 'base'. Unrestricted by controller, same
  // permissiveness as Discipline's targeting.
  const canAffordHextechRay =
    state.players[playerId].hand.some((c) => c.id === "OGN-009") &&
    canAffordCost(state, playerId, CARD_DEFINITIONS["OGN-009"]);
  const hextechRayActions: Action[] = state.units
    .filter((u) => canAffordHextechRay && u.location !== "base")
    .map((u) => ({
      type: "playHextechRay",
      targetInstanceId: u.instanceId,
      playerId,
    }));

  // Exhausting a Ready rune for Energy (rule 156.2.a's "[T]: Add [1]") is how
  // the solver discovers it can afford a card's Energy cost even when
  // energyPool starts short.
  const exhaustRuneActions: Action[] = state.players[playerId].runesInPlay
    .filter((r) => r.ready)
    .map((r) => ({
      type: "exhaustRuneForEnergy",
      playerId,
      runeInstanceId: r.instanceId,
    }));

  // Recycling a rune for Power ("Recycle this: Add [C]", rule 156.2.a) — the
  // Power counterpart to exhausting for Energy above. Offered for every rune
  // regardless of Ready/Exhausted (Recycle isn't an Exhaust action — rule
  // 594). Now that Magma Wurm (OGN-011) has a real powerCost, this is no
  // longer a dead branch the way it was before that card existed.
  const recycleRuneActions: Action[] = state.players[playerId].runesInPlay.map((r) => ({
    type: "recycleRuneForPower" as const,
    playerId,
    runeInstanceId: r.instanceId,
  }));

  // Per the 718/725 Action/Reaction examples: a Unit enters play at its controller's base or a
  // battlefield they already control. One Action per (affordable Unit card
  // in hand) x (valid location) — deduped by cardId first, since hand cards
  // have no per-copy identity (see CLAUDE.md), so two copies of the same
  // card would otherwise generate identical redundant branches. The
  // generated instanceId only needs to be unique among its sibling
  // candidates in *this* batch — only one of them is ever actually applied
  // per search branch, so there's no cross-branch collision risk.
  const uniqueAffordableUnitCardIds = [
    ...new Set(
      state.players[playerId].hand
        .filter((c) => c.type === "Unit" && c.might !== undefined)
        .map((c) => c.id),
    ),
  ].filter((cardId) => canAffordCost(state, playerId, CARD_DEFINITIONS[cardId]));
  const playableLocations = [
    "base",
    ...state.battlefields.filter((bf) => bf.controller === playerId).map((bf) => bf.id),
  ];
  const playUnitActions: Action[] = uniqueAffordableUnitCardIds.flatMap((cardId, i) =>
    playableLocations.map((location, j) => ({
      type: "playUnit" as const,
      playerId,
      cardId,
      instanceId: `${playerId}-unit-${state.units.length}-${i}-${j}`,
      location,
    })),
  );

  // Rule 140-141 — Standard Move: a Ready Unit can exhaust itself to move
  // from its current location to any other base/battlefield. This is what
  // lets the solver actually get a Unit into combat — see movement.ts for
  // what happens to combatRole/Contested status when it arrives.
  const moveUnitActions: Action[] = state.units
    .filter((u) => u.controller === playerId && u.ready)
    .flatMap((u) =>
      ["base", ...state.battlefields.map((bf) => bf.id)]
        .filter((destination) => destination !== u.location)
        .map((destination) => ({
          type: "moveUnit" as const,
          unitInstanceId: u.instanceId,
          destination,
        })),
    );

  return [
    ...combatActions,
    ...retreatActions,
    ...disciplineActions,
    ...hextechRayActions,
    ...exhaustRuneActions,
    ...recycleRuneActions,
    ...playUnitActions,
    ...moveUnitActions,
  ];
}

// Exported for direct unit testing (e.g. confirming playUnit's mutations in
// isolation, without needing a canWin scenario to drive it) — canWin/
// SolveResult remain the intended public surface for actually driving the
// solver.
export function applyAction(state: GameState, action: Action): GameState {
  const next = structuredClone(state);
  switch (action.type) {
    case "resolveCombat": {
      const result = resolveCombat(next, action.battlefieldId, {
        attackerDamageOrder: action.attackerDamageOrder,
        defenderDamageOrder: action.defenderDamageOrder,
      });
      if (result.conquered && result.newController !== null) {
        score(next, result.newController, action.battlefieldId, "conquer");
      }
      break;
    }
    case "playDiscipline":
      payCost(next, action.playerId, CARD_DEFINITIONS["OGN-058"]);
      moveCardFromHandToTrash(next, action.playerId, "OGN-058");
      applyDiscipline(next, action.targetInstanceId, action.playerId);
      break;
    case "playRetreat":
      const targetUnit = findUnit(next, action.targetInstanceId);
      payCost(next, targetUnit.controller, CARD_DEFINITIONS["OGN-104"]);
      moveCardFromHandToTrash(next, targetUnit.controller, "OGN-104");
      applyRetreat(next, action.targetInstanceId);
      break;
    case "playHextechRay":
      payCost(next, action.playerId, CARD_DEFINITIONS["OGN-009"]);
      moveCardFromHandToTrash(next, action.playerId, "OGN-009");
      applyHextechRay(next, action.targetInstanceId);
      break;
    case "exhaustRuneForEnergy":
      exhaustRuneForEnergy(next, action.playerId, action.runeInstanceId);
      break;
    case "recycleRuneForPower":
      recycleRuneForPower(next, action.playerId, action.runeInstanceId);
      break;
    case "playUnit": {
      const card = CARD_DEFINITIONS[action.cardId];
      if (card.might === undefined) {
        throw new Error(`${card.id} has no Might — not a valid Unit to play`);
      }
      payCost(next, action.playerId, card);
      removeCardFromHand(next, action.playerId, action.cardId);
      next.units.push({
        instanceId: action.instanceId,
        cardId: action.cardId,
        controller: action.playerId,
        location: action.location,
        baseMight: card.might,
        might: card.might,
        damage: 0,
        keywords: [...card.keywords],
        combatRole: null,
        ready: false, // Rule 139.4: Units enter the Board Exhausted.
      });
      break;
    }
    case "moveUnit": {
      // Rule 181.4.c: moving into an empty, uncontrolled battlefield
      // establishes Control outright — that's gaining Control, so it's a
      // Conquer Score (rule 630) just like winning a Combat is.
      const mover = findUnit(next, action.unitInstanceId).controller;
      const battlefield = next.battlefields.find((bf) => bf.id === action.destination);
      const controllerBefore = battlefield?.controller ?? null;
      moveUnit(next, action.unitInstanceId, action.destination);
      if (battlefield && controllerBefore !== mover && battlefield.controller === mover) {
        score(next, mover, battlefield.id, "conquer");
      }
      break;
    }
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

// Used by playUnit: the card leaves hand to become a UnitInPlay, not Trash.
function removeCardFromHand(
  state: GameState,
  playerId: PlayerId,
  cardId: string,
): void {
  const hand = state.players[playerId].hand;
  const cardIndex = hand.findIndex((c) => c.id === cardId);
  hand.splice(cardIndex, 1);
}

// Used by playDiscipline/playRetreat: Spells are placed in their owner's
// Trash once played (rule 559), unlike a played Unit.
function moveCardFromHandToTrash(
  state: GameState,
  playerId: PlayerId,
  cardId: string,
): void {
  const hand = state.players[playerId].hand;
  const cardIndex = hand.findIndex((c) => c.id === cardId);
  const [card] = hand.splice(cardIndex, 1);
  if (card) {
    state.players[playerId].trash.push(card);
  }
}
