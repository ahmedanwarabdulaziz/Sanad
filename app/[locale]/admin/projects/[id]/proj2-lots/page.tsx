"use client";
import { useState, useEffect, useCallback } from "react";
import { useProject } from "../layout";
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Alert, IconButton,
  Autocomplete, FormControl, InputLabel, Select, MenuItem, Chip,
  InputAdornment
} from "@mui/material";
import {
  AddOutlined, DeleteOutline, SwapHorizOutlined, MoneyOffOutlined,
  ExpandMoreOutlined, ExpandLessOutlined, CalendarMonthOutlined,
  AddBusinessOutlined, PaymentsOutlined
} from "@mui/icons-material";
import { useRef } from "react";

const fmt  = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n));
const fmtD = (d: string) => { if (!d) return "—"; const p = d.split("-"); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : d; };
const fieldSx = { "& .MuiOutlinedInput-root": { borderRadius: "12px", backgroundColor: "rgba(15,23,42,0.5)", color: "#e2e8f0", fontFamily: "var(--font-cairo)", "& fieldset": { borderColor: "rgba(148,163,184,0.15)" }, "&:hover fieldset": { borderColor: "rgba(59,130,246,0.4)" }, "&.Mui-focused fieldset": { borderColor: "#3b82f6" } }, "& .MuiInputLabel-root": { color: "#64748b", fontFamily: "var(--font-cairo)", "&.Mui-focused": { color: "#60a5fa" } } };
const dlgSx = { "& .MuiDialog-paper": { background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "20px", color: "#e2e8f0", direction: "rtl" as const, minWidth: "min(580px, 96vw)" } };
const acPaperSx = { sx: { background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "12px" } };
const ro = (props: any, label: React.ReactNode) => <li {...props} style={{ fontFamily: "var(--font-cairo)", fontSize: "14px", color: "#e2e8f0", direction: "rtl" }}>{label}</li>;
const menuSx = { PaperProps: { sx: { background: "linear-gradient(135deg,#1e293b,#0f172a)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "12px" } } };

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
        error={invalid} helperText={invalid ? "dd-mm-yyyy" : undefined}
        FormHelperTextProps={{ style: { fontFamily: "var(--font-cairo)", textAlign: "right", direction: "rtl", fontSize: "11px" } }}
        sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr", letterSpacing: "1px" } }}
        placeholder="dd-mm-yyyy" inputProps={{ style: { direction: "ltr" } }}
        InputProps={{ endAdornment: (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => ref.current?.showPicker()} sx={{ color: invalid ? "#f87171" : "#64748b", "&:hover": { color: "#60a5fa" } }}>
              <CalendarMonthOutlined sx={{ fontSize: 18 }} />
            </IconButton>
          </InputAdornment>
        )}} />
      <input ref={ref} type="date"
        onChange={e => { if (e.target.value) { const [y,m,d] = e.target.value.split("-"); onChange(`${d}-${m}-${y}`); } }}
        style={{ position: "absolute", top: 0, left: 0, opacity: 0, pointerEvents: "none", width: "1px", height: "1px" }} />
    </div>
  );
};

type ConvItem = { item_id: string; quantity: string; unit_price: string };
const emptyCI = (): ConvItem => ({ item_id: "", quantity: "", unit_price: "" });

