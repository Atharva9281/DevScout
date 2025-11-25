import { NextRequest } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { id, status } = await req.json();
    if (!id || !status) {
      return new Response(JSON.stringify({ error: "id and status required" }), { status: 400 });
    }

    const res = await pool.query(`update jobs set status=$1, updated_at=now() where id=$2`, [status, id]);
    if (res.rowCount === 0) {
      return new Response(JSON.stringify({ error: "job not found" }), { status: 404 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
}
