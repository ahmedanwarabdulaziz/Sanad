"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  PeopleOutlined,
  AccountTreeOutlined,
  AccountBalanceOutlined,
  ReceiptLongOutlined,
  TrendingUpOutlined,
  ArrowBackOutlined,
} from "@mui/icons-material";

interface DashboardStats {
  totalInvestors: number;
  totalStages: number;
  totalContracts: number;
  totalInvested: number;
  totalExpenses: number;
}

const KPI_CARDS = (stats: DashboardStats) => [
  {
    label: "إجمالي المستثمرين",
    value: stats.totalInvestors.toLocaleString("ar-EG-u-nu-latn"),
    icon: PeopleOutlined,
    color: "#154278",
    bg: "rgba(21,66,120,0.08)",
    href: "/admin/sanad-zayed/investors",
    suffix: "مستثمر",
  },
  {
    label: "مراحل المشروع",
    value: stats.totalStages.toLocaleString("ar-EG-u-nu-latn"),
    icon: AccountTreeOutlined,
    color: "#0891b2",
    bg: "rgba(8,145,178,0.08)",
    href: "/admin/sanad-zayed/stages",
    suffix: "مرحلة",
  },
  {
    label: "العقود النشطة",
    value: stats.totalContracts.toLocaleString("ar-EG-u-nu-latn"),
    icon: TrendingUpOutlined,
    color: "#059669",
    bg: "rgba(5,150,105,0.08)",
    href: "/admin/sanad-zayed/investors",
    suffix: "عقد",
  },
  {
    label: "إجمالي الاستثمار",
    value: stats.totalInvested === 0
      ? "0"
      : stats.totalInvested.toLocaleString("ar-EG-u-nu-latn", { maximumFractionDigits: 0 }),
    icon: AccountBalanceOutlined,
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.08)",
    href: "/admin/sanad-zayed/treasury",
    suffix: "ج.م",
    isAmount: true,
  },
];

const QUICK_ACTIONS = [
  {
    label: "إضافة مستثمر",
    desc: "تسجيل مستثمر جديد في المشروع",
    icon: "👤",
    href: "/admin/sanad-zayed/investors",
    color: "#154278",
  },
  {
    label: "إضافة مرحلة",
    desc: "إنشاء مرحلة جديدة للمشروع",
    icon: "📐",
    href: "/admin/sanad-zayed/stages",
    color: "#0891b2",
  },
  {
    label: "تسجيل مصروف",
    desc: "إضافة مصروف أو تسوية تكلفة",
    icon: "🧾",
    href: "/admin/sanad-zayed/expenses",
    color: "#d97706",
  },
  {
    label: "إدارة الخزينة",
    desc: "عرض الحسابات والأرصدة",
    icon: "🏦",
    href: "/admin/sanad-zayed/treasury",
    color: "#059669",
  },
];

export default function SanadDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalInvestors: 0,
    totalStages: 0,
    totalContracts: 0,
    totalInvested: 0,
    totalExpenses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sanad-zayed/dashboard")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = KPI_CARDS(stats);

  return (
    <div dir="rtl" style={{ fontFamily: "var(--font-cairo), Cairo, sans-serif" }}>
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
              لوحة التحكم
            </h1>
            <p style={{ fontSize: 14, color: "#6b7280", marginTop: 6, margin: "6px 0 0" }}>
              مرحباً بك في نظام إدارة مشروع سند زايد الاستثماري
            </p>
          </div>

          {/* Project badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #154278 0%, #1e6abf 100%)",
              borderRadius: 12,
              padding: "8px 16px",
            }}
          >
            <span style={{ fontSize: 18 }}>🏗️</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>سند زايد</span>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {cards.map((card, i) => {
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
                padding: "22px 22px 18px",
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                transition: "all 0.22s ease",
                border: "1px solid rgba(0,0,0,0.04)",
                position: "relative",
                overflow: "hidden",
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

              {/* Icon */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 13,
                  background: card.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  position: "relative",
                }}
              >
                <Icon sx={{ fontSize: 22, color: card.color }} />
              </div>

              {/* Value */}
              <div
                style={{
                  fontSize: loading ? 20 : "clamp(24px, 4vw, 32px)",
                  fontWeight: 900,
                  color: "#111827",
                  lineHeight: 1,
                  marginBottom: 4,
                  position: "relative",
                  direction: "ltr",
                  textAlign: "right",
                }}
              >
                {loading ? (
                  <span style={{ opacity: 0.3 }}>—</span>
                ) : (
                  <>
                    {card.value}
                    {card.isAmount && (
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#9ca3af", marginRight: 4 }}>
                        {card.suffix}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Label */}
              <div style={{ fontSize: 13, color: "#6b7280", position: "relative" }}>
                {card.label}
                {!card.isAmount && !loading && (
                  <span style={{ color: "#9ca3af", marginRight: 4 }}>{card.suffix}</span>
                )}
              </div>

              {/* Arrow hint */}
              <div
                style={{
                  position: "absolute",
                  bottom: 16,
                  left: 16,
                  opacity: 0.25,
                  fontSize: 14,
                  color: card.color,
                }}
              >
                ←
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

      {/* Setup notice if tables not set up yet */}
      {!loading && stats.totalInvestors === 0 && stats.totalStages === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{
            marginTop: 32,
            background: "linear-gradient(135deg, rgba(21,66,120,0.06) 0%, rgba(30,106,191,0.04) 100%)",
            border: "1px solid rgba(21,66,120,0.15)",
            borderRadius: 16,
            padding: "24px 28px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ fontSize: 32, flexShrink: 0 }}>🚀</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#154278", marginBottom: 4 }}>
              ابدأ بإعداد المشروع
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
              تأكد من تشغيل ملف قاعدة البيانات{" "}
              <code
                style={{
                  background: "rgba(21,66,120,0.1)",
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontSize: 12,
                  color: "#154278",
                }}
              >
                scripts/migrations/002_sanad_zayed_schema.sql
              </code>{" "}
              في Supabase، ثم ابدأ بإضافة المستثمرين والمراحل.
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
