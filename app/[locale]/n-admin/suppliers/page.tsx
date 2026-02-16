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
import { getAllSuppliers, createSupplier, updateSupplier } from "@/databases/sales-operations/collections/suppliers";
import { getAllPurchaseInvoices, updatePurchaseInvoice } from "@/databases/sales-operations/collections/purchase_invoices";
import { getAllVaults, getVaultsByUser } from "@/databases/sales-operations/collections/vaults";
import { createActivityLogEntry } from "@/databases/sales-operations/collections/activity_log";
import { RecordList, RecordCard, PageHeader, EmptyState, MobileFriendlySelect } from "../components";
import type { SalesUser } from "@/databases/sales-operations/types";
import type { Supplier } from "@/databases/sales-operations/types";
import type { PurchaseInvoice } from "@/databases/sales-operations/types";
import type { Vault } from "@/databases/sales-operations/types";

/** Egyptian mobile: 11 digits, 01 then operator (0,1,2,5) then 8 digits */
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

export default function SuppliersPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [user, setUser] = useState<SalesUser | null>(null);
  const [items, setItems] = useState<Supplier[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [reportSupplier, setReportSupplier] = useState<Supplier | null>(null);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [payInv, setPayInv] = useState<PurchaseInvoice | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payVaultId, setPayVaultId] = useState("");
  const [paySaving, setPaySaving] = useState(false);
  const [form, setForm] = useState({
    nameAr: "",
    nameEn: "",
    contact: "",
    notes: "",
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
        u.pageAccess?.some((a: { pageId: string }) => a.pageId === "suppliers");
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

  const handlePay = async () => {
    if (!payInv || payAmount <= 0 || !payVaultId.trim()) return;
    const paid = payInv.amountPaid ?? 0;
    const remaining = Math.max(0, payInv.totalAmount - paid);
    const amount = Math.min(payAmount, remaining);
    setPaySaving(true);
    try {
      await updatePurchaseInvoice(payInv.id, {
        amountPaid: paid + amount,
        paidFromVaultId: payVaultId.trim(),
      });
      const vaultName = vaults.find((v) => v.id === payVaultId.trim())?.name ?? payVaultId;
      await createActivityLogEntry({
        type: "payment",
        amount,
        vaultId: payVaultId.trim(),
        ref: `دفع ${amount.toLocaleString("en-US")} ج.م لفاتورة ${payInv.invoiceNumber ?? payInv.id} — ${payInv.supplierName} — من حساب ${vaultName}`,
        createdBy: user?.id,
      });
      setPayInv(null);
      setPayAmount(0);
      setPayVaultId("");
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setPaySaving(false);
    }
  };

  const loadData = () => {
    setLoading(true);
    Promise.all([getAllSuppliers(), getAllPurchaseInvoices()])
      .then(([suppliers, invoices]) => {
        setItems(suppliers);
        setPurchaseInvoices(invoices);
      })
      .catch(() => {
        setItems([]);
        setPurchaseInvoices([]);
      })
      .finally(() => setLoading(false));
  };

  const getSupplierStats = (supplierId: string) => {
    const invs = purchaseInvoices.filter((inv) => inv.supplierId === supplierId);
    const notFullyPaidCount = invs.filter((i) => (i.amountPaid ?? 0) < i.totalAmount).length;
    const remainingToPay = invs.reduce((sum, i) => sum + Math.max(0, i.totalAmount - (i.amountPaid ?? 0)), 0);
    return { invoiceCount: invs.length, notFullyPaidCount, remainingToPay, invoices: invs };
  };

  const openAdd = () => {
    setEditing(null);
    setForm({
      nameAr: "",
      nameEn: "",
      contact: "",
      notes: "",
      order: items.length,
      active: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      nameAr: s.nameAr,
      nameEn: s.nameEn ?? "",
      contact: s.contact ?? "",
      notes: s.notes ?? "",
      order: s.order,
      active: s.active,
    });
    setDialogOpen(true);
  };

  const contactError = form.contact.trim() ? validateEgyptianPhone(form.contact) : null;
  const contactNormalized = form.contact.trim() ? normalizeEgyptianPhone(form.contact) : "";

  const handleSave = async () => {
    if (!form.nameAr.trim()) return;
    if (form.contact.trim() && contactError) return;
    try {
      const payload = {
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim() || undefined,
        contact: contactNormalized || undefined,
        notes: form.notes.trim() || undefined,
        order: form.order,
        active: form.active,
        ...(editing ? { updatedBy: user?.id } : { createdBy: user?.id }),
      };
      if (editing) {
        await updateSupplier(editing.id, payload);
      } else {
        await createSupplier(payload);
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  /** Stored as 01xxxxxxxxx (no international code); build tel: for dialer */
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
        title="الموردين"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} size="small" sx={{ fontFamily: "var(--font-cairo)" }}>
            إضافة مورد
          </Button>
        }
      />

      <RecordList loading={loading}>
        {!loading && items.length === 0 && (
          <EmptyState title="لا يوجد موردين" subtitle="أضف موردين ثم اخترهم في فواتير الشراء" />
        )}
        {!loading &&
          items.map((item) => (
            <RecordCard
              key={item.id}
              title={item.nameAr}
              subtitle={item.nameEn ? [item.nameEn, item.contact].filter(Boolean).join(" • ") : item.contact || undefined}
              meta={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                  {(() => {
                    const st = getSupplierStats(item.id);
                    return (
                      <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", color: "text.secondary" }}>
                        إجمالي الفواتير: {st.invoiceCount} • غير مسددة: {st.notFullyPaidCount} • مستحق الدفع: {st.remainingToPay.toLocaleString("en-US")} ج.م
                      </Typography>
                    );
                  })()}
                  <Button
                    size="small"
                    startIcon={<AssessmentIcon />}
                    onClick={(ev) => { ev.stopPropagation(); setReportSupplier(item); }}
                    sx={{ fontFamily: "var(--font-cairo)", fontSize: "0.75rem" }}
                  >
                    التفاصيل
                  </Button>
                  {item.contact && toTelHref(item.contact) && (
                    <Button
                      component="a"
                      href={toTelHref(item.contact)}
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
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>{editing ? "تعديل مورد" : "إضافة مورد"}</DialogTitle>
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
              label="رقم الهاتف (مصر فقط، بدون كود دولي)"
              value={form.contact}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                const normalized = normalizeEgyptianPhone(digits.length > 11 ? digits.slice(0, 12) : digits);
                setForm((f) => ({ ...f, contact: normalized }));
              }}
              onBlur={() => {
                if (form.contact.trim() && !validateEgyptianPhone(form.contact)) {
                  setForm((f) => ({ ...f, contact: normalizeEgyptianPhone(form.contact) }));
                }
              }}
              fullWidth
              type="tel"
              inputMode="tel"
              error={!!contactError}
              helperText={contactError}
              inputProps={{ dir: "ltr", inputMode: "tel", placeholder: "01xxxxxxxxx (11 رقم)", maxLength: 11 }}
              InputLabelProps={{ style: { textAlign: "right" } }}
              sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)" } }}
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
          <Button variant="contained" onClick={handleSave} disabled={!form.nameAr.trim() || !!contactError} sx={{ fontFamily: "var(--font-cairo)" }}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!reportSupplier}
        onClose={() => setReportSupplier(null)}
        dir="rtl"
        fullWidth
        maxWidth="md"
        fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2, direction: "rtl", textAlign: "right", maxHeight: "90vh", display: "flex", flexDirection: "column" } }}
      >
        {reportSupplier && (
          <>
            <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right", fontSize: isMobile ? "1rem" : undefined, py: isMobile ? 1.5 : 2 }}>
              تقرير المورد — {reportSupplier.nameAr}
            </DialogTitle>
            <DialogContent sx={{ overflow: "auto", flex: 1, px: isMobile ? 2 : 3, pb: 2 }}>
              {(() => {
                const st = getSupplierStats(reportSupplier.id);
                return (
                  <Box sx={{ mb: 2, p: 1.5, bgcolor: "grey.50", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                    <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)", color: "text.secondary" }}>
                      إجمالي الفواتير: {st.invoiceCount} • غير مسددة: {st.notFullyPaidCount} • مستحق الدفع: {st.remainingToPay.toLocaleString("en-US")} ج.م
                    </Typography>
                  </Box>
                );
              })()}
              {(() => {
                const invs = getSupplierStats(reportSupplier.id).invoices;
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
                                الإجمالي: {inv.totalAmount.toLocaleString("en-US")} ج.م • المدفوع: {paid.toLocaleString("en-US")} ج.م • المتبقي: {remaining.toLocaleString("en-US")} ج.م
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
                                    setPayInv(inv);
                                    setPayAmount(0);
                                    setPayVaultId(inv.paidFromVaultId ?? (vaults[0]?.id ?? ""));
                                  }}
                                  sx={{ fontFamily: "var(--font-cairo)", mt: 1, alignSelf: "flex-start" }}
                                >
                                  دفع
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
                        <TableCell sx={{ fontWeight: 600 }}>المدفوع</TableCell>
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
                                    setPayInv(inv);
                                    setPayAmount(0);
                                    setPayVaultId(inv.paidFromVaultId ?? (vaults[0]?.id ?? ""));
                                  }}
                                  sx={{ fontFamily: "var(--font-cairo)" }}
                                >
                                  دفع
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
              <Button onClick={() => setReportSupplier(null)} sx={{ fontFamily: "var(--font-cairo)" }}>إغلاق</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={!!payInv} onClose={() => !paySaving && setPayInv(null)} dir="rtl" fullWidth maxWidth="xs" fullScreen={isMobile} PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2, direction: "rtl" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}>دفع لمورد</DialogTitle>
        <DialogContent sx={{ textAlign: "right" }}>
          {payInv && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "var(--font-cairo)" }}>
                {payInv.invoiceNumber ?? payInv.id} — متبقي {Math.max(0, payInv.totalAmount - (payInv.amountPaid ?? 0)).toLocaleString("en-US")} ج.م
              </Typography>
              <TextField
                label="مبلغ الدفع (ج.م)"
                type="number"
                value={payAmount === 0 ? "" : payAmount}
                onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                fullWidth
                size="small"
                inputProps={{ min: 0, max: Math.max(0, payInv.totalAmount - (payInv.amountPaid ?? 0)), step: 0.01, inputMode: "decimal" }}
                InputLabelProps={{ style: { textAlign: "right" } }}
                sx={{ "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}
              />
              <MobileFriendlySelect
                label="الدفع من حساب"
                options={vaults.map((v) => ({ value: v.id, label: v.name }))}
                value={payVaultId}
                onChange={setPayVaultId}
                fullWidth
                size="small"
                sx={{ fontFamily: "var(--font-cairo)", textAlign: "right" }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ direction: "rtl", justifyContent: "flex-start" }}>
          <Button onClick={() => !paySaving && setPayInv(null)} sx={{ fontFamily: "var(--font-cairo)" }}>إلغاء</Button>
          <Button variant="contained" onClick={handlePay} disabled={paySaving || !payInv || payAmount <= 0 || !payVaultId.trim()} sx={{ fontFamily: "var(--font-cairo)" }}>
            {paySaving ? "جاري الحفظ…" : "تسجيل الدفع"}
          </Button>
        </DialogActions>
      </Dialog>
    </NAdminShell>
  );
}
