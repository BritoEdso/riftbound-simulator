import { performCleanup } from './cleanup';
import { resolveCombat, CombatResult, DamageOrders } from './combat';
import { nextInTurnOrder } from './queries';
import { score } from './scoring';
import { GameState, PlayerId } from './types';

// Showdowns (rules 545-555) and the Combat steps built around one (620-628).
// See docs/turn-structure.md.
//
// A Battlefield becomes Contested when a Unit arrives that its controller
// (if any) doesn't control (movement.ts). The next Cleanup in a Neutral
// Open State then *must* open a Showdown there (rule ~525-526) — modeled as
// solver.ts offering only beginShowdown Actions while any Battlefield is
// Contested, the Turn Player choosing which if there are several.
//
// Not modeled: Initial Chains ("When I attack"/"When I defend" triggers,
// rule 551/625.1.c — no card has one), Assault/Shield, and inviting a
// player (553.5 — only matters with 3+ players). Both players are always
// Relevant: in 1v1, a Combat's Attacker and Defender are everyone (550.1),
// and a non-combat Showdown makes all players Relevant anyway (550.2).

// A Showdown is waiting to begin at any Contested Battlefield (rule 548).
export function pendingShowdowns(state: GameState): string[] {
  return state.battlefields.filter((bf) => bf.contested).map((bf) => bf.id);
}

// Rule 548-549: open a Showdown at a Contested Battlefield. It's a Combat if
// two players have Units there (rule 620); the player who applied Contested
// status — the Attacker, or the lone arriving player — gains Focus.
export function beginShowdown(state: GameState, battlefieldId: string): void {
  if (state.chain !== null || state.showdown !== null) throw new Error('Not a Neutral Open State');
  const battlefield = state.battlefields.find((bf) => bf.id === battlefieldId);
  if (!battlefield?.contested) throw new Error(`${battlefieldId} isn't Contested`);

  const unitsHere = state.units.filter((u) => u.location === battlefieldId);
  const isCombat = new Set(unitsHere.map((u) => u.controller)).size > 1;
  const contester = isCombat
    ? unitsHere.find((u) => u.combatRole === 'attacking')?.controller
    : unitsHere[0]?.controller;

  if (contester === undefined) {
    // Everyone who contested it is gone again — nothing left to fight over.
    battlefield.contested = false;
    return;
  }
  state.showdown = { battlefieldId, isCombat, focus: contester, consecutivePasses: 0 };
}

// True once every Relevant Player has passed in a row in a Combat's
// Showdown — the Combat Damage Step is next (rule 626: "When the Showdown
// closes…"), offered by solver.ts as resolveCombat.
export function combatDamageDue(state: GameState): boolean {
  const showdown = state.showdown;
  return (
    showdown !== null &&
    showdown.isCombat &&
    state.chain === null &&
    showdown.consecutivePasses >= Object.keys(state.players).length
  );
}

// Rule 554-555: the player with Focus passes. Once every Relevant Player
// has passed in a row, the Showdown ends: a Combat proceeds to damage (the
// Attacker assigns first, rule 626, so Focus returns to them to make that
// choice), a non-combat Showdown settles Control.
export function passFocus(state: GameState, playerId: PlayerId): void {
  const showdown = state.showdown;
  if (showdown === null || state.chain !== null) throw new Error('No Showdown Focus to pass');
  if (showdown.focus !== playerId) throw new Error(`${playerId} doesn't have Focus`);

  showdown.consecutivePasses += 1;
  if (showdown.consecutivePasses < Object.keys(state.players).length) {
    showdown.focus = nextInTurnOrder(state, playerId);
    return;
  }
  if (showdown.isCombat) {
    const attacker = state.units.find(
      (u) => u.location === showdown.battlefieldId && u.combatRole === 'attacking',
    );
    if (attacker) showdown.focus = attacker.controller;
  } else {
    endNonCombatShowdown(state);
  }
}

// Rule 553.1.a.1: when the last item on a Chain resolves during a Showdown,
// Focus passes and the next Relevant Player gains Focus and Priority — and
// everyone has to pass again for the Showdown to end.
export function passFocusAfterChain(state: GameState, lastController: PlayerId): void {
  const showdown = state.showdown;
  if (showdown === null) return;
  showdown.focus = nextInTurnOrder(state, lastController);
  showdown.consecutivePasses = 0;
}

// Rules 626-628: the Combat Damage Step and Resolution Step, then the
// Showdown is over. combat.ts's resolveCombat does the actual work,
// including the Conquer Score.
export function finishCombat(state: GameState, orders: DamageOrders = {}): CombatResult {
  if (!combatDamageDue(state)) throw new Error('Combat damage is not due');
  const result = resolveCombat(state, state.showdown!.battlefieldId, orders);
  state.showdown = null;
  return result;
}

// A non-combat Showdown ends (rule 548.2) with a Cleanup; whoever still has
// Units there takes Control (rule 181.4.c: Units there outside of Combat
// means Control), which is a Conquer Score (rule 630.1). If their Units
// were removed during the Showdown, it stays uncontrolled.
function endNonCombatShowdown(state: GameState): void {
  const battlefield = state.battlefields.find((bf) => bf.id === state.showdown!.battlefieldId)!;
  state.showdown = null;
  battlefield.contested = false;
  performCleanup(state);

  const presentPlayers = new Set(
    state.units.filter((u) => u.location === battlefield.id).map((u) => u.controller),
  );
  if (presentPlayers.size !== 1) return;
  const [newController] = presentPlayers;
  if (battlefield.controller === newController) return;
  battlefield.controller = newController;
  score(state, newController, battlefield.id, 'conquer');
}
