import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { SUBMISSION_TABLES, submissionsDb } from "@/lib/submissionStore";
import type { SubmissionKind } from "@/lib/submissionWorkflow";

// GET /api/submissions/[kind] — list saved form submissions, newest first
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  const { kind } = await params;
  const table = SUBMISSION_TABLES[kind as SubmissionKind];
  if (!table) return NextResponse.json({ error: "نوع غير صالح" }, { status: 404 });

  const { data, error } = await submissionsDb
    .from(table)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Submissions list failed:", error);
    return NextResponse.json({ error: "فشل في تحميل الطلبات" }, { status: 500 });
  }
  return NextResponse.json({ submissions: data });
}
