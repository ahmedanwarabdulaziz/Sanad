"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useProject } from "../layout";
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Alert, IconButton, Chip,
  Select, MenuItem, FormControl, InputLabel,
} from "@mui/material";
import {
  AddOutlined, EditOutlined, DeleteOutline,
  PhoneOutlined, EmailOutlined, AddCircleOutline, RemoveCircleOutline,
  PersonOutlined, ReceiptLongOutlined, CloseOutlined, AccountBalanceWalletOutlined,
} from "@mui/icons-material";

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px", backgroundColor: "rgba(15,23,42,0.5)", color: "#e2e8f0", fontFamily: "var(--font-cairo)",
    "& fieldset": { borderColor: "rgba(148,163,184,0.15)" },
    "&:hover fieldset": { borderColor: "rgba(139,92,246,0.4)" },
    "&.Mui-focused fieldset": { borderColor: "#8b5cf6" },
  },
  "& .MuiInputLabel-root": { color: "#94a3b8", fontFamily: "var(--font-cairo)", "&.Mui-focused": { color: "#a78bfa" } },
  "& .MuiInputBase-input": { textAlign: "right" },
};

const dialogSx = {
  "& .MuiDialog-paper": {
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    border: "1px solid rgba(148,163,184,0.12)", borderRadius: "20px",
    color: "#e2e8f0", direction: "rtl" as const, minWidth: "min(520px, 94vw)", maxHeight: "90vh",
  },
};

const menuSx = {
  PaperProps: {
    sx: {
      background: "#1e293b", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "12px",
      "& .MuiMenuItem-root": { fontFamily: "var(--font-cairo)", color: "#e2e8f0", "&:hover": { background: "rgba(139,92,246,0.1)" } },
    },
  },
};

const ACCENT = "#8b5cf6";
const ACCENT_BG = "#7c3aed";

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const validatePhone = (p: string) => /^01[0125]\d{8}$/.test(p.replace(/\s/g, ""));

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Customer { id: string; name: string; phones: string[]; email?: string; notes?: string; }
interface Sale {
  id: string; code: string; sale_date: string;
  total_amount: number; paid_amount: number; payment_status: string;
  customer_id: string | null; customer_name?: string;
}
interface Vault { id: string; name: string; balance: number; }

