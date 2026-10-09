# Turn structure — rules reference

Condensed from a careful read of `docs/rules/riftbound-core-rules-2025-06-02.txt`
(2026-10-09). That extraction's rule-number column is misaligned with its
text, so numbers below were reconstructed from the document's own
cross-references — treat `~` numbers as best-effort, and grep the quoted
phrase rather than the number when checking.

Anchors that agree with each other: 507 States of the Turn, 518 Cleanups,
528 Relevant Players, 532 Chains, 545 Showdowns, 554 Playing Cards, 576
Activated Abilities, 582 Triggered Abilities, 589.1 Discretionary Actions,
606 Channel, 607 Burn Out, 620 Combat, 624 Steps of Combat, 629 Scoring,
717 Accelerate, 718 Action, 719 Assault, 723 Hidden, 725 Reaction, 728
Temporary.

## One turn, in order (514-517)

502-503: phases are rigid, actions within them happen one at a time. 505: a
phase ends when the Chain is empty and the Turn Player can't/won't act.

1. **Awaken** (515.1) — the Turn Player readies *everything* they control
   (units, runes, gear, presumably Legend).
2. **Beginning Phase** (515.2)
   - *Beginning Step*: "At the start of your Beginning Phase" triggers.
     Temporary (728) kills its unit here, "before scoring".
   - *Scoring Step*: "Holding occurs at this time." Only the Turn Player
     Holds, once per battlefield they control (630.2, 631).
3. **Channel** (515.3) — channel 2 runes, Ready; as many as possible if
   short. **Duel: the player going second channels 3 on their first turn.**
4. **Draw** (515.4) — draw 1 (Burn Out if empty, then still draw). No
   first-player skip in Duel (FFA only). **As the Draw Phase ends, every
   player's Rune Pool empties.**
5. **Action Phase** (516) — Neutral Open State; only the Turn Player has
   Priority. Discretionary Actions (589.1): play a card, Standard Move
   (not in a Closed State or Showdown), Hide, activate abilities.
6. **End of Turn** (517)
   - *Ending Step*: "At the end of turn" triggers; Stunned wears off.
   - *Expiration Step*: clear all damage; **all "this turn" effects
     expire**; **every player's Rune Pool empties**.
   - *Cleanup Step*: Cleanup; if that created new damage/"this turn"
     effects, go back to Expiration.
   - Next player in Turn Order becomes Turn Player. Per-turn state
     ("scored this turn", Legion's "played another card this turn") resets.

**Rune Pool empties exactly twice per turn** (~158-160): end of Draw Phase
and end of Expiration Step — for *all* players. Energy carries across the
whole Action Phase (Chains, Showdowns, Combats).

## Setup (~112-121, Duel ~643)

Turn order random; each player draws 4; mulligan up to 2 (draw that many,
recycle the set-aside cards to the bottom); First Player takes the first
turn. No runes start on the board. Duel: Victory Score 8, 2 battlefields
(each player picks 1 of their 3).

## States, Priority, Focus (507-513)

- **Neutral / Showdown** × **Open / Closed** (Closed = a Chain exists).
- Neutral Open: anything legal, Turn Player only. Showdown Open: only
  Action/Reaction cards & abilities. Closed (either): only Reaction.
- Priority: Turn Player in Neutral Open on their Action Phase; whoever
  gains Focus in a Showdown; in a Closed State, the controller of the
  newest Chain item, then the next Relevant Player as others pass.
- Focus (513) only exists in Showdowns; gaining Focus grants Priority;
  passing Priority keeps Focus.
- No Priority during Start/End of Turn except via trigger Chains.

## The Chain (532-544)

*Modeled in `chain.ts` (spells, Priority, passing, LIFO resolution,
Cleanup after each item, illegal-target handling). Not modeled: triggered
abilities joining the Chain, Showdowns/Focus.*

Playing a card/ability creates the Chain (one at a time). **A permanent
(Unit/Gear) that starts a Chain resolves immediately — no response window**
(538). Otherwise Relevant Players alternate adding Reactions or passing;
when all pass in sequence the newest item resolves (LIFO), **then a
Cleanup**, then everyone must pass again. Add abilities (rune taps) resolve
immediately and can't be reacted to (605).

Timing keywords: **Action** (718) = playable in Showdowns on any turn;
**Reaction** (725) = also in Closed States on any turn. Neither lifts the
"Units only to your base or a battlefield you control" restriction (that
text lives in the 718/725 examples — **not** rule 719, which is Assault).

## Cleanup (518-526)

Happens after: each Chain item resolves, each Move, each Showdown, each
Combat, and the End-of-Turn Cleanup Step. Steps:

1. Kill units with damage ≥ Might (to owner's Trash).
2. Clear Attacker/Defender status from units no longer in a fight.
3. Start state-based ("While…"/"As long as…") effects.
4. Trash Hidden cards at battlefields where their controller has no unit.
5. Mark Combat **Pending** wherever two opposing players have units.
6. If Neutral Open and a battlefield is Contested with **no** controller →
   Turn Player picks one, a **Showdown** (no Combat) begins.
7. Else if Neutral Open and Combat is Pending → Turn Player picks one,
   **Combat** begins.

## Showdowns and Combat

- **Contested** (~181): applied when a unit of a non-controller arrives.
  Controller keeps Control while contested. **"If a player has no Units at
  a Battlefield, they have no Control."**
- **Non-combat Showdown** (moving into an empty, uncontrolled battlefield):
  mover gets Focus; all players Relevant; ends when all pass in a row;
  then Control (and so Conquer) follows. *Exact moment unspecified.*
- **Combat** (620-628): occurs on a Cleanup with an empty Chain and two
  opposing players' units at one battlefield.
  1. Showdown Step — Attacker = whoever applied Contested; "When I attack/
     defend" triggers; Attacker gets Focus; Action/Reaction exchanges.
  2. Damage Step — both sides sum Might; Attacker assigns first; Tank first;
     lethal before spreading.
  3. Resolution — kill lethal; both sides remain → recall attackers; only
     attackers remain → **Conquer** (Control changes, Conquer Score, Conquer
     triggers). Clear Contested and **all damage everywhere**.
  4. Cleanup.

## Scoring (629-633)

- Conquer: gain Control of a battlefield you haven't Scored this turn.
- Hold: control one during your Beginning Phase (Scoring Step).
- Once per battlefield per player per turn (631).
- Final Point: Hold always grants it; Conquer only if you've Scored every
  battlefield this turn, otherwise draw a card instead.
- Win immediately on reaching Victory Score — any source, incl. an
  opponent's Burn Out.

## Timing-dependent keywords

- **Accelerate** (717): pay +1 Energy +1 Power (unit's domain) → enters Ready.
- **Hidden** (723): hide for [C] at a battlefield you control; playable
  for free with Reaction timing starting the *next* turn.
- **Legion** (724): needs a per-player "cards played this turn" count.
- **Temporary** (728): dies at start of its controller's Beginning Phase.

## Open ambiguities

1. Non-combat Showdown: exactly when Control/Conquer happens.
2. "Ready Step"/"Draw Step of the Beginning Phase" wording in the Ready/Draw
   definitions is stale vs. 515's phase list — 515 taken as authoritative.
3. Activated abilities "only on the Controlling Player's Turn" vs.
   Action/Reaction's "any player's turn" — keywords assumed to override.
4. Whether basic rune taps (no Reaction tag) are usable in a Closed State.
5. Whether the Legend readies in Awaken (probably).
6. Whether the Conquer-at-match-point "draw instead" still uses up that
   battlefield's once-per-turn Score (probably yes; the engine assumes so).
