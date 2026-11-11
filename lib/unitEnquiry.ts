// Shared by the Sanad Zayed enquiry form (components/masterplan/EnquiryForm.tsx), its API
// route and the admin page, so options and rules stay identical everywhere.

export const ENQUIRY_CONTACT_METHODS = ["مكالمة هاتفية", "واتساب", "البريد الإلكتروني"];
export const ENQUIRY_BEST_TIMES = ["صباحًا (10 - 1)", "ظهرًا (1 - 5)", "مساءً (5 - 9)", "أي وقت"];
export const ENQUIRY_PURPOSES = ["سكن شخصي", "استثمار", "سكن واستثمار"];

export const ENQUIRY_STATUS_LABELS: Record<string, string> = {
    NEW: "جديد",
    CONTACTED: "تم التواصل",
    INTERESTED: "مهتم / متابعة",
    CLOSED: "مغلق",
};

export const UNIT_EVENT_LABELS: Record<string, string> = {
    view: "مشاهدة التفاصيل",
    brochure: "تحميل البروشور",
    tour: "جولة ثلاثية الأبعاد",
    enquiry: "استفسار",
};

export interface UnitEnquiry {
    units: string[];
    fullName: string;
    phone: string;
    email: string;
    contactMethod: string;
    bestTime: string;
    purpose: string;
    message: string;
    consent: boolean;
}

export const EMPTY_UNIT_ENQUIRY: UnitEnquiry = {
    units: [],
    fullName: "",
    phone: "",
    email: "",
    contactMethod: ENQUIRY_CONTACT_METHODS[0],
    bestTime: ENQUIRY_BEST_TIMES[3],
    purpose: "",
    message: "",
    consent: false,
};

const UNIT_ID = /^[AB]-[0-4]-[1-5]$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const toLatinDigits = (s: string) =>
    s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

/** Returns a field → message map; empty when valid. */
export function validateUnitEnquiry(v: UnitEnquiry): Record<string, string> {
    const e: Record<string, string> = {};
    if (v.fullName.trim().length < 3) e.fullName = "من فضلك اكتب اسمك بالكامل";
    const phone = toLatinDigits(v.phone).replace(/[\s-]/g, "");
    if (!/^\+?[0-9]{10,15}$/.test(phone)) e.phone = "رقم الهاتف غير صحيح";
    if (v.email && !EMAIL.test(v.email.trim())) e.email = "البريد الإلكتروني غير صحيح";
    if (v.contactMethod === "البريد الإلكتروني" && !v.email.trim()) e.email = "اكتب بريدك الإلكتروني للتواصل عليه";
    if (!ENQUIRY_CONTACT_METHODS.includes(v.contactMethod)) e.contactMethod = "اختر طريقة التواصل";
    if (v.bestTime && !ENQUIRY_BEST_TIMES.includes(v.bestTime)) e.bestTime = "اختر وقتًا مناسبًا";
    if (v.purpose && !ENQUIRY_PURPOSES.includes(v.purpose)) e.purpose = "اختر الغرض";
    if (v.units.length > 10 || v.units.some((u) => !UNIT_ID.test(u))) e.units = "الوحدات المختارة غير صالحة";
    if (v.message.length > 1500) e.message = "الرسالة طويلة جدًا";
    if (!v.consent) e.consent = "من فضلك وافق على التواصل معك";
    return e;
}

/** "A-1-3" → "A-103", "B-0-2" → "B-G02". */
export function unitIdToCode(id: string) {
    const [b, f, i] = id.split("-");
    return `${b}-${f === "0" ? "G" : f}${i.padStart(2, "0")}`;
}

// ---------------------------------------------------------------- visitor journey

/** Shape sent by components/masterplan/journey.ts (journeySummary). Everything optional: it comes from the browser. */
export interface EnquiryJourney {
    visits?: number;
    firstSeen?: string;
    minutes?: number;
    device?: string;
    source?: { referrer?: string; utm?: Record<string, string> } | null;
    units?: { id: string; views: number; seconds: number; brochure: boolean; tour: boolean; shared: boolean }[];
    used3D?: boolean;
    nearbyMovie?: string;
    panels?: string[];
    contacts?: { whatsapp: number; call: number };
}

const PANEL_NAMES: Record<string, string> = {
    finder: "ابحث عن وحدتك",
    compare: "المقارنة",
    location: "الموقع",
    stages: "مراحل المشروع",
    enquiry: "الاستفسار",
};

