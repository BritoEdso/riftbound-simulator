import { CARD_DEFINITIONS } from './cards';
import { performCleanup } from './cleanup';
import { draw } from './deck';
import { findUnit } from './queries';
import { channel } from './rune';
import { GameState } from './types';

// Card effects are implemented as functions that mutate a GameState. Effects
// that require systems we haven't modeled yet (rune pools) are called out in
// comments rather than silently doing nothing.

// Discipline (OGN-058): "Give a unit +2 Might this turn. Draw 1."
export function applyDiscipline(state: GameState, targetInstanceId: string, casterId: string): void {
  const unit = state.units.find((u) => u.instanceId === targetInstanceId);
  if (!unit) throw new Error(`Unknown unit: ${targetInstanceId}`);
  unit.might += 2;
  draw(state, casterId, 1);
}

// Retreat (OGN-104): "Return a friendly unit to its owner's hand. Its owner
// channels 1 rune exhausted."
export function applyRetreat(state: GameState, targetInstanceId: string): void {
  const index = state.units.findIndex((u) => u.instanceId === targetInstanceId);
  if (index === -1) throw new Error(`Unknown unit: ${targetInstanceId}`);
  const [unit] = state.units.splice(index, 1);

  const cardDefinition = CARD_DEFINITIONS[unit.cardId];
  if (cardDefinition) {
    state.players[unit.controller].hand.push(cardDefinition);
  }
  // "Its owner channels 1 rune exhausted" (rule 606).
  channel(state, unit.controller, 1, false);
  // Rule 518: Cleanup after the Chain item resolves — Retreating the last
  // friendly Unit off a Battlefield gives up Control of it.
  performCleanup(state);
}

// Hextech Ray (OGN-009): "Deal 3 to a unit at a battlefield."
export function applyHextechRay(state: GameState, targetInstanceId: string): void {
  const unit = findUnit(state, targetInstanceId);
  unit.damage += 3;
  // Rule 522: a Cleanup occurs after an item on the Chain resolves — this
  // project doesn't model the Chain, so trigger it directly here rather
  // than waiting for the next Combat to happen to notice the lethal damage.
  performCleanup(state);
}
