"use client";

import { useState, useEffect, useCallback } from "react";
import { useProject } from "../layout";
import {
  Button,
  TextField,
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material";
import { SaveOutlined, EditOutlined, LandscapeOutlined, StraightenOutlined, SquareFootOutlined, AccountBalanceOutlined } from "@mui/icons-material";

const formatNumber = (n: number) =>
  new Intl.NumberFormat("en-US").format(n);

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    color: "#e2e8f0",
    fontFamily: "var(--font-cairo)",
    "& fieldset": { borderColor: "rgba(148, 163, 184, 0.15)" },
    "&:hover fieldset": { borderColor: "rgba(59, 130, 246, 0.4)" },
    "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
  },
  "& .MuiInputLabel-root": {
    color: "#94a3b8",
    fontFamily: "var(--font-cairo)",
    "&.Mui-focused": { color: "#60a5fa" },
  },
  "& .MuiInputBase-input": { textAlign: "right" },
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PLANNING: { label: "تخطيط", color: "#f59e0b" },
  ACTIVE: { label: "نشط", color: "#10b981" },
  COMPLETED: { label: "مكتمل", color: "#6366f1" },
};

interface Stage { id: string; stage_name: string; management_percentage: number; status: string; }
interface Contract { id: string; stage_id: string; unit_quantity: number; unit_price_at_contract: number; management_fee_pct: number; status: string; }
interface Expense { id: string; stage_id: string; investor_amount: number; }

