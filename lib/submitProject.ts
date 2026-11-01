// Shared by the public form (components/SubmitProjectForm.tsx) and its API route,
// so options and validation rules stay identical on both sides.

export const REQUEST_TYPES = [
  {
    value: "idea",
    label: "فكرة مشروع",
    description: "لديك فكرة واعدة وتبحث عن شريك يساعدك على تحويلها إلى مشروع قائم.",
  },
  {
    value: "investment",
    label: "مشروع قائم يحتاج إلى استثمار",
    description: "مشروعك يعمل بالفعل ويحتاج إلى تمويل أو شريك استثماري.",
  },
  {
    value: "expansion",
    label: "توسّع مشروع قائم",
    description: "مشروعك ناجح وتريد التوسع بفروع أو خطوط إنتاج أو أسواق جديدة.",
  },
];

export const SECTORS = [
  "التطوير العقاري",
  "الزراعة والإنتاج الحيواني",
  "الصناعة والتصنيع",
  "مواد البناء والتعدين",
  "التجارة والتوزيع",
  "الأغذية والمطاعم",
  "السياحة والفنادق",
  "الصحة",
  "التعليم",
  "التكنولوجيا",
  "الطاقة",
  "النقل والخدمات اللوجستية",
  "قطاع آخر",
];

export const IDEA_STAGES = [
  "فكرة أولية",
  "بحث سوق مبدئي",
  "دراسة جدوى جاهزة",
  "نموذج أولي أو تجربة",
];

export const REVENUE_RANGES = [
  "لم يبدأ تحقيق إيرادات بعد",
  "أقل من مليون جنيه",
  "من 1 إلى 5 ملايين جنيه",
  "من 5 إلى 20 مليون جنيه",
  "من 20 إلى 100 مليون جنيه",
  "أكثر من 100 مليون جنيه",
];

export const TEAM_SIZES = ["أقل من 10", "من 10 إلى 50", "من 51 إلى 200", "أكثر من 200"];

export const FUNDING_RANGES = [
  "أقل من مليون جنيه",
  "من 1 إلى 5 ملايين جنيه",
  "من 5 إلى 20 مليون جنيه",
  "من 20 إلى 50 مليون جنيه",
  "من 50 إلى 100 مليون جنيه",
  "أكثر من 100 مليون جنيه",
  "لم يتحدد بعد",
];

export const SUPPORT_TYPES = [
  "تمويل واستثمار",
  "شراكة استراتيجية",
  "إدارة التنفيذ والتشغيل",
  "دراسة جدوى وهيكلة تمويل",
];

export const AVAILABLE_DOCUMENTS = [
  "دراسة جدوى",
  "خطة عمل",
  "قوائم مالية",
  "تراخيص وسجلات",
  "أرض أو موقع",
];

export const MAX_FILES = 3;
// Vercel rejects request bodies above 4.5 MB, so attachments must stay under that.
export const MAX_TOTAL_FILE_BYTES = 4 * 1024 * 1024;
export const ALLOWED_FILE_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".jpg",
  ".jpeg",
  ".png",
];

export interface ProjectSubmission {
  requestType: string;
  projectName: string;
  sector: string;
  location: string;
  description: string;
  advantage: string;
  ideaStage: string;
  foundedYear: string;
  annualRevenue: string;
  teamSize: string;
  fundingRange: string;
  useOfFunds: string;
  supportTypes: string[];
  availableDocuments: string[];
  documentsLink: string;
  fullName: string;
  phone: string;
  email: string;
  company: string;
  jobTitle: string;
  consent: boolean;
}

export const EMPTY_SUBMISSION: ProjectSubmission = {
  requestType: "",
  projectName: "",
  sector: "",
  location: "",
  description: "",
  advantage: "",
  ideaStage: "",
  foundedYear: "",
  annualRevenue: "",
  teamSize: "",
  fundingRange: "",
  useOfFunds: "",
  supportTypes: [],
  availableDocuments: [],
  documentsLink: "",
  fullName: "",
  phone: "",
  email: "",
  company: "",
  jobTitle: "",
  consent: false,
};

