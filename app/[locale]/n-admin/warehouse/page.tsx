"use client";

import { useState, useEffect } from "react";
import NAdminShell from "../components/NAdminShell";
import { RecordList, RecordCard, PageHeader, EmptyState } from "../components";
import { getStockByProduct } from "@/databases/sales-operations/collections/stock_movements";
import { getAllProducts } from "@/databases/sales-operations/collections/products";
import type { SalesUser } from "@/databases/sales-operations/types";
import type { Product, ProductUnit } from "@/databases/sales-operations/types";

const unitLabel = (u: ProductUnit) => (u === "sqm" ? "متر مربع" : "متر طولي");

export default function WarehousePage() {
  const [user, setUser] = useState<SalesUser | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<Record<string, { quantity: number; unit: ProductUnit }>>({});
  const [loading, setLoading] = useState(true);

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
    Promise.all([getAllProducts(), getStockByProduct()])
      .then(([prods, st]) => {
        setProducts(prods);
        setStock(st);
      })
      .catch(() => {
        setProducts([]);
        setStock({});
      })
      .finally(() => setLoading(false));
  };

  const rows = products
    .map((p) => ({
      product: p,
      quantity: stock[p.id]?.quantity ?? 0,
      unit: stock[p.id]?.unit ?? p.unit,
    }))
    .filter((r) => r.quantity > 0)
    .sort((a, b) => a.product.nameAr.localeCompare(b.product.nameAr));

  if (!user) return null;

  return (
    <NAdminShell>
      <PageHeader title="المخزون" />

      <RecordList loading={loading}>
        {!loading && rows.length === 0 && (
          <EmptyState
            title="لا يوجد مخزون"
            subtitle="أضف فاتورة شراء من صفحة فواتير الشراء ثم اضغط إضافة للمخزن"
          />
        )}
        {!loading &&
          rows.map((r) => (
            <RecordCard
              key={r.product.id}
              title={r.product.nameAr}
              subtitle={`${r.quantity.toLocaleString("en-US")} ${unitLabel(r.unit)}`}
            />
          ))}
      </RecordList>
    </NAdminShell>
  );
}
