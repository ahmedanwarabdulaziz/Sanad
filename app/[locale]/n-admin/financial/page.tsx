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
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import NAdminShell from "../components/NAdminShell";
import { RecordList, RecordCard, PageHeader, EmptyState } from "../components";
import { getAllUsers } from "@/databases/sales-operations/collections/users";
import { getAllVaults, createVault, updateVault } from "@/databases/sales-operations/collections/vaults";
import { getAllVaultTransfers, createVaultTransfer, computeBalancesByVault } from "@/databases/sales-operations/collections/vault_transfers";
import { getAllPurchaseInvoices } from "@/databases/sales-operations/collections/purchase_invoices";
import { getAllSalesInvoices } from "@/databases/sales-operations/collections/sales_invoices";
import { getAllExpenses } from "@/databases/sales-operations/collections/expenses";
import type { SalesUser } from "@/databases/sales-operations/types";
import type { Vault, VaultType } from "@/databases/sales-operations/types";

export default function FinancialPage() {
  const [user, setUser] = useState<SalesUser | null>(null);
  const [users, setUsers] = useState<SalesUser[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [transfers, setTransfers] = useState<Awaited<ReturnType<typeof getAllVaultTransfers>>>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [vaultDialogOpen, setVaultDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [editingVault, setEditingVault] = useState<Vault | null>(null);
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
    ])
      .then(([vList, tList, purchaseInvoices, salesInvoices, expenses]) => {
        setVaults(vList);
        setTransfers(tList);
        const balances = computeBalancesByVault(vList, tList);
        for (const inv of purchaseInvoices) {
          const amount = inv.amountPaid ?? 0;
          const vaultId = inv.paidFromVaultId?.trim();
          if (amount > 0 && vaultId && balances[vaultId] !== undefined) {
            balances[vaultId] -= amount;
          }
        }
        for (const inv of salesInvoices) {
          const amount = inv.amountPaid ?? 0;
          const vaultId = inv.paidToVaultId?.trim();
          if (amount > 0 && vaultId && balances[vaultId] !== undefined) {
            balances[vaultId] += amount;
          }
        }
        for (const exp of expenses) {
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

  if (!user) return null;

  return (
    <NAdminShell>
      <PageHeader
        title="المالية والحسابات"
        action={
          <Box sx={{ display: "flex", gap: 1 }}>
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
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEditVault(v); }} sx={{ bgcolor: "grey.100", "&:hover": { bgcolor: "grey.200" } }}>
                  <EditIcon sx={{ fontSize: 18 }} />
                </IconButton>
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
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", textAlign: "right" }}>النوع</Typography>
              <Select
                value={vaultForm.type}
                onChange={(e) => setVaultForm((f) => ({ ...f, type: e.target.value as VaultType }))}
                fullWidth
                size="small"
                sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", "& .MuiSelect-select": { textAlign: "right" } }}
                MenuProps={{ PaperProps: { sx: { direction: "rtl" } } }}
              >
                <MenuItem value="personal">شخصي</MenuItem>
                <MenuItem value="bank">بنك</MenuItem>
              </Select>
            </Box>
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
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", textAlign: "right" }}>المستخدم</Typography>
              <Select
                value={vaultForm.assignedToUserId}
                onChange={(e) => setVaultForm((f) => ({ ...f, assignedToUserId: e.target.value }))}
                fullWidth
                size="small"
                displayEmpty
                sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", "& .MuiSelect-select": { textAlign: "right" } }}
                MenuProps={{ PaperProps: { sx: { direction: "rtl" } } }}
              >
                <MenuItem value="">اختر المستخدم</MenuItem>
                {users.filter((u) => u.active).map((u) => (
                  <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                ))}
              </Select>
            </Box>
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
              inputProps={{ min: 0, step: 0.01, dir: "rtl" }}
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
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", textAlign: "right" }}>من حساب</Typography>
              <Select
                value={transferForm.fromVaultId}
                onChange={(e) => setTransferForm((f) => ({ ...f, fromVaultId: e.target.value }))}
                fullWidth
                size="small"
                sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", "& .MuiSelect-select": { textAlign: "right" } }}
                MenuProps={{ PaperProps: { sx: { direction: "rtl" } } }}
              >
                {vaults.filter((v) => v.active).map((v) => (
                  <MenuItem key={v.id} value={v.id}>{v.name} — {(balances[v.id] ?? 0).toLocaleString("en-US")} ج.م</MenuItem>
                ))}
              </Select>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", textAlign: "right" }}>إلى حساب</Typography>
              <Select
                value={transferForm.toVaultId}
                onChange={(e) => setTransferForm((f) => ({ ...f, toVaultId: e.target.value }))}
                fullWidth
                size="small"
                sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", "& .MuiSelect-select": { textAlign: "right" } }}
                MenuProps={{ PaperProps: { sx: { direction: "rtl" } } }}
              >
                {vaults.filter((v) => v.active && v.id !== transferForm.fromVaultId).map((v) => (
                  <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
                ))}
              </Select>
            </Box>
            <TextField
              label="المبلغ (ج.م)"
              type="number"
              value={transferForm.amount === 0 ? "" : transferForm.amount}
              onChange={(e) => setTransferForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
              fullWidth
              size="small"
              required
              inputProps={{ min: 0.01, step: 0.01, dir: "rtl" }}
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
    </NAdminShell>
  );
}
