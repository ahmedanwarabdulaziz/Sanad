"use client";

import { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AssessmentIcon from "@mui/icons-material/Assessment";
import EditIcon from "@mui/icons-material/Edit";
import HistoryIcon from "@mui/icons-material/History";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import NAdminShell from "../components/NAdminShell";
import { RecordList, RecordCard, PageHeader, EmptyState, MobileFriendlySelect } from "../components";
import { getAllUsers } from "@/databases/sales-operations/collections/users";
import { getAllVaults, createVault, updateVault } from "@/databases/sales-operations/collections/vaults";
import { getAllVaultTransfers, createVaultTransfer, computeBalancesByVault } from "@/databases/sales-operations/collections/vault_transfers";
import { getAllPurchaseInvoices } from "@/databases/sales-operations/collections/purchase_invoices";
import { getAllSalesInvoices } from "@/databases/sales-operations/collections/sales_invoices";
import { getAllExpenses } from "@/databases/sales-operations/collections/expenses";
import { getWarehouseValue } from "@/databases/sales-operations/collections/stock_movements";
import type { SalesUser } from "@/databases/sales-operations/types";
import type { Vault, VaultType } from "@/databases/sales-operations/types";
import type { PurchaseInvoice } from "@/databases/sales-operations/types";
import type { SalesInvoice } from "@/databases/sales-operations/types";
import type { Expense } from "@/databases/sales-operations/types";

export type VaultTransactionType = "opening_balance" | "transfer_in" | "transfer_out" | "expense" | "purchase" | "sales";

export interface VaultTransactionRow {
  id: string;
  type: VaultTransactionType;
  date: number;
  amount: number;
  description: string;
  ref?: string;
}

export default function FinancialPage() {
  const [user, setUser] = useState<SalesUser | null>(null);
  const [users, setUsers] = useState<SalesUser[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [transfers, setTransfers] = useState<Awaited<ReturnType<typeof getAllVaultTransfers>>>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [warehouseValue, setWarehouseValue] = useState(0);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [vaultDialogOpen, setVaultDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [historyVault, setHistoryVault] = useState<Vault | null>(null);
  const [historyTypeFilter, setHistoryTypeFilter] = useState<VaultTransactionType | "">("");
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [editingVault, setEditingVault] = useState<Vault | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [vaultForm, setVaultForm] = useState({
    name: "",
    type: "personal" as VaultType,
    assignedToUserId: "",
    bankName: "",
    accountNumber: "",
    branchName: "",
    notes: "",
    openingBalance: 0,
    active: true,
  });
  const [transferForm, setTransferForm] = useState({
    fromVaultId: "",
    toVaultId: "",
    amount: 0,
    notes: "",
  });
  const [transferSaving, setTransferSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const vaultDialogFirstRef = useRef<HTMLDivElement>(null);
  const transferDialogFirstRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("n_admin_user");
    if (!raw) {
      window.location.href = "/n-admin";
      return;
    }
    try {
      const u = JSON.parse(raw);
      setUser(u);
      const canAccess =
        u.role === "super_admin" ||
        u.role === "admin" ||
        u.pageAccess?.some((a: { pageId: string }) => a.pageId === "financial");
      if (!canAccess) {
        window.location.href = "/n-admin/dashboard";
        return;
      }
    } catch {
      window.location.href = "/n-admin";
      return;
    }
    loadData();
    getAllUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  const loadData = () => {
    setLoading(true);
    setLoadError(null);
    Promise.all([
      getAllVaults(),
      getAllVaultTransfers(),
      getAllPurchaseInvoices(),
      getAllSalesInvoices(),
      getAllExpenses(),
      getWarehouseValue(),
    ])
      .then(([vList, tList, pInvs, sInvs, exps, whVal]) => {
        setVaults(vList);
        setTransfers(tList);
        setPurchaseInvoices(pInvs);
        setSalesInvoices(sInvs);
        setExpenses(exps);
        setWarehouseValue(whVal);
        const balances = computeBalancesByVault(vList, tList);
        for (const inv of pInvs) {
          const amount = inv.amountPaid ?? 0;
          const vaultId = inv.paidFromVaultId?.trim();
          if (amount > 0 && vaultId && balances[vaultId] !== undefined) {
            balances[vaultId] -= amount;
          }
        }
        for (const inv of sInvs) {
          const amount = inv.amountPaid ?? 0;
          const vaultId = inv.paidToVaultId?.trim();
          if (amount > 0 && vaultId && balances[vaultId] !== undefined) {
            balances[vaultId] += amount;
          }
        }
        for (const exp of exps) {
          if (exp.payments?.length) {
            for (const p of exp.payments) {
              if (p.amount > 0 && p.vaultId && balances[p.vaultId] !== undefined) {
                balances[p.vaultId] -= p.amount;
              }
            }
          } else {
            const amount = exp.amountPaid ?? 0;
            const vaultId = exp.paidFromVaultId?.trim();
            if (amount > 0 && vaultId && balances[vaultId] !== undefined) {
              balances[vaultId] -= amount;
            }
          }
        }
        setBalances(balances);
      })
      .catch((err) => {
        console.error("Financial load error:", err);
        setLoadError("فشل تحميل البيانات. تحقق من الاتصال أو تعطيل مانع الإعلانات لـ firestore.googleapis.com");
        setVaults([]);
        setTransfers([]);
        setPurchaseInvoices([]);
        setSalesInvoices([]);
        setExpenses([]);
        setWarehouseValue(0);
        setBalances({});
      })
      .finally(() => setLoading(false));
  };

  const openAddVault = () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setEditingVault(null);
    setVaultForm({
      name: "",
      type: "personal",
      assignedToUserId: "",
      bankName: "",
      accountNumber: "",
      branchName: "",
      notes: "",
      openingBalance: 0,
      active: true,
    });
    setVaultDialogOpen(true);
  };

  const openEditVault = (v: Vault) => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setEditingVault(v);
    setVaultForm({
      name: v.name,
      type: v.type,
      assignedToUserId: v.assignedToUserId,
      bankName: v.bankName ?? "",
      accountNumber: v.accountNumber ?? "",
      branchName: v.branchName ?? "",
      notes: v.notes ?? "",
      openingBalance: v.openingBalance ?? 0,
      active: v.active,
    });
    setVaultDialogOpen(true);
  };

  const openTransfer = () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setTransferForm({
      fromVaultId: vaults[0]?.id ?? "",
      toVaultId: vaults[1]?.id ?? "",
      amount: 0,
      notes: "",
    });
    setTransferDialogOpen(true);
  };

  const handleTransfer = async () => {
    if (!transferForm.fromVaultId || !transferForm.toVaultId || transferForm.fromVaultId === transferForm.toVaultId || transferForm.amount <= 0) return;
    const fromBalance = balances[transferForm.fromVaultId] ?? 0;
    if (fromBalance < transferForm.amount) return;
    setTransferSaving(true);
    try {
      await createVaultTransfer({
        fromVaultId: transferForm.fromVaultId,
        toVaultId: transferForm.toVaultId,
        amount: transferForm.amount,
        notes: transferForm.notes.trim() || undefined,
        createdBy: user?.id,
      });
      setTransferDialogOpen(false);
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setTransferSaving(false);
    }
  };

  const handleSaveVault = async () => {
    if (!vaultForm.name.trim() || !vaultForm.assignedToUserId) return;
    setSaveError(null);
    try {
      const openingBalance = vaultForm.openingBalance ?? 0;
      if (editingVault) {
        await updateVault(editingVault.id, {
          name: vaultForm.name.trim(),
          type: vaultForm.type,
          assignedToUserId: vaultForm.assignedToUserId,
          bankName: vaultForm.bankName.trim() || undefined,
          accountNumber: vaultForm.accountNumber.trim() || undefined,
          branchName: vaultForm.branchName.trim() || undefined,
          notes: vaultForm.notes.trim() || undefined,
          openingBalance,
          active: vaultForm.active,
          updatedBy: user?.id,
        });
      } else {
        await createVault({
          name: vaultForm.name.trim(),
          type: vaultForm.type,
          assignedToUserId: vaultForm.assignedToUserId,
          bankName: vaultForm.bankName.trim() || undefined,
          accountNumber: vaultForm.accountNumber.trim() || undefined,
          branchName: vaultForm.branchName.trim() || undefined,
          notes: vaultForm.notes.trim() || undefined,
          openingBalance,
          active: vaultForm.active,
          createdBy: user?.id,
        });
      }
      setVaultDialogOpen(false);
      loadData();
    } catch (e) {
      console.error(e);
      setSaveError("فشل الحفظ. تأكد من عدم حظر طلبات Firestore (مانع إعلانات/إعدادات المتصفح).");
    } finally {
      loadData();
    }
  };

  const getUserName = (id: string) => users.find((u) => u.id === id)?.name ?? "—";
  const getVaultName = (id: string) => vaults.find((v) => v.id === id)?.name ?? id;

  const TRANSACTION_TYPE_LABEL: Record<VaultTransactionType, string> = {
    opening_balance: "رصيد افتتاحي",
    transfer_in: "تحويل وارد",
    transfer_out: "تحويل صادر",
    expense: "مصروف",
    purchase: "فاتورة شراء",
    sales: "فاتورة مبيعات",
  };

  function getVaultTransactions(vaultId: string): VaultTransactionRow[] {
    const vault = vaults.find((v) => v.id === vaultId);
    if (!vault) return [];
    const rows: VaultTransactionRow[] = [];
    const ob = vault.openingBalance ?? 0;
    if (ob !== 0) {
      rows.push({
        id: `opening-${vaultId}`,
        type: "opening_balance",
        date: vault.createdAt,
        amount: ob,
        description: "رصيد افتتاحي",
      });
    }
    for (const t of transfers) {
      if (t.fromVaultId === vaultId) {
        rows.push({
          id: `transfer-out-${t.id}`,
          type: "transfer_out",
          date: t.createdAt,
          amount: -t.amount,
          description: `تحويل إلى ${getVaultName(t.toVaultId)}`,
          ref: t.notes ?? undefined,
        });
      }
      if (t.toVaultId === vaultId) {
        rows.push({
          id: `transfer-in-${t.id}`,
          type: "transfer_in",
          date: t.createdAt,
          amount: t.amount,
          description: `تحويل من ${getVaultName(t.fromVaultId)}`,
          ref: t.notes ?? undefined,
        });
      }
    }
    for (const inv of purchaseInvoices) {
      const amount = inv.amountPaid ?? 0;
      const vid = inv.paidFromVaultId?.trim();
      if (amount > 0 && vid === vaultId) {
        rows.push({
          id: `purchase-${inv.id}`,
          type: "purchase",
          date: inv.updatedAt ?? inv.createdAt,
          amount: -amount,
          description: `فاتورة شراء ${inv.invoiceNumber ?? inv.id}`,
          ref: inv.supplierName,
        });
      }
    }
    for (const inv of salesInvoices) {
      const amount = inv.amountPaid ?? 0;
      const vid = inv.paidToVaultId?.trim();
      if (amount > 0 && vid === vaultId) {
        rows.push({
          id: `sales-${inv.id}`,
          type: "sales",
          date: inv.updatedAt ?? inv.createdAt,
          amount,
          description: `فاتورة مبيعات ${inv.invoiceNumber ?? inv.id}`,
          ref: inv.customerName,
        });
      }
    }
    for (const exp of expenses) {
      if (exp.payments?.length) {
        exp.payments.forEach((p, idx) => {
          if (p.vaultId === vaultId && p.amount > 0) {
            rows.push({
              id: `exp-${exp.id}-${idx}-${p.amount}`,
              type: "expense",
              date: exp.updatedAt ?? exp.createdAt,
              amount: -p.amount,
              description: "مصروف",
              ref: exp.notes ?? undefined,
            });
          }
        });
      } else {
        const amount = exp.amountPaid ?? 0;
        const vid = exp.paidFromVaultId?.trim();
        if (amount > 0 && vid === vaultId) {
          rows.push({
            id: `exp-${exp.id}`,
            type: "expense",
            date: exp.updatedAt ?? exp.createdAt,
            amount: -amount,
            description: "مصروف",
            ref: exp.notes ?? undefined,
          });
        }
      }
    }
    rows.sort((a, b) => {
      const byDate = b.date - a.date;
      if (byDate !== 0) return byDate;
      return String(a.id).localeCompare(String(b.id));
    });
    return rows;
  }

  const totalBalance = Object.keys(balances).reduce((sum, id) => sum + (balances[id] ?? 0), 0);
  const pendingPay =
    purchaseInvoices.reduce((s, inv) => s + Math.max(0, inv.totalAmount - (inv.amountPaid ?? 0)), 0) +
    expenses.reduce((s, e) => s + Math.max(0, e.amount - (e.amountPaid ?? 0)), 0);
  const pendingCollect = salesInvoices.reduce((s, inv) => s + Math.max(0, inv.totalAmount - (inv.amountPaid ?? 0)), 0);
  const reportFinalNumber = totalBalance + pendingCollect + warehouseValue - pendingPay;
  const reportRows = vaults.filter((v) => v.active).map((v) => {
    const tx = getVaultTransactions(v.id);
    const opening = tx.filter((t) => t.type === "opening_balance").reduce((s, t) => s + t.amount, 0);
    const totalIn = tx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const totalOut = tx.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    return { vault: v, opening, totalIn, totalOut, balance: balances[v.id] ?? 0 };
  });

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit", year: "numeric" });
  const formatDateTime = (ts: number) =>
    new Date(ts).toLocaleString("ar-EG", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  if (!user) return null;

  return (
    <NAdminShell>
      <PageHeader
        title="المالية والحسابات"
        subtitle={
          !loading && !loadError && vaults.length > 0 ? (
            <Typography
              variant="body1"
              fontWeight={600}
              sx={{ fontFamily: "var(--font-cairo)", color: "success.main", fontSize: { xs: "0.95rem", sm: "1rem" } }}
            >
              {totalBalance.toLocaleString("en-US")} ج.م
            </Typography>
          ) : null
        }
        action={
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "flex-end" }}>
            {!loading && !loadError && vaults.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<AssessmentIcon />}
                onClick={() => setReportDialogOpen(true)}
                size="small"
                sx={{ fontFamily: "var(--font-cairo)" }}
              >
                التقرير المالي
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<SwapHorizIcon />}
              onClick={openTransfer}
              size="small"
              disabled={vaults.length < 2}
              sx={{ fontFamily: "var(--font-cairo)" }}
            >
              تحويل
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openAddVault}
              size="small"
              sx={{ fontFamily: "var(--font-cairo)" }}
            >
              إضافة
            </Button>
          </Box>
        }
      />

      <RecordList loading={loading}>
        {!loading && loadError && (
          <Box sx={{ p: 2, textAlign: "right" }}>
            <Typography color="error" sx={{ fontFamily: "var(--font-cairo)", mb: 1 }}>{loadError}</Typography>
            <Button variant="outlined" size="small" onClick={() => loadData()} sx={{ fontFamily: "var(--font-cairo)" }}>إعادة المحاولة</Button>
          </Box>
        )}
        {!loading && !loadError && vaults.length === 0 && (
          <EmptyState
            title="لا توجد حسابات"
            subtitle="اختر شخصي أو بنك ثم الاسم والمستخدم"
          />
        )}
        {!loading && !loadError &&
          vaults.map((v) => (
            <RecordCard
              key={v.id}
              title={v.name}
              subtitle={`${v.type === "personal" ? "شخصي" : "بنك"} • ${getUserName(v.assignedToUserId)}`}
              meta={
                <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap", alignItems: "center" }}>
                  <Typography variant="body2" fontWeight={600} sx={{ fontFamily: "var(--font-cairo)", color: "primary.main" }}>
                    الرصيد: {(balances[v.id] ?? 0).toLocaleString("en-US")} ج.م
                  </Typography>
                  {v.type === "bank" && v.bankName && (
                    <Chip label={v.bankName} size="small" sx={{ height: 22, fontSize: "0.75rem" }} />
                  )}
                  {!v.active && (
                    <Chip label="معطّل" size="small" sx={{ height: 22, fontSize: "0.75rem", bgcolor: "grey.200" }} />
                  )}
                </Box>
              }
              action={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); setHistoryVault(v); setHistoryTypeFilter(""); setHistoryDateFrom(""); setHistoryDateTo(""); }}
                    title="سجل الحركة"
                    sx={{ bgcolor: "grey.100", "&:hover": { bgcolor: "grey.200" } }}
                  >
                    <HistoryIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEditVault(v); }} sx={{ bgcolor: "grey.100", "&:hover": { bgcolor: "grey.200" } }}>
                    <EditIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              }
            />
          ))}
      </RecordList>

      <Dialog
        open={vaultDialogOpen}
        onClose={() => { setVaultDialogOpen(false); setSaveError(null); }}
        dir="rtl"
        PaperProps={{ sx: { borderRadius: 2, direction: "rtl", textAlign: "right", maxHeight: "90vh" } }}
        TransitionProps={{ onEntered: () => setTimeout(() => vaultDialogFirstRef.current?.focus(), 0) }}
      >
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>{editingVault ? "تعديل حساب" : "إضافة حساب"}</DialogTitle>
        <DialogContent sx={{ textAlign: "right" }}>
          <Box dir="rtl" sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <div ref={vaultDialogFirstRef} tabIndex={-1} style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none", overflow: "hidden" }} />
            {saveError && (
              <Typography variant="body2" color="error" sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>{saveError}</Typography>
            )}
            <MobileFriendlySelect
              label="النوع"
              options={[
                { value: "personal", label: "شخصي" },
                { value: "bank", label: "بنك" },
              ]}
              value={vaultForm.type}
              onChange={(v) => setVaultForm((f) => ({ ...f, type: v as VaultType }))}
              fullWidth
              size="small"
              sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}
            />
            <TextField
              label="الاسم"
              value={vaultForm.name}
              onChange={(e) => setVaultForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              required
              inputProps={{ dir: "rtl" }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
            />
            <MobileFriendlySelect
              label="المستخدم"
              options={users.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name }))}
              value={vaultForm.assignedToUserId}
              onChange={(v) => setVaultForm((f) => ({ ...f, assignedToUserId: v }))}
              fullWidth
              size="small"
              placeholder="اختر المستخدم"
              displayEmpty
              searchable
              sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}
            />
            {vaultForm.type === "bank" && (
              <>
                <TextField
                  label="اسم البنك"
                  value={vaultForm.bankName}
                  onChange={(e) => setVaultForm((f) => ({ ...f, bankName: e.target.value }))}
                  fullWidth
                  inputProps={{ dir: "rtl" }}
                  InputLabelProps={{ style: { textAlign: "right" } }}
                  sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
                />
                <TextField
                  label="رقم الحساب"
                  value={vaultForm.accountNumber}
                  onChange={(e) => setVaultForm((f) => ({ ...f, accountNumber: e.target.value }))}
                  fullWidth
                  inputProps={{ dir: "rtl" }}
                  InputLabelProps={{ style: { textAlign: "right" } }}
                  sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
                />
                <TextField
                  label="الفرع"
                  value={vaultForm.branchName}
                  onChange={(e) => setVaultForm((f) => ({ ...f, branchName: e.target.value }))}
                  fullWidth
                  inputProps={{ dir: "rtl" }}
                  InputLabelProps={{ style: { textAlign: "right" } }}
                  sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
                />
              </>
            )}
            <TextField
              label="الرصيد الافتتاحي (ج.م)"
              type="number"
              value={vaultForm.openingBalance === 0 ? "" : vaultForm.openingBalance}
              onChange={(e) => setVaultForm((f) => ({ ...f, openingBalance: parseFloat(e.target.value) || 0 }))}
              fullWidth
              size="small"
              inputProps={{ min: 0, step: 0.01, inputMode: "decimal", dir: "rtl" }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
              helperText="المبلغ الأولي للحساب (يمكن تغييره لاحقاً)"
            />
            <TextField
              label="ملاحظات"
              value={vaultForm.notes}
              onChange={(e) => setVaultForm((f) => ({ ...f, notes: e.target.value }))}
              fullWidth
              multiline
              rows={2}
              inputProps={{ dir: "rtl" }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
            />
            <FormControlLabel
              control={<Switch checked={vaultForm.active} onChange={(e) => setVaultForm((f) => ({ ...f, active: e.target.checked }))} />}
              label="مفعّل"
              sx={{ "& .MuiFormControlLabel-label": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ direction: "rtl", justifyContent: "flex-start" }}>
          <Button onClick={() => setVaultDialogOpen(false)} sx={{ fontFamily: "var(--font-cairo)" }}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSaveVault}
            disabled={!vaultForm.name.trim() || !vaultForm.assignedToUserId}
            sx={{ fontFamily: "var(--font-cairo)" }}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={transferDialogOpen}
        onClose={() => !transferSaving && setTransferDialogOpen(false)}
        dir="rtl"
        PaperProps={{ sx: { borderRadius: 2, direction: "rtl", textAlign: "right" } }}
        TransitionProps={{ onEntered: () => setTimeout(() => transferDialogFirstRef.current?.focus(), 0) }}
      >
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>تحويل بين الحسابات</DialogTitle>
        <DialogContent sx={{ textAlign: "right" }}>
          <Box dir="rtl" sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1, minWidth: 280 }}>
            <div ref={transferDialogFirstRef} tabIndex={-1} style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none", overflow: "hidden" }} />
            <MobileFriendlySelect
              label="من حساب"
              options={vaults.filter((v) => v.active).map((v) => ({ value: v.id, label: `${v.name} — ${(balances[v.id] ?? 0).toLocaleString("en-US")} ج.م` }))}
              value={transferForm.fromVaultId}
              onChange={(v) => setTransferForm((f) => ({ ...f, fromVaultId: v }))}
              fullWidth
              size="small"
              searchable
              sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}
            />
            <MobileFriendlySelect
              label="إلى حساب"
              options={vaults.filter((v) => v.active && v.id !== transferForm.fromVaultId).map((v) => ({ value: v.id, label: v.name }))}
              value={transferForm.toVaultId}
              onChange={(v) => setTransferForm((f) => ({ ...f, toVaultId: v }))}
              fullWidth
              size="small"
              searchable
              sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}
            />
            <TextField
              label="المبلغ (ج.م)"
              type="number"
              value={transferForm.amount === 0 ? "" : transferForm.amount}
              onChange={(e) => setTransferForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
              fullWidth
              size="small"
              required
              inputProps={{ min: 0, step: 0.01, inputMode: "decimal", dir: "rtl" }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
              error={transferForm.amount > 0 && (balances[transferForm.fromVaultId] ?? 0) < transferForm.amount}
              helperText={transferForm.amount > 0 && (balances[transferForm.fromVaultId] ?? 0) < transferForm.amount ? "الرصيد غير كافٍ" : undefined}
            />
            <TextField
              label="ملاحظات"
              value={transferForm.notes}
              onChange={(e) => setTransferForm((f) => ({ ...f, notes: e.target.value }))}
              fullWidth
              size="small"
              inputProps={{ dir: "rtl" }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ direction: "rtl", justifyContent: "flex-start" }}>
          <Button onClick={() => !transferSaving && setTransferDialogOpen(false)} disabled={transferSaving} sx={{ fontFamily: "var(--font-cairo)" }}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleTransfer}
            disabled={
              !transferForm.fromVaultId ||
              !transferForm.toVaultId ||
              transferForm.fromVaultId === transferForm.toVaultId ||
              transferForm.amount <= 0 ||
              (balances[transferForm.fromVaultId] ?? 0) < transferForm.amount ||
              transferSaving
            }
            sx={{ fontFamily: "var(--font-cairo)" }}
          >
            تنفيذ التحويل
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
        dir="rtl"
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2, direction: "rtl", textAlign: "right", maxHeight: isMobile ? "100%" : "90vh" } }}
      >
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>
          التقرير المالي — ملخص الحسابات
        </DialogTitle>
        <DialogContent sx={{ overflow: "auto", px: isMobile ? 1.5 : 3, pb: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2, p: 2, borderRadius: 2, bgcolor: "grey.50", border: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ fontFamily: "var(--font-cairo)", mb: 0.5 }}>ملخص التقرير المالي</Typography>
            <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)" }}>إجمالي النقدية في الحسابات: <strong>{totalBalance.toLocaleString("en-US")} ج.م</strong></Typography>
            <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", color: "error.main" }}>مستحقات الدفع (مطلوب سداده): <strong>{pendingPay.toLocaleString("en-US")} ج.م</strong></Typography>
            <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", color: "success.main" }}>مستحقات التحصيل: <strong>{pendingCollect.toLocaleString("en-US")} ج.م</strong></Typography>
            <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)" }}>قيمة مخزون المنتجات: <strong>{warehouseValue.toLocaleString("en-US")} ج.م</strong></Typography>
            <Typography variant="body1" fontWeight={700} sx={{ fontFamily: "var(--font-cairo)", color: "primary.main", pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
              الرقم النهائي (صافي المركز): {reportFinalNumber.toLocaleString("en-US")} ج.م
            </Typography>
          </Box>
          <Typography variant="subtitle2" fontWeight={600} sx={{ fontFamily: "var(--font-cairo)", mb: 1 }}>تفصيل الحسابات</Typography>
          {isMobile ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {reportRows.map(({ vault, opening, totalIn, totalOut, balance }) => (
                <Box
                  key={vault.id}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "grey.50",
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={600} sx={{ fontFamily: "var(--font-cairo)", mb: 1 }}>{vault.name}</Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)" }}>الرصيد الافتتاحي: {opening.toLocaleString("en-US")} ج.م</Typography>
                    <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", color: "success.main" }}>إجمالي الإيداع: {totalIn.toLocaleString("en-US")} ج.م</Typography>
                    <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", color: "error.main" }}>إجمالي الصرف: {totalOut.toLocaleString("en-US")} ج.م</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ fontFamily: "var(--font-cairo)" }}>الرصيد الحالي: {balance.toLocaleString("en-US")} ج.م</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Table size="small" sx={{ "& td, & th": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>الحساب</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>الرصيد الافتتاحي</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>إجمالي الإيداع</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>إجمالي الصرف</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>الرصيد الحالي</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportRows.map(({ vault, opening, totalIn, totalOut, balance }) => (
                  <TableRow key={vault.id}>
                    <TableCell>{vault.name}</TableCell>
                    <TableCell>{opening.toLocaleString("en-US")} ج.م</TableCell>
                    <TableCell sx={{ color: "success.main" }}>{totalIn.toLocaleString("en-US")} ج.م</TableCell>
                    <TableCell sx={{ color: "error.main" }}>{totalOut.toLocaleString("en-US")} ج.م</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{balance.toLocaleString("en-US")} ج.م</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions sx={{ direction: "rtl", justifyContent: "flex-start", px: isMobile ? 2 : 3, pb: 2 }}>
          <Button onClick={() => setReportDialogOpen(false)} sx={{ fontFamily: "var(--font-cairo)" }}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!historyVault}
        onClose={() => setHistoryVault(null)}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
        dir="rtl"
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2, direction: "rtl", textAlign: "right", maxHeight: isMobile ? "100%" : "90vh" } }}
      >
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", fontSize: isMobile ? "1rem" : undefined }}>
          حركة الحساب — {historyVault?.name}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, px: isMobile ? 1.5 : 3, overflow: "hidden" }}>
          <Box sx={{ display: "flex", flexDirection: isMobile ? "column" : "row", flexWrap: "wrap", gap: 1.5, alignItems: "center", flexShrink: 0 }}>
            <Select
              size="small"
              value={historyTypeFilter}
              onChange={(e) => setHistoryTypeFilter(e.target.value as VaultTransactionType | "")}
              displayEmpty
              fullWidth={isMobile}
              sx={{ minWidth: isMobile ? undefined : 140, fontFamily: "var(--font-cairo)", textAlign: "right" }}
              MenuProps={{ PaperProps: { sx: { direction: "rtl" } } }}
            >
              <MenuItem value="">كل الأنواع</MenuItem>
              {(Object.keys(TRANSACTION_TYPE_LABEL) as VaultTransactionType[]).map((t) => (
                <MenuItem key={t} value={t}>{TRANSACTION_TYPE_LABEL[t]}</MenuItem>
              ))}
            </Select>
            <TextField
              size="small"
              label="من تاريخ"
              type="date"
              value={historyDateFrom}
              onChange={(e) => setHistoryDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true, style: { textAlign: "right" } }}
              sx={{ width: isMobile ? "100%" : 140, "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)" } }}
            />
            <TextField
              size="small"
              label="إلى تاريخ"
              type="date"
              value={historyDateTo}
              onChange={(e) => setHistoryDateTo(e.target.value)}
              InputLabelProps={{ shrink: true, style: { textAlign: "right" } }}
              sx={{ width: isMobile ? "100%" : 140, "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)" } }}
            />
          </Box>
          <List dense sx={{ overflow: "auto", flex: 1, minHeight: 0, maxHeight: isMobile ? undefined : 360, border: "1px solid", borderColor: "divider", borderRadius: 1, py: 0 }}>
            {historyVault && (() => {
              let list = getVaultTransactions(historyVault.id);
              if (historyTypeFilter) list = list.filter((t) => t.type === historyTypeFilter);
              if (historyDateFrom) {
                const from = new Date(historyDateFrom).getTime();
                list = list.filter((t) => t.date >= from);
              }
              if (historyDateTo) {
                const to = new Date(historyDateTo).setHours(23, 59, 59, 999);
                list = list.filter((t) => t.date <= to);
              }
              if (list.length === 0) {
                return (
                  <ListItem>
                    <ListItemText primary="لا توجد حركات" primaryTypographyProps={{ sx: { fontFamily: "var(--font-cairo)", textAlign: "right" } }} />
                  </ListItem>
                );
              }
              return list.map((t) => (
                <ListItem key={t.id} sx={{ borderBottom: "1px solid", borderColor: "grey.200", flexDirection: "column", alignItems: "stretch", py: 1.5, px: isMobile ? 1.5 : 2 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 0.5 }}>
                        <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", flex: 1, minWidth: 0 }}>
                          {formatDateTime(t.date)} — {TRANSACTION_TYPE_LABEL[t.type]}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontFamily: "var(--font-cairo)", color: t.amount >= 0 ? "success.main" : "error.main", flexShrink: 0 }}>
                          {t.amount >= 0 ? "+" : ""}{t.amount.toLocaleString("en-US")} ج.م
                        </Typography>
                      </Box>
                    }
                    secondary={t.description + (t.ref ? ` — ${t.ref}` : "")}
                    secondaryTypographyProps={{ sx: { fontFamily: "var(--font-cairo)", textAlign: "right", fontSize: isMobile ? "0.8rem" : undefined } }}
                  />
                </ListItem>
              ));
            })()}
          </List>
        </DialogContent>
        <DialogActions sx={{ direction: "rtl", justifyContent: "flex-start", px: isMobile ? 2 : 3, pb: 2 }}>
          <Button onClick={() => setHistoryVault(null)} sx={{ fontFamily: "var(--font-cairo)" }}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </NAdminShell>
  );
}
