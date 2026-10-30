"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { Button, CircularProgress, TextField, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { ArrowForwardOutlined, PrintOutlined, SaveOutlined, RestartAltOutlined, EditNoteOutlined, AddOutlined, DeleteOutlineOutlined, ExpandMoreOutlined, ExpandLessOutlined, VerifiedOutlined } from "@mui/icons-material";
import ContractPaper from "../../../components/ContractPaper";
import {
  TEMPLATE_VARS, resolveValues, usedVariables, applyConditionals, parseSchedule, formatSchedule, parseAmount, formatNumber,
  generateSchedule, parseDmy, formatDate, upgradeTemplateBody, isFemale, GENDER_OPTIONS, isPassport, ID_TYPE_OPTIONS, FIXED_VARS, missingVariables, variableLabels, CONTRACT_LOCKED_VARS, DEFAULT_TEMPLATE_BODY, DEFAULT_TEMPLATE_TITLE, DEFAULT_TEMPLATE_SUBTITLE, type ScheduleRow,
} from "@/lib/sanad-zayed/contractTemplate";


// Inputs that drive the paid / pending split and the installment schedule.
const SCHEDULE_VARS = ["paid_amount", "paid_amount_words", "pending_amount", "pending_amount_words", "installments", "upfront_pct", "installments_count", "installment_interval_months"];

const LABELS: Record<string, string> = Object.fromEntries(TEMPLATE_VARS.map(v => [v.key, v.label]));
const HINTS: Record<string, string | undefined> = Object.fromEntries(TEMPLATE_VARS.map(v => [v.key, v.hint]));

// Company representative data, saved once as stage defaults for every contract.
const COMPANY_KEYS = ["company_rep_name", "company_rep_title", "company_address", "company_email"];

// Panel sections, in the order the contract is reviewed.
const SECTIONS: { title: string; keys: string[]; hint?: string }[] = [
  { title: "بيانات المعاملة", keys: ["transaction_no", "contract_date"] },
  { title: "بيانات الممول", keys: ["investor_name", "investor_gender", "investor_nationality", "investor_id_type", "investor_national_id", "investor_address", "investor_job", "investor_phone", "investor_email"] },
  { title: "بيانات مفوض الشركة", keys: COMPANY_KEYS },
  { title: "بيانات الأرض", keys: ["plot_no", "plot_code", "land_area", "separation_date"] },
  { title: "المساحة والسعر", keys: ["area", "meter_cost", "financing_amount"], hint: "من بيانات العقد في النظام — تُعدل من «تعديل العقد» في صفحة المستثمر" },
  { title: "السداد", keys: ["paid_amount", "payment_method"] },
];
// Derived automatically and never edited directly in the panel.
const HIDDEN = new Set(["investor_title", "investor_referred", "investor_id_label", "contract_day", "stage_name", "max_area", "financing_amount_words", "paid_amount_words", "pending_amount",
  "pending_amount_words", "installments", "upfront_pct", "installments_count", "installment_interval_months"]);
const DATE_KEYS = new Set(["contract_date", "separation_date", "closing_date", "financing_end_date"]);

