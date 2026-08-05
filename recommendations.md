# Legend Recommendations: Kennen & Nasus

## Read this first — confidence level

Kennen and Nasus are Champion Legends from *Riftbound: Vendetta* (set code
`VEN`), officially releasing **July 31, 2026** (tomorrow, relative to when
this was written) — the cards are confirmed/revealed on Riot's own site,
but I could not pull raw card text directly from it.

- The official gallery (`playriftbound.com/en-us/card-gallery/`) renders
  card data client-side (JS), so a plain fetch only returns the page chrome
  (filters/sort controls), not the actual card entries. Fan mirrors
  (Piltover Archive, riftdecks.com, runeweave.com) all either blocked direct
  fetch (HTTP 403) or were similarly JS-rendered.
- What follows is instead **cross-referenced across multiple independent
  fan preview/deck-guide sites** (listed at the bottom). The Legend ability
  text for both cards is corroborated by 2-3 independent sources word-for-
  word, which is good signal — but it's still secondary-source, not a raw
  pull of the official card image/text.
- **Don't transcribe any of this into `src/rules-engine/cards.ts` yet.**
  Re-verify wording directly against the official gallery or Piltover
  Archive once you can view it in a browser (both are JS-rendered and
  blocked my fetch tool, but will work fine for a human), per the existing
  sourcing convention in `CLAUDE.md`.

---

## Kennen — Heart of the Tempest

**Domains:** Chaos + Order (purple/yellow) — consistent across sources.

**Legend ability (most-cited exact wording):**
> "When you play a card from anywhere other than your hand, empower me.
> Action: Disempower me by exhausting it. Give a unit Assault +2 this
> turn."

**The engine, mechanically:**
- **Flow** (new Vendetta spell keyword) lets you play a spell from your
  **trash** instead of your hand, for an alternate cost, then it's banished.
  Playing anything from outside your hand — Flow spells being the main way —
  triggers Kennen's "empower."
- Once empowered, you spend an action to exhaust Kennen and hand a unit
  **Assault +2** (bonus Might only while attacking) for the turn.
- **Burn** effects (cards/effects that mill or discard into the trash) feed
  Flow by stocking your trash with things to replay, so Burn → Flow →
  empower Kennen → Assault buff is the full loop.

**Most optimal way to use him, and why:**
- Build as an **engine/tempo deck, not a stats-first aggro deck.** The
  payoff isn't Kennen's own body — it's repeatable, free-ish combat buffs
  generated as a byproduct of your normal spell sequencing.
