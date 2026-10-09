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
