"use client";

import { useState, useEffect, useCallback } from "react";
import { useProject } from "../layout";
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, CircularProgress,
  Alert, IconButton
} from "@mui/material";
import {
  AddOutlined, EditOutlined, DeleteOutline
} from "@mui/icons-material";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px", backgroundColor: "rgba(15,23,42,0.5)", color: "#e2e8f0", fontFamily: "var(--font-cairo)",
    "& fieldset": { borderColor: "rgba(148,163,184,0.15)" },
    "&:hover fieldset": { borderColor: "rgba(59,130,246,0.4)" },
    "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
  },
  "& .MuiInputLabel-root": { color: "#94a3b8", fontFamily: "var(--font-cairo)", "&.Mui-focused": { color: "#60a5fa" } },
  "& .MuiInputBase-input": { textAlign: "right" },
};

const dialogSx = {
  "& .MuiDialog-paper": {
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    border: "1px solid rgba(148,163,184,0.12)", borderRadius: "20px",
    color: "#e2e8f0", direction: "rtl" as const, minWidth: "min(500px, 94vw)", maxHeight: "90vh",
  },
};

const menuSx = { PaperProps: { sx: { background: "#1e293b", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "12px", "& .MuiMenuItem-root": { fontFamily: "var(--font-cairo)", color: "#e2e8f0", "&:hover": { background: "rgba(59,130,246,0.1)" } } } } };

const UNIT_OPTIONS = [
  { value: "متر مربع", label: "متر مربع (م²)" },
  { value: "متر طولي", label: "متر طولي (م.ط)" },
  { value: "لوت", label: "لوت (Lot)" },
];

