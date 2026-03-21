"use client";

import { useState, useEffect, useCallback } from "react";
import { useProject } from "../layout";
import { CircularProgress, Chip, Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
import { TrendingUpOutlined, TrendingDownOutlined, CloseOutlined, ExpandMoreOutlined, ExpandLessOutlined } from "@mui/icons-material";

interface Expense {
  id: string;
  expense_name: string;
  pricing_type: string;
  company_amount: number;
  investor_amount: number;
  show_to_investors: boolean;
  investor_display_name: string | null;
  stage_id: string;
  stage: { stage_name: string };
}

const formatNumber = (n: number) => new Intl.NumberFormat("en-US").format(n);

function StageAccordion({ stageName, companyTotal, investorTotal, diff, isProfit, children }: {
  stageName: string; companyTotal: number; investorTotal: number; diff: number; isProfit: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
          gap: "8px", padding: "14px 20px", alignItems: "center", direction: "rtl",
          cursor: "pointer", background: "rgba(15,23,42,0.4)",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(15,23,42,0.6)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(15,23,42,0.4)"; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>🏗️</span>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#f1f5f9", fontFamily: "var(--font-cairo)" }}>{stageName}</span>
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#fbbf24", textAlign: "center" }}>{formatNumber(companyTotal)}</span>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#a78bfa", textAlign: "center" }}>{formatNumber(investorTotal)}</span>
        <span style={{ fontSize: "13px", fontWeight: 700, textAlign: "center", color: isProfit ? "#34d399" : "#f87171" }}>{isProfit ? "+" : ""}{formatNumber(diff)}</span>
        {open ? <ExpandLessOutlined sx={{ color: "#64748b", fontSize: 20 }} /> : <ExpandMoreOutlined sx={{ color: "#64748b", fontSize: 20 }} />}
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}

const dialogSx = {
  "& .MuiDialog-paper": {
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    borderRadius: "20px",
    color: "#e2e8f0",
    direction: "rtl" as const,
    minWidth: "min(800px, 92vw)",
    maxHeight: "85vh",
  },
};

