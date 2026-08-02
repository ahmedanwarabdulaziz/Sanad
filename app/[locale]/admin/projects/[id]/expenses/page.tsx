"use client";

import { useState, useEffect, useCallback } from "react";
import { useProject } from "../layout";
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, CircularProgress,
  Alert, Chip, IconButton, ToggleButton, ToggleButtonGroup, Switch, FormControlLabel,
} from "@mui/material";
import {
  AddOutlined, EditOutlined, DeleteOutline,
  AttachFileOutlined, CloudUploadOutlined, AddCircleOutline, RemoveCircleOutline,
  EventOutlined, SearchOutlined, FilterListOutlined,
} from "@mui/icons-material";

interface Stage { id: string; stage_name: string; }
interface Account { id: string; account_name: string; account_type: string; }
interface Attachment { name: string; url: string; }
interface Payment { account_id: string; amount: string; }
interface ScheduledPayment { amount: string; due_date: string; }
interface PaymentDisplay { account_id: string; amount: number; account_name: string; }
interface Expense {
  id: string; expense_name: string; pricing_type: string;
  company_amount: number; investor_amount: number;
  payment_status: string; paid_amount: number;
  financial_account_id: string | null; stage_id: string;
  expense_date: string; due_date: string | null;
  notes: string; attachments: Attachment[];
  payments: { account_id: string; amount: number }[];
  payments_display: PaymentDisplay[];
  scheduled_payments: { amount: number; due_date: string }[];
  stage: { stage_name: string };
}

