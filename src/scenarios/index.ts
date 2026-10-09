import { ahriTwoFronts } from "./ahri/twoFronts";
import { DIFFICULTIES, Difficulty, Scenario } from "./types";

export const SCENARIOS: Scenario[] = [ahriTwoFronts];

export function findScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function scenariosByDifficulty(): { difficulty: Difficulty; scenarios: Scenario[] }[] {
  return DIFFICULTIES.map((difficulty) => ({
    difficulty,
    scenarios: SCENARIOS.filter((s) => s.difficulty === difficulty),
  }));
}

export { DIFFICULTIES };
export type { Difficulty, Scenario };
