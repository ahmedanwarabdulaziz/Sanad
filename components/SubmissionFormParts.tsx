"use client";

import type { ReactNode } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  FormHelperText,
  IconButton,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SendIcon from "@mui/icons-material/Send";
import { ALLOWED_FILE_EXTENSIONS, MAX_FILES, MAX_TOTAL_FILE_BYTES } from "@/lib/submitProject";

// The look of the public multi-step forms (submit-project and real-estate-partnership).

export const NAVY = "#154278";
export const GOLD = "#C29B40";

export const inputStyles = {
  "& .MuiOutlinedInput-root": {
    backgroundColor: "#f9fafb",
    borderRadius: 2,
    // 16px stops iOS Safari from zooming the page when a field is focused.
    fontSize: "1rem",
    "& fieldset": { borderColor: "#e0e3e8" },
    "&:hover fieldset": { borderColor: GOLD },
    "&.Mui-focused fieldset": { borderColor: GOLD, borderWidth: 2 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: NAVY, fontWeight: 700 },
};

function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`
    : `${Math.max(1, Math.round(bytes / 1024))} ك.ب`;
}

/** Returns the reason these files can't be added, or an empty string when they can. */
export function fileSelectionError(current: File[], incoming: File[]) {
  const merged = [...current, ...incoming];
  if (merged.length > MAX_FILES) {
    return `يمكنك إرفاق ${MAX_FILES} ملفات كحد أقصى.`;
  }
  if (incoming.some((file) => !ALLOWED_FILE_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)))) {
    return "نوع الملف غير مدعوم. استخدم PDF أو Word أو PowerPoint أو Excel أو صورة.";
  }
  if (merged.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_FILE_BYTES) {
    return "الحجم الإجمالي للملفات يتجاوز 4 ميجابايت. يمكنك وضع رابط للملفات الأكبر.";
  }
  return "";
}

export function ToggleChips({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <Chip
            key={option}
            label={option}
            clickable
            aria-pressed={isSelected}
            onClick={() => onToggle(option)}
            icon={isSelected ? <CheckCircleIcon /> : undefined}
            sx={{
              height: 44,
              borderRadius: 2,
              px: 0.5,
              fontSize: "0.95rem",
              fontWeight: isSelected ? 700 : 500,
              bgcolor: isSelected ? "rgba(21, 66, 120, 0.08)" : "#f9fafb",
              color: isSelected ? NAVY : "#4b5563",
              border: `1.5px solid ${isSelected ? NAVY : "#e0e3e8"}`,
              "& .MuiChip-icon": { color: NAVY },
              "&:hover": { bgcolor: "rgba(21, 66, 120, 0.05)" },
            }}
          />
        );
      })}
    </Box>
  );
}

export function FieldLabel({ children, optional }: { children: ReactNode; optional?: boolean }) {
  return (
    <Typography sx={{ fontWeight: 700, color: NAVY, mb: 1, fontSize: "0.95rem" }}>
      {children}
      {optional && (
        <Typography component="span" sx={{ color: "#9ca3af", fontWeight: 400, fontSize: "0.85rem", ms: 0.75 }}>
          {" "}(اختياري)
        </Typography>
      )}
    </Typography>
  );
}

export function FormHero({ title, description }: { title: string; description: string }) {
  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, #0f3057 0%, ${NAVY} 60%, #1d5592 100%)`,
        color: "#fff",
        pt: { xs: 12, md: 16 },
        pb: { xs: 10, md: 14 },
        textAlign: "center",
      }}
    >
      <Container maxWidth="md">
        <Typography sx={{ color: GOLD, fontWeight: 700, mb: 1.5, fontSize: { xs: "0.9rem", md: "1rem" } }}>
          سند برو كابيتال للمشروعات
        </Typography>
        <Typography
          component="h1"
          sx={{ fontWeight: 800, fontSize: { xs: "1.75rem", sm: "2.25rem", md: "3rem" }, lineHeight: 1.35, mb: 2 }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            color: "rgba(255,255,255,0.85)",
            fontSize: { xs: "1rem", md: "1.2rem" },
            lineHeight: 1.9,
            maxWidth: 680,
            mx: "auto",
          }}
        >
          {description}
        </Typography>
      </Container>
    </Box>
  );
}

export function FormSuccess({ message, reference }: { message: string; reference: string }) {
  return (
    <Box sx={{ p: { xs: 3, md: 6 }, textAlign: "center" }}>
      <CheckCircleIcon sx={{ fontSize: 72, color: "#16a34a", mb: 2 }} />
      <Typography component="h2" sx={{ fontWeight: 800, color: NAVY, fontSize: { xs: "1.5rem", md: "1.9rem" }, mb: 1.5 }}>
        تم استلام طلبك بنجاح
      </Typography>
      <Typography sx={{ color: "#4b5563", lineHeight: 1.9, mb: 3, maxWidth: 480, mx: "auto" }}>{message}</Typography>
      <Box sx={{ display: "inline-block", bgcolor: "#f4f5f7", borderRadius: 2, px: 4, py: 2, mb: 3 }}>
        <Typography sx={{ color: "#6b7280", fontSize: "0.85rem" }}>رقم الطلب</Typography>
        <Typography dir="ltr" sx={{ fontWeight: 800, color: NAVY, fontSize: "1.25rem", letterSpacing: 1 }}>
          {reference}
        </Typography>
      </Box>
      <Box>
        <Button href="/" sx={{ color: NAVY, fontWeight: 700, fontSize: "1rem" }}>
          العودة إلى الموقع
        </Button>
      </Box>
    </Box>
  );
}

