"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  PeopleOutline,
  LogoutOutlined,
  MenuOutlined,
  CloseOutlined,
  FolderOutlined,
  ChevronLeftOutlined,
} from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Add new projects here as they're created ──────────────────────────
const PROJECTS = [
  {
    id: "sanad-zayed",
    label: "سند زايد",
    href: "/admin/sanad-zayed/dashboard",
    icon: "🏗️",
    status: "ACTIVE" as const,
  },
  // { id: "project-2", label: "مشروع 2", href: "/admin/project-2/dashboard", icon: "🏠", status: "PLANNING" },
];

const STATUS_DOT: Record<string, string> = {
  ACTIVE:    "#22c55e",
  PLANNING:  "#f59e0b",
  COMPLETED: "#64748b",
};

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(true);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin");
  };

  const isActive = (href: string) => pathname?.startsWith(href.replace("/dashboard", ""));

  const sidebarContent = (
    <>
      {/* ── Brand logo ── */}
      <div
        style={{
          padding: "22px 20px 20px",
          borderBottom: "1px solid rgba(148,163,184,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "#d1d0c6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 700,
              color: "#154278",
              flexShrink: 0,
            }}
          >
            S
          </div>
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#f1f5f9",
                lineHeight: 1.2,
                fontFamily: "var(--font-cairo), Cairo, sans-serif",
              }}
            >
              Sanad ERP
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#64748b",
                fontFamily: "var(--font-cairo), Cairo, sans-serif",
              }}
            >
              نظام إدارة الموارد
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ padding: "12px 10px", flex: 1, overflowY: "auto" }}>

        {/* Projects section */}
        <div style={{ marginBottom: 4 }}>
          {/* Section header — clicking expands/collapses + navigates to launcher */}
          <button
            onClick={() => {
              setProjectsExpanded((v) => !v);
              router.push("/admin/projects");
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "9px 14px",
              borderRadius: 10,
              border: "none",
              background: pathname?.includes("/admin/projects") && !pathname?.includes("sanad-zayed")
                ? "rgba(209,208,198,0.2)"
                : "transparent",
              cursor: "pointer",
              transition: "background 0.18s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FolderOutlined
                sx={{
                  fontSize: 19,
                  color: pathname?.includes("/admin/projects") && !pathname?.includes("sanad-zayed")
                    ? "#fff"
                    : "rgba(255,255,255,0.55)",
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: pathname?.includes("/admin/projects") && !pathname?.includes("sanad-zayed")
                    ? "#fff"
                    : "rgba(255,255,255,0.55)",
                  fontFamily: "var(--font-cairo), Cairo, sans-serif",
                  letterSpacing: "0.02em",
                }}
              >
                المشاريع
              </span>
            </div>
            <ChevronLeftOutlined
              sx={{
                fontSize: 16,
                color: "rgba(255,255,255,0.35)",
                transform: projectsExpanded ? "rotate(-90deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
          </button>

          {/* Expanded project list */}
          {projectsExpanded && (
            <div style={{ paddingRight: 8, marginTop: 2 }}>
              {PROJECTS.map((project) => {
                const active = isActive(project.href);
                return (
                  <Link
                    key={project.id}
                    href={project.href}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      borderRadius: 10,
                      marginBottom: 2,
                      textDecoration: "none",
                      fontFamily: "var(--font-cairo), Cairo, sans-serif",
                      fontSize: 14,
                      fontWeight: active ? 700 : 400,
                      color: active ? "#ffffff" : "rgba(255,255,255,0.72)",
                      background: active ? "rgba(255,255,255,0.12)" : "transparent",
                      transition: "all 0.18s ease",
                      position: "relative",
                    }}
                  >
                    {/* Active bar */}
                    {active && (
                      <span
                        style={{
                          position: "absolute",
                          right: 0,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 3,
                          height: 22,
                          borderRadius: "3px 0 0 3px",
                          background: "#d1d0c6",
                        }}
                      />
                    )}
                    {/* Project icon */}
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: active ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.07)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 15,
                        flexShrink: 0,
                      }}
                    >
                      {project.icon}
                    </span>
                    {/* Name + status dot */}
                    <span style={{ flex: 1 }}>{project.label}</span>
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: STATUS_DOT[project.status] ?? "#64748b",
                        flexShrink: 0,
                        boxShadow: active ? `0 0 6px ${STATUS_DOT[project.status]}` : "none",
                      }}
                    />
                  </Link>
                );
              })}

              {/* Coming soon hint */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 14px",
                  borderRadius: 10,
                  opacity: 0.35,
                  cursor: "default",
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    color: "rgba(255,255,255,0.4)",
                    flexShrink: 0,
                  }}
                >
                  +
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.35)",
                    fontFamily: "var(--font-cairo), Cairo, sans-serif",
                  }}
                >
                  قريباً...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "rgba(148,163,184,0.08)",
            margin: "8px 6px",
          }}
        />

        {/* Users */}
        <Link
          href="/admin/users"
          onClick={() => setMobileOpen(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            borderRadius: 10,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: pathname?.includes("/admin/users") ? 600 : 400,
            color: pathname?.includes("/admin/users") ? "#ffffff" : "rgba(255,255,255,0.7)",
            background: pathname?.includes("/admin/users") ? "rgba(209,208,198,0.2)" : "transparent",
            transition: "all 0.2s ease",
            fontFamily: "var(--font-cairo), Cairo, sans-serif",
          }}
        >
          <PeopleOutline
            sx={{
              fontSize: 20,
              color: pathname?.includes("/admin/users") ? "#ffffff" : "rgba(255,255,255,0.7)",
            }}
          />
          إدارة المستخدمين
        </Link>
      </nav>

      {/* ── Logout ── */}
      <div
        style={{
          padding: "12px 10px",
          borderTop: "1px solid rgba(148,163,184,0.08)",
        }}
      >
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            borderRadius: 10,
            width: "100%",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
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
      {/* Mobile hamburger */}
      <div
        style={{ position: "fixed", top: 12, right: 12, zIndex: 1100, display: "none" }}
        className="admin-mobile-menu-btn"
      >
        <IconButton
          onClick={() => setMobileOpen(!mobileOpen)}
          sx={{
            color: "#ffffff",
            background: "rgba(21,66,120,0.8)",
            backdropFilter: "blur(8px)",
            "&:hover": { background: "rgba(21,66,120,0.95)" },
          }}
        >
          {mobileOpen ? <CloseOutlined /> : <MenuOutlined />}
        </IconButton>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999 }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: 260,
          minHeight: "100vh",
          background: "#154278",
          borderLeft: "1px solid rgba(255,255,255,0.1)",
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

      {/* Desktop spacer */}
      <div className="admin-sidebar-spacer" style={{ width: 260, flexShrink: 0 }} />

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
