"use client";

import { Box, Skeleton } from "@mui/material";

export function RecordList({
  children,
  loading,
}: {
  children: React.ReactNode;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={72}
            sx={{ borderRadius: 2 }}
          />
        ))}
      </Box>
    );
  }
  return (
    <Box dir="rtl" sx={{ display: "flex", flexDirection: "column", gap: 1.5, textAlign: "right" }}>
      {children}
    </Box>
  );
}
