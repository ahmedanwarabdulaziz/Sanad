"use client";
import { useState, useEffect, useCallback } from "react";
import { useProject } from "../layout";
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Alert, IconButton, Chip, ToggleButton, ToggleButtonGroup
} from "@mui/material";
import { AddOutlined, DeleteOutline, SwapHorizOutlined, ReceiptOutlined, HistoryOutlined, CloseOutlined } from "@mui/icons-material";


const fieldSx = {
  "& .MuiOutlinedInput-root": { borderRadius: "12px", backgroundColor: "rgba(15,23,42,0.5)", color: "#e2e8f0", fontFamily: "var(--font-cairo)", "& fieldset": { borderColor: "rgba(148,163,184,0.15)" }, "&:hover fieldset": { borderColor: "rgba(59,130,246,0.4)" }, "&.Mui-focused fieldset": { borderColor: "#3b82f6" } },
  "& .MuiInputLabel-root": { color: "#94a3b8", fontFamily: "var(--font-cairo)", "&.Mui-focused": { color: "#60a5fa" } },
  "& .MuiInputBase-input": { textAlign: "right" },
};
const dialogSx = { "& .MuiDialog-paper": { background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "20px", color: "#e2e8f0", direction: "rtl" as const, minWidth: "min(480px, 94vw)", maxHeight: "90vh" } };
const menuSx = { PaperProps: { sx: { background: "#1e293b", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "12px", "& .MuiMenuItem-root": { fontFamily: "var(--font-cairo)", color: "#e2e8f0", "&:hover": { background: "rgba(59,130,246,0.1)" } } } } };
const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

