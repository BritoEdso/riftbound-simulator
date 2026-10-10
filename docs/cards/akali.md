# Akali cards — transcription notes

Transcribed 2026-10-10 from Riot's official card gallery
(https://playriftbound.com/en-us/card-gallery/), read from the page's
embedded card data (`__NEXT_DATA__` → props.pageProps.page.blades[*].cards.items)
rather than the card images. No other source used. Sets: VEN = Vendetta,
RAD = Radiance — both postdate the 2025-06-02 core rules in docs/rules/, so
**Empower / Empowered / Flow are defined only by reminder text** (they're not
in the rules file).
Gallery icon tokens: `:rb_might:` = Might, `:rb_rune_rainbow:` = [C] (1 Power
of any domain in the deck's identity — Fury or Calm for Akali),
`:rb_rune_fury:` = 1 Fury Power, `:rb_energy_N:` = N Energy, `:rb_exhaust:` =
[T] ("Exhaust me", rule ~593.3).

**Power domain caveat:** the gallery gives a card's Power cost only as a
number; the domain below is inferred, not confirmed. Shuriken Flip is
Fury + Calm, so its 1 Power could be either.

| Card | Id(s) | Type | Domain | Energy / Power | Might | Text |
|---|---|---|---|---|---|---|
| Rogue Assassin | VEN-139 (base, Rare); VEN-189, VEN-189* Showcase | Champion Legend, tag Akali | Fury + Calm | — | — | [Empower] 3 Energy + [C] (3 Energy + [C]: Empower this. Use only if not Empowered.) [Action] — [T]: If it's your turn, move a friendly unit in a showdown to base and if I'm [Empowered], ready it. |
| Akali, Silent | VEN-038 (base, Rare); VEN-038a Showcase | Champion Unit, tags Ionia, Akali | Calm | 4 / 1 (Calm?) | 4 | I can't be chosen by enemy spells and abilities unless I'm in combat. When I move to a battlefield, give me +2 Might this turn. |
| Akali, Deadly Weapon | VEN-021 (base, Epic); VEN-021a Showcase | Champion Unit, tags Ionia, Akali | Fury | 3 / — | 3 | [Empower] 2 Energy + 1 Fury Power (…: Empower me. Use only if not Empowered.) When I move, you may deal 1 to a unit at a battlefield I moved to or from. If I'm [Empowered], deal 2 instead. [Empowered] — I have +1 Might. |
| Akali, Brash | RAD-015 (base, Rare); RAD-SP2 Showcase | Champion Unit, tags Ionia, Akali | Fury | 5 / 1 (Fury?) | 5 | The first time I move each turn, [Add] 1 Energy + [C]. The second time I move each turn, banish the top card of your Main Deck. Until your next Ending Phase, you may play that card. (You still pay its costs.) |
| Shuriken Flip | VEN-140 (Epic) | Signature Spell, tag Akali; no timing keyword | Fury + Calm | 1 / 1 (Fury or Calm?) | — | Deal 2 to up to one enemy unit at a battlefield, then move a friendly unit. [Flow] 3 Energy + [C] (You may play this from your trash for its Flow cost. Then banish it.) |

Base-printing art (gallery image CDN, 744×1039, not yet downloaded) —
prefix `https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/`,
suffix `?accountingTag=RB`:

- VEN-139 Rogue Assassin: `0d53b477ed43fb9bbed84858443a606b2b51a2b5-744x1039.png`
- VEN-038 Akali, Silent: `f1a4d73853194a3dde02c51b083d197af89d2bda-744x1039.png`
- VEN-021 Akali, Deadly Weapon: `564e5f35ae39b6604290e83f39ffb61c2b2b9175-744x1039.png`
- RAD-015 Akali, Brash: `20997ddaef2cd714c36e5473c156faf331b80b7b-744x1039.png`
- VEN-140 Shuriken Flip: `bac1ecff92d022e99a3696ad00d020530a1a09e7-744x1039.png`
- Showcase: VEN-189 `7b0ec31df147b40bbb83c40644252b48a7619593…`, VEN-189*
  `d8262e7b24f26d1c9a18b13166d009aaf573e059…`, VEN-038a
  `6924311aab46a74aa2c54030c053427725860ea8…`, VEN-021a
  `92d8ad4bc4724da89f32348f290600f632f24e9e…`, RAD-SP2
  `f19416576af7d609b525d72884ca42cf8795bf74…`

## Rules dependencies

- **Move vs Recall (~610-619):** any change of Board position is a Move unless
  it's a corrective Recall (~616). Spells/abilities can cause Moves (~615);
  "the source of the Move will provide details on any restrictions on
  legality for Destination" (~617). An effect Move is *not* a Standard Move
  (140): no Ready needed, doesn't exhaust. Moves don't use the Chain (~610)
  but trigger "When I move"; Recalls don't (~616). Cleanup follows every Move.
- **"This turn" Might survives moving to base** — base and battlefields are
  all Board positions; modifications persist until Expiration (517).
- **Choose = target (~557-559):** "can't be chosen by enemy spells and
  abilities" blocks targeting by any opponent spell/ability; an illegal
  target is unaffected on resolution (563.2.c).
- **Akali, Silent:** passive (567-574) conditional on being "in combat"
  (from when the Combat opens, ~620-625) + a triggered ability (582) on any
  Move *to a battlefield*. The trigger uses the Chain, so the Combat it would
  open waits — she is +2 *before* the Showdown Step.
- **Empower / Empowered:** per reminder text an activated ability ("cost:
  Empower me. Use only if not Empowered.") → ~576-583: uses the Chain; for a
  unit, Open State during your Action Phase, not during a Showdown. Duration
  of Empowered unknown.
- **Rogue Assassin:** Legend (can't be killed or moved; ~167-175). Second
  ability: activated, cost [T], [Action] (718) but limited by its text to
  your turn; not Reaction, so not in a Closed State. Effect: Move (not
  Recall) of a friendly unit in a Showdown to base, then ready it if
  Empowered.
- **Akali, Deadly Weapon:** "When I move" for any Move either direction;
  optional; target any unit at the origin or destination battlefield.
- **Akali, Brash:** per-unit "moves this turn" count; triggered [Add] (605);
  Banishment (603-604) with a play permission until your next Ending Phase.
- **Shuriken Flip:** no Action/Reaction → your own Neutral Open State only.
  "Up to one" = 0 or 1 targets. The move is an effect Move (~615).
  [Flow]: play from trash for 3 Energy + [C], then banish.
- **Deckbuilding:** identity Fury + Calm — Discipline (Calm) and Hextech Ray
  (Fury) fit; Retreat (Mind) doesn't.

## Engine gaps per card

| Card | Needs |
|---|---|
| Akali, Silent | CardDefinition; a central targeting restriction (`canBeChosenBy`) used by every `legalTargets` + resolution re-check; a `moveToBattlefield` trigger fired from `movement.ts`. **Smallest.** |
| Shuriken Flip | Two-part spell (optional enemy target + a friendly unit and destination); effect Moves (no Ready/exhaust, still fire move triggers + Contested); Power domain or [C]. Flow can wait. |
| Rogue Assassin | Legend zone (Ready, Empowered; readied in Awaken); activated abilities as Actions with timing; [C] costs (`cost.ts` throws on Universal); effect Move to base + `readyUnit`; defined behaviour for a Combat whose attackers all left. |
| Akali, Deadly Weapon | Empower as a unit activated ability; Empowered flag + passive +1 Might; optional "When I move" damage trigger. |
| Akali, Brash | Per-unit move count; triggered Add of Energy + [C]; Banishment zone + expiring play permission. **Most work.** |

## Draft trials (scenario-designer, 2026-10-10 — not yet rules-checked)

1. **"Shadow Step" (Beginner)** — Silent can't be targeted outside combat.
   p1 at 7, Held A this turn (2-Might unit there); B empty. p1 base: Akali,
   Silent (4) + a 3-Might unit; no hand/runes. p2 at 6 with Hextech Ray + 2
   Fury runes. Line: Akali → B (+2 → 6), non-combat Showdown; p2 can't choose
   her → Conquer B → Final Point. Wrong: send the 3-Might unit alone (Rayed).
   Engine: Silent's targeting restriction + move trigger only.
2. **"Flip the Odds" (Intermediate)** — Shuriken Flip kills a body *and* its
   move triggers Silent. p1 at 7, B Scored earlier (no unit there); only
   Akali, Silent at base; Flip in hand; Fury + Calm runes. p2 holds A with a
   2-Might and a 4-Might unit. Line: Flip — 2 damage to the 2-Might unit,
   move Akali to A → she's 6 vs 4 → Conquer. Wrong: walk in without Flip (6
   vs 6 trade); Flip the 4-Might unit (damage ≠ Might). Engine: + two-part
   spell, effect Moves.
3. **"Vanish and Return" (Advanced)** — Empower, escape, strike again. Rogue
   Assassin Ready; Akali, Silent at base; 2 Fury + 2 Calm runes; p2 holds A
   with a 4-Might unit + Hextech Ray. Line: Empower (Open State only) →
   attack A (6) → Legend escapes her to base, readied → attack again (+2
   again → 8) → survives Ray 3 + 4 → Conquer. Engine: + Legend zone,
   activated abilities, Empower, [C], effect Move to base, `readyUnit`, a
   Combat with no attackers left.
   Expert ideas: Deadly Weapon's "moved from" ping on escape; Brash's first
   move paying for Flip.

## Open questions

1. Shuriken Flip's move destinations (battlefield→battlefield without
   Ganking?).
2. How long does Empowered last?
3. A Combat whose attackers all leave mid-Showdown — ends with no Damage
   Step? Damage cleared?
4. Does Brash's triggered [Add] use the Chain?
5. Does "in combat" start when the Combat opens or when it's Pending?
6. Power-cost domains (see caveat).
