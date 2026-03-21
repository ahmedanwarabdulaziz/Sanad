"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useProject } from "../../layout";
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
  ArrowForwardOutlined,
  AccountBalanceWalletOutlined,
  AddOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  DeleteOutline,
  UpgradeOutlined,
} from "@mui/icons-material";
import Link from "next/link";

interface InvestorSummary {
  id: string;
  name: string;
  phone: string;
  email: string;
  national_id: string;
  total_deposited: number;
  total_contracted: number;
  remaining_balance: number;
}

interface Deposit {
  id: string;
  amount: number;
  deposit_date: string;
  notes: string;
  financial_account_id: string;
  account: { account_name: string; account_type: string };
}

interface Contract {
  id: string;
  unit_quantity: number;
  unit_price_at_contract: number;
  management_fee_pct: number;
  total_contract_value: number;
  contract_date: string;
  status: string;
  stage_id: string;
  stage: { stage_name: string };
  price_snapshot?: { stage_id: string; stage_name: string; ppm: number; mgmt: number; total: number }[] | null;
}

interface Account { id: string; account_name: string; account_type: string; }
interface Stage { id: string; stage_name: string; status: string; management_percentage: number; }
interface ProjectExpense { id: string; investor_amount: number; stage_id: string; }

const formatNumber = (n: number) => new Intl.NumberFormat("en-US").format(n);
const formatDate = (d: string) => { if (!d) return "—"; const [y, m, dd] = d.split("-"); return `${dd}-${m}-${y}`; };

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

const menuSx = { PaperProps: { sx: { background: "#1e293b", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "12px", "& .MuiMenuItem-root": { fontFamily: "var(--font-cairo)", color: "#e2e8f0", "&:hover": { background: "rgba(59,130,246,0.1)" } } } } };

const inlineFieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px", backgroundColor: "rgba(15,23,42,0.6)", color: "#e2e8f0", fontSize: "13px",
    "& fieldset": { borderColor: "rgba(148,163,184,0.2)" },
    "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
  },
  "& .MuiInputBase-input": { padding: "6px 10px" },
};

