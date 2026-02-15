"use client";

import { Box, Typography } from "@mui/material";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
}

export function EmptyState({
  title = "لا توجد بيانات",
  subtitle,
}: EmptyStateProps) {
  return (
    <Box
      dir="rtl"
      className="n-admin-align-center"
      sx={{
        py: 6,
        px: 3,
        textAlign: "center",
        backgroundColor: "white",
        borderRadius: 2,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <InboxOutlinedIcon
        sx={{ fontSize: 48, color: "grey.300", mb: 1.5 }}
      />
      <Typography variant="subtitle1" color="text.secondary" fontWeight={500} sx={{ fontFamily: "var(--font-cairo)", textAlign: "center" }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontFamily: "var(--font-cairo)", textAlign: "center" }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}
