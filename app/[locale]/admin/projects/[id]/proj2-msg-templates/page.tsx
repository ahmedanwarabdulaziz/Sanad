"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useProject } from "../layout";
import { Button, CircularProgress, Alert, Chip } from "@mui/material";
import { WhatsApp, SaveOutlined } from "@mui/icons-material";

const fieldSx: React.CSSProperties = {
  width: "100%",
  minHeight: "160px",
  background: "rgba(15,23,42,0.6)",
  border: "1px solid rgba(148,163,184,0.15)",
  borderRadius: "12px",
  color: "#e2e8f0",
  fontFamily: "var(--font-cairo), sans-serif",
  fontSize: "14px",
  padding: "14px",
  resize: "vertical",
  lineHeight: 1.8,
  direction: "rtl",
  outline: "none",
  boxSizing: "border-box",
};

const QUOTE_VARS = [
  { label: "اسم العميل", value: "{{اسم_العميل}}" },
  { label: "رقم العرض", value: "{{رقم_العرض}}" },
  { label: "الإجمالي", value: "{{الإجمالي}}" },
  { label: "رابط PDF", value: "{{رابط_PDF}}" },
  { label: "تاريخ العرض", value: "{{تاريخ_العرض}}" },
  { label: "صالح حتى", value: "{{صالح_حتى}}" },
];

const INVOICE_VARS = [
  { label: "اسم العميل", value: "{{اسم_العميل}}" },
  { label: "رقم الفاتورة", value: "{{رقم_الفاتورة}}" },
  { label: "الإجمالي", value: "{{الإجمالي}}" },
  { label: "رابط PDF", value: "{{رابط_PDF}}" },
  { label: "تاريخ الفاتورة", value: "{{تاريخ_الفاتورة}}" },
];

const PREVIEW_VALS: Record<string, string> = {
  "{{اسم_العميل}}": "أحمد محمد",
  "{{رقم_العرض}}": "QT-007",
  "{{رقم_الفاتورة}}": "INV-003",
  "{{الإجمالي}}": "25,000",
  "{{رابط_PDF}}": "https://tinyurl.com/sanad-pdf",
  "{{تاريخ_العرض}}": "22-03-2025",
  "{{صالح_حتى}}": "22-04-2025",
  "{{تاريخ_الفاتورة}}": "22-03-2025",
};

function applyPreview(text: string) {
  let result = text;
  Object.entries(PREVIEW_VALS).forEach(([k, v]) => { result = result.replaceAll(k, v); });
  return result;
}

function TemplateCard({
  title, icon, type, vars, initialContent, projectId, onSaved,
}: {
  title: string; icon: React.ReactNode; type: string; vars: typeof QUOTE_VARS;
  initialContent: string; projectId: string; onSaved: () => void;
}) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setContent(initialContent); }, [initialContent]);

  const insertVar = (v: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const next = content.slice(0, start) + v + content.slice(end);
    setContent(next);
    setTimeout(() => {
      el.focus();
      const pos = start + v.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-msg-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data?.error || "فشل الحفظ — تأكد من إنشاء الجدول في Supabase");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved();
    } catch (err: any) {
      setSaveError(err?.message || "خطأ في الاتصال");
    } finally {
      setSaving(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.9) 100%)",
    border: "1px solid rgba(148,163,184,0.12)",
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "24px",
  };

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        {icon}
        <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#f1f5f9", fontFamily: "var(--font-cairo)" }}>{title}</h2>
      </div>

      {/* Variable chips */}
      <div style={{ marginBottom: "14px" }}>
        <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>
          اضغط على المتغير لإدراجه في النص:
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {vars.map((v) => (
            <Chip
              key={v.value}
              label={v.label}
              size="small"
              onClick={() => insertVar(v.value)}
              sx={{
                background: "rgba(59,130,246,0.15)",
                color: "#60a5fa",
                border: "1px solid rgba(59,130,246,0.3)",
                fontFamily: "var(--font-cairo)",
                fontSize: "12px",
                cursor: "pointer",
                "&:hover": { background: "rgba(59,130,246,0.28)" },
              }}
            />
          ))}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={fieldSx}
        onFocus={(e) => { e.target.style.borderColor = "rgba(59,130,246,0.5)"; }}
        onBlur={(e) => { e.target.style.borderColor = "rgba(148,163,184,0.15)"; }}
      />

      {/* Live preview */}
      <div style={{ marginTop: "12px", marginBottom: "16px" }}>
        <p style={{ margin: "0 0 6px", fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          معاينة مباشرة
        </p>
        <div style={{
          background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.15)",
          borderRadius: "12px",
          padding: "14px 16px",
          whiteSpace: "pre-wrap",
          fontSize: "13px",
          color: "#a7f3d0",
          fontFamily: "var(--font-cairo)",
          lineHeight: 1.8,
          direction: "rtl",
        }}>
          {applyPreview(content) || <span style={{ color: "#475569" }}>ابدأ الكتابة لرؤية المعاينة...</span>}
        </div>
      </div>

      {/* Save */}
      {saveError && (
        <div style={{ marginBottom: "10px", padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", color: "#fca5a5", fontSize: "13px", fontFamily: "var(--font-cairo)", direction: "rtl" }}>
          ❌ {saveError}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "12px" }}>
        {saved && <span style={{ color: "#34d399", fontFamily: "var(--font-cairo)", fontSize: "13px" }}>✅ تم الحفظ</span>}
        <Button
          variant="contained"
          onClick={save}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <SaveOutlined />}
          sx={{
            borderRadius: "10px",
            fontFamily: "var(--font-cairo)",
            fontWeight: 600,
            textTransform: "none",
            background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
            "&:hover": { background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)" },
            "&:disabled": { opacity: 0.6 },
          }}
        >
          حفظ القالب
        </Button>
      </div>
    </div>
  );
}

