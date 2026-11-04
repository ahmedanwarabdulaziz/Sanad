// Shared by the public form (components/RealEstateRequestForm.tsx) and its API route,
// so options and validation rules stay identical on both sides.

import { toLatinDigits } from "@/lib/submitProject";

export const REAL_ESTATE_REQUEST_TYPES = [
  {
    value: "land_owner",
    label: "لدي أرض وأبحث عن شريك للبناء",
    description: "تملك أرضًا في إحدى المجتمعات العمرانية الجديدة وتبحث عن شريك لتطويرها وبنائها.",
  },
  {
    value: "unit_buyer",
    label: "أرغب في شراء وحدة بنظام اتحاد الملاك",
    description: "تنضم إلى مجموعة من المهتمين لبناء عقارهم معًا، وتتولى الشركة التنسيق والإدارة والإشراف.",
  },
];

export const OTHER_CITY = "مدينة أخرى";

export const NEW_URBAN_COMMUNITIES = [
  "القاهرة الجديدة",
  "العاصمة الإدارية الجديدة",
  "الشيخ زايد",
  "السادس من أكتوبر",
  "حدائق أكتوبر",
  "الشروق",
  "بدر",
  "العبور الجديدة",
  "العاشر من رمضان",
  "برج العرب الجديدة",
  "المنصورة الجديدة",
  "دمياط الجديدة",
  "بني سويف الجديدة",
  "المنيا الجديدة",
  "أسيوط الجديدة",
  "سوهاج الجديدة",
  OTHER_CITY,
];

export const OWNERSHIP_STATUSES = [
  "عقد مسجل",
  "تخصيص من هيئة المجتمعات العمرانية",
  "عقد ابتدائي",
  "قيد استكمال الأوراق",
];
export const LAND_USES = ["سكني", "سكني تجاري", "تجاري أو إداري", "لم يتحدد بعد"];
export const LICENSE_STATUSES = ["رخصة بناء صادرة", "جارٍ استخراج الرخصة", "لم تبدأ إجراءات الرخصة"];
export const LAND_PAYMENT_STATUSES = ["مسددة بالكامل", "توجد أقساط متبقية"];
export const PARTNERSHIP_MODELS = ["مقابل نسبة من الوحدات", "شراكة في الأرباح", "منفتح على العروض"];

export const UNIT_TYPES = ["شقة", "دوبلكس", "لم أحدد بعد"];
export const UNIT_AREAS = [
  "أقل من 100 م²",
  "من 100 إلى 150 م²",
  "من 150 إلى 200 م²",
  "أكثر من 200 م²",
  "لم أحدد بعد",
];
export const BUDGET_RANGES = [
  "أقل من 2 مليون جنيه",
  "من 2 إلى 4 ملايين جنيه",
  "من 4 إلى 7 ملايين جنيه",
  "من 7 إلى 10 ملايين جنيه",
  "أكثر من 10 ملايين جنيه",
  "لم يتحدد بعد",
];
export const PURCHASE_TIMELINES = ["خلال 3 أشهر", "خلال 6 أشهر", "خلال سنة", "أستكشف الفكرة حاليًا"];
export const PURCHASE_PURPOSES = ["سكن شخصي", "استثمار", "سكن واستثمار"];

export const BUYER_PAYMENT_NOTE = "السداد يكون على دفعات حسب الإنجاز ومراحل التنفيذ.";

export interface RealEstateSubmission {
  requestType: string;
  city: string;
  otherCity: string;
  district: string;
  landArea: string;
  pricePerMeter: string;
  buildingRatio: string;
  floors: string;
  ownershipStatus: string;
  landUse: string;
  licenseStatus: string;
  paymentStatus: string;
  partnershipModels: string[];
  documentsLink: string;
  unitType: string;
  unitArea: string;
  budgetRange: string;
  purchaseTimeline: string;
  purpose: string;
  message: string;
  fullName: string;
  phone: string;
  email: string;
  consent: boolean;
}

export const EMPTY_REAL_ESTATE_SUBMISSION: RealEstateSubmission = {
  requestType: "",
  city: "",
  otherCity: "",
  district: "",
  landArea: "",
  pricePerMeter: "",
  buildingRatio: "",
  floors: "",
  ownershipStatus: "",
  landUse: "",
  licenseStatus: "",
  paymentStatus: "",
  partnershipModels: [],
  documentsLink: "",
  unitType: "",
  unitArea: "",
  budgetRange: "",
  purchaseTimeline: "",
  purpose: "",
  message: "",
  fullName: "",
  phone: "",
  email: "",
  consent: false,
};

export type RealEstateErrors = Partial<Record<keyof RealEstateSubmission, string>>;

// Which fields each step of the form owns; the form validates one step at a time.
export const REAL_ESTATE_STEP_FIELDS: (keyof RealEstateSubmission)[][] = [
  ["requestType", "city", "otherCity", "district"],
  [
    "landArea",
    "pricePerMeter",
    "buildingRatio",
    "floors",
    "ownershipStatus",
    "landUse",
    "licenseStatus",
    "paymentStatus",
    "partnershipModels",
    "documentsLink",
    "unitType",
    "unitArea",
    "budgetRange",
    "purchaseTimeline",
    "purpose",
    "message",
  ],
  ["fullName", "phone", "email", "consent"],
];

const MAX_LENGTHS: Partial<Record<keyof RealEstateSubmission, number>> = {
  otherCity: 80,
  district: 120,
  documentsLink: 500,
  message: 2000,
  fullName: 80,
  phone: 30,
  email: 120,
};

