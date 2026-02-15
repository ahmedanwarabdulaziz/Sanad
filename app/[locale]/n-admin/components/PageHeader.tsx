"use client";

import { Box, Button, Typography } from "@mui/material";

interface PageHeaderProps {
  title: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <Box dir="rtl" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5, gap: 2, flexWrap: "wrap", textAlign: "right" }}>
      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ color: "grey.900", fontSize: { xs: "1rem", sm: "1.25rem" }, fontFamily: "var(--font-cairo)", textAlign: "right" }}
      >
        {title}
      </Typography>
      {action}
    </Box>
  );
}
