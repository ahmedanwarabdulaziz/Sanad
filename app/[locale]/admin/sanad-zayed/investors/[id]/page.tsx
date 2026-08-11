"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Alert, IconButton,
  MenuItem, Select, FormControl, InputLabel
} from "@mui/material";
import {
  AddOutlined, CloseOutlined, ArrowForwardOutlined, DescriptionOutlined,
  ExpandMoreOutlined, ExpandLessOutlined, PaymentsOutlined, CheckCircleOutlined,
  RemoveCircleOutlineOutlined, PictureAsPdfOutlined, SyncAltOutlined, ContentCopyOutlined,
  ReceiptLongOutlined, EditOutlined, EventOutlined
} from "@mui/icons-material";
import { generateStatementPdfBlob } from "@/lib/sanad-zayed/statementPdf";
import { sanitizeDecimalInput } from "@/lib/sanad-zayed/decimalInput";

interface Investor {
  id: string; name: string; email: string; phone: string; national_id: string;
}

interface Stage {
  id: string; name: string; base_unit_price: number; typical_unit_area: number; status: string; pricing_status: string; sort_order: number;
}

interface Contract {
  id: string;
  stage_id: string;
  stage: { name: string } | null;
  unit_quantity: number;
  unit_price_at_contract: number;
  total_contract_value: number;
  contract_date: string;
  status: string;
  notes: string;
  linked_contract_id: string | null;
  prior_stage_price: number;
  linked_contract?: { id: string; unit_price_at_contract: number; stage: { name: string } | null } | null;
}

interface StagePricing {
  price_actual: number;
  price_actual_plus_expected: number;
  investor_price: number;
  below_cost_warning: boolean;
}

interface Installment {
  id: string; seq: number; label: string; due_date: string; amount: number; status: "PENDING" | "PAID";
}

interface Account { id: string; account_name: string; current_balance: number; }

const CONTRACT_STATUS_LABEL: Record<string, string> = { ACTIVE: "نشط", SETTLED: "مسدد", CANCELLED: "ملغي" };
const CONTRACT_STATUS_COLOR: Record<string, string> = { ACTIVE: "#059669", SETTLED: "#154278", CANCELLED: "#ef4444" };

