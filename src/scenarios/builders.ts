import { CARD_DEFINITIONS } from "@/rules-engine/cards";
import { CardDefinition, Domain, PlayerId, PlayerState, RuneInPlay, UnitInPlay } from "@/rules-engine/types";

// Small helpers for writing a trial's initialState() — every trial builds a
// GameState by hand, and these keep that readable.

export function unit(
  overrides: Partial<UnitInPlay> & Pick<UnitInPlay, "instanceId" | "cardId" | "controller" | "location" | "might">,
): UnitInPlay {
  return {
    baseMight: overrides.might,
    damage: 0,
    keywords: [],
    combatRole: null,
    ready: true,
    ...overrides,
  };
}

export function player(id: PlayerId, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id,
    points: 0,
    hand: [],
    deck: [],
    runeDeck: [],
    runesInPlay: [],
    energyPool: 0,
    powerPool: {},
    trash: [],
    ...overrides,
  };
}

export function cards(...ids: string[]): CardDefinition[] {
  return ids.map((id) => {
    const card = CARD_DEFINITIONS[id];
    if (!card) throw new Error(`No CardDefinition for ${id}`);
    return card;
  });
}

// Runes in play, ids `${playerId}-rune-0…`, all Ready unless `ready` says otherwise.
export function runes(playerId: PlayerId, domains: Domain[], ready = true): RuneInPlay[] {
  return domains.map((domain, i) => ({ instanceId: `${playerId}-rune-${i}`, domain, ready }));
}
