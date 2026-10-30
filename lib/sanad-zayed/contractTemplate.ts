// Contract templates: variable registry, value resolution and a light markup
// parser shared by the template editor and the printable contract document.
//
// Template markup (one block per line group):
//   # heading            → clause heading
//   | label | value |    → row of a two-column data table (consecutive rows form one table)
//   [[signatures]]       → signature block for both parties
//   [[installments]]     → table of the pending-amount installment schedule
//   [[if key]] … [[else]] … [[endif]] → lines kept only when {{key}} has a non-zero value
//   blank line           → paragraph break
//   **text**             → bold
//   {{key}}              → variable placeholder

export type VarSource = "contract" | "stage" | "manual";

export interface TemplateVar {
  key: string;
  label: string;
  source: VarSource; // contract = auto from contract/investor data; stage = default set on the template; manual = filled per contract
  hint?: string;
}

export const TEMPLATE_VARS: TemplateVar[] = [
  // ── From the contract / investor record ──
  { key: "investor_name", label: "اسم الممول", source: "contract" },
  { key: "investor_national_id", label: "الرقم القومي / جواز السفر", source: "contract" },
  { key: "investor_address", label: "عنوان الممول", source: "contract" },
  { key: "investor_job", label: "وظيفة الممول", source: "contract" },
  { key: "investor_phone", label: "هاتف الممول", source: "contract" },
  { key: "investor_email", label: "البريد الإلكتروني للممول", source: "contract", hint: "المراسلات عليه تعتبر إخطارًا رسميًا" },
  { key: "investor_title", label: "لقب الممول (السيد / السيدة)", source: "contract", hint: "حسب نوع الممول" },
  { key: "investor_referred", label: "ويشار إليه / إليها", source: "contract", hint: "حسب نوع الممول" },
  { key: "stage_name", label: "اسم المرحلة", source: "contract" },
  { key: "contract_date", label: "تاريخ العقد والسداد", source: "contract" },
  { key: "contract_day", label: "يوم التوقيع", source: "contract" },
  { key: "financing_amount", label: "مبلغ التمويل (رقمًا)", source: "contract", hint: "المساحة × تكلفة المتر المرجعي" },
  { key: "financing_amount_words", label: "مبلغ التمويل (حروفًا)", source: "contract" },
  { key: "area", label: "المساحة الاسترشادية (م²)", source: "contract" },
  { key: "meter_cost", label: "تكلفة المتر المرجعي", source: "contract" },
  { key: "max_area", label: "حد الزيادة (م²)", source: "contract", hint: "المساحة × (1 + نسبة الزيادة)" },
  { key: "financing_end_date", label: "نهاية مدة التمويل", source: "contract", hint: "تاريخ العقد + مدة التمويل" },
  { key: "paid_amount", label: "المسدد عند التوقيع", source: "contract", hint: "إجمالي التمويل × نسبة المسدد عند التوقيع" },
  { key: "paid_amount_words", label: "المسدد (حروفًا)", source: "contract" },
  { key: "pending_amount", label: "المبلغ المتبقي", source: "contract", hint: "إجمالي التمويل − المسدد" },
  { key: "pending_amount_words", label: "المتبقي (حروفًا)", source: "contract" },
  { key: "installments", label: "جدول أقساط المتبقي", source: "contract", hint: "يُحسب من عدد الأقساط والفترة بينها" },

  // ── Filled per contract before review ──
  { key: "transaction_no", label: "رقم المعاملة", source: "manual" },
  { key: "investor_gender", label: "النوع", source: "manual", hint: "ذكر / أنثى" },
  { key: "investor_nationality", label: "جنسية الممول", source: "manual" },
  { key: "payment_method", label: "طريقة السداد", source: "manual", hint: "مثال: نقدًا / بتحويل بنكي" },

  // ── Stage defaults (set once on the template) ──
  { key: "company_address", label: "مقر الشركة", source: "stage" },
  { key: "company_email", label: "البريد الإلكتروني للشركة", source: "stage", hint: "المراسلات عليه تعتبر إخطارًا رسميًا" },
  { key: "company_rep_name", label: "ممثل الشركة", source: "stage" },
  { key: "company_rep_title", label: "صفة ممثل الشركة", source: "stage" },
  { key: "plot_no", label: "رقم القطعة", source: "stage" },
  { key: "plot_code", label: "كود القطعة", source: "stage" },
  { key: "land_area", label: "مساحة الأرض الإجمالية (م²)", source: "stage" },
  { key: "separation_date", label: "تاريخ ملحق فصل القطعة", source: "stage" },
  { key: "closing_date", label: "تاريخ الإقفال النهائي للترخيص", source: "stage" },
  { key: "funding_months", label: "مدة التمويل (شهور)", source: "stage" },
  { key: "area_increase_pct", label: "حد الزيادة الاسترشادية %", source: "stage" },
  { key: "priority_days", label: "نافذة الأولوية (أيام عمل)", source: "stage" },
  { key: "compensation_pct", label: "التعويض الاتفاقي % سنويًا", source: "stage" },
  { key: "settlement_days", label: "مدة السداد بعد المسار النقدي (يوم)", source: "stage" },
  { key: "first_refund_pct", label: "نسبة الدفعة الأولى من الرد %", source: "stage" },
  { key: "first_refund_days", label: "مهلة الدفعة الأولى (يوم)", source: "stage" },
  { key: "refund_installments", label: "عدد أقساط الرد الشهرية", source: "stage" },
  { key: "penalty_pct", label: "الشرط الجزائي %", source: "stage" },
  { key: "offer_response_days", label: "مهلة الرد على العرض (يوم)", source: "stage" },
  { key: "force_majeure_days", label: "مهلة إخطار القوة القاهرة (أيام عمل)", source: "stage" },
  { key: "cure_days", label: "مهلة معالجة الإخلال (أيام عمل)", source: "stage" },
  { key: "amicable_days", label: "مدة التسوية الودية (يوم)", source: "stage" },
  { key: "upfront_pct", label: "نسبة المسدد عند التوقيع %", source: "stage", hint: "100 = سداد كامل عند التوقيع" },
  { key: "installments_count", label: "عدد أقساط المتبقي", source: "stage" },
  { key: "installment_interval_months", label: "الفترة بين الأقساط (شهور)", source: "stage" },
];

export const DEFAULT_STAGE_VALUES: Record<string, string> = {
  company_address: "",
  company_email: "",
  company_rep_name: "",
  company_rep_title: "",
  plot_no: "208ج",
  plot_code: "2017/230/208ج",
  land_area: "4,771.50",
  separation_date: "02/08/2026",
  closing_date: "30/06/2027",
  funding_months: "12",
  area_increase_pct: "10",
  priority_days: "45",
  compensation_pct: "7",
  settlement_days: "120",
  first_refund_pct: "25",
  first_refund_days: "30",
  refund_installments: "3",
  penalty_pct: "5",
  offer_response_days: "15",
  force_majeure_days: "5",
  cure_days: "10",
  amicable_days: "15",
  upfront_pct: "100",
  installments_count: "3",
  installment_interval_months: "1",
};

export const DEFAULT_MANUAL_VALUES: Record<string, string> = {
  investor_gender: "ذكر",
  investor_nationality: "مصري",
  payment_method: "نقدًا",
};

export const PLACEHOLDER = "[●]";

// ── Formatting helpers ──────────────────────────────────────────────────

const AR_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export function formatDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function addMonths(d: Date, months: number): Date {
  const r = new Date(d.getTime());
  r.setUTCMonth(r.getUTCMonth() + months);
  return r;
}

// Arabic number-to-words for amounts in Egyptian pounds (integer part).
const ONES = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
const TEENS = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
const TENS = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const HUNDREDS = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

function below1000(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) parts.push(HUNDREDS[h]);
  if (rest) {
    if (rest < 10) parts.push(ONES[rest]);
    else if (rest < 20) parts.push(TEENS[rest - 10]);
    else {
      const o = rest % 10;
      const t = Math.floor(rest / 10);
      parts.push(o ? `${ONES[o]} و${TENS[t]}` : TENS[t]);
    }
  }
  return parts.join(" و");
}

