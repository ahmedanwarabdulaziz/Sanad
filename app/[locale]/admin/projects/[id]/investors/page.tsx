"use client";

import { useState, useEffect, useCallback } from "react";
import { useProject } from "../layout";
import { useRouter } from "next/navigation";
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
  IconButton,
} from "@mui/material";
import { AddOutlined, AccountBalanceWalletOutlined, WarningAmberOutlined } from "@mui/icons-material";
import { Tooltip } from "@mui/material";

interface Account {
  id: string;
  account_name: string;
  account_type: string;
}

interface InvestorSummary {
  id: string;
  name: string;
  phone: string;
  email: string;
  total_deposited: number;
  total_contracted: number;
  remaining_balance: number;
}

interface ContractRaw {
  id: string;
  investor_id: string;
  stage_id: string;
  unit_quantity: number;
  unit_price_at_contract: number;
  management_fee_pct: number;
  status: string;
}

interface StageRaw {
  id: string;
  stage_name: string;
  management_percentage: number;
}

interface ExpenseRaw {
  stage_id: string;
  investor_amount: number;
}

const formatNumber = (n: number) => new Intl.NumberFormat("en-US").format(n);
const formatDate = (d: string) => { const [y, m, dd] = d.split("-"); return `${dd}-${m}-${y}`; };

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
    color: "#e2e8f0", direction: "rtl" as const, minWidth: "min(480px, 92vw)",
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

