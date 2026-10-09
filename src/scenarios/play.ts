import { priorityHolder } from "@/rules-engine/chain";
import { winner } from "@/rules-engine/queries";
import { Action, applyAction, canWin, legalActions } from "@/rules-engine/solver";
import { GameState, PlayerId } from "@/rules-engine/types";

// Driving a trial: whose move it is, the automatic opponent, and whether the
// learner can still win. All pure functions over GameState.

export type TrialStatus = "playing" | "won" | "lost" | "deadEnd";

// The opponent plays perfectly against the learner: if any reply leaves the
// learner with no winning line, it takes that one; otherwise its first
// legal reply (passing, when it can). That's exactly the opponent canWin
// already assumes, so "the solver says this wins" and "it wins in the UI"
// can never disagree.
export function chooseOpponentAction(state: GameState, learner: PlayerId): Action | null {
  const actions = legalActions(state, priorityHolder(state));
  if (actions.length === 0) return null;
  return actions.find((a) => !canWin(applyAction(state, a), learner).won) ?? actions[0];
}

// Applies opponent Actions until it's the learner's move or the game is
// over. Returns every Action taken, in order, for the move log.
export function runOpponent(state: GameState, learner: PlayerId): { state: GameState; taken: Action[]; before: GameState[] } {
  const taken: Action[] = [];
  const before: GameState[] = [];
  let current = state;
  while (winner(current) === null && priorityHolder(current) !== learner) {
    const action = chooseOpponentAction(current, learner);
    if (action === null) break;
    before.push(current);
    taken.push(action);
    current = applyAction(current, action);
  }
  return { state: current, taken, before };
}

export function trialStatus(state: GameState, learner: PlayerId): TrialStatus {
  const gameWinner = winner(state);
  if (gameWinner === learner) return "won";
  if (gameWinner !== null) return "lost";
  if (!canWin(state, learner).won) return "deadEnd";
  return "playing";
}

// The next step of a winning line from here — the hint button.
export function nextHint(state: GameState, learner: PlayerId): Action | null {
  const result = canWin(state, learner);
  return result.won ? (result.line[0] ?? null) : null;
}
