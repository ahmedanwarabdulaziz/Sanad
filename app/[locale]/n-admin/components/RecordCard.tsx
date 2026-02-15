"use client";

import { Box, IconButton, Typography } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

interface RecordCardProps {
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  onClick?: () => void;
  children?: React.ReactNode;
}

export function RecordCard({ title, subtitle, meta, action, onClick, children }: RecordCardProps) {
  return (
    <Box
      component={onClick ? "button" : "div"}
      dir="rtl"
      onClick={onClick}
      sx={{
        width: "100%",
        border: "none",
        textAlign: "right",
        cursor: onClick ? "pointer" : "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
        p: 2,
        borderRadius: 2,
        backgroundColor: "white",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.2s, background-color 0.2s",
        "&:hover": onClick
          ? { boxShadow: "0 4px 12px rgba(0,0,0,0.08)", backgroundColor: "grey.50" }
          : {},
        "&:active": onClick ? { backgroundColor: "grey.100" } : {},
      }}
    >
      <Box dir="rtl" sx={{ flex: 1, minWidth: 0, textAlign: "right" }}>
        <Typography
          variant="subtitle1"
          fontWeight={600}
          sx={{ color: "grey.900", lineHeight: 1.4, fontFamily: "var(--font-cairo)", textAlign: "right", display: "block" }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="body2"
            sx={{ color: "grey.600", mt: 0.25, fontSize: "0.8125rem", fontFamily: "var(--font-cairo)", textAlign: "right", display: "block" }}
          >
            {subtitle}
          </Typography>
        )}
        {meta && <Box sx={{ mt: 1, textAlign: "right" }}>{meta}</Box>}
        {children}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
        {action}
        {onClick && !action && (
          <ChevronLeftIcon sx={{ color: "grey.400", fontSize: 20 }} />
        )}
      </Box>
    </Box>
  );
}
