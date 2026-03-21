"use client";

import { useState, useEffect, useCallback } from "react";
import { useProject } from "../layout";
import {
  CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, FormControl, InputLabel, Select, MenuItem, Chip,
} from "@mui/material";
import { AddOutlined, EditOutlined, DeleteOutlined, CloseOutlined } from "@mui/icons-material";

interface CompanyExpense {
  id: string;
  description: string;
  amount: number;
  type: string;
  expense_date: string;
  notes: string | null;
}

interface ProjectExpense {
  company_amount: number;
  investor_amount: number;
  stage_id: string;
}

interface Stage {
  id: string;
  management_percentage: number;
}

interface ContractItem {
  unit_quantity: number;
  management_fee_pct: number;
  stage_id: string;
  status: string;
}

const formatNumber = (n: number) => new Intl.NumberFormat("en-US").format(n);
const formatDate = (d: string) => new Date(d).toLocaleDateString("ar-EG");

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px", backgroundColor: "rgba(15,23,42,0.5)", color: "#e2e8f0",
    fontFamily: "var(--font-cairo)",
    "& fieldset": { borderColor: "rgba(148,163,184,0.15)" },
    "&:hover fieldset": { borderColor: "rgba(59,130,246,0.4)" },
    "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
  },
  "& .MuiInputLabel-root": { color: "#94a3b8", fontFamily: "var(--font-cairo)", "&.Mui-focused": { color: "#60a5fa" } },
  "& .MuiInputBase-input": { textAlign: "right" },
};

const dialogSx = {
  "& .MuiDialog-paper": {
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    border: "1px solid rgba(148,163,184,0.12)", borderRadius: "20px",
    color: "#e2e8f0", direction: "rtl" as const, minWidth: "min(500px, 92vw)",
  },
};

