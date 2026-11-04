"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Checkbox,
  Container,
  FormControlLabel,
  FormHelperText,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import {
  AVAILABLE_DOCUMENTS,
  EMPTY_SUBMISSION,
  FUNDING_RANGES,
  IDEA_STAGES,
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
import {
  FieldLabel,
  FileAttachments,
  fileSelectionError,
  FormActions,
  FormAside,
  FormHero,
  FormProgress,
  FormSuccess,
  GOLD,
  HoneypotField,
  inputStyles,
  RequestTypeCards,
  ToggleChips,
} from "./SubmissionFormParts";

const STEPS = [
  { title: "نوع الطلب", subtitle: "عرّفنا على طلبك ومشروعك" },
  { title: "تفاصيل المشروع", subtitle: "حدثنا عن مشروعك وما يميزه" },
  { title: "الاستثمار المطلوب", subtitle: "ما الذي يحتاجه مشروعك للانطلاق أو النمو؟" },
  { title: "بيانات التواصل", subtitle: "كيف يمكن لفريقنا الوصول إليك؟" },
];

const NEXT_STEPS = [
  { title: "استلام الطلب", description: "يصلك تأكيد على بريدك الإلكتروني برقم الطلب." },
  { title: "الدراسة والتقييم", description: "يراجع فريقنا بيانات المشروع وفق معايير الطلب والجدوى وقابلية التنفيذ." },
  { title: "التواصل معك", description: "نرد عليك عبر البريد الإلكتروني خلال 3 أيام عمل لإبلاغك بنتيجة المراجعة والخطوة التالية." },
];

const REQUEST_ICONS: Record<string, React.ReactNode> = {
  idea: <LightbulbOutlinedIcon />,
  investment: <StorefrontOutlinedIcon />,
  expansion: <TrendingUpIcon />,
};

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
    const problem = fileSelectionError(files, incoming);
    setFileError(problem);
    if (!problem) setFiles([...files, ...incoming]);
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
      <FormHero
        title="لديك فكرة مشروع أو مشروع قائم؟"
        description="سواء كنت تبحث عن استثمار أو شريك أو خطة للتوسع، شاركنا تفاصيل مشروعك ليدرسها فريقنا ضمن منهج مؤسسي يربط القرار بالبيانات."
      />

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
              <FormSuccess
                reference={reference}
                message={`شكرًا لك ${values.fullName}. أرسلنا تأكيدًا إلى بريدك الإلكتروني، وسيراجع فريقنا بيانات مشروعك ويرد عليك عبر البريد الإلكتروني خلال 3 أيام عمل.`}
              />
            ) : (
              <>
                <FormProgress steps={STEPS} step={step} />
                <HoneypotField value={honeypot} onChange={setHoneypot} />

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
                            <RequestTypeCards
                              label="ما نوع طلبك؟"
                              ariaLabel="نوع الطلب"
                              options={REQUEST_TYPES}
                              icons={REQUEST_ICONS}
                              value={values.requestType}
                              error={errors.requestType}
                              onSelect={(value) => setField("requestType", value)}
                            />
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
                            <FileAttachments
                              label="مرفقات المشروع"
                              files={files}
                              error={fileError}
                              onAdd={addFiles}
                              onRemove={(index) => {
                                setFileError("");
                                setFiles((prev) => prev.filter((_, i) => i !== index));
                              }}
                            />
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

                <FormActions
                  step={step}
                  stepCount={STEPS.length}
                  isSubmitting={isSubmitting}
                  onBack={goBack}
                  onNext={goNext}
                  onSubmit={handleSubmit}
                />
              </>
            )}
          </Box>

          {/* What happens next */}
          <FormAside steps={NEXT_STEPS} note="تُستخدم بياناتك لدراسة طلبك والتواصل معك فقط." />
        </Box>
      </Container>
    </Box>
  );
}
