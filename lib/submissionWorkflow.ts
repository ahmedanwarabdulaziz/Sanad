// Shared by the admin pages and the API routes, so statuses and email wording stay in one place.

import { toLatinDigits } from "@/lib/submitProject";

export const RESPONSE_BUSINESS_DAYS = 3;

export type SubmissionKind = "project" | "contact" | "real_estate";
export type ProjectStatus = "NEW" | "ACCEPTED" | "CALL_INVITED" | "DECLINED";
export type ContactStatus = "NEW" | "IN_PROGRESS" | "CLOSED";
export type ProjectEmailType = "initial_acceptance" | "call_invitation" | "decline";

export interface SubmissionFile {
  name: string;
  key: string;
  size: number;
}

export interface EmailLogEntry {
  type: string;
  subject: string;
  body: string;
  sent_at: string;
  sent_by: string;
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, { label: string; color: string }> = {
  NEW: { label: "طلب جديد", color: "#3b82f6" },
  ACCEPTED: { label: "قبول مبدئي", color: "#d97706" },
  CALL_INVITED: { label: "تمت الدعوة لمكالمة", color: "#16a34a" },
  DECLINED: { label: "تم الاعتذار", color: "#64748b" },
};

export const CONTACT_STATUS_LABELS: Record<ContactStatus, { label: string; color: string }> = {
  NEW: { label: "جديد", color: "#3b82f6" },
  IN_PROGRESS: { label: "قيد المتابعة", color: "#d97706" },
  CLOSED: { label: "مغلق", color: "#64748b" },
};

/** Each email is only available from these statuses, and moves the request to `nextStatus`. */
export const PROJECT_EMAIL_FLOW: Record<
  ProjectEmailType,
  { label: string; from: ProjectStatus[]; nextStatus: ProjectStatus; startsDeadline: boolean }
> = {
  initial_acceptance: {
    label: "قبول مبدئي",
    from: ["NEW"],
    nextStatus: "ACCEPTED",
    startsDeadline: true,
  },
  call_invitation: {
    label: "دعوة لمكالمة",
    from: ["ACCEPTED"],
    nextStatus: "CALL_INVITED",
    startsDeadline: false,
  },
  decline: {
    label: "اعتذار",
    from: ["NEW", "ACCEPTED", "CALL_INVITED"],
    nextStatus: "DECLINED",
    startsDeadline: false,
  },
};

export const DECLINE_REASONS = [
  {
    value: "focus",
    label: "خارج نطاق الاستثمار الحالي",
    text: "وبعد دراسة الطلب، تبيّن لنا أن طبيعة المشروع وقطاعه لا يتوافقان مع نطاق تركيزنا الاستثماري في المرحلة الحالية.",
  },
  {
    value: "funding",
    label: "حجم التمويل غير مناسب",
    text: "وبعد دراسة الطلب، تبيّن لنا أن حجم التمويل المطلوب لا يتناسب مع نطاق الاستثمارات التي نعمل عليها في الوقت الحالي.",
  },
  {
    value: "stage",
    label: "مرحلة المشروع مبكرة",
    text: "وبعد دراسة الطلب، نرى أن المشروع لا يزال في مرحلة مبكرة مقارنةً بالمراحل التي نستثمر فيها حاليًا.",
  },
  {
    value: "data",
    label: "البيانات غير كافية",
    text: "وبعد دراسة الطلب، تبيّن لنا أن البيانات والمستندات المتاحة حاليًا لا تكفي لاتخاذ قرار استثماري بشأن المشروع.",
  },
  {
    value: "capacity",
    label: "الالتزامات الحالية",
    text: "وبعد دراسة الطلب، نود إفادتكم بأن التزاماتنا الاستثمارية الحالية لا تتيح لنا الدخول في مشروعات جديدة خلال هذه الفترة.",
  },
  {
    value: "general",
    label: "سبب عام",
    text: "وبعد دراسة الطلب بعناية، نأسف لإبلاغكم بأنه لن يكون بوسعنا المضي قدمًا في هذا الطلب في الوقت الحالي.",
  },
];

interface ProjectEmailContext {
  fullName: string;
  projectName: string;
  reference: string;
}

/** Default wording; the admin reviews and can edit it before sending. */
export function projectEmailDraft(
  type: ProjectEmailType,
  { fullName, projectName, reference }: ProjectEmailContext,
  declineReason: string = "general"
): { subject: string; body: string } {
  const opening = `مرحبًا ${fullName}،\n\nنشكرك على اهتمامك بالتواصل مع سند برو كابيتال للمشروعات بخصوص مشروع "${projectName}" (رقم الطلب ${reference}).`;
  const closing = "مع تحيات،\nفريق سند برو كابيتال للمشروعات";

  if (type === "initial_acceptance") {
    return {
      subject: `قبول مبدئي لطلبكم (${reference}) - سند برو كابيتال`,
      body: `${opening}\n\nيسعدنا إبلاغك بأن فريقنا راجع طلبك، وقد حظي بقبول مبدئي للانتقال إلى مرحلة الدراسة التالية. وسنرسل إليك خلال ${RESPONSE_BUSINESS_DAYS} أيام عمل دعوة لمكالمة لمناقشة الخطوات القادمة.\n\nيُرجى العلم بأن هذا القبول المبدئي لا يمثل التزامًا بالتمويل أو الاستثمار.\n\n${closing}`,
    };
  }

  if (type === "call_invitation") {
    return {
      subject: `دعوة لمكالمة بخصوص طلبكم (${reference}) - سند برو كابيتال`,
      body: `${opening}\n\nاستكمالًا لرسالتنا السابقة، ندعوك إلى مكالمة مع فريقنا لمناقشة تفاصيل المشروع والخطوة التالية. يُرجى الرد على هذه الرسالة بالأيام والأوقات المناسبة لك خلال الأسبوع القادم، وسنؤكد لك الموعد.\n\n${closing}`,
    };
  }

  const reason = DECLINE_REASONS.find((item) => item.value === declineReason) ?? DECLINE_REASONS[DECLINE_REASONS.length - 1];
  return {
    subject: `بخصوص طلبكم (${reference}) - سند برو كابيتال`,
    body: `${opening}\n\n${reason.text}\n\nونود أن نشكرك على ثقتك بنا وعلى الوقت الذي خصصته لتقديم طلبك، ونتمنى لك ولمشروعك كل التوفيق والنجاح.\n\n${closing}`,
  };
}

export const REAL_ESTATE_DECLINE_REASONS = [
  {
    value: "location",
    label: "الموقع خارج نطاق عملنا",
    text: "وبعد دراسة الطلب، تبيّن لنا أن الموقع المطلوب يقع خارج نطاق المناطق التي نعمل بها في الوقت الحالي.",
  },
  {
    value: "land_fit",
    label: "الأرض غير مناسبة حاليًا",
    text: "وبعد دراسة الطلب، تبيّن لنا أن مواصفات الأرض وتقييمها لا يتوافقان مع معايير المشروعات التي نعمل عليها حاليًا.",
  },
  {
    value: "documents",
    label: "المستندات غير مكتملة",
    text: "وبعد دراسة الطلب، تبيّن لنا أن موقف الملكية والمستندات المتاحة حاليًا لا يكفي للمضي قدمًا في الدراسة.",
  },
  {
    value: "no_group",
    label: "لا توجد مجموعة متاحة",
    text: "وبعد دراسة الطلب، نود إفادتكم بأنه لا توجد لدينا حاليًا مجموعة ملاك مناسبة في الموقع والمواصفات المطلوبة.",
  },
  {
    value: "budget",
    label: "الميزانية غير مناسبة",
    text: "وبعد دراسة الطلب، تبيّن لنا أن الميزانية المحددة لا تتناسب مع تكلفة الوحدات في الموقع المطلوب.",
  },
  {
    value: "general",
    label: "سبب عام",
    text: "وبعد دراسة الطلب بعناية، نأسف لإبلاغكم بأنه لن يكون بوسعنا المضي قدمًا في هذا الطلب في الوقت الحالي.",
  },
];

/** Default wording; the admin reviews and can edit it before sending. */
export function realEstateEmailDraft(
  type: ProjectEmailType,
  { fullName, requestType, reference }: { fullName: string; requestType: string; reference: string },
  declineReason: string = "general"
): { subject: string; body: string } {
  const isLandOwner = requestType === "land_owner";
  const topic = isLandOwner ? "الشراكة في بناء الأرض" : "شراء وحدة سكنية بنظام اتحاد الملاك";
  const opening = `مرحبًا ${fullName}،\n\nنشكرك على اهتمامك بالتواصل مع سند برو كابيتال للمشروعات بخصوص ${topic} (رقم الطلب ${reference}).`;
  const closing = "مع تحيات،\nفريق سند برو كابيتال للمشروعات";

  if (type === "initial_acceptance") {
    return {
      subject: `قبول مبدئي لطلبكم (${reference}) - سند برو كابيتال`,
      body: `${opening}\n\nيسعدنا إبلاغك بأن فريقنا راجع طلبك، وقد حظي بقبول مبدئي للانتقال إلى المرحلة التالية. وسنرسل إليك خلال ${RESPONSE_BUSINESS_DAYS} أيام عمل دعوة لمكالمة لمناقشة الخطوات القادمة.\n\nيُرجى العلم بأن هذا القبول المبدئي لا يمثل التزامًا ${isLandOwner ? "بالشراكة أو البناء" : "بتخصيص وحدة أو حجزها"}.\n\n${closing}`,
    };
  }

  if (type === "call_invitation") {
    return {
      subject: `دعوة لمكالمة بخصوص طلبكم (${reference}) - سند برو كابيتال`,
      body: `${opening}\n\nاستكمالًا لرسالتنا السابقة، ندعوك إلى مكالمة مع فريقنا لمناقشة تفاصيل طلبك والخطوة التالية. يُرجى الرد على هذه الرسالة بالأيام والأوقات المناسبة لك خلال الأسبوع القادم، وسنؤكد لك الموعد.\n\n${closing}`,
    };
  }

  const reason =
    REAL_ESTATE_DECLINE_REASONS.find((item) => item.value === declineReason) ??
    REAL_ESTATE_DECLINE_REASONS[REAL_ESTATE_DECLINE_REASONS.length - 1];
  return {
    subject: `بخصوص طلبكم (${reference}) - سند برو كابيتال`,
    body: `${opening}\n\n${reason.text}\n\nونود أن نشكرك على ثقتك بنا وعلى الوقت الذي خصصته لتقديم طلبك، ونتمنى لك كل التوفيق.\n\n${closing}`,
  };
}

/**
 * Builds a link that opens a WhatsApp chat with the message already typed; the admin presses send.
 * Numbers with no country code are treated as Egyptian. Returns null if the number can't be used.
 */
export function whatsappLink(phone: string, text: string): string | null {
  let digits = toLatinDigits(phone).replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (/^0\d{10}$/.test(digits)) digits = `20${digits.slice(1)}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Adds working days using Egypt's week: Friday and Saturday don't count. Public holidays aren't tracked. */
export function addBusinessDays(start: Date, days: number): Date {
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Africa/Cairo" });
  const result = new Date(start);
  let remaining = days;
  while (remaining > 0) {
    result.setTime(result.getTime() + 24 * 60 * 60 * 1000);
    const day = weekday.format(result);
    if (day !== "Fri" && day !== "Sat") remaining -= 1;
  }
  return result;
}
