"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircularProgress } from "@mui/material";
import { createClient } from "@/lib/supabase/client";
import SanadTopNav from "../../sanad-zayed/components/SanadTopNav";
import MarbleSidebar from "./MarbleSidebar";

const marbleProjectConfig = {
  id: "marble-granite",
  name: "كتالوج الرخام والجرانيت",
  icon: "🪨",
};

export default function MarbleShell({ children }: { children: React.ReactNode }) {
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
        <CircularProgress sx={{ color: "#4b5563" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f3" }} dir="rtl">
      {/* Fixed top bar with project switcher */}
      <SanadTopNav currentProject={marbleProjectConfig} />

      {/* Body: sidebar + content */}
      <div style={{ display: "flex", paddingTop: 64 }}>
        <MarbleSidebar />
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
