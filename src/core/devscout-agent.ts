import {
  AnthropicModelProvider,
  createZypherContext,
  ZypherAgent,
} from "@corespeed/zypher";
import logger from "../utils/logger.ts";
import { DevScoutOrchestrator } from "./orchestrator.ts";
import type { AppConfig } from "../types/index.ts";
import type { AnalysisResult } from "../types/index.ts";
import type { ExecutionStep } from "../types/index.ts";
import { throwFatalError } from "../utils/error-handler.ts";

export class DevScoutAgent {
  private agent!: ZypherAgent;
  private orchestrator!: DevScoutOrchestrator;
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
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

    await this.registerGitHubServer();
    await this.registerBraveServer();

    this.orchestrator = new DevScoutOrchestrator(
      this.agent,
      this.config.checkpointEnabled,
    );

    await this.orchestrator.initialize();

    logger.success("DevScout Agent ready");
  }

  private async registerGitHubServer(): Promise<void> {
    logger.info("Registering GitHub MCP server");

    try {
      await this.agent.mcp.registerServer({
        id: "github",
        type: "command",
        command: {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-github"],
          env: {
            GITHUB_TOKEN: this.config.githubToken,
          },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throwFatalError(
        `GitHub MCP server failed to start. Reason: ${message}`,
        "GITHUB_MCP_INIT_FAIL",
      );
    }
  }

  private async registerBraveServer(): Promise<void> {
    if (!this.config.braveApiKey) {
      logger.warn("Brave Search key missing. Web intelligence will fall back to neutral values");
      return;
    }

    logger.info("Registering Brave Search MCP server");

    try {
      await this.agent.mcp.registerServer({
        id: "brave-search",
        type: "command",
        command: {
          command: "npx",
          args: ["-y", "mcp-server-brave-search"],
          env: {
            BRAVE_API_KEY: this.config.braveApiKey,
          },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throwFatalError(
        `Brave Search MCP server failed to start. Reason: ${message}`,
        "BRAVE_MCP_INIT_FAIL",
      );
    }
  }

  async analyzeRepository(repo: string): Promise<AnalysisResult> {
    return await this.orchestrator.analyzeRepository(repo);
  }

  getSteps(): ExecutionStep[] {
    return this.orchestrator.getSteps();
  }
}
