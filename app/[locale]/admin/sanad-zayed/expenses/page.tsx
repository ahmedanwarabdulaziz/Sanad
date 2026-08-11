"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Alert, IconButton,
  MenuItem, Select, FormControl, InputLabel, Tooltip
} from "@mui/material";
import {
  AddOutlined, CloseOutlined, SearchOutlined, ReceiptLongOutlined,
  AttachFileOutlined, DeleteOutline, PaymentsOutlined, VisibilityOffOutlined,
  AccountTreeOutlined, WarningAmberOutlined, PersonOutline
} from "@mui/icons-material";
import { sanitizeDecimalInput } from "@/lib/sanad-zayed/decimalInput";

interface Allocation { id?: string; stage_id: string; percentage: number; stage?: { name: string } }
interface Payment { id: string; amount: number; paid_date: string; financial_account?: { account_name: string } }

interface Expense {
  id: string;
  description: string;
  category: string;
  allocated_cost: number;
  actual_paid_amount: number;
  expense_date: string;
  status: string;
  notes: string;
  attachment_url?: string;
  financial_account?: { account_name: string; custodian_name: string; account_type: string };
  allocations?: Allocation[];
  payments?: Payment[];
  investor_override_description?: string | null;
  investor_override_amount?: number | null;
  hide_from_investor?: boolean;
  recoverable_investor_id?: string | null;
  recoverable_investor?: { id: string; name: string } | null;
  created_at: string;
}

interface Account { id: string; account_name: string; custodian_name: string; account_type: string; current_balance: number; }
interface Stage { id: string; name: string; }
interface Investor { id: string; name: string; }

const CATEGORIES = ["تراخيص", "عمولات", "مقاولات", "إدارية ونثريات", "أخرى"];

