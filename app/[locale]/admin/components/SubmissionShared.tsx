"use client";

import { useState, type ReactNode } from "react";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { AttachFileOutlined, WhatsApp } from "@mui/icons-material";
import {
  whatsappLink,
  type EmailLogEntry,
  type SubmissionFile,
  type SubmissionKind,
} from "@/lib/submissionWorkflow";

const FONT = "var(--font-cairo), Cairo, sans-serif";

export const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    backgroundColor: "#e8e8e3",
    color: "#111827",
    fontFamily: FONT,
    "& fieldset": { borderColor: "#d1d0c6" },
    "&:hover fieldset": { borderColor: "#154278" },
    "&.Mui-focused fieldset": { borderColor: "#154278" },
  },
  "& .MuiInputLabel-root": {
    color: "#4b5563",
    fontFamily: FONT,
    "&.Mui-focused": { color: "#154278" },
  },
  "& .MuiInputBase-input": { textAlign: "right" },
  "& .MuiSelect-icon": { color: "#4b5563" },
};

export const headCellSx = { color: "#ffffff", fontFamily: FONT, fontWeight: 700, fontSize: "14px" };
export const cellSx = { fontFamily: FONT, color: "#111827", fontSize: "14px" };
export const primaryButtonSx = {
  fontFamily: FONT,
  fontWeight: 600,
  textTransform: "none",
  color: "#ffffff",
  background: "#154278",
  boxShadow: "none",
  "&:hover": { background: "#0d2b4f", boxShadow: "none" },
};
export const dialogPaperProps = {
  sx: { borderRadius: "8px", direction: "rtl" as const, color: "#111827", width: "100%" },
};

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Africa/Cairo",
  });
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  });
}

