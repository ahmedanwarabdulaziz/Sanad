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
  IconButton,
  MenuItem,
  Select,
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
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import InventoryIcon from "@mui/icons-material/Inventory";
import NAdminShell from "../components/NAdminShell";
import { RecordList, RecordCard, PageHeader, EmptyState } from "../components";
import { getAllSalesInvoices, createSalesInvoice, updateSalesInvoice, suggestNextSalesInvoiceNumber, isSalesInvoiceNumberDuplicate } from "@/databases/sales-operations/collections/sales_invoices";
import { getItemsBySalesInvoiceId, createSalesInvoiceItem, deleteItemsBySalesInvoiceId } from "@/databases/sales-operations/collections/sales_invoice_items";
import { getExpensesBySalesInvoiceId, createSalesInvoiceExpense, deleteExpensesBySalesInvoiceId } from "@/databases/sales-operations/collections/sales_invoice_expenses";
import { getActiveProducts } from "@/databases/sales-operations/collections/products";
import { getActiveCustomers, createCustomer, updateCustomer } from "@/databases/sales-operations/collections/customers";
import { getAllVaults, getVaultsByUser } from "@/databases/sales-operations/collections/vaults";
import { getActiveExpenseTypes } from "@/databases/sales-operations/collections/expense_types";
import { getStockByProduct, getAverageCostByProduct } from "@/databases/sales-operations/collections/stock_movements";
import { createStockMovement } from "@/databases/sales-operations/collections/stock_movements";
import type { SalesUser } from "@/databases/sales-operations/types";
import type { SalesInvoice, Product, ProductUnit, Customer, Vault } from "@/databases/sales-operations/types";

const unitLabel = (u: ProductUnit) => (u === "sqm" ? "م²" : "م.ط");

type LineRow = { productId: string; quantity: number; unit: ProductUnit; unitPrice: number; unitCost?: number };
type ExpenseRow = { expenseTypeId: string; amount: number };

