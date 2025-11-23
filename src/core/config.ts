import { load } from "dotenv";
import type { AppConfig } from "../types/index.ts";
import { throwFatalError } from "../utils/error-handler.ts";

await load({ export: true });

export async function loadConfig(): Promise<AppConfig> {
  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  const githubToken = Deno.env.get("GITHUB_TOKEN");
  const braveApiKey = Deno.env.get("BRAVE_API_KEY") || "";
  const checkpointEnabled = Deno.env.get("CHECKPOINT_ENABLED") !== "false";

  const logLevelRaw = Deno.env.get("LOG_LEVEL");
  const logLevel = (logLevelRaw as AppConfig["logLevel"]) || "info";

  if (!anthropicApiKey) {
    throwFatalError("ANTHROPIC_API_KEY not set", "MISSING_API_KEY");
  }

  if (!githubToken) {
    throwFatalError("GITHUB_TOKEN not set", "MISSING_GITHUB_TOKEN");
  }

  return {
    anthropicApiKey,
    githubToken,
    braveApiKey,
    checkpointEnabled,
    logLevel,
  };
}
