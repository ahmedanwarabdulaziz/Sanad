"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoutOutlined, KeyboardArrowDownOutlined, AppsOutlined, CheckOutlined } from "@mui/icons-material";

// ── All available projects (expand this list as new projects are added) ──
const ALL_PROJECTS = [
  {
    id: "sanad-zayed",
    name: "سند زايد",
    href: "/admin/sanad-zayed",
    icon: "🏗️",
    status: "ACTIVE",
  },
  // Future projects go here
];

interface SanadTopNavProps {
  currentProject?: {
    id: string;
    name: string;
    icon?: string;
  };
}

export default function SanadTopNav({
  currentProject = ALL_PROJECTS[0],
}: SanadTopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch current user email
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email);
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin");
  };

  const handleProjectSwitch = (href: string) => {
    setDropdownOpen(false);
    router.push(href);
  };

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 64,
        zIndex: 1200,
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(21,66,120,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
      }}
      dir="rtl"
    >
      {/* Right: Project Switcher */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }} ref={dropdownRef}>
        {/* Brand mark — click to go to projects launcher */}
        <button
          onClick={() => router.push("/admin/projects")}
          title="الرجوع إلى المشاريع"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "linear-gradient(135deg, #154278 0%, #1e6abf 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            flexShrink: 0,
            border: "none",
            cursor: "pointer",
            transition: "all 0.18s ease",
            outline: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(21,66,120,0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {currentProject.icon ?? "🏗️"}
        </button>

        {/* Switcher button */}
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: dropdownOpen ? "rgba(21,66,120,0.07)" : "transparent",
            border: "1.5px solid",
            borderColor: dropdownOpen ? "rgba(21,66,120,0.3)" : "rgba(21,66,120,0.15)",
            borderRadius: 10,
            padding: "7px 12px 7px 10px",
            cursor: "pointer",
            transition: "all 0.18s ease",
            fontFamily: "var(--font-cairo), Cairo, sans-serif",
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#154278",
              letterSpacing: 0,
            }}
          >
            {currentProject.name}
          </span>
          <KeyboardArrowDownOutlined
            sx={{
              fontSize: 18,
              color: "#154278",
              transition: "transform 0.2s",
              transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div
            style={{
              position: "absolute",
              top: 58,
              right: 0,
              background: "#fff",
              borderRadius: 14,
              border: "1px solid rgba(21,66,120,0.1)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              minWidth: 220,
              overflow: "hidden",
              zIndex: 1300,
            }}
          >
            {/* Back to launcher */}
            <button
              onClick={() => handleProjectSwitch("/admin/projects")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-cairo), Cairo, sans-serif",
                fontSize: 13,
                color: "#6b7280",
                textAlign: "right",
                transition: "background 0.15s",
                borderBottom: "1px solid rgba(0,0,0,0.06)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <AppsOutlined sx={{ fontSize: 16, color: "#9ca3af" }} />
              كل المشاريع
            </button>

            {/* Project list */}
            <div style={{ padding: "6px 0" }}>
              <p
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  fontWeight: 600,
                  padding: "4px 16px 8px",
                  fontFamily: "var(--font-cairo), Cairo, sans-serif",
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                المشاريع
              </p>
              {ALL_PROJECTS.map((p) => {
                const isCurrent = p.id === currentProject.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleProjectSwitch(p.href)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 16px",
                      background: isCurrent ? "rgba(21,66,120,0.06)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "var(--font-cairo), Cairo, sans-serif",
                      fontSize: 14,
                      fontWeight: isCurrent ? 700 : 400,
                      color: isCurrent ? "#154278" : "#374151",
                      textAlign: "right",
                      transition: "background 0.15s",
                      justifyContent: "space-between",
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrent) e.currentTarget.style.background = "#f9fafb";
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrent) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16 }}>{p.icon}</span>
                      <span>{p.name}</span>
                    </div>
                    {isCurrent && (
                      <CheckOutlined sx={{ fontSize: 15, color: "#154278" }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Left: User info + Logout */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {userEmail && (
          <span
            style={{
              fontSize: 13,
              color: "#6b7280",
              fontFamily: "var(--font-cairo), Cairo, sans-serif",
              display: "none", // hide on mobile via CSS class
            }}
            className="topnav-email"
          >
            {userEmail}
          </span>
        )}
        <button
          onClick={handleLogout}
          title="تسجيل الخروج"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            background: "transparent",
            border: "1.5px solid rgba(239,68,68,0.25)",
            borderRadius: 10,
            color: "#ef4444",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "var(--font-cairo), Cairo, sans-serif",
            transition: "all 0.18s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.06)";
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.25)";
          }}
        >
          <LogoutOutlined sx={{ fontSize: 17 }} />
          خروج
        </button>
      </div>

      <style>{`
        @media (min-width: 640px) { .topnav-email { display: block !important; } }
      `}</style>
    </header>
  );
}
