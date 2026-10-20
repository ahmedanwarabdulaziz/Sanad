"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { Button, CircularProgress, TextField, Alert, Tooltip } from "@mui/material";
import { ArrowForwardOutlined, PrintOutlined, SaveOutlined, RestartAltOutlined, EditNoteOutlined } from "@mui/icons-material";
import ContractPaper from "../../../components/ContractPaper";
import {
  TEMPLATE_VARS, resolveValues, contractAutoValues, usedVariables, DEFAULT_STAGE_VALUES, DEFAULT_MANUAL_VALUES,
  DEFAULT_TEMPLATE_BODY, DEFAULT_TEMPLATE_TITLE, DEFAULT_TEMPLATE_SUBTITLE, type VarSource,
} from "@/lib/sanad-zayed/contractTemplate";

// Variables printed by the header, title block and signature block regardless of the body.
const FIXED_VARS = ["transaction_no", "contract_date", "stage_name", "financing_amount", "company_rep_name", "company_rep_title", "investor_name", "investor_national_id", "investor_phone"];

const GROUPS: { source: VarSource; title: string; hint: string }[] = [
  { source: "manual", title: "بيانات تُستكمل لهذا العقد", hint: "تُحفظ مع هذا العقد فقط" },
  { source: "contract", title: "من بيانات المستثمر والعقد", hint: "تُملأ تلقائيًا — اكتب قيمة لاستبدالها في هذا العقد فقط" },
  { source: "stage", title: "افتراضيات المرحلة", hint: "من قالب المرحلة — يمكن تعديلها لهذا العقد فقط" },
];

