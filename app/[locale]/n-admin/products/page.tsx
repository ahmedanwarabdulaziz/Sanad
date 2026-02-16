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
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import NAdminShell from "../components/NAdminShell";
import { RecordList, RecordCard, PageHeader, EmptyState, MobileFriendlySelect } from "../components";
import { getAllProducts, createProduct, updateProduct } from "@/databases/sales-operations/collections/products";
import type { SalesUser } from "@/databases/sales-operations/types";
import type { Product, ProductUnit, MaterialType } from "@/databases/sales-operations/types";

export default function ProductsPage() {
  const [user, setUser] = useState<SalesUser | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    nameAr: "",
    nameEn: "",
    unit: "sqm" as ProductUnit,
    materialType: "" as MaterialType | "",
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
        u.pageAccess?.some((a: { pageId: string }) => a.pageId === "products");
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
    getAllProducts()
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  };

  const openAdd = () => {
    setEditing(null);
    setForm({
      nameAr: "",
      nameEn: "",
      unit: "sqm",
      materialType: "",
      order: products.length,
      active: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      nameAr: p.nameAr,
      nameEn: p.nameEn ?? "",
      unit: p.unit,
      materialType: p.materialType ?? "",
      order: p.order,
      active: p.active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nameAr.trim()) return;
    try {
      const payload = {
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim() || undefined,
        unit: form.unit,
        materialType: form.materialType || undefined,
        order: form.order,
        active: form.active,
        ...(editing ? { updatedBy: user?.id } : { createdBy: user?.id }),
      };
      if (editing) {
        await updateProduct(editing.id, payload);
      } else {
        await createProduct(payload);
      }
      setDialogOpen(false);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const unitLabel = (u: ProductUnit) => (u === "sqm" ? "متر مربع" : "متر طولي");
  const materialLabel = (m: MaterialType) => (m === "marble" ? "رخام" : "جرانيت");

  if (!user) return null;

  return (
    <NAdminShell>
      <PageHeader
        title="أصناف المخزن"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} size="small" sx={{ fontFamily: "var(--font-cairo)" }}>
            إضافة صنف
          </Button>
        }
      />

      <RecordList loading={loading}>
        {!loading && products.length === 0 && (
          <EmptyState title="لا توجد أصناف" subtitle="أضف أصناف الرخام والجرانيت (متر مربع أو متر طولي)" />
        )}
        {!loading &&
          products.map((p) => (
            <RecordCard
              key={p.id}
              title={p.nameAr}
              subtitle={`${unitLabel(p.unit)}${p.materialType ? ` • ${materialLabel(p.materialType)}` : ""}`}
              meta={
                !p.active ? (
                  <Chip label="معطّل" size="small" sx={{ height: 22, fontSize: "0.75rem", bgcolor: "grey.200" }} />
                ) : null
              }
              action={
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(p);
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
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>{editing ? "تعديل صنف" : "إضافة صنف"}</DialogTitle>
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
            <MobileFriendlySelect
              label="وحدة القياس"
              options={[
                { value: "sqm", label: "متر مربع" },
                { value: "linear_m", label: "متر طولي" },
              ]}
              value={form.unit}
              onChange={(v) => setForm((f) => ({ ...f, unit: v as ProductUnit }))}
              fullWidth
              size="small"
              sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}
            />
            <MobileFriendlySelect
              label="نوع المادة"
              options={[
                { value: "marble", label: "رخام" },
                { value: "granite", label: "جرانيت" },
              ]}
              value={form.materialType}
              onChange={(v) => setForm((f) => ({ ...f, materialType: v as MaterialType | "" }))}
              fullWidth
              size="small"
              placeholder="—"
              displayEmpty
              sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}
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
          <Button variant="contained" onClick={handleSave} disabled={!form.nameAr.trim()} sx={{ fontFamily: "var(--font-cairo)" }}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </NAdminShell>
  );
}
