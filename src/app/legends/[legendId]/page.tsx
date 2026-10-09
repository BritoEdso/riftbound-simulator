import Link from "next/link";
import { notFound } from "next/navigation";
import Card from "@/components/Cards";
import { findLegend, LEGENDS, scenariosByDifficulty } from "@/scenarios";
import styles from "../legends.module.css";

export function generateStaticParams() {
  return LEGENDS.map((l) => ({ legendId: l.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ legendId: string }> }) {
  const legend = findLegend((await params).legendId);
  return { title: legend ? `${legend.champion} trials · Riftbound Simulator` : "Legend not found" };
}

export default async function LegendPage({ params }: { params: Promise<{ legendId: string }> }) {
  const legend = findLegend((await params).legendId);
  if (!legend) notFound();
  // Trials are numbered straight through the tiers (1, 2, 3…), like a
  // fighting game's trial list.
  const tiers = scenariosByDifficulty(legend.id);
  const trialNumber = new Map(tiers.flatMap((t) => t.scenarios).map((s, i) => [s.id, i + 1]));

  return (
    <main className={styles.page}>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Link href="/">Legends</Link> <span aria-hidden>›</span> {legend.champion}
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroArt}>
          <Card cardId={legend.cardId} />
        </div>
        <div className={styles.heroText}>
          <span className={styles.kicker}>{legend.title}</span>
          <h1>{legend.champion}</h1>
          <div className={styles.domains}>
            {legend.domains.map((d) => (
              <span key={d} data-domain={d}>
                {d}
              </span>
            ))}
          </div>
          <blockquote className={styles.ability}>
            <span className={styles.abilityLabel}>Legend ability</span>
            {legend.abilityText}
          </blockquote>
          <p className={styles.playstyle}>{legend.playstyle}</p>
        </div>
      </section>

      <section className={styles.trials} aria-label={`${legend.champion} trials`}>
        {tiers.map(({ difficulty, scenarios }) => (
          <div key={difficulty} className={styles.tier}>
            <h2 className={styles.tierTitle} data-difficulty={difficulty}>
              <span aria-hidden>◆</span> {difficulty}
            </h2>
            {scenarios.length === 0 ? (
              <p className={styles.empty}>No {difficulty.toLowerCase()} trials yet — coming soon.</p>
            ) : (
              <ol className={styles.trialList}>
                {scenarios.map((scenario) => (
                  <li key={scenario.id}>
                    <Link href={`/legends/${legend.id}/${scenario.id}`} className={styles.trial}>
                      <span className={styles.trialNumber}>{trialNumber.get(scenario.id)}</span>
                      <span className={styles.trialBody}>
                        <span className={styles.trialTitle}>{scenario.title}</span>
                        <span className={styles.trialObjectives}>
                          {scenario.objectives.map((o) => o.label).join(" · ")}
                        </span>
                      </span>
                      <span className={styles.trialPlay}>Play</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
