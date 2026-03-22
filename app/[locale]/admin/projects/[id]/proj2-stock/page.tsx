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

  // Filters
  const [period, setPeriod]       = useState<"month"|"year"|"all">("month");
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");
  const [typeFilter, setTypeFilter] = useState<"all"|"in"|"out">("all");

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

  // Filter movements by date and type
  const filteredMovements = movements
    .filter(m => {
      if (typeFilter !== "all" && m.type !== typeFilter) return false;
      if (!m.movement_date) return true;
      const d = new Date(m.movement_date);
      if (isNaN(d.getTime())) return true;
      const now = new Date();
      if (dateFrom) { const f = new Date(dateFrom); if (d < f) return false; }
      if (dateTo)   { const t = new Date(dateTo); t.setHours(23,59,59); if (d > t) return false; }
      if (dateFrom || dateTo) return true;
      if (period === "month") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      if (period === "year")  return d.getFullYear() === now.getFullYear();
      return true;
    })
    .sort((a, b) => new Date(b.movement_date || 0).getTime() - new Date(a.movement_date || 0).getTime());

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
              {/* Filters row */}
              <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap", alignItems: "center", direction: "rtl" }}>
                {(["month", "year", "all"] as const).map(p => (
                  <button key={p} onClick={() => { setPeriod(p); setDateFrom(""); setDateTo(""); }}
                    style={{ padding: "5px 16px", borderRadius: "20px", fontSize: "12px", fontFamily: "var(--font-cairo)", cursor: "pointer", border: "none", fontWeight: 600, transition: "all 0.15s",
                      background: period === p && !dateFrom && !dateTo ? "linear-gradient(135deg,#8b5cf6,#6d28d9)" : "rgba(30,41,59,0.8)",
                      color: period === p && !dateFrom && !dateTo ? "#fff" : "#94a3b8",
                      outline: period === p && !dateFrom && !dateTo ? "none" : "1px solid rgba(148,163,184,0.15)" }}>
                    {p === "month" ? "الشهر الحالي" : p === "year" ? "السنة الحالية" : "الكل"}
                  </button>
                ))}
                {/* Type filter */}
                {(["all", "in", "out"] as const).map(t => (
                  <button key={t} onClick={() => setTypeFilter(t)}
                    style={{ padding: "5px 14px", borderRadius: "20px", fontSize: "11px", fontFamily: "var(--font-cairo)", cursor: "pointer", border: "none", fontWeight: 600, transition: "all 0.15s",
                      background: typeFilter === t ? (t === "in" ? "rgba(16,185,129,0.25)" : t === "out" ? "rgba(239,68,68,0.25)" : "rgba(100,116,139,0.35)") : "rgba(30,41,59,0.8)",
                      color: typeFilter === t ? (t === "in" ? "#34d399" : t === "out" ? "#f87171" : "#94a3b8") : "#64748b",
                      outline: typeFilter === t ? (t === "in" ? "1px solid rgba(52,211,153,0.4)" : t === "out" ? "1px solid rgba(248,113,113,0.4)" : "1px solid rgba(148,163,184,0.3)") : "1px solid rgba(148,163,184,0.15)" }}>
                    {t === "all" ? "الكل" : t === "in" ? "▼ دخول" : "▲ خروج"}
                  </button>
                ))}
                {/* Date range */}
                <div style={{ display: "flex", gap: "4px", alignItems: "center", background: (dateFrom||dateTo) ? "rgba(139,92,246,0.1)" : "rgba(30,41,59,0.6)", borderRadius: "10px", padding: "2px 7px", outline: (dateFrom||dateTo) ? "1px solid rgba(139,92,246,0.35)" : "1px solid rgba(148,163,184,0.12)" }}>
                  <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>من</span>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "11px", fontFamily: "monospace", width: "110px", cursor: "pointer", colorScheme: "dark" }} />
                  <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "var(--font-cairo)" }}>إلى</span>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "11px", fontFamily: "monospace", width: "110px", cursor: "pointer", colorScheme: "dark" }} />
                  {(dateFrom||dateTo) && <button onClick={() => { setDateFrom(""); setDateTo(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", fontSize: "13px", lineHeight: 1, padding: "0 2px" }}>✕</button>}
                </div>
                <span style={{ fontSize: "10px", color: "#475569", fontFamily: "var(--font-cairo)" }}>{filteredMovements.length} حركة</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {filteredMovements.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#475569", fontFamily: "var(--font-cairo)", fontSize: "14px", padding: "28px 0" }}>لا توجد حركات في هذه الفترة</p>
                ) : filteredMovements.map(m => (
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
