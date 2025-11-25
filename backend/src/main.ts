import { Command } from "@cliffy/command";
import * as colors from "@std/fmt/colors";
import { join } from "@std/path";
import { loadConfig } from "./core/config.ts";
import { DevScoutAgent } from "./core/devscout-agent.ts";
import { ReportBuilder } from "./generators/report-builder.ts";
import { ensureDataDirectories, validateEnv } from "./utils/validators.ts";
import { handleError } from "./utils/error-handler.ts";
import type { JobListing, ResumeData } from "./types/index.ts";
import { readJsonFile } from "./utils/fs-helpers.ts";

const VERSION = "3.0.0";

async function main(): Promise<void> {
  await ensureDataDirectories();

  const cli = new Command()
    .name("devscout")
    .version(VERSION)
    .description("🎯 DevScout - AI Job Search Copilot (Zypher + MCP)");

  cli
    .command("search <query...>")
    .description("Search for jobs using Brave MCP")
    .action(async (_options, ...queryParts: string[]) => {
      try {
        validateEnv();
        const query = queryParts.join(" ");
        const config = await loadConfig();
        const agent = new DevScoutAgent(config);
        await agent.initialize();
        console.log(colors.cyan(`Searching jobs for: ${query}`));
        const result = await agent.searchJobs(query);
        const outPath = join(Deno.cwd(), "data", "jobs", `search_${Date.now()}.json`);
        await Deno.writeTextFile(outPath, JSON.stringify(result, null, 2));
        console.log(colors.green(`Saved ${result.results.length} jobs -> ${outPath}`));
      } catch (error) {
        handleError(error);
      }
    });

  cli
    .command("analyze <jobFile> <resumeFile>")
    .description("Analyze a job against a resume file (JSON resume)")
    .action(async (_options, jobFile: string, resumeFile: string) => {
      try {
        validateEnv();
        const job = await readJsonFile<JobListing>(jobFile);
        const resume = await readJsonFile<ResumeData>(resumeFile);
        const config = await loadConfig();
        const agent = new DevScoutAgent(config);
        await agent.initialize();

        console.clear();
        console.log(colors.bold(colors.cyan("\n🤖 DevScout - Job Fit Analysis\n")));
        console.log(colors.cyan(`🎯 ${job.company} • ${job.role}`));
        console.log(colors.gray(`📍 ${job.location}`));
        console.log(colors.gray(`🔗 ${job.applicationUrl}\n`));

        const result = await agent.analyzeJob(job, resume);
        const reportBuilder = new ReportBuilder();
        const markdown = reportBuilder.generate(result);
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        const mdPath = join(Deno.cwd(), "data", "reports", `${job.company}_${job.role}_${ts}.md`);
        const jsonPath = join(Deno.cwd(), "data", "reports", `${job.company}_${job.role}_${ts}.json`);
        await Deno.writeTextFile(mdPath, markdown);
        await Deno.writeTextFile(jsonPath, JSON.stringify(result, null, 2));

        console.log(colors.green("\n✨ Analysis Complete!\n"));
        console.log(colors.gray(`📁 Markdown: ${mdPath}`));
        console.log(colors.gray(`📦 JSON: ${jsonPath}\n`));

        // step timings
        console.log(colors.cyan("⏱️  Step Timing Breakdown:"));
        agent.getSteps().forEach((s) => {
          if (s.startTime && s.endTime) {
            const duration = ((s.endTime - s.startTime) / 1000).toFixed(2);
            const emoji = s.status === "completed" ? "✓" : "✗";
            console.log(colors.gray(`  ${emoji} ${s.name.padEnd(20)} ${duration}s`));
          }
        });
        console.log();
      } catch (error) {
        handleError(error);
      }
    });

  cli
    .command("serve")
    .description("Start API server for frontend")
    .option("-p, --port <port:number>", "Port to listen on", { default: 8000 })
    .action(async (options: { port: number }) => {
      const { startAPIServer } = await import("./api/analyze-api.ts");
      await startAPIServer(options.port);
    });

  await cli.parse(Deno.args);
}

if (import.meta.main) {
  await main();
}
