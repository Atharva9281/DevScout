import type { AnalysisResult, JobListing, JobSearchResult, ResumeData, StepTiming } from "./types";

export async function persistJobs(jobs: JobListing[]): Promise<void> {
  try {
    const res = await fetch("/api/persist/job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobs }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("persistJobs failed", res.status, text);
    }
  } catch (err) {
    console.error("persistJobs network error", err);
  }
}

export async function persistAnalysisResult(analysis: AnalysisResult): Promise<void> {
  try {
    const res = await fetch("/api/persist/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysis }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("persistAnalysis failed", res.status, text);
    }
  } catch {
    // ignore network error; frontend will still render
  }
}

// Real API helpers
export async function uploadResume(file: File): Promise<ResumeData> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload-resume", { method: "POST", body: form });
  if (!res.ok) throw new Error("Resume upload failed");
  const data = await res.json();
  return data.resume as ResumeData;
}

export async function searchJobs(query: string): Promise<JobSearchResult> {
  const res = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error("Search failed");
  const data = (await res.json()) as JobSearchResult;
  // fire-and-forget persist
  persistJobs(data.results).catch(() => {});
  return data;
}

export async function analyzeJobSSE(
  job: JobListing,
  resume: ResumeData,
  onEvent: (payload: { type: string; data: unknown }) => void,
): Promise<void> {
  const res = await fetch("/api/analyze-job", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job, resume, stream: true }),
  });
  if (!res.ok || !res.body) throw new Error("Analyze failed");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const segments = buffer.split("\n\n");
    buffer = segments.pop() || "";

    for (const seg of segments) {
      if (!seg.trim()) continue;
      const eventMatch = seg.match(/^event: (.+)$/m);
      const dataMatch = seg.match(/^data: (.+)$/m);
      if (eventMatch && dataMatch) {
        onEvent({ type: eventMatch[1], data: JSON.parse(dataMatch[1]) });
      }
    }
  }
}

export async function loadAnalysis(path: string): Promise<AnalysisResult> {
  const res = await fetch(path);
  if (!res.ok) throw new Error("Failed to load analysis");
  return (await res.json()) as AnalysisResult;
}

export async function loadSteps(steps: StepTiming[]): Promise<StepTiming[]> {
  return steps;
}

export async function loadAnalysisByJobId(jobId: string): Promise<AnalysisResult> {
  const res = await fetch(`/api/analysis?jobId=${encodeURIComponent(jobId)}`);
  if (!res.ok) throw new Error("Analysis not found");
  return (await res.json()) as AnalysisResult;
}

export async function loadPersistedJobs(): Promise<JobListing[]> {
  const res = await fetch("/api/persist/job");
  if (!res.ok) throw new Error("Failed to load jobs");
  const data = (await res.json()) as { jobs: Array<Record<string, unknown>> };
  return data.jobs.map((j) => ({
    id: String(j.id ?? ""),
    company: String(j.company ?? ""),
    role: String(j.role ?? ""),
    location: String(j.location ?? "N/A"),
    applicationUrl: String(j.applicationUrl ?? ""),
    sourceUrl: String(j.sourceUrl ?? ""),
    status: (j.status as string) || "not_applied",
    fetchedAt: typeof j.fetchedAt === "string" ? j.fetchedAt : typeof j.updatedAt === "string" ? j.updatedAt : undefined,
    fullDescription: String(j.fullDescription ?? ""),
  }));
}