export default function SalesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [user, setUser] = useState<SalesUser | null>(null);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<{ id: string; nameAr: string }[]>([]);
  const [stock, setStock] = useState<Record<string, { quantity: number; unit: ProductUnit }>>({});
  const [avgCost, setAvgCost] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SalesInvoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmLoadingId, setConfirmLoadingId] = useState<string | null>(null);
  const [header, setHeader] = useState({
    customerId: "",
    customerName: "",
    customerPhone: "",
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().slice(0, 10),
    notes: "",
    amountPaid: 0,
    paidToVaultId: "",
  });
  const [lines, setLines] = useState<LineRow[]>([]);
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);
  const [invoiceNumberError, setInvoiceNumberError] = useState<string | null>(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ nameAr: "", phone: "", notes: "" });
  const [addingCustomer, setAddingCustomer] = useState(false);

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
        u.pageAccess?.some((a: { pageId: string }) => a.pageId === "sales");
      if (!canAccess) {
        window.location.href = "/n-admin/dashboard";
        return;
      }
    } catch {
      window.location.href = "/n-admin";
      return;
    }
    loadData();
    getActiveProducts().then(setProducts).catch(() => setProducts([]));
    getActiveCustomers().then(setCustomers).catch(() => setCustomers([]));
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
    getActiveExpenseTypes().then((list) => setExpenseTypes(list.map((e) => ({ id: e.id, nameAr: e.nameAr })))).catch(() => setExpenseTypes([]));
    Promise.all([getStockByProduct(), getAverageCostByProduct()]).then(([st, cost]) => {
      setStock(st);
      const c: Record<string, number> = {};
      for (const [pid, v] of Object.entries(cost)) c[pid] = v.averageCost;
      setAvgCost(c);
    }).catch(() => {
      setStock({});
      setAvgCost({});
    });
  }, []);

  const loadData = () => {
    setLoading(true);
    getAllSalesInvoices()
      .then(setInvoices)
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  };

  const totalProducts = lines.reduce((s, r) => s + r.quantity * r.unitPrice, 0);
  const costOfGoods = lines.reduce((s, r) => s + r.quantity * (r.unitCost ?? avgCost[r.productId] ?? 0), 0);
  const otherExpenses = expenseRows.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = costOfGoods + otherExpenses;
  const totalAmount = totalProducts;

  const openAdd = () => {
    setEditing(null);
    setHeader({
      customerId: "",
      customerName: "",
      customerPhone: "",
      invoiceNumber: suggestNextSalesInvoiceNumber(invoices),
      invoiceDate: new Date().toISOString().slice(0, 10),
      notes: "",
      amountPaid: 0,
      paidToVaultId: "",
    });
    setLines([]);
    setExpenseRows([]);
    setInvoiceNumberError(null);
    setDialogOpen(true);
  };

  const openEdit = async (inv: SalesInvoice) => {
    setEditing(inv);
    const cust = customers.find((c) => c.id === inv.customerId);
    setHeader({
      customerId: inv.customerId ?? "",
      customerName: inv.customerName ?? cust?.nameAr ?? "",
      customerPhone: inv.customerPhone ?? cust?.phone ?? "",
      invoiceNumber: inv.invoiceNumber ?? "",
      invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      notes: inv.notes ?? "",
      amountPaid: inv.amountPaid ?? 0,
      paidToVaultId: inv.paidToVaultId ?? "",
    });
    setInvoiceNumberError(null);
    const [items, expenses] = await Promise.all([
      getItemsBySalesInvoiceId(inv.id),
      getExpensesBySalesInvoiceId(inv.id),
    ]);
    setLines(
      items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unit: i.unit,
        unitPrice: i.unitPrice,
        unitCost: i.unitCost,
      }))
    );
    setExpenseRows(expenses.map((e) => ({ expenseTypeId: e.expenseTypeId, amount: e.amount })));
    setDialogOpen(true);
  };

  const addLine = () => {
    const first = products[0];
    const pid = first?.id ?? "";
    setLines((prev) => [
      ...prev,
      {
        productId: pid,
        quantity: 0,
        unit: (first?.unit ?? "sqm") as ProductUnit,
        unitPrice: 0,
        unitCost: avgCost[pid],
      },
    ]);
  };

  const updateLine = (idx: number, patch: Partial<LineRow>) => {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      if (patch.productId !== undefined) {
        const p = products.find((x) => x.id === patch.productId);
        if (p) next[idx].unit = p.unit;
        next[idx].unitCost = avgCost[patch.productId];
      }
      return next;
    });
  };

  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const addExpenseRow = () => {
    setExpenseRows((prev) => [...prev, { expenseTypeId: expenseTypes[0]?.id ?? "", amount: 0 }]);
  };

  const updateExpenseRow = (idx: number, patch: Partial<ExpenseRow>) => {
    setExpenseRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const removeExpenseRow = (idx: number) => setExpenseRows((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    const customer = header.customerId ? customers.find((c) => c.id === header.customerId) : null;
    const customerName = customer?.nameAr ?? header.customerName.trim();
    if (!customerName) return;
    const num = header.invoiceNumber.trim();
    if (num && isSalesInvoiceNumberDuplicate(invoices, num, editing?.id)) {
      setInvoiceNumberError("رقم الفاتورة مكرر");
      return;
    }
    setInvoiceNumberError(null);
    setSaving(true);
    try {
      const dateNum = new Date(header.invoiceDate).getTime();
      const amountPaid = header.amountPaid ?? 0;
      if (amountPaid > totalAmount) return;
      const payload = {
        customerId: header.customerId || undefined,
        customerName,
        customerPhone: header.customerPhone?.trim() || undefined,
        invoiceNumber: header.invoiceNumber.trim() || undefined,
        invoiceDate: dateNum,
        notes: header.notes.trim() || undefined,
        status: (editing?.status ?? "draft") as SalesInvoice["status"],
        totalProducts,
        totalExpenses,
        totalAmount: totalProducts,
        amountPaid,
        paidToVaultId: header.paidToVaultId?.trim() || undefined,
        createdBy: editing ? undefined : (user?.id ?? undefined),
        updatedBy: editing ? (user?.id ?? undefined) : undefined,
      };
      let invoiceId: string;
      if (editing) {
        invoiceId = editing.id;
        await updateSalesInvoice(editing.id, payload);
        await deleteItemsBySalesInvoiceId(editing.id);
        await deleteExpensesBySalesInvoiceId(editing.id);
      } else {
        invoiceId = await createSalesInvoice(payload);
      }
      for (const line of lines) {
        if (!line.productId || line.quantity <= 0) continue;
        const lineTotal = line.quantity * line.unitPrice;
        const unitCost = line.unitCost ?? avgCost[line.productId];
        await createSalesInvoiceItem({
          salesInvoiceId: invoiceId,
          productId: line.productId,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
          unitCost,
          lineTotal,
        });
      }
      for (const er of expenseRows) {
        if (!er.expenseTypeId || er.amount <= 0) continue;
        await createSalesInvoiceExpense({
          salesInvoiceId: invoiceId,
          expenseTypeId: er.expenseTypeId,
          amount: er.amount,
        });
      }
      if (amountPaid > 0 && header.customerId) {
        await updateCustomer(header.customerId, { stage: "deposit_taken", updatedBy: user?.id });
        const list = await getActiveCustomers();
        setCustomers(list);
      }
      setDialogOpen(false);
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const confirmSale = async (inv: SalesInvoice) => {
    if (inv.status === "completed") return;
    setConfirmLoadingId(inv.id);
    try {
      const items = await getItemsBySalesInvoiceId(inv.id);
      const now = Date.now();
      for (const item of items) {
        await createStockMovement({
          productId: item.productId,
          type: "sale",
          quantity: item.quantity,
          unit: item.unit,
          unitCost: item.unitCost,
          totalCost: item.unitCost != null ? item.quantity * item.unitCost : undefined,
          salesInvoiceId: inv.id,
          createdAt: now,
          createdBy: user?.id,
        });
      }
      await updateSalesInvoice(inv.id, { status: "completed", updatedBy: user?.id });
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setConfirmLoadingId(null);
    }
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "numeric", year: "numeric" });

  const getAvailableQty = (productId: string) => stock[productId]?.quantity ?? 0;

  if (!user) return null;

  return (
    <NAdminShell>
      <PageHeader
        title="فواتير المبيعات"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} size="small" sx={{ fontFamily: "var(--font-cairo)" }}>
            فاتورة بيع جديدة
          </Button>
        }
      />

      <RecordList loading={loading}>
        {!loading && invoices.length === 0 && (
          <EmptyState title="لا توجد فواتير مبيعات" subtitle="أضف فاتورة بيع واختر العميل والبنود ثم اضغط إخراج من المخزن عند التأكيد" />
        )}
        {!loading &&
          invoices.map((inv) => (
            <RecordCard
              key={inv.id}
              title={inv.customerName}
              subtitle={`${inv.invoiceNumber ? inv.invoiceNumber + " • " : ""}${formatDate(inv.invoiceDate)} • ${inv.totalAmount.toLocaleString("en-US")} ج.م`}
              meta={
                <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap", alignItems: "center" }}>
                  <Chip
                    label={inv.status === "completed" ? "مكتمل" : "مسودة"}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: "0.75rem",
                      bgcolor: inv.status === "completed" ? "success.light" : "grey.200",
                    }}
                  />
                  {(inv.amountPaid ?? 0) > 0 && (
                    <Typography component="span" variant="caption" sx={{ fontFamily: "var(--font-cairo)" }}>
                      مستلم: {(inv.amountPaid ?? 0).toLocaleString("en-US")} ج.م
                    </Typography>
                  )}
                  {inv.totalExpenses > 0 && (
                    <Typography component="span" variant="caption" sx={{ fontFamily: "var(--font-cairo)" }}>
                      مصروفات: {inv.totalExpenses.toLocaleString("en-US")} ج.م
                    </Typography>
                  )}
                </Box>
              }
              action={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  {inv.status === "draft" && (
                    <Button
                      size="small"
                      startIcon={<InventoryIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmSale(inv);
                      }}
                      disabled={confirmLoadingId === inv.id}
                      sx={{ fontFamily: "var(--font-cairo)", fontSize: "0.75rem" }}
                    >
                      إخراج من المخزن
                    </Button>
                  )}
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(inv);
                    }}
                    sx={{ bgcolor: "grey.100", "&:hover": { bgcolor: "grey.200" } }}
                  >
                    <EditIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              }
            />
          ))}
      </RecordList>

      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        dir="rtl"
        fullWidth
        maxWidth="md"
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
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", flexShrink: 0 }}>
          {editing ? "تعديل فاتورة مبيعات" : "فاتورة مبيعات جديدة"}
        </DialogTitle>
        <DialogContent sx={{ textAlign: "right", overflowY: "auto", flex: 1, minHeight: 0, px: isMobile ? 2 : 3 }}>
          <Box dir="rtl" sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1, pb: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", textAlign: "right" }}>العميل</Typography>
              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                <Select
                  value={header.customerId}
                  onChange={(e) => {
                    const c = customers.find((x) => x.id === e.target.value);
                    setHeader((h) => ({ ...h, customerId: e.target.value, customerName: c?.nameAr ?? "", customerPhone: c?.phone ?? "" }));
                  }}
                  fullWidth
                  size="small"
                  displayEmpty
                  sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", "& .MuiSelect-select": { textAlign: "right" } }}
                  MenuProps={{ PaperProps: { sx: { direction: "rtl" } } }}
                >
                  <MenuItem value="">اختر العميل</MenuItem>
                  {customers.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.nameAr} {c.phone ? `— ${c.phone}` : ""}</MenuItem>
                  ))}
                </Select>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setNewCustomerForm({ nameAr: "", phone: "", notes: "" });
                    setAddCustomerOpen(true);
                  }}
                  sx={{ fontFamily: "var(--font-cairo)", flexShrink: 0 }}
                >
                  عميل جديد
                </Button>
              </Box>
            </Box>

            <Dialog open={addCustomerOpen} onClose={() => !addingCustomer && setAddCustomerOpen(false)} dir="rtl" PaperProps={{ sx: { borderRadius: 2, direction: "rtl", textAlign: "right", minWidth: 280 } }}>
              <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>إضافة عميل</DialogTitle>
              <DialogContent sx={{ textAlign: "right" }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
                  <TextField
                    label="الاسم (عربي)"
                    value={newCustomerForm.nameAr}
                    onChange={(e) => setNewCustomerForm((f) => ({ ...f, nameAr: e.target.value }))}
                    fullWidth
                    size="small"
                    required
                    inputProps={{ dir: "rtl" }}
                    InputLabelProps={{ style: { textAlign: "right" } }}
                    sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
                  />
                  <TextField
                    label="رقم الهاتف"
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 11) }))}
                    fullWidth
                    size="small"
                    type="tel"
                    inputProps={{ dir: "ltr", placeholder: "01xxxxxxxxx" }}
                    InputLabelProps={{ style: { textAlign: "right" } }}
                    sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)" } }}
                  />
                  <TextField
                    label="ملاحظات"
                    value={newCustomerForm.notes}
                    onChange={(e) => setNewCustomerForm((f) => ({ ...f, notes: e.target.value }))}
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    inputProps={{ dir: "rtl" }}
                    InputLabelProps={{ style: { textAlign: "right" } }}
                    sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
                  />
                </Box>
              </DialogContent>
              <DialogActions sx={{ direction: "rtl", justifyContent: "flex-start" }}>
                <Button onClick={() => !addingCustomer && setAddCustomerOpen(false)} sx={{ fontFamily: "var(--font-cairo)" }}>إلغاء</Button>
                <Button
                  variant="contained"
                  onClick={async () => {
                    if (!newCustomerForm.nameAr.trim()) return;
                    setAddingCustomer(true);
                    try {
                      const id = await createCustomer({
                        nameAr: newCustomerForm.nameAr.trim(),
                        phone: newCustomerForm.phone.trim() || undefined,
                        notes: newCustomerForm.notes.trim() || undefined,
                        stage: "lead",
                        order: customers.length,
                        active: true,
                        createdBy: user?.id,
                      });
                      const list = await getActiveCustomers();
                      setCustomers(list);
                      setHeader((h) => ({
                        ...h,
                        customerId: id,
                        customerName: newCustomerForm.nameAr.trim(),
                        customerPhone: newCustomerForm.phone.trim() || "",
                      }));
                      setAddCustomerOpen(false);
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setAddingCustomer(false);
                    }
                  }}
                  disabled={addingCustomer || !newCustomerForm.nameAr.trim()}
                  sx={{ fontFamily: "var(--font-cairo)" }}
                >
                  {addingCustomer ? "جاري الإضافة…" : "إضافة"}
                </Button>
              </DialogActions>
            </Dialog>
            <TextField
              label="رقم الفاتورة"
              value={header.invoiceNumber}
              onChange={(e) => {
                setHeader((h) => ({ ...h, invoiceNumber: e.target.value }));
                setInvoiceNumberError(null);
              }}
              fullWidth
              size="small"
              error={!!invoiceNumberError}
              helperText={invoiceNumberError ?? (editing ? undefined : "رقم تلقائي — يمكنك تعديله")}
              inputProps={{ dir: "rtl" }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
            />
            <TextField
              label="تاريخ الفاتورة"
              type="date"
              value={header.invoiceDate}
              onChange={(e) => setHeader((h) => ({ ...h, invoiceDate: e.target.value }))}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true, style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)" } }}
            />
            <TextField
              label="ملاحظات"
              value={header.notes}
              onChange={(e) => setHeader((h) => ({ ...h, notes: e.target.value }))}
              fullWidth
              multiline
              rows={1}
              size="small"
              inputProps={{ dir: "rtl" }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
            />
            <TextField
              label="المبلغ المستلم من العميل (ج.م)"
              type="number"
              value={header.amountPaid === 0 ? "" : header.amountPaid}
              onChange={(e) => setHeader((h) => ({ ...h, amountPaid: parseFloat(e.target.value) || 0 }))}
              fullWidth
              size="small"
              inputProps={{ min: 0, max: totalAmount > 0 ? totalAmount : undefined, step: 0.01, dir: "rtl" }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
              helperText={
                (header.amountPaid ?? 0) > totalAmount
                  ? "المبلغ لا يمكن أن يتجاوز إجمالي الفاتورة"
                  : totalAmount > 0
                    ? `متبقي: ${(totalAmount - (header.amountPaid ?? 0)).toLocaleString("en-US")} ج.م`
                    : undefined
              }
              error={(header.amountPaid ?? 0) > totalAmount}
            />
            {(header.amountPaid ?? 0) > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", textAlign: "right", fontFamily: "var(--font-cairo)" }}>
                  الاستلام في حساب
                </Typography>
                <Select
                  value={header.paidToVaultId}
                  onChange={(e) => setHeader((h) => ({ ...h, paidToVaultId: e.target.value }))}
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

            <Typography variant="subtitle2" sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", mt: 1 }}>
              البنود (من المخزن)
            </Typography>
            {isMobile ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {lines.map((line, idx) => {
                  const avail = getAvailableQty(line.productId);
                  return (
                    <Box
                      key={idx}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: "grey.50",
                        border: "1px solid",
                        borderColor: "grey.200",
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "var(--font-cairo)" }}>بند {idx + 1}</Typography>
                        <IconButton size="small" onClick={() => removeLine(idx)} sx={{ ml: -0.5 }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Select
                        value={line.productId}
                        onChange={(e) => {
                          const p = products.find((x) => x.id === e.target.value);
                          updateLine(idx, { productId: e.target.value, unit: p?.unit ?? "sqm", unitCost: avgCost[e.target.value] });
                        }}
                        size="small"
                        fullWidth
                        sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", "& .MuiSelect-select": { textAlign: "right" } }}
                        MenuProps={{ PaperProps: { sx: { direction: "rtl" } } }}
                      >
                        {products.map((p) => (
                          <MenuItem key={p.id} value={p.id}>{p.nameAr} (متاح: {getAvailableQty(p.id)} {unitLabel(stock[p.id]?.unit ?? p.unit)})</MenuItem>
                        ))}
                      </Select>
                      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 1, alignItems: "center" }}>
                        <TextField
                          label="الكمية"
                          type="number"
                          value={line.quantity || ""}
                          onChange={(e) => updateLine(idx, { quantity: parseFloat(e.target.value) || 0 })}
                          size="small"
                          inputProps={{ min: 0, max: avail, step: 0.01 }}
                          sx={{ "& .MuiInputBase-input": { textAlign: "right" } }}
                          InputLabelProps={{ style: { textAlign: "right" } }}
                        />
                        <TextField
                          label="سعر البيع"
                          type="number"
                          value={line.unitPrice || ""}
                          onChange={(e) => updateLine(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                          size="small"
                          inputProps={{ min: 0, step: 0.01 }}
                          sx={{ "& .MuiInputBase-input": { textAlign: "right" } }}
                          InputLabelProps={{ style: { textAlign: "right" } }}
                        />
                        <Typography variant="caption" color="text.secondary">تكلفة: {(line.unitCost ?? avgCost[line.productId] ?? 0).toLocaleString("en-US")} ج.م/وحدة</Typography>
                        <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", pt: 1 }}>{unitLabel(line.unit)}</Typography>
                      </Box>
                    </Box>
                  );
                })}
                <Button startIcon={<AddIcon />} size="small" onClick={addLine} fullWidth sx={{ fontFamily: "var(--font-cairo)" }}>
                  إضافة بند
                </Button>
              </Box>
            ) : (
              <>
                <Table size="small" sx={{ "& td, & th": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>الصنف</TableCell>
                      <TableCell>الكمية</TableCell>
                      <TableCell>متاح</TableCell>
                      <TableCell>سعر البيع</TableCell>
                      <TableCell>التكلفة</TableCell>
                      <TableCell>الإجمالي</TableCell>
                      <TableCell padding="none" width={40} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lines.map((line, idx) => {
                      const avail = getAvailableQty(line.productId);
                      const lineTotal = line.quantity * line.unitPrice;
                      return (
                        <TableRow key={idx}>
                          <TableCell>
                            <Select
                              value={line.productId}
                              onChange={(e) => updateLine(idx, { productId: e.target.value, unitCost: avgCost[e.target.value] })}
                              size="small"
                              fullWidth
                              sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", minWidth: 140 }}
                              MenuProps={{ PaperProps: { sx: { direction: "rtl" } } }}
                            >
                              {products.map((p) => (
                                <MenuItem key={p.id} value={p.id}>{p.nameAr}</MenuItem>
                              ))}
                            </Select>
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              value={line.quantity || ""}
                              onChange={(e) => updateLine(idx, { quantity: parseFloat(e.target.value) || 0 })}
                              size="small"
                              inputProps={{ min: 0, max: avail, step: 0.01 }}
                              sx={{ width: 80, "& .MuiInputBase-input": { textAlign: "right" } }}
                            />
                          </TableCell>
                          <TableCell>{avail} {unitLabel(line.unit)}</TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              value={line.unitPrice || ""}
                              onChange={(e) => updateLine(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                              size="small"
                              inputProps={{ min: 0, step: 0.01 }}
                              sx={{ width: 90, "& .MuiInputBase-input": { textAlign: "right" } }}
                            />
                          </TableCell>
                          <TableCell>{(line.unitCost ?? avgCost[line.productId] ?? 0).toLocaleString("en-US")}</TableCell>
                          <TableCell>{lineTotal.toLocaleString("en-US")}</TableCell>
                          <TableCell padding="none">
                            <IconButton size="small" onClick={() => removeLine(idx)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <Button startIcon={<AddIcon />} size="small" onClick={addLine} sx={{ fontFamily: "var(--font-cairo)", alignSelf: "flex-start" }}>
                  إضافة بند
                </Button>
              </>
            )}

            <Typography variant="subtitle2" sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", mt: 2 }}>
              مصروفات إضافية
            </Typography>
            {expenseRows.map((er, idx) => (
              <Box key={idx} sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                <Select
                  value={er.expenseTypeId}
                  onChange={(e) => updateExpenseRow(idx, { expenseTypeId: e.target.value })}
                  size="small"
                  sx={{ minWidth: 160, fontFamily: "var(--font-cairo)", textAlign: "right" }}
                  MenuProps={{ PaperProps: { sx: { direction: "rtl" } } }}
                >
                  {expenseTypes.map((et) => (
                    <MenuItem key={et.id} value={et.id}>{et.nameAr}</MenuItem>
                  ))}
                </Select>
                <TextField
                  label="المبلغ"
                  type="number"
                  value={er.amount || ""}
                  onChange={(e) => updateExpenseRow(idx, { amount: parseFloat(e.target.value) || 0 })}
                  size="small"
                  inputProps={{ min: 0, step: 0.01 }}
                  sx={{ width: 120, "& .MuiInputBase-input": { textAlign: "right" } }}
                  InputLabelProps={{ style: { textAlign: "right" } }}
                />
                <IconButton size="small" onClick={() => removeExpenseRow(idx)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button startIcon={<AddIcon />} size="small" onClick={addExpenseRow} sx={{ fontFamily: "var(--font-cairo)", alignSelf: "flex-start" }}>
              إضافة مصروف
            </Button>

            <Box sx={{ mt: 2, p: 1.5, bgcolor: "grey.50", borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
              <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>
                إجمالي البنود (للعميل): {totalProducts.toLocaleString("en-US")} ج.م
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>
                تكلفة البضاعة: {costOfGoods.toLocaleString("en-US")} ج.م
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>
                مصروفات إضافية: {otherExpenses.toLocaleString("en-US")} ج.م
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", fontWeight: 600 }}>
                إجمالي المصروفات (لدينا): {totalExpenses.toLocaleString("en-US")} ج.م
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ direction: "rtl", justifyContent: "flex-start", flexShrink: 0 }}>
          <Button onClick={() => !saving && setDialogOpen(false)} sx={{ fontFamily: "var(--font-cairo)" }}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !header.customerName?.trim()} sx={{ fontFamily: "var(--font-cairo)" }}>
            {saving ? "جاري الحفظ…" : "حفظ"}
          </Button>
        </DialogActions>
      </Dialog>
    </NAdminShell>
  );
}
