"use client";

import type { JobListing } from "@/lib/types";
import { StatusButton } from "./StatusButton";

interface JobRowProps {
  index: number;
  job: JobListing;
  onToggleStatus?: (job: JobListing) => void;
  onAnalyze?: (job: JobListing) => void;
  disableAnalyze?: boolean;
}

export function JobRow({
  index,
  job,
  onToggleStatus,
  onAnalyze,
  disableAnalyze,
}: JobRowProps) {
  return (
    <tr className="border-b border-[#2c2c2c]">
      <td className="px-2 sm:px-3 py-2 text-sm text-[#9f9f9f]">{index}</td>
      <td className="px-2 sm:px-3 py-2 text-sm text-[#f1f1f1] truncate">{job.company}</td>
      <td className="px-2 sm:px-3 py-2 text-sm text-[#f1f1f1] truncate">{job.role}</td>
      <td className="px-2 sm:px-3 py-2 text-sm text-[#9f9f9f]">
        {job.fetchedAt ? new Date(job.fetchedAt).toLocaleDateString() : "—"}
      </td>
      <td className="px-2 sm:px-3 py-2 text-sm text-[#9f9f9f] truncate max-w-[160px]">
        <a href={job.applicationUrl} className="text-[#cfcfcf] hover:underline" target="_blank" rel="noreferrer">
          Apply
        </a>
      </td>
      <td className="px-2 sm:px-3 py-2">
        <StatusButton
          status={job.status || "not_applied"}
          onToggle={() => onToggleStatus?.(job)}
        />
      </td>
      <td className="px-2 sm:px-3 py-2 flex gap-2">
        <button
          onClick={() => onAnalyze?.(job)}
          disabled={disableAnalyze}
          className="rounded bg-[#2d2d2d] px-3 py-1.5 text-xs text-[#f1f1f1] hover:bg-[#3a3a3a] disabled:opacity-50"
        >
          Open analysis
        </button>
      </td>
    </tr>
  );
}
