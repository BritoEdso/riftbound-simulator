import Card from "@/components/Cards";
import { CARD_IMAGES } from "@/components/cardImages";
import { Domain, RuneInPlay, UnitInPlay } from "@/rules-engine/types";
import styles from "./board.module.css";
import { OPPONENT_PLAYER_ID, SAMPLE_GAME_STATE, YOU_PLAYER_ID } from "./sampleGameState";

// Rule 154.2.b: exactly 12 Rune cards chosen at deck construction, so this
// is the most that could ever be simultaneously channeled onto the board.
const RUNE_POOL_CAP = 12;

const DOMAIN_COLOR: Record<Domain, string> = {
  Fury: "#c0504d",
  Calm: "#4d8fc0",
  Mind: "#8f4dc0",
  Body: "#4dc07a",
  Chaos: "#c0824d",
  Order: "#c0b84d",
};

function RunePool({
  label,
  runes,
  energyPool,
  powerPool,
}: {
  label: string;
  runes: RuneInPlay[];
  energyPool: number;
  powerPool: Partial<Record<Domain | "Universal", number>>;
}) {
  const powerEntries = Object.entries(powerPool).filter(([, amount]) => (amount ?? 0) > 0);
  return (
    <div className={`${styles.zone} ${styles.zoneAccent}`}>
      <span className={styles.zoneLabel}>
        {label} ({runes.length}/{RUNE_POOL_CAP})
      </span>
      <div className={styles.runeSlots}>
        {Array.from({ length: RUNE_POOL_CAP }).map((_, i) => {
          const rune = runes[i];
          return (
            <div
              key={i}
              className={`${styles.runeSlot} ${rune && !rune.ready ? styles.runeExhausted : ""}`}
              style={rune ? { background: DOMAIN_COLOR[rune.domain], borderColor: DOMAIN_COLOR[rune.domain] } : undefined}
              title={rune ? `${rune.domain} — ${rune.ready ? "ready" : "exhausted"}` : "not yet channeled"}
            />
          );
        })}
      </div>
      {/* Rule 158: the Rune Pool itself — Energy/Power available to pay
          costs, produced by exhausting/Recycling the runes above. */}
      <span className={styles.poolSummary}>
        {energyPool} Energy
        {powerEntries.length > 0 &&
          " · " + powerEntries.map(([domain, amount]) => `${amount} ${domain} Power`).join(", ")}
      </span>
    </div>
  );
}

function OpponentHand({ label, count }: { label: string; count: number }) {
  return (
    <div className={styles.zone}>
      <span className={styles.zoneLabel}>
        {label} ({count})
      </span>
      <div className={styles.cardRow}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={styles.cardBack} />
        ))}
      </div>
    </div>
  );
}

function YourHand({ label, cardIds }: { label: string; cardIds: string[] }) {
  return (
    <div className={styles.zone}>
      <span className={styles.zoneLabel}>
        {label} ({cardIds.length})
      </span>
      <div className={styles.cardRow}>
        {cardIds.map((cardId, i) =>
          CARD_IMAGES[cardId] ? (
            <div key={`${cardId}-${i}`} className={styles.handCard}>
              <Card cardId={cardId} />
            </div>
          ) : (
            <div key={`${cardId}-${i}`} className={styles.cardFace} />
          ),
        )}
      </div>
    </div>
  );
}

function DeckCount({ label, count }: { label: string; count: number }) {
  return (
    <div className={styles.zone}>
      <span className={styles.zoneLabel}>{label}</span>
      <span className={styles.deckCount}>{count}</span>
    </div>
  );
}

function UnitToken({ unit }: { unit: UnitInPlay }) {
  return (
    <div className={styles.unitSlot} title={unit.cardId}>
      <span className={styles.unitMight}>
        {unit.might}
        {unit.damage > 0 && <span className={styles.unitDamage}>−{unit.damage}</span>}
      </span>
      {unit.keywords.length > 0 && <span className={styles.unitKeywords}>{unit.keywords.join(", ")}</span>}
    </div>
  );
}

