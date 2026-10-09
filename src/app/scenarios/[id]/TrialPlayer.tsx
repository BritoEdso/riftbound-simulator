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
import { actionSubjects, describeAction, locationName, unitName } from "@/scenarios/describe";
import { nextHint, runOpponent, trialStatus } from "@/scenarios/play";
import styles from "../trial.module.css";

type LogEntry = { by: "you" | "opponent"; text: string };
type Snapshot = { game: GameState; log: LogEntry[] };
// What the inspector panel is showing: a unit on the board or a card in hand.
type Inspected = { kind: "unit"; instanceId: string } | { kind: "card"; card: CardDefinition } | null;

const DOMAIN_COLOR: Record<Domain, string> = {
  Fury: "#e0524f",
  Calm: "#3fa3e0",
  Mind: "#a463e6",
  Body: "#45c27b",
  Chaos: "#e08a3f",
  Order: "#d9c34a",
};

// Groups for the action rail, in the order a turn usually flows.
const ACTION_GROUPS: { title: string; icon: string; types: Action["type"][] }[] = [
  { title: "Showdown", icon: "⚔", types: ["beginShowdown", "chooseTriggerTarget", "resolveCombat"] },
  { title: "Move", icon: "➜", types: ["moveUnits"] },
  { title: "Play a card", icon: "✦", types: ["playSpell", "playUnit"] },
  { title: "Runes", icon: "◆", types: ["exhaustRuneForEnergy", "recycleRuneForPower"] },
  { title: "Pass", icon: "⏵", types: ["pass"] },
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
  const [victoryDismissed, setVictoryDismissed] = useState(false);
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const [inspected, setInspected] = useState<Inspected>(null);

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
    setHighlighted([]);
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
    setVictoryDismissed(false);
  }

  function showHint() {
    const action = nextHint(game, learner);
    setHint(action ? describeAction(scenario, game, action) : "There's no winning line from here — try Undo.");
    setHighlighted(action ? actionSubjects(action) : []);
  }

  const board = {
    scenario,
    game,
    learner,
    highlighted,
    onInspect: setInspected,
  };

  return (
    <main className={styles.game}>
      <header className={styles.hud}>
        <Link href="/scenarios" className={styles.back} aria-label="All trials">
          ‹
        </Link>
        <div className={styles.hudTitle}>
          <span className={styles.tier} data-difficulty={scenario.difficulty}>
            {scenario.difficulty}
          </span>
          <h1>{scenario.title}</h1>
          <span className={styles.hudLegend}>{scenario.legendName}</span>
        </div>
        <ul className={styles.objectives} aria-label="Objectives">
          {scenario.objectives.map((o) => (
            <li key={o.label} data-done={o.isComplete(game)}>
              {o.isComplete(game) ? "✓" : "○"} {o.label}
            </li>
          ))}
          <li data-done={status === "won"}>
            {status === "won" ? "✓" : "○"} Reach {game.victoryScore}
          </li>
        </ul>
        <div className={styles.hudButtons}>
          <button className={styles.hudButton} onClick={showHint} disabled={!myMove}>
            Hint
          </button>
          <button className={styles.hudButton} onClick={undo} disabled={history.length === 0}>
            Undo
          </button>
          <button className={styles.hudButton} onClick={retry}>
            Retry
          </button>
        </div>
      </header>

      <details className={styles.briefing} open={log.length === 0}>
        <summary>Briefing</summary>
        <p>{scenario.briefing}</p>
      </details>

      <div className={styles.table}>
        <section className={styles.playmat} aria-label="Board">
          {(status === "deadEnd" || status === "lost") && (
            <div className={styles.deadEnd} role="status">
              <strong>{status === "lost" ? "Your opponent won." : "This line can't win anymore."}</strong>
              <span>{status === "lost" ? "They reached the Victory Score first." : "Undo a step or start over."}</span>
              <button className={styles.hudButton} onClick={undo} disabled={history.length === 0}>
                Undo
              </button>
              <button className={styles.hudButton} onClick={retry}>
                Retry
              </button>
            </div>
          )}

          <SideRow {...board} playerId={opponent} label="Opponent" />

          <div className={styles.middle}>
            <div className={styles.battlefields}>
              {game.battlefields.map((bf) => (
                <BattlefieldZone key={bf.id} {...board} battlefieldId={bf.id} />
              ))}
            </div>
            <ScoreTrack game={game} learner={learner} opponent={opponent} />
          </div>

          <SideRow {...board} playerId={learner} label="You" legendCardId={scenario.legendCardId} />

          <div className={styles.hand} aria-label="Your hand">
            {game.players[learner].hand.map((card, i) => (
              <button
                key={i}
                className={styles.handCard}
                style={{ "--i": i, "--n": game.players[learner].hand.length } as React.CSSProperties}
                onMouseEnter={() => setInspected({ kind: "card", card })}
                onFocus={() => setInspected({ kind: "card", card })}
                aria-label={`${card.name}: ${card.rulesText}`}
              >
                <CardFace card={card} />
              </button>
            ))}
          </div>
        </section>

        <aside className={styles.rail}>
          <PhaseBanner scenario={scenario} game={game} learner={learner} status={status} />

          {game.chain && <ChainStack scenario={scenario} game={game} learner={learner} />}

          {myMove && (
            <section className={styles.railPanel}>
              <h2 className={styles.railTitle}>Your move</h2>
              {ACTION_GROUPS.map((group) => {
                const inGroup = actions.filter((a) => group.types.includes(a.type));
                if (inGroup.length === 0) return null;
                return (
                  <div key={group.title} className={styles.actionGroup}>
                    <h3>
                      <span aria-hidden>{group.icon}</span> {group.title}
                    </h3>
                    {inGroup.map((action, i) => (
                      <button
                        key={i}
                        className={styles.action}
                        data-kind={action.type}
                        onClick={() => act(action)}
                        onMouseEnter={() => setHighlighted(actionSubjects(action))}
                        onMouseLeave={() => setHighlighted([])}
                        onFocus={() => setHighlighted(actionSubjects(action))}
                        onBlur={() => setHighlighted([])}
                      >
                        {describeAction(scenario, game, action)}
                      </button>
                    ))}
                  </div>
                );
              })}
            </section>
          )}

          {hint && (
            <p className={styles.hint} role="status">
              <strong>Hint:</strong> {hint}
            </p>
          )}

          <Inspector scenario={scenario} game={game} inspected={inspected} />

          <details className={styles.railPanel}>
            <summary className={styles.railTitle}>Move log ({log.length})</summary>
            {log.length === 0 ? (
              <p className={styles.muted}>Nothing yet — it&apos;s your turn.</p>
            ) : (
              <ol className={styles.log}>
                {log.map((entry, i) => (
                  <li key={i} data-by={entry.by}>
                    <span>{entry.by === "you" ? "You" : "Opp"}</span> {entry.text}
                  </li>
                ))}
              </ol>
            )}
          </details>

          {status !== "won" && (
            <details className={styles.railPanel} open={solutionShown} onToggle={(e) => setSolutionShown(e.currentTarget.open)}>
              <summary className={styles.railTitle}>Stuck? Show the solution</summary>
              {solutionShown && <Explanation scenario={scenario} />}
            </details>
          )}
        </aside>
      </div>

      {status === "won" && !victoryDismissed && (
        <div className={styles.victoryBackdrop} role="dialog" aria-modal="true" aria-labelledby="victory-title">
          <div className={styles.victory}>
            <span className={styles.victoryKicker}>Trial complete</span>
            <h2 id="victory-title">Victory!</h2>
            <p>You found the winning line. Here&apos;s why it works:</p>
            <Explanation scenario={scenario} />
            <div className={styles.victoryButtons}>
              <button className={styles.primary} onClick={retry}>
                Play again
              </button>
              <Link href="/scenarios" className={styles.secondary}>
                Back to trials
              </Link>
              <button className={styles.secondary} onClick={() => setVictoryDismissed(true)}>
                View the board
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

type BoardProps = {
  scenario: Scenario;
  game: GameState;
  learner: PlayerId;
  highlighted: string[];
  onInspect: (inspected: Inspected) => void;
};

function SideRow({ playerId, label, legendCardId, ...board }: BoardProps & { playerId: PlayerId; label: string; legendCardId?: string }) {
  const { game, highlighted } = board;
  const player = game.players[playerId];
  const side = playerId === board.learner ? "you" : "opponent";
  const baseUnits = game.units.filter((u) => u.controller === playerId && u.location === "base");
  return (
    <div className={styles.side} data-side={side}>
      <div className={styles.legendSlot}>
        <span className={styles.zoneLabel}>Legend</span>
        {legendCardId ? (
          <div className={styles.legendArt}>
            <Card cardId={legendCardId} />
          </div>
        ) : (
          <div className={styles.cardBack} aria-label="Unknown legend" />
        )}
      </div>

      <div className={styles.baseZone} data-highlight={highlighted.includes("base") && side === "you"}>
        <span className={styles.zoneLabel}>
          {label} · Base
        </span>
        <div className={styles.unitRow}>
          {baseUnits.length === 0 && <span className={styles.empty}>Empty</span>}
          {baseUnits.map((u) => (
            <UnitCard key={u.instanceId} {...board} unit={u} />
          ))}
        </div>
      </div>

      <div className={styles.resources}>
        <span className={styles.zoneLabel}>Runes</span>
        <Runes runes={player.runesInPlay} highlighted={highlighted} />
        <span className={styles.pool}>
          <b>{player.energyPool}</b> Energy
          {Object.entries(player.powerPool)
            .filter(([, n]) => (n ?? 0) > 0)
            .map(([d, n]) => ` · ${n} ${d}`)}
        </span>
        <span className={styles.counts}>
          Hand {player.hand.length} · Deck {player.deck.length} · Trash {player.trash.length}
        </span>
      </div>
    </div>
  );
}

function Runes({ runes, highlighted }: { runes: RuneInPlay[]; highlighted: string[] }) {
  return (
    <div className={styles.runes}>
      {runes.length === 0 && <span className={styles.empty}>None</span>}
      {runes.map((r) => (
        <span
          key={r.instanceId}
          className={styles.rune}
          data-ready={r.ready}
          data-highlight={highlighted.includes(r.instanceId)}
          style={{ "--domain": DOMAIN_COLOR[r.domain] } as React.CSSProperties}
          title={`${r.domain} rune — ${r.ready ? "ready" : "exhausted"}`}
        >
          {r.domain[0]}
        </span>
      ))}
    </div>
  );
}

function BattlefieldZone({ battlefieldId, ...board }: BoardProps & { battlefieldId: string }) {
  const { scenario, game, learner, highlighted } = board;
  const bf = game.battlefields.find((b) => b.id === battlefieldId)!;
  const here = game.units.filter((u) => u.location === battlefieldId);
  const owner = bf.controller === null ? "none" : bf.controller === learner ? "you" : "opponent";
  const active = game.showdown?.battlefieldId === battlefieldId;
  return (
    <div
      className={styles.battlefield}
      data-controller={owner}
      data-active={active}
      data-highlight={highlighted.includes(battlefieldId)}
    >
      <div className={styles.unitRow} data-row="opponent">
        {here.filter((u) => u.controller !== learner).map((u) => (
          <UnitCard key={u.instanceId} {...board} unit={u} />
        ))}
      </div>
      <div className={styles.plate}>
        <span className={styles.plateName}>{locationName(scenario, battlefieldId)}</span>
        <span className={styles.plateStatus}>
          {owner === "none" ? "Uncontrolled" : owner === "you" ? "Yours" : "Opponent's"}
          {bf.contested && " · Contested"}
          {active && (game.showdown?.isCombat ? " · Combat" : " · Showdown")}
        </span>
        {bf.scoredByThisTurn.includes(learner) && <span className={styles.scored}>Scored ✓</span>}
      </div>
      <div className={styles.unitRow} data-row="you">
        {here.filter((u) => u.controller === learner).map((u) => (
          <UnitCard key={u.instanceId} {...board} unit={u} />
        ))}
      </div>
    </div>
  );
}

function UnitCard({ unit, ...board }: BoardProps & { unit: UnitInPlay }) {
  const { scenario, learner, highlighted, onInspect } = board;
  const card = CARD_DEFINITIONS[unit.cardId];
  const delta = unit.might - unit.baseMight;
  return (
    <button
      className={styles.unit}
      data-side={unit.controller === learner ? "you" : "opponent"}
      data-ready={unit.ready}
      data-role={unit.combatRole ?? "none"}
      data-highlight={highlighted.includes(unit.instanceId)}
      onMouseEnter={() => onInspect({ kind: "unit", instanceId: unit.instanceId })}
      onFocus={() => onInspect({ kind: "unit", instanceId: unit.instanceId })}
      aria-label={`${unitName(scenario, unit)}, ${unit.might} Might, ${unit.ready ? "ready" : "exhausted"}`}
    >
      <span className={styles.unitInner}>
        {card && CARD_IMAGES[card.id] ? (
          <Card cardId={card.id} />
        ) : (
          <span className={styles.unitFrame} style={{ "--domain": card ? DOMAIN_COLOR[card.domains[0]] : "#5a6782" } as React.CSSProperties}>
            <span className={styles.unitFrameName}>{unitName(scenario, unit)}</span>
          </span>
        )}
        <span className={styles.mightGem} data-delta={delta > 0 ? "up" : delta < 0 ? "down" : "none"}>
          {unit.might}
        </span>
        {unit.combatRole && <span className={styles.roleTag}>{unit.combatRole === "attacking" ? "ATK" : "DEF"}</span>}
        {unit.damage > 0 && <span className={styles.damage}>-{unit.damage}</span>}
      </span>
    </button>
  );
}

function ScoreTrack({ game, learner, opponent }: { game: GameState; learner: PlayerId; opponent: PlayerId }) {
  const pips = Array.from({ length: game.victoryScore + 1 }, (_, i) => game.victoryScore - i);
  return (
    <ol className={styles.scoreTrack} aria-label={`Score: you ${game.players[learner].points}, opponent ${game.players[opponent].points}`}>
      {pips.map((n) => (
        <li key={n} data-goal={n === game.victoryScore}>
          <span className={styles.pipNumber}>{n}</span>
          {game.players[opponent].points === n && <span className={styles.marker} data-side="opponent" />}
          {game.players[learner].points === n && <span className={styles.marker} data-side="you" />}
        </li>
      ))}
    </ol>
  );
}

function PhaseBanner({ scenario, game, learner, status }: { scenario: Scenario; game: GameState; learner: PlayerId; status: string }) {
  const who = (id: PlayerId) => (id === learner ? "You" : "Opponent");
  const showdown = game.showdown;
  let title = "Action Phase";
  let detail = "Move units, play cards, or tap runes.";

  if (status === "won") {
    title = "Victory";
    detail = "Trial complete.";
  } else if (showdown) {
    const where = locationName(scenario, showdown.battlefieldId);
    title = showdown.isCombat ? `Combat · ${where}` : `Showdown · ${where}`;
    if (showdown.pendingTriggers.length > 0) {
      const t = showdown.pendingTriggers[0];
      detail = `${CARD_DEFINITIONS[t.cardId]?.name}'s ability triggered — ${who(t.controller) === "You" ? "choose" : "opponent chooses"} its target.`;
    } else if (game.chain) {
      detail = `${who(game.chain.priority)} ${game.chain.priority === learner ? "have" : "has"} Priority. Only Reactions while the Chain is open.`;
    } else if (combatDamageDue(game)) {
      detail = "Both players passed — combat damage is next.";
    } else {
      detail = `${who(showdown.focus)} ${showdown.focus === learner ? "have" : "has"} Focus. Action and Reaction cards can be played; two passes in a row end it.`;
    }
  } else if (pendingShowdowns(game).length > 0) {
    title = "Contested";
    detail = `${pendingShowdowns(game).map((id) => locationName(scenario, id)).join(" and ")} is Contested — its Showdown starts next.`;
  } else if (game.chain) {
    detail = `${who(game.chain.priority)} ${game.chain.priority === learner ? "have" : "has"} Priority. Only Reactions while the Chain is open.`;
  }

  return (
    <div className={styles.banner} data-state={showdown ? (showdown.isCombat ? "combat" : "showdown") : status}>
      <span className={styles.bannerTitle}>{title}</span>
      <span className={styles.bannerDetail}>{detail}</span>
    </div>
  );
}

function ChainStack({ scenario, game, learner }: { scenario: Scenario; game: GameState; learner: PlayerId }) {
  const items = [...game.chain!.items].reverse();
  return (
    <section className={styles.railPanel}>
      <h2 className={styles.railTitle}>The Chain · newest resolves first</h2>
      <ol className={styles.chain}>
        {items.map((item, i) => {
          const target = game.units.find((u) => u.instanceId === item.targetInstanceId);
          const source = CARD_DEFINITIONS[item.cardId]?.name ?? item.cardId;
          return (
            <li key={i} data-side={item.controller === learner ? "you" : "opponent"} data-top={i === 0}>
              <b>{item.sourceInstanceId ? `${source} — ability` : source}</b>
              <span>→ {unitName(scenario, target, item.targetInstanceId)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Inspector({ scenario, game, inspected }: { scenario: Scenario; game: GameState; inspected: Inspected }) {
  let card: CardDefinition | undefined;
  let unit: UnitInPlay | undefined;
  if (inspected?.kind === "unit") {
    unit = game.units.find((u) => u.instanceId === inspected.instanceId);
    card = unit ? CARD_DEFINITIONS[unit.cardId] : undefined;
  } else if (inspected?.kind === "card") {
    card = inspected.card;
  }

  return (
    <section className={styles.railPanel}>
      <h2 className={styles.railTitle}>Inspect</h2>
      {!inspected || (!card && !unit) ? (
        <p className={styles.muted}>Hover a unit or a card to read it.</p>
      ) : (
        <div className={styles.inspector}>
          {card && CARD_IMAGES[card.id] && (
            <div className={styles.inspectorArt}>
              <Card cardId={card.id} />
            </div>
          )}
          <div className={styles.inspectorText}>
            <b>{unit ? unitName(scenario, unit) : card?.name}</b>
            {card && (
              <span className={styles.muted}>
                {card.type} · {card.energyCost} Energy
                {Object.entries(card.powerCost).map(([d, n]) => ` + ${n} ${d}`)}
                {card.keywords.length > 0 && ` · ${card.keywords.join(", ")}`}
              </span>
            )}
            {card && <p>{card.rulesText}</p>}
            {unit && (
              <p className={styles.muted}>
                {unit.might} Might
                {unit.might !== unit.baseMight && ` (printed ${unit.baseMight}, changed this turn)`} ·{" "}
                {unit.ready ? "Ready" : "Exhausted"}
                {unit.damage > 0 && ` · ${unit.damage} damage`}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function CardFace({ card }: { card: CardDefinition }) {
  if (CARD_IMAGES[card.id]) return <Card cardId={card.id} />;
  return (
    <span className={styles.textCard} style={{ "--domain": DOMAIN_COLOR[card.domains[0]] ?? "#5a6782" } as React.CSSProperties}>
      <b>{card.name}</b>
      <small>
        {card.energyCost} Energy · {card.type}
      </small>
      <span>{card.rulesText}</span>
    </span>
  );
}

function Explanation({ scenario }: { scenario: Scenario }) {
  return (
    <div className={styles.explanation}>
      <ol>
        {scenario.explanation.map((step) => (
          <li key={step.title}>
            <b>{step.title}.</b> {step.body}
            {step.rules && <span className={styles.rules}>{step.rules.join(" · ")}</span>}
          </li>
        ))}
      </ol>
      {scenario.commonMistakes.length > 0 && (
        <>
          <h3>Lines that look right but don&apos;t work</h3>
          <ul>
            {scenario.commonMistakes.map((m) => (
              <li key={m.title}>
                <b>{m.title}:</b> {m.body}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
