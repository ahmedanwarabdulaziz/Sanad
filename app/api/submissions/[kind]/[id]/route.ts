import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { SUBMISSION_TABLES, submissionsDb } from "@/lib/submissionStore";
import { CONTACT_STATUS_LABELS, type SubmissionKind } from "@/lib/submissionWorkflow";

// PATCH /api/submissions/[kind]/[id] — save internal notes, or a contact request's status.
// A project request's status only changes by sending its email (see ./email/route.ts).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  const { kind, id } = await params;
  const table = SUBMISSION_TABLES[kind as SubmissionKind];
  if (!table) return NextResponse.json({ error: "نوع غير صالح" }, { status: 404 });

  const { notes, status } = await request.json();
  const update: Record<string, string> = { updated_at: new Date().toISOString() };
  if (typeof notes === "string") update.notes = notes;
  if (status !== undefined) {
    if (kind !== "contact" || !(status in CONTACT_STATUS_LABELS)) {
      return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
    }
    update.status = status;
  }

  const { data, error } = await submissionsDb
    .from(table)
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Submission update failed:", error);
    return NextResponse.json({ error: "فشل في حفظ التعديل" }, { status: 500 });
  }
  return NextResponse.json({ submission: data });
}
