"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AdminAuthenticatedLayout from "../components/AdminAuthenticatedLayout";
import { ArrowBackIosNewOutlined } from "@mui/icons-material";

const PROJECTS = [
  {
    id: "sanad-zayed",
    name: "سند زايد",
    description: "نظام إدارة الاستثمار العقاري — مستثمرون، مراحل، خزينة، مصروفات",
    type: "عقاري",
    status: "ACTIVE" as const,
    href: "/admin/sanad-zayed",
    icon: "🏗️",
    gradient: "linear-gradient(135deg, #154278 0%, #1e6abf 100%)",
    stats: ["المستثمرون", "المراحل", "العقود"],
  },
];

const STATUS_CONFIG = {
  ACTIVE:    { label: "نشط",    dot: "#22c55e", bg: "rgba(34,197,94,0.12)",    text: "#16a34a" },
  PLANNING:  { label: "تخطيط", dot: "#f59e0b", bg: "rgba(245,158,11,0.12)",   text: "#d97706" },
  COMPLETED: { label: "مكتمل", dot: "#64748b", bg: "rgba(100,116,139,0.12)",  text: "#64748b" },
};

export default function ProjectsLauncherPage() {
  const router = useRouter();

  return (
    <AdminAuthenticatedLayout>
      <div dir="rtl" style={{ fontFamily: "var(--font-cairo), Cairo, sans-serif" }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ marginBottom: 36 }}
        >
          <h1
            style={{
              fontSize: "clamp(24px, 3.5vw, 32px)",
              fontWeight: 900,
              color: "#111827",
              margin: 0,
            }}
          >
            مشاريعك
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", marginTop: 8, margin: "8px 0 0" }}>
            اختر مشروعاً للدخول إلى نظامه
          </p>
        </motion.div>

        {/* Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 24,
          }}
        >
          {PROJECTS.map((project, i) => {
            const status = STATUS_CONFIG[project.status];
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.35 }}
                whileHover={{ y: -6, boxShadow: "0 16px 48px rgba(21,66,120,0.2)" }}
                style={{
                  background: "#fff",
                  borderRadius: 22,
                  overflow: "hidden",
                  cursor: "pointer",
                  boxShadow: "0 2px 14px rgba(0,0,0,0.07)",
                  transition: "box-shadow 0.25s ease",
                  border: "1px solid rgba(0,0,0,0.04)",
                }}
                onClick={() => router.push(project.href)}
              >
                {/* Gradient header */}
                <div
                  style={{
                    background: project.gradient,
                    padding: "28px 26px 22px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Decorative circle */}
                  <div
                    style={{
                      position: "absolute",
                      top: -30,
                      left: -30,
                      width: 120,
                      height: 120,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.06)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: -20,
                      left: 40,
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.04)",
                    }}
                  />

                  {/* Icon */}
                  <div style={{ fontSize: 40, marginBottom: 12, position: "relative" }}>
                    {project.icon}
                  </div>

                  {/* Name */}
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 900,
                      color: "#fff",
                      lineHeight: 1.1,
                      position: "relative",
                    }}
                  >
                    {project.name}
                  </div>

                  {/* Status badge */}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 10,
                      background: status.bg,
                      borderRadius: 999,
                      padding: "4px 12px",
                      border: `1px solid ${status.dot}30`,
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: status.dot,
                        boxShadow: `0 0 6px ${status.dot}`,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: status.dot,
                      }}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: "20px 26px 24px" }}>
                  {/* Description */}
                  <p
                    style={{
                      fontSize: 13,
                      color: "#6b7280",
                      lineHeight: 1.7,
                      margin: "0 0 16px",
                    }}
                  >
                    {project.description}
                  </p>

                  {/* Type tag */}
                  <div
                    style={{
                      display: "inline-block",
                      background: "rgba(21,66,120,0.07)",
                      color: "#154278",
                      fontSize: 12,
                      fontWeight: 700,
                      borderRadius: 8,
                      padding: "4px 12px",
                      marginBottom: 20,
                    }}
                  >
                    {project.type}
                  </div>

                  {/* CTA */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(project.href);
                    }}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "linear-gradient(135deg, #154278 0%, #1e6abf 100%)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "var(--font-cairo), Cairo, sans-serif",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: "0 4px 14px rgba(21,66,120,0.3)",
                    }}
                  >
                    دخول المشروع
                    <ArrowBackIosNewOutlined sx={{ fontSize: 14 }} />
                  </motion.button>
                </div>
              </motion.div>
            );
          })}

          {/* Coming soon placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: PROJECTS.length * 0.08 + 0.05, duration: 0.35 }}
            style={{
              background: "rgba(255,255,255,0.45)",
              borderRadius: 22,
              border: "2px dashed rgba(21,66,120,0.15)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 48,
              minHeight: 300,
              cursor: "default",
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                background: "rgba(21,66,120,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                marginBottom: 16,
              }}
            >
              +
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#9ca3af",
                marginBottom: 6,
              }}
            >
              مشروع جديد
            </div>
            <div style={{ fontSize: 13, color: "#d1d0c6" }}>قريباً...</div>
          </motion.div>
        </div>
      </div>
    </AdminAuthenticatedLayout>
  );
}
