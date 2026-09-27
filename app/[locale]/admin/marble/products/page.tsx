"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/navigation";
import { MarbleProduct, MarbleCategory } from "@/types/marble";
import { motion } from "framer-motion";
import {
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
  Chip
} from "@mui/material";
import { DeleteOutline, ArrowBackOutlined, AddOutlined, Inventory2Outlined, EditOutlined } from "@mui/icons-material";

export default function ProductsAdminPage() {
  const [products, setProducts] = useState<MarbleProduct[]>([]);
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    // Fetch categories to map IDs to names
    const { data: catData } = await supabase.from("marble_categories").select("id, name_ar");
    if (catData) {
      const catMap = catData.reduce((acc, cat) => {
        acc[cat.id] = cat.name_ar;
        return acc;
      }, {} as Record<string, string>);
      setCategories(catMap);
    }

    // Fetch products
    const { data: prodData } = await supabase.from("marble_products").select("*").order("created_at", { ascending: false });
    if (prodData) {
      setProducts(prodData);
    }
    
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    await supabase.from("marble_products").delete().eq("id", id);
    fetchData();
  }

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <Chip label="متوفر" color="success" size="small" sx={{ fontFamily: 'var(--font-cairo)', fontWeight: 'bold' }} />;
      case 'on_demand':
        return <Chip label="عند الطلب" color="warning" size="small" sx={{ fontFamily: 'var(--font-cairo)', fontWeight: 'bold' }} />;
      case 'not_handled':
      default:
        return <Chip label="غير محدد" color="default" size="small" sx={{ fontFamily: 'var(--font-cairo)', fontWeight: 'bold' }} />;
    }
  };

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
            كتالوج المنتجات
          </h1>
          <p className="text-neutral-500 font-medium">إدارة المنتجات، المواصفات، المعرض وصور التنفيذ.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/admin/marble/products/add">
            <Button
              variant="contained"
              startIcon={<AddOutlined />}
              sx={{
                bgcolor: '#059669', // Emerald color for products
                fontFamily: 'var(--font-cairo)',
                fontWeight: 'bold',
                borderRadius: '12px',
                py: 1.5,
                px: 3,
                boxShadow: '0 4px 14px rgba(5,150,105,0.3)',
                '&:hover': { bgcolor: '#047857' }
              }}
            >
              إضافة منتج جديد
            </Button>
          </Link>
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
                <TableCell align="right" sx={{ fontWeight: 'bold', fontFamily: 'var(--font-cairo)', fontSize: '1rem', color: '#64748b', py: 3 }}>المنتج</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', fontFamily: 'var(--font-cairo)', fontSize: '1rem', color: '#64748b', py: 3 }}>القسم</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', fontFamily: 'var(--font-cairo)', fontSize: '1rem', color: '#64748b', py: 3 }}>الحالة</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', fontFamily: 'var(--font-cairo)', fontSize: '1rem', color: '#64748b', py: 3 }}>تاريخ الإضافة</TableCell>
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
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 10, color: '#64748b', fontFamily: 'var(--font-cairo)' }}>
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
                        <Inventory2Outlined sx={{ fontSize: 32, color: '#cbd5e1' }} />
                      </div>
                      <p className="text-lg font-medium">لا توجد منتجات مضافة بعد</p>
                      <p className="text-sm mt-1 opacity-70">ابدأ بإضافة منتجك الأول لمعرض الأعمال</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                products.map(prod => (
                  <TableRow key={prod.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell align="right" sx={{ fontFamily: 'var(--font-cairo)', fontWeight: 'bold', fontSize: '1rem' }}>
                      <div className="flex items-center gap-3">
                        {prod.main_image_url ? (
                          <div 
                            className="w-12 h-12 rounded-lg bg-cover bg-center border border-neutral-200" 
                            style={{ backgroundImage: `url(${prod.main_image_url})` }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-400 border border-neutral-200">
                            <Inventory2Outlined fontSize="small" />
                          </div>
                        )}
                        <div>
                          <div className="text-neutral-800">{prod.name_ar}</div>
                          <div className="text-xs text-neutral-400 font-normal">{prod.name_en}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'var(--font-cairo)', color: '#475569', fontWeight: 600 }}>
                      {categories[prod.category_id] || "قسم محذوف"}
                    </TableCell>
                    <TableCell align="right">
                      {getStatusChip(prod.status)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'var(--font-cairo)', color: '#64748b' }}>
                      {new Date(prod.created_at).toLocaleDateString("ar-EG")}
                    </TableCell>
                    <TableCell align="center">
                      <div className="flex justify-center gap-2">
                        {/* <Link href={`/admin/marble/products/${prod.id}`}>
                          <Tooltip title="تعديل المنتج" placement="top">
                            <IconButton color="primary" sx={{ bgcolor: 'primary.50', '&:hover': { bgcolor: 'primary.100' } }}>
                              <EditOutlined />
                            </IconButton>
                          </Tooltip>
                        </Link> */}
                        <Tooltip title="حذف المنتج" placement="top">
                          <IconButton onClick={() => handleDelete(prod.id)} color="error" sx={{ bgcolor: 'error.50', '&:hover': { bgcolor: 'error.100' } }}>
                            <DeleteOutline />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </motion.div>
    </div>
  );
}
