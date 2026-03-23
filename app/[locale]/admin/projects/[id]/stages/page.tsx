"use client";

import { useState, useEffect, useCallback } from "react";
import { useProject } from "../layout";
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, CircularProgress,
  Alert, Chip, IconButton,
} from "@mui/material";
import {
  AddOutlined, EditOutlined, LockOutlined, LockOpenOutlined, DeleteOutline,
} from "@mui/icons-material";

interface Expense {
  id: string;
  investor_amount: number;
  stage_id: string;
  show_to_investors: boolean;
  pricing_type: string;
}

interface Stage {
  id: string;
  stage_name: string;
  unit_type: string;
  base_unit_price: number;
  total_area: number;
  management_percentage: number;
  sort_order: number;
  status: string;
  investor_contracts: { count: number }[];
}

const UNIT_TYPES: Record<string, string> = {
  LAND_METER: "متر أرض",
  APARTMENT_METER: "متر شقة",
};

const formatNumber = (n: number) => new Intl.NumberFormat("en-US").format(n);

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px", backgroundColor: "rgba(15, 23, 42, 0.5)", color: "#e2e8f0", fontFamily: "var(--font-cairo)",
    "& fieldset": { borderColor: "rgba(148, 163, 184, 0.15)" }, "&:hover fieldset": { borderColor: "rgba(59, 130, 246, 0.4)" }, "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
  },
  "& .MuiInputLabel-root": { color: "#94a3b8", fontFamily: "var(--font-cairo)", "&.Mui-focused": { color: "#60a5fa" } },
  "& .MuiInputBase-input": { textAlign: "right" },
};

const dialogSx = { "& .MuiDialog-paper": { background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: "20px", color: "#e2e8f0", direction: "rtl" as const, minWidth: "min(500px, 92vw)" } };
const menuSx = { PaperProps: { sx: { background: "#1e293b", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "12px", "& .MuiMenuItem-root": { fontFamily: "var(--font-cairo)", color: "#e2e8f0", "&:hover": { background: "rgba(59,130,246,0.1)" }, "&.Mui-selected": { background: "rgba(59,130,246,0.15)" } } } } };

