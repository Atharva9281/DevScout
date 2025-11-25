export type StepStatus = "pending" | "running" | "completed" | "failed";

export interface StepTiming {
  name: string;
  status: StepStatus;
  durationSeconds?: number;
}

export interface ResumeMeta {
  filename: string;
  uploadedAt: string;
  sizeBytes: number;
  mimeType: string;
}

export interface ResumeStructured {
  name?: string;
  title?: string;
  skills?: string[];
  experience?: string[];
}

export interface ResumeData {
  id: string;
  meta: ResumeMeta;
  rawText: string;
  structured: ResumeStructured;
}

export interface JobListing {
  id: string;
  company: string;
  role: string;
  location: string;
  applicationUrl: string;
  sourceUrl: string;
  fullDescription: string;
  salary?: string;
  postedDate?: string;
  source?: string;
  fetchedAt?: string;
  status?: "not_applied" | "applied";
}

export interface JobSearchResult {
  query: string;
  results: JobListing[];
  fetchedAt: string;
}

export interface JobFitScores {
  fit: number;
  skills: number;
  experience: number;
  overall: number;
}

export interface AnalysisResult {
  job: JobListing;
  resumeId?: string;
  summary: string;
  tailoredBullets: string[];
  coverLetter: string;
  missingSkills: string[];
  recommendedLearning: string[];
  fitScores: JobFitScores;
  suitability: string;
  savedTo?: string;
}

export interface AnalysisEvent {
  type: "status" | "step" | "result" | "done" | "error";
  data: unknown;
  timestamp: number;
}
