"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminAuthenticatedLayout from "../../components/AdminAuthenticatedLayout";
import { Box, Button, TextField, Typography, CircularProgress, Alert } from "@mui/material";
import { ArrowForward } from "@mui/icons-material";

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    location: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!formData.name || !formData.slug) {
      setError("الاسم ومعرف المشروع (Slug) مطلوبان");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/erp-auth/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, project_type: "custom" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "حدث خطأ أثناء إضافة المشروع");
      }

      router.push("/admin/projects");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminAuthenticatedLayout>
      <Box sx={{ maxWidth: 600, mx: "auto", mt: 4, mb: 8 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
          <Button
            onClick={() => router.back()}
            sx={{ minWidth: "auto", p: 1, color: "#94a3b8" }}
          >
            <ArrowForward />
          </Button>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "#f1f5f9", fontFamily: "var(--font-cairo)" }}>
              إضافة مشروع جديد
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b", fontFamily: "var(--font-cairo)" }}>
              أدخل تفاصيل المشروع الجديد لإضافته للنظام
            </Typography>
          </Box>
        </Box>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            background: "rgba(30, 41, 59, 0.4)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(148, 163, 184, 0.08)",
            borderRadius: "20px",
            p: 4,
            display: "flex",
            flexDirection: "column",
            gap: 3,
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "rgba(148, 163, 184, 0.3)" },
              "&:hover fieldset": { borderColor: "rgba(148, 163, 184, 0.5)" },
              "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
            },
          }}
        >
          {error && <Alert severity="error" sx={{ fontFamily: "var(--font-cairo)" }}>{error}</Alert>}

          <TextField
            label="اسم المشروع"
            name="name"
            value={formData.name}
            onChange={handleChange}
            fullWidth
            required
            InputProps={{ style: { color: "#f1f5f9", fontFamily: "var(--font-cairo)" } }}
            InputLabelProps={{ style: { color: "#94a3b8", fontFamily: "var(--font-cairo)" } }}
          />

          <TextField
            label="المعرف (Slug) بالإنجليزية، بدون مسافات"
            name="slug"
            value={formData.slug}
            onChange={handleChange}
            fullWidth
            required
            placeholder="مثال: sanad-marble"
            InputProps={{ style: { color: "#f1f5f9", fontFamily: "var(--font-cairo)", textAlign: "left" } }}
            InputLabelProps={{ style: { color: "#94a3b8", fontFamily: "var(--font-cairo)" } }}
            dir="ltr"
          />

          <TextField
            label="الموقع (اختياري)"
            name="location"
            value={formData.location}
            onChange={handleChange}
            fullWidth
            InputProps={{ style: { color: "#f1f5f9", fontFamily: "var(--font-cairo)" } }}
            InputLabelProps={{ style: { color: "#94a3b8", fontFamily: "var(--font-cairo)" } }}
          />

          <TextField
            label="الوصف (اختياري)"
            name="description"
            value={formData.description}
            onChange={handleChange}
            fullWidth
            multiline
            rows={4}
            InputProps={{ style: { color: "#f1f5f9", fontFamily: "var(--font-cairo)" } }}
            InputLabelProps={{ style: { color: "#94a3b8", fontFamily: "var(--font-cairo)" } }}
          />

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              mt: 2,
              py: 1.5,
              borderRadius: "12px",
              fontFamily: "var(--font-cairo)",
              fontWeight: 700,
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
              },
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "إضافة المشروع"}
          </Button>
        </Box>
      </Box>
    </AdminAuthenticatedLayout>
  );
}
