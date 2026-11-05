"use client";

import { Fragment } from "react";
import { Noto_Naskh_Arabic } from "next/font/google";
import { parseTemplate, segmentText, applyConditionals, parseSchedule, parseAmount, formatNumber, amountInWords, PLACEHOLDER, TEMPLATE_VARS, isPassport, type Block } from "@/lib/sanad-zayed/contractTemplate";

const naskh = Noto_Naskh_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], display: "swap" });

const NAVY = "#154278";
const GOLD = "#b08d57";
// Only the cover, header and footer print in color; the contract body is black on white.
const INK = "#000";
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
  const blocks = parseTemplate(applyConditionals(body, values));
  // The closing clause and the signatures flow straight after the contract text,
  // kept together so the signatures never land on a page without their clause.
  const sigAt = blocks.findIndex(b => b.type === "signatures");
  let split = blocks.length;
  if (sigAt >= 0) {
    split = sigAt;
    for (let j = sigAt - 1; j >= 0; j--) if (blocks[j].type === "heading") { split = j; break; }
  }
  const lastBlocks = blocks.slice(split);

  const header = (
    <thead>
      <tr><td>
        <div className="sz-header">
          <div className="sz-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-mark.png" alt="" className="sz-logo" />
            <div>
              <div className="sz-brand-ar">سند برو كابيتال للمشروعات</div>
              <div className="sz-brand-en">SANAD PRO CAPITAL PROJECTS</div>
              <div className="sz-brand-meta">شركة مساهمة مصرية · سجل تجاري رقم 11604</div>
            </div>
          </div>
          <div className="sz-header-meta">
            <div className="sz-header-title">{title}</div>
            <div>
              رقم المعاملة: <strong><V k="transaction_no" values={values} highlight={highlight} /></strong>
              <span className="sz-header-sep">·</span>
              تاريخ العقد: <V k="contract_date" values={values} highlight={highlight} />
            </div>
          </div>
        </div>
        <div className="sz-rule"><span /></div>
      </td></tr>
    </thead>
  );

  const footer = (
    <tfoot>
      <tr><td>
        <div className="sz-footer">
          <div className="sz-initial">توقيع الشركة <span /></div>
          <div className="sz-footer-center">
            <div>نسخة خاصة بأطراف العقد ولا يجوز نسخها أو تداولها</div>
            <div className="sz-footer-addr">مشروع سند زايد · مدينة الشيخ زايد · جمهورية مصر العربية</div>
          </div>
          <div className="sz-initial">توقيع الممول <span /></div>
        </div>
      </td></tr>
    </tfoot>
  );

  const renderBlock = (b: Block, i: number) => {
    if (b.type === "heading") return <h2 key={i} className="sz-h2"><Rich text={b.text} values={values} highlight={highlight} /></h2>;
    if (b.type === "paragraph") return <p key={i} className="sz-p"><Rich text={b.text} values={values} highlight={highlight} /></p>;
    if (b.type === "installments") {
      const rows = parseSchedule(values.installments ?? "");
      const total = rows.reduce((sum, r) => sum + (parseAmount(r.amount) || 0), 0);
      if (!rows.length) {
        return highlight ? <p key={i} className="sz-p"><span className="sz-var-missing">{PLACEHOLDER} جدول الأقساط</span></p> : null;
      }
      return (
        <table key={i} className="sz-data sz-installments">
          <thead><tr><th style={{ width: "10%" }}>م</th><th style={{ width: "24%" }}>تاريخ الاستحقاق</th><th style={{ width: "22%" }}>المبلغ (ج.م)</th><th>المبلغ بالحروف</th></tr></thead>
          <tbody>
            {rows.map((r, n) => {
              const amt = parseAmount(r.amount);
              return (
                <tr key={n}>
                  <td className="sz-num">{n + 1}</td>
                  <td className="sz-num">{r.date || (highlight ? <span className="sz-var-missing">{PLACEHOLDER}</span> : "")}</td>
                  <td className="sz-num"><strong>{Number.isFinite(amt) ? formatNumber(amt) : r.amount}</strong></td>
                  <td>{Number.isFinite(amt) && amt > 0 ? amountInWords(amt) : ""}</td>
                </tr>
              );
            })}
            <tr className="sz-total">
              <td colSpan={2}>الإجمالي</td>
              <td className="sz-num">{formatNumber(total)}</td>
              <td>{total > 0 ? amountInWords(total) : ""}</td>
            </tr>
          </tbody>
        </table>
      );
    }
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
          { party: "الطرف الأول — الشركة", rows: [["الاسم", "شركة سند برو كابيتال للمشروعات"], ["يمثلها", "{{company_rep_name}}"], ["الصفة", "{{company_rep_title}}"], ["البريد الإلكتروني", "{{company_email}}"]] },
          { party: "الطرف الثاني — الممول", rows: [["الاسم", "{{investor_name}}"], [isPassport(values.investor_id_type) ? "رقم جواز السفر" : "الرقم القومي", "{{investor_national_id}}"], ["الهاتف", "{{investor_phone}}"], ["البريد الإلكتروني", "{{investor_email}}"]] },
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
  };

  return (
    <div className={`sz-paper ${naskh.className}`} dir="rtl">
      <section className="sz-cover">
        <div className="sz-cover-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-mark.png" alt="" />
          <div className="sz-cover-brand-ar">سند برو كابيتال للمشروعات</div>
          <div className="sz-cover-brand-en">SANAD PRO CAPITAL PROJECTS</div>
        </div>
        <div className="sz-cover-title">
          <div className="sz-cover-ornament"><span /><i /><span /></div>
          <h1>{title}</h1>
          <div className="sz-cover-stage"><V k="stage_name" values={values} highlight={highlight} /></div>
        </div>
        <dl className="sz-cover-data">
          <div><dt>رقم المعاملة</dt><dd><V k="transaction_no" values={values} highlight={highlight} /></dd></div>
          <div><dt>تاريخ العقد</dt><dd><V k="contract_date" values={values} highlight={highlight} /></dd></div>
          <div><dt>الممول</dt><dd><V k="investor_name" values={values} highlight={highlight} /></dd></div>
          <div><dt>المشروع</dt><dd>{(subtitle || "").replace(/^مشروع\s+/, "") || "سند زايد"}</dd></div>
        </dl>
        <div className="sz-cover-foot">
          <div>شركة مساهمة مصرية · سجل تجاري رقم 11604</div>
          <div>مدينة الشيخ زايد · جمهورية مصر العربية</div>
          <div className="sz-cover-private">نسخة خاصة بأطراف العقد ولا يجوز نسخها أو تداولها</div>
        </div>
      </section>
      <table className="sz-doc">
        {header}
        {footer}
        <tbody>
          <tr><td>
            <div className="sz-titleblock">
              <div className="sz-ornament"><span /><i /><span /></div>
              <h1>{title}</h1>
              {subtitle && <div className="sz-subtitle">{subtitle}</div>}
            </div>
            {blocks.slice(0, split).map(renderBlock)}
            {lastBlocks.length > 0 && <div className="sz-closing">{lastBlocks.map(renderBlock)}</div>}
          </td></tr>
        </tbody>
      </table>
      <style>{PAPER_CSS}</style>
    </div>
  );
}

