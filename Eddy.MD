# What's next for Edson

_Snapshot of where the Riftbound simulator stands, so you can jump straight
into coding next time you sit down — no research required._

## Where things are right now

- The rules engine (`src/rules-engine/`) has working **combat resolution**,
  **scoring**, **drawing** (`deck.ts` — `PlayerState.deck` + `draw()`), and
  two hand-entered **card effects** (Discipline, Retreat). Combat/scoring/
  effects are covered by `src/rules-engine/__tests__/combat.test.ts`; `draw()`
  has its own dedicated `deck.test.ts`.
- `src/app/` is still the untouched `create-next-app` scaffold — no UI work
  has started, and nothing wires the rules engine to a screen yet.
- Only 2 cards are transcribed into `cards.ts` (OGN-058 Discipline, OGN-104
  Retreat) — just enough for the first scenario that's been solved.
- `CLAUDE.md` / `AGENTS.md` are set up with the rules reference, card-data
  provenance notes, and dev commands.

## Next steps

### Rules engine gaps
_(These block the solver from handling anything beyond the current toy
scenario.)_

- [x] Model decks/drawing — `PlayerState.deck` + `draw()` in `deck.ts`, wired
      into Discipline's "Draw 1" and scoring's `drewCardInstead` case. Burn
      Out (rule 607, empty-deck reshuffle) is explicitly *not* modeled yet —
      no `trash` zone exists, so an empty deck just draws nothing instead of
      throwing. Revisit if a scenario needs a player to actually deck out.
- [ ] Model rune pools / energy costs — cards already carry `energyCost` /
      `powerCost`, but nothing spends or tracks them
- [ ] Replace the deterministic Tank-first damage assignment in `combat.ts`
      with real choice-modeling (only matters once a side has >1 unit — the
      solver needs to explore different assignments, not just one default)

### Card data
- [ ] Decide on a sourcing strategy: keep hand-entering cards as scenarios
      need them, or bulk-import from Piltover Archive (check their ToS first
      — see the note already in `CLAUDE.md`)
- [ ] Add more cards as new scenarios come up

### The actual solver (the core deliverable — doesn't exist yet)
- [ ] Design the "given board state + hand + points, what can I do here, and
      does it win?" search. Combat/scoring/effects are the primitives it
      will call, but there's no search/decision layer on top yet
- [ ] Decide the input format (how a "scenario" is described) and the output
      format (a move, a full line of play, a win/loss verdict)

### Testing
- [x] `deck.ts` has its own dedicated `deck.test.ts`.
- [ ] Add dedicated unit tests for `scoring.ts` and `effects.ts` — they're
      still only exercised indirectly through `combat.test.ts` (e.g.
      `applyRetreat` and the non-final-point scoring branches have no direct
      coverage yet)

### UI — later phase, lowest priority (per CLAUDE.md)
- [ ] Visual drag-and-drop board with card PNGs — `src/app/` is still
      default boilerplate, nothing started here

## When you're back

Pick a section based on what you want to unblock:
- Want to **solve more scenarios**? Start with **Rules engine gaps**, then
  **The actual solver** design.
- Want to **grow the card catalog**? Start with **Card data**.
- Want to **shore up what exists**? Start with **Testing**.

No coding was done for this file — it's just the map for next time.
