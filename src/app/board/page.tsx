import styles from "./board.module.css";

const RUNE_POOL_CAP = 12;

function RunePool({ label }: { label: string }) {
  return (
    <div className={`${styles.zone} ${styles.zoneAccent}`}>
      <span className={styles.zoneLabel}>{label}</span>
      <div className={styles.runeSlots}>
        {Array.from({ length: RUNE_POOL_CAP }).map((_, i) => (
          <div key={i} className={styles.runeSlot} />
        ))}
      </div>
    </div>
  );
}

function Hand({ label, faceDown, count }: { label: string; faceDown: boolean; count: number }) {
  return (
    <div className={styles.zone}>
      <span className={styles.zoneLabel}>{label}</span>
      <div className={styles.cardRow}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={faceDown ? styles.cardBack : styles.cardFace} />
        ))}
      </div>
    </div>
  );
}

function Battlefield({ name }: { name: string }) {
  return (
    <div className={styles.battlefield}>
      <div className={`${styles.battlefieldUnits} ${styles.opponentSide}`}>
        <div className={styles.unitSlot} />
      </div>
      <div className={styles.battlefieldName}>{name}</div>
      <div className={`${styles.battlefieldUnits} ${styles.yourSide}`}>
        <div className={styles.unitSlot} />
      </div>
    </div>
  );
}

export default function BoardPage() {
  return (
    <div className={styles.board}>
      {/* Opponent — mirrored across the shared battlefields */}
      <div className={`${styles.zone} ${styles.oppTrash}`}>
        <span className={styles.zoneLabel}>Trash</span>
      </div>
      <div className={`${styles.zone} ${styles.oppDeck}`}>
        <span className={styles.zoneLabel}>Deck</span>
      </div>
      <div className={styles.oppHand}>
        <Hand label="Hand — face-down" faceDown count={7} />
      </div>

      <div className={styles.oppRuneDeck}>
        <div className={styles.zone}>
          <span className={styles.zoneLabel}>Rune Deck</span>
        </div>
      </div>
      <div className={styles.oppRunePool}>
        <RunePool label="Rune Pool — 12 max in play" />
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

      {/* Shared, contested middle */}
      <div className={styles.battlefieldA}>
        <Battlefield name="Battlefield A" />
      </div>
      <div className={styles.battlefieldB}>
        <Battlefield name="Battlefield B" />
      </div>

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
        <RunePool label="Rune Pool — 12 max in play" />
      </div>
      <div className={styles.youRuneDeck}>
        <div className={styles.zone}>
          <span className={styles.zoneLabel}>Rune Deck</span>
        </div>
      </div>

      <div className={styles.youHand}>
        <Hand label="Hand — face-up" faceDown={false} count={7} />
      </div>
      <div className={`${styles.zone} ${styles.youDeck}`}>
        <span className={styles.zoneLabel}>Deck</span>
      </div>
      <div className={`${styles.zone} ${styles.youTrash}`}>
        <span className={styles.zoneLabel}>Trash</span>
      </div>
    </div>
  );
}
