"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/navigation";
import { MarbleCategory } from "@/types/marble";
import { motion } from "framer-motion";
import {
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Backdrop,
  Fade,
} from "@mui/material";
import { DeleteOutline, ArrowBackOutlined, AddOutlined, CategoryOutlined, CloseOutlined } from "@mui/icons-material";

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState<MarbleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    const { data } = await supabase.from("marble_categories").select("*").order("created_at", { ascending: false });
    if (data) setCategories(data);
    setLoading(false);
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    
    const { error } = await supabase
      .from("marble_categories")
      .insert([{ name_ar: nameAr, name_en: nameEn || nameAr, slug }])
      .select();

      if (error) {
      alert("حدث خطأ أثناء الإضافة: " + error.message);
    } else {
      setNameAr("");
      setNameEn("");
      setSlug("");
      setOpenModal(false);
      fetchCategories();
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    await supabase.from("marble_categories").delete().eq("id", id);
    fetchCategories();
  }

  return (
    <div className="w-full min-h-[calc(100vh-64px)] p-6 md:p-10" dir="rtl" style={{ fontFamily: "var(--font-cairo), Cairo, sans-serif" }}>
      
      {/* Back Navigation */}
      <div className="mb-6 flex justify-end">
        <Link href="/admin/marble">
          <Button
            variant="text"
            startIcon={<ArrowBackOutlined />}
            sx={{
              color: '#64748b',
              fontFamily: 'var(--font-cairo)',
              fontWeight: 'bold',
              borderRadius: '8px',
              '&:hover': { bgcolor: '#f1f5f9', color: '#475569' }
            }}
          >
            العودة للوحة التحكم
          </Button>
        </Link>
      </div>

      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-800 tracking-tight mb-2">
            إدارة الأقسام الرئيسية
          </h1>
          <p className="text-neutral-500 font-medium">أضف الأقسام الأساسية مثل الرخام، الجرانيت، الانترلوك وغيرها.</p>
        </div>
        <div className="flex gap-4">
          <Button
            variant="contained"
            onClick={() => setOpenModal(true)}
            startIcon={<AddOutlined />}
            sx={{
              bgcolor: '#2563eb',
              fontFamily: 'var(--font-cairo)',
              fontWeight: 'bold',
              borderRadius: '12px',
              py: 1,
              px: 3,
              boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
              '&:hover': { bgcolor: '#1d4ed8' }
            }}
          >
            إضافة قسم جديد
          </Button>
        </div>
      </motion.div>

      {/* Main Table Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <TableContainer component={Paper} elevation={0} className="border border-neutral-100 rounded-3xl overflow-hidden shadow-sm">
          <Table>
            <TableHead className="bg-neutral-50/80">
              <TableRow>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontFamily: 'var(--font-cairo)', fontSize: '1rem', color: '#64748b', py: 3 }}>اسم القسم</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontFamily: 'var(--font-cairo)', fontSize: '1rem', color: '#64748b', py: 3 }}>الرابط (Slug)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontFamily: 'var(--font-cairo)', fontSize: '1rem', color: '#64748b', py: 3 }}>تاريخ الإضافة</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', fontFamily: 'var(--font-cairo)', fontSize: '1rem', color: '#64748b', py: 3 }}>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 10 }}>
                      <CircularProgress sx={{ color: '#94a3b8' }} />
                    </TableCell>
                  </TableRow>
                ) : categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 10, color: '#64748b', fontFamily: 'var(--font-cairo)' }}>
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
                          <CategoryOutlined sx={{ fontSize: 32, color: '#cbd5e1' }} />
                        </div>
                        <p className="text-lg font-medium">لا توجد أقسام مضافة بعد</p>
                        <p className="text-sm mt-1 opacity-70">أضف قسمك الأول من النموذج الجانبي</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map(cat => (
                    <TableRow key={cat.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell align="right" sx={{ fontFamily: 'var(--font-cairo)', fontWeight: 'bold', fontSize: '1rem' }}>
                        {cat.name_ar}
                      </TableCell>
                      <TableCell align="right" dir="ltr" sx={{ fontFamily: 'inherit', color: '#64748b' }}>
                        <div className="bg-neutral-100 px-3 py-1 rounded-md inline-block text-sm">
                          /{cat.slug}
                        </div>
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'var(--font-cairo)', color: '#64748b' }}>
                        {new Date(cat.created_at).toLocaleDateString("ar-EG")}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="حذف القسم" placement="top">
                          <IconButton onClick={() => handleDelete(cat.id)} color="error" sx={{ bgcolor: 'error.50', '&:hover': { bgcolor: 'error.100' } }}>
                            <DeleteOutline />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </motion.div>

      {/* Add Category Dialog */}
      <Dialog
        open={openModal}
        onClose={() => !isSubmitting && setOpenModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          style: {
            borderRadius: '24px',
            padding: '8px',
            fontFamily: 'var(--font-cairo)',
          }
        }}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 500,
            sx: { backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)' }
          },
        }}
      >
        <Fade in={openModal}>
          <div>
            <DialogTitle sx={{ fontFamily: 'var(--font-cairo)', fontWeight: 'bold', fontSize: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} dir="rtl">
              إضافة قسم جديد
              <IconButton onClick={() => setOpenModal(false)} disabled={isSubmitting}>
                <CloseOutlined />
              </IconButton>
            </DialogTitle>
            <form onSubmit={handleAddCategory}>
              <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }} dir="rtl">
                <TextField
                  label="اسم القسم (بالعربي)"
                  variant="outlined"
                  fullWidth
                  required
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  InputLabelProps={{ style: { fontFamily: 'var(--font-cairo)' } }}
                  inputProps={{ style: { fontFamily: 'var(--font-cairo)' } }}
                  placeholder="مثال: رخام، جرانيت"
                />
                <TextField
                  label="الرابط (Slug) - إنجليزي"
                  variant="outlined"
                  fullWidth
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  dir="ltr"
                  InputLabelProps={{ style: { fontFamily: 'var(--font-cairo)' } }}
                  inputProps={{ style: { fontFamily: 'var(--font-cairo)' } }}
                  helperText="يستخدم في رابط الصفحة، مثلا: marble"
                />
              </DialogContent>
              <DialogActions sx={{ p: 3, pt: 0 }} dir="rtl">
                <Button 
                  onClick={() => setOpenModal(false)} 
                  disabled={isSubmitting}
                  sx={{ fontFamily: 'var(--font-cairo)', fontWeight: 'bold', color: '#64748b' }}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  sx={{
                    bgcolor: '#2563eb',
                    fontFamily: 'var(--font-cairo)',
                    fontWeight: 'bold',
                    borderRadius: '10px',
                    px: 4,
                    py: 1,
                    '&:hover': { bgcolor: '#1d4ed8' }
                  }}
                >
                  {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "حفظ القسم"}
                </Button>
              </DialogActions>
            </form>
          </div>
        </Fade>
      </Dialog>
    </div>
  );
}