export default function StagesPage() {
  const { projectId, project } = useProject();
  const projectArea = Number(project.land_area) || 0;
  const [stages, setStages] = useState<Stage[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ stage_name: "", unit_type: "LAND_METER", management_percentage: "" });
  const [addSaving, setAddSaving] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editStage, setEditStage] = useState<Stage | null>(null);
  const [editForm, setEditForm] = useState({ stage_name: "", unit_type: "LAND_METER", management_percentage: "", sort_order: "", status: "OPEN" });
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteStage, setDeleteStage] = useState<Stage | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [stagesRes, expensesRes] = await Promise.all([
        fetch(`/api/erp-auth/projects/${projectId}/stages`),
        fetch(`/api/erp-auth/projects/${projectId}/expenses`),
      ]);
      const stagesData = await stagesRes.json();
      const expensesData = await expensesRes.json();
      if (stagesData.stages) setStages(stagesData.stages);
      setExpenses(expensesData.expenses || []);
    } catch { setError("فشل في تحميل البيانات"); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Compute investor expenses total per stage
  const getStageInvestorTotal = (stageId: string) => {
    return expenses
      .filter(e => e.stage_id === stageId && (e.pricing_type === "DUAL" || e.show_to_investors !== false))
      .reduce((sum, e) => sum + Number(e.investor_amount), 0);
  };

  // Calculate price per meter and management for a stage
  const getStageCalcs = (stage: Stage, mgmtOverride?: number) => {
    const investorTotal = getStageInvestorTotal(stage.id);
    const area = projectArea;
    const pricePerMeter = area > 0 ? investorTotal / area : 0;
    const mgmtPct = mgmtOverride !== undefined ? mgmtOverride : (Number(stage.management_percentage) || 0);
    const managementPerMeter = pricePerMeter * mgmtPct / 100;
    const finalPrice = pricePerMeter + managementPerMeter;
    return { investorTotal, area, pricePerMeter, mgmtPct, managementPerMeter, finalPrice };
  };

  const handleAdd = async () => {
    setAddSaving(true); setError(null);
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}/stages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage_name: addForm.stage_name,
          unit_type: addForm.unit_type,
          management_percentage: Number(addForm.management_percentage) || 0,
          base_unit_price: 0,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم إضافة المرحلة بنجاح");
      setAddOpen(false);
      setAddForm({ stage_name: "", unit_type: "LAND_METER", management_percentage: "" });
      fetchAll();
    } catch { setError("فشل في إضافة المرحلة"); }
    finally { setAddSaving(false); }
  };

  const openEdit = (stage: Stage) => {
    setEditStage(stage);
    setEditForm({
      stage_name: stage.stage_name,
      unit_type: stage.unit_type,
      management_percentage: String(stage.management_percentage || ""),
      sort_order: String(stage.sort_order ?? ""),
      status: stage.status,
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editStage) return;
    setEditSaving(true); setError(null);
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}/stages/${editStage.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage_name: editForm.stage_name,
          unit_type: editForm.unit_type,
          management_percentage: Number(editForm.management_percentage) || 0,
          sort_order: editForm.sort_order !== "" ? Number(editForm.sort_order) : undefined,
          status: editForm.status,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم تحديث المرحلة بنجاح");
      setEditOpen(false); fetchAll();
    } catch { setError("فشل في تحديث المرحلة"); }
    finally { setEditSaving(false); }
  };

  const handleToggleStatus = async (stage: Stage) => {
    try {
      await fetch(`/api/erp-auth/projects/${projectId}/stages/${stage.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: stage.status === "OPEN" ? "CLOSED" : "OPEN" }),
      });
      fetchAll();
    } catch { setError("فشل في تغيير حالة المرحلة"); }
  };

  const handleDelete = async () => {
    if (!deleteStage) return;
    setDeleteSaving(true);
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}/stages/${deleteStage.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم حذف المرحلة"); setDeleteOpen(false); fetchAll();
    } catch { setError("فشل في حذف المرحلة"); }
    finally { setDeleteSaving(false); }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px 0", fontFamily: "var(--font-cairo)" }}>المراحل</h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0, fontFamily: "var(--font-cairo)" }}>إدارة مراحل المشروع والتسعير التلقائي</p>
        </div>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setAddOpen(true)}
          sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
          إضافة مرحلة
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontFamily: "var(--font-cairo)", direction: "rtl" }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#86efac", fontFamily: "var(--font-cairo)", direction: "rtl" }}>
          {success}
        </Alert>
      )}

      {/* Stages list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}><CircularProgress sx={{ color: "#3b82f6" }} /></div>
      ) : stages.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", borderRadius: "20px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
          <p style={{ fontSize: "48px", margin: "0 0 12px" }}>📋</p>
          <p style={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "16px" }}>لا توجد مراحل بعد</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {stages.map((stage) => {
            const contractCount = stage.investor_contracts?.[0]?.count || 0;
            const calcs = getStageCalcs(stage);
            return (
              <div key={stage.id} style={{ borderRadius: "16px", overflow: "hidden", background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(148, 163, 184, 0.08)" }}>
                {/* Stage header row */}
                <div style={{ padding: "16px 24px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                  {/* Stage number badge */}
                  <div style={{ minWidth: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))", border: "1px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#60a5fa", fontFamily: "var(--font-cairo)" }}>{stage.sort_order ?? "—"}</span>
                  </div>

                  {/* Status toggle */}
                  <IconButton size="small" onClick={() => handleToggleStatus(stage)}
                    title={stage.status === "OPEN" ? "إغلاق المرحلة" : "فتح المرحلة"}
                    sx={{ color: stage.status === "OPEN" ? "#10b981" : "#f59e0b", background: stage.status === "OPEN" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", "&:hover": { background: stage.status === "OPEN" ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)" } }}>
                    {stage.status === "OPEN" ? <LockOpenOutlined sx={{ fontSize: 18 }} /> : <LockOutlined sx={{ fontSize: 18 }} />}
                  </IconButton>

                  {/* Name & meta */}
                  <div style={{ flex: 1, minWidth: "150px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "16px", fontWeight: 600, color: "#e2e8f0", fontFamily: "var(--font-cairo)" }}>{stage.stage_name}</span>
                      <Chip label={stage.status === "OPEN" ? "مفتوح" : "مغلق"} size="small"
                        sx={{ backgroundColor: stage.status === "OPEN" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)", color: stage.status === "OPEN" ? "#10b981" : "#f59e0b", fontFamily: "var(--font-cairo)", fontSize: "11px", fontWeight: 600, height: "22px" }} />
                    </div>
                    <div style={{ display: "flex", gap: "16px", marginTop: "4px", fontSize: "12px", color: "#64748b", fontFamily: "var(--font-cairo)", flexWrap: "wrap" }}>
                      <span>النوع: {UNIT_TYPES[stage.unit_type] || stage.unit_type}</span>
                      <span>المساحة: {projectArea > 0 ? `${formatNumber(projectArea)} م²` : "—"}</span>
                      <span>العقود: {contractCount}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "4px" }}>
                    <IconButton onClick={() => openEdit(stage)} size="small" title="تعديل"
                      sx={{ color: "#94a3b8", "&:hover": { color: "#60a5fa", background: "rgba(96,165,250,0.1)" } }}>
                      <EditOutlined sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton onClick={() => { setDeleteStage(stage); setDeleteOpen(true); }} size="small" title="حذف"
                      sx={{ color: "#94a3b8", "&:hover": { color: "#f87171", background: "rgba(248,113,113,0.1)" } }}>
                      <DeleteOutline sx={{ fontSize: 18 }} />
                    </IconButton>
                  </div>
                </div>

                {/* Auto-calculated pricing info */}
                {calcs.area > 0 && calcs.investorTotal > 0 && (
                  <div style={{ padding: "12px 24px 16px", borderTop: "1px solid rgba(148,163,184,0.06)", background: "rgba(15,23,42,0.3)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
                      {/* Total investor expenses */}
                      <div style={{ padding: "10px 14px", borderRadius: "12px", background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}>
                        <p style={{ fontSize: "10px", color: "#94a3b8", margin: "0 0 2px", fontFamily: "var(--font-cairo)" }}>إجمالي مصروفات المستثمرين</p>
                        <p style={{ fontSize: "16px", fontWeight: 700, color: "#a78bfa", margin: 0 }}>{formatNumber(calcs.investorTotal)} <span style={{ fontSize: "10px", fontWeight: 400, color: "#64748b" }}>ج.م</span></p>
                      </div>
                      {/* Price per meter */}
                      <div style={{ padding: "10px 14px", borderRadius: "12px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}>
                        <p style={{ fontSize: "10px", color: "#94a3b8", margin: "0 0 2px", fontFamily: "var(--font-cairo)" }}>سعر المتر (تكلفة)</p>
                        <p style={{ fontSize: "16px", fontWeight: 700, color: "#60a5fa", margin: 0 }}>{formatNumber(Math.round(calcs.pricePerMeter))} <span style={{ fontSize: "10px", fontWeight: 400, color: "#64748b" }}>ج.م/م²</span></p>
                      </div>
                      {/* Management fee */}
                      <div style={{ padding: "10px 14px", borderRadius: "12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
                        <p style={{ fontSize: "10px", color: "#94a3b8", margin: "0 0 2px", fontFamily: "var(--font-cairo)" }}>الإدارة والتشغيل ({calcs.mgmtPct}%)</p>
                        <p style={{ fontSize: "16px", fontWeight: 700, color: "#fbbf24", margin: 0 }}>{formatNumber(Math.round(calcs.managementPerMeter))} <span style={{ fontSize: "10px", fontWeight: 400, color: "#64748b" }}>ج.م/م²</span></p>
                      </div>
                      {/* Final price per meter */}
                      <div style={{ padding: "10px 14px", borderRadius: "12px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)" }}>
                        <p style={{ fontSize: "10px", color: "#94a3b8", margin: "0 0 2px", fontFamily: "var(--font-cairo)" }}>سعر المتر النهائي</p>
                        <p style={{ fontSize: "18px", fontWeight: 700, color: "#34d399", margin: 0 }}>{formatNumber(Math.round(calcs.finalPrice))} <span style={{ fontSize: "10px", fontWeight: 400, color: "#64748b" }}>ج.م/م²</span></p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Stage Dialog ── */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>إضافة مرحلة جديدة</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
          <TextField label="اسم المرحلة *" value={addForm.stage_name} onChange={(e) => setAddForm({ ...addForm, stage_name: e.target.value })} fullWidth sx={fieldSx} />
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>نوع الوحدة</InputLabel>
            <Select value={addForm.unit_type} onChange={(e) => setAddForm({ ...addForm, unit_type: e.target.value })} label="نوع الوحدة" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              <MenuItem value="LAND_METER">متر أرض</MenuItem>
              <MenuItem value="APARTMENT_METER">متر شقة</MenuItem>
            </Select>
          </FormControl>
          <TextField label="نسبة الإدارة والتشغيل (%)" type="number" value={addForm.management_percentage} onChange={(e) => setAddForm({ ...addForm, management_percentage: e.target.value })} fullWidth sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setAddOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleAdd} disabled={addSaving || !addForm.stage_name} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
            {addSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "إضافة"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Stage Dialog ── */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>تعديل المرحلة</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
          <TextField label="اسم المرحلة" value={editForm.stage_name} onChange={(e) => setEditForm({ ...editForm, stage_name: e.target.value })} fullWidth sx={fieldSx} />
          <TextField label="رقم المرحلة (ترتيب)" type="number" value={editForm.sort_order} onChange={(e) => setEditForm({ ...editForm, sort_order: e.target.value })} fullWidth sx={fieldSx} helperText="يحدد ترتيب المرحلة في القوائم (1، 2، 3...)" />
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>نوع الوحدة</InputLabel>
            <Select value={editForm.unit_type} onChange={(e) => setEditForm({ ...editForm, unit_type: e.target.value })} label="نوع الوحدة" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              <MenuItem value="LAND_METER">متر أرض</MenuItem>
              <MenuItem value="APARTMENT_METER">متر شقة</MenuItem>
            </Select>
          </FormControl>
          <TextField label="نسبة الإدارة والتشغيل (%)" type="number" value={editForm.management_percentage} onChange={(e) => setEditForm({ ...editForm, management_percentage: e.target.value })} fullWidth sx={fieldSx} />
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>حالة المرحلة</InputLabel>
            <Select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} label="حالة المرحلة" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              <MenuItem value="OPEN">مفتوح — يقبل الاستثمارات</MenuItem>
              <MenuItem value="CLOSED">مغلق — مجمد للتقييم</MenuItem>
            </Select>
          </FormControl>

          {/* Live calculation preview */}
          {editStage && (() => {
            const calcs = getStageCalcs(editStage, Number(editForm.management_percentage) || 0);
            if (calcs.area <= 0) return null;
            return (
              <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.12)" }}>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#10b981", margin: "0 0 8px", fontFamily: "var(--font-cairo)" }}>📊 المعاينة الحية</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px", fontFamily: "var(--font-cairo)" }}>
                  <div style={{ color: "#94a3b8" }}>إجمالي المصروفات: <strong style={{ color: "#a78bfa" }}>{formatNumber(calcs.investorTotal)}</strong></div>
                  <div style={{ color: "#94a3b8" }}>سعر المتر: <strong style={{ color: "#60a5fa" }}>{formatNumber(Math.round(calcs.pricePerMeter))}</strong></div>
                  <div style={{ color: "#94a3b8" }}>الإدارة/م²: <strong style={{ color: "#fbbf24" }}>{formatNumber(Math.round(calcs.managementPerMeter))}</strong></div>
                  <div style={{ color: "#94a3b8" }}>السعر النهائي: <strong style={{ color: "#34d399" }}>{formatNumber(Math.round(calcs.finalPrice))}</strong></div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleEdit} disabled={editSaving || !editForm.stage_name} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
            {editSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حفظ"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#f87171" }}>حذف المرحلة</DialogTitle>
        <DialogContent>
          <p style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", fontSize: "15px", margin: 0 }}>
            هل أنت متأكد من حذف المرحلة{" "}
            <strong style={{ color: "#e2e8f0" }}>{deleteStage?.stage_name}</strong>
            ؟ لا يمكن التراجع.
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleDelete} disabled={deleteSaving} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "#dc2626", "&:hover": { background: "#b91c1c" } }}>
            {deleteSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حذف"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