export type SubmissionErrors = Partial<Record<keyof ProjectSubmission, string>>;

// Which fields each step of the form owns; the form validates one step at a time.
export const STEP_FIELDS: (keyof ProjectSubmission)[][] = [
  ["requestType", "projectName", "sector", "location"],
  ["description", "advantage", "ideaStage", "foundedYear", "annualRevenue", "teamSize"],
  ["fundingRange", "useOfFunds", "supportTypes", "documentsLink"],
  ["fullName", "phone", "email", "company", "jobTitle", "consent"],
];

const MAX_LENGTHS: Partial<Record<keyof ProjectSubmission, number>> = {
  projectName: 120,
  location: 120,
  description: 2000,
  advantage: 1000,
  useOfFunds: 1000,
  documentsLink: 500,
  fullName: 80,
  phone: 30,
  email: 120,
  company: 120,
  jobTitle: 80,
};

/** Converts Arabic-Indic and Persian digits so phone numbers and years validate. */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export function validateSubmission(values: ProjectSubmission): SubmissionErrors {
  const errors: SubmissionErrors = {};
  const isExisting = values.requestType === "investment" || values.requestType === "expansion";

  if (!REQUEST_TYPES.some((type) => type.value === values.requestType)) {
    errors.requestType = "اختر نوع الطلب";
  }
  if (!values.projectName.trim()) errors.projectName = "اكتب اسم المشروع";
  if (!SECTORS.includes(values.sector)) errors.sector = "اختر قطاع المشروع";
  if (!values.location.trim()) errors.location = "اكتب مدينة أو محافظة المشروع";

  if (values.description.trim().length < 30) {
    errors.description = "اكتب وصفًا لا يقل عن 30 حرفًا";
  }
  if (!values.advantage.trim()) errors.advantage = "وضّح ما يميز مشروعك";

  if (values.requestType === "idea" && !IDEA_STAGES.includes(values.ideaStage)) {
    errors.ideaStage = "اختر مرحلة الفكرة";
  }
  if (isExisting) {
    const year = Number(toLatinDigits(values.foundedYear.trim()));
    if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()) {
      errors.foundedYear = "اكتب سنة تأسيس صحيحة";
    }
    if (!REVENUE_RANGES.includes(values.annualRevenue)) errors.annualRevenue = "اختر حجم الإيرادات";
    if (!TEAM_SIZES.includes(values.teamSize)) errors.teamSize = "اختر حجم فريق العمل";
  }

  if (!FUNDING_RANGES.includes(values.fundingRange)) errors.fundingRange = "اختر حجم التمويل المطلوب";
  if (!values.useOfFunds.trim()) errors.useOfFunds = "وضّح كيف سيُستخدم التمويل";
  if (
    values.supportTypes.length === 0 ||
    values.supportTypes.some((type) => !SUPPORT_TYPES.includes(type))
  ) {
    errors.supportTypes = "اختر نوع دعم واحدًا على الأقل";
  }
  if (values.documentsLink.trim() && !/^https?:\/\/\S+$/i.test(values.documentsLink.trim())) {
    errors.documentsLink = "اكتب رابطًا صحيحًا يبدأ بـ https://";
  }

  if (values.fullName.trim().length < 2) errors.fullName = "اكتب اسمك بالكامل";
  const phoneDigits = toLatinDigits(values.phone).replace(/\D/g, "");
  if (phoneDigits.length < 8 || phoneDigits.length > 15) errors.phone = "اكتب رقم هاتف صحيح";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "اكتب بريدًا إلكترونيًا صحيحًا";
  }
  if (!values.consent) errors.consent = "يلزم الموافقة لإرسال الطلب";

  for (const [field, max] of Object.entries(MAX_LENGTHS)) {
    const key = field as keyof ProjectSubmission;
    if (String(values[key]).length > max) errors[key] = `الحد الأقصى ${max} حرف`;
  }

  return errors;
}
