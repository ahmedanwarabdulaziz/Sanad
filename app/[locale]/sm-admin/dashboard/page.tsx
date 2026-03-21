"use client";

import { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import SMAdminShell from "../components/SMAdminShell";
import type { SalesUser } from "@/databases/sales-operations/types";

export default function SMAdminDashboardPage() {
  const [user, setUser] = useState<SalesUser | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("sm_admin_user");
    if (!raw) {
      window.location.href = "/sm-admin";
      return;
    }
    try {
      setUser(JSON.parse(raw));
    } catch {
      window.location.href = "/sm-admin";
    }
  }, []);

  if (!user) return null;

  return (
    <SMAdminShell>
      <Box dir="rtl" sx={{ textAlign: "right" }}>
      <Typography variant="h6" fontWeight={700} dir="rtl" sx={{ mb: 2, fontFamily: "var(--font-cairo)", textAlign: "right" }}>
        مرحباً، {user.name}
      </Typography>
      <Typography color="text.secondary" dir="rtl" sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>
        لوحة التحكم لسند للرخام والجرانيت
      </Typography>
      </Box>
    </SMAdminShell>
  );
}
