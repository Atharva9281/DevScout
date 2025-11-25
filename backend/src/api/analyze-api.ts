import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { DevScoutAgent } from "../core/devscout-agent.ts";
import { loadConfig } from "../core/config.ts";
import type { JobAnalysis, JobListing, JobSearchResult, ResumeData } from "../types/index.ts";
import { ReportBuilder } from "../generators/report-builder.ts";
import { ensureDataDirectories } from "../utils/validators.ts";
import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { writeJsonFile } from "../utils/fs-helpers.ts";
import { exists } from "@std/fs";
import { TextDecoder } from "node:util";

const uploadsDir = join(Deno.cwd(), "data", "uploads");
const jobsDir = join(Deno.cwd(), "data", "jobs");

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function jsonHeaders(): Headers {
  return new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
}

function sseHeaders(): Headers {
  return new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
}

function formatSteps(steps: { name: string; status: string; startTime?: number; endTime?: number }[]) {
  return steps.map((s) => ({
    name: s.name,
    status: s.status,
    durationSeconds: s.startTime && s.endTime ? (s.endTime - s.startTime) / 1000 : undefined,
  }));
}

async function saveResumeFile(file: File): Promise<string> {
  await ensureDir(uploadsDir);
  const arrayBuffer = await file.arrayBuffer();
  const safeName = file.name.replace(/[^\w.-]/g, "_");
  const path = join(uploadsDir, safeName);
  await Deno.writeFile(path, new Uint8Array(arrayBuffer));
  return path;
}

function extractText(buffer: Uint8Array, mime: string, filename: string): string {
  console.log(`📄 Extracting text from ${filename} (${mime}, ${buffer.length} bytes)`);
  
  const tryDecode = (encoding: string) => {
    try {
      const dec = new TextDecoder(encoding as any, { fatal: false });
      const decoded = dec.decode(buffer);
      const cleaned = decoded.replace(/[\u0000-\u001F]+/g, " ").replace(/\s+/g, " ").trim();
      return cleaned;
    } catch {
      return "";
    }
  };

  // Heuristic PDF extraction: pull printable sequences to reduce gibberish
  if ((mime || filename).toLowerCase().includes("pdf")) {
    console.warn("⚠️  PDF detected - using basic text extraction (may be incomplete)");
    console.warn("   For best results, convert PDF to .txt or .docx before uploading");
    
    const raw = tryDecode("latin1") || tryDecode("utf-8");
    if (raw) {
      // Extract text between common PDF text markers
      const textMarkers = raw.match(/\((.*?)\)/g);
      if (textMarkers && textMarkers.length > 10) {
        const extracted = textMarkers
          .map(m => m.slice(1, -1))
          .filter(t => t.length > 2)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (extracted.length > 100) {
          console.log(`✓ Extracted ${extracted.length} chars from PDF`);
          return extracted;
        }
      }
      
      // Fallback: extract printable sequences
      const tokens = raw.match(/[A-Za-z][A-Za-z\s,.]{8,}/g);
      if (tokens && tokens.length) {
        const joined = tokens.join(" ").replace(/\s+/g, " ").trim();
        if (joined.length > 100) {
          console.log(`✓ Extracted ${joined.length} chars using fallback`);
          return joined;
        }
      }
    }
    
    return "[PDF text extraction failed - please upload as .txt or .docx]\n\nName: [Your Name]\nSkills: [List your skills]\nExperience: [Your experience]";
  }

  // Plain text files
  const cleaned = tryDecode("utf-8") || tryDecode("latin1");
  if (cleaned && cleaned.length > 50) {
    console.log(`✓ Extracted ${cleaned.length} chars`);
    return cleaned;
  }

  console.error("✗ Failed to extract text");
  return "[Failed to extract resume text - please upload a plain text file]";
}

async function fetchJobDescription(url: string): Promise<string> {
  if (!url) return "";
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return "";
    const html = await res.text();
    // Strip scripts/styles and tags, keep readable text
    const noScripts = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
    const text = noScripts
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 12000); // cap to avoid huge payload
  } catch {
    return "";
  }
}

