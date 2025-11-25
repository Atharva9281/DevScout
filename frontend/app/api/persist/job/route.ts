import { NextRequest } from "next/server";
import { pool, schemaReady } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await schemaReady;
    const { jobs } = await req.json();
    if (!Array.isArray(jobs)) {
      return new Response(JSON.stringify({ error: "jobs array required" }), { status: 400 });
    }

    for (const job of jobs) {
      const key = job.applicationUrl || job.sourceUrl || job.id;
      if (!key) continue;
      await pool.query(
        `insert into jobs (id, company, role, location, application_url, source_url, status, full_description, fetched_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         on conflict (id) do update set company=excluded.company, role=excluded.role, location=excluded.location, status=excluded.status, full_description=excluded.full_description, fetched_at=excluded.fetched_at, updated_at=now()`,
        [
          key,
          job.company,
          job.role,
          job.location || "N/A",
          job.applicationUrl,
          job.sourceUrl,
          job.status || "not_applied",
          job.fullDescription || "",
          job.fetchedAt || new Date().toISOString(),
        ],
      );
    }

    return new Response(JSON.stringify({ ok: true, count: jobs.length }), { status: 200 });
  } catch (err) {
    console.error("persist/job error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
}

export async function GET() {
  try {
    await schemaReady;
    const result = await pool.query(
        `select id, company, role, location, application_url, source_url, status, full_description, fetched_at, updated_at
       from jobs
       order by updated_at desc
       limit 200`,
    );
    const jobs = result.rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      company: row.company,
      role: row.role,
      location: row.location,
      applicationUrl: row.application_url,
      sourceUrl: row.source_url,
      status: row.status,
      updatedAt: row.updated_at,
      fetchedAt: row.fetched_at,
      fullDescription: row.full_description || "",
    }));
    return new Response(JSON.stringify({ jobs }), { status: 200 });
  } catch (err) {
    console.error("persist/job GET error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
}