const formatNumber = (n: number) => new Intl.NumberFormat("en-US").format(n);
const formatDate = (d: string) => { if (!d) return "—"; const parts = d.split("-"); if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`; return d; };

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px", backgroundColor: "rgba(15,23,42,0.5)", color: "#e2e8f0", fontFamily: "var(--font-cairo)",
    "& fieldset": { borderColor: "rgba(148,163,184,0.15)" },
    "&:hover fieldset": { borderColor: "rgba(59,130,246,0.4)" },
    "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
  },
  "& .MuiInputLabel-root": { color: "#94a3b8", fontFamily: "var(--font-cairo)", "&.Mui-focused": { color: "#60a5fa" } },
  "& .MuiInputBase-input": { textAlign: "right" },
};

const dialogSx = {
  "& .MuiDialog-paper": {
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    border: "1px solid rgba(148,163,184,0.12)", borderRadius: "20px",
    color: "#e2e8f0", direction: "rtl" as const, minWidth: "min(600px, 94vw)", maxHeight: "90vh",
  },
};

const menuSx = { PaperProps: { sx: { background: "#1e293b", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "12px", "& .MuiMenuItem-root": { fontFamily: "var(--font-cairo)", color: "#e2e8f0", "&:hover": { background: "rgba(59,130,246,0.1)" } } } } };

const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
  PAID: { label: "مدفوع", color: "#10b981" },
  PARTIAL: { label: "جزئي", color: "#f59e0b" },
  FUTURE: { label: "مستقبلي", color: "#3b82f6" },
};

const toggleBtnSx = { "& .MuiToggleButton-root": { fontFamily: "var(--font-cairo)", color: "#94a3b8", borderColor: "rgba(148,163,184,0.2)", fontSize: "12px", textTransform: "none" as const, "&.Mui-selected": { background: "rgba(59,130,246,0.15)", color: "#60a5fa", borderColor: "rgba(59,130,246,0.3)" } } };
const toggleBtnSxGreen = { "& .MuiToggleButton-root": { fontFamily: "var(--font-cairo)", color: "#94a3b8", borderColor: "rgba(148,163,184,0.2)", fontSize: "12px", textTransform: "none" as const, "&.Mui-selected": { background: "rgba(16,185,129,0.15)", color: "#86efac", borderColor: "rgba(16,185,129,0.3)" } } };

const emptyForm = {
  expense_name: "", stage_id: "", pricing_type: "SHARED" as string,
  company_amount: "", investor_amount: "",
  payment_status: "PAID" as string,
  expense_date: new Date().toISOString().split("T")[0],
  notes: "",
  show_to_investors: true,
  investor_display_name: "",
};

export default function ExpensesPage() {
  const { projectId } = useProject();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [payments, setPayments] = useState<Payment[]>([{ account_id: "", amount: "" }]);
  const [scheduledPayments, setScheduledPayments] = useState<ScheduledPayment[]>([]);
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteExpense, setDeleteExpense] = useState<Expense | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const hasFilters = search || filterStage || filterStatus;

  const fetchAll = useCallback(async () => {
    try {
      const [expRes, stgRes, accRes] = await Promise.all([
        fetch(`/api/erp-auth/projects/${projectId}/expenses`),
        fetch(`/api/erp-auth/projects/${projectId}/stages`),
        fetch("/api/erp-auth/financial-accounts"),
      ]);
      const expData = await expRes.json();
      const stgData = await stgRes.json();
      const accData = await accRes.json();
      if (expData.expenses) setExpenses(expData.expenses);
      if (stgData.stages) setStages(stgData.stages);
      if (accData.accounts) setAccounts(accData.accounts.filter((a: Account) => a.account_type !== "CLOSED"));
    } catch { setError("فشل في تحميل البيانات"); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Compute expense total for payment — company amount only (investor covered by deposits)
  const getTotal = () => {
    return Number(form.company_amount || 0);
  };

  const totalPayments = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalScheduled = scheduledPayments.reduce((s, sp) => s + Number(sp.amount || 0), 0);
  const expenseTotal = getTotal();
  const remaining = expenseTotal - totalPayments - totalScheduled;

  const openAdd = () => {
    setDialogMode("add"); setEditId(null);
    setForm({ ...emptyForm });
    setPayments([{ account_id: "", amount: "" }]);
    setScheduledPayments([]);
    setAttachments([]); setDialogOpen(true);
  };

  const openEdit = (exp: Expense) => {
    setDialogMode("edit"); setEditId(exp.id);
    setForm({
      expense_name: exp.expense_name,
      stage_id: exp.stage_id || "",
      pricing_type: exp.pricing_type,
      company_amount: String(exp.company_amount),
      investor_amount: String(exp.investor_amount),
      payment_status: exp.payment_status,
      expense_date: exp.expense_date,
      notes: exp.notes || "",
      show_to_investors: (exp as unknown as { show_to_investors?: boolean }).show_to_investors !== false,
      investor_display_name: (exp as unknown as { investor_display_name?: string }).investor_display_name || "",
    });
    const existingPayments = (exp.payments || []).map(p => ({ account_id: p.account_id, amount: String(p.amount) }));
    setPayments(existingPayments.length > 0 ? existingPayments : [{ account_id: "", amount: "" }]);
    const existingSched = (exp.scheduled_payments || []).map(sp => ({ amount: String(sp.amount), due_date: sp.due_date }));
    setScheduledPayments(existingSched);
    setAttachments(exp.attachments || []);
    setDialogOpen(true);
  };

  const handlePaymentChange = (idx: number, field: "account_id" | "amount", value: string) => {
    setPayments(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };
  const addPaymentRow = () => setPayments(prev => [...prev, { account_id: "", amount: "" }]);
  const removePaymentRow = (idx: number) => setPayments(prev => prev.filter((_, i) => i !== idx));

  const handleSchedChange = (idx: number, field: "amount" | "due_date", value: string) => {
    setScheduledPayments(prev => prev.map((sp, i) => i === idx ? { ...sp, [field]: value } : sp));
  };
  const addSchedRow = () => setScheduledPayments(prev => [...prev, { amount: "", due_date: "" }]);
  const removeSchedRow = (idx: number) => setScheduledPayments(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const validPayments = payments.filter(p => p.account_id && Number(p.amount) > 0).map(p => ({ account_id: p.account_id, amount: Number(p.amount) }));
      const validSched = scheduledPayments.filter(sp => Number(sp.amount) > 0 && sp.due_date).map(sp => ({ amount: Number(sp.amount), due_date: sp.due_date }));

      const url = dialogMode === "add"
        ? `/api/erp-auth/projects/${projectId}/expenses`
        : `/api/erp-auth/projects/${projectId}/expenses/${editId}`;
      const method = dialogMode === "add" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, payments: validPayments, scheduled_payments: validSched, attachments }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); setSaving(false); return; }
      setSuccess(dialogMode === "add" ? "تم إضافة المصروف" : "تم تعديل المصروف");
      setDialogOpen(false); fetchAll();
    } catch { setError("فشل"); } finally { setSaving(false); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch(`/api/erp-auth/projects/${projectId}/expenses/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.attachment) setAttachments(prev => [...prev, data.attachment]);
      else setError(data.error || "فشل رفع الملف");
    } catch { setError("فشل رفع الملف"); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const handleDelete = async () => {
    if (!deleteExpense) return;
    setDeleteSaving(true); setError(null);
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}/expenses/${deleteExpense.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم حذف المصروف"); setDeleteOpen(false); setDeleteExpense(null); fetchAll();
    } catch { setError("فشل"); } finally { setDeleteSaving(false); }
  };

  const filteredExpenses = expenses.filter(exp => {
    if (search && !exp.expense_name.includes(search) && !exp.stage?.stage_name.includes(search)) return false;
    if (filterStage && exp.stage_id !== filterStage) return false;
    if (filterStatus && exp.payment_status !== filterStatus) return false;
    return true;
  });

  const totalCompany = filteredExpenses.reduce((s, e) => s + Number(e.company_amount), 0);
  const totalPaid = filteredExpenses.reduce((s, e) => s + Number(e.paid_amount), 0);
  const totalPending = totalCompany - totalPaid;

  // Validation — treasury account is always required
  const hasAccount = payments.some(p => p.account_id);
  const isPaymentValid = () => {
    if (!hasAccount) return false; // Treasury account is always required
    if (form.payment_status === "FUTURE") return scheduledPayments.some(sp => Number(sp.amount) > 0 && sp.due_date);
    if (form.payment_status === "PAID") return totalPayments > 0 && totalPayments === expenseTotal;
    if (form.payment_status === "PARTIAL") return totalPayments > 0;
    return true;
  };
  const isFormValid = form.expense_name && form.stage_id && Number(form.company_amount) > 0 && isPaymentValid();

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>المصروفات</h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0, fontFamily: "var(--font-cairo)" }}>إدارة مصروفات المشروع والمراحل</p>
        </div>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={openAdd}
          sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
          مصروف جديد
        </Button>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "إجمالي المصروفات", value: formatNumber(totalCompany), color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
          { label: "إجمالي المدفوع", value: formatNumber(totalPaid), color: "#10b981", bg: "rgba(16,185,129,0.08)" },
          { label: "مستحقات مستقبلية", value: formatNumber(totalPending), color: totalPending > 0 ? "#ef4444" : "#64748b", bg: totalPending > 0 ? "rgba(239,68,68,0.08)" : "rgba(100,116,139,0.08)" },
        ].map(c => (
          <div key={c.label} style={{ padding: "16px 18px", borderRadius: "16px", background: c.bg, border: `1px solid ${c.color}22` }}>
            <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>{c.label}</p>
            <p style={{ fontSize: "20px", fontWeight: 700, color: c.color, margin: 0 }}>{c.value} <span style={{ fontSize: "12px", fontWeight: 400 }}>ج.م</span></p>
          </div>
        ))}
      </div>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontFamily: "var(--font-cairo)", direction: "rtl" }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#86efac", fontFamily: "var(--font-cairo)", direction: "rtl" }}>{success}</Alert>}

      {/* Filters */}
      <div style={{ marginBottom: "16px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: "160px" }}>
          <SearchOutlined sx={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: 18, pointerEvents: "none" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث عن مصروف..."
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 40px 10px 14px", background: "rgba(15,23,42,0.5)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: "12px", color: "#e2e8f0", fontFamily: "var(--font-cairo)", fontSize: "13px", outline: "none", direction: "rtl" }}
          />
        </div>
        {/* Stage filter */}
        <select
          value={filterStage}
          onChange={e => setFilterStage(e.target.value)}
          style={{ flex: "1 1 160px", minWidth: "140px", padding: "10px 12px", background: "rgba(15,23,42,0.5)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: "12px", color: filterStage ? "#e2e8f0" : "#64748b", fontFamily: "var(--font-cairo)", fontSize: "13px", outline: "none", cursor: "pointer", direction: "rtl" }}
        >
          <option value="">كل المراحل</option>
          {stages.map(s => <option key={s.id} value={s.id}>{s.stage_name}</option>)}
        </select>
        {/* Status chips */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {Object.entries(PAYMENT_LABELS).map(([val, { label, color }]) => (
            <button key={val} onClick={() => setFilterStatus(filterStatus === val ? "" : val)}
              style={{ padding: "6px 14px", borderRadius: "20px", border: `1px solid ${filterStatus === val ? color : "rgba(148,163,184,0.2)"}`, background: filterStatus === val ? `${color}22` : "transparent", color: filterStatus === val ? color : "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
              {label}
            </button>
          ))}
        </div>
        {/* Clear filters */}
        {hasFilters && (
          <button onClick={() => { setSearch(""); setFilterStage(""); setFilterStatus(""); }}
            style={{ padding: "6px 14px", borderRadius: "20px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontFamily: "var(--font-cairo)", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}>
            <FilterListOutlined sx={{ fontSize: 14 }} /> مسح الفلاتر
          </button>
        )}
      </div>

      {/* Filtered count hint */}
      {hasFilters && (
        <p style={{ fontSize: "12px", color: "#64748b", fontFamily: "var(--font-cairo)", margin: "0 0 12px", direction: "rtl" }}>
          يعرض {filteredExpenses.length} من أصل {expenses.length} مصروف
        </p>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}><CircularProgress sx={{ color: "#3b82f6" }} /></div>
      ) : filteredExpenses.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", borderRadius: "20px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
          <p style={{ fontSize: "48px", margin: "0 0 12px" }}>🔍</p>
          <p style={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "16px" }}>{hasFilters ? "لا توجد نتائج للفلتر الحالي" : "لا توجد مصروفات بعد"}</p>
        </div>
      ) : (
        <div style={{ borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(148,163,184,0.08)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 80px", gap: "6px", padding: "10px 16px", background: "rgba(15,23,42,0.6)", borderBottom: "1px solid rgba(148,163,184,0.08)", fontFamily: "var(--font-cairo)", fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
            <span>المصروف</span><span>المرحلة</span>
            <span style={{ textAlign: "center" }}>الشركة</span><span style={{ textAlign: "center" }}>المستثمرين</span>
            <span style={{ textAlign: "center" }}>الحالة</span><span style={{ textAlign: "center" }}>التاريخ</span>
            <span style={{ textAlign: "center" }}>إجراء</span>
          </div>
          {filteredExpenses.map((exp, i) => (
            <div key={exp.id} style={{
              display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 80px", gap: "6px",
              padding: "12px 16px", alignItems: "center",
              background: i % 2 === 0 ? "rgba(30,41,59,0.3)" : "rgba(30,41,59,0.5)",
              borderBottom: "1px solid rgba(148,163,184,0.04)",
            }}>
              <div>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", fontFamily: "var(--font-cairo)" }}>{exp.expense_name}</span>
                {exp.attachments?.length > 0 && <AttachFileOutlined sx={{ fontSize: 13, color: "#64748b", ml: 0.5, verticalAlign: "middle" }} />}
                {(exp.payments_display || []).map((p, pi) => (
                  <p key={pi} style={{ fontSize: "10px", color: "#64748b", margin: "1px 0 0", fontFamily: "var(--font-cairo)" }}>
                    💳 {p.account_name}: {formatNumber(p.amount)} ج.م
                  </p>
                ))}
                {(exp.scheduled_payments || []).map((sp, si) => (
                  <p key={`s${si}`} style={{ fontSize: "10px", color: "#f59e0b", margin: "1px 0 0", fontFamily: "var(--font-cairo)" }}>
                    📅 {formatNumber(sp.amount)} ج.م — استحقاق: {formatDate(sp.due_date)}
                  </p>
                ))}
              </div>
              <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>{exp.stage?.stage_name}</span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#f59e0b", textAlign: "center" }}>{formatNumber(exp.company_amount)}</span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#8b5cf6", textAlign: "center" }}>{formatNumber(exp.investor_amount)}</span>
              <span style={{ textAlign: "center" }}>
                <Chip label={PAYMENT_LABELS[exp.payment_status]?.label} size="small" sx={{ backgroundColor: `${PAYMENT_LABELS[exp.payment_status]?.color}22`, color: PAYMENT_LABELS[exp.payment_status]?.color, fontFamily: "var(--font-cairo)", fontSize: "10px", fontWeight: 600, height: "20px" }} />
                {exp.payment_status === "PARTIAL" && <p style={{ fontSize: "10px", color: "#f59e0b", margin: "2px 0 0" }}>مدفوع: {formatNumber(exp.paid_amount)}</p>}
              </span>
              <span style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center" }}>{formatDate(exp.expense_date)}</span>
              <div style={{ display: "flex", justifyContent: "center", gap: "2px" }}>
                <IconButton size="small" onClick={() => openEdit(exp)} title="تعديل" sx={{ color: "#f59e0b", "&:hover": { background: "rgba(245,158,11,0.1)" } }}><EditOutlined sx={{ fontSize: 15 }} /></IconButton>
                <IconButton size="small" onClick={() => { setDeleteExpense(exp); setDeleteOpen(true); }} title="حذف" sx={{ color: "#94a3b8", "&:hover": { color: "#f87171", background: "rgba(248,113,113,0.1)" } }}><DeleteOutline sx={{ fontSize: 15 }} /></IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add/Edit Dialog ── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>
          {dialogMode === "add" ? "مصروف جديد" : "تعديل المصروف"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
          <TextField label="اسم المصروف *" value={form.expense_name} onChange={e => setForm({ ...form, expense_name: e.target.value })} fullWidth sx={fieldSx} />

          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>المرحلة *</InputLabel>
            <Select value={form.stage_id} onChange={e => setForm({ ...form, stage_id: e.target.value })} label="المرحلة *" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              {stages.map(s => <MenuItem key={s.id} value={s.id}>{s.stage_name}</MenuItem>)}
            </Select>
          </FormControl>

          {/* Pricing */}
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", margin: "0 0 8px", fontFamily: "var(--font-cairo)" }}>نوع التسعير</p>
            <ToggleButtonGroup value={form.pricing_type} exclusive onChange={(_, v) => v && setForm({ ...form, pricing_type: v })} size="small" fullWidth sx={toggleBtnSx}>
              <ToggleButton value="SHARED">سعر واحد (مشترك)</ToggleButton>
              <ToggleButton value="DUAL">سعرين (شركة + مستثمرين)</ToggleButton>
            </ToggleButtonGroup>
          </div>

          {form.pricing_type === "SHARED" ? (
            <>
              <TextField label="المبلغ (ج.م) *" type="number" value={form.company_amount} onChange={e => setForm({ ...form, company_amount: e.target.value })} fullWidth sx={fieldSx} />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.show_to_investors}
                    onChange={e => setForm({ ...form, show_to_investors: e.target.checked })}
                    sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#8b5cf6" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#8b5cf6" } }}
                  />
                }
                label="يُحسب على المستثمرين"
                sx={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", "& .MuiFormControlLabel-label": { fontFamily: "var(--font-cairo)", fontSize: "13px" } }}
              />
              {form.show_to_investors && (
                <TextField label="اسم المصروف للمستثمرين (اختياري)" value={form.investor_display_name} onChange={e => setForm({ ...form, investor_display_name: e.target.value })} fullWidth sx={fieldSx} helperText="لو فاضي هيظهر نفس اسم المصروف" FormHelperTextProps={{ sx: { fontFamily: "var(--font-cairo)", color: "#64748b", fontSize: "10px", textAlign: "right" } }} />
              )}
            </>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <TextField label="مبلغ الشركة (ج.م)" type="number" value={form.company_amount} onChange={e => setForm({ ...form, company_amount: e.target.value })} fullWidth sx={fieldSx} />
                <TextField label="مبلغ المستثمرين (ج.م)" type="number" value={form.investor_amount} onChange={e => setForm({ ...form, investor_amount: e.target.value })} fullWidth sx={fieldSx} />
              </div>
              <TextField label="اسم المصروف للمستثمرين (اختياري)" value={form.investor_display_name} onChange={e => setForm({ ...form, investor_display_name: e.target.value })} fullWidth sx={fieldSx} helperText="لو فاضي هيظهر نفس اسم المصروف" FormHelperTextProps={{ sx: { fontFamily: "var(--font-cairo)", color: "#64748b", fontSize: "10px", textAlign: "right" } }} />
            </>
          )}

          {/* Total display */}
          {expenseTotal > 0 && (
            <div style={{ padding: "8px 12px", borderRadius: "10px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", fontSize: "13px", fontWeight: 600, color: "#60a5fa", fontFamily: "var(--font-cairo)", textAlign: "center" }}>
              إجمالي المصروف: {formatNumber(expenseTotal)} ج.م
            </div>
          )}

          {/* Payment Status */}
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", margin: "0 0 8px", fontFamily: "var(--font-cairo)" }}>حالة الدفع</p>
            <ToggleButtonGroup value={form.payment_status} exclusive onChange={(_, v) => { if (!v) return; setForm({ ...form, payment_status: v }); if (v === "FUTURE") setPayments([{ account_id: "", amount: "" }]); if (v === "PAID") setScheduledPayments([]); }} size="small" fullWidth sx={toggleBtnSxGreen}>
              <ToggleButton value="PAID">مدفوع بالكامل</ToggleButton>
              <ToggleButton value="PARTIAL">دفع جزئي</ToggleButton>
              <ToggleButton value="FUTURE">دفع مستقبلي</ToggleButton>
            </ToggleButtonGroup>
          </div>

          {/* ── Treasury Account (Always required) ── */}
          <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#10b981", margin: 0, fontFamily: "var(--font-cairo)" }}>💳 {form.payment_status === "FUTURE" ? "الخزينة *" : "الدفع من الخزينة *"}</p>
              {form.payment_status !== "FUTURE" && (
                <IconButton size="small" onClick={addPaymentRow} sx={{ color: "#10b981", "&:hover": { background: "rgba(16,185,129,0.1)" } }}>
                  <AddCircleOutline sx={{ fontSize: 18 }} />
                </IconButton>
              )}
            </div>
            {payments.map((p, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: form.payment_status === "FUTURE" ? "1fr 28px" : "1fr 1fr 28px", gap: "8px", marginBottom: "6px", alignItems: "center" }}>
                <FormControl fullWidth sx={fieldSx} size="small">
                  <InputLabel sx={{ fontSize: "12px" }}>الخزينة</InputLabel>
                  <Select value={p.account_id} onChange={e => handlePaymentChange(idx, "account_id", e.target.value)} label="الخزينة" sx={{ color: "#e2e8f0", fontSize: "13px" }} MenuProps={menuSx}>
                    {accounts.map(a => <MenuItem key={a.id} value={a.id}>{a.account_name}</MenuItem>)}
                  </Select>
                </FormControl>
                {form.payment_status !== "FUTURE" && (
                  <TextField type="number" label="المبلغ" value={p.amount} onChange={e => handlePaymentChange(idx, "amount", e.target.value)} size="small" sx={fieldSx} />
                )}
                {payments.length > 1 && (
                  <IconButton size="small" onClick={() => removePaymentRow(idx)} sx={{ color: "#f87171", "&:hover": { background: "rgba(248,113,113,0.1)" } }}>
                    <RemoveCircleOutline sx={{ fontSize: 16 }} />
                  </IconButton>
                )}
              </div>
            ))}
            {form.payment_status !== "FUTURE" && (
              <p style={{ fontSize: "11px", color: "#10b981", margin: "4px 0 0", fontFamily: "var(--font-cairo)" }}>
                المدفوع: {formatNumber(totalPayments)} ج.م
                {form.payment_status === "PAID" && totalPayments !== expenseTotal && expenseTotal > 0 && (
                  <span style={{ color: "#ef4444", marginRight: "8px" }}>⚠ يجب أن يساوي مبلغ الشركة ({formatNumber(expenseTotal)})</span>
                )}
              </p>
            )}
          </div>

          {/* ── Scheduled Payments (PARTIAL & FUTURE) ── */}
          {(form.payment_status === "PARTIAL" || form.payment_status === "FUTURE") && (
            <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#f59e0b", margin: 0, fontFamily: "var(--font-cairo)" }}>📅 الأقساط المجدولة</p>
                <IconButton size="small" onClick={addSchedRow} sx={{ color: "#f59e0b", "&:hover": { background: "rgba(245,158,11,0.1)" } }}>
                  <AddCircleOutline sx={{ fontSize: 18 }} />
                </IconButton>
              </div>
              {scheduledPayments.length === 0 && (
                <p style={{ fontSize: "11px", color: "#64748b", margin: 0, fontFamily: "var(--font-cairo)", textAlign: "center", padding: "8px 0" }}>
                  اضغط + لإضافة قسط مجدول
                </p>
              )}
              {scheduledPayments.map((sp, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 28px", gap: "8px", marginBottom: "6px", alignItems: "center" }}>
                  <TextField type="number" label="المبلغ" value={sp.amount} onChange={e => handleSchedChange(idx, "amount", e.target.value)} size="small" sx={fieldSx} />
                  <TextField type="date" label="تاريخ الاستحقاق" value={sp.due_date} onChange={e => handleSchedChange(idx, "due_date", e.target.value)} size="small" sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", fontSize: "12px" } }} InputLabelProps={{ shrink: true }} />
                  <IconButton size="small" onClick={() => removeSchedRow(idx)} sx={{ color: "#f87171", "&:hover": { background: "rgba(248,113,113,0.1)" } }}>
                    <RemoveCircleOutline sx={{ fontSize: 16 }} />
                  </IconButton>
                </div>
              ))}
              {scheduledPayments.length > 0 && (
                <p style={{ fontSize: "11px", color: "#f59e0b", margin: "4px 0 0", fontFamily: "var(--font-cairo)" }}>
                  إجمالي المجدول: {formatNumber(totalScheduled)} ج.م
                  {remaining > 0 && <span style={{ color: "#ef4444", marginRight: "8px" }}>— متبقي غير مجدول: {formatNumber(remaining)} ج.م</span>}
                  {remaining < 0 && <span style={{ color: "#ef4444", marginRight: "8px" }}>⚠ المجدول أكثر من المتبقي</span>}
                </p>
              )}
            </div>
          )}

          <TextField label="تاريخ المصروف" type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left" } }} InputLabelProps={{ shrink: true }} />
          <TextField label="ملاحظات" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} fullWidth multiline rows={2} sx={fieldSx} />

          {/* Attachments */}
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", margin: "0 0 8px", fontFamily: "var(--font-cairo)" }}>المرفقات</p>
            {attachments.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                {attachments.map((att, idx) => (
                  <Chip key={idx} label={att.name} size="small" icon={<AttachFileOutlined sx={{ fontSize: 14 }} />}
                    onDelete={() => setAttachments(prev => prev.filter((_, j) => j !== idx))}
                    sx={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#60a5fa", fontFamily: "var(--font-cairo)", fontSize: "11px", "& .MuiChip-deleteIcon": { color: "#94a3b8" } }} />
                ))}
              </div>
            )}
            <Button component="label" size="small" startIcon={uploading ? <CircularProgress size={14} sx={{ color: "#94a3b8" }} /> : <CloudUploadOutlined />} disabled={uploading}
              sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontSize: "12px", textTransform: "none", color: "#94a3b8", border: "1px dashed rgba(148,163,184,0.2)", "&:hover": { background: "rgba(59,130,246,0.05)" } }}>
              {uploading ? "جاري الرفع..." : "رفع ملف"}
              <input type="file" hidden onChange={handleUpload} />
            </Button>
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleSave} disabled={saving || !isFormValid} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: dialogMode === "add" ? "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" : "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : dialogMode === "add" ? "إضافة" : "حفظ التعديلات"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#f87171" }}>حذف المصروف</DialogTitle>
        <DialogContent>
          <p style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", fontSize: "15px", margin: 0 }}>
            هل أنت متأكد من حذف <strong style={{ color: "#e2e8f0" }}>{deleteExpense?.expense_name}</strong>؟
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleDelete} disabled={deleteSaving} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "#dc2626", "&:hover": { background: "#b91c1c" } }}>
            {deleteSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حذف"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
