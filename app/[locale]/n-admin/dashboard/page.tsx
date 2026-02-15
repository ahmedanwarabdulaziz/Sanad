"use client";

import { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import NAdminShell from "../components/NAdminShell";
import type { SalesUser } from "@/databases/sales-operations/types";

export default function NAdminDashboardPage() {
  const [user, setUser] = useState<SalesUser | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("n_admin_user");
    if (!raw) {
      window.location.href = "/n-admin";
      return;
    }
    try {
      setUser(JSON.parse(raw));
    } catch {
      window.location.href = "/n-admin";
    }
  }, []);

  if (!user) return null;

  return (
    <NAdminShell>
      <Box dir="rtl" sx={{ textAlign: "right" }}>
      <Typography variant="h6" fontWeight={700} dir="rtl" sx={{ mb: 2, fontFamily: "var(--font-cairo)", textAlign: "right" }}>
        مرحباً، {user.name}
      </Typography>
      <Typography color="text.secondary" dir="rtl" sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>
        لوحة التحكم - استخدم القائمة للتنقل بين الصفحات
      </Typography>
      </Box>
    </NAdminShell>
  );
}
