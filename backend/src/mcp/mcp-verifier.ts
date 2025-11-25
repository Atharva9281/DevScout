import type { ZypherAgent } from "@corespeed/zypher";
import logger from "../utils/logger.ts";
import { throwFatalError } from "../utils/error-handler.ts";

export interface MCPStatus {
  server: string;
  connected: boolean;
  tools: string[];
  error?: string;
}

export class MCPVerifier {
  private static extractToolNames(serverState: unknown): string[] {
    if (!serverState) return [];

    const candidates = [
      (serverState as { tools?: unknown }).tools,
      (serverState as { server?: { tools?: unknown } }).server?.tools,
      (serverState as { serverState?: { tools?: unknown } }).serverState?.tools,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate
          .map((tool) => {
            if (typeof tool === "string") return tool;
            if (tool && typeof tool === "object" && "name" in tool) {
              return (tool as { name?: string }).name ?? "";
            }
            return "";
          })
          .filter(Boolean);
      }
    }

    return [];
  }

  static async verifyConnections(agent: ZypherAgent): Promise<MCPStatus[]> {
    logger.info("Verifying MCP connections");

    const statuses: MCPStatus[] = [];

    const servers: string[] = [];

    for (const server of servers) {
      try {
        const serverState = agent.mcp.servers.find((s) => s.server.id === server);

        if (!serverState) {
          throwFatalError(
            `MCP server ${server} not registered`,
            "MCP_SERVER_NOT_FOUND",
          );
        }

        const tools = this.extractToolNames(serverState);

        statuses.push({
          server,
          connected: true,
          tools,
        });

        if (tools.length === 0) {
          logger.warn(`${server} MCP server registered but no tools reported`);
        } else {
          logger.success(`${server} MCP server registered (${tools.length} tools)`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throwFatalError(
          `MCP server ${server} failed: ${message}`,
          "MCP_CONNECTION_FAILED",
        );
      }
    }

    return statuses;
  }

  static async ensureRequiredTools(
    agent: ZypherAgent,
    required: string[],
    statuses?: MCPStatus[],
  ): Promise<void> {
    const statusList = statuses ?? await this.verifyConnections(agent);

    const allTools = statusList.flatMap((s) => s.tools);

    if (allTools.length === 0) {
      logger.warn(
        "Could not list MCP tools from servers; skipping strict tool validation",
      );
      return;
    }

    const missing = required.filter((t) => !allTools.includes(t));

    if (missing.length > 0) {
      throwFatalError(
        `Missing required tools: ${missing.join(", ")}`,
        "MISSING_REQUIRED_TOOLS",
      );
    }

    logger.success("All required tools available");
  }
}
