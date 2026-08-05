export type Domain = 'Fury' | 'Calm' | 'Mind' | 'Body' | 'Chaos' | 'Order';

export type CardType = 'Unit' | 'Gear' | 'Spell' | 'Rune' | 'Battlefield' | 'Legend';

export type PlayerId = string;

// Static, printed card data — one entry per unique card name/id.
// This is populated by hand for now (see src/rules-engine/cards.ts); a bulk
// data source can replace it later without changing anything downstream.
export interface CardDefinition {
  id: string;
  name: string;
  type: CardType;
  domains: Domain[];
  energyCost: number;
  powerCost: Partial<Record<Domain | 'Universal', number>>;
  might?: number;
  keywords: string[];
  rulesText: string;
}

// A unit actually on the board, tracking the mutable state combat cares about.
// `might` is the *current* (possibly modified) Might; `baseMight` is the
// printed value the modification is relative to.
export interface UnitInPlay {
  instanceId: string;
  cardId: string;
  controller: PlayerId;
  // 'base' or a Battlefield id.
  location: string;
  baseMight: number;
  might: number;
  damage: number;
  keywords: string[];
  combatRole: 'attacking' | 'defending' | null;
}

export interface Battlefield {
  id: string;
  controller: PlayerId | null;
  contested: boolean;
  // Players who have already Scored (via Conquer or Hold) at this battlefield
  // this turn — a battlefield can only be scored once per player per turn.
  scoredByThisTurn: PlayerId[];
}

export interface PlayerState {
  id: PlayerId;
  points: number;
  hand: CardDefinition[];
  // Ordered; index 0 is the top of the deck (next card drawn).
  deck: CardDefinition[];
}

export interface GameState {
  turnPlayer: PlayerId;
  victoryScore: number;
  players: Record<PlayerId, PlayerState>;
  battlefields: Battlefield[];
  units: UnitInPlay[];
}