const SCALES: { value: number; one: string; two: string; plural: string }[] = [
  { value: 1e9, one: "مليار", two: "ملياران", plural: "مليارات" },
  { value: 1e6, one: "مليون", two: "مليونان", plural: "ملايين" },
  { value: 1e3, one: "ألف", two: "ألفان", plural: "آلاف" },
];

export function numberToArabicWords(value: number): string {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return "صفر";
  const parts: string[] = [];
  for (const s of SCALES) {
    const g = Math.floor(n / s.value);
    n %= s.value;
    if (!g) continue;
    if (g === 1) parts.push(s.one);
    else if (g === 2) parts.push(s.two);
    else if (g <= 10) parts.push(`${below1000(g)} ${s.plural}`);
    else parts.push(`${below1000(g)} ${s.one}`);
  }
  if (n) parts.push(below1000(n));
  return parts.join(" و");
}

export function amountInWords(value: number): string {
  return `${numberToArabicWords(value)} جنيه مصري لا غير`;
}

// ── Value resolution ────────────────────────────────────────────────────

export interface ContractData {
  contract_date?: string | null;
  total_contract_value?: number | string | null;
  unit_quantity?: number | string | null;
  unit_price_at_contract?: number | string | null;
  investor?: {
    name?: string | null;
    national_id?: string | null;
    address_in_national_id?: string | null;
    job_in_national_id?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  stage?: { name?: string | null } | null;
  /** Installments already scheduled on the contract record, if any. */
  installments?: { due_date?: string | null; amount?: number | string | null; status?: string | null }[] | null;
  /** What the investor has actually paid that can count towards this contract (wallet share). */
  wallet_paid?: number | null;
}

export interface ScheduleRow { date: string; amount: string }

/** Parses numbers typed with thousands separators or Arabic-Indic digits. */
export function parseAmount(v: unknown): number {
  const raw = v === null || v === undefined ? "" : String(v).trim();
  const s = raw.replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[,٬\s]/g, "");
  if (!s) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function parseDmy(v: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((v ?? "").trim());
  if (!m) return null;
  return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
}

/** Schedule text format: one installment per line, "dd/mm/yyyy | amount". */
export function parseSchedule(text: string): ScheduleRow[] {
  return (text ?? "").split("\n").map(l => l.trim()).filter(Boolean).map(l => {
    const [date, amount] = l.split("|").map(x => x.trim());
    return { date: date ?? "", amount: amount ?? "" };
  });
}

export function formatSchedule(rows: ScheduleRow[]): string {
  return rows.map(r => `${r.date} | ${r.amount}`).join("\n");
}

/** Splits the pending amount into equal installments (remainder on the last). */
export function generateSchedule(pending: number, count: number, intervalMonths: number, start: Date | null): ScheduleRow[] {
  if (!(pending > 0) || !(count >= 1)) return [];
  const n = Math.floor(count);
  const step = intervalMonths > 0 ? intervalMonths : 1;
  const base = Math.floor(pending / n);
  return Array.from({ length: n }, (_, i) => ({
    date: start ? formatDate(addMonths(start, step * (i + 1))) : "",
    amount: formatNumber(i === n - 1 ? Math.round((pending - base * (n - 1)) * 100) / 100 : base),
  }));
}

function clean(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

/** Values derived from the contract/investor record (before overrides). */
export function contractAutoValues(c: ContractData, stageDefaults: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  out.investor_name = clean(c.investor?.name);
  out.investor_national_id = clean(c.investor?.national_id);
  out.investor_address = clean(c.investor?.address_in_national_id);
  out.investor_job = clean(c.investor?.job_in_national_id);
  out.investor_phone = clean(c.investor?.phone);
  out.investor_email = clean(c.investor?.email);
  out.stage_name = clean(c.stage?.name);

  const date = parseIsoDate(clean(c.contract_date));
  if (date) {
    out.contract_date = formatDate(date);
    out.contract_day = AR_DAYS[date.getUTCDay()];
    const months = Number(stageDefaults.funding_months);
    if (months > 0) out.financing_end_date = formatDate(addMonths(date, months));
  }

  // The price is always area × reference meter cost (not the stored contract
  // total, which may include a management fee).
  const amount = Number(c.unit_quantity) * Number(c.unit_price_at_contract) || Number(c.total_contract_value);
  if (amount > 0) {
    out.financing_amount = formatNumber(amount);
    out.financing_amount_words = amountInWords(amount);
  }
  const area = Number(c.unit_quantity);
  if (area > 0) {
    out.area = formatNumber(area);
    const pct = Number(stageDefaults.area_increase_pct);
    if (pct >= 0) out.max_area = formatNumber(Math.round(area * (1 + pct / 100) * 100) / 100);
  }
  const price = Number(c.unit_price_at_contract);
  if (price > 0) out.meter_cost = formatNumber(price);
  return out;
}

/**
 * Final values: per-contract overrides win, then data derived from the
 * contract, then the stage template defaults, then the manual defaults.
 */
/**
 * Values that always come from the contract record (edited from the
 * contract itself, never per document) so the document, the wallet and the
 * recorded installments can never disagree with the system.
 */
export const CONTRACT_LOCKED_VARS = ["area", "meter_cost", "financing_amount", "financing_amount_words", "contract_date", "investor_name", "stage_name"];

/** Drops per-document overrides of contract-owned values. */
export function stripLockedOverrides(overrides: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(overrides ?? {})) if (!CONTRACT_LOCKED_VARS.includes(k)) out[k] = v;
  return out;
}

export function resolveValues(
  c: ContractData,
  stageDefaults: Record<string, string>,
  overrides: Record<string, string>
): Record<string, string> {
  const stage = { ...DEFAULT_STAGE_VALUES, ...stageDefaults };
  const merged: Record<string, string> = { ...DEFAULT_MANUAL_VALUES, ...stage };
  for (const [k, v] of Object.entries(contractAutoValues(c, stage))) if (v) merged[k] = v;
  overrides = stripLockedOverrides(overrides);
  for (const [k, v] of Object.entries(overrides ?? {})) if (clean(v)) merged[k] = clean(v);

  // Re-derive dependent values from the final (possibly overridden) inputs,
  // unless the dependent value itself was overridden.
  const ov = (k: string) => !!clean(overrides?.[k]);

  // Gendered wording for the investor (السيد / السيدة, إليه / إليها, مصري / مصرية).
  const female = isFemale(merged.investor_gender);
  if (!ov("investor_title")) merged.investor_title = female ? "السيدة" : "السيد";
  if (!ov("investor_referred")) merged.investor_referred = female ? "ويشار إليها" : "ويشار إليه";
  if (female && !ov("investor_nationality") && merged.investor_nationality === "مصري") merged.investor_nationality = "مصرية";

  const date = parseDmy(merged.contract_date);
  if (date) {
    if (!ov("contract_day")) merged.contract_day = AR_DAYS[date.getUTCDay()];
    const months = parseAmount(merged.funding_months);
    if (!ov("financing_end_date") && months > 0) merged.financing_end_date = formatDate(addMonths(date, months));
  }
  const area = parseAmount(merged.area);
  const increase = parseAmount(merged.area_increase_pct);
  if (!ov("max_area") && area > 0 && increase >= 0) merged.max_area = formatNumber(Math.round(area * (1 + increase / 100) * 100) / 100);

  const meterCost = parseAmount(merged.meter_cost);
  if (!ov("financing_amount") && area > 0 && meterCost > 0) {
    merged.financing_amount = formatNumber(Math.round(area * meterCost * 100) / 100);
  }

  const total = parseAmount(merged.financing_amount);
  if (total > 0) {
    if (!ov("financing_amount_words")) merged.financing_amount_words = amountInWords(total);

    const recorded = (c.installments ?? []).filter(i => Number(i.amount) > 0);
    const recordedPending = recorded.filter(i => i.status !== "PAID");
    const recordedPendingSum = recordedPending.reduce((s, i) => s + Number(i.amount), 0);

    let paid = ov("paid_amount") ? parseAmount(merged.paid_amount) : NaN;
    if (!Number.isFinite(paid)) {
      // Wallet share → recorded installments → template upfront %.
      const pct = parseAmount(merged.upfront_pct);
      const wallet = c.wallet_paid;
      paid = typeof wallet === "number" && Number.isFinite(wallet)
        ? Math.min(Math.max(wallet, 0), total)
        : recorded.length
          ? total - recordedPendingSum
          : Number.isFinite(pct) ? Math.round(total * Math.min(Math.max(pct, 0), 100)) / 100 : total;
    }
    let pending = ov("pending_amount") ? parseAmount(merged.pending_amount) : NaN;
    if (!Number.isFinite(pending)) pending = Math.max(Math.round((total - paid) * 100) / 100, 0);

    if (!ov("paid_amount")) merged.paid_amount = formatNumber(paid);
    if (!ov("paid_amount_words")) merged.paid_amount_words = paid > 0 ? amountInWords(paid) : "";
    if (!ov("pending_amount")) merged.pending_amount = formatNumber(pending);
    if (!ov("pending_amount_words")) merged.pending_amount_words = pending > 0 ? amountInWords(pending) : "";

    if (!ov("installments")) {
      const useRecorded = recordedPending.length > 0 && Math.abs(recordedPendingSum - pending) < 0.5;
      const rows: ScheduleRow[] = useRecorded
        ? recordedPending.map(i => {
            const d = parseIsoDate(clean(i.due_date));
            return { date: d ? formatDate(d) : "", amount: formatNumber(Number(i.amount)) };
          })
        : generateSchedule(pending, parseAmount(merged.installments_count), parseAmount(merged.installment_interval_months), date);
      merged.installments = formatSchedule(rows);
    }
  }
  return merged;
}

export const GENDER_OPTIONS = ["ذكر", "أنثى"];

export function isFemale(v: string | undefined): boolean {
  return /^(أنثى|انثى|انثي|أنثي|female|f)$/i.test(clean(v));
}

/** True when a value is present and, if numeric, not zero. */
function truthy(v: string | undefined): boolean {
  const s = clean(v);
  if (!s) return false;
  const n = parseAmount(s);
  return Number.isFinite(n) ? n !== 0 : true;
}

/** Applies [[if key]] / [[else]] / [[endif]] line blocks (nestable). */
export function applyConditionals(body: string, values: Record<string, string>): string {
  const out: string[] = [];
  const stack: { active: boolean; parentActive: boolean }[] = [];
  const active = () => (stack.length ? stack[stack.length - 1].active : true);
  for (const line of (body ?? "").replace(/\r\n/g, "\n").split("\n")) {
    const t = line.trim();
    const m = /^\[\[if\s+([a-z0-9_]+)\]\]$/i.exec(t);
    if (m) { const parent = active(); stack.push({ active: parent && truthy(values[m[1]]), parentActive: parent }); continue; }
    if (/^\[\[else\]\]$/i.test(t) && stack.length) { const top = stack[stack.length - 1]; top.active = top.parentActive && !top.active; continue; }
    if (/^\[\[endif\]\]$/i.test(t) && stack.length) { stack.pop(); continue; }
    if (active()) out.push(line);
  }
  return out.join("\n");
}

// ── Markup parsing ──────────────────────────────────────────────────────

export type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "table"; rows: [string, string][] }
  | { type: "signatures" }
  | { type: "installments" };

