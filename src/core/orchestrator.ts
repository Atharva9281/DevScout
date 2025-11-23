import type { ZypherAgent } from "@corespeed/zypher";
import { eachValueFrom } from "rxjs-for-await";
import logger from "../utils/logger.ts";
import { CheckpointManager } from "./checkpoint.ts";
import { MCPVerifier } from "../mcp/mcp-verifier.ts";
import { ProgressTracker } from "../utils/progress-tracker.ts";
import type {
  AnalysisResult,
  AnalysisScores,
  CodeAnalysis,
  ExecutionStep,
  GitHubMetrics,
  WebIntelligence,
} from "../types/index.ts";

interface SynthesisResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  productionReady: boolean;
}

const MODEL_NAME = "claude-3-5-sonnet-20241022";

export class DevScoutOrchestrator {
  private checkpoints: CheckpointManager;
  private steps: ExecutionStep[] = [];
  private agent: ZypherAgent;
  private checkpointEnabled: boolean;
  private progressTracker?: ProgressTracker;

  constructor(agent: ZypherAgent, checkpointEnabled = true) {
    this.agent = agent;
    this.checkpointEnabled = checkpointEnabled;
    this.checkpoints = new CheckpointManager(checkpointEnabled);
  }

  getSteps(): ExecutionStep[] {
    return this.steps;
  }

  async initialize(): Promise<void> {
    logger.info("Initializing orchestrator...");
    const statuses = await MCPVerifier.verifyConnections(this.agent);
    await MCPVerifier.ensureRequiredTools(this.agent, [
      "search_repositories",
      "get_file_contents",
      "list_issues",
    ], statuses);
    logger.success("Orchestrator ready");
  }

  async analyzeRepository(repo: string): Promise<AnalysisResult> {
    const startTime = Date.now();

    this.steps = [
      { name: "GitHub Analysis", agent: "github", status: "pending" },
      { name: "Web Intelligence", agent: "web", status: "pending" },
      { name: "Code Quality", agent: "code", status: "pending" },
      { name: "Synthesis", agent: "synthesis", status: "pending" },
    ];

    this.progressTracker = new ProgressTracker(
      this.steps.length,
      this.steps.map((s) => s.name),
    );
    this.progressTracker.start();

    logger.info(`\n📋 Execution Plan: ${repo}`);
    this.steps.forEach((step, i) => {
      logger.info(`  ${i + 1}. ${step.name}`);
    });
    console.log();

    try {
      const githubData = await this.executeStep(
        0,
        async () => await this.runGitHubAnalysis(repo),
      );

      const webData = await this.executeStep(
        1,
        async () => await this.runWebIntelligence(repo),
      );

      const codeData = await this.executeStep(
        2,
        async () => await this.runCodeAnalysis(repo),
      );

      const scores = this.calculateScores(githubData, webData, codeData);

      const synthesis = await this.executeStep(
        3,
        async () =>
          await this.runSynthesis(repo, githubData, webData, codeData, scores),
      );

      const duration = Date.now() - startTime;
      const repoName = repo.split("/")[1] ?? repo;

      return {
        repoName,
        repoUrl: `https://github.com/${repo}`,
        analyzedAt: new Date().toISOString(),
        duration,
        github: githubData,
        web: webData,
        code: codeData,
        scores,
        summary: (synthesis as SynthesisResult).summary,
        strengths: (synthesis as SynthesisResult).strengths,
        weaknesses: (synthesis as SynthesisResult).weaknesses,
        recommendations: (synthesis as SynthesisResult).recommendations,
        productionReady: (synthesis as SynthesisResult).productionReady,
      };
    } catch (error) {
      logger.error("Analysis failed");
      throw error;
    } finally {
      this.progressTracker?.stop();
    }
  }

  private async executeStep<T>(index: number, fn: () => Promise<T>): Promise<T> {
    const step = this.steps[index];

    step.status = "running";
    step.startTime = Date.now();

    logger.step(index + 1, this.steps.length, step.name);
    this.progressTracker?.setStep(index, "running");

    try {
      const result = await fn();
      step.status = "completed";
      step.endTime = Date.now();
      step.result = result;
      const duration = (step.endTime - step.startTime!) / 1000;
      this.progressTracker?.setStep(index, "completed", duration);

      if (this.checkpointEnabled) {
        await this.checkpoints.save({
          currentStep: index,
          completedSteps: this.steps.slice(0, index + 1),
          context: {},
          timestamp: Date.now(),
        });
      }

      const durationSeconds = ((step.endTime - step.startTime!) / 1000).toFixed(1);
      logger.success(`Completed in ${durationSeconds}s`);

      return result;
    } catch (error) {
      step.status = "failed";
      step.error = error instanceof Error ? error.message : String(error);
      step.endTime = Date.now();
      const duration = step.startTime
        ? (step.endTime - step.startTime) / 1000
        : undefined;
      this.progressTracker?.setStep(index, "failed", duration);
      logger.error(`Step failed: ${step.error}`);
      throw error;
    }
  }

  private async runGitHubAnalysis(repo: string): Promise<GitHubMetrics> {
    const [owner, repoName] = repo.split("/");

    const prompt = `You are analyzing the GitHub repository ${owner}/${repoName}.

You MUST use the GitHub MCP tools with these names:
search_repositories
get_file_contents
list_issues

One possible sequence is:
search_repositories with query "repo:${owner}/${repoName}"
list_issues with state "all"
get_file_contents for "README.md"

Return ONLY valid JSON in this exact format:
{
  "stars": <number>,
  "forks": <number>,
  "openIssues": <number>,
  "closedIssues": <number>,
  "totalIssues": <number>,
  "openIssueRatio": <number between 0 and 1>,
  "language": "<primary language>",
  "lastUpdate": "<ISO date string>",
  "maintenanceScore": <number 0-10 based on activity>
}`;

    const response = await this.runAgentTask(prompt);
    return this.parseJSON<GitHubMetrics>(response, "GitHubMetrics");
  }