const PAPER_CSS = `
.sz-paper { background:#fff; color:${INK}; width:210mm; min-height:297mm; padding:12mm 16mm 14mm; box-sizing:border-box;
  box-shadow:0 10px 40px rgba(15,23,42,.12), 0 0 0 1px rgba(15,23,42,.04); font-size:11.5pt; line-height:1.95;
  -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.sz-doc { width:100%; border-collapse:collapse; }
.sz-doc > thead > tr > td, .sz-doc > tfoot > tr > td, .sz-doc > tbody > tr > td { padding:0; }
.sz-closing { position:relative; break-inside:avoid; page-break-inside:avoid; }
/* The repeated table footer can't differ per page, but on the last page it sits right
   after this block, so two white patches hide its initials boxes: the full signatures are here. */
.sz-closing::before, .sz-closing::after { content:""; position:absolute; top:calc(100% + 6mm + 2px); width:34mm; height:19mm; background:#fff; }
.sz-closing::before { right:0; }
.sz-closing::after { left:0; }

/* Cover: one full page; 270mm stays just inside the 272mm A4 print area so it never spills a blank page. */
.sz-cover { position:relative; height:270mm; box-sizing:border-box; display:flex; flex-direction:column; align-items:center; padding:20mm 16mm 14mm;
  border:1.5px solid ${NAVY}; text-align:center; break-after:page; page-break-after:always; overflow:hidden; }
.sz-cover::before { content:""; position:absolute; inset:2mm; border:.5px solid ${GOLD}; pointer-events:none; }
.sz-cover-brand img { display:block; height:32mm; width:auto; margin:0 auto 4mm; }
.sz-cover-brand-ar { font-family:var(--font-cairo),Cairo,sans-serif; font-weight:800; color:${NAVY}; font-size:17pt; line-height:1.4; }
.sz-cover-brand-en { font-family:var(--font-playfair-display),Georgia,serif; letter-spacing:.24em; color:${GOLD}; font-size:8pt; font-weight:700; line-height:1.8; direction:ltr; }
.sz-cover-title { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; }
.sz-cover-ornament { display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:8mm; }
.sz-cover-ornament span { width:34mm; height:1px; background:${GOLD}; }
.sz-cover-ornament i { width:8px; height:8px; background:${GOLD}; transform:rotate(45deg); display:block; }
.sz-cover-title h1 { font-family:var(--font-cairo),Cairo,sans-serif; color:${NAVY}; font-size:27pt; font-weight:800; line-height:1.5; margin:0; max-width:150mm; }
.sz-cover-stage { margin-top:5mm; color:${GOLD}; font-family:var(--font-cairo),Cairo,sans-serif; font-weight:700; font-size:14pt; line-height:1.6; }
.sz-cover-data { width:100%; max-width:150mm; display:grid; grid-template-columns:1fr 1fr; margin:0 0 14mm; border-top:2px solid ${NAVY}; border-bottom:1px solid ${GOLD}; }
.sz-cover-data > div { padding:3.5mm 4mm; text-align:right; border-bottom:1px solid #e5e7eb; }
.sz-cover-data > div:nth-last-child(-n+2) { border-bottom:none; }
.sz-cover-data > div:nth-child(odd) { border-inline-end:1px solid #e5e7eb; }
.sz-cover-data dt { font-family:var(--font-cairo),Cairo,sans-serif; font-size:8.5pt; color:#6b7280; line-height:1.6; }
.sz-cover-data dd { margin:0; font-size:12.5pt; font-weight:700; color:${NAVY}; line-height:1.7; }
.sz-cover-foot { font-size:8.5pt; color:#6b7280; line-height:1.8; }
.sz-cover-private { margin-top:1mm; color:${NAVY}; font-weight:700; }
@media screen {
  /* On screen the cover reads as its own sheet above the contract text. */
  .sz-cover { margin-bottom:12mm; }
}

.sz-header { display:flex; justify-content:space-between; align-items:center; gap:12px; padding-bottom:6px; }
.sz-brand { display:flex; align-items:center; gap:10px; }
.sz-logo { width:auto; height:44px; object-fit:contain; }
.sz-brand-ar { font-family:var(--font-cairo),Cairo,sans-serif; font-weight:800; color:${NAVY}; font-size:12.5pt; line-height:1.3; }
.sz-brand-en { font-family:var(--font-playfair-display),Georgia,serif; letter-spacing:.18em; color:${GOLD}; font-size:6.8pt; font-weight:700; line-height:1.4; direction:ltr; text-align:right; }
.sz-brand-meta { font-size:7.5pt; color:#6b7280; line-height:1.4; }
.sz-header-meta { text-align:left; font-size:8pt; color:#4b5563; line-height:1.6; }
.sz-header-sep { margin:0 6px; color:${GOLD}; }
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
.sz-ornament span { width:22mm; height:1px; background:${INK}; }
.sz-ornament i { width:7px; height:7px; background:${INK}; transform:rotate(45deg); display:block; }
.sz-titleblock h1 { font-family:var(--font-cairo),Cairo,sans-serif; color:${INK}; font-size:19pt; font-weight:800; margin:0; line-height:1.5; }
.sz-subtitle { color:${INK}; font-weight:700; font-size:12pt; margin-top:1mm; }

.sz-h2 { font-family:var(--font-cairo),Cairo,sans-serif; color:${INK}; font-size:12.5pt; font-weight:800; margin:6mm 0 2.5mm; padding:1.2mm 3mm;
  border-inline-start:3px solid ${INK}; background:#fff; break-after:avoid; page-break-after:avoid; line-height:1.6; }
.sz-p { margin:0 0 2.6mm; text-align:justify; orphans:3; widows:3; }

.sz-data { width:100%; border-collapse:collapse; margin:3mm 0 4mm; font-size:10pt; line-height:1.7; }
.sz-data th { background:#fff; color:${INK}; border:1px solid ${INK}; border-bottom-width:2px; font-family:var(--font-cairo),Cairo,sans-serif; font-weight:800; padding:2mm 3mm; text-align:right; font-size:9.5pt; }
.sz-data td { border:1px solid ${INK}; padding:1.8mm 3mm; vertical-align:top; }
.sz-data tr { break-inside:avoid; page-break-inside:avoid; }
.sz-data-label { width:38%; font-weight:700; color:${INK}; }
.sz-installments td { font-size:9.5pt; }
.sz-num { text-align:center; white-space:nowrap; }
.sz-installments th { text-align:center; }
.sz-total td { border-top-width:2px; font-weight:800; color:${INK}; }
.sz-total td:first-child { text-align:center; }

.sz-signatures { display:grid; grid-template-columns:1fr 1fr; gap:8mm; margin-top:8mm; break-inside:avoid; page-break-inside:avoid; }
.sz-sig { border:1px solid ${INK}; border-radius:4px; padding:4mm; position:relative; }
.sz-sig-head { font-family:var(--font-cairo),Cairo,sans-serif; font-weight:800; color:${INK}; border-bottom:1px solid ${INK}; padding-bottom:1.5mm; margin-bottom:2mm; }
.sz-sig-row { display:flex; gap:6px; font-size:10pt; line-height:2; }
.sz-sig-row label { color:${INK}; min-width:22mm; }
.sz-sig-line span { flex:1; border-bottom:1px solid ${INK}; margin-bottom:6px; min-height:12mm; }
.sz-stamp { position:absolute; left:4mm; bottom:4mm; width:22mm; height:22mm; border:1px dashed ${INK}; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:8pt; color:${INK}; }

.sz-var-filled { background:rgba(21,66,120,.08); border-radius:3px; padding:0 2px; }
.sz-var-missing { background:#fef3c7; color:#92400e; border:1px dashed #f59e0b; border-radius:3px; padding:0 4px; font-size:.85em; font-family:var(--font-cairo),Cairo,sans-serif; }
.sz-var-blank { border-bottom:1px dotted ${INK}; }

@media print {
  .sz-paper { width:auto; min-height:0; padding:0; box-shadow:none; }
  .sz-var-filled { background:none; padding:0; }
}
`;
