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