  private async runWebIntelligence(repo: string): Promise<WebIntelligence> {
    const repoName = repo.split("/")[1] ?? repo;

    const prompt = `You are analyzing community sentiment about the repository "${repoName}".

If a web search MCP tool is available, search for:
"site:reddit.com ${repoName}"
"site:news.ycombinator.com ${repoName}"

If no web search tools are available, default to neutral sentiment and zero mentions.

Return ONLY valid JSON in this exact format:
{
  "overallSentiment": "positive" | "negative" | "neutral" | "mixed",
  "sentimentScore": <number between -1 and 1>,
  "redditMentions": <number>,
  "hackerNewsMentions": <number>,
  "complaints": ["complaint 1", "complaint 2"],
  "praise": ["praise 1", "praise 2"]
}`;

    const response = await this.runAgentTask(prompt);
    return this.parseJSON<WebIntelligence>(response, "WebIntelligence");
  }

  private async runCodeAnalysis(repo: string): Promise<CodeAnalysis> {
    const [owner, repoName] = repo.split("/");

    const prompt = `You are analyzing code quality and dependencies for ${owner}/${repoName}.

Use get_file_contents to try these files in order:
"package.json"
"pyproject.toml"
"requirements.txt"

Infer dependency list and whether versions look outdated.

Return ONLY valid JSON in this exact format:
{
  "totalDependencies": <number>,
  "outdatedCount": <number>,
  "outdatedPercentage": <number 0-100>,
  "riskScore": <number 0-10>,
  "dependencies": [{"name": "pkg", "version": "1.0.0"}]
}

If you cannot find any manifest, return zeros and an empty dependencies array.`;

    const response = await this.runAgentTask(prompt);
    return this.parseJSON<CodeAnalysis>(response, "CodeAnalysis");
  }

  private async runSynthesis(
    repo: string,
    github: GitHubMetrics,
    web: WebIntelligence,
    code: CodeAnalysis,
    scores: AnalysisScores,
  ): Promise<SynthesisResult> {
    const prompt = `You are synthesizing the analysis for ${repo}.

GitHub Data:
${JSON.stringify(github, null, 2)}

Web Intelligence:
${JSON.stringify(web, null, 2)}

Code Analysis:
${JSON.stringify(code, null, 2)}

Scores:
${JSON.stringify(scores, null, 2)}

Return ONLY valid JSON in this exact format:
{
  "summary": "2-3 sentence overview of the repository health and suitability",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "productionReady": true or false
}`;

    const response = await this.runAgentTask(prompt);
    return this.parseJSON<SynthesisResult>(response, "SynthesisResult");
  }

  private calculateScores(
    github: GitHubMetrics,
    web: WebIntelligence,
    code: CodeAnalysis,
  ): AnalysisScores {
    const githubScore = github.maintenanceScore;
    const communityScore = ((web.sentimentScore + 1) / 2) * 10;
    const codeScore = code.riskScore;
    const overall = githubScore * 0.4 + communityScore * 0.4 + codeScore * 0.2;

    return {
      github: Math.round(githubScore * 10) / 10,
      community: Math.round(communityScore * 10) / 10,
      code: Math.round(codeScore * 10) / 10,
      overall: Math.round(overall * 10) / 10,
    };
  }

  private async runAgentTask(prompt: string): Promise<string> {
    let response = "";

    const event$ = this.agent.runTask(prompt, MODEL_NAME);

    for await (const event of eachValueFrom(event$)) {
      const evt = event as any;
      
      switch (evt.type) {
        case "text":
          if (evt.text) {
            response += evt.text;
          }
          break;

        case "message":
          if (evt.message?.content) {
            for (const block of evt.message.content) {
              if (block.type === "text" && block.text) {
                response += block.text;
              }
            }
          }
          break;

        case "tool_use":
          if (evt.toolName) {
            this.progressTracker?.incrementTools();
            logger.debug(`  🔧 ${evt.toolName}`);
          }
          break;

        case "tool_use_pending_approval":
        case "tool_use_input":
        case "tool_use_rejected":
        case "tool_use_approved":
        case "history_changed":
        case "cancelled":
          logger.debug(`Event: ${evt.type}`);
          break;

        default:
          break;
      }
    }

    return response;
  }

  private parseJSON<T>(text: string, typeName: string): T {
    const patterns = [
      /```json\s*([\s\S]*?)```/,
      /```\s*([\s\S]*?)```/,
      /(\{[\s\S]*\})/,
    ];

    let jsonText: string | null = null;

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        jsonText = match[1].trim();
        break;
      }
    }

    if (!jsonText) {
      logger.error(`Failed to extract JSON for ${typeName}`);
      logger.debug(text.slice(0, 500));
      throw new Error(`No JSON found in response for ${typeName}`);
    }

    try {
      return JSON.parse(jsonText) as T;
    } catch (error) {
      logger.error(`Failed to parse JSON for ${typeName}`);
      logger.debug(jsonText.slice(0, 500));
      throw new Error(`Invalid JSON for ${typeName}: ${error}`);
    }
  }
}
