import { notFound } from "next/navigation";
import { findScenario, SCENARIOS } from "@/scenarios";
import TrialPlayer from "./TrialPlayer";

type Params = Promise<{ legendId: string; trialId: string }>;

export function generateStaticParams() {
  return SCENARIOS.map((s) => ({ legendId: s.legendId, trialId: s.id }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const scenario = findScenario((await params).trialId);
  return { title: scenario ? `${scenario.title} · Trials` : "Trial not found" };
}

export default async function TrialPage({ params }: { params: Params }) {
  const { legendId, trialId } = await params;
  const scenario = findScenario(trialId);
  // A trial only lives under its own Legend's URL.
  if (!scenario || scenario.legendId !== legendId) notFound();
  // Scenarios hold functions (initialState, objective checks), which can't
  // cross the server→client boundary — so pass the id and look it up again
  // client-side.
  return <TrialPlayer scenarioId={trialId} />;
}
