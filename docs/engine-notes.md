# Engine notes

Detailed rule-by-rule mapping of what's encoded in `src/rules-engine/` and
where. Pulled out of `CLAUDE.md` to keep that file lean (it's re-read in
full on every change); read this one when you're actually touching a
specific mechanic, not as general orientation — `CLAUDE.md`'s Architecture
section is the map for that.

Official rules PDF: https://static.dotgg.gg/media/sites/67/2025/06/Riftbound-Core-Rules-2025-06-02.pdf
A text extraction is checked in at `docs/rules/riftbound-core-rules-2025-06-02.txt`
(greppable; the PDF itself isn't tracked — 24MB, not worth it in git history).

Key facts already encoded in `src/rules-engine/`:

- **Standard Move / Contested status** (rules 140-141, 181): `movement.ts`'s
  `moveUnit(state, unitInstanceId, destination)` moves a Unit between its
  controller's base and a battlefield, exhausting it as the cost (rule
  140.4 — throws if the unit isn't Ready). Moving into a battlefield you
  don't control sets `Battlefield.contested = true` and re-derives
  `combatRole` for *every* unit there on both sides: the mover's side
  becomes Attacker, the other becomes Defender (rule 181.2/626.1.d — the
  Attacker is whoever just applied Contested status). Moving into an
  uncontrolled, empty battlefield Contests it with no combat roles, and a
  non-combat Showdown (rule 548.2, `showdown.ts`) settles Control once it
  ends. `moveUnits` moves a group sharing one destination (rule ~596).
  Battlefield-to-battlefield movement only exists via the Ganking keyword
  (rule 722), which no `CardDefinition` has, so it throws; the "can't move to a battlefield with 2 other players
  already present" restriction (141.2.a.1) is a 3+-player rule that never
  applies in this 1v1-only project.
- **Combat** (rules 620-632): attacker sums Might, defender sums Might; each
  side assigns their total as damage to the other's units (Tank units must
  receive lethal damage first, and a unit must be assigned lethal damage in
  full before spreading to another). Units with damage ≥ Might die via
  `cleanup.ts`'s `cleanupLethalUnits` (see CLAUDE.md's Architecture section) — placed in
  their owner's `PlayerState.trash` (rule 524.1/525) when their `cardId` is
  a real registered `CardDefinition`. If the defender is wiped and attacker(s)
  survive → **Conquer** (attacker takes control). If both sides have
  survivors → attacker is **Recalled** to base, no conquer. Damage clears
  from *all* units (not just the battlefield in question) after any combat
  resolves.
