import { GameState, PlayerId } from "@/rules-engine/types";

// A "trial" in the Street Fighter combo-trial sense: a fixed board where the
// player has to find the line that wins this turn. Scenarios are data plus
// small pure checks over a GameState — no React here, so they're testable
// in Node exactly like the engine (see __tests__/scenarios.test.ts).

export const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface Objective {
  label: string;
  isComplete(state: GameState): boolean;
}

export interface ExplanationStep {
  title: string;
  body: string;
  // Rule numbers as reconstructed in docs/turn-structure.md — the rules
  // PDF's numbering is unreliable in places, so treat these as pointers.
  rules?: string[];
}

export interface Scenario {
  id: string;
  title: string;
  difficulty: Difficulty;
  // The Legend the scenario teaches, by card-art id (components/cardImages.ts).
  legendCardId: string;
  legendName: string;
  briefing: string;
  // Who the learner plays; every other player is driven automatically.
  learner: PlayerId;
  // Friendly names for battlefields and for Units whose cardId isn't a real
  // card (e.g. a generic "2 Might unit").
  battlefieldNames: Record<string, string>;
  unitNames: Record<string, string>;
  objectives: Objective[];
  // A fresh copy every call, so a retry can never see a mutated board.
  initialState(): GameState;
  explanation: ExplanationStep[];
  // Lines that look right but fail — taught after the solution.
  commonMistakes: ExplanationStep[];
}
