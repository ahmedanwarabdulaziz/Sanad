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
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import NAdminShell from "../components/NAdminShell";
import { RecordList, RecordCard, PageHeader, EmptyState } from "../components";
import { getAllUsers, createUser, updateUser } from "@/databases/sales-operations/collections/users";
import type { SalesUser, PageAccess } from "@/databases/sales-operations/types";
import { ADMIN_PAGES } from "@/databases/sales-operations/constants/pages";

export default function UsersPage() {
  const [user, setUser] = useState<SalesUser | null>(null);
  const [users, setUsers] = useState<SalesUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SalesUser | null>(null);
  const [form, setForm] = useState({
    name: "",
    pin: "",
    department: "",
    role: "user" as SalesUser["role"],
    active: true,
    pageAccess: [] as PageAccess[],
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
      if (u.role !== "super_admin" && u.role !== "admin") {
        window.location.href = "/n-admin/dashboard";
        return;
      }
    } catch {
      window.location.href = "/n-admin";
      return;
    }
    loadUsers();
  }, []);

  const loadUsers = () => {
    setLoading(true);
    getAllUsers()
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  const openAdd = () => {
    setEditingUser(null);
    setForm({
      name: "",
      pin: "",
      department: "",
      role: "user",
      active: true,
      pageAccess: ADMIN_PAGES.map((p) => ({ pageId: p.id, permission: "none" as const })),
    });
    setDialogOpen(true);
  };

  const openEdit = (u: SalesUser) => {
    setEditingUser(u);
    const access = ADMIN_PAGES.map((p) => {
      const existing = u.pageAccess?.find((a) => a.pageId === p.id);
      return { pageId: p.id, permission: (existing?.permission ?? "none") as PageAccess["permission"] };
    });
    setForm({
      name: u.name,
      pin: u.pin,
      department: u.department ?? "",
      role: u.role,
      active: u.active,
      pageAccess: access,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.pin || form.pin.length !== 4) return;
    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          name: form.name.trim(),
          pin: form.pin,
          department: form.department.trim() || undefined,
          role: form.role,
          active: form.active,
          pageAccess: form.pageAccess,
          updatedBy: user?.id,
        });
      } else {
        await createUser({
          name: form.name.trim(),
          pin: form.pin,
          department: form.department.trim() || undefined,
          role: form.role,
          active: form.active,
          pageAccess: form.pageAccess,
          createdBy: user?.id,
        });
      }
      setDialogOpen(false);
      loadUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const setPagePermission = (pageId: string, permission: PageAccess["permission"]) => {
    setForm((f) => ({
      ...f,
      pageAccess: f.pageAccess.map((a) =>
        a.pageId === pageId ? { ...a, permission } : a
      ),
    }));
  };

  if (!user) return null;

  const roleLabel = (r: SalesUser["role"]) =>
    r === "super_admin" ? "مدير أعلى" : r === "admin" ? "مدير" : "مستخدم";

  return (
    <NAdminShell>
      <PageHeader
        title="إدارة المستخدمين"
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openAdd}
            size="medium"
            sx={{
              px: 2,
              py: 1,
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              boxShadow: "0 2px 8px rgba(21,66,120,0.25)",
              fontFamily: "var(--font-cairo)",
            }}
          >
            إضافة مستخدم
          </Button>
        }
      />

      <RecordList loading={loading}>
        {!loading && users.length === 0 && (
          <EmptyState
            title="لا يوجد مستخدمين"
            subtitle="اضغط على إضافة مستخدم لبدء الإضافة"
          />
        )}
        {!loading &&
          users.map((u) => (
            <RecordCard
              key={u.id}
              title={u.name}
              subtitle={`${u.department || "—"} • ${roleLabel(u.role)}`}
              meta={
                !u.active && (
                  <Chip
                    label="معطّل"
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: "0.75rem",
                      bgcolor: "grey.200",
                      color: "grey.700",
                    }}
                  />
                )
              }
              action={
                u.role !== "super_admin" && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(u);
                    }}
                    sx={{
                      bgcolor: "grey.100",
                      "&:hover": { bgcolor: "grey.200" },
                    }}
                  >
                    <EditIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                )
              }
            />
          ))}
      </RecordList>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        dir="rtl"
        PaperProps={{
          sx: {
            borderRadius: 2,
            mx: 1,
            maxHeight: "90vh",
            direction: "rtl",
            textAlign: "right",
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>{editingUser ? "تعديل مستخدم" : "إضافة مستخدم"}</DialogTitle>
        <DialogContent sx={{ textAlign: "right" }}>
          <Box dir="rtl" sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1, textAlign: "right" }}>
            <TextField
              label="الاسم"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              required
              inputProps={{ dir: "rtl" }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
            />
            <TextField
              label="الرمز (4 أرقام)"
              value={form.pin}
              onChange={(e) =>
                setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 4) }))
              }
              inputProps={{ maxLength: 4, inputMode: "numeric", dir: "rtl" }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              fullWidth
              required
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
            />
            <TextField
              label="القسم"
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              fullWidth
              inputProps={{ dir: "rtl" }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
            />
            <Box dir="rtl" sx={{ textAlign: "right" }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", fontFamily: "var(--font-cairo)", textAlign: "right" }}>
                الدور
              </Typography>
              <Select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as SalesUser["role"] }))}
                fullWidth
                size="small"
                sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", "& .MuiSelect-select": { textAlign: "right" } }}
                MenuProps={{ PaperProps: { sx: { direction: "rtl" } } }}
              >
                <MenuItem value="user">مستخدم</MenuItem>
                <MenuItem value="admin">مدير</MenuItem>
                {user.role === "super_admin" && <MenuItem value="super_admin">مدير أعلى</MenuItem>}
              </Select>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
              }
              label="مفعّل"
              sx={{ "& .MuiFormControlLabel-label": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
            />
            <Typography variant="subtitle2" sx={{ mt: 1, fontFamily: "var(--font-cairo)", textAlign: "right" }}>
              صلاحيات الصفحات
            </Typography>
            {ADMIN_PAGES.map((p) => (
              <Box
                key={p.id}
                dir="rtl"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  bg: "grey.50",
                  textAlign: "right",
                  borderRadius: 1,
                  px: 2,
                  py: 1,
                }}
              >
                <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>{p.labelAr}</Typography>
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  {(["none", "view", "edit"] as const).map((perm) => (
                    <Button
                      key={perm}
                      size="small"
                      variant={form.pageAccess.find((a) => a.pageId === p.id)?.permission === perm ? "contained" : "outlined"}
                      onClick={() => setPagePermission(p.id, perm)}
                      sx={{ minWidth: 56, fontFamily: "var(--font-cairo)" }}
                    >
                      {perm === "none" ? "لا شيء" : perm === "view" ? "عرض" : "تعديل"}
                    </Button>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ gap: 1, direction: "rtl", justifyContent: "flex-start" }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ fontFamily: "var(--font-cairo)" }}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name.trim() || form.pin.length !== 4} sx={{ fontFamily: "var(--font-cairo)" }}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </NAdminShell>
  );
}