export default function ExpensesPage() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);

  const [search, setSearch] = useState("");
  const [flash, setFlash] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal states
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentExpense, setPaymentExpense] = useState<Expense | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", paid_date: new Date().toISOString().split("T")[0], financial_account_id: "", notes: "" });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    description: "",
    category: "",
    allocated_cost: "",
    actual_paid_amount: "",
    expense_date: new Date().toISOString().split("T")[0],
    financial_account_id: "",
    notes: "",
    recoverable_investor_id: "",
  });
  const [splits, setSplits] = useState<{ stage_id: string; percentage: string }[]>([]);

  const [allocationExpense, setAllocationExpense] = useState<Expense | null>(null);
  const [allocationSplits, setAllocationSplits] = useState<{ stage_id: string; percentage: string }[]>([]);
  const [allocationSubmitting, setAllocationSubmitting] = useState(false);

  const [recoveryExpense, setRecoveryExpense] = useState<Expense | null>(null);
  const [recoveryInvestorId, setRecoveryInvestorId] = useState("");
  const [recoverySubmitting, setRecoverySubmitting] = useState(false);

  const showFlash = (type: "success" | "error", text: string) => {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 4500);
  };

  const fetchData = useCallback(async () => {
    try {
      const [expRes, accRes, stageRes, invRes] = await Promise.all([
        fetch("/api/sanad-zayed/expenses"),
        fetch("/api/sanad-zayed/treasury"),
        fetch("/api/sanad-zayed/stages"),
        fetch("/api/sanad-zayed/investors"),
      ]);
      const expData = await expRes.json();
      const accData = await accRes.json();
      const stageData = await stageRes.json();
      const invData = await invRes.json();

      if (expData.expenses) setExpenses(expData.expenses);
      if (accData.accounts) setAccounts(accData.accounts);
      if (stageData.stages) setStages(stageData.stages);
      if (invData.investors) setInvestors(invData.investors);
    } catch {
      showFlash("error", "فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter(ex =>
      ex.description.toLowerCase().includes(q) ||
      ex.category.toLowerCase().includes(q)
    );
  }, [expenses, search]);

  const totalPaid = expenses.reduce((sum, ex) => sum + Number(ex.actual_paid_amount), 0);
  const totalAllocated = expenses.reduce((sum, ex) => sum + Number(ex.allocated_cost), 0);

  const splitTotal = splits.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0);

  const addSplitRow = () => setSplits(s => [...s, { stage_id: "", percentage: s.length === 0 ? "100" : "" }]);
  const removeSplitRow = (i: number) => setSplits(s => s.filter((_, idx) => idx !== i));
  const updateSplitRow = (i: number, patch: Partial<{ stage_id: string; percentage: string }>) =>
    setSplits(s => s.map((row, idx) => idx === i ? { ...row, ...patch } : row));

  const handleAdd = async () => {
    if (!form.description.trim()) return showFlash("error", "البيان / الوصف مطلوب");
    if (!form.allocated_cost || Number(form.allocated_cost) <= 0) return showFlash("error", "إجمالي الالتزام (تكلفة المصروف) غير صحيح");
    if (Number(form.actual_paid_amount) > 0 && !form.financial_account_id) return showFlash("error", "يجب اختيار الخزينة / العهدة للدفعة");
    if (splits.length > 0 && Math.abs(splitTotal - 100) > 0.01) return showFlash("error", `مجموع نسب توزيع المراحل يجب أن يكون 100% (الحالي ${splitTotal}%)`);
    if (splits.some(s => !s.stage_id)) return showFlash("error", "اختر مرحلة لكل بند توزيع");
    if (splits.length > 0 && form.recoverable_investor_id) return showFlash("error", "لا يمكن توزيع المصروف على مرحلة وربطه باسترداد من مستثمر في نفس الوقت");

    setSubmitting(true);
    try {
      let uploadedUrl = "";

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "فشل رفع المرفق");
        uploadedUrl = uploadData.url;
      }

      const payload = {
        description: form.description,
        category: form.category,
        allocated_cost: Number(form.allocated_cost),
        actual_paid_amount: Number(form.actual_paid_amount) || 0,
        expense_date: form.expense_date,
        financial_account_id: form.financial_account_id || null,
        notes: form.notes,
        attachment_url: uploadedUrl || null,
        stage_allocations: splits.map(s => ({ stage_id: s.stage_id, percentage: Number(s.percentage) })),
        recoverable_investor_id: form.recoverable_investor_id || null,
      };

      const res = await fetch("/api/sanad-zayed/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "حدث خطأ");

      setAddOpen(false);
      setForm({
        description: "", category: "", allocated_cost: "", actual_paid_amount: "",
        expense_date: new Date().toISOString().split("T")[0], financial_account_id: "", notes: "",
        recoverable_investor_id: "",
      });
      setSplits([]);
      setSelectedFile(null);
      showFlash("success", "تم تسجيل المصروف بنجاح");
      fetchData();
    } catch (err: any) {
      showFlash("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openPaymentDialog = (ex: Expense) => {
    setPaymentExpense(ex);
    setPaymentForm({ amount: "", paid_date: new Date().toISOString().split("T")[0], financial_account_id: "", notes: "" });
  };

  const handleAddPayment = async () => {
    if (!paymentExpense) return;
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) return showFlash("error", "المبلغ غير صحيح");
    if (!paymentForm.financial_account_id) return showFlash("error", "يجب اختيار الخزينة / العهدة");

    setPaymentSubmitting(true);
    try {
      const res = await fetch(`/api/sanad-zayed/expenses/${paymentExpense.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");

      showFlash("success", "تم تسجيل الدفعة وخصمها من الخزينة");
      setPaymentExpense(null);
      fetchData();
    } catch (err: any) {
      showFlash("error", err.message);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const openAllocationDialog = (ex: Expense) => {
    setAllocationExpense(ex);
    setAllocationSplits(
      (ex.allocations ?? []).length > 0
        ? (ex.allocations ?? []).map(a => ({ stage_id: a.stage_id, percentage: String(a.percentage) }))
        : [{ stage_id: "", percentage: "100" }]
    );
  };

  const addAllocationRow = () => setAllocationSplits(s => [...s, { stage_id: "", percentage: "" }]);
  const removeAllocationRow = (i: number) => setAllocationSplits(s => s.filter((_, idx) => idx !== i));
  const updateAllocationRow = (i: number, patch: Partial<{ stage_id: string; percentage: string }>) =>
    setAllocationSplits(s => s.map((row, idx) => idx === i ? { ...row, ...patch } : row));

  const allocationTotal = allocationSplits.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0);

  const handleSaveAllocation = async () => {
    if (!allocationExpense) return;
    if (allocationSplits.some(s => !s.stage_id)) return showFlash("error", "اختر مرحلة لكل بند توزيع");
    if (allocationSplits.length > 0 && Math.abs(allocationTotal - 100) > 0.01) return showFlash("error", `مجموع النسب يجب أن يكون 100% (الحالي ${allocationTotal}%)`);

    setAllocationSubmitting(true);
    try {
      const res = await fetch(`/api/sanad-zayed/expenses/${allocationExpense.id}/allocations`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allocations: allocationSplits.map(s => ({ stage_id: s.stage_id, percentage: Number(s.percentage) })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");

      showFlash("success", allocationSplits.length === 0 ? "تم إلغاء توزيع المرحلة" : "تم تحديث توزيع المرحلة");
      setAllocationExpense(null);
      fetchData();
    } catch (err: any) {
      showFlash("error", err.message);
    } finally {
      setAllocationSubmitting(false);
    }
  };

  const handleCancelAllocation = () => setAllocationSplits([]);

  const openRecoveryDialog = (ex: Expense) => {
    setRecoveryExpense(ex);
    setRecoveryInvestorId(ex.recoverable_investor_id ?? "");
  };

  const handleSaveRecovery = async () => {
    if (!recoveryExpense) return;

    setRecoverySubmitting(true);
    try {
      const res = await fetch(`/api/sanad-zayed/expenses/${recoveryExpense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recoverable_investor_id: recoveryInvestorId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");

      showFlash("success", recoveryInvestorId ? "تم ربط المصروف بالمستثمر — سيُخصم من رصيده" : "تم إلغاء ربط المصروف بالمستثمر");
      setRecoveryExpense(null);
      fetchData();
    } catch (err: any) {
      showFlash("error", err.message);
    } finally {
      setRecoverySubmitting(false);
    }
  };

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "10px", backgroundColor: "#f9f9f7", fontFamily: "var(--font-cairo)",
      "& fieldset": { borderColor: "#e5e3dc" },
      "&.Mui-focused fieldset": { borderColor: "#154278", borderWidth: 2 },
    },
    "& .MuiInputLabel-root": { fontFamily: "var(--font-cairo)", fontSize: 14 },
    "& .MuiInputBase-input": { textAlign: "right" }
  };

  return (
    <div dir="rtl" style={{ fontFamily: "var(--font-cairo), Cairo, sans-serif" }}>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 900, color: "#111827", margin: 0 }}>المصروفات</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "5px 0 0" }}>إضافة المصروفات وتوزيعها على المراحل ودفعها على دفعات</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => { setAddOpen(true); setSplits([]); }}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "linear-gradient(135deg, #154278 0%, #1e6abf 100%)",
            color: "#fff", border: "none", borderRadius: 12,
            padding: "11px 22px", cursor: "pointer", fontSize: 14, fontWeight: 700,
            fontFamily: "var(--font-cairo)", boxShadow: "0 4px 14px rgba(21,66,120,0.3)",
          }}
        >
          <AddOutlined sx={{ fontSize: 20 }} />
          إضافة مصروف جديد
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {flash && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ marginBottom: 16 }}>
            <Alert severity={flash.type} onClose={() => setFlash(null)} sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)" }}>
              {flash.text}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stats ── */}
      {!loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "20px", border: "1px solid rgba(0,0,0,0.05)", flex: 1, minWidth: 200, boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>إجمالي المدفوع فعلياً</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#ef4444" }}>EGP {totalPaid.toLocaleString()}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 16, padding: "20px", border: "1px solid rgba(0,0,0,0.05)", flex: 1, minWidth: 200, boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>إجمالي الالتزام (شامل غير المدفوع)</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#d97706" }}>EGP {totalAllocated.toLocaleString()}</div>
          </div>
        </motion.div>
      )}

      {/* ── Search ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: 16 }}>
        <div style={{ position: "relative", maxWidth: 400 }}>
          <SearchOutlined sx={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 19 }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث في المصروفات..."
            style={{
              width: "100%", padding: "11px 46px 11px 14px", borderRadius: 12, border: "1.5px solid #e5e3dc",
              background: "#fff", fontSize: 14, fontFamily: "var(--font-cairo)", outline: "none", direction: "rtl",
            }}
            onFocus={e => e.target.style.borderColor = "#154278"}
            onBlur={e => e.target.style.borderColor = "#e5e3dc"}
          />
        </div>
      </motion.div>

      {/* ── Table ── */}
      <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid #f0ede6", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center" }}><CircularProgress sx={{ color: "#154278" }} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "#9ca3af" }}>
            <ReceiptLongOutlined sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
            <div style={{ fontSize: 15, fontWeight: 700 }}>لا توجد مصروفات مسجلة</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 950 }}>
              <thead>
                <tr style={{ background: "#f8f7f3", borderBottom: "2px solid #f0ede6" }}>
                  {["التاريخ", "المدفوع / الالتزام", "البيان", "التصنيف", "المراحل", "مرفقات", ""].map(h => (
                    <th key={h} style={{ padding: "14px 18px", textAlign: "right", fontSize: 12, color: "#6b7280", fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(ex => {
                  const paid = Number(ex.actual_paid_amount);
                  const allocated = Number(ex.allocated_cost);
                  const fullyPaid = allocated > 0 && paid >= allocated - 0.01;
                  return (
                    <tr key={ex.id} style={{ borderBottom: "1px solid #f5f4f0" }}>
                      <td style={{ padding: "14px 18px", fontSize: 13, color: "#6b7280" }}>{new Date(ex.expense_date).toLocaleDateString("ar-EG-u-nu-latn")}</td>

                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: fullyPaid ? "#16a34a" : "#ef4444", direction: "ltr", textAlign: "right", whiteSpace: "nowrap" }}>
                          EGP {paid.toLocaleString()} <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>/ {allocated.toLocaleString()}</span>
                        </div>
                      </td>

                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {ex.description}
                          </div>
                          {ex.hide_from_investor && <VisibilityOffOutlined titleAccess="مخفي عن المستثمرين" sx={{ fontSize: 14, color: "#9ca3af" }} />}
                        </div>
                        {ex.notes && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2, maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ex.notes}</div>}
                        {ex.recoverable_investor && (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, background: "rgba(217,119,6,0.1)", color: "#d97706", borderRadius: 6, padding: "2px 8px", fontWeight: 700, marginTop: 4 }}>
                            <PersonOutline sx={{ fontSize: 13 }} />
                            مسترد من: {ex.recoverable_investor.name}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "14px 18px" }}>
                        <span style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: 6, fontSize: 12, color: "#475569", fontWeight: 600 }}>{ex.category || "—"}</span>
                      </td>

                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 200 }}>
                          {(ex.allocations ?? []).length === 0 ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, background: "rgba(239,68,68,0.1)", color: "#ef4444", borderRadius: 6, padding: "2px 8px", fontWeight: 700 }}>
                              <WarningAmberOutlined sx={{ fontSize: 13 }} />
                              غير مخصص لمرحلة
                            </span>
                          ) : ex.allocations!.map((a, i) => (
                            <span key={i} style={{ fontSize: 11, background: "rgba(21,66,120,0.08)", color: "#154278", borderRadius: 6, padding: "2px 6px", fontWeight: 700 }}>
                              {a.stage?.name ?? "—"} {a.percentage}%
                            </span>
                          ))}
                        </div>
                      </td>

                      <td style={{ padding: "14px 18px" }}>
                        {ex.attachment_url ? (
                          <a href={ex.attachment_url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#154278", textDecoration: "none", fontWeight: 700, background: "rgba(21,66,120,0.08)", padding: "4px 8px", borderRadius: 6 }}>
                            <AttachFileOutlined sx={{ fontSize: 14 }} />
                            عرض
                          </a>
                        ) : <span style={{ fontSize: 12, color: "#d1d5db" }}>—</span>}
                      </td>

                      <td style={{ padding: "14px 12px" }}>
                        <div style={{ display: "flex", gap: 2 }}>
                          <Tooltip title={ex.recoverable_investor ? "معطّل — مرتبط باسترداد من مستثمر" : "توزيع المرحلة"}>
                            <span>
                              <IconButton size="small" disabled={!!ex.recoverable_investor} onClick={() => openAllocationDialog(ex)} sx={{ color: (ex.allocations ?? []).length === 0 ? "#ef4444" : "#9ca3af", "&:hover": { color: "#154278", background: "rgba(21,66,120,0.08)" } }}>
                                <AccountTreeOutlined sx={{ fontSize: 17 }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={(ex.allocations ?? []).length > 0 ? "معطّل — موزّع على مرحلة بالفعل" : "استرداد من مستثمر"}>
                            <span>
                              <IconButton size="small" disabled={(ex.allocations ?? []).length > 0} onClick={() => openRecoveryDialog(ex)} sx={{ color: ex.recoverable_investor ? "#d97706" : "#9ca3af", "&:hover": { color: "#154278", background: "rgba(21,66,120,0.08)" } }}>
                                <PersonOutline sx={{ fontSize: 17 }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                          {!fullyPaid && (
                            <IconButton size="small" title="إضافة دفعة" onClick={() => openPaymentDialog(ex)} sx={{ color: "#9ca3af", "&:hover": { color: "#154278", background: "rgba(21,66,120,0.08)" } }}>
                              <PaymentsOutlined sx={{ fontSize: 17 }} />
                            </IconButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Expense Dialog ── */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} PaperProps={{ sx: { borderRadius: "20px", direction: "rtl", maxWidth: 540, width: "100%" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 800 }}>
          تسجيل مصروف جديد
          <IconButton onClick={() => setAddOpen(false)} sx={{ position: "absolute", left: 12, top: 12 }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "10px !important", display: "flex", flexDirection: "column", gap: 2.5 }}>

          <TextField label="إجمالي الالتزام (تكلفة المصروف بالكامل) *" type="text" inputMode="decimal" value={form.allocated_cost} onChange={e => setForm({ ...form, allocated_cost: sanitizeDecimalInput(e.target.value) })} fullWidth sx={{ ...inputSx, "& .MuiInputBase-input": { direction: "ltr", textAlign: "right", fontSize: 18, fontWeight: 700, color: "#d97706" } }}
            helperText="القيمة الكاملة المستحقة، حتى لو لم تُدفع بالكامل الآن" />

          <TextField label="المبلغ المدفوع الآن (اختياري)" type="text" inputMode="decimal" value={form.actual_paid_amount} onChange={e => setForm({ ...form, actual_paid_amount: sanitizeDecimalInput(e.target.value) })} fullWidth sx={{ ...inputSx, "& .MuiInputBase-input": { direction: "ltr", textAlign: "right", fontSize: 16, fontWeight: 700, color: "#ef4444" } }} />

          <TextField label="التاريخ" type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} fullWidth sx={inputSx} InputLabelProps={{ shrink: true }} />

          <FormControl fullWidth sx={inputSx}>
            <InputLabel>سحب من (خزينة / عهدة) {Number(form.actual_paid_amount) > 0 && "*"}</InputLabel>
            <Select value={form.financial_account_id} label="سحب من (خزينة / عهدة)" onChange={e => setForm({ ...form, financial_account_id: e.target.value })}>
              {accounts.map(a => (
                <MenuItem key={a.id} value={a.id}>
                  {a.account_name}
                  {a.account_type === "PETTY_CASH" && a.custodian_name ? ` (${a.custodian_name})` : ""}
                  {" "}— رصيد: EGP {a.current_balance}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField label="البيان (فيما تم الصرف؟) *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} fullWidth sx={inputSx} />

          <FormControl fullWidth sx={inputSx}>
            <InputLabel>التصنيف (اختياري)</InputLabel>
            <Select value={form.category} label="التصنيف (اختياري)" onChange={e => setForm({ ...form, category: e.target.value })}>
              <MenuItem value="">— بدون تصنيف —</MenuItem>
              {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>

          {/* ── Stage split ── */}
          <div style={{ background: "#f9f9f7", borderRadius: 10, padding: 14, border: "1px solid #e5e3dc", opacity: form.recoverable_investor_id ? 0.5 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>توزيع المصروف على المراحل</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: Math.abs(splitTotal - 100) < 0.01 || splits.length === 0 ? "#16a34a" : "#ef4444" }}>
                {splits.length > 0 && `${splitTotal}%`}
              </span>
            </div>
            {!!form.recoverable_investor_id && (
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>معطّل — المصروف مرتبط باسترداد من مستثمر</div>
            )}
            {splits.map((row, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <FormControl fullWidth size="small" sx={inputSx} disabled={!!form.recoverable_investor_id}>
                  <InputLabel>المرحلة</InputLabel>
                  <Select value={row.stage_id} label="المرحلة" onChange={e => updateSplitRow(i, { stage_id: e.target.value })}>
                    {stages.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField size="small" label="%" type="text" inputMode="decimal" disabled={!!form.recoverable_investor_id} value={row.percentage} onChange={e => updateSplitRow(i, { percentage: sanitizeDecimalInput(e.target.value) })} sx={{ ...inputSx, width: 100 }} />
                <IconButton size="small" disabled={!!form.recoverable_investor_id} onClick={() => removeSplitRow(i)} sx={{ color: "#ef4444" }}><DeleteOutline fontSize="small" /></IconButton>
              </div>
            ))}
            <Button size="small" disabled={!!form.recoverable_investor_id} onClick={addSplitRow} sx={{ fontFamily: "var(--font-cairo)", color: "#154278", fontWeight: 700, textTransform: "none" }}>+ إضافة مرحلة</Button>
          </div>

          <FormControl fullWidth sx={inputSx} disabled={splits.length > 0}>
            <InputLabel>استرداد من مستثمر (اختياري)</InputLabel>
            <Select value={form.recoverable_investor_id} label="استرداد من مستثمر (اختياري)" onChange={e => setForm({ ...form, recoverable_investor_id: e.target.value })}>
              <MenuItem value="">— مصروف على المشروع (غير مسترد) —</MenuItem>
              {investors.map(i => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
            </Select>
          </FormControl>
          {splits.length > 0 && (
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: -12 }}>معطّل — المصروف موزّع على مرحلة بالفعل</div>
          )}
          {form.recoverable_investor_id && (
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: -12 }}>
              سيُخصم هذا المصروف من رصيد المستثمر بدلاً من احتسابه كتكلفة مشروع عامة
            </div>
          )}

          <TextField label="ملاحظات إضافية (اختياري)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} fullWidth multiline rows={2} sx={inputSx} />

          {/* Attachment Upload */}
          <div style={{ background: "#f9f9f7", borderRadius: 10, padding: 16, border: "1.5px dashed #e5e3dc", textAlign: "center" }}>
            <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={e => setSelectedFile(e.target.files?.[0] || null)} accept="image/*,.pdf" />

            {selectedFile ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#154278", fontSize: 13, fontWeight: 700 }}>
                  <AttachFileOutlined sx={{ fontSize: 16 }} />
                  {selectedFile.name}
                </div>
                <IconButton size="small" onClick={() => setSelectedFile(null)} sx={{ color: "#ef4444" }}><CloseOutlined fontSize="small" /></IconButton>
              </div>
            ) : (
              <Button onClick={() => fileInputRef.current?.click()} sx={{ fontFamily: "var(--font-cairo)", color: "#6b7280", fontWeight: 700 }} startIcon={<AttachFileOutlined />}>
                إرفاق فاتورة / صورة (PDF أو صورة)
              </Button>
            )}
          </div>

        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleAdd} variant="contained" disabled={submitting} sx={{ fontFamily: "var(--font-cairo)", background: "#154278", borderRadius: "10px", width: "100%", py: 1.2, fontWeight: 700 }}>
            {submitting ? "جاري الحفظ..." : "حفظ المصروف"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Payment Tranche Dialog ── */}
      <Dialog open={!!paymentExpense} onClose={() => setPaymentExpense(null)} PaperProps={{ sx: { borderRadius: "20px", direction: "rtl", maxWidth: 420, width: "100%" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 800 }}>
          إضافة دفعة
          <IconButton onClick={() => setPaymentExpense(null)} sx={{ position: "absolute", left: 12, top: 12 }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "10px !important", display: "flex", flexDirection: "column", gap: 2.5 }}>
          {paymentExpense && (
            <div style={{ background: "#f9f9f7", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#6b7280" }}>
              {paymentExpense.description}<br />
              المدفوع حتى الآن: <strong>{Number(paymentExpense.actual_paid_amount).toLocaleString()}</strong> / {Number(paymentExpense.allocated_cost).toLocaleString()} ج.م
            </div>
          )}
          <TextField label="مبلغ الدفعة *" type="text" inputMode="decimal" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: sanitizeDecimalInput(e.target.value) })} fullWidth sx={inputSx} />
          <TextField label="التاريخ" type="date" value={paymentForm.paid_date} onChange={e => setPaymentForm({ ...paymentForm, paid_date: e.target.value })} fullWidth sx={inputSx} InputLabelProps={{ shrink: true }} />
          <FormControl fullWidth sx={inputSx}>
            <InputLabel>سحب من (خزينة / عهدة) *</InputLabel>
            <Select value={paymentForm.financial_account_id} label="سحب من (خزينة / عهدة) *" onChange={e => setPaymentForm({ ...paymentForm, financial_account_id: e.target.value })}>
              {accounts.map(a => (
                <MenuItem key={a.id} value={a.id}>{a.account_name} — رصيد: EGP {a.current_balance}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="ملاحظات" value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} fullWidth sx={inputSx} />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleAddPayment} variant="contained" disabled={paymentSubmitting} sx={{ fontFamily: "var(--font-cairo)", background: "#154278", borderRadius: "10px", width: "100%", py: 1.2, fontWeight: 700 }}>
            {paymentSubmitting ? "جاري الحفظ..." : "حفظ الدفعة وخصمها"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Assign / Edit Stage Allocation Dialog ── */}
      <Dialog open={!!allocationExpense} onClose={() => setAllocationExpense(null)} PaperProps={{ sx: { borderRadius: "20px", direction: "rtl", maxWidth: 460, width: "100%" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 800 }}>
          توزيع المصروف على المراحل
          <IconButton onClick={() => setAllocationExpense(null)} sx={{ position: "absolute", left: 12, top: 12 }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "10px !important", display: "flex", flexDirection: "column", gap: 2.5 }}>
          {allocationExpense && (
            <div style={{ background: "#f9f9f7", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#6b7280" }}>
              {allocationExpense.description}
            </div>
          )}

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>المراحل والنسب</span>
              {allocationSplits.length > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: Math.abs(allocationTotal - 100) < 0.01 ? "#16a34a" : "#ef4444" }}>
                  {allocationTotal}%
                </span>
              )}
            </div>
            {allocationSplits.length === 0 ? (
              <div style={{ fontSize: 13, color: "#9ca3af", background: "#f9f9f7", borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                لا يوجد توزيع — سيُحفظ هذا المصروف كغير مخصص لمرحلة
              </div>
            ) : allocationSplits.map((row, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <FormControl fullWidth size="small" sx={inputSx}>
                  <InputLabel>المرحلة</InputLabel>
                  <Select value={row.stage_id} label="المرحلة" onChange={e => updateAllocationRow(i, { stage_id: e.target.value })}>
                    {stages.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField size="small" label="%" type="text" inputMode="decimal" value={row.percentage} onChange={e => updateAllocationRow(i, { percentage: sanitizeDecimalInput(e.target.value) })} sx={{ ...inputSx, width: 100 }} />
                <IconButton size="small" onClick={() => removeAllocationRow(i)} sx={{ color: "#ef4444" }}><DeleteOutline fontSize="small" /></IconButton>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Button size="small" onClick={addAllocationRow} sx={{ fontFamily: "var(--font-cairo)", color: "#154278", fontWeight: 700, textTransform: "none" }}>+ إضافة مرحلة</Button>
              {allocationSplits.length > 0 && (
                <Button size="small" onClick={handleCancelAllocation} sx={{ fontFamily: "var(--font-cairo)", color: "#ef4444", fontWeight: 700, textTransform: "none" }}>إلغاء التوزيع بالكامل</Button>
              )}
            </div>
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleSaveAllocation} variant="contained" disabled={allocationSubmitting} sx={{ fontFamily: "var(--font-cairo)", background: allocationSplits.length === 0 ? "#ef4444" : "#154278", borderRadius: "10px", width: "100%", py: 1.2, fontWeight: 700 }}>
            {allocationSubmitting ? "جاري الحفظ..." : allocationSplits.length === 0 ? "تأكيد إلغاء التوزيع" : "حفظ التوزيع"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Investor Recovery Link Dialog ── */}
      <Dialog open={!!recoveryExpense} onClose={() => setRecoveryExpense(null)} PaperProps={{ sx: { borderRadius: "20px", direction: "rtl", maxWidth: 420, width: "100%" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 800 }}>
          استرداد المصروف من مستثمر
          <IconButton onClick={() => setRecoveryExpense(null)} sx={{ position: "absolute", left: 12, top: 12 }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "10px !important", display: "flex", flexDirection: "column", gap: 2.5 }}>
          {recoveryExpense && (
            <div style={{ background: "#f9f9f7", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#6b7280" }}>
              {recoveryExpense.description} — {Number(recoveryExpense.allocated_cost).toLocaleString("ar-EG-u-nu-latn")} ج.م
            </div>
          )}
          <FormControl fullWidth sx={inputSx}>
            <InputLabel>المستثمر</InputLabel>
            <Select value={recoveryInvestorId} label="المستثمر" onChange={e => setRecoveryInvestorId(e.target.value)}>
              <MenuItem value="">— مصروف على المشروع (غير مسترد) —</MenuItem>
              {investors.map(i => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
            </Select>
          </FormControl>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            عند الربط بمستثمر، أي دفعة تُسجَّل على هذا المصروف تُخصم مباشرة من رصيد ذلك المستثمر بدلاً من احتسابها كتكلفة مشروع عامة.
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleSaveRecovery} variant="contained" disabled={recoverySubmitting} sx={{ fontFamily: "var(--font-cairo)", background: "#154278", borderRadius: "10px", width: "100%", py: 1.2, fontWeight: 700 }}>
            {recoverySubmitting ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