/** Reads a number typed with Arabic digits or thousands separators; NaN when it isn't one. */
export function parseLocalizedNumber(value: string): number {
  const cleaned = toLatinDigits(value.trim()).replace(/[,٬\s]/g, "").replace("٫", ".");
  return cleaned ? Number(cleaned) : NaN;
}

/** Land area × price per meter, or null until both are valid. */
export function estimatedLandTotal(values: Pick<RealEstateSubmission, "landArea" | "pricePerMeter">): number | null {
  const area = parseLocalizedNumber(values.landArea);
  const price = parseLocalizedNumber(values.pricePerMeter);
  return area > 0 && price > 0 ? area * price : null;
}

/** Someone can fill in one path and then switch, so answers from the other path are dropped. */
export function keepChosenPathOnly(values: RealEstateSubmission): RealEstateSubmission {
  const empty = EMPTY_REAL_ESTATE_SUBMISSION;
  return values.requestType === "land_owner"
    ? {
        ...values,
        unitType: empty.unitType,
        unitArea: empty.unitArea,
        budgetRange: empty.budgetRange,
        purchaseTimeline: empty.purchaseTimeline,
        purpose: empty.purpose,
      }
    : {
        ...values,
        landArea: empty.landArea,
        pricePerMeter: empty.pricePerMeter,
        buildingRatio: empty.buildingRatio,
        floors: empty.floors,
        ownershipStatus: empty.ownershipStatus,
        landUse: empty.landUse,
        licenseStatus: empty.licenseStatus,
        paymentStatus: empty.paymentStatus,
        partnershipModels: empty.partnershipModels,
        documentsLink: empty.documentsLink,
      };
}

export function validateRealEstateSubmission(values: RealEstateSubmission): RealEstateErrors {
  const errors: RealEstateErrors = {};

  if (!REAL_ESTATE_REQUEST_TYPES.some((type) => type.value === values.requestType)) {
    errors.requestType = "اختر نوع الطلب";
  }
  if (!NEW_URBAN_COMMUNITIES.includes(values.city)) errors.city = "اختر المجتمع العمراني";
  if (values.city === OTHER_CITY && !values.otherCity.trim()) errors.otherCity = "اكتب اسم المدينة";
  if (!values.district.trim()) errors.district = "اكتب الحي أو المجاورة";

  if (values.requestType === "land_owner") {
    if (!(parseLocalizedNumber(values.landArea) > 0)) errors.landArea = "اكتب مساحة الأرض بالمتر المربع";
    if (!(parseLocalizedNumber(values.pricePerMeter) > 0)) errors.pricePerMeter = "اكتب السعر التقديري للمتر بالجنيه";
    const ratio = parseLocalizedNumber(values.buildingRatio);
    if (!(ratio > 0 && ratio <= 100)) errors.buildingRatio = "اكتب نسبة بنائية من 1 إلى 100";
    const floors = parseLocalizedNumber(values.floors);
    if (!Number.isInteger(floors) || floors < 1 || floors > 100) errors.floors = "اكتب عدد الأدوار";
    if (!OWNERSHIP_STATUSES.includes(values.ownershipStatus)) errors.ownershipStatus = "اختر موقف الملكية";
    if (!LAND_USES.includes(values.landUse)) errors.landUse = "اختر نشاط الأرض";
    if (!LICENSE_STATUSES.includes(values.licenseStatus)) errors.licenseStatus = "اختر موقف رخصة البناء";
    if (!LAND_PAYMENT_STATUSES.includes(values.paymentStatus)) errors.paymentStatus = "اختر موقف سداد الأرض";
    if (
      values.partnershipModels.length === 0 ||
      values.partnershipModels.some((model) => !PARTNERSHIP_MODELS.includes(model))
    ) {
      errors.partnershipModels = "اختر شكلًا واحدًا على الأقل";
    }
    if (values.documentsLink.trim() && !/^https?:\/\/\S+$/i.test(values.documentsLink.trim())) {
      errors.documentsLink = "اكتب رابطًا صحيحًا يبدأ بـ https://";
    }
  }

  if (values.requestType === "unit_buyer") {
    if (!UNIT_TYPES.includes(values.unitType)) errors.unitType = "اختر نوع الوحدة";
    if (!UNIT_AREAS.includes(values.unitArea)) errors.unitArea = "اختر المساحة المطلوبة";
    if (!BUDGET_RANGES.includes(values.budgetRange)) errors.budgetRange = "اختر الميزانية التقريبية";
    if (!PURCHASE_TIMELINES.includes(values.purchaseTimeline)) errors.purchaseTimeline = "اختر موعد الشراء";
    if (!PURCHASE_PURPOSES.includes(values.purpose)) errors.purpose = "اختر الغرض من الشراء";
  }

  if (values.fullName.trim().length < 2) errors.fullName = "اكتب اسمك بالكامل";
  const phoneDigits = toLatinDigits(values.phone).replace(/\D/g, "");
  if (phoneDigits.length < 8 || phoneDigits.length > 15) errors.phone = "اكتب رقم هاتف صحيح";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "اكتب بريدًا إلكترونيًا صحيحًا";
  }
  if (!values.consent) errors.consent = "يلزم الموافقة لإرسال الطلب";

  for (const [field, max] of Object.entries(MAX_LENGTHS)) {
    const key = field as keyof RealEstateSubmission;
    if (String(values[key]).length > max) errors[key] = `الحد الأقصى ${max} حرف`;
  }

  return errors;
}