export function FormProgress({
  steps,
  step,
}: {
  steps: { title: string; subtitle: string }[];
  step: number;
}) {
  return (
    <Box sx={{ px: { xs: 2.5, md: 5 }, pt: { xs: 3, md: 4 } }}>
      <Box sx={{ display: "flex", gap: 0.75, mb: 2 }} role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1}>
        {steps.map((item, index) => (
          <Box
            key={item.title}
            sx={{
              flex: 1,
              height: 5,
              borderRadius: 3,
              bgcolor: index <= step ? GOLD : "#e5e7eb",
              transition: "background-color 0.3s",
            }}
          />
        ))}
      </Box>
      <Typography sx={{ color: "#6b7280", fontSize: "0.85rem", mb: 0.5 }}>
        الخطوة {step + 1} من {steps.length}
      </Typography>
      <Typography component="h2" sx={{ fontWeight: 800, color: NAVY, fontSize: { xs: "1.35rem", md: "1.6rem" } }}>
        {steps[step].title}
      </Typography>
      <Typography sx={{ color: "#6b7280", fontSize: "0.95rem" }}>{steps[step].subtitle}</Typography>
    </Box>
  );
}

/**
 * Hidden from people; only bots fill this in. The neutral name and visibility:hidden keep browser
 * autofill and password managers away, since they would otherwise fill it in for real applicants.
 */
export function HoneypotField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Box sx={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", visibility: "hidden" }} aria-hidden="true">
      <input
        type="text"
        name="sanad_check"
        tabIndex={-1}
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Box>
  );
}

export function RequestTypeCards({
  label,
  ariaLabel,
  options,
  icons,
  value,
  error,
  onSelect,
}: {
  label: string;
  ariaLabel: string;
  options: { value: string; label: string; description: string }[];
  icons: Record<string, ReactNode>;
  value: string;
  error?: string;
  onSelect: (value: string) => void;
}) {
  return (
    <Box data-field="requestType">
      <FieldLabel>{label}</FieldLabel>
      <Box sx={{ display: "grid", gap: 1.5 }} role="radiogroup" aria-label={ariaLabel}>
        {options.map((type) => {
          const isSelected = value === type.value;
          return (
            <Box
              key={type.value}
              component="button"
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(type.value)}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1.5,
                width: "100%",
                p: 2,
                textAlign: "right",
                fontFamily: "inherit",
                cursor: "pointer",
                borderRadius: 2,
                border: `2px solid ${isSelected ? NAVY : "#e0e3e8"}`,
                bgcolor: isSelected ? "rgba(21, 66, 120, 0.05)" : "#fff",
                transition: "all 0.2s",
                "&:hover": { borderColor: isSelected ? NAVY : GOLD },
                "&:focus-visible": { outline: `2px solid ${GOLD}`, outlineOffset: 2 },
              }}
            >
              <Box
                sx={{
                  flexShrink: 0,
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: isSelected ? NAVY : "#f4f5f7",
                  color: isSelected ? "#fff" : NAVY,
                  transition: "all 0.2s",
                }}
              >
                {icons[type.value]}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: "1rem" }}>{type.label}</Typography>
                <Typography sx={{ color: "#6b7280", fontSize: "0.875rem", lineHeight: 1.7 }}>
                  {type.description}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Box>
  );
}

