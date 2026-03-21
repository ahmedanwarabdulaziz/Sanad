"use client";

import AdminSidebar from "./AdminSidebar";

/**
 * Wrapper layout for authenticated admin pages (dashboard, users, etc.)
 * Provides sidebar navigation + content area.
 */
export default function AdminAuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <AdminSidebar />
      <div
        style={{
          flex: 1,
          minHeight: "100vh",
          padding: "clamp(16px, 3vw, 32px)",
          overflowX: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