export default function Proj2InventoryPage() {
  const { projectId } = useProject();
  const [activeTab, setActiveTab] = useState<"categories" | "items">("categories");

  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-dismiss alerts after 4 seconds
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [success]);
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  // Dialogs
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [editId, setEditId] = useState<string | null>(null);
  
  const [catForm, setCatForm] = useState({ name: "", description: "" });
  const [itemForm, setItemForm] = useState({ category_id: "", name: "", unit: "متر مربع" });
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"category" | "item">("category");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [catRes, itemRes] = await Promise.all([
        fetch(`/api/erp-auth/projects/${projectId}/proj2-categories`),
        fetch(`/api/erp-auth/projects/${projectId}/proj2-items`)
      ]);
      const catData = await catRes.json();
      const itemData = await itemRes.json();
      setCategories(catData.categories || []);
      setItems(itemData.items || []);
    } catch {
      setError("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Dialogs
  const openAddCategory = () => {
    setDialogMode("add"); setEditId(null);
    setCatForm({ name: "", description: "" });
    setCatDialogOpen(true);
  };
  const openEditCategory = (c: any) => {
    setDialogMode("edit"); setEditId(c.id);
    setCatForm({ name: c.name, description: c.description || "" });
    setCatDialogOpen(true);
  };
  const openAddItem = () => {
    setDialogMode("add"); setEditId(null);
    setItemForm({ category_id: "", name: "", unit: "متر مربع" });
    setItemDialogOpen(true);
  };
  const openEditItem = (i: any) => {
    setDialogMode("edit"); setEditId(i.id);
    setItemForm({ category_id: i.category_id, name: i.name, unit: i.unit });
    setItemDialogOpen(true);
  };

  // Saves
  const handleSaveCategory = async () => {
    setSaving(true); setError(null);
    try {
      const url = dialogMode === "add" ? `/api/erp-auth/projects/${projectId}/proj2-categories` : `/api/erp-auth/projects/${projectId}/proj2-categories/${editId}`;
      const method = dialogMode === "add" ? "POST" : "PATCH";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(catForm) });
      if (!res.ok) { const d = await res.json(); setError(d.error); setSaving(false); return; }
      setSuccess(dialogMode === "add" ? "تم إضافة المجموعة" : "تم تعديل المجموعة");
      setCatDialogOpen(false); fetchData();
    } catch { setError("فشل الحفظ"); } finally { setSaving(false); }
  };

  const handleSaveItem = async () => {
    setSaving(true); setError(null);
    try {
      const url = dialogMode === "add" ? `/api/erp-auth/projects/${projectId}/proj2-items` : `/api/erp-auth/projects/${projectId}/proj2-items/${editId}`;
      const method = dialogMode === "add" ? "POST" : "PATCH";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(itemForm) });
      if (!res.ok) { const d = await res.json(); setError(d.error); setSaving(false); return; }
      setSuccess(dialogMode === "add" ? "تم إضافة الصنف" : "تم تعديل الصنف");
      setItemDialogOpen(false); fetchData();
    } catch { setError("فشل الحفظ"); } finally { setSaving(false); }
  };

  // Delete
  const handleDelete = async () => {
    setDeleteSaving(true); setError(null);
    try {
      const url = deleteType === "category" ? `/api/erp-auth/projects/${projectId}/proj2-categories/${deleteTarget.id}` : `/api/erp-auth/projects/${projectId}/proj2-items/${deleteTarget.id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setError(d.error); setDeleteSaving(false); return; }
      setSuccess("تم الحذف بنجاح"); setDeleteOpen(false); fetchData();
    } catch { setError("فشل الحذف"); } finally { setDeleteSaving(false); }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>المجموعات والأصناف</h1>
            <p style={{ fontSize: "14px", color: "#64748b", margin: 0, fontFamily: "var(--font-cairo)" }}>إدارة المخزون والتصنيفات للمشروع</p>
          </div>
          <Button variant="contained" startIcon={<AddOutlined />} onClick={activeTab === "categories" ? openAddCategory : openAddItem}
              sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", whiteSpace: "nowrap" }}>
              إضافة {activeTab === "categories" ? "مجموعة" : "صنف"}
          </Button>
        </div>
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
          <Button variant={activeTab === "categories" ? "contained" : "outlined"} onClick={() => setActiveTab("categories")}
            sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", whiteSpace: "nowrap", flex: "0 0 auto", ...(activeTab === "categories" ? { background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" } : { borderColor: "rgba(148,163,184,0.3)", color: "#e2e8f0" }) }}>
            المجموعات
          </Button>
          <Button variant={activeTab === "items" ? "contained" : "outlined"} onClick={() => setActiveTab("items")}
            sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", whiteSpace: "nowrap", flex: "0 0 auto", ...(activeTab === "items" ? { background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" } : { borderColor: "rgba(148,163,184,0.3)", color: "#e2e8f0" }) }}>
            الأصناف
          </Button>
        </div>
      </div>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontFamily: "var(--font-cairo)", direction: "rtl", textAlign: "right" }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#86efac", fontFamily: "var(--font-cairo)", direction: "rtl", textAlign: "right" }}>{success}</Alert>}

      {/* Lists */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}><CircularProgress sx={{ color: "#3b82f6" }} /></div>
      ) : activeTab === "categories" ? (
        categories.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", borderRadius: "20px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
            <p style={{ fontSize: "48px", margin: "0 0 12px" }}>📂</p>
            <p style={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "16px" }}>لا توجد مجموعات بعد</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {categories.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "14px 16px", borderRadius: "14px", background: "rgba(30,41,59,0.5)", border: "1px solid rgba(148,163,184,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#60a5fa", background: "rgba(59,130,246,0.1)", borderRadius: "8px", padding: "3px 8px", direction: "ltr", flexShrink: 0, fontFamily: "monospace" }}>{c.code || "—"}</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0", margin: 0, fontFamily: "var(--font-cairo)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                    {c.description && <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0", fontFamily: "var(--font-cairo)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.description}</p>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                  <IconButton size="small" onClick={() => openEditCategory(c)} sx={{ color: "#f59e0b", "&:hover": { background: "rgba(245,158,11,0.1)" } }}><EditOutlined sx={{ fontSize: 16 }} /></IconButton>
                  <IconButton size="small" onClick={() => { setDeleteTarget(c); setDeleteType("category"); setDeleteOpen(true); }} sx={{ color: "#64748b", "&:hover": { color: "#f87171", background: "rgba(248,113,113,0.1)" } }}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton>
                </div>
              </div>
            ))}
          </div>
        )
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", borderRadius: "20px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
          <p style={{ fontSize: "48px", margin: "0 0 12px" }}>📋</p>
          <p style={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "16px" }}>لا توجد أصناف بعد</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {items.map((it) => (
            <div key={it.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "14px 16px", borderRadius: "14px", background: "rgba(30,41,59,0.5)", border: "1px solid rgba(148,163,184,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#38bdf8", background: "rgba(56,189,248,0.1)", borderRadius: "8px", padding: "3px 8px", direction: "ltr", flexShrink: 0, fontFamily: "monospace" }}>{it.code || "—"}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0", margin: 0, fontFamily: "var(--font-cairo)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</p>
                  <div style={{ display: "flex", gap: "8px", marginTop: "3px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>{it.category?.name || "—"}</span>
                    <span style={{ fontSize: "11px", color: "#a78bfa", fontFamily: "var(--font-cairo)", fontWeight: 600 }}>· {it.unit}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                <IconButton size="small" onClick={() => openEditItem(it)} sx={{ color: "#f59e0b", "&:hover": { background: "rgba(245,158,11,0.1)" } }}><EditOutlined sx={{ fontSize: 16 }} /></IconButton>
                <IconButton size="small" onClick={() => { setDeleteTarget(it); setDeleteType("item"); setDeleteOpen(true); }} sx={{ color: "#64748b", "&:hover": { color: "#f87171", background: "rgba(248,113,113,0.1)" } }}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <Dialog open={catDialogOpen} onClose={() => setCatDialogOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>{dialogMode === "add" ? "إضافة مجموعة" : "تعديل المجموعة"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 3, pt: "8px !important" }}>
          <TextField label="اسم المجموعة *" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} fullWidth sx={fieldSx} />
          <TextField label="الوصف" value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} fullWidth multiline rows={3} sx={fieldSx} />
          {dialogMode === "add" && <p style={{ fontSize: "11px", color: "#3b82f6", margin: "-8px 0 0", fontFamily: "var(--font-cairo)" }}>سيتم إنشاء كود المجموعة تلقائياً (مثال: C-01).</p>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setCatDialogOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleSaveCategory} disabled={saving || !catForm.name} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حفظ"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={itemDialogOpen} onClose={() => setItemDialogOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>{dialogMode === "add" ? "إضافة صنف" : "تعديل الصنف"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 3, pt: "8px !important" }}>
          <FormControl fullWidth required sx={fieldSx}>
            <InputLabel>المجموعة *</InputLabel>
            <Select value={itemForm.category_id} onChange={e => setItemForm({ ...itemForm, category_id: e.target.value as string })} label="المجموعة *" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="اسم الصنف *" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} fullWidth sx={fieldSx} />
          <FormControl fullWidth required sx={fieldSx}>
            <InputLabel>الوحدة *</InputLabel>
            <Select value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value as string })} label="الوحدة *" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              {UNIT_OPTIONS.map(u => <MenuItem key={u.value} value={u.value}>{u.label}</MenuItem>)}
            </Select>
          </FormControl>
          {dialogMode === "add" && <p style={{ fontSize: "11px", color: "#3b82f6", margin: "-8px 0 0", fontFamily: "var(--font-cairo)" }}>سيتم إنشاء كود الصنف تلقائياً (مثال: I-001).</p>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setItemDialogOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleSaveItem} disabled={saving || !itemForm.name || !itemForm.category_id} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حفظ"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#f87171" }}>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <p style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", fontSize: "15px", margin: 0 }}>
            هل أنت متأكد من حذف <strong style={{ color: "#e2e8f0" }}>{deleteTarget?.name}</strong>؟
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleDelete} disabled={deleteSaving} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "#dc2626", "&:hover": { background: "#b91c1c" } }}>
            {deleteSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حذف"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