export default function LotsPage() {
  const { projectId } = useProject();
  const [lots, setLots]               = useState<any[]>([]);
  const [items, setItems]             = useState<any[]>([]);
  const [vaults, setVaults]           = useState<any[]>([]);
  const [suppliers, setSuppliers]     = useState<any[]>([]);
  const [lotSalesData, setLotSalesData] = useState<any[]>([]);
  const [allConversions, setAllConversions]     = useState<any[]>([]);
  const [globalConvValue, setGlobalConvValue]   = useState(0);
  const [convListOpen, setConvListOpen]         = useState(false);
  const [convListFilter, setConvListFilter]     = useState("");
  const [convExpDesc, setConvExpDesc]           = useState("");
  const [convExpAmount, setConvExpAmount]       = useState("");
  const [convExpPaymentStatus, setConvExpPaymentStatus] = useState("immediate");
  const [convExpVault, setConvExpVault]         = useState("");
  
  // Conversions history filters
  const [histPeriod, setHistPeriod]     = useState<"month"|"year"|"all">("month");
  const [histDateFrom, setHistDateFrom] = useState("");
  const [histDateTo, setHistDateTo]     = useState("");

  const [lotPeriod, setLotPeriod]     = useState<"month"|"year"|"all">("month");
  const [lotDateFrom, setLotDateFrom] = useState("");
  const [lotDateTo, setLotDateTo]     = useState("");
  const [lotSearch, setLotSearch]     = useState("");

  const [loading, setLoading]         = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);

  // expanded lot ids
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Add lot dialog
  const [addOpen, setAddOpen] = useState(false);
  const todayFormatted = () => { const [y,m,d] = new Date().toISOString().split("T")[0].split("-"); return `${d}-${m}-${y}`; };
  const [addForm, setAddForm] = useState({ description: "", total_cost: "", lot_date: todayFormatted(), supplier_id: "", notes: "" });

  // Convert dialog
  const [convOpen, setConvOpen]     = useState(false);
  const [convLot, setConvLot]       = useState<any>(null);
  const [convItems, setConvItems]   = useState<ConvItem[]>([emptyCI()]);
  const [convDate, setConvDate]     = useState(todayFormatted());
  const [convNotes, setConvNotes]   = useState("");

  // Expense dialog
  const [expOpen, setExpOpen]       = useState(false);
  const [expLot, setExpLot]         = useState<any>(null);
  const [expForm, setExpForm]       = useState({ description: "", amount: "", vault_id: "", payment_status: "immediate", lot_date: todayFormatted(), notes: "" });

  // Delete dialog
  const [delOpen, setDelOpen]       = useState(false);
  const [delLot, setDelLot]         = useState<any>(null);

  // Quick-add supplier
  const [qSupOpen, setQSupOpen]     = useState(false);
  const [qSupForm, setQSupForm]     = useState({ name: "", phone: "" });
  const [qSupSaving, setQSupSaving] = useState(false);

  // Payment dialog
  const [payOpen, setPayOpen]   = useState(false);
  const [payLot, setPayLot]     = useState<any>(null);
  const [payForm, setPayForm]   = useState({ vault_id: "", amount: "", payment_date: "", notes: "" });

  const fetchAll = useCallback(async () => {
    const [lr, ir, vr, sr] = await Promise.all([
      fetch(`/api/erp-auth/projects/${projectId}/proj2-lots`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-items`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-vaults`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-suppliers`),
    ]);
    const [ld, itemsData, vd, sd] = await Promise.all([lr.json(), ir.json(), vr.json(), sr.json()]);
    setLots(ld.lots || []);
    setLotSalesData(ld.lot_sales || []);
    setAllConversions(ld.all_conversions || []);
    setGlobalConvValue(ld.global_converted_value || 0);
    setVaults(vd.vaults || []);
    setSuppliers(sd.suppliers || []);

    // Auto-create the protected "لوت" system item if it doesn't exist
    const fetchedItems: any[] = itemsData.items || [];
    const hasLotItem = fetchedItems.some((i: any) => i.name === "لوت");
    if (!hasLotItem) {
      await fetch(`/api/erp-auth/projects/${projectId}/proj2-items`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "لوت", unit: "ج.م", is_system: true, category_id: null })
      });
      // Re-fetch items after creation
      const ir2 = await fetch(`/api/erp-auth/projects/${projectId}/proj2-items`);
      const id2 = await ir2.json();
      setItems(id2.items || []);
    } else {
      setItems(fetchedItems);
    }
    setLoading(false);
  }, [projectId]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  // fmtIso converts dd-mm-yyyy → yyyy-mm-dd for API
  const toIso = (d: string) => { if (!d || !isValidDate(d)) return d; const [dd,mm,yy] = d.split("-"); return `${yy}-${mm}-${dd}`; };

  const handleAdd = async () => {
    setSaving(true);
    const r = await fetch(`/api/erp-auth/projects/${projectId}/proj2-lots`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...addForm, total_cost: Number(addForm.total_cost), lot_date: toIso(addForm.lot_date), supplier_id: addForm.supplier_id || null })
    });
    if (!r.ok) { const d = await r.json(); setError(d.error); } else { setSuccess("تم إنشاء اللوت"); setAddOpen(false); fetchAll(); }
    setSaving(false);
  };

  const handleQuickAddSupplier = async () => {
    if (!qSupForm.name.trim()) return;
    setQSupSaving(true);
    const r = await fetch(`/api/erp-auth/projects/${projectId}/proj2-suppliers`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: qSupForm.name.trim(), phone: qSupForm.phone.trim(), address: "", notes: "" })
    });
    if (r.ok) {
      const d = await r.json();
      await fetchAll();
      setAddForm(f => ({ ...f, supplier_id: d.supplier?.id || "" }));
      setQSupOpen(false); setQSupForm({ name: "", phone: "" });
    } else { const d = await r.json(); setError(d.error); }
    setQSupSaving(false);
  };

  const handlePay = async () => {
    if (!payLot?.purchase_order_id) { setError("هذا اللوت ليس له فاتورة شراء مرتبطة"); return; }
    setSaving(true);
    const r = await fetch(`/api/erp-auth/projects/${projectId}/proj2-purchases/${payLot.purchase_order_id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pay", vault_id: payForm.vault_id, amount: Number(payForm.amount), payment_date: toIso(payForm.payment_date) || new Date().toISOString().split("T")[0], notes: payForm.notes || `دفعة للوت ${payLot.code}` })
    });
    if (!r.ok) { const d = await r.json(); setError(d.error); } else { setSuccess("تم تسجيل الدفعة"); setPayOpen(false); fetchAll(); }
    setSaving(false);
  };

  const handleConvert = async () => {
    setSaving(true);
    const valid = convItems.filter(i => i.item_id && Number(i.quantity) > 0 && Number(i.unit_price) > 0);
    if (!valid.length) { setError("أضف صنفاً واحداً على الأقل"); setSaving(false); return; }
    const r = await fetch(`/api/erp-auth/projects/${projectId}/proj2-lots/convert`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: valid.map(i => ({ item_id: i.item_id, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })), conversion_date: toIso(convDate), notes: convNotes })
    });
    if (!r.ok) { const d = await r.json(); setError(d.error); setSaving(false); return; }

    // Optional linked expense
    if (convExpDesc.trim() && Number(convExpAmount) > 0) {
      await fetch(`/api/erp-auth/projects/${projectId}/proj2-expenses`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: convExpDesc.trim(), amount: Number(convExpAmount),
          expense_type: "lot", expense_date: toIso(convDate),
          payment_status: convExpPaymentStatus,
          vault_id: convExpPaymentStatus === "immediate" ? (convExpVault || null) : null,
          notes: `مصروف تحويل — ${convNotes || ""}`
        })
      });
    }

    setSuccess("تم التحويل للمخزن");
    setConvOpen(false);
    setConvExpDesc(""); setConvExpAmount(""); setConvExpVault(""); setConvExpPaymentStatus("immediate");
    fetchAll();
    setSaving(false);
  };

  const handleAddExpense = async () => {
    setSaving(true);
    const r = await fetch(`/api/erp-auth/projects/${projectId}/proj2-expenses`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expense_type: "lot",
        lot_order_ids: [expLot.id],
        description: expForm.description,
        amount: Number(expForm.amount),
        payment_status: expForm.payment_status,
        paid_amount: expForm.payment_status === "immediate" ? Number(expForm.amount) : 0,
        vault_id: expForm.vault_id || null,
        expense_date: toIso(expForm.lot_date),
        notes: expForm.notes,
      })
    });
    if (!r.ok) { const d = await r.json(); setError(d.error); } else { setSuccess("تم تسجيل المصروف"); setExpOpen(false); fetchAll(); }
    setSaving(false);
  };

  const handleDelete = async () => {
    const r = await fetch(`/api/erp-auth/projects/${projectId}/proj2-lots/${delLot.id}`, { method: "DELETE" });
    if (!r.ok) { const d = await r.json(); setError(d.error); } else { setSuccess("تم الحذف"); setDelOpen(false); fetchAll(); }
  };

  const parseLotDate = (d: string) => { if (!d) return null; const dt = new Date(d); return isNaN(dt.getTime()) ? null : dt; };
  
  const inPeriod = (dStr: string) => {
    const d = parseLotDate(dStr);
    if (!d) return true;
    const now = new Date();
    if (lotDateFrom) { const f = new Date(lotDateFrom); if (d < f) return false; }
    if (lotDateTo)   { const t = new Date(lotDateTo); t.setHours(23,59,59); if (d > t) return false; }
    if (lotDateFrom || lotDateTo) return true;
    if (lotPeriod === "month") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    if (lotPeriod === "year")  return d.getFullYear() === now.getFullYear();
    return true;
  };

  const filteredLots = lots.filter(l => {
    if (lotSearch) {
      const q = lotSearch.toLowerCase();
      const match = (l.code || "").toLowerCase().includes(q) ||
                    (l.description || "").toLowerCase().includes(q) ||
                    (l.notes || "").toLowerCase().includes(q) ||
                    (suppliers.find(s => s.id === l.supplier_id)?.name || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return inPeriod(l.lot_date);
  });

  let computedTotalCost = 0;
  let computedTotalConverted = 0;
  let computedTotalExpenses = 0;
  let computedLotSalesTotal = 0;

  // Banners now always sum up the lots currently shown in the list (filteredLots), 
  // so the list exactly matches the summary totals.
  computedTotalCost = filteredLots.reduce((s, l) => s + Number(l.total_cost), 0);
  computedTotalConverted = filteredLots.reduce((s, l) => s + Number(l.converted_value), 0);
  computedTotalExpenses = filteredLots.reduce((s, l) => s + Number(l.total_expenses), 0);
  
  // Always compute global lot sales for the period, even during text searches, 
  // so the 'Direct Sales' banner doesn't abruptly drop to zero.
  computedLotSalesTotal = lotSalesData.filter(s => inPeriod(s.sale?.sale_date)).reduce((sum, s) => sum + (Number(s.quantity) * Number(s.unit_price)), 0);

  const computedRemaining = Math.max(0, computedTotalCost - computedTotalConverted);

  return (
    <>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>اللوتات</h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0, fontFamily: "var(--font-cairo)" }}>إدارة اللوتات وتحويلها للمخزن</p>
        </div>
        <Button variant="contained" startIcon={<SwapHorizOutlined />} onClick={() => { setConvItems([emptyCI()]); setConvDate(todayFormatted()); setConvNotes(""); setConvOpen(true); }}
          sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", whiteSpace: "nowrap" }}>
          تحويل للمخزن
        </Button>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => { setAddForm({ description: "", total_cost: "", lot_date: todayFormatted(), supplier_id: "", notes: "" }); setAddOpen(true); }}
          sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)", whiteSpace: "nowrap" }}>
          لوت جديد
        </Button>
      </div>

      {error   && <Alert severity="error"   onClose={() => setError(null)}   sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(239,68,68,0.1)",   color: "#fca5a5", fontFamily: "var(--font-cairo)", direction: "rtl" }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(34,197,94,0.1)",  color: "#86efac", fontFamily: "var(--font-cairo)", direction: "rtl" }}>{success}</Alert>}

      {loading ? <div style={{ textAlign: "center", padding: "60px 0" }}><CircularProgress sx={{ color: "#8b5cf6" }} /></div> : (
        <>
          {/* Summary banners */}
          {(lots.length > 0 || filteredLots.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px", marginBottom: "24px" }}>
              {[
                { label: "إجمالي اللوتات",       value: computedTotalCost,               color: "#a78bfa", icon: "📦",  click: null },
                { label: "محوَّل للمخزن",         value: computedTotalConverted,          color: "#34d399", icon: "✅",  click: () => { setHistPeriod(lotPeriod); setHistDateFrom(lotDateFrom); setHistDateTo(lotDateTo); setConvListFilter(""); setConvListOpen(true); } },
                { label: "مبيعات مباشرة",         value: computedLotSalesTotal,           color: "#60a5fa", icon: "🏷️", click: null },
                { label: "المبيعات + التحويلات", value: computedLotSalesTotal + computedTotalConverted, color: "#c084fc", icon: "📊", click: null },
                { label: "المصاريف",               value: computedTotalExpenses,           color: "#f59e0b", icon: "💸",  click: null },
                { label: "المتبقي بدون تحويل",   value: computedRemaining,               color: computedRemaining > 0 ? "#f87171" : "#10b981", icon: "⏳", click: null },
              ].map(s => (
                <div key={s.label} onClick={s.click || undefined}
                  style={{ padding: "14px 16px", borderRadius: "14px", background: "rgba(30,41,59,0.5)", border: `1px solid ${s.color}22`, direction: "rtl", cursor: s.click ? "pointer" : "default", transition: "border-color 0.2s" }}
                  onMouseEnter={e => { if (s.click) (e.currentTarget as HTMLElement).style.borderColor = s.color; }}
                  onMouseLeave={e => { if (s.click) (e.currentTarget as HTMLElement).style.borderColor = `${s.color}22`; }}>
                  <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)", fontWeight: 600 }}>{s.icon} {s.label}{s.click ? " ↗" : ""}</p>
                  <p style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: s.color, fontFamily: "var(--font-cairo)" }}>{fmt(s.value)} <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 400 }}>ج.م</span></p>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          {(lots.length > 0 || lotSearch || lotDateFrom || lotDateTo || lotPeriod !== "month") && (
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center", direction: "rtl" }}>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center", direction: "rtl" }}>
                {(["month", "year", "all"] as const).map(p => (
                  <button key={p} onClick={() => { setLotPeriod(p); setLotDateFrom(""); setLotDateTo(""); }}
                    style={{ padding: "5px 16px", borderRadius: "20px", fontSize: "12px", fontFamily: "var(--font-cairo)", cursor: "pointer", border: "none", fontWeight: 600, transition: "all 0.15s",
                      background: lotPeriod === p && !lotDateFrom && !lotDateTo ? "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)" : "rgba(30,41,59,0.8)",
                      color: lotPeriod === p && !lotDateFrom && !lotDateTo ? "#fff" : "#94a3b8",
                      outline: lotPeriod === p && !lotDateFrom && !lotDateTo ? "none" : "1px solid rgba(148,163,184,0.15)" }}>
                    {p === "month" ? "الشهر الحالي" : p === "year" ? "السنة الحالية" : "الكل"}
                  </button>
                ))}
                <div style={{ display: "flex", gap: "4px", alignItems: "center", background: (lotDateFrom || lotDateTo) ? "rgba(139,92,246,0.1)" : "rgba(30,41,59,0.6)", borderRadius: "10px", padding: "4px 8px", outline: (lotDateFrom || lotDateTo) ? "1px solid rgba(139,92,246,0.35)" : "1px solid rgba(148,163,184,0.12)" }}>
                  <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>من</span>
                  <input type="date" value={lotDateFrom} onChange={e => setLotDateFrom(e.target.value)}
                    style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "11px", fontFamily: "monospace", width: "110px", cursor: "pointer", colorScheme: "dark" }} />
                  <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>إلى</span>
                  <input type="date" value={lotDateTo} onChange={e => setLotDateTo(e.target.value)}
                    style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "11px", fontFamily: "monospace", width: "110px", cursor: "pointer", colorScheme: "dark" }} />
                  {(lotDateFrom || lotDateTo) && (
                    <button onClick={() => { setLotDateFrom(""); setLotDateTo(""); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", fontSize: "13px", lineHeight: 1, padding: "0 2px" }}>✕</button>
                  )}
                </div>
                <span style={{ fontSize: "10px", color: "#475569", fontFamily: "var(--font-cairo)" }}>{filteredLots.length} لوت</span>
              </div>
              <TextField placeholder="بحث بكود اللوت، الوصف، أو المورد..." value={lotSearch} onChange={e => setLotSearch(e.target.value)} size="small" 
                inputProps={{ dir: "rtl", style: { textAlign: "right", fontFamily: "var(--font-cairo)", fontSize: "13px" } }}
                sx={{ ...fieldSx, flex: "1 1 200px" }} />
            </div>
          )}

          {/* Lots list */}
          {filteredLots.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px", borderRadius: "20px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
              <p style={{ fontSize: "48px", margin: "0 0 12px" }}>📦</p>
              <p style={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "16px" }}>{lots.length === 0 ? "لا توجد لوتات بعد" : "لا توجد نتائج مطابقة للبحث"}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredLots.map(lot => {
                const converted  = Number(lot.converted_value);
                const cost       = Number(lot.total_cost);
                const expenses   = Number(lot.total_expenses);
                const totalSpend = cost + expenses;
                const remaining  = cost - converted;
                const pct        = cost > 0 ? Math.min(100, (converted / cost) * 100) : 0;
                const isOpen     = expanded.has(lot.id);
                const poPaid     = Number(lot.po?.paid_amount || 0);
                const poRemaining = cost - poPaid;

                return (
                  <div key={lot.id} style={{ borderRadius: "16px", background: "rgba(30,41,59,0.5)", border: "1px solid rgba(148,163,184,0.08)", direction: "rtl" }}>
                    {/* Card header */}
                    <div style={{ padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                      {/* Left: code + desc */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#a78bfa", fontFamily: "monospace", background: "rgba(139,92,246,0.1)", padding: "2px 8px", borderRadius: "6px" }}>{lot.code}</span>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "#f1f5f9", fontFamily: "var(--font-cairo)" }}>{lot.description || "—"}</span>
                          {lot.supplier_id && (() => { const s = suppliers.find(x => x.id === lot.supplier_id); return s ? <span style={{ fontSize: "10px", color: "#60a5fa", background: "rgba(96,165,250,0.1)", padding: "1px 6px", borderRadius: "5px", fontFamily: "var(--font-cairo)" }}>🏭 {s.name}</span> : null; })()}
                          <span style={{ fontSize: "11px", color: "#475569" }}>{fmtD(lot.lot_date)}</span>
                        </div>

                        {/* Amounts row */}
                        <div style={{ display: "flex", gap: "14px", marginTop: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "12px", fontFamily: "var(--font-cairo)", color: "#94a3b8" }}>التكلفة: <strong style={{ color: "#e2e8f0" }}>{fmt(cost)}</strong></span>
                          {expenses > 0 && <span style={{ fontSize: "12px", fontFamily: "var(--font-cairo)", color: "#f59e0b" }}>المصاريف: <strong>{fmt(expenses)}</strong></span>}
                          <span style={{ fontSize: "12px", fontFamily: "var(--font-cairo)", color: "#34d399" }}>محوَّل: <strong>{fmt(converted)}</strong></span>
                          <span style={{ fontSize: "12px", fontFamily: "var(--font-cairo)", color: remaining > 0 ? "#f87171" : "#10b981" }}>متبقي: <strong>{fmt(remaining)}</strong></span>
                          {poPaid > 0 && <span style={{ fontSize: "12px", fontFamily: "var(--font-cairo)", color: "#60a5fa" }}>مسدد: <strong>{fmt(poPaid)}</strong></span>}
                          {poRemaining > 0 && <span style={{ fontSize: "12px", fontFamily: "var(--font-cairo)", color: "#f87171" }}>متبقي سداد: <strong>{fmt(poRemaining)}</strong></span>}
                        </div>
                      </div>
                      {/* Right: actions */}
                      <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                        {lot.purchase_order_id && <IconButton size="small" title="تسديد" onClick={() => { setPayLot(lot); setPayForm({ vault_id: "", amount: String(poRemaining > 0 ? poRemaining : ""), payment_date: todayFormatted(), notes: "" }); setPayOpen(true); }} sx={{ color: "#60a5fa", "&:hover": { background: "rgba(96,165,250,0.1)" } }}><PaymentsOutlined sx={{ fontSize: 18 }} /></IconButton>}
                        <IconButton size="small" title="إضافة مصروف"  onClick={() => { setExpLot(lot); setExpForm({ description: "", amount: "", vault_id: "", payment_status: "immediate", lot_date: todayFormatted(), notes: "" }); setExpOpen(true); }} sx={{ color: "#f59e0b", "&:hover": { background: "rgba(245,158,11,0.1)" } }}><MoneyOffOutlined sx={{ fontSize: 18 }} /></IconButton>
                        <IconButton size="small" title="تفاصيل" onClick={() => setExpanded(prev => { const s = new Set(prev); s.has(lot.id) ? s.delete(lot.id) : s.add(lot.id); return s; })} sx={{ color: "#a78bfa", "&:hover": { background: "rgba(167,139,250,0.1)" } }}>
                          {isOpen ? <ExpandLessOutlined sx={{ fontSize: 18 }} /> : <ExpandMoreOutlined sx={{ fontSize: 18 }} />}
                        </IconButton>
                        <IconButton size="small" onClick={() => { setDelLot(lot); setDelOpen(true); }} sx={{ color: "#64748b", "&:hover": { color: "#f87171", background: "rgba(248,113,113,0.1)" } }}><DeleteOutline sx={{ fontSize: 18 }} /></IconButton>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isOpen && (
                      <div style={{ borderTop: "1px solid rgba(148,163,184,0.07)", padding: "14px 18px", display: "flex", flexDirection: "column", gap: "14px" }}>
                        {/* Conversions */}
                        {(lot.conversions || []).length > 0 && (
                          <div>
                            <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 700, color: "#64748b", fontFamily: "var(--font-cairo)", textTransform: "uppercase", letterSpacing: "0.5px" }}>التحويلات للمخزن</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                              {lot.conversions.map((c: any, i: number) => (
                                <div key={i} style={{ display: "flex", gap: "10px", alignItems: "center", padding: "8px 12px", borderRadius: "10px", background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.12)" }}>
                                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#f1f5f9", fontFamily: "var(--font-cairo)", flex: 1 }}>{c.item?.name || "—"} {c.item?.unit ? `(${c.item.unit})` : ""}</span>
                                  <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "var(--font-cairo)", whiteSpace: "nowrap" }}>× {fmt(Number(c.quantity))}</span>
                                  <span style={{ fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" }}>@ {fmt(Number(c.unit_price))} ج.م</span>
                                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#34d399", whiteSpace: "nowrap" }}>{fmt(Number(c.quantity) * Number(c.unit_price))} ج.م</span>
                                  <span style={{ fontSize: "10px", color: "#475569" }}>{fmtD(c.conversion_date)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Expenses */}
                        {(lot.expenses || []).length > 0 && (
                          <div>
                            <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 700, color: "#64748b", fontFamily: "var(--font-cairo)", textTransform: "uppercase", letterSpacing: "0.5px" }}>المصاريف</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                              {lot.expenses.map((e: any, i: number) => (
                                <div key={i} style={{ display: "flex", gap: "10px", alignItems: "center", padding: "8px 12px", borderRadius: "10px", background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)" }}>
                                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#f1f5f9", fontFamily: "var(--font-cairo)", flex: 1 }}>{e.description || "—"}</span>
                                  <Chip label={e.payment_status === "immediate" ? "مسدد" : "مستقبلي"} size="small" sx={{ height: "18px", fontSize: "10px", fontFamily: "var(--font-cairo)", background: e.payment_status === "immediate" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)", color: e.payment_status === "immediate" ? "#34d399" : "#f59e0b" }} />
                                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#f59e0b", whiteSpace: "nowrap" }}>{fmt(Number(e.amount))} ج.م</span>
                                  <span style={{ fontSize: "10px", color: "#475569" }}>{fmtD(e.expense_date)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Notes */}
                        {lot.notes && <p style={{ margin: 0, fontSize: "12px", color: "#64748b", fontFamily: "var(--font-cairo)", padding: "8px 12px", background: "rgba(30,41,59,0.4)", borderRadius: "8px" }}>{lot.notes}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Add Lot Dialog ── */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} sx={dlgSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#a78bfa" }}>لوت جديد</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <TextField label="الوصف / المحتوى *" value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} fullWidth sx={fieldSx} />
          <div style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <Autocomplete options={suppliers} getOptionLabel={(o: any) => o.name || ""} value={suppliers.find(o => o.id === addForm.supplier_id) || null}
                onChange={(_, val) => setAddForm(f => ({ ...f, supplier_id: val?.id || "" }))}
                isOptionEqualToValue={(a, b) => a.id === b.id} noOptionsText={<span style={{ fontFamily: "var(--font-cairo)" }}>لا يوجد</span>}
                slotProps={{ paper: acPaperSx }} renderOption={(props, o) => ro(props, o.name)}
                renderInput={p => <TextField {...p} label="المورد" sx={fieldSx} inputProps={{ ...p.inputProps, style: { textAlign: "right", fontFamily: "var(--font-cairo)" } }} />} />
            </div>
            <IconButton onClick={() => { setQSupForm({ name: "", phone: "" }); setQSupOpen(true); }} title="إضافة مورد جديد"
              sx={{ mt: "4px", color: "#34d399", background: "rgba(52,211,153,0.08)", borderRadius: "10px", border: "1px solid rgba(52,211,153,0.2)", "&:hover": { background: "rgba(52,211,153,0.15)" } }}>
              <AddBusinessOutlined sx={{ fontSize: 20 }} />
            </IconButton>
          </div>
          <TextField label="إجمالي التكلفة *" type="number" value={addForm.total_cost} onChange={e => setAddForm(f => ({ ...f, total_cost: e.target.value }))} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} />
          <DateField label="تاريخ الشراء" value={addForm.lot_date} onChange={v => setAddForm(f => ({ ...f, lot_date: v }))} />
          <TextField label="ملاحظات" value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} fullWidth sx={fieldSx} multiline rows={2} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setAddOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleAdd} disabled={saving || !addForm.description || !addForm.total_cost} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg,#8b5cf6,#6d28d9)" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "إنشاء اللوت"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Convert to Stock Dialog ── */}
      <Dialog open={convOpen} onClose={() => setConvOpen(false)} sx={dlgSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "18px", color: "#34d399" }}>
          تحويل من مخزون اللوتات للمخزن
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <DateField label="تاريخ التحويل" value={convDate} onChange={setConvDate} />
          {/* Items */}
          <div style={{ direction: "rtl" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>الأصناف المتحولة</span>
              <Button size="small" onClick={() => setConvItems(p => [...p, emptyCI()])} sx={{ color: "#34d399", minWidth: 0, p: "4px" }}>+ إضافة</Button>
            </div>
            {convItems.map((ci, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 32px", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                <Autocomplete options={items} getOptionLabel={(o: any) => o.name || ""} value={items.find(o => o.id === ci.item_id) || null}
                  onChange={(_, val) => setConvItems(p => p.map((x, j) => j === i ? { ...x, item_id: val?.id || "" } : x))}
                  isOptionEqualToValue={(a, b) => a.id === b.id} noOptionsText={<span style={{ fontFamily: "var(--font-cairo)" }}>لا يوجد</span>}
                  slotProps={{ paper: acPaperSx }} renderOption={(props, o) => ro(props, o.name)}
                  renderInput={p => <TextField {...p} placeholder="الصنف" size="small" sx={fieldSx} inputProps={{ ...p.inputProps, style: { textAlign: "right", fontFamily: "var(--font-cairo)", fontSize: "13px" } }} />} />
                <TextField placeholder="كمية" size="small" type="number" value={ci.quantity} onChange={e => setConvItems(p => p.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "center" } }} />
                <TextField placeholder="سعر/وحدة" size="small" type="number" value={ci.unit_price} onChange={e => setConvItems(p => p.map((x, j) => j === i ? { ...x, unit_price: e.target.value } : x))} sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "center" } }} />
                <IconButton size="small" onClick={() => setConvItems(p => p.filter((_, j) => j !== i))} sx={{ color: "#f87171" }}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton>
              </div>
            ))}
            <p style={{ margin: "6px 0 0", fontSize: "13px", fontWeight: 700, color: "#34d399", fontFamily: "var(--font-cairo)", textAlign: "left" }}>
              الإجمالي المحوَّل: {fmt(convItems.reduce((s, c) => s + (Number(c.quantity) || 0) * (Number(c.unit_price) || 0), 0))} ج.م
            </p>
          </div>
          <TextField label="ملاحظات" value={convNotes} onChange={e => setConvNotes(e.target.value)} fullWidth sx={fieldSx} />
          {/* Optional expense at time of conversion */}
          <div style={{ borderTop: "1px solid rgba(148,163,184,0.1)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 700, color: "#f59e0b", fontFamily: "var(--font-cairo)" }}>💸 مصروف مرتبط بالتحويل (اختياري)</p>
            <TextField label="البيان" value={convExpDesc} onChange={e => setConvExpDesc(e.target.value)} fullWidth sx={fieldSx} size="small" />
            <TextField label="المبلغ" type="number" value={convExpAmount} onChange={e => setConvExpAmount(e.target.value)} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} size="small" />
            
            {(convExpDesc || Number(convExpAmount) > 0) && (
              <>
                <div style={{ direction: "rtl", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginTop: "4px" }}>
                  <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>حالة السداد:</span>
                  {[{ v: "immediate", l: "دفع فوري" }, { v: "future", l: "دفع مستقبلي" }].map(opt => (
                    <Chip key={opt.v} label={opt.l} onClick={() => setConvExpPaymentStatus(opt.v)} size="small"
                      sx={{ fontFamily: "var(--font-cairo)", fontSize: "11px", cursor: "pointer", background: convExpPaymentStatus === opt.v ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(30,41,59,0.8)", color: convExpPaymentStatus === opt.v ? "#fff" : "#94a3b8", border: convExpPaymentStatus === opt.v ? "none" : "1px solid rgba(148,163,184,0.2)" }} />
                  ))}
                </div>
                {convExpPaymentStatus === "immediate" && (
                  <FormControl fullWidth sx={fieldSx} size="small">
                    <InputLabel>الدفع من</InputLabel>
                    <Select value={convExpVault} onChange={e => setConvExpVault(e.target.value)} label="الدفع من" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
                      {vaults.map(v => <MenuItem key={v.id} value={v.id} sx={{ fontFamily: "var(--font-cairo)" }}>{v.name} — {fmt(Number(v.balance))} ج.م</MenuItem>)}
                    </Select>
                  </FormControl>
                )}
              </>
            )}
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setConvOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleConvert} disabled={saving} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg,#10b981,#059669)" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "تأكيد التحويل"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Expense Dialog ── */}
      <Dialog open={expOpen} onClose={() => setExpOpen(false)} sx={{ "& .MuiDialog-paper": { ...dlgSx["& .MuiDialog-paper"], minWidth: "min(440px,94vw)" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "18px", color: "#f59e0b" }}>إضافة مصروف — {expLot?.code}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <TextField label="البيان *" value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} fullWidth sx={fieldSx} />
          <TextField label="المبلغ *" type="number" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} />
          {/* payment status chips */}
          <div style={{ direction: "rtl", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>حالة السداد:</span>
            {[{ v: "immediate", l: "دفع فوري" }, { v: "future", l: "دفع مستقبلي" }].map(opt => (
              <Chip key={opt.v} label={opt.l} onClick={() => setExpForm(f => ({ ...f, payment_status: opt.v }))}
                sx={{ fontFamily: "var(--font-cairo)", fontSize: "12px", cursor: "pointer", background: expForm.payment_status === opt.v ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(30,41,59,0.8)", color: expForm.payment_status === opt.v ? "#fff" : "#94a3b8", border: expForm.payment_status === opt.v ? "none" : "1px solid rgba(148,163,184,0.2)" }} />
            ))}
          </div>
          {expForm.payment_status === "immediate" && (
            <FormControl fullWidth sx={fieldSx}>
              <InputLabel>الدفع من</InputLabel>
              <Select value={expForm.vault_id} onChange={e => setExpForm(f => ({ ...f, vault_id: e.target.value }))} label="الدفع من" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
                {vaults.map(v => <MenuItem key={v.id} value={v.id} sx={{ fontFamily: "var(--font-cairo)" }}>{v.name} — {fmt(Number(v.balance))} ج.م</MenuItem>)}
              </Select>
            </FormControl>
          )}
          <DateField label="تاريخ المصروف" value={expForm.lot_date} onChange={v => setExpForm(f => ({ ...f, lot_date: v }))} />
          <TextField label="ملاحظات" value={expForm.notes} onChange={e => setExpForm(f => ({ ...f, notes: e.target.value }))} fullWidth sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setExpOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleAddExpense} disabled={saving || !expForm.description || !expForm.amount} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "تسجيل المصروف"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Conversions List Dialog ── */}
      <Dialog open={convListOpen} onClose={() => setConvListOpen(false)}
        sx={{ "& .MuiDialog-paper": { background: "linear-gradient(160deg,#1e293b 0%,#0f172a 100%)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "24px", color: "#e2e8f0", direction: "rtl" as const, minWidth: "min(640px,96vw)", maxHeight: "88vh" } }}>
        
        {(() => {
          const now = new Date();
          const filteredConversions = allConversions
            .filter(c => !convListFilter || (c.item?.name || "").includes(convListFilter) || (c.notes || "").includes(convListFilter))
            .filter(c => {
              const d = c.conversion_date ? new Date(c.conversion_date) : null;
              if (!d) return true;
              if (histDateFrom && d < new Date(histDateFrom)) return false;
              if (histDateTo   && d > new Date(histDateTo + "T23:59:59")) return false;
              if (histDateFrom || histDateTo) return true;
              if (histPeriod === "month") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
              if (histPeriod === "year")  return d.getFullYear() === now.getFullYear();
              return true;
            })
            .sort((a, b) => (b.conversion_date || "").localeCompare(a.conversion_date || ""));

          const filteredTotalValue = filteredConversions.reduce((s, c) => s + Number(c.quantity) * Number(c.unit_price), 0);

          return (
            <>
              {/* Custom header */}
              <div style={{ padding: "20px 24px 12px", borderBottom: "1px solid rgba(148,163,184,0.08)", direction: "rtl" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)", fontWeight: 600 }}>📋 سجل التحويلات</p>
                    <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#f1f5f9", fontFamily: "var(--font-cairo)" }}>تحويلات اللوتات</h2>
                  </div>
                  <div style={{ textAlign: "left", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                    <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>إجمالي القيمة المحولة للمرحلة</span>
                    <span style={{ fontSize: "20px", fontWeight: 800, color: "#34d399", fontFamily: "var(--font-cairo)", direction: "ltr" }}>{fmt(filteredTotalValue)} <span style={{ fontSize: "11px", color: "#475569", fontWeight: 400 }}>ج.م</span></span>
                  </div>
                </div>
              </div>

              <DialogContent sx={{ pt: "16px !important", direction: "rtl", px: "20px", display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField placeholder="بحث بالصنف أو الملاحظات..." value={convListFilter} onChange={e => setConvListFilter(e.target.value)}
            size="small" fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "right" } }} />
          
          <div style={{ display: "flex", gap: "6px", marginBottom: "4px", flexWrap: "wrap", alignItems: "center", direction: "rtl" }}>
            {(["month", "year", "all"] as const).map(p => (
              <button key={p} onClick={() => { setHistPeriod(p); setHistDateFrom(""); setHistDateTo(""); }}
                style={{ padding: "5px 16px", borderRadius: "20px", fontSize: "12px", fontFamily: "var(--font-cairo)", cursor: "pointer", border: "none", fontWeight: 600, transition: "all 0.15s",
                  background: histPeriod === p && !histDateFrom && !histDateTo ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "rgba(30,41,59,0.8)",
                  color: histPeriod === p && !histDateFrom && !histDateTo ? "#fff" : "#94a3b8",
                  outline: histPeriod === p && !histDateFrom && !histDateTo ? "none" : "1px solid rgba(148,163,184,0.15)" }}>
                {p === "month" ? "الشهر الحالي" : p === "year" ? "السنة الحالية" : "الكل"}
              </button>
            ))}
            <div style={{ display: "flex", gap: "4px", alignItems: "center", background: (histDateFrom || histDateTo) ? "rgba(59,130,246,0.1)" : "rgba(30,41,59,0.6)", borderRadius: "10px", padding: "2px 7px", outline: (histDateFrom || histDateTo) ? "1px solid rgba(59,130,246,0.35)" : "1px solid rgba(148,163,184,0.12)" }}>
              <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>من</span>
              <input type="date" value={histDateFrom} onChange={e => setHistDateFrom(e.target.value)}
                style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "11px", fontFamily: "monospace", width: "110px", cursor: "pointer", colorScheme: "dark" }} />
              <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>إلى</span>
              <input type="date" value={histDateTo} onChange={e => setHistDateTo(e.target.value)}
                style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "11px", fontFamily: "monospace", width: "110px", cursor: "pointer", colorScheme: "dark" }} />
              {(histDateFrom || histDateTo) && (
                <button onClick={() => { setHistDateFrom(""); setHistDateTo(""); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", fontSize: "13px", lineHeight: 1, padding: "0 2px" }}>✕</button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto", paddingRight: "4px" }}>
            {filteredConversions.length === 0 ? (
              <p style={{ textAlign: "center", color: "#64748b", fontFamily: "var(--font-cairo)", fontSize: "14px", padding: "30px 0" }}>لا توجد تحويلات في هذه الفترة</p>
            ) : (
              <>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center", direction: "rtl", marginBottom: "4px" }}>
                  <span style={{ fontSize: "10px", color: "#475569", fontFamily: "var(--font-cairo)", marginRight: "2px" }}>{filteredConversions.length} تحويل في هذه الفترة</span>
                </div>
                {filteredConversions.map((c, i) => {
                  const total = Number(c.quantity) * Number(c.unit_price);
                  return (
                    <div key={c.id || i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 14px", borderRadius: "12px", background: "rgba(15,23,42,0.5)", border: `1px solid rgba(52,211,153,0.14)`, direction: "rtl" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#34d399", background: `rgba(52,211,153,0.18)`, padding: "3px 9px", borderRadius: "8px", fontFamily: "var(--font-cairo)", whiteSpace: "nowrap", flexShrink: 0 }}>تحويل للمخزن</span>
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#e2e8f0", fontFamily: "var(--font-cairo)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.item?.name || "—"}</span>
                          {c.item?.code && <span style={{ fontSize: "10px", color: "#60a5fa", fontFamily: "monospace", background: "rgba(59,130,246,0.1)", padding: "2px 6px", borderRadius: "4px" }}>{c.item.code}</span>}
                        </div>
                        <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "var(--font-cairo)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.notes || "—"}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px", flexShrink: 0 }}>
                        <span style={{ fontSize: "14px", fontWeight: 800, color: "#34d399", fontFamily: "var(--font-cairo)", whiteSpace: "nowrap", direction: "ltr" }}>+{fmt(total)} <span style={{ fontSize: "10px", fontWeight: 400 }}>ج.م</span></span>
                        <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)", direction: "ltr" }}>{Number(c.quantity)} {c.item?.unit || "وحدة"} × {fmt(Number(c.unit_price))}</span>
                      </div>
                      <span style={{ fontSize: "10px", color: "#475569", whiteSpace: "nowrap", flexShrink: 0, background: "rgba(30,41,59,0.6)", padding: "2px 7px", borderRadius: "6px" }}>
                        {c.conversion_date ? new Date(c.conversion_date).toLocaleDateString("en-GB").replace(/\//g, "-") : ""}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </DialogContent>
        </>
      );
    })()}

        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setConvListOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={delOpen} onClose={() => setDelOpen(false)} sx={{ "& .MuiDialog-paper": { ...dlgSx["& .MuiDialog-paper"], minWidth: "min(360px,94vw)" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "18px", color: "#f87171" }}>حذف اللوت</DialogTitle>
        <DialogContent><p style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", margin: 0 }}>هل تريد حذف <strong style={{ color: "#e2e8f0" }}>{delLot?.code}</strong>؟ سيتم حذف جميع تحويلاته.</p></DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDelOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleDelete} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "#dc2626" }}>حذف</Button>
        </DialogActions>
      </Dialog>

      {/* ── Payment Dialog ── */}
      <Dialog open={payOpen} onClose={() => setPayOpen(false)} sx={{ "& .MuiDialog-paper": { ...dlgSx["& .MuiDialog-paper"], minWidth: "min(420px,94vw)" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "18px", color: "#60a5fa" }}>
          تسديد — {payLot?.code}
          {payLot?.po && <span style={{ fontSize: "12px", color: "#64748b", marginRight: "8px", fontWeight: 400 }}>
            مسدد: {fmt(Number(payLot.po.paid_amount))} / {fmt(Number(payLot.total_cost))} ج.م
          </span>}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>الدفع من *</InputLabel>
            <Select value={payForm.vault_id} onChange={e => setPayForm(f => ({ ...f, vault_id: e.target.value }))} label="الدفع من *" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              {vaults.map(v => <MenuItem key={v.id} value={v.id} sx={{ fontFamily: "var(--font-cairo)" }}>{v.name} — {fmt(Number(v.balance))} ج.م</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="المبلغ *" type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} />
          <DateField label="تاريخ الدفع" value={payForm.payment_date} onChange={v => setPayForm(f => ({ ...f, payment_date: v }))} />
          <TextField label="ملاحظات" value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} fullWidth sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setPayOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handlePay} disabled={saving || !payForm.vault_id || !payForm.amount} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg,#3b82f6,#1d4ed8)" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "تأكيد الدفع"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Quick Add Supplier Dialog ── */}
      <Dialog open={qSupOpen} onClose={() => setQSupOpen(false)} sx={{ "& .MuiDialog-paper": { ...dlgSx["& .MuiDialog-paper"], minWidth: "min(360px,94vw)" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "18px", color: "#34d399" }}>مورد جديد</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <TextField label="اسم المورد *" value={qSupForm.name} onChange={e => setQSupForm(f => ({ ...f, name: e.target.value }))} fullWidth sx={fieldSx} autoFocus />
          <TextField label="رقم الهاتف" value={qSupForm.phone} onChange={e => setQSupForm(f => ({ ...f, phone: e.target.value }))} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { direction: "ltr", textAlign: "left" } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setQSupOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleQuickAddSupplier} disabled={qSupSaving || !qSupForm.name.trim()} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg,#10b981,#059669)" }}>
            {qSupSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "إضافة"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
