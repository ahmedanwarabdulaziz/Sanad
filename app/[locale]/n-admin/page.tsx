"use client";

import { useState, useEffect } from "react";
import { Box, Button, IconButton, TextField, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import GetAppIcon from "@mui/icons-material/GetApp";
import { MobileFriendlySelect } from "./components";
import { getAllUsers } from "@/databases/sales-operations/collections/users";
import type { SalesUser } from "@/databases/sales-operations/types";

const MOBILE_PROMPT_KEY = "n_admin_mobile_prompt_dismissed";

function isMobileDevice() {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 600;
}

export default function NAdminLoginPage() {
  const [users, setUsers] = useState<SalesUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobilePrompt, setShowMobilePrompt] = useState(false);

  useEffect(() => {
    getAllUsers()
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const mobile = isMobileDevice();
    setIsMobile(mobile);
    if (mobile && typeof sessionStorage !== "undefined" && !sessionStorage.getItem(MOBILE_PROMPT_KEY)) {
      setShowMobilePrompt(true);
    }
  }, []);

  const dismissMobilePrompt = () => {
    setShowMobilePrompt(false);
    try {
      sessionStorage.setItem(MOBILE_PROMPT_KEY, "1");
    } catch {}
  };

  const handleLogin = async () => {
    setError("");
    if (!selectedUserId || !pin) {
      setError("اختر المستخدم وأدخل الرمز");
      return;
    }
    if (pin.length !== 4) {
      setError("الرمز يجب أن يكون 4 أرقام");
      return;
    }

    const user = users.find((u) => u.id === selectedUserId);
    if (!user || !user.active) {
      setError("المستخدم غير موجود أو غير مفعّل");
      return;
    }
    if (user.pin !== pin) {
      setError("الرمز غير صحيح");
      return;
    }

    sessionStorage.setItem("n_admin_user", JSON.stringify(user));
    window.location.href = "/n-admin/dashboard";
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        }}
      >
        <Typography sx={{ fontFamily: "var(--font-cairo)" }}>جاري التحميل...</Typography>
      </Box>
    );
  }

  return (
    <Box
      dir="rtl"
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        maxWidth: 400,
        mx: "auto",
        textAlign: "right",
      }}
    >
      {isMobile && showMobilePrompt && (
        <Box
          sx={{
            width: "100%",
            mb: 2,
            backgroundColor: "primary.main",
            color: "primary.contrastText",
            borderRadius: 2,
            p: 1.5,
            pr: 5,
            position: "relative",
            boxShadow: 2,
          }}
        >
          <IconButton
            size="small"
            onClick={dismissMobilePrompt}
            sx={{ position: "absolute", top: 4, left: 4, color: "inherit" }}
            aria-label="إغلاق"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
          <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5 }}>
            <GetAppIcon sx={{ fontSize: 20 }} />
            للاستخدام الأسهل على الجوال: حمّل التطبيق أو أضف الموقع إلى الشاشة الرئيسية (قائمة المتصفح ← إضافة إلى الشاشة الرئيسية)
          </Typography>
        </Box>
      )}
      <Box dir="rtl" sx={{ backgroundColor: "white", borderRadius: 2, p: 3, width: "100%", boxShadow: 2, textAlign: "right" }}>
        <Box className="n-admin-align-center" sx={{ textAlign: "center", mb: 2 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 700, fontFamily: "var(--font-cairo)" }}>
          لوحة المبيعات
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: "var(--font-cairo)" }}>
          اختر المستخدم وأدخل الرمز
        </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <MobileFriendlySelect
            fullWidth
            value={selectedUserId}
            onChange={setSelectedUserId}
            options={users.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name }))}
            placeholder="اختر المستخدم"
            displayEmpty
            searchable
            sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}
          />
        </Box>

        <TextField
          fullWidth
          label="الرمز (4 أرقام)"
          type="password"
          inputProps={{ maxLength: 4, pattern: "[0-9]*", inputMode: "numeric", dir: "rtl" }}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          InputLabelProps={{ style: { textAlign: "right" } }}
          sx={{ mb: 2, "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
        />

        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2, fontFamily: "var(--font-cairo)" }}>
            {error}
          </Typography>
        )}

        <Button
          fullWidth
          variant="contained"
          onClick={handleLogin}
          sx={{ py: 1.5, fontWeight: 700, fontFamily: "var(--font-cairo)" }}
        >
          دخول
        </Button>
      </Box>
    </Box>
  );
}
