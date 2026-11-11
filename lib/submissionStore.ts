import { randomBytes, randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { r2, R2_BUCKET } from "@/lib/r2";
import type { SubmissionFile, SubmissionKind } from "@/lib/submissionWorkflow";

export const submissionsDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const SUBMISSION_TABLES: Record<SubmissionKind, string> = {
  project: "project_submissions",
  contact: "contact_submissions",
  real_estate: "real_estate_submissions",
};

export const TEAM_RECIPIENTS = [process.env.MAIL_FROM!, "ahmedanwarabdulaziz@gmail.com"];

// Saved on a request that tripped the hidden spam field: it could still be a real person,
// so it's kept for review, but no emails go out because the address may not be theirs.
export const SUSPECTED_SPAM_NOTE = "⚠️ اشتبه النظام في أن هذا الطلب آلي، ولم تُرسل عنه أي إيميلات. راجعه قبل الرد.";

export const MAIL_FROM_HEADER = `"سند للمشروعات" <${process.env.MAIL_FROM}>`;
const LOGO_URL = "https://www.sanadproprojects.com/images/long%20logo.png";

export function createMailer() {
  const port = Number(process.env.SMTP_PORT);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function emailShell(body: string) {
  return `
    <div dir="rtl" style="background:#f4f5f7;padding:24px 12px;font-family:Tahoma,Arial,sans-serif;color:#1f2937;line-height:1.8;text-align:right;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:#154278;padding:18px 24px;text-align:center;">
          <img src="${LOGO_URL}" alt="Sanad Pro Capital" height="56" style="height:56px;width:auto;" />
        </div>
        <div style="padding:24px;">${body}</div>
      </div>
    </div>
  `;
}

export function createReference(prefix: "SP" | "CT" | "RE" | "UE") {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  return `${prefix}-${date}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

/** Reads a form's JSON payload, keeping only the known fields with the expected types. */
export function parseFormPayload<T extends object>(raw: string, empty: T): T | null {
  try {
    const parsed = JSON.parse(raw);
    const values = { ...empty } as Record<string, unknown>;
    for (const [key, expected] of Object.entries(empty)) {
      const incoming = parsed[key];
      if (Array.isArray(expected)) {
        if (Array.isArray(incoming)) values[key] = incoming.filter((v) => typeof v === "string");
      } else if (typeof expected === "boolean") {
        values[key] = incoming === true;
      } else if (typeof incoming === "string") {
        values[key] = incoming.trim();
      }
    }
    return values as T;
  } catch {
    return null;
  }
}

/**
 * Stores attachments under a random key. The email still carries a copy, so a failed
 * upload is logged and skipped rather than failing the whole submission.
 */
export async function storeSubmissionFiles(
  kind: SubmissionKind,
  files: { name: string; type: string; content: Buffer }[]
): Promise<SubmissionFile[]> {
  const stored: SubmissionFile[] = [];
  for (const file of files) {
    const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
    const key = `submissions/${kind}/${randomUUID()}${extension.replace(/[^a-zA-Z0-9.]/g, "")}`;
    try {
      await r2.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          Body: file.content,
          ContentType: file.type || "application/octet-stream",
        })
      );
      stored.push({ name: file.name, key, size: file.content.length });
    } catch (error) {
      console.error(`Submission file upload failed (${file.name}):`, error);
    }
  }
  return stored;
}
