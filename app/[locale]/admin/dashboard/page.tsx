"use client";

import AdminAuthenticatedLayout from "../components/AdminAuthenticatedLayout";

export default function AdminDashboardPage() {
  return (
    <AdminAuthenticatedLayout>
      <div>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "clamp(22px, 4vw, 28px)",
              fontWeight: 700,
              color: "#f1f5f9",
              margin: "0 0 8px 0",
              fontFamily: "var(--font-cairo), Cairo, sans-serif",
            }}
          >
            لوحة التحكم
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "#64748b",
              margin: 0,
              fontFamily: "var(--font-cairo), Cairo, sans-serif",
            }}
          >
            مرحباً بك في نظام Sanad ERP
          </p>
        </div>

        {/* Stats placeholder cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          {[
            { label: "المستخدمين", value: "—", color: "#3b82f6" },
            { label: "المشاريع", value: "—", color: "#8b5cf6" },
            { label: "المهام", value: "—", color: "#06b6d4" },
            { label: "التقارير", value: "—", color: "#10b981" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                padding: "24px",
                borderRadius: "16px",
                background: "rgba(30, 41, 59, 0.6)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(148, 163, 184, 0.08)",
              }}
            >
              <p
                style={{
                  fontSize: "13px",
                  color: "#94a3b8",
                  margin: "0 0 8px 0",
                  fontFamily: "var(--font-cairo), Cairo, sans-serif",
                }}
              >
                {stat.label}
              </p>
              <p
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  color: stat.color,
                  margin: 0,
                }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Coming soon notice */}
        <div
          style={{
            padding: "40px 24px",
            borderRadius: "16px",
            background: "rgba(30, 41, 59, 0.4)",
            border: "1px solid rgba(148, 163, 184, 0.08)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "48px",
              margin: "0 0 16px 0",
            }}
          >
            🚀
          </p>
          <p
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#e2e8f0",
              margin: "0 0 8px 0",
              fontFamily: "var(--font-cairo), Cairo, sans-serif",
            }}
          >
            لوحة التحكم قيد التطوير
          </p>
          <p
            style={{
              fontSize: "14px",
              color: "#64748b",
              margin: 0,
              fontFamily: "var(--font-cairo), Cairo, sans-serif",
            }}
          >
            سيتم إضافة الإحصائيات والتقارير قريباً
          </p>
        </div>
      </div>
    </AdminAuthenticatedLayout>
  );
}
