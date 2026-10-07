import { CardDefinition, GameState, PlayerId } from './types';

// Rule 607 — Burn Out: an action a player must perform before drawing (or
// looking at/revealing, or trashing from) their Main Deck while it's empty.
// They shuffle their trash into their Main Deck, their opponent gains 1
// point, and then they perform the action that caused the Burn Out. If
// their trash is also empty, their Main Deck stays empty and the
// triggering draw simply does nothing — but the opponent still gained the
// point (rule 609: repeated Burn Outs eventually hand the opponent the win).
//
// "Shuffles" is modeled as a plain append rather than a real randomized
// shuffle: nothing in this project inspects deck order beyond "the top
// card," and no scenario's outcome depends on which specific card ends up
// where after a reshuffle — randomness here would only add nondeterminism
// the solver has no use for, not change any result.
//
// "Chooses an opponent to gain 1 point": this project is 1v1 only (see
// CLAUDE.md), so there's only ever one possible opponent — no real choice.
export function burnOut(state: GameState, playerId: PlayerId): void {
  const player = state.players[playerId];
  player.deck.push(...player.trash);
  player.trash = [];

  const opponentId = Object.keys(state.players).find((id) => id !== playerId);
  if (opponentId) {
    state.players[opponentId].points += 1;
  }
}

// Moves up to `count` cards from the top of a player's deck into their hand,
// one at a time so each individual draw attempt against an empty deck
// triggers its own Burn Out (rule 607) rather than skipping straight to
// "draws fewer than requested."
// Rule 516.2.b: "The Turn Player draws 1."
export function draw(state: GameState, playerId: PlayerId, count = 1): CardDefinition[] {
  const player = state.players[playerId];
  const drawn: CardDefinition[] = [];
  for (let i = 0; i < count; i++) {
    if (player.deck.length === 0) {
      burnOut(state, playerId);
    }
    const [card] = player.deck.splice(0, 1);
    if (card) drawn.push(card);
  }
  player.hand.push(...drawn);
  return drawn;
}
