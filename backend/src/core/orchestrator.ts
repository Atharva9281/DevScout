import type { ZypherAgent } from "@corespeed/zypher";
import { eachValueFrom } from "rxjs-for-await";
import logger from "../utils/logger.ts";
import { CheckpointManager } from "./checkpoint.ts";
import { MCPVerifier } from "../mcp/mcp-verifier.ts";
import { ProgressTracker } from "../utils/progress-tracker.ts";
import type {
  JobAnalysis,
  JobFitScores,
  JobListing,
  JobSearchResult,
  ResumeData,
  ExecutionStep,
} from "../types/index.ts";
import { loadConfig } from "./config.ts";

const MODEL_NAME = "claude-sonnet-4-0"; // Stable model ID

export type OrchestratorEventSink = (event: { type: string; data: unknown }) => void;

export class DevScoutOrchestrator {
  private checkpoints: CheckpointManager;
  private steps: ExecutionStep[] = [];
  private agent: ZypherAgent;
  private checkpointEnabled: boolean;
  private progressTracker?: ProgressTracker;
  private eventSink?: OrchestratorEventSink;

  constructor(agent: ZypherAgent, checkpointEnabled = false, eventSink?: OrchestratorEventSink) {
    this.agent = agent;
    this.checkpointEnabled = checkpointEnabled;
    this.checkpoints = new CheckpointManager(checkpointEnabled);
    this.eventSink = eventSink;
  }

  getSteps(): ExecutionStep[] {
    return this.steps;
  }

  async initialize(): Promise<void> {
    logger.info("Initializing orchestrator...");
    const statuses = await MCPVerifier.verifyConnections(this.agent);
    await MCPVerifier.ensureRequiredTools(this.agent, [], statuses);
    logger.success("Orchestrator ready");
  }

  async searchJobs(query: string): Promise<JobSearchResult> {
    const start = Date.now();
    this.steps = [{ name: "Job Search", agent: "search", status: "pending" }];
    this.progressTracker = new ProgressTracker(1, ["Job Search"]);
    this.progressTracker.start();
    this.emitStep();

    try {
      const results = await this.executeStep(0, async () => await this.runJobSearch(query));
      return {
        query,
        results,
        fetchedAt: new Date().toISOString(),
      };
    } finally {
      this.progressTracker?.stop();
      this.emitStep();
      logger.info(`Search finished in ${((Date.now() - start) / 1000).toFixed(1)}s`);
    }
  }

