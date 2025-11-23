export interface GitHubMetrics {
  stars: number;
  forks: number;
  openIssues: number;
  closedIssues: number;
  totalIssues: number;
  openIssueRatio: number;
  language: string;
  lastUpdate: string;
  maintenanceScore: number;
}

export interface WebIntelligence {
  overallSentiment: "positive" | "negative" | "neutral" | "mixed";
  sentimentScore: number;
  redditMentions: number;
  hackerNewsMentions: number;
  complaints: string[];
  praise: string[];
}

export interface Dependency {
  name: string;
  version: string;
}

export interface CodeAnalysis {
  totalDependencies: number;
  outdatedCount: number;
  outdatedPercentage: number;
  riskScore: number;
  dependencies: Dependency[];
}

export interface AnalysisScores {
  github: number;
  community: number;
  code: number;
  overall: number;
}

export interface AnalysisResult {
  repoName: string;
  repoUrl: string;
  analyzedAt: string;
  duration: number;
  github: GitHubMetrics;
  web: WebIntelligence;
  code: CodeAnalysis;
  scores: AnalysisScores;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  productionReady: boolean;
}

export type StepStatus = "pending" | "running" | "completed" | "failed";

export interface ExecutionStep {
  name: string;
  agent: string;
  status: StepStatus;
  // result is arbitrary data per step
  result?: unknown;
  error?: string;
  startTime?: number;
  endTime?: number;
}

// completedSteps must store the actual steps, not strings
export interface AgentState {
  currentStep: number;
  completedSteps: ExecutionStep[];
  context: Record<string, unknown>;
  timestamp: number;
}

export interface AppConfig {
  anthropicApiKey: string;
  githubToken: string;
  braveApiKey?: string;
  checkpointEnabled: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
}
