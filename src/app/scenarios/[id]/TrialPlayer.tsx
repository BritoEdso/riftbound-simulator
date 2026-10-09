"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Card from "@/components/Cards";
import { CARD_IMAGES } from "@/components/cardImages";
import { CARD_DEFINITIONS } from "@/rules-engine/cards";
import { priorityHolder } from "@/rules-engine/chain";
import { combatDamageDue, pendingShowdowns } from "@/rules-engine/showdown";
import { Action, applyAction, legalActions } from "@/rules-engine/solver";
import { CardDefinition, Domain, GameState, PlayerId, RuneInPlay, UnitInPlay } from "@/rules-engine/types";
import { findScenario, Scenario } from "@/scenarios";
import { describeAction, locationName, unitName } from "@/scenarios/describe";
import { nextHint, runOpponent, trialStatus } from "@/scenarios/play";
import styles from "../scenarios.module.css";

type LogEntry = { by: "you" | "opponent"; text: string };
type Snapshot = { game: GameState; log: LogEntry[] };

const DOMAIN_COLOR: Record<Domain, string> = {
  Fury: "#c0504d",
  Calm: "#4d8fc0",
  Mind: "#8f4dc0",
  Body: "#4dc07a",
  Chaos: "#c0824d",
  Order: "#c0b84d",
};

// Groups for the action panel, in the order a turn usually flows.
const ACTION_GROUPS: { title: string; types: Action["type"][] }[] = [
  { title: "Showdown", types: ["beginShowdown", "chooseTriggerTarget", "resolveCombat"] },
  { title: "Move", types: ["moveUnits"] },
  { title: "Play a card", types: ["playSpell", "playUnit"] },
  { title: "Runes", types: ["exhaustRuneForEnergy", "recycleRuneForPower"] },
  { title: "Pass", types: ["pass"] },
];

function startingSnapshot(scenario: Scenario): Snapshot {
  return { game: runOpponent(scenario.initialState(), scenario.learner).state, log: [] };
}

// A short two-note chime, synthesized so there's no audio asset to ship.
// Called from the click that won, which is what lets browsers play it.
function playDing(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1318.5].forEach((frequency, i) => {
      const start = ctx.currentTime + i * 0.13;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.95);
    });
  } catch {
    // No audio available — the on-screen celebration still shows.
  }
}

