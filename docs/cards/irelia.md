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