export default function InvestorsPage() {
  const { projectId } = useProject();
  const router = useRouter();
  const [investors, setInvestors] = useState<InvestorSummary[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allContracts, setAllContracts] = useState<ContractRaw[]>([]);
  const [allStages, setAllStages] = useState<StageRaw[]>([]);
  const [allExpenses, setAllExpenses] = useState<ExpenseRaw[]>([]);
  const [projectArea, setProjectArea] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add investor dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", phone: "", email: "", national_id: "" });
  const [addSaving, setAddSaving] = useState(false);

  // Add deposit to existing investor
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositInvestor, setDepositInvestor] = useState<InvestorSummary | null>(null);
  const [depositForm, setDepositForm] = useState({ amount: "", financial_account_id: "", notes: "", deposit_date: new Date().toISOString().split("T")[0] });
  const [depositSaving, setDepositSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [summaryRes, accountsRes, ctRes, stRes, expRes, projRes] = await Promise.all([
        fetch(`/api/erp-auth/projects/${projectId}/investor-summary`),
        fetch("/api/erp-auth/financial-accounts"),
        fetch(`/api/erp-auth/projects/${projectId}/contracts`),
        fetch(`/api/erp-auth/projects/${projectId}/stages`),
        fetch(`/api/erp-auth/projects/${projectId}/expenses`),
        fetch(`/api/erp-auth/projects/${projectId}`),
      ]);
      const summaryData = await summaryRes.json();
      const accountsData = await accountsRes.json();
      const ctData = await ctRes.json();
      const stData = await stRes.json();
      const expData = await expRes.json();
      const projData = await projRes.json();
      if (summaryData.summaries) setInvestors(summaryData.summaries);
      if (accountsData.accounts) setAccounts(accountsData.accounts);
      setAllContracts(ctData.contracts || []);
      setAllStages(stData.stages || []);
      setAllExpenses(expData.expenses || []);
      setProjectArea(Number(projData.project?.land_area) || 0);
    } catch {
      setError("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Check if investor has contracts needing update
  const getInvestorAlert = (investorId: string) => {
    if (projectArea <= 0 || allStages.length === 0) return null;
    const investorContracts = allContracts.filter(c => c.investor_id === investorId && c.status === "ACTIVE");
    for (const c of investorContracts) {
      const contractStageIdx = allStages.findIndex(s => s.id === c.stage_id);
      if (contractStageIdx < 0) continue;
      // Calculate full current price across ALL stages (including stages after contract)
      let currentPrice = 0;
      for (let i = 0; i < allStages.length; i++) {
        const st = allStages[i];
        const stExp = allExpenses.filter(e => e.stage_id === st.id).reduce((s, e) => s + Number(e.investor_amount), 0);
        if (stExp <= 0) continue;
        const ppm = stExp / projectArea;
        const mgmt = (i === contractStageIdx) ? c.management_fee_pct : Number(st.management_percentage) || 0;
        currentPrice += ppm + (ppm * mgmt / 100);
      }
      if (Math.round(currentPrice) > c.unit_price_at_contract) {
        return Math.round(currentPrice) - c.unit_price_at_contract;
      }
    }
    return null;
  };

  const handleAddInvestor = async () => {
    setAddSaving(true); setError(null);
    try {
      const res = await fetch("/api/erp-auth/investors", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم إضافة المستثمر بنجاح"); setAddOpen(false);
      setAddForm({ name: "", phone: "", email: "", national_id: "" }); fetchAll();
    } catch { setError("فشل في إضافة المستثمر"); } finally { setAddSaving(false); }
  };

  const handleAddDeposit = async () => {
    if (!depositInvestor) return;
    setDepositSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}/deposits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investor_id: depositInvestor.id,
          amount: Number(depositForm.amount),
          financial_account_id: depositForm.financial_account_id,
          notes: depositForm.notes,
          deposit_date: depositForm.deposit_date,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم تسجيل الإيداع بنجاح");
      setDepositOpen(false);
      setDepositForm({ amount: "", financial_account_id: "", notes: "", deposit_date: new Date().toISOString().split("T")[0] });
      fetchAll();
    } catch {
      setError("فشل في تسجيل الإيداع");
    } finally {
      setDepositSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>
            المستثمرون
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0, fontFamily: "var(--font-cairo)" }}>
            إدارة المستثمرين والإيداعات والأرصدة
          </p>
        </div>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setAddOpen(true)}
          sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
          مستثمر جديد
        </Button>
      </div>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontFamily: "var(--font-cairo)", direction: "rtl" }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#86efac", fontFamily: "var(--font-cairo)", direction: "rtl" }}>{success}</Alert>}

      {/* Investors Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}><CircularProgress sx={{ color: "#3b82f6" }} /></div>
      ) : investors.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", borderRadius: "20px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
          <p style={{ fontSize: "48px", margin: "0 0 12px" }}>👤</p>
          <p style={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "16px" }}>لا يوجد مستثمرون بعد</p>
        </div>
      ) : (
        <div style={{ borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(148,163,184,0.08)" }}>
          {/* Table Header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 50px", gap: "8px", padding: "12px 20px", background: "rgba(15,23,42,0.6)", borderBottom: "1px solid rgba(148,163,184,0.08)", fontFamily: "var(--font-cairo)", fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
            <span>المستثمر</span>
            <span>الهاتف</span>
            <span style={{ textAlign: "center" }}>الإيداعات</span>
            <span style={{ textAlign: "center" }}>متعاقد عليه</span>
            <span style={{ textAlign: "center" }}>الرصيد</span>
            <span></span>
          </div>
          {/* Rows */}
          {investors.map((inv, i) => (
            <div key={inv.id}
              onClick={() => router.push(`/admin/projects/${projectId}/investors/${inv.id}`)}
              style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 50px", gap: "8px",
                padding: "14px 20px", alignItems: "center", cursor: "pointer",
                background: i % 2 === 0 ? "rgba(30,41,59,0.3)" : "rgba(30,41,59,0.5)",
                borderBottom: "1px solid rgba(148,163,184,0.04)",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(59,130,246,0.06)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = i % 2 === 0 ? "rgba(30,41,59,0.3)" : "rgba(30,41,59,0.5)"; }}
            >
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9", fontFamily: "var(--font-cairo)", display: "flex", alignItems: "center", gap: "6px" }}>
                {inv.name}
                {(() => {
                  const diff = getInvestorAlert(inv.id);
                  if (!diff) return null;
                  return (
                    <Tooltip title={`العقد محتاج تحديث — فرق ${formatNumber(diff)} ج.م/متر`} arrow>
                      <WarningAmberOutlined sx={{ fontSize: 16, color: "#fbbf24", animation: "pulse 2s ease-in-out infinite", "@keyframes pulse": { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.5 } } }} />
                    </Tooltip>
                  );
                })()}
              </span>
              <span style={{ fontSize: "13px", color: "#94a3b8" }}>{inv.phone || "—"}</span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#10b981", textAlign: "center" }}>{formatNumber(inv.total_deposited)}</span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#f59e0b", textAlign: "center" }}>{formatNumber(inv.total_contracted)}</span>
              <span style={{ fontSize: "13px", fontWeight: 700, textAlign: "center", color: inv.remaining_balance >= 0 ? "#3b82f6" : "#ef4444" }}>{formatNumber(inv.remaining_balance)}</span>
              <IconButton size="small"
                onClick={(e) => { e.stopPropagation(); setDepositInvestor(inv); setDepositOpen(true); }}
                title="إيداع جديد"
                sx={{ color: "#10b981", "&:hover": { background: "rgba(16,185,129,0.15)" } }}>
                <AccountBalanceWalletOutlined sx={{ fontSize: 16 }} />
              </IconButton>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Investor Dialog ── */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>مستثمر جديد</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
          <TextField label="الاسم *" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} fullWidth sx={fieldSx} />
          <TextField label="رقم الهاتف" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} fullWidth sx={fieldSx} />
          <TextField label="البريد الإلكتروني" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} fullWidth sx={fieldSx} />
          <TextField label="الرقم القومي" value={addForm.national_id} onChange={(e) => setAddForm({ ...addForm, national_id: e.target.value })} fullWidth sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setAddOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleAddInvestor} disabled={addSaving || !addForm.name} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
            {addSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "إضافة"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Deposit Dialog ── */}
      <Dialog open={depositOpen} onClose={() => setDepositOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>
          إيداع جديد — {depositInvestor?.name}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
          <TextField label="المبلغ (ج.م) *" type="number" value={depositForm.amount}
            onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })} fullWidth sx={fieldSx} />
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>الخزينة / الحساب *</InputLabel>
            <Select value={depositForm.financial_account_id}
              onChange={(e) => setDepositForm({ ...depositForm, financial_account_id: e.target.value })}
              label="الخزينة / الحساب *" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              {accounts.map((acc) => (
                <MenuItem key={acc.id} value={acc.id}>
                  {acc.account_name} ({acc.account_type === "BANK" ? "بنك" : acc.account_type === "SAFE_CASH" ? "خزينة" : "عهدة"})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="تاريخ الإيداع" type="date" value={depositForm.deposit_date}
            onChange={(e) => setDepositForm({ ...depositForm, deposit_date: e.target.value })}
            fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left" } }} InputLabelProps={{ shrink: true }} />
          <TextField label="ملاحظات" value={depositForm.notes}
            onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })}
            fullWidth multiline rows={2} sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDepositOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleAddDeposit}
            disabled={depositSaving || !depositForm.amount || !depositForm.financial_account_id}
            variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
            {depositSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "تسجيل الإيداع"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