const emptyForm = { name: "", phones: [""], email: "", notes: "" };

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function CustomersPage() {
  const { projectId } = useProject();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { if (!success) return; const t = setTimeout(() => setSuccess(null), 4000); return () => clearTimeout(t); }, [success]);
  useEffect(() => { if (!error) return; const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t); }, [error]);

  /* ── Fetch ── */
  const fetchAll = useCallback(async () => {
    try {
      const [cRes, sRes, vRes] = await Promise.all([
        fetch(`/api/erp-auth/projects/${projectId}/proj2-customers`),
        fetch(`/api/erp-auth/projects/${projectId}/proj2-sales`),
        fetch(`/api/erp-auth/projects/${projectId}/proj2-vaults`),
      ]);
      const [cData, sData, vData] = await Promise.all([cRes.json(), sRes.json(), vRes.json()]);
      setCustomers(cData.customers || []);
      setSales(sData.sales || []);
      setVaults(vData.vaults || []);
    } catch { setError("فشل في تحميل البيانات"); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Outstanding calculations (amount customer still owes) ── */
  const outstandingByCustomer = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach(s => {
      if (!s.customer_id) return;
      const remaining = s.total_amount - (s.paid_amount || 0);
      if (remaining > 0.001) {
        map[s.customer_id] = (map[s.customer_id] || 0) + remaining;
      }
    });
    return map;
  }, [sales]);

  const totalOutstanding = useMemo(() => Object.values(outstandingByCustomer).reduce((a, b) => a + b, 0), [outstandingByCustomer]);
  const customersWithDebt = useMemo(() => Object.keys(outstandingByCustomer).length, [outstandingByCustomer]);

  /* ── Contact form ── */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm, phones: [""] });
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const apiBase = `/api/erp-auth/projects/${projectId}/proj2-customers`;

  const openAdd = () => { setDialogMode("add"); setEditId(null); setForm({ ...emptyForm, phones: [""] }); setDialogOpen(true); };
  const openEdit = (c: Customer) => { setDialogMode("edit"); setEditId(c.id); setForm({ name: c.name, phones: c.phones?.length ? c.phones : [""], email: c.email || "", notes: c.notes || "" }); setDialogOpen(true); };
  const addPhone = () => setForm(f => ({ ...f, phones: [...f.phones, ""] }));
  const removePhone = (i: number) => setForm(f => ({ ...f, phones: f.phones.filter((_, j) => j !== i) }));
  const setPhone = (i: number, val: string) => setForm(f => ({ ...f, phones: f.phones.map((p, j) => j === i ? val : p) }));

  const handleSave = async () => {
    const invalid = form.phones.filter(p => p.trim() && !validatePhone(p.trim()));
    if (invalid.length) { setError("يوجد أرقام هاتف غير صحيحة"); return; }
    setSaving(true); setError(null);
    try {
      const url = dialogMode === "add" ? apiBase : `${apiBase}/${editId}`;
      const res = await fetch(url, { method: dialogMode === "add" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, phones: form.phones.filter(p => p.trim()) }) });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess(dialogMode === "add" ? "تم إضافة العميل" : "تم تعديل البيانات");
      setDialogOpen(false); fetchAll();
    } catch { setError("فشل الحفظ"); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSaving(true); setError(null);
    try {
      const res = await fetch(`${apiBase}/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم الحذف"); setDeleteOpen(false); setDeleteTarget(null); fetchAll();
    } catch { setError("فشل الحذف"); } finally { setDeleteSaving(false); }
  };

  /* ── Invoices drawer ── */
  const [invoiceCustomer, setInvoiceCustomer] = useState<Customer | null>(null);
  const customerSales = useMemo(() =>
    invoiceCustomer ? sales.filter(s => s.customer_id === invoiceCustomer.id && (s.total_amount - (s.paid_amount || 0)) > 0.001) : [],
    [invoiceCustomer, sales]
  );

  /* ── Pay single sale ── */
  const [payingSaleId, setPayingSaleId] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({ vault_id: "", amount: "", payment_date: new Date().toISOString().split("T")[0], notes: "" });
  const [payingSingle, setPayingSingle] = useState(false);

  const openPaySingle = (saleId: string, remaining: number) => {
    setPayingSaleId(saleId);
    setPayForm({ vault_id: vaults[0]?.id || "", amount: String(Math.round(remaining * 100) / 100), payment_date: new Date().toISOString().split("T")[0], notes: "" });
  };

  const handlePaySingle = async () => {
    if (!payingSaleId || !payForm.vault_id || !payForm.amount) return;
    setPayingSingle(true); setError(null);
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-sales/${payingSaleId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pay", vault_id: payForm.vault_id, amount: Number(payForm.amount), payment_date: payForm.payment_date, notes: payForm.notes }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم تسجيل الدفعة بنجاح"); setPayingSaleId(null);
      await fetchAll();
    } catch { setError("فشل السداد"); } finally { setPayingSingle(false); }
  };

  /* ── Pay all sales for this customer ── */
  const [payAllVault, setPayAllVault] = useState("");
  const [payAllDialogOpen, setPayAllDialogOpen] = useState(false);
  const [doingPayAll, setDoingPayAll] = useState(false);

  const openPayAll = () => { setPayAllVault(vaults[0]?.id || ""); setPayAllDialogOpen(true); };

  const handlePayAll = async () => {
    if (!payAllVault || !invoiceCustomer) return;
    setDoingPayAll(true); setError(null);
    try {
      for (const s of customerSales) {
        const remaining = s.total_amount - (s.paid_amount || 0);
        if (remaining <= 0.001) continue;
        const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-sales/${s.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "pay", vault_id: payAllVault, amount: remaining, payment_date: new Date().toISOString().split("T")[0] }),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error); setDoingPayAll(false); return; }
      }
      setSuccess("تم تحصيل جميع الفواتير بنجاح");
      setPayAllDialogOpen(false); setPayAllVault("");
      await fetchAll();
      setInvoiceCustomer(null);
    } catch { setError("فشل التحصيل"); } finally { setDoingPayAll(false); }
  };

  /* ─────────────────────────────────────── Render ─── */
  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>العملاء</h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0, fontFamily: "var(--font-cairo)" }}>إدارة بيانات العملاء والمبالغ المستحقة</p>
        </div>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={openAdd}
          sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_BG} 100%)`, whiteSpace: "nowrap" }}>
          إضافة عميل جديد
        </Button>
      </div>

      {/* Outstanding summary banner */}
      {!loading && totalOutstanding > 0 && (
        <div style={{ marginBottom: "20px", padding: "16px 20px", borderRadius: "16px", background: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(124,58,237,0.06) 100%)", border: "1px solid rgba(139,92,246,0.25)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(139,92,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <AccountBalanceWalletOutlined sx={{ color: "#a78bfa", fontSize: 20 }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>إجمالي المبالغ غير المحصّلة</p>
              <p style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#a78bfa", fontFamily: "var(--font-cairo)", direction: "ltr", textAlign: "right" }}>
                {fmt(totalOutstanding)} <span style={{ fontSize: "13px", fontWeight: 500, color: "#94a3b8" }}>ج.م</span>
              </p>
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#c4b5fd", fontFamily: "var(--font-cairo)" }}>{customersWithDebt}</p>
            <p style={{ margin: 0, fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>عميل لديه مستحقات</p>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontFamily: "var(--font-cairo)", direction: "rtl", textAlign: "right" }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#86efac", fontFamily: "var(--font-cairo)", direction: "rtl", textAlign: "right" }}>{success}</Alert>}

      {/* Customers list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}><CircularProgress sx={{ color: ACCENT }} /></div>
      ) : customers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", borderRadius: "20px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
          <p style={{ fontSize: "48px", margin: "0 0 12px" }}>🤝</p>
          <p style={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "16px" }}>لا يوجد عملاء بعد</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {customers.map((c) => {
            const outstanding = outstandingByCustomer[c.id] || 0;
            return (
              <div key={c.id} style={{ padding: "16px", borderRadius: "16px", background: "rgba(30,41,59,0.5)", border: outstanding > 0 ? "1px solid rgba(139,92,246,0.25)" : "1px solid rgba(148,163,184,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                      <PersonOutlined sx={{ fontSize: 16, color: ACCENT }} />
                      <span style={{ fontSize: "15px", fontWeight: 700, color: "#f1f5f9", fontFamily: "var(--font-cairo)" }}>{c.name}</span>
                      {outstanding > 0 && (
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#c4b5fd", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: "20px", padding: "2px 10px", fontFamily: "var(--font-cairo)", whiteSpace: "nowrap" }}>
                          مستحق {fmt(outstanding)} ج.م
                        </span>
                      )}
                    </div>
                    {c.phones?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "4px" }}>
                        {c.phones.map((ph, i) => ph && (
                          <a key={i} href={`tel:${ph}`} style={{ textDecoration: "none" }}>
                            <Chip icon={<PhoneOutlined sx={{ fontSize: 14, color: "#10b981 !important" }} />} label={ph} size="small"
                              sx={{ fontFamily: "var(--font-cairo)", fontSize: "12px", direction: "ltr", backgroundColor: "rgba(16,185,129,0.1)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)", cursor: "pointer", "&:hover": { backgroundColor: "rgba(16,185,129,0.2)" } }} />
                          </a>
                        ))}
                      </div>
                    )}
                    {c.email && <a href={`mailto:${c.email}`} style={{ textDecoration: "none", fontSize: "12px", color: "#60a5fa", fontFamily: "var(--font-cairo)" }}>{c.email}</a>}
                    {c.notes && <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0", fontFamily: "var(--font-cairo)" }}>{c.notes}</p>}
                  </div>

                  <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
                    <IconButton size="small" onClick={() => setInvoiceCustomer(c)}
                      sx={{ color: outstanding > 0 ? "#a78bfa" : "#475569", "&:hover": { background: outstanding > 0 ? "rgba(139,92,246,0.12)" : "rgba(71,85,105,0.15)" }, position: "relative" }}>
                      <ReceiptLongOutlined sx={{ fontSize: 18 }} />
                      {outstanding > 0 && (
                        <span style={{ position: "absolute", top: 2, left: 2, width: 8, height: 8, borderRadius: "50%", background: "#8b5cf6", border: "1.5px solid #0f172a" }} />
                      )}
                    </IconButton>
                    <IconButton size="small" onClick={() => openEdit(c)} sx={{ color: "#f59e0b", "&:hover": { background: "rgba(245,158,11,0.1)" } }}><EditOutlined sx={{ fontSize: 16 }} /></IconButton>
                    <IconButton size="small" onClick={() => { setDeleteTarget(c); setDeleteOpen(true); }} sx={{ color: "#64748b", "&:hover": { color: "#f87171", background: "rgba(248,113,113,0.1)" } }}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Invoices Drawer Dialog ─── */}
      <Dialog open={!!invoiceCustomer} onClose={() => { setInvoiceCustomer(null); setPayingSaleId(null); }} sx={{ "& .MuiDialog-paper": { ...dialogSx["& .MuiDialog-paper"], minWidth: "min(600px, 96vw)", maxWidth: "650px" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "18px", display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <span>فواتير: {invoiceCustomer?.name}</span>
          <IconButton onClick={() => { setInvoiceCustomer(null); setPayingSaleId(null); }} sx={{ color: "#64748b" }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "4px !important", pb: 1 }}>
          {customerSales.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p style={{ fontSize: "32px", margin: "0 0 8px" }}>✅</p>
              <p style={{ color: "#34d399", fontFamily: "var(--font-cairo)", fontSize: "15px", margin: 0 }}>لا توجد مبالغ مستحقة لهذا العميل</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Collect all button */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: "12px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                <div>
                  <span style={{ fontSize: "13px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>إجمالي المستحق: </span>
                  <span style={{ fontSize: "16px", fontWeight: 700, color: "#a78bfa", fontFamily: "var(--font-cairo)" }}>{fmt(outstandingByCustomer[invoiceCustomer?.id || ""] || 0)} ج.م</span>
                </div>
                <Button variant="contained" size="small" onClick={openPayAll}
                  sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "12px", textTransform: "none", background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_BG} 100%)`, whiteSpace: "nowrap" }}>
                  تحصيل الكل
                </Button>
              </div>

              {/* List of unpaid sales */}
              {customerSales.map(s => {
                const remaining = s.total_amount - (s.paid_amount || 0);
                const isPaying = payingSaleId === s.id;
                return (
                  <div key={s.id} style={{ borderRadius: "12px", background: "rgba(15,23,42,0.5)", border: "1px solid rgba(148,163,184,0.1)", overflow: "hidden" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", gap: "12px" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#38bdf8", fontFamily: "monospace" }}>{s.code}</span>
                          <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>{s.sale_date}</span>
                        </div>
                        <div style={{ display: "flex", gap: "12px", marginTop: "4px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>الإجمالي: <strong style={{ color: "#e2e8f0" }}>{fmt(s.total_amount)} ج.م</strong></span>
                          <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>تم تحصيل: <strong style={{ color: "#34d399" }}>{fmt(s.paid_amount || 0)} ج.م</strong></span>
                          <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>متبقي: <strong style={{ color: "#a78bfa" }}>{fmt(remaining)} ج.م</strong></span>
                        </div>
                      </div>
                      <Button variant="outlined" size="small" onClick={() => isPaying ? setPayingSaleId(null) : openPaySingle(s.id, remaining)}
                        sx={{ borderRadius: "8px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "12px", textTransform: "none", whiteSpace: "nowrap", flexShrink: 0, borderColor: isPaying ? "rgba(239,68,68,0.4)" : "rgba(139,92,246,0.4)", color: isPaying ? "#f87171" : "#a78bfa" }}>
                        {isPaying ? "إلغاء" : "تحصيل"}
                      </Button>
                    </div>

                    {/* Inline pay form */}
                    {isPaying && (
                      <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(148,163,184,0.1)", display: "flex", flexDirection: "column", gap: "10px", background: "rgba(139,92,246,0.04)" }}>
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                          <FormControl size="small" sx={{ ...fieldSx, flex: "1 1 160px" }}>
                            <InputLabel>الخزنة *</InputLabel>
                            <Select value={payForm.vault_id} onChange={e => setPayForm(f => ({ ...f, vault_id: e.target.value }))} label="الخزنة *" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
                              {vaults.map(v => <MenuItem key={v.id} value={v.id}>{v.name} ({fmt(v.balance)} ج.م)</MenuItem>)}
                            </Select>
                          </FormControl>
                          <TextField label="المبلغ *" size="small" type="number" value={payForm.amount}
                            onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                            sx={{ ...fieldSx, flex: "1 1 120px", "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} inputProps={{ dir: "ltr" }} />
                          <TextField label="التاريخ" size="small" type="date" value={payForm.payment_date}
                            onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))}
                            sx={{ ...fieldSx, flex: "1 1 140px", "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} inputProps={{ dir: "ltr" }} />
                        </div>
                        <TextField label="ملاحظات" size="small" value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} fullWidth sx={fieldSx} />
                        <div style={{ display: "flex", justifyContent: "flex-start" }}>
                          <Button variant="contained" size="small" disabled={payingSingle || !payForm.vault_id || !payForm.amount} onClick={handlePaySingle}
                            sx={{ borderRadius: "8px", fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "12px", textTransform: "none", background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_BG} 100%)` }}>
                            {payingSingle ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "تأكيد التحصيل"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Collect All Confirm Dialog ─── */}
      <Dialog open={payAllDialogOpen} onClose={() => setPayAllDialogOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "18px" }}>تحصيل جميع الفواتير</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <p style={{ margin: 0, color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "14px" }}>
            سيتم إضافة <strong style={{ color: "#a78bfa" }}>{fmt(outstandingByCustomer[invoiceCustomer?.id || ""] || 0)} ج.م</strong> إلى الخزنة المحددة وتحصيل جميع الفواتير المستحقة من <strong style={{ color: "#e2e8f0" }}>{invoiceCustomer?.name}</strong>.
          </p>
          <FormControl fullWidth required sx={fieldSx}>
            <InputLabel>الخزنة *</InputLabel>
            <Select value={payAllVault} onChange={e => setPayAllVault(e.target.value)} label="الخزنة *" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              {vaults.map(v => <MenuItem key={v.id} value={v.id}>{v.name} ({fmt(v.balance)} ج.م)</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setPayAllDialogOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handlePayAll} disabled={doingPayAll || !payAllVault} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 700, textTransform: "none", background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_BG} 100%)` }}>
            {doingPayAll ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "تأكيد التحصيل الكامل"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Add / Edit Dialog ─── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>
          {dialogMode === "add" ? "إضافة عميل جديد" : "تعديل البيانات"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <TextField label="الاسم *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} fullWidth required sx={fieldSx} />
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", margin: 0, fontFamily: "var(--font-cairo)" }}>📞 أرقام الهاتف</p>
              <IconButton size="small" onClick={addPhone} sx={{ color: "#10b981", "&:hover": { background: "rgba(16,185,129,0.1)" } }}><AddCircleOutline sx={{ fontSize: 18 }} /></IconButton>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {form.phones.map((phone, i) => (
                <div key={i}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <TextField value={phone} onChange={e => setPhone(i, e.target.value)} placeholder="01xxxxxxxxx" size="small" fullWidth
                      error={!!phone.trim() && !validatePhone(phone.trim())}
                      sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} inputProps={{ type: "tel", dir: "ltr" }} />
                    {form.phones.length > 1 && (
                      <IconButton size="small" onClick={() => removePhone(i)} sx={{ color: "#f87171", "&:hover": { background: "rgba(248,113,113,0.1)" } }}><RemoveCircleOutline sx={{ fontSize: 18 }} /></IconButton>
                    )}
                  </div>
                  {!!phone.trim() && !validatePhone(phone.trim()) && (
                    <p style={{ fontSize: "11px", color: "#ef4444", margin: "4px 0 0 4px", fontFamily: "var(--font-cairo)" }}>رقم غير صحيح — يبدأ بـ 010/011/012/015 ويكون 11 رقم</p>
                  )}
                </div>
              ))}
            </div>
          </div>
          <TextField label="البريد الإلكتروني" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} inputProps={{ type: "email", dir: "ltr" }} />
          <TextField label="ملاحظات" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} fullWidth multiline rows={3} sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleSave} disabled={saving || !form.name || form.phones.some(p => p.trim() && !validatePhone(p.trim()))} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_BG} 100%)` }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حفظ"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Delete Confirm ─── */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#f87171" }}>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <p style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", fontSize: "15px", margin: 0 }}>
            هل أنت متأكد من حذف <strong style={{ color: "#e2e8f0" }}>{deleteTarget?.name}</strong>؟
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
