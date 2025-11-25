"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnalysisResult, JobListing, JobSearchResult, StepTiming, ResumeData } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { SidebarNav } from "@/components/SidebarNav";
import { JobSearchBar } from "@/components/JobSearchBar";
import { JobTable } from "@/components/JobTable";
import { ResultsDisplay } from "@/components/ResultsDisplay";
import {
  searchJobs,
  analyzeJobSSE,
  uploadResume,
  persistAnalysisResult,
  loadPersistedJobs,
} from "@/lib/api";
import { loadAnalysisCache, saveAnalysisCache, loadJobCache, saveJobCache } from "@/lib/storage";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { Pagination } from "@/components/Pagination";

type Tab = "dashboard" | "workspace";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [status, setStatus] = useState<string>("Idle");
  const [steps, setSteps] = useState<StepTiming[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisStore, setAnalysisStore] = useState<Record<string, AnalysisResult>>({});
  const [feed, setFeed] = useState<{ id: string; text: string }[]>([]);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "applied" | "not_applied">("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredJobs = useMemo(() => {
    const base =
      statusFilter === "all"
        ? jobs
        : jobs.filter((j) => (statusFilter === "applied" ? j.status === "applied" : j.status !== "applied"));
    return base;
  }, [jobs, statusFilter]);
  const pagedJobs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredJobs.slice(start, start + pageSize);
  }, [filteredJobs, page]);

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setStatus("Searching...");
    try {
      const res: JobSearchResult = await searchJobs(query);
      // Default status + dedupe by application/source URL
      const normalized = res.results.map((j) => ({
        ...j,
        status: j.status ?? "not_applied",
        id: j.applicationUrl || j.sourceUrl || j.id,
        fetchedAt: j.fetchedAt || res.fetchedAt,
      }));
      // Merge with existing jobs so prior searches remain visible
      const seen = new Set<string>();
      const merged = [...normalized, ...jobs].filter((j) => {
        const key = j.id;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setJobs(merged);
      saveJobCache(merged);
      setStatus(`Found ${res.results.length} roles`);
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async (job: JobListing) => {
    // If a good cached analysis exists and user just wants to view, reuse when already on workspace
    const cached = analysisStore[job.id];
    const canReuse = cached && cached.tailoredBullets?.length && cached.coverLetter;
    if (canReuse && analysis && analysis.job.id === job.id) {
      setActiveTab("workspace");
      return;
    }

    if (!resume) {
      setStatus("Upload a resume before analyzing.");
      setActiveTab("dashboard");
      return;
    }

    setActiveTab("workspace");
    setStatus("Analyzing...");
    setIsLoading(true);
    setSteps([]);
    setFeed([]);
    setAnalysis(null);

    try {
      await analyzeJobSSE(job, resume, ({ type, data }) => {
        if (type === "status" && data && typeof data === "object" && "message" in data) {
          const msg = (data as { message: string }).message;
          setStatus(msg);
          setFeed((prev) => [{ id: `${Date.now()}`, text: msg }, ...prev].slice(0, 50));
        }
        if (type === "step" && data && typeof data === "object" && "steps" in data) {
          const incoming = (data as { steps: StepTiming[] }).steps;
          setSteps(incoming);
          const latest = [...incoming].reverse().find((s) => s.status === "running" || s.status === "completed");
          if (latest) {
            setFeed((prev) => [{ id: `${Date.now()}`, text: `Step: ${latest.name}` }, ...prev].slice(0, 50));
          }
        }
        if (type === "tool" && data && typeof data === "object" && "tool" in data) {
          const tool = (data as { tool: string }).tool;
          setFeed((prev) => [{ id: `${Date.now()}`, text: `Tool: ${tool}` }, ...prev].slice(0, 50));
        }
        if (type === "result" && data) {
          const result = (data && typeof data === "object" && "result" in data) 
            ? (data as { result: AnalysisResult }).result 
            : (data as AnalysisResult);
          setAnalysis(result);
          setAnalysisStore((prev) => ({ ...prev, [job.id]: result }));
          persistAnalysisResult(result).catch(() => {});
          setStatus("Complete");
        }
      });
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const cached = loadAnalysisCache();
    if (Object.keys(cached).length) {
      setAnalysisStore(cached);
    }
    const cachedJobs = loadJobCache();
    if (cachedJobs.length) {
      setJobs(cachedJobs);
    }
    loadPersistedJobs()
      .then((persisted) => {
        if (persisted.length) {
          setJobs((prev) => {
            const all = [...prev, ...persisted];
            const seen = new Set<string>();
            return all.filter((j) => {
              const key = j.id;
              if (!key || seen.has(key)) return false;
              seen.add(key);
              return true;
            });
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    saveAnalysisCache(analysisStore);
  }, [analysisStore]);

  useEffect(() => {
    // No-op: we intentionally avoid auto-switching tabs on refresh.
  }, []);

  const toggleStatus = (job: JobListing) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === job.id ? { ...j, status: j.status === "applied" ? "not_applied" : "applied" } : j,
      ),
    );
    const nextStatus = job.status === "applied" ? "not_applied" : "applied";
    // fire-and-forget persist
    fetch("/api/persist/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: job.id, status: nextStatus }),
    }).catch(() => {});
  };

  const renderDashboard = () => (
    <div className="space-y-4">
      <JobSearchBar
        onSearch={handleSearch}
        isLoading={isLoading}
      />
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#9f9f9f]">Status:</span>
          {([
            { id: "all", label: "All" },
            { id: "not_applied", label: "Not applied" },
            { id: "applied", label: "Applied" },
          ] as const).map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`rounded px-3 py-1 text-xs ${
                statusFilter === f.id
                  ? "bg-[#2d2d2d] text-[#f1f1f1] border border-[#3a3a3a]"
                  : "bg-[#1b1b1b] text-[#9f9f9f] border border-[#2c2c2c]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <JobTable
        jobs={pagedJobs}
        onAnalyze={handleAnalyze}
        onToggleStatus={toggleStatus}
        disableAnalyze={!resume}
      />
      <Pagination
        page={page}
        total={filteredJobs.length}
        pageSize={pageSize}
        onPageChange={(p) => setPage(p)}
      />
    </div>
  );

  const renderWorkspace = () => (
    <div className="space-y-4">
      <ResultsDisplay
        result={analysis}
        feed={feed}
        steps={steps}
        status={status}
      />
    </div>
  );

  return (
    <main className="min-h-screen bg-[#0f0f10] text-[#e6e6e6] flex flex-col">
      <LoadingOverlay visible={isLoading} message={status} />
      <Navbar
        resumeFileName={resume?.meta.filename}
        onUploadClick={async (file) => {
          setIsLoading(true);
          setStatus(`Uploading ${file.name}...`);
          try {
            const res = await uploadResume(file);
            setResume(res);
            setStatus(`Resume loaded: ${res.meta.filename}`);
          } catch (err) {
            setStatus((err as Error).message);
          } finally {
            setIsLoading(false);
          }
        }}
      />
      <div className="flex flex-1">
        <SidebarNav active={activeTab} onSelect={(tab) => setActiveTab(tab as Tab)} />
        <div className="flex-1 px-2 sm:px-6 pb-4">
          {activeTab === "dashboard" && renderDashboard()}
          {activeTab === "workspace" && renderWorkspace()}
        </div>
      </div>
    </main>
  );
}
