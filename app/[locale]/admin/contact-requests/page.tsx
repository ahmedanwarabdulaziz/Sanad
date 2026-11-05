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
import {
  CONTACT_STATUS_LABELS,
  type ContactStatus,
  type EmailLogEntry,
  type SubmissionFile,
} from "@/lib/submissionWorkflow";

const FONT = "var(--font-cairo), Cairo, sans-serif";

interface ContactSubmission {
  id: string;
  reference: string;
  status: ContactStatus;
  request_type: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  job_title: string;
  city: string;
  message: string;
  newsletter_agreed: boolean;
  files: SubmissionFile[];
  notes: string;
  email_log: EmailLogEntry[];
  created_at: string;
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  investmentPartnership: "استثمار / شراكة",
  realEstateDev: "التطوير العقاري",
  marbleGranite: "الرخام والجرانيت",
  interlockTiles: "الإنترلوك والبلاط الآلي",
  crusherProducts: "نواتج الكسارات",
  operationalExp: "خبرة تشغيلية / استشارات",
  teaser_request: "طلب الملف التعريفي",
  other: "أخرى",
};

const requestTypeLabel = (value: string) => REQUEST_TYPE_LABELS[value] ?? value;

export default function ContactRequestsPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<ContactSubmission | null>(null);
  const [compose, setCompose] = useState<{ subject: string; body: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch("/api/submissions/contact");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setSubmissions(data.submissions);
    } catch {
      setError("فشل في تحميل الرسائل");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const replaceSubmission = (updated: ContactSubmission) => {
    setSubmissions((list) => list.map((item) => (item.id === updated.id ? updated : item)));
    setSelected(updated);
  };

  const changeStatus = async (status: string) => {
    if (!selected) return;
    setError(null);
    try {
      const res = await fetch(`/api/submissions/contact/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      replaceSubmission(data.submission);
    } catch {
      setError("فشل في تحديث الحالة");
    }
  };

  const sendReply = async () => {
    if (!selected || !compose) return;
    setSending(true);
    setComposeError(null);
    try {
      const res = await fetch(`/api/submissions/contact/${selected.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "reply", subject: compose.subject, body: compose.body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setComposeError(data.error);
        return;
      }
      replaceSubmission(data.submission);
      setCompose(null);
      setSuccess(`تم إرسال الرد إلى ${selected.email}`);
    } catch {
      setComposeError("فشل في إرسال الرد");
    } finally {
      setSending(false);
    }
  };

  const visible = statusFilter === "ALL" ? submissions : submissions.filter((item) => item.status === statusFilter);

  return (
    <AdminAuthenticatedLayout>
      <div style={{ maxWidth: "1600px", margin: "0 auto", width: "100%" }}>
        <PageHeader title="رسائل التواصل" subtitle="الرسائل الواردة من نموذج التواصل وطلبات الملف التعريفي">
          <TextField
            select
            size="small"
            label="الحالة"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ ...fieldSx, minWidth: 200 }}
          >
            <MenuItem value="ALL" sx={{ fontFamily: FONT }}>كل الرسائل</MenuItem>
            {Object.entries(CONTACT_STATUS_LABELS).map(([value, { label }]) => (
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
            لا توجد رسائل
          </div>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #d1d0c6", borderRadius: "8px" }}>
            <Table sx={{ minWidth: 700 }} aria-label="contact requests table">
              <TableHead sx={{ background: "#154278" }}>
                <TableRow>
                  {["المرسل", "الموضوع", "الهاتف", "التاريخ", "الحالة"].map((title) => (
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
                    <TableCell sx={{ ...cellSx, fontWeight: 600 }}>{item.name}</TableCell>
                    <TableCell sx={cellSx}>{requestTypeLabel(item.request_type)}</TableCell>
                    <TableCell sx={cellSx}><span dir="ltr">{item.phone}</span></TableCell>
                    <TableCell sx={cellSx}>{formatDate(item.created_at)}</TableCell>
                    <TableCell sx={cellSx}><StatusChip {...CONTACT_STATUS_LABELS[item.status]} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </div>

      {selected && (
        <Dialog open onClose={() => setSelected(null)} maxWidth="md" PaperProps={dialogPaperProps}>
          <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <span>{selected.name}</span>
            <TextField
              select
              size="small"
              label="الحالة"
              value={selected.status}
              onChange={(e) => changeStatus(e.target.value)}
              sx={{ ...fieldSx, minWidth: 160 }}
            >
              {Object.entries(CONTACT_STATUS_LABELS).map(([value, { label }]) => (
                <MenuItem key={value} value={value} sx={{ fontFamily: FONT }}>{label}</MenuItem>
              ))}
            </TextField>
          </DialogTitle>
          <DialogContent>
            <DetailSection
              title="بيانات المرسل"
              rows={[
                ["رقم الرسالة", <span key="reference" dir="ltr">{selected.reference}</span>],
                ["الموضوع", requestTypeLabel(selected.request_type)],
                ["الهاتف", <span key="phone" dir="ltr">{selected.phone}</span>],
                ["البريد الإلكتروني", <span key="email" dir="ltr">{selected.email}</span>],
                ["المدينة", selected.city],
                ["الشركة", selected.company],
                ["المسمى الوظيفي", selected.job_title],
                ["القائمة البريدية", selected.newsletter_agreed ? "وافق على الاشتراك" : ""],
              ]}
            />
            <DetailSection title="الرسالة" rows={[["النص", selected.message]]} />
            <SubmissionFiles files={selected.files} />
            <EmailHistory log={selected.email_log} labelFor={() => "رد"} />
            <NotesEditor
              key={selected.id}
              kind="contact"
              id={selected.id}
              initialNotes={selected.notes}
              onSaved={(notes) => replaceSubmission({ ...selected, notes })}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
            <Button onClick={() => setSelected(null)} sx={{ fontFamily: FONT, color: "#4b5563" }}>إغلاق</Button>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <WhatsAppButton
                phone={selected.phone}
                text={selected.email_log.at(-1)?.body ?? `مرحبًا ${selected.name}،`}
              />
              <Button
                variant="contained"
                onClick={() => {
                  setComposeError(null);
                  setCompose({ subject: "رد على رسالتكم - سند برو كابيتال", body: `مرحبًا ${selected.name}،\n\n\n\nمع تحيات،\nفريق سند برو كابيتال للمشروعات` });
                }}
                sx={primaryButtonSx}
              >
                إرسال رد
              </Button>
            </div>
          </DialogActions>
        </Dialog>
      )}

      {selected && compose && (
        <EmailComposeDialog
          title="إرسال رد"
          recipient={selected.email}
          phone={selected.phone}
          subject={compose.subject}
          body={compose.body}
          sending={sending}
          error={composeError}
          onSubjectChange={(subject) => setCompose({ ...compose, subject })}
          onBodyChange={(body) => setCompose({ ...compose, body })}
          onSend={sendReply}
          onClose={() => setCompose(null)}
        />
      )}
    </AdminAuthenticatedLayout>
  );
}
