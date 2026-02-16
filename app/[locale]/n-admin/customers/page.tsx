"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
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
import PhoneIcon from "@mui/icons-material/Phone";
import NAdminShell from "../components/NAdminShell";
import { RecordList, RecordCard, PageHeader, EmptyState, MobileFriendlySelect } from "../components";
import { getAllCustomers, createCustomer, updateCustomer } from "@/databases/sales-operations/collections/customers";
import { getAllSalesInvoices, updateSalesInvoice } from "@/databases/sales-operations/collections/sales_invoices";
import { getAllVaults, getVaultsByUser } from "@/databases/sales-operations/collections/vaults";
import { createActivityLogEntry } from "@/databases/sales-operations/collections/activity_log";
import type { SalesUser } from "@/databases/sales-operations/types";
import type { Customer, CustomerStage } from "@/databases/sales-operations/types";
import type { SalesInvoice } from "@/databases/sales-operations/types";
import type { Vault } from "@/databases/sales-operations/types";

const STAGE_LABELS: Record<CustomerStage, string> = {
  lead: "ليد",
  measures_taken: "تم أخذ المقاسات",
  deposit_taken: "تم استلام العربون",
  done: "منتهي",
};

const EGYPTIAN_MOBILE_REGEX = /^01[0125]\d{8}$/;

function normalizeEgyptianPhone(value: string): string {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("01")) return digits;
  if (digits.length === 10 && digits.startsWith("1")) return "0" + digits;
  if (digits.length === 12 && digits.startsWith("20")) return "0" + digits.slice(2);
  if (digits.length === 10 && !digits.startsWith("0")) return "0" + digits;
  return digits.slice(0, 11);
}

function validateEgyptianPhone(value: string): string | null {
  if (!value || !value.trim()) return null;
  const normalized = normalizeEgyptianPhone(value.trim());
  if (normalized.length !== 11) return "رقم مصري: 11 رقم (مثال: 01234567890)";
  if (!EGYPTIAN_MOBILE_REGEX.test(normalized)) return "رقم مصري يبدأ بـ 010 أو 011 أو 012 أو 015";
  return null;
}

