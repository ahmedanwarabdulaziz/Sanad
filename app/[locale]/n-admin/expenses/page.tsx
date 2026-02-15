"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import NAdminShell from "../components/NAdminShell";
import { RecordList, RecordCard, PageHeader, EmptyState } from "../components";
import { getAllExpenses, createExpense, updateExpense } from "@/databases/sales-operations/collections/expenses";
import { getActiveExpenseTypes } from "@/databases/sales-operations/collections/expense_types";
import { getAllPurchaseInvoices } from "@/databases/sales-operations/collections/purchase_invoices";
import { getAllSalesInvoices } from "@/databases/sales-operations/collections/sales_invoices";
import { getAllVaults, getVaultsByUser } from "@/databases/sales-operations/collections/vaults";
import type { SalesUser } from "@/databases/sales-operations/types";
import type { Vault } from "@/databases/sales-operations/types";
import type { Expense, ExpensePayment, ExpenseRelatedTo, ExpenseScope, ExpensePaymentStatus } from "@/databases/sales-operations/types";

const relatedToLabel: Record<ExpenseRelatedTo, string> = { buy: "شراء", sell: "بيع" };
const scopeLabel: Record<ExpenseScope, string> = { general: "عام", invoice: "مرتبط بفاتورة" };
const paymentStatusLabel: Record<ExpensePaymentStatus, string> = {
  paid: "مدفوع",
  partial: "جزئي",
  not_paid: "غير مدفوع",
};