export default function CompanyExpensesPage() {
  const { projectId } = useProject();
  const [companyExps, setCompanyExps] = useState<CompanyExpense[]>([]);
  const [projectExps, setProjectExps] = useState<ProjectExpense[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [contractItems, setContractItems] = useState<ContractItem[]>([]);
  const [projectArea, setProjectArea] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ description: "", amount: "", type: "EXPENSE", expense_date: new Date().toISOString().split("T")[0], notes: "" });
  const [addSaving, setAddSaving] = useState(false);

  // Edit dialog
  const [editExp, setEditExp] = useState<CompanyExpense | null>(null);
  const [editForm, setEditForm] = useState({ description: "", amount: "", type: "EXPENSE", expense_date: "", notes: "" });
  const [editSaving, setEditSaving] = useState(false);

  // Delete
  const [deleteExp, setDeleteExp] = useState<CompanyExpense | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [ceRes, peRes, stRes, ctRes, projRes] = await Promise.all([
        fetch(`/api/erp-auth/projects/${projectId}/company-expenses`),
        fetch(`/api/erp-auth/projects/${projectId}/expenses`),
        fetch(`/api/erp-auth/projects/${projectId}/stages`),
        fetch(`/api/erp-auth/projects/${projectId}/contracts`),
        fetch(`/api/erp-auth/projects/${projectId}`),
      ]);
      const ceData = await ceRes.json();
      const peData = await peRes.json();
      const stData = await stRes.json();
      const ctData = await ctRes.json();
      const projData = await projRes.json();
      setCompanyExps(ceData.expenses || []);
      setProjectExps(peData.expenses || []);
      setStages(stData.stages || []);
      setContractItems(ctData.contracts || []);
      setProjectArea(Number(projData.project?.land_area) || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Calculations
  const totalCompany = projectExps.reduce((s, e) => s + Number(e.company_amount), 0);
  const totalInvestor = projectExps.reduce((s, e) => s + Number(e.investor_amount), 0);
  const expDifference = totalInvestor - totalCompany;

  // Management from individual contracts
  const mgmtAmount = (() => {
    if (projectArea <= 0) return 0;
    const stageInvTotals: Record<string, number> = {};
    projectExps.forEach(e => {
      stageInvTotals[e.stage_id] = (stageInvTotals[e.stage_id] || 0) + Number(e.investor_amount);
    });
    return contractItems
      .filter(c => c.status !== "CANCELLED")
      .reduce((sum, c) => {
        const stageInvTotal = stageInvTotals[c.stage_id] || 0;
        const basePricePerMeter = stageInvTotal / projectArea;
        return sum + c.unit_quantity * basePricePerMeter * (c.management_fee_pct / 100);
      }, 0);
  })();

  const totalProfit = expDifference + mgmtAmount;
  const totalSpent = companyExps.reduce((s, e) => s + Number(e.amount), 0);
  const remaining = totalProfit - totalSpent;

  // Add handler
  const handleAdd = async () => {
    setAddSaving(true); setError(null);
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}/company-expenses`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم الإضافة بنجاح");
      setAddOpen(false);
      setAddForm({ description: "", amount: "", type: "EXPENSE", expense_date: new Date().toISOString().split("T")[0], notes: "" });
      fetchAll();
    } catch { setError("فشل في الإضافة"); }
    finally { setAddSaving(false); }
  };

  // Edit handler
  const openEdit = (exp: CompanyExpense) => {
    setEditExp(exp);
    setEditForm({ description: exp.description, amount: String(exp.amount), type: exp.type, expense_date: exp.expense_date, notes: exp.notes || "" });
  };
  const handleEdit = async () => {
    if (!editExp) return;
    setEditSaving(true); setError(null);
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}/company-expenses/${editExp.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم التعديل بنجاح");
      setEditExp(null);
      fetchAll();
    } catch { setError("فشل في التعديل"); }
    finally { setEditSaving(false); }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteExp) return;
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}/company-expenses/${deleteExp.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setSuccess("تم الحذف بنجاح");
      setDeleteExp(null);
      fetchAll();
    } catch { setError("فشل في الحذف"); }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>مصروفات الشركة</h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0, fontFamily: "var(--font-cairo)" }}>المصروفات الخاصة بالشركة وتوزيع الأرباح</p>
        </div>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setAddOpen(true)}
          sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
          إضافة
        </Button>
      </div>

      {/* Alerts */}
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontFamily: "var(--font-cairo)", direction: "rtl" }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#86efac", fontFamily: "var(--font-cairo)", direction: "rtl" }}>{success}</Alert>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}><CircularProgress sx={{ color: "#3b82f6" }} /></div>
      ) : (
        <>
          {/* Profit Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "24px" }}>
            <div style={{ padding: "16px", borderRadius: "16px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <p style={{ fontSize: "10px", color: "#94a3b8", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>إجمالي الأرباح</p>
              <p style={{ fontSize: "22px", fontWeight: 700, color: "#34d399", margin: 0 }}>{formatNumber(Math.round(totalProfit))}</p>
              <p style={{ fontSize: "9px", color: "#64748b", margin: "4px 0 0", fontFamily: "var(--font-cairo)" }}>فرق المصروفات ({formatNumber(Math.round(expDifference))}) + الإدارة ({formatNumber(Math.round(mgmtAmount))})</p>
            </div>
            <div style={{ padding: "16px", borderRadius: "16px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
              <p style={{ fontSize: "10px", color: "#94a3b8", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>المصروف / الموزع</p>
              <p style={{ fontSize: "22px", fontWeight: 700, color: "#fbbf24", margin: 0 }}>{formatNumber(Math.round(totalSpent))}</p>
              <p style={{ fontSize: "10px", color: "#64748b", margin: "2px 0 0" }}>ج.م</p>
            </div>
            <div style={{ padding: "16px", borderRadius: "16px", background: remaining >= 0 ? "rgba(59,130,246,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${remaining >= 0 ? "rgba(59,130,246,0.15)" : "rgba(239,68,68,0.15)"}` }}>
              <p style={{ fontSize: "10px", color: "#94a3b8", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>المتبقي</p>
              <p style={{ fontSize: "22px", fontWeight: 700, color: remaining >= 0 ? "#60a5fa" : "#f87171", margin: 0 }}>{formatNumber(Math.round(remaining))}</p>
              <p style={{ fontSize: "10px", color: "#64748b", margin: "2px 0 0" }}>ج.م</p>
            </div>
          </div>

          {/* Expenses Table */}
          {companyExps.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#64748b", fontFamily: "var(--font-cairo)" }}>لا توجد مصروفات مسجلة</div>
          ) : (
            <div style={{ borderRadius: "20px", overflow: "hidden", border: "1px solid rgba(148,163,184,0.08)", background: "rgba(30,41,59,0.5)" }}>
              {/* Table Header */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: "8px", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "#64748b", fontFamily: "var(--font-cairo)", background: "rgba(15,23,42,0.4)" }}>
                <span>الوصف</span>
                <span style={{ textAlign: "center" }}>المبلغ</span>
                <span style={{ textAlign: "center" }}>النوع</span>
                <span style={{ textAlign: "center" }}>التاريخ</span>
                <span></span>
              </div>
              {companyExps.map((exp, idx) => (
                <div key={exp.id} style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: "8px",
                  padding: "14px 20px", alignItems: "center",
                  background: idx % 2 === 0 ? "transparent" : "rgba(15,23,42,0.2)",
                  borderBottom: "1px solid rgba(148,163,184,0.04)",
                }}>
                  <div>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", fontFamily: "var(--font-cairo)" }}>{exp.description}</span>
                    {exp.notes && <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0", fontFamily: "var(--font-cairo)" }}>{exp.notes}</p>}
                  </div>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#fbbf24", textAlign: "center" }}>{formatNumber(Number(exp.amount))}</span>
                  <div style={{ textAlign: "center" }}>
                    <Chip label={exp.type === "EXPENSE" ? "مصروف" : "توزيع أرباح"} size="small"
                      sx={{ height: "22px", fontSize: "10px", fontWeight: 600, fontFamily: "var(--font-cairo)",
                        backgroundColor: exp.type === "EXPENSE" ? "rgba(245,158,11,0.15)" : "rgba(139,92,246,0.15)",
                        color: exp.type === "EXPENSE" ? "#fbbf24" : "#a78bfa",
                      }} />
                  </div>
                  <span style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", fontFamily: "var(--font-cairo)" }}>{formatDate(exp.expense_date)}</span>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <IconButton size="small" onClick={() => openEdit(exp)} sx={{ color: "#60a5fa" }}><EditOutlined sx={{ fontSize: 16 }} /></IconButton>
                    <IconButton size="small" onClick={() => setDeleteExp(exp)} sx={{ color: "#f87171" }}><DeleteOutlined sx={{ fontSize: 16 }} /></IconButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700 }}>إضافة مصروف / توزيع أرباح</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: "16px", pt: "16px !important" }}>
          <TextField label="الوصف" value={addForm.description} onChange={e => setAddForm({ ...addForm, description: e.target.value })} fullWidth sx={fieldSx} />
          <TextField label="المبلغ" type="number" value={addForm.amount} onChange={e => setAddForm({ ...addForm, amount: e.target.value })} fullWidth sx={fieldSx} />
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>النوع</InputLabel>
            <Select value={addForm.type} label="النوع" onChange={e => setAddForm({ ...addForm, type: e.target.value })}>
              <MenuItem value="EXPENSE">مصروف</MenuItem>
              <MenuItem value="PROFIT_DISTRIBUTION">توزيع أرباح</MenuItem>
            </Select>
          </FormControl>
          <TextField label="التاريخ" type="date" value={addForm.expense_date} onChange={e => setAddForm({ ...addForm, expense_date: e.target.value })} fullWidth sx={fieldSx} InputLabelProps={{ shrink: true }} />
          <TextField label="ملاحظات" value={addForm.notes} onChange={e => setAddForm({ ...addForm, notes: e.target.value })} fullWidth multiline rows={2} sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={handleAdd} disabled={addSaving || !addForm.description || !addForm.amount} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
            {addSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حفظ"}
          </Button>
          <Button onClick={() => setAddOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editExp} onClose={() => setEditExp(null)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700 }}>تعديل</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: "16px", pt: "16px !important" }}>
          <TextField label="الوصف" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} fullWidth sx={fieldSx} />
          <TextField label="المبلغ" type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} fullWidth sx={fieldSx} />
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>النوع</InputLabel>
            <Select value={editForm.type} label="النوع" onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
              <MenuItem value="EXPENSE">مصروف</MenuItem>
              <MenuItem value="PROFIT_DISTRIBUTION">توزيع أرباح</MenuItem>
            </Select>
          </FormControl>
          <TextField label="التاريخ" type="date" value={editForm.expense_date} onChange={e => setEditForm({ ...editForm, expense_date: e.target.value })} fullWidth sx={fieldSx} InputLabelProps={{ shrink: true }} />
          <TextField label="ملاحظات" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} fullWidth multiline rows={2} sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={handleEdit} disabled={editSaving || !editForm.description || !editForm.amount} variant="contained"
            sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
            {editSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حفظ التعديل"}
          </Button>
          <Button onClick={() => setEditExp(null)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteExp} onClose={() => setDeleteExp(null)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700 }}>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <p style={{ fontFamily: "var(--font-cairo)", color: "#cbd5e1" }}>هل أنت متأكد من حذف &quot;{deleteExp?.description}&quot;؟</p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={handleDelete} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "#ef4444" }}>حذف</Button>
          <Button onClick={() => setDeleteExp(null)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
