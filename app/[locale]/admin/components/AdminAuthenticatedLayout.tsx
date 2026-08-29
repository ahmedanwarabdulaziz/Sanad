"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircularProgress } from "@mui/material";
import { createClient } from "@/lib/supabase/client";
import AdminSidebar from "./AdminSidebar";

/**
 * Wrapper layout for authenticated admin pages (dashboard, users, etc.)
 * Provides sidebar navigation + content area, and redirects to login if
 * there's no active session.
 */
export default function AdminAuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (!data.user) {
        router.replace("/admin");
        return;
      }
      setChecking(false);
    }).catch(() => {
      if (!active) return;
      router.replace("/admin");
    });
    return () => {
      active = false;
    };
  }, [router]);

  if (checking) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress sx={{ color: "#154278" }} />
      </div>
    );
  }

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
