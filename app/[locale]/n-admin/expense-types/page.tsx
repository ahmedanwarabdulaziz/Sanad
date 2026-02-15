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
import NAdminShell from "../components/NAdminShell";
import { RecordList, RecordCard, PageHeader, EmptyState } from "../components";
import { getAllExpenseTypes, createExpenseType, updateExpenseType } from "@/databases/sales-operations/collections/expense_types";
import type { SalesUser } from "@/databases/sales-operations/types";
import type { ExpenseType } from "@/databases/sales-operations/types";

export default function ExpenseTypesPage() {
  const [user, setUser] = useState<SalesUser | null>(null);
  const [items, setItems] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseType | null>(null);
  const [form, setForm] = useState({
    nameAr: "",
    nameEn: "",
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
        u.pageAccess?.some((a: { pageId: string }) => a.pageId === "expense_types");
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
    getAllExpenseTypes()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  const openAdd = () => {
    setEditing(null);
    setForm({
      nameAr: "",
      nameEn: "",
      order: items.length,
      active: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (e: ExpenseType) => {
    setEditing(e);
    setForm({
      nameAr: e.nameAr,
      nameEn: e.nameEn ?? "",
      order: e.order,
      active: e.active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nameAr.trim()) return;
    try {
      const payload = {
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim() || undefined,
        order: form.order,
        active: form.active,
        ...(editing ? { updatedBy: user?.id } : { createdBy: user?.id }),
      };
      if (editing) {
        await updateExpenseType(editing.id, payload);
      } else {
        await createExpenseType(payload);
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

  return (
    <NAdminShell>
      <PageHeader
        title="أنواع المصروفات"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} size="small" sx={{ fontFamily: "var(--font-cairo)" }}>
            إضافة نوع
          </Button>
        }
      />

      <RecordList loading={loading}>
        {!loading && items.length === 0 && (
          <EmptyState title="لا توجد أنواع مصروفات" subtitle="مثال: بقشيش، نولون، تعتيق — ثم اخترها في فواتير الشراء" />
        )}
        {!loading &&
          items.map((item) => (
            <RecordCard
              key={item.id}
              title={item.nameAr}
              subtitle={item.nameEn ? `(${item.nameEn})` : undefined}
              meta={
                !item.active ? (
                  <Chip label="معطّل" size="small" sx={{ height: 22, fontSize: "0.75rem", bgcolor: "grey.200" }} />
                ) : null
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
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>{editing ? "تعديل نوع مصروف" : "إضافة نوع مصروف"}</DialogTitle>
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
              label="ترتيب العرض"
              type="number"
              value={form.order}
              onChange={(e) => setForm((f) => ({ ...f, order: parseInt(e.target.value, 10) || 0 }))}
              fullWidth
              size="small"
              inputProps={{ min: 0, dir: "rtl" }}
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
