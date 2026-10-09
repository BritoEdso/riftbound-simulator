import Link from "next/link";
import Card from "@/components/Cards";
import { scenariosByDifficulty } from "@/scenarios";
import styles from "./scenarios.module.css";

export const metadata = { title: "Trials · Riftbound Simulator" };

export default function ScenariosPage() {
  return (
    <main className={styles.listPage}>
      <div className={styles.inner}>
        <header className={styles.listHeader}>
          <span className={styles.kicker}>Riftbound Simulator / Trials</span>
          <h1>
            Learn a Legend.
            <br />
            <span>Find the winning line.</span>
          </h1>
          <p>
            Each trial is one board and one turn — like a combo trial in a fighting game. Do whatever you like, but only
            the right line wins. Start at Beginner and work up to Expert.
          </p>
        </header>

        {scenariosByDifficulty().map(({ difficulty, scenarios }) => (
          <section key={difficulty} className={styles.tier}>
            <h2 className={styles.tierTitle} data-difficulty={difficulty}>
              {difficulty}
            </h2>
            {scenarios.length === 0 ? (
              <p className={styles.empty}>Coming soon.</p>
            ) : (
              <ul className={styles.trialGrid}>
                {scenarios.map((scenario) => (
                  <li key={scenario.id}>
                    <Link href={`/scenarios/${scenario.id}`} className={styles.trialCard}>
                      <div className={styles.trialLegendArt}>
                        <Card cardId={scenario.legendCardId} />
                      </div>
                      <div className={styles.trialCardBody}>
                        <span className={styles.trialLegend}>{scenario.legendName}</span>
                        <span className={styles.trialTitle}>{scenario.title}</span>
                        <span className={styles.trialObjectives}>
                          {scenario.objectives.map((o) => o.label).join(" · ")}
                        </span>
                        <span className={styles.play}>Play trial →</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
