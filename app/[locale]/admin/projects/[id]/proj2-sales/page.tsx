"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type JsPDFType from "jspdf";
import { useProject } from "../layout";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Alert, IconButton, Chip, Autocomplete, InputAdornment } from "@mui/material";
import { AddOutlined, DeleteOutline, EditOutlined, PaymentsOutlined, CheckCircleOutlined, LocalShippingOutlined, MoneyOffOutlined, AddCircleOutline, RemoveCircleOutline, CalendarMonthOutlined, AccountBalanceWalletOutlined, PrintOutlined, WhatsApp, EmailOutlined } from "@mui/icons-material";

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
const fmtD = (d: string) => { if (!d) return "—"; const p = d.split("-"); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : d; };
const fieldSx = { "& .MuiOutlinedInput-root": { borderRadius: "12px", backgroundColor: "rgba(15,23,42,0.5)", color: "#e2e8f0", fontFamily: "var(--font-cairo)", "& fieldset": { borderColor: "rgba(148,163,184,0.15)" }, "&:hover fieldset": { borderColor: "rgba(59,130,246,0.4)" }, "&.Mui-focused fieldset": { borderColor: "#3b82f6" } }, "& .MuiInputLabel-root": { color: "#64748b", fontFamily: "var(--font-cairo)", "&.Mui-focused": { color: "#60a5fa" } } };
const acPaperSx = { sx: { background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "12px" } };
const ro = (props: any, label: React.ReactNode) => <li {...props} style={{ fontFamily: "var(--font-cairo)", fontSize: "14px", color: "#e2e8f0", direction: "rtl", display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>{label}</li>;
const dlgSx = { "& .MuiDialog-paper": { background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "20px", color: "#e2e8f0", direction: "rtl" as const, minWidth: "min(600px, 96vw)" } };
const PSTAT: Record<string, { label: string; color: string }> = { pending: { label: "لم يُسدد", color: "#f59e0b" }, partial: { label: "جزئي", color: "#60a5fa" }, paid: { label: "مسدد", color: "#10b981" } };
const DSTAT: Record<string, { label: string; color: string }> = { pending: { label: "لم يُسلَّم", color: "#94a3b8" }, delivered: { label: "مُسلَّم", color: "#10b981" } };

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

type SI = { item_id: string; quantity: string; unit_price: string };
const emptyI = (): SI => ({ item_id: "", quantity: "", unit_price: "" });
const emptyF = () => ({ customer_id: "", customer_name: "", customer_phone: "", sale_date: fmtD(new Date().toISOString().split("T")[0]), notes: "" });

export default function SalesPage() {
  const { projectId } = useProject();
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [vaults, setVaults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyF());
  const [sItems, setSItems] = useState<SI[]>([emptyI()]);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState(emptyF());
  const [editItems, setEditItems] = useState<SI[]>([emptyI()]);

  // Pay dialog
  const [payOpen, setPayOpen] = useState(false);
  const [paySale, setPaySale] = useState<any>(null);
  const [payForm, setPayForm] = useState({ vault_id: "", amount: "", notes: "", payment_date: fmtD(new Date().toISOString().split("T")[0]) });

  // Pay expenses dialog
  const [payExpOpen, setPayExpOpen] = useState(false);
  const [payExpSale, setPayExpSale] = useState<any>(null);
  const [payExpForm, setPayExpForm] = useState({ vault_id: "", amount: "", notes: "", payment_date: fmtD(new Date().toISOString().split("T")[0]) });
  const [payExpMax, setPayExpMax] = useState(0);

  // Add expense dialog
  const [expOpen, setExpOpen] = useState(false);
  const [expSaleId, setExpSaleId] = useState("");
  const [expForm, setExpForm] = useState({ description: "", amount: "", vault_id: "", payment_status: "immediate", advance_amount: "" });

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  
  const [printSale, setPrintSale] = useState<any>(null);
  const [shareQuote, setShareQuote] = useState<any>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState<string | null>(null);
  const [waTemplate, setWaTemplate] = useState<string>("");

  const fetchAll = useCallback(async () => {
    const [sr, er, cr, ir, vr, tr] = await Promise.all([
      fetch(`/api/erp-auth/projects/${projectId}/proj2-sales`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-expenses`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-customers`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-items`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-vaults`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-msg-templates`),
    ]);
    const [sd, ed, cd, id, vd, td] = await Promise.all([sr.json(), er.json(), cr.json(), ir.json(), vr.json(), tr.json()]);
    setSales(sd.sales || []); setExpenses(ed.expenses || []); setCustomers(cd.customers || []);
    setItems(id.items || []); setVaults(vd.vaults || []);
    if (td?.invoice_whatsapp) setWaTemplate(td.invoice_whatsapp);
    setLoading(false);
  }, [projectId]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const itTotal = (its: SI[]) => its.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
  const mapItems = (its: SI[]) => its.filter(i => i.item_id && Number(i.quantity) > 0 && Number(i.unit_price) > 0).map(i => ({ item_id: i.item_id, quantity: Number(i.quantity), unit_price: Number(i.unit_price) }));
  const patch = async (url: string, body: any) => fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const handleAdd = async () => {
    setSaving(true);
    const valid = mapItems(sItems);
    if (!valid.length) { setError("أضف صنفاً واحداً على الأقل"); setSaving(false); return; }
    const r = await fetch(`/api/erp-auth/projects/${projectId}/proj2-sales`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, sale_date: fmtD(form.sale_date), items: valid }) });
    if (!r.ok) { const d = await r.json(); setError(d.error); } else { setSuccess("تم إنشاء فاتورة البيع"); setAddOpen(false); fetchAll(); }
    setSaving(false);
  };

  const handleEdit = async () => {
    setSaving(true);
    const r = await patch(`/api/erp-auth/projects/${projectId}/proj2-sales/${editTarget.id}`, { action: "edit", ...editForm, sale_date: fmtD(editForm.sale_date), items: mapItems(editItems) });
    if (!r.ok) { const d = await r.json(); setError(d.error); } else { setSuccess("تم تعديل الفاتورة"); setEditOpen(false); fetchAll(); }
    setSaving(false);
  };

  const handlePay = async () => {
    setSaving(true);
    const r = await patch(`/api/erp-auth/projects/${projectId}/proj2-sales/${paySale.id}`, { action: "pay", ...payForm, payment_date: fmtD(payForm.payment_date), amount: Number(payForm.amount) });
    if (!r.ok) { const d = await r.json(); setError(d.error); } else { setSuccess("تم تسجيل الدفعة"); setPayOpen(false); fetchAll(); }
    setSaving(false);
  };

  const handlePayExpenses = async () => {
    setSaving(true);
    let remAmt = Number(payExpForm.amount);
    const linkedUnpaid = expenses.filter(e => e.expense_type === "sale" && Array.isArray(e.sale_order_ids) && e.sale_order_ids.includes(payExpSale.id) && Number(e.amount) > Number(e.paid_amount));
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

  const handleDeliver = async (sale: any) => {
    const r = await patch(`/api/erp-auth/projects/${projectId}/proj2-sales/${sale.id}`, { action: "deliver" });
    if (!r.ok) { const d = await r.json(); setError(d.error); } else { setSuccess("تم تسجيل التسليم وتحديث المخزن"); fetchAll(); }
  };

  const handleAddExpense = async () => {
    setSaving(true);
    const actualPaid = expForm.payment_status === "immediate" ? Number(expForm.amount) : expForm.payment_status === "advance" ? Number(expForm.advance_amount) : 0;
    const r = await fetch(`/api/erp-auth/projects/${projectId}/proj2-expenses`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expense_type: "sale", sale_order_ids: [expSaleId],
        description: expForm.description, amount: Number(expForm.amount),
        payment_status: expForm.payment_status,
        paid_amount: actualPaid,
        vault_id: expForm.vault_id || null,
        expense_date: new Date().toISOString().split("T")[0]
      }),
    });
    if (!r.ok) { const d = await r.json(); setError(d.error); } else { setSuccess("تم تسجيل المصروف"); setExpOpen(false); fetchAll(); }
    setSaving(false);
  };

  const handleDelete = async () => {
    const r = await fetch(`/api/erp-auth/projects/${projectId}/proj2-sales/${deleteTarget.id}`, { method: "DELETE" });
    if (!r.ok) { const d = await r.json(); setError(d.error); } else { setSuccess("تم الحذف"); setDeleteOpen(false); fetchAll(); }
  };

  const handleWhatsApp = async (s: any) => {
    const phone = s.customer_phone || s.customer?.phones?.[0] || "";
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "2" + cleanPhone;
    const customerName = s.customer?.name || s.customer_name || "عميلنا العزيز";

    setSharing(s.id);
    setShareQuote(s);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise(r => setTimeout(r, 250));

    try {
      const element = captureRef.current;
      if (!element) throw new Error("capture element missing");

      const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false, windowWidth: 794 });
      const pdf = new (JsPDF as unknown as typeof JsPDFType)("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const imgH = (canvas.height * pageW) / canvas.width;
      let yPos = 0, remaining = imgH;
      while (remaining > 0) {
        pdf.addImage(imgData, "JPEG", 0, -yPos, pageW, imgH);
        remaining -= pageH; yPos += pageH;
        if (remaining > 0) pdf.addPage();
      }

      const blob = pdf.output("blob");
      const file = new File([blob], `فاتورة-بيع-${s.code}.pdf`, { type: "application/pdf" });

      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-sales/${s.id}/pdf-link`, { method: "POST", body: fd });
      const { url, error: uploadErr } = await res.json();
      if (uploadErr) throw new Error(uploadErr);

      const DEFAULT_TMPL = `مرحباً {{اسم_العميل}}،\n\nيسعدنا تواصلكم مع شركة سند برو كابيتال للمشروعات.\nفاتورة البيع رقم: {{رقم_الفاتورة}}\nالإجمالي: {{الإجمالي}} ج.م\n\n📄 رابط الفاتورة:\n{{رابط_PDF}}\n\nنسعد بخدمتكم،\nإدارة المبيعات\n01100994488`;
      const tmpl = waTemplate || DEFAULT_TMPL;
      const msgText = tmpl
        .replaceAll("{{اسم_العميل}}", customerName)
        .replaceAll("{{رقم_الفاتورة}}", s.code)
        .replaceAll("{{الإجمالي}}", fmt(s.total_amount))
        .replaceAll("{{رابط_PDF}}", url)
        .replaceAll("{{تاريخ_الفاتورة}}", fmtD(s.sale_date || ""));
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msgText)}`, "_blank");

    } catch (err: any) {
      console.error("Invoice WhatsApp PDF error:", err);
      const fallback = encodeURIComponent(`مرحباً ${customerName}،\n\nيسعدنا تواصلكم مع شركة سند برو كابيتال.\nفاتورة البيع رقم: ${s.code}\nالإجمالي: ${fmt(s.total_amount)} ج.م`);
      window.open(`https://wa.me/${cleanPhone}?text=${fallback}`, "_blank");
      setError(`تعذر رفع الملف (${err?.message}) — تم فتح واتساب بالنص فقط`);
    } finally {
      setSharing(null);
      setShareQuote(null);
    }
  };

  const handleEmail = (s: any) => {
    const email = s.customer?.email || "";
    const subject = encodeURIComponent(`فاتورة مبيعات رقم ${s.code} - شركة سند برو كابيتال`);
    const body = encodeURIComponent(`مرحباً ${s.customer?.name || s.customer_name || "عميلنا العزيز"}،\n\nيسعدنا تواصلكم مع شركة سند برو كابيتال للمشروعات.\nتجدون طيه فاتورة المبيعات رقم: ${s.code}\nبإجمالي مبلغ: ${fmt(s.total_amount)} ج.م\n\nبرجاء مراجعة المرفقات.\nنسعد بخدمتكم،\nإدارة المبيعات`);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_self");
  };

  const IE = ({ its, set }: { its: SI[], set: (v: SI[]) => void }) => (
    <div style={{ direction: "rtl" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>الأصناف</span>
        <IconButton size="small" onClick={() => set([...its, emptyI()])} sx={{ color: "#10b981" }}><AddCircleOutline sx={{ fontSize: 18 }} /></IconButton>
      </div>
      {its.map((it, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
          <Autocomplete options={items} getOptionLabel={(o: any) => o.name || ""} value={items.find((o: any) => o.id === it.item_id) || null}
            onChange={(_, val) => set(its.map((x, j) => j === i ? { ...x, item_id: val?.id || "" } : x))}
            isOptionEqualToValue={(a, b) => a.id === b.id} noOptionsText={<span style={{ fontFamily: "var(--font-cairo)" }}>لا يوجد</span>}
            slotProps={{ paper: acPaperSx }} renderOption={(props, o) => ro(props, <>{o.name} <span style={{ color: "#64748b", fontSize: "12px", marginRight: "4px" }}>({o.unit})</span> <span style={{ color: "#10b981", fontSize: "11px", background: "rgba(16,185,129,0.1)", padding: "2px 8px", borderRadius: "8px", marginRight: "auto", fontWeight: 700 }}>متوفر: {fmt(o.stock_quantity || 0)}</span></>)}
            renderInput={p => <TextField {...p} placeholder="الصنف" size="small" sx={fieldSx} inputProps={{ ...p.inputProps, style: { textAlign: "right", fontFamily: "var(--font-cairo)", fontSize: "13px" } }} />} />
          <TextField placeholder="كمية" size="small" type="number" value={it.quantity} onChange={e => set(its.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} sx={{ ...fieldSx, width: 80, "& .MuiInputBase-input": { textAlign: "center" } }} />
          <TextField placeholder="سعر" size="small" type="number" value={it.unit_price} onChange={e => set(its.map((x, j) => j === i ? { ...x, unit_price: e.target.value } : x))} sx={{ ...fieldSx, width: 90, "& .MuiInputBase-input": { textAlign: "center" } }} />
          <IconButton size="small" onClick={() => set(its.filter((_, j) => j !== i))} sx={{ color: "#f87171" }}><RemoveCircleOutline sx={{ fontSize: 18 }} /></IconButton>
        </div>
      ))}
      <p style={{ margin: "8px 0 0", fontSize: "14px", fontWeight: 700, color: "#f1f5f9", fontFamily: "var(--font-cairo)", textAlign: "left" }}>الإجمالي: {fmt(itTotal(its))} جنيه</p>
    </div>
  );

  const CF = ({ f, set }: { f: typeof form, set: (v: any) => void }) => (
    <>
      <Autocomplete options={customers} getOptionLabel={(c: any) => c.name || ""} value={customers.find(c => c.id === f.customer_id) || null}
        onChange={(_, val) => set({ ...f, customer_id: val?.id || "", customer_name: val?.name || "", customer_phone: val?.phones?.[0] || "" })}
        isOptionEqualToValue={(a, b) => a.id === b.id} freeSolo
        noOptionsText={<span style={{ fontFamily: "var(--font-cairo)", color: "#64748b" }}>اكتب اسم عميل جديد</span>}
        slotProps={{ paper: acPaperSx }} renderOption={(props, c) => ro(props, c.name)}
        onInputChange={(_, val) => set({ ...f, customer_name: val })}
        renderInput={p => <TextField {...p} label="العميل" fullWidth sx={fieldSx} inputProps={{ ...p.inputProps, style: { textAlign: "right", fontFamily: "var(--font-cairo)" } }} />} />
      <TextField label="رقم الهاتف" value={f.customer_phone} onChange={e => set({ ...f, customer_phone: e.target.value })} fullWidth sx={fieldSx} inputProps={{ style: { direction: "ltr" } }} />
      <DateField label="تاريخ الفاتورة" value={f.sale_date} onChange={v => set({ ...f, sale_date: v })} />
    </>
  );

  return (
    <>
      <div style={{ display: printSale ? "none" : "block" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>فواتير البيع</h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0, fontFamily: "var(--font-cairo)" }}>إدارة فواتير البيع والتحصيل والتسليم</p>
        </div>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => { setForm(emptyF()); setSItems([emptyI()]); setAddOpen(true); }}
          sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", whiteSpace: "nowrap" }}>
          فاتورة بيع جديدة
        </Button>
      </div>
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(239,68,68,0.1)", color: "#fca5a5", fontFamily: "var(--font-cairo)", direction: "rtl" }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(34,197,94,0.1)", color: "#86efac", fontFamily: "var(--font-cairo)", direction: "rtl" }}>{success}</Alert>}
      {loading ? <div style={{ textAlign: "center", padding: "60px 0" }}><CircularProgress sx={{ color: "#10b981" }} /></div>
        : sales.length === 0
          ? <div style={{ textAlign: "center", padding: "60px 24px", borderRadius: "20px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
              <p style={{ fontSize: "48px", margin: "0 0 12px" }}>🛍️</p>
              <p style={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "16px" }}>لا توجد فواتير بيع بعد</p>
            </div>
          : <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {sales.map(sale => {
              const ps = PSTAT[sale.payment_status] || PSTAT.pending;
              const ds = DSTAT[sale.status] || DSTAT.pending;
              const linkedExpenses = expenses.filter(e => e.expense_type === "sale" && Array.isArray(e.sale_order_ids) && e.sale_order_ids.includes(sale.id));
              const expTotal = linkedExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
              return (
                <div key={sale.id} style={{ padding: "18px", borderRadius: "16px", background: "rgba(30,41,59,0.5)", border: "1px solid rgba(148,163,184,0.08)", direction: "rtl" }}>
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#34d399", fontFamily: "monospace", background: "rgba(52,211,153,0.1)", padding: "3px 8px", borderRadius: "8px" }}>{sale.code}</span>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9", fontFamily: "var(--font-cairo)" }}>{sale.customer?.name || sale.customer_name || "—"}</span>
                      {sale.customer_phone && <span style={{ fontSize: "12px", color: "#64748b", direction: "ltr" }}>{sale.customer_phone}</span>}
                      <Chip label={ds.label} size="small" sx={{ background: `${ds.color}22`, color: ds.color, fontFamily: "var(--font-cairo)", fontSize: "11px", height: "20px" }} />
                      <Chip label={ps.label} size="small" sx={{ background: `${ps.color}22`, color: ps.color, fontFamily: "var(--font-cairo)", fontSize: "11px", height: "20px" }} />
                    </div>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <IconButton size="small" title="إرسال عبر واتساب" onClick={() => handleWhatsApp(sale)} disabled={sharing === sale.id} sx={{ color: "#22c55e", "&:hover": { background: "rgba(34,197,94,0.1)" } }}>
                        {sharing === sale.id ? <CircularProgress size={14} sx={{ color: "#22c55e" }} /> : <WhatsApp sx={{ fontSize: 16 }} />}
                      </IconButton>
                      <IconButton size="small" title="إرسال عبر الإيميل" onClick={() => handleEmail(sale)} sx={{ color: "#eab308", "&:hover": { background: "rgba(234,179,8,0.1)" } }}><EmailOutlined sx={{ fontSize: 16 }} /></IconButton>
                      <IconButton size="small" title="طباعة / PDF" onClick={() => { setPrintSale(sale); setTimeout(() => window.print(), 500); }} sx={{ color: "#a855f7", "&:hover": { background: "rgba(168,85,247,0.1)" } }}><PrintOutlined sx={{ fontSize: 16 }} /></IconButton>
                      {sale.status !== "delivered" && (
                        <IconButton size="small" title="تسجيل التسليم" onClick={() => handleDeliver(sale)} sx={{ color: "#10b981", "&:hover": { background: "rgba(16,185,129,0.1)" } }}><LocalShippingOutlined sx={{ fontSize: 16 }} /></IconButton>
                      )}
                      {sale.payment_status !== "paid" && (
                        <IconButton size="small" title="تسجيل دفعة" onClick={() => { setPaySale(sale); setPayForm({ vault_id: "", amount: String(Number(sale.total_amount) - Number(sale.paid_amount)), notes: "", payment_date: fmtD(new Date().toISOString().split("T")[0]) }); setPayOpen(true); }} sx={{ color: "#f59e0b", "&:hover": { background: "rgba(245,158,11,0.1)" } }}><PaymentsOutlined sx={{ fontSize: 16 }} /></IconButton>
                      )}
                      <IconButton size="small" title="إضافة مصروف" onClick={() => { setExpSaleId(sale.id); setExpForm({ description: "", amount: "", vault_id: "", payment_status: "immediate", advance_amount: "" }); setExpOpen(true); }} sx={{ color: "#f97316", "&:hover": { background: "rgba(249,115,22,0.1)" } }}><MoneyOffOutlined sx={{ fontSize: 16 }} /></IconButton>
                      {(() => {
                        const expPaid = linkedExpenses.reduce((s: number, e: any) => s + Number(e.paid_amount), 0);
                        const expRemaining = expTotal - expPaid;
                        return expRemaining > 0 ? (
                          <IconButton size="small" title="سداد المصاريف" onClick={() => { setPayExpSale(sale); setPayExpMax(expRemaining); setPayExpForm({ vault_id: "", amount: String(expRemaining), notes: "", payment_date: fmtD(new Date().toISOString().split("T")[0]) }); setPayExpOpen(true); }} sx={{ color: "#c084fc", "&:hover": { background: "rgba(192,132,252,0.1)" } }}><AccountBalanceWalletOutlined sx={{ fontSize: 16 }} /></IconButton>
                        ) : null;
                      })()}
                      <IconButton size="small" title="تعديل" onClick={() => { setEditTarget(sale); setEditForm({ customer_id: sale.customer_id || "", customer_name: sale.customer_name || "", customer_phone: sale.customer_phone || "", sale_date: fmtD(sale.sale_date || ""), notes: sale.notes || "" }); setEditItems((sale.items || []).map((i: any) => ({ item_id: i.item_id || "", quantity: String(i.quantity), unit_price: String(i.unit_price) }))); setEditOpen(true); }} sx={{ color: "#60a5fa", "&:hover": { background: "rgba(59,130,246,0.1)" } }}><EditOutlined sx={{ fontSize: 16 }} /></IconButton>
                      <IconButton size="small" onClick={() => { setDeleteTarget(sale); setDeleteOpen(true); }} sx={{ color: "#64748b", "&:hover": { color: "#f87171", background: "rgba(248,113,113,0.1)" } }}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton>
                    </div>
                  </div>
                  {/* Items */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                    {(sale.items || []).map((it: any, i: number) => (
                      <span key={i} style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "var(--font-cairo)", background: "rgba(15,23,42,0.4)", padding: "4px 10px", borderRadius: "8px" }}>
                        {it.item?.name || "—"} × {it.quantity} {it.item?.unit} @ {fmt(it.unit_price)} جنيه
                      </span>
                    ))}
                  </div>
                  {/* Totals & Profit */}
                  {(() => {
                    const expPaid = linkedExpenses.reduce((s: number, e: any) => s + Number(e.paid_amount), 0);
                    const expRemaining = expTotal - expPaid;
                    const revenue = Number(sale.total_amount);
                    const profit = revenue - expTotal;
                    const profitPct = revenue > 0 ? (profit / revenue) * 100 : 0;
                    return (
                      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center", direction: "rtl", background: "rgba(15,23,42,0.3)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(148,163,184,0.05)" }}>
                        <span style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: "#64748b" }}>الإيرادات: <strong style={{ color: "#f1f5f9" }}>{fmt(revenue)} جنيه</strong></span>
                        <span style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: "#10b981" }}>محصَّل: <strong>{fmt(Number(sale.paid_amount))} جنيه</strong></span>
                        {Number(sale.paid_amount) < revenue && (
                          <span style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: "#f87171", background: "rgba(248,113,113,0.1)", padding: "2px 6px", borderRadius: "6px" }}>متبقي للتحصيل: <strong>{fmt(revenue - Number(sale.paid_amount))} جنيه</strong></span>
                        )}
                        <span style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: "#f59e0b" }}>التكلفة (المصروفات): <strong>{fmt(expTotal)} جنيه</strong></span>
                        {expRemaining > 0 && (
                          <span style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: "#c084fc", background: "rgba(192,132,252,0.1)", padding: "2px 6px", borderRadius: "6px" }}>مصروفات متبقية: <strong>{fmt(expRemaining)} جنيه</strong></span>
                        )}
                        <span style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: profit >= 0 ? "#34d399" : "#f87171", background: profit >= 0 ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)", padding: "2px 8px", borderRadius: "6px" }}>
                          الربح: <strong>{fmt(profit)} جنيه</strong> <span style={{ opacity: 0.8, fontSize: "11px" }}>({profitPct.toFixed(1)}%)</span>
                        </span>
                        <span style={{ fontSize: "11px", color: "#475569", direction: "ltr", marginRight: "auto" }}>{fmtD(sale.sale_date)}</span>
                      </div>
                    );
                  })()}
                  {/* Payments history */}
                  {(sale.payments || []).length > 0 && (
                    <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {sale.payments.map((p: any, i: number) => (
                        <span key={i} style={{ fontSize: "11px", color: "#64748b", background: "rgba(15,23,42,0.4)", padding: "3px 8px", borderRadius: "8px", fontFamily: "var(--font-cairo)" }}>
                          💰 {fmt(p.amount)} جنيه — {fmtD(p.payment_date)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
      }

      {/* Add Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} sx={dlgSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>فاتورة بيع جديدة</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          {CF({ f: form, set: setForm })}
          {IE({ its: sItems, set: setSItems })}
          <TextField label="ملاحظات" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} fullWidth sx={fieldSx} multiline rows={2} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setAddOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleAdd} disabled={saving} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "إنشاء الفاتورة"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} sx={dlgSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>تعديل فاتورة — {editTarget?.code}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          {CF({ f: editForm, set: setEditForm })}
          {IE({ its: editItems, set: setEditItems })}
          <TextField label="ملاحظات" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} fullWidth sx={fieldSx} multiline rows={2} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleEdit} disabled={saving} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حفظ التعديلات"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={payOpen} onClose={() => setPayOpen(false)} sx={{ "& .MuiDialog-paper": { ...dlgSx["& .MuiDialog-paper"], minWidth: "min(440px,94vw)" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#10b981" }}>تسجيل تحصيل — {paySale?.code}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <p style={{ margin: 0, fontFamily: "var(--font-cairo)", fontSize: "14px", color: "#94a3b8" }}>
            الإجمالي: <strong style={{ color: "#f1f5f9" }}>{fmt(Number(paySale?.total_amount))} جنيه</strong>
            {" · "}محصَّل: <strong style={{ color: "#10b981" }}>{fmt(Number(paySale?.paid_amount))} جنيه</strong>
            {" · "}متبقي: <strong style={{ color: "#f87171" }}>{fmt(Number(paySale?.total_amount) - Number(paySale?.paid_amount))} جنيه</strong>
          </p>
          <TextField label="المبلغ *" type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} />
          <Autocomplete options={vaults} getOptionLabel={(v: any) => `${v.name} — ${fmt(Number(v.balance))} جنيه`}
            value={vaults.find(v => v.id === payForm.vault_id) || null} onChange={(_, val) => setPayForm({ ...payForm, vault_id: val?.id || "" })}
            isOptionEqualToValue={(a, b) => a.id === b.id} noOptionsText={<span style={{ fontFamily: "var(--font-cairo)", color: "#64748b" }}>لا توجد خزن</span>}
            slotProps={{ paper: acPaperSx }} renderOption={(props, v) => ro(props, `${v.name} — ${fmt(Number(v.balance))} جنيه`)}
            renderInput={p => <TextField {...p} label="الإيداع في *" fullWidth sx={fieldSx} inputProps={{ ...p.inputProps, style: { textAlign: "right", fontFamily: "var(--font-cairo)" } }} />} />
          <DateField label="تاريخ الدفع" value={payForm.payment_date} onChange={v => setPayForm({ ...payForm, payment_date: v })} />
          <TextField label="ملاحظات" value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} fullWidth sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setPayOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handlePay} disabled={saving || !payForm.amount || !payForm.vault_id} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "تسجيل التحصيل"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Expense Dialog */}
      <Dialog open={expOpen} onClose={() => setExpOpen(false)} sx={{ "& .MuiDialog-paper": { ...dlgSx["& .MuiDialog-paper"], minWidth: "min(420px,94vw)" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#f97316" }}>إضافة مصروف للفاتورة</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>🧾 {sales.find(s => s.id === expSaleId)?.code}</p>
          <TextField label="البيان *" value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} fullWidth sx={fieldSx} />
          <TextField label="المبلغ الإجمالي *" type="number" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} />
          <div style={{ direction: "rtl", display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={{ fontSize: "14px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>حالة السداد:</span>
            {[{ v: "immediate", l: "دفع فوري" }, { v: "advance", l: "عربون" }, { v: "future", l: "دفع مستقبلي" }].map(opt => (
              <Chip key={opt.v} label={opt.l} onClick={() => setExpForm({ ...expForm, payment_status: opt.v, advance_amount: "" })}
                sx={{ fontFamily: "var(--font-cairo)", fontSize: "12px", cursor: "pointer", background: expForm.payment_status === opt.v ? "linear-gradient(135deg, #f97316 0%, #ea580c 100%)" : "rgba(30,41,59,0.8)", color: expForm.payment_status === opt.v ? "#fff" : "#94a3b8", border: expForm.payment_status === opt.v ? "none" : "1px solid rgba(148,163,184,0.2)" }} />
            ))}
          </div>
          {expForm.payment_status === "advance" && (
            <TextField label="مبلغ العربون *" type="number" value={expForm.advance_amount} onChange={e => setExpForm({ ...expForm, advance_amount: e.target.value })} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} />
          )}
          {expForm.payment_status !== "future" && (
            <Autocomplete options={vaults} getOptionLabel={(v: any) => `${v.name} — ${fmt(Number(v.balance))} جنيه`}
              value={vaults.find(v => v.id === expForm.vault_id) || null} onChange={(_, val) => setExpForm({ ...expForm, vault_id: val?.id || "" })}
              isOptionEqualToValue={(a, b) => a.id === b.id} noOptionsText={<span style={{ fontFamily: "var(--font-cairo)", color: "#64748b" }}>لا توجد خزن</span>}
              slotProps={{ paper: acPaperSx }} renderOption={(props, v) => ro(props, `${v.name} — ${fmt(Number(v.balance))} جنيه`)}
              renderInput={p => <TextField {...p} label="الدفع من *" fullWidth sx={fieldSx} inputProps={{ ...p.inputProps, style: { textAlign: "right", fontFamily: "var(--font-cairo)" } }} />} />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setExpOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleAddExpense} disabled={saving || !expForm.description || !expForm.amount} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "تسجيل المصروف"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} sx={{ "& .MuiDialog-paper": { ...dlgSx["& .MuiDialog-paper"], minWidth: "min(380px,94vw)" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#f87171" }}>حذف الفاتورة</DialogTitle>
        <DialogContent><p style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", margin: 0 }}>هل تريد حذف <strong style={{ color: "#e2e8f0" }}>{deleteTarget?.code}</strong>؟</p></DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleDelete} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "#dc2626" }}>حذف</Button>
        </DialogActions>
      </Dialog>

      {/* Pay Expenses Dialog */}
      <Dialog open={payExpOpen} onClose={() => setPayExpOpen(false)} sx={{ "& .MuiDialog-paper": { ...dlgSx["& .MuiDialog-paper"], minWidth: "min(440px,94vw)" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#c084fc" }}>سداد مصاريف — {payExpSale?.code}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <p style={{ margin: 0, fontFamily: "var(--font-cairo)", fontSize: "14px", color: "#94a3b8" }}>
            متبقي المصاريف: <strong style={{ color: "#c084fc" }}>{fmt(payExpMax)} جنيه</strong>
          </p>
          <TextField label="المبلغ *" type="number" value={payExpForm.amount} onChange={e => setPayExpForm({ ...payExpForm, amount: e.target.value })} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} />
          <Autocomplete options={vaults} getOptionLabel={(v: any) => `${v.name} — ${fmt(Number(v.balance))} جنيه`}
            value={vaults.find(v => v.id === payExpForm.vault_id) || null} onChange={(_, val) => setPayExpForm({ ...payExpForm, vault_id: val?.id || "" })}
            isOptionEqualToValue={(a, b) => a.id === b.id} noOptionsText={<span style={{ fontFamily: "var(--font-cairo)", color: "#64748b" }}>لا توجد خزن</span>}
            slotProps={{ paper: acPaperSx }} renderOption={(props, v) => ro(props, `${v.name} — ${fmt(Number(v.balance))} جنيه`)}
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
      </div>

      {/* Hidden off-screen capture div for invoice PDF */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1, pointerEvents: "none", width: "794px" }}>
        {shareQuote && (
          <div ref={captureRef} style={{ background: "#fff", color: "#000", direction: "rtl", padding: "20px 40px", fontFamily: "Cairo, sans-serif", width: "794px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #cbd5e1", paddingBottom: "16px", marginBottom: "24px" }}>
              <div style={{ textAlign: "right", width: "50%" }}>
                <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", margin: "0 0 16px 0" }}>فاتورة مبيعات<br/><span style={{ fontSize: "14px", fontWeight: 500, color: "#64748b" }}>SALES INVOICE</span></h1>
                <table style={{ width: "auto", fontSize: "13px", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr><td style={{ padding: "0 0 4px 0", color: "#64748b", fontWeight: 600, width: "130px" }}>رقم الفاتورة / No:</td><td style={{ padding: "0 16px 4px 0", fontWeight: 700, direction: "ltr" }}>{shareQuote.code}</td></tr>
                    <tr><td style={{ padding: "0 0 4px 0", color: "#64748b", fontWeight: 600, width: "130px" }}>التاريخ / Date:</td><td style={{ padding: "0 16px 4px 0", direction: "ltr" }}>{fmtD(shareQuote.sale_date)}</td></tr>
                  </tbody>
                </table>
              </div>
              <div style={{ textAlign: "left", width: "50%" }}>
                <img src="/images/long logo.png" alt="Sanad Pro Capital" style={{ maxHeight: "70px", objectFit: "contain", maxWidth: "250px" }} crossOrigin="anonymous" />
              </div>
            </div>
            <div style={{ display: "flex", gap: "24px", marginBottom: "24px" }}>
              <div style={{ flex: 1, background: "#f8fafc", padding: "12px 16px", border: "1px solid #e2e8f0", borderRight: "4px solid #0f172a", borderRadius: "8px" }}>
                <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>مقدم إلى / INVOICED TO:</p>
                <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>{shareQuote.customer?.name || shareQuote.customer_name || "—"}</p>
                {shareQuote.customer_phone && <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#475569", direction: "ltr", textAlign: "right" }}>{shareQuote.customer_phone}</p>}
              </div>
              <div style={{ flex: 1, background: "#f8fafc", padding: "12px 16px", border: "1px solid #e2e8f0", borderRight: "4px solid #10b981", borderRadius: "8px" }}>
                <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>مقدم من / ISSUED BY:</p>
                <p style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#1e3a8a" }}>شركة سند برو كابيتال للمشروعات</p>
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#64748b" }}>Sanad Pro Capital For Projects (S.A.E)</p>
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#0f172a", color: "#fff" }}>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>البيان / Description</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", width: "15%" }}>الكمية / Qty</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", width: "18%" }}>سعر الوحدة / Unit Price</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", width: "20%" }}>الإجمالي / Total</th>
                </tr>
              </thead>
              <tbody>
                {(shareQuote.items || []).map((it: any, i: number) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1e293b", border: "1px solid #e2e8f0" }}>{it.item?.name || "—"} {it.item?.unit ? `(${it.item.unit})` : ""}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", direction: "ltr", border: "1px solid #e2e8f0" }}>{fmt(Number(it.quantity))}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", direction: "ltr", border: "1px solid #e2e8f0" }}>{fmt(Number(it.unit_price))}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, direction: "ltr", border: "1px solid #e2e8f0" }}>{fmt((Number(it.quantity) || 0) * (Number(it.unit_price) || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}>
              <div style={{ border: "1px solid #e2e8f0", padding: "10px 20px", background: "#f8fafc", fontSize: "15px", fontWeight: 800, color: "#0f172a", direction: "ltr" }}>
                Grand Total: {fmt(shareQuote.total_amount)} ج.م
              </div>
            </div>
            {shareQuote.notes && <p style={{ fontSize: "12px", color: "#334155", border: "1px solid #e2e8f0", padding: "12px", background: "#fbfcfd" }}>{shareQuote.notes}</p>}
            <div style={{ marginTop: "32px", paddingTop: "12px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569", fontWeight: 700, direction: "ltr" }}>
              <span>01100994488</span><span>info@sanadproprojects.com</span><span>www.sanadproprojects.com</span>
            </div>
          </div>
        )}
      </div>

      {printSale && (
        <div id="print-root" style={{ background: "#fff", color: "#000", direction: "rtl", padding: "20px 40px", fontFamily: "var(--font-cairo), sans-serif", minHeight: "100vh" }}>
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #print-root, #print-root * { visibility: visible; }
              #print-root { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; box-sizing: border-box; }
              @page { size: A4; margin: 0; }
              .no-print { display: none !important; }
            }
          `}</style>

          <div className="no-print" style={{ display: "flex", gap: "10px", marginBottom: "20px", justifyContent: "flex-end" }}>
            <Button variant="outlined" onClick={() => setPrintSale(null)} sx={{ fontFamily: "var(--font-cairo)" }}>إغلاق وتشغيل النظام</Button>
            <Button variant="contained" onClick={() => window.print()} startIcon={<PrintOutlined />} sx={{ fontFamily: "var(--font-cairo)", background: "#3b82f6" }}>حفظ كـ PDF / طباعة</Button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #cbd5e1", paddingBottom: "16px", marginBottom: "24px" }}>
            <div style={{ textAlign: "right", width: "50%" }}>
              <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", margin: "0 0 16px 0", letterSpacing: "-0.5px" }}>فاتورة مبيعات<br/><span style={{ fontSize: "14px", fontWeight: 500, color: "#64748b", letterSpacing: "1px" }}>SALES INVOICE</span></h1>
              <table style={{ width: "auto", fontSize: "13px", borderCollapse: "collapse" }}>
                <tbody>
                  <tr><td style={{ padding: "0 0 4px 0", color: "#64748b", fontWeight: 600, textAlign: "right", width: "130px" }}>رقم الفاتورة / No:</td><td style={{ padding: "0 16px 4px 0", textAlign: "right", fontWeight: 700, direction: "ltr" }}>{printSale.code}</td></tr>
                  <tr><td style={{ padding: "0 0 4px 0", color: "#64748b", fontWeight: 600, textAlign: "right", width: "130px" }}>التاريخ / Date:</td><td style={{ padding: "0 16px 4px 0", textAlign: "right", direction: "ltr" }}>{fmtD(printSale.sale_date)}</td></tr>
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: "left", width: "50%" }}>
              <img src="/images/long logo.png" alt="Sanad Pro Capital" style={{ maxHeight: "70px", objectFit: "contain", maxWidth: "250px" }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: "24px", marginBottom: "24px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ background: "#f8fafc", padding: "12px 16px", border: "1px solid #e2e8f0", borderRight: "4px solid #0f172a", borderRadius: "8px", minHeight: "80px" }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>مقدم إلى العميل / INVOICED TO:</h3>
                <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>{printSale.customer?.name || printSale.customer_name || "—"}</p>
                {printSale.customer_phone && <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#475569", direction: "ltr", textAlign: "right", fontWeight: 600 }}>{printSale.customer_phone}</p>}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ background: "#f8fafc", padding: "12px 16px", border: "1px solid #e2e8f0", borderRight: "4px solid #3b82f6", borderRadius: "8px", minHeight: "80px" }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>مقدم من / ISSUED BY:</h3>
                <p style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#1e3a8a" }}>شركة سند برو كابيتال للمشروعات <span style={{ fontWeight: 600, color: "#64748b", fontSize: "14px" }}>(ش.م.م)</span></p>
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Sanad Pro Capital For Projects (S.A.E)</p>
              </div>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#0f172a", color: "#fff" }}>
                <th style={{ padding: "10px 12px", textAlign: "right", border: "1px solid #0f172a" }}>البيان / Description</th>
                <th style={{ padding: "10px 12px", textAlign: "center", border: "1px solid #0f172a", width: "15%" }}>الكمية / Qty</th>
                <th style={{ padding: "10px 12px", textAlign: "center", border: "1px solid #0f172a", width: "18%" }}>سعر الوحدة / Unit Price</th>
                <th style={{ padding: "10px 12px", textAlign: "center", border: "1px solid #0f172a", width: "20%" }}>الإجمالي / Total</th>
              </tr>
            </thead>
            <tbody>
              {(printSale.items || []).map((it: any, i: number) => {
                const rowTotal = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1e293b", border: "1px solid #e2e8f0", borderTop: "none" }}>{it.item?.name || "—"} {it.item?.unit ? `(${it.item.unit})` : ""}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", color: "#475569", direction: "ltr", border: "1px solid #e2e8f0", borderTop: "none" }}>{fmt(Number(it.quantity))}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", color: "#475569", direction: "ltr", border: "1px solid #e2e8f0", borderTop: "none" }}>{fmt(Number(it.unit_price))}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#0f172a", direction: "ltr", border: "1px solid #e2e8f0", borderTop: "none" }}>{fmt(rowTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "24px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ padding: "12px", border: "1px solid #e2e8f0", background: "#fbfcfd", minHeight: "80px" }}>
                <h4 style={{ margin: "0 0 6px 0", color: "#64748b", fontSize: "12px", textTransform: "uppercase" }}>الملاحظات / Notes:</h4>
                <p style={{ margin: 0, fontSize: "12px", whiteSpace: "pre-wrap", color: "#334155", lineHeight: 1.6 }}>{printSale.notes || "لا توجد ملاحظات إضافية."}</p>
              </div>
            </div>
            <div style={{ width: "320px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 12px", background: "#f8fafc", fontWeight: 700, border: "1px solid #e2e8f0", color: "#475569" }}>الإجمالي الكلي / Grand Total</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 800, fontSize: "15px", color: "#0f172a", border: "1px solid #e2e8f0", direction: "ltr" }}>{fmt(printSale.total_amount)} ج.م</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 12px", background: "#f8fafc", fontWeight: 600, border: "1px solid #e2e8f0", color: "#10b981" }}>المدفوع / Paid</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, fontSize: "14px", color: "#10b981", border: "1px solid #e2e8f0", direction: "ltr" }}>{fmt(printSale.paid_amount)} ج.م</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 12px", background: "#f8fafc", fontWeight: 600, border: "1px solid #e2e8f0", color: "#ef4444" }}>المتبقي / Remaining</td>
                    <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, fontSize: "14px", color: "#ef4444", border: "1px solid #e2e8f0", direction: "ltr" }}>{fmt(Number(printSale.total_amount) - Number(printSale.paid_amount))} ج.م</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "60px", padding: "0 40px" }}>
            <div style={{ textAlign: "center", width: "200px" }}>
              <p style={{ margin: "0 0 40px 0", fontSize: "13px", fontWeight: 600, color: "#475569", borderBottom: "1px solid #94a3b8", paddingBottom: "10px" }}>توقيع العميل / Customer Signature</p>
            </div>
            <div style={{ textAlign: "center", width: "200px" }}>
              <p style={{ margin: "0 0 40px 0", fontSize: "13px", fontWeight: 600, color: "#475569", borderBottom: "1px solid #94a3b8", paddingBottom: "10px" }}>توقيع / ختم الشركة<br/>Company Stamp & Signature</p>
            </div>
          </div>

          <div style={{ marginTop: "40px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#475569", fontWeight: 700, direction: "ltr", marginBottom: "12px", fontFamily: "Arial, sans-serif", letterSpacing: "0.5px" }}>
              <span>01100994488</span>
              <span>info@sanadproprojects.com</span>
              <span>www.sanadproprojects.com</span>
            </div>
            <div style={{ textAlign: "center", color: "#64748b", fontSize: "11px", lineHeight: "1.8", direction: "rtl" }}>
              نشكركم على ثقتكم الغالية بنا.
              <br />
              <strong>تنويه قانوني:</strong> لا يُعتد بهذا المستند كفاتورة رسمية مُلزمة للشركة إلا في حال كونه ممهوراً بالختم الأصلي للشركة، أو مُرسلاً من البريد الإلكتروني الرسمي المعتمد لها.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
