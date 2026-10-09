import { CARD_DEFINITIONS } from "./cards";
import { isPlayableNow, passPriority, playSpell, priorityHolder } from "./chain";
import { canAffordCost, payCost } from "./cost";
import { SPELLS } from "./effects";
import { winner } from "./queries";
import { moveUnit } from "./movement";
import { exhaustRuneForEnergy, recycleRuneForPower } from "./rune";
import { beginShowdown, combatDamageDue, finishCombat, pendingShowdowns } from "./showdown";
import { GameState, PlayerId, UnitInPlay } from "./types";

export type Action =
  // Rule ~526: open the Showdown (a Combat, if both sides have Units there)
  // at a Contested Battlefield. Forced — while any is pending it's the
  // only thing the Turn Player can do; the choice is just which one first.
  | { type: "beginShowdown"; battlefieldId: string }
  // A Combat's Damage + Resolution Steps, once its Showdown has closed
  // (showdown.ts's combatDamageDue).
  | {
      type: "resolveCombat";
      battlefieldId: string;
      // The assigning player's chosen priority order among their own
      // equal-priority targets (see combat.ts's assignDamage) — undefined
      // when there's only 0 or 1 such target, so no real choice exists.
      attackerDamageOrder?: string[];
      defenderDamageOrder?: string[];
    }
  // Puts the Spell on the Chain (chain.ts) — it only takes effect once
  // both players pass in a row.
  | { type: "playSpell"; playerId: PlayerId; cardId: string; targetInstanceId: string }
  | { type: "pass"; playerId: PlayerId }
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
  // Rule 512: only the player with Priority can act — the Chain's Priority
  // holder, else the player with Showdown Focus, else the Turn Player
  // (chain.ts's priorityHolder).
  if (playerId !== priorityHolder(state)) return [];
  const neutralOpen = state.chain === null && state.showdown === null;

  // Rule ~525-526: a Contested Battlefield in a Neutral Open State means a
  // Showdown starts at the very Cleanup that noticed it — nothing else can
  // happen first.
  if (neutralOpen && pendingShowdowns(state).length > 0) {
    return pendingShowdowns(state).map((battlefieldId) => ({ type: "beginShowdown" as const, battlefieldId }));
  }

  // Rule 626: once a Combat's Showdown closes, damage happens next —
  // nothing else can intervene. Both sides' damage orders are chosen here
  // in one Action (the Attacker assigns first; see damageOrderOptions).
  if (combatDamageDue(state)) {
    const battlefieldId = state.showdown!.battlefieldId;
    const attackers = state.units.filter((u) => u.location === battlefieldId && u.combatRole === "attacking");
    const defenders = state.units.filter((u) => u.location === battlefieldId && u.combatRole === "defending");
    return damageOrderOptions(attackers).flatMap((attackerDamageOrder) =>
      damageOrderOptions(defenders).map((defenderDamageOrder) => ({
        type: "resolveCombat" as const,
        battlefieldId,
        attackerDamageOrder,
        defenderDamageOrder,
      })),
    );
  }

  // Passing exists whenever there's something to pass on: a Chain
  // (Priority) or a Showdown (Focus).
  const passActions: Action[] = neutralOpen ? [] : [{ type: "pass", playerId }];

  // No "score" Action: Scoring isn't something a player chooses to do
  // (rule 630). Conquer happens automatically when Control is gained —
  // inside combat.ts's resolveCombat and movement.ts's moveUnit — and Hold
  // only happens in the Beginning Phase, which is already over by the time
  // the solver's single Action Phase search starts.

  // One Action per (Spell in hand, deduped by id) x (legal target), when
  // it's affordable and its timing allows it right now (chain.ts's
  // isPlayableNow — only Reactions once a Chain exists). Targeting rules
  // live with each card in effects.ts's SPELLS.
  const spellActions: Action[] = [
    ...new Set(state.players[playerId].hand.filter((c) => c.id in SPELLS).map((c) => c.id)),
  ]
    .filter((cardId) => isPlayableNow(state, cardId))
    .filter((cardId) => canAffordCost(state, playerId, CARD_DEFINITIONS[cardId]))
    .flatMap((cardId) =>
      SPELLS[cardId].legalTargets(state, playerId).map((u) => ({
        type: "playSpell" as const,
        playerId,
        cardId,
        targetInstanceId: u.instanceId,
      })),
    );

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
  // per search branch, so there's no cross-branch collision risk. Open
  // State only — Magma Wurm has no Reaction keyword, and a Unit never uses
  // the Chain's response window anyway (rule 538). Units can't be played
  // in a Showdown either (rule ~547: no card category by default).
  const uniqueAffordableUnitCardIds = !neutralOpen ? [] : [
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
  // Not in a Closed State or a Showdown (rule ~596).
  const moveUnitActions: Action[] = state.units
    .filter((u) => neutralOpen && u.controller === playerId && u.ready)
    .flatMap((u) =>
      ["base", ...state.battlefields.map((bf) => bf.id)]
        .filter((destination) => destination !== u.location)
        .map((destination) => ({
          type: "moveUnit" as const,
          unitInstanceId: u.instanceId,
          destination,
        })),
    );

  // Pass first: in canWin's opponent turns, the first reply tried is the
  // one whose line gets reported, and "they let it resolve" is the most
  // readable main line.
  return [
    ...passActions,
    ...spellActions,
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
    case "beginShowdown":
      beginShowdown(next, action.battlefieldId);
      break;
    case "resolveCombat":
      finishCombat(next, {
        attackerDamageOrder: action.attackerDamageOrder,
        defenderDamageOrder: action.defenderDamageOrder,
      });
      break;
    case "playSpell":
      playSpell(next, action.playerId, action.cardId, action.targetInstanceId);
      break;
    case "pass":
      passPriority(next, action.playerId);
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
    case "moveUnit":
      moveUnit(next, action.unitInstanceId, action.destination);
      break;
  }
  return next;
}

export interface SolveResult {
  won: boolean;
  // The winning line assuming the opponent always makes their first legal
  // reply (passing, when they can) — a forced win holds against every
  // reply, but only this one branch is reported.
  line: Action[];
}

export function canWin(
  state: GameState,
  playerId: PlayerId,
  line: Action[] = [],
): SolveResult {
  // Rule 633: winning is immediate — including for the opponent, e.g. via
  // a Burn Out this line caused. A line that hands them the game is dead,
  // not something to keep searching past.
  const gameWinner = winner(state);
  if (gameWinner !== null) {
    return gameWinner === playerId ? { won: true, line } : { won: false, line: [] };
  }

  const actor = priorityHolder(state);
  const actions = legalActions(state, actor);

  if (actor === playerId) {
    // Our choice: one winning Action is enough.
    for (const action of actions) {
      const next = applyAction(state, action);
      const result = canWin(next, playerId, [...line, action]);
      if (result.won) return result;
    }
    return { won: false, line: [] };
  }

  // The opponent's choice: a forced win has to survive every reply. With no
  // Chain or Showdown, the opponent holding Priority means it's their own
  // Neutral Open State — they can simply end their turn, and this search
  // doesn't cross turns.
  if (state.chain === null && state.showdown === null) return { won: false, line: [] };
  let mainLine: SolveResult | null = null;
  for (const action of actions) {
    const result = canWin(applyAction(state, action), playerId, [...line, action]);
    if (!result.won) return { won: false, line: [] };
    mainLine ??= result;
  }
  return mainLine ?? { won: false, line: [] };
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
