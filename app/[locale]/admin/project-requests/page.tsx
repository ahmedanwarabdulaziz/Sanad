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
} from "../components/SubmissionShared";
import { REQUEST_TYPES } from "@/lib/submitProject";
import {
  DECLINE_REASONS,
  PROJECT_EMAIL_FLOW,
  PROJECT_STATUS_LABELS,
  projectEmailDraft,
  type EmailLogEntry,
  type ProjectEmailType,
  type ProjectStatus,
  type SubmissionFile,
} from "@/lib/submissionWorkflow";

const FONT = "var(--font-cairo), Cairo, sans-serif";

interface ProjectSubmission {
  id: string;
  reference: string;
  status: ProjectStatus;
  next_action_due_at: string | null;
  request_type: string;
  project_name: string;
  sector: string;
  location: string;
  description: string;
  advantage: string;
  idea_stage: string;
  founded_year: string;
  annual_revenue: string;
  team_size: string;
  funding_range: string;
  use_of_funds: string;
  support_types: string[];
  available_documents: string[];
  documents_link: string;
  full_name: string;
  phone: string;
  email: string;
  company: string;
  job_title: string;
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
const requestTypeLabel = (value: string) => REQUEST_TYPES.find((type) => type.value === value)?.label ?? value;
const emailTypeLabel = (type: string) => PROJECT_EMAIL_FLOW[type as ProjectEmailType]?.label ?? type;

const isOverdue = (value: string) => new Date(value).getTime() < Date.now();

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

export default function ProjectRequestsPage() {
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<ProjectSubmission | null>(null);
  const [compose, setCompose] = useState<Compose | null>(null);
  const [sending, setSending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch("/api/submissions/project");
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

  const replaceSubmission = (updated: ProjectSubmission) => {
    setSubmissions((list) => list.map((item) => (item.id === updated.id ? updated : item)));
    setSelected(updated);
  };

  const draftFor = (submission: ProjectSubmission, type: ProjectEmailType, reason: string) =>
    projectEmailDraft(
      type,
      { fullName: submission.full_name, projectName: submission.project_name, reference: submission.reference },
      reason
    );

  const openCompose = (type: ProjectEmailType) => {
    if (!selected) return;
    const reason = DECLINE_REASONS[0].value;
    setComposeError(null);
    setCompose({ type, reason, ...draftFor(selected, type, reason) });
  };

  const sendEmail = async () => {
    if (!selected || !compose) return;
    setSending(true);
    setComposeError(null);
    try {
      const res = await fetch(`/api/submissions/project/${selected.id}/email`, {
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

  const visible = statusFilter === "ALL" ? submissions : submissions.filter((item) => item.status === statusFilter);

  return (
    <AdminAuthenticatedLayout>
      <div style={{ maxWidth: "1600px", margin: "0 auto", width: "100%" }}>
        <PageHeader title="طلبات المشروعات" subtitle="الطلبات المقدمة من صفحة تقديم المشروعات، ومتابعة الرد عليها">
          <TextField
            select
            size="small"
            label="الحالة"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ ...fieldSx, minWidth: 200 }}
          >
            <MenuItem value="ALL" sx={{ fontFamily: FONT }}>كل الطلبات</MenuItem>
            {Object.entries(PROJECT_STATUS_LABELS).map(([value, { label }]) => (
              <MenuItem key={value} value={value} sx={{ fontFamily: FONT }}>{label}</MenuItem>
            ))}
          </TextField>
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
            <Table sx={{ minWidth: 800 }} aria-label="project requests table">
              <TableHead sx={{ background: "#154278" }}>
                <TableRow>
                  {["رقم الطلب", "المشروع", "مقدم الطلب", "النوع", "تاريخ التقديم", "موعد الرد", "الحالة"].map((title) => (
                    <TableCell key={title} align="right" sx={headCellSx}>{title}</TableCell>
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
                    <TableCell align="right" sx={cellSx}><span dir="ltr">{item.reference}</span></TableCell>
                    <TableCell align="right" sx={{ ...cellSx, fontWeight: 600 }}>{item.project_name}</TableCell>
                    <TableCell align="right" sx={cellSx}>{item.full_name}</TableCell>
                    <TableCell align="right" sx={cellSx}>{requestTypeLabel(item.request_type)}</TableCell>
                    <TableCell align="right" sx={cellSx}>{formatDate(item.created_at)}</TableCell>
                    <TableCell align="right" sx={cellSx}><DueDate value={item.next_action_due_at} /></TableCell>
                    <TableCell align="right" sx={cellSx}><StatusChip {...PROJECT_STATUS_LABELS[item.status]} /></TableCell>
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
            <span>{selected.project_name}</span>
            <StatusChip {...PROJECT_STATUS_LABELS[selected.status]} />
          </DialogTitle>
          <DialogContent>
            <DetailSection
              title="بيانات مقدم الطلب"
              rows={[
                ["الاسم", selected.full_name],
                ["الهاتف", <span key="phone" dir="ltr">{selected.phone}</span>],
                ["البريد الإلكتروني", <span key="email" dir="ltr">{selected.email}</span>],
                ["الشركة", selected.company],
                ["المسمى الوظيفي", selected.job_title],
              ]}
            />
            <DetailSection
              title="بيانات المشروع"
              rows={[
                ["رقم الطلب", <span key="reference" dir="ltr">{selected.reference}</span>],
                ["نوع الطلب", requestTypeLabel(selected.request_type)],
                ["القطاع", selected.sector],
                ["الموقع", selected.location],
                ["مرحلة الفكرة", selected.idea_stage],
                ["سنة التأسيس", selected.founded_year],
                ["الإيرادات السنوية", selected.annual_revenue],
                ["حجم فريق العمل", selected.team_size],
                ["وصف المشروع", selected.description],
                ["ما يميز المشروع", selected.advantage],
              ]}
            />
            <DetailSection
              title="الاستثمار المطلوب"
              rows={[
                ["حجم التمويل", selected.funding_range],
                ["استخدام التمويل", selected.use_of_funds],
                ["نوع الدعم", selected.support_types.join("، ")],
                ["المستندات المتوفرة", selected.available_documents.join("، ")],
                ["رابط المستندات", selected.documents_link],
              ]}
            />
            <SubmissionFiles files={selected.files} />
            <EmailHistory log={selected.email_log} labelFor={emailTypeLabel} />
            <NotesEditor
              key={selected.id}
              kind="project"
              id={selected.id}
              initialNotes={selected.notes}
              onSaved={(notes) => replaceSubmission({ ...selected, notes })}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
            <Button onClick={() => setSelected(null)} sx={{ fontFamily: FONT, color: "#4b5563" }}>إغلاق</Button>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
              {DECLINE_REASONS.map((reason) => (
                <MenuItem key={reason.value} value={reason.value} sx={{ fontFamily: FONT }}>{reason.label}</MenuItem>
              ))}
            </TextField>
          )}
        </EmailComposeDialog>
      )}
    </AdminAuthenticatedLayout>
  );
}
