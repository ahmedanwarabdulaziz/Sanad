"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, CircularProgress, TextField, Alert, MenuItem, Select, FormControl, InputLabel, Chip } from "@mui/material";
import { SaveOutlined, RestartAltOutlined, ContentCopyOutlined, DescriptionOutlined, PrintOutlined } from "@mui/icons-material";
import ContractPaper from "../components/ContractPaper";
import ContractPrintPreview from "../components/ContractPrintPreview";
import {
  TEMPLATE_VARS, DEFAULT_STAGE_VALUES, DEFAULT_MANUAL_VALUES, DEFAULT_TEMPLATE_BODY, DEFAULT_TEMPLATE_TITLE,
  DEFAULT_TEMPLATE_SUBTITLE, usedVariables, resolveValues,
} from "@/lib/sanad-zayed/contractTemplate";

interface Stage { id: string; name: string; sort_order: number }
interface Draft { title: string; subtitle: string; body: string; defaults: Record<string, string> }

const STAGE_VARS = TEMPLATE_VARS.filter(v => v.source === "stage");
const KNOWN = new Set(TEMPLATE_VARS.map(v => v.key));

// Illustrative contract used only for the print preview.
const SAMPLE_CONTRACT = {
  contract_date: new Date().toISOString().slice(0, 10),
  total_contract_value: 2080000,
  unit_quantity: 130,
  unit_price_at_contract: 16000,
  investor: { name: "اسم الممول (تجريبي)", national_id: "00000000000000", address_in_national_id: "عنوان الممول", phone: "01000000000" },
};

function standardDraft(): Draft {
  return { title: DEFAULT_TEMPLATE_TITLE, subtitle: DEFAULT_TEMPLATE_SUBTITLE, body: DEFAULT_TEMPLATE_BODY, defaults: { ...DEFAULT_STAGE_VALUES } };
}

function ContractTemplatesEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stages, setStages] = useState<Stage[]>([]);
  const [savedStageIds, setSavedStageIds] = useState<Set<string>>(new Set());
  const [stageId, setStageId] = useState<string>(searchParams.get("stage") ?? "");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copyFrom, setCopyFrom] = useState("");
  const [printPreview, setPrintPreview] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/sanad-zayed/stages").then(r => r.json()),
      fetch("/api/sanad-zayed/contract-templates").then(r => r.json()),
    ]).then(([s, t]) => {
      const list: Stage[] = (s.stages ?? []).sort((a: Stage, b: Stage) => a.sort_order - b.sort_order);
      setStages(list);
      setSavedStageIds(new Set((t.templates ?? []).map((x: any) => x.stage_id)));
      setStageId(prev => prev || list[0]?.id || "");
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!stageId) return;
    setDraft(null);
    setMessage(null);
    router.replace(`/admin/sanad-zayed/contract-templates?stage=${stageId}`, { scroll: false });
    fetch(`/api/sanad-zayed/contract-templates?stage_id=${stageId}`)
      .then(r => r.json())
      .then(d => {
        if (d.template) {
          setExists(true);
          setDraft({ title: d.template.title, subtitle: d.template.subtitle ?? "", body: d.template.body, defaults: { ...DEFAULT_STAGE_VALUES, ...(d.template.defaults ?? {}) } });
        } else {
          setExists(false);
          setDraft(standardDraft());
        }
      });
  }, [stageId, router]);

  const stageName = stages.find(s => s.id === stageId)?.name ?? "";

  // Preview: stage defaults + labelled sample values for per-contract data.
  const previewValues = useMemo(() => {
    if (!draft) return {};
    return { ...DEFAULT_MANUAL_VALUES, ...draft.defaults, stage_name: stageName };
  }, [draft, stageName]);

  const sampleValues = useMemo(() => {
    if (!draft) return {};
    return resolveValues({ ...SAMPLE_CONTRACT, stage: { name: stageName } }, draft.defaults, { transaction_no: "SZ-0000" });
  }, [draft, stageName]);

  const unknownVars = useMemo(() => (draft ? usedVariables(draft.body).filter(k => !KNOWN.has(k)) : []), [draft]);

  const insertVar = (key: string) => {
    if (!draft) return;
    const el = bodyRef.current;
    const token = key === "installments" ? "[[installments]]" : `{{${key}}}`;
    const start = el?.selectionStart ?? draft.body.length;
    const end = el?.selectionEnd ?? draft.body.length;
    const body = draft.body.slice(0, start) + token + draft.body.slice(end);
    setDraft({ ...draft, body });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const copyFromStage = async (sourceId: string) => {
    setCopyFrom("");
    const d = await fetch(`/api/sanad-zayed/contract-templates?stage_id=${sourceId}`).then(r => r.json());
    if (d.template) {
      setDraft({ title: d.template.title, subtitle: d.template.subtitle ?? "", body: d.template.body, defaults: { ...DEFAULT_STAGE_VALUES, ...(d.template.defaults ?? {}) } });
      setMessage({ type: "success", text: "تم نسخ القالب — راجع البيانات ثم احفظ" });
    }
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sanad-zayed/contract-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage_id: stageId, ...draft }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "تعذر الحفظ");
      setExists(true);
      setSavedStageIds(prev => new Set(prev).add(stageId));
      setMessage({ type: "success", text: "تم حفظ قالب العقد" });
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center" }}><CircularProgress sx={{ color: "#154278" }} /></div>;

  return (
    <div dir="rtl">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <DescriptionOutlined sx={{ color: "#154278" }} /> قوالب العقود
          </h1>
          <p style={{ color: "#6b7280", fontSize: 14, margin: "6px 0 0" }}>
            قالب عقد لكل مرحلة، يُملأ تلقائيًا ببيانات المستثمر والعقد ويُطبع على ورق A4. اطبع عقد أي مستثمر من صفحته بزر «طباعة العقد».
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>المرحلة</InputLabel>
            <Select label="المرحلة" value={stageId} onChange={e => setStageId(e.target.value)} sx={{ borderRadius: 2, background: "#fff" }}>
              {stages.map(s => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} {savedStageIds.has(s.id) ? "" : " — بدون قالب"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={() => setPrintPreview(true)} disabled={!draft} startIcon={<PrintOutlined />}
            sx={{ borderRadius: 2, fontWeight: 700, borderColor: "#154278", color: "#154278" }}>
            معاينة الطباعة A4
          </Button>
          <Button variant="contained" onClick={save} disabled={saving || !draft} startIcon={saving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <SaveOutlined />}
            sx={{ borderRadius: 2, fontWeight: 700, background: "#154278", "&:hover": { background: "#0f3260" } }}>
            {exists ? "حفظ التعديلات" : "حفظ قالب المرحلة"}
          </Button>
        </div>
      </div>

      {message && <Alert severity={message.type} sx={{ mb: 2, borderRadius: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {!exists && draft && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          لا يوجد قالب محفوظ لمرحلة «{stageName}» بعد — تم تحميل القالب القياسي. راجع البيانات ثم احفظ.
        </Alert>
      )}

      {!draft ? (
        <div style={{ padding: 60, textAlign: "center" }}><CircularProgress sx={{ color: "#154278" }} /></div>
      ) : (
        <div className="tpl-grid">
          {/* Editor */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <div className="tpl-card">
              <div className="tpl-card-title">عنوان العقد</div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                <TextField size="small" label="العنوان" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
                <TextField size="small" label="عنوان فرعي" value={draft.subtitle} onChange={e => setDraft({ ...draft, subtitle: e.target.value })} />
              </div>
            </div>

            <div className="tpl-card">
              <div className="tpl-card-title">افتراضيات المرحلة</div>
              <div className="tpl-card-hint">تظهر في كل عقود هذه المرحلة، ويمكن تعديل أي منها لعقد بعينه قبل الطباعة.</div>
              <div className="tpl-defaults">
                {STAGE_VARS.map(v => (
                  <TextField key={v.key} size="small" label={v.label} value={draft.defaults[v.key] ?? ""}
                    onChange={e => setDraft({ ...draft, defaults: { ...draft.defaults, [v.key]: e.target.value } })}
                    InputLabelProps={{ shrink: true }} />
                ))}
              </div>
            </div>

            <div className="tpl-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div className="tpl-card-title" style={{ margin: 0 }}>نص العقد</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {stages.filter(s => s.id !== stageId && savedStageIds.has(s.id)).length > 0 && (
                    <Select size="small" displayEmpty value={copyFrom} onChange={e => copyFromStage(e.target.value)}
                      renderValue={() => <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}><ContentCopyOutlined sx={{ fontSize: 16 }} /> نسخ من مرحلة</span>}
                      sx={{ borderRadius: 2, fontSize: 13 }}>
                      {stages.filter(s => s.id !== stageId && savedStageIds.has(s.id)).map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                    </Select>
                  )}
                  <Button size="small" startIcon={<RestartAltOutlined />} sx={{ color: "#6b7280", fontWeight: 700 }}
                    onClick={() => { if (confirm("استبدال النص الحالي بالقالب القياسي؟")) setDraft({ ...draft, body: DEFAULT_TEMPLATE_BODY }); }}>
                    القالب القياسي
                  </Button>
                </div>
              </div>
              <div className="tpl-card-hint">
                <code># عنوان</code> لعنوان بند · سطر فارغ بين الفقرات · <code>| البيان | القيمة |</code> لصف جدول · <code>**نص**</code> للخط العريض · <code>[[signatures]]</code> لخانة التوقيعات · <code>[[installments]]</code> لجدول الأقساط · <code>[[if pending_amount]] … [[else]] … [[endif]]</code> لنص يظهر فقط عند وجود مبلغ متبقٍ. اضغط على متغير لإدراجه.
              </div>
              <div className="tpl-chips">
                {TEMPLATE_VARS.map(v => (
                  <Chip key={v.key} size="small" label={v.label} onClick={() => insertVar(v.key)}
                    sx={{ fontWeight: 600, fontSize: 11.5, background: v.source === "stage" ? "#f5efe4" : v.source === "manual" ? "#fef3c7" : "#eef2f7", color: "#374151" }} />
                ))}
              </div>
              {unknownVars.length > 0 && (
                <Alert severity="warning" sx={{ my: 1, borderRadius: 2 }}>متغيرات غير معروفة ستظهر فارغة: {unknownVars.map(k => `{{${k}}}`).join("، ")}</Alert>
              )}
              <textarea ref={bodyRef} className="tpl-body" value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} spellCheck={false} dir="rtl" />
            </div>
          </div>

          {/* Live preview */}
          <div className="tpl-preview">
            <div className="tpl-preview-label">معاينة — الحقول الصفراء تُملأ من بيانات كل عقد</div>
            <div className="tpl-preview-scroll">
              <div className="tpl-preview-scale">
                <ContractPaper title={draft.title} subtitle={draft.subtitle} body={draft.body} values={previewValues} highlight />
              </div>
            </div>
          </div>
        </div>
      )}

      {printPreview && draft && (
        <ContractPrintPreview
          title={draft.title}
          subtitle={draft.subtitle}
          body={draft.body}
          sampleValues={sampleValues}
          blankValues={previewValues}
          onClose={() => setPrintPreview(false)}
        />
      )}

      <style>{`
        .tpl-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:20px; align-items:start; }
        .tpl-card { background:#fff; border-radius:14px; border:1px solid #f0ede6; padding:16px 18px; }
        .tpl-card-title { font-weight:800; color:#154278; font-size:15px; margin-bottom:10px; }
        .tpl-card-hint { font-size:12px; color:#6b7280; margin:4px 0 10px; line-height:1.8; }
        .tpl-card-hint code { background:#f3f4f6; border-radius:4px; padding:1px 5px; font-size:11.5px; direction:ltr; display:inline-block; }
        .tpl-defaults { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:12px; padding-top:6px; }
        .tpl-chips { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px; }
        .tpl-body { width:100%; min-height:560px; resize:vertical; border:1px solid #e5e7eb; border-radius:10px; padding:14px; font-family:var(--font-cairo),Cairo,sans-serif;
          font-size:13.5px; line-height:1.9; color:#1f2937; background:#fcfcfa; outline:none; box-sizing:border-box; }
        .tpl-body:focus { border-color:#154278; box-shadow:0 0 0 3px rgba(21,66,120,.08); }
        .tpl-preview { position:sticky; top:84px; background:#e7e5df; border-radius:14px; overflow:hidden; }
        .tpl-preview-label { font-size:12px; color:#6b7280; padding:10px 14px; background:#efeee9; font-weight:600; }
        .tpl-preview-scroll { height:calc(100vh - 170px); overflow:auto; padding:16px; }
        .tpl-preview-scale { zoom:.62; display:flex; justify-content:center; }
        @media (max-width: 1200px) { .tpl-grid { grid-template-columns:1fr; } .tpl-preview { position:static; } .tpl-preview-scale { zoom:.45; } }
      `}</style>
    </div>
  );
}

export default function ContractTemplatesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: "center" }}><CircularProgress sx={{ color: "#154278" }} /></div>}>
      <ContractTemplatesEditor />
    </Suspense>
  );
}
