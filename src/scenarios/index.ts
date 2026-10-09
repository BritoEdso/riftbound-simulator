import { ahriTwoFronts } from "./ahri/twoFronts";
import { DIFFICULTIES, Difficulty, Scenario } from "./types";

export const SCENARIOS: Scenario[] = [ahriTwoFronts];

export function findScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function scenariosForLegend(legendId: string): Scenario[] {
  return SCENARIOS.filter((s) => s.legendId === legendId);
}

// One Legend's trials, grouped Beginner → Expert (empty tiers included, so
// the page can show what's still to come).
export function scenariosByDifficulty(legendId: string): { difficulty: Difficulty; scenarios: Scenario[] }[] {
  return DIFFICULTIES.map((difficulty) => ({
    difficulty,
    scenarios: scenariosForLegend(legendId).filter((s) => s.difficulty === difficulty),
  }));
}

export { DIFFICULTIES };
export { LEGENDS, findLegend } from "./legends";
export type { Legend } from "./legends";
export type { Difficulty, Scenario };
