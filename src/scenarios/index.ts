import { ahriAnswerLast } from "./ahri/answerLast";
import { ahriFoxAndFriend } from "./ahri/foxAndFriend";
import { ahriPickYourPrey } from "./ahri/pickYourPrey";
import { ahriTwoFronts } from "./ahri/twoFronts";
import { DIFFICULTIES, Difficulty, Scenario } from "./types";

// Within a Legend, order here is the order trials are numbered in on its
// page (after grouping by tier).
export const SCENARIOS: Scenario[] = [ahriFoxAndFriend, ahriPickYourPrey, ahriTwoFronts, ahriAnswerLast];

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
