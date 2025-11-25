import { NextRequest } from "next/server";
import { pool, schemaReady } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await schemaReady;
    const { analysis } = await req.json();
    if (!analysis || !analysis.job?.id) {
      return new Response(JSON.stringify({ error: "analysis with job.id required" }), { status: 400 });
    }

    const jobId = analysis.job.id;

    await pool.query(
      `insert into jobs (id, company, role, location, application_url, source_url, status, full_description, fetched_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (id) do update set status = excluded.status, full_description = excluded.full_description, fetched_at = excluded.fetched_at`,
      [
        jobId,
        analysis.job.company,
        analysis.job.role,
        analysis.job.location || "N/A",
        analysis.job.applicationUrl,
        analysis.job.sourceUrl,
        analysis.job.status || "not_applied",
        analysis.job.fullDescription || "",
        analysis.job.fetchedAt || new Date().toISOString(),
      ],
    );

    await pool.query(
      `insert into analyses (id, job_id, resume_id, summary, tailored_bullets, cover_letter, missing_skills, recommended_learning, fit_overall, fit_skills, fit_experience, suitability, saved_to)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       on conflict (id) do update
       set summary = excluded.summary,
           tailored_bullets = excluded.tailored_bullets,
           cover_letter = excluded.cover_letter,
           missing_skills = excluded.missing_skills,
           recommended_learning = excluded.recommended_learning,
           fit_overall = excluded.fit_overall,
           fit_skills = excluded.fit_skills,
           fit_experience = excluded.fit_experience,
           suitability = excluded.suitability,
           saved_to = excluded.saved_to,
           updated_at = now()`,
      [
        analysis.job.id,
        jobId,
        analysis.resumeId ?? null,
        analysis.summary,
        JSON.stringify(analysis.tailoredBullets || []),
        analysis.coverLetter,
        JSON.stringify(analysis.missingSkills || []),
        JSON.stringify(analysis.recommendedLearning || []),
        analysis.fitScores?.overall ?? 0,
        analysis.fitScores?.skills ?? 0,
        analysis.fitScores?.experience ?? 0,
        analysis.suitability ?? "",
        analysis.savedTo ?? null,
      ],
    );

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error("persist/analysis error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
}
