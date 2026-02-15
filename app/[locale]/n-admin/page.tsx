"use client";

import { useState, useEffect } from "react";
import { Box, Button, MenuItem, Select, TextField, Typography } from "@mui/material";
import { getAllUsers } from "@/databases/sales-operations/collections/users";
import type { SalesUser } from "@/databases/sales-operations/types";

export default function NAdminLoginPage() {
  const [users, setUsers] = useState<SalesUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllUsers()
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

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
      <Box dir="rtl" sx={{ backgroundColor: "white", borderRadius: 2, p: 3, width: "100%", boxShadow: 2, textAlign: "right" }}>
        <Box className="n-admin-align-center" sx={{ textAlign: "center", mb: 2 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 700, fontFamily: "var(--font-cairo)" }}>
          لوحة المبيعات
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: "var(--font-cairo)" }}>
          اختر المستخدم وأدخل الرمز
        </Typography>
        </Box>

        <Select
          fullWidth
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          displayEmpty
          sx={{ mb: 2, fontFamily: "var(--font-cairo)", textAlign: "right", "& .MuiSelect-select": { textAlign: "right" } }}
          MenuProps={{ PaperProps: { sx: { direction: "rtl" } } }}
        >
          <MenuItem value="">
            <em>اختر المستخدم</em>
          </MenuItem>
          {users.filter((u) => u.active).map((u) => (
            <MenuItem key={u.id} value={u.id}>
              {u.name}
            </MenuItem>
          ))}
        </Select>

        <TextField
          fullWidth
          label="الرمز (4 أرقام)"
          type="password"
          inputMode="numeric"
          inputProps={{ maxLength: 4, pattern: "[0-9]*", dir: "rtl" }}
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
