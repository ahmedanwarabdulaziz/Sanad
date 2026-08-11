"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CircularProgress, IconButton } from "@mui/material";
import { ArrowForwardOutlined, ReceiptLongOutlined } from "@mui/icons-material";

interface Investor { id: string; name: string; }

interface Transaction {
  id: string;
  transaction_type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER" | "EXPENSE";
  amount: number;
  description: string;
  transaction_date: string;
  reason_type?: "CONTRACT_PAYMENT" | "PERSONAL_SERVICE_DEDUCTION" | "CREDIT_REFUND" | null;
  from_account?: { account_name: string } | null;
  to_account?: { account_name: string } | null;
  contract?: { id: string; stage?: { name: string } } | null;
  expense?: { id: string; description: string } | null;
}

interface Ledger {
  balance: number;
  total_deposits: number;
  total_withdrawals: number;
  total_contract_dues: number;
  total_reconciliation_delta: number;
  transactions: Transaction[];
}

const REASON_LABEL: Record<string, string> = {
  CONTRACT_PAYMENT: "دفعة عقد",
  PERSONAL_SERVICE_DEDUCTION: "خصم شخصي",
  CREDIT_REFUND: "استرداد رصيد",
};
const REASON_COLOR: Record<string, string> = {
  CONTRACT_PAYMENT: "#154278",
  PERSONAL_SERVICE_DEDUCTION: "#ef4444",
  CREDIT_REFUND: "#d97706",
};

export default function InvestorTransactionsPage() {
  const params = useParams();
  const router = useRouter();
  const investorId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [investor, setInvestor] = useState<Investor | null>(null);
  const [ledger, setLedger] = useState<Ledger | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [invRes, ledgerRes] = await Promise.all([
        fetch(`/api/sanad-zayed/investors/${investorId}`),
        fetch(`/api/sanad-zayed/investors/${investorId}/ledger`),
      ]);
      const invData = await invRes.json();
      const ledgerData = await ledgerRes.json();

      if (invRes.ok) setInvestor(invData.investor);
      if (ledgerRes.ok) setLedger(ledgerData);
    } finally {
      setLoading(false);
    }
  }, [investorId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center" }}><CircularProgress sx={{ color: "#154278" }} /></div>;
  }

  const transactions = [...(ledger?.transactions ?? [])].sort(
    (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
  );

  return (
    <div dir="rtl" style={{ fontFamily: "var(--font-cairo), Cairo, sans-serif" }}>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
        <IconButton onClick={() => router.push(`/admin/sanad-zayed/investors/${investorId}`)} sx={{ color: "#6b7280" }}>
          <ArrowForwardOutlined sx={{ transform: "scaleX(-1)" }} />
        </IconButton>
        <div>
          <h1 style={{ fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 900, color: "#111827", margin: 0 }}>سجل حركات {investor?.name ?? ""}</h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>كل الإيداعات والسحوبات المرتبطة بهذا المستثمر، مع السبب والتاريخ</p>
        </div>
      </motion.div>

      {/* ── Summary ── */}
      {ledger && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>حركة المدفوعات</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid rgba(0,0,0,0.05)", flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>إجمالي المدفوعات (الوارد)</div>
              <div style={{ fontSize: 19, fontWeight: 900, color: "#16a34a" }}>{ledger.total_deposits.toLocaleString("ar-EG-u-nu-latn")}</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid rgba(0,0,0,0.05)", flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>المسترد / المخصوم</div>
              <div style={{ fontSize: 19, fontWeight: 900, color: "#ef4444" }}>{ledger.total_withdrawals.toLocaleString("ar-EG-u-nu-latn")}</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1.5px solid rgba(21,66,120,0.15)", flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>صافي المدفوعات المتبقي</div>
              <div style={{ fontSize: 19, fontWeight: 900, color: "#154278" }}>{(ledger.total_deposits - ledger.total_withdrawals).toLocaleString("ar-EG-u-nu-latn")}</div>
            </div>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>الموقف الإجمالي (شامل العقود)</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid rgba(0,0,0,0.05)", flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>مستحق على العقود</div>
              <div style={{ fontSize: 19, fontWeight: 900, color: "#d97706" }}>{ledger.total_contract_dues.toLocaleString("ar-EG-u-nu-latn")}</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid rgba(0,0,0,0.05)", flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>الرصيد النهائي</div>
              <div style={{ fontSize: 19, fontWeight: 900, color: ledger.balance >= 0 ? "#16a34a" : "#ef4444" }}>
                {ledger.balance.toLocaleString("ar-EG-u-nu-latn")} {ledger.balance >= 0 ? "(دائن)" : "(مستحق)"}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Transactions table ── */}
      {transactions.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, padding: 50, textAlign: "center", color: "#9ca3af" }}>
          <ReceiptLongOutlined sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
          <div style={{ fontSize: 14, fontWeight: 700 }}>لا توجد حركات مسجلة لهذا المستثمر بعد</div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid #f0ede6" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ background: "#f8f7f3", borderBottom: "2px solid #f0ede6" }}>
                  {["التاريخ", "النوع", "السبب", "المرتبط بـ", "البيان", "الخزينة/الحساب", "المبلغ"].map(h => (
                    <th key={h} style={{ padding: "14px 18px", textAlign: "right", fontSize: 12, color: "#6b7280", fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => {
                  const isIncoming = tx.transaction_type === "DEPOSIT";
                  const isTransfer = tx.transaction_type === "TRANSFER";
                  return (
                    <tr key={tx.id} style={{ borderBottom: "1px solid #f5f4f0" }}>
                      <td style={{ padding: "14px 18px", fontSize: 13, color: "#6b7280" }}>{new Date(tx.transaction_date).toLocaleDateString("ar-EG-u-nu-latn")}</td>
                      <td style={{ padding: "14px 18px" }}>
                        <span style={{
                          background: isTransfer ? "rgba(21,66,120,0.1)" : isIncoming ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.1)",
                          color: isTransfer ? "#154278" : isIncoming ? "#16a34a" : "#ef4444",
                          padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                        }}>
                          {isTransfer ? "تحويل" : isIncoming ? "إيداع / وارد" : "سحب / صادر"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        {tx.reason_type ? (
                          <span style={{ background: `${REASON_COLOR[tx.reason_type]}18`, color: REASON_COLOR[tx.reason_type], padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                            {REASON_LABEL[tx.reason_type] ?? tx.reason_type}
                          </span>
                        ) : <span style={{ fontSize: 12, color: "#d1d5db" }}>—</span>}
                      </td>
                      <td style={{ padding: "14px 18px", fontSize: 12, color: "#6b7280" }}>
                        {tx.contract?.stage?.name || tx.expense?.description || "—"}
                      </td>
                      <td style={{ padding: "14px 18px", fontSize: 13, color: "#374151", maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {tx.description || "—"}
                      </td>
                      <td style={{ padding: "14px 18px", fontSize: 13, color: "#374151" }}>
                        {isTransfer
                          ? `${tx.from_account?.account_name ?? "—"} ← ${tx.to_account?.account_name ?? "—"}`
                          : isIncoming ? (tx.to_account?.account_name ?? "—") : (tx.from_account?.account_name ?? "—")}
                      </td>
                      <td style={{ padding: "14px 18px", fontSize: 14, fontWeight: 800, color: isTransfer ? "#111827" : isIncoming ? "#16a34a" : "#ef4444", direction: "ltr", textAlign: "right", whiteSpace: "nowrap" }}>
                        {isTransfer ? "" : isIncoming ? "+" : "-"} {Number(tx.amount).toLocaleString("ar-EG-u-nu-latn")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
