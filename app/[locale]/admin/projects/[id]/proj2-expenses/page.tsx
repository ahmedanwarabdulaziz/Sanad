"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useProject } from "../layout";
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Alert, IconButton, Chip, Autocomplete, Tabs, Tab, InputAdornment
} from "@mui/material";
import {
  AddOutlined, DeleteOutline, SettingsOutlined, PaymentsOutlined, EditOutlined, CalendarMonthOutlined
} from "@mui/icons-material";

const fieldSx = {
  "& .MuiOutlinedInput-root": { borderRadius: "12px", backgroundColor: "rgba(15,23,42,0.5)", color: "#e2e8f0", fontFamily: "var(--font-cairo)", "& fieldset": { borderColor: "rgba(148,163,184,0.15)" }, "&:hover fieldset": { borderColor: "rgba(59,130,246,0.4)" }, "&.Mui-focused fieldset": { borderColor: "#3b82f6" } },
  "& .MuiInputLabel-root": { color: "#94a3b8", fontFamily: "var(--font-cairo)", "&.Mui-focused": { color: "#60a5fa" } },
  "& .MuiInputBase-input": { textAlign: "right" },
};
const dialogSx = { "& .MuiDialog-paper": { background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "20px", color: "#e2e8f0", direction: "rtl" as const, minWidth: "min(560px, 94vw)", maxHeight: "90vh" } };
const menuSx = { PaperProps: { sx: { background: "#1e293b", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "12px", "& .MuiMenuItem-root": { fontFamily: "var(--font-cairo)", color: "#e2e8f0", "&:hover": { background: "rgba(59,130,246,0.1)" } } } } };
const acPaperSx = { sx: { background: "#1e293b", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "12px", direction: "rtl" as const } };
const acSx = { ...fieldSx, "& .MuiAutocomplete-popupIndicator": { color: "#64748b" }, "& .MuiAutocomplete-clearIndicator": { color: "#64748b" } };
const renderOpt = (props: any, label: string) => (
  <li {...props} style={{ fontFamily: "var(--font-cairo)", fontSize: "13px", color: "#e2e8f0", background: "transparent", padding: "8px 14px", cursor: "pointer", textAlign: "right", direction: "rtl", listStyle: "none" }}
    onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.12)")}
    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
    {label}
  </li>
);
const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
const fmtD = (d: string) => { if (!d) return ""; const p = d.split("-"); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : d; };
const today = () => fmtD(new Date().toISOString().split("T")[0]);

const isValidDate = (v: string) => {
  if (!v) return true;
  if (!/^\d{2}-\d{2}-\d{4}$/.test(v)) return false;
  const [d, m, y] = v.split("-").map(Number);
  if (m < 1 || m > 12) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
};
const DateField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  const invalid = !!value && !isValidDate(value);
  return (
    <div style={{ position: "relative" }}>
      <TextField label={label} value={value} onChange={e => onChange(e.target.value)} fullWidth
        error={invalid}
        helperText={invalid ? "صيغة غير صحيحة — dd-mm-yyyy" : undefined}
        FormHelperTextProps={{ style: { fontFamily: "var(--font-cairo)", textAlign: "right", direction: "rtl", fontSize: "11px" } }}
        sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr", letterSpacing: "1px" } }}
        placeholder="dd-mm-yyyy" inputProps={{ style: { direction: "ltr" } }}
        InputProps={{ endAdornment: (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => ref.current?.showPicker()} sx={{ color: invalid ? "#f87171" : "#64748b", "&:hover": { color: "#60a5fa" } }}>
              <CalendarMonthOutlined sx={{ fontSize: 18 }} />
            </IconButton>
          </InputAdornment>
        )}}
      />
      <input ref={ref} type="date" onChange={e => { if (e.target.value) onChange(fmtD(e.target.value)); }}
        style={{ position: "absolute", top: 0, left: 0, opacity: 0, pointerEvents: "none", width: "1px", height: "1px" }} />
    </div>
  );
};

