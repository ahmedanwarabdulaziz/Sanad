"use client";

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  CategoryOutlined,
  Inventory2Outlined,
  StyleOutlined,
  AddPhotoAlternateOutlined,
  ArrowBackOutlined,
} from '@mui/icons-material';

const CARDS = [
  {
    label: "الأقسام الرئيسية",
    desc: "إدارة أنواع الخامات (رخام، جرانيت، إلخ)",
    icon: CategoryOutlined,
    color: "#154278",
    bg: "rgba(21,66,120,0.08)",
    href: "/admin/marble/categories",
  },
  {
    label: "كتالوج المنتجات",
    desc: "إدارة المنتجات، الأسعار، والمواصفات",
    icon: Inventory2Outlined,
    color: "#059669",
    bg: "rgba(5,150,105,0.08)",
    href: "/admin/marble/products",
  },
  {
    label: "العلامات والتصنيفات",
    desc: "إدارة الغرف والبيئات (حمامات، خارجي)",
    icon: StyleOutlined,
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.08)",
    href: "/admin/marble/tags",
  },
];

const QUICK_ACTIONS = [
  {
    label: "إضافة منتج",
    desc: "تسجيل منتج جديد في الكتالوج",
    icon: "🪨",
    href: "/admin/marble/products/add", // Placeholder for next step
    color: "#059669",
  },
  {
    label: "إضافة قسم",
    desc: "تعريف خامة أو قسم جديد",
    icon: "📁",
    href: "/admin/marble/categories",
    color: "#154278",
  },
  {
    label: "إضافة علامة",
    desc: "تصنيف غرف ومطابخ",
    icon: "🏷️",
    href: "/admin/marble/tags",
    color: "#7c3aed",
  },
];

export default function MarbleAdminDashboard() {
  const router = useRouter();

  return (
    <div dir="rtl" style={{ fontFamily: "var(--font-cairo), Cairo, sans-serif" }}>
      
      {/* Back Navigation */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Link href="/admin/projects" style={{ textDecoration: 'none' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6, 
            color: '#64748b', 
            fontSize: 14, 
            fontWeight: 700,
            padding: '6px 12px',
            borderRadius: 8,
            transition: 'all 0.2s',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f1f5f9';
            e.currentTarget.style.color = '#475569';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#64748b';
          }}
          >
            <ArrowBackOutlined sx={{ fontSize: 18 }} />
            العودة للمشاريع
          </div>
        </Link>
      </div>

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ marginBottom: 32 }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1
              style={{
                fontSize: "clamp(22px, 3vw, 28px)",
                fontWeight: 900,
                color: "#111827",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              إدارة الرخام والجرانيت
            </h1>
            <p style={{ fontSize: 14, color: "#6b7280", marginTop: 6, margin: "6px 0 0" }}>
              نظرة عامة وإدارة شاملة لكتالوج المنتجات والخامات
            </p>
          </div>

          {/* Project badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
              borderRadius: 12,
              padding: "8px 16px",
            }}
          >
            <span style={{ fontSize: 18 }}>🪨</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>كتالوج الرخام</span>
          </div>
        </div>
      </motion.div>

      {/* Main Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.35 }}
              onClick={() => router.push(card.href)}
              style={{
                background: "#fff",
                borderRadius: 18,
                padding: "22px",
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                transition: "all 0.22s ease",
                border: "1px solid rgba(0,0,0,0.04)",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column"
              }}
              whileHover={{
                y: -4,
                boxShadow: `0 12px 30px ${card.color}22`,
              }}
            >
              {/* Background accent */}
              <div
                style={{
                  position: "absolute",
                  top: -20,
                  left: -20,
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  background: card.bg,
                  opacity: 0.6,
                }}
              />

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, position: "relative" }}>
                {/* Icon */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: card.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}
                >
                  <Icon sx={{ fontSize: 24, color: card.color }} />
                </div>
                
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 2 }}>
                    {card.label}
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    {card.desc}
                  </div>
                </div>
              </div>
              
              <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: card.color }}>
                <span>الدخول للقسم</span>
                <span style={{ fontSize: 16 }}>←</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.35 }}
      >
        <h2
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#374151",
            margin: "0 0 14px",
          }}
        >
          إجراءات سريعة
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          {QUICK_ACTIONS.map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              onClick={() => router.push(action.href)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.06)",
                borderRadius: 14,
                padding: "16px",
                cursor: "pointer",
                textAlign: "right",
                display: "flex",
                alignItems: "center",
                gap: 12,
                transition: "all 0.18s ease",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `${action.color}12`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {action.icon}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#1f2937",
                    fontFamily: "var(--font-cairo), Cairo, sans-serif",
                  }}
                >
                  {action.label}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#9ca3af",
                    fontFamily: "var(--font-cairo), Cairo, sans-serif",
                    marginTop: 2,
                  }}
                >
                  {action.desc}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
