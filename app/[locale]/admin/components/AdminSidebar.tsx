"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  DashboardOutlined,
  PeopleOutline,
  FolderOutlined,
  LogoutOutlined,
  MenuOutlined,
  CloseOutlined,
} from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { label: "لوحة التحكم", href: "/admin/dashboard", icon: DashboardOutlined },
  { label: "المشاريع", href: "/admin/projects", icon: FolderOutlined },
  { label: "إدارة المستخدمين", href: "/admin/users", icon: PeopleOutline },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin");
  };

  const isActive = (href: string) => pathname?.includes(href);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div
        style={{
          padding: "24px 20px 32px",
          borderBottom: "1px solid rgba(148, 163, 184, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            S
          </div>
          <div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#f1f5f9",
                lineHeight: 1.2,
              }}
            >
              Sanad ERP
            </div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>
              نظام إدارة الموارد
            </div>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav style={{ padding: "16px 12px", flex: 1 }}>
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "12px",
                marginBottom: "4px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: active ? 600 : 400,
                color: active ? "#e2e8f0" : "#94a3b8",
                background: active
                  ? "rgba(59, 130, 246, 0.15)"
                  : "transparent",
                transition: "all 0.2s ease",
                fontFamily: "var(--font-cairo), Cairo, sans-serif",
              }}
            >
              <Icon
                sx={{
                  fontSize: 20,
                  color: active ? "#60a5fa" : "#64748b",
                }}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div
        style={{
          padding: "16px 12px",
          borderTop: "1px solid rgba(148, 163, 184, 0.08)",
        }}
      >
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            borderRadius: "12px",
            width: "100%",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            color: "#ef4444",
            background: "transparent",
            transition: "all 0.2s ease",
            fontFamily: "var(--font-cairo), Cairo, sans-serif",
          }}
        >
          <LogoutOutlined sx={{ fontSize: 20 }} />
          تسجيل الخروج
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <div
        style={{
          position: "fixed",
          top: "12px",
          right: "12px",
          zIndex: 1100,
          display: "none",
        }}
        className="admin-mobile-menu-btn"
      >
        <IconButton
          onClick={() => setMobileOpen(!mobileOpen)}
          sx={{
            color: "#e2e8f0",
            background: "rgba(30, 41, 59, 0.8)",
            backdropFilter: "blur(8px)",
            "&:hover": { background: "rgba(30, 41, 59, 0.95)" },
          }}
        >
          {mobileOpen ? <CloseOutlined /> : <MenuOutlined />}
        </IconButton>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 999,
          }}
          className="admin-mobile-overlay"
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: "260px",
          minHeight: "100vh",
          background: "rgba(15, 23, 42, 0.95)",
          borderLeft: "1px solid rgba(148, 163, 184, 0.08)",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          right: 0,
          zIndex: 1000,
          transition: "transform 0.3s ease",
        }}
        className={`admin-sidebar ${mobileOpen ? "admin-sidebar-open" : ""}`}
      >
        {sidebarContent}
      </aside>

      {/* Spacer for content offset (desktop only) */}
      <div className="admin-sidebar-spacer" style={{ width: "260px", flexShrink: 0 }} />

      <style>{`
        @media (max-width: 768px) {
          .admin-mobile-menu-btn { display: block !important; }
          .admin-sidebar { transform: translateX(100%); }
          .admin-sidebar-open { transform: translateX(0) !important; }
          .admin-sidebar-spacer { display: none !important; }
        }
      `}</style>
    </>
  );
}
