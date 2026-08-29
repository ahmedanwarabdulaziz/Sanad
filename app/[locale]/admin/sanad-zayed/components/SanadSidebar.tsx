"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  DashboardOutlined,
  PeopleOutlined,
  AccountTreeOutlined,
  AccountBalanceOutlined,
  ReceiptLongOutlined,
  ApartmentOutlined,
  VisibilityOutlined,
  MenuOutlined,
  CloseOutlined,
  PaymentsOutlined,
} from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { useState } from "react";

const navItems = [
  { label: "لوحة التحكم",    href: "/admin/sanad-zayed/dashboard",  icon: DashboardOutlined },
  { label: "المستثمرون",      href: "/admin/sanad-zayed/investors",  icon: PeopleOutlined },
  { label: "مراحل المشروع",   href: "/admin/sanad-zayed/stages",     icon: AccountTreeOutlined },
  { label: "الوحدات",         href: "/admin/sanad-zayed/units",      icon: ApartmentOutlined },
  { label: "الخزينة",          href: "/admin/sanad-zayed/treasury",   icon: AccountBalanceOutlined },
  { label: "المصروفات",        href: "/admin/sanad-zayed/expenses",   icon: ReceiptLongOutlined },
  { label: "مرتجعات المستثمرين", href: "/admin/sanad-zayed/investor-returns", icon: PaymentsOutlined },
  { label: "البنود الظاهرة للمستثمر", href: "/admin/sanad-zayed/investor-items", icon: VisibilityOutlined },
];

export default function SanadSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname?.includes(href);

  const sidebarContent = (
    <>
      {/* Project header */}
      <div
        style={{
          padding: "20px 20px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, rgba(209,208,198,0.25) 0%, rgba(209,208,198,0.1) 100%)",
              border: "1px solid rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            🏗️
          </div>
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "#f1f5f9",
                lineHeight: 1.2,
                fontFamily: "var(--font-cairo), Cairo, sans-serif",
              }}
            >
              سند زايد
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(209,208,198,0.6)",
                fontFamily: "var(--font-cairo), Cairo, sans-serif",
                marginTop: 2,
              }}
            >
              نظام إدارة الاستثمار
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: "12px 10px", flex: 1 }}>
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
                gap: 12,
                padding: "11px 14px",
                borderRadius: 12,
                marginBottom: 2,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: active ? 700 : 400,
                color: active ? "#ffffff" : "rgba(255,255,255,0.65)",
                background: active
                  ? "rgba(255,255,255,0.12)"
                  : "transparent",
                transition: "all 0.18s ease",
                fontFamily: "var(--font-cairo), Cairo, sans-serif",
                position: "relative",
              }}
            >
              {/* Active indicator bar */}
              {active && (
                <span
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 3,
                    height: 24,
                    borderRadius: "4px 0 0 4px",
                    background: "#d1d0c6",
                  }}
                />
              )}
              <Icon
                sx={{
                  fontSize: 20,
                  color: active ? "#d1d0c6" : "rgba(255,255,255,0.5)",
                  flexShrink: 0,
                }}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer — project version */}
      <div
        style={{
          padding: "12px 20px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.25)",
            fontFamily: "var(--font-cairo), Cairo, sans-serif",
          }}
        >
          سند زايد · v1.0
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <div
        style={{ position: "fixed", top: 14, left: 14, zIndex: 1300, display: "none" }}
        className="sz-mobile-btn"
      >
        <IconButton
          onClick={() => setMobileOpen(!mobileOpen)}
          sx={{
            color: "#154278",
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(21,66,120,0.15)",
            "&:hover": { background: "#fff" },
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
            zIndex: 1100,
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: 260,
          minHeight: "calc(100vh - 64px)",
          background: "#154278",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 64,
          right: 0,
          bottom: 0,
          zIndex: 1100,
          transition: "transform 0.3s ease",
          overflowY: "auto",
        }}
        className={`sz-sidebar ${mobileOpen ? "sz-sidebar-open" : ""}`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop spacer to push content left */}
      <div className="sz-sidebar-spacer" style={{ width: 260, flexShrink: 0 }} />

      <style>{`
        @media (max-width: 768px) {
          .sz-mobile-btn { display: block !important; }
          .sz-sidebar { transform: translateX(100%); }
          .sz-sidebar-open { transform: translateX(0) !important; }
          .sz-sidebar-spacer { display: none !important; }
        }
      `}</style>
    </>
  );
}