- **Scoring** (rules 629-637): score via **Conquer** (take a battlefield you
  didn't already control) or **Hold** (control it at the start of your turn);
  once per battlefield per player per turn. Standard 1v1 **Victory Score is
  8**. Reaching your *final* point via Conquer only wins immediately if
  you've also Scored every other battlefield that turn — otherwise you draw a
  card instead and the game continues. A Hold always wins outright at match
  point. **Scoring is not a player-chosen `Action`** — `solver.ts` used to
  offer a free `score` Action (Hold *or* Conquer) for any controlled
  battlefield at any time, which let `canWin` report false wins (e.g. 7
  points + an already-controlled battlefield "won" instantly via Hold).
  Now Conquer Scores automatically inside the mechanics themselves whenever
  Control is *gained* — `resolveCombat` (exposed as `CombatResult.score`)
  and the end of a non-combat Showdown at an uncontrolled battlefield
  (`showdown.ts`) — so any caller gets it, not just the solver. Control
  is also *lost* when a player has no Units left at a battlefield
  (`cleanup.ts`'s `performCleanup`), so a mutual wipe or an abandoned
  battlefield is uncontrolled and can't be Held next turn. `canWin` treats
  an opponent reaching Victory Score (e.g. via a Burn Out the line caused)
  as a dead line. Hold is never
  offered, since it only happens in the Beginning Phase and the solver
  searches a single Action Phase. `score(..., 'hold')` stays in
  `scoring.ts`; `turn.ts`'s `holdBattlefields` is its one caller.
- **Drawing / Burn Out** (rules 516.2.b, 607, 609): `PlayerState.deck` is an
  ordered array — index 0 is the top. `draw(state, playerId, count)` in
  `deck.ts` moves cards from deck to hand, one at a time — if the deck is
  empty at any individual draw within that `count`, it Burns Out first
  (`burnOut`, also exported): shuffle `trash` into `deck` (modeled as a
  plain append, not a real randomized shuffle — nothing inspects deck order
  beyond "the top card," so randomness here would only add nondeterminism
  the solver has no use for) and give the opponent 1 point, *then* attempt
  the draw. If `trash` is also empty, the draw just does nothing, but the
  opponent still got the point (rule 609: repeated empty-deck draws hand the
  opponent the game via points, not a deckout condition). "Chooses an
  opponent" (607.3.b) has no real choice in this 1v1-only project — `draw`
  derives the one other id directly. Used by Discipline's "Draw 1"
  (`effects.ts`) and `scoring.ts`'s Conquer-at-match-point-without-a-fully-
  scored-board case.
- **Channeling** (rule 606): `PlayerState.runeDeck` is an ordered `Domain[]`
  (index 0 = next channeled); `PlayerState.runesInPlay` holds the
  `RuneInPlay[]` already on the board, each individually Ready or Exhausted.
  `channel(state, playerId, count, ready)` in `rune.ts` moves runes from deck
  to board — mirrors `draw()`'s shape, including channeling fewer than
  requested instead of throwing if the Rune Deck runs low (rule 515.4.b.2).
  Used by Retreat's "channels 1 rune exhausted" (`effects.ts`). Rule
  154.2.b caps a Rune Deck at exactly 12 cards total, so `runeDeck.length +
  runesInPlay.length` should never exceed 12.
- **Multi-unit damage assignment** (rule 627): `assignDamage` in `combat.ts`
  takes an optional `preferredOrder` (instanceIds) — the assigning player's
  choice of priority *within* a tier of equal-priority targets. It can't
  override mandatory Tank-first priority (rule 727.1.c), only break ties
  among targets already at the same priority; omitting it reproduces the old
  deterministic array-order default. `resolveCombat`'s `DamageOrders`
  (`attackerDamageOrder`/`defenderDamageOrder`) exposes this per side;
  `solver.ts`'s `legalActions()` generates one `resolveCombat` Action per
  permutation of each side's order when that side has 2+ units (just one
  when it doesn't, so the existing 1v1 tests are unaffected). Note: because
  `assignDamage` never wastes damage, whether a group is *fully wiped* is
  mathematically order-independent in this engine — the choice only changes
  *which specific units* survive a partial kill, which nothing downstream
  currently branches on, so this can't yet change a `canWin` verdict. It's
  modeled for rules-accuracy and because a future effect keyed to a specific
  surviving unit will need it.
- **Rune Pool / costs** (rules 156-162, 740): a Basic Rune has two
  abilities. `rune.ts`'s `exhaustRuneForEnergy` is `[T]: Add [1]` (Exhaust a
  Ready rune → +1 domain-less Energy, `PlayerState.energyPool`).
  `recycleRuneForPower` is `Recycle this: Add [C]` (return the rune to the
  *bottom* of the Rune Deck via rule 594 Recycle → +1 Power of its own
  domain, `PlayerState.powerPool`, shape shared with `CardDefinition`'s
  `powerCost` as the `PowerPool` type in `types.ts`). `cost.ts` gates/pays
  both halves of a card's cost: `canAffordEnergyCost`/`payEnergyCost`
  (straightforward pool comparison), `canAffordPowerCost`/`payPowerCost`
  (per rule 159.1, a Domain-specific Power cost draws its own Domain's pool
  first, then Universal Power covers the shortfall — summed across every
  Domain named in the cost against one shared Universal pool), and the
  combined `canAffordCost`/`payCost` (rule 740: Energy and Power paid "in
  total"), which is what `solver.ts` actually calls. `exhaustRuneForEnergy`
  and `recycleRuneForPower` are both offered as their own `Action`s so
  `canWin` can discover it needs to generate Energy/Power before it can
  afford a card. **Recycling a Ready rune taps it first**: the solver's
  `recycleRuneForPower` Action exhausts a Ready rune for its Energy before
  recycling it (1 Energy + 1 Power), since the tap is a free Add ability
  (rule 605) and recycling removes the rune — skipping it only threw
  Energy away and produced fake dead ends in trials (user-reported).
  `rune.ts`'s `recycleRuneForPower` itself stays rules-exact (Power only).
  The trial UI calls the pools **Floating Energy / Floating Power**: they
  persist for the whole turn. **Both halves now provably change `canWin` verdicts on
  their own** — Energy via `solver.test.ts`'s "Energy costs gate playing a
  card" (Discipline), Power via its "Power costs gate playing a card too"
  (Hextech Ray, OGN-009: Energy 1 + Power 1 Fury, "Deal 3 to a unit at a
  battlefield" — kills a Might-3 blocker outright before combat, letting a
  too-weak-to-win-honestly attacker conquer unopposed). Non-obvious finding
  from building that scenario, confirmed in a test: **a single Rune covers
  *both* halves** — Exhaust it for Energy, then Recycle the same
  now-Exhausted Rune for Power, since Recycle doesn't require Ready (rule
  594 isn't an Exhaust action). **A `'Universal'` entry *in a cost itself***
  (as opposed to in a pool) is explicitly unmodeled — `cost.ts` throws
  rather than guess, since no rule text shows a cost phrased that way and no
  `CardDefinition` has one. `playUnit`'s own Energy/Power payment (see
  CLAUDE.md's Architecture section) can't surface inside a *same-turn*
  winning line — a played unit enters Exhausted (rule 139.4) — but
  `turn.test.ts` proves it across turns: play Magma Wurm, `passTurn` twice,
  Awaken readies it, and `canWin` finds the attack. The Rune Pool empties
  at the end of each Draw Phase and each turn, for every player
  (`turn.ts`; see `docs/turn-structure.md`).

- **Solver performance:** `canWin` caches every position (serialized
  `GameState`) it has proven *not* to win, for the rest of that call. The
  same position is reached by many move orders (tap rune A then B vs. B
  then A), and proving "no win" visits all of them — this took the
  Two Fronts "dead end" checks from ~13s to well under a second. Only
  losses are cached; a win returns at once, and its line is path-dependent.

- **Known gap — who assigns combat damage** (rule ~626.1.d.3: "Starting with
  the Attacker, each player distributes … among the other's Units"): the
  solver's single `resolveCombat` Action carries *both* sides' damage orders
  and is taken by one player, so the searcher also picks the defender's
  split — slightly overstating the searcher. No current trial depends on it
  (rules-checker, 2026-10-10); fix before a trial where the defender's split
  matters. Also a deliberate assumption: rune taps are allowed in Closed and
  Showdown states even though Basic Rune abilities have no Reaction tag
  (`docs/turn-structure.md` ambiguity #4) — trials teach "tap early" to
  sidestep it.
