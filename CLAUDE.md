# Riftbound Simulator

A scenario solver / simulator for **Riftbound**, the League of Legends TCG
(Riot Games / UVS Games, English release Oct 31, 2025). Given a board state,
hand, and points, it should answer "what can I do here, and does it win?" —
starting as a solver, with a visual drag-and-drop board (card PNGs) planned
as a later phase.

## Stack

- **Next.js (App Router) + TypeScript**, npm, Jest (`npm test`) with
  `ts-jest` (config: `tsconfig.jest.json` / `jest.config.js`).
- The rules engine (`src/rules-engine/`) is **plain TypeScript with no
  React/Next dependency** — it must stay independently testable in Node and
  reusable if the UI layer ever changes. Keep game logic out of components.
- `src/app/` is still the unmodified `create-next-app` scaffold (default
  page/logo/CSS) — the UI hasn't started consuming the rules engine yet. All
  real logic and tests currently live under `src/rules-engine/`.

## Commands

- `npm test` — run the Jest suite (all files matching `__tests__/**/*.test.ts`).
  - Single file: `npm test -- combat.test.ts` (or a path, e.g.
    `npm test -- src/rules-engine/__tests__/combat.test.ts`).
  - Single test by name: `npm test -- -t "name or describe block substring"`.
- `npm run lint` — ESLint (`eslint-config-next` core-web-vitals + typescript).
- `npm run dev` / `npm run build` / `npm run start` — Next.js dev server /
  production build / production server.
- `npx tsc --noEmit` — typecheck without emitting (the app itself builds with
  `noEmit: true`; the Jest config layers `tsconfig.jest.json` on top for
  CommonJS output during tests).

## Rules reference

Official rules PDF: https://static.dotgg.gg/media/sites/67/2025/06/Riftbound-Core-Rules-2025-06-02.pdf
A text extraction is checked in at `docs/rules/riftbound-core-rules-2025-06-02.txt`
(greppable; the PDF itself isn't tracked — 24MB, not worth it in git history).

Key facts already encoded in `src/rules-engine/`:

- **Combat** (rules 620-632): attacker sums Might, defender sums Might; each
  side assigns their total as damage to the other's units (Tank units must
  receive lethal damage first, and a unit must be assigned lethal damage in
  full before spreading to another). Units with damage ≥ Might die. If the
  defender is wiped and attacker(s) survive → **Conquer** (attacker takes
  control). If both sides have survivors → attacker is **Recalled** to base,
  no conquer. Damage clears from *all* units (not just the battlefield in
  question) after any combat resolves.
- **Scoring** (rules 629-637): score via **Conquer** (take a battlefield you
  didn't already control) or **Hold** (control it at the start of your turn);
  once per battlefield per player per turn. Standard 1v1 **Victory Score is
  8**. Reaching your *final* point via Conquer only wins immediately if
  you've also Scored every other battlefield that turn — otherwise you draw a
  card instead and the game continues. A Hold always wins outright at match
  point.
- **Drawing** (rule 516.2.b): `PlayerState.deck` is an ordered array — index 0
  is the top of the deck. `draw(state, playerId, count)` in `deck.ts` moves
  cards from deck to hand and returns what was drawn; `count` defaults to 1.
  Used by Discipline's "Draw 1" (`effects.ts`) and by `scoring.ts`'s
  Conquer-at-match-point-without-a-fully-scored-board case. Burning Out (rule
  607 — reshuffle trash into the deck when it's empty) isn't modeled: there's
  no `trash` zone in `GameState` yet, so drawing from an empty deck just
  draws as many cards as are available instead of throwing.
- Not modeled yet: rune pools/energy costs, multi-unit damage assignment as a
  player *choice* (current `assignDamage` in `combat.ts` uses a deterministic
  Tank-first/array-order default — fine for 1v1, will need real
  choice-modeling for the solver to explore options in bigger fights), and
  Burn Out (rule 607, see above).

## Card data

Card data source under evaluation: [Piltover Archive](https://piltoverarchive.com/cards)
is a comprehensive fan-run database (1,225+ cards, filterable), **not an
official Riot source** (built under Riot's "Legal Jibber Jabber" fan-content
policy per its own footer). Before bulk-importing card text/art from it,
check its Terms of Service — card art in particular may not be freely
redistributable into this project's own asset folder.

For now, cards are hand-entered as needed in `src/rules-engine/cards.ts`,
transcribed from the exact text on Piltover Archive card pages. Currently
defined: **Discipline** (OGN-058) and **Retreat** (OGN-104), the two cards
from the first scenario we solved.

## Conventions

- Card definitions (`CardDefinition`) are static/printed data; `UnitInPlay`
  is the mutable board instance referencing a `CardDefinition` by `cardId`.
- Card effects live in `src/rules-engine/effects.ts` as functions that mutate
  a `GameState` directly (no event/reducer system yet — add one if/when
  effects need to interact with the chain/priority system from the rules).
