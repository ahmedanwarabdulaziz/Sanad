"use client";

import { useState, useMemo } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  InputAdornment,
  List,
  ListItemButton,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

export interface MobileFriendlySelectOption {
  value: string;
  label: string;
}

interface MobileFriendlySelectProps {
  options: MobileFriendlySelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  displayEmpty?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium";
  disabled?: boolean;
  sx?: object;
  /** Optional: dialog title when opened on mobile (defaults to label or "اختر") */
  dialogTitle?: string;
  /** Show search in popup (default true when options.length > 5) */
  searchable?: boolean;
}

export function MobileFriendlySelect({
  options,
  value,
  onChange,
  label,
  placeholder = "اختر",
  displayEmpty = false,
  fullWidth,
  size = "small",
  disabled = false,
  sx = {},
  dialogTitle,
  searchable,
}: MobileFriendlySelectProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const effectiveOptions = useMemo(() => {
    const list = displayEmpty ? [{ value: "", label: placeholder }, ...options] : options;
    return list;
  }, [displayEmpty, placeholder, options]);

  const filteredOptions = useMemo(() => {
    if (!isMobile || !open) return effectiveOptions;
    const q = search.trim().toLowerCase();
    if (!q) return effectiveOptions;
    return effectiveOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [effectiveOptions, isMobile, open, search]);

  const showSearch = searchable !== false && isMobile;
  const selectedLabel = effectiveOptions.find((o) => o.value === value)?.label ?? (displayEmpty && !value ? placeholder : "");

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    onChange(e.target.value);
  };

  const handleMobileSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch("");
  };

  if (!isMobile) {
    return (
      <Box>
        {label && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", textAlign: "right" }}>
            {label}
          </Typography>
        )}
        <Select
          value={value}
          onChange={handleSelectChange}
          fullWidth={fullWidth}
          size={size}
          displayEmpty={displayEmpty}
          disabled={disabled}
          renderValue={(v) => (v ? effectiveOptions.find((o) => o.value === v)?.label : placeholder)}
          sx={{
            fontFamily: "var(--font-cairo)",
            textAlign: "right",
            "& .MuiSelect-select": { textAlign: "right" },
            ...sx,
          }}
          MenuProps={{ PaperProps: { sx: { direction: "rtl" } } }}
        >
          {displayEmpty && <MenuItem value="">{placeholder}</MenuItem>}
          {options.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </Select>
      </Box>
    );
  }

  return (
    <Box>
      {label && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", textAlign: "right" }}>
          {label}
        </Typography>
      )}
      <TextField
        fullWidth={fullWidth}
        size={size}
        value={selectedLabel}
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        placeholder={placeholder}
        inputProps={{ readOnly: true }}
        InputProps={{
          sx: { fontFamily: "var(--font-cairo)", textAlign: "right", cursor: disabled ? "default" : "pointer" },
        }}
        sx={{ ...sx }}
      />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xs"
        fullWidth
        dir="rtl"
        PaperProps={{
          sx: {
            direction: "rtl",
            textAlign: "right",
            borderRadius: 2,
            maxHeight: "80vh",
          },
        }}
        sx={{ "& .MuiDialog-container": { alignItems: "center" } }}
      >
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>
          {dialogTitle ?? label ?? "اختر"}
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
          {showSearch && (
            <Box sx={{ px: 2, pb: 1, flexShrink: 0 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="بحث..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  sx: { fontFamily: "var(--font-cairo)", textAlign: "right" },
                }}
              />
            </Box>
          )}
          <List sx={{ overflow: "auto", flex: 1, py: 0, maxHeight: 320 }}>
            {filteredOptions.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center", fontFamily: "var(--font-cairo)" }}>
                لا توجد نتائج
              </Typography>
            ) : (
              filteredOptions.map((o) => (
                <ListItemButton
                  key={o.value}
                  selected={o.value === value}
                  onClick={() => handleMobileSelect(o.value)}
                  sx={{
                    fontFamily: "var(--font-cairo)",
                    textAlign: "right",
                    justifyContent: "flex-end",
                  }}
                >
                  {o.label}
                </ListItemButton>
              ))
            )}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
