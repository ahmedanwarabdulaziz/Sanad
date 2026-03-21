"use client";

import { useState, useEffect, useCallback } from "react";
import { useProject } from "../layout";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
} from "@mui/material";
import {
  AddOutlined,
  AccountBalanceOutlined,
  LockOutlined,
  LockOpenOutlined,
  DeleteOutline,
  SwapHorizOutlined,
} from "@mui/icons-material";

interface Account {
  id: string;
  account_name: string;
  account_type: string;
  current_balance: number;
  is_active: boolean;
}

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string;
  transaction_date: string;
  from_account: { account_name: string } | null;
  to_account: { account_name: string } | null;
}

const formatNumber = (n: number) => new Intl.NumberFormat("en-US").format(n);
const formatDate = (d: string) => { if (!d) return "—"; const [y, m, dd] = d.split("-"); return `${dd}-${m}-${y}`; };

const TYPES: Record<string, { label: string; color: string; icon: string }> = {
  BANK: { label: "بنك", color: "#3b82f6", icon: "🏦" },
  SAFE_CASH: { label: "خزينة", color: "#10b981", icon: "🔐" },
  PETTY_CASH: { label: "عهدة", color: "#f59e0b", icon: "💼" },
};

const TX_TYPES: Record<string, { label: string; color: string }> = {
  DEPOSIT: { label: "إيداع", color: "#10b981" },
  TRANSFER: { label: "تحويل", color: "#3b82f6" },
  WITHDRAWAL: { label: "سحب", color: "#f59e0b" },
  EXPENSE: { label: "مصروف", color: "#ef4444" },
};

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px", backgroundColor: "rgba(15, 23, 42, 0.5)", color: "#e2e8f0", fontFamily: "var(--font-cairo)",
    "& fieldset": { borderColor: "rgba(148, 163, 184, 0.15)" },
    "&:hover fieldset": { borderColor: "rgba(59, 130, 246, 0.4)" },
    "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
  },
  "& .MuiInputLabel-root": { color: "#94a3b8", fontFamily: "var(--font-cairo)", "&.Mui-focused": { color: "#60a5fa" } },
  "& .MuiInputBase-input": { textAlign: "right" },
};

const dialogSx = {
  "& .MuiDialog-paper": {
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: "20px",
    color: "#e2e8f0", direction: "rtl" as const, minWidth: "min(450px, 92vw)",
  },
};

const menuSx = {
  PaperProps: {
    sx: {
      background: "#1e293b", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "12px",
      "& .MuiMenuItem-root": { fontFamily: "var(--font-cairo)", color: "#e2e8f0", "&:hover": { background: "rgba(59,130,246,0.1)" } },
    },
  },
};

