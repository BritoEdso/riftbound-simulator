import { CARD_DEFINITIONS } from './cards';
import { GameState } from './types';

// Card effects are implemented as functions that mutate a GameState. Effects
// that require systems we haven't modeled yet (deck/draw, rune pools) are
// called out in comments rather than silently doing nothing.

// Discipline (OGN-058): "Give a unit +2 Might this turn. Draw 1."
export function applyDiscipline(state: GameState, targetInstanceId: string): void {
  const unit = state.units.find((u) => u.instanceId === targetInstanceId);
  if (!unit) throw new Error(`Unknown unit: ${targetInstanceId}`);
  unit.might += 2;
  // "Draw 1" is not applied here — no deck is modeled yet in GameState.
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
  // "Channels 1 rune exhausted" is not applied here — rune pools/energy
  // economy are not modeled yet in GameState.
}
