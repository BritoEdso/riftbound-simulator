import { findUnit } from './queries';
import { GameState } from './types';

export interface MoveResult {
  contested: boolean;
}

// Rule 140-141 — Standard Move: a Unit exhausts itself to move from its
// controller's Base to a Battlefield, or from a Battlefield back to Base.
// (Battlefield-to-Battlefield only exists via the Ganking keyword, rule
// 722 — no CardDefinition has it yet, so it's not modeled.) Rule
// 141.2.a.1's "can't move to a Battlefield with 2 other players' Units
// already present" is a 3+-player restriction; this project is 1v1 only
// (see CLAUDE.md), so it never applies and isn't checked.
export function moveUnit(state: GameState, unitInstanceId: string, destination: string): MoveResult {
  const unit = findUnit(state, unitInstanceId);
  if (!unit.ready) {
    throw new Error(`Unit already Exhausted: ${unitInstanceId}`);
  }
  unit.ready = false; // Rule 140.4: Exhausting the Unit is the cost.
  unit.location = destination;

  if (destination === 'base') {
    // Leaving a Battlefield isn't itself a Combat-triggering action.
    unit.combatRole = null;
    return { contested: false };
  }

  const battlefield = state.battlefields.find((b) => b.id === destination);
  if (!battlefield) throw new Error(`Unknown battlefield: ${destination}`);

  const unitsHere = state.units.filter((u) => u.location === destination);
  const opposingUnitsPresent = unitsHere.some((u) => u.controller !== unit.controller);

  if (battlefield.controller === null && !opposingUnitsPresent) {
    // Rule 181.4.c: Control is established outright when nobody contests it.
    battlefield.controller = unit.controller;
    return { contested: false };
  }

  if (battlefield.controller === unit.controller) {
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
    u.combatRole = u.controller === unit.controller ? 'attacking' : 'defending';
  }
  return { contested: true };
}
