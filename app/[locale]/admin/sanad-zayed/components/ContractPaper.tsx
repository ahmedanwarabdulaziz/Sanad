"use client";

import { Fragment } from "react";
import { Noto_Naskh_Arabic } from "next/font/google";
import { parseTemplate, segmentText, PLACEHOLDER, TEMPLATE_VARS } from "@/lib/sanad-zayed/contractTemplate";

const naskh = Noto_Naskh_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], display: "swap" });

const NAVY = "#154278";
const GOLD = "#b08d57";
const LABELS = Object.fromEntries(TEMPLATE_VARS.map(v => [v.key, v.label]));

interface Props {
  title: string;
  subtitle?: string;
  body: string;
  values: Record<string, string>;
  /** Screen review mode: tint filled variables and flag missing ones. */
  highlight?: boolean;
}

function Rich({ text, values, highlight }: { text: string; values: Record<string, string>; highlight?: boolean }) {
  return (
    <>
      {segmentText(text, values).map((s, i) => {
        const style = s.bold ? { fontWeight: 700 } : undefined;
        if (s.kind === "text") return <span key={i} style={style}>{s.text}</span>;
        if (!s.value) {
          return highlight
            ? <span key={i} className="sz-var-missing" title={LABELS[s.key] ?? s.key}>{PLACEHOLDER} {LABELS[s.key] ?? s.key}</span>
            : <span key={i} className="sz-var-blank">{" ".repeat(18)}</span>;
        }
        return <span key={i} className={highlight ? "sz-var-filled" : undefined} style={style} title={highlight ? LABELS[s.key] : undefined}>{s.value}</span>;
      })}
    </>
  );
}

function V({ k, values, highlight }: { k: string; values: Record<string, string>; highlight?: boolean }) {
  return <Rich text={`{{${k}}}`} values={values} highlight={highlight} />;
}

