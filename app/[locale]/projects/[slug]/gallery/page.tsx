"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Chip, CircularProgress } from "@mui/material";
import { FilterListOutlined, CloseOutlined } from "@mui/icons-material";
import Link from "next/link";

interface Tag { id: string; name: string; }
interface TagGroup { id: string; name: string; allow_multiple: boolean; gallery_tags: Tag[]; }
interface GalleryImage {
  id: string; url: string; thumbnail_url: string | null; title: string | null; created_at: string;
  gallery_image_tags: { gallery_tags: { id: string; name: string; gallery_tag_groups: { id: string; name: string } } }[];
}

export default function PublicGalleryPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [groups, setGroups] = useState<TagGroup[]>([]);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [lightboxImg, setLightboxImg] = useState<GalleryImage | null>(null);

  const fetchGallery = useCallback(async () => {
    setLoading(true);
    try {
      const tagParams = Object.values(activeFilters).flat().map(t => `tag=${t}`).join("&");
      const url = `/api/gallery/${slug}${tagParams ? `?${tagParams}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      setGroups(data.groups || []);
      setImages(data.images || []);
    } catch {/* ignore */}
    finally { setLoading(false); }
  }, [slug, activeFilters]);

  useEffect(() => { fetchGallery(); }, [fetchGallery]);

  const toggleFilter = (groupId: string, tagId: string, allowMultiple: boolean) => {
    setActiveFilters(prev => {
      const current = prev[groupId] || [];
      if (current.includes(tagId)) return { ...prev, [groupId]: current.filter(t => t !== tagId) };
      return { ...prev, [groupId]: allowMultiple ? [...current, tagId] : [tagId] };
    });
  };

  const hasFilters = Object.values(activeFilters).some(v => v.length > 0);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #0a0f1e 100%)" }}>
      {/* Hero */}
      <div style={{ padding: "clamp(40px, 8vw, 80px) clamp(16px, 5vw, 64px) 0", textAlign: "center", maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "99px", padding: "4px 14px", marginBottom: "20px" }}>
          <span style={{ fontSize: "12px", color: "#60a5fa", fontFamily: "var(--font-cairo)" }}>معرض صور سند للرخام</span>
        </div>
        <h1 style={{ fontSize: "clamp(28px, 6vw, 52px)", fontWeight: 800, color: "#f1f5f9", margin: "0 0 16px", fontFamily: "var(--font-cairo)", lineHeight: 1.2 }}>
          معرض صورنا
        </h1>
        <p style={{ fontSize: "clamp(14px, 2.5vw, 18px)", color: "#94a3b8", margin: "0 0 40px", fontFamily: "var(--font-cairo)", lineHeight: 1.7 }}>
          تصفّح مجموعتنا المتنوعة من الرخام والجرانيت بأنواعه ومصادره المختلفة
        </p>
      </div>

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 clamp(16px, 4vw, 48px) 80px" }}>
        {/* Filter Panel */}
        {groups.length > 0 && (
          <div style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(20px)", border: "1px solid rgba(148,163,184,0.08)", borderRadius: "20px", padding: "20px 24px", marginBottom: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#94a3b8", fontSize: "14px", fontFamily: "var(--font-cairo)" }}>
                <FilterListOutlined sx={{ fontSize: 18 }} />
                <span>تصفية حسب</span>
              </div>
              {hasFilters && (
                <button onClick={() => setActiveFilters({})}
                  style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", color: "#f87171", padding: "4px 12px", fontSize: "12px", fontFamily: "var(--font-cairo)", cursor: "pointer" }}>
                  <CloseOutlined sx={{ fontSize: 14 }} /> مسح الكل
                </button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {groups.map(g => (
                <div key={g.id} style={{ display: "flex", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontFamily: "var(--font-cairo)", fontWeight: 700, whiteSpace: "nowrap", paddingTop: "4px", minWidth: "60px" }}>{g.name}</span>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {g.gallery_tags.map(tag => {
                      const active = (activeFilters[g.id] || []).includes(tag.id);
                      return (
                        <Chip key={tag.id} label={tag.name} onClick={() => toggleFilter(g.id, tag.id, g.allow_multiple)}
                          sx={{
                            fontFamily: "var(--font-cairo)", fontSize: "13px", height: "32px", cursor: "pointer",
                            background: active ? "linear-gradient(135deg, #3b82f6, #8b5cf6)" : "rgba(30,41,59,0.8)",
                            color: active ? "#fff" : "#94a3b8",
                            border: active ? "none" : "1px solid rgba(148,163,184,0.12)",
                            transition: "all 0.2s",
                            "&:hover": { background: active ? "linear-gradient(135deg, #2563eb, #7c3aed)" : "rgba(59,130,246,0.1)", color: active ? "#fff" : "#e2e8f0" },
                          }} />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image count */}
        {!loading && (
          <p style={{ textAlign: "center", color: "#475569", fontFamily: "var(--font-cairo)", fontSize: "13px", marginBottom: "24px" }}>
            {images.length === 0 ? "لا توجد نتائج" : `${images.length} صورة`}
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}><CircularProgress sx={{ color: "#3b82f6" }} /></div>
        ) : images.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px", borderRadius: "24px", background: "rgba(15,23,42,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
            <p style={{ fontSize: "52px", margin: "0 0 16px" }}>🖼️</p>
            <p style={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "16px" }}>لا توجد صور تطابق الفلتر المحدد</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
            {images.map(img => {
              const tags = img.gallery_image_tags.map(t => t.gallery_tags);
              return (
                <div key={img.id} onClick={() => setLightboxImg(img)}
                  style={{ borderRadius: "20px", overflow: "hidden", cursor: "zoom-in", border: "1px solid rgba(148,163,184,0.06)", position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.thumbnail_url || img.url} alt={img.title || ""} loading="lazy" style={{ width: "100%", display: "block", transition: "transform 0.4s ease" }}
                    onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
                    onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")} />
                  {(img.title || tags.length > 0) && (
                    <div style={{ padding: "10px 12px", background: "rgba(8,12,24,0.85)", backdropFilter: "blur(8px)" }}>
                      {img.title && <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#e2e8f0", fontFamily: "var(--font-cairo)", fontWeight: 600 }}>{img.title}</p>}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {tags.map(t => (
                          <Chip key={t.id} label={t.name} size="small"
                            sx={{ fontFamily: "var(--font-cairo)", fontSize: "10px", height: "20px", background: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.2)" }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Back link */}
        <div style={{ textAlign: "center", marginTop: "48px" }}>
          <Link href="/" style={{ color: "#475569", fontFamily: "var(--font-cairo)", fontSize: "13px", textDecoration: "none" }}>
            ← العودة للرئيسية
          </Link>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div onClick={() => setLightboxImg(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <button onClick={() => setLightboxImg(null)}
            style={{ position: "absolute", top: 20, right: 20, background: "rgba(30,41,59,0.8)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#e2e8f0" }}>
            <CloseOutlined sx={{ fontSize: 20 }} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxImg.url} alt={lightboxImg.title || ""} onClick={e => e.stopPropagation()}
            style={{ maxWidth: "92vw", maxHeight: "90vh", objectFit: "contain", borderRadius: "12px", boxShadow: "0 25px 80px rgba(0,0,0,0.8)" }} />
          {(lightboxImg.title || lightboxImg.gallery_image_tags.length > 0) && (
            <div style={{ position: "absolute", bottom: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}
              onClick={e => e.stopPropagation()}>
              {lightboxImg.title && (
                <p style={{ color: "#f1f5f9", fontFamily: "var(--font-cairo)", fontSize: "16px", fontWeight: 600, background: "rgba(0,0,0,0.7)", padding: "6px 20px", borderRadius: "10px", margin: 0 }}>
                  {lightboxImg.title}
                </p>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "center" }}>
                {lightboxImg.gallery_image_tags.map(t => (
                  <Chip key={t.gallery_tags.id} label={t.gallery_tags.name} size="small"
                    sx={{ fontFamily: "var(--font-cairo)", fontSize: "11px", height: "22px", background: "rgba(59,130,246,0.2)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.3)" }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
