"use client";

import type { StepTiming } from "@/lib/types";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";

interface ProgressTrackerProps {
  steps: StepTiming[];
  status: string;
  toolCount?: number;
  elapsedMs?: number;
  toolFeed?: string[];
}

export function ProgressTracker({ steps, status, toolCount = 0, toolFeed = [] }: ProgressTrackerProps) {
  const totalSteps = steps.length || 4;
  const completed = steps.filter((s) => s.status === "completed").length;
  const inProgress = steps.find((s) => s.status === "running");
  const progress = Math.min(100, Math.round(((completed + (inProgress ? 0.5 : 0)) / totalSteps) * 100));
  const activity = status ? [status, ...toolFeed] : toolFeed;

  return (
    <div className="rounded-xl border border-[#2c2c2c] bg-[#171717] p-4 space-y-4">
      <div className="flex justify-between text-xs text-[#9f9f9f]">
        <span>Progress {progress}%</span>
        <span>{toolCount} tools</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
        <div className="h-full bg-[#cfcfcf] transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(steps.length
          ? steps
          : [
              { name: "Initialize", status: "running" as const },
              { name: "Analyze", status: "pending" as const },
              { name: "Synthesize", status: "pending" as const },
              { name: "Report", status: "pending" as const },
            ] satisfies StepTiming[]).map((step, index) => {
          const isCompleted = step.status === "completed";
          const isCurrent = step.status === "running";
          const isFailed = step.status === "failed";

          const icon = isCompleted ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : isFailed ? (
            <XCircle className="h-4 w-4" />
          ) : isCurrent ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Circle className="h-4 w-4" />
          );

          const color = isCompleted
            ? "text-emerald-400"
            : isFailed
            ? "text-rose-400"
            : isCurrent
            ? "text-[#cfcfcf]"
            : "text-[#9f9f9f]";

          return (
            <div key={`${step.name}-${index}`} className="rounded border border-[#2c2c2c] bg-[#1b1b1b] p-2.5">
              <div className={`flex items-center gap-2 text-xs ${color}`}>
                {icon}
                <span className="font-medium">{step.name}</span>
                {step.durationSeconds !== undefined && (
                  <span className="ml-auto text-[#9f9f9f]">{step.durationSeconds.toFixed(1)}s</span>
                )}
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#2c2c2c]">
                <div
                  className={`h-full ${
                    isCompleted ? "bg-emerald-400" : isFailed ? "bg-rose-400" : "bg-[#cfcfcf] animate-pulse"
                  }`}
                  style={{ width: isCompleted ? "100%" : isCurrent ? "50%" : "8%" }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {activity.length > 0 && (
        <div className="rounded border border-[#2c2c2c] bg-[#1b1b1b] p-2.5">
          <p className="mb-1.5 text-xs text-[#9f9f9f]">Agent activity</p>
          <ul className="space-y-0.5 text-xs text-[#d3d3d3] max-h-24 overflow-y-auto">
            {activity.slice(0, 8).map((item, idx) => (
              <li key={`${item}-${idx}`} className="flex items-center gap-1.5">
                <span className="text-[#cfcfcf]">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
