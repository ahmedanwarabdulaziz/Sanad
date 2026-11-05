"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import LandscapeOutlinedIcon from "@mui/icons-material/LandscapeOutlined";
import {
  BUDGET_RANGES,
  BUYER_PAYMENT_NOTE,
  EMPTY_REAL_ESTATE_SUBMISSION,
  estimatedLandTotal,
  keepChosenPathOnly,
  LAND_PAYMENT_STATUSES,
  LAND_USES,
  LICENSE_STATUSES,
  OWNERSHIP_STATUSES,
  PARTNERSHIP_MODELS,
  PURCHASE_PURPOSES,
  PURCHASE_TIMELINES,
  REAL_ESTATE_REQUEST_TYPES,
  REAL_ESTATE_STEP_FIELDS,
  RealEstateErrors,
  RealEstateSubmission,
  UNIT_AREAS,
  UNIT_TYPES,
  validateRealEstateSubmission,
} from "@/lib/realEstateRequest";
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
  NAVY,
  RequestTypeCards,
  ToggleChips,
} from "./SubmissionFormParts";

const STEPS = [
  { title: "نوع الطلب والموقع", subtitle: "عرّفنا على طلبك والمكان المطلوب بالتحديد" },
  { title: "التفاصيل", subtitle: "البيانات التي يحتاجها فريقنا لدراسة طلبك" },
  { title: "بيانات التواصل", subtitle: "كيف يمكن لفريقنا الوصول إليك؟" },
];

const NEXT_STEPS = [
  { title: "استلام الطلب", description: "يصلك تأكيد على بريدك الإلكتروني برقم الطلب." },
  { title: "الدراسة والتنسيق", description: "يراجع فريقنا طلبك ويدرس الموقع وإمكانية التنسيق مع المهتمين." },
  { title: "التواصل معك", description: "نرد عليك عبر البريد الإلكتروني خلال 3 أيام عمل لإبلاغك بنتيجة المراجعة والخطوة التالية." },
];

const REQUEST_ICONS: Record<string, React.ReactNode> = {
  land_owner: <LandscapeOutlinedIcon />,
  unit_buyer: <ApartmentOutlinedIcon />,
};