function Battlefield({
  name,
  controller,
  contested,
  opponentUnits,
  yourUnits,
}: {
  name: string;
  controller: string | null;
  contested: boolean;
  opponentUnits: UnitInPlay[];
  yourUnits: UnitInPlay[];
}) {
  const controlledByYou = controller === YOU_PLAYER_ID;
  return (
    <div className={styles.battlefield}>
      <div className={`${styles.battlefieldUnits} ${styles.opponentSide}`}>
        {opponentUnits.map((u) => (
          <UnitToken key={u.instanceId} unit={u} />
        ))}
      </div>
      <div className={styles.battlefieldName}>
        {name}
        {contested && <span className={styles.battlefieldTag}>contested</span>}
        {controller && (
          <span className={styles.battlefieldTag}>{controlledByYou ? "you control" : "opponent controls"}</span>
        )}
      </div>
      <div className={`${styles.battlefieldUnits} ${styles.yourSide}`}>
        {yourUnits.map((u) => (
          <UnitToken key={u.instanceId} unit={u} />
        ))}
      </div>
    </div>
  );
}

export default function BoardPage() {
  const state = SAMPLE_GAME_STATE;
  const you = state.players[YOU_PLAYER_ID];
  const opponent = state.players[OPPONENT_PLAYER_ID];
  const [bfA, bfB] = state.battlefields;

  const unitsAt = (battlefieldId: string, controller: string) =>
    state.units.filter((u) => u.location === battlefieldId && u.controller === controller);

  return (
    <div className={styles.board}>
      {/* Opponent — mirrored across the shared battlefields */}
      <div className={`${styles.zone} ${styles.oppTrash}`}>
        <span className={styles.zoneLabel}>Trash</span>
      </div>
      <div className={styles.oppDeck}>
        <DeckCount label="Deck" count={opponent.deck.length} />
      </div>
      <div className={styles.oppHand}>
        <OpponentHand label="Hand — face-down" count={opponent.hand.length} />
      </div>

      <div className={styles.oppRuneDeck}>
        <DeckCount label="Rune Deck" count={opponent.runeDeck.length} />
      </div>
      <div className={styles.oppRunePool}>
        <RunePool
          label="Rune Pool"
          runes={opponent.runesInPlay}
          energyPool={opponent.energyPool}
          powerPool={opponent.powerPool}
        />
      </div>

      <div className={`${styles.zone} ${styles.zoneAccent} ${styles.oppChampion}`}>
        <span className={styles.zoneLabel}>Chosen Champion</span>
      </div>
      <div className={`${styles.zone} ${styles.zoneAccent} ${styles.oppLegend}`}>
        <span className={styles.zoneLabel}>Legend</span>
      </div>
      <div className={`${styles.zone} ${styles.oppBase}`}>
        <span className={styles.zoneLabel}>Base</span>
      </div>

      {/* Shared, contested middle — driven by state.battlefields */}
      {bfA && (
        <div className={styles.battlefieldA}>
          <Battlefield
            name="Battlefield A"
            controller={bfA.controller}
            contested={bfA.contested}
            opponentUnits={unitsAt(bfA.id, OPPONENT_PLAYER_ID)}
            yourUnits={unitsAt(bfA.id, YOU_PLAYER_ID)}
          />
        </div>
      )}
      {bfB && (
        <div className={styles.battlefieldB}>
          <Battlefield
            name="Battlefield B"
            controller={bfB.controller}
            contested={bfB.contested}
            opponentUnits={unitsAt(bfB.id, OPPONENT_PLAYER_ID)}
            yourUnits={unitsAt(bfB.id, YOU_PLAYER_ID)}
          />
        </div>
      )}

      {/* You — exact mirror of the opponent block above */}
      <div className={`${styles.zone} ${styles.youBase}`}>
        <span className={styles.zoneLabel}>Base</span>
      </div>
      <div className={`${styles.zone} ${styles.zoneAccent} ${styles.youLegend}`}>
        <span className={styles.zoneLabel}>Legend</span>
      </div>
      <div className={`${styles.zone} ${styles.zoneAccent} ${styles.youChampion}`}>
        <span className={styles.zoneLabel}>Chosen Champion</span>
      </div>

      <div className={styles.youRunePool}>
        <RunePool
          label="Rune Pool"
          runes={you.runesInPlay}
          energyPool={you.energyPool}
          powerPool={you.powerPool}
        />
      </div>
      <div className={styles.youRuneDeck}>
        <DeckCount label="Rune Deck" count={you.runeDeck.length} />
      </div>

      <div className={styles.youHand}>
        <YourHand label="Hand — face-up" cardIds={you.hand.map((c) => c.id)} />
      </div>
      <div className={styles.youDeck}>
        <DeckCount label="Deck" count={you.deck.length} />
      </div>
      <div className={`${styles.zone} ${styles.youTrash}`}>
        <span className={styles.zoneLabel}>Trash</span>
      </div>
    </div>
  );
}
