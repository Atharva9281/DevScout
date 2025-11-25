"use client";

import type { AnalysisResult } from "@/lib/types";

interface PanelLeftOutputProps {
  result?: AnalysisResult | null;
}

export function PanelLeftOutput({ result }: PanelLeftOutputProps) {
  if (!result) {
    return (
      <div className="rounded-xl border border-[#2c2c2c] bg-[#171717] p-4 text-sm text-[#9f9f9f]">
        Run an analysis to see tailored outputs.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#2c2c2c] bg-[#171717] p-4">
        <h3 className="text-sm font-medium text-[#f1f1f1] mb-2">Tailored Resume Points</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-[#d3d3d3]">
          {result.tailoredBullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      </div>

      <div className="rounded-xl border border-[#2c2c2c] bg-[#171717] p-4">
        <h3 className="text-sm font-medium text-[#f1f1f1] mb-2">Cover Letter</h3>
        <div className="text-sm text-[#d3d3d3] whitespace-pre-wrap">{result.coverLetter}</div>
      </div>

      <div className="rounded-xl border border-[#2c2c2c] bg-[#171717] p-4">
        <h3 className="text-sm font-medium text-[#f1f1f1] mb-2">Missing Skills</h3>
        <ul className="list-disc list-inside space-y-1 text-xs text-[#d3d3d3]">
          {result.missingSkills.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>
    </div>
  );
}
