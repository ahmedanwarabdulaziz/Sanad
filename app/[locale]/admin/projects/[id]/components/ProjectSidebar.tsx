"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  DashboardOutlined,
  LayersOutlined,
  PeopleOutline,
  ArrowForwardOutlined,
  MenuOutlined,
  CloseOutlined,
  AccountBalanceOutlined,
  ReceiptLongOutlined,
  AssignmentOutlined,
  TrendingUpOutlined,
  BusinessOutlined,
  LocalShippingOutlined,
  HandshakeOutlined,
  AccountBalanceWalletOutlined,
  ShoppingCartOutlined,
  MoneyOffOutlined,
  WarehouseOutlined,
  RequestQuoteOutlined,
  MessageOutlined,
  PointOfSaleOutlined,
  PhotoLibraryOutlined,
  Inventory2Outlined,
} from "@mui/icons-material";

import { IconButton } from "@mui/material";
import { useState } from "react";

interface Props {
  projectId: string;
  projectName: string;
  projectSlug?: string;
}

export default function ProjectSidebar({ projectId, projectName, projectSlug }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const basePath = `/admin/projects/${projectId}`;

  const isProj2 = projectId === "29d4835f-6d6d-4838-a703-c4bc2c8698c4" || projectSlug === "sanad-marble";

  const navItems = isProj2 
    ? [
        { label: "نظرة عامة", href: basePath, icon: DashboardOutlined, exact: true },
        { label: "الأصناف والمجموعات", href: `${basePath}/proj2-inventory`, icon: LayersOutlined },
        { label: "الموردون", href: `${basePath}/proj2-suppliers`, icon: LocalShippingOutlined },
        { label: "العملاء", href: `${basePath}/proj2-customers`, icon: HandshakeOutlined },
        { label: "الخزنة والعهد", href: `${basePath}/proj2-vaults`, icon: AccountBalanceWalletOutlined },
        { label: "فواتير الشراء", href: `${basePath}/proj2-purchases`, icon: ShoppingCartOutlined },
        { label: "المصروفات", href: `${basePath}/proj2-expenses`, icon: MoneyOffOutlined },
        { label: "عروض الأسعار", href: `${basePath}/proj2-quotes`, icon: RequestQuoteOutlined },
        { label: "فواتير البيع", href: `${basePath}/proj2-sales`, icon: PointOfSaleOutlined },
        { label: "المخزن", href: `${basePath}/proj2-stock`, icon: WarehouseOutlined },
        { label: "اللوتات", href: `${basePath}/proj2-lots`, icon: Inventory2Outlined },
        { label: "معرض الصور", href: `${basePath}/proj2-gallery`, icon: PhotoLibraryOutlined },
        { label: "قوالب الرسائل", href: `${basePath}/proj2-msg-templates`, icon: MessageOutlined },
      ]
    : [
        { label: "نظرة عامة", href: basePath, icon: DashboardOutlined, exact: true },
        { label: "المراحل", href: `${basePath}/stages`, icon: LayersOutlined },
        { label: "المستثمرون", href: `${basePath}/investors`, icon: PeopleOutline },
        { label: "الخزينة", href: `${basePath}/treasury`, icon: AccountBalanceOutlined },
        { label: "المصروفات", href: `${basePath}/expenses`, icon: ReceiptLongOutlined },
        { label: "مصروفات المستثمرين", href: `${basePath}/investor-expenses`, icon: AssignmentOutlined },
        { label: "مصروفات الشركة", href: `${basePath}/company-expenses`, icon: BusinessOutlined },
        { label: "الموقف المالي", href: `${basePath}/financial-status`, icon: TrendingUpOutlined },
      ];


  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href || pathname === href + "/";
    return pathname?.startsWith(href);
  };

  const sidebarContent = (
    <>
      {/* Project header */}
      <div
        style={{
          padding: "20px 16px 20px",
          borderBottom: "1px solid rgba(148, 163, 184, 0.08)",
        }}
      >
        <Link
          href="/admin/projects"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            color: "#64748b",
            textDecoration: "none",
            marginBottom: "12px",
            fontFamily: "var(--font-cairo)",
          }}
        >
          <ArrowForwardOutlined sx={{ fontSize: 14 }} />
          كل المشاريع
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {projectName.charAt(0)}
          </div>
          <div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#f1f5f9",
                lineHeight: 1.3,
                fontFamily: "var(--font-cairo)",
              }}
            >
              {projectName}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#64748b",
                fontFamily: "var(--font-cairo)",
              }}
            >
              إدارة المشروع
            </div>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav style={{ padding: "12px 10px", flex: 1 }}>
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                borderRadius: "10px",
                marginBottom: "2px",
                textDecoration: "none",
                fontSize: "13px",
                fontWeight: active ? 600 : 400,
                color: active ? "#e2e8f0" : "#94a3b8",
                background: active
                  ? "rgba(16, 185, 129, 0.12)"
                  : "transparent",
                transition: "all 0.2s ease",
                fontFamily: "var(--font-cairo)",
              }}
            >
              <Icon
                sx={{
                  fontSize: 18,
                  color: active ? "#34d399" : "#64748b",
                }}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Back to main admin */}
      <div
        style={{
          padding: "12px 10px",
          borderTop: "1px solid rgba(148, 163, 184, 0.08)",
        }}
      >
        <Link
          href="/admin/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 14px",
            borderRadius: "10px",
            textDecoration: "none",
            fontSize: "13px",
            color: "#64748b",
            fontFamily: "var(--font-cairo)",
          }}
        >
          <ArrowForwardOutlined sx={{ fontSize: 16 }} />
          لوحة التحكم الرئيسية
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <div
        style={{
          position: "fixed",
          top: "12px",
          right: "12px",
          zIndex: 1100,
          display: "none",
        }}
        className="proj-mobile-menu-btn"
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
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: "240px",
          minHeight: "100vh",
          background: "rgba(15, 23, 42, 0.97)",
          borderLeft: "1px solid rgba(148, 163, 184, 0.08)",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          right: 0,
          zIndex: 1000,
          transition: "transform 0.3s ease",
        }}
        className={`proj-sidebar ${mobileOpen ? "proj-sidebar-open" : ""}`}
      >
        {sidebarContent}
      </aside>

      {/* Spacer */}
      <div className="proj-sidebar-spacer" style={{ width: "240px", flexShrink: 0 }} />

      <style>{`
        @media (max-width: 768px) {
          .proj-mobile-menu-btn { display: block !important; }
          .proj-sidebar { transform: translateX(100%); }
          .proj-sidebar-open { transform: translateX(0) !important; }
          .proj-sidebar-spacer { display: none !important; }
          .proj-main h1 { padding-right: 54px !important; }
          .proj-main h1 + p { padding-right: 54px !important; }
        }
      `}</style>
    </>
  );
}
