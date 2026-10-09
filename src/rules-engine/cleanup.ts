import { CARD_DEFINITIONS } from './cards';
import { GameState, UnitInPlay } from './types';

function isLethal(unit: UnitInPlay): boolean {
  return unit.damage > 0 && unit.damage >= unit.might;
}

// Rule 524.1/525: at a Cleanup — which real rules trigger after any Chain
// item resolves, a Move completes, a Showdown completes, or a Combat
// completes (this project doesn't model the Chain/Showdowns, so callers
// trigger this directly right after whatever just happened instead) — all
// Units with damage ≥ Might, anywhere, are killed and placed in their
// owner's Trash. Only applies when the Unit's cardId is a real registered
// CardDefinition — test/sample fixtures routinely use placeholder ids that
// aren't, same convention effects.ts's applyRetreat already follows.
// Returns the killed Units (not just their ids) so a caller like
// combat.ts's resolveCombat can filter down to "killed at this
// battlefield specifically" for its own narrower result.
export function cleanupLethalUnits(state: GameState): UnitInPlay[] {
  const killed = state.units.filter(isLethal);
  const killedIds = new Set(killed.map((u) => u.instanceId));
  state.units = state.units.filter((u) => !killedIds.has(u.instanceId));

  for (const unit of killed) {
    const cardDefinition = CARD_DEFINITIONS[unit.cardId];
    if (cardDefinition) {
      state.players[unit.controller].trash.push(cardDefinition);
    }
  }

  return killed;
}

// Rule ~181: "If a player has no Units at a Battlefield, they have no
// Control." Control is stored on the Battlefield rather than derived, so
// this re-checks it at every Cleanup — the moments real rules say state
// gets reconciled (a Move, a Combat, a Chain item resolving, end of turn).
// Holds even while Contested: an attacker who kills every defender before
// Combat (e.g. Hextech Ray) leaves the battlefield uncontrolled until the
// Combat's Conquer hands it over.
export function releaseControlOfEmptyBattlefields(state: GameState): void {
  for (const battlefield of state.battlefields) {
    const controller = battlefield.controller;
    if (controller === null) continue;
    const stillPresent = state.units.some((u) => u.location === battlefield.id && u.controller === controller);
    if (!stillPresent) battlefield.controller = null;
  }
}

// The Cleanup steps this engine models (rule 518-526), in rule order: kill
// lethal Units, then reconcile Control. Returns the killed Units, same as
// cleanupLethalUnits. Pending Combat/Showdown selection (steps 5-7) isn't
// modeled — the solver offers resolveCombat as its own Action instead.
export function performCleanup(state: GameState): UnitInPlay[] {
  const killed = cleanupLethalUnits(state);
  releaseControlOfEmptyBattlefields(state);
  return killed;
}
