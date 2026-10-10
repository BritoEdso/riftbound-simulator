# Irelia cards — transcription notes

Transcribed 2026-10-10 from Riot's official card gallery
(https://playriftbound.com/en-us/card-gallery/), read from the page's
embedded card data rather than the card images. No other source used.
Gallery icon tokens: `:rb_might:` = Might, `:rb_rune_rainbow:` = [C] (1 Power
of any domain in the deck's identity), `:rb_energy_1:` = 1 Energy.

**Power domain caveat:** the gallery gives Power cost only as a number; the
domain is inferred from the card's own domain, not confirmed.

| Card | Id(s) | Type | Domain | Energy / Power | Might | Text |
|---|---|---|---|---|---|---|
| Blade Dancer | SFD-195 (base, Rare); SFD-246 Showcase alt-art — same text | Champion Legend, tag Irelia | Calm + Chaos | — | — | When you choose a friendly unit, you may exhaust me and pay [C] to ready it. When you conquer, you may pay 1 Energy to ready me. |
| Irelia, Fervent | SFD-057 (base, Epic); SFD-057a, SFD-225, SFD-225* Showcase; reprint VEN-174 (Showcase, reminder text omitted) | Champion Unit, tags Irelia, Ionia; [Deflect] | Calm | 5 / — | 4 | [Deflect] (Opponents must pay [C] to choose me with a spell or ability.) When you choose or ready me, give me +1 Might this turn. |
| Irelia, Graceful | SFD-141 (base, Rare); SFD-141a Showcase | Champion Unit, tags Irelia, Ionia | Chaos | 4 / 1 (Chaos?) | 4 | Your spells that choose me cost 1 Energy or [C] less. |
| Defiant Dance | SFD-196 (Epic) | Signature Spell, tag Irelia; [Reaction] | Calm + Chaos | 1 / 1 (domain unspecified) | — | [Reaction] (Play any time, even before spells and abilities resolve.) Give a unit +2 Might this turn and another unit -2 Might this turn. |

Base-printing art (gallery image CDN, 744×1039, not yet downloaded):

- SFD-195 Blade Dancer: `…/656ef2d1724b818e9e737ec5dcce923de067a316-744x1039.png`
- SFD-057 Irelia, Fervent: `…/fe05fa55781f8036f8bfc9c10bba94326a0c8cc9-744x1039.png`
- SFD-141 Irelia, Graceful: `…/03b9d73a7ef02447d7f4b67381a76616249061cc-744x1039.png`
- SFD-196 Defiant Dance: `…/6f5bc5c9e321830337998a2b85e4fec3cd8251c9-744x1039.png`
- (SFD-246 Blade Dancer Showcase: `…/8258072391bbb8d24e9d6e603c3ba1434979a911-744x1039.png`)

Prefix: `https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/`,
suffix `?accountingTag=RB`.

## Rules dependencies

- **"Choose" = target** (rules ~557/559.3.c): a spell or ability that names a
  specific unit chooses it; "kill all units" does not. Choices are made as the
  spell is played, so "When you choose" triggers fire on play and — the Chain
  being LIFO — resolve before the spell itself.
- **Blade Dancer:** the Legend sits in the Legend Zone (103.1.b.2, 107, 134)
  and can be Ready or Exhausted. Ability 1: an optional triggered ability with
  a cost (exhaust the Legend + 1 Power of any domain), firing whenever a spell
  or ability you control chooses a friendly unit; readies that unit. Ability
  2: a Conquer trigger (635) with an optional 1 Energy cost that readies the
  Legend. Conquer "by any means" (630.1) includes a non-combat Showdown.
- **Irelia, Fervent:** [Deflect] = Deflect 1 (721) — opponents' spells and
  abilities that choose her cost 1 more Power of any domain (a Mandatory
  Additional Cost). The +1 Might trigger fires separately on "you choose me"
  and on "you ready me", so a chosen-and-readied Irelia gets +2.
- **Irelia, Graceful:** a target-dependent cost reduction — the cost is known
  only after targets are chosen.
- **Defiant Dance:** two targets (a unit, and *another* unit). The -2 has no
  "minimum 1" floor, unlike Ahri's cards.

## Open questions (from the transcription pass)

1. When Blade Dancer's "you may exhaust me and pay [C]" is paid — as the
   trigger goes on the Chain, or on resolution?
2. Does "When you choose a friendly unit" fire once per friendly target
   (Defiant Dance can choose two)? Do triggered abilities' choices count?
3. Does Awaken's readying trigger Fervent's "When you ready me"?
4. Does a match-point Conquer that only draws (rule 632) still count as
   "When you conquer"?
5. Negative Might from an unfloored -2 — the engine doesn't handle it yet.
6. Deckbuilding: Irelia's identity is Calm + Chaos; Discipline (Calm) fits,
   Retreat (Mind) doesn't.

## Draft trials (scenario-designer + rules-checker, 2026-10-10)

Three drafts, all rules-checked against the core rules. **None can ship yet**:
every one needs Irelia engine work (below). Ranked by how little they need.

1. **"Second Wind" (Beginner) — SOUND.** p1 at 7 (Held B this turn, a
   2-Might unit there). Irelia, Fervent at base *Exhausted* (played this
   turn), Blade Dancer Ready, Discipline in hand, 3 Calm runes. p2 holds A
   with a 5-Might unit, empty hand. Line: Discipline choosing Irelia → Blade
   Dancer (exhaust + [C]) readies her → Fervent +1 (chosen) +1 (readied),
   Discipline +2 → 8 Might → attack A → Conquer → Final Point.
2. **"Dance Card" (Intermediate) — SOUND.** As above but Blade Dancer starts
   Exhausted ("used earlier this turn") and B is empty: take B first (the
   match-point Conquer only draws, but **still counts as "When you
   conquer"** — rule ~635), pay 1 Energy to ready Blade Dancer, then
   Discipline + Blade Dancer on Irelia, attack A.
3. **"Defiant to the End" (Advanced) — SOUND WITH FIXES.** Irelia Ready at
   base, Blade Dancer Ready, Defiant Dance in hand; p2 holds A with a 6-Might
   unit **and Hextech Ray** (pays Ray + Deflect via tap-then-recycle). Line:
   attack A, Defiant Dance (+2 Irelia / -2 defender), Blade Dancer readies
   Irelia (+1 +1) → 8 Might survives Ray (3) + combat (4). Fixes: give p1 one
   Calm + one **Chaos** rune (Dance's Power domain is unconfirmed), and state
   Irelia was already Ready at the start of the turn (otherwise Awaken's
   "ready" gives Fervent +1 and the key wrong line also wins).

Rules answers from the check: a triggered ability's optional cost — not
settled by the text (pay on resolution recommended; no draft depends on it);
"When you choose a friendly unit" fires **once per friendly target**; Awaken
**probably does** count as "you ready me"; Calm Power pays [C] in a
Calm + Chaos deck; Deflect makes the opponent's Ray cost 1 Energy + 2 Power.

**Engine work Irelia needs:** a Legend zone (Ready/Exhausted, readied in
Awaken); triggers "when you choose a friendly unit", "when you conquer"
(incl. the draw-only Conquer), "when you choose me", "when you ready me";
optional trigger costs (exhaust the source + pay [C]/Energy, or decline);
a `readyUnit` primitive; Deflect (mandatory extra Power on opponents'
targeting); [C] Power in `cost.ts` (it currently throws on Universal);
two-target spells (Defiant Dance); CardDefinitions for Blade Dancer,
Irelia Fervent, Defiant Dance.
