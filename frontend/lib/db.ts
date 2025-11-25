import { Pool } from "pg";

const connectionString = process.env.NEON_DATABASE_URL;

if (!connectionString) {
  throw new Error("NEON_DATABASE_URL not set");
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

// Ensure tables exist
async function ensureSchema() {
  await pool.query(`
    create table if not exists jobs (
      id text primary key,
      company text,
      role text,
      location text,
      application_url text,
      source_url text,
      status text default 'not_applied',
      full_description text,
      fetched_at timestamptz default now(),
      updated_at timestamptz default now()
    );
  `);

  // Backfill columns if table already existed without them
  await pool.query(`alter table jobs add column if not exists full_description text;`);
  await pool.query(`alter table jobs add column if not exists fetched_at timestamptz default now();`);

  await pool.query(`
    create table if not exists analyses (
      id text primary key,
      job_id text unique references jobs(id),
      resume_id text,
      summary text,
      tailored_bullets jsonb,
      cover_letter text,
      missing_skills jsonb,
      recommended_learning jsonb,
      fit_overall int,
      fit_skills int,
      fit_experience int,
      suitability text,
      saved_to text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
  `);
}

const schemaReady = ensureSchema().catch((err) => {
  console.error("DB schema init failed", err);
  throw err;
});

export { pool, schemaReady };
