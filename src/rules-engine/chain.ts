import { CARD_DEFINITIONS } from './cards';
import { performCleanup } from './cleanup';
import { payCost } from './cost';
import { SPELLS } from './effects';
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
// Not modeled yet: Showdowns (so Focus, and the Action keyword's
// "playable in Showdowns", don't exist), triggered abilities joining the
// Chain, and activated abilities other than Rune taps. Units never touch
// the Chain at all: a permanent that starts a Chain resolves immediately
// with no Priority given (rule 538), so solver.ts's playUnit stays direct.

// Who may act right now: the Chain's Priority holder while it exists (a
// Closed State), otherwise the Turn Player (Neutral Open State, rule 512.2.a
// — only they have Priority during their Action Phase).
export function priorityHolder(state: GameState): PlayerId {
  return state.chain?.priority ?? state.turnPlayer;
}

// Rule 510-512: what timing a card needs to be played right now. In an Open
// State the Turn Player can play anything; in a Closed State (a Chain
// exists) only Reactions (rule 725). Only meaningful for the Priority holder.
export function isPlayableNow(state: GameState, cardId: string): boolean {
  if (state.chain === null) return true;
  return CARD_DEFINITIONS[cardId].keywords.includes('Reaction');
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
// Relevant Player has passed in a row, the newest item resolves.
export function passPriority(state: GameState, playerId: PlayerId): void {
  const chain = state.chain;
  if (chain === null) throw new Error('No Chain to pass on');
  if (chain.priority !== playerId) throw new Error(`${playerId} doesn't have Priority`);

  chain.consecutivePasses += 1;
  const relevantPlayers = Object.keys(state.players);
  if (chain.consecutivePasses < relevantPlayers.length) {
    chain.priority = nextPlayer(relevantPlayers, playerId);
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
  const spell = SPELLS[item.cardId];
  const targetIsLegal = spell
    .legalTargets(state, item.controller)
    .some((u) => u.instanceId === item.targetInstanceId);
  spell.resolve(state, item, targetIsLegal);
  state.players[item.controller].trash.push(CARD_DEFINITIONS[item.cardId]);
  performCleanup(state);

  const newest = chain.items[chain.items.length - 1];
  if (newest === undefined) {
    state.chain = null;
  } else {
    chain.priority = newest.controller;
    chain.consecutivePasses = 0;
  }
}

// Turn Order, as a repeating cycle (rule ~118).
function nextPlayer(players: PlayerId[], current: PlayerId): PlayerId {
  return players[(players.indexOf(current) + 1) % players.length];
}
