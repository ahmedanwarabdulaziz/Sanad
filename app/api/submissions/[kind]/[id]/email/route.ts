import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import {
  createMailer,
  emailShell,
  escapeHtml,
  MAIL_FROM_HEADER,
  SUBMISSION_TABLES,
  submissionsDb,
} from "@/lib/submissionStore";
import {
  addBusinessDays,
  PROJECT_EMAIL_FLOW,
  RESPONSE_BUSINESS_DAYS,
  type EmailLogEntry,
  type ProjectEmailType,
  type SubmissionKind,
} from "@/lib/submissionWorkflow";

// POST /api/submissions/[kind]/[id]/email — send the reviewed email and record it on the request
export async function POST(
  request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  const { kind, id } = await params;
  const table = SUBMISSION_TABLES[kind as SubmissionKind];
  if (!table) return NextResponse.json({ error: "نوع غير صالح" }, { status: 404 });

  const { type, subject, body } = await request.json();
  if (typeof subject !== "string" || !subject.trim() || typeof body !== "string" || !body.trim()) {
    return NextResponse.json({ error: "اكتب عنوان الرسالة ونصها" }, { status: 400 });
  }

  const { data: submission, error: fetchError } = await submissionsDb
    .from(table)
    .select("email, status, email_log")
    .eq("id", id)
    .single();
  if (fetchError || !submission) {
    return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  }

  const now = new Date();
  const update: Record<string, unknown> = { updated_at: now.toISOString() };

  if (kind === "project" || kind === "real_estate") {
    const flow = PROJECT_EMAIL_FLOW[type as ProjectEmailType];
    if (!flow) return NextResponse.json({ error: "نوع رسالة غير صالح" }, { status: 400 });
    if (!flow.from.includes(submission.status)) {
      return NextResponse.json({ error: "لا يمكن إرسال هذه الرسالة في حالة الطلب الحالية" }, { status: 409 });
    }
    update.status = flow.nextStatus;
    update.next_action_due_at = flow.startsDeadline
      ? addBusinessDays(now, RESPONSE_BUSINESS_DAYS).toISOString()
      : null;
  } else {
    if (type !== "reply") return NextResponse.json({ error: "نوع رسالة غير صالح" }, { status: 400 });
    if (submission.status === "NEW") update.status = "IN_PROGRESS";
  }

  try {
    await createMailer().sendMail({
      from: MAIL_FROM_HEADER,
      to: submission.email,
      replyTo: process.env.MAIL_FROM,
      subject: subject.trim(),
      html: emailShell(`<div style="white-space:pre-wrap;font-size:14px;">${escapeHtml(body.trim())}</div>`),
    });
  } catch (error) {
    console.error("Submission email failed:", error);
    return NextResponse.json({ error: "تعذر إرسال الرسالة، ولم تتغير حالة الطلب" }, { status: 502 });
  }

  const entry: EmailLogEntry = {
    type,
    subject: subject.trim(),
    body: body.trim(),
    sent_at: now.toISOString(),
    sent_by: auth.user.name,
  };
  const { data, error } = await submissionsDb
    .from(table)
    .update({ ...update, email_log: [...submission.email_log, entry] })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Submission email sent but not recorded:", error);
    return NextResponse.json({ error: "تم إرسال الرسالة لكن تعذر تحديث حالة الطلب" }, { status: 500 });
  }
  return NextResponse.json({ submission: data });
}