- Prioritize **card-quality-neutral ways to fill the trash early** (Burn
  effects, cheap Flow spells you're happy to "use twice") over raw stat
  sticks. The early turns exist to load the trash; the mid-late turns exist
  to cash it in.
- Because the Assault buff is granted to *a unit you choose*, this rewards
  boards with **one or two evasive/hard-to-block attackers** to concentrate
  the buff on, rather than spreading wide — a single unit repeatedly hitting
  as a bigger threat than its printed Might suggests is the payoff.
- Sequence Flow spells for **combat math, not raw value**: since Flow
  re-play banishes the card (no third use), save each Flow trigger for a
  turn where the resulting empower/Assault swing actually changes a combat
  outcome or pushes lethal, rather than firing it on the first available
  turn.

**Resolved conflict:** One source (skillshotzgaming) had described Kennen
as a **stun/control disruption** champion "locking down opponent's
threats." That's not wrong so much as describing a different card in the
same champion line: Vendetta also ships **Kennen, Keeper of Balance**, a
champion *unit* (not the Legend) with the Hidden keyword — "When you play
it or it attacks, you may pay 2 to Stun a unit (it doesn't deal combat
damage this turn). While there's a stunned enemy unit here, it has +2
Strength." That's a real card worth running alongside the Flow/Empower
Legend (a Stun effect is a great way to protect your buffed attacker from
retaliation), but it's a supporting piece, not the Legend's own identity.
The Legend ability text (Flow/Empower/Assault, above) is corroborated
word-for-word by 2+ independent sources.

---

## Nasus — Curator of the Sands

**Domains:** **Calm** (Shurima) — see confirmation note below.

**Legend ability (most-cited exact wording):**
> "When you play a unit, gear, or activated ability with Energy cost 7 or
> more, you may exhaust me to ready up to 2 runes."

**The engine, mechanically:**
- This is a **ramp/late-game value engine**, not a beatdown deck. Hitting
  the 7+ Energy threshold on a card **readies 2 runes**, effectively giving
  you extra resources to immediately chain into your *next* expensive play
  the same turn (or bank for next turn).
- The deck's whole identity is patience: survive cheaply, then let expensive
  cards pay for each other once the engine turns on.

**Most optimal way to use him, and why:**
- Build the curve **top-heavy on purpose** — include more 7+ Energy units/
  gear/activated abilities than a normal deck would, since each one is a
  live trigger for Nasus, not just a big stat line. A deck that "trims the
  expensive stuff" defeats the point of playing Nasus at all.
- Pack the early turns with **cheap, defensive/stabilizing plays** (blockers,
  removal, anything that buys time) — the early game's only job is to
  survive to the turn where 7+ Energy plays start coming down, not to
  develop a board.
- Because readying 2 runes lets you **chain a second big play the same
  turn**, sequence your expensive cards so the first 7+ cost play of the
  turn is the one that unlocks the second, rather than playing your single
  biggest card first for its own sake — the value is in the chain, not any
  one card.
- Expect to lose the early-game tempo race on purpose; the deck's win
  condition is out-scaling, not racing, so pair it with a plan to survive
  (blockers/removal) rather than contest the board early.

**Resolved conflict:** Earlier passes at this found two sources claiming
**Calm + Mind**, others claiming **Calm** only. Runeweave's database entry
independently describes Nasus as **"rival of Renekton,"** which matches
Vendetta's stated **Fury + Calm** rival domain pairing (Renekton = Fury) —
so single-domain **Calm** is the better-supported reading. The "Calm+Mind"
claims most likely came from conflating the Legend ("Curator of the Sands")
with a different card in the same champion line — Vendetta ships at least
three Nasus prints: **Curator of the Sands** (the Legend, above), **Guardian
of Knowledge** (a champion unit that readies a rune when it kills an enemy
unit, once per turn, no positive keywords, costs 1 Power), and **Ascended**
(a champion unit requiring 16 Energy + 1 Power to score an extra point on
Conquer — reviewed as weak, since it doesn't actually synergize with the
Legend's rune-readying effect).

---

## Sources consulted

- [Riftbound Kennen Champion Deck Guide (riftboundguide.com)](https://riftboundguide.com/2026/07/23/riftbound-kennen-champion-deck-guide/)
- [Riftbound Nasus Champion Deck Guide (riftboundguide.com)](https://riftboundguide.com/2026/07/23/riftbound-nasus-champion-deck-guide/)
- [How Does Flow Work in Riftbound? (riftboundguide.com)](https://riftboundguide.com/2026/07/09/how-does-flow-work-in-riftbound/)
- [Riftbound Vendetta Legends Guide — All 9 Champions Explained (skillshotzgaming.com)](https://skillshotzgaming.com/riftbound-vendetta-legends-guide/)
- [Riftbound Review: Nasus' Kit (riftbound.cardsrealm.com)](https://riftbound.cardsrealm.com/en-us/articles/riftbound-review-nasus-kit)
- [Vendetta — Riftbound Card Set database (runeweave.com)](https://www.runeweave.com/set/VEN)
- [Official Riftbound Card Gallery (playriftbound.com)](https://playriftbound.com/en-us/card-gallery/) —
  confirmed to exist and host the real card data, but renders client-side;
  my fetch tool only retrieved the filter/nav chrome, not card entries
- Web search results citing Kennen/Nasus exact ability text (TCGPlayer
  product listing, riftbound.gg coverage)

Piltover Archive (`piltoverarchive.com/cards`) and riftdecks.com both
returned HTTP 403 on direct fetch attempts — worth retrying manually in a
browser, since Piltover Archive is this project's preferred source per
`CLAUDE.md`, and both of these plus the official gallery above should have
the actual verbatim card text/images once opened by a human.
