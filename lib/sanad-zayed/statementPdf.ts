// Renders the investor statement as a styled RTL HTML block, rasterizes it with
// html2canvas (jsPDF alone can't shape Arabic text), then slices the result
// across A4 pages in jsPDF. Returns a PDF Blob ready to upload.

interface StatementTransaction {
  transaction_type: string;
  amount: number;
  description: string;
  reason_type?: string | null;
  transaction_date: string;
}

interface StatementContract {
  id: string;
  stage?: { name: string } | null;
  unit_quantity: number;
  unit_price_at_contract: number;
  total_contract_value: number;
  contract_date: string;
  status: string;
}

interface StatementData {
  investor: { name: string; phone: string; email: string };
  contracts: StatementContract[];
  transactions: StatementTransaction[];
  balance: number;
  total_deposits: number;
  total_withdrawals: number;
  total_contract_dues: number;
  generated_at: string;
}

const REASON_LABEL: Record<string, string> = {
  CONTRACT_PAYMENT: "دفعة عقد",
  PERSONAL_SERVICE_DEDUCTION: "خصم خدمة شخصية",
  CREDIT_REFUND: "استرداد رصيد",
};

function buildHtml(data: StatementData): string {
  const fmt = (n: number) => Number(n).toLocaleString("ar-EG-u-nu-latn", { maximumFractionDigits: 0 });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("ar-EG-u-nu-latn");

  const contractRows = data.contracts.map(c => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;">${c.stage?.name ?? "—"}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;">${fmt(c.unit_quantity)} م²</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;">${fmt(c.unit_price_at_contract)} ج.م</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;font-weight:700;">${fmt(c.total_contract_value)} ج.م</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;">${fmtDate(c.contract_date)}</td>
    </tr>
  `).join("");

  const txRows = data.transactions.map(t => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;">${fmtDate(t.transaction_date)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;">${t.transaction_type === "DEPOSIT" ? "دفعة واردة" : "مبلغ صادر"}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;">${t.reason_type ? REASON_LABEL[t.reason_type] ?? t.reason_type : "—"}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;">${t.description || "—"}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;font-weight:700;color:${t.transaction_type === "DEPOSIT" ? "#16a34a" : "#ef4444"};">${fmt(t.amount)} ج.م</td>
    </tr>
  `).join("");

  return `
    <div dir="rtl" style="font-family: Cairo, Arial, sans-serif; width: 740px; padding: 32px; color:#111827; background:#fff;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #154278; padding-bottom:16px; margin-bottom:20px;">
        <div>
          <div style="font-size:20px; font-weight:900; color:#154278;">سند زايد — كشف حساب مستثمر</div>
          <div style="font-size:12px; color:#6b7280; margin-top:4px;">تاريخ الإصدار: ${fmtDate(data.generated_at)}</div>
        </div>
        <div style="font-size:28px;">🏗️</div>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:16px; font-weight:800;">${data.investor.name}</div>
        <div style="font-size:12px; color:#6b7280; margin-top:2px;">${data.investor.phone}${data.investor.email ? " — " + data.investor.email : ""}</div>
      </div>

      <div style="display:flex; gap:12px; margin-bottom:24px;">
        <div style="flex:1; background:#f9f9f7; border-radius:10px; padding:14px;">
          <div style="font-size:11px; color:#6b7280;">إجمالي المدفوع</div>
          <div style="font-size:16px; font-weight:800; color:#16a34a;">${fmt(data.total_deposits)} ج.م</div>
        </div>
        <div style="flex:1; background:#f9f9f7; border-radius:10px; padding:14px;">
          <div style="font-size:11px; color:#6b7280;">إجمالي المستحق على العقود</div>
          <div style="font-size:16px; font-weight:800; color:#d97706;">${fmt(data.total_contract_dues)} ج.م</div>
        </div>
        <div style="flex:1; background:#f9f9f7; border-radius:10px; padding:14px;">
          <div style="font-size:11px; color:#6b7280;">الرصيد الحالي</div>
          <div style="font-size:16px; font-weight:800; color:${data.balance >= 0 ? "#16a34a" : "#ef4444"};">${fmt(data.balance)} ج.م ${data.balance >= 0 ? "(دائن)" : "(مستحق عليه)"}</div>
        </div>
      </div>

      <div style="font-size:14px; font-weight:800; margin-bottom:8px;">العقود</div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:24px; font-size:12px;">
        <thead>
          <tr style="background:#f8f7f3;">
            <th style="padding:8px 10px; text-align:right;">المرحلة</th>
            <th style="padding:8px 10px; text-align:right;">المساحة</th>
            <th style="padding:8px 10px; text-align:right;">سعر المتر</th>
            <th style="padding:8px 10px; text-align:right;">الإجمالي</th>
            <th style="padding:8px 10px; text-align:right;">التاريخ</th>
          </tr>
        </thead>
        <tbody>${contractRows || `<tr><td colspan="5" style="padding:14px;text-align:center;color:#9ca3af;">لا توجد عقود</td></tr>`}</tbody>
      </table>

      <div style="font-size:14px; font-weight:800; margin-bottom:8px;">سجل الحركات</div>
      <table style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead>
          <tr style="background:#f8f7f3;">
            <th style="padding:8px 10px; text-align:right;">التاريخ</th>
            <th style="padding:8px 10px; text-align:right;">النوع</th>
            <th style="padding:8px 10px; text-align:right;">السبب</th>
            <th style="padding:8px 10px; text-align:right;">البيان</th>
            <th style="padding:8px 10px; text-align:right;">المبلغ</th>
          </tr>
        </thead>
        <tbody>${txRows || `<tr><td colspan="5" style="padding:14px;text-align:center;color:#9ca3af;">لا توجد حركات</td></tr>`}</tbody>
      </table>

      <div style="margin-top:28px; font-size:10px; color:#9ca3af; text-align:center;">سند زايد — نظام إدارة الاستثمار العقاري</div>
    </div>
  `;
}

export async function generateStatementPdfBlob(data: StatementData): Promise<Blob> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-10000px";
  container.style.left = "-10000px";
  container.innerHTML = buildHtml(data);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, { scale: 2, useCORS: true });

    const pdf = new jsPDF("p", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;
    const imgData = canvas.toDataURL("image/png");

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return pdf.output("blob");
  } finally {
    document.body.removeChild(container);
  }
}
