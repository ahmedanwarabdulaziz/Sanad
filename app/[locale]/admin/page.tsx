"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  TextField,
  Button,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  LockOutlined,
  EmailOutlined,
} from "@mui/icons-material";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          setError("بيانات الدخول غير صحيحة. تأكد من البريد الإلكتروني وكلمة المرور.");
        } else {
          setError(authError.message);
        }
        return;
      }

      // Successful login – redirect to ERP dashboard
      router.push("/admin/dashboard");
    } catch {
      setError("حدث خطأ غير متوقع. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
          animation: "float 8s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-15%",
          left: "-10%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)",
          animation: "float 10s ease-in-out infinite reverse",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)",
          animation: "float 12s ease-in-out infinite",
        }}
      />

      {/* Login Card */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: "440px",
          padding: "clamp(28px, 5vw, 48px) clamp(20px, 4vw, 40px)",
          borderRadius: "clamp(16px, 3vw, 24px)",
          background: "rgba(30, 41, 59, 0.6)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(148, 163, 184, 0.12)",
          boxShadow:
            "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(148, 163, 184, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        }}
      >
        {/* Logo / Branding */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              margin: "0 auto 20px",
              borderRadius: "20px",
              background:
                "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 32px rgba(59, 130, 246, 0.3)",
            }}
          >
            <LockOutlined
              style={{ fontSize: "32px", color: "#ffffff" }}
            />
          </div>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "#f1f5f9",
              margin: "0 0 8px 0",
              fontFamily: "var(--font-cairo), Cairo, sans-serif",
              letterSpacing: "-0.02em",
            }}
          >
            Sanad ERP
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "#94a3b8",
              margin: 0,
              fontFamily: "var(--font-cairo), Cairo, sans-serif",
            }}
          >
            نظام إدارة الموارد
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            sx={{
              mb: 3,
              borderRadius: "12px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#fca5a5",
              "& .MuiAlert-icon": { color: "#f87171" },
              "& .MuiAlert-action": { color: "#f87171" },
              fontFamily: "var(--font-cairo), Cairo, sans-serif",
              direction: "rtl",
            }}
          >
            {error}
          </Alert>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <TextField
            id="admin-email"
            label="البريد الإلكتروني"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            autoComplete="email"
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlined sx={{ color: "#64748b", fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "14px",
                backgroundColor: "rgba(15, 23, 42, 0.5)",
                color: "#e2e8f0",
                fontFamily: "var(--font-cairo), Cairo, sans-serif",
                transition: "all 0.2s ease",
                "& fieldset": {
                  borderColor: "rgba(148, 163, 184, 0.15)",
                  transition: "all 0.2s ease",
                },
                "&:hover fieldset": {
                  borderColor: "rgba(59, 130, 246, 0.4)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#3b82f6",
                  boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.15)",
                },
              },
              "& .MuiInputLabel-root": {
                color: "#94a3b8",
                fontFamily: "var(--font-cairo), Cairo, sans-serif",
                "&.Mui-focused": {
                  color: "#60a5fa",
                },
              },
              "& .MuiInputBase-input": {
                textAlign: "right",
              },
            }}
          />

          <TextField
            id="admin-password"
            label="كود الدخول"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            autoComplete="current-password"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlined sx={{ color: "#64748b", fontSize: 20 }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    sx={{ color: "#64748b" }}
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? (
                      <VisibilityOff sx={{ fontSize: 20 }} />
                    ) : (
                      <Visibility sx={{ fontSize: 20 }} />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "14px",
                backgroundColor: "rgba(15, 23, 42, 0.5)",
                color: "#e2e8f0",
                fontFamily: "var(--font-cairo), Cairo, sans-serif",
                transition: "all 0.2s ease",
                "& fieldset": {
                  borderColor: "rgba(148, 163, 184, 0.15)",
                  transition: "all 0.2s ease",
                },
                "&:hover fieldset": {
                  borderColor: "rgba(59, 130, 246, 0.4)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#3b82f6",
                  boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.15)",
                },
              },
              "& .MuiInputLabel-root": {
                color: "#94a3b8",
                fontFamily: "var(--font-cairo), Cairo, sans-serif",
                "&.Mui-focused": {
                  color: "#60a5fa",
                },
              },
              "& .MuiInputBase-input": {
                textAlign: "right",
              },
            }}
          />

          <Button
            id="admin-login-button"
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{
              mt: 1,
              py: 1.6,
              borderRadius: "14px",
              fontSize: "16px",
              fontWeight: 600,
              fontFamily: "var(--font-cairo), Cairo, sans-serif",
              textTransform: "none",
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              boxShadow: "0 8px 32px rgba(59, 130, 246, 0.25)",
              transition: "all 0.3s ease",
              "&:hover": {
                background:
                  "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                boxShadow: "0 12px 40px rgba(59, 130, 246, 0.35)",
                transform: "translateY(-1px)",
              },
              "&:active": {
                transform: "translateY(0)",
              },
              "&.Mui-disabled": {
                background: "rgba(59, 130, 246, 0.3)",
                color: "rgba(255,255,255,0.5)",
              },
            }}
          >
            {loading ? (
              <CircularProgress size={24} sx={{ color: "#fff" }} />
            ) : (
              "تسجيل الدخول"
            )}
          </Button>
        </form>

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            marginTop: "32px",
            fontSize: "13px",
            color: "#475569",
            fontFamily: "var(--font-cairo), Cairo, sans-serif",
          }}
        >
          © {new Date().getFullYear()} Sanad Pro Capital Projects
        </p>
      </div>

      {/* Keyframe animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        @media (max-width: 480px) {
          .min-h-screen { padding: 16px 8px; }
        }
      `}</style>
    </div>
  );
}