function dmyToIso(v: string): string {
  const d = parseDmy(v);
  return d ? d.toISOString().slice(0, 10) : "";
}
function isoToDmy(v: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

export default function ContractDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const load = useCallback(() => {
    return fetch(`/api/sanad-zayed/contracts/${id}/document`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else { setData(d); setOverrides(d.contract.document_vars ?? {}); }
      })
      .catch(() => setError("تعذر تحميل العقد"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const template = data?.template;
  const title = template?.title || DEFAULT_TEMPLATE_TITLE;
  const subtitle = template?.subtitle ?? DEFAULT_TEMPLATE_SUBTITLE;
  const body = useMemo(() => upgradeTemplateBody(template?.body || DEFAULT_TEMPLATE_BODY), [template]);
  const stageDefaults: Record<string, string> = useMemo(() => template?.defaults ?? {}, [template]);

  const values = useMemo(
    () => (data ? resolveValues(data.contract, stageDefaults, overrides) : {}),
    [data, stageDefaults, overrides]
  );
  // The automatic value of a variable given every other override (shown as the field placeholder).
  const baselineOf = (key: string) =>
    data ? resolveValues(data.contract, stageDefaults, { ...overrides, [key]: "" })[key] ?? "" : "";

  const used = useMemo(() => {
    const keys = new Set([...usedVariables(body), ...FIXED_VARS]);
    // Payment fields are always reviewable, whatever the template wording.
    SCHEDULE_VARS.forEach(k => keys.add(k));
    keys.add("payment_method");
    // The gender drives the investor's title and pronouns in the text.
    if (keys.has("investor_title") || keys.has("investor_referred")) keys.add("investor_gender");
    // The ID type sets the wording before the ID number (and the signature label).
    if (keys.has("investor_national_id")) keys.add("investor_id_type");
    return keys;
  }, [body]);
  // Only variables in the branches that will actually print count as missing.
  const missing = useMemo(() => missingVariables(body, values), [body, values]);

  const scheduleRows: ScheduleRow[] = useMemo(() => parseSchedule(values.installments ?? ""), [values]);
  const scheduleTotal = scheduleRows.reduce((s, r) => s + (parseAmount(r.amount) || 0), 0);
  const pendingTotal = parseAmount(values.pending_amount) || 0;
  const scheduleMismatch = pendingTotal > 0 && Math.abs(scheduleTotal - pendingTotal) > 0.5;
  const setScheduleRows = (rows: ScheduleRow[]) => setVar("installments", formatSchedule(rows) || " ");
  const [showOther, setShowOther] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issuedNote, setIssuedNote] = useState("");

  const wallet: { net: number; locked: number; locked_by_others: number; refundable: number; available_for_contract: number } | null = data?.wallet ?? null;
  const issuedAt: string | null = data?.contract?.issued_at ?? null;
  const paidValue = parseAmount(values.paid_amount) || 0;
  const paidExceedsWallet = !!wallet && paidValue > wallet.available_for_contract + 0.5;

  // Re-split the pending amount equally (used when the count or interval changes).
  const redistribute = (count: number, interval: number) => {
    const rows = generateSchedule(pendingTotal, count, interval, parseDmy(values.contract_date ?? ""));
    setOverrides(prev => ({
      ...prev,
      installments_count: String(count),
      installment_interval_months: String(interval),
      installments: formatSchedule(rows) || " ",
    }));
    setDirty(true);
  };
  const addDifferenceToLast = () => {
    if (!scheduleRows.length) return;
    const rows = [...scheduleRows];
    const last = rows.length - 1;
    const lastAmount = parseAmount(rows[last].amount) || 0;
    rows[last] = { ...rows[last], amount: formatNumber(Math.round((lastAmount + pendingTotal - scheduleTotal) * 100) / 100) };
    setScheduleRows(rows);
  };

  const setVar = (key: string, value: string) => {
    setOverrides(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const save = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/sanad-zayed/contracts/${id}/document`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_vars: overrides }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "تعذر الحفظ");
      setOverrides(d.document_vars);
      setDirty(false);
      setSavedAt(new Date().toLocaleTimeString("ar-EG-u-nu-latn", { hour: "2-digit", minute: "2-digit" }));
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [id, overrides]);

  // Saves the company representative data typed here as the stage default,
  // so every contract of the stage fills it in automatically.
  const companyOverridden = COMPANY_KEYS.some(k => !!overrides[k]?.trim());
  const [savingDefaults, setSavingDefaults] = useState(false);
  const saveCompanyDefaults = async () => {
    setSavingDefaults(true);
    setError("");
    try {
      const defaults = Object.fromEntries(COMPANY_KEYS.map(k => [k, values[k] ?? ""]).filter(([, v]) => v));
      const res = await fetch("/api/sanad-zayed/contract-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage_id: data.contract.stage_id, defaults }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "تعذر حفظ بيانات الشركة");
      // This contract now follows the stage values instead of its own copy.
      const rest = Object.fromEntries(Object.entries(overrides).filter(([k]) => !COMPANY_KEYS.includes(k)));
      const put = await fetch(`/api/sanad-zayed/contracts/${id}/document`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_vars: rest }),
      });
      if (!put.ok) throw new Error((await put.json()).error || "تعذر الحفظ");
      await load();
      setDirty(false);
      setIssuedNote("تم حفظ بيانات مفوض الشركة — ستظهر تلقائيًا في كل عقود هذه المرحلة.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingDefaults(false);
    }
  };

  const print = async () => {
    if (scheduleMismatch) {
      setError("مجموع الأقساط لا يساوي المبلغ المتبقي — عدّل الأقساط قبل الطباعة");
      return;
    }
    if (dirty && !(await save())) return;
    const prev = document.title;
    const investor = values.investor_name ? ` - ${values.investor_name}` : "";
    document.title = `${title}${investor}`;
    window.print();
    document.title = prev;
  };

  const issue = async () => {
    setIssuing(true);
    setError("");
    try {
      const res = await fetch(`/api/sanad-zayed/contracts/${id}/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_vars: overrides }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "تعذر إصدار العقد");
      await load();
      setDirty(false);
      setIssueOpen(false);
      setIssuedNote(`تم الإصدار: خُصص ${formatNumber(d.paid)} من محفظة المستثمر لهذا العقد${d.installments ? ` وسُجّل ${d.installments} أقساط بإجمالي ${formatNumber(d.pending)}` : ""}.`);
      setSavedAt(new Date().toLocaleTimeString("ar-EG-u-nu-latn", { hour: "2-digit", minute: "2-digit" }));
    } catch (e: any) {
      setError(e.message);
      setIssueOpen(false);
    } finally {
      setIssuing(false);
    }
  };

  const renderField = (key: string) => {
    // Contract-owned values are shown read-only; they change from the contract itself.
    if (CONTRACT_LOCKED_VARS.includes(key)) {
      return (
        <div key={key} className="sz-locked">
          <span>{LABELS[key] ?? key}</span>
          <strong>{values[key] || "—"}</strong>
        </div>
      );
    }
    const overridden = !!overrides[key]?.trim();
    const auto = baselineOf(key);
    const isMissing = !values[key];
    const reset = overridden && auto ? (
      <Tooltip title="إرجاع للقيمة التلقائية">
        <button type="button" className="sz-reset" onClick={() => setVar(key, "")}><RestartAltOutlined sx={{ fontSize: 16 }} /></button>
      </Tooltip>
    ) : null;
    const sx = { "& .MuiOutlinedInput-root": { borderRadius: 2, background: overridden ? "#f3f6fa" : "#fff" }, "& .MuiOutlinedInput-input": reset ? { paddingInlineEnd: "34px !important" } : {} };
    if (key === "investor_gender" || key === "investor_id_type") {
      const gender = key === "investor_gender";
      const current = gender ? (isFemale(values[key]) ? "أنثى" : "ذكر") : (isPassport(values[key]) ? "جواز سفر" : "رقم قومي");
      return (
        <div key={key} className="sz-gender">
          <span>{LABELS[key]}</span>
          <div>
            {(gender ? GENDER_OPTIONS : ID_TYPE_OPTIONS).map(g => (
              <button type="button" key={g} className={current === g ? "on" : ""} onClick={() => setVar(key, g)}>{g}</button>
            ))}
          </div>
        </div>
      );
    }
    if (DATE_KEYS.has(key)) {
      return (
        <div key={key} style={{ position: "relative" }}>
          <TextField fullWidth size="small" margin="dense" type="date" label={LABELS[key] ?? key}
            value={dmyToIso(values[key] ?? "")} onChange={e => setVar(key, isoToDmy(e.target.value))}
            InputLabelProps={{ shrink: true }} error={isMissing} helperText={HINTS[key]} sx={sx} />
          {reset}
        </div>
      );
    }
    return (
      <div key={key} style={{ position: "relative" }}>
        <TextField fullWidth size="small" margin="dense" label={LABELS[key] ?? key}
          value={overrides[key] ?? ""} placeholder={auto || "غير محدد"} helperText={HINTS[key]}
          onChange={e => setVar(key, e.target.value)} InputLabelProps={{ shrink: true }} error={isMissing} sx={sx} />
        {reset}
      </div>
    );
  };

  if (!mounted) return null;

  const workspace = (
    <div className="sz-print-root" dir="rtl">
      {/* Toolbar */}
      <div className="sz-toolbar sz-no-print">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Button onClick={() => router.back()} startIcon={<ArrowForwardOutlined />} sx={{ color: "#374151", fontWeight: 700 }}>رجوع</Button>
          <div>
            <div style={{ fontWeight: 800, color: "#154278", fontSize: 15 }}>{title}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {data?.contract?.investor?.name ?? ""}{data?.contract?.stage?.name ? ` · ${data.contract.stage.name}` : ""}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {missing.length > 0 ? (
            <Tooltip title={<div style={{ lineHeight: 1.9 }}>{variableLabels(missing).map(l => <div key={l}>• {l}</div>)}</div>}>
              <span className="sz-badge sz-badge-warn" style={{ cursor: "help" }}>{missing.length} بيانات ناقصة</span>
            </Tooltip>
          ) : data ? (
            <span className="sz-badge sz-badge-ok">العقد مكتمل البيانات</span>
          ) : null}
          {savedAt && !dirty && <span style={{ fontSize: 12, color: "#6b7280" }}>تم الحفظ {savedAt}</span>}
          <Button variant="outlined" onClick={save} disabled={saving || !dirty || !data} startIcon={saving ? <CircularProgress size={16} /> : <SaveOutlined />}
            sx={{ borderRadius: 2, fontWeight: 700, borderColor: "#154278", color: "#154278" }}>
            حفظ البيانات
          </Button>
          {issuedAt && (
            <span className="sz-badge sz-badge-issued">
              <VerifiedOutlined sx={{ fontSize: 15 }} /> صادر {new Date(issuedAt).toLocaleDateString("en-GB")}
            </span>
          )}
          <Tooltip title={
            missing.length ? `لا يمكن الإصدار — بيانات ناقصة: ${variableLabels(missing).join("، ")}`
            : scheduleMismatch ? "مجموع الأقساط لا يساوي المبلغ المتبقي"
            : paidExceedsWallet ? "المبلغ المسدد أكبر من رصيد المستثمر" : ""}>
            <span>
              <Button variant="outlined" onClick={() => setIssueOpen(true)} disabled={!data || missing.length > 0 || scheduleMismatch || paidExceedsWallet || data?.contract?.status !== "ACTIVE"}
                startIcon={<VerifiedOutlined />}
                sx={{ borderRadius: 2, fontWeight: 700, borderColor: "#b08d57", color: "#8a6a35", "&:hover": { borderColor: "#8a6a35", background: "#faf6ef" } }}>
                {issuedAt ? "تحديث الإصدار" : "إصدار العقد"}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={scheduleMismatch ? "مجموع الأقساط لا يساوي المبلغ المتبقي" : ""}>
            <span>
              <Button variant="contained" onClick={print} disabled={!data || scheduleMismatch} startIcon={<PrintOutlined />}
                sx={{ borderRadius: 2, fontWeight: 700, background: "#154278", "&:hover": { background: "#0f3260" } }}>
                طباعة / PDF
              </Button>
            </span>
          </Tooltip>
        </div>
      </div>

      <div className="sz-workspace">
        {/* Variables panel */}
        <aside className="sz-panel sz-no-print">
          {loading && <div style={{ padding: 40, textAlign: "center" }}><CircularProgress sx={{ color: "#154278" }} /></div>}
          {error && <div className="sz-note sz-note-error">{error}</div>}
          {issuedNote && <div className="sz-note sz-note-ok">{issuedNote}</div>}
          {data && !template && (
            <div className="sz-note sz-note-info">
              لا يوجد قالب محفوظ لهذه المرحلة — يتم استخدام القالب القياسي.{" "}
              <a href={`/admin/sanad-zayed/contract-templates?stage=${data.contract.stage_id}`} style={{ fontWeight: 700, color: "#154278" }}>إعداد قالب المرحلة</a>
            </div>
          )}
          {data && SECTIONS.map(sec => {
            const keys = sec.keys.filter(k => used.has(k));
            if (!keys.length) return null;
            return (
              <section key={sec.title} className="sz-group">
                <div className="sz-group-title">{sec.title}</div>
                {sec.hint && <div className="sz-group-hint">{sec.hint}</div>}
                {keys.map(renderField)}
                {sec.keys === COMPANY_KEYS && (
                  <Tooltip title="تُحفظ في قالب المرحلة وتُملأ تلقائيًا في كل عقودها">
                    <span>
                      <button type="button" className="sz-link" style={{ margin: "4px 0 6px" }} onClick={saveCompanyDefaults}
                        disabled={!companyOverridden || savingDefaults}>
                        {savingDefaults ? <CircularProgress size={13} /> : <SaveOutlined sx={{ fontSize: 15 }} />}
                        {companyOverridden ? "حفظ كبيانات ثابتة لكل عقود المرحلة" : "محفوظة لكل عقود المرحلة"}
                      </button>
                    </span>
                  </Tooltip>
                )}
                {sec.title === "السداد" && (
                  <>
                    {wallet && (
                      <div className="sz-wallet">
                        <div><span>رصيد المستثمر (المدفوع فعليًا)</span><strong>{formatNumber(wallet.net)}</strong></div>
                        {wallet.locked_by_others > 0 && <div><span>محجوز لعقود أخرى صادرة</span><strong>− {formatNumber(wallet.locked_by_others)}</strong></div>}
                        <div><span>المتاح لهذا العقد</span><strong>{formatNumber(wallet.available_for_contract)}</strong></div>
                        <div className="sz-wallet-sep"><span>{issuedAt ? "المخصص لهذا العقد" : "سيُخصص لهذا العقد"}</span><strong>− {formatNumber(paidValue)}</strong></div>
                        <div className="sz-wallet-total">
                          <span>يتبقى في المحفظة (قابل للاسترداد)</span>
                          <strong>{formatNumber(Math.max(wallet.net - wallet.locked_by_others - paidValue, 0))}</strong>
                        </div>
                      </div>
                    )}
                    {paidExceedsWallet && (
                      <div className="sz-note sz-note-error" style={{ margin: "6px 0" }}>
                        المبلغ المسدد أكبر من رصيد المستثمر المتاح لهذا العقد ({formatNumber(wallet!.available_for_contract)}).
                      </div>
                    )}
                    <div className="sz-readonly">
                      <span>المبلغ المتبقي</span>
                      <strong>{formatNumber(pendingTotal)} ج.م</strong>
                    </div>
                  </>
                )}
              </section>
            );
          })}

          {data && pendingTotal > 0 && (
            <section className="sz-group">
              <div className="sz-group-title">الأقساط</div>
              <div className="sz-group-hint">عدد الأقساط وتاريخ ومبلغ كل قسط — يمكن أن تكون المبالغ غير متساوية بشرط أن يساوي مجموعها المبلغ المتبقي</div>
              {!body.includes("[[installments]]") && (
                <div className="sz-note sz-note-error" style={{ margin: "6px 0" }}>
                  نص قالب هذه المرحلة لا يحتوي على جدول الأقساط ولن تظهر في العقد — أضف <code>[[installments]]</code> في القالب أو استخدم «القالب القياسي».
                </div>
              )}
              <div style={{ display: "flex", gap: 8, margin: "6px 0 10px" }}>
                <TextField size="small" label="عدد الأقساط" type="number" value={scheduleRows.length || ""}
                  onChange={e => { const n = Math.max(1, Math.min(60, Number(e.target.value) || 1)); redistribute(n, parseAmount(values.installment_interval_months) || 1); }}
                  InputLabelProps={{ shrink: true }} inputProps={{ min: 1, max: 60 }} sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
                <TextField size="small" label="كل (شهور)" type="number" value={values.installment_interval_months ?? ""}
                  onChange={e => { const m = Math.max(1, Math.min(24, Number(e.target.value) || 1)); redistribute(scheduleRows.length || 1, m); }}
                  InputLabelProps={{ shrink: true }} inputProps={{ min: 1, max: 24 }} sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
              </div>
              <div className="sz-sched">
                {scheduleRows.map((r, n) => (
                  <div key={n} className="sz-sched-row">
                    <span className="sz-sched-n">{n + 1}</span>
                    <TextField size="small" type="date" value={dmyToIso(r.date)}
                      onChange={e => setScheduleRows(scheduleRows.map((x, j) => j === n ? { ...x, date: isoToDmy(e.target.value) } : x))}
                      error={!r.date} sx={{ flex: 1.15, "& .MuiOutlinedInput-root": { borderRadius: 2 }, "& input": { fontSize: 13, px: 1 } }} />
                    <TextField size="small" placeholder="المبلغ" value={r.amount}
                      onChange={e => setScheduleRows(scheduleRows.map((x, j) => j === n ? { ...x, amount: e.target.value } : x))}
                      error={!(parseAmount(r.amount) > 0)} sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: 2 }, "& input": { fontSize: 13, px: 1 } }} />
                    <button type="button" className="sz-icon" title="حذف القسط" onClick={() => setScheduleRows(scheduleRows.filter((_, j) => j !== n))}>
                      <DeleteOutlineOutlined sx={{ fontSize: 17 }} />
                    </button>
                  </div>
                ))}
                <div className="sz-sched-foot">
                  <button type="button" className="sz-link" onClick={() => {
                    const lastDate = parseDmy(scheduleRows[scheduleRows.length - 1]?.date ?? "");
                    const interval = parseAmount(values.installment_interval_months) || 1;
                    const next = lastDate ? new Date(Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth() + interval, lastDate.getUTCDate())) : null;
                    setScheduleRows([...scheduleRows, { date: next ? formatDate(next) : "", amount: "" }]);
                  }}>
                    <AddOutlined sx={{ fontSize: 16 }} /> إضافة قسط
                  </button>
                  <button type="button" className="sz-link" onClick={() => redistribute(scheduleRows.length || 1, parseAmount(values.installment_interval_months) || 1)}>
                    <RestartAltOutlined sx={{ fontSize: 15 }} /> توزيع بالتساوي
                  </button>
                </div>
                <div className={`sz-sched-sum ${scheduleMismatch ? "bad" : "ok"}`}>
                  <span>مجموع الأقساط</span>
                  <strong>{formatNumber(scheduleTotal)} / {formatNumber(pendingTotal)}</strong>
                </div>
                {scheduleMismatch && (
                  <div className="sz-sched-warn">
                    {scheduleTotal < pendingTotal ? `ناقص ${formatNumber(pendingTotal - scheduleTotal)}` : `زيادة ${formatNumber(scheduleTotal - pendingTotal)}`} —{" "}
                    <button type="button" className="sz-link" style={{ color: "#dc2626" }} onClick={addDifferenceToLast}>تسوية الفرق في القسط الأخير</button>
                  </div>
                )}
              </div>
            </section>
          )}

          {data && (() => {
            const listed = new Set(SECTIONS.flatMap(sec => sec.keys));
            const other = TEMPLATE_VARS.map(v => v.key).filter(k => used.has(k) && !listed.has(k) && !HIDDEN.has(k));
            if (!other.length) return null;
            return (
              <section className="sz-group">
                <button type="button" className="sz-collapse" onClick={() => setShowOther(o => !o)}>
                  <span>بنود العقد الأخرى <small>({other.length})</small></span>
                  {showOther ? <ExpandLessOutlined sx={{ fontSize: 18 }} /> : <ExpandMoreOutlined sx={{ fontSize: 18 }} />}
                </button>
                <div className="sz-group-hint">مدد ونسب من قالب المرحلة — عدّلها لهذا العقد فقط عند الحاجة</div>
                {showOther && other.map(renderField)}
              </section>
            );
          })()}

          {data && (
            <a className="sz-edit-template" href={`/admin/sanad-zayed/contract-templates?stage=${data.contract.stage_id}`}>
              <EditNoteOutlined sx={{ fontSize: 18 }} /> تعديل نص قالب المرحلة
            </a>
          )}
        </aside>

        {/* Document */}
        <div className="sz-stage">
          {data && <ContractPaper title={title} subtitle={subtitle} body={body} values={values} highlight />}
        </div>
      </div>

      <Dialog open={issueOpen} onClose={() => !issuing && setIssueOpen(false)} PaperProps={{ sx: { borderRadius: "18px", direction: "rtl", maxWidth: 460, width: "100%" } }} sx={{ zIndex: 1400 }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 800, color: "#154278" }}>
          {issuedAt ? "تحديث إصدار العقد" : "إصدار العقد"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, fontFamily: "var(--font-cairo)" }}>
          <div className="sz-issue-sum">
            <div><span>قيمة العقد</span><strong>{formatNumber(parseAmount(values.financing_amount) || 0)}</strong></div>
            <div><span>المسدد (من رصيد المستثمر)</span><strong>{formatNumber(paidValue)}</strong></div>
            <div><span>المتبقي</span><strong>{formatNumber(pendingTotal)}</strong></div>
            {pendingTotal > 0 && <div><span>عدد الأقساط</span><strong>{scheduleRows.length}</strong></div>}
          </div>
          <div style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.9 }}>
            {pendingTotal > 0 && <>سيتم تسجيل {scheduleRows.length} أقساط بإجمالي {formatNumber(pendingTotal)} على هذا العقد في النظام{issuedAt ? " (تستبدل الأقساط غير المسددة الحالية)" : ""}. </>}
            سيُحجز المبلغ المسدد من محفظة المستثمر لهذا العقد، ولن يمكن رد إلا ما يزيد عن قيمة العقود الصادرة. وتثبت بيانات السداد في نص العقد كما هي الآن.
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0, gap: 1 }}>
          <Button onClick={() => setIssueOpen(false)} disabled={issuing} sx={{ color: "#6b7280", fontWeight: 700, flex: 1 }}>إلغاء</Button>
          <Button onClick={issue} variant="contained" disabled={issuing}
            sx={{ flex: 1, fontWeight: 700, borderRadius: 2, background: "#154278", "&:hover": { background: "#0f3260" } }}>
            {issuing ? "جاري الإصدار..." : "تأكيد الإصدار"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Print version without review highlighting */}
      {data && (
        <div className="sz-print-only">
          <ContractPaper title={title} subtitle={subtitle} body={body} values={values} />
        </div>
      )}
      <style>{WORKSPACE_CSS}</style>
    </div>
  );

  return createPortal(workspace, document.body);
}