export default function FinancialStatusPage() {
  const { projectId } = useProject();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [contracts, setContracts] = useState<{ unit_quantity: number; management_fee_pct: number; stage_id: string; status: string }[]>([]);
  const [projectArea, setProjectArea] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [mgmtDetailOpen, setMgmtDetailOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [expRes, ctRes, projRes] = await Promise.all([
        fetch(`/api/erp-auth/projects/${projectId}/expenses`),
        fetch(`/api/erp-auth/projects/${projectId}/contracts`),
        fetch(`/api/erp-auth/projects/${projectId}`),
      ]);
      const expData = await expRes.json();
      const ctData = await ctRes.json();
      const projData = await projRes.json();
      setExpenses(expData.expenses || []);
      setContracts(ctData.contracts || []);
      setProjectArea(Number(projData.project?.land_area) || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Expense Difference Calculations ──
  const totalCompany = expenses.reduce((s, e) => s + Number(e.company_amount), 0);
  const totalInvestor = expenses.reduce((s, e) => s + Number(e.investor_amount), 0);
  const difference = totalInvestor - totalCompany;
  const isProfit = difference >= 0;

  // ── Management from contracts: each contract’s mgmt_pct × basePricePerMeter × meters ──
  const mgmtAmount = (() => {
    if (projectArea <= 0) return 0;
    // Group investor expenses by stage
    const stageInvTotals: Record<string, number> = {};
    expenses.forEach(e => {
      stageInvTotals[e.stage_id] = (stageInvTotals[e.stage_id] || 0) + Number(e.investor_amount);
    });
    // For each active contract, calculate management contribution
    return contracts
      .filter(c => c.status !== "CANCELLED")
      .reduce((sum, c) => {
        const stageInvTotal = stageInvTotals[c.stage_id] || 0;
        const basePricePerMeter = stageInvTotal / projectArea;
        return sum + c.unit_quantity * basePricePerMeter * (c.management_fee_pct / 100);
      }, 0);
  })();

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>الموقف المالي</h1>
        <p style={{ fontSize: "14px", color: "#64748b", margin: 0, fontFamily: "var(--font-cairo)" }}>ملخص الحالة المالية للمشروع</p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}><CircularProgress sx={{ color: "#3b82f6" }} /></div>
      ) : (
        <div style={{ display: "grid", gap: "20px" }}>

          {/* ══════ Section 1: Expense Difference Card ══════ */}
          <div
            onClick={() => setDetailOpen(true)}
            style={{
              borderRadius: "20px", overflow: "hidden",
              border: "1px solid rgba(148,163,184,0.08)", background: "rgba(30,41,59,0.5)",
              padding: "24px", cursor: "pointer",
              transition: "border-color 0.2s, transform 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.25)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(148,163,184,0.08)"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: isProfit ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isProfit
                  ? <TrendingUpOutlined sx={{ color: "#10b981", fontSize: 22 }} />
                  : <TrendingDownOutlined sx={{ color: "#ef4444", fontSize: 22 }} />
                }
              </div>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: "var(--font-cairo)" }}>فرق المصروفات</h2>
                <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0", fontFamily: "var(--font-cairo)" }}>اضغط لمشاهدة التفاصيل</p>
              </div>
            </div>

            {/* Three Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
              <div style={{ padding: "12px 16px", borderRadius: "14px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
                <p style={{ fontSize: "10px", color: "#94a3b8", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>مبلغ الشركة</p>
                <p style={{ fontSize: "20px", fontWeight: 700, color: "#fbbf24", margin: 0 }}>{formatNumber(totalCompany)}</p>
                <p style={{ fontSize: "10px", color: "#64748b", margin: "2px 0 0" }}>ج.م</p>
              </div>
              <div style={{ padding: "12px 16px", borderRadius: "14px", background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}>
                <p style={{ fontSize: "10px", color: "#94a3b8", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>مبلغ المستثمرين</p>
                <p style={{ fontSize: "20px", fontWeight: 700, color: "#a78bfa", margin: 0 }}>{formatNumber(totalInvestor)}</p>
                <p style={{ fontSize: "10px", color: "#64748b", margin: "2px 0 0" }}>ج.م</p>
              </div>
              <div style={{ padding: "12px 16px", borderRadius: "14px", background: isProfit ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${isProfit ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"}` }}>
                <p style={{ fontSize: "10px", color: "#94a3b8", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>الفرق {isProfit ? "(ربح)" : "(خسارة)"}</p>
                <p style={{ fontSize: "20px", fontWeight: 700, color: isProfit ? "#34d399" : "#f87171", margin: 0 }}>{isProfit ? "+" : ""}{formatNumber(difference)}</p>
                <p style={{ fontSize: "10px", color: "#64748b", margin: "2px 0 0" }}>ج.م</p>
              </div>
            </div>
          </div>

          {/* ══════ Section 2: Management Fee Card ══════ */}
          <div
            onClick={() => setMgmtDetailOpen(true)}
            style={{
              borderRadius: "20px", overflow: "hidden",
              border: "1px solid rgba(148,163,184,0.08)", background: "rgba(30,41,59,0.5)",
              padding: "24px", cursor: "pointer",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(59,130,246,0.25)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(148,163,184,0.08)"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(59,130,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "18px" }}>⚙️</span>
              </div>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: "var(--font-cairo)" }}>نسبة الإدارة والتشغيل</h2>
                <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0", fontFamily: "var(--font-cairo)" }}>اضغط لمشاهدة التفاصيل حسب المرحلة</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
              <div style={{ padding: "12px 16px", borderRadius: "14px", background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}>
                <p style={{ fontSize: "10px", color: "#94a3b8", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>إجمالي مبلغ المستثمرين</p>
                <p style={{ fontSize: "20px", fontWeight: 700, color: "#a78bfa", margin: 0 }}>{formatNumber(totalInvestor)}</p>
                <p style={{ fontSize: "10px", color: "#64748b", margin: "2px 0 0" }}>ج.م</p>
              </div>
              <div style={{ padding: "12px 16px", borderRadius: "14px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}>
                <p style={{ fontSize: "10px", color: "#94a3b8", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>نسبة الإدارة</p>
                <p style={{ fontSize: "20px", fontWeight: 700, color: "#60a5fa", margin: 0 }}>{totalInvestor > 0 ? (mgmtAmount / totalInvestor * 100).toFixed(1) : 0}%</p>
                <p style={{ fontSize: "10px", color: "#64748b", margin: "2px 0 0" }}>من العقود</p>
              </div>
              <div style={{ padding: "12px 16px", borderRadius: "14px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <p style={{ fontSize: "10px", color: "#94a3b8", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>مبلغ الإدارة</p>
                <p style={{ fontSize: "20px", fontWeight: 700, color: "#34d399", margin: 0 }}>{formatNumber(Math.round(mgmtAmount))}</p>
                <p style={{ fontSize: "10px", color: "#64748b", margin: "2px 0 0" }}>ج.م</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ══════ Detail Popup ══════ */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} sx={{ ...dialogSx, "& .MuiDialog-paper": { ...dialogSx["& .MuiDialog-paper"], direction: "rtl" } }} maxWidth={false}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1, direction: "rtl" }}>
          <span>تفاصيل فرق المصروفات</span>
          <IconButton onClick={() => setDetailOpen(false)} sx={{ color: "#94a3b8", "&:hover": { color: "#f1f5f9" } }}>
            <CloseOutlined />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 0, pb: 0 }}>
          {(() => {
            // Group expenses by stage
            const groupMap: Record<string, { stage_name: string; expenses: Expense[]; companyTotal: number; investorTotal: number }> = {};
            expenses.forEach(exp => {
              const key = exp.stage_id || "no-stage";
              if (!groupMap[key]) groupMap[key] = { stage_name: exp.stage?.stage_name || "بدون مرحلة", expenses: [], companyTotal: 0, investorTotal: 0 };
              groupMap[key].expenses.push(exp);
              groupMap[key].companyTotal += Number(exp.company_amount);
              groupMap[key].investorTotal += Number(exp.investor_amount);
            });
            const groups = Object.entries(groupMap);

            return (
              <div>
                {groups.map(([stageId, group]) => {
                  const stageDiff = group.investorTotal - group.companyTotal;
                  const stageProfit = stageDiff >= 0;
                  return (
                    <StageAccordion key={stageId} stageName={group.stage_name} companyTotal={group.companyTotal} investorTotal={group.investorTotal} diff={stageDiff} isProfit={stageProfit}>
                      {/* Table Header */}
                      <div style={{
                        display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr",
                        gap: "8px", padding: "8px 20px", direction: "rtl",
                        fontSize: "10px", fontWeight: 600, color: "#64748b",
                        fontFamily: "var(--font-cairo)", background: "rgba(15,23,42,0.3)",
                      }}>
                        <span>المصروف</span>
                        <span style={{ textAlign: "center" }}>مبلغ الشركة</span>
                        <span style={{ textAlign: "center" }}>مبلغ المستثمرين</span>
                        <span style={{ textAlign: "center" }}>الفرق</span>
                      </div>
                      {group.expenses.map((exp, idx) => {
                        const c = Number(exp.company_amount);
                        const inv = Number(exp.investor_amount);
                        const d = inv - c;
                        return (
                          <div key={exp.id} style={{
                            display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr",
                            gap: "8px", padding: "10px 20px", alignItems: "center", direction: "rtl",
                            background: idx % 2 === 0 ? "transparent" : "rgba(15,23,42,0.15)",
                            borderBottom: "1px solid rgba(148,163,184,0.04)",
                          }}>
                            <div>
                              <span style={{ fontSize: "12px", fontWeight: 600, color: "#e2e8f0", fontFamily: "var(--font-cairo)" }}>{exp.expense_name}</span>
                              <Chip label={exp.pricing_type === "DUAL" ? "سعرين" : "مشترك"} size="small"
                                sx={{ mr: 1, height: "18px", fontSize: "9px", fontWeight: 600, fontFamily: "var(--font-cairo)", backgroundColor: exp.pricing_type === "DUAL" ? "rgba(139,92,246,0.15)" : "rgba(59,130,246,0.15)", color: exp.pricing_type === "DUAL" ? "#a78bfa" : "#60a5fa" }} />
                            </div>
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "#fbbf24", textAlign: "center" }}>{formatNumber(c)}</span>
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "#a78bfa", textAlign: "center" }}>{formatNumber(inv)}</span>
                            <span style={{ fontSize: "12px", fontWeight: 700, textAlign: "center", color: d >= 0 ? "#34d399" : "#f87171" }}>{d >= 0 ? "+" : ""}{formatNumber(d)}</span>
                          </div>
                        );
                      })}
                    </StageAccordion>
                  );
                })}

                {/* Grand Total */}
                <div style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr",
                  gap: "8px", padding: "14px 24px", direction: "rtl",
                  background: "rgba(15,23,42,0.6)", borderTop: "2px solid rgba(148,163,184,0.1)",
                  fontFamily: "var(--font-cairo)", position: "sticky", bottom: 0,
                }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#f1f5f9" }}>الإجمالي الكلي</span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#fbbf24", textAlign: "center" }}>{formatNumber(totalCompany)}</span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#a78bfa", textAlign: "center" }}>{formatNumber(totalInvestor)}</span>
                  <span style={{ fontSize: "14px", fontWeight: 700, textAlign: "center", color: isProfit ? "#34d399" : "#f87171" }}>{isProfit ? "+" : ""}{formatNumber(difference)}</span>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ══════ Management Detail Popup ══════ */}
      <Dialog open={mgmtDetailOpen} onClose={() => setMgmtDetailOpen(false)} sx={{ ...dialogSx, "& .MuiDialog-paper": { ...dialogSx["& .MuiDialog-paper"], direction: "rtl" } }} maxWidth={false}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1, direction: "rtl" }}>
          <span>تفاصيل نسبة الإدارة حسب المرحلة</span>
          <IconButton onClick={() => setMgmtDetailOpen(false)} sx={{ color: "#94a3b8", "&:hover": { color: "#f1f5f9" } }}>
            <CloseOutlined />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 0, pb: 0 }}>
          {/* Table Header */}
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1.2fr",
            gap: "8px", padding: "10px 24px", direction: "rtl",
            fontSize: "11px", fontWeight: 600, color: "#64748b",
            fontFamily: "var(--font-cairo)", background: "rgba(15,23,42,0.4)",
            position: "sticky", top: 0, zIndex: 1,
          }}>
            <span>المرحلة</span>
            <span style={{ textAlign: "center" }}>مصروفات المستثمرين</span>
            <span style={{ textAlign: "center" }}>نسبة الإدارة</span>
            <span style={{ textAlign: "center" }}>مبلغ الإدارة</span>
          </div>

          {/* Contract rows - grouped by stage */}
          {(() => {
            // Group contracts by stage_id
            const stageGroups: Record<string, typeof contracts> = {};
            contracts.filter(c => c.status !== "CANCELLED").forEach(c => {
              if (!stageGroups[c.stage_id]) stageGroups[c.stage_id] = [];
              stageGroups[c.stage_id].push(c);
            });
            const stageInvTotals: Record<string, number> = {};
            expenses.forEach(e => {
              stageInvTotals[e.stage_id] = (stageInvTotals[e.stage_id] || 0) + Number(e.investor_amount);
            });
            return Object.entries(stageGroups).map(([stageId, stageContracts], idx) => {
              const stageInvTotal = stageInvTotals[stageId] || 0;
              const basePPM = projectArea > 0 ? stageInvTotal / projectArea : 0;
              const stageMgmt = stageContracts.reduce((s, c) => s + c.unit_quantity * basePPM * (c.management_fee_pct / 100), 0);
              const stageName = expenses.find(e => e.stage_id === stageId)?.stage?.stage_name || "مرحلة";
              return (
                <div key={stageId} style={{
                  display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1.2fr",
                  gap: "8px", padding: "14px 24px", alignItems: "center", direction: "rtl",
                  background: idx % 2 === 0 ? "transparent" : "rgba(15,23,42,0.2)",
                  borderBottom: "1px solid rgba(148,163,184,0.04)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "16px" }}>🏗️</span>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0", fontFamily: "var(--font-cairo)" }}>{stageName}</span>
                  </div>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#a78bfa", textAlign: "center" }}>{formatNumber(stageInvTotal)}</span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#60a5fa", textAlign: "center" }}>{stageContracts.length > 0 ? stageContracts.map(c => `${c.management_fee_pct}%`).join(", ") : "—"}</span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#34d399", textAlign: "center" }}>{formatNumber(Math.round(stageMgmt))}</span>
                </div>
              );
            });
          })()}

          {/* Total Footer */}
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1.2fr",
            gap: "8px", padding: "14px 24px", direction: "rtl",
            background: "rgba(15,23,42,0.6)", borderTop: "2px solid rgba(148,163,184,0.1)",
            fontFamily: "var(--font-cairo)", position: "sticky", bottom: 0,
          }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#f1f5f9" }}>الإجمالي</span>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#a78bfa", textAlign: "center" }}>{formatNumber(totalInvestor)}</span>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#60a5fa", textAlign: "center" }}>{totalInvestor > 0 ? (mgmtAmount / totalInvestor * 100).toFixed(1) : 0}%</span>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#34d399", textAlign: "center" }}>{formatNumber(Math.round(mgmtAmount))}</span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
