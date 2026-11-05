"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import AdminAuthenticatedLayout from "../components/AdminAuthenticatedLayout";
import {
  cellSx,
  DetailSection,
  dialogPaperProps,
  EmailComposeDialog,
  EmailHistory,
  fieldSx,
  formatDate,
  headCellSx,
  NotesEditor,
  PageHeader,
  primaryButtonSx,
  StatusChip,
  SubmissionFiles,
  WhatsAppButton,
} from "../components/SubmissionShared";
import { REAL_ESTATE_REQUEST_TYPES } from "@/lib/realEstateRequest";
import {
  PROJECT_EMAIL_FLOW,
  PROJECT_STATUS_LABELS,
  REAL_ESTATE_DECLINE_REASONS,
  realEstateEmailDraft,
  type EmailLogEntry,
  type ProjectEmailType,
  type ProjectStatus,
  type SubmissionFile,
} from "@/lib/submissionWorkflow";

const FONT = "var(--font-cairo), Cairo, sans-serif";

interface RealEstateRequest {
  id: string;
  reference: string;
  status: ProjectStatus;
  next_action_due_at: string | null;
  request_type: string;
  city: string;
  district: string;
  land_area: number | null;
  price_per_meter: number | null;
  estimated_total: number | null;
  building_ratio: number | null;
  floors: number | null;
  ownership_status: string;
  land_use: string;
  license_status: string;
  payment_status: string;
  partnership_models: string[];
  documents_link: string;
  unit_type: string;
  unit_area: string;
  budget_range: string;
  purchase_timeline: string;
  purpose: string;
  message: string;
  full_name: string;
  phone: string;
  email: string;
  files: SubmissionFile[];
  notes: string;
  email_log: EmailLogEntry[];
  created_at: string;
}

interface Compose {
  type: ProjectEmailType;
  reason: string;
  subject: string;
  body: string;
}

const EMAIL_ORDER: ProjectEmailType[] = ["initial_acceptance", "call_invitation", "decline"];
const SHORT_TYPE_LABELS: Record<string, string> = { land_owner: "صاحب أرض", unit_buyer: "مشتري وحدة" };
const emailTypeLabel = (type: string) => PROJECT_EMAIL_FLOW[type as ProjectEmailType]?.label ?? type;
const isOverdue = (value: string) => new Date(value).getTime() < Date.now();
const withUnit = (value: number | null, unit: string) =>
  value === null ? "" : `${Number(value).toLocaleString("en-US")} ${unit}`;

function DueDate({ value }: { value: string | null }) {
  if (!value) return <span style={{ color: "#9ca3af" }}>—</span>;
  const overdue = isOverdue(value);
  return (
    <span style={{ color: overdue ? "#dc2626" : "#111827", fontWeight: overdue ? 700 : 400 }}>
      {formatDate(value)}
      {overdue && " (متأخر)"}
    </span>
  );
}

