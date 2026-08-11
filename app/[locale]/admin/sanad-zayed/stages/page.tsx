"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Alert, IconButton,
  MenuItem, Select, FormControl, InputLabel
} from "@mui/material";
import {
  AddOutlined, CloseOutlined, AccountTreeOutlined, WarningAmberOutlined, ChecklistOutlined
} from "@mui/icons-material";
import { sanitizeDecimalInput } from "@/lib/sanad-zayed/decimalInput";

interface Stage {
  id: string;
  name: string;
  description: string;
  unit_type: "LAND_METER" | "APARTMENT_METER";
  base_unit_price: number;
  management_fee_pct: number;
  status: "PLANNING" | "OPEN" | "CLOSED";
  pricing_status: "ESTIMATED" | "LICENSED";
  target_sellable_area: number;
  typical_unit_area: number;
  sold_area: number;
  sort_order: number;
}

interface Pricing {
  price_actual: number;
  price_actual_plus_expected: number;
  investor_price: number;
  below_cost_warning: boolean;
}

const STATUS_LABEL: Record<string, string> = { PLANNING: "تخطيط", OPEN: "متاحة للبيع", CLOSED: "مغلقة" };
const STATUS_COLOR: Record<string, string> = { PLANNING: "#9ca3af", OPEN: "#059669", CLOSED: "#ef4444" };
const PRICING_LABEL: Record<string, string> = { ESTIMATED: "تقديرية", LICENSED: "استلمنا الرخصة" };
const PRICING_COLOR: Record<string, string> = { ESTIMATED: "#d97706", LICENSED: "#0891b2" };

const emptyForm = {
  name: "", description: "", unit_type: "LAND_METER", base_unit_price: "",
  management_fee_pct: "", status: "PLANNING", pricing_status: "ESTIMATED",
  target_sellable_area: "", typical_unit_area: "", sort_order: "0",
};

