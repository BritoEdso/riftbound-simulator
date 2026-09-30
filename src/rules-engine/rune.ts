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
