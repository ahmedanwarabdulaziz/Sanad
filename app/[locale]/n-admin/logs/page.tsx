"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
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
import NAdminShell from "../components/NAdminShell";
import { PageHeader, RecordList } from "../components";
import { getAllSalesInvoices } from "@/databases/sales-operations/collections/sales_invoices";
import { getAllPurchaseInvoices } from "@/databases/sales-operations/collections/purchase_invoices";
import { getAllExpenses } from "@/databases/sales-operations/collections/expenses";
import { getAllVaultTransfers } from "@/databases/sales-operations/collections/vault_transfers";
import { getAllVaults } from "@/databases/sales-operations/collections/vaults";
import { getActiveExpenseTypes } from "@/databases/sales-operations/collections/expense_types";
import { getAllUsers } from "@/databases/sales-operations/collections/users";
import { getAllActivityLogs } from "@/databases/sales-operations/collections/activity_log";
import type { SalesUser } from "@/databases/sales-operations/types";
import type { ActivityLogEntry } from "@/databases/sales-operations/types";
import type { SalesInvoice } from "@/databases/sales-operations/types";
import type { PurchaseInvoice } from "@/databases/sales-operations/types";
import type { Expense } from "@/databases/sales-operations/types";
import type { VaultTransfer } from "@/databases/sales-operations/types";

type LogEntry = {
  timestamp: number;
  type: "sales" | "purchase" | "expense" | "transfer" | "collection" | "payment" | "expense_payment";
  actionLabel: string;
  description: string;
  userName: string;
};