export default function ContractDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch(`/api/sanad-zayed/contracts/${id}/document`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else { setData(d); setOverrides(d.contract.document_vars ?? {}); }
      })
      .catch(() => setError("تعذر تحميل العقد"))
      .finally(() => setLoading(false));
  }, [id]);

  const template = data?.template;
  const title = template?.title || DEFAULT_TEMPLATE_TITLE;
  const subtitle = template?.subtitle ?? DEFAULT_TEMPLATE_SUBTITLE;
  const body = template?.body || DEFAULT_TEMPLATE_BODY;
  const stageDefaults: Record<string, string> = useMemo(() => template?.defaults ?? {}, [template]);

  const values = useMemo(
    () => (data ? resolveValues(data.contract, stageDefaults, overrides) : {}),
    [data, stageDefaults, overrides]
  );
  const baseline = useMemo(() => {
    if (!data) return {} as Record<string, string>;
    const stage = { ...DEFAULT_STAGE_VALUES, ...stageDefaults };
    return { ...DEFAULT_MANUAL_VALUES, ...stage, ...Object.fromEntries(Object.entries(contractAutoValues(data.contract, stage)).filter(([, v]) => v)) };
  }, [data, stageDefaults]);

  const used = useMemo(() => new Set([...usedVariables(body), ...FIXED_VARS]), [body]);
  const missing = useMemo(() => [...used].filter(k => !values[k]), [used, values]);

  const setVar = (key: string, value: string) => {
    setOverrides(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const save = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/sanad-zayed/contracts/${id}/document`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_vars: overrides }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "تعذر الحفظ");
      setOverrides(d.document_vars);
      setDirty(false);
      setSavedAt(new Date().toLocaleTimeString("ar-EG-u-nu-latn", { hour: "2-digit", minute: "2-digit" }));
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [id, overrides]);

  const print = async () => {
    if (dirty && !(await save())) return;
    const prev = document.title;
    const investor = values.investor_name ? ` - ${values.investor_name}` : "";
    document.title = `${title}${investor}`;
    window.print();
    document.title = prev;
  };

  if (!mounted) return null;

  const workspace = (
    <div className="sz-print-root" dir="rtl">
      {/* Toolbar */}
      <div className="sz-toolbar sz-no-print">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Button onClick={() => router.back()} startIcon={<ArrowForwardOutlined />} sx={{ color: "#374151", fontWeight: 700 }}>رجوع</Button>
          <div>
            <div style={{ fontWeight: 800, color: "#154278", fontSize: 15 }}>{title}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {data?.contract?.investor?.name ?? ""}{data?.contract?.stage?.name ? ` · ${data.contract.stage.name}` : ""}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {missing.length > 0 ? (
            <span className="sz-badge sz-badge-warn">{missing.length} بيانات ناقصة</span>
          ) : data ? (
            <span className="sz-badge sz-badge-ok">العقد مكتمل البيانات</span>
          ) : null}
          {savedAt && !dirty && <span style={{ fontSize: 12, color: "#6b7280" }}>تم الحفظ {savedAt}</span>}
          <Button variant="outlined" onClick={save} disabled={saving || !dirty || !data} startIcon={saving ? <CircularProgress size={16} /> : <SaveOutlined />}
            sx={{ borderRadius: 2, fontWeight: 700, borderColor: "#154278", color: "#154278" }}>
            حفظ البيانات
          </Button>
          <Button variant="contained" onClick={print} disabled={!data} startIcon={<PrintOutlined />}
            sx={{ borderRadius: 2, fontWeight: 700, background: "#154278", "&:hover": { background: "#0f3260" } }}>
            طباعة / PDF
          </Button>
        </div>
      </div>

      <div className="sz-workspace">
        {/* Variables panel */}
        <aside className="sz-panel sz-no-print">
          {loading && <div style={{ padding: 40, textAlign: "center" }}><CircularProgress sx={{ color: "#154278" }} /></div>}
          {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
          {data && !template && (
            <Alert severity="info" sx={{ m: 2 }}>
              لا يوجد قالب محفوظ لهذه المرحلة — يتم استخدام القالب القياسي.{" "}
              <a href={`/admin/sanad-zayed/contract-templates?stage=${data.contract.stage_id}`} style={{ fontWeight: 700 }}>إعداد قالب المرحلة</a>
            </Alert>
          )}
          {data && GROUPS.map(g => {
            const vars = TEMPLATE_VARS.filter(v => v.source === g.source && used.has(v.key));
            if (!vars.length) return null;
            return (
              <section key={g.source} className="sz-group">
                <div className="sz-group-title">{g.title}</div>
                <div className="sz-group-hint">{g.hint}</div>
                {vars.map(v => {
                  const overridden = !!overrides[v.key]?.trim();
                  const isMissing = !values[v.key];
                  return (
                    <div key={v.key} style={{ position: "relative" }}>
                      <TextField
                        fullWidth size="small" margin="dense"
                        label={v.label}
                        value={overrides[v.key] ?? ""}
                        placeholder={baseline[v.key] || "غير محدد"}
                        helperText={v.hint}
                        onChange={e => setVar(v.key, e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        error={isMissing}
                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, background: overridden ? "#f3f6fa" : "#fff" } }}
                      />
                      {overridden && baseline[v.key] && (
                        <Tooltip title="إرجاع للقيمة التلقائية">
                          <button type="button" className="sz-reset" onClick={() => setVar(v.key, "")}><RestartAltOutlined sx={{ fontSize: 16 }} /></button>
                        </Tooltip>
                      )}
                    </div>
                  );
                })}
              </section>
            );
          })}
          {data && (
            <a className="sz-edit-template" href={`/admin/sanad-zayed/contract-templates?stage=${data.contract.stage_id}`}>
              <EditNoteOutlined sx={{ fontSize: 18 }} /> تعديل نص قالب المرحلة
            </a>
          )}
        </aside>

        {/* Document */}
        <div className="sz-stage">
          {data && <ContractPaper title={title} subtitle={subtitle} body={body} values={values} highlight />}
        </div>
      </div>

      {/* Print version without review highlighting */}
      {data && (
        <div className="sz-print-only">
          <ContractPaper title={title} subtitle={subtitle} body={body} values={values} />
        </div>
      )}
      <style>{WORKSPACE_CSS}</style>
    </div>
  );

  return createPortal(workspace, document.body);
}

const WORKSPACE_CSS = `
.sz-print-root { position:fixed; inset:0; z-index:1300; background:#e7e5df; display:flex; flex-direction:column; font-family:var(--font-cairo),Cairo,sans-serif; }
.sz-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; padding:10px 18px; background:#fff; border-bottom:1px solid #e5e7eb; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.sz-workspace { flex:1; display:flex; min-height:0; }
.sz-panel { width:340px; flex-shrink:0; overflow-y:auto; background:#fff; border-inline-end:1px solid #e5e7eb; padding:8px 0 24px; }
.sz-group { padding:12px 18px 6px; border-bottom:1px solid #f1f0ec; }
.sz-group-title { font-weight:800; color:#154278; font-size:14px; }
.sz-group-hint { font-size:11.5px; color:#9ca3af; margin-bottom:4px; }
.sz-reset { position:absolute; left:6px; top:16px; border:none; background:#fff; color:#6b7280; cursor:pointer; border-radius:6px; padding:3px; display:flex; }
.sz-reset:hover { color:#154278; background:#eef2f7; }
.sz-edit-template { display:flex; align-items:center; gap:6px; margin:14px 18px 0; font-size:13px; font-weight:700; color:#154278; text-decoration:none; }
.sz-stage { flex:1; overflow:auto; padding:28px 24px 60px; display:flex; justify-content:center; align-items:flex-start; }
.sz-badge { font-size:12px; font-weight:700; border-radius:8px; padding:5px 10px; }
.sz-badge-warn { background:#fef3c7; color:#92400e; }
.sz-badge-ok { background:#dcfce7; color:#166534; }
.sz-print-only { display:none; }
@media (max-width: 900px) {
  .sz-workspace { flex-direction:column; overflow:auto; }
  .sz-panel { width:auto; border-inline-end:none; overflow:visible; }
  .sz-stage { overflow:visible; padding:16px; }
  .sz-stage .sz-paper { transform-origin:top center; zoom:.45; }
}

@page {
  size: A4;
  margin: 12mm 16mm 13mm;
  @bottom-center { content: "صفحة " counter(page) " من " counter(pages); font-size: 8pt; color: #6b7280; font-family: Cairo, sans-serif; }
}
@media print {
  html, body { background:#fff !important; }
  body > *:not(.sz-print-root) { display:none !important; }
  .sz-print-root { position:static !important; inset:auto !important; display:block !important; background:#fff !important; }
  .sz-no-print, .sz-workspace { display:none !important; }
  .sz-print-only { display:block !important; }
}
`;
