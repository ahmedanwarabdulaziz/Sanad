"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AdminAuthenticatedLayout from "../components/AdminAuthenticatedLayout";

import {
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import {
  AddOutlined,
  EditOutlined,
  DeleteOutline,
  PersonOutline,
  EmailOutlined,
  LockOutlined,
  VisibilityOff,
  Visibility,
} from "@mui/icons-material";

interface ErpUser {
  id: string;
  auth_id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin" | "editor" | "viewer";
  is_active: boolean;
  created_at: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: "مدير عام", color: "#8b5cf6" },
  admin: { label: "مدير", color: "#3b82f6" },
  editor: { label: "محرر", color: "#06b6d4" },
  viewer: { label: "مشاهد", color: "#64748b" },
};

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    backgroundColor: "#e8e8e3",
    color: "#111827",
    fontFamily: "var(--font-cairo), Cairo, sans-serif",
    "& fieldset": { borderColor: "#d1d0c6" },
    "&:hover fieldset": { borderColor: "#154278" },
    "&.Mui-focused fieldset": { borderColor: "#154278" },
  },
  "& .MuiInputLabel-root": {
    color: "#4b5563",
    fontFamily: "var(--font-cairo), Cairo, sans-serif",
    "&.Mui-focused": { color: "#154278" },
  },
  "& .MuiInputBase-input": { textAlign: "right" },
  "& .MuiSelect-icon": { color: "#4b5563" },
};