function getTodayDateString() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function getDateStringDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function LogsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [user, setUser] = useState<SalesUser | null>(null);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transfers, setTransfers] = useState<VaultTransfer[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [vaults, setVaults] = useState<{ id: string; name: string }[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [expenseTypeNames, setExpenseTypeNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(getDateStringDaysAgo(30));
  const [dateTo, setDateTo] = useState(getTodayDateString());

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
        u.pageAccess?.some((a: { pageId: string }) => a.pageId === "logs" || a.pageId === "financial");
      if (!canAccess) {
        window.location.href = "/n-admin/dashboard";
        return;
      }
    } catch {
      window.location.href = "/n-admin";
      return;
    }
    loadData();
    getActiveExpenseTypes().then((list) => setExpenseTypeNames(Object.fromEntries(list.map((e) => [e.id, e.nameAr])))).catch(() => ({}));
  }, []);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getAllSalesInvoices(),
      getAllPurchaseInvoices(),
      getAllExpenses(),
      getAllVaultTransfers(),
      getAllVaults(),
      getAllUsers(),
    ])
      .then(([sales, purch, exps, trans, vList, usersList]) => {
        setSalesInvoices(sales);
        setPurchaseInvoices(purch);
        setExpenses(exps);
        setTransfers(trans);
        setVaults(vList.map((v) => ({ id: v.id, name: v.name })));
        setUserNames(Object.fromEntries(usersList.map((u) => [u.id, u.name])));
      })
      .catch(() => {
        setSalesInvoices([]);
        setPurchaseInvoices([]);
        setExpenses([]);
        setTransfers([]);
        setVaults([]);
        setUserNames({});
      })
      .finally(() => setLoading(false));
    getAllActivityLogs()
      .then(setActivityLogs)
      .catch(() => setActivityLogs([]));
  };

  const entries = useMemo(() => {
    const list: LogEntry[] = [];
    const getVaultName = (id: string) => vaults.find((v) => v.id === id)?.name ?? id;
    const getUserName = (id?: string) => (id && userNames[id] ? userNames[id] : "—");

    salesInvoices.forEach((inv) => {
      list.push({
        timestamp: inv.createdAt,
        type: "sales",
        actionLabel: "فاتورة مبيعات",
        description: `${inv.invoiceNumber ?? inv.id} — ${inv.customerName} — ${inv.totalAmount.toLocaleString("en-US")} ج.م`,
        userName: getUserName(inv.createdBy),
      });
    });
    purchaseInvoices.forEach((inv) => {
      list.push({
        timestamp: inv.createdAt,
        type: "purchase",
        actionLabel: "فاتورة شراء",
        description: `${inv.invoiceNumber ?? inv.id} — ${inv.supplierName} — ${inv.totalAmount.toLocaleString("en-US")} ج.م`,
        userName: getUserName(inv.createdBy),
      });
    });
    expenses.forEach((exp) => {
      const typeName = expenseTypeNames[exp.expenseTypeId] ?? exp.expenseTypeId;
      list.push({
        timestamp: exp.createdAt,
        type: "expense",
        actionLabel: "مصروف",
        description: `${typeName} — ${exp.amount.toLocaleString("en-US")} ج.م${exp.notes ? ` — ${exp.notes}` : ""}`,
        userName: getUserName(exp.createdBy),
      });
    });
    transfers.forEach((t) => {
      list.push({
        timestamp: t.createdAt,
        type: "transfer",
        actionLabel: "تحويل بين الحسابات",
        description: `${getVaultName(t.fromVaultId)} → ${getVaultName(t.toVaultId)} — ${t.amount.toLocaleString("en-US")} ج.م`,
        userName: getUserName(t.createdBy),
      });
    });
    activityLogs.forEach((entry) => {
      const actionLabel =
        entry.type === "collection" ? "تحصيل" : entry.type === "payment" ? "دفع لمورد" : "دفع مصروف";
      const ts = typeof entry.timestamp === "number" && !Number.isNaN(entry.timestamp) ? entry.timestamp : Date.now();
      list.push({
        timestamp: ts,
        type: entry.type,
        actionLabel,
        description: entry.ref ?? "",
        userName: getUserName(entry.createdBy),
      });
    });

    const fromTs = new Date(dateFrom).setHours(0, 0, 0, 0);
    const toTs = new Date(dateTo).setHours(23, 59, 59, 999);
    return list
      .filter((e) => e.timestamp >= fromTs && e.timestamp <= toTs)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [salesInvoices, purchaseInvoices, expenses, transfers, activityLogs, vaults, userNames, expenseTypeNames, dateFrom, dateTo]);

  const formatDateTime = (ts: number) =>
    new Date(ts).toLocaleString("ar-EG", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (!user) return null;

  return (
    <NAdminShell>
      <PageHeader title="سجل العمليات" />

      <Box sx={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 2, mb: 2, alignItems: isMobile ? "stretch" : "flex-end" }}>
        <TextField
          label="من تاريخ"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true, style: { textAlign: "right" } }}
          sx={{ width: isMobile ? "100%" : 160, "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)" } }}
        />
        <TextField
          label="إلى تاريخ"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true, style: { textAlign: "right" } }}
          sx={{ width: isMobile ? "100%" : 160, "& .MuiInputBase-input": { fontFamily: "var(--font-cairo)" } }}
        />
      </Box>

      <RecordList loading={loading}>
        {!loading && entries.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "var(--font-cairo)", py: 3, textAlign: "center" }}>
            لا توجد عمليات في الفترة المحددة
          </Typography>
        )}
        {!loading && entries.length > 0 && (
          isMobile ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {entries.map((e, i) => (
                <Box
                  key={`${e.type}-${e.timestamp}-${i}`}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "var(--font-cairo)", display: "block" }}>
                    {formatDateTime(e.timestamp)}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontFamily: "var(--font-cairo)", fontWeight: 600 }}>
                    {e.actionLabel}
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: "var(--font-cairo)" }}>
                    {e.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "var(--font-cairo)" }}>
                    المستخدم: {e.userName}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Table size="small" sx={{ "& td, & th": { fontFamily: "var(--font-cairo)", textAlign: "right" } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>التاريخ والوقت</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>الإجراء</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>التفاصيل</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>المستخدم</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((e, i) => (
                  <TableRow key={`${e.type}-${e.timestamp}-${i}`}>
                    <TableCell>{formatDateTime(e.timestamp)}</TableCell>
                    <TableCell>{e.actionLabel}</TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell>{e.userName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        )}
      </RecordList>
    </NAdminShell>
  );
}