export default function TreasuryPage() {
  const { projectId } = useProject();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [depositMap, setDepositMap] = useState<Record<string, number>>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add account dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ account_name: "", account_type: "BANK" });
  const [addSaving, setAddSaving] = useState(false);

  // Transfer dialog
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({ from_account_id: "", to_account_id: "", amount: "", description: "", transaction_date: new Date().toISOString().split("T")[0] });
  const [transferSaving, setTransferSaving] = useState(false);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteAccount, setDeleteAccount] = useState<Account | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const [expenseMap, setExpenseMap] = useState<Record<string, number>>({});
  const [transferOutMap, setTransferOutMap] = useState<Record<string, number>>({});
  const [transferInMap, setTransferInMap] = useState<Record<string, number>>({});

  const fetchAll = useCallback(async () => {
    try {
      const [accountsRes, depositsRes, txRes, expRes] = await Promise.all([
        fetch("/api/erp-auth/financial-accounts"),
        fetch(`/api/erp-auth/projects/${projectId}/deposits`),
        fetch(`/api/erp-auth/projects/${projectId}/transactions`),
        fetch(`/api/erp-auth/projects/${projectId}/expenses`),
      ]);
      const accountsData = await accountsRes.json();
      const depositsData = await depositsRes.json();
      const txData = await txRes.json();
      const expData = await expRes.json();

      if (accountsData.accounts) setAccounts(accountsData.accounts);
      if (txData.transactions) setTransactions(txData.transactions);

      // Aggregate deposits per account
      const dMap: Record<string, number> = {};
      (depositsData.deposits || []).forEach((d: { financial_account_id: string; amount: number }) => {
        dMap[d.financial_account_id] = (dMap[d.financial_account_id] || 0) + Number(d.amount);
      });
      setDepositMap(dMap);

      // Aggregate expenses per account
      // Use EXPENSE transactions where available, fallback to expense company_amount for old data
      const eMap: Record<string, number> = {};
      const expenseTransactions = (txData.transactions || []).filter((t: { transaction_type: string }) => t.transaction_type === "EXPENSE");
      
      if (expenseTransactions.length > 0) {
        // Use actual treasury transactions
        expenseTransactions.forEach((t: { from_account_id: string; amount: number }) => {
          if (t.from_account_id) {
            eMap[t.from_account_id] = (eMap[t.from_account_id] || 0) + Number(t.amount);
          }
        });
      }
      
      // Also include expenses that don't have corresponding transactions (old data)
      const txExpenseIds = new Set(expenseTransactions.map((t: { reference_id: string }) => t.reference_id).filter(Boolean));
      (expData.expenses || []).forEach((e: { id: string; financial_account_id: string; company_amount: number; payments: { account_id: string; amount: number }[] }) => {
        if (txExpenseIds.has(e.id)) return; // Skip if already counted from transactions
        const pmts = e.payments || [];
        if (pmts.length > 0) {
          pmts.forEach((p) => {
            if (p.account_id) eMap[p.account_id] = (eMap[p.account_id] || 0) + Number(p.amount);
          });
        } else if (e.financial_account_id) {
          eMap[e.financial_account_id] = (eMap[e.financial_account_id] || 0) + Number(e.company_amount);
        }
      });
      setExpenseMap(eMap);

      // Aggregate transfers per account
      const tOutMap: Record<string, number> = {};
      const tInMap: Record<string, number> = {};
      (txData.transactions || []).filter((t: { transaction_type: string }) => t.transaction_type === "TRANSFER").forEach((t: { from_account_id: string; to_account_id: string; amount: number }) => {
        if (t.from_account_id) tOutMap[t.from_account_id] = (tOutMap[t.from_account_id] || 0) + Number(t.amount);
        if (t.to_account_id) tInMap[t.to_account_id] = (tInMap[t.to_account_id] || 0) + Number(t.amount);
      });
      setTransferOutMap(tOutMap);
      setTransferInMap(tInMap);
    } catch {
      setError("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAdd = async () => {
    setAddSaving(true); setError(null);
    try {
      const res = await fetch("/api/erp-auth/financial-accounts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم إضافة الحساب"); setAddOpen(false);
      setAddForm({ account_name: "", account_type: "BANK" }); fetchAll();
    } catch { setError("فشل"); } finally { setAddSaving(false); }
  };

  const handleToggle = async (acc: Account) => {
    setError(null);
    try {
      const res = await fetch(`/api/erp-auth/financial-accounts/${acc.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !acc.is_active, project_id: projectId }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess(acc.is_active ? "تم إغلاق الحساب" : "تم تفعيل الحساب"); fetchAll();
    } catch { setError("فشل"); }
  };

  const handleDelete = async () => {
    if (!deleteAccount) return;
    setDeleteSaving(true); setError(null);
    try {
      const res = await fetch(`/api/erp-auth/financial-accounts/${deleteAccount.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم حذف الحساب"); setDeleteOpen(false); fetchAll();
    } catch { setError("فشل"); } finally { setDeleteSaving(false); }
  };

  const handleTransfer = async () => {
    setTransferSaving(true); setError(null);
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}/transactions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...transferForm, amount: Number(transferForm.amount) }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم التحويل بنجاح"); setTransferOpen(false);
      setTransferForm({ from_account_id: "", to_account_id: "", amount: "", description: "", transaction_date: new Date().toISOString().split("T")[0] }); fetchAll();
    } catch { setError("فشل"); } finally { setTransferSaving(false); }
  };

  const totalDeposits = Object.values(depositMap).reduce((s, v) => s + v, 0);
  const totalExpenses = Object.values(expenseMap).reduce((s, v) => s + v, 0);
  const netTotal = totalDeposits - totalExpenses;
  const activeAccounts = accounts.filter((a) => a.is_active);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>الخزينة</h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0, fontFamily: "var(--font-cairo)" }}>إدارة الحسابات المالية والتحويلات</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="contained" startIcon={<SwapHorizOutlined />} onClick={() => setTransferOpen(true)}
            disabled={activeAccounts.length < 2}
            sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
            تحويل
          </Button>
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setAddOpen(true)}
            sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
            حساب جديد
          </Button>
        </div>
      </div>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontFamily: "var(--font-cairo)", direction: "rtl" }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#86efac", fontFamily: "var(--font-cairo)", direction: "rtl" }}>{success}</Alert>}

      {/* Summary */}
      <div style={{ padding: "24px", borderRadius: "20px", marginBottom: "24px", background: "linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.08) 100%)", border: "1px solid rgba(59,130,246,0.15)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "20px" }}>
          <div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>إجمالي الإيداعات</p>
            <p style={{ fontSize: "24px", fontWeight: 700, color: "#10b981", margin: 0 }}>{formatNumber(totalDeposits)} <span style={{ fontSize: "12px", fontWeight: 400, color: "#64748b" }}>ج.م</span></p>
          </div>
          <div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>إجمالي المصروفات</p>
            <p style={{ fontSize: "24px", fontWeight: 700, color: "#ef4444", margin: 0 }}>{formatNumber(totalExpenses)} <span style={{ fontSize: "12px", fontWeight: 400, color: "#64748b" }}>ج.م</span></p>
          </div>
          <div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>صافي الرصيد</p>
            <p style={{ fontSize: "24px", fontWeight: 700, color: netTotal >= 0 ? "#3b82f6" : "#ef4444", margin: 0 }}>{formatNumber(netTotal)} <span style={{ fontSize: "12px", fontWeight: 400, color: "#64748b" }}>ج.م</span></p>
          </div>
          <div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>الحسابات النشطة</p>
            <p style={{ fontSize: "24px", fontWeight: 700, color: "#8b5cf6", margin: 0 }}>{activeAccounts.length}</p>
          </div>
        </div>
      </div>

      {/* Accounts Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}><CircularProgress sx={{ color: "#3b82f6" }} /></div>
      ) : (
        <>
          {accounts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px", borderRadius: "20px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)", marginBottom: "24px" }}>
              <AccountBalanceOutlined sx={{ fontSize: 48, color: "#334155", mb: 1 }} />
              <p style={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "16px" }}>لا توجد حسابات بعد</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", marginBottom: "32px" }}>
              {accounts.map((acc) => {
                const t = TYPES[acc.account_type] || TYPES.BANK;
                const deposits = depositMap[acc.id] || 0;
                const expenses = expenseMap[acc.id] || 0;
                const tOut = transferOutMap[acc.id] || 0;
                const tIn = transferInMap[acc.id] || 0;
                const netBalance = deposits + tIn - expenses - tOut;
                return (
                  <div key={acc.id} style={{
                    padding: "20px 24px", borderRadius: "18px", background: "rgba(30, 41, 59, 0.6)",
                    border: `1px solid ${acc.is_active ? "rgba(148,163,184,0.08)" : "rgba(239,68,68,0.15)"}`,
                    opacity: acc.is_active ? 1 : 0.5,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: `${t.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{t.icon}</div>
                        <div>
                          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#f1f5f9", margin: "0 0 2px", fontFamily: "var(--font-cairo)" }}>{acc.account_name}</h3>
                          <Chip label={t.label} size="small" sx={{ backgroundColor: `${t.color}22`, color: t.color, fontFamily: "var(--font-cairo)", fontSize: "10px", fontWeight: 600, height: "20px" }} />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "2px" }}>
                        <IconButton size="small" onClick={() => handleToggle(acc)} title={acc.is_active ? "إغلاق" : "تفعيل"}
                          sx={{ color: acc.is_active ? "#f59e0b" : "#10b981", "&:hover": { background: acc.is_active ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)" } }}>
                          {acc.is_active ? <LockOutlined sx={{ fontSize: 16 }} /> : <LockOpenOutlined sx={{ fontSize: 16 }} />}
                        </IconButton>
                        <IconButton size="small" onClick={() => { setDeleteAccount(acc); setDeleteOpen(true); }} title="حذف"
                          sx={{ color: "#94a3b8", "&:hover": { color: "#f87171", background: "rgba(248,113,113,0.1)" } }}>
                          <DeleteOutline sx={{ fontSize: 16 }} />
                        </IconButton>
                      </div>
                    </div>
                    <div style={{ paddingTop: "12px", borderTop: "1px solid rgba(148,163,184,0.06)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>الإيداعات</span>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#10b981" }}>+{formatNumber(deposits)}</span>
                      </div>
                      {expenses > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>المصروفات</span>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#ef4444" }}>-{formatNumber(expenses)}</span>
                        </div>
                      )}
                      {(tOut > 0 || tIn > 0) && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>التحويلات</span>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: tIn - tOut >= 0 ? "#3b82f6" : "#f59e0b" }}>{tIn - tOut >= 0 ? "+" : ""}{formatNumber(tIn - tOut)}</span>
                        </div>
                      )}
                      <div style={{ borderTop: "1px solid rgba(148,163,184,0.08)", paddingTop: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>الرصيد</span>
                          <span style={{ fontSize: "20px", fontWeight: 700, color: netBalance >= 0 ? "#10b981" : "#ef4444" }}>{formatNumber(netBalance)} <span style={{ fontSize: "12px", fontWeight: 400, color: "#64748b" }}>ج.م</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Transaction History */}
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#f1f5f9", margin: "0 0 16px", fontFamily: "var(--font-cairo)" }}>
              حركات الخزينة
            </h2>
            {transactions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px", borderRadius: "16px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
                <p style={{ color: "#64748b", fontFamily: "var(--font-cairo)", margin: 0 }}>لا توجد حركات بعد</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "8px" }}>
                {transactions.map((tx) => {
                  const txType = TX_TYPES[tx.transaction_type] || TX_TYPES.DEPOSIT;
                  return (
                    <div key={tx.id} style={{
                      padding: "14px 20px", borderRadius: "14px", background: "rgba(30,41,59,0.6)",
                      border: "1px solid rgba(148,163,184,0.08)", display: "flex", justifyContent: "space-between",
                      alignItems: "center", flexWrap: "wrap", gap: "8px",
                    }}>
                      <div style={{ flex: 1, minWidth: "200px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <Chip label={txType.label} size="small" sx={{ backgroundColor: `${txType.color}22`, color: txType.color, fontFamily: "var(--font-cairo)", fontSize: "10px", fontWeight: 600, height: "20px" }} />
                          <span style={{ fontSize: "13px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>{formatDate(tx.transaction_date)}</span>
                        </div>
                        <p style={{ fontSize: "13px", color: "#e2e8f0", margin: "0", fontFamily: "var(--font-cairo)" }}>
                          {tx.transaction_type === "TRANSFER"
                            ? `${tx.from_account?.account_name || "—"} ← ${tx.to_account?.account_name || "—"}`
                            : tx.transaction_type === "EXPENSE"
                            ? `${tx.description || "مصروف"} — من: ${tx.from_account?.account_name || "—"}`
                            : tx.description || tx.to_account?.account_name || "—"
                          }
                        </p>
                      </div>
                      <p style={{ fontSize: "16px", fontWeight: 700, color: txType.color, margin: 0 }}>
                        {formatNumber(tx.amount)} ج.م
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Add Account Dialog ── */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>حساب مالي جديد</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
          <TextField label="اسم الحساب *" value={addForm.account_name} onChange={(e) => setAddForm({ ...addForm, account_name: e.target.value })} fullWidth sx={fieldSx} />
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>نوع الحساب</InputLabel>
            <Select value={addForm.account_type} onChange={(e) => setAddForm({ ...addForm, account_type: e.target.value })} label="نوع الحساب" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              <MenuItem value="BANK">🏦 بنك</MenuItem>
              <MenuItem value="SAFE_CASH">🔐 خزينة</MenuItem>
              <MenuItem value="PETTY_CASH">💼 عهدة</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setAddOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleAdd} disabled={addSaving || !addForm.account_name} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
            {addSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "إضافة"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Transfer Dialog ── */}
      <Dialog open={transferOpen} onClose={() => setTransferOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>تحويل بين حسابات</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>من حساب</InputLabel>
            <Select value={transferForm.from_account_id} onChange={(e) => setTransferForm({ ...transferForm, from_account_id: e.target.value })} label="من حساب" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              {activeAccounts.filter(a => a.id !== transferForm.to_account_id).map((a) => (
                <MenuItem key={a.id} value={a.id}>{a.account_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>إلى حساب</InputLabel>
            <Select value={transferForm.to_account_id} onChange={(e) => setTransferForm({ ...transferForm, to_account_id: e.target.value })} label="إلى حساب" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              {activeAccounts.filter(a => a.id !== transferForm.from_account_id).map((a) => (
                <MenuItem key={a.id} value={a.id}>{a.account_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="المبلغ (ج.م)" type="number" value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} fullWidth sx={fieldSx} />
          <TextField label="تاريخ التحويل" type="date" value={transferForm.transaction_date} onChange={(e) => setTransferForm({ ...transferForm, transaction_date: e.target.value })} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left" } }} InputLabelProps={{ shrink: true }} />
          <TextField label="الوصف / الملاحظات" value={transferForm.description} onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })} fullWidth multiline rows={2} sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setTransferOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleTransfer}
            disabled={transferSaving || !transferForm.from_account_id || !transferForm.to_account_id || !transferForm.amount}
            variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
            {transferSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "تحويل"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#f87171" }}>حذف الحساب</DialogTitle>
        <DialogContent>
          <p style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", fontSize: "15px", margin: 0 }}>
            هل أنت متأكد من حذف <strong style={{ color: "#e2e8f0" }}>{deleteAccount?.account_name}</strong>؟
            لا يمكن الحذف إذا كانت هناك إيداعات أو حركات مرتبطة.
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleDelete} disabled={deleteSaving} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "#dc2626", "&:hover": { background: "#b91c1c" } }}>
            {deleteSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حذف"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