export default function TrialPlayer({ scenarioId }: { scenarioId: string }) {
  const scenario = findScenario(scenarioId)!;
  const learner = scenario.learner;
  const opponent = Object.keys(scenario.initialState().players).find((id) => id !== learner)!;

  const [snapshot, setSnapshot] = useState<Snapshot>(() => startingSnapshot(scenario));
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [solutionShown, setSolutionShown] = useState(false);

  const { game, log } = snapshot;
  const status = useMemo(() => trialStatus(game, learner), [game, learner]);
  const myMove = status === "playing" && priorityHolder(game) === learner;
  const actions = useMemo(() => (myMove ? legalActions(game, learner) : []), [game, learner, myMove]);

  function act(action: Action) {
    const mine: LogEntry = { by: "you", text: describeAction(scenario, game, action) };
    const { state, taken, before } = runOpponent(applyAction(game, action), learner);
    const theirs: LogEntry[] = taken.map((a, i) => ({ by: "opponent", text: describeAction(scenario, before[i], a) }));
    setHistory((h) => [...h, snapshot]);
    setSnapshot({ game: state, log: [...log, mine, ...theirs] });
    setHint(null);
    if (trialStatus(state, learner) === "won") playDing();
  }

  function undo() {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory((h) => h.slice(0, -1));
    setSnapshot(previous);
    setHint(null);
  }

  function retry() {
    setSnapshot(startingSnapshot(scenario));
    setHistory([]);
    setHint(null);
    setSolutionShown(false);
  }

  function showHint() {
    const action = nextHint(game, learner);
    setHint(action ? describeAction(scenario, game, action) : "There's no winning line from here — try Undo.");
  }

  const completed = scenario.objectives.filter((o) => o.isComplete(game)).length;

  return (
    <main className={styles.trialPage}>
      <header className={styles.trialHeader}>
        <Link href="/scenarios" className={styles.backLink}>
          ← All trials
        </Link>
        <div className={styles.trialHeading}>
          <span className={styles.badge} data-difficulty={scenario.difficulty}>
            {scenario.difficulty}
          </span>
          <h1>{scenario.title}</h1>
          <span className={styles.legendTag}>{scenario.legendName}</span>
        </div>
        <p className={styles.briefing}>{scenario.briefing}</p>
      </header>

      {status === "won" && (
        <section className={styles.victory} aria-live="polite">
          <h2>Trial complete!</h2>
          <p>You found the winning line. Here&apos;s why it works:</p>
          <Explanation scenario={scenario} />
          <div className={styles.controls}>
            <button className={styles.primaryButton} onClick={retry}>
              Play again
            </button>
            <Link href="/scenarios" className={styles.secondaryButton}>
              Back to trials
            </Link>
          </div>
        </section>
      )}

      {(status === "deadEnd" || status === "lost") && (
        <section className={styles.deadEnd} aria-live="polite">
          <h2>{status === "lost" ? "Your opponent won" : "This line can't win anymore"}</h2>
          <p>
            {status === "lost"
              ? "They reached the Victory Score first."
              : "Whatever you do from here, there's no way to win this turn. Undo a step or start over."}
          </p>
          <div className={styles.controls}>
            <button className={styles.primaryButton} onClick={undo} disabled={history.length === 0}>
              Undo
            </button>
            <button className={styles.secondaryButton} onClick={retry}>
              Retry
            </button>
          </div>
        </section>
      )}

      <div className={styles.trialLayout}>
        <section className={styles.board} aria-label="Board">
          <PlayerStrip scenario={scenario} game={game} playerId={opponent} label="Opponent" />

          <div className={styles.battlefields}>
            {game.battlefields.map((bf) => (
              <BattlefieldPanel key={bf.id} scenario={scenario} game={game} battlefieldId={bf.id} learner={learner} />
            ))}
          </div>

          <PlayerStrip scenario={scenario} game={game} playerId={learner} label="You" legendCardId={scenario.legendCardId} />
          <Hand scenario={scenario} cards={game.players[learner].hand} />
        </section>

        <aside className={styles.sidebar}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>
              Objectives ({completed}/{scenario.objectives.length})
            </h2>
            <ul className={styles.objectives}>
              {scenario.objectives.map((o) => (
                <li key={o.label} data-done={o.isComplete(game)}>
                  <span aria-hidden>{o.isComplete(game) ? "✓" : "○"}</span> {o.label}
                </li>
              ))}
              <li data-done={status === "won"}>
                <span aria-hidden>{status === "won" ? "✓" : "○"}</span> Reach {game.victoryScore} points
              </li>
            </ul>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Right now</h2>
            <PhaseInfo scenario={scenario} game={game} learner={learner} />
          </section>

          {myMove && (
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>Your options</h2>
              {ACTION_GROUPS.map((group) => {
                const inGroup = actions.filter((a) => group.types.includes(a.type));
                if (inGroup.length === 0) return null;
                return (
                  <div key={group.title} className={styles.actionGroup}>
                    <h3>{group.title}</h3>
                    {inGroup.map((action, i) => (
                      <button key={i} className={styles.actionButton} onClick={() => act(action)}>
                        {describeAction(scenario, game, action)}
                      </button>
                    ))}
                  </div>
                );
              })}
            </section>
          )}

          <section className={styles.panel}>
            <div className={styles.controls}>
              <button className={styles.secondaryButton} onClick={showHint} disabled={!myMove}>
                Hint
              </button>
              <button className={styles.secondaryButton} onClick={undo} disabled={history.length === 0}>
                Undo
              </button>
              <button className={styles.secondaryButton} onClick={retry}>
                Retry
              </button>
            </div>
            {hint && (
              <p className={styles.hint} aria-live="polite">
                <strong>Next step:</strong> {hint}
              </p>
            )}
            {status !== "won" && (
              <button className={styles.linkButton} onClick={() => setSolutionShown((s) => !s)}>
                {solutionShown ? "Hide the solution" : "Give up — show the solution"}
              </button>
            )}
            {solutionShown && status !== "won" && <Explanation scenario={scenario} />}
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Move log</h2>
            {log.length === 0 ? (
              <p className={styles.muted}>Nothing yet — it&apos;s your turn.</p>
            ) : (
              <ol className={styles.log}>
                {log.map((entry, i) => (
                  <li key={i} data-by={entry.by}>
                    <span className={styles.logWho}>{entry.by === "you" ? "You" : "Opponent"}</span> {entry.text}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

function Explanation({ scenario }: { scenario: Scenario }) {
  return (
    <div className={styles.explanation}>
      <ol>
        {scenario.explanation.map((step) => (
          <li key={step.title}>
            <strong>{step.title}.</strong> {step.body}
            {step.rules && <span className={styles.rules}>Rules: {step.rules.join("; ")}</span>}
          </li>
        ))}
      </ol>
      {scenario.commonMistakes.length > 0 && (
        <>
          <h3>Lines that look right but don&apos;t work</h3>
          <ul>
            {scenario.commonMistakes.map((m) => (
              <li key={m.title}>
                <strong>{m.title}:</strong> {m.body}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function PhaseInfo({ scenario, game, learner }: { scenario: Scenario; game: GameState; learner: PlayerId }) {
  const who = (id: PlayerId) => (id === learner ? "You" : "Your opponent");
  const showdown = game.showdown;
  const lines: string[] = [];

  if (showdown) {
    const where = locationName(scenario, showdown.battlefieldId);
    lines.push(showdown.isCombat ? `Combat at ${where}.` : `Showdown at ${where} (no combat — nobody is defending).`);
  } else if (pendingShowdowns(game).length > 0) {
    const where = pendingShowdowns(game).map((id) => locationName(scenario, id)).join(" and ");
    lines.push(`${where} is Contested — a Showdown has to start there before anything else happens.`);
  } else {
    lines.push("Your Action Phase. Move units, play cards, or tap runes.");
  }

  if (showdown && showdown.pendingTriggers.length > 0) {
    const trigger = showdown.pendingTriggers[0];
    lines.push(`${CARD_DEFINITIONS[trigger.cardId]?.name}'s ability triggered — ${who(trigger.controller).toLowerCase()} must choose its target.`);
  } else if (game.chain) {
    lines.push(`${who(game.chain.priority)} ${game.chain.priority === learner ? "have" : "has"} Priority. While the Chain is open, only Reaction cards can be played.`);
  } else if (showdown && combatDamageDue(game)) {
    lines.push("Both players passed — combat damage is next.");
  } else if (showdown) {
    lines.push(`${who(showdown.focus)} ${showdown.focus === learner ? "have" : "has"} Focus. Action and Reaction cards can be played; when both players pass in a row, the Showdown ends.`);
  }

  return (
    <div className={styles.phase}>
      {lines.map((l) => (
        <p key={l}>{l}</p>
      ))}
      {game.chain && (
        <>
          <h3>The Chain (newest resolves first)</h3>
          <ol className={styles.chain} reversed>
            {[...game.chain.items].reverse().map((item, i) => {
              const target = game.units.find((u) => u.instanceId === item.targetInstanceId);
              const source = CARD_DEFINITIONS[item.cardId]?.name ?? item.cardId;
              return (
                <li key={i}>
                  {item.sourceInstanceId ? `${source}'s ability` : source} → {unitName(scenario, target, item.targetInstanceId)}{" "}
                  <span className={styles.muted}>({who(item.controller)})</span>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}

function PlayerStrip({
  scenario,
  game,
  playerId,
  label,
  legendCardId,
}: {
  scenario: Scenario;
  game: GameState;
  playerId: PlayerId;
  label: string;
  legendCardId?: string;
}) {
  const player = game.players[playerId];
  const baseUnits = game.units.filter((u) => u.controller === playerId && u.location === "base");
  return (
    <div className={styles.playerStrip} data-side={label === "You" ? "you" : "opponent"}>
      <div className={styles.playerSummary}>
        <span className={styles.playerName}>{label}</span>
        <span className={styles.points}>
          {player.points}
          <small>/{game.victoryScore} pts</small>
        </span>
        <span className={styles.muted}>
          Hand {player.hand.length} · Deck {player.deck.length} · Trash {player.trash.length}
        </span>
        <Runes runes={player.runesInPlay} energy={player.energyPool} power={player.powerPool} />
      </div>
      <div className={styles.zone}>
        <span className={styles.zoneLabel}>Base</span>
        <div className={styles.units}>
          {baseUnits.length === 0 ? (
            <span className={styles.muted}>Empty</span>
          ) : (
            baseUnits.map((u) => <UnitChip key={u.instanceId} scenario={scenario} unit={u} />)
          )}
        </div>
      </div>
      <div className={styles.legendZone}>
        <span className={styles.zoneLabel}>Legend</span>
        {legendCardId ? (
          <div className={styles.legendArt}>
            <Card cardId={legendCardId} />
          </div>
        ) : (
          <span className={styles.muted}>Not part of this trial</span>
        )}
      </div>
    </div>
  );
}

function Runes({ runes, energy, power }: { runes: RuneInPlay[]; energy: number; power: GameState["players"][string]["powerPool"] }) {
  const powerText = Object.entries(power)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([domain, n]) => `${n} ${domain} Power`)
    .join(", ");
  return (
    <div className={styles.runes}>
      {runes.map((r) => (
        <span
          key={r.instanceId}
          className={styles.rune}
          data-ready={r.ready}
          style={{ background: DOMAIN_COLOR[r.domain] }}
          title={`${r.domain} rune — ${r.ready ? "ready" : "exhausted"}`}
        />
      ))}
      <span className={styles.pool}>
        {energy} Energy{powerText && ` · ${powerText}`}
      </span>
    </div>
  );
}

function BattlefieldPanel({
  scenario,
  game,
  battlefieldId,
  learner,
}: {
  scenario: Scenario;
  game: GameState;
  battlefieldId: string;
  learner: PlayerId;
}) {
  const bf = game.battlefields.find((b) => b.id === battlefieldId)!;
  const here = game.units.filter((u) => u.location === battlefieldId);
  const control =
    bf.controller === null ? "Uncontrolled" : bf.controller === learner ? "You control this" : "Opponent controls this";
  const active = game.showdown?.battlefieldId === battlefieldId;
  return (
    <div className={styles.battlefield} data-active={active} data-controller={bf.controller === learner ? "you" : bf.controller ? "opponent" : "none"}>
      <div className={styles.battlefieldHeader}>
        <span className={styles.battlefieldName}>{locationName(scenario, battlefieldId)}</span>
        <span className={styles.muted}>{control}</span>
      </div>
      <div className={styles.tags}>
        {bf.contested && <span className={styles.tag}>Contested</span>}
        {active && <span className={styles.tag}>{game.showdown?.isCombat ? "Combat" : "Showdown"}</span>}
        {bf.scoredByThisTurn.includes(learner) && <span className={styles.tagGood}>Scored by you this turn</span>}
      </div>
      <div className={styles.units}>
        {here.filter((u) => u.controller !== learner).map((u) => (
          <UnitChip key={u.instanceId} scenario={scenario} unit={u} />
        ))}
      </div>
      <div className={styles.units}>
        {here.filter((u) => u.controller === learner).map((u) => (
          <UnitChip key={u.instanceId} scenario={scenario} unit={u} />
        ))}
      </div>
      {here.length === 0 && <span className={styles.muted}>No units</span>}
    </div>
  );
}

function UnitChip({ scenario, unit }: { scenario: Scenario; unit: UnitInPlay }) {
  const changed = unit.might !== unit.baseMight;
  return (
    <div className={styles.unit} data-ready={unit.ready} data-role={unit.combatRole ?? "none"}>
      <span className={styles.unitName}>{unitName(scenario, unit)}</span>
      <span className={styles.might} data-changed={changed ? (unit.might > unit.baseMight ? "up" : "down") : "no"}>
        {unit.might}
        {changed && <s>{unit.baseMight}</s>} Might
      </span>
      <span className={styles.unitMeta}>
        {unit.ready ? "Ready" : "Exhausted"}
        {unit.combatRole && ` · ${unit.combatRole === "attacking" ? "Attacking" : "Defending"}`}
        {unit.damage > 0 && ` · ${unit.damage} damage`}
      </span>
    </div>
  );
}

function Hand({ scenario, cards }: { scenario: Scenario; cards: CardDefinition[] }) {
  return (
    <div className={styles.hand}>
      <span className={styles.zoneLabel}>Your hand</span>
      <div className={styles.handCards}>
        {cards.length === 0 && <span className={styles.muted}>Empty</span>}
        {cards.map((card, i) =>
          CARD_IMAGES[card.id] ? (
            <div key={i} className={styles.handArt} title={`${card.name}: ${card.rulesText}`}>
              <Card cardId={card.id} />
            </div>
          ) : (
            <div key={i} className={styles.textCard}>
              <strong>{card.name}</strong>
              <span className={styles.muted}>
                {card.energyCost} Energy
                {Object.entries(card.powerCost).map(([d, n]) => ` + ${n} ${d}`)} · {card.type}
                {card.might !== undefined && ` · ${card.might} Might`}
              </span>
              <span>{card.rulesText}</span>
            </div>
          ),
        )}
      </div>
      {cards.length > 0 && scenario && <span className={styles.muted}>Hover a card to read it.</span>}
    </div>
  );
}
