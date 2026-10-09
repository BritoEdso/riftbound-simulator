import { CARD_DEFINITIONS } from './cards';
import { draw } from './deck';
import { findUnit } from './queries';
import { channel } from './rune';
import { ChainItem, GameState, PlayerId, UnitInPlay } from './types';

// Card effects are implemented as functions that mutate a GameState. Effects
// that require systems we haven't modeled yet (rune pools) are called out in
// comments rather than silently doing nothing. None of them run a Cleanup
// themselves — chain.ts does that once each Chain item resolves (rule 518).

// Discipline (OGN-058): "Give a unit +2 Might this turn. Draw 1."
export function applyDiscipline(state: GameState, targetInstanceId: string, casterId: string): void {
  const unit = state.units.find((u) => u.instanceId === targetInstanceId);
  if (!unit) throw new Error(`Unknown unit: ${targetInstanceId}`);
  unit.might += 2;
  draw(state, casterId, 1);
}

// Retreat (OGN-104): "Return a friendly unit to its owner's hand. Its owner
// channels 1 rune exhausted."
export function applyRetreat(state: GameState, targetInstanceId: string): void {
  const index = state.units.findIndex((u) => u.instanceId === targetInstanceId);
  if (index === -1) throw new Error(`Unknown unit: ${targetInstanceId}`);
  const [unit] = state.units.splice(index, 1);

  const cardDefinition = CARD_DEFINITIONS[unit.cardId];
  if (cardDefinition) {
    state.players[unit.controller].hand.push(cardDefinition);
  }
  // "Its owner channels 1 rune exhausted" (rule 606).
  channel(state, unit.controller, 1, false);
}

// Hextech Ray (OGN-009): "Deal 3 to a unit at a battlefield." The lethal
// check happens in the Cleanup that follows resolution (chain.ts).
export function applyHextechRay(state: GameState, targetInstanceId: string): void {
  const unit = findUnit(state, targetInstanceId);
  unit.damage += 3;
}

// Every Spell the engine can play, keyed by card id. `legalTargets` is used
// twice: by solver.ts to offer the spell, and by chain.ts as the spell
// resolves — rule 563.2.c: "The spell resolves even if some or all of its
// targets are illegal"; an illegal target is just unaffected, and the rest
// of the text still happens ("Instructions that can't be followed... are
// ignored"). So `resolve` is always called, told whether its target is
// still legal.
export interface SpellDefinition {
  legalTargets(state: GameState, casterId: PlayerId): UnitInPlay[];
  resolve(state: GameState, item: ChainItem, targetIsLegal: boolean): void;
}

export const SPELLS: Record<string, SpellDefinition> = {
  // "a unit" — any unit on the board, either side.
  'OGN-058': {
    legalTargets: (state) => state.units,
    resolve: (state, item, targetIsLegal) => {
      if (targetIsLegal) {
        applyDiscipline(state, item.targetInstanceId, item.controller);
      } else {
        draw(state, item.controller, 1); // the "Draw 1" still happens
      }
    },
  },
  // "a friendly unit" — controlled by the caster. "Its owner channels"
  // refers to the target, so an illegal target skips the channel too.
  'OGN-104': {
    legalTargets: (state, casterId) => state.units.filter((u) => u.controller === casterId),
    resolve: (state, item, targetIsLegal) => {
      if (targetIsLegal) applyRetreat(state, item.targetInstanceId);
    },
  },
  // "a unit at a battlefield" — not at a base.
  'OGN-009': {
    legalTargets: (state) => state.units.filter((u) => u.location !== 'base'),
    resolve: (state, item, targetIsLegal) => {
      if (targetIsLegal) applyHextechRay(state, item.targetInstanceId);
    },
  },
};

// "Give it -N Might this turn, to a minimum of 1 Might." A unit already at
// or below 1 is left alone rather than raised. "This turn" expires at
// turn.ts's endTurn, which resets might to baseMight.
export function reduceMightThisTurn(unit: UnitInPlay, amount: number): void {
  if (unit.might <= 1) return;
  unit.might = Math.max(1, unit.might - amount);
}

// Triggered abilities (rule 582), keyed by the card they're printed on.
// `trigger` says which game event puts one on the Chain; `legalTargets` and
// `resolve` work like SPELLS's, except abilities know their source Unit.
// Only "When I attack or defend" exists so far — showdown.ts collects those
// as a Combat's Initial Chain (rule 551.1.a / 625.1.c).
export interface AbilityDefinition {
  trigger: 'attackOrDefend';
  legalTargets(state: GameState, controller: PlayerId, sourceInstanceId: string): UnitInPlay[];
  resolve(state: GameState, item: ChainItem, targetIsLegal: boolean): void;
}

export const ABILITIES: Record<string, AbilityDefinition> = {
  // Ahri, Inquisitive: "When I attack or defend, give an enemy unit here -2
  // Might this turn, to a minimum of 1 Might." "Here" is wherever Ahri is
  // — if she's gone by the time it resolves, nothing is "here" any more.
  'OGN-119': {
    trigger: 'attackOrDefend',
    legalTargets: (state, controller, sourceInstanceId) => {
      const source = state.units.find((u) => u.instanceId === sourceInstanceId);
      if (!source) return [];
      return state.units.filter((u) => u.location === source.location && u.controller !== controller);
    },
    resolve: (state, item, targetIsLegal) => {
      if (targetIsLegal) reduceMightThisTurn(findUnit(state, item.targetInstanceId), 2);
    },
  },
};
