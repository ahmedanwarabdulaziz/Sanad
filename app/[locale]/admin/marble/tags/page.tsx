"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/navigation";
import { MarbleTag } from "@/types/marble";
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Backdrop,
  Fade,
  Switch,
  FormControlLabel,
  Autocomplete
} from "@mui/material";
import { DeleteOutline, ArrowBackOutlined, AddOutlined, StyleOutlined, CloseOutlined } from "@mui/icons-material";

export default function TagsAdminPage() {
  const [tags, setTags] = useState<MarbleTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [nameAr, setNameAr] = useState("");
  const [tagGroup, setTagGroup] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [hasDedicatedPage, setHasDedicatedPage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchTags();
  }, []);

  async function fetchTags() {
    setLoading(true);
    const { data } = await supabase.from("marble_tags").select("*").order("created_at", { ascending: false });
    if (data) setTags(data);
    setLoading(false);
  }

  async function handleAddTag(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    
    const { error } = await supabase
      .from("marble_tags")
      .insert([{ 
        name_ar: nameAr, 
        name_en: nameAr, 
        slug, 
        tag_group: tagGroup || "عام",
        parent_id: parentId === "" ? null : parentId,
        has_dedicated_page: hasDedicatedPage
      }])
      .select();

    if (error) {
      alert("حدث خطأ أثناء الإضافة: " + error.message);
    } else {
      setNameAr("");
      setSlug("");
      setParentId(null);
      setHasDedicatedPage(false);
      setOpenModal(false);
      fetchTags();
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    await supabase.from("marble_tags").delete().eq("id", id);
    fetchTags();
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
            إدارة العلامات والتصنيفات (Tags)
          </h1>
          <p className="text-neutral-500 font-medium">أضف العلامات لربط الصور بالحمامات، المطابخ، والتصميم الداخلي والخارجي.</p>
        </div>
        <div className="flex gap-4">
          <Button
            variant="contained"
            onClick={() => setOpenModal(true)}
            startIcon={<AddOutlined />}
            sx={{
              bgcolor: '#9333ea',
              fontFamily: 'var(--font-cairo)',
              fontWeight: 'bold',
              borderRadius: '12px',
              py: 1,
              px: 3,
              boxShadow: '0 4px 14px rgba(147,51,234,0.3)',
              '&:hover': { bgcolor: '#7e22ce' }
            }}
          >
            إضافة علامة جديدة
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
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontFamily: 'var(--font-cairo)', fontSize: '1rem', color: '#64748b', py: 3 }}>الاسم</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontFamily: 'var(--font-cairo)', fontSize: '1rem', color: '#64748b', py: 3 }}>العلامة الأب</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontFamily: 'var(--font-cairo)', fontSize: '1rem', color: '#64748b', py: 3 }}>المجموعة</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontFamily: 'var(--font-cairo)', fontSize: '1rem', color: '#64748b', py: 3 }}>صفحة مخصصة؟</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', fontFamily: 'var(--font-cairo)', fontSize: '1rem', color: '#64748b', py: 3 }}>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                      <CircularProgress sx={{ color: '#94a3b8' }} />
                    </TableCell>
                  </TableRow>
                ) : tags.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 10, color: '#64748b', fontFamily: 'var(--font-cairo)' }}>
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
                          <StyleOutlined sx={{ fontSize: 32, color: '#cbd5e1' }} />
                        </div>
                        <p className="text-lg font-medium">لا توجد علامات مضافة بعد</p>
                        <p className="text-sm mt-1 opacity-70">أضف علامتك الأولى من النموذج الجانبي</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  tags.map(tag => (
                    <TableRow key={tag.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell align="right" sx={{ fontFamily: 'var(--font-cairo)', fontWeight: 'bold', fontSize: '1rem' }}>
                        {tag.name_ar}
                        <div className="text-xs text-neutral-400 font-normal dir-ltr mt-1">/{tag.slug}</div>
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'var(--font-cairo)', color: '#475569' }}>
                        {tag.parent_id ? tags.find(t => t.id === tag.parent_id)?.name_ar || 'غير معروف' : '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'var(--font-cairo)', color: '#475569' }}>
                        <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-bold border border-purple-100">
                            {tag.tag_group}
                        </span>
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'var(--font-cairo)' }}>
                        {tag.has_dedicated_page ? (
                          <span className="text-emerald-600 font-bold text-sm bg-emerald-50 px-2 py-1 rounded-lg">نعم</span>
                        ) : (
                          <span className="text-neutral-400 font-bold text-sm">لا</span>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="حذف العلامة" placement="top">
                          <IconButton onClick={() => handleDelete(tag.id)} color="error" sx={{ bgcolor: 'error.50', '&:hover': { bgcolor: 'error.100' } }}>
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

      {/* Add Tag Dialog */}
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
              إضافة علامة جديدة
              <IconButton onClick={() => setOpenModal(false)} disabled={isSubmitting}>
                <CloseOutlined />
              </IconButton>
            </DialogTitle>
            <form onSubmit={handleAddTag}>
              <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }} dir="rtl">
                <TextField
                  label="الاسم (بالعربي)"
                  variant="outlined"
                  fullWidth
                  required
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  InputLabelProps={{ style: { fontFamily: 'var(--font-cairo)' } }}
                  inputProps={{ style: { fontFamily: 'var(--font-cairo)' } }}
                  placeholder="مثال: حمامات"
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
                  helperText="يستخدم في رابط الصفحة، مثلا: bathrooms"
                />
                <Autocomplete
                  freeSolo
                  options={Array.from(new Set(tags.map(t => t.tag_group)))}
                  value={tagGroup}
                  onInputChange={(e, newValue) => setTagGroup(newValue)}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="المجموعة (مثال: غرف، مطابخ، إلخ)" 
                      variant="outlined" 
                      required
                      InputLabelProps={{ style: { fontFamily: 'var(--font-cairo)' } }}
                      inputProps={{ ...params.inputProps, style: { fontFamily: 'var(--font-cairo)' } }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} style={{ fontFamily: 'var(--font-cairo)' }}>
                      {option}
                    </li>
                  )}
                />
                <FormControl fullWidth>
                  <InputLabel style={{ fontFamily: 'var(--font-cairo)' }}>العلامة الأب (اختياري)</InputLabel>
                  <Select
                    value={parentId || ""}
                    label="العلامة الأب (اختياري)"
                    onChange={(e) => setParentId(e.target.value)}
                    style={{ fontFamily: 'var(--font-cairo)' }}
                  >
                    <MenuItem value="" style={{ fontFamily: 'var(--font-cairo)' }}>-- بدون أب (تصنيف رئيسي) --</MenuItem>
                    {tags.filter(t => !t.parent_id).map(t => (
                      <MenuItem key={t.id} value={t.id} style={{ fontFamily: 'var(--font-cairo)' }}>
                        {t.name_ar}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 mt-2">
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={hasDedicatedPage} 
                        onChange={(e) => setHasDedicatedPage(e.target.checked)} 
                        color="secondary"
                      />
                    }
                    label={<span style={{ fontFamily: 'var(--font-cairo)', fontWeight: 'bold', color: '#334155' }}>إنشاء صفحة مخصصة لهذه العلامة</span>}
                  />
                  <p className="text-xs text-neutral-500 mt-1 mr-12">
                    إذا تم التفعيل، سيتم إنشاء صفحة معرض مخصصة لهذه العلامة في الموقع. (مثال: /projects/marble/tag/{slug || 'name'})
                  </p>
                </div>
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
                    bgcolor: '#9333ea',
                    fontFamily: 'var(--font-cairo)',
                    fontWeight: 'bold',
                    borderRadius: '10px',
                    px: 4,
                    py: 1,
                    '&:hover': { bgcolor: '#7e22ce' }
                  }}
                >
                  {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "حفظ العلامة"}
                </Button>
              </DialogActions>
            </form>
          </div>
        </Fade>
      </Dialog>
    </div>
  );
}
