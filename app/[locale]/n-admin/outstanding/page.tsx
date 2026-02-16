"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import NAdminShell from "../components/NAdminShell";
import { RecordList, RecordCard, PageHeader, EmptyState, MobileFriendlySelect } from "../components";
import { getAllExpenses, updateExpense } from "@/databases/sales-operations/collections/expenses";
import { getActiveExpenseTypes } from "@/databases/sales-operations/collections/expense_types";
import { getAllPurchaseInvoices, updatePurchaseInvoice } from "@/databases/sales-operations/collections/purchase_invoices";
import { getAllSalesInvoices, updateSalesInvoice } from "@/databases/sales-operations/collections/sales_invoices";
import { getAllVaults, getVaultsByUser } from "@/databases/sales-operations/collections/vaults";
import type { SalesUser } from "@/databases/sales-operations/types";
import type { Vault } from "@/databases/sales-operations/types";
import type { Expense, ExpensePayment, ExpensePaymentStatus } from "@/databases/sales-operations/types";
import type { PurchaseInvoice } from "@/databases/sales-operations/types";
import type { SalesInvoice } from "@/databases/sales-operations/types";

function getPaymentEntries(exp: Expense): { vaultId: string; amount: number }[] {
  if (exp.payments?.length) return exp.payments;
  const amt = exp.amountPaid ?? 0;
  const vId = exp.paidFromVaultId?.trim();
  return amt > 0 && vId ? [{ vaultId: vId, amount: amt }] : [];
}

