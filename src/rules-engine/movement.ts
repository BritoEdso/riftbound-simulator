import { performCleanup } from './cleanup';
import { findUnit } from './queries';
import { GameState, UnitInPlay } from './types';

export interface MoveResult {
  contested: boolean;
}

// Rule 140-141 — Standard Move: Units exhaust themselves to move from
// their controller's Base to a Battlefield, or from a Battlefield back to
// Base. Several Units may move together if they share a destination, even
// from different origins (rule ~596) — and since a Combat or Showdown opens
// at the Cleanup right after the Move, that's the only way for more than
// one of them to be in it. Battlefield-to-Battlefield only exists via the
// Ganking keyword (rule 722) — no CardDefinition has it, so it throws.
// Rule 141.2.a.1's "can't move to a Battlefield with 2 other players' Units
// already present" is a 3+-player restriction; this project is 1v1 only
// (see CLAUDE.md), so it never applies and isn't checked.
export function moveUnits(state: GameState, unitInstanceIds: string[], destination: string): MoveResult {
  const units = unitInstanceIds.map((id) => findUnit(state, id));
  if (units.length === 0) throw new Error('A Move needs at least one Unit');
  const mover = units[0].controller;
  for (const unit of units) {
    if (unit.controller !== mover) throw new Error('Units moving together must share a controller');
    if (!unit.ready) throw new Error(`Unit already Exhausted: ${unit.instanceId}`);
    if (unit.location === destination) throw new Error(`${unit.instanceId} is already at ${destination}`);
    if (unit.location !== 'base' && destination !== 'base') {
      throw new Error(`${unit.instanceId} can't move Battlefield to Battlefield without Ganking`);
    }
  }

  const result = arrive(state, units, destination);
  // Rule 518: a Cleanup follows every completed Move — which is where a
  // Battlefield the movers just left empty loses its Control.
  performCleanup(state);
  return result;
}

// A single Unit's Standard Move.
export function moveUnit(state: GameState, unitInstanceId: string, destination: string): MoveResult {
  return moveUnits(state, [unitInstanceId], destination);
}

function arrive(state: GameState, units: UnitInPlay[], destination: string): MoveResult {
  for (const unit of units) {
    unit.ready = false; // Rule 140.4: Exhausting the Unit is the cost.
    unit.location = destination;
  }
  const mover = units[0].controller;

  if (destination === 'base') {
    // Leaving a Battlefield isn't itself a Combat-triggering action.
    for (const unit of units) unit.combatRole = null;
    return { contested: false };
  }

  const battlefield = state.battlefields.find((b) => b.id === destination);
  if (!battlefield) throw new Error(`Unknown battlefield: ${destination}`);

  const unitsHere = state.units.filter((u) => u.location === destination);
  const opposingUnitsPresent = unitsHere.some((u) => u.controller !== mover);

  if (battlefield.controller === null && !opposingUnitsPresent) {
    // Rule 548.2: arriving at an empty, uncontrolled Battlefield Contests it
    // but isn't a Combat — a stand-alone Showdown opens (showdown.ts), and
    // Control (and its Conquer Score) only goes to the mover once that ends
    // with their Units still there. No combatRole: nobody's attacking.
    battlefield.contested = true;
    return { contested: true };
  }

  if (battlefield.controller === mover) {
    // Already yours — reinforcing, not contesting anything.
    return { contested: false };
  }

  // Rule 181.2 / 626.1.d's "Attacker is the player who applied the
  // Contested status": moving into a Battlefield you don't control makes it
  // Contested and makes you the Attacker; whichever other controller has
  // Units there becomes Defender. Re-derive every co-located Unit's
  // combatRole from scratch rather than patching incrementally — simpler,
  // and correct since resolveCombat already resets combatRole to null once
  // a fight resolves, so there's never stale state here to preserve.
  battlefield.contested = true;
  for (const u of unitsHere) {
    u.combatRole = u.controller === mover ? 'attacking' : 'defending';
  }
  return { contested: true };
}
