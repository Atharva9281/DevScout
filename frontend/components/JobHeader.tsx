"use client";

import type { JobListing } from "@/lib/types";

export function JobHeader({ job }: { job: JobListing }) {
  return (
    <div className="rounded-xl border border-[#2c2c2c] bg-[#171717] p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div>
        <div className="text-sm text-[#9f9f9f]">Analyzing</div>
        <div className="text-lg font-semibold text-[#f1f1f1]">{job.company}</div>
        <div className="text-sm text-[#9f9f9f]">
          {job.role} • {job.location}
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <a className="text-[#cfcfcf] hover:underline" href={job.applicationUrl} target="_blank" rel="noreferrer">
          Application
        </a>
        <a className="text-[#9f9f9f] hover:underline" href={job.sourceUrl} target="_blank" rel="noreferrer">
          Source
        </a>
      </div>
    </div>
  );
}
