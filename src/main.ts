import { Command } from "@cliffy/command";
import * as colors from "@std/fmt/colors";
import { join } from "@std/path";
import { loadConfig } from "./core/config.ts";
import { DevScoutAgent } from "./core/devscout-agent.ts";
import { ReportBuilder } from "./generators/report-builder.ts";
import {
  ensureDataDirectories,
  parseRepoUrl,
  validateEnv,
} from "./utils/validators.ts";
import { handleError } from "./utils/error-handler.ts";

const VERSION = "2.0.0";

async function main(): Promise<void> {
  await ensureDataDirectories();

  const cli = new Command()
    .name("devscout")
    .version(VERSION)
    .description(
      "🔍 DevScout - Autonomous AI Agent for Repository Intelligence\n\nPowered by Zypher Agent Framework + Claude Sonnet 4",
    );

  cli
    .command("analyze <repo>")
    .description("Autonomously analyze a GitHub repository")
    .example("facebook/react", "Analyze React repository")
    .example(
      "https://github.com/django/django",
      "Analyze using full URL",
    )
    .action(async (_options: Record<string, unknown>, repoInput: string) => {

      try {
        validateEnv();

        const { owner, repo } = parseRepoUrl(repoInput);
        const repoName = `${owner}/${repo}`;

        console.clear();

        console.log(colors.bold(colors.cyan(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ██████  ███████ ██    ██ ███████  ██████  ██████  ██    ║
║   ██   ██ ██      ██    ██ ██      ██      ██    ██ ██    ║
║   ██   ██ █████   ██    ██ ███████ ██      ██    ██ ██    ║
║   ██   ██ ██       ██  ██       ██ ██      ██    ██       ║
║   ██████  ███████   ████   ███████  ██████  ██████  ██    ║
║                                                            ║
║            Autonomous Repository Intelligence             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`)));

        console.log(colors.cyan(`🎯 Target: ${colors.bold(repoName)}`));
        console.log(colors.gray(`⚙️  Agent: Zypher (Claude Sonnet 4)`));
        console.log(colors.gray(`🏗️  Architecture: Multi-step Orchestration`));
        console.log(colors.gray(`📅 ${new Date().toLocaleString()}`));
        console.log("\n" + colors.gray("═".repeat(60)) + "\n");

        const config = await loadConfig();
        const agent = new DevScoutAgent(config);
        await agent.initialize();

        console.log();
        const result = await agent.analyzeRepository(repoName);

        console.log();
        console.log(colors.cyan("📝 Generating report..."));

        const reportBuilder = new ReportBuilder();
        const markdown = reportBuilder.generate(result);

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `${repoName.replace("/", "_")}_${timestamp}.md`;
        const reportPath = join(Deno.cwd(), "data", "reports", filename);
        await Deno.writeTextFile(reportPath, markdown);

        // Export JSON alongside markdown
        const jsonFilename = `${repoName.replace("/", "_")}_${timestamp}.json`;
        const jsonPath = join(Deno.cwd(), "data", "reports", jsonFilename);
        await Deno.writeTextFile(jsonPath, JSON.stringify(result, null, 2));

        console.log("\n" + "─".repeat(60));
        console.log(colors.green("\n✨ Analysis Complete!\n"));
        console.log(
          colors.cyan(`📊 Overall Score: ${result.scores.overall}/10`),
        );
        console.log(colors.gray(`📁 Markdown: ${reportPath}`));
        console.log(colors.gray(`📦 JSON: ${jsonPath}`));
        console.log(
          colors.gray(
            `⏱️  Duration: ${(result.duration / 1000).toFixed(1)}s\n`,
          ),
        );

        // Step timing breakdown
        console.log(colors.cyan("\n⏱️  Step Timing Breakdown:"));
        const steps = agent.getSteps();
        steps.forEach((s) => {
          if (s.startTime && s.endTime) {
            const duration = ((s.endTime - s.startTime) / 1000).toFixed(2);
            const emoji = s.status === "completed" ? "✓" : "✗";
            console.log(
              colors.gray(
                `  ${emoji} ${s.name.padEnd(20)} ${duration}s`,
              ),
            );
          }
        });
        console.log();
      } catch (error) {
        handleError(error);
      }
    });

  await cli.parse(Deno.args);
}

if (import.meta.main) {
  await main();
}
