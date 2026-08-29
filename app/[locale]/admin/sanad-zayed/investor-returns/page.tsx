"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Alert, IconButton,
  MenuItem, Select, FormControl, InputLabel
} from "@mui/material";
import {
  AddOutlined, CloseOutlined, SearchOutlined, PaymentsOutlined
} from "@mui/icons-material";
import { sanitizeDecimalInput } from "@/lib/sanad-zayed/decimalInput";

interface ReturnTransaction {
  id: string;
  amount: number;
  description: string;
  transaction_date: string;
  created_at: string;
  from_account?: { account_name: string };
  investor?: { name: string };
}

interface Account { id: string; account_name: string; custodian_name: string; account_type: string; current_balance: number; }
interface Investor { id: string; name: string; }

export default function InvestorReturnsPage() {
  const [loading, setLoading] = useState(true);
  const [returns, setReturns] = useState<ReturnTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);

  const [search, setSearch] = useState("");
  const [flash, setFlash] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal states
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    amount: "",
    investor_id: "",
    from_account_id: "",
    transaction_date: new Date().toISOString().split("T")[0],
    return_category: "",
    description: "",
  });

  const showFlash = (type: "success" | "error", text: string) => {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 4500);
  };

  const fetchData = useCallback(async () => {
    try {
      const [retRes, treasRes, invRes] = await Promise.all([
        fetch("/api/sanad-zayed/investor-returns"),
        fetch("/api/sanad-zayed/treasury"),
        fetch("/api/sanad-zayed/investors"),
      ]);
      const retData = await retRes.json();
      const treasData = await treasRes.json();
      const invData = await invRes.json();

      if (retData.returns) setReturns(retData.returns);
      if (treasData.accounts) setAccounts(treasData.accounts);
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
    if (!q) return returns;
    return returns.filter(ret =>
      ret.description.toLowerCase().includes(q) ||
      (ret.investor?.name || "").toLowerCase().includes(q)
    );
  }, [returns, search]);

  const totalReturns = returns.reduce((sum, ret) => sum + Number(ret.amount), 0);

  const handleAdd = async () => {
    if (!form.amount || Number(form.amount) <= 0) return showFlash("error", "المبلغ غير صحيح");
    if (!form.investor_id) return showFlash("error", "يجب اختيار المستثمر");
    if (!form.from_account_id) return showFlash("error", "يجب اختيار الخزينة / العهدة للسحب");
    if (!form.return_category) return showFlash("error", "يجب اختيار نوع المرتجع");
    if (!form.description.trim()) return showFlash("error", "البيان مطلوب (توضيح إضافي)");

    setSubmitting(true);
    try {
      const payload = {
        amount: Number(form.amount),
        investor_id: form.investor_id,
        from_account_id: form.from_account_id,
        transaction_date: form.transaction_date,
        return_category: form.return_category,
        description: form.description,
      };

      const res = await fetch("/api/sanad-zayed/investor-returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "حدث خطأ أثناء الحفظ");

      setAddOpen(false);
      setForm({
        amount: "", investor_id: "", from_account_id: "", return_category: "",
        transaction_date: new Date().toISOString().split("T")[0], description: ""
      });
      showFlash("success", "تم تسجيل المبلغ وخصمه من الخزينة بنجاح");
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
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 900, color: "#111827", margin: 0 }}>المبالغ المرتجعة للمستثمرين</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "5px 0 0" }}>تسجيل أرباح أو استرداد رأس مال للمستثمرين منفصلة عن مصروفات المشروع</p>
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
          تسجيل مبلغ جديد
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
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>إجمالي المبالغ المنصرفة للمستثمرين</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#16a34a" }}>{totalReturns.toLocaleString("ar-EG-u-nu-latn")}</div>
          </div>
        </motion.div>
      )}

      {/* ── Search ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: 16 }}>
        <div style={{ position: "relative", maxWidth: 400 }}>
          <SearchOutlined sx={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 19 }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث (اسم المستثمر أو البيان)..."
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
            <PaymentsOutlined sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
            <div style={{ fontSize: 15, fontWeight: 700 }}>لا توجد مبالغ مسجلة للمستثمرين</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
              <thead>
                <tr style={{ background: "#f8f7f3", borderBottom: "2px solid #f0ede6" }}>
                  {["التاريخ", "المستثمر", "المبلغ المنصرف", "مسحوب من الخزينة", "البيان / الوصف"].map(h => (
                    <th key={h} style={{ padding: "14px 18px", textAlign: "right", fontSize: 12, color: "#6b7280", fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(ret => (
                  <tr key={ret.id} style={{ borderBottom: "1px solid #f5f4f0" }}>
                    <td style={{ padding: "14px 18px", fontSize: 13, color: "#6b7280" }}>{new Date(ret.transaction_date).toLocaleDateString("ar-EG-u-nu-latn")}</td>
                    <td style={{ padding: "14px 18px", fontSize: 14, fontWeight: 700, color: "#111827" }}>{ret.investor?.name || "—"}</td>
                    <td style={{ padding: "14px 18px" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#ef4444", direction: "ltr", textAlign: "right" }}>
                        {Number(ret.amount).toLocaleString("ar-EG-u-nu-latn")}
                      </div>
                    </td>
                    <td style={{ padding: "14px 18px", fontSize: 13, color: "#475569", fontWeight: 600 }}>{ret.from_account?.account_name || "—"}</td>
                    <td style={{ padding: "14px 18px", fontSize: 13, color: "#475569" }}>{ret.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Return Dialog ── */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} PaperProps={{ sx: { borderRadius: "20px", direction: "rtl", maxWidth: 500, width: "100%" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 800 }}>
          تسجيل مبلغ منصرف لمستثمر
          <IconButton onClick={() => setAddOpen(false)} sx={{ position: "absolute", left: 12, top: 12 }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "10px !important", display: "flex", flexDirection: "column", gap: 2.5 }}>
          
          <FormControl fullWidth sx={inputSx}>
            <InputLabel>المستثمر *</InputLabel>
            <Select value={form.investor_id} label="المستثمر *" onChange={e => setForm({ ...form, investor_id: e.target.value })}>
              {investors.map(i => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
            </Select>
          </FormControl>

          <TextField label="المبلغ المراد صرفه *" type="text" inputMode="decimal" value={form.amount} onChange={e => setForm({ ...form, amount: sanitizeDecimalInput(e.target.value) })} fullWidth sx={{ ...inputSx, "& .MuiInputBase-input": { direction: "ltr", textAlign: "right", fontSize: 18, fontWeight: 700, color: "#ef4444" } }} />

          <TextField label="تاريخ الصرف" type="date" value={form.transaction_date} onChange={e => setForm({ ...form, transaction_date: e.target.value })} fullWidth sx={inputSx} InputLabelProps={{ shrink: true }} />

          <FormControl fullWidth sx={inputSx}>
            <InputLabel>سحب من (خزينة / بنك) *</InputLabel>
            <Select value={form.from_account_id} label="سحب من (خزينة / بنك) *" onChange={e => setForm({ ...form, from_account_id: e.target.value })}>
              {accounts.map(a => (
                <MenuItem key={a.id} value={a.id}>
                  {a.account_name} — الرصيد المتاح: {Number(a.current_balance).toLocaleString()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={inputSx}>
            <InputLabel>نوع المرتجع *</InputLabel>
            <Select value={form.return_category} label="نوع المرتجع *" onChange={e => setForm({ ...form, return_category: e.target.value })}>
              <MenuItem value="أرباح">أرباح (Profits)</MenuItem>
              <MenuItem value="استرداد رأس مال">استرداد رأس مال (Capital Refund)</MenuItem>
            </Select>
          </FormControl>

          <TextField label="توضيح إضافي للبيان *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} fullWidth sx={inputSx} />

        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleAdd} variant="contained" disabled={submitting} sx={{ fontFamily: "var(--font-cairo)", background: "#154278", borderRadius: "10px", width: "100%", py: 1.2, fontWeight: 700 }}>
            {submitting ? "جاري الحفظ..." : "حفظ وصرف المبلغ"}
          </Button>
        </DialogActions>
      </Dialog>

    </div>
  );
}
