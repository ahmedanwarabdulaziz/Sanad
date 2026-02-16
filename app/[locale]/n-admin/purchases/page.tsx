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
import { RecordList, RecordCard, PageHeader, EmptyState, MobileFriendlySelect } from "../components";
import { getAllPurchaseInvoices, createPurchaseInvoice, updatePurchaseInvoice, suggestNextInvoiceNumber, isInvoiceNumberDuplicate } from "@/databases/sales-operations/collections/purchase_invoices";
import { getItemsByPurchaseInvoiceId, createPurchaseInvoiceItem, deleteItemsByPurchaseInvoiceId } from "@/databases/sales-operations/collections/purchase_invoice_items";
import { deleteExpensesByPurchaseInvoiceId } from "@/databases/sales-operations/collections/purchase_invoice_expenses";
import { getActiveProducts } from "@/databases/sales-operations/collections/products";
import { getActiveSuppliers } from "@/databases/sales-operations/collections/suppliers";
import { getAllVaults, getVaultsByUser } from "@/databases/sales-operations/collections/vaults";
import { getAllVaultTransfers, computeBalancesByVault } from "@/databases/sales-operations/collections/vault_transfers";
import { createStockMovement } from "@/databases/sales-operations/collections/stock_movements";
import type { SalesUser } from "@/databases/sales-operations/types";
import type {
  PurchaseInvoice,
  Product,
  ProductUnit,
  Supplier,
  Vault,
} from "@/databases/sales-operations/types";

const unitLabel = (u: ProductUnit) => (u === "sqm" ? "م²" : "م.ط");

type LineRow = { productId: string; quantity: number; unit: ProductUnit; unitPrice: number };

