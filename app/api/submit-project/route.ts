import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import {
  ALLOWED_FILE_EXTENSIONS,
  EMPTY_SUBMISSION,
  MAX_FILES,
  MAX_TOTAL_FILE_BYTES,
  ProjectSubmission,
  REQUEST_TYPES,
  toLatinDigits,
  validateSubmission,
} from "@/lib/submitProject";

const TEAM_RECIPIENTS = [process.env.MAIL_FROM!, "ahmedanwarabdulaziz@gmail.com"];
const LOGO_URL = "https://www.sanadproprojects.com/images/long%20logo.png";
// Bots post the form as soon as it loads; a person can't get through all steps this fast.
const MIN_FILL_MS = 5000;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createReference() {
  const now = new Date();
  const date = now.toISOString().slice(2, 10).replace(/-/g, "");
  return `SP-${date}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

function parseSubmission(raw: string): ProjectSubmission | null {
  try {
    const parsed = JSON.parse(raw);
    const values: ProjectSubmission = { ...EMPTY_SUBMISSION };
    for (const key of Object.keys(EMPTY_SUBMISSION) as (keyof ProjectSubmission)[]) {
      const expected = EMPTY_SUBMISSION[key];
      const incoming = parsed[key];
      if (Array.isArray(expected)) {
        if (Array.isArray(incoming)) {
          (values[key] as string[]) = incoming.filter((v): v is string => typeof v === "string");
        }
      } else if (typeof expected === "boolean") {
        (values[key] as boolean) = incoming === true;
      } else if (typeof incoming === "string") {
        (values[key] as string) = incoming.trim();
      }
    }
    return values;
  } catch {
    return null;
  }
}

function emailShell(body: string) {
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

function teamEmailHtml(values: ProjectSubmission, requestLabel: string, reference: string) {
  const isIdea = values.requestType === "idea";
  const sections: [string, [string, string][]][] = [
    [
      "بيانات مقدم الطلب",
      [
        ["الاسم", values.fullName],
        ["الهاتف", values.phone],
        ["البريد الإلكتروني", values.email],
        ["الشركة", values.company],
        ["المسمى الوظيفي", values.jobTitle],
      ],
    ],
    [
      "بيانات المشروع",
      [
        ["اسم المشروع", values.projectName],
        ["القطاع", values.sector],
        ["الموقع", values.location],
        ...(isIdea
          ? ([["مرحلة الفكرة", values.ideaStage]] as [string, string][])
          : ([
              ["سنة التأسيس", values.foundedYear],
              ["الإيرادات السنوية", values.annualRevenue],
              ["حجم فريق العمل", values.teamSize],
            ] as [string, string][])),
        ["وصف المشروع", values.description],
        ["ما يميز المشروع", values.advantage],
      ],
    ],
    [
      "الاستثمار المطلوب",
      [
        ["حجم التمويل المطلوب", values.fundingRange],
        ["استخدام التمويل", values.useOfFunds],
        ["نوع الدعم المطلوب", values.supportTypes.join("، ")],
        ["المستندات المتوفرة", values.availableDocuments.join("، ")],
        ["رابط المستندات", values.documentsLink],
      ],
    ],
  ];

  const rendered = sections
    .map(([title, rows]) => {
      const cells = rows
        .filter(([, value]) => value)
        .map(
          ([label, value]) => `
            <tr>
              <td style="padding:8px 0 8px 12px;color:#6b7280;vertical-align:top;white-space:nowrap;font-size:13px;">${label}</td>
              <td style="padding:8px 0;white-space:pre-wrap;font-size:14px;">${escapeHtml(value)}</td>
            </tr>`
        )
        .join("");
      return `
        <h3 style="margin:24px 0 4px;padding-bottom:8px;border-bottom:2px solid #C29B40;color:#154278;font-size:16px;">${title}</h3>
        <table style="width:100%;border-collapse:collapse;">${cells}</table>`;
    })
    .join("");

  return emailShell(`
    <h2 style="margin:0 0 4px;color:#154278;font-size:20px;">طلب مشروع جديد: ${escapeHtml(requestLabel)}</h2>
    <p style="margin:0;color:#6b7280;font-size:13px;">رقم الطلب: <span dir="ltr">${reference}</span></p>
    ${rendered}
  `);
}

// Anyone can type any address into the form, so this email carries no free text beyond the
// sender's name, to keep it from being usable for sending arbitrary content to third parties.
function confirmationEmailHtml(values: ProjectSubmission, requestLabel: string, reference: string) {
  return emailShell(`
    <h2 style="margin:0 0 12px;color:#154278;font-size:20px;">وصلنا طلبك، شكرًا لك</h2>
    <p style="margin:0 0 12px;">مرحبًا ${escapeHtml(values.fullName)}،</p>
    <p style="margin:0 0 16px;">نشكرك على اهتمامك بالتواصل مع سند برو كابيتال للمشروعات. استلمنا طلبك بنجاح، وسيقوم فريقنا بمراجعة بيانات مشروعك، وسنتواصل معك عند الحاجة إلى مزيد من التفاصيل أو لتحديد الخطوة التالية.</p>
    <div style="background:#f8f9fa;border-radius:8px;padding:14px 16px;margin-bottom:16px;">
      <div style="font-size:13px;color:#6b7280;">نوع الطلب</div>
      <div style="font-weight:bold;color:#154278;margin-bottom:8px;">${escapeHtml(requestLabel)}</div>
      <div style="font-size:13px;color:#6b7280;">رقم الطلب</div>
      <div dir="ltr" style="font-weight:bold;color:#154278;text-align:right;">${reference}</div>
    </div>
    <p style="margin:0 0 16px;font-size:13px;color:#6b7280;">يرجى الاحتفاظ برقم الطلب لاستخدامه عند التواصل معنا. لا يمثل استلام الطلب التزامًا بالتمويل أو الاستثمار.</p>
    <p style="margin:0;">مع تحيات،<br /><strong style="color:#154278;">فريق سند برو كابيتال للمشروعات</strong></p>
  `);
}

// ── POST /api/submit-project ──────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Honeypot and timing checks: pretend it worked so bots don't adapt.
    const startedAt = Number(formData.get("startedAt"));
    const isBot =
      Boolean(formData.get("website")) || !startedAt || Date.now() - startedAt < MIN_FILL_MS;
    if (isBot) {
      return NextResponse.json({ success: true, reference: createReference() }, { status: 200 });
    }

    const values = parseSubmission(String(formData.get("payload") ?? ""));
    if (!values) {
      return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
    }

    const errors = validateSubmission(values);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: "يرجى مراجعة البيانات المدخلة", errors }, { status: 400 });
    }
    values.phone = toLatinDigits(values.phone);
    values.foundedYear = toLatinDigits(values.foundedYear);

    const files = formData.getAll("files").filter((file): file is File => file instanceof File);
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    const hasBadType = files.some(
      (file) => !ALLOWED_FILE_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
    );
    if (files.length > MAX_FILES || totalBytes > MAX_TOTAL_FILE_BYTES || hasBadType) {
      return NextResponse.json({ error: "الملفات المرفقة غير مقبولة" }, { status: 400 });
    }

    const attachments = await Promise.all(
      files.map(async (file) => ({
        filename: file.name,
        content: Buffer.from(await file.arrayBuffer()),
      }))
    );

    const port = Number(process.env.SMTP_PORT);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const reference = createReference();
    const requestLabel =
      REQUEST_TYPES.find((type) => type.value === values.requestType)?.label ?? values.requestType;
    const from = `"سند برو كابيتال" <${process.env.MAIL_FROM}>`;

    // This email is the only record of the submission: if it fails, the applicant must retry.
    await transporter.sendMail({
      from,
      to: TEAM_RECIPIENTS,
      replyTo: values.email,
      subject: `طلب مشروع جديد (${reference}): ${values.projectName}`,
      html: teamEmailHtml(values, requestLabel, reference),
      attachments,
    });

    // The team already has the request, so a bad applicant address shouldn't fail the submission.
    try {
      await transporter.sendMail({
        from,
        to: values.email,
        replyTo: process.env.MAIL_FROM,
        subject: `استلمنا طلبك (${reference}) - سند برو كابيتال`,
        html: confirmationEmailHtml(values, requestLabel, reference),
      });
    } catch (confirmationError) {
      console.error("Project submission confirmation email failed:", confirmationError);
    }

    return NextResponse.json({ success: true, reference }, { status: 200 });
  } catch (error) {
    console.error("Project submission failed:", error);
    return NextResponse.json({ error: "تعذر إرسال الطلب" }, { status: 500 });
  }
}
