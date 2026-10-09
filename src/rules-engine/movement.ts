import { performCleanup } from './cleanup';
import { findUnit } from './queries';
import { score, ScoreResult } from './scoring';
import { GameState } from './types';

export interface MoveResult {
  contested: boolean;
  // Rule 630.1: establishing Control of an empty, uncontrolled Battlefield
  // is gaining Control, so it Scores via Conquer. undefined otherwise.
  score?: ScoreResult;
}

// Rule 140-141 — Standard Move: a Unit exhausts itself to move from its
// controller's Base to a Battlefield, or from a Battlefield back to Base.
// (Battlefield-to-Battlefield only exists via the Ganking keyword, rule
// 722 — no CardDefinition has it yet, so it's not modeled.) Rule
// 141.2.a.1's "can't move to a Battlefield with 2 other players' Units
// already present" is a 3+-player restriction; this project is 1v1 only
// (see CLAUDE.md), so it never applies and isn't checked.
export function moveUnit(state: GameState, unitInstanceId: string, destination: string): MoveResult {
  const result = arrive(state, unitInstanceId, destination);
  // Rule 518: a Cleanup follows every completed Move — which is where a
  // Battlefield the mover just left empty loses its Control.
  performCleanup(state);
  return result;
}

function arrive(state: GameState, unitInstanceId: string, destination: string): MoveResult {
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
    // Real rules open a non-combat Showdown here first (rule 548.2) — with
    // no Action/Reaction exchange modeled, it always ends with the mover in
    // Control. See docs/turn-structure.md's open ambiguity #1.
    battlefield.controller = unit.controller;
    return { contested: false, score: score(state, unit.controller, destination, 'conquer') };
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