export default function ContractPaper({ title, subtitle, body, values, highlight }: Props) {
  const blocks = parseTemplate(body);

  return (
    <div className={`sz-paper ${naskh.className}`} dir="rtl">
      <table className="sz-doc">
        <thead>
          <tr><td>
            <div className="sz-header">
              <div className="sz-brand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/short logo.png" alt="" className="sz-logo" />
                <div>
                  <div className="sz-brand-ar">سند برو كابيتال للمشروعات</div>
                  <div className="sz-brand-en">SANAD PRO CAPITAL PROJECTS</div>
                  <div className="sz-brand-meta">شركة مساهمة مصرية · سجل تجاري رقم 11604</div>
                </div>
              </div>
              <div className="sz-header-meta">
                <div className="sz-header-title">{title}</div>
                <div>رقم المعاملة: <strong><V k="transaction_no" values={values} highlight={highlight} /></strong></div>
                <div>تاريخ العقد: <V k="contract_date" values={values} highlight={highlight} /></div>
              </div>
            </div>
            <div className="sz-rule"><span /></div>
          </td></tr>
        </thead>

        <tfoot>
          <tr><td>
            <div className="sz-footer">
              <div className="sz-initial">توقيع الشركة <span /></div>
              <div className="sz-footer-center">
                <div>سري — نسخة خاصة بأطراف العقد ولا يجوز نسخها أو تداولها</div>
                <div className="sz-footer-addr">مشروع سند زايد · مدينة الشيخ زايد · جمهورية مصر العربية</div>
              </div>
              <div className="sz-initial">توقيع الممول <span /></div>
            </div>
          </td></tr>
        </tfoot>

        <tbody>
          <tr><td>
            <div className="sz-titleblock">
              <div className="sz-ornament"><span /><i /><span /></div>
              <h1>{title}</h1>
              {subtitle && <div className="sz-subtitle">{subtitle}</div>}
              <div className="sz-meta-grid">
                <div><label>رقم المعاملة</label><b><V k="transaction_no" values={values} highlight={highlight} /></b></div>
                <div><label>المرحلة</label><b><V k="stage_name" values={values} highlight={highlight} /></b></div>
                <div><label>تاريخ العقد</label><b><V k="contract_date" values={values} highlight={highlight} /></b></div>
                <div><label>مبلغ التمويل</label><b><V k="financing_amount" values={values} highlight={highlight} /> ج.م</b></div>
              </div>
            </div>

            {blocks.map((b, i) => {
              if (b.type === "heading") return <h2 key={i} className="sz-h2"><Rich text={b.text} values={values} highlight={highlight} /></h2>;
              if (b.type === "paragraph") return <p key={i} className="sz-p"><Rich text={b.text} values={values} highlight={highlight} /></p>;
              if (b.type === "table") {
                return (
                  <table key={i} className="sz-data">
                    <thead><tr><th>البيان</th><th>القيمة</th></tr></thead>
                    <tbody>
                      {b.rows.map(([label, value], r) => (
                        <tr key={r}>
                          <td className="sz-data-label"><Rich text={label} values={values} highlight={highlight} /></td>
                          <td><Rich text={value} values={values} highlight={highlight} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              }
              return (
                <div key={i} className="sz-signatures">
                  {[
                    { party: "الطرف الأول — الشركة", rows: [["الاسم", "شركة سند برو كابيتال للمشروعات"], ["يمثلها", "{{company_rep_name}}"], ["الصفة", "{{company_rep_title}}"]] },
                    { party: "الطرف الثاني — الممول", rows: [["الاسم", "{{investor_name}}"], ["الرقم القومي", "{{investor_national_id}}"], ["الهاتف", "{{investor_phone}}"]] },
                  ].map(p => (
                    <div key={p.party} className="sz-sig">
                      <div className="sz-sig-head">{p.party}</div>
                      {p.rows.map(([l, v]) => (
                        <Fragment key={l}>
                          <div className="sz-sig-row"><label>{l}:</label><span><Rich text={v} values={values} highlight={highlight} /></span></div>
                        </Fragment>
                      ))}
                      <div className="sz-sig-row sz-sig-line"><label>التوقيع:</label><span /></div>
                      {p.party.includes("الشركة") && <div className="sz-stamp">الختم</div>}
                    </div>
                  ))}
                </div>
              );
            })}
          </td></tr>
        </tbody>
      </table>
      <style>{PAPER_CSS}</style>
    </div>
  );
}

const PAPER_CSS = `
.sz-paper { background:#fff; color:#1f2937; width:210mm; min-height:297mm; padding:12mm 16mm 14mm; box-sizing:border-box;
  box-shadow:0 10px 40px rgba(15,23,42,.12), 0 0 0 1px rgba(15,23,42,.04); font-size:11.5pt; line-height:1.95;
  -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.sz-doc { width:100%; border-collapse:collapse; }
.sz-doc > thead > tr > td, .sz-doc > tfoot > tr > td, .sz-doc > tbody > tr > td { padding:0; }

.sz-header { display:flex; justify-content:space-between; align-items:center; gap:12px; padding-bottom:6px; }
.sz-brand { display:flex; align-items:center; gap:10px; }
.sz-logo { width:40px; height:46px; object-fit:contain; }
.sz-brand-ar { font-family:var(--font-cairo),Cairo,sans-serif; font-weight:800; color:${NAVY}; font-size:12.5pt; line-height:1.3; }
.sz-brand-en { font-family:var(--font-playfair-display),Georgia,serif; letter-spacing:.18em; color:${GOLD}; font-size:6.8pt; font-weight:700; line-height:1.4; direction:ltr; text-align:right; }
.sz-brand-meta { font-size:7.5pt; color:#6b7280; line-height:1.4; }
.sz-header-meta { text-align:left; font-size:8pt; color:#4b5563; line-height:1.6; }
.sz-header-title { font-family:var(--font-cairo),Cairo,sans-serif; font-weight:700; color:${NAVY}; font-size:8.5pt; }
.sz-rule { height:2px; background:${NAVY}; position:relative; margin-bottom:7mm; }
.sz-rule span { position:absolute; left:0; right:0; top:4px; height:1px; background:${GOLD}; }

.sz-footer { margin-top:6mm; border-top:1px solid ${GOLD}; padding-top:6px; display:flex; justify-content:space-between; align-items:flex-end; gap:10px; font-size:7.5pt; color:#6b7280; }
.sz-footer-center { text-align:center; line-height:1.6; }
.sz-footer-addr { color:#9ca3af; font-size:7pt; }
.sz-initial { display:flex; flex-direction:column; align-items:center; gap:3px; min-width:32mm; font-weight:600; color:${NAVY}; }
.sz-initial span { display:block; width:32mm; height:9mm; border:1px dashed #cbd5e1; border-radius:3px; }

.sz-titleblock { text-align:center; margin:2mm 0 8mm; break-inside:avoid; }
.sz-ornament { display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:4mm; }
.sz-ornament span { width:22mm; height:1px; background:${GOLD}; }
.sz-ornament i { width:7px; height:7px; background:${GOLD}; transform:rotate(45deg); display:block; }
.sz-titleblock h1 { font-family:var(--font-cairo),Cairo,sans-serif; color:${NAVY}; font-size:19pt; font-weight:800; margin:0; line-height:1.5; }
.sz-subtitle { color:${GOLD}; font-weight:700; font-size:12pt; margin-top:1mm; }
.sz-meta-grid { display:grid; grid-template-columns:repeat(4,1fr); margin-top:6mm; border:1px solid #e5e7eb; border-radius:4px; overflow:hidden; }
.sz-meta-grid > div { padding:2.5mm 2mm; border-inline-start:1px solid #e5e7eb; background:#f8fafc; }
.sz-meta-grid > div:first-child { border-inline-start:none; }
.sz-meta-grid label { display:block; font-size:7.5pt; color:#6b7280; line-height:1.5; }
.sz-meta-grid b { display:block; font-size:10pt; color:${NAVY}; line-height:1.6; }

.sz-h2 { font-family:var(--font-cairo),Cairo,sans-serif; color:${NAVY}; font-size:12.5pt; font-weight:800; margin:6mm 0 2.5mm; padding:1.2mm 3mm;
  border-inline-start:3px solid ${GOLD}; background:linear-gradient(to left, rgba(21,66,120,.06), rgba(21,66,120,0)); break-after:avoid; page-break-after:avoid; line-height:1.6; }
.sz-p { margin:0 0 2.6mm; text-align:justify; orphans:3; widows:3; }

.sz-data { width:100%; border-collapse:collapse; margin:3mm 0 4mm; font-size:10pt; line-height:1.7; }
.sz-data th { background:${NAVY}; color:#fff; font-family:var(--font-cairo),Cairo,sans-serif; font-weight:700; padding:2mm 3mm; text-align:right; font-size:9.5pt; }
.sz-data td { border:1px solid #e5e7eb; padding:1.8mm 3mm; vertical-align:top; }
.sz-data tr { break-inside:avoid; page-break-inside:avoid; }
.sz-data tbody tr:nth-child(even) td { background:#fafaf7; }
.sz-data-label { width:38%; font-weight:700; color:${NAVY}; background:#f3f6fa !important; }

.sz-signatures { display:grid; grid-template-columns:1fr 1fr; gap:8mm; margin-top:8mm; break-inside:avoid; page-break-inside:avoid; }
.sz-sig { border:1px solid #d1d5db; border-radius:4px; padding:4mm; position:relative; }
.sz-sig-head { font-family:var(--font-cairo),Cairo,sans-serif; font-weight:800; color:${NAVY}; border-bottom:1px solid ${GOLD}; padding-bottom:1.5mm; margin-bottom:2mm; }
.sz-sig-row { display:flex; gap:6px; font-size:10pt; line-height:2; }
.sz-sig-row label { color:#6b7280; min-width:22mm; }
.sz-sig-line span { flex:1; border-bottom:1px solid #9ca3af; margin-bottom:6px; min-height:12mm; }
.sz-stamp { position:absolute; left:4mm; bottom:4mm; width:22mm; height:22mm; border:1px dashed #cbd5e1; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:8pt; color:#9ca3af; }

.sz-var-filled { background:rgba(21,66,120,.08); border-radius:3px; padding:0 2px; }
.sz-var-missing { background:#fef3c7; color:#92400e; border:1px dashed #f59e0b; border-radius:3px; padding:0 4px; font-size:.85em; font-family:var(--font-cairo),Cairo,sans-serif; }
.sz-var-blank { border-bottom:1px dotted #6b7280; }

@media print {
  .sz-paper { width:auto; min-height:0; padding:0; box-shadow:none; }
  .sz-var-filled { background:none; padding:0; }
}
`;
