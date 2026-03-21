"use client";
import { useState, useEffect, useCallback } from "react";
import { useProject } from "../layout";
import { CircularProgress, Alert, Chip } from "@mui/material";
import { ArrowDownwardOutlined, ArrowUpwardOutlined } from "@mui/icons-material";

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
const fmtU = (n: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtDate = (d: string) => { if (!d) return "—"; const p = d.split("-"); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : d; };

export default function StockPage() {
  const { projectId } = useProject();
  const [movements, setMovements] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const [movRes, expRes, ordRes] = await Promise.all([
      fetch(`/api/erp-auth/projects/${projectId}/proj2-stock`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-expenses`),
      fetch(`/api/erp-auth/projects/${projectId}/proj2-purchases`),
    ]);
    const [md, ed, od] = await Promise.all([movRes.json(), expRes.json(), ordRes.json()]);
    setMovements(md.movements || []);
    setExpenses(ed.expenses || []);
    setOrders(od.orders || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Build item stock summary with cost calculation
  const stockSummary: Record<string, {
    name: string; code: string; unit: string; qty: number;
    totalPurchaseCost: number; totalQtyIn: number;
  }> = {};

  movements.forEach(m => {
    const key = m.item_id;
    if (!key) return;
    if (!stockSummary[key]) stockSummary[key] = { name: m.item?.name || "—", code: m.item?.code || "—", unit: m.item?.unit || "", qty: 0, totalPurchaseCost: 0, totalQtyIn: 0 };
    if (m.type === "in") {
      stockSummary[key].qty += Number(m.quantity);
      stockSummary[key].totalQtyIn += Number(m.quantity);
      // Find unit_price from purchase order items
      const matchedItem = orders.flatMap((o: any) => (o.items || []).map((i: any) => ({ ...i, order_id: o.id })))
        .find((i: any) => i.item_id === key && m.ref_id === i.purchase_order_id || m.notes?.includes(m.ref_id));
      // Use movement's linked order to get unit price
      const linkedOrder = orders.find((o: any) => o.id === m.ref_id);
      if (linkedOrder) {
        const oi = (linkedOrder.items || []).find((i: any) => i.item_id === key);
        if (oi) stockSummary[key].totalPurchaseCost += Number(oi.unit_price) * Number(m.quantity);
      }
    } else {
      stockSummary[key].qty -= Number(m.quantity);
    }
  });

  // Allocate purchase expenses per item
  const purchaseExpenses = expenses.filter(e => e.expense_type === "purchase" && Array.isArray(e.purchase_order_ids) && e.purchase_order_ids.length > 0);
  const itemExpenseCost: Record<string, number> = {};

  purchaseExpenses.forEach(exp => {
    // Find all items in linked orders
    const linkedOrders = orders.filter(o => exp.purchase_order_ids.includes(o.id));
    const allItems = linkedOrders.flatMap((o: any) => (o.items || []).map((i: any) => ({ ...i, orderTotal: o.total_amount })));
    const grandTotal = linkedOrders.reduce((s: number, o: any) => s + Number(o.total_amount), 0);
    if (grandTotal <= 0) return;

    // Distribute expense pro-rata by item value
    allItems.forEach((i: any) => {
      const itemValue = Number(i.unit_price) * Number(i.quantity);
      const share = (itemValue / grandTotal) * Number(exp.amount);
      if (!itemExpenseCost[i.item_id]) itemExpenseCost[i.item_id] = 0;
      itemExpenseCost[i.item_id] += share;
    });
  });


  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>المخزن</h1>
        <p style={{ fontSize: "14px", color: "#64748b", margin: 0, fontFamily: "var(--font-cairo)" }}>أرصدة المخزون وحركة الأصناف</p>
      </div>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(239,68,68,0.1)", color: "#fca5a5", fontFamily: "var(--font-cairo)", direction: "rtl" }}>{error}</Alert>}

      {loading ? <div style={{ textAlign: "center", padding: "60px 0" }}><CircularProgress sx={{ color: "#8b5cf6" }} /></div> : (
        <>
          {/* Stock summary cards */}
          {Object.keys(stockSummary).length > 0 && (
            <div style={{ marginBottom: "28px" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#64748b", fontFamily: "var(--font-cairo)", marginBottom: "12px" }}>أرصدة المخزون الحالية</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px" }}>
                {Object.entries(stockSummary).map(([itemId, s]) => {
                  const avgPurchase = s.totalQtyIn > 0 ? s.totalPurchaseCost / s.totalQtyIn : 0;
                  const expCost = itemExpenseCost[itemId] || 0;
                  const expPerUnit = s.totalQtyIn > 0 ? expCost / s.totalQtyIn : 0;
                  const totalUnitCost = avgPurchase + expPerUnit;
                  return (
                    <div key={itemId} style={{ padding: "16px", borderRadius: "14px", background: "rgba(30,41,59,0.5)", border: `1px solid ${s.qty > 0 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"}` }}>
                      <p style={{ fontSize: "11px", color: "#60a5fa", margin: "0 0 6px", fontFamily: "monospace" }}>{s.code}</p>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9", margin: "0 0 8px", fontFamily: "var(--font-cairo)" }}>{s.name}</p>
                      <p style={{ fontSize: "22px", fontWeight: 700, color: s.qty > 0 ? "#10b981" : "#ef4444", margin: "0 0 8px" }}>
                        {fmt(s.qty)} <span style={{ fontSize: "12px", fontWeight: 400, color: "#64748b" }}>{s.unit}</span>
                      </p>
                      {avgPurchase > 0 && (
                        <div style={{ borderTop: "1px solid rgba(148,163,184,0.08)", paddingTop: "8px", display: "flex", flexDirection: "column", gap: "3px" }}>
                          <p style={{ fontSize: "11px", color: "#64748b", margin: 0, fontFamily: "var(--font-cairo)" }}>
                            سعر الشراء/وحدة: <span style={{ color: "#94a3b8" }}>{fmtU(avgPurchase)} جنيه</span>
                          </p>
                          {expPerUnit > 0 && (
                            <p style={{ fontSize: "11px", color: "#f59e0b", margin: 0, fontFamily: "var(--font-cairo)" }}>
                              مصروفات/وحدة: {fmtU(expPerUnit)} جنيه
                            </p>
                          )}
                          {totalUnitCost > 0 && (
                            <p style={{ fontSize: "12px", fontWeight: 700, color: "#c084fc", margin: "2px 0 0", fontFamily: "var(--font-cairo)" }}>
                              التكلفة الكاملة/وحدة: {fmtU(totalUnitCost)} جنيه
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Movements list */}
          {movements.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px", borderRadius: "20px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
              <p style={{ fontSize: "48px", margin: "0 0 12px" }}>📦</p>
              <p style={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "16px" }}>لا توجد حركات مخزنية بعد</p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#64748b", fontFamily: "var(--font-cairo)", marginBottom: "12px" }}>سجل الحركات</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {movements.map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "14px 16px", borderRadius: "14px", background: "rgba(30,41,59,0.5)", border: "1px solid rgba(148,163,184,0.08)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: m.type === "in" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", flexShrink: 0 }}>
                        {m.type === "in" ? <ArrowDownwardOutlined sx={{ fontSize: 16, color: "#10b981" }} /> : <ArrowUpwardOutlined sx={{ fontSize: 16, color: "#ef4444" }} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9", margin: 0, fontFamily: "var(--font-cairo)" }}>{m.item?.name || "—"}</p>
                        <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0", fontFamily: "var(--font-cairo)" }}>{m.notes || (m.type === "in" ? "دخول" : "خروج")}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: "left", flexShrink: 0 }}>
                      <p style={{ fontSize: "16px", fontWeight: 700, color: m.type === "in" ? "#10b981" : "#ef4444", margin: 0, fontFamily: "var(--font-cairo)" }}>
                        {m.type === "in" ? "+" : "−"}{fmt(m.quantity)} <span style={{ fontSize: "11px", fontWeight: 400, color: "#64748b" }}>{m.item?.unit}</span>
                      </p>
                      <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0", direction: "ltr" }}>{fmtDate(m.movement_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
