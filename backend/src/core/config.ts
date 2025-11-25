import { load } from "dotenv";
import type { AppConfig } from "../types/index.ts";
import { throwFatalError } from "../utils/error-handler.ts";

await load({ export: true });

export async function loadConfig(): Promise<AppConfig> {
  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY") || "";
  const checkpointEnabled = false;

  const logLevelRaw = Deno.env.get("LOG_LEVEL");
  const logLevel = (logLevelRaw as AppConfig["logLevel"]) || "info";

  if (!anthropicApiKey) {
    throwFatalError("ANTHROPIC_API_KEY not set", "MISSING_API_KEY");
  }

  return {
    anthropicApiKey,
    firecrawlApiKey,
    checkpointEnabled,
    logLevel,
  };
}
