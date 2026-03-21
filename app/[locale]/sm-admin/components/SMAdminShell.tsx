"use client";

import { useState, useEffect } from "react";
import { Box, Button, Drawer, IconButton, List, ListItemButton, ListItemText, Typography } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import { usePathname, useRouter } from "next/navigation";
import type { SalesUser } from "@/databases/sales-operations/types";

// The sidebar is completely empty except for the Dashboard, starting from a clean slate.
// We will add menus here as we build them specifically for Sanad Marble.
const SM_PAGES: Array<{ id: string; path: string; labelAr: string }> = [];
console.log("SM_PAGES initialized as completely empty array for clean slate.");

export default function SMAdminShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SalesUser | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

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

  const handleLogout = () => {
    sessionStorage.removeItem("sm_admin_user");
    window.location.href = "/sm-admin";
  };

  if (!user) return null;

  return (
    <Box dir="rtl" sx={{ minHeight: "100vh", pb: 8, textAlign: "right" }}>
      <Box
        dir="rtl"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          bg: "white",
          borderBottom: 1,
          borderColor: "divider",
          px: 2,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1,
          textAlign: "right",
        }}
      >
        <IconButton size="small" onClick={() => setDrawerOpen(true)}>
          <MenuIcon />
        </IconButton>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, fontFamily: "var(--font-cairo)", textAlign: "right" }}>
          سند للرخام والجرانيت
        </Typography>
        <Button startIcon={<LogoutIcon />} onClick={handleLogout} size="small" sx={{ fontFamily: "var(--font-cairo)" }}>
          خروج
        </Button>
      </Box>

      <Box dir="rtl" sx={{ p: 2, maxWidth: 640, mx: "auto", textAlign: "right" }}>
        {children}
      </Box>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 260, direction: "rtl", textAlign: "right" } }}
      >
        <Box dir="rtl" sx={{ p: 2, pt: 3, textAlign: "right", "& .MuiListItemButton-root": { justifyContent: "flex-start" } }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontFamily: "var(--font-cairo)", textAlign: "right" }}>
            مرحباً، {user.name}
          </Typography>
          <List dense>
            <ListItemButton
              selected={pathname === "/sm-admin/dashboard"}
              onClick={() => {
                router.push("/sm-admin/dashboard");
                setDrawerOpen(false);
              }}
            >
              <ListItemText primary="لوحة التحكم" primaryTypographyProps={{ sx: { textAlign: "right" } }} sx={{ fontFamily: "var(--font-cairo)" }} />
            </ListItemButton>
            {SM_PAGES.map((p) => (
              <ListItemButton
                key={p.id}
                selected={pathname === p.path}
                onClick={() => {
                  router.push(p.path);
                  setDrawerOpen(false);
                }}
              >
                <ListItemText primary={p.labelAr} primaryTypographyProps={{ sx: { textAlign: "right" } }} sx={{ fontFamily: "var(--font-cairo)" }} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
    </Box>
  );
}
