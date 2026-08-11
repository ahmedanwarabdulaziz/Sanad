"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Alert, IconButton, Tooltip,
} from "@mui/material";
import {
  AddOutlined, EditOutlined, DeleteOutline, SearchOutlined,
  PersonOutline, CloseOutlined, PeopleOutlined, AccountBalanceWalletOutlined,
  ReceiptLongOutlined,
} from "@mui/icons-material";

// ── Types ─────────────────────────────────────────────────────────────
interface Investor {
  id: string;
  name: string;
  email: string;
  phone: string;
  phone_2: string;
  national_id: string;
  job_in_national_id: string;
  address_in_national_id: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  total_paid?: number;
  total_returned?: number;
  net_paid?: number;
  contract_value?: number;
  remaining_balance?: number;
  has_transactions?: boolean;
  has_contracts?: boolean;
}

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  phone_2: "",
  national_id: "",
  job_in_national_id: "",
  address_in_national_id: "",
  notes: "",
};
type FormData = typeof EMPTY_FORM;
type FormErrors = Partial<Record<keyof FormData, string>>;

// ── Client-side validation ────────────────────────────────────────────
function validate(form: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) {
    errors.name = "الاسم مطلوب";
  } else if (form.name.trim().length < 2) {
    errors.name = "الاسم يجب أن يكون حرفين على الأقل";
  }

  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "البريد الإلكتروني غير صالح";
  }

  if (!form.phone.trim()) {
    errors.phone = "رقم الهاتف الأول مطلوب";
  } else if (!/^01[0-9]{9}$/.test(form.phone.replace(/[\s\-]/g, ""))) {
    errors.phone = "يجب أن يكون 11 رقماً ويبدأ بـ 01";
  }

  if (form.phone_2.trim() && !/^01[0-9]{9}$/.test(form.phone_2.replace(/[\s\-]/g, ""))) {
    errors.phone_2 = "يجب أن يكون 11 رقماً ويبدأ بـ 01";
  }

  if (form.national_id.trim() && !/^\d{14}$/.test(form.national_id.trim())) {
    errors.national_id = "يجب أن يتكون من 14 رقماً";
  }

  return errors;
}

// ── Avatar helpers ────────────────────────────────────────────────────
const AVATAR_PALETTE = [
  { bg: "#dbeafe", text: "#1d4ed8" },
  { bg: "#dcfce7", text: "#15803d" },
  { bg: "#fce7f3", text: "#be185d" },
  { bg: "#fef3c7", text: "#b45309" },
  { bg: "#ede9fe", text: "#6d28d9" },
  { bg: "#ffedd5", text: "#c2410c" },
  { bg: "#cffafe", text: "#0e7490" },
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}
function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ── Shared field styles ───────────────────────────────────────────────
const fsx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    backgroundColor: "#f9f9f7",
    fontFamily: "var(--font-cairo), Cairo, sans-serif",
    fontSize: 14,
    "& fieldset": { borderColor: "#e5e3dc" },
    "&:hover fieldset": { borderColor: "#154278" },
    "&.Mui-focused fieldset": { borderColor: "#154278", borderWidth: 2 },
  },
  "& .MuiInputLabel-root": {
    fontFamily: "var(--font-cairo), Cairo, sans-serif",
    fontSize: 14,
    color: "#6b7280",
    "&.Mui-focused": { color: "#154278" },
  },
  "& .MuiFormHelperText-root": {
    fontFamily: "var(--font-cairo), Cairo, sans-serif",
    textAlign: "right",
    marginRight: 0,
    fontSize: 11,
  },
  "& .MuiInputBase-input": { textAlign: "right" },
};

