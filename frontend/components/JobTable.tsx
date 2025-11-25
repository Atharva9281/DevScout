"use client";

import type { JobListing } from "@/lib/types";
import { JobRow } from "./JobRow";

interface JobTableProps {
  jobs: JobListing[];
  onToggleStatus?: (job: JobListing) => void;
  onAnalyze?: (job: JobListing) => void;
  disableAnalyze?: boolean;
}

export function JobTable({
  jobs,
  onToggleStatus,
  onAnalyze,
  disableAnalyze,
}: JobTableProps) {
  return (
    <div className="rounded-xl border border-[#2c2c2c] bg-[#171717] overflow-hidden">
      <table className="w-full text-left table-fixed">
        <colgroup>
          <col className="w-10" />
          <col className="w-[28%]" />
          <col className="w-[28%]" />
          <col className="w-[12%]" />
          <col className="w-[12%]" />
          <col className="w-[12%]" />
          <col className="w-[8%]" />
        </colgroup>
        <thead className="bg-[#1b1b1b]">
          <tr>
            {["#", "Company", "Role", "Added", "Application", "Status", ""].map((h) => (
              <th key={h} className="px-2 sm:px-3 py-2 text-xs font-semibold text-[#9f9f9f]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job, idx) => (
            <JobRow
              key={job.id}
              index={idx + 1}
              job={job}
              onAnalyze={onAnalyze}
              onToggleStatus={onToggleStatus}
              disableAnalyze={disableAnalyze}
            />
          ))}
        </tbody>
      </table>
      {jobs.length === 0 && (
        <div className="p-4 text-xs text-center text-[#9f9f9f]">No jobs yet. Run a search to populate the table.</div>
      )}
    </div>
  );
}