export function StatusChip({ label, color }: { label: string; color: string }) {
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        fontFamily: FONT,
        fontWeight: 600,
        color,
        background: `${color}1f`,
        border: `1px solid ${color}55`,
      }}
    />
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px",
        flexWrap: "wrap",
        gap: "16px",
        background: "#e8e8e3",
        padding: "24px 32px",
        borderRadius: "8px",
        border: "1px solid #d1d0c6",
      }}
    >
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#111827", margin: "0 0 4px 0", fontFamily: FONT }}>
          {title}
        </h1>
        <p style={{ fontSize: "14px", color: "#4b5563", margin: 0, fontFamily: FONT }}>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export function DetailSection({ title, rows }: { title: string; rows: [string, ReactNode][] }) {
  const visible = rows.filter(([, value]) => value);
  if (visible.length === 0) return null;
  return (
    <section style={{ marginBottom: 20 }}>
      <SectionTitle>{title}</SectionTitle>
      {visible.map(([label, value]) => (
        <div
          key={label}
          style={{ display: "flex", gap: 12, padding: "6px 0", fontFamily: FONT, fontSize: 14, flexWrap: "wrap" }}
        >
          <span style={{ color: "#6b7280", minWidth: 130 }}>{label}</span>
          <span style={{ flex: "1 1 240px", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{value}</span>
        </div>
      ))}
    </section>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3
      style={{
        margin: "0 0 6px",
        paddingBottom: 6,
        borderBottom: "2px solid #C29B40",
        color: "#154278",
        fontSize: 15,
        fontWeight: 700,
        fontFamily: FONT,
      }}
    >
      {children}
    </h3>
  );
}

export function SubmissionFiles({ files }: { files: SubmissionFile[] }) {
  if (files.length === 0) return null;
  return (
    <section style={{ marginBottom: 20 }}>
      <SectionTitle>الملفات المرفقة</SectionTitle>
      {files.map((file) => (
        <a
          key={file.key}
          href={`/api/submissions/files?key=${encodeURIComponent(file.key)}&name=${encodeURIComponent(file.name)}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 0",
            color: "#154278",
            fontFamily: FONT,
            fontSize: 14,
            overflowWrap: "anywhere",
          }}
        >
          <AttachFileOutlined sx={{ fontSize: 18 }} />
          {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
        </a>
      ))}
    </section>
  );
}

export function EmailHistory({ log, labelFor }: { log: EmailLogEntry[]; labelFor: (type: string) => string }) {
  if (log.length === 0) return null;
  return (
    <section style={{ marginBottom: 20 }}>
      <SectionTitle>الرسائل المرسلة</SectionTitle>
      {log.map((entry) => (
        <details key={entry.sent_at} style={{ padding: "6px 0", fontFamily: FONT, fontSize: 14 }}>
          <summary style={{ cursor: "pointer" }}>
            {labelFor(entry.type)} · {formatDateTime(entry.sent_at)} · {entry.sent_by}
          </summary>
          <div
            style={{
              marginTop: 8,
              padding: 12,
              borderRadius: 8,
              background: "#f4f5f7",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            <strong>{entry.subject}</strong>
            {"\n\n"}
            {entry.body}
          </div>
        </details>
      ))}
    </section>
  );
}

export function NotesEditor({
  kind,
  id,
  initialNotes,
  onSaved,
}: {
  kind: SubmissionKind;
  id: string;
  initialNotes: string;
  onSaved: (notes: string) => void;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/submissions/${kind}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      onSaved(notes);
    } catch {
      setError("فشل في حفظ الملاحظات");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <SectionTitle>ملاحظات داخلية</SectionTitle>
      {error && <Alert severity="error" sx={{ mb: 1, fontFamily: FONT }}>{error}</Alert>}
      <TextField
        fullWidth
        multiline
        minRows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="لا تظهر لمقدم الطلب"
        sx={{ ...fieldSx, mt: 1 }}
      />
      <Button
        onClick={save}
        disabled={saving || notes === initialNotes}
        sx={{ mt: 1, fontFamily: FONT, fontWeight: 600, color: "#154278" }}
      >
        {saving ? "جارٍ الحفظ..." : "حفظ الملاحظات"}
      </Button>
    </section>
  );
}

/** Opens the applicant's WhatsApp chat in a new tab; nothing is sent until the admin presses send there. */
export function WhatsAppButton({ phone, text }: { phone: string; text: string }) {
  const href = whatsappLink(phone, text);
  return (
    <Button
      variant="outlined"
      startIcon={<WhatsApp sx={{ ml: 1, mr: -0.5 }} />}
      href={href ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      disabled={!href}
      sx={{
        fontFamily: FONT,
        fontWeight: 600,
        color: "#128C7E",
        borderColor: "#128C7E",
        "&:hover": { borderColor: "#128C7E", background: "rgba(18,140,126,0.08)" },
      }}
    >
      {href ? "واتساب" : "الرقم غير صالح لواتساب"}
    </Button>
  );
}

export function EmailComposeDialog({
  title,
  recipient,
  phone,
  subject,
  body,
  sending,
  error,
  onSubjectChange,
  onBodyChange,
  onSend,
  onClose,
  children,
}: {
  title: string;
  recipient: string;
  phone: string;
  subject: string;
  body: string;
  sending: boolean;
  error: string | null;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onSend: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  return (
    <Dialog open onClose={sending ? undefined : onClose} maxWidth="md" PaperProps={dialogPaperProps}>
      <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        <p style={{ margin: "0 0 16px", fontFamily: FONT, fontSize: 14, color: "#4b5563" }}>
          إلى: <span dir="ltr">{recipient}</span>
        </p>
        {error && <Alert severity="error" sx={{ mb: 2, fontFamily: FONT }}>{error}</Alert>}
        {children}
        <TextField
          fullWidth
          label="عنوان الرسالة"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          sx={{ ...fieldSx, mb: 2 }}
        />
        <TextField
          fullWidth
          multiline
          minRows={10}
          label="نص الرسالة"
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          sx={fieldSx}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
        <Button onClick={onClose} disabled={sending} sx={{ fontFamily: FONT, color: "#4b5563" }}>
          إلغاء
        </Button>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <WhatsAppButton phone={phone} text={body} />
          <Button
            variant="contained"
            onClick={onSend}
            disabled={sending || !subject.trim() || !body.trim()}
            sx={primaryButtonSx}
          >
            {sending ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "إرسال الإيميل"}
          </Button>
        </div>
      </DialogActions>
    </Dialog>
  );
}
