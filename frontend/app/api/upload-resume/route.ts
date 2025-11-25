import { NextRequest } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const res = await fetch(`${BACKEND_URL}/api/upload-resume`, {
    method: "POST",
    body: form,
  });
  const blob = await res.blob();
  return new Response(blob, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") || "application/json",
    },
  });
}
