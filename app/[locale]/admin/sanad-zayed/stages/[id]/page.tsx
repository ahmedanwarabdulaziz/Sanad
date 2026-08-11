"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Alert, IconButton,
  MenuItem, Select, FormControl, InputLabel
} from "@mui/material";
import {
  AddOutlined, CloseOutlined, ArrowForwardOutlined, ChecklistOutlined, SyncAltOutlined,
  DeleteOutline, PaymentsOutlined
} from "@mui/icons-material";
import { sanitizeDecimalInput } from "@/lib/sanad-zayed/decimalInput";

interface BudgetItem {
  id: string;
  description: string;
  category: string;
  amount: number;
  status: "PENDING" | "CONVERTED";
  linked_expense?: { id: string; description: string; actual_paid_amount: number } | null;
  notes: string;
}

interface Account { id: string; account_name: string; current_balance: number; }
interface Stage { id: string; name: string; }

export default function StageBudgetItemsPage() {
  const params = useParams();
  const router = useRouter();
  const stageId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<Stage | null>(null);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [flash, setFlash] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ description: "", category: "", amount: "", notes: "" });

  const [convertItem, setConvertItem] = useState<BudgetItem | null>(null);
  const [convertForm, setConvertForm] = useState({ actual_amount: "", financial_account_id: "", paid_date: new Date().toISOString().split("T")[0] });
  const [convertSubmitting, setConvertSubmitting] = useState(false);

  const [templateRows, setTemplateRows] = useState<{ label: string; percentage: string; offset_days: string }[]>([]);
  const [templateSaving, setTemplateSaving] = useState(false);

  const showFlash = (type: "success" | "error", text: string) => {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 5000);
  };

  const fetchAll = useCallback(async () => {
    try {
      const [stagesRes, itemsRes, accRes, templateRes] = await Promise.all([
        fetch("/api/sanad-zayed/stages"),
        fetch(`/api/sanad-zayed/stage-budget-items?stage_id=${stageId}`),
        fetch("/api/sanad-zayed/treasury"),
        fetch(`/api/sanad-zayed/stages/${stageId}/installment-template`),
      ]);
      const stagesData = await stagesRes.json();
      const itemsData = await itemsRes.json();
      const accData = await accRes.json();
      const templateData = await templateRes.json();

      const found = (stagesData.stages ?? []).find((s: Stage) => s.id === stageId);
      setStage(found ?? null);
      setItems(itemsData.budget_items ?? []);
      setAccounts(accData.accounts ?? []);
      setTemplateRows(
        (templateData.template ?? []).map((t: any) => ({ label: t.label, percentage: String(t.percentage), offset_days: String(t.offset_days) }))
      );
    } catch (err: any) {
      showFlash("error", "فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [stageId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAdd = async () => {
    if (!form.description.trim()) return showFlash("error", "وصف البند مطلوب");
    if (!form.amount || Number(form.amount) <= 0) return showFlash("error", "المبلغ المتوقع غير صحيح");

    setSubmitting(true);
    try {
      const res = await fetch("/api/sanad-zayed/stage-budget-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage_id: stageId, ...form, amount: Number(form.amount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");

      setAddOpen(false);
      setForm({ description: "", category: "", amount: "", notes: "" });
      showFlash("success", "تم إضافة البند المتوقع");
      fetchAll();
    } catch (err: any) {
      showFlash("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openConvert = (item: BudgetItem) => {
    setConvertItem(item);
    setConvertForm({ actual_amount: String(item.amount), financial_account_id: "", paid_date: new Date().toISOString().split("T")[0] });
  };

  const handleConvert = async () => {
    if (!convertItem) return;
    if (!convertForm.actual_amount || Number(convertForm.actual_amount) <= 0) return showFlash("error", "المبلغ الفعلي غير صحيح");
    if (!convertForm.financial_account_id) return showFlash("error", "يجب اختيار الخزينة/الحساب");

    setConvertSubmitting(true);
    try {
      const res = await fetch(`/api/sanad-zayed/stage-budget-items/${convertItem.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(convertForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");

      showFlash("success", "تم تحويل البند إلى مصروف فعلي");
      setConvertItem(null);
      fetchAll();
    } catch (err: any) {
      showFlash("error", err.message);
    } finally {
      setConvertSubmitting(false);
    }
  };

  const addTemplateRow = () => setTemplateRows(r => [...r, { label: `دفعة ${r.length + 1}`, percentage: "", offset_days: "0" }]);
  const removeTemplateRow = (i: number) => setTemplateRows(r => r.filter((_, idx) => idx !== i));
  const updateTemplateRow = (i: number, patch: Partial<{ label: string; percentage: string; offset_days: string }>) =>
    setTemplateRows(r => r.map((row, idx) => idx === i ? { ...row, ...patch } : row));

  const templateTotal = templateRows.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0);

  const handleSaveTemplate = async () => {
    if (templateRows.length > 0 && Math.abs(templateTotal - 100) > 0.01) {
      return showFlash("error", `مجموع نسب الدفعات يجب أن يكون 100% (الحالي ${templateTotal}%)`);
    }
    setTemplateSaving(true);
    try {
      const res = await fetch(`/api/sanad-zayed/stages/${stageId}/installment-template`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: templateRows.map(r => ({ label: r.label, percentage: Number(r.percentage), offset_days: Number(r.offset_days) || 0 })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");
      showFlash("success", "تم حفظ جدول الدفعات الافتراضي");
    } catch (err: any) {
      showFlash("error", err.message);
    } finally {
      setTemplateSaving(false);
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

  if (loading) return <div style={{ padding: 60, textAlign: "center" }}><CircularProgress sx={{ color: "#154278" }} /></div>;

  const pendingTotal = items.filter(i => i.status === "PENDING").reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div dir="rtl" style={{ fontFamily: "var(--font-cairo), Cairo, sans-serif" }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IconButton onClick={() => router.push("/admin/sanad-zayed/stages")} sx={{ color: "#6b7280" }}>
            <ArrowForwardOutlined sx={{ transform: "scaleX(-1)" }} />
          </IconButton>
          <div>
            <h1 style={{ fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 900, color: "#111827", margin: 0 }}>المصاريف المتوقعة — {stage?.name ?? ""}</h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>بنود تقديرية تُحسب ضمن تكلفة المرحلة قبل صرفها فعلياً</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => setAddOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "linear-gradient(135deg, #154278 0%, #1e6abf 100%)",
            color: "#fff", border: "none", borderRadius: 12,
            padding: "11px 22px", cursor: "pointer", fontSize: 14, fontWeight: 700,
            fontFamily: "var(--font-cairo)", boxShadow: "0 4px 14px rgba(21,66,120,0.3)",
          }}
        >
          <AddOutlined sx={{ fontSize: 20 }} />
          بند متوقع جديد
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

      <div style={{ background: "#fff", borderRadius: 16, padding: "20px", border: "1px solid rgba(0,0,0,0.05)", marginBottom: 24, maxWidth: 280 }}>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>إجمالي البنود المتوقعة (غير محولة)</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: "#d97706" }}>EGP {pendingTotal.toLocaleString()}</div>
      </div>

      {items.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, padding: 50, textAlign: "center", color: "#9ca3af" }}>
          <ChecklistOutlined sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
          <div style={{ fontSize: 14, fontWeight: 700 }}>لا توجد بنود متوقعة بعد</div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid #f0ede6" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ background: "#f8f7f3", borderBottom: "2px solid #f0ede6" }}>
                  {["البيان", "التصنيف", "المبلغ المتوقع", "الحالة", ""].map(h => (
                    <th key={h} style={{ padding: "14px 18px", textAlign: "right", fontSize: 12, color: "#6b7280", fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f5f4f0" }}>
                    <td style={{ padding: "14px 18px", fontSize: 14, fontWeight: 700, color: "#111827" }}>{item.description}</td>
                    <td style={{ padding: "14px 18px" }}>
                      <span style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: 6, fontSize: 12, color: "#475569", fontWeight: 600 }}>{item.category || "—"}</span>
                    </td>
                    <td style={{ padding: "14px 18px", fontSize: 14, fontWeight: 800, color: "#d97706", direction: "ltr", textAlign: "right" }}>
                      {Number(item.amount).toLocaleString("ar-EG-u-nu-latn")}
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      {item.status === "CONVERTED" ? (
                        <span style={{ background: "rgba(5,150,105,0.12)", color: "#059669", fontSize: 12, fontWeight: 700, borderRadius: 8, padding: "4px 10px" }}>
                          محوّل ({Number(item.linked_expense?.actual_paid_amount ?? 0).toLocaleString()} ج.م مدفوع)
                        </span>
                      ) : (
                        <span style={{ background: "rgba(217,119,6,0.12)", color: "#d97706", fontSize: 12, fontWeight: 700, borderRadius: 8, padding: "4px 10px" }}>
                          متوقع
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px 12px" }}>
                      {item.status === "PENDING" && (
                        <IconButton size="small" title="تحويل إلى مصروف فعلي" onClick={() => openConvert(item)} sx={{ color: "#9ca3af", "&:hover": { color: "#154278", background: "rgba(21,66,120,0.08)" } }}>
                          <SyncAltOutlined sx={{ fontSize: 17 }} />
                        </IconButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Default Installment Template ── */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid rgba(0,0,0,0.05)", marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PaymentsOutlined sx={{ fontSize: 18, color: "#154278" }} />
            <span style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>جدول الدفعات الافتراضي للمرحلة</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: templateRows.length === 0 || Math.abs(templateTotal - 100) < 0.01 ? "#16a34a" : "#ef4444" }}>
            {templateRows.length > 0 && `${templateTotal}%`}
          </span>
        </div>
        <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 14px" }}>يُستخدم تلقائياً عند إنشاء عقد جديد في هذه المرحلة، ويمكن تخصيصه لكل عقد على حدة</p>

        {templateRows.map((row, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <TextField size="small" label="الوصف" value={row.label} onChange={e => updateTemplateRow(i, { label: e.target.value })} sx={{ ...inputSx, flex: 2 }} />
            <TextField size="small" label="النسبة %" type="text" inputMode="decimal" value={row.percentage} onChange={e => updateTemplateRow(i, { percentage: sanitizeDecimalInput(e.target.value) })} sx={{ ...inputSx, flex: 1 }} />
            <TextField size="small" label="بعد كم يوم من التعاقد" type="number" value={row.offset_days} onChange={e => updateTemplateRow(i, { offset_days: e.target.value })} sx={{ ...inputSx, flex: 1 }} />
            <IconButton size="small" onClick={() => removeTemplateRow(i)} sx={{ color: "#ef4444" }}><DeleteOutline fontSize="small" /></IconButton>
          </div>
        ))}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <Button size="small" onClick={addTemplateRow} sx={{ fontFamily: "var(--font-cairo)", color: "#154278", fontWeight: 700, textTransform: "none" }}>+ إضافة دفعة</Button>
          <Button size="small" variant="contained" onClick={handleSaveTemplate} disabled={templateSaving} sx={{ fontFamily: "var(--font-cairo)", background: "#154278", borderRadius: "8px", fontWeight: 700, textTransform: "none" }}>
            {templateSaving ? "جاري الحفظ..." : "حفظ الجدول"}
          </Button>
        </div>
      </div>

      {/* ── Add Budget Item Dialog ── */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} PaperProps={{ sx: { borderRadius: "20px", direction: "rtl", maxWidth: 440, width: "100%" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 800 }}>
          بند متوقع جديد
          <IconButton onClick={() => setAddOpen(false)} sx={{ position: "absolute", left: 12, top: 12 }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "10px !important", display: "flex", flexDirection: "column", gap: 2.5 }}>
          <TextField label="البيان *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} fullWidth sx={inputSx} />
          <TextField label="التصنيف" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} fullWidth sx={inputSx} />
          <TextField label="المبلغ المتوقع *" type="text" inputMode="decimal" value={form.amount} onChange={e => setForm({ ...form, amount: sanitizeDecimalInput(e.target.value) })} fullWidth sx={inputSx} />
          <TextField label="ملاحظات" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} fullWidth multiline rows={2} sx={inputSx} />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleAdd} variant="contained" disabled={submitting} sx={{ fontFamily: "var(--font-cairo)", background: "#154278", borderRadius: "10px", width: "100%", py: 1.2, fontWeight: 700 }}>
            {submitting ? "جاري الحفظ..." : "إضافة البند"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Convert Dialog ── */}
      <Dialog open={!!convertItem} onClose={() => setConvertItem(null)} PaperProps={{ sx: { borderRadius: "20px", direction: "rtl", maxWidth: 420, width: "100%" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 800 }}>
          تحويل إلى مصروف فعلي
          <IconButton onClick={() => setConvertItem(null)} sx={{ position: "absolute", left: 12, top: 12 }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "10px !important", display: "flex", flexDirection: "column", gap: 2.5 }}>
          {convertItem && (
            <div style={{ background: "#f9f9f7", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#6b7280" }}>
              {convertItem.description} — المبلغ المتوقع: {Number(convertItem.amount).toLocaleString()} ج.م
            </div>
          )}
          <TextField label="المبلغ الفعلي المدفوع *" type="text" inputMode="decimal" value={convertForm.actual_amount} onChange={e => setConvertForm({ ...convertForm, actual_amount: sanitizeDecimalInput(e.target.value) })} fullWidth sx={inputSx}
            helperText="يمكن أن يختلف عن المبلغ المتوقع ليطابق ما تم دفعه فعلياً" />
          <TextField label="التاريخ" type="date" value={convertForm.paid_date} onChange={e => setConvertForm({ ...convertForm, paid_date: e.target.value })} fullWidth sx={inputSx} InputLabelProps={{ shrink: true }} />
          <FormControl fullWidth sx={inputSx}>
            <InputLabel>سحب من (خزينة / عهدة) *</InputLabel>
            <Select value={convertForm.financial_account_id} label="سحب من (خزينة / عهدة) *" onChange={e => setConvertForm({ ...convertForm, financial_account_id: e.target.value })}>
              {accounts.map(a => (
                <MenuItem key={a.id} value={a.id}>{a.account_name} — رصيد: EGP {a.current_balance}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleConvert} variant="contained" disabled={convertSubmitting} sx={{ fontFamily: "var(--font-cairo)", background: "#154278", borderRadius: "10px", width: "100%", py: 1.2, fontWeight: 700 }}>
            {convertSubmitting ? "جاري التحويل..." : "تحويل ودفع"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
