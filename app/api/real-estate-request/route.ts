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
import { ALLOWED_FILE_EXTENSIONS, MAX_FILES, MAX_TOTAL_FILE_BYTES, toLatinDigits } from "@/lib/submitProject";
import {
  BUYER_PAYMENT_NOTE,
  EMPTY_REAL_ESTATE_SUBMISSION,
  estimatedLandTotal,
  keepChosenPathOnly,
  parseLocalizedNumber,
  REAL_ESTATE_REQUEST_TYPES,
  RealEstateSubmission,
  validateRealEstateSubmission,
} from "@/lib/realEstateRequest";
import { listEligibleCityNames } from "@/lib/realEstateCities";
import { addBusinessDays, RESPONSE_BUSINESS_DAYS } from "@/lib/submissionWorkflow";

// Bots post the form as soon as it loads; a person can't get through all steps this fast.
const MIN_FILL_MS = 5000;

const formatNumber = (value: number) => value.toLocaleString("en-US");

function teamEmailHtml(values: RealEstateSubmission, requestLabel: string, reference: string) {
  const isLandOwner = values.requestType === "land_owner";
  const total = estimatedLandTotal(values);
  const sections: [string, [string, string][]][] = [
    [
      "بيانات مقدم الطلب",
      [
        ["الاسم", values.fullName],
        ["الهاتف", values.phone],
        ["البريد الإلكتروني", values.email],
      ],
    ],
    [
      "الموقع",
      [
        ["المجتمع العمراني", values.city],
        ["الحي أو المجاورة", values.district],
      ],
    ],
    isLandOwner
      ? [
          "بيانات الأرض",
          [
            ["المساحة", `${formatNumber(parseLocalizedNumber(values.landArea))} م²`],
            ["السعر التقديري للمتر", `${formatNumber(parseLocalizedNumber(values.pricePerMeter))} جنيه`],
            ["إجمالي السعر التقديري", total ? `${formatNumber(total)} جنيه` : ""],
            ["النسبة البنائية", `${parseLocalizedNumber(values.buildingRatio)}%`],
            ["عدد الأدوار", String(parseLocalizedNumber(values.floors))],
            ["موقف الملكية", values.ownershipStatus],
            ["نشاط الأرض", values.landUse],
            ["موقف رخصة البناء", values.licenseStatus],
            ["موقف سداد الأرض", values.paymentStatus],
            ["شكل الشراكة", values.partnershipModels.join("، ")],
            ["رابط المستندات", values.documentsLink],
            ["ملاحظات", values.message],
          ],
        ]
      : [
          "الوحدة المطلوبة",
          [
            ["نوع الوحدة", values.unitType],
            ["المساحة", values.unitArea],
            ["الميزانية التقريبية", values.budgetRange],
            ["طريقة السداد", BUYER_PAYMENT_NOTE],
            ["موعد الشراء", values.purchaseTimeline],
            ["الغرض", values.purpose],
            ["ملاحظات", values.message],
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
    <h2 style="margin:0 0 4px;color:#154278;font-size:20px;">طلب عقاري جديد: ${escapeHtml(requestLabel)}</h2>
    <p style="margin:0;color:#6b7280;font-size:13px;">رقم الطلب: <span dir="ltr">${reference}</span></p>
    ${rendered}
  `);
}

// Anyone can type any address into the form, so this email carries no free text beyond the
// sender's name, to keep it from being usable for sending arbitrary content to third parties.
function confirmationEmailHtml(values: RealEstateSubmission, requestLabel: string, reference: string) {
  return emailShell(`
    <h2 style="margin:0 0 12px;color:#154278;font-size:20px;">وصلنا طلبك، شكرًا لك</h2>
    <p style="margin:0 0 12px;">مرحبًا ${escapeHtml(values.fullName)}،</p>
    <p style="margin:0 0 16px;">نشكرك على اهتمامك بالتواصل مع سند برو كابيتال للمشروعات. استلمنا طلبك بنجاح، وسيقوم فريقنا بمراجعته، وسنتواصل معك عبر البريد الإلكتروني خلال ${RESPONSE_BUSINESS_DAYS} أيام عمل لإبلاغك بنتيجة المراجعة والخطوة التالية.</p>
    <div style="background:#f8f9fa;border-radius:8px;padding:14px 16px;margin-bottom:16px;">
      <div style="font-size:13px;color:#6b7280;">نوع الطلب</div>
      <div style="font-weight:bold;color:#154278;margin-bottom:8px;">${escapeHtml(requestLabel)}</div>
      <div style="font-size:13px;color:#6b7280;">رقم الطلب</div>
      <div dir="ltr" style="font-weight:bold;color:#154278;text-align:right;">${reference}</div>
    </div>
    <p style="margin:0 0 16px;font-size:13px;color:#6b7280;">يرجى الاحتفاظ برقم الطلب لاستخدامه عند التواصل معنا. لا يمثل استلام الطلب التزامًا بالشراكة أو البناء أو تخصيص وحدة.</p>
    <p style="margin:0;">مع تحيات،<br /><strong style="color:#154278;">فريق سند برو كابيتال للمشروعات</strong></p>
  `);
}

// ── POST /api/real-estate-request ─────────────────────────────────────
export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Timing check: pretend it worked so bots don't adapt.
    const startedAt = Number(formData.get("startedAt"));
    if (!startedAt || Date.now() - startedAt < MIN_FILL_MS) {
      console.warn("Real estate request dropped by the timing check");
      return NextResponse.json({ success: true, reference: createReference("RE") }, { status: 200 });
    }
    const honeypotFilled = Boolean(formData.get("website"));

    const parsed = parseFormPayload(String(formData.get("payload") ?? ""), EMPTY_REAL_ESTATE_SUBMISSION);
    if (!parsed) {
      return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
    }

    const values = keepChosenPathOnly(parsed);
    const errors = validateRealEstateSubmission(values, await listEligibleCityNames());
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: "يرجى مراجعة البيانات المدخلة", errors }, { status: 400 });
    }
    values.phone = toLatinDigits(values.phone);

    const isLandOwner = values.requestType === "land_owner";
    const files = isLandOwner
      ? formData.getAll("files").filter((file): file is File => file instanceof File)
      : [];
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
    const reference = createReference("RE");
    const requestLabel =
      REAL_ESTATE_REQUEST_TYPES.find((type) => type.value === values.requestType)?.label ?? values.requestType;

    const storedFiles = await storeSubmissionFiles(
      "real_estate",
      files.map((file, index) => ({
        name: file.name,
        type: file.type,
        content: attachments[index].content,
      }))
    );
    const { error: saveError } = await submissionsDb.from("real_estate_submissions").insert({
      reference,
      next_action_due_at: addBusinessDays(new Date(), RESPONSE_BUSINESS_DAYS).toISOString(),
      request_type: values.requestType,
      city: values.city,
      district: values.district,
      land_area: isLandOwner ? parseLocalizedNumber(values.landArea) : null,
      price_per_meter: isLandOwner ? parseLocalizedNumber(values.pricePerMeter) : null,
      estimated_total: isLandOwner ? estimatedLandTotal(values) : null,
      building_ratio: isLandOwner ? parseLocalizedNumber(values.buildingRatio) : null,
      floors: isLandOwner ? parseLocalizedNumber(values.floors) : null,
      ownership_status: values.ownershipStatus,
      land_use: values.landUse,
      license_status: values.licenseStatus,
      payment_status: values.paymentStatus,
      partnership_models: values.partnershipModels,
      documents_link: values.documentsLink,
      unit_type: values.unitType,
      unit_area: values.unitArea,
      budget_range: values.budgetRange,
      purchase_timeline: values.purchaseTimeline,
      purpose: values.purpose,
      message: values.message,
      full_name: values.fullName,
      phone: values.phone,
      email: values.email,
      files: storedFiles,
      notes: honeypotFilled ? SUSPECTED_SPAM_NOTE : "",
    });
    if (saveError) console.error("Real estate request save failed:", saveError);
    if (honeypotFilled && !saveError) {
      console.warn(`Real estate request ${reference} flagged by the hidden spam field`);
      return NextResponse.json({ success: true, reference }, { status: 200 });
    }

    // The database and this email each keep a copy: the applicant only retries if both failed.
    try {
      await transporter.sendMail({
        from: MAIL_FROM_HEADER,
        to: TEAM_RECIPIENTS,
        replyTo: values.email,
        subject: `طلب عقاري جديد (${reference}): ${requestLabel}`,
        html: teamEmailHtml(values, requestLabel, reference),
        attachments,
      });
    } catch (teamEmailError) {
      if (saveError) throw teamEmailError;
      console.error("Real estate request team email failed:", teamEmailError);
    }

    // The team already has the request, so a bad applicant address shouldn't fail the submission.
    try {
      await transporter.sendMail({
        from: MAIL_FROM_HEADER,
        to: values.email,
        replyTo: process.env.MAIL_FROM,
        subject: `استلمنا طلبك (${reference}) - سند برو كابيتال`,
        html: confirmationEmailHtml(values, requestLabel, reference),
      });
    } catch (confirmationError) {
      console.error("Real estate request confirmation email failed:", confirmationError);
    }

    return NextResponse.json({ success: true, reference }, { status: 200 });
  } catch (error) {
    console.error("Real estate request failed:", error);
    return NextResponse.json({ error: "تعذر إرسال الطلب" }, { status: 500 });
  }
}