export default function UsersPage() {
  const [users, setUsers] = useState<ErpUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "viewer" as string,
  });
  const [addLoading, setAddLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<ErpUser | null>(null);
  const [editForm, setEditForm] = useState({ name: "", role: "" });
  const [editLoading, setEditLoading] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<ErpUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);


  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/erp-auth/users");
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch {
      setError("فشل في تحميل المستخدمين");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAdd = async () => {
    setAddLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/erp-auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setSuccess("تم إضافة المستخدم بنجاح");
      setAddOpen(false);
      setAddForm({ name: "", email: "", password: "", role: "viewer" });
      fetchUsers();
    } catch {
      setError("فشل في إضافة المستخدم");
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setEditLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/erp-auth/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setSuccess("تم تحديث المستخدم بنجاح");
      setEditOpen(false);
      fetchUsers();
    } catch {
      setError("فشل في تحديث المستخدم");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/erp-auth/users/${deleteUser.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setSuccess("تم حذف المستخدم بنجاح");
      setDeleteOpen(false);
      fetchUsers();
    } catch {
      setError("فشل في حذف المستخدم");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleActive = async (user: ErpUser) => {
    try {
      await fetch(`/api/erp-auth/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      fetchUsers();
    } catch {
      setError("فشل في تحديث حالة المستخدم");
    }
  };

  const openEdit = (user: ErpUser) => {
    setEditUser(user);
    setEditForm({ name: user.name, role: user.role });
    setEditOpen(true);
  };

  const openDelete = (user: ErpUser) => {
    setDeleteUser(user);
    setDeleteOpen(true);
  };

  const dialogSx = {
    "& .MuiDialog-paper": {
      background: "#e8e8e3",
      border: "1px solid #d1d0c6",
      borderRadius: "12px",
      color: "#111827",
      direction: "rtl" as const,
      minWidth: "min(400px, 90vw)",
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
    },
  };

  return (
    <AdminAuthenticatedLayout>
      <div style={{ maxWidth: "1600px", margin: "0 auto", width: "100%" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            flexWrap: "wrap",
            gap: "16px",
            background: "#e8e8e3",
            padding: "24px 32px",
            borderRadius: "8px",
            border: "1px solid #d1d0c6",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "#111827",
                margin: "0 0 4px 0",
                fontFamily: "var(--font-cairo), Cairo, sans-serif",
              }}
            >
              إدارة المستخدمين
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "#4b5563",
                margin: 0,
                fontFamily: "var(--font-cairo), Cairo, sans-serif",
              }}
            >
              سجل مستخدمي النظام والصلاحيات
            </p>
          </div>
          <Button
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={() => setAddOpen(true)}
            sx={{
              borderRadius: "6px",
              px: 3,
              py: 1,
              fontFamily: "var(--font-cairo), Cairo, sans-serif",
              fontWeight: 600,
              fontSize: "14px",
              textTransform: "none",
              color: "#ffffff",
              background: "#154278",
              boxShadow: "none",
              "&:hover": {
                background: "#0d2b4f",
                boxShadow: "none",
              },
            }}
          >
            إضافة مستخدم
          </Button>
        </div>

        {/* Alerts */}
        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            sx={{
              mb: 2,
              borderRadius: "12px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#fca5a5",
              "& .MuiAlert-icon": { color: "#f87171" },
              "& .MuiAlert-action": { color: "#f87171" },
              fontFamily: "var(--font-cairo)",
              direction: "rtl",
            }}
          >
            {error}
          </Alert>
        )}
        {success && (
          <Alert
            severity="success"
            onClose={() => setSuccess(null)}
            sx={{
              mb: 2,
              borderRadius: "12px",
              backgroundColor: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.2)",
              color: "#86efac",
              "& .MuiAlert-icon": { color: "#4ade80" },
              "& .MuiAlert-action": { color: "#4ade80" },
              fontFamily: "var(--font-cairo)",
              direction: "rtl",
            }}
          >
            {success}
          </Alert>
        )}

        {/* Users List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <CircularProgress sx={{ color: "#3b82f6" }} />
          </div>
        ) : users.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 24px",
              borderRadius: "8px",
              background: "#e8e8e3",
              border: "1px solid #d1d0c6",
            }}
          >
            <PersonOutline
              sx={{ fontSize: 48, color: "#9ca3af", mb: 2 }}
            />
            <p
              style={{
                color: "#4b5563",
                fontFamily: "var(--font-cairo)",
                fontSize: "16px",
              }}
            >
              لا يوجد سجلات مستخدمين حتى الآن
            </p>
          </div>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #d1d0c6", borderRadius: "8px" }}>
            <Table sx={{ minWidth: 650 }} aria-label="users table">
              <TableHead sx={{ background: "#154278" }}>
                <TableRow>
                  <TableCell sx={{ color: "#ffffff", fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "14px" }}>المستخدم</TableCell>
                  <TableCell sx={{ color: "#ffffff", fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "14px" }}>البريد الإلكتروني</TableCell>
                  <TableCell sx={{ color: "#ffffff", fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "14px" }}>الصلاحية</TableCell>
                  <TableCell sx={{ color: "#ffffff", fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "14px" }}>الحالة</TableCell>
                  <TableCell sx={{ color: "#ffffff", fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "14px", textAlign: "left" }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user.id}
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      backgroundColor: "#e8e8e3",
                      opacity: user.is_active ? 1 : 0.6,
                      "&:hover": {
                        backgroundColor: "#d1d0c6",
                      }
                    }}
                  >
                    <TableCell component="th" scope="row" sx={{ fontFamily: "var(--font-cairo)", color: "#111827", fontWeight: 600 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "8px",
                            background: `linear-gradient(135deg, ${ROLE_LABELS[user.role]?.color || "#64748b"}22, ${ROLE_LABELS[user.role]?.color || "#64748b"}05)`,
                            border: `1px solid ${ROLE_LABELS[user.role]?.color || "#64748b"}44`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <PersonOutline sx={{ color: ROLE_LABELS[user.role]?.color || "#64748b", fontSize: 20 }} />
                        </div>
                        {user.name}
                      </div>
                    </TableCell>
                    <TableCell sx={{ fontFamily: "var(--font-cairo)", color: "#4b5563" }}>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={ROLE_LABELS[user.role]?.label || user.role}
                        size="small"
                        sx={{
                          backgroundColor: `${ROLE_LABELS[user.role]?.color || "#64748b"}15`,
                          color: ROLE_LABELS[user.role]?.color || "#64748b",
                          border: `1px solid ${ROLE_LABELS[user.role]?.color || "#64748b"}33`,
                          fontFamily: "var(--font-cairo)",
                          fontSize: "12px",
                          fontWeight: 600,
                          borderRadius: "4px",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_active ? "نشط" : "معطل"}
                        size="small"
                        sx={{
                          backgroundColor: user.is_active ? "rgba(74, 222, 128, 0.1)" : "rgba(239, 68, 68, 0.1)",
                          color: user.is_active ? "#16a34a" : "#dc2626",
                          border: `1px solid ${user.is_active ? "rgba(74, 222, 128, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                          fontFamily: "var(--font-cairo)",
                          fontSize: "12px",
                          fontWeight: 600,
                          borderRadius: "4px",
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: "left" }}>
                      <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                        <Button
                          onClick={() => handleToggleActive(user)}
                          variant="text"
                          size="small"
                          sx={{
                            color: user.is_active ? "#ef4444" : "#10b981",
                            fontFamily: "var(--font-cairo)",
                            fontWeight: 600,
                            minWidth: "auto",
                            padding: "4px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          {user.is_active ? "تعطيل" : "تفعيل"}
                        </Button>

                        <IconButton
                          onClick={() => openEdit(user)}
                          size="small"
                          title="تعديل"
                          sx={{ color: "#6b7280", "&:hover": { color: "#154278", background: "rgba(21, 66, 120, 0.1)" } }}
                        >
                          <EditOutlined sx={{ fontSize: 18 }} />
                        </IconButton>
                        {user.role !== "super_admin" && (
                          <IconButton
                            onClick={() => openDelete(user)}
                            size="small"
                            title="حذف"
                            sx={{ color: "#6b7280", "&:hover": { color: "#ef4444", background: "rgba(239, 68, 68, 0.1)" } }}
                          >
                            <DeleteOutline sx={{ fontSize: 18 }} />
                          </IconButton>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* ── Add User Dialog ── */}
        <Dialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          sx={dialogSx}
        >
          <DialogTitle
            sx={{
              fontFamily: "var(--font-cairo)",
              fontWeight: 700,
              fontSize: "20px",
              pb: 1,
            }}
          >
            إضافة مستخدم جديد
          </DialogTitle>
          <DialogContent
            sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}
          >
            <TextField
              label="الاسم"
              value={addForm.name}
              onChange={(e) =>
                setAddForm({ ...addForm, name: e.target.value })
              }
              fullWidth
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutline sx={{ color: "#64748b", fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="البريد الإلكتروني"
              type="email"
              value={addForm.email}
              onChange={(e) =>
                setAddForm({ ...addForm, email: e.target.value })
              }
              fullWidth
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlined sx={{ color: "#64748b", fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="كلمة المرور"
              type={showPassword ? "text" : "password"}
              value={addForm.password}
              onChange={(e) =>
                setAddForm({ ...addForm, password: e.target.value })
              }
              fullWidth
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined sx={{ color: "#64748b", fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      sx={{ color: "#64748b" }}
                    >
                      {showPassword ? (
                        <VisibilityOff sx={{ fontSize: 18 }} />
                      ) : (
                        <Visibility sx={{ fontSize: 18 }} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <FormControl fullWidth sx={fieldSx}>
              <InputLabel>الصلاحية</InputLabel>
              <Select
                value={addForm.role}
                onChange={(e) =>
                  setAddForm({ ...addForm, role: e.target.value })
                }
                label="الصلاحية"
                sx={{
                  color: "#e2e8f0",
                  "& .MuiSelect-icon": { color: "#64748b" },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      background: "#154278",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "12px",
                      "& .MuiMenuItem-root": {
                        fontFamily: "var(--font-cairo)",
                        color: "#ffffff",
                        "&:hover": { background: "rgba(209,208,198,0.1)" },
                        "&.Mui-selected": {
                          background: "rgba(209,208,198,0.15)",
                        },
                      },
                    },
                  },
                }}
              >
                <MenuItem value="admin">مدير</MenuItem>
                <MenuItem value="editor">محرر</MenuItem>
                <MenuItem value="viewer">مشاهد</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button
              onClick={() => setAddOpen(false)}
              sx={{
                color: "#94a3b8",
                fontFamily: "var(--font-cairo)",
                textTransform: "none",
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleAdd}
              disabled={
                addLoading ||
                !addForm.name ||
                !addForm.email ||
                !addForm.password
              }
              variant="contained"
              sx={{
                borderRadius: "10px",
                fontFamily: "var(--font-cairo)",
                fontWeight: 600,
                textTransform: "none",
                color: "#154278",
                background: "#d1d0c6",
                "&:hover": {
                  background: "#e5e5e0",
                },
                "&.Mui-disabled": {
                  background: "rgba(209, 208, 198, 0.3)",
                  color: "rgba(21, 66, 120, 0.4)",
                },
              }}
            >
              {addLoading ? (
                <CircularProgress size={20} sx={{ color: "#154278" }} />
              ) : (
                "إضافة"
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Edit User Dialog ── */}
        <Dialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          sx={dialogSx}
        >
          <DialogTitle
            sx={{
              fontFamily: "var(--font-cairo)",
              fontWeight: 700,
              fontSize: "20px",
              pb: 1,
            }}
          >
            تعديل المستخدم
          </DialogTitle>
          <DialogContent
            sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}
          >
            <TextField
              label="الاسم"
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
              fullWidth
              sx={fieldSx}
            />
            <FormControl fullWidth sx={fieldSx}>
              <InputLabel>الصلاحية</InputLabel>
              <Select
                value={editForm.role}
                onChange={(e) =>
                  setEditForm({ ...editForm, role: e.target.value })
                }
                label="الصلاحية"
                sx={{
                  color: "#e2e8f0",
                  "& .MuiSelect-icon": { color: "#64748b" },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      background: "#154278",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "12px",
                      "& .MuiMenuItem-root": {
                        fontFamily: "var(--font-cairo)",
                        color: "#ffffff",
                        "&:hover": { background: "rgba(209,208,198,0.1)" },
                        "&.Mui-selected": {
                          background: "rgba(209,208,198,0.15)",
                        },
                      },
                    },
                  },
                }}
              >
                <MenuItem value="super_admin">مدير عام</MenuItem>
                <MenuItem value="admin">مدير</MenuItem>
                <MenuItem value="editor">محرر</MenuItem>
                <MenuItem value="viewer">مشاهد</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button
              onClick={() => setEditOpen(false)}
              sx={{
                color: "#94a3b8",
                fontFamily: "var(--font-cairo)",
                textTransform: "none",
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleEdit}
              disabled={editLoading || !editForm.name}
              variant="contained"
              sx={{
                borderRadius: "10px",
                fontFamily: "var(--font-cairo)",
                fontWeight: 600,
                textTransform: "none",
                color: "#154278",
                background: "#d1d0c6",
                "&:hover": {
                  background: "#e5e5e0",
                },
              }}
            >
              {editLoading ? (
                <CircularProgress size={20} sx={{ color: "#154278" }} />
              ) : (
                "حفظ"
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Delete Confirmation Dialog ── */}
        <Dialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          sx={dialogSx}
        >
          <DialogTitle
            sx={{
              fontFamily: "var(--font-cairo)",
              fontWeight: 700,
              fontSize: "20px",
              color: "#f87171",
            }}
          >
            حذف المستخدم
          </DialogTitle>
          <DialogContent>
            <p
              style={{
                fontFamily: "var(--font-cairo), Cairo, sans-serif",
                color: "#94a3b8",
                fontSize: "15px",
                margin: 0,
              }}
            >
              هل أنت متأكد من حذف المستخدم{" "}
              <strong style={{ color: "#e2e8f0" }}>
                {deleteUser?.name}
              </strong>
              ؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button
              onClick={() => setDeleteOpen(false)}
              sx={{
                color: "#94a3b8",
                fontFamily: "var(--font-cairo)",
                textTransform: "none",
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleteLoading}
              variant="contained"
              sx={{
                borderRadius: "10px",
                fontFamily: "var(--font-cairo)",
                fontWeight: 600,
                textTransform: "none",
                background: "#dc2626",
                "&:hover": { background: "#b91c1c" },
              }}
            >
              {deleteLoading ? (
                <CircularProgress size={20} sx={{ color: "#fff" }} />
              ) : (
                "حذف"
              )}
            </Button>
          </DialogActions>
        </Dialog>


      </div>
    </AdminAuthenticatedLayout>
  );
}