export default function RealEstateRequestsPage() {
  const [submissions, setSubmissions] = useState<RealEstateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<RealEstateRequest | null>(null);
  const [compose, setCompose] = useState<Compose | null>(null);
  const [sending, setSending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch("/api/submissions/real_estate");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setSubmissions(data.submissions);
    } catch {
      setError("فشل في تحميل الطلبات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const replaceSubmission = (updated: RealEstateRequest) => {
    setSubmissions((list) => list.map((item) => (item.id === updated.id ? updated : item)));
    setSelected(updated);
  };

  const draftFor = (submission: RealEstateRequest, type: ProjectEmailType, reason: string) =>
    realEstateEmailDraft(
      type,
      { fullName: submission.full_name, requestType: submission.request_type, reference: submission.reference },
      reason
    );

  const openCompose = (type: ProjectEmailType) => {
    if (!selected) return;
    const reason = REAL_ESTATE_DECLINE_REASONS[0].value;
    setComposeError(null);
    setCompose({ type, reason, ...draftFor(selected, type, reason) });
  };

  const sendEmail = async () => {
    if (!selected || !compose) return;
    setSending(true);
    setComposeError(null);
    try {
      const res = await fetch(`/api/submissions/real_estate/${selected.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: compose.type, subject: compose.subject, body: compose.body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setComposeError(data.error);
        return;
      }
      replaceSubmission(data.submission);
      setCompose(null);
      setSuccess(`تم إرسال الرسالة إلى ${selected.email}`);
    } catch {
      setComposeError("فشل في إرسال الرسالة");
    } finally {
      setSending(false);
    }
  };

  const visible = submissions.filter(
    (item) =>
      (statusFilter === "ALL" || item.status === statusFilter) &&
      (typeFilter === "ALL" || item.request_type === typeFilter)
  );

  return (
    <AdminAuthenticatedLayout>
      <div style={{ maxWidth: "1600px", margin: "0 auto", width: "100%" }}>
        <PageHeader title="الطلبات العقارية" subtitle="أصحاب الأراضي الباحثون عن شريك، والراغبون في الشراء بنظام اتحاد الملاك">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <TextField
              select
              size="small"
              label="النوع"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              sx={{ ...fieldSx, minWidth: 170 }}
            >
              <MenuItem value="ALL" sx={{ fontFamily: FONT }}>الكل</MenuItem>
              {REAL_ESTATE_REQUEST_TYPES.map(({ value }) => (
                <MenuItem key={value} value={value} sx={{ fontFamily: FONT }}>{SHORT_TYPE_LABELS[value]}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="الحالة"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ ...fieldSx, minWidth: 170 }}
            >
              <MenuItem value="ALL" sx={{ fontFamily: FONT }}>كل الطلبات</MenuItem>
              {Object.entries(PROJECT_STATUS_LABELS).map(([value, { label }]) => (
                <MenuItem key={value} value={value} sx={{ fontFamily: FONT }}>{label}</MenuItem>
              ))}
            </TextField>
          </div>
        </PageHeader>

        {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, fontFamily: FONT }}>{error}</Alert>}
        {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2, fontFamily: FONT }}>{success}</Alert>}

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <CircularProgress sx={{ color: "#154278" }} />
          </div>
        ) : visible.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 24px",
              borderRadius: "8px",
              background: "#e8e8e3",
              border: "1px solid #d1d0c6",
              color: "#4b5563",
              fontFamily: FONT,
            }}
          >
            لا توجد طلبات
          </div>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #d1d0c6", borderRadius: "8px" }}>
            <Table sx={{ minWidth: 800 }} aria-label="real estate requests table">
              <TableHead sx={{ background: "#154278" }}>
                <TableRow>
                  {["رقم الطلب", "مقدم الطلب", "النوع", "الموقع", "تاريخ التقديم", "موعد الرد", "الحالة"].map((title) => (
                    <TableCell key={title} sx={headCellSx}>{title}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map((item) => (
                  <TableRow
                    key={item.id}
                    onClick={() => setSelected(item)}
                    sx={{ cursor: "pointer", backgroundColor: "#e8e8e3", "&:hover": { backgroundColor: "#d1d0c6" } }}
                  >
                    <TableCell sx={cellSx}><span dir="ltr">{item.reference}</span></TableCell>
                    <TableCell sx={{ ...cellSx, fontWeight: 600 }}>{item.full_name}</TableCell>
                    <TableCell sx={cellSx}>{SHORT_TYPE_LABELS[item.request_type]}</TableCell>
                    <TableCell sx={cellSx}>{item.city} - {item.district}</TableCell>
                    <TableCell sx={cellSx}>{formatDate(item.created_at)}</TableCell>
                    <TableCell sx={cellSx}><DueDate value={item.next_action_due_at} /></TableCell>
                    <TableCell sx={cellSx}><StatusChip {...PROJECT_STATUS_LABELS[item.status]} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </div>

      {selected && (
        <Dialog open onClose={() => setSelected(null)} maxWidth="md" PaperProps={dialogPaperProps}>
          <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
            <span>{selected.full_name} - {SHORT_TYPE_LABELS[selected.request_type]}</span>
            <StatusChip {...PROJECT_STATUS_LABELS[selected.status]} />
          </DialogTitle>
          <DialogContent>
            <DetailSection
              title="بيانات مقدم الطلب"
              rows={[
                ["رقم الطلب", <span key="reference" dir="ltr">{selected.reference}</span>],
                ["الهاتف", <span key="phone" dir="ltr">{selected.phone}</span>],
                ["البريد الإلكتروني", <span key="email" dir="ltr">{selected.email}</span>],
              ]}
            />
            <DetailSection
              title="الموقع"
              rows={[
                ["المجتمع العمراني", selected.city],
                ["الحي أو المجاورة", selected.district],
              ]}
            />
            {selected.request_type === "land_owner" ? (
              <DetailSection
                title="بيانات الأرض"
                rows={[
                  ["المساحة", withUnit(selected.land_area, "م²")],
                  ["السعر التقديري للمتر", withUnit(selected.price_per_meter, "جنيه")],
                  ["إجمالي السعر التقديري", withUnit(selected.estimated_total, "جنيه")],
                  ["النسبة البنائية", withUnit(selected.building_ratio, "%")],
                  ["عدد الأدوار", selected.floors === null ? "" : String(selected.floors)],
                  ["موقف الملكية", selected.ownership_status],
                  ["نشاط الأرض", selected.land_use],
                  ["موقف رخصة البناء", selected.license_status],
                  ["موقف سداد الأرض", selected.payment_status],
                  ["شكل الشراكة", selected.partnership_models.join("، ")],
                  ["رابط المستندات", selected.documents_link],
                  ["ملاحظات", selected.message],
                ]}
              />
            ) : (
              <DetailSection
                title="الوحدة المطلوبة"
                rows={[
                  ["نوع الوحدة", selected.unit_type],
                  ["المساحة", selected.unit_area],
                  ["الميزانية التقريبية", selected.budget_range],
                  ["موعد الشراء", selected.purchase_timeline],
                  ["الغرض", selected.purpose],
                  ["ملاحظات", selected.message],
                ]}
              />
            )}
            <SubmissionFiles files={selected.files} />
            <EmailHistory log={selected.email_log} labelFor={emailTypeLabel} />
            <NotesEditor
              key={selected.id}
              kind="real_estate"
              id={selected.id}
              initialNotes={selected.notes}
              onSaved={(notes) => replaceSubmission({ ...selected, notes })}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
            <Button onClick={() => setSelected(null)} sx={{ fontFamily: FONT, color: "#4b5563" }}>إغلاق</Button>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <WhatsAppButton
                phone={selected.phone}
                text={selected.email_log.at(-1)?.body ?? `مرحبًا ${selected.full_name}،`}
              />
              {EMAIL_ORDER.filter((type) => PROJECT_EMAIL_FLOW[type].from.includes(selected.status)).map((type) =>
                type === "decline" ? (
                  <Button key={type} variant="outlined" color="error" onClick={() => openCompose(type)} sx={{ fontFamily: FONT, fontWeight: 600 }}>
                    {PROJECT_EMAIL_FLOW[type].label}
                  </Button>
                ) : (
                  <Button key={type} variant="contained" onClick={() => openCompose(type)} sx={primaryButtonSx}>
                    {PROJECT_EMAIL_FLOW[type].label}
                  </Button>
                )
              )}
            </div>
          </DialogActions>
        </Dialog>
      )}

      {selected && compose && (
        <EmailComposeDialog
          title={`رسالة: ${PROJECT_EMAIL_FLOW[compose.type].label}`}
          recipient={selected.email}
          phone={selected.phone}
          subject={compose.subject}
          body={compose.body}
          sending={sending}
          error={composeError}
          onSubjectChange={(subject) => setCompose({ ...compose, subject })}
          onBodyChange={(body) => setCompose({ ...compose, body })}
          onSend={sendEmail}
          onClose={() => setCompose(null)}
        >
          {compose.type === "decline" && (
            <TextField
              select
              fullWidth
              label="سبب الاعتذار"
              value={compose.reason}
              onChange={(e) =>
                setCompose({ ...compose, reason: e.target.value, ...draftFor(selected, "decline", e.target.value) })
              }
              sx={{ ...fieldSx, mb: 2 }}
            >
              {REAL_ESTATE_DECLINE_REASONS.map((reason) => (
                <MenuItem key={reason.value} value={reason.value} sx={{ fontFamily: FONT }}>{reason.label}</MenuItem>
              ))}
            </TextField>
          )}
        </EmailComposeDialog>
      )}
    </AdminAuthenticatedLayout>
  );
}
