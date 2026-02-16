"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import PhoneIcon from "@mui/icons-material/Phone";
import NAdminShell from "../components/NAdminShell";
import { RecordList, RecordCard, PageHeader, EmptyState } from "../components";
import { getAllSuppliers, createSupplier, updateSupplier } from "@/databases/sales-operations/collections/suppliers";
import type { SalesUser } from "@/databases/sales-operations/types";
import type { Supplier } from "@/databases/sales-operations/types";

/** Egyptian mobile: 11 digits, 01 then operator (0,1,2,5) then 8 digits */
const EGYPTIAN_MOBILE_REGEX = /^01[0125]\d{8}$/;

function normalizeEgyptianPhone(value: string): string {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("01")) return digits;
  if (digits.length === 10 && digits.startsWith("1")) return "0" + digits;
  if (digits.length === 12 && digits.startsWith("20")) return "0" + digits.slice(2);
  if (digits.length === 10 && !digits.startsWith("0")) return "0" + digits;
  return digits.slice(0, 11);
}

function validateEgyptianPhone(value: string): string | null {
  if (!value || !value.trim()) return null;
  const normalized = normalizeEgyptianPhone(value.trim());
  if (normalized.length !== 11) return "رقم مصري: 11 رقم (مثال: 01234567890)";
  if (!EGYPTIAN_MOBILE_REGEX.test(normalized)) return "رقم مصري يبدأ بـ 010 أو 011 أو 012 أو 015";
  return null;
}

