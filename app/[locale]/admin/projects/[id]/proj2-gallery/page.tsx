"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useProject } from "../layout";
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Alert, IconButton, Chip,
  FormControlLabel, Switch, Select, MenuItem, FormControl, InputLabel,
  Tooltip,
} from "@mui/material";
import {
  AddOutlined, DeleteOutline, EditOutlined, CloudUploadOutlined,
  FilterListOutlined, CloseOutlined, ImageOutlined,
  ShareOutlined, CheckCircleOutlined, CheckCircleRounded,
} from "@mui/icons-material";

/* ─── Shared MUI styles ──────────────────────────────────────────────────── */
const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px", backgroundColor: "rgba(15,23,42,0.5)", color: "#e2e8f0",
    fontFamily: "var(--font-cairo)",
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

const menuSx = {
  PaperProps: {
    sx: {
      background: "#1e293b", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "12px",
      "& .MuiMenuItem-root": { fontFamily: "var(--font-cairo)", color: "#e2e8f0", "&:hover": { background: "rgba(59,130,246,0.1)" } },
    },
  },
};

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Tag { id: string; name: string; group_id: string; }
interface TagGroup { id: string; name: string; allow_multiple: boolean; gallery_tags: Tag[]; }
interface GalleryImage {
  id: string; url: string; thumbnail_url: string | null; title: string | null; created_at: string;
  gallery_image_tags: { gallery_tags: { id: string; name: string; gallery_tag_groups: { id: string; name: string } } }[];
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function Proj2GalleryPage() {
  const { projectId } = useProject();
  const [activeTab, setActiveTab] = useState<"images" | "groups" | "tags">("images");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(null), 4000); return () => clearTimeout(t); } }, [success]);
  useEffect(() => { if (error) { const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t); } }, [error]);

  /* ── Data ── */
  const [groups, setGroups] = useState<TagGroup[]>([]);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, iRes] = await Promise.all([
        fetch(`/api/erp-auth/projects/${projectId}/gallery/tag-groups`),
        fetch(`/api/erp-auth/projects/${projectId}/gallery/images`),
      ]);
      const gData = await gRes.json();
      const iData = await iRes.json();
      setGroups(gData.groups || []);
      setImages(iData.images || []);
    } catch { setError("فشل تحميل البيانات"); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Filter state ── */
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const toggleFilter = (groupId: string, tagId: string, allowMultiple: boolean) => {
    setActiveFilters(prev => {
      const current = prev[groupId] || [];
      if (current.includes(tagId)) return { ...prev, [groupId]: current.filter(t => t !== tagId) };
      return { ...prev, [groupId]: allowMultiple ? [...current, tagId] : [tagId] };
    });
  };

  const filteredImages = images.filter(img => {
    const imgTagIds = img.gallery_image_tags.map(t => t.gallery_tags.id);
    for (const [, tagIds] of Object.entries(activeFilters)) {
      if (tagIds.length === 0) continue;
      if (!tagIds.some(tid => imgTagIds.includes(tid))) return false;
    }
    return true;
  });

  /* ── Upload dialog ── */
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadTagIds, setUploadTagIds] = useState<Record<string, string[]>>({});
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const openUpload = () => { setUploadFile(null); setUploadTitle(""); setUploadTagIds({}); setUploadOpen(true); };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setUploadFile(f);
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("title", uploadTitle);
      Object.values(uploadTagIds).flat().forEach(tid => fd.append("tagIds", tid));
      const res = await fetch(`/api/erp-auth/projects/${projectId}/gallery/upload`, { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم رفع الصورة بنجاح");
      setUploadOpen(false);
      fetchAll();
    } catch { setError("فشل رفع الصورة"); }
    finally { setUploading(false); }
  };

  /* ── Delete image ── */
  const [deleteImageTarget, setDeleteImageTarget] = useState<GalleryImage | null>(null);
  const [deletingImage, setDeletingImage] = useState(false);

  const handleDeleteImage = async () => {
    if (!deleteImageTarget) return;
    setDeletingImage(true); setError(null);
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}/gallery/images/${deleteImageTarget.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم حذف الصورة"); setDeleteImageTarget(null); fetchAll();
    } catch { setError("فشل الحذف"); }
    finally { setDeletingImage(false); }
  };

  /* ── Group CRUD ── */
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupMode, setGroupMode] = useState<"add" | "edit">("add");
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState({ name: "", allow_multiple: false });
  const [savingGroup, setSavingGroup] = useState(false);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<TagGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState(false);

  const openAddGroup = () => { setGroupMode("add"); setEditGroupId(null); setGroupForm({ name: "", allow_multiple: false }); setGroupDialogOpen(true); };
  const openEditGroup = (g: TagGroup) => { setGroupMode("edit"); setEditGroupId(g.id); setGroupForm({ name: g.name, allow_multiple: g.allow_multiple }); setGroupDialogOpen(true); };

  const handleSaveGroup = async () => {
    setSavingGroup(true); setError(null);
    try {
      const url = groupMode === "add" ? `/api/erp-auth/projects/${projectId}/gallery/tag-groups` : `/api/erp-auth/projects/${projectId}/gallery/tag-groups/${editGroupId}`;
      const method = groupMode === "add" ? "POST" : "PATCH";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(groupForm) });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess(groupMode === "add" ? "تم إضافة المجموعة" : "تم تعديل المجموعة");
      setGroupDialogOpen(false); fetchAll();
    } catch { setError("فشل الحفظ"); }
    finally { setSavingGroup(false); }
  };

  const handleDeleteGroup = async () => {
    if (!deleteGroupTarget) return;
    setDeletingGroup(true); setError(null);
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}/gallery/tag-groups/${deleteGroupTarget.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم حذف المجموعة"); setDeleteGroupTarget(null); fetchAll();
    } catch { setError("فشل الحذف"); }
    finally { setDeletingGroup(false); }
  };

  /* ── Tag CRUD ── */
  const allTags: Tag[] = groups.flatMap(g => g.gallery_tags);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagMode, setTagMode] = useState<"add" | "edit">("add");
  const [editTagId, setEditTagId] = useState<string | null>(null);
  const [tagForm, setTagForm] = useState({ name: "", group_id: "" });
  const [savingTag, setSavingTag] = useState(false);
  const [deleteTagTarget, setDeleteTagTarget] = useState<Tag | null>(null);
  const [deletingTag, setDeletingTag] = useState(false);

  const openAddTag = () => { setTagMode("add"); setEditTagId(null); setTagForm({ name: "", group_id: "" }); setTagDialogOpen(true); };
  const openEditTag = (t: Tag) => { setTagMode("edit"); setEditTagId(t.id); setTagForm({ name: t.name, group_id: t.group_id }); setTagDialogOpen(true); };

  const handleSaveTag = async () => {
    setSavingTag(true); setError(null);
    try {
      const url = tagMode === "add" ? `/api/erp-auth/projects/${projectId}/gallery/tags` : `/api/erp-auth/projects/${projectId}/gallery/tags/${editTagId}`;
      const method = tagMode === "add" ? "POST" : "PATCH";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(tagForm) });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess(tagMode === "add" ? "تم إضافة التاج" : "تم تعديل التاج");
      setTagDialogOpen(false); fetchAll();
    } catch { setError("فشل الحفظ"); }
    finally { setSavingTag(false); }
  };

  const handleDeleteTag = async () => {
    if (!deleteTagTarget) return;
    setDeletingTag(true); setError(null);
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}/gallery/tags/${deleteTagTarget.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم حذف التاج"); setDeleteTagTarget(null); fetchAll();
    } catch { setError("فشل الحذف"); }
    finally { setDeletingTag(false); }
  };

  /* ── Lightbox ── */
  const [lightboxImg, setLightboxImg] = useState<GalleryImage | null>(null);

  /* ── Selection ── */
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exitSelection = () => { setSelectionMode(false); setSelectedIds(new Set()); };

  const handleShare = async () => {
    const selected = filteredImages.filter(img => selectedIds.has(img.id));
    if (!selected.length) return;
    setSharing(true);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const urls = selected.map(img => img.url).join("\n");
    try {
      if (isMobile && typeof navigator.share === "function") {
        // Try file sharing first (needs HTTPS / production)
        try {
          const files = await Promise.all(
            selected.map(async (img, i) => {
              const res = await fetch(`/api/erp-auth/projects/${projectId}/gallery/images/${img.id}/proxy`);
              if (!res.ok) throw new Error("proxy failed");
              const blob = await res.blob();
              const ext = img.url.split(".").pop()?.split("?")[0] || "jpg";
              return new File([blob], `sanad-marble-${i + 1}.${ext}`, { type: blob.type });
            })
          );
          if (navigator.canShare?.({ files })) {
            await navigator.share({ files, title: "صور من سند للرخام" });
            return;
          }
        } catch { /* fall through to text share */ }
        // Fallback: share URLs as text via native sheet (works on HTTP too)
        await navigator.share({ text: urls, title: "صور من سند للرخام" });
      } else {
        // Desktop: copy to clipboard
        await navigator.clipboard.writeText(urls);
        setSuccess(`تم نسخ روابط ${selected.length} صورة`);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") setError(e.message || "فشلت المشاركة");
    } finally { setSharing(false); }
  };

  /* ── Edit image ── */
  const [editImgTarget, setEditImgTarget] = useState<GalleryImage | null>(null);
  const [editImgTitle, setEditImgTitle] = useState("");
  const [editImgTagIds, setEditImgTagIds] = useState<Record<string, string[]>>({});
  const [savingEditImg, setSavingEditImg] = useState(false);

  const openEditImage = (img: GalleryImage) => {
    // Build initial tag selection keyed by group
    const byGroup: Record<string, string[]> = {};
    img.gallery_image_tags.forEach(({ gallery_tags: t }) => {
      const group = groups.find(g => g.gallery_tags.some(gt => gt.id === t.id));
      if (group) {
        byGroup[group.id] = [...(byGroup[group.id] || []), t.id];
      }
    });
    setEditImgTitle(img.title || "");
    setEditImgTagIds(byGroup);
    setEditImgTarget(img);
  };

  const handleSaveEditImg = async () => {
    if (!editImgTarget) return;
    setSavingEditImg(true); setError(null);
    try {
      const tagIds = Object.values(editImgTagIds).flat();
      const res = await fetch(
        `/api/erp-auth/projects/${projectId}/gallery/images/${editImgTarget.id}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: editImgTitle, tagIds }) }
      );
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم حفظ التعديلات"); setEditImgTarget(null); fetchAll();
    } catch { setError("فشل الحفظ"); }
    finally { setSavingEditImg(false); }
  };

  /* ─────────────────────────────────────────────────────── Render ─── */
  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>معرض الصور</h1>
            <p style={{ fontSize: "14px", color: "#64748b", margin: 0, fontFamily: "var(--font-cairo)" }}>إدارة صور المشروع وتصنيفها بالتاجات</p>
          </div>
          {activeTab === "images" && (
            <>
              <Button variant="outlined" onClick={() => { if (selectionMode) exitSelection(); else setSelectionMode(true); }}
                sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none",
                  whiteSpace: "nowrap",
                  ...(selectionMode
                    ? { borderColor: "rgba(239,68,68,0.5)", color: "#f87171", background: "rgba(239,68,68,0.07)" }
                    : { borderColor: "rgba(148,163,184,0.3)", color: "#94a3b8" })
                }}>
                {selectionMode ? `إلغاء (تم تحديد ${selectedIds.size})` : "تحديد"}
              </Button>
              <Button variant="contained" startIcon={<CloudUploadOutlined />} onClick={openUpload}
                sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", whiteSpace: "nowrap" }}>
                رفع صورة
              </Button>
            </>
          )}
          {activeTab === "groups" && (
            <Button variant="contained" startIcon={<AddOutlined />} onClick={openAddGroup}
              sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", whiteSpace: "nowrap" }}>
              إضافة مجموعة
            </Button>
          )}
          {activeTab === "tags" && (
            <Button variant="contained" startIcon={<AddOutlined />} onClick={openAddTag}
              sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", whiteSpace: "nowrap" }}>
              إضافة تاج
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {(["images", "groups", "tags"] as const).map((tab) => (
            <Button key={tab} variant={activeTab === tab ? "contained" : "outlined"} onClick={() => setActiveTab(tab)}
              sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", whiteSpace: "nowrap", flex: "0 0 auto", ...(activeTab === tab ? { background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" } : { borderColor: "rgba(148,163,184,0.3)", color: "#e2e8f0" }) }}>
              {tab === "images" ? `الصور (${images.length})` : tab === "groups" ? `مجموعات التاجات (${groups.length})` : `التاجات (${allTags.length})`}
            </Button>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontFamily: "var(--font-cairo)", direction: "rtl", textAlign: "right" }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#86efac", fontFamily: "var(--font-cairo)", direction: "rtl", textAlign: "right" }}>{success}</Alert>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}><CircularProgress sx={{ color: "#3b82f6" }} /></div>
      ) : (
        <>
          {/* ─── Images Tab ─── */}
          {activeTab === "images" && (
            <div>
              {/* Tag filter chips */}
              {groups.length > 0 && (
                <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#94a3b8", fontSize: "13px", fontFamily: "var(--font-cairo)" }}>
                    <FilterListOutlined sx={{ fontSize: 16 }} /> تصفية حسب
                  </div>
                  {groups.map(g => (
                    <div key={g.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {g.name} {g.allow_multiple ? "(متعدد)" : "(واحد)"}
                      </span>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {g.gallery_tags.map(tag => {
                          const active = (activeFilters[g.id] || []).includes(tag.id);
                          return (
                            <Chip key={tag.id} label={tag.name} onClick={() => toggleFilter(g.id, tag.id, g.allow_multiple)}
                              sx={{
                                fontFamily: "var(--font-cairo)", fontSize: "12px", height: "28px", cursor: "pointer",
                                background: active ? "linear-gradient(135deg, #3b82f6, #8b5cf6)" : "rgba(30,41,59,0.8)",
                                color: active ? "#fff" : "#94a3b8",
                                border: active ? "none" : "1px solid rgba(148,163,184,0.15)",
                                "&:hover": { background: active ? "linear-gradient(135deg, #2563eb, #7c3aed)" : "rgba(59,130,246,0.1)" },
                              }}
                            />
                          );
                        })}
                        {(activeFilters[g.id] || []).length > 0 && (
                          <Chip label="مسح" size="small" onClick={() => setActiveFilters(p => ({ ...p, [g.id]: [] }))}
                            sx={{ fontFamily: "var(--font-cairo)", fontSize: "11px", height: "28px", background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer" }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Image grid */}
              {filteredImages.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 24px", borderRadius: "20px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
                  <p style={{ fontSize: "48px", margin: "0 0 12px" }}>🖼️</p>
                  <p style={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "16px", margin: 0 }}>
                    {images.length === 0 ? "لا توجد صور بعد، ارفع أول صورة!" : "لا توجد صور تطابق الفلتر المحدد"}
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
                  {filteredImages.map(img => {
                    const tags = img.gallery_image_tags.map(t => t.gallery_tags);
                    return (
                      <div key={img.id} style={{ borderRadius: "16px", overflow: "hidden", position: "relative", background: "rgba(30,41,59,0.5)", border: selectedIds.has(img.id) ? "2px solid #3b82f6" : "1px solid rgba(148,163,184,0.08)", cursor: "pointer", transition: "border-color 0.2s" }}
                        onClick={() => selectionMode ? toggleSelection(img.id) : setLightboxImg(img)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.thumbnail_url || img.url} alt={img.title || ""} loading="lazy" decoding="async"
                          style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block", transition: "transform 0.3s ease", opacity: selectionMode && !selectedIds.has(img.id) ? 0.6 : 1 }}
                          onMouseEnter={e => { if (!selectionMode) e.currentTarget.style.transform = "scale(1.03)"; }}
                          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")} />
                        {/* Selection checkmark overlay */}
                        {selectionMode && (
                          <div style={{ position: "absolute", top: "6px", right: "6px", pointerEvents: "none" }}>
                            {selectedIds.has(img.id)
                              ? <CheckCircleRounded sx={{ fontSize: 22, color: "#3b82f6", filter: "drop-shadow(0 0 4px rgba(0,0,0,0.8))" }} />
                              : <CheckCircleOutlined sx={{ fontSize: 22, color: "rgba(255,255,255,0.5)", filter: "drop-shadow(0 0 4px rgba(0,0,0,0.8))" }} />}
                          </div>
                        )}
                        <div style={{ padding: "8px 10px" }}>
                          {img.title && <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#e2e8f0", fontFamily: "var(--font-cairo)", fontWeight: 600 }}>{img.title}</p>}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                            {tags.map(t => (
                              <Chip key={t.id} label={t.name} size="small"
                                sx={{ fontFamily: "var(--font-cairo)", fontSize: "10px", height: "18px", background: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.2)" }} />
                            ))}
                          </div>
                        </div>
                        {/* Action buttons: edit + delete */}
                        <div style={{ position: "absolute", top: "6px", left: "6px", display: "flex", gap: "3px" }}
                          onClick={e => e.stopPropagation()}>
                          <Tooltip title="تعديل" placement="bottom">
                            <IconButton size="small" onClick={() => openEditImage(img)}
                              sx={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(6px)", color: "#f59e0b", "&:hover": { background: "rgba(245,158,11,0.2)" }, padding: "3px" }}>
                              <EditOutlined sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف" placement="bottom">
                            <IconButton size="small" onClick={() => setDeleteImageTarget(img)}
                              sx={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(6px)", color: "#f87171", "&:hover": { background: "rgba(239,68,68,0.2)" }, padding: "3px" }}>
                              <DeleteOutline sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── Groups Tab ─── */}
          {activeTab === "groups" && (
            groups.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 24px", borderRadius: "20px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
                <p style={{ fontSize: "48px", margin: "0 0 12px" }}>🏷️</p>
                <p style={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "16px" }}>لا توجد مجموعات تاجات بعد</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {groups.map(g => (
                  <div key={g.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "16px", borderRadius: "14px", background: "rgba(30,41,59,0.5)", border: "1px solid rgba(148,163,184,0.08)" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 600, color: "#e2e8f0", fontFamily: "var(--font-cairo)" }}>{g.name}</p>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "11px", color: g.allow_multiple ? "#34d399" : "#f59e0b", fontFamily: "var(--font-cairo)", background: g.allow_multiple ? "rgba(52,211,153,0.1)" : "rgba(245,158,11,0.1)", borderRadius: "6px", padding: "2px 8px" }}>
                          {g.allow_multiple ? "اختيار متعدد" : "اختيار واحد"}
                        </span>
                        <span style={{ fontSize: "12px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>{g.gallery_tags.length} تاج</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                      <IconButton size="small" onClick={() => openEditGroup(g)} sx={{ color: "#f59e0b", "&:hover": { background: "rgba(245,158,11,0.1)" } }}><EditOutlined sx={{ fontSize: 16 }} /></IconButton>
                      <IconButton size="small" onClick={() => setDeleteGroupTarget(g)} sx={{ color: "#64748b", "&:hover": { color: "#f87171", background: "rgba(248,113,113,0.1)" } }}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ─── Tags Tab ─── */}
          {activeTab === "tags" && (
            allTags.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 24px", borderRadius: "20px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
                <p style={{ fontSize: "48px", margin: "0 0 12px" }}>🔖</p>
                <p style={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "16px" }}>لا توجد تاجات بعد</p>
              </div>
            ) : (
              <div>
                {groups.map(g => g.gallery_tags.length > 0 && (
                  <div key={g.id} style={{ marginBottom: "20px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#60a5fa", fontFamily: "var(--font-cairo)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{g.name}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {g.gallery_tags.map(t => (
                        <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "12px 16px", borderRadius: "12px", background: "rgba(30,41,59,0.5)", border: "1px solid rgba(148,163,184,0.08)" }}>
                          <p style={{ margin: 0, fontSize: "14px", color: "#e2e8f0", fontFamily: "var(--font-cairo)", fontWeight: 500 }}>{t.name}</p>
                          <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                            <IconButton size="small" onClick={() => openEditTag(t)} sx={{ color: "#f59e0b", "&:hover": { background: "rgba(245,158,11,0.1)" } }}><EditOutlined sx={{ fontSize: 16 }} /></IconButton>
                            <IconButton size="small" onClick={() => setDeleteTagTarget(t)} sx={{ color: "#64748b", "&:hover": { color: "#f87171", background: "rgba(248,113,113,0.1)" } }}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* ─────── Upload Dialog ─────── */}
      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          رفع صورة جديدة
          <IconButton onClick={() => setUploadOpen(false)} sx={{ color: "#64748b" }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 3, pt: "8px !important" }}>
          {/* File drop zone */}
          <div onDrop={handleFileDrop} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
            onClick={() => fileRef.current?.click()}
            style={{ border: `2px dashed ${dragOver ? "#3b82f6" : "rgba(148,163,184,0.2)"}`, borderRadius: "16px", padding: "32px", textAlign: "center", cursor: "pointer", transition: "all 0.2s", background: dragOver ? "rgba(59,130,246,0.05)" : "transparent" }}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setUploadFile(e.target.files?.[0] || null)} />
            {uploadFile ? (
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(uploadFile)} alt="" style={{ maxHeight: "160px", maxWidth: "100%", borderRadius: "10px", marginBottom: "8px" }} />
                <p style={{ color: "#60a5fa", fontFamily: "var(--font-cairo)", fontSize: "13px", margin: 0 }}>{uploadFile.name}</p>
              </div>
            ) : (
              <div>
                <ImageOutlined sx={{ fontSize: 40, color: "#475569", mb: 1 }} />
                <p style={{ color: "#64748b", fontFamily: "var(--font-cairo)", fontSize: "14px", margin: 0 }}>اسحب الصورة هنا أو انقر للاختيار</p>
                <p style={{ color: "#334155", fontFamily: "var(--font-cairo)", fontSize: "12px", margin: "4px 0 0" }}>JPG, PNG, WebP, GIF — حد أقصى 20MB</p>
              </div>
            )}
          </div>

          <TextField label="عنوان الصورة (اختياري)" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} fullWidth sx={fieldSx} />

          {/* Tag selectors per group */}
          {groups.map(g => (
            <div key={g.id}>
              <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>
                {g.name} {g.allow_multiple ? "(يمكن اختيار أكثر من واحد)" : "(اختر واحداً فقط)"}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {g.gallery_tags.map(tag => {
                  const selected = (uploadTagIds[g.id] || []).includes(tag.id);
                  return (
                    <Chip key={tag.id} label={tag.name} onClick={() => {
                      setUploadTagIds(prev => {
                        const curr = prev[g.id] || [];
                        if (selected) return { ...prev, [g.id]: curr.filter(t => t !== tag.id) };
                        return { ...prev, [g.id]: g.allow_multiple ? [...curr, tag.id] : [tag.id] };
                      });
                    }}
                      sx={{ fontFamily: "var(--font-cairo)", fontSize: "12px", height: "30px", cursor: "pointer", background: selected ? "linear-gradient(135deg, #3b82f6, #8b5cf6)" : "rgba(30,41,59,0.8)", color: selected ? "#fff" : "#94a3b8", border: selected ? "none" : "1px solid rgba(148,163,184,0.15)" }} />
                  );
                })}
              </div>
            </div>
          ))}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setUploadOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleUpload} disabled={uploading || !uploadFile} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
            {uploading ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "رفع الصورة"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─────── Group Dialog ─────── */}
      <Dialog open={groupDialogOpen} onClose={() => setGroupDialogOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>{groupMode === "add" ? "إضافة مجموعة تاجات" : "تعديل المجموعة"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 3, pt: "8px !important" }}>
          <TextField label="اسم المجموعة *" value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} fullWidth sx={fieldSx} />
          <FormControlLabel control={
            <Switch checked={groupForm.allow_multiple} onChange={e => setGroupForm({ ...groupForm, allow_multiple: e.target.checked })}
              sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#3b82f6" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#3b82f6" } }} />
          } label={<span style={{ fontFamily: "var(--font-cairo)", color: "#e2e8f0", fontSize: "14px" }}>السماح باختيار أكثر من تاج من هذه المجموعة</span>} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setGroupDialogOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleSaveGroup} disabled={savingGroup || !groupForm.name} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
            {savingGroup ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حفظ"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─────── Tag Dialog ─────── */}
      <Dialog open={tagDialogOpen} onClose={() => setTagDialogOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>{tagMode === "add" ? "إضافة تاج" : "تعديل التاج"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 3, pt: "8px !important" }}>
          <FormControl fullWidth required sx={fieldSx}>
            <InputLabel>المجموعة *</InputLabel>
            <Select value={tagForm.group_id} onChange={e => setTagForm({ ...tagForm, group_id: e.target.value })} label="المجموعة *" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              {groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="اسم التاج *" value={tagForm.name} onChange={e => setTagForm({ ...tagForm, name: e.target.value })} fullWidth sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setTagDialogOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleSaveTag} disabled={savingTag || !tagForm.name || !tagForm.group_id} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
            {savingTag ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حفظ"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─────── Delete Image Confirm ─────── */}
      <Dialog open={!!deleteImageTarget} onClose={() => setDeleteImageTarget(null)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#f87171" }}>تأكيد الحذف</DialogTitle>
        <DialogContent><p style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", fontSize: "15px", margin: 0 }}>هل تريد حذف هذه الصورة نهائياً من المعرض والتخزين السحابي؟</p></DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteImageTarget(null)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleDeleteImage} disabled={deletingImage} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "#dc2626", "&:hover": { background: "#b91c1c" } }}>
            {deletingImage ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حذف"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─────── Delete Group Confirm ─────── */}
      <Dialog open={!!deleteGroupTarget} onClose={() => setDeleteGroupTarget(null)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#f87171" }}>حذف المجموعة</DialogTitle>
        <DialogContent><p style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", fontSize: "15px", margin: 0 }}>حذف <strong style={{ color: "#e2e8f0" }}>{deleteGroupTarget?.name}</strong> سيحذف جميع التاجات المرتبطة بها. هل أنت متأكد؟</p></DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteGroupTarget(null)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleDeleteGroup} disabled={deletingGroup} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "#dc2626", "&:hover": { background: "#b91c1c" } }}>
            {deletingGroup ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حذف"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─────── Delete Tag Confirm ─────── */}
      <Dialog open={!!deleteTagTarget} onClose={() => setDeleteTagTarget(null)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#f87171" }}>حذف التاج</DialogTitle>
        <DialogContent><p style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", fontSize: "15px", margin: 0 }}>هل تريد حذف تاج <strong style={{ color: "#e2e8f0" }}>{deleteTagTarget?.name}</strong>؟</p></DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteTagTarget(null)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleDeleteTag} disabled={deletingTag} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "#dc2626", "&:hover": { background: "#b91c1c" } }}>
            {deletingTag ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حذف"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─────── Edit Image Dialog ─────── */}
      <Dialog open={!!editImgTarget} onClose={() => setEditImgTarget(null)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          تعديل الصورة
          <IconButton onClick={() => setEditImgTarget(null)} sx={{ color: "#64748b" }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 3, pt: "8px !important" }}>
          {/* Preview */}
          {editImgTarget && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={editImgTarget.thumbnail_url || editImgTarget.url} alt="" style={{ width: "100%", maxHeight: "160px", objectFit: "contain", borderRadius: "10px", background: "rgba(15,23,42,0.4)" }} />
          )}
          <TextField label="عنوان الصورة" value={editImgTitle} onChange={e => setEditImgTitle(e.target.value)} fullWidth sx={fieldSx} />
          {/* Tag selectors */}
          {groups.map(g => (
            <div key={g.id}>
              <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>
                {g.name} {g.allow_multiple ? "(متعدد)" : "(واحد)"}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {g.gallery_tags.map(tag => {
                  const selected = (editImgTagIds[g.id] || []).includes(tag.id);
                  return (
                    <Chip key={tag.id} label={tag.name} onClick={() => {
                      setEditImgTagIds(prev => {
                        const curr = prev[g.id] || [];
                        if (selected) return { ...prev, [g.id]: curr.filter(t => t !== tag.id) };
                        return { ...prev, [g.id]: g.allow_multiple ? [...curr, tag.id] : [tag.id] };
                      });
                    }}
                      sx={{ fontFamily: "var(--font-cairo)", fontSize: "12px", height: "30px", cursor: "pointer", background: selected ? "linear-gradient(135deg, #3b82f6, #8b5cf6)" : "rgba(30,41,59,0.8)", color: selected ? "#fff" : "#94a3b8", border: selected ? "none" : "1px solid rgba(148,163,184,0.15)" }} />
                  );
                })}
              </div>
            </div>
          ))}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setEditImgTarget(null)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleSaveEditImg} disabled={savingEditImg} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
            {savingEditImg ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حفظ التعديلات"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─────── Lightbox ─────── */}
      {lightboxImg && (
        <div onClick={() => setLightboxImg(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <IconButton onClick={() => setLightboxImg(null)} sx={{ position: "absolute", top: 16, right: 16, color: "#e2e8f0", background: "rgba(30,41,59,0.7)" }}><CloseOutlined /></IconButton>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxImg.url} alt={lightboxImg.title || ""} onClick={e => e.stopPropagation()}
            style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: "12px" }} />
          {lightboxImg.title && (
            <p style={{ position: "absolute", bottom: 24, color: "#e2e8f0", fontFamily: "var(--font-cairo)", fontSize: "16px", background: "rgba(0,0,0,0.6)", padding: "6px 16px", borderRadius: "8px" }}>
              {lightboxImg.title}
            </p>
          )}
        </div>
      )}

      {/* ─────── Floating Share Bar ─────── */}
      {selectionMode && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1200,
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          borderTop: "1px solid rgba(148,163,184,0.15)",
          backdropFilter: "blur(20px)",
          padding: "14px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", fontSize: "14px" }}>
              تم تحديد
            </span>
            <span style={{
              fontFamily: "var(--font-cairo)", color: "#f1f5f9", fontSize: "18px", fontWeight: 700,
              background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)",
              borderRadius: "10px", padding: "2px 12px",
            }}>
              {selectedIds.size}
            </span>
            <span style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", fontSize: "14px" }}>صورة</span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="outlined" onClick={exitSelection}
              sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontSize: "13px", textTransform: "none", borderColor: "rgba(148,163,184,0.3)", color: "#94a3b8" }}>
              إلغاء
            </Button>
            <Button variant="contained" startIcon={sharing ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <ShareOutlined />}
              disabled={selectedIds.size === 0 || sharing}
              onClick={handleShare}
              sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "13px", textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)", minWidth: "120px" }}>
              {sharing ? "جاري التحميل..." : `مشاركة ${selectedIds.size > 0 ? `(${selectedIds.size})` : ""}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
