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
  // Exhausting the Unit, so a freshly played Unit can't move until its
  // controller's next Awaken Phase readies it (turn.ts's awaken, rule 515.1).
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
  // rune.ts) and spent via cost.ts. Energy has no Domain. Emptied for every
  // player at the end of each Draw Phase and each turn (turn.ts) — it
  // carries across the whole Action Phase in between.
  energyPool: number;
  // Power's Domain usually matches the Rune it came from (158) — see
  // PowerPool above.
  powerPool: PowerPool;
  // Rule 524.1/525: Units killed in Combat (and Spells, once played) are
  // placed in their owner's Trash. See combat.ts (kills) and deck.ts's
  // burnOut (rule 607 — shuffled back into the deck when it's empty).
  trash: CardDefinition[];
}

export interface GameState {
  turnPlayer: PlayerId;
  // 1-based count of turns taken so far, across both players — turn 1 is
  // the First Player's first turn, turn 2 the second player's first. Only
  // read by turn.ts's Channel Phase (Duel's "the player going second
  // channels an extra Rune during their first Channel Phase").
  turnNumber: number;
  victoryScore: number;
  players: Record<PlayerId, PlayerState>;
  battlefields: Battlefield[];
  units: UnitInPlay[];
  // The Chain (rules 532-544) — see chain.ts. null when no Chain exists,
  // i.e. the turn is in an Open State (rule 510) and Priority sits with the
  // Turn Player.
  chain: Chain | null;
  // The Showdown in progress (rules 545-553) — see showdown.ts. null in a
  // Neutral State.
  showdown: Showdown | null;
}

export interface Showdown {
  battlefieldId: string;
  // A Combat's Showdown Step (opposing Units on both sides, rule 625) vs. a
  // stand-alone Showdown at an uncontrolled Battlefield (rule 548.2).
  isCombat: boolean;
  // Focus (rule 513): permission to act while no Chain exists. Gaining it
  // grants Priority; a Chain started mid-Showdown takes Priority over until
  // it resolves, then Focus moves on (rule 553.1.a.1).
  focus: PlayerId;
  // Relevant Players who've passed Focus in a row. Once everyone has (2, in
  // 1v1), the Showdown ends (rule 554) — a Combat then moves on to its
  // Damage Step, which solver.ts offers as resolveCombat.
  consecutivePasses: number;
}

// A played Spell waiting on the Chain to resolve. Its cost is already paid
// and it has already left its controller's hand; it reaches the Trash only
// once it resolves (rule 543). Targets are chosen on play (rule ~557) and
// re-checked for legality on resolution (rule 563.2.c).
export interface ChainItem {
  cardId: string;
  controller: PlayerId;
  targetInstanceId: string;
}

export interface Chain {
  // Ordered oldest first; the last item is the next to resolve (LIFO).
  items: ChainItem[];
  // The player with Priority (rule 512.2.c-d) — who may add a Reaction or
  // pass. Called the Active Player on the Chain (rule 537.2).
  priority: PlayerId;
  // How many Relevant Players have passed in a row since the last item was
  // added or resolved. Once everyone has (2, in 1v1), the newest item
  // resolves (rule 540.4.b).
  consecutivePasses: number;
}
