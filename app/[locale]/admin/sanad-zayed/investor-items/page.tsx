"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Alert, IconButton, Checkbox, FormControlLabel
} from "@mui/material";
import {
  CloseOutlined, SearchOutlined, VisibilityOutlined, VisibilityOffOutlined, EditOutlined
} from "@mui/icons-material";
import { sanitizeDecimalInput } from "@/lib/sanad-zayed/decimalInput";

interface Expense {
  id: string;
  description: string;
  category: string;
  allocated_cost: number;
  investor_override_description?: string | null;
  investor_override_amount?: number | null;
  hide_from_investor?: boolean;
}

export default function InvestorItemsPage() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState("");
  const [flash, setFlash] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState({ investor_override_description: "", investor_override_amount: "", hide_from_investor: false });
  const [submitting, setSubmitting] = useState(false);

  const showFlash = (type: "success" | "error", text: string) => {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 4500);
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/sanad-zayed/expenses");
      const data = await res.json();
      if (data.expenses) setExpenses(data.expenses);
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
    return expenses.filter(ex => ex.description.toLowerCase().includes(q));
  }, [expenses, search]);

  const openEdit = (ex: Expense) => {
    setEditExpense(ex);
    setEditForm({
      investor_override_description: ex.investor_override_description ?? "",
      investor_override_amount: ex.investor_override_amount != null ? String(ex.investor_override_amount) : "",
      hide_from_investor: !!ex.hide_from_investor,
    });
  };

  const handleSave = async () => {
    if (!editExpense) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sanad-zayed/expenses/${editExpense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");

      showFlash("success", "تم تحديث عرض البند للمستثمر");
      setEditExpense(null);
      fetchData();
    } catch (err: any) {
      showFlash("error", err.message);
    } finally {
      setSubmitting(false);
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
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 900, color: "#111827", margin: 0 }}>البنود الظاهرة للمستثمر</h1>
        <p style={{ fontSize: 14, color: "#6b7280", margin: "5px 0 0" }}>تحكم في الوصف والمبلغ اللذين يراهما المستثمر لكل بند مصروف، أو إخفاؤه بالكامل — دون التأثير على السجل الداخلي الحقيقي</p>
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

      {/* ── Search ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: 16 }}>
        <div style={{ position: "relative", maxWidth: 400 }}>
          <SearchOutlined sx={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 19 }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث في البنود..."
            style={{
              width: "100%", padding: "11px 46px 11px 14px", borderRadius: 12, border: "1.5px solid #e5e3dc",
              background: "#fff", fontSize: 14, fontFamily: "var(--font-cairo)", outline: "none", direction: "rtl",
            }}
          />
        </div>
      </motion.div>

      {/* ── Table ── */}
      <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid #f0ede6", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center" }}><CircularProgress sx={{ color: "#154278" }} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "#9ca3af" }}>
            <VisibilityOutlined sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
            <div style={{ fontSize: 15, fontWeight: 700 }}>لا توجد بنود مصروفات بعد</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ background: "#f8f7f3", borderBottom: "2px solid #f0ede6" }}>
                  {["البيان الحقيقي (داخلي)", "المبلغ الحقيقي", "ما يراه المستثمر (وصف)", "ما يراه المستثمر (مبلغ)", "الحالة", ""].map(h => (
                    <th key={h} style={{ padding: "14px 18px", textAlign: "right", fontSize: 12, color: "#6b7280", fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(ex => {
                  const hasOverride = !!ex.investor_override_description || ex.investor_override_amount != null;
                  return (
                    <tr key={ex.id} style={{ borderBottom: "1px solid #f5f4f0" }}>
                      <td style={{ padding: "14px 18px", fontSize: 14, fontWeight: 700, color: "#111827", maxWidth: 200 }}>{ex.description}</td>
                      <td style={{ padding: "14px 18px", fontSize: 13, color: "#6b7280", direction: "ltr", textAlign: "right" }}>{Number(ex.allocated_cost).toLocaleString("ar-EG-u-nu-latn")} ج.م</td>
                      <td style={{ padding: "14px 18px", fontSize: 13, color: hasOverride ? "#154278" : "#9ca3af", fontWeight: hasOverride ? 700 : 400 }}>
                        {ex.hide_from_investor ? "—" : (ex.investor_override_description || ex.description)}
                      </td>
                      <td style={{ padding: "14px 18px", fontSize: 13, color: hasOverride ? "#154278" : "#9ca3af", fontWeight: hasOverride ? 700 : 400, direction: "ltr", textAlign: "right" }}>
                        {ex.hide_from_investor ? "—" : `${Number(ex.investor_override_amount ?? ex.allocated_cost).toLocaleString("ar-EG-u-nu-latn")} ج.م`}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        {ex.hide_from_investor ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, background: "rgba(239,68,68,0.1)", color: "#ef4444", borderRadius: 8, padding: "4px 10px", fontWeight: 700 }}>
                            <VisibilityOffOutlined sx={{ fontSize: 14 }} />
                            مخفي عن المستثمر
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, background: "rgba(5,150,105,0.1)", color: "#059669", borderRadius: 8, padding: "4px 10px", fontWeight: 700 }}>
                            <VisibilityOutlined sx={{ fontSize: 14 }} />
                            ظاهر
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px 12px" }}>
                        <IconButton size="small" title="تعديل ما يظهر للمستثمر" onClick={() => openEdit(ex)} sx={{ color: "#9ca3af", "&:hover": { color: "#154278", background: "rgba(21,66,120,0.08)" } }}>
                          <EditOutlined sx={{ fontSize: 17 }} />
                        </IconButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editExpense} onClose={() => setEditExpense(null)} PaperProps={{ sx: { borderRadius: "20px", direction: "rtl", maxWidth: 460, width: "100%" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 800 }}>
          كيف يظهر هذا البند للمستثمر
          <IconButton onClick={() => setEditExpense(null)} sx={{ position: "absolute", left: 12, top: 12 }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "10px !important", display: "flex", flexDirection: "column", gap: 2.5 }}>
          {editExpense && (
            <div style={{ background: "#f9f9f7", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#6b7280" }}>
              البيان الحقيقي: <strong>{editExpense.description}</strong> — {Number(editExpense.allocated_cost).toLocaleString("ar-EG-u-nu-latn")} ج.م
            </div>
          )}
          <TextField label="وصف بديل للمستثمر" value={editForm.investor_override_description} onChange={e => setEditForm({ ...editForm, investor_override_description: e.target.value })} fullWidth sx={inputSx}
            helperText="اتركه فارغاً لعرض البيان الحقيقي كما هو" />
          <TextField label="مبلغ بديل للمستثمر" type="text" inputMode="decimal" value={editForm.investor_override_amount} onChange={e => setEditForm({ ...editForm, investor_override_amount: sanitizeDecimalInput(e.target.value) })} fullWidth sx={inputSx}
            helperText="اتركه فارغاً لعرض المبلغ الحقيقي كما هو" />
          <FormControlLabel
            control={<Checkbox checked={editForm.hide_from_investor} onChange={e => setEditForm({ ...editForm, hide_from_investor: e.target.checked })} sx={{ color: "#9ca3af", "&.Mui-checked": { color: "#ef4444" } }} />}
            label={<span style={{ fontFamily: "var(--font-cairo)", fontSize: 13 }}>إخفاء هذا البند بالكامل من كشف حساب المستثمر</span>}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleSave} variant="contained" disabled={submitting} sx={{ fontFamily: "var(--font-cairo)", background: "#154278", borderRadius: "10px", width: "100%", py: 1.2, fontWeight: 700 }}>
            {submitting ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