/** Keeps only the known fields with sane sizes, so a browser can't store arbitrary data. */
export function cleanJourney(raw: unknown): EnquiryJourney {
    if (!raw || typeof raw !== "object") return {};
    const r = raw as Record<string, unknown>;
    const num = (v: unknown, max = 100000) => (typeof v === "number" && isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : undefined);
    const str = (v: unknown, n = 200) => (typeof v === "string" ? v.slice(0, n) : undefined);
    const units = Array.isArray(r.units)
        ? r.units
              .filter((u): u is Record<string, unknown> => !!u && typeof u === "object")
              .slice(0, 15)
              .map((u) => ({
                  id: str(u.id, 12) ?? "",
                  views: num(u.views, 1000) ?? 0,
                  seconds: num(u.seconds, 100000) ?? 0,
                  brochure: u.brochure === true,
                  tour: u.tour === true,
                  shared: u.shared === true,
              }))
              .filter((u) => /^[AB]-[G1-4]\d{2}$/.test(u.id))
        : [];
    const src = r.source && typeof r.source === "object" ? (r.source as Record<string, unknown>) : null;
    const utm: Record<string, string> = {};
    if (src?.utm && typeof src.utm === "object")
        for (const [k, v] of Object.entries(src.utm as Record<string, unknown>).slice(0, 8)) if (typeof v === "string") utm[k.slice(0, 20)] = v.slice(0, 120);
    const contacts = r.contacts && typeof r.contacts === "object" ? (r.contacts as Record<string, unknown>) : {};
    return {
        visits: num(r.visits, 10000),
        firstSeen: str(r.firstSeen, 40),
        minutes: num(r.minutes, 10000000),
        device: str(r.device, 10),
        source: src ? { referrer: str(src.referrer, 200) ?? "", utm } : null,
        units,
        used3D: r.used3D === true,
        nearbyMovie: str(r.nearbyMovie, 10),
        panels: Array.isArray(r.panels) ? r.panels.filter((p): p is string => typeof p === "string").slice(0, 8).map((p) => p.slice(0, 20)) : [],
        contacts: { whatsapp: num(contacts.whatsapp, 1000) ?? 0, call: num(contacts.call, 1000) ?? 0 },
    };
}

const secs = (n: number) => (n >= 60 ? `${Math.floor(n / 60)} د ${n % 60} ث` : `${n} ث`);

/** Human summary of the journey, one line per fact (Arabic), for the team email and the admin page. */
export function journeyLines(j: EnquiryJourney | null | undefined): string[] {
    if (!j || !Object.keys(j).length) return [];
    const out: string[] = [];
    if (j.visits) out.push(`عدد الزيارات: ${j.visits}${j.minutes ? ` · منذ أول زيارة: ${j.minutes >= 1440 ? `${Math.round(j.minutes / 1440)} يوم` : j.minutes >= 60 ? `${Math.round(j.minutes / 60)} ساعة` : `${j.minutes} دقيقة`}` : ""}${j.device ? ` · ${j.device === "mobile" ? "موبايل" : "كمبيوتر"}` : ""}`);
    const utm = j.source?.utm ?? {};
    const srcParts = [utm.utm_source, utm.utm_campaign, utm.utm_content].filter(Boolean);
    if (srcParts.length || utm.fbclid) out.push(`المصدر: ${srcParts.join(" / ") || "إعلان فيسبوك/إنستجرام"}`);
    else if (j.source?.referrer) out.push(`المصدر: ${j.source.referrer}`);
    for (const u of j.units ?? []) {
        const extras = [u.brochure && "حمّل البروشور", u.tour && "جولة 3D", u.shared && "شارك الوحدة"].filter(Boolean);
        out.push(`الوحدة ${u.id}: شاهدها ${u.views} مرة · ${secs(u.seconds)}${extras.length ? ` · ${extras.join(" · ")}` : ""}`);
    }
    if (j.used3D) out.push("استخدم العرض ثلاثي الأبعاد");
    if (j.nearbyMovie && j.nearbyMovie !== "none") out.push(`شاهد عرض «قريبة من إيه؟»${j.nearbyMovie === "complete" ? " كاملًا" : " جزئيًا"}`);
    if (j.panels?.length) out.push(`فتح: ${j.panels.map((p) => PANEL_NAMES[p] ?? p).join("، ")}`);
    if (j.contacts && (j.contacts.whatsapp || j.contacts.call)) out.push(`ضغط واتساب ${j.contacts.whatsapp} · اتصال ${j.contacts.call}`);
    return out;
}
