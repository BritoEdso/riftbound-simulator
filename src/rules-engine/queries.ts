import { GameState, PlayerId, UnitInPlay } from "./types";

export function findUnit(state: GameState, instanceId: string): UnitInPlay {
    const targetUnit = state.units.find((u) => u.instanceId === instanceId);
      if (!targetUnit) throw new Error(`Unknown unit: ${instanceId}`);
    return targetUnit
}

// Rule 633: a player who reaches the Victory Score wins immediately, from
// any source (including an opponent's Burn Out). null while nobody has.
export function winner(state: GameState): PlayerId | null {
    const won = Object.values(state.players).find((p) => p.points >= state.victoryScore);
    return won ? won.id : null;
}

// Turn Order as a repeating cycle (rule ~118) — the next player after
// `current`. 1v1 in practice, but written for any player count.
export function nextInTurnOrder(state: GameState, current: PlayerId): PlayerId {
    const players = Object.keys(state.players);
    return players[(players.indexOf(current) + 1) % players.length];
}
