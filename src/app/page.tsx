import Link from "next/link";
import Card from "@/components/Cards";
import { LEGENDS, scenariosForLegend } from "@/scenarios";
import styles from "./home.module.css";

// How many "coming soon" slots to show after the playable Legends, so the
// picker reads as a roster that's still filling up.
const COMING_SOON_SLOTS = 3;

export default function Home() {
  return (
    <main className={styles.home}>
      <section className={styles.hero}>
        <span className={styles.kicker}>Riftbound Simulator</span>
        <h1>Choose your Legend</h1>
        <p>
          Every Legend plays differently. Pick one, then work through its trials — single-turn puzzles where you have
          to find the line that wins. Beginner trials teach the basics; Expert ones will make you sweat.
        </p>
        <div className={styles.divider} aria-hidden>
          <span />◆<span />
        </div>
      </section>

      <ul className={styles.roster}>
        {LEGENDS.map((legend) => {
          const trials = scenariosForLegend(legend.id).length;
          return (
            <li key={legend.id}>
              <Link href={`/legends/${legend.id}`} className={styles.legend}>
                <div className={styles.portrait}>
                  <Card cardId={legend.cardId} />
                </div>
                <div className={styles.nameplate}>
                  <span className={styles.champion}>{legend.champion}</span>
                  <span className={styles.title}>{legend.title}</span>
                  <span className={styles.domains}>
                    {legend.domains.map((d) => (
                      <span key={d} data-domain={d}>
                        {d}
                      </span>
                    ))}
                  </span>
                  <span className={styles.trialCount}>
                    {trials} {trials === 1 ? "trial" : "trials"} →
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
        {Array.from({ length: COMING_SOON_SLOTS }).map((_, i) => (
          <li key={`soon-${i}`}>
            <div className={styles.legend} data-soon="true" aria-label="More Legends coming soon">
              <div className={styles.portrait}>
                <div className={styles.cardBack}>
                  <span>?</span>
                </div>
              </div>
              <div className={styles.nameplate}>
                <span className={styles.champion}>Coming soon</span>
                <span className={styles.title}>More Legends on the way</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