export default function InvestorDetailPage() {
  const params = useParams();
  const { projectId, project } = useProject();
  const investorId = params.investorId as string;
  const projectArea = Number((project as unknown as Record<string, unknown>).land_area) || 0;

  const [investor, setInvestor] = useState<InvestorSummary | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [projExpenses, setProjExpenses] = useState<ProjectExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Profile edit
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", email: "", national_id: "" });
  const [profileSaving, setProfileSaving] = useState(false);

  // Deposit dialog
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositForm, setDepositForm] = useState({ amount: "", financial_account_id: "", notes: "", deposit_date: new Date().toISOString().split("T")[0] });
  const [depositSaving, setDepositSaving] = useState(false);

  // Contract dialog
  const [contractOpen, setContractOpen] = useState(false);
  const [contractForm, setContractForm] = useState({ stage_id: "", unit_quantity: "", unit_price_at_contract: "", management_fee_pct: "" });
  const [contractSaving, setContractSaving] = useState(false);

  // Inline deposit edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ amount: "", deposit_date: "" });
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteDeposit, setDeleteDeposit] = useState<Deposit | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // Contract edit
  const [editContractExp, setEditContractExp] = useState<Contract | null>(null);
  const [editContractForm, setEditContractForm] = useState({ unit_quantity: "", management_fee_pct: "" });
  const [editContractSaving, setEditContractSaving] = useState(false);

  // Contract delete
  const [deleteContract, setDeleteContract] = useState<Contract | null>(null);
  const [deleteContractSaving, setDeleteContractSaving] = useState(false);

  // Contract upgrade
  const [upgradeContract, setUpgradeContract] = useState<Contract | null>(null);
  const [upgradeStageId, setUpgradeStageId] = useState("");
  const [upgradeSaving, setUpgradeSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [summaryRes, depositsRes, contractsRes, accountsRes, stagesRes, expensesRes] = await Promise.all([
        fetch(`/api/erp-auth/projects/${projectId}/investor-summary?investor_id=${investorId}`),
        fetch(`/api/erp-auth/projects/${projectId}/deposits?investor_id=${investorId}`),
        fetch(`/api/erp-auth/projects/${projectId}/contracts`),
        fetch("/api/erp-auth/financial-accounts"),
        fetch(`/api/erp-auth/projects/${projectId}/stages`),
        fetch(`/api/erp-auth/projects/${projectId}/expenses`),
      ]);
      const summaryData = await summaryRes.json();
      const depositsData = await depositsRes.json();
      const contractsData = await contractsRes.json();
      const accountsData = await accountsRes.json();
      const stagesData = await stagesRes.json();
      const expensesData = await expensesRes.json();

      const inv = summaryData.summaries?.[0];
      if (inv) {
        setInvestor(inv);
        setProfileForm({ name: inv.name, phone: inv.phone || "", email: inv.email || "", national_id: inv.national_id || "" });
      }
      if (depositsData.deposits) setDeposits(depositsData.deposits);
      const allContracts = contractsData.contracts || [];
      setContracts(allContracts.filter((c: Contract & { investor_id?: string; investor?: { id: string } }) => c.investor_id === investorId || c.investor?.id === investorId));
      if (accountsData.accounts) setAccounts(accountsData.accounts);
      if (stagesData.stages) setStages(stagesData.stages);
      if (expensesData.expenses) setProjExpenses(expensesData.expenses);
    } catch {
      setError("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [projectId, investorId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Profile save
  const handleProfileSave = async () => {
    setProfileSaving(true); setError(null);
    try {
      const res = await fetch(`/api/erp-auth/investors/${investorId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم تحديث البيانات"); setProfileEditing(false); fetchAll();
    } catch { setError("فشل"); } finally { setProfileSaving(false); }
  };

  const handleDeposit = async () => {
    setDepositSaving(true); setError(null);
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}/deposits`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investor_id: investorId, amount: Number(depositForm.amount), financial_account_id: depositForm.financial_account_id, notes: depositForm.notes, deposit_date: depositForm.deposit_date }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم تسجيل الإيداع"); setDepositOpen(false); setDepositForm({ amount: "", financial_account_id: "", notes: "", deposit_date: new Date().toISOString().split("T")[0] }); fetchAll();
    } catch { setError("فشل"); } finally { setDepositSaving(false); }
  };

  const handleContract = async () => {
    setContractSaving(true); setError(null);
    try {
      // Build price snapshot for each stage up to selected
      const snapIdx = stages.findIndex(s => s.id === contractForm.stage_id);
      const snapshot: { stage_id: string; stage_name: string; ppm: number; mgmt: number; total: number }[] = [];
      if (snapIdx >= 0 && projectArea > 0) {
        for (let i = 0; i <= snapIdx; i++) {
          const st = stages[i];
          const stExp = projExpenses.filter(e => e.stage_id === st.id).reduce((s, e) => s + Number(e.investor_amount), 0);
          const ppm = stExp / projectArea;
          const isContractStage = i === snapIdx;
          const mgmt = isContractStage ? (Number(contractForm.management_fee_pct) || 0) : Number(st.management_percentage) || 0;
          const total = ppm + (ppm * mgmt / 100);
          snapshot.push({ stage_id: st.id, stage_name: st.stage_name, ppm: Math.round(ppm), mgmt, total: Math.round(total) });
        }
      }
      const res = await fetch(`/api/erp-auth/projects/${projectId}/contracts`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investor_id: investorId, stage_id: contractForm.stage_id, unit_quantity: Number(contractForm.unit_quantity), unit_price_at_contract: Number(contractForm.unit_price_at_contract), management_fee_pct: Number(contractForm.management_fee_pct) || 0, price_snapshot: snapshot.length > 0 ? snapshot : null }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم إضافة العقد"); setContractOpen(false); setContractForm({ stage_id: "", unit_quantity: "", unit_price_at_contract: "", management_fee_pct: "" }); fetchAll();
    } catch { setError("فشل"); } finally { setContractSaving(false); }
  };

  const startEdit = (d: Deposit) => { setEditingId(d.id); setEditForm({ amount: String(d.amount), deposit_date: d.deposit_date }); };
  const cancelEdit = () => { setEditingId(null); };

  const saveEdit = async (depositId: string) => {
    setEditSaving(true); setError(null);
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}/deposits/${depositId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(editForm.amount), deposit_date: editForm.deposit_date }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم تعديل الإيداع"); setEditingId(null); fetchAll();
    } catch { setError("فشل"); } finally { setEditSaving(false); }
  };

  const handleDeleteDeposit = async () => {
    if (!deleteDeposit) return;
    setDeleteSaving(true); setError(null);
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}/deposits/${deleteDeposit.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم حذف الإيداع"); setDeleteOpen(false); setDeleteDeposit(null); fetchAll();
    } catch { setError("فشل"); } finally { setDeleteSaving(false); }
  };

  // Contract edit/delete
  const openEditContract = (c: Contract) => {
    setEditContractExp(c);
    setEditContractForm({ unit_quantity: String(c.unit_quantity), management_fee_pct: String(c.management_fee_pct) });
  };

  // Recalculate unit price based on new management %
  const getEditPrice = () => {
    if (!editContractExp) return 0;
    const newMgmt = Number(editContractForm.management_fee_pct) || 0;
    const sp = getStagePrice(editContractExp.stage_id, newMgmt);
    if (sp.finalPrice <= 0) return editContractExp.unit_price_at_contract;
    return Math.round(sp.finalPrice);
  };

  const handleEditContract = async () => {
    if (!editContractExp) return;
    setEditContractSaving(true); setError(null);
    const newPrice = getEditPrice();
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}/contracts/${editContractExp.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unit_quantity: Number(editContractForm.unit_quantity), management_fee_pct: Number(editContractForm.management_fee_pct), unit_price_at_contract: newPrice }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم تعديل العقد"); setEditContractExp(null); fetchAll();
    } catch { setError("فشل"); } finally { setEditContractSaving(false); }
  };
  const handleDeleteContract = async () => {
    if (!deleteContract) return;
    setDeleteContractSaving(true); setError(null);
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}/contracts/${deleteContract.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم حذف العقد"); setDeleteContract(null); fetchAll();
    } catch { setError("فشل"); } finally { setDeleteContractSaving(false); }
  };

  // Contract upgrade
  const handleUpgradeContract = async () => {
    if (!upgradeContract || !upgradeStageId) return;
    setUpgradeSaving(true); setError(null);
    try {
      const newPrice = getStagePrice(upgradeStageId);
      // Mark old contract as UPGRADED
      await fetch(`/api/erp-auth/projects/${projectId}/contracts/${upgradeContract.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "UPGRADED" }),
      });
      // Create new contract with new stage price
      const res = await fetch(`/api/erp-auth/projects/${projectId}/contracts`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investor_id: investorId,
          stage_id: upgradeStageId,
          unit_quantity: upgradeContract.unit_quantity,
          unit_price_at_contract: Math.round(newPrice.finalPrice),
          management_fee_pct: newPrice.mgmtPct,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم ترقية العقد بنجاح");
      setUpgradeContract(null); setUpgradeStageId("");
      fetchAll();
    } catch { setError("فشل في الترقية"); } finally { setUpgradeSaving(false); }
  };

  if (loading) return <div style={{ textAlign: "center", padding: "80px 0" }}><CircularProgress sx={{ color: "#3b82f6" }} /></div>;
  if (!investor) return <div style={{ textAlign: "center", padding: "80px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>المستثمر غير موجود</div>;

  const openStages = stages.filter(s => s.status === "OPEN");

  // Calculate cumulative price: each stage's management is applied to its own expenses only.
  // Previous stages use their default management_percentage.
  // Selected stage uses customMgmtPct (investor override), falls back to stage default.
  const getStagePrice = (stageId: string, customMgmtPct?: number) => {
    const stageIdx = stages.findIndex(s => s.id === stageId);
    if (stageIdx < 0 || projectArea <= 0) return { investorTotal: 0, pricePerMeter: 0, mgmtPct: 0, mgmtPerMeter: 0, finalPrice: 0 };

    let totalInvestorExp = 0;
    let finalPrice = 0;
    let totalMgmtPerMeter = 0;

    // Loop through all stages up to and including selected
    for (let i = 0; i <= stageIdx; i++) {
      const st = stages[i];
      const stageExp = projExpenses.filter(e => e.stage_id === st.id).reduce((s, e) => s + Number(e.investor_amount), 0);
      totalInvestorExp += stageExp;
      const stagePPM = stageExp / projectArea;
      const mgmt = (i === stageIdx && customMgmtPct !== undefined)
        ? customMgmtPct
        : Number(st.management_percentage) || 0;
      const mgmtPM = stagePPM * mgmt / 100;
      totalMgmtPerMeter += mgmtPM;
      finalPrice += stagePPM + mgmtPM;
    }

    const pricePerMeter = totalInvestorExp / projectArea;
    const selectedStage = stages[stageIdx];
    const mgmtPct = customMgmtPct !== undefined ? customMgmtPct : Number(selectedStage.management_percentage) || 0;

    return { investorTotal: totalInvestorExp, pricePerMeter, mgmtPct, mgmtPerMeter: totalMgmtPerMeter, finalPrice };
  };

  return (
    <div>
      {/* Back */}
      <Link href={`/admin/projects/${projectId}/investors`} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#64748b", textDecoration: "none", marginBottom: "16px", fontFamily: "var(--font-cairo)" }}>
        <ArrowForwardOutlined sx={{ fontSize: 16 }} /> العودة للمستثمرين
      </Link>

      {/* Profile Header */}
      <div style={{ padding: "20px 24px", borderRadius: "18px", background: "rgba(30,41,59,0.6)", border: "1px solid rgba(148,163,184,0.08)", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: profileEditing ? "16px" : "0" }}>
          {profileEditing ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", flex: 1, minWidth: "280px" }}>
              <TextField label="الاسم *" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} size="small" sx={fieldSx} />
              <TextField label="رقم الهاتف" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} size="small" sx={fieldSx} />
              <TextField label="البريد الإلكتروني" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} size="small" sx={fieldSx} />
              <TextField label="الرقم القومي" value={profileForm.national_id} onChange={(e) => setProfileForm({ ...profileForm, national_id: e.target.value })} size="small" sx={fieldSx} />
            </div>
          ) : (
            <div>
              <h1 style={{ fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 6px", fontFamily: "var(--font-cairo)" }}>{investor.name}</h1>
              <div style={{ display: "flex", gap: "16px", fontSize: "13px", color: "#64748b", fontFamily: "var(--font-cairo)", flexWrap: "wrap" }}>
                {investor.phone && <span>📱 {investor.phone}</span>}
                {investor.email && <span>✉️ {investor.email}</span>}
                {investor.national_id && <span>🪪 {investor.national_id}</span>}
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {profileEditing ? (
              <>
                <Button size="small" onClick={handleProfileSave} disabled={profileSaving || !profileForm.name} variant="contained"
                  sx={{ borderRadius: "8px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "12px", textTransform: "none", background: "#10b981", minWidth: "auto", px: 2 }}>
                  {profileSaving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "حفظ"}
                </Button>
                <Button size="small" onClick={() => setProfileEditing(false)}
                  sx={{ borderRadius: "8px", fontFamily: "var(--font-cairo)", fontSize: "12px", textTransform: "none", color: "#94a3b8", minWidth: "auto" }}>
                  إلغاء
                </Button>
              </>
            ) : (
              <>
                <IconButton size="small" onClick={() => setProfileEditing(true)} title="تعديل البيانات"
                  sx={{ color: "#f59e0b", "&:hover": { background: "rgba(245,158,11,0.1)" } }}>
                  <EditOutlined sx={{ fontSize: 18 }} />
                </IconButton>
                <Button variant="contained" startIcon={<AccountBalanceWalletOutlined />} onClick={() => setDepositOpen(true)} size="small"
                  sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "12px", textTransform: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
                  إيداع
                </Button>
                <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setContractOpen(true)} size="small" disabled={openStages.length === 0}
                  sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "12px", textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
                  عقد جديد
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Balance Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "إجمالي الإيداعات", value: formatNumber(investor.total_deposited), color: "#10b981", bg: "rgba(16,185,129,0.08)" },
          { label: "إجمالي التعاقدات", value: formatNumber(investor.total_contracted), color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
          { label: "الرصيد المتبقي", value: formatNumber(investor.remaining_balance), color: investor.remaining_balance >= 0 ? "#3b82f6" : "#ef4444", bg: investor.remaining_balance >= 0 ? "rgba(59,130,246,0.08)" : "rgba(239,68,68,0.08)" },
        ].map((card) => (
          <div key={card.label} style={{ padding: "18px 20px", borderRadius: "16px", background: card.bg, border: `1px solid ${card.color}22` }}>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>{card.label}</p>
            <p style={{ fontSize: "22px", fontWeight: 700, color: card.color, margin: 0 }}>{card.value} <span style={{ fontSize: "13px", fontWeight: 400 }}>ج.م</span></p>
          </div>
        ))}
      </div>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontFamily: "var(--font-cairo)", direction: "rtl" }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#86efac", fontFamily: "var(--font-cairo)", direction: "rtl" }}>{success}</Alert>}

      {/* ── Deposits Section ── */}
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#f1f5f9", margin: "0 0 16px", fontFamily: "var(--font-cairo)" }}>
          الدفعات ({deposits.length})
        </h2>
        {deposits.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px", borderRadius: "16px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
            <p style={{ color: "#64748b", fontFamily: "var(--font-cairo)", margin: 0 }}>لا توجد دفعات بعد</p>
          </div>
        ) : (
          <div style={{ borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(148,163,184,0.08)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr 1fr 80px", gap: "8px", padding: "10px 16px", background: "rgba(15,23,42,0.6)", borderBottom: "1px solid rgba(148,163,184,0.08)", fontFamily: "var(--font-cairo)", fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
              <span>المبلغ</span>
              <span>التاريخ</span>
              <span>الحساب</span>
              <span>ملاحظات</span>
              <span style={{ textAlign: "center" }}>إجراء</span>
            </div>
            {deposits.map((d, i) => (
              <div key={d.id} style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr 1fr 80px", gap: "8px",
                padding: editingId === d.id ? "10px 16px" : "12px 16px", alignItems: "center",
                background: i % 2 === 0 ? "rgba(30,41,59,0.3)" : "rgba(30,41,59,0.5)",
                borderBottom: "1px solid rgba(148,163,184,0.04)",
              }}>
                {editingId === d.id ? (
                  <>
                    <TextField type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} size="small" sx={inlineFieldSx} />
                    <TextField type="date" value={editForm.deposit_date} onChange={(e) => setEditForm({ ...editForm, deposit_date: e.target.value })} size="small" sx={{ ...inlineFieldSx, "& .MuiInputBase-input": { padding: "6px 10px", textAlign: "left" } }} />
                    <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>{d.account?.account_name}</span>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>{d.notes || "—"}</span>
                    <div style={{ display: "flex", justifyContent: "center", gap: "2px" }}>
                      <IconButton size="small" onClick={() => saveEdit(d.id)} disabled={editSaving} sx={{ color: "#10b981", "&:hover": { background: "rgba(16,185,129,0.15)" } }}>
                        <SaveOutlined sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton size="small" onClick={cancelEdit} sx={{ color: "#94a3b8", "&:hover": { background: "rgba(148,163,184,0.1)" } }}>
                        <CloseOutlined sx={{ fontSize: 16 }} />
                      </IconButton>
                    </div>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#10b981" }}>{formatNumber(d.amount)} ج.م</span>
                    <span style={{ fontSize: "13px", color: "#94a3b8" }}>{formatDate(d.deposit_date)}</span>
                    <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>{d.account?.account_name}</span>
                    <span style={{ fontSize: "12px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>{d.notes || "—"}</span>
                    <div style={{ display: "flex", justifyContent: "center", gap: "2px" }}>
                      <IconButton size="small" onClick={() => startEdit(d)} title="تعديل" sx={{ color: "#f59e0b", "&:hover": { background: "rgba(245,158,11,0.1)" } }}>
                        <EditOutlined sx={{ fontSize: 15 }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => { setDeleteDeposit(d); setDeleteOpen(true); }} title="حذف" sx={{ color: "#94a3b8", "&:hover": { color: "#f87171", background: "rgba(248,113,113,0.1)" } }}>
                        <DeleteOutline sx={{ fontSize: 15 }} />
                      </IconButton>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Contracts Section ── */}
      {contracts.length > 0 && (
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#f1f5f9", margin: "0 0 16px", fontFamily: "var(--font-cairo)" }}>
            العقود ({contracts.length})
          </h2>
          <div style={{ display: "grid", gap: "10px" }}>
            {contracts.map((c) => (
              <div key={c.id} style={{ padding: "16px 20px", borderRadius: "14px", background: "rgba(30,41,59,0.6)", border: "1px solid rgba(148,163,184,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0", fontFamily: "var(--font-cairo)" }}>{c.stage?.stage_name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Chip label={c.status === "ACTIVE" ? "سارٍ" : c.status === "UPGRADED" ? "مُرقّى" : "مُسوَّى"} size="small" sx={{ backgroundColor: c.status === "ACTIVE" ? "rgba(16,185,129,0.15)" : c.status === "UPGRADED" ? "rgba(59,130,246,0.15)" : "rgba(245,158,11,0.15)", color: c.status === "ACTIVE" ? "#10b981" : c.status === "UPGRADED" ? "#60a5fa" : "#f59e0b", fontFamily: "var(--font-cairo)", fontSize: "11px", fontWeight: 600, height: "22px" }} />
                    {c.status === "ACTIVE" && (
                      <IconButton size="small" onClick={() => { setUpgradeContract(c); setUpgradeStageId(""); }} title="ترقية" sx={{ color: "#60a5fa", "&:hover": { background: "rgba(59,130,246,0.1)" } }}>
                        <UpgradeOutlined sx={{ fontSize: 15 }} />
                      </IconButton>
                    )}
                    <IconButton size="small" onClick={() => openEditContract(c)} title="تعديل" sx={{ color: "#f59e0b", "&:hover": { background: "rgba(245,158,11,0.1)" } }}>
                      <EditOutlined sx={{ fontSize: 15 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => setDeleteContract(c)} title="حذف" sx={{ color: "#94a3b8", "&:hover": { color: "#f87171", background: "rgba(248,113,113,0.1)" } }}>
                      <DeleteOutline sx={{ fontSize: 15 }} />
                    </IconButton>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "20px", fontSize: "13px", color: "#94a3b8", fontFamily: "var(--font-cairo)", flexWrap: "wrap" }}>
                  <span>{formatNumber(c.unit_quantity)} متر × {formatNumber(c.unit_price_at_contract)} ج.م</span>
                  <span>الإدارة: {c.management_fee_pct}% (محسوبة في السعر)</span>
                  <span style={{ color: "#3b82f6", fontWeight: 600 }}>الإجمالي: {formatNumber(c.unit_quantity * c.unit_price_at_contract)} ج.م</span>
                </div>

                {/* ── Price/Stage Change Alert ── */}
                {c.status === "ACTIVE" && (() => {
                  const contractStageIdx = stages.findIndex(s => s.id === c.stage_id);
                  if (contractStageIdx < 0 || projectArea <= 0) return null;

                  // Calculate full current price across ALL stages
                  let fullCurrentPrice = 0;
                  let contractEraPrice = 0; // sum of stages up to & including contract stage
                  const breakdown: { stageId: string; name: string; ppm: number; mgmt: number; total: number; isNew: boolean; isContract: boolean; isChanged: boolean }[] = [];
                  for (let i = 0; i < stages.length; i++) {
                    const st = stages[i];
                    const stExp = projExpenses.filter(e => e.stage_id === st.id).reduce((s, e) => s + Number(e.investor_amount), 0);
                    if (stExp <= 0) continue;
                    const ppm = stExp / projectArea;
                    const isNew = i > contractStageIdx;
                    const isContract = i === contractStageIdx;
                    const mgmt = isContract ? c.management_fee_pct
                      : Number(st.management_percentage) || 0;
                    const total = ppm + (ppm * mgmt / 100);
                    fullCurrentPrice += total;
                    if (!isNew) contractEraPrice += total;
                    breakdown.push({ stageId: st.id, name: st.stage_name, ppm, mgmt, total, isNew, isContract, isChanged: false });
                  }

                  // Mark contract-era stages as changed if their total differs from contract price
                  const contractEraChanged = Math.round(contractEraPrice) !== c.unit_price_at_contract;
                  breakdown.forEach(b => {
                    if (b.isNew) { b.isChanged = true; } // new stages always "changed"
                    else if (contractEraChanged) { b.isChanged = true; } // contract-era expenses moved
                  });

                  const currentPrice = Math.round(fullCurrentPrice);
                  const contractPrice = c.unit_price_at_contract;
                  const priceDiff = currentPrice - contractPrice;
                  if (priceDiff <= 0) return null;

                  const hasNewStages = breakdown.some(b => b.isNew);
                  const oldTotal = c.unit_quantity * contractPrice;
                  const additionalNeeded = c.unit_quantity * currentPrice - oldTotal;
                  const metersAtNewPrice = oldTotal / currentPrice;
                  const metersLost = c.unit_quantity - metersAtNewPrice;

                  return (
                    <div style={{ marginTop: "10px", padding: "12px 16px", borderRadius: "12px", background: hasNewStages ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)", border: `1px solid ${hasNewStages ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`, direction: "rtl" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "14px" }}>{hasNewStages ? "🚨" : "⚠️"}</span>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: hasNewStages ? "#f87171" : "#fbbf24", fontFamily: "var(--font-cairo)" }}>
                          {hasNewStages ? "مرحلة جديدة أثّرت على السعر" : "تغيّر مصاريف المراحل بعد التعاقد"}
                        </span>
                      </div>
                      <p style={{ fontSize: "9px", color: "#64748b", margin: "0 0 6px", fontFamily: "var(--font-cairo)" }}>
                        📌 مرحلة العقد &nbsp; 📌🔄 مرحلة العقد (تغيّرت) &nbsp; ✅ بدون تغيير &nbsp; 🔄 تغيّرت &nbsp; 🆕 جديدة
                      </p>

                      {/* Per-stage breakdown with before/after */}
                      <div style={{ marginBottom: "8px", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(148,163,184,0.08)" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.8fr 0.8fr 0.7fr 0.5fr", gap: "4px", padding: "4px 10px", fontSize: "9px", color: "#64748b", fontFamily: "var(--font-cairo)", fontWeight: 600, background: "rgba(15,23,42,0.3)" }}>
                          <span>المرحلة</span>
                          <span style={{ textAlign: "center" }}>قبل/متر</span>
                          <span style={{ textAlign: "center" }}>بعد/متر</span>
                          <span style={{ textAlign: "center" }}>الفرق</span>
                          <span style={{ textAlign: "center" }}>الإدارة</span>
                        </div>
                        {breakdown.map((b, idx) => {
                          const icon = b.isNew ? "🆕" : b.isContract ? (b.isChanged ? "📌🔄" : "📌") : b.isChanged ? "🔄" : "✅";
                          const clr = b.isNew ? "#f87171" : (b.isChanged ? "#fbbf24" : b.isContract ? "#60a5fa" : "#34d399");
                          // Find old value from snapshot
                          const snap = c.price_snapshot?.find(s => s.stage_id === b.stageId);
                          const oldTotal = snap ? snap.total : null;
                          const diff = oldTotal !== null ? Math.round(b.total) - oldTotal : null;
                          return (
                            <div key={idx} style={{
                              display: "grid", gridTemplateColumns: "1.5fr 0.8fr 0.8fr 0.7fr 0.5fr", gap: "4px",
                              padding: "5px 10px", fontSize: "11px", fontFamily: "var(--font-cairo)",
                              background: b.isChanged ? (b.isNew ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.06)") : "transparent",
                              borderRight: `3px solid ${clr}`,
                            }}>
                              <span style={{ color: clr, fontWeight: 600 }}>
                                {icon} {b.name}
                              </span>
                              <span style={{ textAlign: "center", color: "#94a3b8" }}>{oldTotal !== null ? formatNumber(oldTotal) : (b.isNew ? "—" : "N/A")}</span>
                              <span style={{ textAlign: "center", color: "#fbbf24", fontWeight: 600 }}>{formatNumber(Math.round(b.total))}</span>
                              <span style={{ textAlign: "center", color: diff !== null && diff > 0 ? "#f87171" : diff !== null && diff < 0 ? "#34d399" : "#94a3b8", fontWeight: 600 }}>
                                {diff !== null ? (diff > 0 ? `+${formatNumber(diff)}` : diff < 0 ? formatNumber(diff) : "—") : (b.isNew ? `+${formatNumber(Math.round(b.total))}` : "?")}
                              </span>
                              <span style={{ textAlign: "center", color: clr }}>{b.mgmt}%</span>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ fontSize: "12px", fontFamily: "var(--font-cairo)", color: "#cbd5e1", display: "grid", gap: "4px" }}>
                        <div>
                          السعر الحالي/متر: <strong style={{ color: "#fbbf24" }}>{formatNumber(currentPrice)}</strong> ج.م
                          <span style={{ color: "#f87171", marginRight: "8px" }}>(+{formatNumber(priceDiff)} عن العقد)</span>
                        </div>
                        {hasNewStages && (
                          <p style={{ fontSize: "10px", color: "#f87171", margin: "2px 0", fontStyle: "italic" }}>
                            * المراحل الجديدة بنسبة الإدارة الأساسية — يمكن تغييرها عند ترقية العقد
                          </p>
                        )}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "6px" }}>
                          <div style={{ padding: "8px 10px", borderRadius: "10px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}>
                            <p style={{ fontSize: "10px", color: "#f87171", margin: "0 0 4px", fontWeight: 600 }}>نفس المساحة = دفع إضافي</p>
                            <p style={{ fontSize: "16px", fontWeight: 700, color: "#f87171", margin: 0 }}>+{formatNumber(Math.round(additionalNeeded))} ج.م</p>
                          </div>
                          <div style={{ padding: "8px 10px", borderRadius: "10px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
                            <p style={{ fontSize: "10px", color: "#fbbf24", margin: "0 0 4px", fontWeight: 600 }}>نفس المبلغ = مساحة أقل</p>
                            <p style={{ fontSize: "16px", fontWeight: 700, color: "#fbbf24", margin: 0 }}>{metersAtNewPrice.toFixed(2)} متر</p>
                            <p style={{ fontSize: "10px", color: "#f87171", margin: "2px 0 0" }}>(-{metersLost.toFixed(2)} متر)</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Add Deposit Dialog ── */}
      <Dialog open={depositOpen} onClose={() => setDepositOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>إيداع جديد</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
          <TextField label="المبلغ (ج.م)" type="number" value={depositForm.amount} onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })} fullWidth sx={fieldSx} />
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>الخزينة / الحساب</InputLabel>
            <Select value={depositForm.financial_account_id} onChange={(e) => setDepositForm({ ...depositForm, financial_account_id: e.target.value })} label="الخزينة / الحساب" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.account_name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="تاريخ الإيداع" type="date" value={depositForm.deposit_date} onChange={(e) => setDepositForm({ ...depositForm, deposit_date: e.target.value })} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left" } }} InputLabelProps={{ shrink: true }} />
          <TextField label="ملاحظات" value={depositForm.notes} onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })} fullWidth multiline rows={2} sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDepositOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleDeposit} disabled={depositSaving || !depositForm.amount || !depositForm.financial_account_id} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
            {depositSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "تسجيل"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Contract Dialog ── */}
      <Dialog open={contractOpen} onClose={() => setContractOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>عقد جديد</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>

          {/* Investor balance info */}
          {investor && (
            <div style={{ padding: "12px 16px", borderRadius: "14px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>رصيد المستثمر المتاح</span>
                <span style={{ fontSize: "18px", fontWeight: 700, color: "#34d399" }}>{formatNumber(investor.remaining_balance)} ج.م</span>
              </div>
            </div>
          )}

          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>المرحلة</InputLabel>
            <Select value={contractForm.stage_id} onChange={(e) => {
              const sid = e.target.value;
              const sp = getStagePrice(sid);
              setContractForm({
                ...contractForm,
                stage_id: sid,
                unit_price_at_contract: sp.finalPrice > 0 ? String(Math.round(sp.finalPrice)) : "",
                management_fee_pct: sp.mgmtPct > 0 ? String(sp.mgmtPct) : "",
              });
            }} label="المرحلة" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              {openStages.map((s) => <MenuItem key={s.id} value={s.id}>{s.stage_name}</MenuItem>)}
            </Select>
          </FormControl>

          {/* Per-stage breakdown when stage selected */}
          {contractForm.stage_id && (() => {
            const stageIdx = stages.findIndex(s => s.id === contractForm.stage_id);
            if (stageIdx < 0 || projectArea <= 0) return null;
            const customMgmt = Number(contractForm.management_fee_pct) || 0;
            const actualPrice = Number(contractForm.unit_price_at_contract) || 0;
            const balance = investor?.remaining_balance || 0;
            const canBuyMeters = actualPrice > 0 ? balance / actualPrice : 0;

            // Build per-stage rows
            const rows: { name: string; exp: number; ppm: number; mgmt: number; mgmtAmt: number; total: number; isSelected: boolean }[] = [];
            let grandTotal = 0;
            for (let i = 0; i <= stageIdx; i++) {
              const st = stages[i];
              const stExp = projExpenses.filter(e => e.stage_id === st.id).reduce((s, e) => s + Number(e.investor_amount), 0);
              const ppm = stExp / projectArea;
              const isSelected = i === stageIdx;
              const mgmt = isSelected ? customMgmt : Number(st.management_percentage) || 0;
              const mgmtAmt = ppm * mgmt / 100;
              const total = ppm + mgmtAmt;
              grandTotal += total;
              rows.push({ name: st.stage_name, exp: stExp, ppm, mgmt, mgmtAmt, total, isSelected });
            }

            return (
              <div style={{ borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(59,130,246,0.12)", background: "rgba(59,130,246,0.04)", direction: "rtl" }}>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "#60a5fa", margin: 0, padding: "10px 16px 6px", fontFamily: "var(--font-cairo)" }}>📊 تفصيل الأسعار حسب المراحل</p>
                {/* Header */}
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 0.7fr 1fr 1fr", gap: "4px", padding: "6px 16px", fontSize: "10px", color: "#64748b", fontFamily: "var(--font-cairo)", fontWeight: 600, background: "rgba(15,23,42,0.3)" }}>
                  <span>المرحلة</span>
                  <span style={{ textAlign: "center" }}>مصروفات/متر</span>
                  <span style={{ textAlign: "center" }}>الإدارة</span>
                  <span style={{ textAlign: "center" }}>إدارة/متر</span>
                  <span style={{ textAlign: "center" }}>الإجمالي/متر</span>
                </div>
                {/* Rows */}
                {rows.map((r, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "1.5fr 1fr 0.7fr 1fr 1fr", gap: "4px",
                    padding: "8px 16px", fontSize: "12px", fontFamily: "var(--font-cairo)",
                    background: r.isSelected ? "rgba(59,130,246,0.08)" : i % 2 === 0 ? "transparent" : "rgba(15,23,42,0.15)",
                    borderLeft: r.isSelected ? "3px solid #60a5fa" : "3px solid transparent",
                  }}>
                    <span style={{ color: r.isSelected ? "#60a5fa" : "#e2e8f0", fontWeight: r.isSelected ? 700 : 400 }}>
                      {r.name} {r.isSelected ? "⬅" : ""}
                    </span>
                    <span style={{ textAlign: "center", color: "#fbbf24", fontWeight: 600 }}>{formatNumber(Math.round(r.ppm))}</span>
                    <span style={{ textAlign: "center", color: r.isSelected ? "#60a5fa" : "#94a3b8", fontWeight: r.isSelected ? 700 : 400 }}>{r.mgmt}%</span>
                    <span style={{ textAlign: "center", color: "#a78bfa", fontWeight: 600 }}>{formatNumber(Math.round(r.mgmtAmt))}</span>
                    <span style={{ textAlign: "center", color: "#34d399", fontWeight: 600 }}>{formatNumber(Math.round(r.total))}</span>
                  </div>
                ))}
                {/* Total footer */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1.5fr 1fr 0.7fr 1fr 1fr", gap: "4px",
                  padding: "8px 16px", fontSize: "12px", fontFamily: "var(--font-cairo)",
                  background: "rgba(15,23,42,0.4)", borderTop: "1px solid rgba(148,163,184,0.1)",
                }}>
                  <span style={{ color: "#f1f5f9", fontWeight: 700 }}>الإجمالي</span>
                  <span></span><span></span><span></span>
                  <span style={{ textAlign: "center", color: "#34d399", fontWeight: 700, fontSize: "14px" }}>{formatNumber(Math.round(grandTotal))} ج.م</span>
                </div>
                {/* Balance can buy */}
                <div style={{ padding: "8px 16px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(16,185,129,0.06)" }}>
                  <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>الرصيد يشتري:</span>
                  <span style={{ fontSize: "18px", fontWeight: 700, color: "#34d399" }}>{canBuyMeters.toFixed(2)} متر</span>
                </div>
              </div>
            );
          })()}

          <TextField label="عدد الوحدات (متر)" type="number" value={contractForm.unit_quantity} onChange={(e) => setContractForm({ ...contractForm, unit_quantity: e.target.value })} fullWidth sx={fieldSx}
            helperText={contractForm.unit_price_at_contract && investor ? `الرصيد (${formatNumber(investor.remaining_balance)} ج.م) يشتري ${(investor.remaining_balance / Number(contractForm.unit_price_at_contract)).toFixed(2)} متر` : undefined}
          />

          {/* Management fee & unit price — both editable */}
          {contractForm.stage_id && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <TextField
                label="سعر الوحدة (ج.م/متر)"
                type="number"
                value={contractForm.unit_price_at_contract}
                onChange={(e) => setContractForm({ ...contractForm, unit_price_at_contract: e.target.value })}
                fullWidth
                size="small"
                sx={fieldSx}
              />
              <TextField
                label="نسبة الإدارة %"
                type="number"
                value={contractForm.management_fee_pct}
                onChange={(e) => {
                  const newPct = e.target.value;
                  const sp = getStagePrice(contractForm.stage_id, Number(newPct) || 0);
                  setContractForm({ ...contractForm, management_fee_pct: newPct, unit_price_at_contract: sp.finalPrice > 0 ? String(Math.round(sp.finalPrice)) : contractForm.unit_price_at_contract });
                }}
                fullWidth
                size="small"
                sx={fieldSx}
                helperText="تغييرها يعيد حساب سعر الوحدة"
              />
            </div>
          )}
      {/* ── Contract Total (management already in price, not added again) */}
          {contractForm.unit_quantity && contractForm.unit_price_at_contract && (
            <div style={{ padding: "12px 16px", borderRadius: "12px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>إجمالي العقد</p>
              <p style={{ fontSize: "20px", fontWeight: 700, color: "#3b82f6", margin: 0 }}>{formatNumber(Number(contractForm.unit_quantity) * Number(contractForm.unit_price_at_contract))} ج.م</p>
              <p style={{ fontSize: "10px", color: "#64748b", margin: "4px 0 0", fontFamily: "var(--font-cairo)" }}>نسبة الإدارة محسوبة في سعر الوحدة</p>
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setContractOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleContract} disabled={contractSaving || !contractForm.stage_id || !contractForm.unit_quantity} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
            {contractSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "إضافة العقد"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Contract Dialog ── */}
      <Dialog open={!!editContractExp} onClose={() => setEditContractExp(null)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>تعديل العقد</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
          {editContractExp && (
            <div style={{ padding: "12px 16px", borderRadius: "14px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>المرحلة: <strong style={{ color: "#e2e8f0" }}>{editContractExp.stage?.stage_name}</strong></p>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, fontFamily: "var(--font-cairo)" }}>سعر الوحدة الأصلي: <strong style={{ color: "#fbbf24" }}>{formatNumber(editContractExp.unit_price_at_contract)} ج.م</strong></p>
            </div>
          )}
          <TextField label="عدد الوحدات (متر)" type="number" value={editContractForm.unit_quantity} onChange={(e) => setEditContractForm({ ...editContractForm, unit_quantity: e.target.value })} fullWidth sx={fieldSx} />
          <TextField label="نسبة الإدارة %" type="number" value={editContractForm.management_fee_pct} onChange={(e) => setEditContractForm({ ...editContractForm, management_fee_pct: e.target.value })} fullWidth sx={fieldSx} helperText="تغييرها يعيد حساب سعر الوحدة لهذا المستثمر فقط" />
          {editContractExp && editContractForm.unit_quantity && (() => {
            const newPrice = getEditPrice();
            const priceChanged = newPrice !== editContractExp.unit_price_at_contract;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {priceChanged && (
                  <div style={{ padding: "10px 14px", borderRadius: "12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
                    <p style={{ fontSize: "11px", color: "#f59e0b", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>⚠️ سعر الوحدة اتغير</p>
                    <p style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>
                      <span style={{ color: "#64748b", textDecoration: "line-through" }}>{formatNumber(editContractExp.unit_price_at_contract)}</span>
                      <span style={{ color: "#94a3b8", margin: "0 6px" }}>→</span>
                      <span style={{ color: "#fbbf24" }}>{formatNumber(newPrice)} ج.م/متر</span>
                    </p>
                  </div>
                )}
                <div style={{ padding: "12px 16px", borderRadius: "12px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>إجمالي العقد</p>
                  <p style={{ fontSize: "20px", fontWeight: 700, color: "#3b82f6", margin: 0 }}>{formatNumber(Number(editContractForm.unit_quantity) * newPrice)} ج.م</p>
                </div>
              </div>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setEditContractExp(null)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleEditContract} disabled={editContractSaving || !editContractForm.unit_quantity} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
            {editContractSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حفظ التعديل"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Contract Confirm ── */}
      <Dialog open={!!deleteContract} onClose={() => setDeleteContract(null)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#f87171" }}>حذف العقد</DialogTitle>
        <DialogContent>
          <p style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", fontSize: "15px", margin: 0 }}>
            هل أنت متأكد من حذف عقد <strong style={{ color: "#e2e8f0" }}>{deleteContract?.stage?.stage_name}</strong> بقيمة <strong style={{ color: "#3b82f6" }}>{deleteContract ? formatNumber(deleteContract.unit_quantity * deleteContract.unit_price_at_contract) : 0} ج.م</strong>؟
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteContract(null)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleDeleteContract} disabled={deleteContractSaving} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "#dc2626", "&:hover": { background: "#b91c1c" } }}>
            {deleteContractSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حذف"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Upgrade Contract Dialog ── */}
      <Dialog open={!!upgradeContract} onClose={() => setUpgradeContract(null)} sx={{ ...dialogSx, "& .MuiDialog-paper": { ...dialogSx["& .MuiDialog-paper"], minWidth: "min(560px, 94vw)" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <UpgradeOutlined sx={{ color: "#60a5fa" }} />
            ترقية العقد
          </span>
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: "14px", pt: "8px !important" }}>
          {/* Old contract info */}
          {upgradeContract && (
            <div style={{ padding: "14px 16px", borderRadius: "14px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#f59e0b", margin: "0 0 6px", fontFamily: "var(--font-cairo)" }}>📋 العقد الحالي</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "12px", fontFamily: "var(--font-cairo)" }}>
                <div><span style={{ color: "#64748b" }}>المرحلة: </span><strong style={{ color: "#e2e8f0" }}>{upgradeContract.stage?.stage_name}</strong></div>
                <div><span style={{ color: "#64748b" }}>المساحة: </span><strong style={{ color: "#e2e8f0" }}>{formatNumber(upgradeContract.unit_quantity)} متر</strong></div>
                <div><span style={{ color: "#64748b" }}>سعر المتر: </span><strong style={{ color: "#fbbf24" }}>{formatNumber(upgradeContract.unit_price_at_contract)} ج.م</strong></div>
                <div><span style={{ color: "#64748b" }}>الإجمالي: </span><strong style={{ color: "#3b82f6" }}>{formatNumber(upgradeContract.unit_quantity * upgradeContract.unit_price_at_contract)} ج.م</strong></div>
              </div>
            </div>
          )}

          {/* New stage selection */}
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>المرحلة الجديدة</InputLabel>
            <Select value={upgradeStageId} onChange={(e) => setUpgradeStageId(e.target.value)} label="المرحلة الجديدة" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              {stages.filter(s => s.id !== upgradeContract?.stage?.stage_name).map((s) => <MenuItem key={s.id} value={s.id}>{s.stage_name}</MenuItem>)}
            </Select>
          </FormControl>

          {/* Scenarios when new stage selected */}
          {upgradeContract && upgradeStageId && (() => {
            const newSP = getStagePrice(upgradeStageId);
            if (newSP.finalPrice <= 0) return <p style={{ color: "#f87171", fontFamily: "var(--font-cairo)", fontSize: "13px" }}>لا يمكن حساب سعر هذه المرحلة</p>;

            const oldTotal = upgradeContract.unit_quantity * upgradeContract.unit_price_at_contract;
            const oldMeters = upgradeContract.unit_quantity;

            // Scenario 1: Same money → less meters
            const newMetersForSameMoney = oldTotal / newSP.finalPrice;
            const metersLost = oldMeters - newMetersForSameMoney;

            // Scenario 2: Same meters → additional payment
            const newTotalForSameMeters = oldMeters * newSP.finalPrice;
            const additionalPayment = newTotalForSameMeters - oldTotal;

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* New price info */}
                <div style={{ padding: "12px 16px", borderRadius: "14px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}>
                  <p style={{ fontSize: "11px", fontWeight: 600, color: "#60a5fa", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>سعر المتر الجديد (شامل كل المراحل)</p>
                  <p style={{ fontSize: "22px", fontWeight: 700, color: "#60a5fa", margin: 0 }}>{formatNumber(Math.round(newSP.finalPrice))} <span style={{ fontSize: "12px", fontWeight: 400, color: "#64748b" }}>ج.م/متر</span></p>
                </div>

                {/* Scenario 1 */}
                <div style={{ padding: "14px 16px", borderRadius: "14px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: "#fbbf24", margin: "0 0 8px", fontFamily: "var(--font-cairo)" }}>📉 الخيار الأول: نفس المبلغ</p>
                  <div style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: "#cbd5e1" }}>
                    <p style={{ margin: "0 0 4px" }}>المساحة الجديدة: <strong style={{ color: "#fbbf24" }}>{newMetersForSameMoney.toFixed(2)} متر</strong></p>
                    <p style={{ margin: 0, color: "#f87171" }}>⬇ تقل بـ <strong>{metersLost.toFixed(2)} متر</strong></p>
                  </div>
                </div>

                {/* Scenario 2 */}
                <div style={{ padding: "14px 16px", borderRadius: "14px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)" }}>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: "#34d399", margin: "0 0 8px", fontFamily: "var(--font-cairo)" }}>📈 الخيار الثاني: نفس المساحة ({formatNumber(oldMeters)} متر)</p>
                  <div style={{ fontSize: "13px", fontFamily: "var(--font-cairo)", color: "#cbd5e1" }}>
                    <p style={{ margin: "0 0 4px" }}>الإجمالي الجديد: <strong style={{ color: "#34d399" }}>{formatNumber(Math.round(newTotalForSameMeters))} ج.م</strong></p>
                    <p style={{ margin: 0, color: "#f59e0b" }}>⬆ محتاج يدفع إضافي: <strong style={{ color: "#fbbf24" }}>{formatNumber(Math.round(additionalPayment))} ج.م</strong></p>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setUpgradeContract(null)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleUpgradeContract} disabled={upgradeSaving || !upgradeStageId} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" }}>
            {upgradeSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "تأكيد الترقية"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Deposit Confirm ── */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#f87171" }}>حذف الإيداع</DialogTitle>
        <DialogContent>
          <p style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", fontSize: "15px", margin: 0 }}>
            هل أنت متأكد من حذف إيداع بقيمة <strong style={{ color: "#10b981" }}>{deleteDeposit ? formatNumber(deleteDeposit.amount) : 0} ج.م</strong> بتاريخ {deleteDeposit ? formatDate(deleteDeposit.deposit_date) : ""}؟
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleDeleteDeposit} disabled={deleteSaving} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "#dc2626", "&:hover": { background: "#b91c1c" } }}>
            {deleteSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حذف"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
