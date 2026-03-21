"use client";

import { useState, useEffect, useCallback } from "react";
import { useProject } from "../layout";
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Alert, IconButton, Chip
} from "@mui/material";
import {
  AddOutlined, EditOutlined, DeleteOutline,
  PhoneOutlined, EmailOutlined, AddCircleOutline, RemoveCircleOutline, PersonOutlined
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
    color: "#e2e8f0", direction: "rtl" as const, minWidth: "min(520px, 94vw)", maxHeight: "90vh",
  },
};

interface Contact {
  id: string;
  name: string;
  phones: string[];
  email?: string;
  notes?: string;
}

interface Props {
  type: "suppliers" | "customers";
  title: string;
  emptyIcon: string;
  accentColor: string;
  accentBg: string;
}

const emptyForm = { name: "", phones: [""], email: "", notes: "" };

// Egyptian numbers: 010x, 011x, 012x, 015x — 11 digits
const validatePhone = (p: string) => /^01[0125]\d{8}$/.test(p.replace(/\s/g, ""));
const isPhoneValid = (p: string) => !p.trim() || validatePhone(p.trim());

export default function ContactsPage({ type, title, emptyIcon, accentColor, accentBg }: Props) {
  const { projectId } = useProject();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm, phones: [""] });
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

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

  const apiBase = `/api/erp-auth/projects/${projectId}/proj2-${type}`;
  const singularKey = type === "suppliers" ? "supplier" : "customer";
  const pluralKey = type;

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(apiBase);
      const data = await res.json();
      setContacts(data[pluralKey] || []);
    } catch { setError("فشل في تحميل البيانات"); }
    finally { setLoading(false); }
  }, [apiBase, pluralKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setDialogMode("add"); setEditId(null);
    setForm({ ...emptyForm, phones: [""] });
    setDialogOpen(true);
  };

  const openEdit = (c: Contact) => {
    setDialogMode("edit"); setEditId(c.id);
    setForm({ name: c.name, phones: c.phones?.length ? c.phones : [""], email: c.email || "", notes: c.notes || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    // Validate all non-empty phones before saving
    const invalidPhones = form.phones.filter(p => p.trim() && !validatePhone(p.trim()));
    if (invalidPhones.length > 0) { setError("يوجد أرقام هاتف غير صحيحة"); return; }
    setSaving(true); setError(null);
    try {
      const validPhones = form.phones.filter(p => p.trim());
      const url = dialogMode === "add" ? apiBase : `${apiBase}/${editId}`;
      const method = dialogMode === "add" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, phones: validPhones }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); setSaving(false); return; }
      setSuccess(dialogMode === "add" ? "تم الإضافة بنجاح" : "تم التعديل بنجاح");
      setDialogOpen(false); fetchData();
    } catch { setError("فشل الحفظ"); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSaving(true); setError(null);
    try {
      const res = await fetch(`${apiBase}/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setError(d.error); setDeleteSaving(false); return; }
      setSuccess("تم الحذف بنجاح"); setDeleteOpen(false); setDeleteTarget(null); fetchData();
    } catch { setError("فشل الحذف"); } finally { setDeleteSaving(false); }
  };

  const addPhone = () => setForm(f => ({ ...f, phones: [...f.phones, ""] }));
  const removePhone = (i: number) => setForm(f => ({ ...f, phones: f.phones.filter((_, j) => j !== i) }));
  const setPhone = (i: number, val: string) => setForm(f => ({ ...f, phones: f.phones.map((p, j) => j === i ? val : p) }));

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>{title}</h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0, fontFamily: "var(--font-cairo)" }}>إدارة بيانات التواصل للمشروع</p>
        </div>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={openAdd}
          sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", background: `linear-gradient(135deg, ${accentColor} 0%, ${accentBg} 100%)`, whiteSpace: "nowrap" }}>
          إضافة {type === "suppliers" ? "مورد" : "عميل"} جديد
        </Button>
      </div>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontFamily: "var(--font-cairo)", direction: "rtl", textAlign: "right" }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#86efac", fontFamily: "var(--font-cairo)", direction: "rtl", textAlign: "right" }}>{success}</Alert>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}><CircularProgress sx={{ color: accentColor }} /></div>
      ) : contacts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", borderRadius: "20px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
          <p style={{ fontSize: "48px", margin: "0 0 12px" }}>{emptyIcon}</p>
          <p style={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "16px" }}>لا يوجد {type === "suppliers" ? "موردين" : "عملاء"} بعد</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {contacts.map((c) => (
            <div key={c.id} style={{ padding: "16px", borderRadius: "16px", background: "rgba(30,41,59,0.5)", border: "1px solid rgba(148,163,184,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                {/* Info */}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <PersonOutlined sx={{ fontSize: 16, color: accentColor }} />
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "#f1f5f9", fontFamily: "var(--font-cairo)" }}>{c.name}</span>
                  </div>
                  {/* Phones — clickable */}
                  {c.phones?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
                      {c.phones.map((phone, i) => phone && (
                        <a key={i} href={`tel:${phone}`} style={{ textDecoration: "none" }}>
                          <Chip
                            icon={<PhoneOutlined sx={{ fontSize: 14, color: "#10b981 !important" }} />}
                            label={phone}
                            size="small"
                            sx={{
                              fontFamily: "var(--font-cairo)", fontSize: "12px", direction: "ltr",
                              backgroundColor: "rgba(16,185,129,0.1)", color: "#6ee7b7",
                              border: "1px solid rgba(16,185,129,0.2)", cursor: "pointer",
                              "&:hover": { backgroundColor: "rgba(16,185,129,0.2)" }
                            }}
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <EmailOutlined sx={{ fontSize: 13, color: "#60a5fa" }} />
                      <span style={{ fontSize: "12px", color: "#60a5fa", fontFamily: "var(--font-cairo)" }}>{c.email}</span>
                    </a>
                  )}
                  {c.notes && <p style={{ fontSize: "12px", color: "#64748b", margin: "6px 0 0", fontFamily: "var(--font-cairo)", lineHeight: 1.5 }}>{c.notes}</p>}
                </div>
                {/* Actions */}
                <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                  <IconButton size="small" onClick={() => openEdit(c)} sx={{ color: "#f59e0b", "&:hover": { background: "rgba(245,158,11,0.1)" } }}><EditOutlined sx={{ fontSize: 16 }} /></IconButton>
                  <IconButton size="small" onClick={() => { setDeleteTarget(c); setDeleteOpen(true); }} sx={{ color: "#64748b", "&:hover": { color: "#f87171", background: "rgba(248,113,113,0.1)" } }}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>
          {dialogMode === "add" ? `إضافة ${type === "suppliers" ? "مورد" : "عميل"} جديد` : "تعديل البيانات"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <TextField label="الاسم *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} fullWidth required sx={fieldSx} />

          {/* Phone numbers */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", margin: 0, fontFamily: "var(--font-cairo)" }}>📞 أرقام الهاتف</p>
              <IconButton size="small" onClick={addPhone} sx={{ color: "#10b981", "&:hover": { background: "rgba(16,185,129,0.1)" } }}>
                <AddCircleOutline sx={{ fontSize: 18 }} />
              </IconButton>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {form.phones.map((phone, i) => (
                <div key={i}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <TextField
                      value={phone}
                      onChange={e => setPhone(i, e.target.value)}
                      placeholder="01xxxxxxxxx"
                      size="small"
                      fullWidth
                      error={!!phone.trim() && !validatePhone(phone.trim())}
                      sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" },
                        ...(!!phone.trim() && !validatePhone(phone.trim()) ? {
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "12px", backgroundColor: "rgba(15,23,42,0.5)", color: "#e2e8f0", fontFamily: "var(--font-cairo)",
                            "& fieldset": { borderColor: "rgba(239,68,68,0.5)" },
                            "&:hover fieldset": { borderColor: "rgba(239,68,68,0.7)" },
                            "&.Mui-focused fieldset": { borderColor: "#ef4444" },
                          }
                        } : {})
                      }}
                      inputProps={{ type: "tel", dir: "ltr" }}
                    />
                    {form.phones.length > 1 && (
                      <IconButton size="small" onClick={() => removePhone(i)} sx={{ color: "#f87171", "&:hover": { background: "rgba(248,113,113,0.1)" } }}>
                        <RemoveCircleOutline sx={{ fontSize: 18 }} />
                      </IconButton>
                    )}
                  </div>
                  {!!phone.trim() && !validatePhone(phone.trim()) && (
                    <p style={{ fontSize: "11px", color: "#ef4444", margin: "4px 0 0 4px", fontFamily: "var(--font-cairo)" }}>
                      رقم غير صحيح — يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويكون 11 رقم
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <TextField label="البريد الإلكتروني" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} inputProps={{ type: "email", dir: "ltr" }} />
          <TextField label="ملاحظات" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            fullWidth multiline rows={3} sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleSave} disabled={saving || !form.name || form.phones.some(p => p.trim() && !validatePhone(p.trim()))} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: `linear-gradient(135deg, ${accentColor} 0%, ${accentBg} 100%)` }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حفظ"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#f87171" }}>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <p style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", fontSize: "15px", margin: 0 }}>
            هل أنت متأكد من حذف <strong style={{ color: "#e2e8f0" }}>{deleteTarget?.name}</strong>؟
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleDelete} disabled={deleteSaving} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "#dc2626", "&:hover": { background: "#b91c1c" } }}>
            {deleteSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حذف"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
