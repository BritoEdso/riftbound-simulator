export type Domain = 'Fury' | 'Calm' | 'Mind' | 'Body' | 'Chaos' | 'Order';

export type CardType = 'Unit' | 'Gear' | 'Spell' | 'Rune' | 'Battlefield' | 'Legend';

// Power has a Domain (rule 157.2.b.1) except 'Universal' Power, which can
// pay a cost of any Domain (rule 159.1). Shared shape for both a card's
// powerCost and a player's powerPool — see cost.ts.
export type PowerPool = Partial<Record<Domain | 'Universal', number>>;

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
  powerCost: PowerPool;
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
  // Rule 139.4: Units enter the Board Exhausted (ready: false) by default —
  // Accelerate (rule 717, no CardDefinition has it yet) is the only thing
  // that changes that. Standard Move (rule 140 — see movement.ts) costs
  // Exhausting the Unit, so a freshly played Unit can't immediately move;
  // nothing in this engine currently readies a Unit back (no Ready Step —
  // no turn/phase system exists yet), matching the Rune Pool's own
  // never-empties limitation.
  ready: boolean;
}

// A Rune channeled onto the board (rule 606 — Channel), tracking whether
// it's Ready or Exhausted. Distinct from the "Rune Pool" (rule 158): that's
// the ephemeral Energy/Power counter a channeled Rune can be exhausted to
// pay into, which resets every phase and isn't modeled yet — see effects.ts.
export interface RuneInPlay {
  instanceId: string;
  domain: Domain;
  ready: boolean;
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
  // Ordered; index 0 is the next Rune channeled (rule 606). Rule 154.2.b:
  // exactly 12 Rune cards chosen at deck construction, so this plus
  // runesInPlay never together exceeds 12.
  runeDeck: Domain[];
  // Runes already channeled onto the board, each individually Ready or
  // Exhausted.
  runesInPlay: RuneInPlay[];
  // The Rune Pool (rule 158): a conceptual stockpile of Energy/Power
  // available to pay costs, filled by exhausting/Recycling Runes (see
  // rune.ts) and spent via cost.ts. Energy has no Domain. Real rules empty
  // this every phase/turn (rule 160.1) — not enforced here, since no
  // turn/phase system exists yet; see cost.ts.
  energyPool: number;
  // Power's Domain usually matches the Rune it came from (158) — see
  // PowerPool above.
  powerPool: PowerPool;
}

export interface GameState {
  turnPlayer: PlayerId;
  victoryScore: number;
  players: Record<PlayerId, PlayerState>;
  battlefields: Battlefield[];
  units: UnitInPlay[];
}
