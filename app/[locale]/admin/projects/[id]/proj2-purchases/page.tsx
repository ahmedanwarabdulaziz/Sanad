"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useProject } from "../layout";
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Alert, IconButton, Chip, Autocomplete,
  FormControl, InputLabel, Select, MenuItem, InputAdornment
} from "@mui/material";
import { AddOutlined, DeleteOutline, CheckCircleOutlined, PaymentsOutlined, AddCircleOutline, RemoveCircleOutline, EditOutlined, MoneyOffOutlined, CalendarMonthOutlined, AccountBalanceWalletOutlined, ReceiptLongOutlined, CloseOutlined } from "@mui/icons-material";

const fieldSx = {
  "& .MuiOutlinedInput-root": { borderRadius: "12px", backgroundColor: "rgba(15,23,42,0.5)", color: "#e2e8f0", fontFamily: "var(--font-cairo)", "& fieldset": { borderColor: "rgba(148,163,184,0.15)" }, "&:hover fieldset": { borderColor: "rgba(59,130,246,0.4)" }, "&.Mui-focused fieldset": { borderColor: "#3b82f6" } },
  "& .MuiInputLabel-root": { color: "#94a3b8", fontFamily: "var(--font-cairo)", "&.Mui-focused": { color: "#60a5fa" } },
  "& .MuiInputBase-input": { textAlign: "right" },
};
const acSx = {
  ...fieldSx,
  "& .MuiAutocomplete-popupIndicator": { color: "#64748b" },
  "& .MuiAutocomplete-clearIndicator": { color: "#64748b" },
};
const acPaperSx = { sx: { background: "#1e293b", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "12px", direction: "rtl" as const } };
const renderOpt = (props: any, label: React.ReactNode) => (
  <li {...props} style={{ fontFamily: "var(--font-cairo)", fontSize: "13px", color: "#e2e8f0", direction: "rtl", display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
    {label}
  </li>
);
const dialogSx = { "& .MuiDialog-paper": { background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "20px", color: "#e2e8f0", direction: "rtl" as const, minWidth: "min(560px, 94vw)", maxHeight: "90vh" } };
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

const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  unpaid: { label: "غير مدفوعة", color: "#64748b" },
  partial: { label: "مدفوعة جزئياً", color: "#f59e0b" },
  paid:    { label: "مدفوعة بالكامل", color: "#10b981" },
};
const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  ordered:  { label: "مطلوبة", color: "#3b82f6" },
  received: { label: "مستلمة", color: "#10b981" },
};

interface OrderItem { item_id: string; quantity: string; unit_price: string; }

