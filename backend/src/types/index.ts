export type StepStatus = "pending" | "running" | "completed" | "failed";

export interface ExecutionStep {
  name: string;
  agent: string;
  status: StepStatus;
  result?: unknown;
  error?: string;
  startTime?: number;
  endTime?: number;
}

export interface AgentState {
  currentStep: number;
  completedSteps: ExecutionStep[];
  context: Record<string, unknown>;
  timestamp: number;
}

// Resume
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

// Jobs and analysis
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
}

export interface JobSearchResult {
  query: string;
  results: JobListing[];
  fetchedAt: string;
}

export interface JobFitScores {
  fit: number; // 0-100
  skills: number; // skill match 0-100
  experience: number; // 0-100
  overall: number; // 0-100
}

export interface JobAnalysis {
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

export interface AppConfig {
  anthropicApiKey: string;
  stockApiKey?: string;
  firecrawlApiKey?: string;
  checkpointEnabled: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
}

// Backward compatibility alias to avoid import churn
export type AnalysisResult = JobAnalysis;
