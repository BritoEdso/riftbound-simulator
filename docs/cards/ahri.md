# Ahri cards — transcription notes

Transcribed 2026-10-09 from Riot's official card gallery
(https://playriftbound.com/en-us/card-gallery/), read from the page's
embedded card data rather than the card images. No other source used.
Gallery icon tokens: `:rb_might:` = Might, `:rb_rune_rainbow:` = [C] (any
domain in the deck's identity), `:rb_energy_0:` = 0 Energy.

**Power domain caveat:** the gallery data gives Power cost only as a number;
the domain below is inferred from the card's own domain, not confirmed.

| Card | Id(s) | Type | Domain | Energy / Power | Might | Text |
|---|---|---|---|---|---|---|
| Nine-Tailed Fox | OGN-255 (base); OGN-303, OGN-303* Showcase alt-art — same text | Champion Legend, tag Ahri | Calm + Mind | — | — | When an enemy unit attacks a battlefield you control, give it -1 Might this turn, to a minimum of 1 Might. |
| Ahri, Alluring | OGN-066, OGN-066a | Champion Unit, tags Ahri, Ionia | Calm | 5 / 1 (Calm?) | 4 | When I hold, you score 1 point. |
| Ahri, Inquisitive | OGN-119, OGN-119a; reprints SFD-227, VEN-SP3 | Champion Unit, tags Ahri, Ionia | Mind | 3 / 1 (Mind?) | 3 | When I attack or defend, give an enemy unit here -2 Might this turn, to a minimum of 1 Might. |
| Ahri, Confident | RAD-038, RAD-SP1 (Radiance set) | Champion Unit, tags Ahri, Ionia; [Disarm] | Calm | 4 / 1 (Calm?) | 4 | [Disarm] (When I attack, give an enemy unit here -1 Might this turn.) When you reduce the Might of an enemy unit here by 1 or more, give me +1 Might this turn. |
| Fox-Fire | OGN-256 | Signature Spell, tag Ahri; [Hidden], [Action] | Calm + Mind | 3 / — | — | [Hidden] (Hide now for [C] to react with later for 0 Energy.) [Action] (Play on your turn or in showdowns.) Kill any number of units at a battlefield with total Might 4 or less. |

Note: `src/components/cardImages.ts` keys the Legend art as OGN-303 — that's
the Showcase printing; OGN-255 is the base card.

## Rules dependencies

- **Deckbuilding (103.2.b, 107.4-107.5):** the Chosen Champion is a Champion
  Unit matching the Legend's tag, starts in the Champion Zone, and is played
  from there at normal cost.
- **Nine-Tailed Fox:** a triggered ability (169.1, 582) — no Exhaust cost.
  Fires per enemy unit that attacks a battlefield you control (Attacker is
  set in the Combat's Showdown Step, ~625). Ambiguous: whether a non-combat
  Showdown counts as "attacks"; ordering vs. "When I attack" triggers on the
  Initial Chain (625.1.c).
- **Ahri, Inquisitive:** "When I attack or defend" → Initial Chain of the
  Combat's Showdown (551.1.a, 625.1.c-e); targets an enemy unit at the same
  battlefield. Stacks with Nine-Tailed Fox. Floor of 1 Might.
- **Ahri, Alluring:** a Hold trigger in the Beginning Phase's Scoring Step
  (515.2, 636.1). The extra point isn't a Conquer/Hold Score, so per 632 it
  likely isn't bound by the Final Point restriction (can win outright).
- **Ahri, Confident:** [Disarm] is a "When I attack" trigger (not in the
  2025-06-02 rules PDF; Radiance postdates it). Second ability triggers on
  any Might reduction of an enemy unit there that you cause.
- **Fox-Fire:** [Hidden] (723) — hide for [C] at a battlefield you control;
  from the next turn it gains [Reaction] and costs 0 Energy, targets must be
  at that battlefield; lost if you lose Control there (106.4.e). Effect:
  choose any units at one battlefield with total current Might ≤ 4; kill
  them. Probably can include friendly units (unrestricted text).
