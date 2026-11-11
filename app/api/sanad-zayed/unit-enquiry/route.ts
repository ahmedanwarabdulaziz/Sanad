import { NextResponse } from "next/server";
import {
    createMailer,
    createReference,
    emailShell,
    escapeHtml,
    MAIL_FROM_HEADER,
    submissionsDb,
    SUSPECTED_SPAM_NOTE,
    TEAM_RECIPIENTS,
} from "@/lib/submissionStore";
import { EMPTY_UNIT_ENQUIRY, cleanJourney, journeyLines, toLatinDigits, unitIdToCode, validateUnitEnquiry, type UnitEnquiry } from "@/lib/unitEnquiry";

// Bots post as soon as the form opens; a person needs a few seconds.
const MIN_FILL_MS = 4000;

function readPayload(raw: unknown): UnitEnquiry | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const str = (k: keyof UnitEnquiry) => (typeof r[k] === "string" ? (r[k] as string).trim().slice(0, 1500) : "");
    return {
        ...EMPTY_UNIT_ENQUIRY,
        units: Array.isArray(r.units) ? r.units.filter((u): u is string => typeof u === "string").slice(0, 10) : [],
        fullName: str("fullName"),
        phone: toLatinDigits(str("phone")),
        email: str("email"),
        contactMethod: str("contactMethod"),
        bestTime: str("bestTime"),
        purpose: str("purpose"),
        message: str("message"),
        consent: r.consent === true,
    };
}

function rows(pairs: [string, string][]) {
    return pairs
        .filter(([, v]) => v)
        .map(
            ([k, v]) =>
                `<tr><td style="padding:6px 10px;color:#6b7280;white-space:nowrap;">${k}</td><td style="padding:6px 10px;font-weight:bold;">${escapeHtml(v)}</td></tr>`
        )
        .join("");
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const startedAt = Number(body?.startedAt);
        if (!startedAt || Date.now() - startedAt < MIN_FILL_MS) {
            console.warn("Unit enquiry dropped by the timing check");
            return NextResponse.json({ success: true, reference: createReference("UE") });
        }
        const honeypot = Boolean(body?.website);
        const values = readPayload(body?.payload);
        if (!values) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
        const errors = validateUnitEnquiry(values);
        if (Object.keys(errors).length) return NextResponse.json({ error: "تحقق من البيانات", errors }, { status: 400 });

        const reference = createReference("UE");
        const codes = values.units.map(unitIdToCode);
        const source = typeof body?.source === "string" ? body.source.slice(0, 20) : "";

        const journey = cleanJourney(body?.journey);
        const row = {
            reference,
            units: values.units,
            full_name: values.fullName,
            phone: values.phone,
            email: values.email,
            contact_method: values.contactMethod,
            best_time: values.bestTime,
            purpose: values.purpose,
            message: values.message,
            source,
            notes: honeypot ? SUSPECTED_SPAM_NOTE : "",
        };
        let { error: saveError } = await submissionsDb.from("unit_enquiries").insert({ ...row, journey });
        if (saveError && /journey/.test(saveError.message ?? "")) {
            // Migration 018 not applied yet: keep the enquiry, drop the journey.
            console.warn("unit_enquiries.journey missing; saving without it");
            ({ error: saveError } = await submissionsDb.from("unit_enquiries").insert(row));
        }
        if (saveError) console.error("Unit enquiry save failed:", saveError);
        if (!saveError && values.units.length) {
            await submissionsDb
                .from("unit_events")
                .insert(values.units.map((unit_id) => ({ unit_id, event: "enquiry", source })))
                .then(({ error }) => error && console.error("Unit enquiry event failed:", error));
        }
        if (honeypot && !saveError) return NextResponse.json({ success: true, reference });

        const transporter = createMailer();
        try {
            await transporter.sendMail({
                from: MAIL_FROM_HEADER,
                to: TEAM_RECIPIENTS,
                replyTo: values.email || undefined,
                subject: `استفسار وحدات سند زايد (${reference})${codes.length ? `: ${codes.join("، ")}` : ""}`,
                html: emailShell(`
                    <h2 style="margin:0 0 12px;color:#154278;font-size:20px;">استفسار جديد عن وحدات سند زايد</h2>
                    <table style="border-collapse:collapse;width:100%;font-size:14px;">${rows([
                        ["رقم الطلب", reference],
                        ["الوحدات", codes.join("، ") || "لم يحدد وحدة"],
                        ["الاسم", values.fullName],
                        ["الهاتف", values.phone],
                        ["البريد الإلكتروني", values.email],
                        ["طريقة التواصل", values.contactMethod],
                        ["الوقت المناسب", values.bestTime],
                        ["الغرض", values.purpose],
                        ["الرسالة", values.message],
                    ])}</table>
                    ${
                        journeyLines(journey).length
                            ? `<h3 style="margin:18px 0 6px;color:#154278;font-size:16px;">رحلة العميل على المخطط</h3><ul style="margin:0;padding-right:18px;font-size:13.5px;line-height:1.9;">${journeyLines(journey)
                                  .map((l) => `<li>${escapeHtml(l)}</li>`)
                                  .join("")}</ul>`
                            : ""
                    }
                    <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">تابع الطلب من لوحة التحكم ← استفسارات الوحدات.</p>
                `),
            });
        } catch (teamError) {
            if (saveError) throw teamError;
            console.error("Unit enquiry team email failed:", teamError);
        }

        if (values.email) {
            try {
                await transporter.sendMail({
                    from: MAIL_FROM_HEADER,
                    to: values.email,
                    replyTo: process.env.MAIL_FROM,
                    subject: `استلمنا استفسارك (${reference}) - سند زايد`,
                    html: emailShell(`
                        <h2 style="margin:0 0 12px;color:#154278;font-size:20px;">شكرًا لاهتمامك بمشروع سند زايد</h2>
                        <p style="margin:0 0 12px;">مرحبًا ${escapeHtml(values.fullName)}،</p>
                        <p style="margin:0 0 16px;">استلمنا استفسارك${codes.length ? ` عن الوحدات <strong>${escapeHtml(codes.join("، "))}</strong>` : ""}، وسيتواصل معك أحد مستشاري المبيعات قريبًا لعرض التفاصيل والأسعار وطرق السداد.</p>
                        <div style="background:#fff8e6;border:1px solid #f1d58a;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:14px;">تخصيص الوحدات سيبدأ لمستثمرين سند حسب أولوية السداد ورغبتهم في شراء وحدات بمجرد إصدار التراخيص.</div>
                        <div style="font-size:13px;color:#6b7280;">رقم الطلب</div>
                        <div dir="ltr" style="font-weight:bold;color:#154278;text-align:right;margin-bottom:16px;">${reference}</div>
                        <p style="margin:0;">مع تحيات،<br /><strong style="color:#154278;">فريق سند برو كابيتال للمشروعات</strong></p>
                    `),
                });
            } catch (confirmationError) {
                console.error("Unit enquiry confirmation email failed:", confirmationError);
            }
        }

        return NextResponse.json({ success: true, reference });
    } catch (error) {
        console.error("Unit enquiry failed:", error);
        return NextResponse.json({ error: "تعذر إرسال الاستفسار، حاول مرة أخرى أو تواصل معنا هاتفيًا" }, { status: 500 });
    }
}
