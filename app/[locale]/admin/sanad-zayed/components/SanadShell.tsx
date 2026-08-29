"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircularProgress } from "@mui/material";
import { createClient } from "@/lib/supabase/client";
import SanadTopNav from "./SanadTopNav";
import SanadSidebar from "./SanadSidebar";

/**
 * Authenticated shell for all Sanad Zayed pages.
 * Handles auth check, top nav (with project switcher), and sidebar.
 */
export default function SanadShell({ children }: { children: React.ReactNode }) {
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
    return () => { active = false; };
  }, [router]);

  if (checking) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#f8f7f3",
        }}
      >
        <CircularProgress sx={{ color: "#154278" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f3" }} dir="rtl">
      {/* Fixed top bar */}
      <SanadTopNav />

      {/* Body: sidebar + content */}
      <div style={{ display: "flex", paddingTop: 64 }}>
        <SanadSidebar />
        <main
          style={{
            flex: 1,
            minHeight: "calc(100vh - 64px)",
            padding: "clamp(16px, 3vw, 32px)",
            overflowX: "hidden",
            fontFamily: "var(--font-cairo), Cairo, sans-serif",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
