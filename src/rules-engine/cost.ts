import { CardDefinition, Domain, GameState, PlayerId, PowerPool } from './types';

// Rule 596.1: "As long as a player has the resources to pay the costs
// associated with the card, they may play cards." Rule 554/740 "Pay the
// card's costs": in total, pay the combined Energy cost and Power cost.
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

// How much Universal Power a domain-specific Power cost still needs after
// drawing on that Domain's own pool first (rule 159.1: Universal Power can
// cover a shortfall in any Domain's cost). Throws on a 'Universal' entry in
// the cost itself (as opposed to the pool) — the rules never show a card
// cost phrased that way, and no CardDefinition has one, so there's nothing
// to confirm a meaning against; guessing one now would be exactly the kind
// of speculation this project avoids.
function universalPowerNeeded(powerPool: PowerPool, powerCost: PowerPool): number {
  let needed = 0;
  for (const [key, amount] of Object.entries(powerCost) as [Domain | 'Universal', number | undefined][]) {
    if (!amount) continue;
    if (key === 'Universal') {
      throw new Error("A 'Universal' powerCost entry isn't modeled — no CardDefinition has one yet");
    }
    const available = powerPool[key] ?? 0;
    needed += Math.max(amount - available, 0);
  }
  return needed;
}

export function canAffordPowerCost(state: GameState, playerId: PlayerId, card: CardDefinition): boolean {
  const player = state.players[playerId];
  const universalAvailable = player.powerPool.Universal ?? 0;
  return universalAvailable >= universalPowerNeeded(player.powerPool, card.powerCost);
}

export function payPowerCost(state: GameState, playerId: PlayerId, card: CardDefinition): void {
  const player = state.players[playerId];
  if (!canAffordPowerCost(state, playerId, card)) {
    throw new Error(`${playerId} cannot afford ${card.id}'s Power cost`);
  }
  for (const [key, amount] of Object.entries(card.powerCost) as [Domain | 'Universal', number | undefined][]) {
    if (!amount) continue;
    const domain = key as Domain; // 'Universal' entries already threw above, via canAffordPowerCost
    const available = player.powerPool[domain] ?? 0;
    const fromOwnDomain = Math.min(amount, available);
    const fromUniversal = amount - fromOwnDomain;
    player.powerPool[domain] = available - fromOwnDomain;
    if (fromUniversal > 0) {
      player.powerPool.Universal = (player.powerPool.Universal ?? 0) - fromUniversal;
    }
  }
}

// The combined check/payment (rule 740: Energy and Power together, "in
// total"). Nothing in solver.ts plays a card with a non-empty powerCost yet
// — Magma Wurm (the only one so far) has no "play a unit" Action to trigger
// this through — but Discipline/Retreat's empty powerCost makes this a
// no-op for them, so wiring the combined check in now costs nothing and
// saves a second pass through solver.ts later.
export function canAffordCost(state: GameState, playerId: PlayerId, card: CardDefinition): boolean {
  return canAffordEnergyCost(state, playerId, card) && canAffordPowerCost(state, playerId, card);
}

export function payCost(state: GameState, playerId: PlayerId, card: CardDefinition): void {
  payEnergyCost(state, playerId, card);
  payPowerCost(state, playerId, card);
}
