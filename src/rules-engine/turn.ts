import { performCleanup } from './cleanup';
import { draw } from './deck';
import { winner } from './queries';
import { channel } from './rune';
import { score } from './scoring';
import { GameState } from './types';

// The fixed, non-interactive parts of a turn (rules 514-517) — everything
// except the Action Phase, which is where the solver (solver.ts) searches.
// See docs/turn-structure.md for the full rule-by-rule reference.
//
// Not modeled, because nothing in cards.ts needs it yet: Beginning/Ending
// Step triggers ("At the start of your Beginning Phase…", Temporary, end-of-
// turn effects), Stunned, Legion's per-turn tracking, Gear and Legends
// (GameState has neither yet), and the Chain/Showdown/Priority machinery.

// Rule 515.1 — Awaken: the Turn Player readies everything they control.
export function awaken(state: GameState): void {
  const playerId = state.turnPlayer;
  for (const unit of state.units) {
    if (unit.controller === playerId) unit.ready = true;
  }
  for (const rune of state.players[playerId].runesInPlay) {
    rune.ready = true;
  }
}

// Rule 515.2.b / 630.2 — Scoring Step: the Turn Player Holds every
// battlefield they control. score() enforces once-per-battlefield-per-turn
// and the Final Point rule (a Hold always grants it).
export function holdBattlefields(state: GameState): void {
  const playerId = state.turnPlayer;
  for (const battlefield of state.battlefields) {
    if (winner(state) !== null) return; // rule 633: the game's already over
    if (battlefield.controller === playerId) {
      score(state, playerId, battlefield.id, 'hold');
    }
  }
}

// Rule 515.3 — Channel Phase: channel 2 Ready runes (as many as possible if
// the Rune Deck is short — channel() already does that). Duel's First Turn
// Process: the player going second channels 1 extra on their first turn,
// i.e. turn 2 of the game.
export function channelPhase(state: GameState): void {
  const count = state.turnNumber === 2 ? 3 : 2;
  channel(state, state.turnPlayer, count, true);
}

// Rule 515.4 — Draw Phase: draw 1 (draw() handles Burn Out), then every
// player's Rune Pool empties as the phase ends (515.4.d).
export function drawPhase(state: GameState): void {
  draw(state, state.turnPlayer, 1);
  emptyRunePools(state);
}

// Rules 515-516: everything from Awaken through the Draw Phase, leaving the
// state at the start of the Turn Player's Action Phase. Stops early once
// someone has won (rule 633: winning is immediate) — e.g. a Hold for the
// Final Point shouldn't be followed by a Draw that could Burn Out.
export function startTurn(state: GameState): void {
  const phases = [awaken, holdBattlefields, channelPhase, drawPhase];
  for (const phase of phases) {
    if (winner(state) !== null) return;
    phase(state);
  }
}

// Rule 517 — End of Turn, then hand the turn to the next player:
// - Expiration Step: clear all damage, expire "this turn" effects, empty
//   every Rune Pool. The only "this turn" effect that exists is Discipline's
//   +2 Might, and every Might modification so far is "this turn", so
//   expiring them is resetting might to baseMight. A permanent Might change
//   would need its own tracking before this stays correct.
// - Cleanup Step: Cleanup (rule 518). With damage just cleared it can't
//   kill anything yet (no Ending Step effects deal damage), so the 517.4
//   loop back to Expiration never happens; kept for the rule's sequence.
// - Per-turn state resets (scoredByThisTurn, rule 631), and the other
//   player becomes Turn Player (517.5). 1v1 only, like everything else.
export function endTurn(state: GameState): void {
  for (const unit of state.units) {
    unit.damage = 0;
    unit.might = unit.baseMight;
  }
  emptyRunePools(state);
  performCleanup(state);

  for (const battlefield of state.battlefields) {
    battlefield.scoredByThisTurn = [];
  }
  const nextPlayer = Object.keys(state.players).find((id) => id !== state.turnPlayer);
  if (nextPlayer) state.turnPlayer = nextPlayer;
  state.turnNumber += 1;
}

// End the current turn and run the next player's Start of Turn, leaving the
// state at the start of their Action Phase.
export function passTurn(state: GameState): void {
  endTurn(state);
  startTurn(state);
}

// Rule ~158-160: the Rune Pool empties for *every* player, not just the
// Turn Player, at the end of the Draw Phase and the end of the turn.
function emptyRunePools(state: GameState): void {
  for (const player of Object.values(state.players)) {
    player.energyPool = 0;
    player.powerPool = {};
  }
}
