import Link from "next/link";
import Card from "@/components/Cards";
import { scenariosByDifficulty } from "@/scenarios";
import styles from "./scenarios.module.css";

export const metadata = { title: "Trials · Riftbound Simulator" };

export default function ScenariosPage() {
  return (
    <main className={styles.listPage}>
      <header className={styles.listHeader}>
        <h1>Trials</h1>
        <p>
          Each trial is a single board where you have to find the line that wins this turn — like a combo trial in a
          fighting game. Pick a Legend to learn and work up from Beginner to Expert.
        </p>
      </header>

      {scenariosByDifficulty().map(({ difficulty, scenarios }) => (
        <section key={difficulty} className={styles.tier}>
          <h2 className={styles.tierTitle} data-difficulty={difficulty}>
            {difficulty}
          </h2>
          {scenarios.length === 0 ? (
            <p className={styles.empty}>No trials yet.</p>
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
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  );
}