export default function OutstandingPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [user, setUser] = useState<SalesUser | null>(null);
  const [tab, setTab] = useState(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [allPurchaseInvoices, setAllPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [allSalesInvoices, setAllSalesInvoices] = useState<SalesInvoice[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<{ id: string; nameAr: string }[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);

  const [expensePayment, setExpensePayment] = useState<Expense | null>(null);
  const [expensePaymentAmount, setExpensePaymentAmount] = useState(0);
  const [expensePaymentVaultId, setExpensePaymentVaultId] = useState("");
  const [expensePaymentSaving, setExpensePaymentSaving] = useState(false);

  const [purchasePaymentInv, setPurchasePaymentInv] = useState<PurchaseInvoice | null>(null);
  const [purchasePaymentAmount, setPurchasePaymentAmount] = useState(0);
  const [purchasePaymentVaultId, setPurchasePaymentVaultId] = useState("");
  const [purchasePaymentSaving, setPurchasePaymentSaving] = useState(false);

  const [salesCollectInv, setSalesCollectInv] = useState<SalesInvoice | null>(null);
  const [salesCollectAmount, setSalesCollectAmount] = useState(0);
  const [salesCollectVaultId, setSalesCollectVaultId] = useState("");
  const [salesCollectSaving, setSalesCollectSaving] = useState(false);

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
        u.pageAccess?.some((a: { pageId: string }) => a.pageId === "outstanding" || a.pageId === "financial");
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
    Promise.all([getAllExpenses(), getAllPurchaseInvoices(), getAllSalesInvoices()])
      .then(([exps, purch, sales]) => {
        setExpenses(exps.filter((e) => (e.paymentStatus ?? "not_paid") !== "paid"));
        setAllPurchaseInvoices(purch);
        setAllSalesInvoices(sales);
        setPurchaseInvoices(purch.filter((p) => (p.amountPaid ?? 0) < p.totalAmount));
        setSalesInvoices(sales.filter((s) => (s.amountPaid ?? 0) < s.totalAmount));
      })
      .catch(() => {
        setExpenses([]);
        setAllPurchaseInvoices([]);
        setAllSalesInvoices([]);
        setPurchaseInvoices([]);
        setSalesInvoices([]);
      })
      .finally(() => setLoading(false));
  };

  const getExpenseTypeName = (id: string) => expenseTypes.find((e) => e.id === id)?.nameAr ?? id;
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit", year: "numeric" });

  const getExpenseInvoiceNo = (item: Expense): string => {
    if (item.salesInvoiceId) {
      const inv = allSalesInvoices.find((i) => i.id === item.salesInvoiceId);
      return inv ? (inv.invoiceNumber ?? inv.id) : "";
    }
    if (item.purchaseInvoiceId) {
      const inv = allPurchaseInvoices.find((i) => i.id === item.purchaseInvoiceId);
      return inv ? (inv.invoiceNumber ?? inv.id) : "";
    }
    return "";
  };
  const getExpensePartyName = (item: Expense): string => {
    if (item.salesInvoiceId) {
      const inv = allSalesInvoices.find((i) => i.id === item.salesInvoiceId);
      return inv?.customerName ?? "";
    }
    if (item.purchaseInvoiceId) {
      const inv = allPurchaseInvoices.find((i) => i.id === item.purchaseInvoiceId);
      return inv?.supplierName ?? "";
    }
    return "";
  };
  const getExpensePartyPhone = (item: Expense): string => {
    if (item.salesInvoiceId) {
      const inv = allSalesInvoices.find((i) => i.id === item.salesInvoiceId);
      return inv?.customerPhone?.trim() ?? "";
    }
    return "";
  };
  const isExpenseLinkedToInvoice = (item: Expense) => item.scope === "invoice" && (!!item.salesInvoiceId || !!item.purchaseInvoiceId);

  const handleExpensePayment = async () => {
    if (!expensePayment || expensePaymentAmount <= 0 || !expensePaymentVaultId?.trim()) return;
    const paid = expensePayment.amountPaid ?? 0;
    const remaining = Math.max(0, expensePayment.amount - paid);
    const amount = Math.min(expensePaymentAmount, remaining);
    if (amount <= 0) return;
    setExpensePaymentSaving(true);
    try {
      const entries = getPaymentEntries(expensePayment);
      const newPayments: ExpensePayment[] = [...entries, { vaultId: expensePaymentVaultId.trim(), amount }];
      const newAmountPaid = newPayments.reduce((s, p) => s + p.amount, 0);
      const paymentStatus: ExpensePaymentStatus = newAmountPaid >= expensePayment.amount ? "paid" : "partial";
      await updateExpense(expensePayment.id, {
        payments: newPayments,
        amountPaid: newAmountPaid,
        paidFromVaultId: expensePaymentVaultId.trim(),
        paymentStatus,
      });
      setExpensePayment(null);
      setExpensePaymentAmount(0);
      setExpensePaymentVaultId("");
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setExpensePaymentSaving(false);
    }
  };

  const handlePurchasePayment = async () => {
    if (!purchasePaymentInv || purchasePaymentAmount <= 0 || !purchasePaymentVaultId?.trim()) return;
    const paid = purchasePaymentInv.amountPaid ?? 0;
    const remaining = Math.max(0, purchasePaymentInv.totalAmount - paid);
    const amount = Math.min(purchasePaymentAmount, remaining);
    if (amount <= 0) return;
    setPurchasePaymentSaving(true);
    try {
      await updatePurchaseInvoice(purchasePaymentInv.id, {
        amountPaid: paid + amount,
        paidFromVaultId: purchasePaymentVaultId.trim(),
      });
      setPurchasePaymentInv(null);
      setPurchasePaymentAmount(0);
      setPurchasePaymentVaultId("");
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setPurchasePaymentSaving(false);
    }
  };

  const handleSalesCollect = async () => {
    if (!salesCollectInv || salesCollectAmount <= 0 || !salesCollectVaultId?.trim()) return;
    const paid = salesCollectInv.amountPaid ?? 0;
    const remaining = Math.max(0, salesCollectInv.totalAmount - paid);
    const amount = Math.min(salesCollectAmount, remaining);
    if (amount <= 0) return;
    setSalesCollectSaving(true);
    try {
      await updateSalesInvoice(salesCollectInv.id, {
        amountPaid: paid + amount,
        paidToVaultId: salesCollectVaultId.trim(),
      });
      setSalesCollectInv(null);
      setSalesCollectAmount(0);
      setSalesCollectVaultId("");
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSalesCollectSaving(false);
    }
  };

  if (!user) return null;

  return (
    <NAdminShell>
      <PageHeader title="المتبقي — دفع وتحصيل" />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: "divider", mb: 2, "& .MuiTab-root": { fontFamily: "var(--font-cairo)" } }}>
        <Tab label={`مصروفات (${expenses.length})`} id="outstanding-tab-0" />
        <Tab label={`فواتير شراء (${purchaseInvoices.length})`} id="outstanding-tab-1" />
        <Tab label={`فواتير مبيعات (${salesInvoices.length})`} id="outstanding-tab-2" />
      </Tabs>

      <RecordList loading={loading}>
        {tab === 0 && !loading && expenses.length === 0 && (
          <EmptyState title="لا توجد مصروفات متبقية" subtitle="جميع المصروفات مسددة" />
        )}
        {tab === 0 &&
          !loading &&
          expenses.map((item) => {
            const paid = item.amountPaid ?? 0;
            const remaining = Math.max(0, item.amount - paid);
            return (
              <RecordCard
                key={item.id}
                title={getExpenseTypeName(item.expenseTypeId)}
                subtitle={`${item.amount.toLocaleString("en-US")} ج.م • مدفوع: ${paid.toLocaleString("en-US")} ج.م • متبقي: ${remaining.toLocaleString("en-US")} ج.م`}
                meta={
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                    {isExpenseLinkedToInvoice(item) && (() => {
                      const parts: string[] = [];
                      const invNo = getExpenseInvoiceNo(item);
                      if (invNo) parts.push(`رقم الفاتورة: ${invNo}`);
                      const party = getExpensePartyName(item);
                      if (party) parts.push(`${item.relatedTo === "sell" ? "العميل:" : "المورد:"} ${party}`);
                      const phone = getExpensePartyPhone(item);
                      if (phone) parts.push(`رقم العميل: ${phone}`);
                      return parts.length > 0 ? (
                        <Typography variant="caption" sx={{ fontFamily: "var(--font-cairo)", fontWeight: 600 }}>
                          {parts.join(" • ")}
                        </Typography>
                      ) : null;
                    })()}
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "var(--font-cairo)" }}>{formatDate(item.createdAt)}</Typography>
                  </Box>
                }
                action={
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpensePayment(item);
                      setExpensePaymentAmount(0);
                      setExpensePaymentVaultId(item.paidFromVaultId ?? getPaymentEntries(item).length > 0 ? getPaymentEntries(item)[getPaymentEntries(item).length - 1].vaultId : "");
                    }}
                    sx={{ fontFamily: "var(--font-cairo)" }}
                  >
                    دفع
                  </Button>
                }
              />
            );
          })}

        {tab === 1 && !loading && purchaseInvoices.length === 0 && (
          <EmptyState title="لا توجد فواتير شراء متبقية" subtitle="جميع فواتير الشراء مسددة" />
        )}
        {tab === 1 &&
          !loading &&
          purchaseInvoices.map((inv) => {
            const paid = inv.amountPaid ?? 0;
            const remaining = Math.max(0, inv.totalAmount - paid);
            return (
              <RecordCard
                key={inv.id}
                title={inv.invoiceNumber ?? inv.id}
                subtitle={`${inv.supplierName} • ${inv.totalAmount.toLocaleString("en-US")} ج.م • مدفوع: ${paid.toLocaleString("en-US")} ج.م • متبقي: ${remaining.toLocaleString("en-US")} ج.م`}
                meta={<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "var(--font-cairo)" }}>{formatDate(inv.createdAt)}</Typography>}
                action={
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPurchasePaymentInv(inv);
                      setPurchasePaymentAmount(0);
                      setPurchasePaymentVaultId(inv.paidFromVaultId ?? "");
                    }}
                    sx={{ fontFamily: "var(--font-cairo)" }}
                  >
                    دفع
                  </Button>
                }
              />
            );
          })}

        {tab === 2 && !loading && salesInvoices.length === 0 && (
          <EmptyState title="لا توجد فواتير مبيعات متبقية" subtitle="جميع المبالغ محصلة" />
        )}
        {tab === 2 &&
          !loading &&
          salesInvoices.map((inv) => {
            const paid = inv.amountPaid ?? 0;
            const remaining = Math.max(0, inv.totalAmount - paid);
            return (
              <RecordCard
                key={inv.id}
                title={inv.invoiceNumber ?? inv.id}
                subtitle={`${inv.customerName} • ${inv.totalAmount.toLocaleString("en-US")} ج.م • محصل: ${paid.toLocaleString("en-US")} ج.م • متبقي: ${remaining.toLocaleString("en-US")} ج.م`}
                meta={<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "var(--font-cairo)" }}>{formatDate(inv.createdAt)}</Typography>}
                action={
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSalesCollectInv(inv);
                      setSalesCollectAmount(0);
                      setSalesCollectVaultId(inv.paidToVaultId ?? "");
                    }}
                    sx={{ fontFamily: "var(--font-cairo)" }}
                  >
                    تحصيل
                  </Button>
                }
              />
            );
          })}
      </RecordList>

      {/* Expense payment dialog */}
      <Dialog open={!!expensePayment} onClose={() => !expensePaymentSaving && setExpensePayment(null)} dir="rtl" fullWidth maxWidth="xs" fullScreen={isMobile} PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2, direction: "rtl" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>دفع مصروف</DialogTitle>
        <DialogContent sx={{ textAlign: "right" }}>
          {expensePayment && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "var(--font-cairo)" }}>
                {getExpenseTypeName(expensePayment.expenseTypeId)} — متبقي {Math.max(0, expensePayment.amount - (expensePayment.amountPaid ?? 0)).toLocaleString("en-US")} ج.م
              </Typography>
              <TextField
                label="مبلغ الدفعة (ج.م)"
                type="number"
                value={expensePaymentAmount === 0 ? "" : expensePaymentAmount}
                onChange={(e) => setExpensePaymentAmount(parseFloat(e.target.value) || 0)}
                fullWidth
                size="small"
                inputProps={{ min: 0, max: Math.max(0, expensePayment.amount - (expensePayment.amountPaid ?? 0)), step: 0.01, inputMode: "decimal" }}
                InputLabelProps={{ style: { textAlign: "right" } }}
                sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
              />
              <MobileFriendlySelect
                label="الدفع من حساب"
                options={vaults.map((v) => ({ value: v.id, label: `${v.name} ${v.type === "bank" ? "(بنك)" : "(شخصي)"}` }))}
                value={expensePaymentVaultId}
                onChange={setExpensePaymentVaultId}
                fullWidth
                size="small"
                placeholder="اختر الحساب"
                displayEmpty
                sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ direction: "rtl", justifyContent: "flex-start" }}>
          <Button onClick={() => !expensePaymentSaving && setExpensePayment(null)} sx={{ fontFamily: "var(--font-cairo)" }}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleExpensePayment}
            disabled={expensePaymentSaving || !expensePayment || expensePaymentAmount <= 0 || !expensePaymentVaultId?.trim()}
            sx={{ fontFamily: "var(--font-cairo)" }}
          >
            {expensePaymentSaving ? "جاري الحفظ…" : "تسجيل الدفعة"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Purchase payment dialog */}
      <Dialog open={!!purchasePaymentInv} onClose={() => !purchasePaymentSaving && setPurchasePaymentInv(null)} dir="rtl" fullWidth maxWidth="xs" fullScreen={isMobile} PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2, direction: "rtl" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>دفع فاتورة شراء</DialogTitle>
        <DialogContent sx={{ textAlign: "right" }}>
          {purchasePaymentInv && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "var(--font-cairo)" }}>
                {purchasePaymentInv.invoiceNumber ?? purchasePaymentInv.id} — {purchasePaymentInv.supplierName} — متبقي {Math.max(0, purchasePaymentInv.totalAmount - (purchasePaymentInv.amountPaid ?? 0)).toLocaleString("en-US")} ج.م
              </Typography>
              <TextField
                label="مبلغ الدفع (ج.م)"
                type="number"
                value={purchasePaymentAmount === 0 ? "" : purchasePaymentAmount}
                onChange={(e) => setPurchasePaymentAmount(parseFloat(e.target.value) || 0)}
                fullWidth
                size="small"
                inputProps={{ min: 0, max: Math.max(0, purchasePaymentInv.totalAmount - (purchasePaymentInv.amountPaid ?? 0)), step: 0.01, inputMode: "decimal" }}
                InputLabelProps={{ style: { textAlign: "right" } }}
                sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
              />
              <MobileFriendlySelect
                label="الدفع من حساب"
                options={vaults.map((v) => ({ value: v.id, label: `${v.name} ${v.type === "bank" ? "(بنك)" : "(شخصي)"}` }))}
                value={purchasePaymentVaultId}
                onChange={setPurchasePaymentVaultId}
                fullWidth
                size="small"
                placeholder="اختر الحساب"
                displayEmpty
                sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ direction: "rtl", justifyContent: "flex-start" }}>
          <Button onClick={() => !purchasePaymentSaving && setPurchasePaymentInv(null)} sx={{ fontFamily: "var(--font-cairo)" }}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handlePurchasePayment}
            disabled={purchasePaymentSaving || !purchasePaymentInv || purchasePaymentAmount <= 0 || !purchasePaymentVaultId?.trim()}
            sx={{ fontFamily: "var(--font-cairo)" }}
          >
            {purchasePaymentSaving ? "جاري الحفظ…" : "تسجيل الدفع"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sales collection dialog */}
      <Dialog open={!!salesCollectInv} onClose={() => !salesCollectSaving && setSalesCollectInv(null)} dir="rtl" fullWidth maxWidth="xs" fullScreen={isMobile} PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2, direction: "rtl" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>تحصيل من عميل</DialogTitle>
        <DialogContent sx={{ textAlign: "right" }}>
          {salesCollectInv && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "var(--font-cairo)" }}>
                {salesCollectInv.invoiceNumber ?? salesCollectInv.id} — {salesCollectInv.customerName} — متبقي {Math.max(0, salesCollectInv.totalAmount - (salesCollectInv.amountPaid ?? 0)).toLocaleString("en-US")} ج.م
              </Typography>
              <TextField
                label="مبلغ التحصيل (ج.م)"
                type="number"
                value={salesCollectAmount === 0 ? "" : salesCollectAmount}
                onChange={(e) => setSalesCollectAmount(parseFloat(e.target.value) || 0)}
                fullWidth
                size="small"
                inputProps={{ min: 0, max: Math.max(0, salesCollectInv.totalAmount - (salesCollectInv.amountPaid ?? 0)), step: 0.01, inputMode: "decimal" }}
                InputLabelProps={{ style: { textAlign: "right" } }}
                sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
              />
              <MobileFriendlySelect
                label="الاستلام في حساب"
                options={vaults.map((v) => ({ value: v.id, label: `${v.name} ${v.type === "bank" ? "(بنك)" : "(شخصي)"}` }))}
                value={salesCollectVaultId}
                onChange={setSalesCollectVaultId}
                fullWidth
                size="small"
                placeholder="اختر الحساب"
                displayEmpty
                sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ direction: "rtl", justifyContent: "flex-start" }}>
          <Button onClick={() => !salesCollectSaving && setSalesCollectInv(null)} sx={{ fontFamily: "var(--font-cairo)" }}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSalesCollect}
            disabled={salesCollectSaving || !salesCollectInv || salesCollectAmount <= 0 || !salesCollectVaultId?.trim()}
            sx={{ fontFamily: "var(--font-cairo)" }}
          >
            {salesCollectSaving ? "جاري الحفظ…" : "تسجيل التحصيل"}
          </Button>
        </DialogActions>
      </Dialog>
    </NAdminShell>
  );
}
