import { GameState, UnitInPlay } from './types';

export interface CombatResult {
  battlefieldId: string;
  killed: string[]; // instanceIds removed from play
  conquered: boolean;
  newController: string | null;
}

function isLethal(unit: UnitInPlay): boolean {
  return unit.damage > 0 && unit.damage >= unit.might;
}

// Distributes `totalDamage` across `targets`, respecting the Tank keyword
// (must receive lethal damage before any other unit) and the rule that a
// unit must be assigned lethal damage in full before spreading to another.
// Ties among equal-priority targets are broken by array order — this is a
// simplification of the real "assigning player chooses" rule, adequate for
// single-defender combats and as a deterministic default for now.
function assignDamage(totalDamage: number, targets: UnitInPlay[]): void {
  let remaining = totalDamage;
  const ordered = [...targets].sort((a, b) => {
    const aTank = a.keywords.includes('Tank') ? 0 : 1;
    const bTank = b.keywords.includes('Tank') ? 0 : 1;
    return aTank - bTank;
  });

  for (const target of ordered) {
    if (remaining <= 0) break;
    const lethalNeeded = Math.max(target.might - target.damage, 0);
    const amount = Math.min(remaining, lethalNeeded);
    target.damage += amount;
    remaining -= amount;
  }
}

// Resolves combat at a single battlefield per rules 620-632: sum each side's
// Might, assign damage simultaneously (attacker's total, then defender's
// total), remove lethal units, then determine Recall vs Conquer.
export function resolveCombat(state: GameState, battlefieldId: string): CombatResult {
  const battlefield = state.battlefields.find((b) => b.id === battlefieldId);
  if (!battlefield) throw new Error(`Unknown battlefield: ${battlefieldId}`);

  const attackers = state.units.filter(
    (u) => u.location === battlefieldId && u.combatRole === 'attacking'
  );
  const defenders = state.units.filter(
    (u) => u.location === battlefieldId && u.combatRole === 'defending'
  );

  const attackerMight = attackers.reduce((sum, u) => sum + Math.max(u.might, 0), 0);
  const defenderMight = defenders.reduce((sum, u) => sum + Math.max(u.might, 0), 0);

  assignDamage(attackerMight, defenders);
  assignDamage(defenderMight, attackers);

  const killed = state.units.filter(
    (u) => u.location === battlefieldId && isLethal(u)
  );
  const killedIds = killed.map((u) => u.instanceId);
  state.units = state.units.filter((u) => !killedIds.includes(u.instanceId));

  const survivingAttackers = state.units.filter(
    (u) => u.location === battlefieldId && u.combatRole === 'attacking'
  );
  const survivingDefenders = state.units.filter(
    (u) => u.location === battlefieldId && u.combatRole === 'defending'
  );

  let conquered = false;
  let newController = battlefield.controller;

  if (survivingAttackers.length > 0 && survivingDefenders.length === 0) {
    // Conquer: attacker takes control.
    conquered = true;
    newController = survivingAttackers[0].controller;
    battlefield.controller = newController;
  } else if (survivingAttackers.length > 0 && survivingDefenders.length > 0) {
    // Recall: attacking units return to their controller's base.
    for (const unit of survivingAttackers) {
      unit.location = 'base';
    }
  }
  // If neither side has survivors, no combat occurred (rule 626.1.d.3) —
  // control and location are left as-is.

  battlefield.contested = false;

  // Rule 139.4 / 630.2: damage clears from all Units (everywhere) after any
  // Combat resolves, not just those at this battlefield.
  const combatantIds = new Set(
    [...survivingAttackers, ...survivingDefenders].map((u) => u.instanceId)
  );
  for (const unit of state.units) {
    unit.damage = 0;
    if (combatantIds.has(unit.instanceId)) {
      unit.combatRole = null;
    }
  }

  return { battlefieldId, killed: killedIds, conquered, newController };
}
