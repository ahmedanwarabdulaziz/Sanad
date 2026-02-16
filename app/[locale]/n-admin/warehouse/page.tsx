"use client";

import { useState, useEffect } from "react";
import { Box, Tab, Tabs, Typography } from "@mui/material";
import NAdminShell from "../components/NAdminShell";
import { RecordList, RecordCard, PageHeader, EmptyState } from "../components";
import { getStockByProduct } from "@/databases/sales-operations/collections/stock_movements";
import { getAllProducts } from "@/databases/sales-operations/collections/products";
import { getAllSalesInvoices } from "@/databases/sales-operations/collections/sales_invoices";
import { getItemsBySalesInvoiceId } from "@/databases/sales-operations/collections/sales_invoice_items";
import type { SalesUser } from "@/databases/sales-operations/types";
import type { Product, ProductUnit } from "@/databases/sales-operations/types";

const unitLabel = (u: ProductUnit) => (u === "sqm" ? "متر مربع" : "متر طولي");

export default function WarehousePage() {
  const [user, setUser] = useState<SalesUser | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<Record<string, { quantity: number; unit: ProductUnit }>>({});
  /** Quantity needed by draft sales invoices (not yet released from warehouse). */
  const [neededByProduct, setNeededByProduct] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

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
        u.pageAccess?.some((a: { pageId: string }) => a.pageId === "warehouse");
      if (!canAccess) {
        window.location.href = "/n-admin/dashboard";
        return;
      }
    } catch {
      window.location.href = "/n-admin";
      return;
    }
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    Promise.all([getAllProducts(), getStockByProduct(), getAllSalesInvoices()])
      .then(async ([prods, st, invoices]) => {
        setProducts(prods);
        setStock(st);
        const draftInvoices = invoices.filter((inv) => inv.status === "draft");
        const needed: Record<string, number> = {};
        await Promise.all(
          draftInvoices.map(async (inv) => {
            const items = await getItemsBySalesInvoiceId(inv.id);
            items.forEach((item) => {
              needed[item.productId] = (needed[item.productId] ?? 0) + item.quantity;
            });
          })
        );
        setNeededByProduct(needed);
      })
      .catch(() => {
        setProducts([]);
        setStock({});
        setNeededByProduct({});
      })
      .finally(() => setLoading(false));
  };

  const rows = products
    .map((p) => {
      const available = stock[p.id]?.quantity ?? 0;
      const unit = stock[p.id]?.unit ?? p.unit;
      const needed = neededByProduct[p.id] ?? 0;
      const shortfall = Math.max(0, needed - available);
      return { product: p, available, unit, needed, shortfall };
    })
    .filter((r) => r.available > 0 || r.needed > 0)
    .sort((a, b) => a.product.nameAr.localeCompare(b.product.nameAr));

  const recommendRows = rows.filter((r) => r.shortfall > 0);
  const graniteRows = rows.filter((r) => r.product.materialType === "granite");
  const marbleRows = rows.filter((r) => r.product.materialType === "marble");

  const tabRows = tab === 0 ? recommendRows : tab === 1 ? graniteRows : marbleRows;

  if (!user) return null;

  return (
    <NAdminShell>
      <PageHeader title="المخزون" />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: "divider", mb: 2, "& .MuiTab-root": { fontFamily: "var(--font-cairo)" } }}
      >
        <Tab label={`يُنصح شراء (${recommendRows.length})`} id="warehouse-tab-0" />
        <Tab label={`جرانيت (${graniteRows.length})`} id="warehouse-tab-1" />
        <Tab label={`رخام (${marbleRows.length})`} id="warehouse-tab-2" />
      </Tabs>

      <RecordList loading={loading}>
        {!loading && tabRows.length === 0 && (
          <EmptyState
            title={tab === 0 ? "لا توجد أصناف يُنصح شراؤها" : tab === 1 ? "لا يوجد مخزون جرانيت" : "لا يوجد مخزون رخام"}
            subtitle={tab === 0 ? "لا توجد فواتير بيع (مسودة) تحتاج كميات غير متوفرة" : "أضف فاتورة شراء ثم اضغط إضافة للمخزن"}
          />
        )}
        {!loading &&
          tabRows.map((r) => (
            <RecordCard
              key={r.product.id}
              title={r.product.nameAr}
              subtitle={`المتاح: ${r.available.toLocaleString("en-US")} ${unitLabel(r.unit)}${r.needed > 0 ? ` • مطلوب لفاتورات البيع (لم تُخرج بعد): ${r.needed.toLocaleString("en-US")} ${unitLabel(r.unit)}` : ""}`}
              meta={
                r.shortfall > 0 ? (
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="caption" sx={{ fontFamily: "var(--font-cairo)", color: "warning.main", fontWeight: 600 }}>
                      يُنصح شراء: {r.shortfall.toLocaleString("en-US")} {unitLabel(r.unit)} لسد النقص
                    </Typography>
                  </Box>
                ) : undefined
              }
            />
          ))}
      </RecordList>
    </NAdminShell>
  );
}