// ── Form fields component ─────────────────────────────────────────────
function InvestorFormFields({
  form, setForm, errors,
}: {
  form: FormData;
  setForm: (f: FormData) => void;
  errors: FormErrors;
}) {
  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [key]: e.target.value });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} dir="rtl">
      {/* Name */}
      <TextField
        label="الاسم الكامل *"
        value={form.name}
        onChange={set("name")}
        error={!!errors.name}
        helperText={errors.name}
        fullWidth
        autoFocus
        sx={fsx}
      />

      {/* Email + Phone 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <TextField
          label="البريد الإلكتروني"
          value={form.email}
          onChange={set("email")}
          error={!!errors.email}
          helperText={errors.email}
          sx={{ ...fsx, "& .MuiInputBase-input": { direction: "ltr", textAlign: "left" } }}
          inputProps={{ type: "email" }}
        />
        <TextField
          label="هاتف 1 *"
          value={form.phone}
          onChange={set("phone")}
          error={!!errors.phone}
          helperText={errors.phone ?? "01xxxxxxxxx"}
          sx={{ ...fsx, "& .MuiInputBase-input": { direction: "ltr", textAlign: "right" } }}
          inputProps={{ maxLength: 11 }}
        />
      </div>

      {/* Phone 2 + National ID */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <TextField
          label="هاتف 2"
          value={form.phone_2}
          onChange={set("phone_2")}
          error={!!errors.phone_2}
          helperText={errors.phone_2}
          sx={{ ...fsx, "& .MuiInputBase-input": { direction: "ltr", textAlign: "right" } }}
          inputProps={{ maxLength: 11 }}
        />
        <TextField
          label="رقم البطاقة القومية"
          value={form.national_id}
          onChange={set("national_id")}
          error={!!errors.national_id}
          helperText={errors.national_id ?? "14 رقماً"}
          sx={{ ...fsx, "& .MuiInputBase-input": { direction: "ltr", textAlign: "right" } }}
          inputProps={{ maxLength: 14 }}
        />
      </div>

      {/* Job */}
      <TextField
        label="الوظيفة في البطاقة القومية"
        value={form.job_in_national_id}
        onChange={set("job_in_national_id")}
        fullWidth
        sx={fsx}
      />

      {/* Address */}
      <TextField
        label="العنوان في البطاقة القومية"
        value={form.address_in_national_id}
        onChange={set("address_in_national_id")}
        fullWidth
        sx={fsx}
      />

      {/* Notes */}
      <TextField
        label="ملاحظات"
        value={form.notes}
        onChange={set("notes")}
        fullWidth
        multiline
        rows={3}
        sx={fsx}
      />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────
export default function InvestorsPage() {
  const router = useRouter();
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [flash, setFlash] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<FormData>(EMPTY_FORM);
  const [addErrors, setAddErrors] = useState<FormErrors>({});
  const [addLoading, setAddLoading] = useState(false);

  // Edit dialog
  const [editInv, setEditInv] = useState<Investor | null>(null);
  const [editForm, setEditForm] = useState<FormData>(EMPTY_FORM);
  const [editErrors, setEditErrors] = useState<FormErrors>({});
  const [editLoading, setEditLoading] = useState(false);

  // Delete dialog
  const [delInv, setDelInv] = useState<Investor | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  const showFlash = (type: "success" | "error", text: string) => {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 4500);
  };

  const fetchInvestors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sanad-zayed/investors");
      const data = await res.json();
      if (data.investors) setInvestors(data.investors);
      else showFlash("error", data.error ?? "فشل في تحميل البيانات");
    } catch {
      showFlash("error", "تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvestors(); }, [fetchInvestors]);

  // Client-side search filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return investors;
    return investors.filter(
      (inv) =>
        inv.name.toLowerCase().includes(q) ||
        inv.email.toLowerCase().includes(q) ||
        inv.phone.includes(q) ||
        inv.national_id.includes(q)
    );
  }, [investors, search]);

  // Stats
  const activeCount = investors.filter((i) => i.is_active).length;

  // ── ADD ──
  const openAdd = () => {
    setAddForm(EMPTY_FORM);
    setAddErrors({});
    setAddOpen(true);
  };
  const handleAdd = async () => {
    const errs = validate(addForm);
    if (Object.keys(errs).length) { setAddErrors(errs); return; }
    setAddLoading(true);
    try {
      const res = await fetch("/api/sanad-zayed/investors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setAddErrors(data.errors);
        else showFlash("error", data.error ?? "حدث خطأ");
        return;
      }
      setAddOpen(false);
      showFlash("success", `✓ تم إضافة "${data.investor.name}" بنجاح`);
      fetchInvestors();
    } catch {
      showFlash("error", "خطأ في الخادم");
    } finally {
      setAddLoading(false);
    }
  };

  // ── EDIT ──
  const openEdit = (inv: Investor) => {
    setEditInv(inv);
    setEditForm({
      name: inv.name, email: inv.email, phone: inv.phone,
      phone_2: inv.phone_2 ?? "", national_id: inv.national_id ?? "",
      job_in_national_id: inv.job_in_national_id ?? "",
      address_in_national_id: inv.address_in_national_id ?? "",
      notes: inv.notes ?? "",
    });
    setEditErrors({});
  };
  const handleEdit = async () => {
    if (!editInv) return;
    const errs = validate(editForm);
    if (Object.keys(errs).length) { setEditErrors(errs); return; }
    setEditLoading(true);
    try {
      const res = await fetch(`/api/sanad-zayed/investors/${editInv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, is_active: editInv.is_active }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setEditErrors(data.errors);
        else showFlash("error", data.error ?? "حدث خطأ");
        return;
      }
      setEditInv(null);
      showFlash("success", "✓ تم تحديث بيانات المستثمر");
      fetchInvestors();
    } catch {
      showFlash("error", "خطأ في الخادم");
    } finally {
      setEditLoading(false);
    }
  };

  // ── DELETE ──
  const handleDelete = async () => {
    if (!delInv) return;
    setDelLoading(true);
    try {
      const res = await fetch(`/api/sanad-zayed/investors/${delInv.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        showFlash("error", data.error ?? "حدث خطأ");
        return;
      }
      setDelInv(null);
      showFlash("success", `✓ تم حذف "${delInv.name}"`);
      fetchInvestors();
    } catch {
      showFlash("error", "خطأ في الخادم");
    } finally {
      setDelLoading(false);
    }
  };

  // ── TOGGLE ACTIVE ──
  const toggleActive = async (inv: Investor) => {
    try {
      await fetch(`/api/sanad-zayed/investors/${inv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...inv, is_active: !inv.is_active }),
      });
      fetchInvestors();
    } catch { /* silent */ }
  };

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" style={{ fontFamily: "var(--font-cairo), Cairo, sans-serif" }}>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}
      >
        <div>
          <h1 style={{ fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 900, color: "#111827", margin: 0 }}>
            المستثمرون
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "5px 0 0" }}>
            {loading ? "جاري التحميل..." : `${investors.length} مستثمر — ${activeCount} نشط`}
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={openAdd}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "linear-gradient(135deg, #154278 0%, #1e6abf 100%)",
            color: "#fff", border: "none", borderRadius: 12,
            padding: "11px 22px", cursor: "pointer",
            fontSize: 14, fontWeight: 700,
            fontFamily: "var(--font-cairo), Cairo, sans-serif",
            boxShadow: "0 4px 14px rgba(21,66,120,0.3)",
          }}
        >
          <AddOutlined sx={{ fontSize: 20 }} />
          إضافة مستثمر
        </motion.button>
      </motion.div>

      {/* ── Flash message ── */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key="flash"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{ marginBottom: 16 }}
          >
            <Alert
              severity={flash.type}
              onClose={() => setFlash(null)}
              sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo), Cairo, sans-serif", fontSize: 14 }}
            >
              {flash.text}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stats bar ── */}
      {!loading && investors.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}
        >
          {[
            { label: "إجمالي المستثمرين", value: investors.length, color: "#154278", bg: "rgba(21,66,120,0.07)" },
            { label: "نشط", value: activeCount, color: "#16a34a", bg: "rgba(22,163,74,0.07)" },
            { label: "غير نشط", value: investors.length - activeCount, color: "#64748b", bg: "rgba(100,116,139,0.07)" },
            { label: "إجمالي المدفوعات", value: `EGP ${investors.reduce((sum, inv) => sum + (inv.total_paid || 0), 0).toLocaleString()}`, color: "#10b981", bg: "rgba(16,185,129,0.07)" }
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: "12px 20px",
                border: "1px solid rgba(0,0,0,0.05)",
                display: "flex", alignItems: "center", gap: 12,
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
              <span style={{ fontSize: 13, color: "#6b7280", whiteSpace: "nowrap" }}>{s.label}</span>
              <span style={{ fontSize: s.label === "إجمالي المدفوعات" ? 16 : 18, fontWeight: 800, color: s.color, direction: "ltr" }}>{s.value}</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Search ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} style={{ marginBottom: 16 }}>
        <div style={{ position: "relative", maxWidth: 400 }}>
          <SearchOutlined sx={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 19, pointerEvents: "none" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف أو رقم البطاقة..."
            style={{
              width: "100%", padding: "11px 46px 11px 14px",
              borderRadius: 12, border: "1.5px solid #e5e3dc",
              background: "#fff", fontSize: 14, color: "#111827",
              fontFamily: "var(--font-cairo), Cairo, sans-serif",
              outline: "none", boxSizing: "border-box",
              transition: "border-color 0.18s", direction: "rtl",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#154278")}
            onBlur={(e) => (e.target.style.borderColor = "#e5e3dc")}
          />
        </div>
      </motion.div>

      {/* ── Table ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)" }}>

          {/* Loading */}
          {loading && (
            <div style={{ padding: 64, display: "flex", justifyContent: "center" }}>
              <CircularProgress sx={{ color: "#154278" }} />
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: "60px 24px", textAlign: "center" }}>
              <PeopleOutlined sx={{ fontSize: 56, color: "#d1d0c6", display: "block", margin: "0 auto 14px" }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>
                {search ? "لا توجد نتائج مطابقة" : "لا يوجد مستثمرون بعد"}
              </div>
              <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: search ? 0 : 24 }}>
                {search ? "جرب البحث بكلمة مختلفة" : "اضغط \"إضافة مستثمر\" للبدء"}
              </div>
              {!search && (
                <button
                  onClick={openAdd}
                  style={{
                    background: "#154278", color: "#fff", border: "none",
                    borderRadius: 10, padding: "10px 22px", cursor: "pointer",
                    fontSize: 14, fontWeight: 700, fontFamily: "var(--font-cairo), Cairo, sans-serif",
                  }}
                >
                  إضافة أول مستثمر
                </button>
              )}
            </div>
          )}

          {/* Table */}
          {!loading && filtered.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                <thead>
                  <tr style={{ background: "#f8f7f3", borderBottom: "2px solid #f0ede6" }}>
                    {["المستثمر", "إجمالي المدفوعات", "قيمة العقد", "المتبقي", "", ""].map((h, i) => (
                      <th key={i} style={{
                        padding: "13px 18px", textAlign: "right", fontSize: 11,
                        fontWeight: 700, color: "#9ca3af",
                        letterSpacing: "0.06em", whiteSpace: "nowrap",
                        fontFamily: "var(--font-cairo), Cairo, sans-serif",
                        textTransform: "uppercase",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filtered.map((inv, i) => {
                      const av = avatarColor(inv.name);
                      return (
                        <motion.tr
                          key={inv.id}
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: i * 0.025 }}
                          style={{ borderBottom: "1px solid #f5f4f0", cursor: "default" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#fdfcfb")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          {/* Investor */}
                          <td style={{ padding: "14px 18px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{
                                width: 40, height: 40, borderRadius: 12,
                                background: av.bg, color: av.text,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 13, fontWeight: 900, flexShrink: 0,
                              }}>
                                {initials(inv.name)}
                              </div>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{inv.name}</div>
                                {inv.email && (
                                  <div style={{ fontSize: 12, color: "#9ca3af", direction: "ltr", textAlign: "right" }}>
                                    {inv.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Total Paid / Returned / Net */}
                          <td style={{ padding: "14px 18px" }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: "#16a34a", direction: "ltr", textAlign: "right" }}>
                              EGP {(inv.net_paid ?? inv.total_paid ?? 0).toLocaleString()}
                            </div>
                            {(inv.total_returned ?? 0) > 0 && (
                              <div style={{ fontSize: 11, color: "#9ca3af", direction: "ltr", textAlign: "right", marginTop: 2 }}>
                                مدفوع {(inv.total_paid ?? 0).toLocaleString()} — مسترد {(inv.total_returned ?? 0).toLocaleString()}
                              </div>
                            )}
                          </td>

                          {/* Contract value */}
                          <td style={{ padding: "14px 18px", fontSize: 13, color: "#374151", direction: "ltr", textAlign: "right" }}>
                            {(inv.contract_value ?? 0) > 0 ? `EGP ${(inv.contract_value ?? 0).toLocaleString()}` : <span style={{ color: "#d1d5db" }}>—</span>}
                          </td>

                          {/* Remaining */}
                          <td style={{ padding: "14px 18px" }}>
                            {inv.has_contracts || inv.has_transactions ? (
                              <span style={{
                                fontSize: 14, fontWeight: 800, direction: "ltr", textAlign: "right",
                                color: (inv.remaining_balance ?? 0) > 0 ? "#16a34a" : (inv.remaining_balance ?? 0) < 0 ? "#ef4444" : "#9ca3af",
                              }}>
                                {(inv.remaining_balance ?? 0) > 0 ? "+" : ""}{(inv.remaining_balance ?? 0).toLocaleString()}
                              </span>
                            ) : <span style={{ color: "#d1d5db" }}>—</span>}
                          </td>

                          {/* Status dot */}
                          <td style={{ padding: "14px 8px", textAlign: "center" }}>
                            <button
                              onClick={() => toggleActive(inv)}
                              title={inv.is_active ? "نشط — اضغط للتغيير" : "غير نشط — اضغط للتغيير"}
                              style={{
                                display: "inline-flex", width: 12, height: 12, borderRadius: "50%",
                                background: inv.is_active ? "#22c55e" : "#ef4444",
                                boxShadow: inv.is_active ? "0 0 5px #22c55e88" : "0 0 5px #ef444488",
                                border: "none", cursor: "pointer", padding: 0,
                              }}
                            />
                          </td>

                          {/* Actions */}
                          <td style={{ padding: "14px 12px" }}>
                            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                              <IconButton
                                onClick={() => router.push(`/admin/sanad-zayed/investors/${inv.id}`)}
                                size="small"
                                title="عرض العقود والمحفظة"
                                sx={{ color: "#9ca3af", "&:hover": { color: "#059669", background: "rgba(5,150,105,0.08)" }, borderRadius: "8px" }}
                              >
                                <AccountBalanceWalletOutlined sx={{ fontSize: 17 }} />
                              </IconButton>
                              <IconButton
                                onClick={() => router.push(`/admin/sanad-zayed/investors/${inv.id}/transactions`)}
                                size="small"
                                title="سجل الحركات"
                                sx={{ color: "#9ca3af", "&:hover": { color: "#154278", background: "rgba(21,66,120,0.08)" }, borderRadius: "8px" }}
                              >
                                <ReceiptLongOutlined sx={{ fontSize: 17 }} />
                              </IconButton>
                              <IconButton
                                onClick={() => openEdit(inv)}
                                size="small"
                                sx={{ color: "#9ca3af", "&:hover": { color: "#154278", background: "rgba(21,66,120,0.08)" }, borderRadius: "8px" }}
                              >
                                <EditOutlined sx={{ fontSize: 17 }} />
                              </IconButton>
                              <Tooltip title={(inv.has_transactions || inv.has_contracts) ? "لا يمكن الحذف — له حركات مالية أو عقود مسجلة. أوقف حسابه بدلاً من ذلك" : ""}>
                                <span>
                                  <IconButton
                                    onClick={() => setDelInv(inv)}
                                    size="small"
                                    disabled={inv.has_transactions || inv.has_contracts}
                                    sx={{ color: "#9ca3af", "&:hover": { color: "#ef4444", background: "rgba(239,68,68,0.08)" }, borderRadius: "8px" }}
                                  >
                                    <DeleteOutline sx={{ fontSize: 17 }} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>

              {/* Footer count */}
              <div style={{ padding: "12px 18px", borderTop: "1px solid #f0ede6", fontSize: 12, color: "#9ca3af", textAlign: "right" }}>
                {search
                  ? `يعرض ${filtered.length} من ${investors.length} مستثمر`
                  : `${investors.length} مستثمر`
                }
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ════════════════ ADD DIALOG ════════════════ */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "20px", direction: "rtl" } }}
      >
        <DialogTitle sx={{ fontFamily: "var(--font-cairo), Cairo, sans-serif", fontWeight: 800, fontSize: 18, pb: 0.5, pt: 3, pr: 3 }}>
          إضافة مستثمر جديد
          <IconButton onClick={() => setAddOpen(false)} sx={{ position: "absolute", left: 12, top: 12, color: "#9ca3af" }}>
            <CloseOutlined />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: "16px !important", px: 3 }}>
          <InvestorFormFields form={addForm} setForm={setAddForm} errors={addErrors} />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, gap: 1.5 }}>
          <Button
            onClick={() => setAddOpen(false)}
            sx={{ fontFamily: "var(--font-cairo), Cairo, sans-serif", color: "#6b7280", borderRadius: "10px" }}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleAdd}
            variant="contained"
            disabled={addLoading}
            startIcon={addLoading ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <PersonOutline />}
            sx={{
              fontFamily: "var(--font-cairo), Cairo, sans-serif", fontWeight: 700,
              background: "linear-gradient(135deg, #154278 0%, #1e6abf 100%)",
              borderRadius: "10px", px: 3, boxShadow: "0 4px 14px rgba(21,66,120,0.3)",
              "&:hover": { background: "#1a4f8a" }, "&:disabled": { opacity: 0.7 },
            }}
          >
            {addLoading ? "جاري الحفظ..." : "إضافة المستثمر"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ════════════════ EDIT DIALOG ════════════════ */}
      <Dialog
        open={!!editInv}
        onClose={() => setEditInv(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "20px", direction: "rtl" } }}
      >
        <DialogTitle sx={{ fontFamily: "var(--font-cairo), Cairo, sans-serif", fontWeight: 800, fontSize: 18, pb: 0.5, pt: 3, pr: 3 }}>
          تعديل بيانات المستثمر
          <IconButton onClick={() => setEditInv(null)} sx={{ position: "absolute", left: 12, top: 12, color: "#9ca3af" }}>
            <CloseOutlined />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: "16px !important", px: 3 }}>
          <InvestorFormFields form={editForm} setForm={setEditForm} errors={editErrors} />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, gap: 1.5 }}>
          <Button
            onClick={() => setEditInv(null)}
            sx={{ fontFamily: "var(--font-cairo), Cairo, sans-serif", color: "#6b7280", borderRadius: "10px" }}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleEdit}
            variant="contained"
            disabled={editLoading}
            startIcon={editLoading ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : null}
            sx={{
              fontFamily: "var(--font-cairo), Cairo, sans-serif", fontWeight: 700,
              background: "linear-gradient(135deg, #154278 0%, #1e6abf 100%)",
              borderRadius: "10px", px: 3, boxShadow: "0 4px 14px rgba(21,66,120,0.3)",
              "&:hover": { background: "#1a4f8a" }, "&:disabled": { opacity: 0.7 },
            }}
          >
            {editLoading ? "جاري الحفظ..." : "حفظ التعديلات"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ════════════════ DELETE DIALOG ════════════════ */}
      <Dialog
        open={!!delInv}
        onClose={() => setDelInv(null)}
        PaperProps={{ sx: { borderRadius: "20px", direction: "rtl", maxWidth: 420 } }}
      >
        <DialogTitle sx={{ fontFamily: "var(--font-cairo), Cairo, sans-serif", fontWeight: 800, fontSize: 17, pt: 3, pr: 3 }}>
          تأكيد الحذف
        </DialogTitle>
        <DialogContent sx={{ px: 3 }}>
          <p style={{ fontFamily: "var(--font-cairo), Cairo, sans-serif", color: "#374151", margin: 0, lineHeight: 1.7, fontSize: 14 }}>
            هل أنت متأكد من حذف المستثمر{" "}
            <strong style={{ color: "#111827" }}>"{delInv?.name}"</strong>؟<br />
            <span style={{ color: "#ef4444", fontSize: 13 }}>لا يمكن التراجع عن هذا الإجراء.</span>
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1.5 }}>
          <Button
            onClick={() => setDelInv(null)}
            sx={{ fontFamily: "var(--font-cairo), Cairo, sans-serif", color: "#6b7280", borderRadius: "10px" }}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            disabled={delLoading}
            startIcon={delLoading ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <DeleteOutline />}
            sx={{
              fontFamily: "var(--font-cairo), Cairo, sans-serif", fontWeight: 700,
              background: "#ef4444", borderRadius: "10px", px: 3,
              "&:hover": { background: "#dc2626" }, "&:disabled": { opacity: 0.7 },
            }}
          >
            {delLoading ? "جاري الحذف..." : "حذف المستثمر"}
          </Button>
        </DialogActions>
      </Dialog>

    </div>
  );
}