  async analyzeJob(job: JobListing, resume: ResumeData): Promise<JobAnalysis> {
    const startTime = Date.now();
    this.steps = [
      { name: "Requirements", agent: "requirements", status: "pending" },
      { name: "Resume Alignment", agent: "alignment", status: "pending" },
      { name: "Draft Content", agent: "content", status: "pending" },
      { name: "Synthesis", agent: "synthesis", status: "pending" },
    ];

    this.progressTracker = new ProgressTracker(
      this.steps.length,
      this.steps.map((s) => s.name),
    );
    this.progressTracker.start();
    this.emitStep();

    logger.info(`\n📋 Execution Plan: ${job.company} - ${job.role}`);
    this.steps.forEach((step, i) => logger.info(`  ${i + 1}. ${step.name}`));
    console.log();

    try {
      const requirements = await this.executeStep(
        0,
        async () => await this.runRequirements(job),
      );

      const alignment = await this.executeStep(
        1,
        async () => await this.runAlignment(job, resume, requirements),
      );

      const content = await this.executeStep(
        2,
        async () => await this.runContent(job, resume, alignment),
      );

      const fitScores = this.calculateFitScores(alignment);

      const synthesis = await this.executeStep(
        3,
        async () => await this.runSynthesis(job, resume, alignment, content, fitScores),
      );

      return {
        job,
        resumeId: resume.id,
        summary: synthesis.summary,
        tailoredBullets: content.tailoredBullets,
        coverLetter: content.coverLetter,
        missingSkills: alignment.missingSkills,
        recommendedLearning: alignment.recommendedLearning,
        fitScores,
        suitability: synthesis.suitability,
      };
    } finally {
      this.progressTracker?.stop();
      this.emitStep();
      logger.info(`Analysis finished in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    }
  }

  // --- Step implementations ---

  private async runJobSearch(query: string): Promise<JobListing[]> {
    // Use Firecrawl REST API directly (more reliable than MCP tool listing)
    const config = await loadConfig();
    if (!config.firecrawlApiKey) {
      throw new Error("FIRECRAWL_API_KEY missing");
    }

    const payload = {
      query: `(${query}) (site:greenhouse.io OR site:lever.co OR site:ashbyhq.com OR site:wellfound.com OR site:ycombinator.com OR site:workday.com)`,
      limit: 12,
    };
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.firecrawlApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Firecrawl search failed: ${res.status} ${text}`);
    }

    const data = await res.json();
    const candidates =
      Array.isArray(data) ? data :
      Array.isArray(data.results) ? data.results :
      Array.isArray(data.data) ? data.data : [];

    logger.debug(`Firecrawl raw candidates: ${candidates.length}`);

    const isLikelyJob = (url: string): boolean => {
      if (!url) return false;
      const lower = url.toLowerCase();
      if (!lower.startsWith("http")) return false;
      if (lower.includes("/search") || lower.includes("q=") || lower.includes("jobs?")) return false;
      const jobPatterns = [/greenhouse\.io\/.*\/jobs\/\d+/, /lever\.co\/.*\/job\/\w+/, /ashbyhq\.com\/jobs\//, /wellfound\.com\/.*\/jobs\//, /ycombinator\.com\/companies\/.*\/jobs\//, /workday\.com\/.*\/job/];
      return jobPatterns.some((r) => r.test(lower));
    };

    const mapped: JobListing[] = candidates
      .map((item: Record<string, unknown>) => {
        const url = item.url || item.sourceUrl || item.applicationUrl || item.link || "";
        return {
          id: url || item.id || crypto.randomUUID(),
          company: item.company || item.siteName || item.source || item.title || "Unknown",
          role: item.role || item.title || query,
          location: item.location || item.geo || "N/A",
          applicationUrl: url,
          sourceUrl: url,
          fullDescription: item.content || item.description || item.fullDescription || "",
          salary: item.salary || "",
          postedDate: item.postedDate || item.date || "",
          source: "firecrawl",
        };
      })
      .filter((job: JobListing) => isLikelyJob(job.applicationUrl) && (job.fullDescription?.length || 0) > 50);

    logger.debug(`Firecrawl filtered jobs: ${mapped.length}`);
    mapped.slice(0, 3).forEach((j, idx) => logger.debug(`Job ${idx + 1}: ${j.applicationUrl}`));

    const seen = new Set<string>();
    return mapped
      .filter((r) => {
        const key = r.sourceUrl || r.applicationUrl || r.id;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 5)
      .map((r): JobListing => ({
        ...r,
        location: r.location || "N/A",
      }));
  }

  private async runRequirements(job: JobListing): Promise<{
    requirements: string[];
    mustHave: string[];
    niceToHave: string[];
  }> {
    const desc = (job.fullDescription || "").slice(0, 4000);
    const prompt = `You are a JSON-only extractor. Do NOT invoke tools. Respond with a single JSON object and nothing else.
Extract requirements from this job description. If a field is unknown, return an empty array.
{
  "requirements": ["..."],
  "mustHave": ["..."],
  "niceToHave": ["..."]
}
Job Title: ${job.role}
Company: ${job.company}
Description: ${desc}`;
    const response = await this.runAgentTask(prompt);
    return this.parseJSON(response, "Requirements", {
      requirements: [],
      mustHave: [],
      niceToHave: [],
    });
  }

  private async runAlignment(
    job: JobListing,
    resume: ResumeData,
    reqs: { requirements: string[]; mustHave: string[]; niceToHave: string[] },
  ): Promise<{
    matchedSkills: string[];
    missingSkills: string[];
    recommendedLearning: string[];
  }> {
    const resumeText = (resume.rawText || "").slice(0, 3000);
    const prompt = `You are a JSON-only extractor. Do NOT invoke tools. Respond with a single JSON object and nothing else.
Compare resume to job requirements. If a field is unknown, return an empty array.
{
  "matchedSkills": ["..."],
  "missingSkills": ["..."],
  "recommendedLearning": ["..."]
}
Job: ${job.role} at ${job.company}
Must Have: ${reqs.mustHave.join(", ")}
Nice To Have: ${reqs.niceToHave.join(", ")}
Resume Text:
${resumeText}`;
    const response = await this.runAgentTask(prompt);
    return this.parseJSON(response, "Alignment", {
      matchedSkills: [],
      missingSkills: [],
      recommendedLearning: [],
    });
  }

  private async runContent(
    job: JobListing,
    resume: ResumeData,
    alignment: { matchedSkills: string[]; missingSkills: string[]; recommendedLearning: string[] },
  ): Promise<{ tailoredBullets: string[]; coverLetter: string }> {
    const resumeText = (resume.rawText || "").slice(0, 3000);
    const prompt = `You are a JSON-only generator. Do NOT invoke tools. Respond with a single JSON object and nothing else.
Write tailored resume bullets (3-5) and a cover letter between 250 and 400 words for ${job.role} at ${job.company}.
Use resume context and matched skills. No extra commentary. If a field is unknown, return empty arrays/strings.
{
  "tailoredBullets": ["..."],
  "coverLetter": "paragraph"
}
Resume:
${resumeText}
Matched skills: ${alignment.matchedSkills.join(", ")}
Missing skills: ${alignment.missingSkills.join(", ")}`;
    const response = await this.runAgentTask(prompt);
    return this.parseJSON(response, "Content", { tailoredBullets: [], coverLetter: "" });
  }

  private async runSynthesis(
    job: JobListing,
    resume: ResumeData,
    alignment: { matchedSkills: string[]; missingSkills: string[]; recommendedLearning: string[] },
    content: { tailoredBullets: string[]; coverLetter: string },
    scores: JobFitScores,
  ): Promise<{ summary: string; suitability: string }> {
    const prompt = `You are a JSON-only generator. Do NOT invoke tools. Respond with a single JSON object and nothing else.
Synthesize findings for ${job.role} at ${job.company}. If unknown, return empty strings.
{
  "summary": "2-3 sentences",
  "suitability": "clear label e.g., strong fit, moderate fit, weak fit"
}
Scores: fit=${scores.fit}, skills=${scores.skills}, experience=${scores.experience}, overall=${scores.overall}
Matched: ${alignment.matchedSkills.join(", ")}
Missing: ${alignment.missingSkills.join(", ")}
Bullets: ${content.tailoredBullets.join(" | ")}
Cover letter: ${content.coverLetter.slice(0, 200)}
Resume: ${resume.rawText.slice(0, 800)}`;
    const response = await this.runAgentTask(prompt);
    return this.parseJSON(response, "Synthesis", { summary: "", suitability: "" });
  }

  // --- Helpers ---

  private calculateFitScores(alignment: { matchedSkills: string[]; missingSkills: string[] }): JobFitScores {
    const total = alignment.matchedSkills.length + alignment.missingSkills.length || 1;
    const skills = Math.min(100, Math.round((alignment.matchedSkills.length / total) * 100));
    const fit = Math.min(100, Math.round(skills * 0.7));
    const experience = Math.min(100, Math.round(skills * 0.8));
    const overall = Math.round((fit + skills + experience) / 3);
    return { fit, skills, experience, overall };
  }

  private async executeStep<T>(index: number, fn: () => Promise<T>): Promise<T> {
    const step = this.steps[index];
    step.status = "running";
    step.startTime = Date.now();
    logger.step(index + 1, this.steps.length, step.name);
    this.progressTracker?.setStep(index, "running");
    this.emitStep();

    try {
      const result = await fn();
      step.status = "completed";
      step.endTime = Date.now();
      step.result = result;
      const duration = (step.endTime - step.startTime!) / 1000;
      this.progressTracker?.setStep(index, "completed", duration);
      this.emitStep();

      if (this.checkpointEnabled) {
        await this.checkpoints.save({
          currentStep: index,
          completedSteps: this.steps.slice(0, index + 1),
          context: {},
          timestamp: Date.now(),
        });
      }

      logger.success(`Completed in ${duration.toFixed(1)}s`);
      return result;
    } catch (error) {
      step.status = "failed";
      step.error = error instanceof Error ? error.message : String(error);
      step.endTime = Date.now();
      const duration = step.startTime ? (step.endTime - step.startTime) / 1000 : undefined;
      this.progressTracker?.setStep(index, "failed", duration);
      this.emitStep();
      logger.error(`Step failed: ${step.error}`);
      throw error;
    }
  }

  private async runAgentTask(prompt: string): Promise<string> {
    let response = "";
    let eventCount = 0;
    
    const event$ = this.agent.runTask(prompt, MODEL_NAME);

    logger.debug(`\n>>> Calling agent (model: ${MODEL_NAME})`);

    try {
      for await (const event of eachValueFrom(event$)) {
        eventCount++;
        const evt = event as unknown as Record<string, unknown>;
        logger.debug(`[Event ${eventCount}] type: ${evt.type}`);
        
        switch (evt.type) {
          case "text":
          case "text_delta":
            if (typeof evt.text === "string") {
              logger.debug(`  ✓ text: ${evt.text.length} chars`);
              response += evt.text;
            }
            if (typeof evt.delta === "string") {
              logger.debug(`  ✓ delta: ${evt.delta.length} chars`);
              response += evt.delta;
            }
            break;
          case "message":
          case "content_block_delta":
            if (evt.message && typeof evt.message === "object") {
              const msg = evt.message as { content?: Array<{ type?: string; text?: string }> };
              if (Array.isArray(msg.content)) {
                for (const block of msg.content) {
                  if (block.type === "text" && typeof block.text === "string") {
                    logger.debug(`  ✓ message text: ${block.text.length} chars`);
                    response += block.text;
                  }
                }
              }
            }
            if (evt.delta && typeof evt.delta === "object") {
              const delta = evt.delta as { text?: string };
              if (typeof delta.text === "string") {
                logger.debug(`  ✓ delta text: ${delta.text.length} chars`);
                response += delta.text;
              }
            }
            break;
          case "tool_use":
            logger.warn(`  ⚠️ Tool call detected (should be disabled): ${typeof evt.toolName === "string" ? evt.toolName : "unknown"}`);
            break;
          case "error":
            logger.error(`  ✗ Agent error: ${JSON.stringify(evt)}`);
            break;
          default:
            logger.debug(`  ? Unknown event type`);
            break;
        }
      }
    } catch (error) {
      logger.error(`Exception while processing events: ${error}`);
      throw error;
    }

    logger.debug(`<<< Received ${eventCount} events, total response: ${response.length} chars\n`);
    
    if (response.length === 0) {
      throw new Error(`Agent returned empty response after ${eventCount} events`);
    }
    
    return response;
  }

  private parseJSON<T>(text: string, typeName: string, fallback?: T): T {
    // Log full raw response for debugging
    logger.debug(`\n=== RAW RESPONSE for ${typeName} ===\n${text}\n=== END ===\n`);

    // Try extracting JSON with multiple strategies
    const patterns = [
      /```json\s*([\s\S]*?)```/i,
      /```\s*([\s\S]*?)```/,
      /\{[\s\S]*\}/,
    ];

    let jsonText: string | null = null;

    // Strategy 1: Try regex patterns
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        jsonText = (match[1] || match[0]).trim();
        // Try parsing immediately
        try {
          const parsed = JSON.parse(jsonText);
          logger.debug(`✓ Extracted JSON using pattern: ${pattern}`);
          return parsed as T;
        } catch {
          continue;
        }
      }
    }

    // Strategy 2: Find first { to last }
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first !== -1 && last > first) {
      jsonText = text.slice(first, last + 1).trim();
      try {
        const parsed = JSON.parse(jsonText);
        logger.debug(`✓ Extracted JSON using brace matching`);
        return parsed as T;
      } catch (error) {
        logger.warn(`Brace extraction failed: ${error}`);
      }
    }

    // Strategy 3: Try to clean common issues
    const cleaned = text
      .replace(/^[^{]*/, "") // remove before first {
      .replace(/[^}]*$/, "") // remove after last }
      .trim();
    
    if (cleaned) {
      try {
        const parsed = JSON.parse(cleaned);
        logger.debug(`✓ Extracted JSON after cleaning`);
        return parsed as T;
      } catch (error) {
        logger.warn(`Cleaned extraction failed: ${error}`);
      }
    }

    // Failed all strategies
    logger.error(`❌ Failed to extract JSON for ${typeName}`);
    logger.error(`Raw response preview: ${text.slice(0, 500)}`);
    if (fallback !== undefined) {
      logger.warn(`Using fallback for ${typeName}`);
      return fallback;
    }
    throw new Error(`No valid JSON found in response for ${typeName}`);
  }

  private emitStep(): void {
    this.eventSink?.({ type: "step", data: { steps: this.steps } });
  }
}
