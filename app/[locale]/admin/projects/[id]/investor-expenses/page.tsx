"use client";

import { useState, useEffect, useCallback } from "react";
import { useProject } from "../layout";
import { CircularProgress, Chip } from "@mui/material";
import { ExpandMoreOutlined, ExpandLessOutlined } from "@mui/icons-material";

interface Expense {
  id: string;
  expense_name: string;
  pricing_type: string;
  company_amount: number;
  investor_amount: number;
  payment_status: string;
  expense_date: string;
  stage_id: string;
  show_to_investors: boolean;
  investor_display_name: string | null;
  stage: { stage_name: string };
}

interface StageGroup {
  stage_name: string;
  stage_id: string;
  expenses: Expense[];
  totalInvestor: number;
}

const formatNumber = (n: number) => new Intl.NumberFormat("en-US").format(n);
const formatDate = (d: string) => {
  if (!d) return "—";
  const parts = d.split("-");
  if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return d;
};

const PRICING_LABELS: Record<string, { label: string; color: string }> = {
  SHARED: { label: "مشترك", color: "#3b82f6" },
  DUAL: { label: "سعرين", color: "#8b5cf6" },
};

export default function InvestorExpensesPage() {
  const { projectId } = useProject();
  const [stageGroups, setStageGroups] = useState<StageGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [grandTotal, setGrandTotal] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}/expenses`);
      const data = await res.json();
      const allExpenses: Expense[] = data.expenses || [];

      // Filter: DUAL always shows, SHARED only if show_to_investors is true
      const expenses = allExpenses.filter(e =>
        e.pricing_type === "DUAL" || e.show_to_investors !== false
      );

      // Group by stage
      const groupMap: Record<string, StageGroup> = {};
      expenses.forEach((exp) => {
        const stageId = exp.stage_id || "no-stage";
        const stageName = exp.stage?.stage_name || "بدون مرحلة";
        if (!groupMap[stageId]) {
          groupMap[stageId] = { stage_name: stageName, stage_id: stageId, expenses: [], totalInvestor: 0 };
        }
        groupMap[stageId].expenses.push(exp);
        groupMap[stageId].totalInvestor += Number(exp.investor_amount);
      });

      const groups = Object.values(groupMap);
      setStageGroups(groups);
      setGrandTotal(groups.reduce((s, g) => s + g.totalInvestor, 0));

      // Expand all stages by default
      setExpandedStages(new Set(groups.map(g => g.stage_id)));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId); else next.add(stageId);
      return next;
    });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>مصروفات المستثمرين</h1>
        <p style={{ fontSize: "14px", color: "#64748b", margin: 0, fontFamily: "var(--font-cairo)" }}>المبالغ المحسوبة على المستثمرين لكل مرحلة</p>
      </div>

      {/* Grand Total */}
      <div style={{ padding: "20px 24px", borderRadius: "18px", marginBottom: "24px", background: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(59,130,246,0.08) 100%)", border: "1px solid rgba(139,92,246,0.18)" }}>
        <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>إجمالي مصروفات المستثمرين</p>
        <p style={{ fontSize: "32px", fontWeight: 700, color: "#a78bfa", margin: 0 }}>{formatNumber(grandTotal)} <span style={{ fontSize: "14px", fontWeight: 400, color: "#64748b" }}>ج.م</span></p>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}><CircularProgress sx={{ color: "#8b5cf6" }} /></div>
      ) : stageGroups.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", borderRadius: "20px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
          <p style={{ fontSize: "48px", margin: "0 0 12px" }}>📋</p>
          <p style={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "16px" }}>لا توجد مصروفات بعد</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {stageGroups.map((group) => {
            const isExpanded = expandedStages.has(group.stage_id);
            return (
              <div key={group.stage_id} style={{ borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(148,163,184,0.08)", background: "rgba(30,41,59,0.4)" }}>
                {/* Stage Header */}
                <div
                  onClick={() => toggleStage(group.stage_id)}
                  style={{
                    padding: "16px 20px", cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: "rgba(15,23,42,0.5)", borderBottom: isExpanded ? "1px solid rgba(148,163,184,0.08)" : "none",
                    transition: "background 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(139,92,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "16px" }}>🏗️</span>
                    </div>
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: "var(--font-cairo)" }}>{group.stage_name}</h3>
                      <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0", fontFamily: "var(--font-cairo)" }}>{group.expenses.length} مصروف</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ textAlign: "left" }}>
                      <p style={{ fontSize: "18px", fontWeight: 700, color: "#a78bfa", margin: 0 }}>{formatNumber(group.totalInvestor)} <span style={{ fontSize: "11px", fontWeight: 400, color: "#64748b" }}>ج.م</span></p>
                    </div>
                    {isExpanded ? <ExpandLessOutlined sx={{ color: "#64748b", fontSize: 20 }} /> : <ExpandMoreOutlined sx={{ color: "#64748b", fontSize: 20 }} />}
                  </div>
                </div>

                {/* Expenses List */}
                {isExpanded && (
                  <div>
                    {/* Table Header */}
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "8px", padding: "8px 20px", fontSize: "11px", color: "#64748b", fontWeight: 600, fontFamily: "var(--font-cairo)", background: "rgba(15,23,42,0.3)" }}>
                      <span>المصروف</span>
                      <span style={{ textAlign: "center" }}>نوع التسعير</span>
                      <span style={{ textAlign: "center" }}>مبلغ المستثمرين</span>
                      <span style={{ textAlign: "center" }}>التاريخ</span>
                    </div>
                    {group.expenses.map((exp, idx) => {
                      const pt = PRICING_LABELS[exp.pricing_type] || PRICING_LABELS.SHARED;
                      return (
                        <div key={exp.id} style={{
                          display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "8px",
                          padding: "12px 20px", alignItems: "center",
                          background: idx % 2 === 0 ? "transparent" : "rgba(15,23,42,0.2)",
                          borderBottom: "1px solid rgba(148,163,184,0.04)",
                        }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", fontFamily: "var(--font-cairo)" }}>{exp.investor_display_name || exp.expense_name}</span>
                          <span style={{ textAlign: "center" }}>
                            <Chip label={pt.label} size="small" sx={{ backgroundColor: `${pt.color}22`, color: pt.color, fontFamily: "var(--font-cairo)", fontSize: "10px", fontWeight: 600, height: "20px" }} />
                          </span>
                          <span style={{ fontSize: "14px", fontWeight: 700, color: "#a78bfa", textAlign: "center" }}>{formatNumber(exp.investor_amount)}</span>
                          <span style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center" }}>{formatDate(exp.expense_date)}</span>
                        </div>
                      );
                    })}
                    {/* Stage Total Footer */}
                    <div style={{ padding: "10px 20px", background: "rgba(139,92,246,0.06)", borderTop: "1px solid rgba(139,92,246,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>إجمالي المرحلة</span>
                      <span style={{ fontSize: "16px", fontWeight: 700, color: "#a78bfa" }}>{formatNumber(group.totalInvestor)} <span style={{ fontSize: "11px", fontWeight: 400, color: "#64748b" }}>ج.م</span></span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
