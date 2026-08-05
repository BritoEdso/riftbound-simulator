import { GameState } from './types';

export type ScoreMethod = 'conquer' | 'hold';

export interface ScoreResult {
  scored: boolean;
  pointAwarded: boolean;
  wonGame: boolean;
  drewCardInstead: boolean;
}

// Implements rules 629-637: a player Scores via Conquer (taking control of a
// battlefield they didn't yet Score this turn) or Hold (controlling one at
// the start of their turn). Scoring is capped at once per battlefield per
// turn. The Final Point (reaching Victory Score) has an extra restriction:
// a Conquer only grants it if the player has also Scored every other
// battlefield this turn; otherwise they draw a card instead and the game
// continues. A Hold always grants the Final Point outright.
export function score(
  state: GameState,
  playerId: string,
  battlefieldId: string,
  method: ScoreMethod
): ScoreResult {
  const battlefield = state.battlefields.find((b) => b.id === battlefieldId);
  if (!battlefield) throw new Error(`Unknown battlefield: ${battlefieldId}`);

  if (battlefield.scoredByThisTurn.includes(playerId)) {
    return { scored: false, pointAwarded: false, wonGame: false, drewCardInstead: false };
  }

  const player = state.players[playerId];
  const isFinalPoint = player.points === state.victoryScore - 1;

  battlefield.scoredByThisTurn.push(playerId);

  if (!isFinalPoint) {
    player.points += 1;
    return { scored: true, pointAwarded: true, wonGame: false, drewCardInstead: false };
  }

  if (method === 'hold') {
    player.points += 1;
    return { scored: true, pointAwarded: true, wonGame: true, drewCardInstead: false };
  }

  // Conquer at match point: only wins if every battlefield has been Scored
  // by this player this turn.
  const scoredAllBattlefields = state.battlefields.every((b) =>
    b.scoredByThisTurn.includes(playerId)
  );

  if (scoredAllBattlefields) {
    player.points += 1;
    return { scored: true, pointAwarded: true, wonGame: true, drewCardInstead: false };
  }

  // Card-drawing is not modeled yet (no deck in GameState); callers should
  // treat `drewCardInstead: true` as a signal to draw for this player.
  return { scored: true, pointAwarded: false, wonGame: false, drewCardInstead: true };
}