export default function VaultsPage() {
  const { projectId } = useProject();
  const [vaults, setVaults] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { if (!success) return; const t = setTimeout(() => setSuccess(null), 4000); return () => clearTimeout(t); }, [success]);
  useEffect(() => { if (!error) return; const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t); }, [error]);

  // Add vault dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", type: "vault", user_id: "", initial_balance: "" });
  const [saving, setSaving] = useState(false);

  // Transfer dialog
  const [transferOpen, setTransferOpen] = useState(false);
  const [transfer, setTransfer] = useState({ from_vault_id: "", to_vault_id: "", amount: "", notes: "" });

  // Tx dialog
  const [txOpen, setTxOpen] = useState(false);
  const [txVault, setTxVault] = useState<any>(null);
  const [txForm, setTxForm] = useState({ type: "deposit", amount: "", notes: "" });

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // History dialog
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyVault, setHistoryVault] = useState<any>(null);
  const [historyTxs, setHistoryTxs] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [histPeriod, setHistPeriod] = useState<"month" | "year" | "all">("month");

  const [histDateFrom, setHistDateFrom] = useState("");
  const [histDateTo, setHistDateTo] = useState("");


  const openHistory = async (v: any) => {
    setHistoryVault(v); setHistoryTxs([]); setHistoryLoading(true); setHistoryOpen(true);
    setHistPeriod("month"); setHistDateFrom(""); setHistDateTo("");


    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-vaults/${v.id}/transactions`);
    const d = await res.json();
    setHistoryTxs(d.transactions || []);
    setHistoryLoading(false);
  };

  // Summary data
  const [totalDebt, setTotalDebt] = useState(0);
  const [totalReceivable, setTotalReceivable] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalUnpaidExp, setTotalUnpaidExp] = useState(0);
  // Raw lists for summary dialogs
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [expensesList, setExpensesList] = useState<any[]>([]);
  const [salesList, setSalesList] = useState<any[]>([]);
  // Summary dialog state
  const [summaryOpen, setSummaryOpen] = useState<"debts" | "expenses" | "receivables" | null>(null);
  const [inlinePayId, setInlinePayId] = useState<string | null>(null);
  const [inlinePayForm, setInlinePayForm] = useState({ vault_id: "", amount: "", notes: "", payment_date: new Date().toISOString().split("T")[0] });
  const [bulkPayForm, setBulkPayForm] = useState({ vault_id: "", notes: "", payment_date: new Date().toISOString().split("T")[0] });
  const [bulkSaving, setBulkSaving] = useState(false);

  const fetchVaults = useCallback(async () => {
    const [vRes, pRes, sRes, eRes] = await Promise.all([
      fetch(`/api/erp-auth/projects/${projectId}/proj2-vaults`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-purchases`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-sales`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-expenses`),
    ]);
    const [vData, pData, sData, eData] = await Promise.all([vRes.json(), pRes.json(), sRes.json(), eRes.json()]);
    setVaults(vData.vaults || []);
    const ords = pData.orders   || [];
    const sals = sData.sales    || [];
    const exps = eData.expenses || [];
    setPurchaseOrders(ords);
    setSalesList(sals);
    setExpensesList(exps);
    setTotalDebt(ords.reduce((s: number, o: any) => { const r = Number(o.total_amount) - Number(o.paid_amount || 0); return s + (r > 0 ? r : 0); }, 0));
    setTotalReceivable(sals.reduce((s: number, o: any) => { const r = Number(o.total_amount) - Number(o.paid_amount || 0); return s + (r > 0 ? r : 0); }, 0));
    setTotalExpenses(exps.reduce((s: number, e: any) => s + Number(e.amount || 0), 0));
    setTotalUnpaidExp(exps.reduce((s: number, e: any) => { const r = Number(e.amount || 0) - Number(e.paid_amount || 0); return s + (r > 0 ? r : 0); }, 0));
    setLoading(false);
  }, [projectId]);


  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/erp-auth/users");
    const d = await res.json();
    setUsers(d.users || []);
  }, []);

  useEffect(() => { fetchVaults(); fetchUsers(); }, [fetchVaults, fetchUsers]);

  // Combined transactions view
  const [allTxs, setAllTxs] = useState<any[]>([]);
  const [allTxsLoading, setAllTxsLoading] = useState(false);
  const [filterVault, setFilterVault] = useState("");
  const [txPeriod, setTxPeriod] = useState<"month" | "year" | "all">("month");
  const [txDateFrom, setTxDateFrom] = useState("");
  const [txDateTo, setTxDateTo] = useState("");


  const fetchAllTxs = useCallback(async (vaultId = "") => {
    setAllTxsLoading(true);
    const url = `/api/erp-auth/projects/${projectId}/proj2-vaults/all-transactions${vaultId ? `?vault_id=${vaultId}` : ""}`;
    const res = await fetch(url);
    const d = await res.json();
    setAllTxs(d.transactions || []);
    setAllTxsLoading(false);
  }, [projectId]);

  useEffect(() => { if (!loading) fetchAllTxs(); }, [loading, fetchAllTxs]);

  const handleAdd = async () => {
    setSaving(true);
    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-vaults`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...addForm, initial_balance: Number(addForm.initial_balance) || 0 }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); } else { setSuccess("تم إضافة الخزنة"); setAddOpen(false); fetchVaults(); }
    setSaving(false);
  };

  const handleTx = async () => {
    setSaving(true);
    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-vaults/${txVault.id}/transactions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...txForm, amount: Number(txForm.amount) }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); } else { setSuccess("تم تسجيل الحركة"); setTxOpen(false); fetchVaults(); }
    setSaving(false);
  };

  const handleTransfer = async () => {
    setSaving(true);
    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-vaults/transfer`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...transfer, amount: Number(transfer.amount) }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); } else { setSuccess("تم التحويل بنجاح"); setTransferOpen(false); fetchVaults(); }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleteSaving(true);
    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-vaults/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); setError(d.error); } else { setSuccess("تم الحذف"); setDeleteOpen(false); fetchVaults(); }
    setDeleteSaving(false);
  };

  const totalBalance = vaults.reduce((s, v) => s + Number(v.balance), 0);
  const netPosition  = totalBalance + totalReceivable - totalDebt;
  const todayStr = () => new Date().toISOString().split("T")[0];

  const unpaidOrders   = purchaseOrders.filter(o => Number(o.total_amount) > Number(o.paid_amount || 0));
  const unpaidExpenses = expensesList.filter(e => Number(e.amount || 0) > Number(e.paid_amount || 0));
  const unpaidSales    = salesList.filter(s => Number(s.total_amount) > Number(s.paid_amount || 0));

  const handleBulkPay = async (type: "debts" | "expenses" | "receivables") => {
    if (!bulkPayForm.vault_id) return;
    setBulkSaving(true);
    const dt = bulkPayForm.payment_date || todayStr();
    if (type === "debts") {
      for (const o of unpaidOrders) {
        const rem = Number(o.total_amount) - Number(o.paid_amount || 0);
        if (rem <= 0) continue;
        await fetch(`/api/erp-auth/projects/${projectId}/proj2-purchases/${o.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "pay", vault_id: bulkPayForm.vault_id, amount: rem, notes: bulkPayForm.notes, payment_date: dt }) });
      }
    } else if (type === "expenses") {
      for (const e of unpaidExpenses) {
        const rem = Number(e.amount || 0) - Number(e.paid_amount || 0);
        if (rem <= 0) continue;
        await fetch(`/api/erp-auth/projects/${projectId}/proj2-expenses/${e.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vault_id: bulkPayForm.vault_id, amount: rem, notes: bulkPayForm.notes, payment_date: dt }) });
      }
    } else {
      for (const s of unpaidSales) {
        const rem = Number(s.total_amount) - Number(s.paid_amount || 0);
        if (rem <= 0) continue;
        await fetch(`/api/erp-auth/projects/${projectId}/proj2-sales/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "pay", vault_id: bulkPayForm.vault_id, amount: rem, notes: bulkPayForm.notes, payment_date: dt }) });
      }
    }
    setBulkSaving(false); setSummaryOpen(null); setSuccess("تم السداد"); fetchVaults();
  };

  const handleInlinePay = async (type: "debts" | "expenses" | "receivables", id: string) => {
    if (!inlinePayForm.vault_id || !inlinePayForm.amount) return;
    setBulkSaving(true);
    const dt = inlinePayForm.payment_date || todayStr();
    if (type === "debts") {
      await fetch(`/api/erp-auth/projects/${projectId}/proj2-purchases/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "pay", vault_id: inlinePayForm.vault_id, amount: Number(inlinePayForm.amount), notes: inlinePayForm.notes, payment_date: dt }) });
    } else if (type === "expenses") {
      await fetch(`/api/erp-auth/projects/${projectId}/proj2-expenses/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vault_id: inlinePayForm.vault_id, amount: Number(inlinePayForm.amount), notes: inlinePayForm.notes, payment_date: dt }) });
    } else {
      await fetch(`/api/erp-auth/projects/${projectId}/proj2-sales/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "pay", vault_id: inlinePayForm.vault_id, amount: Number(inlinePayForm.amount), notes: inlinePayForm.notes, payment_date: dt }) });
    }
    setBulkSaving(false); setInlinePayId(null); setSuccess("تم تسجيل الدفعة"); fetchVaults();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>الخزنة والعهد</h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0, fontFamily: "var(--font-cairo)" }}>إدارة الأرصدة والحركات المالية</p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Button variant="outlined" startIcon={<SwapHorizOutlined />} onClick={() => setTransferOpen(true)} disabled={vaults.length < 2}
            sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontSize: "13px", textTransform: "none", borderColor: "rgba(148,163,184,0.3)", color: "#e2e8f0", whiteSpace: "nowrap" }}>
            تحويل بين الخزن
          </Button>
          <Button variant="contained" startIcon={<AddOutlined />}
            onClick={() => { setAddForm({ name: "", type: "vault", user_id: "", initial_balance: "" }); setAddOpen(true); }}
            sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", whiteSpace: "nowrap" }}>
            إضافة خزنة
          </Button>
        </div>
      </div>

      {/* ── Financial Summary Cards ── */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px", marginBottom: "20px" }}>
          {/* إجمالي الأرصدة */}
          <div style={{ padding: "16px 18px", borderRadius: "16px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <p style={{ margin: "0 0 6px", fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)", fontWeight: 600 }}>🏦 إجمالي الأرصدة</p>
            <p style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#60a5fa", fontFamily: "var(--font-cairo)" }}>
              {fmt(totalBalance)} <span style={{ fontSize: "11px", fontWeight: 400, color: "#475569" }}>ج.م</span>
            </p>
          </div>
          {/* Debts card — clickable */}
          <button onClick={() => { if (totalDebt <= 0) return; setBulkPayForm({ vault_id: "", notes: "", payment_date: todayStr() }); setSummaryOpen("debts"); }}
            style={{ padding: "16px 18px", borderRadius: "16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", cursor: totalDebt > 0 ? "pointer" : "default", textAlign: "right", direction: "rtl" }}>
            <p style={{ margin: "0 0 6px", fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)", fontWeight: 600 }}>📤 إجمالي المديونات</p>
            <p style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#f87171", fontFamily: "var(--font-cairo)" }}>{fmt(totalDebt)} <span style={{ fontSize: "11px", fontWeight: 400, color: "#475569" }}>ج.م</span></p>
            <p style={{ margin: "4px 0 0", fontSize: "10px", fontFamily: "var(--font-cairo)", color: totalDebt > 0 ? "#ef4444" : "#64748b" }}>{totalDebt > 0 ? `${unpaidOrders.length} فاتورة — اضغط للسداد` : "مستحق للموردين"}</p>
          </button>
          {/* Expenses card — clickable */}
          <button onClick={() => { if (totalUnpaidExp <= 0) return; setBulkPayForm({ vault_id: "", notes: "", payment_date: todayStr() }); setSummaryOpen("expenses"); }}
            style={{ padding: "16px 18px", borderRadius: "16px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", cursor: totalUnpaidExp > 0 ? "pointer" : "default", textAlign: "right", direction: "rtl" }}>
            <p style={{ margin: "0 0 6px", fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)", fontWeight: 600 }}>🧾 إجمالي المصاريف</p>
            <p style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#f59e0b", fontFamily: "var(--font-cairo)" }}>{fmt(totalExpenses)} <span style={{ fontSize: "11px", fontWeight: 400, color: "#475569" }}>ج.م</span></p>
            {totalUnpaidExp > 0 && <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#f87171", fontFamily: "var(--font-cairo)", fontWeight: 600 }}>متبقي: {fmt(totalUnpaidExp)} ج.م — اضغط للسداد</p>}
          </button>
          {/* Receivables card — clickable */}
          <button onClick={() => { if (totalReceivable <= 0) return; setBulkPayForm({ vault_id: "", notes: "", payment_date: todayStr() }); setSummaryOpen("receivables"); }}
            style={{ padding: "16px 18px", borderRadius: "16px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", cursor: totalReceivable > 0 ? "pointer" : "default", textAlign: "right", direction: "rtl" }}>
            <p style={{ margin: "0 0 6px", fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)", fontWeight: 600 }}>📥 تحت التحصيل</p>
            <p style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#a78bfa", fontFamily: "var(--font-cairo)" }}>{fmt(totalReceivable)} <span style={{ fontSize: "11px", fontWeight: 400, color: "#475569" }}>ج.م</span></p>
            <p style={{ margin: "4px 0 0", fontSize: "10px", fontFamily: "var(--font-cairo)", color: totalReceivable > 0 ? "#8b5cf6" : "#64748b" }}>{totalReceivable > 0 ? `${unpaidSales.length} فاتورة — اضغط للتحصيل` : "مستحق من العملاء"}</p>
          </button>

          {/* الصافي */}
          <div style={{ padding: "16px 18px", borderRadius: "16px", background: netPosition >= 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${netPosition >= 0 ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}` }}>
            <p style={{ margin: "0 0 6px", fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)", fontWeight: 600 }}>⚖️ الصافي</p>
            <p style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: netPosition >= 0 ? "#34d399" : "#f87171", fontFamily: "var(--font-cairo)" }}>
              {fmt(netPosition)} <span style={{ fontSize: "11px", fontWeight: 400, color: "#475569" }}>ج.م</span>
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>أرصدة + تحصيل − مديونات</p>
          </div>
        </div>
      )}

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontFamily: "var(--font-cairo)", direction: "rtl", textAlign: "right" }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#86efac", fontFamily: "var(--font-cairo)", direction: "rtl", textAlign: "right" }}>{success}</Alert>}

      {loading ? <div style={{ textAlign: "center", padding: "60px 0" }}><CircularProgress sx={{ color: "#3b82f6" }} /></div>
        : vaults.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", borderRadius: "20px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
            <p style={{ fontSize: "48px", margin: "0 0 12px" }}>🏦</p>
            <p style={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "16px" }}>لا توجد خزن أو عهد بعد</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
            {vaults.map(v => (
              <div key={v.id} style={{ padding: "20px", borderRadius: "18px", background: "rgba(30,41,59,0.5)", border: "1px solid rgba(148,163,184,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <p style={{ fontSize: "15px", fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: "var(--font-cairo)" }}>{v.name}</p>
                    <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0", fontFamily: "var(--font-cairo)" }}>
                      {v.type === "vault" ? "🏦 خزنة" : "👤 عهدة"}
                      {v.type === "custody" && v.user_id && (() => { const u = users.find((u: any) => u.id === v.user_id); return u ? ` — ${u.name}` : ""; })()}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "2px" }}>
                    <IconButton size="small" onClick={() => openHistory(v)} title="كشف الحركات"
                      sx={{ color: "#60a5fa", "&:hover": { background: "rgba(96,165,250,0.1)" } }}>
                      <HistoryOutlined sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => { setTxVault(v); setTxForm({ type: "deposit", amount: "", notes: "" }); setTxOpen(true); }} sx={{ color: "#10b981", "&:hover": { background: "rgba(16,185,129,0.1)" } }}><ReceiptOutlined sx={{ fontSize: 16 }} /></IconButton>
                    <IconButton size="small" onClick={() => { setDeleteTarget(v); setDeleteOpen(true); }} sx={{ color: "#64748b", "&:hover": { color: "#f87171", background: "rgba(248,113,113,0.1)" } }}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton>
                  </div>
                </div>
                <p style={{ fontSize: "26px", fontWeight: 700, color: Number(v.balance) >= 0 ? "#10b981" : "#ef4444", margin: 0, fontFamily: "var(--font-cairo)" }}>
                  {fmt(Number(v.balance))}
                  <span style={{ fontSize: "13px", fontWeight: 400, color: "#64748b", marginRight: "6px" }}>جنيه</span>
                </p>
              </div>
            ))}
          </div>
        )}

      {/* Combined Transactions Section */}
      {(() => {
        const now = new Date();
        const filteredTxs = allTxs.filter((tx: any) => {
          if (!tx.created_at) return true;
          const d = new Date(tx.created_at);
          if (txDateFrom && d < new Date(txDateFrom)) return false;
          if (txDateTo   && d > new Date(txDateTo + "T23:59:59")) return false;
          if (txDateFrom || txDateTo) return true;
          if (txPeriod === "month") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
          if (txPeriod === "year") return d.getFullYear() === now.getFullYear();
          return true;
        });

        const periodLabels = { month: "الشهر الحالي", year: "السنة الحالية", all: "الكل" } as const;
        const typeMap: Record<string, { label: string; color: string; sign: string }> = {
          deposit:      { label: "إيداع",        color: "#10b981", sign: "+" },
          withdrawal:   { label: "سحب",          color: "#ef4444", sign: "−" },
          transfer_in:  { label: "تحويل وارد",  color: "#3b82f6", sign: "+" },
          transfer_out: { label: "تحويل صادر", color: "#f59e0b", sign: "−" },
        };
        // Override label for expense/purchase payments based on ref_type
        const getType = (tx: any) => {
          if (tx.ref_type === "expense")  return { label: "مصروف",        color: "#f59e0b", sign: "−" };
          if (tx.ref_type === "purchase") return { label: "فاتورة شراء", color: "#f87171", sign: "−" };
          if (tx.ref_type === "sale")     return { label: "تحصيل بيع",  color: "#a78bfa", sign: "+" };
          return typeMap[tx.type] || { label: tx.type, color: "#94a3b8", sign: "" };
        };
        return (
          <div style={{ marginTop: "32px" }}>
            {/* Section header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px", direction: "rtl" }}>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: "var(--font-cairo)" }}>📋 كشف الحركات الشامل</p>
              <FormControl size="small" sx={{ minWidth: "160px", ...fieldSx }}>
                <InputLabel>الخزنة</InputLabel>
                <Select value={filterVault} onChange={e => { setFilterVault(e.target.value); fetchAllTxs(e.target.value); }} label="الخزنة" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
                  <MenuItem value="" sx={{ fontFamily: "var(--font-cairo)" }}>كل الخزن</MenuItem>
                  {vaults.map(v => <MenuItem key={v.id} value={v.id} sx={{ fontFamily: "var(--font-cairo)" }}>{v.name}</MenuItem>)}
                </Select>
              </FormControl>
            </div>

            {/* Period filter pills */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap", alignItems: "center" }}>
              {(["month", "year", "all"] as const).map(p => (
                <button key={p} onClick={() => { setTxPeriod(p); setTxDateFrom(""); setTxDateTo(""); }}
                  style={{
                    padding: "5px 16px", borderRadius: "20px", fontSize: "12px", fontFamily: "var(--font-cairo)",
                    cursor: "pointer", border: "none", fontWeight: 600, transition: "all 0.15s",
                    background: txPeriod === p && !txDateFrom && !txDateTo ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "rgba(30,41,59,0.8)",
                    color: txPeriod === p && !txDateFrom && !txDateTo ? "#fff" : "#94a3b8",
                    outline: txPeriod === p && !txDateFrom && !txDateTo ? "none" : "1px solid rgba(148,163,184,0.15)",
                  }}>
                  {periodLabels[p]}
                </button>
              ))}
              {/* Date range inputs */}
              <div style={{ display: "flex", gap: "4px", alignItems: "center", background: (txDateFrom || txDateTo) ? "rgba(59,130,246,0.1)" : "rgba(30,41,59,0.6)", borderRadius: "12px", padding: "3px 8px", outline: (txDateFrom || txDateTo) ? "1px solid rgba(59,130,246,0.35)" : "1px solid rgba(148,163,184,0.12)" }}>
                <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)", whiteSpace: "nowrap" }}>من</span>
                <input type="date" value={txDateFrom} onChange={e => setTxDateFrom(e.target.value)}
                  style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "12px", fontFamily: "monospace", width: "120px", cursor: "pointer", colorScheme: "dark" }} />
                <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)", whiteSpace: "nowrap" }}>إلى</span>
                <input type="date" value={txDateTo} onChange={e => setTxDateTo(e.target.value)}
                  style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "12px", fontFamily: "monospace", width: "120px", cursor: "pointer", colorScheme: "dark" }} />
                {(txDateFrom || txDateTo) && (
                  <button onClick={() => { setTxDateFrom(""); setTxDateTo(""); }} title="مسح التواريخ"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", fontSize: "14px", lineHeight: 1, padding: "0 2px" }}>✕</button>
                )}
              </div>
              <span style={{ fontSize: "11px", color: "#475569", fontFamily: "var(--font-cairo)", alignSelf: "center", marginRight: "4px" }}>
                {filteredTxs.length} حركة
              </span>
            </div>


            {allTxsLoading ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}><CircularProgress size={28} sx={{ color: "#3b82f6" }} /></div>
            ) : filteredTxs.length === 0 ? (
              <p style={{ textAlign: "center", color: "#475569", fontFamily: "var(--font-cairo)", fontSize: "14px", padding: "28px 0" }}>
                لا توجد حركات في {periodLabels[txPeriod]}
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {filteredTxs.map((tx: any) => {
                  const t = getType(tx);
                  return (
                    <div key={tx.id} style={{ padding: "10px 14px", borderRadius: "12px", background: "rgba(15,23,42,0.4)", border: "1px solid rgba(148,163,184,0.06)", direction: "rtl" }}>
                      {/* Line 1: type + vault + amount */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: t.color, background: `${t.color}18`, padding: "2px 8px", borderRadius: "8px", fontFamily: "var(--font-cairo)", whiteSpace: "nowrap" }}>{t.label}</span>
                        {tx.vault?.name && <span style={{ fontSize: "12px", color: "#60a5fa", fontFamily: "var(--font-cairo)", whiteSpace: "nowrap" }}>{tx.vault.name}</span>}
                        <span style={{ flex: 1 }} />
                        <span style={{ fontSize: "14px", fontWeight: 700, color: t.color, fontFamily: "monospace", whiteSpace: "nowrap" }}>{t.sign}{fmt(Number(tx.amount))}</span>
                      </div>
                      {/* Line 2: notes + date */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "12px", color: "#64748b", fontFamily: "var(--font-cairo)", lineHeight: 1.5, flex: 1 }}>{tx.notes || "—"}</span>
                        <span style={{ fontSize: "10px", color: "#475569", whiteSpace: "nowrap", flexShrink: 0, marginTop: "2px" }}>{tx.created_at ? new Date(tx.created_at).toLocaleDateString("en-GB") : ""}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Add Vault Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>إضافة خزنة / عهدة</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <TextField label="الاسم *" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} fullWidth sx={fieldSx} />
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>النوع</InputLabel>
            <Select value={addForm.type} onChange={e => setAddForm({ ...addForm, type: e.target.value, user_id: "" })} label="النوع" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              <MenuItem value="vault">🏦 خزنة</MenuItem>
              <MenuItem value="custody">👤 عهدة</MenuItem>
            </Select>
          </FormControl>

          {addForm.type === "custody" && (
            <FormControl fullWidth sx={fieldSx} required>
              <InputLabel>المسؤول عن العهدة *</InputLabel>
              <Select value={addForm.user_id} onChange={e => setAddForm({ ...addForm, user_id: e.target.value })} label="المسؤول عن العهدة *" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
                {users.length === 0
                  ? <MenuItem disabled sx={{ fontFamily: "var(--font-cairo)", color: "#64748b" }}>لا يوجد مستخدمون</MenuItem>
                  : users.map((u: any) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)
                }
              </Select>
            </FormControl>
          )}
          <TextField label="الرصيد الافتتاحي (اختياري)" type="number" value={addForm.initial_balance} onChange={e => setAddForm({ ...addForm, initial_balance: e.target.value })} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setAddOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleAdd}
            disabled={saving || !addForm.name || (addForm.type === "custody" && !addForm.user_id)}
            variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "إضافة"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tx Dialog */}
      <Dialog open={txOpen} onClose={() => setTxOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>حركة: {txVault?.name}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <ToggleButtonGroup value={txForm.type} exclusive onChange={(_, v) => v && setTxForm({ ...txForm, type: v })} fullWidth>
            <ToggleButton value="deposit" sx={{ fontFamily: "var(--font-cairo)", color: "#10b981", "&.Mui-selected": { background: "rgba(16,185,129,0.15)", color: "#10b981" } }}>إيداع</ToggleButton>
            <ToggleButton value="withdrawal" sx={{ fontFamily: "var(--font-cairo)", color: "#f87171", "&.Mui-selected": { background: "rgba(248,113,113,0.15)", color: "#f87171" } }}>سحب</ToggleButton>
          </ToggleButtonGroup>
          <TextField label="المبلغ *" type="number" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} />
          <TextField label="ملاحظات" value={txForm.notes} onChange={e => setTxForm({ ...txForm, notes: e.target.value })} fullWidth multiline rows={2} sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setTxOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleTx} disabled={saving || !txForm.amount} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: txForm.type === "deposit" ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "#dc2626" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : txForm.type === "deposit" ? "إيداع" : "سحب"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onClose={() => setTransferOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>تحويل بين الخزن</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>من خزنة *</InputLabel>
            <Select value={transfer.from_vault_id} onChange={e => setTransfer({ ...transfer, from_vault_id: e.target.value })} label="من خزنة *" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              {vaults.map(v => <MenuItem key={v.id} value={v.id}>{v.name} — {fmt(Number(v.balance))} جنيه</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>إلى خزنة *</InputLabel>
            <Select value={transfer.to_vault_id} onChange={e => setTransfer({ ...transfer, to_vault_id: e.target.value })} label="إلى خزنة *" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              {vaults.filter(v => v.id !== transfer.from_vault_id).map(v => <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="المبلغ *" type="number" value={transfer.amount} onChange={e => setTransfer({ ...transfer, amount: e.target.value })} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} />
          <TextField label="ملاحظات" value={transfer.notes} onChange={e => setTransfer({ ...transfer, notes: e.target.value })} fullWidth sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setTransferOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleTransfer} disabled={saving || !transfer.from_vault_id || !transfer.to_vault_id || !transfer.amount} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "تحويل"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#f87171" }}>حذف الخزنة</DialogTitle>
        <DialogContent><p style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", fontSize: "15px", margin: 0 }}>هل تريد حذف <strong style={{ color: "#e2e8f0" }}>{deleteTarget?.name}</strong>؟</p></DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleDelete} disabled={deleteSaving} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "#dc2626" }}>
            {deleteSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حذف"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog - Premium Redesign */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)}
        sx={{ "& .MuiDialog-paper": { background: "linear-gradient(160deg,#1e293b 0%,#0f172a 100%)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "24px", color: "#e2e8f0", direction: "rtl" as const, minWidth: "min(560px,96vw)", maxHeight: "88vh" } }}>

        {/* Custom header */}
        <div style={{ padding: "20px 24px 12px", borderBottom: "1px solid rgba(148,163,184,0.08)", direction: "rtl" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#64748b", fontFamily: "var(--font-cairo)", fontWeight: 600 }}>📋 كشف الحركات</p>
              <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#f1f5f9", fontFamily: "var(--font-cairo)" }}>{historyVault?.name}</h2>
            </div>
            <div style={{ textAlign: "left", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
              <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>الرصيد الحالي</span>
              <span style={{ fontSize: "20px", fontWeight: 800, color: "#60a5fa", fontFamily: "var(--font-cairo)" }}>{fmt(Number(historyVault?.balance || 0))} <span style={{ fontSize: "11px", color: "#475569", fontWeight: 400 }}>ج.م</span></span>
            </div>
          </div>
        </div>

        <DialogContent sx={{ pt: "14px !important", direction: "rtl", px: "20px" }}>
          {historyLoading && <div style={{ textAlign: "center", padding: "50px 0" }}><CircularProgress sx={{ color: "#3b82f6" }} size={36} /></div>}
          {!historyLoading && historyTxs.length === 0 && (
            <div style={{ textAlign: "center", padding: "50px 0" }}>
              <p style={{ fontSize: "40px", margin: "0 0 10px" }}>📭</p>
              <p style={{ color: "#64748b", fontFamily: "var(--font-cairo)", fontSize: "14px" }}>لا توجد حركات بعد</p>
            </div>
          )}
          {!historyLoading && historyTxs.length > 0 && (() => {
            const now = new Date();
            const filtered = historyTxs.filter((tx: any) => {
              const d = tx.created_at ? new Date(tx.created_at) : null;
              if (!d) return true;
              if (histDateFrom && d < new Date(histDateFrom)) return false;
              if (histDateTo   && d > new Date(histDateTo + "T23:59:59")) return false;
              if (histDateFrom || histDateTo) return true;
              if (histPeriod === "month") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
              if (histPeriod === "year")  return d.getFullYear() === now.getFullYear();
              return true;
            });
            const typeMap: Record<string, { label: string; color: string; sign: string; isIn: boolean }> = {
              deposit:      { label: "إيداع",        color: "#10b981", sign: "+", isIn: true  },
              withdrawal:   { label: "سحب",          color: "#ef4444", sign: "−", isIn: false },
              transfer_in:  { label: "تحويل وارد",  color: "#3b82f6", sign: "+", isIn: true  },
              transfer_out: { label: "تحويل صادر",  color: "#f59e0b", sign: "−", isIn: false },
            };
            const getHistType = (tx: any) => {
              if (tx.ref_type === "expense")  return { label: "مصروف",        color: "#f59e0b", sign: "−", isIn: false };
              if (tx.ref_type === "purchase") return { label: "فاتورة شراء", color: "#f87171", sign: "−", isIn: false };
              if (tx.ref_type === "sale")     return { label: "تحصيل بيع",  color: "#a78bfa", sign: "+", isIn: true  };
              return typeMap[tx.type] || { label: tx.type, color: "#94a3b8", sign: "", isIn: false };
            };
            const totalIn  = filtered.reduce((s, tx) => { const t = getHistType(tx); return s + (t?.isIn ? Number(tx.amount) : 0); }, 0);
            const totalOut = filtered.reduce((s, tx) => { const t = getHistType(tx); return s + (!t?.isIn ? Number(tx.amount) : 0); }, 0);
            const net = totalIn - totalOut;
            return (
              <>
                {/* Mini totals */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
                  <div style={{ padding: "10px 12px", borderRadius: "12px", background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.18)", textAlign: "center" }}>
                    <p style={{ margin: "0 0 2px", fontSize: "10px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>إجمالي الوارد</p>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#34d399", fontFamily: "var(--font-cairo)" }}>+{fmt(totalIn)}</p>
                  </div>
                  <div style={{ padding: "10px 12px", borderRadius: "12px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", textAlign: "center" }}>
                    <p style={{ margin: "0 0 2px", fontSize: "10px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>إجمالي الصادر</p>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#f87171", fontFamily: "var(--font-cairo)" }}>−{fmt(totalOut)}</p>
                  </div>
                  <div style={{ padding: "10px 12px", borderRadius: "12px", background: net >= 0 ? "rgba(16,185,129,0.07)" : "rgba(239,68,68,0.07)", border: `1px solid ${net >= 0 ? "rgba(16,185,129,0.18)" : "rgba(239,68,68,0.18)"}`, textAlign: "center" }}>
                    <p style={{ margin: "0 0 2px", fontSize: "10px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>الصافي</p>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: net >= 0 ? "#34d399" : "#f87171", fontFamily: "var(--font-cairo)" }}>{net >= 0 ? "+" : ""}{fmt(net)}</p>
                  </div>
                </div>

                {/* Filter pills */}
                <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap", alignItems: "center", direction: "rtl" }}>
                  {(["month", "year", "all"] as const).map(p => (
                    <button key={p} onClick={() => { setHistPeriod(p); setHistDateFrom(""); setHistDateTo(""); }}
                      style={{ padding: "5px 16px", borderRadius: "20px", fontSize: "12px", fontFamily: "var(--font-cairo)", cursor: "pointer", border: "none", fontWeight: 600, transition: "all 0.15s",
                        background: histPeriod === p && !histDateFrom && !histDateTo ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "rgba(30,41,59,0.8)",
                        color: histPeriod === p && !histDateFrom && !histDateTo ? "#fff" : "#94a3b8",
                        outline: histPeriod === p && !histDateFrom && !histDateTo ? "none" : "1px solid rgba(148,163,184,0.15)" }}>
                      {p === "month" ? "الشهر الحالي" : p === "year" ? "السنة الحالية" : "الكل"}
                    </button>
                  ))}
                  <div style={{ display: "flex", gap: "4px", alignItems: "center", background: (histDateFrom || histDateTo) ? "rgba(59,130,246,0.1)" : "rgba(30,41,59,0.6)", borderRadius: "10px", padding: "2px 7px", outline: (histDateFrom || histDateTo) ? "1px solid rgba(59,130,246,0.35)" : "1px solid rgba(148,163,184,0.12)" }}>
                    <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>من</span>
                    <input type="date" value={histDateFrom} onChange={e => setHistDateFrom(e.target.value)}
                      style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "11px", fontFamily: "monospace", width: "110px", cursor: "pointer", colorScheme: "dark" }} />
                    <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>إلى</span>
                    <input type="date" value={histDateTo} onChange={e => setHistDateTo(e.target.value)}
                      style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "11px", fontFamily: "monospace", width: "110px", cursor: "pointer", colorScheme: "dark" }} />
                    {(histDateFrom || histDateTo) && (
                      <button onClick={() => { setHistDateFrom(""); setHistDateTo(""); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", fontSize: "13px", lineHeight: 1, padding: "0 2px" }}>✕</button>
                    )}
                  </div>
                  <span style={{ fontSize: "10px", color: "#475569", fontFamily: "var(--font-cairo)", marginRight: "2px" }}>{filtered.length} حركة</span>
                </div>

                {/* Rows */}
                {filtered.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#64748b", fontFamily: "var(--font-cairo)", fontSize: "14px", padding: "30px 0" }}>لا توجد حركات في هذه الفترة</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", paddingRight: "8px" }}>
                    {filtered.map((tx: any) => {
                      const t = getHistType(tx);
                      return (
                        <div key={tx.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "12px 16px", borderRadius: "12px", background: "rgba(30,41,59,0.5)", border: `1px solid ${t.color}14`, direction: "rtl", flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: "200px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: t.color, background: `${t.color}18`, padding: "3px 9px", borderRadius: "8px", fontFamily: "var(--font-cairo)", whiteSpace: "nowrap" }}>{t.label}</span>
                              <span style={{ fontSize: "14px", fontWeight: 700, color: "#e2e8f0", fontFamily: "var(--font-cairo)" }}>{tx.notes || "—"}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                            <span style={{ fontSize: "12px", color: "#64748b", fontFamily: "var(--font-cairo)", whiteSpace: "nowrap" }}>{tx.created_at ? new Date(tx.created_at).toLocaleDateString("en-GB").replace(/\//g, "-") : ""}</span>
                            <div style={{ textAlign: "left", flexShrink: 0, minWidth: "100px", direction: "ltr" }}>
                              <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: t.color, fontFamily: "var(--font-cairo)" }}>{t.sign}{fmt(Number(tx.amount))} <span style={{ fontSize: "11px", fontWeight: 400 }}>ج.م</span></p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
          {historyLoading && <div style={{ textAlign: "center", padding: "40px 0" }}><CircularProgress sx={{ color: "#3b82f6" }} size={32} /></div>}
          {!historyLoading && historyTxs.length === 0 && <p style={{ textAlign: "center", color: "#64748b", fontFamily: "var(--font-cairo)", fontSize: "14px", padding: "32px 0" }}>لا توجد حركات بعد</p>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setHistoryOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إغلاق</Button>
        </DialogActions>
      </Dialog>


      {/* Summary payment dialogs */}
      {([
        { key: "debts",       title: "مديونات الموردين",     color: "#f87171",  total: totalDebt,        items: unpaidOrders,   getCode: (o: any) => o.code || "—",        getLabel: (o: any) => o.supplier?.name || "—", getRem: (o: any) => Number(o.total_amount) - Number(o.paid_amount || 0), type: "debts"       as const },
        { key: "expenses",    title: "مصاريف غير مسددة",    color: "#f59e0b",  total: totalUnpaidExp,   items: unpaidExpenses, getCode: (e: any) => e.expense_type || "—", getLabel: (e: any) => e.description || "—",    getRem: (e: any) => Number(e.amount || 0) - Number(e.paid_amount || 0), type: "expenses"    as const },
        { key: "receivables", title: "مستحقات العملاء",     color: "#a78bfa",  total: totalReceivable,  items: unpaidSales,    getCode: (s: any) => s.code || "—",        getLabel: (s: any) => s.customer?.name || "—", getRem: (s: any) => Number(s.total_amount) - Number(s.paid_amount || 0), type: "receivables" as const },
      ] as const).map(({ key, title, color, total, items, getCode, getLabel, getRem, type }) => (
        <Dialog key={key} open={summaryOpen === key} onClose={() => setSummaryOpen(null)}
          sx={{ "& .MuiDialog-paper": { background: "linear-gradient(135deg,#1e293b,#0f172a)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "20px", color: "#e2e8f0", direction: "rtl", minWidth: "min(580px,96vw)", maxHeight: "85vh" } }}>
          <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "18px", display: "flex", justifyContent: "space-between", alignItems: "center", color }}>
            <span>{title} ({items.length})</span>
            <IconButton onClick={() => setSummaryOpen(null)} sx={{ color: "#64748b" }}><CloseOutlined /></IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: "4px !important" }}>
            {/* Bulk pay bar */}
            <div style={{ padding: "12px 14px", borderRadius: "12px", background: `${color}12`, border: `1px solid ${color}33`, marginBottom: "14px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color, fontFamily: "var(--font-cairo)", fontWeight: 700 }}>الإجمالي: {fmt(total)} ج.م</span>
              <span style={{ flex: 1 }} />
              <FormControl size="small" sx={{ minWidth: 140, ...fieldSx }}><InputLabel>الخزنة</InputLabel>
                <Select value={bulkPayForm.vault_id} onChange={e => setBulkPayForm(p => ({ ...p, vault_id: e.target.value }))} label="الخزنة" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
                  {vaults.map(v => <MenuItem key={v.id} value={v.id} sx={{ fontFamily: "var(--font-cairo)" }}>{v.name} — {fmt(Number(v.balance))}</MenuItem>)}
                </Select>
              </FormControl>
              <Button size="small" variant="contained" disabled={bulkSaving || !bulkPayForm.vault_id} onClick={() => handleBulkPay(type)}
                sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: color, whiteSpace: "nowrap" }}>
                {bulkSaving ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "سداد الكل"}
              </Button>
            </div>
            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {items.map((item: any) => {
                const rem = getRem(item);
                const isOpen = inlinePayId === item.id;
                return (
                  <div key={item.id} style={{ padding: "12px 14px", borderRadius: "12px", background: "rgba(15,23,42,0.45)", border: `1px solid ${color}18` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#60a5fa", fontFamily: "monospace", background: "rgba(59,130,246,0.1)", padding: "2px 7px", borderRadius: "6px" }}>{getCode(item)}</span>
                      <span style={{ fontSize: "13px", color: "#f1f5f9", fontFamily: "var(--font-cairo)", flex: 1 }}>{getLabel(item)}</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color, fontFamily: "var(--font-cairo)", whiteSpace: "nowrap" }}>متبقي: {fmt(rem)} ج.م</span>
                      <Button size="small" variant="outlined" onClick={() => { setInlinePayId(isOpen ? null : item.id); setInlinePayForm({ vault_id: "", amount: String(rem), notes: "", payment_date: todayStr() }); }}
                        sx={{ borderRadius: "8px", fontFamily: "var(--font-cairo)", fontSize: "11px", borderColor: color, color, textTransform: "none", whiteSpace: "nowrap", "&:hover": { background: `${color}18` } }}>
                        {isOpen ? "إلغاء" : "سداد"}
                      </Button>
                    </div>
                    {isOpen && (
                      <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-end" }}>
                        <FormControl size="small" sx={{ minWidth: 130, ...fieldSx }}><InputLabel>الخزنة *</InputLabel>
                          <Select value={inlinePayForm.vault_id} onChange={e => setInlinePayForm(p => ({ ...p, vault_id: e.target.value }))} label="الخزنة *" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
                            {vaults.map(v => <MenuItem key={v.id} value={v.id} sx={{ fontFamily: "var(--font-cairo)" }}>{v.name}</MenuItem>)}
                          </Select>
                        </FormControl>
                        <TextField size="small" label="المبلغ" type="number" value={inlinePayForm.amount} onChange={e => setInlinePayForm(p => ({ ...p, amount: e.target.value }))} sx={{ width: 110, ...fieldSx, "& .MuiInputBase-input": { textAlign: "left" } }} />
                        <TextField size="small" label="ملاحظات" value={inlinePayForm.notes} onChange={e => setInlinePayForm(p => ({ ...p, notes: e.target.value }))} sx={{ flex: 1, minWidth: 100, ...fieldSx }} />
                        <Button size="small" variant="contained" disabled={bulkSaving || !inlinePayForm.vault_id || !inlinePayForm.amount} onClick={() => handleInlinePay(type, item.id)}
                          sx={{ borderRadius: "8px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: color, whiteSpace: "nowrap" }}>
                          {bulkSaving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "تأكيد"}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}
