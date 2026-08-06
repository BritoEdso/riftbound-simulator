import { GameState, UnitInPlay } from "./types";

export function findUnit(state: GameState, instanceId: string): UnitInPlay {
    const targetUnit = state.units.find((u) => u.instanceId === instanceId);
      if (!targetUnit) throw new Error(`Unknown unit: ${instanceId}`);
    return targetUnit
}