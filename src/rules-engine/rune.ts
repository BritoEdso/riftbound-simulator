import { GameState, PlayerId, RuneInPlay } from './types';

// Rule 606 — Channel: take up to `count` Runes off the top of a player's
// Rune Deck and put them on the board. `ready` matches the default from the
// rule text ("that rune enters the board exhausted rather than ready" is the
// exception, not the default). If fewer than `count` remain in the Rune
// Deck, channels as many as possible (rule 515.4.b.2) instead of throwing —
// same convention as deck.ts's draw().
export function channel(
  state: GameState,
  playerId: PlayerId,
  count = 1,
  ready = true,
): RuneInPlay[] {
  const player = state.players[playerId];
  const domains = player.runeDeck.splice(0, count);
  const startIndex = player.runesInPlay.length;
  const channeled: RuneInPlay[] = domains.map((domain, i) => ({
    instanceId: `${playerId}-rune-${startIndex + i}`,
    domain,
    ready,
  }));
  player.runesInPlay.push(...channeled);
  return channeled;
}

// A Basic Rune's first ability, "[T]: Add [1]" (rule 156.2.a / 593.3's
// Exhaust symbol): exhaust a Ready rune already in play to add 1
// (domain-less) Energy to its controller's Rune Pool. Throws if the rune
// doesn't exist or is already Exhausted — same convention as queries.ts's
// findUnit, since every caller should already know the rune is a legal
// target before calling this.
export function exhaustRuneForEnergy(state: GameState, playerId: PlayerId, runeInstanceId: string): void {
  const player = state.players[playerId];
  const rune = player.runesInPlay.find((r) => r.instanceId === runeInstanceId);
  if (!rune) throw new Error(`Unknown rune: ${runeInstanceId}`);
  if (!rune.ready) throw new Error(`Rune already Exhausted: ${runeInstanceId}`);
  rune.ready = false;
  player.energyPool += 1;
}

// A Basic Rune's second ability, "Recycle this: Add [C]" (rule 156.2.a):
// Recycle the rune (rule 594 — return it to the bottom of its controller's
// Rune Deck, Ready or not) to add 1 Power of its own domain to its
// controller's Rune Pool.
export function recycleRuneForPower(state: GameState, playerId: PlayerId, runeInstanceId: string): void {
  const player = state.players[playerId];
  const index = player.runesInPlay.findIndex((r) => r.instanceId === runeInstanceId);
  if (index === -1) throw new Error(`Unknown rune: ${runeInstanceId}`);
  const [rune] = player.runesInPlay.splice(index, 1);
  player.runeDeck.push(rune.domain);
  player.powerPool[rune.domain] = (player.powerPool[rune.domain] ?? 0) + 1;
}
