import {
  AnthropicModelProvider,
  createZypherContext,
  ZypherAgent,
} from "@corespeed/zypher";
import logger from "../utils/logger.ts";
import { DevScoutOrchestrator, type OrchestratorEventSink } from "./orchestrator.ts";
import type {
  AppConfig,
  ExecutionStep,
  JobAnalysis,
  JobListing,
  JobSearchResult,
  ResumeData,
} from "../types/index.ts";
import { throwFatalError } from "../utils/error-handler.ts";

export class DevScoutAgent {
  private agent!: ZypherAgent;
  private orchestrator!: DevScoutOrchestrator;
  private config: AppConfig;
  private eventSink?: OrchestratorEventSink;

  constructor(config: AppConfig, eventSink?: OrchestratorEventSink) {
    this.config = config;
    this.eventSink = eventSink;
  }

  async initialize(): Promise<void> {
    logger.setLevel(this.config.logLevel);
    logger.info("Starting DevScout Agent with Zypher");

    const zypherContext = await createZypherContext(Deno.cwd());

    this.agent = new ZypherAgent(
      zypherContext,
      new AnthropicModelProvider({
        apiKey: this.config.anthropicApiKey,
      }),
    );

    // Firecrawl search now uses REST directly; skip MCP registration to avoid tool call failures during analysis.

    this.orchestrator = new DevScoutOrchestrator(
      this.agent,
      this.config.checkpointEnabled,
      this.eventSink,
    );

    await this.orchestrator.initialize();

    logger.success("DevScout Agent ready");
  }

  private async registerFirecrawlServer(): Promise<void> {
    if (!this.config.firecrawlApiKey) {
      logger.warn("FIRECRAWL_API_KEY missing; web search may be unavailable.");
      return;
    }

    logger.info("Registering Firecrawl MCP server");

    try {
      await this.agent.mcp.registerServer({
        id: "firecrawl",
        type: "command",
        command: {
          command: "npx",
          args: ["-y", "firecrawl-mcp"],
          env: {
            FIRECRAWL_API_KEY: this.config.firecrawlApiKey,
          },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throwFatalError(
        `Firecrawl MCP server failed to start. Reason: ${message}`,
        "FIRECRAWL_MCP_INIT_FAIL",
      );
    }
  }

  async searchJobs(query: string): Promise<JobSearchResult> {
    return await this.orchestrator.searchJobs(query);
  }

  async analyzeJob(job: JobListing, resume: ResumeData): Promise<JobAnalysis> {
    return await this.orchestrator.analyzeJob(job, resume);
  }

  getSteps(): ExecutionStep[] {
    return this.orchestrator.getSteps();
  }
}