export default function ProjectOverviewPage() {
  const { project, projectId, refreshProject } = useProject();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [form, setForm] = useState({
    name: project.name,
    description: project.description || "",
    location: project.location || "",
    land_area: (project as unknown as Record<string, unknown>).land_area?.toString() || "0",
  });

  const landArea = Number((project as unknown as Record<string, unknown>).land_area) || 0;

  const fetchDashboardData = useCallback(async () => {
    try {
      const [stRes, ctRes, expRes] = await Promise.all([
        fetch(`/api/erp-auth/projects/${projectId}/stages`),
        fetch(`/api/erp-auth/projects/${projectId}/contracts`),
        fetch(`/api/erp-auth/projects/${projectId}/expenses`),
      ]);
      const stData = await stRes.json();
      const ctData = await ctRes.json();
      const expData = await expRes.json();
      setStages(stData.stages || []);
      setContracts(ctData.contracts || []);
      setExpenses(expData.expenses || []);
    } catch { /* silent */ }
  }, [projectId]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          land_area: Number(form.land_area) || 0,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error);
        return;
      }
      setSuccess("تم حفظ البيانات بنجاح");
      setEditing(false);
      refreshProject();
    } catch {
      setError("فشل في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const status = STATUS_MAP[project.status] || STATUS_MAP.PLANNING;

  // ── Per-stage calculations ──
  const activeContracts = contracts.filter(c => c.status === "ACTIVE");
  const totalSoldMeters = activeContracts.reduce((s, c) => s + Number(c.unit_quantity), 0);
  const remainingMeters = landArea - totalSoldMeters;

  // Calculate latest cumulative price/meter (all stages)
  let latestPricePerMeter = 0;
  let latestAvgMgmt = 0;
  if (landArea > 0 && stages.length > 0) {
    let totalExpPerMeter = 0;
    let mgmtSum = 0;
    for (const st of stages) {
      const stExp = expenses.filter(e => e.stage_id === st.id).reduce((s, e) => s + Number(e.investor_amount), 0);
      const ppm = stExp / landArea;
      const mgmt = Number(st.management_percentage) || 0;
      totalExpPerMeter += ppm;
      mgmtSum += mgmt;
    }
    latestAvgMgmt = stages.length > 0 ? mgmtSum / stages.length : 0;
    latestPricePerMeter = totalExpPerMeter + (totalExpPerMeter * latestAvgMgmt / 100);
  }

  const remainingValue = remainingMeters * latestPricePerMeter;
  const totalContractedValue = activeContracts.reduce((s, c) => s + c.unit_quantity * c.unit_price_at_contract, 0);

  // Per-stage stats
  const stageStats = stages.map(st => {
    const stContracts = activeContracts.filter(c => c.stage_id === st.id);
    const stSoldMeters = stContracts.reduce((s, c) => s + Number(c.unit_quantity), 0);
    const stContractedValue = stContracts.reduce((s, c) => s + c.unit_quantity * c.unit_price_at_contract, 0);
    const stExp = expenses.filter(e => e.stage_id === st.id).reduce((s, e) => s + Number(e.investor_amount), 0);
    const stPpm = landArea > 0 ? stExp / landArea : 0;
    const mgmt = Number(st.management_percentage) || 0;
    const stPricePerMeter = stPpm + (stPpm * mgmt / 100);
    return {
      ...st,
      contractCount: stContracts.length,
      soldMeters: stSoldMeters,
      contractedValue: stContractedValue,
      totalExpenses: stExp,
      pricePerMeter: stPricePerMeter,
    };
  });

  const soldPercentage = landArea > 0 ? (totalSoldMeters / landArea) * 100 : 0;
  const isProj2 = projectId === "29d4835f-6d6d-4838-a703-c4bc2c8698c4" || project.slug === "sanad-marble";

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h1
              style={{
                fontSize: "clamp(22px, 4vw, 28px)",
                fontWeight: 700,
                color: "#f1f5f9",
                margin: 0,
                fontFamily: "var(--font-cairo)",
              }}
            >
              نظرة عامة
            </h1>
            <Chip
              label={status.label}
              size="small"
              sx={{
                backgroundColor: `${status.color}22`,
                color: status.color,
                fontFamily: "var(--font-cairo)",
                fontWeight: 600,
                fontSize: "12px",
              }}
            />
          </div>
          <p
            style={{
              fontSize: "14px",
              color: "#64748b",
              margin: "4px 0 0",
              fontFamily: "var(--font-cairo)",
            }}
          >
            البيانات الأساسية للمشروع
          </p>
        </div>
        {!editing && (
          <Button
            variant="contained"
            startIcon={<EditOutlined />}
            onClick={() => setEditing(true)}
            sx={{
              borderRadius: "12px",
              fontFamily: "var(--font-cairo)",
              fontWeight: 600,
              fontSize: "13px",
              textTransform: "none",
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
            }}
          >
            تعديل
          </Button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{
            mb: 2,
            borderRadius: "12px",
            backgroundColor: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#fca5a5",
            fontFamily: "var(--font-cairo)",
            direction: "rtl",
          }}
        >
          {error}
        </Alert>
      )}
      {success && (
        <Alert
          severity="success"
          onClose={() => setSuccess(null)}
          sx={{
            mb: 2,
            borderRadius: "12px",
            backgroundColor: "rgba(34,197,94,0.1)",
            border: "1px solid rgba(34,197,94,0.2)",
            color: "#86efac",
            fontFamily: "var(--font-cairo)",
            direction: "rtl",
          }}
        >
          {success}
        </Alert>
      )}

      {/* Info Cards / Edit Form */}
      {!editing ? (
        <div style={{ display: "grid", gap: "16px" }}>
          {!isProj2 && (
            <>
              {/* ═══ TOP KPI CARDS ═══ */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {/* Total Land Area */}
            <div style={{
              padding: "20px", borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.04) 100%)",
              border: "1px solid rgba(59,130,246,0.15)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <LandscapeOutlined sx={{ color: "#60a5fa", fontSize: 20 }} />
                <span style={{ fontSize: "11px", color: "#60a5fa", fontFamily: "var(--font-cairo)", fontWeight: 600 }}>مساحة الأرض الكلية</span>
              </div>
              <p style={{ fontSize: "28px", fontWeight: 800, color: "#f1f5f9", margin: 0, fontFamily: "var(--font-cairo)" }}>
                {formatNumber(landArea)} <span style={{ fontSize: "14px", color: "#94a3b8" }}>م²</span>
              </p>
            </div>

            {/* Sold Area */}
            <div style={{
              padding: "20px", borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 100%)",
              border: "1px solid rgba(16,185,129,0.15)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <SquareFootOutlined sx={{ color: "#34d399", fontSize: 20 }} />
                <span style={{ fontSize: "11px", color: "#34d399", fontFamily: "var(--font-cairo)", fontWeight: 600 }}>المساحة المباعة</span>
              </div>
              <p style={{ fontSize: "28px", fontWeight: 800, color: "#f1f5f9", margin: 0, fontFamily: "var(--font-cairo)" }}>
                {formatNumber(Math.round(totalSoldMeters))} <span style={{ fontSize: "14px", color: "#94a3b8" }}>م²</span>
              </p>
              <p style={{ fontSize: "11px", color: "#34d399", margin: "4px 0 0", fontFamily: "var(--font-cairo)" }}>
                {soldPercentage.toFixed(1)}% من المساحة الكلية
              </p>
            </div>

            {/* Remaining Area */}
            <div style={{
              padding: "20px", borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)",
              border: "1px solid rgba(245,158,11,0.15)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <StraightenOutlined sx={{ color: "#fbbf24", fontSize: 20 }} />
                <span style={{ fontSize: "11px", color: "#fbbf24", fontFamily: "var(--font-cairo)", fontWeight: 600 }}>المساحة المتبقية</span>
              </div>
              <p style={{ fontSize: "28px", fontWeight: 800, color: "#f1f5f9", margin: 0, fontFamily: "var(--font-cairo)" }}>
                {formatNumber(Math.round(remainingMeters))} <span style={{ fontSize: "14px", color: "#94a3b8" }}>م²</span>
              </p>
              <p style={{ fontSize: "11px", color: "#fbbf24", margin: "4px 0 0", fontFamily: "var(--font-cairo)" }}>
                {(100 - soldPercentage).toFixed(1)}% متاح
              </p>
            </div>

            {/* Remaining Value */}
            <div style={{
              padding: "20px", borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.04) 100%)",
              border: "1px solid rgba(139,92,246,0.15)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <AccountBalanceOutlined sx={{ color: "#a78bfa", fontSize: 20 }} />
                <span style={{ fontSize: "11px", color: "#a78bfa", fontFamily: "var(--font-cairo)", fontWeight: 600 }}>قيمة المتبقي</span>
              </div>
              <p style={{ fontSize: "24px", fontWeight: 800, color: "#f1f5f9", margin: 0, fontFamily: "var(--font-cairo)" }}>
                {formatNumber(Math.round(remainingValue))} <span style={{ fontSize: "12px", color: "#94a3b8" }}>ج.م</span>
              </p>
              <p style={{ fontSize: "10px", color: "#a78bfa", margin: "4px 0 0", fontFamily: "var(--font-cairo)" }}>
                بسعر {formatNumber(Math.round(latestPricePerMeter))} ج.م/متر (إدارة {latestAvgMgmt.toFixed(1)}%)
              </p>
            </div>
          </div>

          {/* ═══ VISUAL PROGRESS BAR ═══ */}
          <div style={{
            padding: "20px 24px", borderRadius: "16px",
            background: "rgba(30, 41, 59, 0.6)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(148, 163, 184, 0.08)",
          }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", margin: "0 0 12px", fontFamily: "var(--font-cairo)" }}>
              نسبة البيع
            </p>
            <div style={{ height: "24px", borderRadius: "12px", background: "rgba(15,23,42,0.6)", overflow: "hidden", position: "relative" }}>
              {/* Stacked segments for each stage */}
              <div style={{ display: "flex", height: "100%", borderRadius: "12px", overflow: "hidden" }}>
                {stageStats.map((st, i) => {
                  const pct = landArea > 0 ? (st.soldMeters / landArea) * 100 : 0;
                  if (pct <= 0) return null;
                  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e", "#06b6d4"];
                  const clr = colors[i % colors.length];
                  return (
                    <div key={st.id} style={{
                      width: `${pct}%`, height: "100%",
                      background: `linear-gradient(135deg, ${clr} 0%, ${clr}cc 100%)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "width 0.8s ease",
                    }}>
                      {pct > 5 && <span style={{ fontSize: "9px", fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>{pct.toFixed(0)}%</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Legend */}
            <div style={{ display: "flex", gap: "16px", marginTop: "8px", flexWrap: "wrap" }}>
              {stageStats.map((st, i) => {
                const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e", "#06b6d4"];
                return (
                  <div key={st.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: colors[i % colors.length] }} />
                    <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>{st.stage_name}</span>
                  </div>
                );
              })}
              {remainingMeters > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: "rgba(15,23,42,0.6)", border: "1px solid #475569" }} />
                  <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "var(--font-cairo)" }}>متبقي</span>
                </div>
              )}
            </div>
          </div>

          {/* ═══ PER-STAGE TABLE ═══ */}
          <div style={{
            borderRadius: "16px",
            background: "rgba(30, 41, 59, 0.6)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(148, 163, 184, 0.08)",
            overflow: "hidden",
          }}>
            <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid rgba(148,163,184,0.08)" }}>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: "var(--font-cairo)" }}>
                📊 تفاصيل المراحل
              </p>
            </div>
            {/* Table Header */}
            <div style={{
              display: "grid", gridTemplateColumns: "1.5fr 0.8fr 1fr 1fr 1fr",
              gap: "8px", padding: "10px 24px", fontSize: "10px", color: "#64748b",
              fontFamily: "var(--font-cairo)", fontWeight: 600,
              background: "rgba(15,23,42,0.3)", direction: "rtl",
            }}>
              <span>المرحلة</span>
              <span style={{ textAlign: "center" }}>العقود</span>
              <span style={{ textAlign: "center" }}>المباع (م²)</span>
              <span style={{ textAlign: "center" }}>سعر/متر</span>
              <span style={{ textAlign: "center" }}>إجمالي قيمة العقود</span>
            </div>
            {/* Table Rows */}
            {stageStats.map((st, i) => {
              const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e", "#06b6d4"];
              const clr = colors[i % colors.length];
              return (
                <div key={st.id} style={{
                  display: "grid", gridTemplateColumns: "1.5fr 0.8fr 1fr 1fr 1fr",
                  gap: "8px", padding: "12px 24px", fontSize: "13px",
                  fontFamily: "var(--font-cairo)",
                  background: i % 2 === 0 ? "rgba(30,41,59,0.3)" : "rgba(30,41,59,0.5)",
                  borderRight: `3px solid ${clr}`,
                  direction: "rtl",
                }}>
                  <span style={{ fontWeight: 700, color: clr }}>{st.stage_name}</span>
                  <span style={{ textAlign: "center", color: "#e2e8f0", fontWeight: 600 }}>{st.contractCount}</span>
                  <span style={{ textAlign: "center", color: "#34d399", fontWeight: 600 }}>{formatNumber(Math.round(st.soldMeters))}</span>
                  <span style={{ textAlign: "center", color: "#fbbf24", fontWeight: 600 }}>{formatNumber(Math.round(st.pricePerMeter))}</span>
                  <span style={{ textAlign: "center", color: "#e2e8f0", fontWeight: 600 }}>{formatNumber(Math.round(st.contractedValue))}</span>
                </div>
              );
            })}
            {/* Summary Row */}
            <div style={{
              display: "grid", gridTemplateColumns: "1.5fr 0.8fr 1fr 1fr 1fr",
              gap: "8px", padding: "14px 24px", fontSize: "13px",
              fontFamily: "var(--font-cairo)", fontWeight: 700,
              background: "rgba(59,130,246,0.06)",
              borderTop: "2px solid rgba(59,130,246,0.2)",
              direction: "rtl",
            }}>
              <span style={{ color: "#60a5fa" }}>الإجمالي</span>
              <span style={{ textAlign: "center", color: "#f1f5f9" }}>{activeContracts.length}</span>
              <span style={{ textAlign: "center", color: "#34d399" }}>{formatNumber(Math.round(totalSoldMeters))}</span>
              <span style={{ textAlign: "center", color: "#fbbf24" }}>{formatNumber(Math.round(latestPricePerMeter))}</span>
              <span style={{ textAlign: "center", color: "#f1f5f9" }}>{formatNumber(Math.round(totalContractedValue))}</span>
            </div>
            {/* Remaining Row */}
            <div style={{
              display: "grid", gridTemplateColumns: "1.5fr 0.8fr 1fr 1fr 1fr",
              gap: "8px", padding: "12px 24px", fontSize: "13px",
              fontFamily: "var(--font-cairo)", fontWeight: 600,
              background: "rgba(245,158,11,0.04)",
              borderTop: "1px dashed rgba(245,158,11,0.3)",
              direction: "rtl",
            }}>
              <span style={{ color: "#fbbf24" }}>🏗️ المتبقي</span>
              <span style={{ textAlign: "center", color: "#94a3b8" }}>—</span>
              <span style={{ textAlign: "center", color: "#fbbf24" }}>{formatNumber(Math.round(remainingMeters))}</span>
              <span style={{ textAlign: "center", color: "#fbbf24" }}>{formatNumber(Math.round(latestPricePerMeter))}</span>
              <span style={{ textAlign: "center", color: "#fbbf24" }}>{formatNumber(Math.round(remainingValue))}</span>
            </div>
          </div>
            </>
          )}

          {/* ═══ PROJECT INFO CARD ═══ */}
          <div
            style={{
              padding: "24px",
              borderRadius: "20px",
              background: "rgba(30, 41, 59, 0.6)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(148, 163, 184, 0.08)",
            }}
          >
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#f1f5f9", margin: "0 0 16px", fontFamily: "var(--font-cairo)" }}>
              📋 بيانات المشروع
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "24px",
              }}
            >
              {[
                { label: "اسم المشروع", value: project.name },
                { label: "الموقع", value: project.location || "—" },
                {
                  label: "مساحة الأرض",
                  value: `${formatNumber(landArea)} م²`,
                },
                { label: "الوصف", value: project.description || "—" },
              ].map((item) => (
                <div key={item.label}>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      margin: "0 0 4px",
                      fontFamily: "var(--font-cairo)",
                    }}
                  >
                    {item.label}
                  </p>
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#e2e8f0",
                      margin: 0,
                      fontFamily: "var(--font-cairo)",
                    }}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Edit form */
        <div
          style={{
            padding: "24px",
            borderRadius: "20px",
            background: "rgba(30, 41, 59, 0.6)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(148, 163, 184, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <TextField
            label="اسم المشروع"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth
            sx={fieldSx}
          />
          <TextField
            label="الموقع"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            fullWidth
            sx={fieldSx}
          />
          <TextField
            label="مساحة الأرض (م²)"
            type="number"
            value={form.land_area}
            onChange={(e) => setForm({ ...form, land_area: e.target.value })}
            fullWidth
            sx={fieldSx}
          />
          <TextField
            label="الوصف"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            fullWidth
            multiline
            rows={3}
            sx={fieldSx}
          />

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-start",
            }}
          >
            <Button
              onClick={handleSave}
              disabled={saving || !form.name}
              variant="contained"
              startIcon={
                saving ? (
                  <CircularProgress size={16} sx={{ color: "#fff" }} />
                ) : (
                  <SaveOutlined />
                )
              }
              sx={{
                borderRadius: "10px",
                fontFamily: "var(--font-cairo)",
                fontWeight: 600,
                textTransform: "none",
                background:
                  "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              }}
            >
              حفظ
            </Button>
            <Button
              onClick={() => setEditing(false)}
              sx={{
                color: "#94a3b8",
                fontFamily: "var(--font-cairo)",
                textTransform: "none",
              }}
            >
              إلغاء
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