export default function SuppliersPage() {
  const [user, setUser] = useState<SalesUser | null>(null);
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({
    nameAr: "",
    nameEn: "",
    contact: "",
    notes: "",
    order: 0,
    active: true,
  });

  useEffect(() => {
    const raw = sessionStorage.getItem("n_admin_user");
    if (!raw) {
      window.location.href = "/n-admin";
      return;
    }
    try {
      const u = JSON.parse(raw);
      setUser(u);
      const canAccess =
        u.role === "super_admin" ||
        u.role === "admin" ||
        u.pageAccess?.some((a: { pageId: string }) => a.pageId === "suppliers");
      if (!canAccess) {
        window.location.href = "/n-admin/dashboard";
        return;
      }
    } catch {
      window.location.href = "/n-admin";
      return;
    }
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    getAllSuppliers()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  const openAdd = () => {
    setEditing(null);
    setForm({
      nameAr: "",
      nameEn: "",
      contact: "",
      notes: "",
      order: items.length,
      active: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      nameAr: s.nameAr,
      nameEn: s.nameEn ?? "",
      contact: s.contact ?? "",
      notes: s.notes ?? "",
      order: s.order,
      active: s.active,
    });
    setDialogOpen(true);
  };

  const contactError = form.contact.trim() ? validateEgyptianPhone(form.contact) : null;
  const contactNormalized = form.contact.trim() ? normalizeEgyptianPhone(form.contact) : "";

  const handleSave = async () => {
    if (!form.nameAr.trim()) return;
    if (form.contact.trim() && contactError) return;
    try {
      const payload = {
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim() || undefined,
        contact: contactNormalized || undefined,
        notes: form.notes.trim() || undefined,
        order: form.order,
        active: form.active,
        ...(editing ? { updatedBy: user?.id } : { createdBy: user?.id }),
      };
      if (editing) {
        await updateSupplier(editing.id, payload);
      } else {
        await createSupplier(payload);
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  /** Stored as 01xxxxxxxxx (no international code); build tel: for dialer */
  const toTelHref = (raw: string) => {
    const digits = (raw || "").replace(/\D/g, "");
    if (digits.length < 10) return "";
    if (digits.startsWith("01") && digits.length === 11) return `tel:+20${digits.slice(1)}`;
    if (digits.startsWith("20") && digits.length === 12) return `tel:+${digits}`;
    return `tel:+20${digits}`;
  };

  if (!user) return null;

  return (
    <NAdminShell>
      <PageHeader
        title="الموردين"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} size="small" sx={{ fontFamily: "var(--font-cairo)" }}>
            إضافة مورد
          </Button>
        }
      />

      <RecordList loading={loading}>
        {!loading && items.length === 0 && (
          <EmptyState title="لا يوجد موردين" subtitle="أضف موردين ثم اخترهم في فواتير الشراء" />
        )}
        {!loading &&
          items.map((item) => (
            <RecordCard
              key={item.id}
              title={item.nameAr}
              subtitle={item.nameEn ? [item.nameEn, item.contact].filter(Boolean).join(" • ") : item.contact || undefined}
              meta={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
                  {!item.active && (
                    <Chip label="معطّل" size="small" sx={{ height: 22, fontSize: "0.75rem", bgcolor: "grey.200" }} />
                  )}
                  {item.contact && toTelHref(item.contact) && (
                    <Button
                      component="a"
                      href={toTelHref(item.contact)}
                      size="small"
                      startIcon={<PhoneIcon sx={{ fontSize: 18 }} />}
                      sx={{ fontFamily: "var(--font-cairo)", fontSize: "0.75rem", minWidth: "auto", px: 1 }}
                    >
                      اتصال
                    </Button>
                  )}
                </Box>
              }
              action={
                <IconButton
                  size="small"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    openEdit(item);
                  }}
                  sx={{ bgcolor: "grey.100", "&:hover": { bgcolor: "grey.200" } }}
                >
                  <EditIcon sx={{ fontSize: 18 }} />
                </IconButton>
              }
            />
          ))}
      </RecordList>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} dir="rtl" PaperProps={{ sx: { borderRadius: 2, direction: "rtl", textAlign: "right", maxHeight: "90vh" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>{editing ? "تعديل مورد" : "إضافة مورد"}</DialogTitle>
        <DialogContent sx={{ textAlign: "right" }}>
          <Box dir="rtl" sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label="الاسم (عربي)"
              value={form.nameAr}
              onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
              fullWidth
              required
              inputProps={{ dir: "rtl" }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
            />
            <TextField
              label="الاسم (إنجليزي)"
              value={form.nameEn}
              onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
              fullWidth
              inputProps={{ dir: "ltr" }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)" } }}
            />
            <TextField
              label="رقم الهاتف (مصر فقط، بدون كود دولي)"
              value={form.contact}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                const normalized = normalizeEgyptianPhone(digits.length > 11 ? digits.slice(0, 12) : digits);
                setForm((f) => ({ ...f, contact: normalized }));
              }}
              onBlur={() => {
                if (form.contact.trim() && !validateEgyptianPhone(form.contact)) {
                  setForm((f) => ({ ...f, contact: normalizeEgyptianPhone(form.contact) }));
                }
              }}
              fullWidth
              type="tel"
              inputMode="tel"
              error={!!contactError}
              helperText={contactError}
              inputProps={{ dir: "ltr", inputMode: "tel", placeholder: "01xxxxxxxxx (11 رقم)", maxLength: 11 }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)" } }}
            />
            <TextField
              label="ملاحظات"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              fullWidth
              multiline
              rows={2}
              inputProps={{ dir: "rtl" }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
            />
            <TextField
              label="ترتيب العرض"
              type="number"
              value={form.order}
              onChange={(e) => setForm((f) => ({ ...f, order: parseInt(e.target.value, 10) || 0 }))}
              fullWidth
              size="small"
              inputProps={{ min: 0, inputMode: "numeric", dir: "rtl" }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
            />
            <FormControlLabel
              control={<Switch checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />}
              label="مفعّل"
              sx={{ "& .MuiFormControlLabel-label": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ direction: "rtl", justifyContent: "flex-start" }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ fontFamily: "var(--font-cairo)" }}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.nameAr.trim() || !!contactError} sx={{ fontFamily: "var(--font-cairo)" }}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </NAdminShell>
  );
}
