"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/navigation";
import { MarbleCategory } from "@/types/marble";
import { motion } from "framer-motion";
import {
  Button,
  TextField,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Divider,
} from "@mui/material";
import { ArrowBackOutlined, SaveOutlined, AddCircleOutline, DeleteOutline, CloudUploadOutlined } from "@mui/icons-material";

const fsx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    backgroundColor: "#f9f9f7",
    fontFamily: "var(--font-cairo), Cairo, sans-serif",
    fontSize: 14,
    "& fieldset": { borderColor: "#e5e3dc" },
    "&:hover fieldset": { borderColor: "#154278" },
    "&.Mui-focused fieldset": { borderColor: "#154278", borderWidth: 2 },
  },
  "& .MuiInputLabel-root": {
    fontFamily: "var(--font-cairo), Cairo, sans-serif",
    fontSize: 14,
    color: "#6b7280",
    "&.Mui-focused": { color: "#154278" },
  },
  "& .MuiInputBase-input": { textAlign: "right" },
};

export default function AddProductPage() {
  const router = useRouter();
  const supabase = createClient();

  const [categories, setCategories] = useState<MarbleCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("in_stock");

  // Dynamic Specs
  const [specs, setSpecs] = useState([{ keyAr: "", keyEn: "", valAr: "", valEn: "" }]);

  // Dynamic Features
  const [features, setFeatures] = useState([{ featAr: "", featEn: "", isPro: true }]);

  useEffect(() => {
    async function fetchCats() {
      const { data } = await supabase.from("marble_categories").select("*").order("name_ar");
      if (data) setCategories(data);
      setLoadingCats(false);
    }
    fetchCats();
  }, []);

  const handleAddSpec = () => {
    setSpecs([...specs, { keyAr: "", keyEn: "", valAr: "", valEn: "" }]);
  };

  const handleRemoveSpec = (index: number) => {
    setSpecs(specs.filter((_, i) => i !== index));
  };

  const handleSpecChange = (index: number, field: string, value: string) => {
    const newSpecs = [...specs];
    newSpecs[index] = { ...newSpecs[index], [field]: value };
    setSpecs(newSpecs);
  };

  const handleAddFeature = () => {
    setFeatures([...features, { featAr: "", featEn: "", isPro: true }]);
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleFeatureChange = (index: number, field: string, value: any) => {
    const newFeats = [...features];
    newFeats[index] = { ...newFeats[index], [field]: value };
    setFeatures(newFeats);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      alert("الرجاء اختيار القسم");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Insert Product
      const { data: prodData, error: prodErr } = await supabase
        .from("marble_products")
        .insert([{
          name_ar: nameAr,
          name_en: nameEn || nameAr,
          description_ar: descriptionAr,
          description_en: descriptionEn,
          category_id: categoryId,
          status: status
        }])
        .select()
        .single();

      if (prodErr) throw prodErr;
      const productId = prodData.id;

      // 2. Insert Specs
      const validSpecs = specs.filter(s => s.keyAr && s.valAr).map(s => ({
        product_id: productId,
        spec_key_ar: s.keyAr,
        spec_key_en: s.keyEn || s.keyAr,
        spec_value_ar: s.valAr,
        spec_value_en: s.valEn || s.valAr,
      }));
      if (validSpecs.length > 0) {
        const { error: specErr } = await supabase.from("marble_product_specs").insert(validSpecs);
        if (specErr) throw specErr;
      }

      // 3. Insert Features
      const validFeats = features.filter(f => f.featAr).map(f => ({
        product_id: productId,
        feature_ar: f.featAr,
        feature_en: f.featEn || f.featAr,
        is_pro: f.isPro,
      }));
      if (validFeats.length > 0) {
        const { error: featErr } = await supabase.from("marble_product_features").insert(validFeats);
        if (featErr) throw featErr;
      }

      router.push("/admin/marble/products");
    } catch (err: any) {
      alert("حدث خطأ أثناء الحفظ: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div dir="rtl" style={{ fontFamily: "var(--font-cairo), Cairo, sans-serif" }}>
      
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}
      >
        <div>
          <h1 style={{ fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 900, color: "#111827", margin: 0 }}>
            إضافة منتج جديد
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "5px 0 0" }}>
            أدخل التفاصيل والمواصفات الكاملة للمنتج لإضافته إلى الكتالوج.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/admin/marble/products")}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#fff",
            color: "#64748b", border: "1px solid #e5e3dc", borderRadius: 12,
            padding: "9px 18px", cursor: "pointer",
            fontSize: 14, fontWeight: 700,
            fontFamily: "var(--font-cairo), Cairo, sans-serif",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <ArrowBackOutlined sx={{ fontSize: 18 }} />
          العودة للمنتجات
        </motion.button>
      </motion.div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Info Column */}
          <motion.div 
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Basic Info Box */}
            <div style={{ background: "#fff", borderRadius: 20, padding: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, borderBottom: "1px solid #f0ede6", paddingBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(21,66,120,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#154278" }}>
                  <SaveOutlined sx={{ fontSize: 22 }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 }}>البيانات الأساسية</h2>
                  <p style={{ fontSize: 13, color: "#6b7280", margin: "2px 0 0" }}>الأسماء والوصف العام للمنتج</p>
                </div>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <TextField
                    label="الاسم (عربي) *"
                    variant="outlined"
                    fullWidth
                    required
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    sx={fsx}
                  />
                  <TextField
                    label="الاسم (إنجليزي)"
                    variant="outlined"
                    fullWidth
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    sx={{ ...fsx, "& .MuiInputBase-input": { direction: "ltr", textAlign: "left" } }}
                  />
                </div>

                <TextField
                  label="الوصف (عربي)"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={3}
                  value={descriptionAr}
                  onChange={(e) => setDescriptionAr(e.target.value)}
                  sx={fsx}
                />
                <TextField
                  label="الوصف (إنجليزي)"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={3}
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  sx={{ ...fsx, "& .MuiInputBase-input": { direction: "ltr", textAlign: "left" } }}
                />
              </div>
            </div>

            {/* Specifications Box */}
            <div style={{ background: "#fff", borderRadius: 20, padding: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, borderBottom: "1px solid #f0ede6", paddingBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(21,66,120,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#154278" }}>
                    <AddCircleOutline sx={{ fontSize: 22 }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 }}>المواصفات التقنية</h2>
                    <p style={{ fontSize: 13, color: "#6b7280", margin: "2px 0 0" }}>أضف خصائص مثل المنشأ، السماكة، اللون</p>
                  </div>
                </div>
                <Button 
                  onClick={handleAddSpec} 
                  startIcon={<AddCircleOutline />} 
                  sx={{ 
                    fontFamily: 'var(--font-cairo)', fontWeight: 700, color: '#154278', 
                    background: "rgba(21,66,120,0.08)", borderRadius: "10px", px: 2, py: 1
                  }}
                >
                  إضافة خاصية
                </Button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {specs.map((spec, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 12, alignItems: "center", background: "#fdfcfb", padding: 16, borderRadius: 12, border: "1px solid #f0ede6" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, flex: 1 }}>
                      <TextField size="small" label="الخاصية (عربي)" value={spec.keyAr} onChange={(e) => handleSpecChange(idx, 'keyAr', e.target.value)} placeholder="مثال: المنشأ" sx={fsx} />
                      <TextField size="small" label="الخاصية (إنجليزي)" value={spec.keyEn} onChange={(e) => handleSpecChange(idx, 'keyEn', e.target.value)} placeholder="e.g. Origin" sx={{ ...fsx, "& .MuiInputBase-input": { direction: "ltr", textAlign: "left" } }} />
                      <TextField size="small" label="القيمة (عربي)" value={spec.valAr} onChange={(e) => handleSpecChange(idx, 'valAr', e.target.value)} placeholder="مثال: إيطاليا" sx={fsx} />
                      <TextField size="small" label="القيمة (إنجليزي)" value={spec.valEn} onChange={(e) => handleSpecChange(idx, 'valEn', e.target.value)} placeholder="e.g. Italy" sx={{ ...fsx, "& .MuiInputBase-input": { direction: "ltr", textAlign: "left" } }} />
                    </div>
                    <IconButton onClick={() => handleRemoveSpec(idx)} sx={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", borderRadius: "8px", width: 40, height: 40 }}>
                      <DeleteOutline sx={{ fontSize: 18 }} />
                    </IconButton>
                  </div>
                ))}
              </div>
            </div>

            {/* Features (Pros/Cons) Box */}
            <div style={{ background: "#fff", borderRadius: 20, padding: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, borderBottom: "1px solid #f0ede6", paddingBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(21,66,120,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#154278" }}>
                    <AddCircleOutline sx={{ fontSize: 22 }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 }}>المميزات والعيوب</h2>
                    <p style={{ fontSize: 13, color: "#6b7280", margin: "2px 0 0" }}>أبرز النقاط الإيجابية والسلبية للمنتج</p>
                  </div>
                </div>
                <Button 
                  onClick={handleAddFeature} 
                  startIcon={<AddCircleOutline />} 
                  sx={{ 
                    fontFamily: 'var(--font-cairo)', fontWeight: 700, color: '#154278', 
                    background: "rgba(21,66,120,0.08)", borderRadius: "10px", px: 2, py: 1
                  }}
                >
                  إضافة نقطة
                </Button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {features.map((feat, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 12, alignItems: "center", background: "#fdfcfb", padding: 16, borderRadius: 12, border: "1px solid #f0ede6" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr", gap: 12, flex: 1, alignItems: "center" }}>
                      <FormControl size="small" sx={fsx}>
                        <Select
                          value={feat.isPro ? "true" : "false"}
                          onChange={(e) => handleFeatureChange(idx, 'isPro', e.target.value === "true")}
                        >
                          <MenuItem value="true" sx={{ fontFamily: 'var(--font-cairo)', color: '#16a34a', fontSize: 14 }}>✔️ ميزة</MenuItem>
                          <MenuItem value="false" sx={{ fontFamily: 'var(--font-cairo)', color: '#ef4444', fontSize: 14 }}>❌ عيب</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField size="small" fullWidth label="النص (عربي)" value={feat.featAr} onChange={(e) => handleFeatureChange(idx, 'featAr', e.target.value)} sx={fsx} />
                      <TextField size="small" fullWidth label="النص (إنجليزي)" value={feat.featEn} onChange={(e) => handleFeatureChange(idx, 'featEn', e.target.value)} sx={{ ...fsx, "& .MuiInputBase-input": { direction: "ltr", textAlign: "left" } }} />
                    </div>
                    <IconButton onClick={() => handleRemoveFeature(idx)} sx={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", borderRadius: "8px", width: 40, height: 40 }}>
                      <DeleteOutline sx={{ fontSize: 18 }} />
                    </IconButton>
                  </div>
                ))}
              </div>
            </div>
            
          </motion.div>

          {/* Sidebar Column */}
          <motion.div 
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-1"
          >
            {/* Publishing Box */}
            <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)", position: "sticky", top: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, borderBottom: "1px solid #f0ede6", paddingBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(21,66,120,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#154278" }}>
                  <CloudUploadOutlined sx={{ fontSize: 22 }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 }}>إعدادات النشر</h2>
                  <p style={{ fontSize: 13, color: "#6b7280", margin: "2px 0 0" }}>التصنيف وحالة التوفر</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <FormControl fullWidth sx={fsx}>
                  <InputLabel>القسم التابع له *</InputLabel>
                  <Select
                    value={categoryId}
                    label="القسم التابع له *"
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    {loadingCats ? (
                      <MenuItem disabled sx={{ fontFamily: 'var(--font-cairo)' }}>جاري التحميل...</MenuItem>
                    ) : (
                      categories.map(cat => (
                        <MenuItem key={cat.id} value={cat.id} sx={{ fontFamily: 'var(--font-cairo)' }}>
                          {cat.name_ar}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={fsx}>
                  <InputLabel>حالة التوفر</InputLabel>
                  <Select
                    value={status}
                    label="حالة التوفر"
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <MenuItem value="in_stock" sx={{ fontFamily: 'var(--font-cairo)' }}>متوفر (In Stock)</MenuItem>
                    <MenuItem value="on_demand" sx={{ fontFamily: 'var(--font-cairo)' }}>عند الطلب (On Demand)</MenuItem>
                    <MenuItem value="not_handled" sx={{ fontFamily: 'var(--font-cairo)' }}>غير محدد</MenuItem>
                  </Select>
                </FormControl>
                
                <div style={{ height: 1, background: "#f0ede6", width: "100%", margin: "8px 0" }} />
                
                {/* Submit */}
                <Button
                  onClick={handleSubmit}
                  variant="contained"
                  fullWidth
                  disabled={isSubmitting}
                  startIcon={isSubmitting ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <SaveOutlined />}
                  sx={{
                    fontFamily: "var(--font-cairo), Cairo, sans-serif", fontWeight: 700,
                    background: "linear-gradient(135deg, #154278 0%, #1e6abf 100%)",
                    borderRadius: "10px", padding: "12px",
                    boxShadow: "0 4px 14px rgba(21,66,120,0.3)",
                    "&:hover": { background: "#1a4f8a" }, "&:disabled": { opacity: 0.7 },
                  }}
                >
                  {isSubmitting ? "جاري الحفظ..." : "حفظ المنتج في الكتالوج"}
                </Button>
                <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", margin: "4px 0 0" }}>
                  ملاحظة: إضافة الصور للمعرض تتم بعد الحفظ.
                </p>
              </div>
            </div>
          </motion.div>

        </div>
      </form>
    </div>
  );
}
