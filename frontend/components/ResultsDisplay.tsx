"use client";

import type { AnalysisResult } from "@/lib/types";
import { PanelLeftOutput } from "./PanelLeftOutput";
import { ProgressTracker } from "./ProgressTracker";
import { JobHeader } from "./JobHeader";
import type { StepTiming } from "@/lib/types";

interface ResultsDisplayProps {
  result: AnalysisResult | null;
  feed: { id: string; text: string }[];
  steps: StepTiming[];
  status: string;
}

export function ResultsDisplay({ result, feed, steps, status }: ResultsDisplayProps) {
  return (
    <div className="space-y-4">
      {result && <JobHeader job={result.job} />}
      <ProgressTracker steps={steps} status={status} toolCount={feed.length} toolFeed={feed.map((f) => f.text)} />
      <PanelLeftOutput result={result || undefined} />
    </div>
  );
}