export async function startAPIServer(port = 8000): Promise<void> {
  await ensureDataDirectories();
  console.log(`🚀 DevScout API running on http://localhost:${port}`);

  await serve(async (req) => {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: sseHeaders() });
    }

    if (url.pathname === "/api/upload-resume" && req.method === "POST") {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return new Response(JSON.stringify({ error: "file required" }), {
          status: 400,
          headers: jsonHeaders(),
        });
      }
      const path = await saveResumeFile(file);
      const buffer = new Uint8Array(await file.arrayBuffer());
      const rawText = extractText(buffer, file.type, file.name);

      const resume: ResumeData = {
        id: crypto.randomUUID(),
        meta: {
          filename: file.name,
          uploadedAt: new Date().toISOString(),
          sizeBytes: buffer.length,
          mimeType: file.type,
        },
        rawText,
        structured: {},
      };

      await ensureDir(jobsDir);
      const resumePath = join(jobsDir, `resume_${resume.id}.json`);
      await writeJsonFile(resumePath, resume);

      return new Response(JSON.stringify({ resume, path: resumePath }), {
        status: 200,
        headers: jsonHeaders(),
      });
    }

    if (url.pathname === "/api/search" && req.method === "POST") {
      try {
        const { query } = await req.json();
        if (!query) {
          return new Response(JSON.stringify({ error: "query required" }), {
            status: 400,
            headers: jsonHeaders(),
          });
        }
        const config = await loadConfig();
        const agent = new DevScoutAgent(config);
        await agent.initialize();
        const results = await agent.searchJobs(query);
        // Enrich descriptions best-effort
        for (const job of results.results) {
          if (!job.fullDescription || job.fullDescription.length < 200) {
            const desc = await fetchJobDescription(job.applicationUrl || job.sourceUrl);
            if (desc) job.fullDescription = desc;
          }
          if (!job.fetchedAt) job.fetchedAt = results.fetchedAt;
        }
        await ensureDir(jobsDir);
        const outPath = join(jobsDir, `search_${Date.now()}.json`);
        await writeJsonFile<JobSearchResult>(outPath, results);
        return new Response(JSON.stringify({ ...results, savedTo: outPath }), { status: 200, headers: jsonHeaders() });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ error: message }), {
          status: 500,
          headers: jsonHeaders(),
        });
      }
    }

    if (url.pathname === "/api/analyze-job" && req.method === "POST") {
      try {
        const { job, resume, stream = true } = await req.json();
        if (!job || !resume) {
          return new Response(JSON.stringify({ error: "job and resume required" }), {
            status: 400,
            headers: jsonHeaders(),
          });
        }

        // Ensure job has description; skip refetch if we already have one
        if (!job.fullDescription || job.fullDescription.length < 200) {
          const desc = await fetchJobDescription(job.applicationUrl || job.sourceUrl);
          if (desc) job.fullDescription = desc;
        }

        if (!stream) {
          const config = await loadConfig();
          const agent = new DevScoutAgent(config);
          await agent.initialize();
          const result = await agent.analyzeJob(job as JobListing, resume as ResumeData);
          const steps = agent.getSteps();
          await ensureDir(jobsDir);
          const safeId = sanitizeId(result.job.id || crypto.randomUUID());
          const analysisPath = join(jobsDir, `analysis_${safeId}.json`);
          const resultWithPath = { ...result, savedTo: analysisPath };
          await writeJsonFile<JobAnalysis>(analysisPath, resultWithPath);
          return new Response(JSON.stringify({ result: resultWithPath, steps: formatSteps(steps), savedTo: analysisPath }), {
            status: 200,
            headers: jsonHeaders(),
          });
        }

        const headers = sseHeaders();
        const body = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            const sendEvent = (event: string, data: unknown) => {
              const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
              controller.enqueue(encoder.encode(message));
            };

            try {
            const config = await loadConfig();
            const agent = new DevScoutAgent(config, (event) => sendEvent(event.type, event.data));
            await agent.initialize();

            const startTime = Date.now();
            const result: JobAnalysis = await agent.analyzeJob(
              job as JobListing,
              resume as ResumeData,
            );
              const steps = agent.getSteps();
              await ensureDir(jobsDir);
              const safeId = sanitizeId(result.job.id || crypto.randomUUID());
              const analysisPath = join(jobsDir, `analysis_${safeId}.json`);
              const resultWithPath = { ...result, savedTo: analysisPath };
              await writeJsonFile<JobAnalysis>(analysisPath, resultWithPath);
              sendEvent("step", { steps: formatSteps(steps) });
              sendEvent("result", { result: resultWithPath, savedTo: analysisPath });
              sendEvent("done", { durationMs: Date.now() - startTime });
              controller.close();
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              sendEvent("error", { message });
              controller.close();
            }
          },
        });

        return new Response(body, { headers });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ error: message }), {
          status: 500,
          headers: jsonHeaders(),
        });
      }
    }

    if (url.pathname === "/api/render-report" && req.method === "POST") {
      try {
        const { result } = await req.json();
        if (!result) {
          return new Response(JSON.stringify({ error: "result payload required" }), {
            status: 400,
            headers: jsonHeaders(),
          });
        }
        const builder = new ReportBuilder();
        const markdown = builder.generate(result as JobAnalysis);
        return new Response(markdown, {
          status: 200,
          headers: {
            "Content-Type": "text/markdown",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ error: message }), {
          status: 500,
          headers: jsonHeaders(),
        });
      }
    }

    if (url.pathname === "/api/analysis" && req.method === "GET") {
      const jobId = url.searchParams.get("jobId");
      if (!jobId) {
        return new Response(JSON.stringify({ error: "jobId required" }), { status: 400, headers: jsonHeaders() });
      }
      const path = join(jobsDir, `analysis_${sanitizeId(jobId)}.json`);
      if (!(await exists(path))) {
        return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: jsonHeaders() });
      }
      const text = await Deno.readTextFile(path);
      return new Response(text, { status: 200, headers: jsonHeaders() });
    }

    return new Response("Not Found", { status: 404, headers: jsonHeaders() });
  }, { port });
}
