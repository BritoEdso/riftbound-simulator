import { CARD_DEFINITIONS } from './cards';
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
// (must receive lethal damage before any other unit — rule 727.1.c) and the
// rule that a unit must be assigned lethal damage in full before spreading
// to another (rule 626.1.d.3). `preferredOrder` (instanceIds) is the
// assigning player's choice of priority *within* a tier of equal-priority
// targets (rule 627: "units with the same priority... may assign damage in
// any order") — it can't move a target ahead of Tank units that outrank it,
// only break ties among targets that are already equal priority. Targets
// not named in `preferredOrder` keep their relative array order, so omitting
// it entirely reproduces the old deterministic default.
function assignDamage(totalDamage: number, targets: UnitInPlay[], preferredOrder?: string[]): void {
  let remaining = totalDamage;
  const preferenceRank = new Map((preferredOrder ?? []).map((instanceId, i) => [instanceId, i]));
  const ordered = [...targets].sort((a, b) => {
    const aTank = a.keywords.includes('Tank') ? 0 : 1;
    const bTank = b.keywords.includes('Tank') ? 0 : 1;
    if (aTank !== bTank) return aTank - bTank;
    const aRank = preferenceRank.get(a.instanceId) ?? Infinity;
    const bRank = preferenceRank.get(b.instanceId) ?? Infinity;
    return aRank - bRank;
  });

  for (const target of ordered) {
    if (remaining <= 0) break;
    const lethalNeeded = Math.max(target.might - target.damage, 0);
    const amount = Math.min(remaining, lethalNeeded);
    target.damage += amount;
    remaining -= amount;
  }
}

export interface DamageOrders {
  // Instance IDs, in the order the attacker/defender chooses to prioritize
  // damage among their own equal-priority targets (see assignDamage above).
  attackerDamageOrder?: string[];
  defenderDamageOrder?: string[];
}

// Resolves combat at a single battlefield per rules 620-632: sum each side's
// Might, assign damage simultaneously (attacker's total, then defender's
// total), remove lethal units, then determine Recall vs Conquer.
export function resolveCombat(
  state: GameState,
  battlefieldId: string,
  orders: DamageOrders = {},
): CombatResult {
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

  assignDamage(attackerMight, defenders, orders.attackerDamageOrder);
  assignDamage(defenderMight, attackers, orders.defenderDamageOrder);

  const killed = state.units.filter(
    (u) => u.location === battlefieldId && isLethal(u)
  );
  const killedIds = killed.map((u) => u.instanceId);
  state.units = state.units.filter((u) => !killedIds.includes(u.instanceId));

  // Rule 524.1/525: killed Units are placed in their owner's Trash. Only
  // applies when the Unit's cardId is a real, registered CardDefinition —
  // test/sample fixtures routinely use placeholder ids ('test-card',
  // 'sample-unit') that aren't in CARD_DEFINITIONS, same convention
  // effects.ts's applyRetreat already follows for its hand-return.
  for (const unit of killed) {
    const cardDefinition = CARD_DEFINITIONS[unit.cardId];
    if (cardDefinition) {
      state.players[unit.controller].trash.push(cardDefinition);
    }
  }

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