export default function InvestorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const investorId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [investor, setInvestor] = useState<Investor | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);

  const [flash, setFlash] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    stage_id: "", unit_quantity: "", unit_price_at_contract: "", contract_date: new Date().toISOString().split("T")[0], notes: "",
    carryOverMode: "none" as "none" | "linked" | "manual", linkedContractId: "", priorStagePrice: "",
  });

  const [editContract, setEditContract] = useState<Contract | null>(null);
  const [editForm, setEditForm] = useState({ unit_quantity: "", unit_price_at_contract: "", contract_date: "", notes: "", status: "ACTIVE" });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [stagePricing, setStagePricing] = useState<StagePricing | null>(null);

  const [scheduleContract, setScheduleContract] = useState<Contract | null>(null);
  const [scheduleForm, setScheduleForm] = useState({ label: "", amount: "", due_date: new Date().toISOString().split("T")[0] });
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expandedContract, setExpandedContract] = useState<string | null>(null);
  const [installmentsByContract, setInstallmentsByContract] = useState<Record<string, Installment[]>>({});
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [payInstallment, setPayInstallment] = useState<{ contractId: string; installment: Installment } | null>(null);
  const [payAccountId, setPayAccountId] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  const [ledger, setLedger] = useState<{ balance: number; total_deposits: number; total_withdrawals: number; total_contract_dues: number; transactions: any[]; reconciliations: any[] } | null>(null);

  const [deductionOpen, setDeductionOpen] = useState(false);
  const [deductionForm, setDeductionForm] = useState({ amount: "", financial_account_id: "", description: "", deduction_date: new Date().toISOString().split("T")[0] });
  const [deductionSubmitting, setDeductionSubmitting] = useState(false);

  const [settleReconciliation, setSettleReconciliation] = useState<any | null>(null);
  const [settleAccountId, setSettleAccountId] = useState("");
  const [settleSubmitting, setSettleSubmitting] = useState(false);

  const [statementGenerating, setStatementGenerating] = useState(false);
  const [statementUrl, setStatementUrl] = useState<string | null>(null);

  const showFlash = (type: "success" | "error", text: string) => {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 5000);
  };

  const fetchAll = useCallback(async () => {
    try {
      const [invRes, contractsRes, stagesRes, accRes, ledgerRes] = await Promise.all([
        fetch(`/api/sanad-zayed/investors/${investorId}`),
        fetch(`/api/sanad-zayed/contracts?investor_id=${investorId}`),
        fetch(`/api/sanad-zayed/stages`),
        fetch(`/api/sanad-zayed/treasury`),
        fetch(`/api/sanad-zayed/investors/${investorId}/ledger`),
      ]);
      const invData = await invRes.json();
      const contractsData = await contractsRes.json();
      const stagesData = await stagesRes.json();
      const accData = await accRes.json();
      const ledgerData = await ledgerRes.json();

      if (!invRes.ok) throw new Error(invData.error || "المستثمر غير موجود");

      setInvestor(invData.investor);
      setContracts(contractsData.contracts ?? []);
      setStages((stagesData.stages ?? []).filter((s: Stage) => s.status !== "CLOSED"));
      setAccounts(accData.accounts ?? []);
      if (ledgerRes.ok) setLedger(ledgerData);
    } catch (err: any) {
      showFlash("error", err.message || "فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [investorId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchInstallments = useCallback(async (contractId: string) => {
    const res = await fetch(`/api/sanad-zayed/contracts/${contractId}/installments`);
    const data = await res.json();
    setInstallmentsByContract(prev => ({ ...prev, [contractId]: data.installments ?? [] }));
  }, []);

  const toggleExpand = (contractId: string) => {
    if (expandedContract === contractId) {
      setExpandedContract(null);
      return;
    }
    setExpandedContract(contractId);
    if (!installmentsByContract[contractId]) fetchInstallments(contractId);
  };

  const generateSchedule = async (contractId: string) => {
    setGeneratingFor(contractId);
    try {
      const res = await fetch(`/api/sanad-zayed/contracts/${contractId}/installments`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");
      showFlash("success", "تم إنشاء جدول الدفعات");
      fetchInstallments(contractId);
    } catch (err: any) {
      showFlash("error", err.message);
    } finally {
      setGeneratingFor(null);
    }
  };

  const openPayInstallment = (contractId: string, installment: Installment) => {
    setPayInstallment({ contractId, installment });
    setPayAccountId("");
  };

  const handleMarkPaid = async () => {
    if (!payInstallment) return;
    if (!payAccountId) return showFlash("error", "يجب اختيار الخزينة/الحساب");

    setPaySubmitting(true);
    try {
      const res = await fetch(`/api/sanad-zayed/contracts/${payInstallment.contractId}/installments/${payInstallment.installment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_paid: true, financial_account_id: payAccountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");

      showFlash("success", "تم تسجيل تحصيل الدفعة");
      const cid = payInstallment.contractId;
      setPayInstallment(null);
      fetchInstallments(cid);
      fetchAll();
    } catch (err: any) {
      showFlash("error", err.message);
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleAddDeduction = async () => {
    if (!deductionForm.amount || Number(deductionForm.amount) <= 0) return showFlash("error", "المبلغ غير صحيح");
    if (!deductionForm.financial_account_id) return showFlash("error", "يجب اختيار الخزينة/الحساب");
    if (!deductionForm.description.trim()) return showFlash("error", "سبب الخصم مطلوب");

    setDeductionSubmitting(true);
    try {
      const res = await fetch(`/api/sanad-zayed/investors/${investorId}/deduction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deductionForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");

      showFlash("success", "تم تسجيل الخصم وخصمه من الخزينة");
      setDeductionOpen(false);
      setDeductionForm({ amount: "", financial_account_id: "", description: "", deduction_date: new Date().toISOString().split("T")[0] });
      fetchAll();
    } catch (err: any) {
      showFlash("error", err.message);
    } finally {
      setDeductionSubmitting(false);
    }
  };

  const handleSettleReconciliation = async () => {
    if (!settleReconciliation) return;
    if (Number(settleReconciliation.delta_amount) !== 0 && !settleAccountId) return showFlash("error", "يجب اختيار الخزينة/الحساب");

    setSettleSubmitting(true);
    try {
      const res = await fetch(`/api/sanad-zayed/area-reconciliations/${settleReconciliation.id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financial_account_id: settleAccountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");

      showFlash("success", "تمت تسوية فرق المساحة");
      setSettleReconciliation(null);
      fetchAll();
    } catch (err: any) {
      showFlash("error", err.message);
    } finally {
      setSettleSubmitting(false);
    }
  };

  const handleGenerateStatement = async () => {
    if (!investor) return;
    setStatementGenerating(true);
    setStatementUrl(null);
    try {
      const res = await fetch(`/api/sanad-zayed/investors/${investorId}/statement`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");

      const blob = await generateStatementPdfBlob(data);
      const file = new File([blob], `كشف-حساب-${investor.name}-${Date.now()}.pdf`, { type: "application/pdf" });

      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "فشل رفع الملف");

      setStatementUrl(uploadData.url);
      showFlash("success", "تم إنشاء كشف الحساب");
    } catch (err: any) {
      showFlash("error", err.message || "فشل في إنشاء كشف الحساب");
    } finally {
      setStatementGenerating(false);
    }
  };

  const openAddContract = () => {
    setForm({
      stage_id: "", unit_quantity: "", unit_price_at_contract: "", contract_date: new Date().toISOString().split("T")[0], notes: "",
      carryOverMode: "none", linkedContractId: "", priorStagePrice: "",
    });
    setStagePricing(null);
    setDialogOpen(true);
  };

  // Carry-over pricing helpers: a unit's price can build up across stages
  // (e.g. Stage 1 = land, Stage 2 = construction on the same unit). "First"
  // stage means the lowest sort_order — no earlier stage to carry over from.
  const stageSortOrder = (stageId: string) => stages.find(s => s.id === stageId)?.sort_order ?? 0;
  const isFirstStage = (stageId: string) => {
    if (stages.length === 0) return true;
    const minSort = Math.min(...stages.map(s => s.sort_order));
    return stageSortOrder(stageId) <= minSort;
  };
  const priorStageContractsFor = (stageId: string) =>
    contracts.filter(c => c.status === "ACTIVE" && stageSortOrder(c.stage_id) < stageSortOrder(stageId));

  const onLinkedContractChange = (contractId: string) => {
    const linked = contracts.find(c => c.id === contractId);
    setForm(f => ({ ...f, linkedContractId: contractId, priorStagePrice: linked ? String(linked.unit_price_at_contract) : f.priorStagePrice }));
  };

  const applySuggestedPrice = () => {
    const stage = stages.find(s => s.id === form.stage_id);
    const suggested = (Number(form.priorStagePrice) || 0) + (stage?.base_unit_price ?? 0);
    setForm(f => ({ ...f, unit_price_at_contract: String(suggested) }));
  };

  const fetchStagePricing = async (stageId: string) => {
    try {
      const res = await fetch(`/api/sanad-zayed/stages/${stageId}/pricing`);
      const data = await res.json();
      if (res.ok) setStagePricing(data);
    } catch {
      setStagePricing(null);
    }
  };

  const onStageChange = (stageId: string) => {
    const stage = stages.find(s => s.id === stageId);
    setForm(f => ({
      ...f,
      stage_id: stageId,
      unit_price_at_contract: stage ? String(stage.base_unit_price) : f.unit_price_at_contract,
      unit_quantity: stage && stage.typical_unit_area > 0 ? String(stage.typical_unit_area) : f.unit_quantity,
      carryOverMode: "none",
      linkedContractId: "",
      priorStagePrice: "",
    }));
    fetchStagePricing(stageId);
  };

  const handleAddContract = async () => {
    if (!form.stage_id) return showFlash("error", "اختر المرحلة");
    if (!form.unit_quantity || Number(form.unit_quantity) <= 0) return showFlash("error", "أدخل مساحة صحيحة");
    if (!form.unit_price_at_contract || Number(form.unit_price_at_contract) <= 0) return showFlash("error", "أدخل سعر متر صحيح");

    setSubmitting(true);
    try {
      const res = await fetch("/api/sanad-zayed/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investor_id: investorId,
          stage_id: form.stage_id,
          unit_quantity: Number(form.unit_quantity),
          unit_price_at_contract: Number(form.unit_price_at_contract),
          contract_date: form.contract_date,
          notes: form.notes,
          linked_contract_id: form.carryOverMode === "linked" ? form.linkedContractId || null : null,
          prior_stage_price: form.carryOverMode !== "none" ? Number(form.priorStagePrice) || 0 : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || Object.values(data.errors ?? {})[0] as string || "حدث خطأ");

      setDialogOpen(false);
      showFlash("success", "تم إنشاء العقد بنجاح");
      fetchAll();
    } catch (err: any) {
      showFlash("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditContract = (c: Contract) => {
    setEditContract(c);
    setEditForm({
      unit_quantity: String(c.unit_quantity),
      unit_price_at_contract: String(c.unit_price_at_contract),
      contract_date: c.contract_date.split("T")[0],
      notes: c.notes ?? "",
      status: c.status,
    });
    setStagePricing(null);
    fetchStagePricing(c.stage_id);
  };

  const handleEditContract = async () => {
    if (!editContract) return;
    if (!editForm.unit_quantity || Number(editForm.unit_quantity) <= 0) return showFlash("error", "أدخل مساحة صحيحة");
    if (!editForm.unit_price_at_contract || Number(editForm.unit_price_at_contract) <= 0) return showFlash("error", "أدخل سعر متر صحيح");

    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/sanad-zayed/contracts/${editContract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_quantity: Number(editForm.unit_quantity),
          unit_price_at_contract: Number(editForm.unit_price_at_contract),
          contract_date: editForm.contract_date,
          notes: editForm.notes,
          status: editForm.status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");

      showFlash("success", "تم تحديث بيانات العقد");
      setEditContract(null);
      fetchAll();
    } catch (err: any) {
      showFlash("error", err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Paid so far on a contract = deposits actually linked to it (via contract_id),
  // not the installment schedule — the schedule is just a plan, this is real cash.
  // Deposits explicitly linked to this contract always count. When the investor
  // has only one contract in total, there's no ambiguity, so unlinked deposits
  // (older payments recorded before contracts could be tagged, or general
  // deposits) are attributed to it too — otherwise real payments show as 0.
  const paidForContract = (contractId: string) =>
    (ledger?.transactions ?? [])
      .filter((t: any) => t.transaction_type === "DEPOSIT" && (t.contract?.id === contractId || (!t.contract?.id && contracts.length === 1)))
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  const remainingForContract = (c: Contract) => Number(c.total_contract_value) - paidForContract(c.id);

  const scheduledPendingForContract = (contractId: string) =>
    (installmentsByContract[contractId] ?? [])
      .filter(i => i.status === "PENDING")
      .reduce((sum, i) => sum + Number(i.amount), 0);

  const openScheduleDialog = async (c: Contract) => {
    setScheduleContract(c);
    if (!installmentsByContract[c.id]) await fetchInstallments(c.id);
    const remaining = remainingForContract(c) - scheduledPendingForContract(c.id);
    setScheduleForm({ label: "", amount: remaining > 0 ? String(remaining) : "", due_date: new Date().toISOString().split("T")[0] });
  };

  const handleAddScheduleRow = async () => {
    if (!scheduleContract) return;
    if (!scheduleForm.amount || Number(scheduleForm.amount) <= 0) return showFlash("error", "المبلغ غير صحيح");
    if (!scheduleForm.due_date) return showFlash("error", "التاريخ مطلوب");

    setScheduleSubmitting(true);
    try {
      const res = await fetch(`/api/sanad-zayed/contracts/${scheduleContract.id}/installments/add-row`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scheduleForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");

      await fetchInstallments(scheduleContract.id);
      const remaining = remainingForContract(scheduleContract) - scheduledPendingForContract(scheduleContract.id) - Number(scheduleForm.amount);
      setScheduleForm({ label: "", amount: remaining > 0 ? String(remaining) : "", due_date: scheduleForm.due_date });
      showFlash("success", "تمت إضافة الدفعة إلى الجدول");
    } catch (err: any) {
      showFlash("error", err.message);
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "10px", backgroundColor: "#f9f9f7", fontFamily: "var(--font-cairo)",
      "& fieldset": { borderColor: "#e5e3dc" },
      "&.Mui-focused fieldset": { borderColor: "#154278", borderWidth: 2 },
    },
    "& .MuiInputLabel-root": { fontFamily: "var(--font-cairo)", fontSize: 14 },
    "& .MuiInputBase-input": { textAlign: "right" }
  };

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center" }}><CircularProgress sx={{ color: "#154278" }} /></div>;
  }

  if (!investor) {
    return (
      <div dir="rtl" style={{ fontFamily: "var(--font-cairo), Cairo, sans-serif", padding: 40, textAlign: "center", color: "#9ca3af" }}>
        المستثمر غير موجود
      </div>
    );
  }

  const totalDue = contracts.filter(c => c.status === "ACTIVE").reduce((sum, c) => sum + Number(c.total_contract_value), 0);

  return (
    <div dir="rtl" style={{ fontFamily: "var(--font-cairo), Cairo, sans-serif" }}>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IconButton onClick={() => router.push("/admin/sanad-zayed/investors")} sx={{ color: "#6b7280" }}>
            <ArrowForwardOutlined sx={{ transform: "scaleX(-1)" }} />
          </IconButton>
          <div>
            <h1 style={{ fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 900, color: "#111827", margin: 0 }}>{investor.name}</h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0", direction: "ltr", textAlign: "right" }}>{investor.phone} {investor.email && `— ${investor.email}`}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button
            onClick={() => router.push(`/admin/sanad-zayed/investors/${investorId}/transactions`)}
            startIcon={<ReceiptLongOutlined />}
            sx={{ fontFamily: "var(--font-cairo)", color: "#059669", border: "1.5px solid rgba(5,150,105,0.2)", borderRadius: "12px", fontWeight: 700, textTransform: "none", px: 2.2 }}
          >
            سجل الحركات
          </Button>
          <Button
            onClick={handleGenerateStatement}
            disabled={statementGenerating}
            startIcon={<PictureAsPdfOutlined />}
            sx={{ fontFamily: "var(--font-cairo)", color: "#154278", border: "1.5px solid rgba(21,66,120,0.2)", borderRadius: "12px", fontWeight: 700, textTransform: "none", px: 2.2 }}
          >
            {statementGenerating ? "جاري الإنشاء..." : "كشف حساب PDF"}
          </Button>
          <Button
            onClick={() => setDeductionOpen(true)}
            startIcon={<RemoveCircleOutlineOutlined />}
            sx={{ fontFamily: "var(--font-cairo)", color: "#ef4444", border: "1.5px solid rgba(239,68,68,0.2)", borderRadius: "12px", fontWeight: 700, textTransform: "none", px: 2.2 }}
          >
            خصم شخصي
          </Button>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={openAddContract}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "linear-gradient(135deg, #154278 0%, #1e6abf 100%)",
              color: "#fff", border: "none", borderRadius: 12,
              padding: "11px 22px", cursor: "pointer", fontSize: 14, fontWeight: 700,
              fontFamily: "var(--font-cairo)", boxShadow: "0 4px 14px rgba(21,66,120,0.3)",
            }}
          >
            <AddOutlined sx={{ fontSize: 20 }} />
            عقد جديد
          </motion.button>
        </div>
      </motion.div>

      {statementUrl && (
        <Alert
          severity="success"
          icon={<PictureAsPdfOutlined />}
          sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", mb: 2, alignItems: "center" }}
          action={
            <IconButton size="small" onClick={() => navigator.clipboard.writeText(statementUrl)} title="نسخ الرابط">
              <ContentCopyOutlined fontSize="small" />
            </IconButton>
          }
        >
          كشف الحساب جاهز:{" "}
          <a href={statementUrl} target="_blank" rel="noreferrer" style={{ color: "#154278", fontWeight: 700 }}>
            فتح / تحميل
          </a>
        </Alert>
      )}

      <AnimatePresence>
        {flash && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ marginBottom: 16 }}>
            <Alert severity={flash.type} onClose={() => setFlash(null)} sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)" }}>
              {flash.text}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "20px", border: "1px solid rgba(0,0,0,0.05)", flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>إجمالي المدفوع</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#16a34a" }}>
            {((ledger?.total_deposits ?? 0) - (ledger?.total_withdrawals ?? 0)).toLocaleString()}
          </div>
          {(ledger?.total_withdrawals ?? 0) > 0 && (
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
              مدفوع {(ledger?.total_deposits ?? 0).toLocaleString()} — مسترد/مخصوم {(ledger?.total_withdrawals ?? 0).toLocaleString()}
            </div>
          )}
        </div>
        <div style={{ background: "#fff", borderRadius: 16, padding: "20px", border: "1px solid rgba(0,0,0,0.05)", flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>إجمالي قيمة العقود النشطة</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#154278" }}>{totalDue.toLocaleString()}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 16, padding: "20px", border: "1px solid rgba(0,0,0,0.05)", flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>الرصيد الحالي</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: (ledger?.balance ?? 0) >= 0 ? "#16a34a" : "#ef4444" }}>
            {(ledger?.balance ?? 0).toLocaleString()} {ledger && (ledger.balance >= 0 ? "(دائن)" : "(مستحق)")}
          </div>
        </div>
      </div>

      {(ledger?.reconciliations ?? []).some((r: any) => r.status === "PENDING") && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: "1px solid rgba(0,0,0,0.05)", marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>تسويات مساحة معلّقة</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(ledger!.reconciliations).filter((r: any) => r.status === "PENDING").map((r: any) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f9f9f7", borderRadius: 10, padding: "10px 14px" }}>
                <span style={{ fontSize: 13, color: "#374151" }}>
                  {r.delta_amount > 0 ? "مبلغ إضافي مستحق" : "رصيد دائن للمستثمر"}: <strong>{Math.abs(Number(r.delta_amount)).toLocaleString("ar-EG-u-nu-latn")}</strong>
                </span>
                <Button size="small" startIcon={<SyncAltOutlined sx={{ fontSize: 15 }} />} onClick={() => { setSettleReconciliation(r); setSettleAccountId(""); }} sx={{ fontFamily: "var(--font-cairo)", color: "#154278", fontWeight: 700, textTransform: "none" }}>
                  تسوية
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#374151", margin: "0 0 14px" }}>العقود</h2>

      {contracts.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, padding: 50, textAlign: "center", color: "#9ca3af" }}>
          <DescriptionOutlined sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
          <div style={{ fontSize: 14, fontWeight: 700 }}>لا توجد عقود بعد لهذا المستثمر</div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid #f0ede6" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ background: "#f8f7f3", borderBottom: "2px solid #f0ede6" }}>
                  {["المرحلة", "المساحة (م²)", "سعر المتر", "الإجمالي", "التاريخ", "الحالة", ""].map(h => (
                    <th key={h} style={{ padding: "14px 18px", textAlign: "right", fontSize: 12, color: "#6b7280", fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contracts.map(c => {
                  const expanded = expandedContract === c.id;
                  const installments = installmentsByContract[c.id];
                  return (
                    <Fragment key={c.id}>
                      <tr style={{ borderBottom: "1px solid #f5f4f0", cursor: "pointer" }} onClick={() => toggleExpand(c.id)}>
                        <td style={{ padding: "14px 18px", fontSize: 14, fontWeight: 700, color: "#111827" }}>
                          {c.stage?.name ?? "—"}
                          {c.linked_contract && (
                            <div style={{ fontSize: 11, fontWeight: 500, color: "#9ca3af" }}>
                              ↳ متابعة لـ {c.linked_contract.stage?.name ?? "—"} ({Number(c.linked_contract.unit_price_at_contract).toLocaleString("ar-EG-u-nu-latn")} /م²)
                            </div>
                          )}
                          {!c.linked_contract && Number(c.prior_stage_price) > 0 && (
                            <div style={{ fontSize: 11, fontWeight: 500, color: "#9ca3af" }}>
                              ↳ شامل مرحلة سابقة: {Number(c.prior_stage_price).toLocaleString("ar-EG-u-nu-latn")} /م²
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "14px 18px", fontSize: 13, color: "#374151", direction: "ltr", textAlign: "right" }}>{Number(c.unit_quantity).toLocaleString("ar-EG-u-nu-latn")}</td>
                        <td style={{ padding: "14px 18px", fontSize: 13, color: "#374151", direction: "ltr", textAlign: "right" }}>{Number(c.unit_price_at_contract).toLocaleString("ar-EG-u-nu-latn")}</td>
                        <td style={{ padding: "14px 18px", fontSize: 14, fontWeight: 800, color: "#154278", direction: "ltr", textAlign: "right" }}>{Number(c.total_contract_value).toLocaleString("ar-EG-u-nu-latn")}</td>
                        <td style={{ padding: "14px 18px", fontSize: 12, color: "#9ca3af" }}>{new Date(c.contract_date).toLocaleDateString("ar-EG-u-nu-latn")}</td>
                        <td style={{ padding: "14px 18px" }}>
                          <span style={{ background: `${CONTRACT_STATUS_COLOR[c.status]}18`, color: CONTRACT_STATUS_COLOR[c.status], fontSize: 12, fontWeight: 700, borderRadius: 8, padding: "4px 10px" }}>
                            {CONTRACT_STATUS_LABEL[c.status]}
                          </span>
                        </td>
                        <td style={{ padding: "14px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <IconButton size="small" title="تعديل العقد" onClick={(e) => { e.stopPropagation(); openEditContract(c); }} sx={{ color: "#9ca3af", "&:hover": { color: "#154278", background: "rgba(21,66,120,0.08)" } }}>
                              <EditOutlined sx={{ fontSize: 17 }} />
                            </IconButton>
                            <IconButton size="small" sx={{ color: "#9ca3af" }}>
                              {expanded ? <ExpandLessOutlined sx={{ fontSize: 18 }} /> : <ExpandMoreOutlined sx={{ fontSize: 18 }} />}
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={7} style={{ padding: "0 18px 18px", background: "#fbfaf8" }}>
                            {/* Paid / remaining summary */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, padding: "12px 4px" }}>
                              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13 }}>
                                <span style={{ color: "#6b7280" }}>المدفوع: <strong style={{ color: "#16a34a" }}>{paidForContract(c.id).toLocaleString("ar-EG-u-nu-latn")}</strong></span>
                                <span style={{ color: "#6b7280" }}>الإجمالي: <strong style={{ color: "#111827" }}>{Number(c.total_contract_value).toLocaleString("ar-EG-u-nu-latn")}</strong></span>
                                <span style={{ color: "#6b7280" }}>المتبقي: <strong style={{ color: remainingForContract(c) > 0 ? "#ef4444" : "#16a34a" }}>{remainingForContract(c).toLocaleString("ar-EG-u-nu-latn")}</strong></span>
                              </div>
                              {remainingForContract(c) > 0 && (
                                <Button size="small" startIcon={<EventOutlined sx={{ fontSize: 15 }} />} onClick={() => openScheduleDialog(c)} sx={{ fontFamily: "var(--font-cairo)", color: "#154278", fontWeight: 700, textTransform: "none" }}>
                                  جدولة دفعة من المتبقي
                                </Button>
                              )}
                            </div>

                            {!installments ? (
                              <div style={{ padding: 16, textAlign: "center" }}><CircularProgress size={20} sx={{ color: "#154278" }} /></div>
                            ) : installments.length === 0 ? (
                              <div style={{ padding: "4px 4px 14px" }}>
                                <Button size="small" onClick={() => generateSchedule(c.id)} disabled={generatingFor === c.id} sx={{ fontFamily: "var(--font-cairo)", color: "#6b7280", fontWeight: 700, textTransform: "none" }}>
                                  {generatingFor === c.id ? "جاري الإنشاء..." : "أو: إنشاء جدول كامل من افتراضي المرحلة"}
                                </Button>
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
                                {installments.map(inst => (
                                  <div key={inst.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: 10, padding: "10px 14px", border: "1px solid #f0ede6" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                      <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{inst.label}</span>
                                      <span style={{ fontSize: 12, color: "#9ca3af" }}>{new Date(inst.due_date).toLocaleDateString("ar-EG-u-nu-latn")}</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                      <span style={{ fontSize: 13, fontWeight: 800, color: "#154278" }}>{Number(inst.amount).toLocaleString("ar-EG-u-nu-latn")}</span>
                                      {inst.status === "PAID" ? (
                                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#16a34a", fontWeight: 700 }}>
                                          <CheckCircleOutlined sx={{ fontSize: 15 }} /> محصّلة
                                        </span>
                                      ) : (
                                        <Button size="small" startIcon={<PaymentsOutlined sx={{ fontSize: 15 }} />} onClick={() => openPayInstallment(c.id, inst)} sx={{ fontFamily: "var(--font-cairo)", color: "#d97706", fontWeight: 700, textTransform: "none" }}>
                                          تحصيل
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add Contract Dialog ── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} PaperProps={{ sx: { borderRadius: "20px", direction: "rtl", maxWidth: 460, width: "100%" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 800 }}>
          عقد جديد
          <IconButton onClick={() => setDialogOpen(false)} sx={{ position: "absolute", left: 12, top: 12 }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "10px !important", display: "flex", flexDirection: "column", gap: 2.5 }}>
          <FormControl fullWidth sx={inputSx}>
            <InputLabel>المرحلة *</InputLabel>
            <Select value={form.stage_id} label="المرحلة *" onChange={e => onStageChange(e.target.value)}>
              {stages.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.name} — {s.base_unit_price.toLocaleString()} /م²</MenuItem>
              ))}
            </Select>
          </FormControl>

          {form.stage_id && !isFirstStage(form.stage_id) && (
            <div style={{ background: "#f9f9f7", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>
                هذه ليست المرحلة الأولى — هل هذا المستثمر منتقل من مرحلة سابقة لنفس الوحدة؟
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  size="small" variant={form.carryOverMode === "linked" ? "contained" : "outlined"}
                  onClick={() => setForm(f => ({ ...f, carryOverMode: "linked" }))}
                  sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, textTransform: "none", flex: 1, ...(form.carryOverMode === "linked" ? { background: "#154278" } : { borderColor: "#d1d5db", color: "#374151" }) }}
                >
                  نعم، منتقل من مرحلة سابقة
                </Button>
                <Button
                  size="small" variant={form.carryOverMode === "manual" ? "contained" : "outlined"}
                  onClick={() => setForm(f => ({ ...f, carryOverMode: "manual", linkedContractId: "" }))}
                  sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, textTransform: "none", flex: 1, ...(form.carryOverMode === "manual" ? { background: "#154278" } : { borderColor: "#d1d5db", color: "#374151" }) }}
                >
                  لا، مستثمر جديد لهذه المرحلة
                </Button>
              </div>

              {form.carryOverMode === "linked" && (
                priorStageContractsFor(form.stage_id).length === 0 ? (
                  <div style={{ fontSize: 12, color: "#ef4444" }}>لا يوجد لهذا المستثمر عقود نشطة في مرحلة سابقة</div>
                ) : (
                  <FormControl fullWidth size="small" sx={inputSx}>
                    <InputLabel>العقد السابق *</InputLabel>
                    <Select value={form.linkedContractId} label="العقد السابق *" onChange={e => onLinkedContractChange(e.target.value)}>
                      {priorStageContractsFor(form.stage_id).map(c => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.stage?.name ?? "—"} — {Number(c.unit_quantity).toLocaleString("ar-EG-u-nu-latn")} م² بسعر {Number(c.unit_price_at_contract).toLocaleString("ar-EG-u-nu-latn")} /م² ({new Date(c.contract_date).toLocaleDateString("ar-EG-u-nu-latn")})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )
              )}

              {form.carryOverMode === "manual" && (
                <TextField
                  size="small" label="سعر المرحلة السابقة المحتسب لهذا المستثمر *" type="text" inputMode="decimal"
                  value={form.priorStagePrice} onChange={e => setForm({ ...form, priorStagePrice: sanitizeDecimalInput(e.target.value) })}
                  fullWidth sx={inputSx}
                />
              )}

              {form.carryOverMode !== "none" && form.priorStagePrice !== "" && (
                <div style={{ fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <span>
                    السعر المقترح: <strong style={{ color: "#154278" }}>
                      {((Number(form.priorStagePrice) || 0) + (stages.find(s => s.id === form.stage_id)?.base_unit_price ?? 0)).toLocaleString("ar-EG-u-nu-latn")} /م²
                    </strong> (سابقة + هذه المرحلة)
                  </span>
                  <Button size="small" onClick={applySuggestedPrice} sx={{ fontFamily: "var(--font-cairo)", color: "#154278", fontWeight: 700, textTransform: "none" }}>
                    استخدام هذا السعر
                  </Button>
                </div>
              )}
            </div>
          )}

          <TextField label="مساحة الوحدة التقديرية لهذا المستثمر (م²) *" type="text" inputMode="decimal" value={form.unit_quantity} onChange={e => setForm({ ...form, unit_quantity: sanitizeDecimalInput(e.target.value) })} fullWidth sx={inputSx}
            helperText="تُملأ تلقائياً من مساحة الوحدة التقديرية للمرحلة، ويمكن تعديلها لهذا المستثمر تحديداً — قد تختلف عن مساحة المرحلة السابقة عند استلام المساحات الفعلية المرخصة" />
          <TextField label="سعر المتر عند التعاقد *" type="text" inputMode="decimal" value={form.unit_price_at_contract} onChange={e => setForm({ ...form, unit_price_at_contract: sanitizeDecimalInput(e.target.value) })} fullWidth sx={inputSx}
            helperText="هذا السعر يُقفل على هذا العقد ولا يتغير مع تحديث سعر المرحلة لاحقاً" />

          {stagePricing && (
            <div style={{ background: "#f9f9f7", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#6b7280", display: "flex", flexDirection: "column", gap: 4 }}>
              <span>سعر المرحلة الحالي للمساهم: <strong style={{ color: "#154278" }}>{stagePricing.investor_price.toLocaleString("ar-EG-u-nu-latn")} /م²</strong></span>
              <span>تكلفة المتر الحالية (فعلي + متوقع): <strong style={{ color: "#d97706" }}>{stagePricing.price_actual_plus_expected.toLocaleString("ar-EG-u-nu-latn", { maximumFractionDigits: 0 })} /م²</strong></span>
              {Number(form.unit_price_at_contract) > 0 && Number(form.unit_price_at_contract) < stagePricing.price_actual_plus_expected && (
                <span style={{ color: "#ef4444", fontWeight: 700 }}>⚠ السعر المدخل أقل من تكلفة المتر الحالية</span>
              )}
            </div>
          )}

          <TextField label="تاريخ التعاقد" type="date" value={form.contract_date} onChange={e => setForm({ ...form, contract_date: e.target.value })} fullWidth sx={inputSx} InputLabelProps={{ shrink: true }} />
          <TextField label="ملاحظات" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} fullWidth multiline rows={2} sx={inputSx} />

          {form.unit_quantity && form.unit_price_at_contract && (
            <div style={{ background: "#f9f9f7", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#6b7280" }}>
              إجمالي قيمة العقد: <strong style={{ color: "#154278" }}>
                {(Number(form.unit_quantity) * Number(form.unit_price_at_contract)).toLocaleString("ar-EG-u-nu-latn")}
              </strong>
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleAddContract} variant="contained" disabled={submitting} sx={{ fontFamily: "var(--font-cairo)", background: "#154278", borderRadius: "10px", width: "100%", py: 1.2, fontWeight: 700 }}>
            {submitting ? "جاري الحفظ..." : "إنشاء العقد"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Contract Dialog ── */}
      <Dialog open={!!editContract} onClose={() => setEditContract(null)} PaperProps={{ sx: { borderRadius: "20px", direction: "rtl", maxWidth: 460, width: "100%" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 800 }}>
          تعديل العقد
          <IconButton onClick={() => setEditContract(null)} sx={{ position: "absolute", left: 12, top: 12 }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "10px !important", display: "flex", flexDirection: "column", gap: 2.5 }}>
          {editContract && (
            <div style={{ background: "#f9f9f7", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#6b7280" }}>
              المرحلة: <strong>{editContract.stage?.name ?? "—"}</strong> (لا يمكن تغيير المرحلة — ألغِ العقد وأنشئ عقداً جديداً في المرحلة الصحيحة إذا لزم)
            </div>
          )}

          <TextField label="مساحة الوحدة (م²) *" type="text" inputMode="decimal" value={editForm.unit_quantity} onChange={e => setEditForm({ ...editForm, unit_quantity: sanitizeDecimalInput(e.target.value) })} fullWidth sx={inputSx} />
          <TextField label="سعر المتر عند التعاقد *" type="text" inputMode="decimal" value={editForm.unit_price_at_contract} onChange={e => setEditForm({ ...editForm, unit_price_at_contract: sanitizeDecimalInput(e.target.value) })} fullWidth sx={inputSx} />

          {stagePricing && (
            <div style={{ background: "#f9f9f7", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#6b7280", display: "flex", flexDirection: "column", gap: 4 }}>
              <span>سعر المرحلة الحالي للمساهم: <strong style={{ color: "#154278" }}>{stagePricing.investor_price.toLocaleString("ar-EG-u-nu-latn")} /م²</strong></span>
              <span>تكلفة المتر الحالية (فعلي + متوقع): <strong style={{ color: "#d97706" }}>{stagePricing.price_actual_plus_expected.toLocaleString("ar-EG-u-nu-latn", { maximumFractionDigits: 0 })} /م²</strong></span>
              {Number(editForm.unit_price_at_contract) > 0 && Number(editForm.unit_price_at_contract) < stagePricing.price_actual_plus_expected && (
                <span style={{ color: "#ef4444", fontWeight: 700 }}>⚠ السعر المدخل أقل من تكلفة المتر الحالية</span>
              )}
            </div>
          )}

          <TextField label="تاريخ التعاقد" type="date" value={editForm.contract_date} onChange={e => setEditForm({ ...editForm, contract_date: e.target.value })} fullWidth sx={inputSx} InputLabelProps={{ shrink: true }} />

          <FormControl fullWidth sx={inputSx}>
            <InputLabel>حالة العقد</InputLabel>
            <Select value={editForm.status} label="حالة العقد" onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
              <MenuItem value="ACTIVE">نشط</MenuItem>
              <MenuItem value="SETTLED">مسدد</MenuItem>
              <MenuItem value="CANCELLED">ملغي</MenuItem>
            </Select>
          </FormControl>

          <TextField label="ملاحظات" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} fullWidth multiline rows={2} sx={inputSx} />

          {editForm.unit_quantity && editForm.unit_price_at_contract && (
            <div style={{ background: "#f9f9f7", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#6b7280" }}>
              إجمالي قيمة العقد الجديد: <strong style={{ color: "#154278" }}>
                {(Number(editForm.unit_quantity) * Number(editForm.unit_price_at_contract)).toLocaleString("ar-EG-u-nu-latn")}
              </strong>
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleEditContract} variant="contained" disabled={editSubmitting} sx={{ fontFamily: "var(--font-cairo)", background: "#154278", borderRadius: "10px", width: "100%", py: 1.2, fontWeight: 700 }}>
            {editSubmitting ? "جاري الحفظ..." : "حفظ التعديلات"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Schedule a Payment from the Remaining Balance ── */}
      <Dialog open={!!scheduleContract} onClose={() => setScheduleContract(null)} PaperProps={{ sx: { borderRadius: "20px", direction: "rtl", maxWidth: 420, width: "100%" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 800 }}>
          جدولة دفعة من المتبقي
          <IconButton onClick={() => setScheduleContract(null)} sx={{ position: "absolute", left: 12, top: 12 }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "10px !important", display: "flex", flexDirection: "column", gap: 2.5 }}>
          {scheduleContract && (
            <div style={{ background: "#f9f9f7", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#6b7280" }}>
              {scheduleContract.stage?.name ?? "—"} — المدفوع فعلياً: <strong style={{ color: "#16a34a" }}>{paidForContract(scheduleContract.id).toLocaleString("ar-EG-u-nu-latn")}</strong> من {Number(scheduleContract.total_contract_value).toLocaleString("ar-EG-u-nu-latn")}
              <br />
              متبقٍ غير مجدول حتى الآن: <strong style={{ color: "#d97706" }}>
                {Math.max(0, remainingForContract(scheduleContract) - scheduledPendingForContract(scheduleContract.id)).toLocaleString("ar-EG-u-nu-latn")}
              </strong>
            </div>
          )}
          <TextField label="وصف الدفعة (اختياري)" value={scheduleForm.label} onChange={e => setScheduleForm({ ...scheduleForm, label: e.target.value })} fullWidth sx={inputSx} placeholder="مثال: دفعة أولى من المتبقي" />
          <TextField label="المبلغ *" type="text" inputMode="decimal" value={scheduleForm.amount} onChange={e => setScheduleForm({ ...scheduleForm, amount: sanitizeDecimalInput(e.target.value) })} fullWidth sx={inputSx} />
          <TextField label="تاريخ الاستحقاق *" type="date" value={scheduleForm.due_date} onChange={e => setScheduleForm({ ...scheduleForm, due_date: e.target.value })} fullWidth sx={inputSx} InputLabelProps={{ shrink: true }} />
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            يمكنك إضافة أكثر من دفعة بتواريخ مختلفة — الحوار يبقى مفتوحاً بعد كل إضافة حتى تنتهي.
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleAddScheduleRow} variant="contained" disabled={scheduleSubmitting} sx={{ fontFamily: "var(--font-cairo)", background: "#154278", borderRadius: "10px", width: "100%", py: 1.2, fontWeight: 700 }}>
            {scheduleSubmitting ? "جاري الإضافة..." : "إضافة إلى الجدول"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Mark Installment Paid Dialog ── */}
      <Dialog open={!!payInstallment} onClose={() => setPayInstallment(null)} PaperProps={{ sx: { borderRadius: "20px", direction: "rtl", maxWidth: 400, width: "100%" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 800 }}>
          تحصيل دفعة
          <IconButton onClick={() => setPayInstallment(null)} sx={{ position: "absolute", left: 12, top: 12 }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "10px !important", display: "flex", flexDirection: "column", gap: 2.5 }}>
          {payInstallment && (
            <div style={{ background: "#f9f9f7", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#6b7280" }}>
              {payInstallment.installment.label} — <strong style={{ color: "#154278" }}>{Number(payInstallment.installment.amount).toLocaleString("ar-EG-u-nu-latn")}</strong>
            </div>
          )}
          <FormControl fullWidth sx={inputSx}>
            <InputLabel>إيداع في (خزينة / حساب) *</InputLabel>
            <Select value={payAccountId} label="إيداع في (خزينة / حساب) *" onChange={e => setPayAccountId(e.target.value)}>
              {accounts.map(a => <MenuItem key={a.id} value={a.id}>{a.account_name}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleMarkPaid} variant="contained" disabled={paySubmitting} sx={{ fontFamily: "var(--font-cairo)", background: "#154278", borderRadius: "10px", width: "100%", py: 1.2, fontWeight: 700 }}>
            {paySubmitting ? "جاري الحفظ..." : "تأكيد التحصيل"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Personal Deduction Dialog ── */}
      <Dialog open={deductionOpen} onClose={() => setDeductionOpen(false)} PaperProps={{ sx: { borderRadius: "20px", direction: "rtl", maxWidth: 420, width: "100%" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 800 }}>
          خصم شخصي من رصيد المستثمر
          <IconButton onClick={() => setDeductionOpen(false)} sx={{ position: "absolute", left: 12, top: 12 }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "10px !important", display: "flex", flexDirection: "column", gap: 2.5 }}>
          <TextField label="سبب الخصم *" value={deductionForm.description} onChange={e => setDeductionForm({ ...deductionForm, description: e.target.value })} fullWidth sx={inputSx}
            helperText="مثال: استخراج ورق حكومي خاص بالمستثمر" />
          <TextField label="المبلغ *" type="text" inputMode="decimal" value={deductionForm.amount} onChange={e => setDeductionForm({ ...deductionForm, amount: sanitizeDecimalInput(e.target.value) })} fullWidth sx={inputSx} />
          <TextField label="التاريخ" type="date" value={deductionForm.deduction_date} onChange={e => setDeductionForm({ ...deductionForm, deduction_date: e.target.value })} fullWidth sx={inputSx} InputLabelProps={{ shrink: true }} />
          <FormControl fullWidth sx={inputSx}>
            <InputLabel>سحب من (خزينة / عهدة) *</InputLabel>
            <Select value={deductionForm.financial_account_id} label="سحب من (خزينة / عهدة) *" onChange={e => setDeductionForm({ ...deductionForm, financial_account_id: e.target.value })}>
              {accounts.map(a => <MenuItem key={a.id} value={a.id}>{a.account_name}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleAddDeduction} variant="contained" disabled={deductionSubmitting} sx={{ fontFamily: "var(--font-cairo)", background: "#ef4444", borderRadius: "10px", width: "100%", py: 1.2, fontWeight: 700 }}>
            {deductionSubmitting ? "جاري الحفظ..." : "تسجيل الخصم"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Settle Reconciliation Dialog ── */}
      <Dialog open={!!settleReconciliation} onClose={() => setSettleReconciliation(null)} PaperProps={{ sx: { borderRadius: "20px", direction: "rtl", maxWidth: 400, width: "100%" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 800 }}>
          تسوية فرق المساحة
          <IconButton onClick={() => setSettleReconciliation(null)} sx={{ position: "absolute", left: 12, top: 12 }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "10px !important", display: "flex", flexDirection: "column", gap: 2.5 }}>
          {settleReconciliation && (
            <div style={{ background: "#f9f9f7", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#374151" }}>
              {settleReconciliation.delta_amount > 0
                ? `سيتم تحصيل ${Number(settleReconciliation.delta_amount).toLocaleString("ar-EG-u-nu-latn")} من المستثمر`
                : `سيتم رد ${Math.abs(Number(settleReconciliation.delta_amount)).toLocaleString("ar-EG-u-nu-latn")} للمستثمر`}
            </div>
          )}
          <FormControl fullWidth sx={inputSx}>
            <InputLabel>{settleReconciliation?.delta_amount > 0 ? "إيداع في" : "سحب من"} (خزينة / عهدة) *</InputLabel>
            <Select value={settleAccountId} label="خزينة / عهدة *" onChange={e => setSettleAccountId(e.target.value)}>
              {accounts.map(a => <MenuItem key={a.id} value={a.id}>{a.account_name}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleSettleReconciliation} variant="contained" disabled={settleSubmitting} sx={{ fontFamily: "var(--font-cairo)", background: "#154278", borderRadius: "10px", width: "100%", py: 1.2, fontWeight: 700 }}>
            {settleSubmitting ? "جاري التسوية..." : "تأكيد التسوية"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
