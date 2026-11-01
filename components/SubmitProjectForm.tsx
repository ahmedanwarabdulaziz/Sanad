"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  FormControlLabel,
  FormHelperText,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SendIcon from "@mui/icons-material/Send";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import {
  ALLOWED_FILE_EXTENSIONS,
  AVAILABLE_DOCUMENTS,
  EMPTY_SUBMISSION,
  FUNDING_RANGES,
  IDEA_STAGES,
  MAX_FILES,
  MAX_TOTAL_FILE_BYTES,
  ProjectSubmission,
  REQUEST_TYPES,
  REVENUE_RANGES,
  SECTORS,
  STEP_FIELDS,
  SUPPORT_TYPES,
  SubmissionErrors,
  TEAM_SIZES,
  validateSubmission,
} from "@/lib/submitProject";

const NAVY = "#154278";
const GOLD = "#C29B40";

const STEPS = [
  { title: "نوع الطلب", subtitle: "عرّفنا على طلبك ومشروعك" },
  { title: "تفاصيل المشروع", subtitle: "حدثنا عن مشروعك وما يميزه" },
  { title: "الاستثمار المطلوب", subtitle: "ما الذي يحتاجه مشروعك للانطلاق أو النمو؟" },
  { title: "بيانات التواصل", subtitle: "كيف يمكن لفريقنا الوصول إليك؟" },
];

const NEXT_STEPS = [
  { title: "استلام الطلب", description: "يصلك تأكيد على بريدك الإلكتروني برقم الطلب." },
  { title: "الدراسة والتقييم", description: "يراجع فريقنا بيانات المشروع وفق معايير الطلب والجدوى وقابلية التنفيذ." },
  { title: "التواصل معك", description: "نتواصل معك عند الحاجة إلى تفاصيل إضافية أو لتحديد الخطوة التالية." },
];

const REQUEST_ICONS: Record<string, React.ReactNode> = {
  idea: <LightbulbOutlinedIcon />,
  investment: <StorefrontOutlinedIcon />,
  expansion: <TrendingUpIcon />,
};

