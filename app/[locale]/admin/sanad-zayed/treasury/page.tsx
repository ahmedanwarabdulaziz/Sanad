"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Alert, IconButton,
  MenuItem, Select, FormControl, InputLabel
} from "@mui/material";
import {
  AddOutlined, AccountBalanceOutlined, CloseOutlined,
  TrendingUpOutlined, TrendingDownOutlined, AccountBalanceWalletOutlined
} from "@mui/icons-material";
import { sanitizeDecimalInput } from "@/lib/sanad-zayed/decimalInput";

interface Account {
  id: string;
  account_name: string;
  account_type: string;
  current_balance: number;
  custodian_name?: string;
}

interface Transaction {
  id: string;
  transaction_type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER" | "EXPENSE";
  amount: number;
  description: string;
  transaction_date: string;
  created_at: string;
  from_account?: { account_name: string };
  to_account?: { account_name: string };
  investor?: { name: string };
  contract?: { id: string; stage?: { name: string } } | null;
  reason_type?: "CONTRACT_PAYMENT" | "PERSONAL_SERVICE_DEDUCTION" | "CREDIT_REFUND" | null;
}

interface Investor {
  id: string;
  name: string;
}

interface Contract {
  id: string;
  stage?: { name: string };
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

export default function TreasuryPage() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [investorContracts, setInvestorContracts] = useState<Contract[]>([]);
  const [flash, setFlash] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal states
  const [accOpen, setAccOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  
  // Forms
  const [accForm, setAccForm] = useState({ name: "", type: "SAFE_CASH" });
  const [txForm, setTxForm] = useState({
    type: "DEPOSIT",
    amount: "",
    description: "",
    account_id: "",
    to_account_id: "",
    investor_id: "",
    contract_id: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const showFlash = (type: "success" | "error", text: string) => {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 4500);
  };

  const fetchData = useCallback(async () => {
    try {
      const [treasuryRes, invRes] = await Promise.all([
        fetch("/api/sanad-zayed/treasury"),
        fetch("/api/sanad-zayed/investors")
      ]);
      const tData = await treasuryRes.json();
      const iData = await invRes.json();
      
      if (tData.accounts) setAccounts(tData.accounts);
      if (tData.transactions) setTransactions(tData.transactions);
      if (iData.investors) setInvestors(iData.investors);
    } catch {
      showFlash("error", "فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!txForm.investor_id) { setInvestorContracts([]); return; }
    fetch(`/api/sanad-zayed/contracts?investor_id=${txForm.investor_id}`)
      .then(r => r.json())
      .then(d => setInvestorContracts(d.contracts ?? []))
      .catch(() => setInvestorContracts([]));
  }, [txForm.investor_id]);

  const handleAddAccount = async () => {
    if (!accForm.name.trim()) return showFlash("error", "اسم الحساب مطلوب");
    setSubmitting(true);
    try {
      const res = await fetch("/api/sanad-zayed/treasury/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_name: accForm.name, account_type: accForm.type })
      });
      if (!res.ok) throw new Error("حدث خطأ");
      setAccOpen(false);
      setAccForm({ name: "", type: "SAFE_CASH" });
      showFlash("success", "تم إنشاء الخزينة/الحساب بنجاح");
      fetchData();
    } catch {
      showFlash("error", "تعذر إنشاء الحساب");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTx = async () => {
    if (!txForm.account_id) return showFlash("error", "اختر الخزينة");
    if (txForm.type === "TRANSFER" && !txForm.to_account_id) return showFlash("error", "اختر الحساب المحول إليه");
    if (txForm.type === "TRANSFER" && txForm.account_id === txForm.to_account_id) return showFlash("error", "لا يمكن التحويل لنفس الحساب");
    if (!txForm.amount || isNaN(Number(txForm.amount)) || Number(txForm.amount) <= 0) 
      return showFlash("error", "المبلغ غير صحيح");

    setSubmitting(true);
    try {
      const payload = {
        transaction_type: txForm.type,
        amount: Number(txForm.amount),
        description: txForm.description,
        investor_id: txForm.type === "DEPOSIT" ? (txForm.investor_id || null) : null,
        contract_id: txForm.type === "DEPOSIT" ? (txForm.contract_id || null) : null,
        from_account_id: (txForm.type === "WITHDRAWAL" || txForm.type === "TRANSFER") ? txForm.account_id : null,
        to_account_id: txForm.type === "DEPOSIT" ? txForm.account_id : txForm.type === "TRANSFER" ? txForm.to_account_id : null,
      };

      const res = await fetch("/api/sanad-zayed/treasury", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("حدث خطأ");
      
      setTxOpen(false);
      setTxForm({ type: "DEPOSIT", amount: "", description: "", account_id: "", to_account_id: "", investor_id: "", contract_id: "" });
      showFlash("success", "تم تسجيل المعاملة بنجاح وتحديث الرصيد");
      fetchData();
    } catch {
      showFlash("error", "تعذر تسجيل المعاملة");
    } finally {
      setSubmitting(false);
    }
  };

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.current_balance), 0);

  // ── shared styles ──
  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "10px", backgroundColor: "#f9f9f7", fontFamily: "var(--font-cairo)",
      "& fieldset": { borderColor: "#e5e3dc" },
      "&.Mui-focused fieldset": { borderColor: "#154278", borderWidth: 2 },
    },
    "& .MuiInputLabel-root": { fontFamily: "var(--font-cairo)", fontSize: 14 },
  };

  return (
    <div dir="rtl" style={{ fontFamily: "var(--font-cairo), Cairo, sans-serif" }}>
      
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 900, color: "#111827", margin: 0 }}>الخزينة والحسابات (الدفتر)</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "5px 0 0" }}>إدارة الأموال الواردة والصادرة والمدفوعات من المستثمرين</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button
            onClick={() => setAccOpen(true)}
            sx={{ fontFamily: "var(--font-cairo)", color: "#154278", background: "rgba(21,66,120,0.08)", borderRadius: "10px", fontWeight: 700 }}
          >
            + خزينة/حساب جديد
          </Button>
          <Button
            onClick={() => setTxOpen(true)}
            variant="contained"
            sx={{ fontFamily: "var(--font-cairo)", background: "linear-gradient(135deg, #154278 0%, #1e6abf 100%)", borderRadius: "10px", fontWeight: 700, boxShadow: "0 4px 14px rgba(21,66,120,0.3)" }}
          >
            + تسجيل دفعة / معاملة
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {flash && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ marginBottom: 16 }}>
            <Alert severity={flash.type} onClose={() => setFlash(null)} sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)" }}>
              {flash.text}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}><CircularProgress sx={{ color: "#154278" }} /></div>
      ) : (
        <>
          {/* ── Balances Cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16, marginBottom: 24 }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ background: "linear-gradient(135deg, #154278 0%, #1e6abf 100%)", borderRadius: 16, padding: 20, color: "#fff", boxShadow: "0 4px 20px rgba(21,66,120,0.2)" }}>
              <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 8 }}>إجمالي الرصيد المتوفر</div>
              <div style={{ fontSize: 26, fontWeight: 900 }}>EGP {totalBalance.toLocaleString()}</div>
            </motion.div>
            
            {accounts.map(acc => (
              <div key={acc.id} style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #f0ede6", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6b7280", fontSize: 13, marginBottom: 8 }}>
                  <AccountBalanceWalletOutlined sx={{ fontSize: 18 }} />
                  {acc.account_type === "BANK" ? "حساب بنكي" : acc.account_type === "PETTY_CASH" ? "عهدة نقدية" : "خزينة نقدية"}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 2 }}>
                  {acc.account_name} {acc.custodian_name ? `(${acc.custodian_name})` : ""}
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#16a34a", direction: "ltr", textAlign: "right" }}>EGP {Number(acc.current_balance).toLocaleString()}</div>
              </div>
            ))}
          </div>

          {/* ── Ledger Table ── */}
          <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid #f0ede6", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <div style={{ padding: "16px 20px", background: "#fcfbf9", borderBottom: "1px solid #f0ede6", fontWeight: 800, color: "#111827", fontSize: 16 }}>
              سجل المعاملات والمدفوعات
            </div>
            
            {transactions.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>لا توجد معاملات مسجلة بعد</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: "#fff", borderBottom: "2px solid #f0ede6" }}>
                      {["تاريخ", "النوع", "السبب", "المبلغ", "الخزينة/العهدة", "مستثمر / عقد", "البيان"].map(h => (
                        <th key={h} style={{ padding: "12px 20px", textAlign: "right", fontSize: 12, color: "#6b7280" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => {
                      const isIncoming = tx.transaction_type === "DEPOSIT";
                      const isTransfer = tx.transaction_type === "TRANSFER";
                      const isExpense = tx.transaction_type === "EXPENSE";
                      const isOutgoing = tx.transaction_type === "WITHDRAWAL" || isExpense;

                      return (
                        <tr key={tx.id} style={{ borderBottom: "1px solid #f5f4f0" }}>
                          <td style={{ padding: "14px 20px", fontSize: 13, color: "#6b7280", direction: "ltr", textAlign: "right" }}>
                            {new Date(tx.created_at).toLocaleDateString("en-GB")}
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <span style={{ 
                              background: isTransfer ? "rgba(21,66,120,0.1)" : isIncoming ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.1)",
                              color: isTransfer ? "#154278" : isIncoming ? "#16a34a" : "#ef4444",
                              padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                              display: "inline-flex", alignItems: "center", gap: 4
                            }}>
                              {isTransfer ? <AccountBalanceWalletOutlined sx={{ fontSize: 14 }}/> : isIncoming ? <TrendingDownOutlined sx={{ fontSize: 14 }}/> : <TrendingUpOutlined sx={{ fontSize: 14 }}/>}
                              {isTransfer ? "تحويل" : isIncoming ? "إيداع / وارد" : isExpense ? "مصروف" : "سحب / صادر"}
                            </span>
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            {tx.reason_type ? (
                              <span style={{
                                background: `${REASON_COLOR[tx.reason_type]}18`, color: REASON_COLOR[tx.reason_type],
                                padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                              }}>
                                {REASON_LABEL[tx.reason_type] ?? tx.reason_type}
                              </span>
                            ) : <span style={{ fontSize: 12, color: "#d1d5db" }}>—</span>}
                          </td>
                          <td style={{ padding: "14px 20px", fontSize: 14, fontWeight: 800, color: isTransfer ? "#111827" : isIncoming ? "#16a34a" : "#ef4444", direction: "ltr", textAlign: "right" }}>
                            {isTransfer ? "" : isIncoming ? "+" : "-"} EGP {Number(tx.amount).toLocaleString()}
                          </td>
                          <td style={{ padding: "14px 20px", fontSize: 13, color: "#374151", fontWeight: 600 }}>
                            {isTransfer ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span>{tx.from_account?.account_name}</span>
                                <span style={{ color: "#9ca3af" }}>←</span>
                                <span>{tx.to_account?.account_name}</span>
                              </div>
                            ) : isIncoming ? tx.to_account?.account_name : tx.from_account?.account_name}
                          </td>
                          <td style={{ padding: "14px 20px", fontSize: 13, color: tx.investor ? "#154278" : "#9ca3af", fontWeight: tx.investor ? 700 : 400 }}>
                            {tx.investor?.name || "—"}
                            {tx.contract?.stage?.name && (
                              <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, marginTop: 2 }}>{tx.contract.stage.name}</div>
                            )}
                          </td>
                          <td style={{ padding: "14px 20px", fontSize: 13, color: "#6b7280", maxWidth: 200 }}>
                            {tx.description}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Add Account Dialog ── */}
      <Dialog open={accOpen} onClose={() => setAccOpen(false)} PaperProps={{ sx: { borderRadius: "20px", direction: "rtl", width: 400 } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 800 }}>
          إنشاء خزينة / عهدة / حساب بنكي
          <IconButton onClick={() => setAccOpen(false)} sx={{ position: "absolute", left: 12, top: 12 }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "10px !important" }}>
          <TextField label="اسم الحساب (مثال: خزينة الإدارة، عهدة فلان)" value={accForm.name} onChange={e => setAccForm({...accForm, name: e.target.value})} fullWidth sx={inputSx} />
          <FormControl fullWidth sx={inputSx}>
            <InputLabel>النوع</InputLabel>
            <Select value={accForm.type} label="النوع" onChange={e => setAccForm({...accForm, type: e.target.value})}>
              <MenuItem value="SAFE_CASH">خزينة نقدية (Safe)</MenuItem>
              <MenuItem value="PETTY_CASH">عهدة نقدية (Petty Cash)</MenuItem>
              <MenuItem value="BANK">حساب بنكي (Bank)</MenuItem>
            </Select>
          </FormControl>
          
          {accForm.type === "PETTY_CASH" && (
            <TextField 
              label="اسم صاحب العهدة (اختياري)" 
              value={(accForm as any).custodian_name || ""} 
              onChange={e => setAccForm({...accForm, custodian_name: e.target.value} as any)} 
              fullWidth 
              sx={inputSx} 
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleAddAccount} variant="contained" disabled={submitting} sx={{ fontFamily: "var(--font-cairo)", background: "#154278", borderRadius: "10px", width: "100%", py: 1.2 }}>
            {submitting ? "جاري الحفظ..." : "إنشاء"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Transaction Dialog ── */}
      <Dialog open={txOpen} onClose={() => setTxOpen(false)} PaperProps={{ sx: { borderRadius: "20px", direction: "rtl", maxWidth: 500, width: "100%" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 800 }}>
          تسجيل حركة مالية / دفعة مستثمر
          <IconButton onClick={() => setTxOpen(false)} sx={{ position: "absolute", left: 12, top: 12 }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "10px !important" }}>
          
          <div style={{ display: "flex", gap: 10 }}>
            <Button
              onClick={() => setTxForm({...txForm, type: "DEPOSIT"})}
              sx={{ flex: 1, py: 1, borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 700, border: "2px solid", borderColor: txForm.type === "DEPOSIT" ? "#16a34a" : "#e5e7eb", color: txForm.type === "DEPOSIT" ? "#16a34a" : "#6b7280", background: txForm.type === "DEPOSIT" ? "rgba(22,163,74,0.05)" : "transparent" }}
            >إيداع / وارد</Button>
            <Button
              onClick={() => setTxForm({...txForm, type: "WITHDRAWAL"})}
              sx={{ flex: 1, py: 1, borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 700, border: "2px solid", borderColor: txForm.type === "WITHDRAWAL" ? "#ef4444" : "#e5e7eb", color: txForm.type === "WITHDRAWAL" ? "#ef4444" : "#6b7280", background: txForm.type === "WITHDRAWAL" ? "rgba(239,68,68,0.05)" : "transparent" }}
            >سحب / صادر</Button>
            <Button
              onClick={() => setTxForm({...txForm, type: "TRANSFER"})}
              sx={{ flex: 1, py: 1, borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 700, border: "2px solid", borderColor: txForm.type === "TRANSFER" ? "#154278" : "#e5e7eb", color: txForm.type === "TRANSFER" ? "#154278" : "#6b7280", background: txForm.type === "TRANSFER" ? "rgba(21,66,120,0.05)" : "transparent" }}
            >تحويل داخلي</Button>
          </div>

          <TextField label="المبلغ" value={txForm.amount} onChange={e => setTxForm({...txForm, amount: sanitizeDecimalInput(e.target.value)})} type="text" inputMode="decimal" fullWidth sx={{ ...inputSx, "& .MuiInputBase-input": { direction: "ltr", textAlign: "right" } }} />
          
          <FormControl fullWidth sx={inputSx}>
            <InputLabel>{txForm.type === "TRANSFER" ? "تحويل من (الخزينة/العهدة)" : "الخزينة / الحساب (إلى أين ستدخل أو تخرج الأموال؟)"}</InputLabel>
            <Select value={txForm.account_id} label={txForm.type === "TRANSFER" ? "تحويل من (الخزينة/العهدة)" : "الخزينة / الحساب (إلى أين ستدخل أو تخرج الأموال؟)"} onChange={e => setTxForm({...txForm, account_id: e.target.value})}>
              {accounts.map(a => (
                <MenuItem key={a.id} value={a.id}>
                  {a.account_name} {a.account_type === "PETTY_CASH" && a.custodian_name ? `(${a.custodian_name})` : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {txForm.type === "TRANSFER" && (
            <FormControl fullWidth sx={inputSx}>
              <InputLabel>تحويل إلى (الخزينة/العهدة)</InputLabel>
              <Select value={txForm.to_account_id} label="تحويل إلى (الخزينة/العهدة)" onChange={e => setTxForm({...txForm, to_account_id: e.target.value})}>
                {accounts.map(a => (
                  <MenuItem key={a.id} value={a.id} disabled={a.id === txForm.account_id}>
                    {a.account_name} {a.account_type === "PETTY_CASH" && a.custodian_name ? `(${a.custodian_name})` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {txForm.type === "DEPOSIT" && (
            <FormControl fullWidth sx={inputSx}>
              <InputLabel>اربط الدفعة بمستثمر (اختياري)</InputLabel>
              <Select value={txForm.investor_id} label="اربط الدفعة بمستثمر (اختياري)" onChange={e => setTxForm({...txForm, investor_id: e.target.value, contract_id: ""})}>
                <MenuItem value="">— لا يوجد مستثمر (إيداع عام) —</MenuItem>
                {investors.map(i => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
              </Select>
            </FormControl>
          )}

          {txForm.type === "DEPOSIT" && txForm.investor_id && (
            <FormControl fullWidth sx={inputSx}>
              <InputLabel>اربط الدفعة بعقد (اختياري)</InputLabel>
              <Select value={txForm.contract_id} label="اربط الدفعة بعقد (اختياري)" onChange={e => setTxForm({...txForm, contract_id: e.target.value})}>
                <MenuItem value="">— بدون ربط بعقد محدد —</MenuItem>
                {investorContracts.map(c => <MenuItem key={c.id} value={c.id}>{c.stage?.name ?? "—"}</MenuItem>)}
              </Select>
            </FormControl>
          )}

          <TextField label="بيان المعاملة (ملاحظات)" value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} multiline rows={2} fullWidth sx={inputSx} />
        
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleAddTx} variant="contained" disabled={submitting} sx={{ fontFamily: "var(--font-cairo)", background: "#154278", borderRadius: "10px", width: "100%", py: 1.2, fontWeight: 700 }}>
            {submitting ? "جاري التسجيل..." : "تأكيد المعاملة"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
