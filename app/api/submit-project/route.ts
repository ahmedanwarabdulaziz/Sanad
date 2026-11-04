import { NextResponse } from "next/server";
import {
  createMailer,
  createReference,
  emailShell,
  escapeHtml,
  MAIL_FROM_HEADER,
  parseFormPayload,
  storeSubmissionFiles,
  submissionsDb,
  SUSPECTED_SPAM_NOTE,
  TEAM_RECIPIENTS,
} from "@/lib/submissionStore";
import { addBusinessDays, RESPONSE_BUSINESS_DAYS } from "@/lib/submissionWorkflow";
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

// Bots post the form as soon as it loads; a person can't get through all steps this fast.
const MIN_FILL_MS = 5000;

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
    <p style="margin:0 0 16px;">نشكرك على اهتمامك بالتواصل مع سند برو كابيتال للمشروعات. استلمنا طلبك بنجاح، وسيقوم فريقنا بمراجعة بيانات مشروعك، وسنتواصل معك عبر البريد الإلكتروني خلال ${RESPONSE_BUSINESS_DAYS} أيام عمل لإبلاغك بنتيجة المراجعة والخطوة التالية.</p>
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

    // Timing check: pretend it worked so bots don't adapt.
    const startedAt = Number(formData.get("startedAt"));
    if (!startedAt || Date.now() - startedAt < MIN_FILL_MS) {
      console.warn("Project submission dropped by the timing check");
      return NextResponse.json({ success: true, reference: createReference("SP") }, { status: 200 });
    }
    const honeypotFilled = Boolean(formData.get("website"));

    const values = parseFormPayload(String(formData.get("payload") ?? ""), EMPTY_SUBMISSION);
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

    const transporter = createMailer();
    const reference = createReference("SP");
    const requestLabel =
      REQUEST_TYPES.find((type) => type.value === values.requestType)?.label ?? values.requestType;
    const from = MAIL_FROM_HEADER;

    const storedFiles = await storeSubmissionFiles(
      "project",
      files.map((file, index) => ({
        name: file.name,
        type: file.type,
        content: attachments[index].content,
      }))
    );
    const { error: saveError } = await submissionsDb.from("project_submissions").insert({
      reference,
      next_action_due_at: addBusinessDays(new Date(), RESPONSE_BUSINESS_DAYS).toISOString(),
      request_type: values.requestType,
      project_name: values.projectName,
      sector: values.sector,
      location: values.location,
      description: values.description,
      advantage: values.advantage,
      idea_stage: values.ideaStage,
      founded_year: values.foundedYear,
      annual_revenue: values.annualRevenue,
      team_size: values.teamSize,
      funding_range: values.fundingRange,
      use_of_funds: values.useOfFunds,
      support_types: values.supportTypes,
      available_documents: values.availableDocuments,
      documents_link: values.documentsLink,
      full_name: values.fullName,
      phone: values.phone,
      email: values.email,
      company: values.company,
      job_title: values.jobTitle,
      files: storedFiles,
      notes: honeypotFilled ? SUSPECTED_SPAM_NOTE : "",
    });
    if (saveError) console.error("Project submission save failed:", saveError);
    if (honeypotFilled && !saveError) {
      console.warn(`Project submission ${reference} flagged by the hidden spam field`);
      return NextResponse.json({ success: true, reference }, { status: 200 });
    }

    // The database and this email each keep a copy: the applicant only retries if both failed.
    try {
      await transporter.sendMail({
        from,
        to: TEAM_RECIPIENTS,
        replyTo: values.email,
        subject: `طلب مشروع جديد (${reference}): ${values.projectName}`,
        html: teamEmailHtml(values, requestLabel, reference),
        attachments,
      });
    } catch (teamEmailError) {
      if (saveError) throw teamEmailError;
      console.error("Project submission team email failed:", teamEmailError);
    }

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