export default function CustomersPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [user, setUser] = useState<SalesUser | null>(null);
  const [items, setItems] = useState<Customer[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [reportCustomer, setReportCustomer] = useState<Customer | null>(null);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [collectInv, setCollectInv] = useState<SalesInvoice | null>(null);
  const [collectAmount, setCollectAmount] = useState(0);
  const [collectVaultId, setCollectVaultId] = useState("");
  const [collectSaving, setCollectSaving] = useState(false);
  const [form, setForm] = useState({
    nameAr: "",
    nameEn: "",
    phone: "",
    notes: "",
    stage: "lead" as CustomerStage,
    order: 0,
    active: true,
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
        u.pageAccess?.some((a: { pageId: string }) => a.pageId === "customers");
      if (!canAccess) {
        window.location.href = "/n-admin/dashboard";
        return;
      }
    } catch {
      window.location.href = "/n-admin";
      return;
    }
    loadData();
    const loadVaults = () => {
      try {
        const u = JSON.parse(sessionStorage.getItem("n_admin_user") ?? "null");
        if (u?.role === "super_admin" || u?.role === "admin")
          getAllVaults().then((list) => setVaults(list.filter((v) => v.active))).catch(() => setVaults([]));
        else if (u?.id)
          getVaultsByUser(u.id).then((list) => setVaults(list.filter((v) => v.active))).catch(() => setVaults([]));
        else setVaults([]);
      } catch {
        setVaults([]);
      }
    };
    loadVaults();
  }, []);

  const loadData = () => {
    setLoading(true);
    Promise.all([getAllCustomers(), getAllSalesInvoices()])
      .then(([customers, invoices]) => {
        setItems(customers);
        setSalesInvoices(invoices);
      })
      .catch(() => {
        setItems([]);
        setSalesInvoices([]);
      })
      .finally(() => setLoading(false));
  };

  const getCustomerStats = (customerId: string) => {
    const invs = salesInvoices.filter((inv) => inv.customerId === customerId);
    const notFullyPaidCount = invs.filter((i) => (i.amountPaid ?? 0) < i.totalAmount).length;
    const remainingToCollect = invs.reduce((sum, i) => sum + Math.max(0, i.totalAmount - (i.amountPaid ?? 0)), 0);
    return { invoiceCount: invs.length, notFullyPaidCount, remainingToCollect, invoices: invs };
  };

  const openAdd = () => {
    setEditing(null);
    setForm({
      nameAr: "",
      nameEn: "",
      phone: "",
      notes: "",
      stage: "lead",
      order: items.length,
      active: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      nameAr: c.nameAr,
      nameEn: c.nameEn ?? "",
      phone: c.phone ?? "",
      notes: c.notes ?? "",
      stage: c.stage ?? "lead",
      order: c.order,
      active: c.active,
    });
    setDialogOpen(true);
  };

  const phoneError = form.phone.trim() ? validateEgyptianPhone(form.phone) : null;
  const phoneNormalized = form.phone.trim() ? normalizeEgyptianPhone(form.phone) : "";

  const handleSave = async () => {
    if (!form.nameAr.trim()) return;
    if (form.phone.trim() && phoneError) return;
    try {
      const payload = {
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim() || undefined,
        phone: phoneNormalized || undefined,
        notes: form.notes.trim() || undefined,
        stage: form.stage,
        order: form.order,
        active: form.active,
        ...(editing ? { updatedBy: user?.id } : { createdBy: user?.id }),
      };
      if (editing) {
        await updateCustomer(editing.id, payload);
      } else {
        await createCustomer(payload);
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCollect = async () => {
    if (!collectInv || collectAmount <= 0 || !collectVaultId.trim()) return;
    const paid = collectInv.amountPaid ?? 0;
    const remaining = Math.max(0, collectInv.totalAmount - paid);
    const amount = Math.min(collectAmount, remaining);
    setCollectSaving(true);
    try {
      await updateSalesInvoice(collectInv.id, {
        amountPaid: paid + amount,
        paidToVaultId: collectVaultId.trim(),
      });
      const vaultName = vaults.find((v) => v.id === collectVaultId.trim())?.name ?? collectVaultId;
      await createActivityLogEntry({
        type: "collection",
        amount,
        vaultId: collectVaultId.trim(),
        ref: `تحصيل ${amount.toLocaleString("en-US")} ج.م من فاتورة ${collectInv.invoiceNumber ?? collectInv.id} — ${collectInv.customerName} — إيداع في ${vaultName}`,
        createdBy: user?.id,
      });
      setCollectInv(null);
      setCollectAmount(0);
      setCollectVaultId("");
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setCollectSaving(false);
    }
  };

  const toTelHref = (raw: string) => {
    const digits = (raw || "").replace(/\D/g, "");
    if (digits.length < 10) return "";
    if (digits.startsWith("01") && digits.length === 11) return `tel:+20${digits.slice(1)}`;
    if (digits.startsWith("20") && digits.length === 12) return `tel:+${digits}`;
    return `tel:+20${digits}`;
  };

  if (!user) return null;

  return (
    <NAdminShell>
      <PageHeader
        title="العملاء"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} size="small" sx={{ fontFamily: "var(--font-cairo)" }}>
            إضافة عميل
          </Button>
        }
      />

      <RecordList loading={loading}>
        {!loading && items.length === 0 && (
          <EmptyState title="لا يوجد عملاء" subtitle="أضف عملاء ثم اخترهم في فواتير المبيعات" />
        )}
        {!loading &&
          items.map((item) => (
            <RecordCard
              key={item.id}
              title={item.nameAr}
              subtitle={item.nameEn ? [item.nameEn, item.phone].filter(Boolean).join(" • ") : item.phone || undefined}
              meta={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                  {(() => {
                    const st = getCustomerStats(item.id);
                    return (
                      <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", color: "text.secondary" }}>
                        إجمالي الفواتير: {st.invoiceCount} • غير مسددة: {st.notFullyPaidCount} • مستحق التحصيل: {st.remainingToCollect.toLocaleString("en-US")} ج.م
                      </Typography>
                    );
                  })()}
                  <Button
                    size="small"
                    startIcon={<AssessmentIcon />}
                    onClick={(ev) => { ev.stopPropagation(); setReportCustomer(item); }}
                    sx={{ fontFamily: "var(--font-cairo)", fontSize: "0.75rem" }}
                  >
                    التفاصيل
                  </Button>
                  {item.phone && toTelHref(item.phone) && (
                    <Button
                      component="a"
                      href={toTelHref(item.phone)}
                      size="small"
                      startIcon={<PhoneIcon sx={{ fontSize: 18 }} />}
                      sx={{ fontFamily: "var(--font-cairo)", fontSize: "0.75rem", minWidth: "auto", px: 1 }}
                    >
                      اتصال
                    </Button>
                  )}
                </Box>
              }
              action={
                <IconButton
                  size="small"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    openEdit(item);
                  }}
                  sx={{ bgcolor: "grey.100", "&:hover": { bgcolor: "grey.200" } }}
                >
                  <EditIcon sx={{ fontSize: 18 }} />
                </IconButton>
              }
            />
          ))}
      </RecordList>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} dir="rtl" PaperProps={{ sx: { borderRadius: 2, direction: "rtl", textAlign: "right", maxHeight: "90vh" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>{editing ? "تعديل عميل" : "إضافة عميل"}</DialogTitle>
        <DialogContent sx={{ textAlign: "right" }}>
          <Box dir="rtl" sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label="الاسم (عربي)"
              value={form.nameAr}
              onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
              fullWidth
              required
              inputProps={{ dir: "rtl" }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
            />
            <TextField
              label="الاسم (إنجليزي)"
              value={form.nameEn}
              onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
              fullWidth
              inputProps={{ dir: "ltr" }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)" } }}
            />
            <TextField
              label="رقم الهاتف (مصر فقط)"
              value={form.phone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                const normalized = normalizeEgyptianPhone(digits.length > 11 ? digits.slice(0, 12) : digits);
                setForm((f) => ({ ...f, phone: normalized }));
              }}
              onBlur={() => {
                if (form.phone.trim() && !validateEgyptianPhone(form.phone)) {
                  setForm((f) => ({ ...f, phone: normalizeEgyptianPhone(form.phone) }));
                }
              }}
              fullWidth
              type="tel"
              error={!!phoneError}
              helperText={phoneError}
              inputProps={{ dir: "ltr", inputMode: "tel", placeholder: "01xxxxxxxxx (11 رقم)", maxLength: 11 }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)" } }}
            />
            <MobileFriendlySelect
              label="المرحلة"
              options={[
                { value: "lead", label: STAGE_LABELS.lead },
                { value: "measures_taken", label: STAGE_LABELS.measures_taken },
                { value: "deposit_taken", label: STAGE_LABELS.deposit_taken },
                { value: "done", label: STAGE_LABELS.done },
              ]}
              value={form.stage}
              onChange={(v) => setForm((f) => ({ ...f, stage: v as CustomerStage }))}
              fullWidth
              size="small"
              sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}
            />
            <TextField
              label="ملاحظات"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              fullWidth
              multiline
              rows={2}
              inputProps={{ dir: "rtl" }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
            />
            <TextField
              label="ترتيب العرض"
              type="number"
              value={form.order}
              onChange={(e) => setForm((f) => ({ ...f, order: parseInt(e.target.value, 10) || 0 }))}
              fullWidth
              size="small"
              inputProps={{ min: 0, inputMode: "numeric", dir: "rtl" }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
            />
            <FormControlLabel
              control={<Switch checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />}
              label="مفعّل"
              sx={{ "& .MuiFormControlLabel-label": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ direction: "rtl", justifyContent: "flex-start" }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ fontFamily: "var(--font-cairo)" }}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.nameAr.trim() || !!phoneError} sx={{ fontFamily: "var(--font-cairo)" }}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!reportCustomer}
        onClose={() => setReportCustomer(null)}
        dir="rtl"
        fullWidth
        maxWidth="md"
        fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2, direction: "rtl", textAlign: "right", maxHeight: "90vh", display: "flex", flexDirection: "column" } }}
      >
        {reportCustomer && (
          <>
            <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", fontSize: isMobile ? "1rem" : undefined, py: isMobile ? 1.5 : 2 }}>
              تقرير العميل — {reportCustomer.nameAr}
            </DialogTitle>
            <DialogContent sx={{ overflow: "auto", flex: 1, px: isMobile ? 2 : 3, pb: 2 }}>
              {(() => {
                const st = getCustomerStats(reportCustomer.id);
                return (
                  <Box sx={{ mb: 2, p: 1.5, bgcolor: "grey.50", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                    <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", color: "text.secondary", mb: 0.5 }}>
                      المرحلة: {STAGE_LABELS[reportCustomer.stage ?? "lead"]}
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", color: "text.secondary" }}>
                      إجمالي الفواتير: {st.invoiceCount} • غير مسددة: {st.notFullyPaidCount} • مستحق التحصيل: {st.remainingToCollect.toLocaleString("en-US")} ج.م
                    </Typography>
                  </Box>
                );
              })()}
              {(() => {
                const invs = getCustomerStats(reportCustomer.id).invoices;
                const formatDate = (ts: number) => new Date(ts).toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit", year: "numeric" });
                if (invs.length === 0) {
                  return <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", color: "text.secondary" }}>لا توجد فواتير</Typography>;
                }
                if (isMobile) {
                  return (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      {invs.map((inv) => {
                        const paid = inv.amountPaid ?? 0;
                        const remaining = Math.max(0, inv.totalAmount - paid);
                        return (
                          <Box
                            key={inv.id}
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              border: "1px solid",
                              borderColor: "divider",
                              bgcolor: "background.paper",
                            }}
                          >
                            <Typography variant="subtitle2" sx={{ fontFamily: "var(--font-cairo)", fontWeight: 600, mb: 1 }}>
                              {inv.invoiceNumber ?? inv.id}
                            </Typography>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                              <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", color: "text.secondary" }}>
                                التاريخ: {formatDate(inv.invoiceDate)}
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)" }}>
                                الإجمالي: {inv.totalAmount.toLocaleString("en-US")} ج.م • المحصل: {paid.toLocaleString("en-US")} ج.م • المتبقي: {remaining.toLocaleString("en-US")} ج.م
                              </Typography>
                              <Typography variant="caption" sx={{ fontFamily: "var(--font-cairo)", color: "text.secondary" }}>
                                الحالة: {inv.status === "draft" ? "مسودة" : "منتهية"}
                              </Typography>
                              {remaining > 0 && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  onClick={() => {
                                    setCollectInv(inv);
                                    setCollectAmount(0);
                                    setCollectVaultId(inv.paidToVaultId ?? (vaults[0]?.id ?? ""));
                                  }}
                                  sx={{ fontFamily: "var(--font-cairo)", mt: 1, alignSelf: "flex-start" }}
                                >
                                  تحصيل
                                </Button>
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  );
                }
                return (
                  <Table size="small" sx={{ "& td, & th": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>رقم الفاتورة</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>التاريخ</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>الإجمالي</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>المحصل</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>المتبقي</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>الحالة</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invs.map((inv) => {
                        const paid = inv.amountPaid ?? 0;
                        const remaining = Math.max(0, inv.totalAmount - paid);
                        return (
                          <TableRow key={inv.id}>
                            <TableCell>{inv.invoiceNumber ?? inv.id}</TableCell>
                            <TableCell>{formatDate(inv.invoiceDate)}</TableCell>
                            <TableCell>{inv.totalAmount.toLocaleString("en-US")} ج.م</TableCell>
                            <TableCell>{paid.toLocaleString("en-US")} ج.م</TableCell>
                            <TableCell>{remaining.toLocaleString("en-US")} ج.م</TableCell>
                            <TableCell>{inv.status === "draft" ? "مسودة" : "منتهية"}</TableCell>
                            <TableCell padding="none">
                              {remaining > 0 && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  onClick={() => {
                                    setCollectInv(inv);
                                    setCollectAmount(0);
                                    setCollectVaultId(inv.paidToVaultId ?? (vaults[0]?.id ?? ""));
                                  }}
                                  sx={{ fontFamily: "var(--font-cairo)" }}
                                >
                                  تحصيل
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                );
              })()}
            </DialogContent>
            <DialogActions sx={{ direction: "rtl", justifyContent: "flex-start", px: isMobile ? 2 : 3, pb: 2 }}>
              <Button onClick={() => setReportCustomer(null)} sx={{ fontFamily: "var(--font-cairo)" }}>إغلاق</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={!!collectInv} onClose={() => !collectSaving && setCollectInv(null)} dir="rtl" fullWidth maxWidth="xs" fullScreen={isMobile} PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2, direction: "rtl" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>تحصيل من عميل</DialogTitle>
        <DialogContent sx={{ textAlign: "right" }}>
          {collectInv && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "var(--font-cairo)" }}>
                {collectInv.invoiceNumber ?? collectInv.id} — متبقي {Math.max(0, collectInv.totalAmount - (collectInv.amountPaid ?? 0)).toLocaleString("en-US")} ج.م
              </Typography>
              <TextField
                label="مبلغ التحصيل (ج.م)"
                type="number"
                value={collectAmount === 0 ? "" : collectAmount}
                onChange={(e) => setCollectAmount(parseFloat(e.target.value) || 0)}
                fullWidth
                size="small"
                inputProps={{ min: 0, max: Math.max(0, collectInv.totalAmount - (collectInv.amountPaid ?? 0)), step: 0.01, inputMode: "decimal" }}
                InputLabelProps={{ style: { textAlign: "right" } }}
                sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
              />
              <MobileFriendlySelect
                label="الإيداع في حساب"
                options={vaults.map((v) => ({ value: v.id, label: v.name }))}
                value={collectVaultId}
                onChange={setCollectVaultId}
                fullWidth
                size="small"
                sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ direction: "rtl", justifyContent: "flex-start" }}>
          <Button onClick={() => !collectSaving && setCollectInv(null)} sx={{ fontFamily: "var(--font-cairo)" }}>إلغاء</Button>
          <Button variant="contained" onClick={handleCollect} disabled={collectSaving || !collectInv || collectAmount <= 0 || !collectVaultId.trim()} sx={{ fontFamily: "var(--font-cairo)" }}>
            {collectSaving ? "جاري الحفظ…" : "تسجيل التحصيل"}
          </Button>
        </DialogActions>
      </Dialog>
    </NAdminShell>
  );
}