const EXPENSE_TYPES = [
  { value: "purchase", label: "🧾 مصروف شراء", color: "#f59e0b" },
  { value: "sale",     label: "💼 مصروف بيع",  color: "#8b5cf6" },
  { value: "general",  label: "📋 مصروف عام",  color: "#3b82f6" },
];
const PAYMENT_STATUS = [
  { value: "immediate", label: "دفع فوري",      color: "#10b981" },
  { value: "advance",   label: "عربون",          color: "#f59e0b" },
  { value: "future",    label: "دفع مستقبلي",   color: "#64748b" },
];

const emptyForm = {
  expense_type: "general", category_id: "", purchase_order_ids: [] as string[],
  description: "", amount: "", payment_status: "immediate",
  paid_amount: "", vault_id: "", expense_date: today(), notes: ""
};

export default function Proj2ExpensesPage() {
  const { projectId } = useProject();
  const [tab, setTab] = useState(0); // 0=expenses, 1=categories
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [vaults, setVaults] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { if (!success) return; const t = setTimeout(() => setSuccess(null), 4000); return () => clearTimeout(t); }, [success]);
  useEffect(() => { if (!error) return; const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t); }, [error]);

  // Add expense dialog
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // Add category dialog
  const [catOpen, setCatOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", expense_type: "general" });

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteCatOpen, setDeleteCatOpen] = useState(false);
  const [deleteCatTarget, setDeleteCatTarget] = useState<any>(null);

  // Edit expense
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [editSaving, setEditSaving] = useState(false);

  // Pay remaining dialog
  const [payOpen, setPayOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<any>(null);
  const [payForm, setPayForm] = useState({ vault_id: "", amount: "", notes: "" });
  const [paySaving, setPaySaving] = useState(false);

  const fetchAll = useCallback(async () => {
    const [expRes, catRes, vltRes, purRes] = await Promise.all([
      fetch(`/api/erp-auth/projects/${projectId}/proj2-expenses`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-expense-categories`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-vaults`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-purchases`),
    ]);
    const [ed, cd, vd, pd] = await Promise.all([expRes.json(), catRes.json(), vltRes.json(), purRes.json()]);
    setExpenses(ed.expenses || []);
    setCategories(cd.categories || []);
    setVaults(vd.vaults || []);
    setPurchases(pd.orders || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filteredCats = categories.filter(c => c.expense_type === form.expense_type);
  const selectedOrders = purchases.filter(p => (form.purchase_order_ids || []).includes(p.id));

  const handleAdd = async () => {
    setSaving(true);
    const payload = {
      ...form,
      amount: Number(form.amount),
      paid_amount: form.payment_status === "future" ? 0 : Number(form.paid_amount || form.amount),
      expense_date: fmtD(form.expense_date),
      purchase_order_ids: form.expense_type === "purchase" ? form.purchase_order_ids : [],
    };
    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-expenses`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); }
    else { setSuccess("تم تسجيل المصروف"); setAddOpen(false); fetchAll(); }
    setSaving(false);
  };

  const handleAddCat = async () => {
    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-expense-categories`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(catForm),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); }
    else { setSuccess("تم إضافة الفئة"); setCatOpen(false); setCatForm({ name: "", expense_type: "general" }); fetchAll(); }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-expenses/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); setError(d.error); }
    else { setSuccess("تم الحذف"); setDeleteOpen(false); fetchAll(); }
  };

  const handleDeleteCat = async () => {
    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-expense-categories/${deleteCatTarget.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); setError(d.error); }
    else { setSuccess("تم حذف الفئة"); setDeleteCatOpen(false); fetchAll(); }
  };

  const handlePay = async () => {
    setPaySaving(true);
    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-expenses/${payTarget.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vault_id: payForm.vault_id, amount: Number(payForm.amount), notes: payForm.notes }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); }
    else { setSuccess("تم تسجيل الدفعة"); setPayOpen(false); fetchAll(); }
    setPaySaving(false);
  };

  const handleEdit = async () => {
    setEditSaving(true);
    const payload = {
      action: "edit",
      ...editForm,
      amount: Number(editForm.amount),
      paid_amount: editForm.payment_status === "future" ? 0 : Number(editForm.paid_amount || editForm.amount),
      expense_date: fmtD(editForm.expense_date),
      purchase_order_ids: editForm.expense_type === "purchase" ? editForm.purchase_order_ids : [],
    };
    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-expenses/${editTarget.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); }
    else { setSuccess("تم تعديل المصروف"); setEditOpen(false); fetchAll(); }
    setEditSaving(false);
  };

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalPaid = expenses.reduce((s, e) => s + Number(e.paid_amount), 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>المصروفات</h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0, fontFamily: "var(--font-cairo)" }}>تسجيل وإدارة المصروفات بأنواعها</p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Button variant="outlined" startIcon={<SettingsOutlined />} onClick={() => setTab(1)}
            sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontSize: "13px", textTransform: "none", borderColor: "rgba(148,163,184,0.3)", color: "#e2e8f0", whiteSpace: "nowrap" }}>
            فئات المصروفات
          </Button>
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => { setForm({ ...emptyForm }); setAddOpen(true); }}
            sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", whiteSpace: "nowrap" }}>
            مصروف جديد
          </Button>
        </div>
      </div>

      {/* Summary */}
      {expenses.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
          {[
            { label: "إجمالي المصروفات", val: totalExpenses, color: "#ef4444" },
            { label: "إجمالي المدفوع", val: totalPaid, color: "#10b981" },
            { label: "المتبقي", val: totalExpenses - totalPaid, color: "#f59e0b" },
          ].map(s => (
            <div key={s.label} style={{ padding: "16px 18px", borderRadius: "16px", background: "rgba(30,41,59,0.5)", border: "1px solid rgba(148,163,184,0.08)" }}>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 6px", fontFamily: "var(--font-cairo)" }}>{s.label}</p>
              <p style={{ fontSize: "20px", fontWeight: 700, color: s.color, margin: 0, direction: "ltr", textAlign: "right" }}>{fmt(s.val)} <span style={{ fontSize: "12px", fontWeight: 400, color: "#64748b" }}>جنيه</span></p>
            </div>
          ))}
        </div>
      )}

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontFamily: "var(--font-cairo)", direction: "rtl" }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#86efac", fontFamily: "var(--font-cairo)", direction: "rtl" }}>{success}</Alert>}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, "& .MuiTab-root": { fontFamily: "var(--font-cairo)", color: "#64748b", textTransform: "none", fontSize: "14px", "&.Mui-selected": { color: "#60a5fa" } }, "& .MuiTabs-indicator": { backgroundColor: "#3b82f6" } }}>
        <Tab label="قائمة المصروفات" />
        <Tab label="فئات المصروفات" />
      </Tabs>

      {tab === 0 ? (
        loading ? <div style={{ textAlign: "center", padding: "60px 0" }}><CircularProgress sx={{ color: "#ef4444" }} /></div>
          : expenses.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px", borderRadius: "20px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
              <p style={{ fontSize: "48px", margin: "0 0 12px" }}>💸</p>
              <p style={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "16px" }}>لا توجد مصروفات بعد</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {expenses.map(exp => {
                const etype = EXPENSE_TYPES.find(t => t.value === exp.expense_type);
                const pstat = PAYMENT_STATUS.find(s => s.value === exp.payment_status);
                return (
                  <div key={exp.id} style={{ padding: "16px 20px", borderRadius: "16px", background: "rgba(30,41,59,0.5)", border: "1px solid rgba(148,163,184,0.08)", direction: "rtl" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#60a5fa", fontFamily: "monospace", background: "rgba(59,130,246,0.1)", padding: "3px 8px", borderRadius: "8px" }}>{exp.code}</span>
                        <Chip label={etype?.label} size="small" sx={{ background: `${etype?.color}22`, color: etype?.color, fontFamily: "var(--font-cairo)", fontSize: "11px", height: "20px" }} />
                        <Chip label={pstat?.label} size="small" sx={{ background: `${pstat?.color}22`, color: pstat?.color, fontFamily: "var(--font-cairo)", fontSize: "11px", height: "20px" }} />
                        {exp.category?.name && <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>{exp.category.name}</span>}
                      </div>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <IconButton size="small" title="تعديل"
                          onClick={() => {
                            setEditTarget(exp);
                            setEditForm({
                              expense_type: exp.expense_type || "general",
                              category_id: exp.category_id || "",
                              purchase_order_ids: exp.purchase_order_ids || [],
                              description: exp.description || "",
                              amount: String(exp.amount),
                              payment_status: exp.payment_status || "future",
                              paid_amount: String(exp.paid_amount),
                              vault_id: exp.vault_id || "",
                              expense_date: fmtD(exp.expense_date || ""),
                              notes: exp.notes || "",
                            });
                            setEditOpen(true);
                          }}
                          sx={{ color: "#60a5fa", "&:hover": { background: "rgba(59,130,246,0.1)" } }}>
                          <EditOutlined sx={{ fontSize: 16 }} />
                        </IconButton>
                        {Number(exp.amount) > Number(exp.paid_amount) && (
                          <IconButton size="small" title="سداد المتبقي"
                            onClick={() => { setPayTarget(exp); setPayForm({ vault_id: "", amount: String(Number(exp.amount) - Number(exp.paid_amount)), notes: "" }); setPayOpen(true); }}
                            sx={{ color: "#f59e0b", "&:hover": { background: "rgba(245,158,11,0.1)" } }}>
                            <PaymentsOutlined sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                        <IconButton size="small" onClick={() => { setDeleteTarget(exp); setDeleteOpen(true); }} sx={{ color: "#64748b", "&:hover": { color: "#f87171", background: "rgba(248,113,113,0.1)" } }}>
                          <DeleteOutline sx={{ fontSize: 16 }} />
                        </IconButton>
                      </div>
                    </div>
                    <p style={{ fontSize: "14px", color: "#e2e8f0", margin: "0 0 8px", fontFamily: "var(--font-cairo)" }}>{exp.description || "—"}</p>
                    {/* Linked orders */}
                    {exp.purchase_order_ids?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
                        {(exp.purchase_order_ids as string[]).map(oid => {
                          const po = purchases.find(p => p.id === oid);
                          return po ? (
                            <span key={oid} style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "var(--font-cairo)", background: "rgba(15,23,42,0.4)", padding: "4px 8px", borderRadius: "8px" }}>
                              🧾 {po.code} — {po.supplier?.name || ""}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: "18px", fontWeight: 700, color: "#ef4444", fontFamily: "monospace" }}>{fmt(Number(exp.amount))} <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 400 }}>جنيه</span></span>
                      {Number(exp.paid_amount) > 0 && (
                        <span style={{ fontSize: "13px", color: "#10b981", fontFamily: "var(--font-cairo)" }}>مدفوع: {fmt(Number(exp.paid_amount))} جنيه</span>
                      )}
                      {Number(exp.amount) > Number(exp.paid_amount) && (
                        <span style={{ fontSize: "13px", color: "#f87171", fontFamily: "var(--font-cairo)" }}>متبقي: {fmt(Number(exp.amount) - Number(exp.paid_amount))} جنيه</span>
                      )}
                      {exp.vault && <span style={{ fontSize: "12px", color: "#60a5fa", fontFamily: "var(--font-cairo)" }}>💳 {exp.vault.name}</span>}
                      <span style={{ fontSize: "11px", color: "#475569", fontFamily: "var(--font-cairo)", marginRight: "auto" }}>{fmtD(exp.expense_date)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
      ) : (
        /* Categories tab */
        <div>
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "16px", direction: "rtl" }}>
            <Button variant="outlined" startIcon={<AddOutlined />} onClick={() => { setCatForm({ name: "", expense_type: "general" }); setCatOpen(true); }}
              sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontSize: "13px", textTransform: "none", borderColor: "rgba(59,130,246,0.4)", color: "#60a5fa" }}>
              إضافة فئة
            </Button>
          </div>
          {categories.length === 0 ? (
            <p style={{ textAlign: "center", color: "#64748b", fontFamily: "var(--font-cairo)", padding: "32px 0" }}>لا توجد فئات بعد — أضف فئات للمصروفات</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px" }}>
              {categories.map(cat => {
                const etype = EXPENSE_TYPES.find(t => t.value === cat.expense_type);
                return (
                  <div key={cat.id} style={{ padding: "14px 18px", borderRadius: "14px", background: "rgba(30,41,59,0.5)", border: "1px solid rgba(148,163,184,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", direction: "rtl" }}>
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9", margin: 0, fontFamily: "var(--font-cairo)" }}>{cat.name}</p>
                      <Chip label={etype?.label} size="small" sx={{ background: `${etype?.color}22`, color: etype?.color, fontFamily: "var(--font-cairo)", fontSize: "11px", height: "18px", mt: 0.5 }} />
                    </div>
                    <IconButton size="small" onClick={() => { setDeleteCatTarget(cat); setDeleteCatOpen(true); }} sx={{ color: "#64748b", "&:hover": { color: "#f87171", background: "rgba(248,113,113,0.1)" } }}>
                      <DeleteOutline sx={{ fontSize: 16 }} />
                    </IconButton>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Expense Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>مصروف جديد</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          {/* Expense type tabs */}
          <div style={{ display: "flex", gap: "8px", direction: "rtl" }}>
            {EXPENSE_TYPES.map(t => (
              <button key={t.value} onClick={() => setForm({ ...form, expense_type: t.value, category_id: "", purchase_order_ids: [] })}
                style={{ flex: 1, padding: "8px 4px", borderRadius: "10px", border: `1px solid ${form.expense_type === t.value ? t.color : "rgba(148,163,184,0.15)"}`, background: form.expense_type === t.value ? `${t.color}18` : "transparent", color: form.expense_type === t.value ? t.color : "#64748b", fontFamily: "var(--font-cairo)", fontSize: "12px", cursor: "pointer", fontWeight: form.expense_type === t.value ? 700 : 400 }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Category autocomplete */}
          <Autocomplete
            options={filteredCats}
            getOptionLabel={(c: any) => c.name || ""}
            value={filteredCats.find(c => c.id === form.category_id) || null}
            onChange={(_, val) => setForm({ ...form, category_id: val?.id || "" })}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            noOptionsText={<span style={{ fontFamily: "var(--font-cairo)", color: "#64748b" }}>لا توجد فئات — أضف فئات أولاً</span>}
            slotProps={{ paper: acPaperSx }}
            renderOption={(props, c) => renderOpt(props, c.name)}
            renderInput={(params) => (
              <TextField {...params} label="الفئة" fullWidth sx={acSx}
                inputProps={{ ...params.inputProps, style: { textAlign: "right", fontFamily: "var(--font-cairo)" } }}
              />
            )}
          />

          {/* Purchase order multi-picker (only if purchase type) */}
          {form.expense_type === "purchase" && (
            <Autocomplete
              multiple
              options={purchases}
              getOptionLabel={(o: any) => `${o.code} — ${o.supplier?.name || ""}`}
              value={purchases.filter(o => (form.purchase_order_ids || []).includes(o.id))}
              onChange={(_, vals) => setForm({ ...form, purchase_order_ids: vals.map((v: any) => v.id) })}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              noOptionsText={<span style={{ fontFamily: "var(--font-cairo)", color: "#64748b" }}>لا توجد فواتير</span>}
              slotProps={{ paper: acPaperSx }}
              renderOption={(props, o) => renderOpt(props, `${o.code} — ${o.supplier?.name || ""}`)}
              renderTags={(vals, getTagProps) =>
                vals.map((o: any, i) => (
                  <Chip {...getTagProps({ index: i })} key={o.id} label={o.code}
                    size="small" sx={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa", fontFamily: "monospace", fontSize: "11px" }} />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} label="الفواتير المرتبطة" fullWidth sx={acSx}
                  inputProps={{ ...params.inputProps, style: { textAlign: "right", fontFamily: "var(--font-cairo)" } }}
                />
              )}
            />
          )}

          <TextField label="البيان *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} fullWidth sx={fieldSx} />
          <TextField label="المبلغ الإجمالي *" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} />

          {/* Payment status */}
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>حالة السداد</InputLabel>
            <Select value={form.payment_status} onChange={e => setForm({ ...form, payment_status: e.target.value })} label="حالة السداد" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              {PAYMENT_STATUS.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </Select>
          </FormControl>

          {/* Paid amount (only for advance) */}
          {form.payment_status === "advance" && (
            <TextField label="المبلغ المدفوع (العربون)" type="number" value={form.paid_amount} onChange={e => setForm({ ...form, paid_amount: e.target.value })} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} />
          )}

          {/* Vault (only if not future) */}
          {form.payment_status !== "future" && (
            <Autocomplete
              options={vaults}
              getOptionLabel={(v: any) => `${v.name} — ${fmt(Number(v.balance))} جنيه`}
              value={vaults.find(v => v.id === form.vault_id) || null}
              onChange={(_, val) => setForm({ ...form, vault_id: val?.id || "" })}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              noOptionsText={<span style={{ fontFamily: "var(--font-cairo)", color: "#64748b" }}>لا توجد خزن</span>}
              slotProps={{ paper: acPaperSx }}
              renderOption={(props, v) => renderOpt(props, `${v.name} — ${fmt(Number(v.balance))} جنيه`)}
              renderInput={(params) => (
                <TextField {...params} label="الدفع من *" fullWidth sx={acSx}
                  inputProps={{ ...params.inputProps, style: { textAlign: "right", fontFamily: "var(--font-cairo)" } }}
                />
              )}
            />
          )}

          <DateField label="تاريخ المصروف" value={form.expense_date} onChange={v => setForm({ ...form, expense_date: v })} />
          <TextField label="ملاحظات" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} fullWidth multiline rows={2} sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setAddOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleAdd} disabled={saving || !form.amount || (form.payment_status !== "future" && !form.vault_id)} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "تسجيل المصروف"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={catOpen} onClose={() => setCatOpen(false)} sx={{ ...dialogSx, "& .MuiDialog-paper": { ...dialogSx["& .MuiDialog-paper"], minWidth: "min(420px, 94vw)" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>إضافة فئة مصروف</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <TextField label="اسم الفئة *" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} fullWidth sx={fieldSx} />
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>النوع</InputLabel>
            <Select value={catForm.expense_type} onChange={e => setCatForm({ ...catForm, expense_type: e.target.value })} label="النوع" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              {EXPENSE_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setCatOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleAddCat} disabled={!catForm.name} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
            إضافة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Expense Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} sx={{ "& .MuiDialog-paper": { ...dialogSx["& .MuiDialog-paper"], minWidth: "min(380px, 94vw)" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#f87171" }}>حذف المصروف</DialogTitle>
        <DialogContent><p style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", fontSize: "15px", margin: 0 }}>هل تريد حذف <strong style={{ color: "#e2e8f0" }}>{deleteTarget?.code}</strong>؟</p></DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleDelete} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "#dc2626" }}>حذف</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog open={deleteCatOpen} onClose={() => setDeleteCatOpen(false)} sx={{ "& .MuiDialog-paper": { ...dialogSx["& .MuiDialog-paper"], minWidth: "min(380px, 94vw)" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#f87171" }}>حذف الفئة</DialogTitle>
        <DialogContent><p style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", fontSize: "15px", margin: 0 }}>هل تريد حذف فئة <strong style={{ color: "#e2e8f0" }}>{deleteCatTarget?.name}</strong>؟</p></DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteCatOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleDeleteCat} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "#dc2626" }}>حذف</Button>
        </DialogActions>
      </Dialog>

      {/* Pay Remaining Dialog */}
      <Dialog open={payOpen} onClose={() => setPayOpen(false)} sx={{ "& .MuiDialog-paper": { ...dialogSx["& .MuiDialog-paper"], minWidth: "min(440px, 94vw)" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#f59e0b" }}>
          سداد متبقي — {payTarget?.code}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <p style={{ margin: "0 0 4px", fontFamily: "var(--font-cairo)", fontSize: "14px", color: "#94a3b8" }}>
            الإجمالي: <strong style={{ color: "#e2e8f0" }}>{fmt(Number(payTarget?.amount))} جنيه</strong>
            {" · "}مدفوع: <strong style={{ color: "#10b981" }}>{fmt(Number(payTarget?.paid_amount))} جنيه</strong>
            {" · "}متبقي: <strong style={{ color: "#f87171" }}>{fmt(Number(payTarget?.amount) - Number(payTarget?.paid_amount))} جنيه</strong>
          </p>
          <TextField label="المبلغ المدفوع *" type="number"
            value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
            fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} />
          <Autocomplete
            options={vaults}
            getOptionLabel={(v: any) => `${v.name} — ${fmt(Number(v.balance))} جنيه`}
            value={vaults.find(v => v.id === payForm.vault_id) || null}
            onChange={(_, val) => setPayForm({ ...payForm, vault_id: val?.id || "" })}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            noOptionsText={<span style={{ fontFamily: "var(--font-cairo)", color: "#64748b" }}>لا توجد خزن</span>}
            slotProps={{ paper: acPaperSx }}
            renderOption={(props, v) => renderOpt(props, `${v.name} — ${fmt(Number(v.balance))} جنيه`)}
            renderInput={(params) => (
              <TextField {...params} label="الدفع من *" fullWidth sx={acSx}
                inputProps={{ ...params.inputProps, style: { textAlign: "right", fontFamily: "var(--font-cairo)" } }}
              />
            )}
          />
          <TextField label="ملاحظات" value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} fullWidth sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setPayOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handlePay} disabled={paySaving || !payForm.amount || !payForm.vault_id} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}>
            {paySaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "تسجيل الدفعة"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>
          تعديل المصروف — {editTarget?.code}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          {/* Type buttons */}
          <div style={{ display: "flex", gap: "8px", direction: "rtl" }}>
            {EXPENSE_TYPES.map(t => (
              <button key={t.value} onClick={() => setEditForm({ ...editForm, expense_type: t.value, category_id: "", purchase_order_ids: [] })}
                style={{ flex: 1, padding: "10px 8px", borderRadius: "12px", border: `2px solid ${editForm.expense_type === t.value ? t.color : "rgba(148,163,184,0.15)"}`, background: editForm.expense_type === t.value ? `${t.color}22` : "rgba(15,23,42,0.3)", color: editForm.expense_type === t.value ? t.color : "#64748b", fontFamily: "var(--font-cairo)", fontSize: "12px", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>
                {t.label}
              </button>
            ))}
          </div>
          {/* Category */}
          <Autocomplete
            options={categories.filter(c => c.expense_type === editForm.expense_type)}
            getOptionLabel={(c: any) => c.name || ""}
            value={categories.find(c => c.id === editForm.category_id) || null}
            onChange={(_, val) => setEditForm({ ...editForm, category_id: val?.id || "" })}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            noOptionsText={<span style={{ fontFamily: "var(--font-cairo)", color: "#64748b" }}>لا توجد فئات</span>}
            slotProps={{ paper: acPaperSx }}
            renderOption={(props, c) => renderOpt(props, c.name)}
            renderInput={(params) => <TextField {...params} label="الفئة" fullWidth sx={acSx} inputProps={{ ...params.inputProps, style: { textAlign: "right", fontFamily: "var(--font-cairo)" } }} />}
          />
          {/* Linked POs for purchase type */}
          {editForm.expense_type === "purchase" && (
            <Autocomplete
              multiple
              options={purchases}
              getOptionLabel={(p: any) => `${p.code} — ${p.supplier?.name || ""}`}
              value={purchases.filter(p => (editForm.purchase_order_ids || []).includes(p.id))}
              onChange={(_, vals) => setEditForm({ ...editForm, purchase_order_ids: vals.map((p: any) => p.id) })}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              noOptionsText={<span style={{ fontFamily: "var(--font-cairo)", color: "#64748b" }}>لا توجد فواتير</span>}
              slotProps={{ paper: acPaperSx }}
              renderOption={(props, p) => renderOpt(props, `${p.code} — ${p.supplier?.name || ""}`)}
              renderTags={(vals, getTagProps) =>
                vals.map((p: any, i) => (
                  <Chip {...getTagProps({ index: i })} key={p.id} label={p.code}
                    size="small" sx={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontFamily: "monospace", fontSize: "11px" }} />
                ))
              }
              renderInput={(params) => <TextField {...params} label="الفواتير المرتبطة" fullWidth sx={acSx} inputProps={{ ...params.inputProps, style: { textAlign: "right", fontFamily: "var(--font-cairo)" } }} />}
            />
          )}
          <TextField label="البيان *" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} fullWidth sx={fieldSx} />
          <TextField label="المبلغ *" type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
            fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} />
          <DateField label="تاريخ المصروف" value={editForm.expense_date} onChange={v => setEditForm({ ...editForm, expense_date: v })} />
          {/* Payment */}
          <div style={{ display: "flex", gap: "8px", direction: "rtl" }}>
            {PAYMENT_STATUS.map(s => (
              <button key={s.value} onClick={() => setEditForm({ ...editForm, payment_status: s.value })}
                style={{ flex: 1, padding: "8px 4px", borderRadius: "10px", border: `2px solid ${editForm.payment_status === s.value ? s.color : "rgba(148,163,184,0.15)"}`, background: editForm.payment_status === s.value ? `${s.color}22` : "rgba(15,23,42,0.3)", color: editForm.payment_status === s.value ? s.color : "#64748b", fontFamily: "var(--font-cairo)", fontSize: "11px", cursor: "pointer", fontWeight: 600 }}>
                {s.label}
              </button>
            ))}
          </div>
          {editForm.payment_status !== "future" && (
            <>
              <TextField label="المبلغ المدفوع" type="number" value={editForm.paid_amount} onChange={e => setEditForm({ ...editForm, paid_amount: e.target.value })}
                fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} />
              <Autocomplete
                options={vaults}
                getOptionLabel={(v: any) => `${v.name} — ${fmt(Number(v.balance))} جنيه`}
                value={vaults.find(v => v.id === editForm.vault_id) || null}
                onChange={(_, val) => setEditForm({ ...editForm, vault_id: val?.id || "" })}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                noOptionsText={<span style={{ fontFamily: "var(--font-cairo)", color: "#64748b" }}>لا توجد خزن</span>}
                slotProps={{ paper: acPaperSx }}
                renderOption={(props, v) => renderOpt(props, `${v.name} — ${fmt(Number(v.balance))} جنيه`)}
                renderInput={(params) => <TextField {...params} label="الخزنة" fullWidth sx={acSx} inputProps={{ ...params.inputProps, style: { textAlign: "right", fontFamily: "var(--font-cairo)" } }} />}
              />
            </>
          )}
          <TextField label="ملاحظات" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} fullWidth sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleEdit} disabled={editSaving || !editForm.description || !editForm.amount} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)" }}>
            {editSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حفظ التعديلات"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
