"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useProject } from "../layout";
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Alert, IconButton, Chip, Autocomplete,
  FormControl, InputLabel, Select, MenuItem, InputAdornment
} from "@mui/material";
import { AddOutlined, DeleteOutline, CheckCircleOutlined, PaymentsOutlined, AddCircleOutline, RemoveCircleOutline, EditOutlined, MoneyOffOutlined, CalendarMonthOutlined, AccountBalanceWalletOutlined } from "@mui/icons-material";

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

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontFamily: "var(--font-cairo)", direction: "rtl", textAlign: "right" }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#86efac", fontFamily: "var(--font-cairo)", direction: "rtl", textAlign: "right" }}>{success}</Alert>}

      {loading ? <div style={{ textAlign: "center", padding: "60px 0" }}><CircularProgress sx={{ color: "#f59e0b" }} /></div>
        : orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", borderRadius: "20px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
            <p style={{ fontSize: "48px", margin: "0 0 12px" }}>🛒</p>
            <p style={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "16px" }}>لا توجد فواتير شراء بعد</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {orders.map(order => (
              <div key={order.id} style={{ padding: "18px", borderRadius: "16px", background: "rgba(30,41,59,0.5)", border: "1px solid rgba(148,163,184,0.08)" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#60a5fa", fontFamily: "monospace", background: "rgba(59,130,246,0.1)", padding: "3px 8px", borderRadius: "8px" }}>{order.code}</span>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9", fontFamily: "var(--font-cairo)" }}>{order.supplier?.name || "—"}</span>
                    <Chip label={ORDER_STATUS[order.status]?.label} size="small" sx={{ background: `${ORDER_STATUS[order.status]?.color}22`, color: ORDER_STATUS[order.status]?.color, fontFamily: "var(--font-cairo)", fontSize: "11px", height: "20px" }} />
                    <Chip label={PAYMENT_STATUS[order.payment_status]?.label} size="small" sx={{ background: `${PAYMENT_STATUS[order.payment_status]?.color}22`, color: PAYMENT_STATUS[order.payment_status]?.color, fontFamily: "var(--font-cairo)", fontSize: "11px", height: "20px" }} />
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {order.status === "ordered" && (
                      <Button size="small" variant="outlined" startIcon={<CheckCircleOutlined sx={{ fontSize: 14 }} />} onClick={() => handleReceive(order)}
                        sx={{ borderRadius: "8px", fontFamily: "var(--font-cairo)", fontSize: "11px", borderColor: "#10b981", color: "#10b981", textTransform: "none", "&:hover": { background: "rgba(16,185,129,0.1)" } }}>
                        تسجيل الاستلام
                      </Button>
                    )}
                    {order.payment_status !== "paid" && (
                      <Button size="small" variant="outlined" startIcon={<PaymentsOutlined sx={{ fontSize: 14 }} />} onClick={() => { setPayOrder(order); setPayForm({ vault_id: "", amount: "", notes: "", payment_date: today() }); setPayOpen(true); }}
                        sx={{ borderRadius: "8px", fontFamily: "var(--font-cairo)", fontSize: "11px", borderColor: "#f59e0b", color: "#f59e0b", textTransform: "none", "&:hover": { background: "rgba(245,158,11,0.1)" } }}>
                        تسجيل دفع
                      </Button>
                    )}
                    <IconButton size="small" title="تعديل الفاتورة"
                      onClick={() => {
                        setEditOrder(order);
                        setEditForm({ supplier_id: order.supplier_id || "", notes: order.notes || "", order_date: fmtD(order.order_date || "") });
                        setEditItems((order.items || []).map((i: any) => ({ item_id: i.item_id, quantity: String(i.quantity), unit_price: String(i.unit_price) })));
                        setEditOpen(true);
                      }}
                      sx={{ color: "#60a5fa", "&:hover": { background: "rgba(59,130,246,0.1)" } }}>
                      <EditOutlined sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" title="إضافة مصروف للفاتورة"
                      onClick={() => { setExpOrderIds([order.id]); setExpForm({ description: "", amount: "", advance_amount: "", vault_id: "", payment_status: "immediate" }); setExpOpen(true); }}
                      sx={{ color: "#f59e0b", "&:hover": { background: "rgba(245,158,11,0.1)" } }}>
                      <MoneyOffOutlined sx={{ fontSize: 16 }} />
                    </IconButton>
                    {(() => {
                      const linkedExpenses = expenses.filter(e => e.expense_type === "purchase" && Array.isArray(e.purchase_order_ids) && e.purchase_order_ids.includes(order.id));
                      const expTotal = linkedExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
                      const expPaid = linkedExpenses.reduce((s: number, e: any) => s + Number(e.paid_amount), 0);
                      const expRemaining = expTotal - expPaid;
                      return expRemaining > 0 ? (
                        <IconButton size="small" title="سداد المصاريف" onClick={() => { setPayExpOrder(order); setPayExpMax(expRemaining); setPayExpForm({ vault_id: "", amount: String(expRemaining), notes: "", payment_date: fmtD(new Date().toISOString().split("T")[0]) }); setPayExpOpen(true); }} sx={{ color: "#c084fc", "&:hover": { background: "rgba(192,132,252,0.1)" } }}><AccountBalanceWalletOutlined sx={{ fontSize: 16 }} /></IconButton>
                      ) : null;
                    })()}
                    <IconButton size="small" onClick={() => { setDeleteTarget(order); setDeleteOpen(true); }} sx={{ color: "#64748b", "&:hover": { color: "#f87171", background: "rgba(248,113,113,0.1)" } }}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton>
                  </div>
                </div>

                {/* Items */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                  {(order.items || []).map((it: any, i: number) => (
                    <span key={i} style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "var(--font-cairo)", background: "rgba(15,23,42,0.4)", padding: "4px 10px", borderRadius: "8px" }}>
                      {it.item?.name || "—"} × {it.quantity} {it.item?.unit} @ {fmt(it.unit_price)} جنيه
                    </span>
                  ))}
                </div>

                {/* Totals + Expenses */}
                {(() => {
                  const linkedExpenses = expenses.filter(e =>
                    e.expense_type === "purchase" &&
                    Array.isArray(e.purchase_order_ids) &&
                    e.purchase_order_ids.includes(order.id)
                  );
                  const expTotal = linkedExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
                  const grandTotal = Number(order.total_amount) + expTotal;
                  return (
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center", direction: "rtl" }}>
                      <span style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: "#64748b" }}>الإجمالي: <strong style={{ color: "#f1f5f9" }}>{fmt(order.total_amount)} جنيه</strong></span>
                      <span style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: "#10b981" }}>مدفوع: <strong>{fmt(order.paid_amount)} جنيه</strong></span>
                      {order.paid_amount < order.total_amount && <span style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: "#f87171" }}>متبقي: <strong>{fmt(order.total_amount - order.paid_amount)} جنيه</strong></span>}
                      {expTotal > 0 && (
                        <>
                          <span style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: "#f59e0b" }}>مصروفات: <strong>{fmt(expTotal)} جنيه</strong></span>
                          {expTotal - linkedExpenses.reduce((s: number, e: any) => s + Number(e.paid_amount), 0) > 0 && (
                            <span style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: "#c084fc", fontWeight: 700 }}>مصروفات متبقية: {fmt(expTotal - linkedExpenses.reduce((s: number, e: any) => s + Number(e.paid_amount), 0))} جنيه</span>
                          )}
                          <span style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: "#c084fc", fontWeight: 700 }}>التكلفة الكاملة: {fmt(grandTotal)} جنيه</span>
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* Payments */}
                {order.payments?.length > 0 && (
                  <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {order.payments.map((p: any, i: number) => (
                      <span key={i} style={{ fontSize: "11px", color: "#60a5fa", background: "rgba(59,130,246,0.08)", padding: "3px 10px", borderRadius: "8px", fontFamily: "var(--font-cairo)" }}>
                        💳 {p.vault?.name}: {fmt(p.amount)} جنيه
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
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
    </div>
  );
}