const inputStyles = {
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

function ToggleChips({
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

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
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

export default function SubmitProjectForm() {
  const [values, setValues] = useState<ProjectSubmission>(EMPTY_SUBMISSION);
  const [errors, setErrors] = useState<SubmissionErrors>({});
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [reference, setReference] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const startedAt = useRef(0);
  const formTop = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    formTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step, reference]);

  const setField = <K extends keyof ProjectSubmission>(field: K, value: ProjectSubmission[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const toggleInList = (field: "supportTypes" | "availableDocuments", option: string) => {
    const current = values[field];
    setField(field, current.includes(option) ? current.filter((v) => v !== option) : [...current, option]);
  };

  const textFieldProps = (field: keyof ProjectSubmission) => ({
    fullWidth: true,
    name: field,
    value: values[field] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setField(field, e.target.value as never),
    error: Boolean(errors[field]),
    helperText: errors[field],
    sx: inputStyles,
  });

  const stepErrors = (index: number) => {
    const all = validateSubmission(values);
    const found: SubmissionErrors = {};
    for (const field of STEP_FIELDS[index]) {
      if (all[field]) found[field] = all[field];
    }
    return found;
  };

  const goNext = () => {
    const found = stepErrors(step);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const firstField = STEP_FIELDS[step].find((field) => found[field]);
      document
        .querySelector(`[data-field="${firstField}"], [name="${firstField}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setStep((current) => current + 1);
  };

  const goBack = () => {
    setErrors({});
    setStep((current) => current - 1);
  };

  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    e.target.value = "";
    const merged = [...files, ...incoming];

    if (merged.length > MAX_FILES) {
      setFileError(`يمكنك إرفاق ${MAX_FILES} ملفات كحد أقصى.`);
      return;
    }
    if (incoming.some((file) => !ALLOWED_FILE_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)))) {
      setFileError("نوع الملف غير مدعوم. استخدم PDF أو Word أو PowerPoint أو Excel أو صورة.");
      return;
    }
    if (merged.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_FILE_BYTES) {
      setFileError("الحجم الإجمالي للملفات يتجاوز 4 ميجابايت. يمكنك وضع رابط للملفات الأكبر.");
      return;
    }
    setFileError("");
    setFiles(merged);
  };

  const handleSubmit = async () => {
    const found = validateSubmission(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      // A mismatch from an earlier step can't be seen from here, so jump back to it.
      const badStep = STEP_FIELDS.findIndex((fields) => fields.some((field) => found[field]));
      if (badStep !== -1) setStep(badStep);
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    try {
      const formData = new FormData();
      formData.append("payload", JSON.stringify(values));
      formData.append("startedAt", String(startedAt.current));
      formData.append("website", honeypot);
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/submit-project", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setReference(result.reference);
    } catch (error) {
      console.error(error);
      setSubmitError("تعذر إرسال طلبك. تأكد من اتصالك بالإنترنت ثم حاول مرة أخرى؛ بياناتك ما زالت محفوظة في الصفحة.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isIdea = values.requestType === "idea";

  return (
    <Box sx={{ bgcolor: "#f4f5f7", minHeight: "100vh", pb: { xs: 4, md: 10 } }}>
      {/* Hero */}
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
            لديك فكرة مشروع أو مشروع قائم؟
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
            سواء كنت تبحث عن استثمار أو شريك أو خطة للتوسع، شاركنا تفاصيل مشروعك ليدرسها فريقنا ضمن منهج مؤسسي
            يربط القرار بالبيانات.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: { xs: -6, md: -8 }, px: { xs: 1.5, sm: 3 } }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) 300px" },
            gap: 3,
            alignItems: "start",
          }}
        >
          {/* Form card */}
          <Box
            ref={formTop}
            sx={{
              position: "relative",
              bgcolor: "#fff",
              borderRadius: { xs: 3, md: 4 },
              boxShadow: "0 20px 50px rgba(15, 48, 87, 0.12)",
              scrollMarginTop: { xs: 72, md: 88 },
              minWidth: 0,
            }}
          >
            {reference ? (
              <Box sx={{ p: { xs: 3, md: 6 }, textAlign: "center" }}>
                <CheckCircleIcon sx={{ fontSize: 72, color: "#16a34a", mb: 2 }} />
                <Typography component="h2" sx={{ fontWeight: 800, color: NAVY, fontSize: { xs: "1.5rem", md: "1.9rem" }, mb: 1.5 }}>
                  تم استلام طلبك بنجاح
                </Typography>
                <Typography sx={{ color: "#4b5563", lineHeight: 1.9, mb: 3, maxWidth: 480, mx: "auto" }}>
                  شكرًا لك {values.fullName}. أرسلنا تأكيدًا إلى بريدك الإلكتروني، وسيراجع فريقنا بيانات مشروعك ويتواصل
                  معك عند الحاجة إلى مزيد من التفاصيل.
                </Typography>
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
            ) : (
              <>
                {/* Progress */}
                <Box sx={{ px: { xs: 2.5, md: 5 }, pt: { xs: 3, md: 4 } }}>
                  <Box sx={{ display: "flex", gap: 0.75, mb: 2 }} role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
                    {STEPS.map((item, index) => (
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
                    الخطوة {step + 1} من {STEPS.length}
                  </Typography>
                  <Typography component="h2" sx={{ fontWeight: 800, color: NAVY, fontSize: { xs: "1.35rem", md: "1.6rem" } }}>
                    {STEPS[step].title}
                  </Typography>
                  <Typography sx={{ color: "#6b7280", fontSize: "0.95rem" }}>{STEPS[step].subtitle}</Typography>
                </Box>

                {/* Hidden from people; only bots fill this in. */}
                <Box sx={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", opacity: 0 }} aria-hidden="true">
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </Box>

                <Box sx={{ px: { xs: 2.5, md: 5 }, py: { xs: 3, md: 4 } }}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                        {step === 0 && (
                          <>
                            <Box data-field="requestType">
                              <FieldLabel>ما نوع طلبك؟</FieldLabel>
                              <Box sx={{ display: "grid", gap: 1.5 }} role="radiogroup" aria-label="نوع الطلب">
                                {REQUEST_TYPES.map((type) => {
                                  const isSelected = values.requestType === type.value;
                                  return (
                                    <Box
                                      key={type.value}
                                      component="button"
                                      type="button"
                                      role="radio"
                                      aria-checked={isSelected}
                                      onClick={() => setField("requestType", type.value)}
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
                                        {REQUEST_ICONS[type.value]}
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
                              {errors.requestType && <FormHelperText error>{errors.requestType}</FormHelperText>}
                            </Box>
                            <TextField {...textFieldProps("projectName")} label="اسم المشروع أو الفكرة" required />
                            <TextField {...textFieldProps("sector")} select label="القطاع" required>
                              {SECTORS.map((option) => (
                                <MenuItem key={option} value={option}>{option}</MenuItem>
                              ))}
                            </TextField>
                            <TextField {...textFieldProps("location")} label="المدينة أو المحافظة" required />
                          </>
                        )}

                        {step === 1 && (
                          <>
                            <TextField
                              {...textFieldProps("description")}
                              label="وصف المشروع"
                              required
                              multiline
                              minRows={4}
                              placeholder="ما الذي يقدمه المشروع، ولمن، وكيف يحقق الإيرادات؟"
                            />
                            <TextField
                              {...textFieldProps("advantage")}
                              label="ما الذي يميز مشروعك؟"
                              required
                              multiline
                              minRows={3}
                              placeholder="الميزة التنافسية، حجم الطلب، الخبرة، أو أي عنصر يدعم نجاح المشروع"
                            />
                            {isIdea ? (
                              <TextField {...textFieldProps("ideaStage")} select label="مرحلة الفكرة" required>
                                {IDEA_STAGES.map((option) => (
                                  <MenuItem key={option} value={option}>{option}</MenuItem>
                                ))}
                              </TextField>
                            ) : (
                              <>
                                <TextField
                                  {...textFieldProps("foundedYear")}
                                  label="سنة التأسيس"
                                  required
                                  slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 4 } }}
                                />
                                <TextField {...textFieldProps("annualRevenue")} select label="الإيرادات السنوية التقريبية" required>
                                  {REVENUE_RANGES.map((option) => (
                                    <MenuItem key={option} value={option}>{option}</MenuItem>
                                  ))}
                                </TextField>
                                <TextField {...textFieldProps("teamSize")} select label="عدد العاملين" required>
                                  {TEAM_SIZES.map((option) => (
                                    <MenuItem key={option} value={option}>{option}</MenuItem>
                                  ))}
                                </TextField>
                              </>
                            )}
                          </>
                        )}

                        {step === 2 && (
                          <>
                            <TextField {...textFieldProps("fundingRange")} select label="حجم التمويل المطلوب" required>
                              {FUNDING_RANGES.map((option) => (
                                <MenuItem key={option} value={option}>{option}</MenuItem>
                              ))}
                            </TextField>
                            <TextField
                              {...textFieldProps("useOfFunds")}
                              label="كيف سيُستخدم التمويل؟"
                              required
                              multiline
                              minRows={3}
                              placeholder="مثال: شراء معدات، رأس مال عامل، افتتاح فرع جديد"
                            />
                            <Box data-field="supportTypes">
                              <FieldLabel>ما نوع الدعم الذي تبحث عنه؟</FieldLabel>
                              <ToggleChips
                                options={SUPPORT_TYPES}
                                selected={values.supportTypes}
                                onToggle={(option) => toggleInList("supportTypes", option)}
                              />
                              {errors.supportTypes && <FormHelperText error>{errors.supportTypes}</FormHelperText>}
                            </Box>
                            <Box>
                              <FieldLabel optional>ما المتوفر لديك حاليًا؟</FieldLabel>
                              <ToggleChips
                                options={AVAILABLE_DOCUMENTS}
                                selected={values.availableDocuments}
                                onToggle={(option) => toggleInList("availableDocuments", option)}
                              />
                            </Box>
                            <Box>
                              <FieldLabel optional>مرفقات المشروع</FieldLabel>
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
                                  onChange={addFiles}
                                />
                                <CloudUploadOutlinedIcon sx={{ fontSize: 36, color: GOLD, mb: 0.5 }} />
                                <Typography sx={{ color: NAVY, fontWeight: 700 }}>اضغط لاختيار الملفات</Typography>
                                <Typography sx={{ color: "#9ca3af", fontSize: "0.8rem", lineHeight: 1.7 }}>
                                  حتى {MAX_FILES} ملفات بإجمالي 4 ميجابايت: PDF أو Word أو PowerPoint أو Excel أو صور
                                </Typography>
                              </Box>
                              {fileError && <FormHelperText error>{fileError}</FormHelperText>}
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
                                  <IconButton
                                    aria-label={`حذف ${file.name}`}
                                    onClick={() => {
                                      setFileError("");
                                      setFiles((prev) => prev.filter((_, i) => i !== index));
                                    }}
                                  >
                                    <CloseIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              ))}
                            </Box>
                            <TextField
                              {...textFieldProps("documentsLink")}
                              label="رابط لملفات المشروع (اختياري)"
                              placeholder="https://"
                              helperText={errors.documentsLink || "للملفات الأكبر: Google Drive أو Dropbox أو غيرهما"}
                              slotProps={{ htmlInput: { dir: "ltr", inputMode: "url" } }}
                            />
                          </>
                        )}

                        {step === 3 && (
                          <>
                            <TextField {...textFieldProps("fullName")} label="الاسم بالكامل" required autoComplete="name" />
                            <TextField
                              {...textFieldProps("phone")}
                              label="رقم الهاتف أو واتساب"
                              required
                              type="tel"
                              autoComplete="tel"
                              slotProps={{ htmlInput: { dir: "ltr", inputMode: "tel" } }}
                            />
                            <TextField
                              {...textFieldProps("email")}
                              label="البريد الإلكتروني"
                              required
                              type="email"
                              autoComplete="email"
                              slotProps={{ htmlInput: { dir: "ltr", inputMode: "email" } }}
                            />
                            <TextField {...textFieldProps("company")} label="اسم الشركة (اختياري)" autoComplete="organization" />
                            <TextField {...textFieldProps("jobTitle")} label="المسمى الوظيفي (اختياري)" autoComplete="organization-title" />
                            <Box data-field="consent">
                              <FormControlLabel
                                sx={{ alignItems: "flex-start", mx: 0 }}
                                control={
                                  <Checkbox
                                    checked={values.consent}
                                    onChange={(e) => setField("consent", e.target.checked)}
                                    sx={{ color: GOLD, pt: 0.25, "&.Mui-checked": { color: GOLD } }}
                                  />
                                }
                                label={
                                  <Typography sx={{ color: "#4b5563", fontSize: "0.9rem", lineHeight: 1.8 }}>
                                    أوافق على استخدام هذه البيانات لدراسة طلبي والتواصل معي، وأقر بأن تقديم الطلب لا يمثل التزامًا
                                    من سند بالتمويل أو الاستثمار.
                                  </Typography>
                                }
                              />
                              {errors.consent && <FormHelperText error>{errors.consent}</FormHelperText>}
                            </Box>
                            {submitError && <Alert severity="error">{submitError}</Alert>}
                          </>
                        )}
                      </Box>
                    </motion.div>
                  </AnimatePresence>
                </Box>

                {/* Actions: pinned to the bottom of the screen on phones so "next" is always in reach. */}
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
                      onClick={goBack}
                      disabled={isSubmitting}
                      startIcon={<ArrowForwardIcon />}
                      sx={{ color: "#4b5563", fontWeight: 700, fontSize: "1rem", minHeight: 52, px: 2, "& .MuiButton-startIcon": { ml: 1, mr: 0 } }}
                    >
                      السابق
                    </Button>
                  )}
                  <Button
                    onClick={step === STEPS.length - 1 ? handleSubmit : goNext}
                    disabled={isSubmitting}
                    variant="contained"
                    endIcon={
                      isSubmitting ? (
                        <CircularProgress size={20} sx={{ color: "#fff" }} />
                      ) : step === STEPS.length - 1 ? (
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
                    {isSubmitting ? "جارٍ الإرسال" : step === STEPS.length - 1 ? "إرسال الطلب" : "التالي"}
                  </Button>
                </Box>
              </>
            )}
          </Box>

          {/* What happens next */}
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
            <Typography component="h2" sx={{ fontWeight: 800, color: NAVY, fontSize: "1.1rem", mb: 2 }}>
              ماذا يحدث بعد الإرسال؟
            </Typography>
            {NEXT_STEPS.map((item, index) => (
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
              <Typography sx={{ fontSize: "0.8rem", lineHeight: 1.7 }}>
                تُستخدم بياناتك لدراسة طلبك والتواصل معك فقط.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
