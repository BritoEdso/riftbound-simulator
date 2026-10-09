import { CARD_DEFINITIONS } from './cards';
import { performCleanup } from './cleanup';
import { payCost } from './cost';
import { ABILITIES, SPELLS } from './effects';
import { nextInTurnOrder } from './queries';
import { passFocus, passFocusAfterChain } from './showdown';
import { GameState, PlayerId } from './types';

// The Chain and Priority (rules 507-513, 532-544). See
// docs/turn-structure.md for the full reference.
//
// Modeled: playing a Spell puts it on the Chain instead of resolving it; the
// player who added the newest item holds Priority; Relevant Players (both,
// in 1v1) alternate adding Reactions or passing; once everyone has passed in
// a row the newest item resolves (LIFO), a Cleanup follows, and Priority
// goes to the controller of the new newest item — or, once the Chain is
// empty, back to the Turn Player in an Open State.
//
// Showdowns (showdown.ts) layer on top: with no Chain, the player with
// Focus has Priority, and a Chain that empties mid-Showdown passes Focus on.
//
// Not modeled yet: triggered abilities joining the Chain, and activated
// abilities other than Rune taps. Units never touch
// the Chain at all: a permanent that starts a Chain resolves immediately
// with no Priority given (rule 538), so solver.ts's playUnit stays direct.

// Who may act right now (rule 512.2): first, anyone who still has to target
// a trigger for a Combat's Initial Chain (showdown.ts); then the Chain's
// Priority holder while one exists (Closed State); else the player with
// Focus in a Showdown (Showdown Open State); else the Turn Player (Neutral
// Open State — only they act during their Action Phase).
export function priorityHolder(state: GameState): PlayerId {
  return (
    state.showdown?.pendingTriggers[0]?.controller ??
    state.chain?.priority ??
    state.showdown?.focus ??
    state.turnPlayer
  );
}

// Rules 507-510: what timing a card needs right now. Neutral Open: anything.
// Showdown Open: Action or Reaction (rule 508.1.a, 718). Closed (a Chain
// exists, Showdown or not): Reaction only (rule 509.1.a, 725). Only
// meaningful for the Priority holder.
export function isPlayableNow(state: GameState, cardId: string): boolean {
  const keywords = CARD_DEFINITIONS[cardId].keywords;
  if (state.chain !== null) return keywords.includes('Reaction');
  if (state.showdown !== null) return keywords.includes('Reaction') || keywords.includes('Action');
  return true;
}

// Rule 554 / 537: play a Spell — pay its cost, move it from hand onto the
// Chain (creating one if needed), and give its controller Priority. Throws
// if the player doesn't hold Priority, the timing is wrong, or they can't
// pay — every caller should already have checked via solver.ts's
// legalActions.
export function playSpell(state: GameState, playerId: PlayerId, cardId: string, targetInstanceId: string): void {
  if (priorityHolder(state) !== playerId) throw new Error(`${playerId} doesn't have Priority`);
  if (!isPlayableNow(state, cardId)) throw new Error(`${cardId} can't be played in a Closed State`);
  const hand = state.players[playerId].hand;
  const index = hand.findIndex((c) => c.id === cardId);
  if (index === -1) throw new Error(`${cardId} isn't in ${playerId}'s hand`);

  payCost(state, playerId, CARD_DEFINITIONS[cardId]);
  hand.splice(index, 1);

  const item = { cardId, controller: playerId, targetInstanceId };
  if (state.chain === null) {
    state.chain = { items: [item], priority: playerId, consecutivePasses: 0 };
  } else {
    state.chain.items.push(item);
    state.chain.priority = playerId;
    state.chain.consecutivePasses = 0;
  }
}

// Rule 540.3-540.4: pass Priority to the next Relevant Player. Once every
// Relevant Player has passed in a row, the newest item resolves. With no
// Chain, passing in a Showdown passes Focus instead (showdown.ts).
export function passPriority(state: GameState, playerId: PlayerId): void {
  const chain = state.chain;
  if (chain === null) {
    passFocus(state, playerId);
    return;
  }
  if (chain.priority !== playerId) throw new Error(`${playerId} doesn't have Priority`);

  chain.consecutivePasses += 1;
  const relevantPlayers = Object.keys(state.players);
  if (chain.consecutivePasses < relevantPlayers.length) {
    chain.priority = nextInTurnOrder(state, playerId);
    return;
  }
  resolveNewestItem(state);
}

// Rule 543: resolve the newest item, put the Spell in its owner's Trash,
// Cleanup, then hand Priority to the controller of what's now newest (and
// everyone must pass again), or close the Chain if it's empty.
function resolveNewestItem(state: GameState): void {
  const chain = state.chain!;
  const item = chain.items.pop()!;
  if (item.sourceInstanceId === undefined) {
    const spell = SPELLS[item.cardId];
    const targetIsLegal = spell.legalTargets(state, item.controller).some((u) => u.instanceId === item.targetInstanceId);
    spell.resolve(state, item, targetIsLegal);
    state.players[item.controller].trash.push(CARD_DEFINITIONS[item.cardId]);
  } else {
    // A triggered ability — not a card, so nothing goes to the Trash.
    const ability = ABILITIES[item.cardId];
    const targetIsLegal = ability
      .legalTargets(state, item.controller, item.sourceInstanceId)
      .some((u) => u.instanceId === item.targetInstanceId);
    ability.resolve(state, item, targetIsLegal);
  }
  performCleanup(state);

  const newest = chain.items[chain.items.length - 1];
  if (newest === undefined) {
    state.chain = null;
    passFocusAfterChain(state, item.controller);
  } else {
    chain.priority = newest.controller;
    chain.consecutivePasses = 0;
  }
}
