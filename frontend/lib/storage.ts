import type { AnalysisResult, JobListing } from "./types";

const KEY = "devscout-analysis-cache";
const JOB_KEY = "devscout-jobs-cache";

export function loadAnalysisCache(): Record<string, AnalysisResult> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, AnalysisResult>;
  } catch {
    return {};
  }
}

export function saveAnalysisCache(cache: Record<string, AnalysisResult>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

export function loadJobCache(): JobListing[] {
  try {
    const raw = localStorage.getItem(JOB_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as JobListing[];
  } catch {
    return [];
  }
}

export function saveJobCache(jobs: JobListing[]): void {
  try {
    localStorage.setItem(JOB_KEY, JSON.stringify(jobs));
  } catch {
    // ignore
  }
}
