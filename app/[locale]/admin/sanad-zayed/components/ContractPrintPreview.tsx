"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button, FormControlLabel, Switch } from "@mui/material";
import { CloseOutlined, PrintOutlined } from "@mui/icons-material";
import ContractPaper from "./ContractPaper";

interface Props {
  title: string;
  subtitle?: string;
  body: string;
  /** Values with sample contract data filled in. */
  sampleValues: Record<string, string>;
  /** Values without per-contract data (blank lines where each contract fills in). */
  blankValues: Record<string, string>;
  onClose: () => void;
}

/**
 * Full-screen preview of the contract exactly as it prints (no review
 * highlighting), with a print button that opens the browser's A4 print
 * preview / PDF export.
 */
export default function ContractPrintPreview({ title, subtitle, body, sampleValues, blankValues, onClose }: Props) {
  const [withSample, setWithSample] = useState(true);
  const values = withSample ? sampleValues : blankValues;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
  }, [onClose]);

  const print = () => {
    const prev = document.title;
    document.title = title;
    window.print();
    document.title = prev;
  };

  return createPortal(
    <div className="sz-print-root" dir="rtl">
      <div className="szp-toolbar sz-no-print">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button onClick={onClose} startIcon={<CloseOutlined />} sx={{ color: "#374151", fontWeight: 700 }}>إغلاق</Button>
          <div>
            <div style={{ fontWeight: 800, color: "#154278", fontSize: 15 }}>معاينة الطباعة — A4</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>للتقسيم الفعلي للصفحات وأرقامها اضغط «طباعة / PDF»</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <FormControlLabel
            control={<Switch checked={withSample} onChange={e => setWithSample(e.target.checked)} size="small" />}
            label={<span style={{ fontSize: 13, fontWeight: 600 }}>بيانات تجريبية</span>}
            sx={{ m: 0 }}
          />
          <Button variant="contained" onClick={print} startIcon={<PrintOutlined />}
            sx={{ borderRadius: 2, fontWeight: 700, background: "#154278", "&:hover": { background: "#0f3260" } }}>
            طباعة / PDF
          </Button>
        </div>
      </div>
      <div className="szp-stage">
        <ContractPaper title={title} subtitle={subtitle} body={body} values={values} />
      </div>
      <style>{`
        .sz-print-root { position:fixed; inset:0; z-index:1300; background:#e7e5df; display:flex; flex-direction:column; font-family:var(--font-cairo),Cairo,sans-serif; }
        .szp-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; padding:10px 18px; background:#fff; border-bottom:1px solid #e5e7eb; }
        .szp-stage { flex:1; overflow:auto; padding:28px 16px 60px; display:flex; justify-content:center; align-items:flex-start; }
        @media (max-width: 860px) { .szp-stage .sz-paper { zoom:.45; } }
        @page {
          size: A4;
          margin: 12mm 16mm 13mm;
          @bottom-center { content: "صفحة " counter(page) " من " counter(pages); font-size: 8pt; color: #6b7280; font-family: Cairo, sans-serif; }
        }
        @media print {
          html, body { background:#fff !important; overflow:visible !important; }
          body > *:not(.sz-print-root) { display:none !important; }
          .sz-print-root { position:static !important; inset:auto !important; display:block !important; background:#fff !important; }
          .sz-no-print { display:none !important; }
          .szp-stage { display:block !important; padding:0 !important; overflow:visible !important; }
        }
      `}</style>
    </div>,
    document.body
  );
}