export default function ExpensesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [user, setUser] = useState<SalesUser | null>(null);
  const [items, setItems] = useState<Expense[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<{ id: string; nameAr: string }[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<{ id: string; invoiceNumber?: string; supplierName: string }[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<{ id: string; invoiceNumber?: string; customerName: string }[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addPaymentExpense, setAddPaymentExpense] = useState<Expense | null>(null);
  const [addPaymentAmount, setAddPaymentAmount] = useState(0);
  const [addPaymentVaultId, setAddPaymentVaultId] = useState("");
  const [addPaymentSaving, setAddPaymentSaving] = useState(false);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<ExpensePaymentStatus | "">("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [form, setForm] = useState({
    expenseTypeId: "",
    amount: 0,
    notes: "",
    paymentStatus: "not_paid" as ExpensePaymentStatus,
    amountPaid: 0,
    paidFromVaultId: "",
    relatedTo: "sell" as ExpenseRelatedTo,
    scope: "general" as ExpenseScope,
    purchaseInvoiceId: "",
    salesInvoiceId: "",
  });

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
        u.pageAccess?.some((a: { pageId: string }) => a.pageId === "expenses");
      if (!canAccess) {
        window.location.href = "/n-admin/dashboard";
        return;
      }
    } catch {
      window.location.href = "/n-admin";
      return;
    }
    loadData();
    getActiveExpenseTypes().then((list) => setExpenseTypes(list.map((e) => ({ id: e.id, nameAr: e.nameAr })))).catch(() => setExpenseTypes([]));
    getAllPurchaseInvoices().then((list) => setPurchaseInvoices(list.map((i) => ({ id: i.id, invoiceNumber: i.invoiceNumber, supplierName: i.supplierName })))).catch(() => setPurchaseInvoices([]));
    getAllSalesInvoices().then((list) => setSalesInvoices(list.map((i) => ({ id: i.id, invoiceNumber: i.invoiceNumber, customerName: i.customerName })))).catch(() => setSalesInvoices([]));
    const loadVaults = () => {
      try {
        const u = JSON.parse(sessionStorage.getItem("n_admin_user") ?? "null");
        if (u?.role === "super_admin" || u?.role === "admin")
          getAllVaults().then((list) => setVaults(list.filter((v) => v.active))).catch(() => setVaults([]));
        else if (u?.id)
          getVaultsByUser(u.id).then(setVaults).catch(() => setVaults([]));
        else setVaults([]);
      } catch {
        setVaults([]);
      }
    };
    loadVaults();
  }, []);

  const loadData = () => {
    setLoading(true);
    getAllExpenses()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  const openAdd = () => {
    setForm({
      expenseTypeId: expenseTypes[0]?.id ?? "",
      amount: 0,
      notes: "",
      paymentStatus: "not_paid",
      amountPaid: 0,
      paidFromVaultId: "",
      relatedTo: "sell",
      scope: "general",
      purchaseInvoiceId: "",
      salesInvoiceId: "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.expenseTypeId || form.amount <= 0) return;
    if (form.scope === "invoice") {
      if (form.relatedTo === "buy" && !form.purchaseInvoiceId) return;
      if (form.relatedTo === "sell" && !form.salesInvoiceId) return;
    }
    if (form.paymentStatus === "partial") {
      if (form.amountPaid <= 0 || form.amountPaid > form.amount) return;
    }
    if ((form.paymentStatus === "paid" || form.paymentStatus === "partial") && !form.paidFromVaultId?.trim()) return;
    setSaving(true);
    try {
      const amountPaid =
        form.paymentStatus === "paid"
          ? form.amount
          : form.paymentStatus === "partial"
            ? form.amountPaid
            : undefined;
      const paidFromVaultId = form.paymentStatus === "paid" || form.paymentStatus === "partial" ? form.paidFromVaultId?.trim() : undefined;
      const payments: ExpensePayment[] | undefined =
        amountPaid && paidFromVaultId ? [{ vaultId: paidFromVaultId, amount: amountPaid }] : undefined;
      await createExpense({
        expenseTypeId: form.expenseTypeId,
        amount: form.amount,
        notes: form.notes.trim() || undefined,
        paymentStatus: form.paymentStatus,
        amountPaid,
        paidFromVaultId,
        payments,
        relatedTo: form.relatedTo,
        scope: form.scope,
        purchaseInvoiceId: form.scope === "invoice" && form.relatedTo === "buy" ? form.purchaseInvoiceId : undefined,
        salesInvoiceId: form.scope === "invoice" && form.relatedTo === "sell" ? form.salesInvoiceId : undefined,
        createdBy: user?.id,
      });
      setDialogOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPayment = async () => {
    if (!addPaymentExpense || addPaymentAmount <= 0 || !addPaymentVaultId?.trim()) return;
    const paid = addPaymentExpense.amountPaid ?? 0;
    const remaining = Math.max(0, addPaymentExpense.amount - paid);
    const amount = Math.min(addPaymentAmount, remaining);
    if (amount <= 0) return;
    setAddPaymentSaving(true);
    try {
      const entries = getPaymentEntries(addPaymentExpense);
      const newPayments: ExpensePayment[] = [...entries, { vaultId: addPaymentVaultId.trim(), amount }];
      const newAmountPaid = newPayments.reduce((s, p) => s + p.amount, 0);
      const paymentStatus: ExpensePaymentStatus = newAmountPaid >= addPaymentExpense.amount ? "paid" : "partial";
      await updateExpense(addPaymentExpense.id, {
        payments: newPayments,
        amountPaid: newAmountPaid,
        paidFromVaultId: addPaymentVaultId.trim(),
        paymentStatus,
      });
      setAddPaymentExpense(null);
      setAddPaymentAmount(0);
      setAddPaymentVaultId("");
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setAddPaymentSaving(false);
    }
  };

  /** Normalize to payments array: use payments if present, else legacy paidFromVaultId + amountPaid */
  const getPaymentEntries = (exp: Expense): ExpensePayment[] => {
    if (exp.payments?.length) return exp.payments;
    const amt = exp.amountPaid ?? 0;
    const vId = exp.paidFromVaultId?.trim();
    return amt > 0 && vId ? [{ vaultId: vId, amount: amt }] : [];
  };

  /** Group payments by vault and sum amounts for display */
  const getPaymentsByVault = (entries: ExpensePayment[]): ExpensePayment[] => {
    const byVault = new Map<string, number>();
    for (const p of entries) {
      byVault.set(p.vaultId, (byVault.get(p.vaultId) ?? 0) + p.amount);
    }
    return Array.from(byVault.entries()).map(([vaultId, amount]) => ({ vaultId, amount }));
  };

  const getExpenseTypeName = (id: string) => expenseTypes.find((e) => e.id === id)?.nameAr ?? id;
  const getPurchaseInvoiceLabel = (id: string) => {
    const inv = purchaseInvoices.find((i) => i.id === id);
    return inv ? `${inv.invoiceNumber ?? inv.id} — ${inv.supplierName}` : id;
  };
  const getSalesInvoiceLabel = (id: string) => {
    const inv = salesInvoices.find((i) => i.id === id);
    return inv ? `${inv.invoiceNumber ?? inv.id} — ${inv.customerName}` : id;
  };

  const getExpenseInvoiceCaption = (item: Expense): string | null => {
    if (item.scope !== "invoice") return null;
    if (item.salesInvoiceId) {
      const inv = salesInvoices.find((i) => i.id === item.salesInvoiceId);
      return inv ? `فاتورة ${inv.invoiceNumber ?? inv.id} — العميل: ${inv.customerName}` : null;
    }
    if (item.purchaseInvoiceId) {
      const inv = purchaseInvoices.find((i) => i.id === item.purchaseInvoiceId);
      return inv ? `فاتورة ${inv.invoiceNumber ?? inv.id} — المورد: ${inv.supplierName}` : null;
    }
    return null;
  };

  const getExpenseInvoiceNumber = (item: Expense): string => {
    if (item.salesInvoiceId) {
      const inv = salesInvoices.find((i) => i.id === item.salesInvoiceId);
      return inv ? (inv.invoiceNumber ?? inv.id) : "";
    }
    if (item.purchaseInvoiceId) {
      const inv = purchaseInvoices.find((i) => i.id === item.purchaseInvoiceId);
      return inv ? (inv.invoiceNumber ?? inv.id) : "";
    }
    return "";
  };

  const filteredItems = items.filter((item) => {
    const status = item.paymentStatus ?? "not_paid";
    if (paymentStatusFilter && status !== paymentStatusFilter) return false;
    const q = invoiceSearch.trim().toLowerCase();
    if (q) {
      const invNum = getExpenseInvoiceNumber(item).toLowerCase();
      if (!invNum || !invNum.includes(q)) return false;
    }
    return true;
  });

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "numeric", year: "numeric" });

  if (!user) return null;

  return (
    <NAdminShell>
      <PageHeader
        title="المصروفات"
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openAdd}
            size="small"
            fullWidth={isMobile}
            sx={{ fontFamily: "var(--font-cairo)" }}
          >
            إضافة مصروف
          </Button>
        }
      />

      <Box sx={{ display: "flex", flexWrap: "nowrap", gap: 1.5, mb: 2, flexDirection: "row-reverse", alignItems: "center" }}>
        <TextField
          placeholder="بحث برقم الفاتورة"
          size="small"
          value={invoiceSearch}
          onChange={(e) => setInvoiceSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            dir: "rtl",
            sx: { fontFamily: "var(--font-cairo)" },
          }}
          sx={{ flex: 1, minWidth: 0 }}
        />
        <Select
          size="small"
          value={paymentStatusFilter}
          onChange={(e) => setPaymentStatusFilter(e.target.value as ExpensePaymentStatus | "")}
          displayEmpty
          sx={{ flexShrink: 0, minWidth: 140, fontFamily: "var(--font-cairo)", textAlign: "right", "& .MuiSelect-select": { textAlign: "right" } }}
          MenuProps={{ PaperProps: { sx: { direction: "rtl" } } }}
        >
          <MenuItem value="">كل الحالات</MenuItem>
          <MenuItem value="paid">{paymentStatusLabel.paid}</MenuItem>
          <MenuItem value="partial">{paymentStatusLabel.partial}</MenuItem>
          <MenuItem value="not_paid">{paymentStatusLabel.not_paid}</MenuItem>
        </Select>
      </Box>

      <RecordList loading={loading}>
        {!loading && items.length === 0 && (
          <EmptyState title="لا توجد مصروفات" subtitle="سجّل مصروفات عامة أو مرتبطة بفاتورة شراء/بيع" />
        )}
        {!loading && filteredItems.length === 0 && items.length > 0 && (
          <EmptyState title="لا توجد نتائج" subtitle="غيّر الفلتر أو رقم الفاتورة للبحث" />
        )}
        {!loading &&
          filteredItems.map((item) => {
            const status = item.paymentStatus ?? "not_paid";
            const notFullyPaid = status === "not_paid" || status === "partial";
            const paid = item.amountPaid ?? 0;
            const remaining = Math.max(0, item.amount - paid);
            const invoiceCaption = getExpenseInvoiceCaption(item);
            return (
              <RecordCard
                key={item.id}
                title={getExpenseTypeName(item.expenseTypeId)}
                subtitle={
                  isMobile
                    ? `${item.amount.toLocaleString("en-US")} ج.م • ${paymentStatusLabel[status]} • ${relatedToLabel[item.relatedTo]} • ${scopeLabel[item.scope]}`
                    : `${item.amount.toLocaleString("en-US")} ج.م • ${paymentStatusLabel[status]} • ${relatedToLabel[item.relatedTo]} • ${scopeLabel[item.scope]}${item.scope === "invoice" && (item.purchaseInvoiceId || item.salesInvoiceId) ? ` — ${item.purchaseInvoiceId ? getPurchaseInvoiceLabel(item.purchaseInvoiceId) : getSalesInvoiceLabel(item.salesInvoiceId!)}` : ""}`
                }
                meta={
                  <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap", alignItems: "center" }}>
                    {notFullyPaid && (
                      <Chip
                        size="small"
                        label={status === "partial" ? `جزئي — متبقي: ${remaining.toLocaleString("en-US")} ج.م` : "غير مكتمل"}
                        color="warning"
                        variant="outlined"
                        sx={{ fontFamily: "var(--font-cairo)" }}
                      />
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "var(--font-cairo)" }}>
                      {formatDate(item.createdAt)}
                    </Typography>
                    {invoiceCaption && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "var(--font-cairo)", fontSize: "0.7rem" }}>
                        • {invoiceCaption}
                      </Typography>
                    )}
                    {getPaymentsByVault(getPaymentEntries(item)).length > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "var(--font-cairo)" }}>
                        • مدفوع: {getPaymentsByVault(getPaymentEntries(item)).map((p) => `${p.amount.toLocaleString("en-US")} ج.م من ${vaults.find((v) => v.id === p.vaultId)?.name ?? p.vaultId}`).join("، ")}
                      </Typography>
                    )}
                    {item.notes && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "var(--font-cairo)" }}>
                        • {item.notes}
                      </Typography>
                    )}
                  </Box>
                }
                action={
                  notFullyPaid ? (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddPaymentExpense(item);
                        setAddPaymentAmount(0);
                        setAddPaymentVaultId(getPaymentEntries(item).length > 0 ? getPaymentEntries(item)[getPaymentEntries(item).length - 1].vaultId : "");
                      }}
                      sx={{ fontFamily: "var(--font-cairo)" }}
                    >
                      إضافة دفعة
                    </Button>
                  ) : undefined
                }
              />
            );
          })}
      </RecordList>

      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        dir="rtl"
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 2,
            direction: "rtl",
            textAlign: "right",
            maxHeight: isMobile ? "100%" : "90vh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", flexShrink: 0 }}>إضافة مصروف</DialogTitle>
        <DialogContent sx={{ textAlign: "right", overflowY: "auto", flex: 1, minHeight: 0, px: isMobile ? 2 : 3 }}>
          <Box dir="rtl" sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1, pb: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", textAlign: "right" }}>نوع المصروف</Typography>
              <Select
                value={form.expenseTypeId}
                onChange={(e) => setForm((f) => ({ ...f, expenseTypeId: e.target.value }))}
                fullWidth
                size="small"
                displayEmpty
                sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", "& .MuiSelect-select": { textAlign: "right" } }}
                MenuProps={{ PaperProps: { sx: { direction: "rtl" } } }}
              >
                <MenuItem value="">اختر النوع</MenuItem>
                {expenseTypes.map((et) => (
                  <MenuItem key={et.id} value={et.id}>{et.nameAr}</MenuItem>
                ))}
              </Select>
            </Box>
            <TextField
              label="المبلغ (ج.م)"
              type="number"
              value={form.amount === 0 ? "" : form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
              fullWidth
              size="small"
              inputProps={{ min: 0, step: 0.01, dir: "rtl" }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
            />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", textAlign: "right" }}>حالة الدفع</Typography>
              <Select
                value={form.paymentStatus}
                onChange={(e) => setForm((f) => ({ ...f, paymentStatus: e.target.value as ExpensePaymentStatus }))}
                fullWidth
                size="small"
                sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", "& .MuiSelect-select": { textAlign: "right" } }}
                MenuProps={{ PaperProps: { sx: { direction: "rtl" } } }}
              >
                <MenuItem value="not_paid">{paymentStatusLabel.not_paid}</MenuItem>
                <MenuItem value="partial">{paymentStatusLabel.partial}</MenuItem>
                <MenuItem value="paid">{paymentStatusLabel.paid}</MenuItem>
              </Select>
            </Box>
            {form.paymentStatus === "partial" && (
              <TextField
                label="المبلغ المدفوع (ج.م)"
                type="number"
                value={form.amountPaid === 0 ? "" : form.amountPaid}
                onChange={(e) => setForm((f) => ({ ...f, amountPaid: parseFloat(e.target.value) || 0 }))}
                fullWidth
                size="small"
                required
                inputProps={{ min: 0, max: form.amount > 0 ? form.amount : undefined, step: 0.01, dir: "rtl" }}
                InputLabelProps={{ style: { textAlign: "right" } }}
                sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
                helperText={form.amount > 0 ? `الحد الأقصى: ${form.amount.toLocaleString("en-US")} ج.م` : undefined}
                error={form.amountPaid > form.amount}
              />
            )}
            {(form.paymentStatus === "paid" || form.paymentStatus === "partial") && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", textAlign: "right" }}>الدفع من حساب</Typography>
                <Select
                  value={form.paidFromVaultId}
                  onChange={(e) => setForm((f) => ({ ...f, paidFromVaultId: e.target.value }))}
                  fullWidth
                  size="small"
                  displayEmpty
                  sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", "& .MuiSelect-select": { textAlign: "right" } }}
                  MenuProps={{ PaperProps: { sx: { direction: "rtl" } } }}
                >
                  <MenuItem value="">اختر الحساب</MenuItem>
                  {vaults.map((v) => (
                    <MenuItem key={v.id} value={v.id}>{v.name} {v.type === "bank" ? "(بنك)" : "(شخصي)"}</MenuItem>
                  ))}
                </Select>
              </Box>
            )}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", textAlign: "right" }}>مرتبط بـ</Typography>
              <Select
                value={form.relatedTo}
                onChange={(e) => setForm((f) => ({ ...f, relatedTo: e.target.value as ExpenseRelatedTo, purchaseInvoiceId: "", salesInvoiceId: "" }))}
                fullWidth
                size="small"
                sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", "& .MuiSelect-select": { textAlign: "right" } }}
                MenuProps={{ PaperProps: { sx: { direction: "rtl" } } }}
              >
                <MenuItem value="buy">{relatedToLabel.buy}</MenuItem>
                <MenuItem value="sell">{relatedToLabel.sell}</MenuItem>
              </Select>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", textAlign: "right" }}>نطاق المصروف</Typography>
              <Select
                value={form.scope}
                onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as ExpenseScope, purchaseInvoiceId: "", salesInvoiceId: "" }))}
                fullWidth
                size="small"
                sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", "& .MuiSelect-select": { textAlign: "right" } }}
                MenuProps={{ PaperProps: { sx: { direction: "rtl" } } }}
              >
                <MenuItem value="general">{scopeLabel.general}</MenuItem>
                <MenuItem value="invoice">{scopeLabel.invoice}</MenuItem>
              </Select>
            </Box>
            {form.scope === "invoice" && form.relatedTo === "buy" && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", textAlign: "right" }}>فاتورة الشراء</Typography>
                <Select
                  value={form.purchaseInvoiceId}
                  onChange={(e) => setForm((f) => ({ ...f, purchaseInvoiceId: e.target.value }))}
                  fullWidth
                  size="small"
                  displayEmpty
                  sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", "& .MuiSelect-select": { textAlign: "right" } }}
                  MenuProps={{ PaperProps: { sx: { direction: "rtl" } } }}
                >
                  <MenuItem value="">اختر الفاتورة</MenuItem>
                  {purchaseInvoices.map((inv) => (
                    <MenuItem key={inv.id} value={inv.id}>{getPurchaseInvoiceLabel(inv.id)}</MenuItem>
                  ))}
                </Select>
              </Box>
            )}
            {form.scope === "invoice" && form.relatedTo === "sell" && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", textAlign: "right" }}>فاتورة المبيعات</Typography>
                <Select
                  value={form.salesInvoiceId}
                  onChange={(e) => setForm((f) => ({ ...f, salesInvoiceId: e.target.value }))}
                  fullWidth
                  size="small"
                  displayEmpty
                  sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", "& .MuiSelect-select": { textAlign: "right" } }}
                  MenuProps={{ PaperProps: { sx: { direction: "rtl" } } }}
                >
                  <MenuItem value="">اختر الفاتورة</MenuItem>
                  {salesInvoices.map((inv) => (
                    <MenuItem key={inv.id} value={inv.id}>{getSalesInvoiceLabel(inv.id)}</MenuItem>
                  ))}
                </Select>
              </Box>
            )}
            <TextField
              label="ملاحظات"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              fullWidth
              multiline
              rows={2}
              size="small"
              inputProps={{ dir: "rtl" }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ direction: "rtl", justifyContent: "flex-start", flexShrink: 0, px: isMobile ? 2 : 3, pb: 2 }}>
          <Button onClick={() => !saving && setDialogOpen(false)} sx={{ fontFamily: "var(--font-cairo)" }}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={
              saving ||
              !form.expenseTypeId ||
              form.amount <= 0 ||
              (form.scope === "invoice" && ((form.relatedTo === "buy" && !form.purchaseInvoiceId) || (form.relatedTo === "sell" && !form.salesInvoiceId))) ||
              (form.paymentStatus === "partial" && (form.amountPaid <= 0 || form.amountPaid > form.amount)) ||
              ((form.paymentStatus === "paid" || form.paymentStatus === "partial") && !form.paidFromVaultId?.trim())
            }
            sx={{ fontFamily: "var(--font-cairo)" }}
          >
            {saving ? "جاري الحفظ…" : "حفظ"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!addPaymentExpense}
        onClose={() => !addPaymentSaving && setAddPaymentExpense(null)}
        dir="rtl"
        fullWidth
        maxWidth="xs"
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 2,
            direction: "rtl",
            textAlign: "right",
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>إضافة دفعة</DialogTitle>
        <DialogContent sx={{ textAlign: "right" }}>
          {addPaymentExpense && (
            <Box dir="rtl" sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "var(--font-cairo)" }}>
                {getExpenseTypeName(addPaymentExpense.expenseTypeId)} — إجمالي {addPaymentExpense.amount.toLocaleString("en-US")} ج.م، مدفوع {(addPaymentExpense.amountPaid ?? 0).toLocaleString("en-US")} ج.م، متبقي {Math.max(0, addPaymentExpense.amount - (addPaymentExpense.amountPaid ?? 0)).toLocaleString("en-US")} ج.م
              </Typography>
              <TextField
                label="مبلغ الدفعة (ج.م)"
                type="number"
                value={addPaymentAmount === 0 ? "" : addPaymentAmount}
                onChange={(e) => setAddPaymentAmount(parseFloat(e.target.value) || 0)}
                fullWidth
                size="small"
                inputProps={{
                  min: 0,
                  max: Math.max(0, addPaymentExpense.amount - (addPaymentExpense.amountPaid ?? 0)),
                  step: 0.01,
                  dir: "rtl",
                }}
                InputLabelProps={{ style: { textAlign: "right" } }}
                sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
                helperText={`الحد الأقصى: ${Math.max(0, addPaymentExpense.amount - (addPaymentExpense.amountPaid ?? 0)).toLocaleString("en-US")} ج.م`}
              />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", textAlign: "right" }}>الدفع من حساب</Typography>
                <Select
                  value={addPaymentVaultId}
                  onChange={(e) => setAddPaymentVaultId(e.target.value)}
                  fullWidth
                  size="small"
                  displayEmpty
                  sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", "& .MuiSelect-select": { textAlign: "right" } }}
                  MenuProps={{ PaperProps: { sx: { direction: "rtl" } } }}
                >
                  <MenuItem value="">اختر الحساب</MenuItem>
                  {vaults.map((v) => (
                    <MenuItem key={v.id} value={v.id}>{v.name} {v.type === "bank" ? "(بنك)" : "(شخصي)"}</MenuItem>
                  ))}
                </Select>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ direction: "rtl", justifyContent: "flex-start", flexShrink: 0, px: isMobile ? 2 : 3, pb: 2 }}>
          <Button onClick={() => !addPaymentSaving && setAddPaymentExpense(null)} sx={{ fontFamily: "var(--font-cairo)" }}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleAddPayment}
            disabled={
              addPaymentSaving ||
              !addPaymentExpense ||
              addPaymentAmount <= 0 ||
              !addPaymentVaultId?.trim() ||
              (addPaymentExpense ? addPaymentAmount > Math.max(0, addPaymentExpense.amount - (addPaymentExpense.amountPaid ?? 0)) : false)
            }
            sx={{ fontFamily: "var(--font-cairo)" }}
          >
            {addPaymentSaving ? "جاري الحفظ…" : "تسجيل الدفعة"}
          </Button>
        </DialogActions>
      </Dialog>
    </NAdminShell>
  );
}