export default function PurchasesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [user, setUser] = useState<SalesUser | null>(null);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseInvoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [warehouseLoadingId, setWarehouseLoadingId] = useState<string | null>(null);
  const [header, setHeader] = useState({
    supplierId: "",
    supplierName: "",
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().slice(0, 10),
    notes: "",
    amountPaid: 0,
    paidFromVaultId: "",
  });
  const [lines, setLines] = useState<LineRow[]>([]);
  const [invoiceNumberError, setInvoiceNumberError] = useState<string | null>(null);
  const [vaultBalanceError, setVaultBalanceError] = useState<string | null>(null);

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
        u.pageAccess?.some((a: { pageId: string }) => a.pageId === "purchases");
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
    getActiveSuppliers().then(setSuppliers).catch(() => setSuppliers([]));
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
    getAllPurchaseInvoices()
      .then(setInvoices)
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  };

  const totalProducts = lines.reduce((s, r) => s + r.quantity * r.unitPrice, 0);
  const totalAmount = totalProducts;

  const openAdd = () => {
    setEditing(null);
    const suggested = suggestNextInvoiceNumber(invoices);
    setHeader({
      supplierId: "",
      supplierName: "",
      invoiceNumber: suggested,
      invoiceDate: new Date().toISOString().slice(0, 10),
      notes: "",
      amountPaid: 0,
      paidFromVaultId: "",
    });
    setLines([]);
    setInvoiceNumberError(null);
    setVaultBalanceError(null);
    setDialogOpen(true);
  };

  const openEdit = async (inv: PurchaseInvoice) => {
    setEditing(inv);
    const supp = suppliers.find((s) => s.id === inv.supplierId);
    const allowedVaultId = inv.paidFromVaultId && vaults.some((v) => v.id === inv.paidFromVaultId) ? inv.paidFromVaultId : "";
    setHeader({
      supplierId: inv.supplierId ?? "",
      supplierName: inv.supplierName ?? supp?.nameAr ?? "",
      invoiceNumber: inv.invoiceNumber ?? "",
      invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      notes: inv.notes ?? "",
      amountPaid: inv.amountPaid ?? 0,
      paidFromVaultId: allowedVaultId,
    });
    setInvoiceNumberError(null);
    setVaultBalanceError(null);
    const items = await getItemsByPurchaseInvoiceId(inv.id);
    setLines(
      items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unit: i.unit,
        unitPrice: i.unitPrice,
      }))
    );
    setDialogOpen(true);
  };

  const addLine = () => {
    const first = products[0];
    setLines((prev) => [
      ...prev,
      {
        productId: first?.id ?? "",
        quantity: 0,
        unit: (first?.unit ?? "sqm") as ProductUnit,
        unitPrice: 0,
      },
    ]);
  };

  const updateLine = (idx: number, patch: Partial<LineRow>) => {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    const supplier = header.supplierId ? suppliers.find((s) => s.id === header.supplierId) : null;
    const supplierName = supplier?.nameAr ?? header.supplierName.trim();
    if (!supplierName) return;
    const num = header.invoiceNumber.trim();
    if (num && isInvoiceNumberDuplicate(invoices, num, editing?.id)) {
      setInvoiceNumberError("رقم الفاتورة مكرر");
      return;
    }
    setInvoiceNumberError(null);
    setVaultBalanceError(null);
    const amountPaid = header.amountPaid ?? 0;
    if (amountPaid > totalAmount) return;
    const paidFromVaultId = header.paidFromVaultId?.trim();
    if (amountPaid > 0 && paidFromVaultId) {
      const transfers = await getAllVaultTransfers();
      const balances = computeBalancesByVault(vaults, transfers);
      const balance = balances[paidFromVaultId] ?? 0;
      const available =
        editing?.paidFromVaultId === paidFromVaultId
          ? balance + (editing.amountPaid ?? 0)
          : balance;
      if (amountPaid > available) {
        const vaultName = vaults.find((v) => v.id === paidFromVaultId)?.name ?? paidFromVaultId;
        setVaultBalanceError(`رصيد الحساب «${vaultName}» غير كافٍ (المتاح: ${available.toLocaleString("en-US")} ج.م)`);
        return;
      }
    }
    setSaving(true);
    try {
      const dateNum = new Date(header.invoiceDate).getTime();
      const payload = {
        supplierId: header.supplierId || undefined,
        supplierName: supplierName,
        invoiceNumber: header.invoiceNumber.trim() || undefined,
        invoiceDate: dateNum,
        notes: header.notes.trim() || undefined,
        status: (editing?.status ?? "draft") as PurchaseInvoice["status"],
        totalProducts,
        totalExpenses: 0,
        totalAmount: totalProducts,
        amountPaid: header.amountPaid ?? 0,
        paidFromVaultId: header.paidFromVaultId?.trim() || undefined,
        createdBy: editing ? undefined : (user?.id ?? undefined),
        updatedBy: editing ? (user?.id ?? undefined) : undefined,
      };
      let invoiceId: string;
      if (editing) {
        invoiceId = editing.id;
        await updatePurchaseInvoice(editing.id, payload);
        await deleteItemsByPurchaseInvoiceId(editing.id);
        await deleteExpensesByPurchaseInvoiceId(editing.id);
      } else {
        invoiceId = await createPurchaseInvoice(payload);
      }
      for (const line of lines) {
        if (!line.productId || line.quantity <= 0) continue;
        const lineTotal = line.quantity * line.unitPrice;
        await createPurchaseInvoiceItem({
          purchaseInvoiceId: invoiceId,
          productId: line.productId,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
          lineTotal,
        });
      }
      setDialogOpen(false);
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const addToWarehouse = async (inv: PurchaseInvoice) => {
    if (inv.status === "completed") return;
    setWarehouseLoadingId(inv.id);
    try {
      const items = await getItemsByPurchaseInvoiceId(inv.id);
      const now = Date.now();
      for (const item of items) {
        await createStockMovement({
          productId: item.productId,
          type: "purchase",
          quantity: item.quantity,
          unit: item.unit,
          unitCost: item.unitPrice,
          totalCost: item.lineTotal,
          purchaseInvoiceId: inv.id,
          createdAt: now,
          createdBy: user?.id,
        });
      }
      await updatePurchaseInvoice(inv.id, { status: "completed", updatedBy: user?.id });
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setWarehouseLoadingId(null);
    }
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "numeric", year: "numeric" });

  if (!user) return null;

  return (
    <NAdminShell>
      <PageHeader
        title="فواتير الشراء"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} size="small" sx={{ fontFamily: "var(--font-cairo)" }}>
            فاتورة جديدة
          </Button>
        }
      />

      <RecordList loading={loading}>
        {!loading && invoices.length === 0 && (
          <EmptyState title="لا توجد فواتير" subtitle="أضف فاتورة شراء ثم أضف بنودها واضغط إضافة للمخزن عند الانتهاء" />
        )}
        {!loading &&
          invoices.map((inv) => (
            <RecordCard
              key={inv.id}
              title={inv.supplierName}
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
                    <Typography component="span" variant="caption" sx={{ fontFamily: "var(--font-cairo)", display: "block" }}>
                      مدفوع: {(inv.amountPaid ?? 0).toLocaleString("en-US")} ج.م
                      {inv.paidFromVaultId && vaults.find((v) => v.id === inv.paidFromVaultId) && (
                        <> — من حساب: {vaults.find((v) => v.id === inv.paidFromVaultId)?.name}</>
                      )}
                      {(inv.amountPaid ?? 0) < inv.totalAmount && (
                        <> • متبقي: {(inv.totalAmount - (inv.amountPaid ?? 0)).toLocaleString("en-US")} ج.م</>
                      )}
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
                        addToWarehouse(inv);
                      }}
                      disabled={warehouseLoadingId === inv.id}
                      sx={{ fontFamily: "var(--font-cairo)", fontSize: "0.75rem" }}
                    >
                      للمخزن
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
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", flexShrink: 0 }}>
          {editing ? "تعديل فاتورة شراء" : "فاتورة شراء جديدة"}
        </DialogTitle>
        <DialogContent sx={{ textAlign: "right", overflowY: "auto", flex: 1, minHeight: 0, px: isMobile ? 2 : 3 }}>
          <Box dir="rtl" sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1, pb: 2 }}>
            <MobileFriendlySelect
              label="المورد"
              options={suppliers.map((s) => ({ value: s.id, label: s.nameAr }))}
              value={header.supplierId}
              onChange={(v) => {
                const s = suppliers.find((x) => x.id === v);
                setHeader((h) => ({ ...h, supplierId: v, supplierName: s?.nameAr ?? "" }));
              }}
              fullWidth
              size="small"
              placeholder="اختر المورد"
              displayEmpty
              searchable
              sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}
            />
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
              helperText={invoiceNumberError ?? (editing ? undefined : "رقم تلقائي — يمكنك تعديله مع منع التكرار")}
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
              label="المبلغ المدفوع (ج.م)"
              type="number"
              value={header.amountPaid === 0 ? "" : header.amountPaid}
              onChange={(e) => {
                setVaultBalanceError(null);
                setHeader((h) => ({ ...h, amountPaid: parseFloat(e.target.value) || 0 }));
              }}
              fullWidth
              size="small"
              inputProps={{ min: 0, max: totalAmount > 0 ? totalAmount : undefined, step: 0.01, inputMode: "decimal", dir: "rtl" }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
              helperText={
                (header.amountPaid ?? 0) > totalAmount
                  ? "المبلغ المدفوع لا يمكن أن يتجاوز إجمالي الفاتورة"
                  : vaultBalanceError
                    ? vaultBalanceError
                    : totalAmount > 0
                      ? `متبقي: ${(totalAmount - (header.amountPaid ?? 0)).toLocaleString("en-US")} ج.م`
                      : undefined
              }
              error={!!vaultBalanceError || (header.amountPaid ?? 0) > totalAmount}
            />
            {(header.amountPaid ?? 0) > 0 && (
              <MobileFriendlySelect
                label="الدفع من حساب"
                options={vaults.filter((v) => v.active).map((v) => ({ value: v.id, label: `${v.name} ${v.type === "bank" ? "(بنك)" : "(شخصي)"}` }))}
                value={header.paidFromVaultId}
                onChange={(v) => {
                  setVaultBalanceError(null);
                  setHeader((h) => ({ ...h, paidFromVaultId: v }));
                }}
                fullWidth
                size="small"
                placeholder="اختر الحساب"
                displayEmpty
                sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}
              />
            )}

            <Typography variant="subtitle2" sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", mt: 1 }}>
              البنود
            </Typography>
            {isMobile ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {lines.map((line, idx) => (
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
                    <MobileFriendlySelect
                      value={line.productId}
                      onChange={(v) => {
                        const p = products.find((x) => x.id === v);
                        updateLine(idx, { productId: v, unit: p?.unit ?? "sqm" });
                      }}
                      options={products.map((p) => ({ value: p.id, label: p.nameAr }))}
                      size="small"
                      fullWidth
                      searchable
                      sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}
                    />
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 1, alignItems: "center" }}>
                      <TextField
                        label="الكمية"
                        type="number"
                        value={line.quantity || ""}
                        onChange={(e) => updateLine(idx, { quantity: parseFloat(e.target.value) || 0 })}
                        size="small"
                        inputProps={{ min: 0, step: 0.01, inputMode: "decimal" }}
                        sx={{ "& .MuiInputBase-input": { textAlign: "right" } }}
                        InputLabelProps={{ style: { textAlign: "right" } }}
                      />
                      <TextField
                        label="سعر الوحدة"
                        type="number"
                        value={line.unitPrice || ""}
                        onChange={(e) => updateLine(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                        size="small"
                        inputProps={{ min: 0, step: 0.01, inputMode: "decimal" }}
                        sx={{ "& .MuiInputBase-input": { textAlign: "right" } }}
                        InputLabelProps={{ style: { textAlign: "right" } }}
                      />
                      <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", pt: 1 }}>{unitLabel(line.unit)}</Typography>
                    </Box>
                  </Box>
                ))}
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
                      <TableCell>الوحدة</TableCell>
                      <TableCell>سعر الوحدة</TableCell>
                      <TableCell width={40} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lines.map((line, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <MobileFriendlySelect
                            value={line.productId}
                            onChange={(v) => {
                              const p = products.find((x) => x.id === v);
                              updateLine(idx, { productId: v, unit: p?.unit ?? "sqm" });
                            }}
                            options={products.map((p) => ({ value: p.id, label: p.nameAr }))}
                            size="small"
                            fullWidth
                            searchable
                            sx={{ minWidth: 120, fontFamily: "var(--font-cairo)", textAlign: "right" }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={line.quantity || ""}
                            onChange={(e) => updateLine(idx, { quantity: parseFloat(e.target.value) || 0 })}
                            size="small"
                            inputProps={{ min: 0, step: 0.01, inputMode: "decimal" }}
                            sx={{ width: 80, "& .MuiInputBase-input": { textAlign: "right" } }}
                          />
                        </TableCell>
                        <TableCell>{unitLabel(line.unit)}</TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={line.unitPrice || ""}
                            onChange={(e) => updateLine(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                            size="small"
                            inputProps={{ min: 0, step: 0.01, inputMode: "decimal" }}
                            sx={{ width: 90, "& .MuiInputBase-input": { textAlign: "right" } }}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => removeLine(idx)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button startIcon={<AddIcon />} size="small" onClick={addLine} sx={{ alignSelf: "flex-end", fontFamily: "var(--font-cairo)" }}>
                  إضافة بند
                </Button>
              </>
            )}

            <Box
              component="section"
              dir="rtl"
              aria-label="ملخص الفاتورة"
              sx={{
                borderTop: 1,
                borderColor: "divider",
                pt: 2,
                mt: 1,
                borderRadius: 2,
                p: 2,
                bgcolor: "grey.50",
                direction: "rtl",
                textAlign: "right",
              }}
            >
              <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", display: "block" }}>
                إجمالي البنود: {totalProducts.toLocaleString("en-US")} ج.م
              </Typography>
              <Typography variant="subtitle1" fontWeight={600} sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", display: "block", mt: 0.5 }}>
                الإجمالي: {totalAmount.toLocaleString("en-US")} ج.م
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", display: "block" }}>
                مدفوع: {(header.amountPaid ?? 0).toLocaleString("en-US")} ج.م
              </Typography>
              {(header.amountPaid ?? 0) > 0 && header.paidFromVaultId && (
                <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", display: "block" }}>
                  من حساب: {vaults.find((v) => v.id === header.paidFromVaultId)?.name ?? "—"}
                </Typography>
              )}
              <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", display: "block" }}>
                متبقي: {(totalAmount - (header.amountPaid ?? 0)).toLocaleString("en-US")} ج.م
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            direction: "rtl",
            justifyContent: "flex-start",
            flexShrink: 0,
            ...(isMobile && {
              position: "sticky",
              bottom: 0,
              bgcolor: "background.paper",
              borderTop: 1,
              borderColor: "divider",
              py: 2,
              px: 2,
            }),
          }}
        >
          <Button onClick={() => !saving && setDialogOpen(false)} disabled={saving} sx={{ fontFamily: "var(--font-cairo)" }}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={(!header.supplierId && !header.supplierName.trim()) || saving}
            sx={{ fontFamily: "var(--font-cairo)" }}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </NAdminShell>
  );
}
