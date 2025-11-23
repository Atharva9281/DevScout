import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import logger from "./logger.ts";
import { throwFatalError } from "./error-handler.ts";

export function validateEnv(): void {
  const required = ["ANTHROPIC_API_KEY", "GITHUB_TOKEN"];
  const missing: string[] = [];

  for (const key of required) {
    if (!Deno.env.get(key)) missing.push(key);
  }

  if (missing.length > 0) {
    const msg =
      "Missing required environment variables:\n" +
      missing.map((v) => `  • ${v}`).join("\n") +
      "\n\nSetup:\n" +
      "1. Copy .env.example to .env\n" +
      "2. Get Anthropic API key: https://console.anthropic.com/\n" +
      "3. Get GitHub token: https://github.com/settings/tokens\n" +
      "4. Add keys to .env file";

    throwFatalError(msg, "INVALID_ENV");
  }
}

export function parseRepoUrl(url: string): { owner: string; repo: string } {
  const clean = url.replace(/\/+$/, "");

  const patterns = [
    /github\.com\/([^\/]+)\/([^\/]+)/,
    /github\.com:([^\/]+)\/([^\/]+)/,
    /git@github\.com:([^\/]+)\/([^\/]+)/,
    /^([^\/]+)\/([^\/]+)$/,
  ];

  for (const pattern of patterns) {
    const m = clean.match(pattern);
    if (m) {
      const owner = m[1].toLowerCase();
      const repo = m[2].replace(/\.git$/i, "").toLowerCase();
      return { owner, repo };
    }
  }

  throwFatalError(
    `Invalid GitHub URL: ${url}\nExpected: owner/repo or https://github.com/owner/repo`,
    "INVALID_REPO_URL",
  );
}

export async function ensureDataDirectories(): Promise<void> {
  const base = Deno.cwd();

  const dirs = [
    join(base, "data"),
    join(base, "data", "reports"),
    join(base, "data", "checkpoints"),
  ];

  for (const dir of dirs) {
    try {
      await ensureDir(dir);
      logger.debug(`Directory ready: ${dir}`);
    } catch {
      throwFatalError(`Failed to create directory: ${dir}`, "DIR_CREATE_FAIL");
    }
  }
}