export default function StagesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<Stage[]>([]);
  const [pricingByStage, setPricingByStage] = useState<Record<string, Pricing>>({});

  const [flash, setFlash] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const showFlash = (type: "success" | "error", text: string) => {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 5000);
  };

  const fetchStages = useCallback(async () => {
    try {
      const res = await fetch("/api/sanad-zayed/stages");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تحميل المراحل");

      setStages(data.stages ?? []);

      const pricingEntries = await Promise.all(
        (data.stages ?? []).map(async (s: Stage) => {
          const r = await fetch(`/api/sanad-zayed/stages/${s.id}/pricing`);
          const p = await r.json();
          return [s.id, p] as const;
        })
      );
      setPricingByStage(Object.fromEntries(pricingEntries));
    } catch (err: any) {
      showFlash("error", err.message || "فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStages(); }, [fetchStages]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (s: Stage) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      description: s.description,
      unit_type: s.unit_type,
      base_unit_price: String(s.base_unit_price),
      management_fee_pct: String(s.management_fee_pct),
      status: s.status,
      pricing_status: s.pricing_status,
      target_sellable_area: String(s.target_sellable_area),
      typical_unit_area: String(s.typical_unit_area),
      sort_order: String(s.sort_order),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return showFlash("error", "اسم المرحلة مطلوب");

    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        unit_type: form.unit_type,
        base_unit_price: Number(form.base_unit_price) || 0,
        management_fee_pct: Number(form.management_fee_pct) || 0,
        status: form.status,
        pricing_status: form.pricing_status,
        target_sellable_area: Number(form.target_sellable_area) || 0,
        typical_unit_area: Number(form.typical_unit_area) || 0,
        sort_order: Number(form.sort_order) || 0,
      };

      const res = await fetch(
        editingId ? `/api/sanad-zayed/stages/${editingId}` : "/api/sanad-zayed/stages",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || Object.values(data.errors ?? {})[0] as string || "حدث خطأ");

      setDialogOpen(false);
      showFlash("success", editingId ? "تم تحديث المرحلة" : "تم إنشاء المرحلة بنجاح");
      fetchStages();
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
          <h1 style={{ fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 900, color: "#111827", margin: 0 }}>مراحل المشروع</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "5px 0 0" }}>إدارة مراحل مشروع سند زايد وأسعار الوحدات</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={openAdd}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "linear-gradient(135deg, #154278 0%, #1e6abf 100%)",
            color: "#fff", border: "none", borderRadius: 12,
            padding: "11px 22px", cursor: "pointer", fontSize: 14, fontWeight: 700,
            fontFamily: "var(--font-cairo)", boxShadow: "0 4px 14px rgba(21,66,120,0.3)",
          }}
        >
          <AddOutlined sx={{ fontSize: 20 }} />
          إضافة مرحلة جديدة
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

      {/* ── Stages list ── */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center" }}><CircularProgress sx={{ color: "#154278" }} /></div>
      ) : stages.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, padding: 60, textAlign: "center", color: "#9ca3af" }}>
          <AccountTreeOutlined sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
          <div style={{ fontSize: 15, fontWeight: 700 }}>لا توجد مراحل بعد</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {stages.map((s) => {
            const p = pricingByStage[s.id];
            const remaining = s.target_sellable_area - s.sold_area;
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => openEdit(s)}
                style={{ background: "#fff", borderRadius: 18, padding: 22, border: "1px solid rgba(0,0,0,0.04)", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>{s.name}</div>
                    {s.description && <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>{s.description}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ background: `${STATUS_COLOR[s.status]}18`, color: STATUS_COLOR[s.status], fontSize: 12, fontWeight: 700, borderRadius: 8, padding: "4px 10px" }}>
                      {STATUS_LABEL[s.status]}
                    </span>
                    <span style={{ background: `${PRICING_COLOR[s.pricing_status]}18`, color: PRICING_COLOR[s.pricing_status], fontSize: 12, fontWeight: 700, borderRadius: 8, padding: "4px 10px" }}>
                      {PRICING_LABEL[s.pricing_status]}
                    </span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>المساحة (مباع / إجمالي المرحلة)</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: remaining < 0 ? "#ef4444" : "#111827" }}>
                      {s.sold_area.toLocaleString("ar-EG-u-nu-latn")} / {s.target_sellable_area.toLocaleString("ar-EG-u-nu-latn")} م²
                    </div>
                  </div>
                  {s.typical_unit_area > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>مساحة الوحدة التقديرية</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>
                        {s.typical_unit_area.toLocaleString("ar-EG-u-nu-latn")} م²
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>سعر المتر للمساهم</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#154278" }}>
                      {s.base_unit_price.toLocaleString("ar-EG-u-nu-latn")} ج.م
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>تكلفة المتر (فعلي)</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#6b7280" }}>
                      {p ? p.price_actual.toLocaleString("ar-EG-u-nu-latn", { maximumFractionDigits: 0 }) : "—"} ج.م
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>تكلفة المتر (فعلي + متوقع)</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#d97706" }}>
                      {p ? p.price_actual_plus_expected.toLocaleString("ar-EG-u-nu-latn", { maximumFractionDigits: 0 }) : "—"} ج.م
                    </div>
                  </div>
                </div>

                {p?.below_cost_warning && (
                  <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 12, fontWeight: 700, borderRadius: 8, padding: "8px 12px" }}>
                    <WarningAmberOutlined sx={{ fontSize: 16 }} />
                    سعر المساهم أقل من تكلفة المتر (فعلي + متوقع) — راجع التسعير
                  </div>
                )}

                <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/admin/sanad-zayed/stages/${s.id}`); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, background: "rgba(21,66,120,0.08)", color: "#154278",
                      border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700,
                      fontFamily: "var(--font-cairo)",
                    }}
                  >
                    <ChecklistOutlined sx={{ fontSize: 15 }} />
                    المصاريف المتوقعة
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Add/Edit Dialog ── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} PaperProps={{ sx: { borderRadius: "20px", direction: "rtl", maxWidth: 520, width: "100%" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 800 }}>
          {editingId ? "تعديل المرحلة" : "إضافة مرحلة جديدة"}
          <IconButton onClick={() => setDialogOpen(false)} sx={{ position: "absolute", left: 12, top: 12 }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "10px !important", display: "flex", flexDirection: "column", gap: 2.5 }}>
          <TextField label="اسم المرحلة *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} fullWidth sx={inputSx} />
          <TextField label="الوصف" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} fullWidth multiline rows={2} sx={inputSx} />

          <div style={{ display: "flex", gap: 12 }}>
            <FormControl fullWidth sx={inputSx}>
              <InputLabel>الحالة التشغيلية</InputLabel>
              <Select value={form.status} label="الحالة التشغيلية" onChange={e => setForm({ ...form, status: e.target.value })}>
                <MenuItem value="PLANNING">تخطيط</MenuItem>
                <MenuItem value="OPEN">متاحة للبيع</MenuItem>
                <MenuItem value="CLOSED">مغلقة</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth sx={inputSx}>
              <InputLabel>حالة التسعير</InputLabel>
              <Select value={form.pricing_status} label="حالة التسعير" onChange={e => setForm({ ...form, pricing_status: e.target.value })}>
                <MenuItem value="ESTIMATED">تقديرية</MenuItem>
                <MenuItem value="LICENSED">استلمنا الرخصة</MenuItem>
              </Select>
            </FormControl>
          </div>

          <FormControl fullWidth sx={inputSx}>
            <InputLabel>نوع الوحدة</InputLabel>
            <Select value={form.unit_type} label="نوع الوحدة" onChange={e => setForm({ ...form, unit_type: e.target.value })}>
              <MenuItem value="LAND_METER">متر وحدة تقديري</MenuItem>
              <MenuItem value="APARTMENT_METER">متر وحدة (رخصة)</MenuItem>
            </Select>
          </FormControl>

          <div style={{ display: "flex", gap: 12 }}>
            <TextField label="المساحة القابلة للبيع لهذه المرحلة (م²) *" type="text" inputMode="decimal" value={form.target_sellable_area} onChange={e => setForm({ ...form, target_sellable_area: sanitizeDecimalInput(e.target.value) })} fullWidth sx={inputSx}
              helperText="مساحة الوحدات المخطط بيعها في هذه المرحلة (قد تتجاوز مساحة الأرض بسبب تكرار الأدوار)" />
            <TextField label="سعر المتر للمساهم (ج.م) *" type="text" inputMode="decimal" value={form.base_unit_price} onChange={e => setForm({ ...form, base_unit_price: sanitizeDecimalInput(e.target.value) })} fullWidth sx={inputSx} />
          </div>

          <TextField label="مساحة الوحدة التقديرية للمستثمر (م²)" type="text" inputMode="decimal" value={form.typical_unit_area} onChange={e => setForm({ ...form, typical_unit_area: sanitizeDecimalInput(e.target.value) })} fullWidth sx={inputSx}
            helperText="القيمة الافتراضية التي تُملأ تلقائياً عند إنشاء عقد جديد في هذه المرحلة" />

          <div style={{ display: "flex", gap: 12 }}>
            <TextField label="نسبة إدارة سند (%)" type="text" inputMode="decimal" value={form.management_fee_pct} onChange={e => setForm({ ...form, management_fee_pct: sanitizeDecimalInput(e.target.value) })} fullWidth sx={inputSx} />
            <TextField label="ترتيب العرض" type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} fullWidth sx={inputSx} />
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleSubmit} variant="contained" disabled={submitting} sx={{ fontFamily: "var(--font-cairo)", background: "#154278", borderRadius: "10px", width: "100%", py: 1.2, fontWeight: 700 }}>
            {submitting ? "جاري الحفظ..." : editingId ? "حفظ التعديلات" : "إنشاء المرحلة"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
