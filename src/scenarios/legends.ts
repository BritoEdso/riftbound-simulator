import { Domain } from "@/rules-engine/types";

// The Legends a learner can pick on the home page. Each one groups its own
// trials (Scenario.legendId). Text is from the official card gallery — see
// docs/cards/ for the transcriptions.
export interface Legend {
  id: string;
  champion: string;
  // The Legend card's own name.
  title: string;
  // Card-art id in components/cardImages.ts.
  cardId: string;
  domains: Domain[];
  abilityText: string;
  // One or two sentences on how the Legend plays — what its trials teach.
  playstyle: string;
}

export const LEGENDS: Legend[] = [
  {
    id: "ahri",
    champion: "Ahri",
    title: "Nine-Tailed Fox",
    // OGN-303 is the Showcase printing we have art for; the base card is
    // OGN-255 with identical text (docs/cards/ahri.md).
    cardId: "OGN-303",
    domains: ["Calm", "Mind"],
    abilityText:
      "When an enemy unit attacks a battlefield you control, give it -1 Might this turn, to a minimum of 1 Might.",
    playstyle:
      "Ahri wins fights by shrinking the other side. Her Champions cut enemy Might when they attack or defend, " +
      "and her trials teach you to line that up with buffs and the Final Point rule.",
  },
];

export function findLegend(id: string): Legend | undefined {
  return LEGENDS.find((l) => l.id === id);
}