export default function PurchasesPage() {
  const { projectId } = useProject();
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [vaults, setVaults] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { if (!success) return; const t = setTimeout(() => setSuccess(null), 4000); return () => clearTimeout(t); }, [success]);
  useEffect(() => { if (!error) return; const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t); }, [error]);

  // Add order dialog
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ supplier_id: "", notes: "", order_date: today() });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([{ item_id: "", quantity: "", unit_price: "" }]);
  const [saving, setSaving] = useState(false);

  // Pay dialog
  const [payOpen, setPayOpen] = useState(false);
  const [payOrder, setPayOrder] = useState<any>(null);
  const [payForm, setPayForm] = useState({ vault_id: "", amount: "", notes: "", payment_date: today() });

  // Pay expenses dialog
  const [payExpOpen, setPayExpOpen] = useState(false);
  const [payExpOrder, setPayExpOrder] = useState<any>(null);
  const [payExpForm, setPayExpForm] = useState({ vault_id: "", amount: "", notes: "", payment_date: fmtD(new Date().toISOString().split("T")[0]) });
  const [payExpMax, setPayExpMax] = useState(0);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  // Edit order
  const [editOpen, setEditOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<any>(null);
  const [editForm, setEditForm] = useState({ supplier_id: "", notes: "", order_date: "" });
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  // Add expense shortcut from PO
  const [expOpen, setExpOpen] = useState(false);
  const [expOrderIds, setExpOrderIds] = useState<string[]>([]);
  const [expForm, setExpForm] = useState({ description: "", amount: "", advance_amount: "", vault_id: "", payment_status: "immediate" });

  // Details drawer
  const [detailsOrder, setDetailsOrder] = useState<any>(null);

  // Period filter
  const [listPeriod, setListPeriod] = useState<"month" | "year" | "all">("month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");


  // Summary dialogs
  const [summaryOpen, setSummaryOpen] = useState<"orders" | "expenses" | null>(null);
  // Inline pay state for summary dialogs
  const [inlinePayOrderId, setInlinePayOrderId] = useState<string | null>(null);
  const [inlinePayForm, setInlinePayForm] = useState({ vault_id: "", amount: "", notes: "", payment_date: today() });
  const [inlinePayExpId, setInlinePayExpId] = useState<string | null>(null);
  const [inlinePayExpForm, setInlinePayExpForm] = useState({ vault_id: "", amount: "", notes: "", payment_date: today() });
  const [bulkPayForm, setBulkPayForm] = useState({ vault_id: "", notes: "", payment_date: today() });
  const [bulkSaving, setBulkSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    const [ordRes, supRes, itmRes, vltRes, expRes] = await Promise.all([
      fetch(`/api/erp-auth/projects/${projectId}/proj2-purchases`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-suppliers`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-items`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-vaults`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-expenses`),
    ]);
    const [od, sd, id, vd, ed] = await Promise.all([ordRes.json(), supRes.json(), itmRes.json(), vltRes.json(), expRes.json()]);
    setOrders(od.orders || []); setSuppliers(sd.suppliers || []); setItems(id.items || []); setVaults(vd.vaults || []);
    setExpenses(ed.expenses || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addItem = () => setOrderItems(p => [...p, { item_id: "", quantity: "", unit_price: "" }]);
  const removeItem = (i: number) => setOrderItems(p => p.filter((_, j) => j !== i));
  const setItem = (i: number, field: keyof OrderItem, val: string) => setOrderItems(p => p.map((it, j) => j === i ? { ...it, [field]: val } : it));

  const orderTotal = orderItems.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);

  const handleAdd = async () => {
    setSaving(true);
    const validItems = orderItems.filter(i => i.item_id && Number(i.quantity) > 0 && Number(i.unit_price) > 0);
    if (validItems.length === 0) { setError("أضف صنفاً واحداً على الأقل"); setSaving(false); return; }
    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-purchases`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, order_date: fmtD(form.order_date), items: validItems.map(i => ({ item_id: i.item_id, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })) }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); } else { setSuccess("تم إنشاء فاتورة الشراء"); setAddOpen(false); fetchAll(); }
    setSaving(false);
  };

  const handleReceive = async (order: any) => {
    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-purchases/${order.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "receive" }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); } else { setSuccess("تم تسجيل الاستلام وتحديث المخزن"); fetchAll(); }
  };

  const handlePay = async () => {
    setSaving(true);
    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-purchases/${payOrder.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pay", ...payForm, payment_date: fmtD(payForm.payment_date), amount: Number(payForm.amount) }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); } else { setSuccess("تم تسجيل الدفعة"); setPayOpen(false); fetchAll(); }
    setSaving(false);
  };

  const handlePayExpenses = async () => {
    setSaving(true);
    let remAmt = Number(payExpForm.amount);
    const linkedUnpaid = expenses.filter(e => e.expense_type === "purchase" && Array.isArray(e.purchase_order_ids) && e.purchase_order_ids.includes(payExpOrder.id) && Number(e.amount) > Number(e.paid_amount));
    for (const exp of linkedUnpaid) {
      if (remAmt <= 0) break;
      const unpaidForExp = Number(exp.amount) - Number(exp.paid_amount);
      const payForExp = Math.min(unpaidForExp, remAmt);
      const r = await fetch(`/api/erp-auth/projects/${projectId}/proj2-expenses/${exp.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vault_id: payExpForm.vault_id, amount: payForExp, notes: payExpForm.notes, payment_date: fmtD(payExpForm.payment_date) })
      });
      if (!r.ok) {
        const d = await r.json();
        setError(d.error);
        setSaving(false);
        return;
      }
      remAmt -= payForExp;
    }
    setSuccess("تم سداد المصاريف"); setPayExpOpen(false); fetchAll();
    setSaving(false);
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-purchases/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); setError(d.error); } else { setSuccess("تم الحذف"); setDeleteOpen(false); fetchAll(); }
  };

  const handleEdit = async () => {
    setEditSaving(true);
    const validItems = editItems.filter(i => i.item_id && Number(i.quantity) > 0 && Number(i.unit_price) > 0);
    if (validItems.length === 0) { setError("أضف صنفاً واحداً على الأقل"); setEditSaving(false); return; }
    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-purchases/${editOrder.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "edit", ...editForm, order_date: fmtD(editForm.order_date), items: validItems.map(i => ({ item_id: i.item_id, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })) }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); } else { setSuccess("تم تعديل الفاتورة"); setEditOpen(false); fetchAll(); }
    setEditSaving(false);
  };

  const handleAddExpenseForOrder = async () => {
    setEditSaving(true);
    const actualPaid = expForm.payment_status === "future" ? 0
      : expForm.payment_status === "advance" ? Number(expForm.advance_amount || 0)
      : Number(expForm.amount);
    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-expenses`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expense_type: "purchase", purchase_order_ids: expOrderIds,
        description: expForm.description, amount: Number(expForm.amount),
        payment_status: expForm.payment_status,
        paid_amount: actualPaid,
        vault_id: expForm.vault_id || null,
        expense_date: new Date().toISOString().split("T")[0],
      }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); } else { setSuccess("تم تسجيل المصروف"); setExpOpen(false); fetchAll(); }
    setEditSaving(false);
  };

  // ── Computed summaries (ALL orders, not filtered) ──────────────────────
  const allUnpaidOrders = orders.filter(o => Number(o.total_amount) > Number(o.paid_amount || 0));
  const totalUnpaidOrdersAmt = allUnpaidOrders.reduce((s, o) => s + Number(o.total_amount) - Number(o.paid_amount || 0), 0);

  const allUnpaidExpenses: any[] = [];
  orders.forEach(o => {
    expenses.filter(e => e.expense_type === "purchase" && Array.isArray(e.purchase_order_ids) && e.purchase_order_ids.includes(o.id))
      .forEach(e => { if (Number(e.amount) > Number(e.paid_amount || 0)) allUnpaidExpenses.push({ ...e, _order: o }); });
  });
  const totalUnpaidExpensesAmt = allUnpaidExpenses.reduce((s, e) => s + Number(e.amount) - Number(e.paid_amount || 0), 0);

  // ── Period-filtered order list ───────────────────────────────────────
  const now = new Date();
  const filteredOrders = orders.filter(o => {
    const raw = o.order_date || "";
    let d: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) d = new Date(raw);
    else { const [dd, mm, yy] = raw.split("-"); d = new Date(`${yy}-${mm}-${dd}`); }
    if (dateFrom && d < new Date(dateFrom)) return false;
    if (dateTo   && d > new Date(dateTo))   return false;
    if (dateFrom || dateTo) return true; // custom range overrides period
    if (listPeriod === "all") return true;
    if (listPeriod === "month") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    return d.getFullYear() === now.getFullYear();
  });


  // ── Bulk pay all unpaid orders ───────────────────────────────────────
  const handleBulkPayOrders = async () => {
    if (!bulkPayForm.vault_id) return;
    setBulkSaving(true);
    for (const o of allUnpaidOrders) {
      const rem = Number(o.total_amount) - Number(o.paid_amount || 0);
      if (rem <= 0) continue;
      await fetch(`/api/erp-auth/projects/${projectId}/proj2-purchases/${o.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pay", vault_id: bulkPayForm.vault_id, amount: rem, notes: bulkPayForm.notes, payment_date: fmtD(bulkPayForm.payment_date) }),
      });
    }
    setBulkSaving(false); setSummaryOpen(null); setSuccess("تم سداد جميع الفواتير"); fetchAll();
  };

  // ── Bulk pay all unpaid expenses ─────────────────────────────────────
  const handleBulkPayExpenses = async () => {
    if (!bulkPayForm.vault_id) return;
    setBulkSaving(true);
    for (const e of allUnpaidExpenses) {
      const rem = Number(e.amount) - Number(e.paid_amount || 0);
      if (rem <= 0) continue;
      await fetch(`/api/erp-auth/projects/${projectId}/proj2-expenses/${e.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vault_id: bulkPayForm.vault_id, amount: rem, notes: bulkPayForm.notes, payment_date: fmtD(bulkPayForm.payment_date) }),
      });
    }
    setBulkSaving(false); setSummaryOpen(null); setSuccess("تم سداد جميع المصاريف"); fetchAll();
  };

  // ── Inline pay a single order ────────────────────────────────────────
  const handleInlinePayOrder = async (orderId: string) => {
    if (!inlinePayForm.vault_id || !inlinePayForm.amount) return;
    setBulkSaving(true);
    await fetch(`/api/erp-auth/projects/${projectId}/proj2-purchases/${orderId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pay", ...inlinePayForm, payment_date: fmtD(inlinePayForm.payment_date), amount: Number(inlinePayForm.amount) }),
    });
    setBulkSaving(false); setInlinePayOrderId(null); setSuccess("تم تسجيل الدفعة"); fetchAll();
  };

  // ── Inline pay a single expense ──────────────────────────────────────
  const handleInlinePayExpense = async (expId: string) => {
    if (!inlinePayExpForm.vault_id || !inlinePayExpForm.amount) return;
    setBulkSaving(true);
    await fetch(`/api/erp-auth/projects/${projectId}/proj2-expenses/${expId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vault_id: inlinePayExpForm.vault_id, amount: Number(inlinePayExpForm.amount), notes: inlinePayExpForm.notes, payment_date: fmtD(inlinePayExpForm.payment_date) }),
    });
    setBulkSaving(false); setInlinePayExpId(null); setSuccess("تم سداد المصروف"); fetchAll();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>فواتير الشراء</h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0, fontFamily: "var(--font-cairo)" }}>إدارة طلبيات الشراء واستلام البضاعة</p>
        </div>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => { setForm({ supplier_id: "", notes: "", order_date: new Date().toISOString().split("T")[0] }); setOrderItems([{ item_id: "", quantity: "", unit_price: "" }]); setAddOpen(true); }}
          sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", whiteSpace: "nowrap" }}>
          فاتورة شراء جديدة
        </Button>
      </div>

      {/* ── Summary Banner ── */}
      {!loading && (totalUnpaidOrdersAmt > 0 || totalUnpaidExpensesAmt > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px", marginBottom: "18px" }}>
          {totalUnpaidOrdersAmt > 0 && (
            <button onClick={() => { setBulkPayForm({ vault_id: "", notes: "", payment_date: today() }); setSummaryOpen("orders"); }}
              style={{ padding: "14px 18px", borderRadius: "16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer", textAlign: "right", direction: "rtl" }}>
              <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)", fontWeight: 600 }}>📤 مبالغ فواتير غير مسددة</p>
              <p style={{ margin: "0 0 2px", fontSize: "20px", fontWeight: 800, color: "#f87171", fontFamily: "var(--font-cairo)" }}>{fmt(totalUnpaidOrdersAmt)} <span style={{ fontSize: "11px", fontWeight: 400, color: "#475569" }}>ج.م</span></p>
              <p style={{ margin: 0, fontSize: "10px", color: "#ef4444", fontFamily: "var(--font-cairo)" }}>{allUnpaidOrders.length} فاتورة — اضغط للعرض والسداد</p>
            </button>
          )}
          {totalUnpaidExpensesAmt > 0 && (
            <button onClick={() => { setBulkPayForm({ vault_id: "", notes: "", payment_date: today() }); setSummaryOpen("expenses"); }}
              style={{ padding: "14px 18px", borderRadius: "16px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", cursor: "pointer", textAlign: "right", direction: "rtl" }}>
              <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)", fontWeight: 600 }}>🧾 مصاريف غير مسددة</p>
              <p style={{ margin: "0 0 2px", fontSize: "20px", fontWeight: 800, color: "#f59e0b", fontFamily: "var(--font-cairo)" }}>{fmt(totalUnpaidExpensesAmt)} <span style={{ fontSize: "11px", fontWeight: 400, color: "#475569" }}>ج.م</span></p>
              <p style={{ margin: 0, fontSize: "10px", color: "#d97706", fontFamily: "var(--font-cairo)" }}>{allUnpaidExpenses.length} مصروف — اضغط للعرض والسداد</p>
            </button>
          )}
        </div>
      )}

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontFamily: "var(--font-cairo)", direction: "rtl", textAlign: "right" }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#86efac", fontFamily: "var(--font-cairo)", direction: "rtl", textAlign: "right" }}>{success}</Alert>}

      {/* ── Period filter pills ── */}
      {!loading && orders.length > 0 && (
        <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Period pills — dimmed when custom range active */}
          {(["month", "year", "all"] as const).map(p => (
            <button key={p} onClick={() => { setListPeriod(p); setDateFrom(""); setDateTo(""); }}
              style={{ padding: "5px 16px", borderRadius: "20px", fontSize: "12px", fontFamily: "var(--font-cairo)", cursor: "pointer", border: "none", fontWeight: 600, transition: "all 0.15s",
                background: listPeriod === p && !dateFrom && !dateTo ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(30,41,59,0.8)",
                color: listPeriod === p && !dateFrom && !dateTo ? "#fff" : "#94a3b8",
                outline: listPeriod === p && !dateFrom && !dateTo ? "none" : "1px solid rgba(148,163,184,0.15)" }}>
              {p === "month" ? "الشهر الحالي" : p === "year" ? "السنة الحالية" : "الكل"}
            </button>
          ))}
          {/* Date range inputs */}
          <div style={{ display: "flex", gap: "4px", alignItems: "center", background: (dateFrom || dateTo) ? "rgba(245,158,11,0.12)" : "rgba(30,41,59,0.6)", borderRadius: "12px", padding: "3px 8px", outline: (dateFrom || dateTo) ? "1px solid rgba(245,158,11,0.35)" : "1px solid rgba(148,163,184,0.12)" }}>
            <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)", whiteSpace: "nowrap" }}>من</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "12px", fontFamily: "monospace", width: "120px", cursor: "pointer", colorScheme: "dark" }} />
            <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)", whiteSpace: "nowrap" }}>إلى</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "12px", fontFamily: "monospace", width: "120px", cursor: "pointer", colorScheme: "dark" }} />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }} title="مسح التواريخ"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", fontSize: "14px", lineHeight: 1, padding: "0 2px" }}>✕</button>
            )}
          </div>
          <span style={{ fontSize: "11px", color: "#475569", fontFamily: "var(--font-cairo)", marginRight: "4px" }}>{filteredOrders.length} فاتورة</span>
        </div>
      )}

      {loading ? <div style={{ textAlign: "center", padding: "60px 0" }}><CircularProgress sx={{ color: "#f59e0b" }} /></div>
        : filteredOrders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", borderRadius: "20px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
            <p style={{ fontSize: "48px", margin: "0 0 12px" }}>🛒</p>
            <p style={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "16px" }}>{orders.length === 0 ? "لا توجد فواتير شراء بعد" : "لا توجد فواتير في هذه الفترة"}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredOrders.map(order => {
              const linkedExpenses = expenses.filter(e =>
                e.expense_type === "purchase" &&
                Array.isArray(e.purchase_order_ids) &&
                e.purchase_order_ids.includes(order.id)
              );
              const expTotal = linkedExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
              const expPaid  = linkedExpenses.reduce((s: number, e: any) => s + Number(e.paid_amount), 0);
              const expRemaining = expTotal - expPaid;
              const remaining = Number(order.total_amount) - Number(order.paid_amount || 0);
              const ps  = PAYMENT_STATUS[order.payment_status] || PAYMENT_STATUS.unpaid;
              const os  = ORDER_STATUS[order.status]    || ORDER_STATUS.ordered;
              return (
                <div key={order.id} style={{ padding: "14px 16px", borderRadius: "16px", background: "rgba(30,41,59,0.5)", border: `1px solid ${remaining > 0 ? "rgba(245,158,11,0.2)" : "rgba(148,163,184,0.08)"}` }}>
                  {/* ── Row 1: code + supplier + status chips ── */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#60a5fa", fontFamily: "monospace", background: "rgba(59,130,246,0.1)", padding: "2px 8px", borderRadius: "8px", whiteSpace: "nowrap" }}>{order.code}</span>
                    {order.lot_id && <span style={{ fontSize: "10px", fontWeight: 700, color: "#a78bfa", background: "rgba(139,92,246,0.15)", padding: "2px 7px", borderRadius: "6px", whiteSpace: "nowrap", border: "1px solid rgba(139,92,246,0.3)" }}>📦 لوت</span>}
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9", fontFamily: "var(--font-cairo)", flex: 1, minWidth: 0 }}>{order.supplier?.name || "—"}</span>
                    <Chip label={os.label} size="small" sx={{ background: `${os.color}22`, color: os.color, fontFamily: "var(--font-cairo)", fontSize: "11px", height: 20 }} />
                    <Chip label={ps.label} size="small" sx={{ background: `${ps.color}22`, color: ps.color, fontFamily: "var(--font-cairo)", fontSize: "11px", height: 20 }} />
                  </div>

                  {/* ── Row 2: date + amounts + actions ── */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    {/* Amounts */}
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", flex: 1, alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)", whiteSpace: "nowrap" }}>{order.order_date}</span>
                      <span style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: "#94a3b8", whiteSpace: "nowrap" }}>الإجمالي: <strong style={{ color: "#f1f5f9" }}>{fmt(order.total_amount)}</strong> ج.م</span>
                      {Number(order.paid_amount) > 0 && <span style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: "#10b981", whiteSpace: "nowrap" }}>مدفوع: <strong>{fmt(order.paid_amount)}</strong></span>}
                      {remaining > 0 && <span style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: "#f87171", whiteSpace: "nowrap" }}>متبقي: <strong>{fmt(remaining)}</strong></span>}
                      {expTotal > 0 && <span style={{ fontSize: "12px", color: "#f59e0b", fontFamily: "var(--font-cairo)", whiteSpace: "nowrap" }}>مصاريف: {fmt(expTotal)}</span>}
                      {expRemaining > 0 && <span style={{ fontSize: "12px", color: "#f87171", fontFamily: "var(--font-cairo)", whiteSpace: "nowrap", fontWeight: 700 }}>مصاريف متبقية: {fmt(expRemaining)}</span>}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: "2px", flexShrink: 0, alignItems: "center" }}>
                      {/* Details icon */}
                      <IconButton size="small" title="تفاصيل الفاتورة" onClick={() => setDetailsOrder(order)}
                        sx={{ color: "#38bdf8", "&:hover": { background: "rgba(56,189,248,0.1)" } }}>
                        <ReceiptLongOutlined sx={{ fontSize: 17 }} />
                      </IconButton>
                      {order.status === "ordered" && (
                        <IconButton size="small" title="تسجيل الاستلام" onClick={() => handleReceive(order)}
                          sx={{ color: "#10b981", "&:hover": { background: "rgba(16,185,129,0.1)" } }}>
                          <CheckCircleOutlined sx={{ fontSize: 17 }} />
                        </IconButton>
                      )}
                      {order.payment_status !== "paid" && (
                        <IconButton size="small" title="تسجيل دفعة" onClick={() => { setPayOrder(order); setPayForm({ vault_id: "", amount: "", notes: "", payment_date: today() }); setPayOpen(true); }}
                          sx={{ color: "#f59e0b", "&:hover": { background: "rgba(245,158,11,0.1)" } }}>
                          <PaymentsOutlined sx={{ fontSize: 17 }} />
                        </IconButton>
                      )}
                      <IconButton size="small" title="تعديل الفاتورة"
                        onClick={() => { setEditOrder(order); setEditForm({ supplier_id: order.supplier_id || "", notes: order.notes || "", order_date: fmtD(order.order_date || "") }); setEditItems((order.items || []).map((i: any) => ({ item_id: i.item_id, quantity: String(i.quantity), unit_price: String(i.unit_price) }))); setEditOpen(true); }}
                        sx={{ color: "#60a5fa", "&:hover": { background: "rgba(59,130,246,0.1)" } }}>
                        <EditOutlined sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton size="small" title="إضافة مصروف"
                        onClick={() => { setExpOrderIds([order.id]); setExpForm({ description: "", amount: "", advance_amount: "", vault_id: "", payment_status: "immediate" }); setExpOpen(true); }}
                        sx={{ color: "#c084fc", "&:hover": { background: "rgba(192,132,252,0.1)" } }}>
                        <MoneyOffOutlined sx={{ fontSize: 16 }} />
                      </IconButton>
                      {expRemaining > 0 && (
                        <IconButton size="small" title="سداد المصاريف" onClick={() => { setPayExpOrder(order); setPayExpMax(expRemaining); setPayExpForm({ vault_id: "", amount: String(expRemaining), notes: "", payment_date: fmtD(new Date().toISOString().split("T")[0]) }); setPayExpOpen(true); }}
                          sx={{ color: "#a78bfa", "&:hover": { background: "rgba(167,139,250,0.1)" } }}>
                          <AccountBalanceWalletOutlined sx={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                      <IconButton size="small" onClick={() => { setDeleteTarget(order); setDeleteOpen(true); }}
                        sx={{ color: "#64748b", "&:hover": { color: "#f87171", background: "rgba(248,113,113,0.1)" } }}>
                        <DeleteOutline sx={{ fontSize: 16 }} />
                      </IconButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* Add Order Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>فاتورة شراء جديدة</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <Autocomplete
            options={suppliers}
            getOptionLabel={(s: any) => s.name || ""}
            value={suppliers.find(s => s.id === form.supplier_id) || null}
            onChange={(_, val) => setForm({ ...form, supplier_id: val?.id || "" })}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            noOptionsText={<span style={{ fontFamily: "var(--font-cairo)", color: "#64748b" }}>لا يوجد نتائج</span>}
            slotProps={{ paper: acPaperSx }}
            renderOption={(props, s) => renderOpt(props, s.name)}
            renderInput={(params) => (
              <TextField {...params} label="المورد" fullWidth sx={acSx}
                inputProps={{ ...params.inputProps, style: { textAlign: "right", fontFamily: "var(--font-cairo)" } }}
              />
            )}
          />
          <DateField label="تاريخ الطلبية" value={form.order_date} onChange={v => setForm({ ...form, order_date: v })} />

          {/* Items */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", direction: "rtl" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", margin: 0, fontFamily: "var(--font-cairo)" }}>الأصناف *</p>
              <IconButton size="small" onClick={addItem} sx={{ color: "#3b82f6", "&:hover": { background: "rgba(59,130,246,0.1)" } }}><AddCircleOutline sx={{ fontSize: 18 }} /></IconButton>
            </div>
            {orderItems.map((it, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "8px", marginBottom: "8px", alignItems: "center", direction: "rtl" }}>
                <Autocomplete
                  options={items}
                  getOptionLabel={(itm: any) => itm.unit ? `${itm.name} — ${itm.unit}` : itm.name || ""}
                  value={items.find(itm => itm.id === it.item_id) || null}
                  onChange={(_, val) => setItem(i, "item_id", val?.id || "")}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  noOptionsText={<span style={{ fontFamily: "var(--font-cairo)", color: "#64748b" }}>لا يوجد</span>}
                  slotProps={{ paper: acPaperSx }}
                  renderOption={(props, itm) => renderOpt(props, <>{itm.name} {itm.unit && <span style={{ color: "#64748b", fontSize: "12px", marginRight: "4px" }}>({itm.unit})</span>} <span style={{ color: "#10b981", fontSize: "11px", background: "rgba(16,185,129,0.1)", padding: "2px 8px", borderRadius: "8px", marginRight: "auto", fontWeight: 700 }}>متوفر: {fmt(itm.stock_quantity || 0)}</span></>)}
                  renderInput={(params) => (
                    <TextField {...params} placeholder="الصنف" size="small" sx={acSx}
                      inputProps={{ ...params.inputProps, style: { textAlign: "right", fontFamily: "var(--font-cairo)", fontSize: "13px" } }}
                    />
                  )}
                />
                <TextField size="small" placeholder="الكمية" type="number" value={it.quantity} onChange={e => setItem(i, "quantity", e.target.value)} sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "center" } }} />
                <TextField size="small" placeholder="السعر" type="number" value={it.unit_price} onChange={e => setItem(i, "unit_price", e.target.value)} sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "center" } }} />
                {orderItems.length > 1 && <IconButton size="small" onClick={() => removeItem(i)} sx={{ color: "#f87171" }}><RemoveCircleOutline sx={{ fontSize: 18 }} /></IconButton>}
              </div>
            ))}
            {orderTotal > 0 && <p style={{ fontSize: "13px", fontWeight: 700, color: "#60a5fa", fontFamily: "var(--font-cairo)", margin: "8px 0 0", textAlign: "left" }}>الإجمالي: {fmt(orderTotal)} جنيه</p>}
          </div>
          <TextField label="ملاحظات" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} fullWidth multiline rows={2} sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setAddOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleAdd} disabled={saving} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "إنشاء الفاتورة"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={payOpen} onClose={() => setPayOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>تسجيل دفعة — {payOrder?.code}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <p style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", fontSize: "13px", margin: 0 }}>المتبقي: <strong style={{ color: "#f87171" }}>{payOrder ? fmt(payOrder.total_amount - payOrder.paid_amount) : 0} جنيه</strong></p>
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
          <TextField label="المبلغ *" type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} />
          <DateField label="تاريخ الدفع" value={payForm.payment_date} onChange={v => setPayForm({ ...payForm, payment_date: v })} />
          <TextField label="ملاحظات" value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} fullWidth sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setPayOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handlePay} disabled={saving || !payForm.vault_id || !payForm.amount} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "تسجيل الدفعة"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} sx={{ "& .MuiDialog-paper": { background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "20px", color: "#e2e8f0", direction: "rtl" as const, minWidth: "min(400px, 94vw)" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#f87171" }}>حذف الفاتورة</DialogTitle>
        <DialogContent><p style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", fontSize: "15px", margin: 0 }}>هل تريد حذف <strong style={{ color: "#e2e8f0" }}>{deleteTarget?.code}</strong>?</p></DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleDelete} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "#dc2626" }}>حذف</Button>
        </DialogActions>
      </Dialog>

      {/* Pay Expenses Dialog */}
      <Dialog open={payExpOpen} onClose={() => setPayExpOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#c084fc" }}>سداد مصاريف — {payExpOrder?.code}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <p style={{ margin: 0, fontFamily: "var(--font-cairo)", fontSize: "14px", color: "#94a3b8" }}>
            متبقي المصاريف: <strong style={{ color: "#c084fc" }}>{fmt(payExpMax)} جنيه</strong>
          </p>
          <TextField label="المبلغ *" type="number" value={payExpForm.amount} onChange={e => setPayExpForm({ ...payExpForm, amount: e.target.value })} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} />
          <Autocomplete options={vaults} getOptionLabel={(v: any) => `${v.name} — ${fmt(Number(v.balance))} جنيه`}
            value={vaults.find(v => v.id === payExpForm.vault_id) || null} onChange={(_, val) => setPayExpForm({ ...payExpForm, vault_id: val?.id || "" })}
            isOptionEqualToValue={(a, b) => a.id === b.id} noOptionsText={<span style={{ fontFamily: "var(--font-cairo)", color: "#64748b" }}>لا توجد خزن</span>}
            slotProps={{ paper: acPaperSx }} renderOption={(props, v) => renderOpt(props, `${v.name} — ${fmt(Number(v.balance))} جنيه`)}
            renderInput={p => <TextField {...p} label="الدفع من *" fullWidth sx={fieldSx} inputProps={{ ...p.inputProps, style: { textAlign: "right", fontFamily: "var(--font-cairo)" } }} />} />
          <DateField label="تاريخ الدفع" value={payExpForm.payment_date} onChange={v => setPayExpForm({ ...payExpForm, payment_date: v })} />
          <TextField label="ملاحظات" value={payExpForm.notes} onChange={e => setPayExpForm({ ...payExpForm, notes: e.target.value })} fullWidth sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setPayExpOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handlePayExpenses} disabled={saving || !payExpForm.amount || !payExpForm.vault_id} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #c084fc 0%, #a855f7 100%)" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "تسجيل الدفعة"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>
          تعديل فاتورة — {editOrder?.code}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <Autocomplete
            options={suppliers}
            getOptionLabel={(s: any) => s.name || ""}
            value={suppliers.find(s => s.id === editForm.supplier_id) || null}
            onChange={(_, val) => setEditForm({ ...editForm, supplier_id: val?.id || "" })}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            noOptionsText={<span style={{ fontFamily: "var(--font-cairo)", color: "#64748b" }}>لا يوجد موردون</span>}
            slotProps={{ paper: acPaperSx }}
            renderOption={(props, s) => renderOpt(props, s.name)}
            renderInput={(params) => <TextField {...params} label="المورد *" fullWidth sx={acSx} inputProps={{ ...params.inputProps, style: { textAlign: "right", fontFamily: "var(--font-cairo)" } }} />}
          />
          <DateField label="تاريخ الفاتورة" value={editForm.order_date} onChange={v => setEditForm({ ...editForm, order_date: v })} />

          {/* Items */}
          <div style={{ direction: "rtl" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>الأصناف</span>
              <IconButton size="small" onClick={() => setEditItems(p => [...p, { item_id: "", quantity: "", unit_price: "" }])} sx={{ color: "#10b981" }}><AddCircleOutline sx={{ fontSize: 18 }} /></IconButton>
            </div>
            {editItems.map((it, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                <Autocomplete
                  options={items}
                  getOptionLabel={(it: any) => it.name || ""}
                  value={items.find((oi: any) => oi.id === it.item_id) || null}
                  onChange={(_, val) => setEditItems(p => p.map((x, j) => j === i ? { ...x, item_id: val?.id || "" } : x))}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  noOptionsText={<span style={{ fontFamily: "var(--font-cairo)", color: "#64748b" }}>لا يوجد</span>}
                  slotProps={{ paper: acPaperSx }}
                  renderOption={(props, it) => renderOpt(props, <>{it.name} <span style={{ color: "#10b981", fontSize: "11px", background: "rgba(16,185,129,0.1)", padding: "2px 8px", borderRadius: "8px", marginRight: "auto", fontWeight: 700 }}>متوفر: {fmt(it.stock_quantity || 0)}</span></>)}
                  renderInput={(params) => <TextField {...params} placeholder="الصنف" size="small" sx={acSx} inputProps={{ ...params.inputProps, style: { textAlign: "right", fontFamily: "var(--font-cairo)", fontSize: "13px" } }} />}
                />
                <TextField placeholder="كمية" size="small" type="number" value={it.quantity} onChange={e => setEditItems(p => p.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} sx={{ ...fieldSx, width: 80, "& .MuiInputBase-input": { textAlign: "center" } }} />
                <TextField placeholder="سعر" size="small" type="number" value={it.unit_price} onChange={e => setEditItems(p => p.map((x, j) => j === i ? { ...x, unit_price: e.target.value } : x))} sx={{ ...fieldSx, width: 90, "& .MuiInputBase-input": { textAlign: "center" } }} />
                <IconButton size="small" onClick={() => setEditItems(p => p.filter((_, j) => j !== i))} sx={{ color: "#f87171" }}><RemoveCircleOutline sx={{ fontSize: 18 }} /></IconButton>
              </div>
            ))}
            <p style={{ margin: "8px 0 0", fontSize: "14px", fontWeight: 700, color: "#f1f5f9", fontFamily: "var(--font-cairo)", textAlign: "left" }}>
              الإجمالي: {fmt(editItems.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0))} جنيه
            </p>
          </div>
          <TextField label="ملاحظات" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} fullWidth sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleEdit} disabled={editSaving || !editForm.supplier_id} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)" }}>
            {editSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حفظ التعديلات"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Expense for PO Dialog */}
      <Dialog open={expOpen} onClose={() => setExpOpen(false)} sx={{ "& .MuiDialog-paper": { ...dialogSx["& .MuiDialog-paper"], minWidth: "min(440px, 94vw)" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#f59e0b" }}>
          إضافة مصروف للفاتورة
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          {/* Multi-PO selector */}
          <Autocomplete
            multiple
            options={orders}
            getOptionLabel={(o: any) => `${o.code} — ${o.supplier?.name || ""}`}
            value={orders.filter(o => expOrderIds.includes(o.id))}
            onChange={(_, vals) => setExpOrderIds(vals.map((o: any) => o.id))}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            noOptionsText={<span style={{ fontFamily: "var(--font-cairo)", color: "#64748b" }}>لا توجد فواتير</span>}
            slotProps={{ paper: acPaperSx }}
            renderOption={(props, o) => renderOpt(props, `${o.code} — ${o.supplier?.name || ""}`)}
            renderTags={(vals, getTagProps) =>
              vals.map((o: any, i) => (
                <Chip {...getTagProps({ index: i })} key={o.id} label={o.code}
                  size="small" sx={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontFamily: "monospace", fontSize: "11px" }} />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} label="الفواتير المرتبطة" fullWidth sx={acSx}
                inputProps={{ ...params.inputProps, style: { textAlign: "right", fontFamily: "var(--font-cairo)" } }}
              />
            )}
          />
          <TextField label="البيان *" value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} fullWidth sx={fieldSx} />
          <TextField label="المبلغ الإجمالي *" type="number" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })}
            fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} />
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>حالة السداد</InputLabel>
            <Select value={expForm.payment_status} onChange={e => setExpForm({ ...expForm, payment_status: e.target.value, advance_amount: "" })} label="حالة السداد" sx={{ color: "#e2e8f0" }}
              MenuProps={{ PaperProps: { sx: { background: "#1e293b", borderRadius: "12px", "& .MuiMenuItem-root": { fontFamily: "var(--font-cairo)", color: "#e2e8f0", "&:hover": { background: "rgba(59,130,246,0.1)" } } } } }}>
              <MenuItem value="immediate">دفع فوري</MenuItem>
              <MenuItem value="advance">عربون</MenuItem>
              <MenuItem value="future">دفع مستقبلي</MenuItem>
            </Select>
          </FormControl>
          {expForm.payment_status === "advance" && (
            <TextField label="مبلغ العربون *" type="number" value={expForm.advance_amount}
              onChange={e => setExpForm({ ...expForm, advance_amount: e.target.value })}
              fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} />
          )}
          {expForm.payment_status !== "future" && (
            <Autocomplete
              options={vaults}
              getOptionLabel={(v: any) => `${v.name} — ${fmt(Number(v.balance))} جنيه`}
              value={vaults.find(v => v.id === expForm.vault_id) || null}
              onChange={(_, val) => setExpForm({ ...expForm, vault_id: val?.id || "" })}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              noOptionsText={<span style={{ fontFamily: "var(--font-cairo)", color: "#64748b" }}>لا توجد خزن</span>}
              slotProps={{ paper: acPaperSx }}
              renderOption={(props, v) => renderOpt(props, `${v.name} — ${fmt(Number(v.balance))} جنيه`)}
              renderInput={(params) => <TextField {...params} label="الدفع من" fullWidth sx={acSx} inputProps={{ ...params.inputProps, style: { textAlign: "right", fontFamily: "var(--font-cairo)" } }} />}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setExpOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleAddExpenseForOrder} disabled={editSaving || !expForm.description || !expForm.amount} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}>
            {editSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "تسجيل المصروف"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* ─── Invoice Details Dialog ─── */}
      <Dialog open={!!detailsOrder} onClose={() => setDetailsOrder(null)}
        sx={{ "& .MuiDialog-paper": { ...dialogSx["& .MuiDialog-paper"], minWidth: "min(580px, 96vw)", maxWidth: "640px" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "18px", display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <span>تفاصيل الفاتورة — <span style={{ color: "#60a5fa", fontFamily: "monospace" }}>{detailsOrder?.code}</span></span>
          <IconButton onClick={() => setDetailsOrder(null)} sx={{ color: "#64748b" }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "4px !important", pb: 2 }}>
          {detailsOrder && (() => {
            const linkedExp = expenses.filter(e => e.expense_type === "purchase" && Array.isArray(e.purchase_order_ids) && e.purchase_order_ids.includes(detailsOrder.id));
            const expTotal = linkedExp.reduce((s: number, e: any) => s + Number(e.amount), 0);
            const grandTotal = Number(detailsOrder.total_amount) + expTotal;
            const remaining = Number(detailsOrder.total_amount) - Number(detailsOrder.paid_amount || 0);
            const ps = PAYMENT_STATUS[detailsOrder.payment_status] || PAYMENT_STATUS.unpaid;
            const os = ORDER_STATUS[detailsOrder.status] || ORDER_STATUS.ordered;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", direction: "rtl" }}>
                {/* Meta */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>المورد: <strong style={{ color: "#f1f5f9" }}>{detailsOrder.supplier?.name || "—"}</strong></span>
                  <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>التاريخ: <strong style={{ color: "#f1f5f9" }}>{detailsOrder.order_date}</strong></span>
                  <Chip label={os.label} size="small" sx={{ background: `${os.color}22`, color: os.color, fontFamily: "var(--font-cairo)", fontSize: "11px", height: 20 }} />
                  <Chip label={ps.label} size="small" sx={{ background: `${ps.color}22`, color: ps.color, fontFamily: "var(--font-cairo)", fontSize: "11px", height: 20 }} />
                </div>

                {/* Items table */}
                <div>
                  <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 700, color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>📦 الأصناف</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {(detailsOrder.items || []).map((it: any, i: number) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: "10px", background: "rgba(15,23,42,0.5)", gap: "12px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "13px", color: "#e2e8f0", fontFamily: "var(--font-cairo)", flex: 1 }}>{it.item?.name || "—"} {it.item?.unit && <span style={{ color: "#64748b", fontSize: "11px" }}>({it.item.unit})</span>}</span>
                        <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "var(--font-cairo)", whiteSpace: "nowrap" }}>{it.quantity} × {fmt(it.unit_price)} ج.م</span>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#60a5fa", fontFamily: "monospace", whiteSpace: "nowrap" }}>{fmt(Number(it.quantity) * Number(it.unit_price))} ج.م</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div style={{ padding: "12px 14px", borderRadius: "12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: "#94a3b8" }}>الإجمالي: <strong style={{ color: "#f1f5f9" }}>{fmt(detailsOrder.total_amount)} ج.م</strong></span>
                  <span style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: "#10b981" }}>مدفوع: <strong>{fmt(detailsOrder.paid_amount || 0)} ج.م</strong></span>
                  {remaining > 0 && <span style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: "#f87171" }}>متبقي: <strong>{fmt(remaining)} ج.م</strong></span>}
                  {expTotal > 0 && <span style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: "#f59e0b" }}>مصاريف: <strong>{fmt(expTotal)} ج.م</strong></span>}
                  {expTotal > 0 && <span style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: "#c084fc", fontWeight: 700 }}>التكلفة الكاملة: {fmt(grandTotal)} ج.م</span>}
                </div>

                {/* Payments */}
                {detailsOrder.payments?.length > 0 && (
                  <div>
                    <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 700, color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>💳 الدفعات</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      {detailsOrder.payments.map((p: any, i: number) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 12px", borderRadius: "10px", background: "rgba(59,130,246,0.07)", flexWrap: "wrap", gap: "8px" }}>
                          <span style={{ fontSize: "12px", color: "#60a5fa", fontFamily: "var(--font-cairo)" }}>{p.vault?.name || "—"}</span>
                          <span style={{ fontSize: "11px", color: "#475569", fontFamily: "var(--font-cairo)" }}>{p.payment_date}</span>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#34d399", fontFamily: "monospace" }}>{fmt(p.amount)} ج.م</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Linked expenses */}
                {linkedExp.length > 0 && (
                  <div>
                    <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 700, color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>🧾 المصاريف المرتبطة</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      {linkedExp.map((e: any, i: number) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 12px", borderRadius: "10px", background: "rgba(245,158,11,0.06)", flexWrap: "wrap", gap: "8px" }}>
                          <span style={{ fontSize: "12px", color: "#e2e8f0", fontFamily: "var(--font-cairo)", flex: 1 }}>{e.description}</span>
                          <span style={{ fontSize: "11px", color: Number(e.paid_amount) >= Number(e.amount) ? "#34d399" : "#f59e0b", fontFamily: "var(--font-cairo)", whiteSpace: "nowrap" }}>
                            {fmt(e.paid_amount)} / {fmt(e.amount)} ج.م
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detailsOrder.notes && (
                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b", fontFamily: "var(--font-cairo)", borderTop: "1px solid rgba(148,163,184,0.1)", paddingTop: "12px" }}>{detailsOrder.notes}</p>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
      {/* ─── Summary: Unpaid Orders Dialog ─── */}
      <Dialog open={summaryOpen === "orders"} onClose={() => setSummaryOpen(null)}
        sx={{ "& .MuiDialog-paper": { background: "linear-gradient(135deg,#1e293b 0%,#0f172a 100%)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "20px", color: "#e2e8f0", direction: "rtl", minWidth: "min(580px,96vw)", maxHeight: "85vh" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "18px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#f87171" }}>
          <span>📤 فواتير غير مسددة ({allUnpaidOrders.length})</span>
          <IconButton onClick={() => setSummaryOpen(null)} sx={{ color: "#64748b" }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "4px !important" }}>
          {/* Bulk pay bar */}
          <div style={{ padding: "12px 14px", borderRadius: "12px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", marginBottom: "14px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#f87171", fontFamily: "var(--font-cairo)", fontWeight: 700 }}>الإجمالي: {fmt(totalUnpaidOrdersAmt)} ج.م</span>
            <span style={{ flex: 1 }} />
            <FormControl size="small" sx={{ minWidth: 140, ...fieldSx }}><InputLabel>الخزنة</InputLabel>
              <Select value={bulkPayForm.vault_id} onChange={e => setBulkPayForm(p => ({ ...p, vault_id: e.target.value }))} label="الخزنة" sx={{ color: "#e2e8f0" }} MenuProps={{ PaperProps: { sx: { background: "#1e293b", borderRadius: "12px", "& .MuiMenuItem-root": { fontFamily: "var(--font-cairo)", color: "#e2e8f0" } } } }}>
                {vaults.map(v => <MenuItem key={v.id} value={v.id} sx={{ fontFamily: "var(--font-cairo)" }}>{v.name} — {fmt(Number(v.balance))}</MenuItem>)}
              </Select></FormControl>
            <Button size="small" variant="contained" disabled={bulkSaving || !bulkPayForm.vault_id} onClick={handleBulkPayOrders}
              sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg,#ef4444,#dc2626)", whiteSpace: "nowrap" }}>
              {bulkSaving ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "سداد الكل"}
            </Button>
          </div>
          {/* List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {allUnpaidOrders.map(o => {
              const rem = Number(o.total_amount) - Number(o.paid_amount || 0);
              const isOpen = inlinePayOrderId === o.id;
              return (
                <div key={o.id} style={{ padding: "12px 14px", borderRadius: "12px", background: "rgba(15,23,42,0.45)", border: "1px solid rgba(239,68,68,0.12)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#60a5fa", fontFamily: "monospace", background: "rgba(59,130,246,0.1)", padding: "2px 7px", borderRadius: "6px" }}>{o.code}</span>
                    <span style={{ fontSize: "13px", color: "#f1f5f9", fontFamily: "var(--font-cairo)", flex: 1 }}>{o.supplier?.name || "—"}</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#f87171", fontFamily: "var(--font-cairo)", whiteSpace: "nowrap" }}>متبقي: {fmt(rem)} ج.م</span>
                    <Button size="small" variant="outlined" onClick={() => { setInlinePayOrderId(isOpen ? null : o.id); setInlinePayForm({ vault_id: "", amount: String(rem), notes: "", payment_date: today() }); }}
                      sx={{ borderRadius: "8px", fontFamily: "var(--font-cairo)", fontSize: "11px", borderColor: "#f87171", color: "#f87171", textTransform: "none", whiteSpace: "nowrap", "&:hover": { background: "rgba(248,113,113,0.1)" } }}>
                      {isOpen ? "إلغاء" : "سداد"}
                    </Button>
                  </div>
                  {isOpen && (
                    <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-end" }}>
                      <FormControl size="small" sx={{ minWidth: 130, ...fieldSx }}><InputLabel>الخزنة *</InputLabel>
                        <Select value={inlinePayForm.vault_id} onChange={e => setInlinePayForm(p => ({ ...p, vault_id: e.target.value }))} label="الخزنة *" sx={{ color: "#e2e8f0" }} MenuProps={{ PaperProps: { sx: { background: "#1e293b", borderRadius: "12px", "& .MuiMenuItem-root": { fontFamily: "var(--font-cairo)", color: "#e2e8f0" } } } }}>
                          {vaults.map(v => <MenuItem key={v.id} value={v.id} sx={{ fontFamily: "var(--font-cairo)" }}>{v.name}</MenuItem>)}
                        </Select></FormControl>
                      <TextField size="small" label="المبلغ" type="number" value={inlinePayForm.amount} onChange={e => setInlinePayForm(p => ({ ...p, amount: e.target.value }))} sx={{ width: 110, ...fieldSx, "& .MuiInputBase-input": { textAlign: "left" } }} />
                      <TextField size="small" label="ملاحظات" value={inlinePayForm.notes} onChange={e => setInlinePayForm(p => ({ ...p, notes: e.target.value }))} sx={{ flex: 1, minWidth: 100, ...fieldSx }} />
                      <Button size="small" variant="contained" disabled={bulkSaving || !inlinePayForm.vault_id || !inlinePayForm.amount} onClick={() => handleInlinePayOrder(o.id)}
                        sx={{ borderRadius: "8px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "#ef4444", whiteSpace: "nowrap" }}>
                        {bulkSaving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "تأكيد السداد"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Summary: Unpaid Expenses Dialog ─── */}
      <Dialog open={summaryOpen === "expenses"} onClose={() => setSummaryOpen(null)}
        sx={{ "& .MuiDialog-paper": { background: "linear-gradient(135deg,#1e293b 0%,#0f172a 100%)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "20px", color: "#e2e8f0", direction: "rtl", minWidth: "min(580px,96vw)", maxHeight: "85vh" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "18px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#f59e0b" }}>
          <span>🧾 مصاريف غير مسددة ({allUnpaidExpenses.length})</span>
          <IconButton onClick={() => setSummaryOpen(null)} sx={{ color: "#64748b" }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "4px !important" }}>
          {/* Bulk pay bar */}
          <div style={{ padding: "12px 14px", borderRadius: "12px", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)", marginBottom: "14px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#f59e0b", fontFamily: "var(--font-cairo)", fontWeight: 700 }}>الإجمالي: {fmt(totalUnpaidExpensesAmt)} ج.م</span>
            <span style={{ flex: 1 }} />
            <FormControl size="small" sx={{ minWidth: 140, ...fieldSx }}><InputLabel>الخزنة</InputLabel>
              <Select value={bulkPayForm.vault_id} onChange={e => setBulkPayForm(p => ({ ...p, vault_id: e.target.value }))} label="الخزنة" sx={{ color: "#e2e8f0" }} MenuProps={{ PaperProps: { sx: { background: "#1e293b", borderRadius: "12px", "& .MuiMenuItem-root": { fontFamily: "var(--font-cairo)", color: "#e2e8f0" } } } }}>
                {vaults.map(v => <MenuItem key={v.id} value={v.id} sx={{ fontFamily: "var(--font-cairo)" }}>{v.name} — {fmt(Number(v.balance))}</MenuItem>)}
              </Select></FormControl>
            <Button size="small" variant="contained" disabled={bulkSaving || !bulkPayForm.vault_id} onClick={handleBulkPayExpenses}
              sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg,#f59e0b,#d97706)", whiteSpace: "nowrap" }}>
              {bulkSaving ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "سداد الكل"}
            </Button>
          </div>
          {/* List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {allUnpaidExpenses.map(e => {
              const rem = Number(e.amount) - Number(e.paid_amount || 0);
              const isOpen = inlinePayExpId === e.id;
              return (
                <div key={e.id} style={{ padding: "12px 14px", borderRadius: "12px", background: "rgba(15,23,42,0.45)", border: "1px solid rgba(245,158,11,0.12)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "11px", color: "#60a5fa", fontFamily: "monospace", background: "rgba(59,130,246,0.1)", padding: "2px 7px", borderRadius: "6px" }}>{e._order?.code}</span>
                    <span style={{ fontSize: "13px", color: "#f1f5f9", fontFamily: "var(--font-cairo)", flex: 1 }}>{e.description}</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#f59e0b", fontFamily: "var(--font-cairo)", whiteSpace: "nowrap" }}>متبقي: {fmt(rem)} ج.م</span>
                    <Button size="small" variant="outlined" onClick={() => { setInlinePayExpId(isOpen ? null : e.id); setInlinePayExpForm({ vault_id: "", amount: String(rem), notes: "", payment_date: today() }); }}
                      sx={{ borderRadius: "8px", fontFamily: "var(--font-cairo)", fontSize: "11px", borderColor: "#f59e0b", color: "#f59e0b", textTransform: "none", whiteSpace: "nowrap", "&:hover": { background: "rgba(245,158,11,0.1)" } }}>
                      {isOpen ? "إلغاء" : "سداد"}
                    </Button>
                  </div>
                  {isOpen && (
                    <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-end" }}>
                      <FormControl size="small" sx={{ minWidth: 130, ...fieldSx }}><InputLabel>الخزنة *</InputLabel>
                        <Select value={inlinePayExpForm.vault_id} onChange={ev => setInlinePayExpForm(p => ({ ...p, vault_id: ev.target.value }))} label="الخزنة *" sx={{ color: "#e2e8f0" }} MenuProps={{ PaperProps: { sx: { background: "#1e293b", borderRadius: "12px", "& .MuiMenuItem-root": { fontFamily: "var(--font-cairo)", color: "#e2e8f0" } } } }}>
                          {vaults.map(v => <MenuItem key={v.id} value={v.id} sx={{ fontFamily: "var(--font-cairo)" }}>{v.name}</MenuItem>)}
                        </Select></FormControl>
                      <TextField size="small" label="المبلغ" type="number" value={inlinePayExpForm.amount} onChange={ev => setInlinePayExpForm(p => ({ ...p, amount: ev.target.value }))} sx={{ width: 110, ...fieldSx, "& .MuiInputBase-input": { textAlign: "left" } }} />
                      <TextField size="small" label="ملاحظات" value={inlinePayExpForm.notes} onChange={ev => setInlinePayExpForm(p => ({ ...p, notes: ev.target.value }))} sx={{ flex: 1, minWidth: 100, ...fieldSx }} />
                      <Button size="small" variant="contained" disabled={bulkSaving || !inlinePayExpForm.vault_id || !inlinePayExpForm.amount} onClick={() => handleInlinePayExpense(e.id)}
                        sx={{ borderRadius: "8px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "#f59e0b", whiteSpace: "nowrap" }}>
                        {bulkSaving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "تأكيد السداد"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