const WORKSPACE_CSS = `
.sz-print-root { position:fixed; inset:0; z-index:1300; background:#e7e5df; display:flex; flex-direction:column; font-family:var(--font-cairo),Cairo,sans-serif; }
.sz-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; padding:10px 18px; background:#fff; border-bottom:1px solid #e5e7eb; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.sz-workspace { flex:1; display:flex; min-height:0; }
.sz-panel { width:340px; flex-shrink:0; overflow-y:auto; background:#fff; border-inline-end:1px solid #e5e7eb; padding:8px 0 24px; }
.sz-group { padding:12px 18px 6px; border-bottom:1px solid #f1f0ec; }
.sz-group-title { font-weight:800; color:#154278; font-size:14px; }
.sz-group-hint { font-size:11.5px; color:#9ca3af; margin-bottom:4px; }
.sz-reset { position:absolute; left:6px; top:16px; border:none; background:#fff; color:#6b7280; cursor:pointer; border-radius:6px; padding:3px; display:flex; }
.sz-reset:hover { color:#154278; background:#eef2f7; }
.sz-sched { margin:10px 0 6px; padding:10px; border:1px solid #e5e7eb; border-radius:10px; background:#fbfaf8; }
.sz-sched-head { display:flex; justify-content:space-between; align-items:center; font-size:13px; font-weight:700; color:#374151; margin-bottom:6px; }
.sz-sched-row { display:flex; align-items:center; gap:6px; margin-bottom:6px; }
.sz-sched-n { width:18px; text-align:center; font-size:12px; color:#9ca3af; font-weight:700; }
.sz-sched-foot { display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-top:2px; }
.sz-sched-empty { font-size:12px; color:#9ca3af; padding:4px 0 8px; }
.sz-sched-warn { font-size:12px; color:#dc2626; font-weight:700; margin-top:6px; }
.sz-link { display:inline-flex; align-items:center; gap:4px; border:none; background:none; color:#154278; font-weight:700; font-size:12px; cursor:pointer; padding:2px 0; font-family:inherit; }
.sz-link:disabled { color:#9ca3af; cursor:default; }
.sz-icon { border:none; background:none; color:#9ca3af; cursor:pointer; display:flex; padding:4px; border-radius:6px; }
.sz-icon:hover { color:#dc2626; background:#fef2f2; }
.sz-note { margin:12px 16px 4px; padding:10px 12px; border-radius:10px; font-size:12.5px; line-height:1.8; }
.sz-note-info { background:#eff6ff; color:#1e3a8a; border:1px solid #dbeafe; }
.sz-note-error { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; font-weight:700; }
.sz-wallet { margin:8px 0 2px; padding:8px 12px; border-radius:10px; background:#faf6ef; border:1px solid #efe4d0; font-size:12.5px; color:#5b4a2e; }
.sz-wallet div { display:flex; justify-content:space-between; line-height:2; }
.sz-badge-issued { background:#eef2f7; color:#154278; display:inline-flex; align-items:center; gap:4px; }
.sz-issue-sum { background:#f9f9f7; border-radius:10px; padding:10px 14px; font-size:13.5px; }
.sz-issue-sum div { display:flex; justify-content:space-between; line-height:2.1; }
.sz-issue-sum strong { color:#154278; }
.sz-wallet-sep { border-top:1px dashed #e2d3b8; margin-top:4px; padding-top:4px; }
.sz-wallet-total { font-weight:800; color:#154278; }
.sz-note-ok { background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; font-weight:700; }
.sz-locked { display:flex; justify-content:space-between; align-items:center; margin:6px 0; padding:8px 12px; border-radius:10px; background:#f8fafc; border:1px solid #eef2f7; font-size:13px; color:#6b7280; }
.sz-locked strong { color:#111827; }
.sz-gender { display:flex; justify-content:space-between; align-items:center; margin:8px 0 4px; font-size:13px; color:#374151; }
.sz-gender > div { display:flex; border:1px solid #d1d5db; border-radius:10px; overflow:hidden; }
.sz-gender button { border:none; background:#fff; padding:6px 18px; cursor:pointer; font-family:inherit; font-weight:700; font-size:13px; color:#6b7280; }
.sz-gender button.on { background:#154278; color:#fff; }
.sz-readonly { display:flex; justify-content:space-between; align-items:center; margin:8px 0 6px; padding:9px 12px; border-radius:10px; background:#f3f6fa; font-size:13px; color:#374151; }
.sz-readonly strong { color:#154278; }
.sz-sched-sum { display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding:7px 10px; border-radius:8px; font-size:12.5px; }
.sz-sched-sum.ok { background:#dcfce7; color:#166534; }
.sz-sched-sum.bad { background:#fee2e2; color:#991b1b; }
.sz-collapse { width:100%; display:flex; justify-content:space-between; align-items:center; border:none; background:none; padding:0; cursor:pointer; font-family:inherit; font-weight:800; color:#154278; font-size:14px; }
.sz-collapse small { color:#9ca3af; font-weight:600; }
.sz-edit-template { display:flex; align-items:center; gap:6px; margin:14px 18px 0; font-size:13px; font-weight:700; color:#154278; text-decoration:none; }
.sz-stage { flex:1; overflow:auto; padding:28px 24px 60px; display:flex; justify-content:center; align-items:flex-start; }
.sz-badge { font-size:12px; font-weight:700; border-radius:8px; padding:5px 10px; }
.sz-badge-warn { background:#fef3c7; color:#92400e; }
.sz-badge-ok { background:#dcfce7; color:#166534; }
.sz-print-only { display:none; }
@media (max-width: 900px) {
  .sz-workspace { flex-direction:column; overflow:auto; }
  .sz-panel { width:auto; border-inline-end:none; overflow:visible; }
  .sz-stage { overflow:visible; padding:16px; }
  .sz-stage .sz-paper { transform-origin:top center; zoom:.45; }
}

@page {
  size: A4;
  margin: 12mm 16mm 13mm;
  @bottom-center { content: "صفحة " counter(page) " من " counter(pages); font-size: 8pt; color: #6b7280; font-family: Cairo, sans-serif; }
  /* Empty margin boxes keep the browser from printing its own title / date / URL lines. */
  @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; }
  @bottom-left { content: ""; } @bottom-right { content: ""; }
}
@media print {
  html, body { background:#fff !important; }
  body > *:not(.sz-print-root) { display:none !important; }
  .sz-print-root { position:static !important; inset:auto !important; display:block !important; background:#fff !important; }
  .sz-no-print, .sz-workspace { display:none !important; }
  .sz-print-only { display:block !important; }
}
`;