export function FileAttachments({
  label,
  files,
  error,
  onAdd,
  onRemove,
}: {
  label: string;
  files: File[];
  error: string;
  onAdd: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <Box>
      <FieldLabel optional>{label}</FieldLabel>
      <Box
        component="label"
        sx={{
          display: "block",
          border: "2px dashed #d1d5db",
          borderRadius: 2,
          p: 2.5,
          textAlign: "center",
          bgcolor: "#f9fafb",
          cursor: "pointer",
          "&:hover": { borderColor: GOLD, bgcolor: "rgba(194, 155, 64, 0.05)" },
        }}
      >
        <input
          type="file"
          multiple
          hidden
          accept={ALLOWED_FILE_EXTENSIONS.join(",")}
          onChange={onAdd}
        />
        <CloudUploadOutlinedIcon sx={{ fontSize: 36, color: GOLD, mb: 0.5 }} />
        <Typography sx={{ color: NAVY, fontWeight: 700 }}>اضغط لاختيار الملفات</Typography>
        <Typography sx={{ color: "#9ca3af", fontSize: "0.8rem", lineHeight: 1.7 }}>
          حتى {MAX_FILES} ملفات بإجمالي 4 ميجابايت: PDF أو Word أو PowerPoint أو Excel أو صور
        </Typography>
      </Box>
      {error && <FormHelperText error>{error}</FormHelperText>}
      {files.map((file, index) => (
        <Box
          key={`${file.name}-${index}`}
          sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, color: NAVY, minWidth: 0 }}
        >
          <AttachFileIcon fontSize="small" sx={{ flexShrink: 0 }} />
          <Typography noWrap sx={{ fontSize: "0.9rem", flex: 1, minWidth: 0 }}>{file.name}</Typography>
          <Typography sx={{ fontSize: "0.8rem", color: "#9ca3af", flexShrink: 0 }}>
            {formatFileSize(file.size)}
          </Typography>
          <IconButton aria-label={`حذف ${file.name}`} onClick={() => onRemove(index)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
    </Box>
  );
}

/** Pinned to the bottom of the screen on phones so "next" is always in reach. */
export function FormActions({
  step,
  stepCount,
  isSubmitting,
  onBack,
  onNext,
  onSubmit,
}: {
  step: number;
  stepCount: number;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  const isLastStep = step === stepCount - 1;
  return (
    <Box
      sx={{
        position: { xs: "sticky", md: "static" },
        bottom: 0,
        zIndex: 5,
        display: "flex",
        gap: 1.5,
        px: { xs: 2.5, md: 5 },
        py: 2,
        pb: { xs: "max(16px, env(safe-area-inset-bottom))", md: 4 },
        bgcolor: "#fff",
        borderTop: { xs: "1px solid #eef0f3", md: "none" },
        borderRadius: { xs: "0 0 12px 12px", md: "0 0 16px 16px" },
      }}
    >
      {step > 0 && (
        <Button
          onClick={onBack}
          disabled={isSubmitting}
          startIcon={<ArrowForwardIcon />}
          sx={{ color: "#4b5563", fontWeight: 700, fontSize: "1rem", minHeight: 52, px: 2, "& .MuiButton-startIcon": { ml: 1, mr: 0 } }}
        >
          السابق
        </Button>
      )}
      <Button
        onClick={isLastStep ? onSubmit : onNext}
        disabled={isSubmitting}
        variant="contained"
        endIcon={
          isSubmitting ? (
            <CircularProgress size={20} sx={{ color: "#fff" }} />
          ) : isLastStep ? (
            <SendIcon sx={{ transform: "scaleX(-1)" }} />
          ) : (
            <ArrowBackIcon />
          )
        }
        sx={{
          flex: 1,
          minHeight: 52,
          bgcolor: NAVY,
          color: "#fff",
          borderRadius: 2,
          fontWeight: 700,
          fontSize: "1.05rem",
          boxShadow: "none",
          "& .MuiButton-endIcon": { mr: 1, ml: 0 },
          "&:hover": { bgcolor: "#0d2b4d", boxShadow: "none" },
        }}
      >
        {isSubmitting ? "جارٍ الإرسال" : isLastStep ? "إرسال الطلب" : "التالي"}
      </Button>
    </Box>
  );
}

export function FormAside({
  title = "ماذا يحدث بعد الإرسال؟",
  steps,
  note,
  children,
}: {
  title?: string;
  steps: { title: string; description: string }[];
  note: string;
  children?: ReactNode;
}) {
  return (
    <Box
      sx={{
        bgcolor: "#fff",
        borderRadius: { xs: 3, md: 4 },
        p: 3,
        boxShadow: "0 10px 30px rgba(15, 48, 87, 0.06)",
        position: { md: "sticky" },
        top: { md: 88 },
      }}
    >
      {children}
      <Typography component="h2" sx={{ fontWeight: 800, color: NAVY, fontSize: "1.1rem", mb: 2 }}>
        {title}
      </Typography>
      {steps.map((item, index) => (
        <Box key={item.title} sx={{ display: "flex", gap: 1.5, mb: 2 }}>
          <Box
            sx={{
              flexShrink: 0,
              width: 28,
              height: 28,
              borderRadius: "50%",
              bgcolor: "rgba(194, 155, 64, 0.15)",
              color: "#8f6f24",
              fontWeight: 800,
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {index + 1}
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, color: "#1f2937", fontSize: "0.95rem" }}>{item.title}</Typography>
            <Typography sx={{ color: "#6b7280", fontSize: "0.85rem", lineHeight: 1.7 }}>{item.description}</Typography>
          </Box>
        </Box>
      ))}
      <Box sx={{ display: "flex", gap: 1, pt: 2, borderTop: "1px solid #eef0f3", color: "#6b7280" }}>
        <LockOutlinedIcon sx={{ fontSize: 18, mt: 0.25, flexShrink: 0 }} />
        <Typography sx={{ fontSize: "0.8rem", lineHeight: 1.7 }}>{note}</Typography>
      </Box>
    </Box>
  );
}