export default function MsgTemplatesPage() {
  const { projectId } = useProject();
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-msg-templates`);
      const data = await res.json();
      setTemplates(data);
    } catch {
      setError("تعذر تحميل القوالب");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const pageStyle: React.CSSProperties = {
    maxWidth: "760px",
    margin: "0 auto",
    direction: "rtl",
    fontFamily: "var(--font-cairo), sans-serif",
  };

  const sectionHeaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
    marginTop: "8px",
    paddingBottom: "12px",
    borderBottom: "1px solid rgba(148,163,184,0.1)",
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: "80px" }}>
      <CircularProgress sx={{ color: "#3b82f6" }} />
    </div>
  );

  return (
    <div style={pageStyle}>
      {/* Page title */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "clamp(22px,4vw,28px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 6px", fontFamily: "var(--font-cairo)" }}>
          قوالب الرسائل
        </h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "14px", fontFamily: "var(--font-cairo)" }}>
          خصّص نصوص رسائل واتساب لعروض الأسعار وفواتير البيع — المتغيرات تُستبدل تلقائياً عند الإرسال
        </p>
      </div>

      {error && <Alert severity="error" sx={{ mb: 3, fontFamily: "var(--font-cairo)" }}>{error}</Alert>}

      {/* Quotes section */}
      <div style={sectionHeaderStyle}>
        <div style={{ width: "8px", height: "28px", background: "linear-gradient(135deg, #3b82f6, #6366f1)", borderRadius: "4px" }} />
        <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#e2e8f0", fontFamily: "var(--font-cairo)" }}>عروض الأسعار</h2>
      </div>

      <TemplateCard
        title="رسالة واتساب — عرض السعر"
        icon={<WhatsApp sx={{ color: "#22c55e", fontSize: 22 }} />}
        type="quote_whatsapp"
        vars={QUOTE_VARS}
        initialContent={templates.quote_whatsapp ?? ""}
        projectId={projectId}
        onSaved={fetchTemplates}
      />

      {/* Invoices section */}
      <div style={{ ...sectionHeaderStyle, marginTop: "16px" }}>
        <div style={{ width: "8px", height: "28px", background: "linear-gradient(135deg, #f59e0b, #ef4444)", borderRadius: "4px" }} />
        <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#e2e8f0", fontFamily: "var(--font-cairo)" }}>فواتير البيع</h2>
      </div>

      <TemplateCard
        title="رسالة واتساب — فاتورة البيع"
        icon={<WhatsApp sx={{ color: "#22c55e", fontSize: 22 }} />}
        type="invoice_whatsapp"
        vars={INVOICE_VARS}
        initialContent={templates.invoice_whatsapp ?? ""}
        projectId={projectId}
        onSaved={fetchTemplates}
      />
    </div>
  );
}
