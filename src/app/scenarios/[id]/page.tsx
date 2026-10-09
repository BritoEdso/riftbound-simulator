import { notFound } from "next/navigation";
import { findScenario, SCENARIOS } from "@/scenarios";
import TrialPlayer from "./TrialPlayer";

export function generateStaticParams() {
  return SCENARIOS.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const scenario = findScenario((await params).id);
  return { title: scenario ? `${scenario.title} · Trials` : "Trial not found" };
}

export default async function ScenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!findScenario(id)) notFound();
  // Scenarios hold functions (initialState, objective checks), which can't
  // cross the server→client boundary — so pass the id and look it up again
  // client-side.
  return <TrialPlayer scenarioId={id} />;
}