export function parseTemplate(body: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let table: [string, string][] | null = null;

  const flushPara = () => {
    if (para.length) blocks.push({ type: "paragraph", text: para.join(" ") });
    para = [];
  };
  const flushTable = () => {
    if (table && table.length) blocks.push({ type: "table", rows: table });
    table = null;
  };

  for (const raw of (body ?? "").replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) { flushPara(); flushTable(); continue; }
    if (line.startsWith("|")) {
      flushPara();
      const cells = line.replace(/^\|/, "").replace(/\|$/, "").split("|").map(s => s.trim());
      (table ??= []).push([cells[0] ?? "", cells.slice(1).join(" | ")]);
      continue;
    }
    flushTable();
    if (line.startsWith("#")) { flushPara(); blocks.push({ type: "heading", text: line.replace(/^#+\s*/, "") }); continue; }
    if (line === "[[signatures]]") { flushPara(); blocks.push({ type: "signatures" }); continue; }
    if (line === "[[installments]]") { flushPara(); blocks.push({ type: "installments" }); continue; }
    para.push(line);
  }
  flushPara();
  flushTable();
  return blocks;
}

export type Segment = { kind: "text"; text: string; bold?: boolean } | { kind: "var"; key: string; value: string; bold?: boolean };

/** Splits a line into text / variable segments, honouring **bold** spans. */
export function segmentText(text: string, values: Record<string, string>): Segment[] {
  const out: Segment[] = [];
  text.split(/(\*\*[^*]+\*\*)/g).forEach(chunk => {
    if (!chunk) return;
    const bold = chunk.startsWith("**") && chunk.endsWith("**") && chunk.length > 4;
    const inner = bold ? chunk.slice(2, -2) : chunk;
    inner.split(/(\{\{\s*[a-z0-9_]+\s*\}\})/gi).forEach(part => {
      if (!part) return;
      const m = /^\{\{\s*([a-z0-9_]+)\s*\}\}$/i.exec(part);
      if (m) out.push({ kind: "var", key: m[1], value: clean(values[m[1]]), bold });
      else out.push({ kind: "text", text: part, bold });
    });
  });
  return out;
}

/** Variable keys used in a template body, in order of first appearance. */
export function usedVariables(body: string): string[] {
  const seen = new Set<string>();
  for (const m of (body ?? "").matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi)) seen.add(m[1]);
  return [...seen];
}

/** Variables printed by the header, title block and signature block regardless of the body. */
export const FIXED_VARS = ["transaction_no", "contract_date", "stage_name", "financing_amount", "company_rep_name", "company_rep_title", "investor_name", "investor_national_id", "investor_phone", "company_email", "investor_email"];

/**
 * Variables that will print empty: those used by the active branches of the
 * body plus the fixed header/signature fields, and the installment schedule
 * when the body prints it.
 */
export function missingVariables(body: string, values: Record<string, string>): string[] {
  const active = applyConditionals(body, values);
  const keys = new Set([...usedVariables(active), ...FIXED_VARS]);
  if (active.includes("[[installments]]")) keys.add("installments");
  return [...keys].filter(k => !clean(values[k]));
}

/** Arabic labels for a list of variable keys. */
export function variableLabels(keys: string[]): string[] {
  const labels = Object.fromEntries(TEMPLATE_VARS.map(v => [v.key, v.label]));
  return keys.map(k => labels[k] ?? k);
}

// ── Standard template (converted from the approved pre-licensing financing contract) ──

// ── Upgrading templates saved before the paid / installments clause existed ──

const OLD_FINANCING_ROW = "| مبلغ التمويل الفعلي | {{financing_amount}} جنيه مصري ({{financing_amount_words}}) |";
const PENDING_ROWS = `[[if pending_amount]]
| المسدد عند التوقيع | {{paid_amount}} جنيه مصري |
| المبلغ المتبقي | {{pending_amount}} جنيه مصري يسدد على أقساط وفق جدول الأقساط ببند سادسًا |
[[endif]]`;
const OLD_FULL_PAYMENT = "يقر الطرفان بأن الشركة تسلمت مبلغ التمويل {{payment_method}} كاملًا بمجلس العقد في تاريخ السداد المبين في جدول بيانات المعاملة، دون تحفظ أو خصم أو تأجيل، ويوقع ممثل الشركة المفوض على إيصال استلام مستقل يبين المبلغ بالأرقام والحروف وبيانات المستلم وصفته ومكان وتاريخ الاستلام.";
const PARTIAL_PAYMENT_BLOCK = `[[if pending_amount]]
يقر الطرفان بأن الشركة تسلمت من مبلغ التمويل مبلغًا قدره **{{paid_amount}} جنيه مصري ({{paid_amount_words}})** {{payment_method}} بمجلس العقد في تاريخ السداد المبين في جدول بيانات المعاملة، ويلتزم الممول بسداد باقي مبلغ التمويل وقدره **{{pending_amount}} جنيه مصري ({{pending_amount_words}})** على أقساط في المواعيد المبينة في الجدول الآتي، ويوقع ممثل الشركة المفوض على إيصال استلام مستقل عن كل دفعة يبين المبلغ بالأرقام والحروف وبيانات المستلم وصفته ومكان وتاريخ الاستلام.

[[installments]]

[[else]]
${OLD_FULL_PAYMENT}
[[endif]]`;
const OLD_INVESTOR_TITLE = "السيد/السيدة **{{investor_name}}**";
const NEW_INVESTOR_TITLE = "{{investor_title}}/ **{{investor_name}}**";
const OLD_INVESTOR_REFERRED = "ويشار إليه لاحقًا بـ«الممول»";
const NEW_INVESTOR_REFERRED = "{{investor_referred}} لاحقًا بـ«الممول»";
const OLD_COMPANY_ADDRESS = "ومقرها: {{company_address}}، ويمثلها";
const NEW_COMPANY_ADDRESS = "ومقرها: {{company_address}}، وبريدها الإلكتروني {{company_email}}، ويمثلها";
const OLD_INVESTOR_ADDRESS = "والعنوان {{investor_address}}، {{investor_referred}}";
const NEW_INVESTOR_ADDRESS = "والعنوان {{investor_address}}، والبريد الإلكتروني {{investor_email}}، {{investor_referred}}";
const OLD_NOTICES = "توجه الإخطارات إلى العناوين ووسائل الاتصال المبينة في هذا العقد، ويجوز الاتفاق على البريد الإلكتروني أو الرسائل الفورية كوسيلة إخطار بشرط إثبات الإرسال والاستلام.";
const NEW_NOTICES = "توجه الإخطارات والمراسلات بين الطرفين إلى العناوين والبريد الإلكتروني المبين لكل طرف في بند أطراف العقد، ويعتبر ما يرسل إلى البريد الإلكتروني المبين لأي طرف إخطارًا رسميًا صحيحًا منتجًا لكافة آثاره القانونية من تاريخ إرساله، ويكون مستخرج الرسالة المرسلة حجة في إثبات الإخطار. ويلتزم كل طرف بإخطار الطرف الآخر كتابةً بأي تغيير في عنوانه أو بريده الإلكتروني، وإلا اعتبرت المراسلات على العنوان أو البريد السابق صحيحة ونافذة في حقه.";
const OLD_MAX_AREA = "{{area_increase_pct}}% حتى نحو {{max_area}} م² إجماليًا";
const NEW_MAX_AREA = "{{area_increase_pct}}% من المساحة الاسترشادية";

/**
 * Brings a template body saved from an older standard template up to date:
 * adds the paid / pending rows and the installments clause (only where the
 * original wording is still unchanged) and states the area limit as a %.
 * Bodies that already have the clause, or were reworded, are left alone.
 */
export function upgradeTemplateBody(body: string): string {
  let out = (body ?? "").replace(/\r\n/g, "\n");
  if (!out.includes("[[installments]]") && !out.includes("{{paid_amount}}") && out.includes(OLD_FULL_PAYMENT)) {
    // The sentence that followed on the same line becomes its own paragraph after the block.
    out = out.includes(OLD_FULL_PAYMENT + " ")
      ? out.replace(OLD_FULL_PAYMENT + " ", PARTIAL_PAYMENT_BLOCK + "\n\n")
      : out.replace(OLD_FULL_PAYMENT, PARTIAL_PAYMENT_BLOCK);
    if (out.includes(OLD_FINANCING_ROW + "\n")) out = out.replace(OLD_FINANCING_ROW + "\n", `${OLD_FINANCING_ROW}\n${PENDING_ROWS}\n`);
  }
  return out.replace(OLD_MAX_AREA, NEW_MAX_AREA)
    .replace(OLD_INVESTOR_TITLE, NEW_INVESTOR_TITLE)
    .replace(OLD_INVESTOR_REFERRED, NEW_INVESTOR_REFERRED)
    .replace(OLD_COMPANY_ADDRESS, NEW_COMPANY_ADDRESS)
    .replace(OLD_INVESTOR_ADDRESS, NEW_INVESTOR_ADDRESS)
    .replace(OLD_NOTICES, NEW_NOTICES);
}

export const DEFAULT_TEMPLATE_TITLE = "عقد تمويل خاص للمرحلة السابقة على الترخيص";
export const DEFAULT_TEMPLATE_SUBTITLE = "مشروع سند زايد";

export const DEFAULT_TEMPLATE_BODY = `# أولًا: أطراف العقد
إنه في يوم {{contract_day}} الموافق {{contract_date}}، أبرم هذا العقد بين كل من:

1. **شركة سند برو كابيتال للمشروعات**، شركة مساهمة مصرية، سجل تجاري رقم 11604، ومقرها: {{company_address}}، وبريدها الإلكتروني {{company_email}}، ويمثلها قانونًا السيد/ {{company_rep_name}} بصفته {{company_rep_title}}، ويشار إليها لاحقًا بـ«الشركة».

2. {{investor_title}}/ **{{investor_name}}**، الجنسية {{investor_nationality}}، رقم قومي/جواز سفر {{investor_national_id}}، والعنوان {{investor_address}}، والبريد الإلكتروني {{investor_email}}، {{investor_referred}} لاحقًا بـ«الممول».

# ثانيًا: التعريفات
لأغراض هذا العقد، يكون للكلمات والعبارات الآتية المعنى المبين قرين كل منها ما لم يقتض السياق غير ذلك:

**المشروع:** مشروع «سند زايد» المزمع تطويره على الجزء المرتبط بالقطعة محل المستندات، وفق الموافقات والتراخيص النهائية.

**الأرض أو القطعة:** القطعة رقم {{plot_no}}، بالكود {{plot_code}}، بامتداد مدينة الشيخ زايد، ومساحتها الإجمالية وفق المستندات المتاحة {{land_area}} م².

**مستندات الأرض:** مستندات جهاز مدينة الشيخ زايد، وملف أو ملحق فصل القطعة المؤرخ {{separation_date}}، وكارت وصف وتحديد الملكية والمخططات واتفاق القسمة وأي مستندات مرتبطة مبينة في مستندات العقد.

**المرحلة الأولى:** المرحلة السابقة على صدور رخصة البناء، وتشمل تكلفة تثبيت الأصل وما يرتبط بها من ثمن أو مقابل تعاقدي للأرض ونقل ملكية وتسجيل ورسوم ومستحقات ودراسات وتصميمات واستشارات وتراخيص ومقابل إدارة وتطوير، في حدود المستندات والالتزامات الفعلية.

**تكلفة المتر المرجعي:** التكلفة المبينة في جدول بيانات المعاملة، وتستخدم لأغراض احتساب تكلفة المرحلة الأولى والتسوية أو المقاصة فقط، ولا تمثل سعر بيع نهائيًا للمتر أو للوحدة.

**أساس التسعير الموضوعي:** يحدد بعد صدور الترخيص واعتماد المخططات، وفق المقايسة التفصيلية المعتمدة للأعمال والكميات (BOQ) الخاصة بالوحدة أو المرحلة، مضافًا إليها مقابل الإدارة والتطوير الذي تفصح عنه الشركة كتابة في العرض النهائي، وأي ضرائب أو رسوم قانونية محددة. ولا يعتد بالعرض النهائي قبل بيان هذه العناصر، ولا تلزم هذه العناصر الممول إلا عند قبوله العرض وتوقيع عقد البيع المستقل.

**المساحة الاسترشادية:** مساحة إجمالية قدرها {{area}} مترًا مربعًا شاملة حصة الوحدة في الأجزاء المشتركة ونسبة التحميل والبروز، مع حد زيادة استرشادي لا يجاوز {{area_increase_pct}}% عند توافر وحدة مناسبة بعد الترخيص ووفق أساس التسعير الموضوعي المبين بهذا العقد ومستنداته.

**حدث الترخيص:** صدور رخصة البناء والموافقات اللازمة التي تسمح قانونًا بتحديد الوحدات والتعامل عليها، ولا يكفي لذلك مجرد تقديم طلب أو موافقة مبدئية أو تصميم غير معتمد.

**تاريخ الإقفال النهائي:** {{closing_date}}، وهو آخر موعد مستهدف لصدور الترخيص، ما لم يتفق الطرفان كتابة على خلاف ذلك.

**التمويل الفعلي:** المبلغ الذي تسلمته الشركة وثبت بإيصال الاستلام أو مستند السداد المقبول.

**المسار العقاري:** التفاوض والاختيار بعد الترخيص ثم إبرام عقد بيع مستقل، إن اتفق الطرفان.

**المسار النقدي:** رد أصل التمويل، ويضاف إليه التعويض الاتفاقي فقط إذا تحققت إحدى حالات التأخير أو التعثر المحددة صراحة في هذا العقد.

**إمبير:** شركة إمبير للتطوير العقاري والتنمية العمرانية، وتظهر بيانات الجهة صاحبة الولاية واتفاق القسمة ومستندات العقد أن لكل من الشركة وإمبير حقوقًا مفرزة تعادل 50% من المشروع/الأرض، مع اشتراكهما في المداخل والمرافق والخدمات المشتركة في الحدود المبينة بالمستندات. ويظل تحديد الوحدات ومساحاتها النهائية مرتبطًا باعتماد المخطط وصدور الترخيص.

**الجهة صاحبة الولاية:** هيئة المجتمعات العمرانية الجديدة أو جهاز مدينة الشيخ زايد أو أي جهة حكومية مختصة بالمشروع أو الأرض.

# ثالثًا: جدول بيانات المعاملة
تعد البيانات الآتية البيانات التجارية والزمنية المرجعية للمعاملة، ولا تعدل إلا بمحرر مكتوب موقع من الطرفين. وعند التعارض بين هذا الجدول وأي رقم أو تاريخ آخر في العقد، يسود هذا الجدول.

| رقم المعاملة | {{transaction_no}} |
| تاريخ توقيع العقد وتاريخ السداد | {{contract_date}} |
| مبلغ التمويل الفعلي | {{financing_amount}} جنيه مصري ({{financing_amount_words}}) |
[[if pending_amount]]
| المسدد عند التوقيع | {{paid_amount}} جنيه مصري |
| المبلغ المتبقي | {{pending_amount}} جنيه مصري يسدد على أقساط وفق جدول الأقساط ببند سادسًا |
[[endif]]
| مدة التمويل الأساسية ونهايتها | {{funding_months}} شهرًا من تاريخ السداد حتى {{financing_end_date}} |
| تاريخ الإقفال النهائي المستهدف للترخيص | {{closing_date}} |
| المساحة الاسترشادية | {{area}} م² إجماليًا شاملة التحميل والبروز |
| حد الزيادة الاسترشادية | {{area_increase_pct}}% من المساحة الاسترشادية عند توافر وحدة مناسبة وفق أساس التسعير الموضوعي المبين بالعقد |
| تكلفة المتر المرجعي للمرحلة الأولى فقط | {{meter_cost}} جنيه/م² إجمالي |
| إجمالي تكلفة المرحلة الأولى المرجعية | {{financing_amount}} جنيه على مساحة {{area}} م² |
| نافذة الأولوية بعد الترخيص | {{priority_days}} يوم عمل من استلام إخطار ترخيص مكتمل |
| التعويض الاتفاقي عند تحقق حالات التأخير أو التعثر | {{compensation_pct}}% سنويًا بسيطًا، أو الحد الأقل الجائز قانونًا، على أصل التمويل، ولا يستحق إلا في الحالات المحددة بالعقد |
| مدة السداد بعد اختيار المسار النقدي | {{settlement_days}} يومًا |
| جدول رد التمويل عند اختيار المسار النقدي | {{first_refund_pct}}% خلال {{first_refund_days}} يومًا، والباقي على {{refund_installments}} أقساط شهرية متساوية؛ وهذه أقساط رد من الشركة للممول وليست التزامًا على الممول |
| الشرط الجزائي عند تحقق شروطه | {{penalty_pct}}% من أصل التمويل الفعلي |

# رابعًا: التمهيد وطبيعة المعاملة
تعمل الشركة على ترتيب وتمويل مرحلة سابقة على الترخيص لمشروع «سند زايد»، وذلك في حدود المراكز والحقوق والترتيبات التعاقدية والمستندات المتاحة لها والمتعلقة بالمشروع. ويقتصر التمويل محل هذا العقد على هذه المرحلة السابقة على صدور رخصة البناء، وفق البيانات والإفصاحات الواردة في هذا العقد ومستنداته المرفقة.

يقر الطرفان بأن هذا العقد ينظم تمويلًا والتزامات تعاقدية متبادلة فقط، ولا يمثل بيعًا أو حجزًا أو تخصيصًا لوحدة عقارية، ولا يمثل مقدم ثمن، ولا ينشئ للممول ملكية في الأرض أو المشروع أو أي وحدة، وإنما يثبت له حقًا شخصيًا تعاقديًا في الاختيار أو التسوية وفق أحكامه.

يقر الطرفان، بحسب الواقع الفعلي للمعاملة، بأنها نشأت عن تواصل فردي ومباشر وخاص مع هذا الممول تحديدًا، دون إعلان أو تسويق أو دعوة عامة أو عرض مفتوح للجمهور أو طرح عبر منصة أو وسيط أو منشور متداول. ولا تمثل هذه المعاملة إصدارًا أو طرحًا عامًا أو أداة قابلة للتداول، ولا تمنح الممول حصة في رأس مال الشركة أو ملكية في المشروع أو مشاركة في أرباحه؛ وإنما هي التزام تمويلي تعاقدي محدد بين طرفيه فقط. ويحظر على أي طرف استخدام العقد أو نسخه أو شروطه في إعلان أو عرض عام أو دعوة أشخاص آخرين لتقديم أموال، ولا تحول هذه الصياغة دون تطبيق أي حكم قانوني واجب إذا خالف الواقع ذلك.

يقر الممول بأن الشروط الاقتصادية والمالية لهذه المعاملة تم الاتفاق عليها بصورة خاصة وفق توقيت إبرامها ومخاطر المرحلة وقت التعاقد، ولا تمثل عرضًا عامًا أو سعرًا معلنًا أو التزامًا بتطبيقها على أي معاملة أخرى.

يقر الممول بصحة بيانات هويته وبيانات المستفيد الحقيقي، وبأنه يتصرف لحسابه أو أفصح عن صاحب الأموال أو المستفيد الحقيقي، وبمشروعية مصدر الأموال وعدم اتصالها بنشاط محظور، ويتحمل مسؤولية صحة ما يقدمه من مستندات وبيانات.

# خامسًا: الإفصاح عن المشروع والحقوق المرتبطة به
بيانات الأرض محل المشروع: القطعة رقم {{plot_no}}، بالكود {{plot_code}}، بامتداد مدينة الشيخ زايد، وبمساحة إجمالية قدرها {{land_area}} م² وفق المستندات المتاحة. ويُشار إلى كارت وصف وتحديد الملكية بذات رقم القطعة، وإلى ملف أو ملحق فصل القطعة المؤرخ {{separation_date}}، وتحدد الحدود والبيانات التفصيلية وفق الكارت والمخطط والمستندات المرفقة. ولا يفسر هذا العقد أو أي عبارة فيه بأنه إقرار بأن الأرض مسجلة باسم الشركة أو خالية من حقوق الغير أو الالتزامات القائمة.

وفق اتفاق القسمة وبيانات الجهة صاحبة الولاية والمستندات الرسمية، تختص الشركة بحقوق مفرزة تعادل 50% من المشروع/الأرض، وتختص شركة إمبير بحقوق مفرزة تعادل 50%، مع اشتراكهما في المداخل والمرافق والخدمات المشتركة في الحدود المبينة بالمستندات. وتظل الشركة مسؤولة عن إدارة علاقتها مع إمبير وعن الوفاء بالتزاماتها الخاصة، دون أن يتحول الممول إلى طرف في تلك العلاقة أو يتحمل التزاماتها.

يقر الممول بأنه أتيح له الاطلاع أو طلب الاطلاع على المستندات الجوهرية المبينة في بند المستندات المرفقة، وأن أي مستند غير متاح أو تحفظ جوهري يتعلق بالأرض أو الترخيص أو علاقة إمبير يبين في هذا العقد أو في بيان كتابي موقع من الطرفين قبل التوقيع النهائي.

المستندات المرفقة بهذا العقد، والتي تعد جزءًا لا يتجزأ منه، هي: إيصال استلام التمويل، وقرار مجلس الإدارة أو التفويض الرسمي بالتوقيع والاستلام، ومستندات الأرض المتاحة، وكارت الوصف وتحديد الملكية، وملف أو ملحق فصل القطعة، واتفاق القسمة، وأي مستندات إفصاح أو هوية أو مصدر أموال يوقع الطرفان على تسلمها أو الاطلاع عليها. ويحدد محضر المرفقات أو الصفحة الأخيرة ما تم إرفاقه فعليًا وما لم يتوفر.

يقتصر التزام الشركة على حقوقها ونسبتها والتزاماتها القابلة للإنفاذ قانونًا، ولا ينشئ هذا العقد أي حق للممول قبل شركة إمبير أو يلزمها بأي تصرف أو سداد أو تخصيص، ما لم تنضم إمبير إلى العقد أو توقع إقرارًا مستقلاً بذلك.

تقر الشركة، في حدود علمها وحتى تاريخ التوقيع، بعدم وجود بيع أو رهن أو حوالة أو حق للغير على حقوقها في المشروع إلا ما تم الإفصاح عنه صراحة في هذا العقد أو مستنداته المرفقة أو مستندات الأرض. كما تقر بأن ممثلها الموقع مخول قانونًا بالتوقيع واستلام التمويل، وأن قرار مجلس الإدارة أو التفويض الرسمي المثبت لذلك مرفق بهذا العقد وجزء لا يتجزأ منه.

وتفصح الشركة صراحة عن وجود حقوق أو امتيازات أو ضمانات مقررة لصالح الجهة صاحبة الولاية، وعن الأقساط أو المستحقات المتبقية والالتزام الزمني بتنفيذ المشروع، وذلك بالقدر المبين تفصيلًا في هذا العقد ومستنداته. وتظل جميع هذه الالتزامات على الشركة وإمبير وحدهما، ولا تنشئ للممول أي التزام بالسداد أو أي حق يتقدم على حقوق الجهة صاحبة الولاية.

# سادسًا: مبلغ التمويل وطريقة السداد
بلغ التمويل المتفق عليه مبلغًا قدره **{{financing_amount}} جنيه مصري ({{financing_amount_words}})**، وهو المبلغ المبين في جدول بيانات المعاملة.

[[if pending_amount]]
يقر الطرفان بأن الشركة تسلمت من مبلغ التمويل مبلغًا قدره **{{paid_amount}} جنيه مصري ({{paid_amount_words}})** {{payment_method}} بمجلس العقد في تاريخ السداد المبين في جدول بيانات المعاملة، ويلتزم الممول بسداد باقي مبلغ التمويل وقدره **{{pending_amount}} جنيه مصري ({{pending_amount_words}})** على أقساط في المواعيد المبينة في الجدول الآتي، ويوقع ممثل الشركة المفوض على إيصال استلام مستقل عن كل دفعة يبين المبلغ بالأرقام والحروف وبيانات المستلم وصفته ومكان وتاريخ الاستلام.

[[installments]]

[[else]]
يقر الطرفان بأن الشركة تسلمت مبلغ التمويل {{payment_method}} كاملًا بمجلس العقد في تاريخ السداد المبين في جدول بيانات المعاملة، دون تحفظ أو خصم أو تأجيل، ويوقع ممثل الشركة المفوض على إيصال استلام مستقل يبين المبلغ بالأرقام والحروف وبيانات المستلم وصفته ومكان وتاريخ الاستلام.
[[endif]]

ويعد الإيصال الموقع والمختوم - إن وجد الختم - جزءًا من مستندات إثبات السداد، دون إخلال بالقواعد المحاسبية والقانونية الواجبة. ولا يغير إثبات السداد الأصلي من وجوب رد أي مبالغ مستقبلية للممول بتحويل بنكي موثق أو شيك مصرفي مقبول الدفع.

لا يلتزم الممول بأي مبالغ إضافية إلا بمحرر مكتوب مستقل موقع منه.

# سابعًا: استخدام التمويل
يستخدم التمويل في التكاليف السابقة على الترخيص المرتبطة بالمشروع، بما في ذلك ما يخص المشروع من تكلفة تثبيت الأصل، وثمن الأرض أو المقابل التعاقدي عنها، ومصاريف نقل الملكية والتسجيل، ومستحقات الجهة صاحبة الولاية، والرسوم والتراخيص، والدراسات والتصميمات والاستشارات والإجراءات، ومقابل الإدارة والتطوير الخاص بهذه المرحلة، وذلك كله في حدود المستندات والالتزامات الفعلية للمشروع. ولا يستخدم التمويل في مصروفات شخصية أو مشروع آخر أو توزيعات للمساهمين.

لا يلتزم الممول بالدخول في تفاصيل تكاليف المرحلة أو التدخل في إدارة الشركة أو مراجعة ميزانيات المشروع، ما لم يتعلق الأمر بواقعة جوهرية تؤثر مباشرة في أصل التمويل أو التسوية. وتظل الشركة مسؤولة عن إمساك سجلاتها الداخلية والالتزام باستخدام التمويل في الغرض المتفق عليه.

تلتزم الشركة بإخطار الممول فقط بأي واقعة قانونية جوهرية معلومة من شأنها منع تنفيذ المشروع أو التأثير المباشر في أصل التمويل أو التسوية، دون أن يشمل ذلك تقديم كشف تفصيلي بالمصروفات أو الأسعار التجارية.

# ثامنًا: مستحقات الجهة صاحبة الولاية
تعد أي مستحقات أو رسوم أو التزامات واجبة للجهة صاحبة الولاية أو جهاز مدينة الشيخ زايد التزامًا على الشركة وحدها، ولا تنتقل إلى الممول ولا تعتبر جزءًا من ثمن وحدة أو التزامًا إضافيًا عليه. وتلتزم الشركة بمعالجتها وسدادها وفق المواعيد والمستندات الواجبة.

ولا يكون الممول مسؤولًا عن أي أقساط أو مستحقات أو جداول سداد تخص الشركة أو الأرض أو الجهة صاحبة الولاية، ولا يترتب عليها أي التزام إضافي عليه، ولو تم استخدام مبلغ التمويل في سدادها.

ولا يخل ذلك بالتزام الشركة بالإفصاح عن أي إنذار أو نزاع أو تعثر جوهري قائم ومعلوم قد يهدد استمرار حقوق المشروع.

# تاسعًا: تعهد عدم التصرف الضار في حقوق المشروع
تقر الشركة بأن حقوقها المفرزة في الأرض والمشروع، وفق اتفاق القسمة والمستندات الرسمية، تمثل أحد مصادر الوفاء بالتزاماتها التعاقدية قبل الممول، وتتعهد من تاريخ استلام التمويل وحتى إبرام عقد بيع الوحدة وتسليم الممول نسخته أو تمام التسوية النقدية المستحقة له، أيهما أسبق، بعدم بيعها أو التنازل عنها أو رهنها أو ترتيب أي حق للغير عليها بما يضر بحقوق الممول أو يعطل رد مستحقاته، إلا بعد إخطار الممول والحصول على موافقته الكتابية المسبقة.

ولا يشمل هذا التعهد الإجراءات أو التصرفات التي تفرضها الجهة صاحبة الولاية أو اللازمة لتنفيذ المشروع، ولا يخل بحقوقها أو امتيازاتها أو أقساطها. ولا ينشئ هذا البند رهنًا أو امتيازًا عينيًا أو حقًا مباشرًا للممول على الأرض في مواجهة الجهة صاحبة الولاية أو الغير، ولا يجعل الممول طرفًا في التزامات الشركة أو إمبير تجاهها.

# عاشرًا: القوة القاهرة وأثرها
يقصد بالقوة القاهرة الحادث العام الاستثنائي الذي لا يمكن توقعه أو دفعه ويجعل تنفيذ الالتزام مستحيلًا مؤقتًا أو نهائيًا، مثل القرارات السيادية أو الكوارث أو الحروب أو توقف الجهة المختصة عن العمل لسبب خارج عن إرادة الشركة. ولا تشمل القوة القاهرة نقص السيولة أو تغير الأسعار أو التزامات الشركة المالية المعتادة.

تخطر الشركة الممول خلال {{force_majeure_days}} أيام عمل من علمها بالواقعة، مع بيان أثرها وخطة المعالجة. ولا تمدد القوة القاهرة تاريخ الإقفال تلقائيًا ولا تنشئ التزامًا إضافيًا على الممول، وأي تمديد يكون بمحرر مكتوب يحدد سببه ومدته. ويظل للممول حق التسوية إذا استحال التنفيذ أو طال التعطيل بصورة جوهرية.

# حادي عشر: المسار العقاري وحق الأولوية بعد الترخيص
لا يترتب على هذا العقد أو على سداد التمويل أي حق في وحدة معينة أو مساحة أو دور أو مبنى أو إطلالة، ولا يجوز تفسيره باعتباره إعلانًا عن حجز وحدة أو تعاقدًا على بيعها قبل صدور الترخيص والموافقات اللازمة.

بعد صدور رخصة البناء والموافقات اللازمة، يجوز للممول طلب التفاوض بحسن نية على شراء وحدة من الوحدات المتاحة، ويكون أي بيع - إن تم - بموجب عقد بيع مستقل يحدد الوحدة والمساحة والثمن والمواصفات والتسليم.

تكون المساحة الاسترشادية وحد الزيادة وتكلفة المتر المرجعي كما هي مبينة في جدول بيانات المعاملة، وتظل المساحة إجمالية شاملة حصة الوحدة في الأجزاء المشتركة ونسبة التحميل والبروز. ولا يضمن ذلك توافر وحدة أو مساحة معينة، وما يجاوز حد الزيادة يخضع للأساس الاقتصادي الساري وقت التعاقد على البيع.

يقتصر المبلغ المرجعي الوارد في جدول بيانات المعاملة على مكونات المرحلة الأولى وتثبيت الأصل وما يرتبط به، ولا يمثل إجمالي ثمن المتر أو سعر البيع النهائي للوحدة، ولا يشمل تلقائيًا تكاليف مراحل التنفيذ اللاحقة أو الإنشاء أو المرافق أو التشطيبات أو الضرائب أو الرسوم أو المواصفات الخاصة.

تحدد المساحة الصافية ونسبة التحميل والبروز الفعلية وفق المخطط المعتمد والترخيص النهائي وعقد البيع المستقل، ولا تعد البيانات الاسترشادية الواردة في جدول المعاملة حجزًا أو تخصيصًا لوحدة.

عند إبرام عقد بيع مستقل بعد الترخيص، يخصم مبلغ التمويل الفعلي من المقابل المتفق عليه بواقع تكلفة المتر المرجعي المبينة في جدول بيانات المعاملة وعلى المساحة الاسترشادية المبينة فيه، ما لم يتفق الطرفان كتابة على أساس أفضل للممول. وتكون أي زيادة حتى الحد المبين في الجدول مرتبطة بتوافر وحدة مناسبة وبذات الأساس المرجعي فقط إذا نص عقد البيع عليها، أما ما يجاوز ذلك أو يرتبط بمواصفات أو أدوار أو واجهات أو خدمات خاصة فيخضع لسعر وشروط جديدة في عقد البيع المستقل، ولا يستحق على الممول أي مبلغ إضافي قبل توقيعه.

تكون أولوية الممول في الاختيار والتعاقد من الوحدات المرخصة والمتاحة خلال نافذة الأولوية المحددة في جدول بيانات المعاملة. ولا يجوز للشركة ترتيب التزام لاحق يتعارض مع هذه الأولوية، ويعتد في ترتيب هذه الأولوية برقم المعاملة، وعند عدم وجوده بتاريخ السداد الثابت بالإيصال أو المستند البنكي. ولا ينعقد البيع إلا بتوقيع عقد بيع مستقل يحدد الوحدة والمساحة والثمن والمواصفات والتسليم.

# ثاني عشر: المسار النقدي عند عدم إتمام البيع
تكون مدة التمويل الأساسية من تاريخ السداد {{contract_date}} حتى {{financing_end_date}}. ويكون تاريخ الإقفال النهائي المستهدف للترخيص {{closing_date}}. إذا لم يصدر الترخيص حتى تاريخ الإقفال، جاز للممول اختيار التسوية النقدية أو قبول تمديد مكتوب يبين سببه ومدته وخطة المعالجة. وإذا صدر الترخيص ولم يوقع عقد البيع خلال نافذة الأولوية، جاز للممول اختيار التسوية النقدية أو استمرار التفاوض باتفاق مكتوب.

إذا عرضت الشركة بعد الترخيص وحدة مناسبة ومستوفية للمساحة الاسترشادية والاشتراطات الفنية، وكان العرض يتضمن بيان المقايسة التفصيلية المعتمدة (BOQ) ومقابل الإدارة والتطوير وأي رسوم أو ضرائب قانونية معلومة، وأخطرت الممول بذلك خلال نافذة الأولوية، ثم رفض الممول العرض أو لم يبد اختياره خلال {{offer_response_days}} يومًا من استلام الإخطار، ينتهي المسار العقاري بالنسبة له ويستحق أصل التمويل فقط دون التعويض الاتفاقي، وترد الشركة الأصل خلال مدة التسوية المحددة في جدول المعاملة. ولا يعتبر سكوت الممول في هذه الحالة إخلالًا أو سببًا لاستحقاق أي تعويض إضافي.

إذا لم يصدر الترخيص حتى تاريخ الإقفال النهائي، أو لم تعرض الشركة وحدة مناسبة خلال نافذة الأولوية، أو وقع إخلال جوهري من جانب الشركة أدى إلى تعذر تنفيذ المسار العقاري أو التسوية، جاز للممول اختيار المسار النقدي، ويستحق التعويض الاتفاقي المحدد في جدول المعاملة فقط إذا كانت الواقعة راجعة إلى الشركة أو ثبت إخلالها الجوهري بها. أما التأخير الحكومي أو القوة القاهرة غير المنسوبين إلى الشركة فيترتب عليهما رد أصل التمويل دون التعويض الاتفاقي، ما لم يتفق الطرفان كتابة على خلاف ذلك.

إذا انقضى تاريخ {{financing_end_date}} دون إبرام عقد بيع مستقل أو توقيع تمديد مكتوب، يصبح أصل التمويل مستحق الرد، ويعد ذلك تاريخ بدء التسوية النهائية. ويضاف التعويض الاتفاقي فقط إذا كان عدم إتمام البيع أو التسوية راجعًا إلى إخلال جوهري من الشركة وفق شروط هذا العقد، أما إذا كان السبب رفض الممول عرضًا موضوعيًا مستوفيًا أو تأخيرًا حكوميًا أو قوة قاهرة، فيرد الأصل دون تعويض اتفاقي.

يحسب التعويض الاتفاقي - عند استحقاقه - من تاريخ السداد وحتى تاريخ الرد الفعلي، بنسبة {{compensation_pct}}% سنويًا بسيطة أو الحد الأقل الجائز قانونًا، على أصل التمويل، ويستمر خلال مدة التسوية النقدية البالغة {{settlement_days}} يومًا، دون تركيب أو رسملة. ولا يعد هذا التعويض عائدًا مضمونًا لمجرد إبرام العقد أو استخدام التمويل، ولا يستحق إلا في الحالات المحددة بهذا العقد.

عند استحقاق المسار النقدي، ترد الشركة أصل التمويل الفعلي، ويضاف التعويض الاتفاقي فقط عند تحقق شروطه. ويكون الرد على النحو الآتي: {{first_refund_pct}}% من أصل التمويل خلال {{first_refund_days}} يومًا من تاريخ الاختيار أو الاستحقاق النهائي، والباقي على {{refund_installments}} أقساط شهرية متساوية. وهذه أقساط سداد من الشركة للممول فقط، ولا تمثل بأي صورة أقساطًا أو مستحقات على الممول للجهة صاحبة الولاية أو على الشركة أو عن الأرض. ويتم رد أي مبالغ للممول بتحويل بنكي موثق إلى الحساب الذي يحدده كتابة أو بشيك مصرفي مقبول الدفع باسمه.

يجوز للشركة رد أصل التمويل مبكرًا بتحويل بنكي أو شيك مصرفي مقبول الدفع، وذلك بموافقة الممول الكتابية قبل انتهاء نافذة الأولوية، أو دون حاجة لموافقته بعد انتهائها، بشرط سداد أي تعويض اتفاقي تحقق سببه حتى تاريخ الرد. ويترتب على الرد المبكر وفق هذا البند انقضاء حقوق الممول في المسار العقاري.

# ثالث عشر: الشرط الجزائي
إذا وقع إخلال محدد وجوهري من جانب الشركة، مثل التصرف الضار المتعمد في حقوقها، أو تقديم بيان جوهري غير صحيح مع العلم بعدم صحته، أو رفض رد المبلغ المستحق دون سبب مشروع، واستعمل الممول حقه في التسوية النقدية، تستحق له غرامة اتفاقية قدرها {{penalty_pct}}% من أصل التمويل الفعلي باعتبارها شرطًا جزائيًا عن واقعة الإخلال المحددة، لا عن مجرد وجود التمويل أو التأخر الحكومي في الترخيص. ولا تستحق الغرامة لمجرد عدم صدور الترخيص بسبب جهة حكومية أو قوة قاهرة، ولا تجمع مع التعويض الاتفاقي بنسبة {{compensation_pct}}% عن ذات الضرر؛ ويستحق الممول في الواقعة الواحدة التعويض الأعلى وفقًا لأحكام العقد والقانون، مع خضوع الشرط لسلطة القضاء.

# رابع عشر: الإخلال والإنهاء
يعد إخلالًا جوهريًا من جانب الشركة: استخدام التمويل خارج الغرض المتفق عليه، أو تقديم بيانات جوهرية غير صحيحة، أو التصرف عمدًا بما يهدر حقوق المشروع، أو رفض التسوية المستحقة دون سبب مشروع.

يعد إخلالًا من جانب الممول: تقديم بيانات هوية أو مستفيد حقيقي أو مصدر أموال غير صحيحة، أو الإخلال بأي التزام جوهري ثابت عليه بعد إنذاره ومنحه مهلة معقولة للمعالجة.

في حالة إخلال الشركة بالتزام جوهري وعدم معالجته خلال {{cure_days}} أيام عمل من استلام إنذار كتابي، أو في حالات التوقف عن السداد أو التصفية أو الإعسار أو التصرف الضار العاجل أو ثبوت استخدام التمويل خارج الغرض المتفق عليه، يصبح أصل التمويل والتعويض الاتفاقي - إن توافرت شروطه - مستحقين فورًا، دون حاجة إلى إنذار جديد، مع عدم تحميل الممول أي أقساط أو التزامات تخص الشركة أو الأرض أو الجهة صاحبة الولاية.

# خامس عشر: السرية والتنازل
يلتزم الطرفان بالحفاظ على سرية هذا العقد وبيانات المشروع والمستندات المتبادلة، ولا يجوز للممول نشرها أو استخدامها في إعلان أو عرض عام، مع جواز الإفصاح للمستشارين والجهات الرسمية والقضاء أو بالقدر الذي يوجبه القانون.

لا يجوز للممول التنازل عن مركزه أو حقوقه إلا بموافقة الشركة واستكمال بيانات والتحقق من هوية المتنازل إليه، ولا يجوز للشركة رفض الموافقة دون سبب مشروع. ولا يخل ذلك بحقوق الورثة في حدود المستندات والقانون.

# سادس عشر: أحكام عامة
لا يبطل أو يتعذر تنفيذ أي بند من بنود العقد إلا في حدود الجزء المتعذر، وتظل باقي البنود نافذة. ولا يعدل العقد أو يتنازل أي طرف عن حق من حقوقه إلا بمحرر مكتوب وموقع من الطرفين. ويمثل هذا العقد ومستنداته المرفقة وإيصال الاستلام كامل الاتفاق بين الطرفين في موضوعه، ويلغي ما سبقه من تفاهمات مكتوبة أو شفهية في ذات الموضوع.

# سابع عشر: أولوية المستندات
في الأرقام والتواريخ والبيانات التجارية يسود جدول بيانات المعاملة. وفي أحكام التمويل والسداد والتسوية يسود هذا العقد. وفي بيانات الأرض والإفصاحات يسود المستند الرسمي مع ما ورد من تحفظات في مستندات العقد. وفي الوحدة والثمن النهائي والمواصفات والتسليم يسود عقد البيع المستقل الذي قد يبرم بعد الترخيص.

# ثامن عشر: الإخطارات والقانون والمصروفات
توجه الإخطارات والمراسلات بين الطرفين إلى العناوين والبريد الإلكتروني المبين لكل طرف في بند أطراف العقد، ويعتبر ما يرسل إلى البريد الإلكتروني المبين لأي طرف إخطارًا رسميًا صحيحًا منتجًا لكافة آثاره القانونية من تاريخ إرساله، ويكون مستخرج الرسالة المرسلة حجة في إثبات الإخطار. ويلتزم كل طرف بإخطار الطرف الآخر كتابةً بأي تغيير في عنوانه أو بريده الإلكتروني، وإلا اعتبرت المراسلات على العنوان أو البريد السابق صحيحة ونافذة في حقه.

يخضع العقد للقانون المصري، وتبذل محاولة تسوية ودية لمدة {{amicable_days}} يومًا قبل اللجوء إلى المحاكم المختصة نوعيًا ومكانيًا بمدينة الشيخ زايد أو محاكم الجيزة بحسب الاختصاص القانوني.

تتحمل الشركة مصروفات إعداد هذا العقد وإيصال الاستلام وأي مصروفات مرتبطة بالتزاماتها، ويتحمل كل طرف مصروفاته المهنية الخاصة، أما مصروفات عقد البيع المستقل أو التسجيل أو الضرائب فتحدد فيه صراحة ولا تستحق على الممول قبل توقيعه. ويكون أي تعويض اتفاقي مبلغًا إجماليًا قبل أي خصم ضريبي يفرضه القانون، وتلتزم الشركة بأي خصم أو توريد واجب قانونًا وإصدار ما يثبت ذلك للممول، دون تحميله ضريبة لا يفرضها القانون عليه شخصيًا.

# تاسع عشر: التوقيعات
وقع الطرفان هذا العقد من نسختين أصليتين، وتسلم كل طرف نسخة، ووقعا على كل صفحة وكل مستند مرفق جوهري، بما في ذلك إيصال الاستلام ومستندات التفويض والأرض المرفقة.

[[signatures]]
`;
