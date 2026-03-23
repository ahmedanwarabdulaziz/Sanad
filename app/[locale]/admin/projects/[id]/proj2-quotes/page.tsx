"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type JsPDFType from "jspdf";
import { useProject } from "../layout";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Alert, IconButton, Chip, Autocomplete, InputAdornment, Select, MenuItem, FormControl, InputLabel } from "@mui/material";
import { AddOutlined, DeleteOutline, EditOutlined, SendOutlined, SwapHorizOutlined, AddCircleOutline, RemoveCircleOutline, CalendarMonthOutlined, PrintOutlined, WhatsApp, EmailOutlined } from "@mui/icons-material";

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
// fmtD is symmetric: yyyy-mm-dd ↔ dd-mm-yyyy (reversing 3 dash-separated parts)
const fmtD = (d: string) => { if (!d) return ""; const p = d.split("-"); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : d; };
const today = () => fmtD(new Date().toISOString().split("T")[0]);
const fieldSx = { "& .MuiOutlinedInput-root": { borderRadius: "12px", backgroundColor: "rgba(15,23,42,0.5)", color: "#e2e8f0", fontFamily: "var(--font-cairo)", "& fieldset": { borderColor: "rgba(148,163,184,0.15)" }, "&:hover fieldset": { borderColor: "rgba(59,130,246,0.4)" }, "&.Mui-focused fieldset": { borderColor: "#3b82f6" } }, "& .MuiInputLabel-root": { color: "#64748b", fontFamily: "var(--font-cairo)", "&.Mui-focused": { color: "#60a5fa" } } };
const acPaperSx = { sx: { background: "#1e293b", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "12px", color: "#e2e8f0", "& .MuiMenuItem-root": { fontFamily: "var(--font-cairo)", "&:hover": { background: "rgba(59,130,246,0.1)" } } } };
const ro = (props: any, label: React.ReactNode) => <li {...props} style={{ fontFamily: "var(--font-cairo)", fontSize: "14px", color: "#e2e8f0", direction: "rtl", display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>{label}</li>;
const dlgSx = { "& .MuiDialog-paper": { background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "20px", color: "#e2e8f0", direction: "rtl" as const, minWidth: "min(600px, 96vw)" } };
const STATUS: Record<string, { label: string; color: string }> = { draft: { label: "مسودة", color: "#94a3b8" }, sent: { label: "مُرسل", color: "#60a5fa" }, converted: { label: "محوَّل", color: "#10b981" }, cancelled: { label: "ملغي", color: "#f87171" } };
const dateSx = { ...fieldSx, "& .MuiInputBase-input": { textAlign: "left" as const, direction: "ltr" as const, letterSpacing: "1px" } };

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

type QI = { item_id: string; quantity: string; unit_price: string; custom_name?: string; display_mode?: "item_only" | "custom_only" | "both" };
const emptyQ = (): QI => ({ item_id: "", quantity: "", unit_price: "", custom_name: "", display_mode: "item_only" });
const emptyF = () => ({ customer_id: "", customer_name: "", customer_phone: "", quote_date: today(), valid_until: "", notes: "" });

const getItemDisplayName = (it: any) => {
  const realName = it.item?.name ? `${it.item.name} ${it.item?.unit ? `(${it.item.unit})` : ""}` : "—";
  const customName = it.custom_name || "";
  const mode = it.display_mode || "item_only";
  
  if (mode === "custom_only" && customName) return customName;
  if (mode === "both" && customName) return `${realName} - ${customName}`;
  return realName;
};

export default function QuotesPage() {
  const { projectId } = useProject();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [period, setPeriod] = useState<"month"|"year"|"all">("month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyF());
  const [qItems, setQItems] = useState<QI[]>([emptyQ()]);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState(emptyF());
  const [editItems, setEditItems] = useState<QI[]>([emptyQ()]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [custOpen, setCustOpen] = useState(false);
  const [custForm, setCustForm] = useState({ name: "", phone: "", email: "" });
  const [custSaving, setCustSaving] = useState(false);
  const [custTarget, setCustTarget] = useState<"add" | "edit">("add");
  const [printQuote, setPrintQuote] = useState<any>(null);
  const [shareQuote, setShareQuote] = useState<any>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const [waTemplate, setWaTemplate] = useState<string>("");

  const fetchAll = useCallback(async () => {
    const [qr, cr, ir, tr] = await Promise.all([
      fetch(`/api/erp-auth/projects/${projectId}/proj2-quotes`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-customers`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-items`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-msg-templates`),
    ]);
    const [qd, cd, id, td] = await Promise.all([qr.json(), cr.json(), ir.json(), tr.json()]);
    setQuotes(qd.quotes || []); setCustomers(cd.customers || []); setItems(id.items || []);
    if (td?.quote_whatsapp) setWaTemplate(td.quote_whatsapp);
    setLoading(false);
  }, [projectId]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const itTotal = (its: QI[]) => its.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
  const post = async (url: string, body: any) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const patch = async (url: string, body: any) => fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const mapItems = (its: QI[]) => its.filter(i => i.item_id && Number(i.quantity) > 0 && Number(i.unit_price) > 0).map(i => ({ item_id: i.item_id, quantity: Number(i.quantity), unit_price: Number(i.unit_price), custom_name: i.custom_name, display_mode: i.display_mode || "item_only" }));

  const parseDate = (d: string) => { if (!d) return null; const dt = new Date(d); return isNaN(dt.getTime()) ? null : dt; };
  const inPeriod = (dStr: string) => {
    const d = parseDate(dStr);
    if (!d) return true;
    const now = new Date();
    if (dateFrom) { const f = new Date(dateFrom); if (d < f) return false; }
    if (dateTo)   { const t = new Date(dateTo); t.setHours(23,59,59); if (d > t) return false; }
    if (dateFrom || dateTo) return true;
    if (period === "month") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    if (period === "year")  return d.getFullYear() === now.getFullYear();
    return true;
  };
  const filteredQuotes = quotes.filter(q => {
    if (searchQuery) {
      const sq = searchQuery.toLowerCase();
      const match = (q.code || "").toLowerCase().includes(sq) ||
                    (q.customer?.name || q.customer_name || "").toLowerCase().includes(sq) ||
                    (q.notes || "").toLowerCase().includes(sq);
      if (!match) return false;
    }
    return inPeriod(q.quote_date);
  });

  const handleAdd = async () => {
    setSaving(true);
    const valid = mapItems(qItems);
    if (!valid.length) { setError("أضف صنفاً واحداً على الأقل"); setSaving(false); return; }
    const r = await post(`/api/erp-auth/projects/${projectId}/proj2-quotes`, { ...form, quote_date: fmtD(form.quote_date), valid_until: form.valid_until ? fmtD(form.valid_until) : "", items: valid });
    if (!r.ok) { const d = await r.json(); setError(d.error); } else { setSuccess("تم إنشاء عرض السعر"); setAddOpen(false); fetchAll(); }
    setSaving(false);
  };

  const handleEdit = async () => {
    setSaving(true);
    const r = await patch(`/api/erp-auth/projects/${projectId}/proj2-quotes/${editTarget.id}`, { action: "edit", ...editForm, quote_date: fmtD(editForm.quote_date), valid_until: editForm.valid_until ? fmtD(editForm.valid_until) : "", items: mapItems(editItems) });
    if (!r.ok) { const d = await r.json(); setError(d.error); } else { setSuccess("تم تعديل عرض السعر"); setEditOpen(false); fetchAll(); }
    setSaving(false);
  };

  const handleStatus = async (q: any, status: string) => {
    const r = await patch(`/api/erp-auth/projects/${projectId}/proj2-quotes/${q.id}`, { action: "status", status });
    if (!r.ok) { const d = await r.json(); setError(d.error); } else { setSuccess("تم تحديث الحالة"); fetchAll(); }
  };

  const handleConvert = async (q: any) => {
    const r = await patch(`/api/erp-auth/projects/${projectId}/proj2-quotes/${q.id}`, { action: "convert" });
    if (!r.ok) { const d = await r.json(); setError(d.error); } else { setSuccess("✅ تم تحويل عرض السعر لفاتورة بيع"); fetchAll(); }
  };

  const handleDelete = async () => {
    const r = await fetch(`/api/erp-auth/projects/${projectId}/proj2-quotes/${deleteTarget.id}`, { method: "DELETE" });
    if (!r.ok) { const d = await r.json(); setError(d.error); } else { setSuccess("تم الحذف"); setDeleteOpen(false); fetchAll(); }
  };

  const handleAddCustomer = async () => {
    if (!custForm.name.trim()) return;
    setCustSaving(true);
    const r = await fetch(`/api/erp-auth/projects/${projectId}/proj2-customers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: custForm.name, phones: custForm.phone ? [custForm.phone] : [], email: custForm.email || null }) });
    if (!r.ok) { const d = await r.json(); setError(d.error); }
    else {
      const { customer } = await r.json();
      const cr = await fetch(`/api/erp-auth/projects/${projectId}/proj2-customers`);
      const cd = await cr.json();
      setCustomers(cd.customers || []);
      const setter = custTarget === "add" ? setForm : setEditForm;
      setter((prev: any) => ({ ...prev, customer_id: customer.id, customer_name: customer.name, customer_phone: custForm.phone }));
      setCustOpen(false); setCustForm({ name: "", phone: "", email: "" });
    }
    setCustSaving(false);
  };

  const IE = ({ its, set }: { its: QI[], set: (v: QI[]) => void }) => (
    <div style={{ direction: "rtl" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>الأصناف</span>
        <IconButton size="small" onClick={() => set([...its, emptyQ()])} sx={{ color: "#10b981" }}><AddCircleOutline sx={{ fontSize: 18 }} /></IconButton>
      </div>
      {its.map((it, i) => (
        <div key={i} style={{ marginBottom: "16px", padding: "12px", background: "rgba(15,23,42,0.6)", borderRadius: "12px", border: "1px solid rgba(148,163,184,0.1)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px", alignItems: "center" }}>
            <div style={{ flex: "2 1 200px" }}>
              <Autocomplete options={items} getOptionLabel={(o: any) => o.name || ""} value={items.find((o: any) => o.id === it.item_id) || null}
                onChange={(_, val) => set(its.map((x, j) => j === i ? { ...x, item_id: val?.id || "" } : x))}
                isOptionEqualToValue={(a, b) => a.id === b.id} noOptionsText={<span style={{ fontFamily: "var(--font-cairo)" }}>لا يوجد</span>}
                slotProps={{ paper: acPaperSx }} renderOption={(props, o) => ro(props, <>{o.name} <span style={{ color: "#64748b", fontSize: "12px", marginRight: "4px" }}>({o.unit})</span> <span style={{ color: "#10b981", fontSize: "11px", background: "rgba(16,185,129,0.1)", padding: "2px 8px", borderRadius: "8px", marginRight: "auto", fontWeight: 700 }}>متوفر: {fmt(o.stock_quantity || 0)}</span></>)}
                renderInput={p => <TextField {...p} placeholder="الصنف" size="small" sx={{ ...fieldSx, width: "100%" }} inputProps={{ ...p.inputProps, style: { textAlign: "right", fontFamily: "var(--font-cairo)", fontSize: "13px" } }} />} />
            </div>
            <div style={{ flex: "1 1 180px", display: "flex", gap: "8px", alignItems: "center" }}>
              <TextField placeholder="كمية" size="small" type="number" inputProps={{ inputMode: "decimal" }} value={it.quantity} onChange={e => set(its.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} sx={{ ...fieldSx, flex: 1, minWidth: 0, "& .MuiInputBase-input": { textAlign: "center" } }} />
              <TextField placeholder="سعر" size="small" type="number" inputProps={{ inputMode: "decimal" }} value={it.unit_price} onChange={e => set(its.map((x, j) => j === i ? { ...x, unit_price: e.target.value } : x))} sx={{ ...fieldSx, flex: 1, minWidth: 0, "& .MuiInputBase-input": { textAlign: "center" } }} />
              <IconButton size="small" onClick={() => set(its.filter((_, j) => j !== i))} sx={{ color: "#f87171" }}><RemoveCircleOutline sx={{ fontSize: 18 }} /></IconButton>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
             <Select size="small" value={it.display_mode || "item_only"} onChange={e => set(its.map((x, j) => j === i ? { ...x, display_mode: e.target.value as any } : x))} sx={{ ...fieldSx, flex: "1 1 140px", color: "#e2e8f0" }}>
               <MenuItem style={{ fontFamily: "var(--font-cairo)" }} value="item_only">الصنف فقط</MenuItem>
               <MenuItem style={{ fontFamily: "var(--font-cairo)" }} value="custom_only">الوصف المخصص فقط</MenuItem>
               <MenuItem style={{ fontFamily: "var(--font-cairo)" }} value="both">الصنف + الوصف</MenuItem>
             </Select>
             <TextField size="small" placeholder="وصف مخصص يظهر في عرض السعر..." value={it.custom_name || ""} onChange={e => set(its.map((x, j) => j === i ? { ...x, custom_name: e.target.value } : x))} sx={{ ...fieldSx, flex: "2 1 200px" }} />
          </div>
        </div>
      ))}
      <p style={{ margin: "8px 0 0", fontSize: "14px", fontWeight: 700, color: "#f1f5f9", fontFamily: "var(--font-cairo)", textAlign: "left" }}>الإجمالي: {fmt(itTotal(its))} جنيه</p>
    </div>
  );

  const CF = ({ f, set, target }: { f: typeof form, set: (v: any) => void, target: "add" | "edit" }) => (
    <>
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <Autocomplete options={customers} getOptionLabel={(c: any) => c.name || ""} value={customers.find(c => c.id === f.customer_id) || null}
            onChange={(_, val) => set({ ...f, customer_id: val?.id || "", customer_name: val?.name || "", customer_phone: val?.phones?.[0] || "" })}
            isOptionEqualToValue={(a, b) => a.id === b.id} freeSolo
            noOptionsText={<span style={{ fontFamily: "var(--font-cairo)", color: "#64748b" }}>اكتب اسم عميل جديد</span>}
            slotProps={{ paper: acPaperSx }} renderOption={(props, c) => ro(props, c.name)}
            onInputChange={(_, val) => set({ ...f, customer_name: val })}
            renderInput={p => <TextField {...p} label="العميل *" fullWidth sx={fieldSx} inputProps={{ ...p.inputProps, style: { textAlign: "right", fontFamily: "var(--font-cairo)" } }} />} />
        </div>
        <IconButton title="إضافة عميل جديد" onClick={() => { setCustTarget(target); setCustForm({ name: "", phone: "", email: "" }); setCustOpen(true); }}
          sx={{ mt: "6px", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)", borderRadius: "10px", "&:hover": { background: "rgba(167,139,250,0.1)" } }}>
          <AddOutlined sx={{ fontSize: 18 }} />
        </IconButton>
      </div>
      {f.customer_phone && <p style={{ margin: "0 4px", fontSize: "13px", color: "#64748b", direction: "ltr" }}>📞 {f.customer_phone}</p>}
    </>
  );

  const DateRow = ({ f, set }: { f: typeof form, set: (v: any) => void }) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
      <DateField label="تاريخ العرض" value={f.quote_date} onChange={v => set({ ...f, quote_date: v })} />
      <DateField label="صالح حتى" value={f.valid_until} onChange={v => set({ ...f, valid_until: v })} />
    </div>
  );

  const [sharing, setSharing] = useState<string | null>(null);

  const handleWhatsApp = async (q: any) => {
    const phone = q.customer_phone || q.customer?.phones?.[0] || "";
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "2" + cleanPhone;

    const customerName = q.customer?.name || q.customer_name || "عميلنا العزيز";

    setSharing(q.id);
    setShareQuote(q);

    // Wait for React to render the hidden capture div
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise(r => setTimeout(r, 250));

    try {
      const element = captureRef.current;
      if (!element) throw new Error("capture element missing");

      const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(element, {
        scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false,
        windowWidth: 794,
      });

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
      const file = new File([blob], `عرض-سعر-${q.code}.pdf`, { type: "application/pdf" });

      // Upload to Supabase Storage via API route → get public URL
      const fd = new FormData();
      fd.append("file", file);
      fd.append("docNumber", q.code);
      const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-quotes/${q.id}/pdf-link`, {
        method: "POST", body: fd,
      });
      const { url, error: uploadErr } = await res.json();
      if (uploadErr) throw new Error(uploadErr);

      // Build WhatsApp message from saved template (or fallback default)
      const DEFAULT_TMPL = `مرحباً {{اسم_العميل}}،\n\nيسعدنا تواصلكم مع شركة سند برو كابيتال للمشروعات.\nعرض السعر رقم: {{رقم_العرض}}\nالإجمالي: {{الإجمالي}} ج.م\n\n📄 رابط عرض السعر:\n{{رابط_PDF}}\n\nنسعد بخدمتكم،\nإدارة المبيعات\n01100994488`;
      const tmpl = waTemplate || DEFAULT_TMPL;
      const msgText = tmpl
        .replaceAll("{{اسم_العميل}}", customerName)
        .replaceAll("{{رقم_العرض}}", q.code)
        .replaceAll("{{الإجمالي}}", fmt(q.total_amount))
        .replaceAll("{{رابط_PDF}}", url)
        .replaceAll("{{تاريخ_العرض}}", fmtD(q.quote_date || ""))
        .replaceAll("{{صالح_حتى}}", fmtD(q.valid_until || ""));
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msgText)}`, "_blank");

    } catch (err: any) {
      console.error("WhatsApp PDF error:", err);
      // Fallback: open WhatsApp with text only
      const fallbackText = encodeURIComponent(`مرحباً ${customerName}،\n\nيسعدنا تواصلكم مع شركة سند برو كابيتال للمشروعات.\nعرض السعر رقم: ${q.code}\nالإجمالي: ${fmt(q.total_amount)} ج.م\n\nنسعد بخدمتكم،\nإدارة المبيعات\n01100994488`);
      window.open(`https://wa.me/${cleanPhone}?text=${fallbackText}`, "_blank");
      setError(`تعذر رفع الملف (${err?.message}) — تم فتح واتساب بالنص فقط`);
    } finally {
      setSharing(null);
      setShareQuote(null);
    }
  };

  const handleEmail = (q: any) => {
    const email = q.customer?.email || "";
    const subject = encodeURIComponent(`عرض سعر رقم ${q.code} - شركة سند برو كابيتال`);
    const body = encodeURIComponent(`مرحباً ${q.customer?.name || q.customer_name || "عميلنا العزيز"}،\n\nيسعدنا تواصلكم مع شركة سند برو كابيتال للمشروعات.\nتجدون طيه عرض السعر رقم: ${q.code}\nبإجمالي مبلغ: ${fmt(q.total_amount)} ج.م\n\nبرجاء مراجعة المرفقات.\nنسعد بخدمتكم،\nإدارة المبيعات`);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_self");
  };

  return (
    <>
      <div style={{ display: printQuote ? "none" : "block" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>عروض الأسعار</h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0, fontFamily: "var(--font-cairo)" }}>إنشاء وإدارة عروض الأسعار للعملاء</p>
        </div>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => { setForm(emptyF()); setQItems([emptyQ()]); setAddOpen(true); }}
          sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", whiteSpace: "nowrap" }}>
          عرض سعر جديد
        </Button>
      </div>
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(239,68,68,0.1)", color: "#fca5a5", fontFamily: "var(--font-cairo)", direction: "rtl" }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(34,197,94,0.1)", color: "#86efac", fontFamily: "var(--font-cairo)", direction: "rtl" }}>{success}</Alert>}
      {loading ? <div style={{ textAlign: "center", padding: "60px 0" }}><CircularProgress sx={{ color: "#6366f1" }} /></div>
        : (
          <>
            {/* Filters */}
            {(quotes.length > 0 || searchQuery || dateFrom || dateTo || period !== "month") && (
              <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center", direction: "rtl" }}>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center", direction: "rtl" }}>
                  {(["month", "year", "all"] as const).map(p => (
                    <button key={p} onClick={() => { setPeriod(p); setDateFrom(""); setDateTo(""); }}
                      style={{ padding: "5px 16px", borderRadius: "20px", fontSize: "12px", fontFamily: "var(--font-cairo)", cursor: "pointer", border: "none", fontWeight: 600, transition: "all 0.15s",
                        background: period === p && !dateFrom && !dateTo ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" : "rgba(30,41,59,0.8)",
                        color: period === p && !dateFrom && !dateTo ? "#fff" : "#94a3b8",
                        outline: period === p && !dateFrom && !dateTo ? "none" : "1px solid rgba(148,163,184,0.15)" }}>
                      {p === "month" ? "الشهر الحالي" : p === "year" ? "السنة الحالية" : "الكل"}
                    </button>
                  ))}
                  <div style={{ display: "flex", gap: "4px", alignItems: "center", background: (dateFrom || dateTo) ? "rgba(99,102,241,0.1)" : "rgba(30,41,59,0.6)", borderRadius: "10px", padding: "4px 8px", outline: (dateFrom || dateTo) ? "1px solid rgba(99,102,241,0.35)" : "1px solid rgba(148,163,184,0.12)" }}>
                    <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>من</span>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                      style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "11px", fontFamily: "monospace", width: "110px", cursor: "pointer", colorScheme: "dark" }} />
                    <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>إلى</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                      style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "11px", fontFamily: "monospace", width: "110px", cursor: "pointer", colorScheme: "dark" }} />
                    {(dateFrom || dateTo) && (
                      <button onClick={() => { setDateFrom(""); setDateTo(""); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", fontSize: "13px", lineHeight: 1, padding: "0 2px" }}>✕</button>
                    )}
                  </div>
                  <span style={{ fontSize: "10px", color: "#475569", fontFamily: "var(--font-cairo)" }}>{filteredQuotes.length} عرض</span>
                </div>
                <TextField placeholder="بحث برقم العرض، اسم العميل..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} size="small" 
                  inputProps={{ dir: "rtl", style: { textAlign: "right", fontFamily: "var(--font-cairo)", fontSize: "13px" } }}
                  sx={{ ...fieldSx, flex: "1 1 200px" }} />
              </div>
            )}

            {filteredQuotes.length === 0
              ? <div style={{ textAlign: "center", padding: "60px 24px", borderRadius: "20px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
                  <p style={{ fontSize: "48px", margin: "0 0 12px" }}>📋</p>
                  <p style={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "16px" }}>{quotes.length === 0 ? "لا توجد عروض أسعار بعد" : "لا توجد نتائج مطابقة للبحث"}</p>
                </div>
              : <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {filteredQuotes.map(q => {
                  const st = STATUS[q.status] || STATUS.draft;
                  return (
                    <div key={q.id} style={{ padding: "18px", borderRadius: "16px", background: "rgba(30,41,59,0.5)", border: "1px solid rgba(148,163,184,0.08)", direction: "rtl" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#a78bfa", fontFamily: "monospace", background: "rgba(167,139,250,0.1)", padding: "3px 8px", borderRadius: "8px" }}>{q.code}</span>
                          <span style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9", fontFamily: "var(--font-cairo)" }}>{q.customer?.name || q.customer_name || "—"}</span>
                          {q.customer_phone && <span style={{ fontSize: "12px", color: "#64748b", direction: "ltr" }}>{q.customer_phone}</span>}
                          <Chip label={st.label} size="small" sx={{ background: `${st.color}22`, color: st.color, fontFamily: "var(--font-cairo)", fontSize: "11px", height: "20px" }} />
                        </div>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <IconButton size="small" title="إرسال عبر واتساب" onClick={() => handleWhatsApp(q)} disabled={sharing === q.id} sx={{ color: "#22c55e", "&:hover": { background: "rgba(34,197,94,0.1)" } }}>
                            {sharing === q.id ? <CircularProgress size={14} sx={{ color: "#22c55e" }} /> : <WhatsApp sx={{ fontSize: 16 }} />}
                          </IconButton>
                          <IconButton size="small" title="إرسال عبر الإيميل" onClick={() => handleEmail(q)} sx={{ color: "#eab308", "&:hover": { background: "rgba(234,179,8,0.1)" } }}><EmailOutlined sx={{ fontSize: 16 }} /></IconButton>
                          {q.status !== "converted" && q.status !== "cancelled" && (
                            <>
                              {q.status === "draft" && <IconButton size="small" title="إرسال" onClick={() => handleStatus(q, "sent")} sx={{ color: "#60a5fa", "&:hover": { background: "rgba(59,130,246,0.1)" } }}><SendOutlined sx={{ fontSize: 16 }} /></IconButton>}
                              <IconButton size="small" title="تحويل لفاتورة بيع" onClick={() => handleConvert(q)} sx={{ color: "#10b981", "&:hover": { background: "rgba(16,185,129,0.1)" } }}><SwapHorizOutlined sx={{ fontSize: 16 }} /></IconButton>
                              <IconButton size="small" title="طباعة / PDF" onClick={() => { setPrintQuote(q); setTimeout(() => window.print(), 500); }} sx={{ color: "#a855f7", "&:hover": { background: "rgba(168,85,247,0.1)" } }}><PrintOutlined sx={{ fontSize: 16 }} /></IconButton>
                              <IconButton size="small" title="تعديل" onClick={() => { setEditTarget(q); setEditForm({ customer_id: q.customer_id || "", customer_name: q.customer_name || "", customer_phone: q.customer_phone || "", quote_date: fmtD(q.quote_date || ""), valid_until: fmtD(q.valid_until || ""), notes: q.notes || "" }); setEditItems((q.items || []).map((i: any) => ({ item_id: i.item_id || "", quantity: String(i.quantity), unit_price: String(i.unit_price), custom_name: i.custom_name || "", display_mode: i.display_mode || "item_only" }))); setEditOpen(true); }} sx={{ color: "#60a5fa", "&:hover": { background: "rgba(59,130,246,0.1)" } }}><EditOutlined sx={{ fontSize: 16 }} /></IconButton>
                            </>
                          )}
                          <IconButton size="small" onClick={() => { setDeleteTarget(q); setDeleteOpen(true); }} sx={{ color: "#64748b", "&:hover": { color: "#f87171", background: "rgba(248,113,113,0.1)" } }}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                        {(q.items || []).map((it: any, i: number) => (
                          <span key={i} style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "var(--font-cairo)", background: "rgba(15,23,42,0.4)", padding: "4px 10px", borderRadius: "8px" }}>
                            {getItemDisplayName(it)} × {it.quantity} @ {fmt(it.unit_price)} جنيه
                          </span>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: "#64748b" }}>الإجمالي: <strong style={{ color: "#f1f5f9" }}>{fmt(q.total_amount)} جنيه</strong></span>
                        <span style={{ fontSize: "11px", color: "#475569", direction: "ltr" }}>{fmtD(q.quote_date)}</span>
                        {q.valid_until && <span style={{ fontSize: "11px", color: "#f59e0b", fontFamily: "var(--font-cairo)" }}>صالح حتى: {fmtD(q.valid_until)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            }
          </>
        )
      }

      {/* Add Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} sx={dlgSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>عرض سعر جديد</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          {CF({ f: form, set: setForm, target: "add" })}{DateRow({ f: form, set: setForm })}
          {IE({ its: qItems, set: setQItems })}
          <TextField label="ملاحظات" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} fullWidth sx={fieldSx} multiline rows={2} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setAddOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleAdd} disabled={saving || !form.customer_name.trim()} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "إنشاء العرض"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} sx={dlgSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>تعديل عرض — {editTarget?.code}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          {CF({ f: editForm, set: setEditForm, target: "edit" })}{DateRow({ f: editForm, set: setEditForm })}
          {IE({ its: editItems, set: setEditItems })}
          <TextField label="ملاحظات" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} fullWidth sx={fieldSx} multiline rows={2} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleEdit} disabled={saving || !editForm.customer_name.trim()} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حفظ التعديلات"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} sx={{ "& .MuiDialog-paper": { ...dlgSx["& .MuiDialog-paper"], minWidth: "min(380px,94vw)" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#f87171" }}>حذف عرض السعر</DialogTitle>
        <DialogContent><p style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", margin: 0 }}>هل تريد حذف <strong style={{ color: "#e2e8f0" }}>{deleteTarget?.code}</strong>؟</p></DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleDelete} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "#dc2626" }}>حذف</Button>
        </DialogActions>
      </Dialog>

      {/* Quick-Add Customer Dialog */}
      <Dialog open={custOpen} onClose={() => setCustOpen(false)} sx={{ "& .MuiDialog-paper": { ...dlgSx["& .MuiDialog-paper"], minWidth: "min(400px,94vw)" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#a78bfa" }}>إضافة عميل جديد</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <TextField label="الاسم *" value={custForm.name} onChange={e => setCustForm({ ...custForm, name: e.target.value })} fullWidth sx={fieldSx} inputProps={{ style: { textAlign: "right", fontFamily: "var(--font-cairo)" } }} />
          <TextField
            label="رقم الهاتف"
            value={custForm.phone}
            onChange={e => setCustForm({ ...custForm, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })}
            fullWidth sx={fieldSx}
            inputProps={{ style: { direction: "ltr", letterSpacing: "1px" }, maxLength: 11, inputMode: "numeric" }}
            error={!!custForm.phone && !/^01[0125]\d{8}$/.test(custForm.phone)}
            helperText={custForm.phone && !/^01[0125]\d{8}$/.test(custForm.phone) ? "رقم غير صحيح — يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقم" : ""}
            FormHelperTextProps={{ style: { fontFamily: "var(--font-cairo)", textAlign: "right", direction: "rtl" } }}
          />
          <TextField label="البريد الإلكتروني" value={custForm.email} onChange={e => setCustForm({ ...custForm, email: e.target.value })} fullWidth sx={fieldSx} inputProps={{ style: { direction: "ltr" } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setCustOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleAddCustomer}
            disabled={custSaving || !custForm.name.trim() || (!!custForm.phone && !/^01[0125]\d{8}$/.test(custForm.phone))}
            variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #a78bfa 0%, #6366f1 100%)" }}>
            {custSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حفظ العميل"}
          </Button>
        </DialogActions>
      </Dialog>
      </div>

      {/* Hidden off-screen div for html2canvas PDF capture — never visible to user */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1, pointerEvents: "none", width: "794px" }}>
        {shareQuote && (
          <div ref={captureRef} style={{ background: "#fff", color: "#000", direction: "rtl", padding: "20px 40px", fontFamily: "Cairo, sans-serif", width: "794px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #cbd5e1", paddingBottom: "16px", marginBottom: "24px" }}>
              <div style={{ textAlign: "right", width: "50%" }}>
                <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", margin: "0 0 16px 0" }}>عرض سعر<br/><span style={{ fontSize: "14px", fontWeight: 500, color: "#64748b" }}>QUOTATION</span></h1>
                <table style={{ width: "auto", fontSize: "13px", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr><td style={{ padding: "0 0 4px 0", color: "#64748b", fontWeight: 600, width: "130px" }}>رقم المستند / No:</td><td style={{ padding: "0 16px 4px 0", fontWeight: 700, direction: "ltr" }}>{shareQuote.code}</td></tr>
                    <tr><td style={{ padding: "0 0 4px 0", color: "#64748b", fontWeight: 600, width: "130px" }}>التاريخ / Date:</td><td style={{ padding: "0 16px 4px 0", direction: "ltr" }}>{fmtD(shareQuote.quote_date)}</td></tr>
                    {shareQuote.valid_until && <tr><td style={{ color: "#64748b", fontWeight: 600, width: "130px" }}>صالح حتى /Valid Until:</td><td style={{ direction: "ltr", padding: "0 16px 0 0" }}>{fmtD(shareQuote.valid_until)}</td></tr>}
                  </tbody>
                </table>
              </div>
              <div style={{ textAlign: "left", width: "50%" }}>
                <img src="/images/long logo.png" alt="Sanad Pro Capital" style={{ maxHeight: "70px", objectFit: "contain", maxWidth: "250px" }} crossOrigin="anonymous" />
              </div>
            </div>
            <div style={{ display: "flex", gap: "24px", marginBottom: "24px" }}>
              <div style={{ flex: 1, background: "#f8fafc", padding: "12px 16px", border: "1px solid #e2e8f0", borderRight: "4px solid #0f172a", borderRadius: "8px" }}>
                <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>مقدم إلى / QUOTATION FOR:</p>
                <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>{shareQuote.customer?.name || shareQuote.customer_name || "—"}</p>
                {shareQuote.customer_phone && <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#475569", direction: "ltr", textAlign: "right" }}>{shareQuote.customer_phone}</p>}
              </div>
              <div style={{ flex: 1, background: "#f8fafc", padding: "12px 16px", border: "1px solid #e2e8f0", borderRight: "4px solid #3b82f6", borderRadius: "8px" }}>
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
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1e293b", border: "1px solid #e2e8f0" }}>{getItemDisplayName(it)}</td>
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
              <span>01100994488</span>
              <span>info@sanadproprojects.com</span>
              <span>www.sanadproprojects.com</span>
            </div>
          </div>
        )}
      </div>

      {printQuote && (
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
            <Button variant="outlined" onClick={() => setPrintQuote(null)} sx={{ fontFamily: "var(--font-cairo)" }}>إغلاق وتشغيل النظام</Button>
            <Button variant="contained" onClick={() => window.print()} startIcon={<PrintOutlined />} sx={{ fontFamily: "var(--font-cairo)", background: "#3b82f6" }}>حفظ كـ PDF / طباعة</Button>
          </div>

          <div style={{ background: "#fff", color: "#000", direction: "rtl", padding: "20px 40px", fontFamily: "var(--font-cairo), sans-serif" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #cbd5e1", paddingBottom: "16px", marginBottom: "24px" }}>
            <div style={{ textAlign: "right", width: "50%" }}>
              <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", margin: "0 0 16px 0", letterSpacing: "-0.5px" }}>عرض سعر<br/><span style={{ fontSize: "14px", fontWeight: 500, color: "#64748b", letterSpacing: "1px" }}>QUOTATION</span></h1>
              <table style={{ width: "auto", fontSize: "13px", borderCollapse: "collapse" }}>
                <tbody>
                  <tr><td style={{ padding: "0 0 4px 0", color: "#64748b", fontWeight: 600, textAlign: "right", width: "130px" }}>رقم المستند / No:</td><td style={{ padding: "0 16px 4px 0", textAlign: "right", fontWeight: 700, direction: "ltr" }}>{printQuote.code}</td></tr>
                  <tr><td style={{ padding: "0 0 4px 0", color: "#64748b", fontWeight: 600, textAlign: "right", width: "130px" }}>التاريخ / Date:</td><td style={{ padding: "0 16px 4px 0", textAlign: "right", direction: "ltr" }}>{fmtD(printQuote.quote_date)}</td></tr>
                  {printQuote.valid_until && <tr><td style={{ padding: "0 0 0 0", color: "#64748b", fontWeight: 600, textAlign: "right", width: "130px" }}>صالح حتى / Valid Until:</td><td style={{ padding: "0 16px 0 0", textAlign: "right", direction: "ltr" }}>{fmtD(printQuote.valid_until)}</td></tr>}
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
                <h3 style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>مقدم إلى العميل / QUOTATION FOR:</h3>
                <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>{printQuote.customer?.name || printQuote.customer_name || "—"}</p>
                {printQuote.customer_phone && <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#475569", direction: "ltr", textAlign: "right", fontWeight: 600 }}>{printQuote.customer_phone}</p>}
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
              {(printQuote.items || []).map((it: any, i: number) => {
                const rowTotal = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1e293b", border: "1px solid #e2e8f0", borderTop: "none" }}>{getItemDisplayName(it)}</td>
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
                <h4 style={{ margin: "0 0 6px 0", color: "#64748b", fontSize: "12px", textTransform: "uppercase" }}>الشروط والملاحظات / Terms & Notes:</h4>
                <p style={{ margin: 0, fontSize: "12px", whiteSpace: "pre-wrap", color: "#334155", lineHeight: 1.6 }}>{printQuote.notes || "لا توجد ملاحظات إضافية."}</p>
              </div>
            </div>
            <div style={{ width: "320px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "10px 12px", background: "#f8fafc", fontWeight: 700, border: "1px solid #e2e8f0", color: "#475569" }}>الإجمالي الكلي / Grand Total</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 800, fontSize: "16px", color: "#0f172a", border: "1px solid #e2e8f0", direction: "ltr" }}>{fmt(printQuote.total_amount)} ج.م</td>
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
              هذا العرض صالح حتى التاريخ المذكور أعلاه ولا يعتبر فاتورة ضريبية.
              <br />
              <strong>تنويه قانوني:</strong> لا يُعتد بهذا المستند كعرض سعر رسمي مُلزم للشركة إلا في حال كونه ممهوراً بالختم الأصلي للشركة، أو مُرسلاً من البريد الإلكتروني الرسمي المعتمد لها.
            </div>
          </div>
          </div>{/* end printRef div */}
        </div>
      )}
    </>
  );
}