export default function RealEstateRequestForm({ cities }: { cities: string[] }) {
  const router = useRouter();
  const [values, setValues] = useState<RealEstateSubmission>(EMPTY_REAL_ESTATE_SUBMISSION);
  const [errors, setErrors] = useState<RealEstateErrors>({});
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

  const setField = <K extends keyof RealEstateSubmission>(field: K, value: RealEstateSubmission[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const togglePartnershipModel = (option: string) => {
    const current = values.partnershipModels;
    setField(
      "partnershipModels",
      current.includes(option) ? current.filter((v) => v !== option) : [...current, option]
    );
  };

  const textFieldProps = (field: keyof RealEstateSubmission) => ({
    fullWidth: true,
    name: field,
    value: values[field] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setField(field, e.target.value as never),
    error: Boolean(errors[field]),
    helperText: errors[field],
    sx: inputStyles,
  });

  const selectField = (field: keyof RealEstateSubmission, label: string, options: string[]) => (
    <TextField {...textFieldProps(field)} select label={label} required>
      {options.map((option) => (
        <MenuItem key={option} value={option}>{option}</MenuItem>
      ))}
    </TextField>
  );

  const goNext = () => {
    const all = validateRealEstateSubmission(values, cities);
    const found: RealEstateErrors = {};
    for (const field of REAL_ESTATE_STEP_FIELDS[step]) {
      if (all[field]) found[field] = all[field];
    }
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const firstField = REAL_ESTATE_STEP_FIELDS[step].find((field) => found[field]);
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
    const found = validateRealEstateSubmission(values, cities);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      // A mismatch from an earlier step can't be seen from here, so jump back to it.
      const badStep = REAL_ESTATE_STEP_FIELDS.findIndex((fields) => fields.some((field) => found[field]));
      if (badStep !== -1) setStep(badStep);
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    try {
      const formData = new FormData();
      formData.append("payload", JSON.stringify(keepChosenPathOnly(values)));
      formData.append("startedAt", String(startedAt.current));
      formData.append("website", honeypot);
      if (values.requestType === "land_owner") files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/real-estate-request", { method: "POST", body: formData });
      const result = await response.json();
      // The city was turned off while this page was open: reload the list and ask for another one.
      if (result.errors?.city) {
        setValues((prev) => ({ ...prev, city: "" }));
        setErrors({ city: result.errors.city });
        setStep(0);
        router.refresh();
        return;
      }
      if (!response.ok) throw new Error(result.error);
      setReference(result.reference);
    } catch (error) {
      console.error(error);
      setSubmitError("تعذر إرسال طلبك. تأكد من اتصالك بالإنترنت ثم حاول مرة أخرى؛ بياناتك ما زالت محفوظة في الصفحة.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLandOwner = values.requestType === "land_owner";
  const landTotal = estimatedLandTotal(values);

  return (
    <Box sx={{ bgcolor: "#f4f5f7", minHeight: "100vh", pb: { xs: 4, md: 10 } }}>
      <FormHero
        title="لديك أرض أو تبحث عن وحدة سكنية؟"
        description="في المجتمعات العمرانية الجديدة، نساعد أصحاب الأراضي في العثور على شريك للبناء، وننسق بين الراغبين في شراء وحدات بنظام اتحاد الملاك، ونتولى الإدارة والإشراف."
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
                message={`شكرًا لك ${values.fullName}. أرسلنا تأكيدًا إلى بريدك الإلكتروني، وسيراجع فريقنا طلبك ويرد عليك عبر البريد الإلكتروني خلال 3 أيام عمل.`}
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
                              options={REAL_ESTATE_REQUEST_TYPES}
                              icons={REQUEST_ICONS}
                              value={values.requestType}
                              error={errors.requestType}
                              onSelect={(value) => setField("requestType", value)}
                            />
                            {cities.length > 0 ? (
                              selectField("city", "المجتمع العمراني", cities)
                            ) : (
                              <Box
                                role="status"
                                data-field="city"
                                sx={{ p: 2, borderRadius: 2, bgcolor: "rgba(194, 155, 64, 0.1)", border: `1px solid ${GOLD}` }}
                              >
                                <Typography sx={{ color: NAVY, fontWeight: 700, fontSize: "0.95rem" }}>
                                  لا توجد مدن متاحة لتقديم الطلبات حاليًا. يرجى المحاولة لاحقًا.
                                </Typography>
                              </Box>
                            )}
                            <TextField {...textFieldProps("district")} label="الحي أو المجاورة" required />
                          </>
                        )}

                        {step === 1 && isLandOwner && (
                          <>
                            <TextField
                              {...textFieldProps("landArea")}
                              label="مساحة الأرض (م²)"
                              required
                              slotProps={{ htmlInput: { dir: "ltr", inputMode: "decimal" } }}
                            />
                            <TextField
                              {...textFieldProps("pricePerMeter")}
                              label="السعر التقديري للمتر (جنيه)"
                              required
                              slotProps={{ htmlInput: { dir: "ltr", inputMode: "decimal" } }}
                            />
                            <Box
                              aria-live="polite"
                              sx={{
                                p: 2,
                                borderRadius: 2,
                                bgcolor: "rgba(194, 155, 64, 0.1)",
                                border: `1px solid ${GOLD}`,
                              }}
                            >
                              <Typography sx={{ color: "#6b7280", fontSize: "0.85rem" }}>إجمالي السعر التقديري للأرض</Typography>
                              <Typography sx={{ color: NAVY, fontWeight: 800, fontSize: "1.25rem" }}>
                                {landTotal ? `${landTotal.toLocaleString("en-US")} جنيه` : "—"}
                              </Typography>
                            </Box>
                            <TextField
                              {...textFieldProps("buildingRatio")}
                              label="النسبة البنائية (%)"
                              required
                              helperText={errors.buildingRatio || "النسبة المسموح بالبناء عليها من مساحة الأرض"}
                              slotProps={{ htmlInput: { dir: "ltr", inputMode: "decimal" } }}
                            />
                            <TextField
                              {...textFieldProps("floors")}
                              label="عدد الأدوار"
                              required
                              slotProps={{ htmlInput: { dir: "ltr", inputMode: "numeric" } }}
                            />
                            {selectField("ownershipStatus", "موقف الملكية", OWNERSHIP_STATUSES)}
                            {selectField("landUse", "نشاط الأرض", LAND_USES)}
                            {selectField("licenseStatus", "موقف رخصة البناء", LICENSE_STATUSES)}
                            {selectField("paymentStatus", "موقف سداد الأرض", LAND_PAYMENT_STATUSES)}
                            <Box data-field="partnershipModels">
                              <FieldLabel>شكل الشراكة المطلوب</FieldLabel>
                              <ToggleChips
                                options={PARTNERSHIP_MODELS}
                                selected={values.partnershipModels}
                                onToggle={togglePartnershipModel}
                              />
                              {errors.partnershipModels && <FormHelperText error>{errors.partnershipModels}</FormHelperText>}
                            </Box>
                            <FileAttachments
                              label="مرفقات الأرض"
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
                              label="رابط المستندات (اختياري)"
                              placeholder="https://"
                              helperText={errors.documentsLink || "للملفات الأكبر: Google Drive أو Dropbox أو غيرهما"}
                              slotProps={{ htmlInput: { dir: "ltr", inputMode: "url" } }}
                            />
                          </>
                        )}

                        {step === 1 && !isLandOwner && (
                          <>
                            {selectField("unitType", "نوع الوحدة", UNIT_TYPES)}
                            {selectField("unitArea", "المساحة المطلوبة", UNIT_AREAS)}
                            {selectField("budgetRange", "الميزانية التقريبية", BUDGET_RANGES)}
                            <Box
                              sx={{
                                p: 2,
                                borderRadius: 2,
                                bgcolor: "rgba(194, 155, 64, 0.1)",
                                border: `1px solid ${GOLD}`,
                              }}
                            >
                              <Typography sx={{ color: "#6b7280", fontSize: "0.85rem" }}>طريقة السداد</Typography>
                              <Typography sx={{ color: NAVY, fontWeight: 700, fontSize: "0.95rem" }}>{BUYER_PAYMENT_NOTE}</Typography>
                            </Box>
                            {selectField("purchaseTimeline", "موعد الشراء", PURCHASE_TIMELINES)}
                            {selectField("purpose", "الغرض من الشراء", PURCHASE_PURPOSES)}
                          </>
                        )}

                        {step === 1 && (
                          <TextField {...textFieldProps("message")} label="ملاحظات إضافية (اختياري)" multiline minRows={3} />
                        )}

                        {step === 2 && (
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
                                    من سند بالشراكة أو البناء أو تخصيص وحدة.
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
          <FormAside steps={NEXT_STEPS} note="تُستخدم بياناتك لدراسة طلبك والتواصل معك فقط.">
            <Box sx={{ mb: 2.5, pb: 2.5, borderBottom: "1px solid #eef0f3" }}>
              <Typography component="h2" sx={{ fontWeight: 800, color: NAVY, fontSize: "1.1rem", mb: 1 }}>
                كيف يعمل اتحاد الملاك؟
              </Typography>
              <Typography sx={{ color: "#6b7280", fontSize: "0.85rem", lineHeight: 1.8 }}>
                تنسق الشركة بين المهتمين بالشراء في نفس الموقع، وتتولى إدارة المشروع والإشراف عليه، ويكون السداد على
                دفعات حسب الإنجاز ومراحل التنفيذ.
              </Typography>
            </Box>
          </FormAside>
        </Box>
      </Container>
    </Box>
  );
}
