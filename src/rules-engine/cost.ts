import { CardDefinition, GameState, PlayerId } from './types';

// Rule 596.1: "As long as a player has the resources to pay the costs
// associated with the card, they may play cards." Rule 554/740 "Pay the
// card's costs": in total, pay the combined Energy cost and Power cost.
//
// This only covers the Energy half. Nothing in src/rules-engine/cards.ts
// has a non-empty `powerCost` yet, so there's no scenario to drive a correct
// Power-payment implementation against — a cost can draw on its own
// Domain's Power or Universal Power (rule 159.1), which needs real
// allocation logic once a card actually needs it, not a guess made now.
export function canAffordEnergyCost(state: GameState, playerId: PlayerId, card: CardDefinition): boolean {
  return state.players[playerId].energyPool >= card.energyCost;
}

export function payEnergyCost(state: GameState, playerId: PlayerId, card: CardDefinition): void {
  const player = state.players[playerId];
  if (player.energyPool < card.energyCost) {
    throw new Error(`${playerId} cannot afford ${card.id}: needs ${card.energyCost} Energy, has ${player.energyPool}`);
  }
  player.energyPool -= card.energyCost;
}
