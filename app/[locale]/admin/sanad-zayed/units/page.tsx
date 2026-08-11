"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Alert, IconButton,
  MenuItem, Select, FormControl, InputLabel
} from "@mui/material";
import {
  AddOutlined, CloseOutlined, ApartmentOutlined, PersonAddAlt1Outlined, SyncAltOutlined,
  EditOutlined, DeleteOutline, ExpandMoreOutlined, ExpandLessOutlined, DragIndicatorOutlined
} from "@mui/icons-material";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { sanitizeDecimalInput } from "@/lib/sanad-zayed/decimalInput";

interface Stage { id: string; name: string; pricing_status: string; target_sellable_area: number; }
interface UnitAllocation { id: string; allocated_sqm: number; contract_id: string; contract?: { investor_id: string; investor?: { name: string } } }
interface Unit {
  id: string; stage_id: string; building_code: string; floor: string; unit_code: string;
  licensed_area: number; notes: string; sort_order: number; stage?: { name: string }; allocations?: UnitAllocation[];
}
interface Contract { id: string; investor?: { name: string }; unit_quantity: number; stage_id: string; contract_date: string; }

export default function UnitsPage() {
  const searchParams = useSearchParams();
  const stageIdFromUrl = searchParams.get("stage_id") ?? "";

  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string>("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);

  const [flash, setFlash] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ building_code: "", floor: "", unit_code: "", licensed_area: "", notes: "" });

  const [assignUnit, setAssignUnit] = useState<Unit | null>(null);
  const [assignForm, setAssignForm] = useState({ contract_id: "", allocated_sqm: "" });
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<UnitAllocation | null>(null);
  const [deletingAllocationId, setDeletingAllocationId] = useState<string | null>(null);

  const [deleteUnit, setDeleteUnit] = useState<Unit | null>(null);
  const [deleteUnitSubmitting, setDeleteUnitSubmitting] = useState(false);

  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
  const dragSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const [reconcileContractId, setReconcileContractId] = useState<string | null>(null);
  const [reconcilePreview, setReconcilePreview] = useState<any>(null);
  const [reconcileSubmitting, setReconcileSubmitting] = useState(false);

  const showFlash = (type: "success" | "error", text: string) => {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 5000);
  };

  const fetchStages = useCallback(async () => {
    const res = await fetch("/api/sanad-zayed/stages");
    const data = await res.json();
    setStages(data.stages ?? []);
    if (!selectedStageId) {
      const initial = stageIdFromUrl && (data.stages ?? []).some((s: Stage) => s.id === stageIdFromUrl)
        ? stageIdFromUrl
        : data.stages?.[0]?.id;
      if (initial) setSelectedStageId(initial);
    }
  }, [selectedStageId, stageIdFromUrl]);

  const fetchUnits = useCallback(async () => {
    if (!selectedStageId) return;
    setLoading(true);
    try {
      const [unitsRes, contractsRes] = await Promise.all([
        fetch(`/api/sanad-zayed/units?stage_id=${selectedStageId}`),
        fetch(`/api/sanad-zayed/contracts?stage_id=${selectedStageId}`),
      ]);
      const unitsData = await unitsRes.json();
      const contractsData = await contractsRes.json();
      setUnits(unitsData.units ?? []);
      setContracts(contractsData.contracts ?? []);
    } catch {
      showFlash("error", "فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [selectedStageId]);

  useEffect(() => { fetchStages(); }, [fetchStages]);
  useEffect(() => { fetchUnits(); }, [fetchUnits]);

  const handleAdd = async () => {
    if (!form.unit_code.trim()) return showFlash("error", "كود الوحدة مطلوب");
    if (!form.licensed_area || Number(form.licensed_area) <= 0) return showFlash("error", "مساحة الوحدة غير صحيحة");

    setSubmitting(true);
    try {
      const res = await fetch("/api/sanad-zayed/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage_id: selectedStageId, ...form, licensed_area: Number(form.licensed_area) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");

      setAddOpen(false);
      setForm({ building_code: "", floor: "", unit_code: "", licensed_area: "", notes: "" });
      showFlash("success", "تم إضافة الوحدة");
      fetchUnits();
    } catch (err: any) {
      showFlash("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openAssign = (unit: Unit) => {
    setAssignUnit(unit);
    setEditingAllocation(null);
    setAssignForm({ contract_id: "", allocated_sqm: "" });
  };

  const openEditAllocation = (unit: Unit, allocation: UnitAllocation) => {
    setAssignUnit(unit);
    setEditingAllocation(allocation);
    setAssignForm({ contract_id: allocation.contract_id, allocated_sqm: String(allocation.allocated_sqm) });
  };

  const handleAssign = async () => {
    if (!assignUnit) return;
    if (!editingAllocation && !assignForm.contract_id) return showFlash("error", "اختر العقد");
    if (!assignForm.allocated_sqm || Number(assignForm.allocated_sqm) <= 0) return showFlash("error", "المساحة غير صحيحة");

    setAssignSubmitting(true);
    try {
      const res = await fetch(
        editingAllocation
          ? `/api/sanad-zayed/units/${assignUnit.id}/allocations/${editingAllocation.id}`
          : `/api/sanad-zayed/units/${assignUnit.id}/allocations`,
        {
          method: editingAllocation ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingAllocation
              ? { allocated_sqm: Number(assignForm.allocated_sqm) }
              : { contract_id: assignForm.contract_id, allocated_sqm: Number(assignForm.allocated_sqm) }
          ),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");

      showFlash("success", editingAllocation ? "تم تحديث المساحة المخصصة" : "تم تخصيص الوحدة للمستثمر");
      setAssignUnit(null);
      setEditingAllocation(null);
      fetchUnits();
    } catch (err: any) {
      showFlash("error", err.message);
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleDeleteAllocation = async (unit: Unit, allocationId: string) => {
    setDeletingAllocationId(allocationId);
    try {
      const res = await fetch(`/api/sanad-zayed/units/${unit.id}/allocations/${allocationId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");

      showFlash("success", "تم إلغاء التخصيص");
      fetchUnits();
    } catch (err: any) {
      showFlash("error", err.message);
    } finally {
      setDeletingAllocationId(null);
    }
  };

  const handleDeleteUnit = async () => {
    if (!deleteUnit) return;
    setDeleteUnitSubmitting(true);
    try {
      const res = await fetch(`/api/sanad-zayed/units/${deleteUnit.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");

      showFlash("success", "تم حذف الوحدة");
      setDeleteUnit(null);
      fetchUnits();
    } catch (err: any) {
      showFlash("error", err.message);
    } finally {
      setDeleteUnitSubmitting(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = units.findIndex(u => u.id === active.id);
    const newIndex = units.findIndex(u => u.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(units, oldIndex, newIndex);
    setUnits(reordered);

    fetch("/api/sanad-zayed/units/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map(u => u.id) }),
    }).catch(() => showFlash("error", "فشل حفظ الترتيب"));
  };

  const openReconcile = async (contractId: string) => {
    setReconcileContractId(contractId);
    const res = await fetch(`/api/sanad-zayed/contracts/${contractId}/reconcile`);
    const data = await res.json();
    setReconcilePreview(data);
  };

  const handleReconcile = async () => {
    if (!reconcileContractId) return;
    setReconcileSubmitting(true);
    try {
      const res = await fetch(`/api/sanad-zayed/contracts/${reconcileContractId}/reconcile`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");

      showFlash("success", data.reconciliation?.delta_amount === 0 ? "تم التأكيد — لا يوجد فرق في المساحة" : "تم رصد تسوية المساحة — يمكن تحصيلها/ردها من صفحة المستثمر");
      setReconcileContractId(null);
      setReconcilePreview(null);
      fetchUnits();
    } catch (err: any) {
      showFlash("error", err.message);
    } finally {
      setReconcileSubmitting(false);
    }
  };

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "10px", backgroundColor: "#f9f9f7", fontFamily: "var(--font-cairo)",
      "& fieldset": { borderColor: "#e5e3dc" },
      "&.Mui-focused fieldset": { borderColor: "#154278", borderWidth: 2 },
    },
    "& .MuiInputLabel-root": { fontFamily: "var(--font-cairo)", fontSize: 14 },
    "& .MuiInputBase-input": { textAlign: "right" }
  };

  // Contracts under this stage that still have unallocated sqm remaining
  const contractsWithRemaining = useMemo(() => {
    // An investor can legitimately hold several contracts of the same area (each
    // destined for its own physical unit later) — number them per-investor, ordered
    // by contract date, so identical-looking contracts stay distinguishable in the
    // assign dropdown instead of appearing as indistinguishable duplicates.
    const seqByInvestor = new Map<string, number>();
    const sorted = [...contracts].sort((a, b) => a.contract_date.localeCompare(b.contract_date));
    const seqByContractId = new Map<string, number>();
    for (const c of sorted) {
      const key = c.investor?.name ?? c.id;
      const next = (seqByInvestor.get(key) ?? 0) + 1;
      seqByInvestor.set(key, next);
      seqByContractId.set(c.id, next);
    }

    const countByInvestor = new Map<string, number>();
    for (const c of contracts) {
      const key = c.investor?.name ?? c.id;
      countByInvestor.set(key, (countByInvestor.get(key) ?? 0) + 1);
    }

    return contracts.map(c => {
      const allocated = units.flatMap(u => u.allocations ?? []).filter(a => a.contract_id === c.id).reduce((sum, a) => sum + Number(a.allocated_sqm), 0);
      const key = c.investor?.name ?? c.id;
      return {
        ...c,
        remaining: Number(c.unit_quantity) - allocated,
        seq: seqByContractId.get(c.id) ?? 1,
        hasSiblings: (countByInvestor.get(key) ?? 1) > 1,
      };
    });
  }, [contracts, units]);

  const stageTotals = useMemo(() => {
    // "Total meters" = the stage's overall planned/target area — the master figure
    // everything else measures progress against. "Converted" = meters that now have
    // a real registered unit (sz_units row), whether or not it's been assigned to an
    // investor yet. "Not converted" = the rest of the stage's plan with no unit yet.
    const stage = stages.find(s => s.id === selectedStageId);
    const totalMeters = Number(stage?.target_sellable_area ?? 0);
    const convertedMeters = units.reduce((sum, u) => sum + Number(u.licensed_area), 0);
    const notConvertedMeters = Math.max(0, totalMeters - convertedMeters);

    // Allocated = meters actually tied to a specific investor's contract (sz_unit_allocations),
    // separate from "converted" above which only checks that a unit record exists.
    const allocatedToInvestors = units.reduce((sum, u) => sum + (u.allocations ?? []).reduce((s, a) => s + Number(a.allocated_sqm), 0), 0);
    const contractsNotFullyAllocated = contractsWithRemaining.filter(c => c.remaining > 0.01).length;
    const contractMetersNotAllocated = contractsWithRemaining.reduce((sum, c) => sum + Math.max(0, c.remaining), 0);

    return { unitCount: units.length, totalMeters, convertedMeters, notConvertedMeters, allocatedToInvestors, contractsNotFullyAllocated, contractMetersNotAllocated };
  }, [units, stages, selectedStageId, contractsWithRemaining]);

  return (
    <div dir="rtl" style={{ fontFamily: "var(--font-cairo), Cairo, sans-serif" }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 900, color: "#111827", margin: 0 }}>الوحدات</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "5px 0 0" }}>
            تُستخدم أيضاً قبل الرخصة لتجميع أكثر من مستثمر على وحدة تقديرية واحدة بنسب مختلفة (مثال: 30% و70%) — ثم تُستبدل بالوحدة الفعلية بمجرد استلام الرخصة
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <FormControl sx={{ ...inputSx, minWidth: 220 }} size="small">
            <InputLabel>المرحلة</InputLabel>
            <Select value={selectedStageId} label="المرحلة" onChange={e => setSelectedStageId(e.target.value)}>
              {stages.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setAddOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "linear-gradient(135deg, #154278 0%, #1e6abf 100%)",
              color: "#fff", border: "none", borderRadius: 12,
              padding: "11px 22px", cursor: "pointer", fontSize: 14, fontWeight: 700,
              fontFamily: "var(--font-cairo)", boxShadow: "0 4px 14px rgba(21,66,120,0.3)",
            }}
          >
            <AddOutlined sx={{ fontSize: 20 }} />
            وحدة جديدة
          </motion.button>
        </div>
      </motion.div>

      <AnimatePresence>
        {flash && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ marginBottom: 16 }}>
            <Alert severity={flash.type} onClose={() => setFlash(null)} sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)" }}>
              {flash.text}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stage-wide totals ── */}
      {!loading && (units.length > 0 || contracts.length > 0) && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid rgba(0,0,0,0.05)", flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>عدد الوحدات</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: "#111827" }}>{stageTotals.unitCount.toLocaleString("ar-EG-u-nu-latn")}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid rgba(0,0,0,0.05)", flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>إجمالي الأمتار</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: "#111827" }}>{stageTotals.totalMeters.toLocaleString("ar-EG-u-nu-latn")} م²</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid rgba(0,0,0,0.05)", flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>إجمالي الأمتار التي تحولت إلى وحدات</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: "#16a34a" }}>{stageTotals.convertedMeters.toLocaleString("ar-EG-u-nu-latn")} م²</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid rgba(0,0,0,0.05)", flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>إجمالي الأمتار التي لم تتحول لوحدات</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: stageTotals.notConvertedMeters > 0 ? "#d97706" : "#16a34a" }}>{stageTotals.notConvertedMeters.toLocaleString("ar-EG-u-nu-latn")} م²</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid rgba(0,0,0,0.05)", flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>عدد أمتار عقود تم تخصيصها</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: "#154278" }}>{stageTotals.allocatedToInvestors.toLocaleString("ar-EG-u-nu-latn")} م²</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid rgba(0,0,0,0.05)", flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>عدد أمتار عقود لم يتم تخصيصها</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: stageTotals.contractMetersNotAllocated > 0 ? "#d97706" : "#16a34a" }}>{stageTotals.contractMetersNotAllocated.toLocaleString("ar-EG-u-nu-latn")} م²</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid rgba(0,0,0,0.05)", flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>عدد عقود لم يتم تخصيص أمتار لها بالكامل</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: stageTotals.contractsNotFullyAllocated > 0 ? "#d97706" : "#16a34a" }}>{stageTotals.contractsNotFullyAllocated.toLocaleString("ar-EG-u-nu-latn")}</div>
          </div>
        </div>
      )}

      {/* ── Contracts pending unit assignment ── */}
      {contractsWithRemaining.some(c => c.remaining > 0.01) && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: "1px solid rgba(0,0,0,0.05)", marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>عقود لم تُخصص لها وحدة كاملة بعد</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {contractsWithRemaining.filter(c => c.remaining > 0.01).map(c => (
              <span key={c.id} style={{ fontSize: 12, background: "rgba(217,119,6,0.1)", color: "#d97706", borderRadius: 8, padding: "5px 10px", fontWeight: 700 }}>
                {c.investor?.name ?? "—"}{c.hasSiblings && ` (عقد ${c.seq} — ${new Date(c.contract_date).toLocaleDateString("ar-EG-u-nu-latn")})`} — متبقي {c.remaining.toLocaleString("ar-EG-u-nu-latn")} م²
              </span>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 60, textAlign: "center" }}><CircularProgress sx={{ color: "#154278" }} /></div>
      ) : units.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, padding: 60, textAlign: "center", color: "#9ca3af" }}>
          <ApartmentOutlined sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
          <div style={{ fontSize: 15, fontWeight: 700 }}>لا توجد وحدات لهذه المرحلة بعد</div>
        </div>
      ) : (
        <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid #f0ede6" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
                <thead>
                  <tr style={{ background: "#f8f7f3", borderBottom: "2px solid #f0ede6" }}>
                    {["", "الوحدة", "إجمالي المساحة", "المخصص", "المتاح", "التخصيصات", ""].map((h, i) => (
                      <th key={i} style={{ padding: "12px 14px", textAlign: "right", fontSize: 12, color: "#6b7280", fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <SortableContext items={units.map(u => u.id)} strategy={verticalListSortingStrategy}>
                  <tbody>
                    {units.map(unit => (
                      <SortableUnitRow
                        key={unit.id}
                        unit={unit}
                        expanded={expandedUnitId === unit.id}
                        onToggleExpand={() => setExpandedUnitId(id => id === unit.id ? null : unit.id)}
                        onAssign={() => openAssign(unit)}
                        onDelete={() => setDeleteUnit(unit)}
                        onEditAllocation={a => openEditAllocation(unit, a)}
                        onReconcile={a => openReconcile(a.contract_id)}
                        onDeleteAllocation={a => handleDeleteAllocation(unit, a.id)}
                        deletingAllocationId={deletingAllocationId}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </div>
          </div>
        </DndContext>
      )}

      {/* ── Add Unit Dialog ── */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} PaperProps={{ sx: { borderRadius: "20px", direction: "rtl", maxWidth: 440, width: "100%" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 800 }}>
          وحدة جديدة
          <IconButton onClick={() => setAddOpen(false)} sx={{ position: "absolute", left: 12, top: 12 }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "10px !important", display: "flex", flexDirection: "column", gap: 2.5 }}>
          <TextField label="المبنى" value={form.building_code} onChange={e => setForm({ ...form, building_code: e.target.value })} fullWidth sx={inputSx} />
          <TextField label="الدور" value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} fullWidth sx={inputSx} />
          <TextField label="كود الوحدة *" value={form.unit_code} onChange={e => setForm({ ...form, unit_code: e.target.value })} fullWidth sx={inputSx}
            placeholder={stages.find(s => s.id === selectedStageId)?.pricing_status === "ESTIMATED" ? "مثال: وحدة تقديرية 1" : undefined} />
          <TextField
            label={stages.find(s => s.id === selectedStageId)?.pricing_status === "ESTIMATED" ? "المساحة المتفق عليها (م²) *" : "المساحة حسب الرخصة (م²) *"}
            type="text" inputMode="decimal" value={form.licensed_area} onChange={e => setForm({ ...form, licensed_area: sanitizeDecimalInput(e.target.value) })} fullWidth sx={inputSx}
            helperText={stages.find(s => s.id === selectedStageId)?.pricing_status === "ESTIMATED" ? "مساحة تقديرية مؤقتة — تُحدَّث لاحقاً بالمساحة الفعلية عند استلام الرخصة" : undefined}
          />
          <TextField label="ملاحظات" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} fullWidth multiline rows={2} sx={inputSx} />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleAdd} variant="contained" disabled={submitting} sx={{ fontFamily: "var(--font-cairo)", background: "#154278", borderRadius: "10px", width: "100%", py: 1.2, fontWeight: 700 }}>
            {submitting ? "جاري الحفظ..." : "إضافة الوحدة"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Assign / Edit Allocation Dialog ── */}
      <Dialog open={!!assignUnit} onClose={() => { setAssignUnit(null); setEditingAllocation(null); }} PaperProps={{ sx: { borderRadius: "20px", direction: "rtl", maxWidth: 420, width: "100%" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 800 }}>
          {editingAllocation ? "تعديل المساحة المخصصة" : "تخصيص وحدة لمستثمر"}
          <IconButton onClick={() => { setAssignUnit(null); setEditingAllocation(null); }} sx={{ position: "absolute", left: 12, top: 12 }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "10px !important", display: "flex", flexDirection: "column", gap: 2.5 }}>
          {editingAllocation ? (
            <div style={{ background: "#f9f9f7", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#6b7280" }}>
              المستثمر: <strong style={{ color: "#111827" }}>{editingAllocation.contract?.investor?.name ?? "—"}</strong>
              {" "}(لتغيير المستثمر، ألغِ هذا التخصيص وأضف تخصيصاً جديداً)
            </div>
          ) : (
            <FormControl fullWidth sx={inputSx}>
              <InputLabel>العقد *</InputLabel>
              <Select value={assignForm.contract_id} label="العقد *" onChange={e => setAssignForm({ ...assignForm, contract_id: e.target.value })}>
                {contractsWithRemaining.filter(c => c.remaining > 0.01).map(c => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.investor?.name ?? "—"}{c.hasSiblings && ` (عقد ${c.seq} — ${new Date(c.contract_date).toLocaleDateString("ar-EG-u-nu-latn")})`} — متبقي {c.remaining.toLocaleString("ar-EG-u-nu-latn")} م²
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <TextField label="المساحة المخصصة من هذه الوحدة (م²) *" type="text" inputMode="decimal" value={assignForm.allocated_sqm} onChange={e => setAssignForm({ ...assignForm, allocated_sqm: sanitizeDecimalInput(e.target.value) })} fullWidth sx={inputSx} />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleAssign} variant="contained" disabled={assignSubmitting} sx={{ fontFamily: "var(--font-cairo)", background: "#154278", borderRadius: "10px", width: "100%", py: 1.2, fontWeight: 700 }}>
            {assignSubmitting ? "جاري الحفظ..." : editingAllocation ? "حفظ التعديل" : "تخصيص"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Reconcile Dialog ── */}
      <Dialog open={!!reconcileContractId} onClose={() => { setReconcileContractId(null); setReconcilePreview(null); }} PaperProps={{ sx: { borderRadius: "20px", direction: "rtl", maxWidth: 420, width: "100%" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 800 }}>
          تسوية مساحة العقد
          <IconButton onClick={() => { setReconcileContractId(null); setReconcilePreview(null); }} sx={{ position: "absolute", left: 12, top: 12 }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "10px !important" }}>
          {reconcilePreview && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: "#374151" }}>
              <div>المساحة المفترضة عند التعاقد: <strong>{Number(reconcilePreview.assumed_area).toLocaleString("ar-EG-u-nu-latn")} م²</strong></div>
              <div>المساحة الفعلية حسب الوحدات المخصصة: <strong>{Number(reconcilePreview.actual_area).toLocaleString("ar-EG-u-nu-latn")} م²</strong></div>
              <div>سعر المتر عند التعاقد: <strong>{Number(reconcilePreview.price_used).toLocaleString("ar-EG-u-nu-latn")}</strong></div>
              <div style={{
                background: reconcilePreview.delta_amount > 0 ? "rgba(217,119,6,0.1)" : reconcilePreview.delta_amount < 0 ? "rgba(5,150,105,0.1)" : "#f9f9f7",
                color: reconcilePreview.delta_amount > 0 ? "#d97706" : reconcilePreview.delta_amount < 0 ? "#059669" : "#6b7280",
                borderRadius: 10, padding: "12px 16px", fontWeight: 800, fontSize: 15
              }}>
                {reconcilePreview.delta_amount > 0 && `على المستثمر دفع ${Number(reconcilePreview.delta_amount).toLocaleString("ar-EG-u-nu-latn")} إضافية`}
                {reconcilePreview.delta_amount < 0 && `للمستثمر رصيد دائن ${Math.abs(Number(reconcilePreview.delta_amount)).toLocaleString("ar-EG-u-nu-latn")}`}
                {reconcilePreview.delta_amount === 0 && "لا يوجد فرق في المساحة"}
              </div>
              {reconcilePreview.existing_reconciliation && (
                <Alert severity="info" sx={{ fontFamily: "var(--font-cairo)", borderRadius: "10px" }}>
                  تم رصد تسوية لهذا العقد من قبل — الحالة: {reconcilePreview.existing_reconciliation.status === "SETTLED" ? "مسددة" : "معلّقة"}. يمكن إدارة التحصيل/الرد من صفحة المستثمر.
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={handleReconcile}
            variant="contained"
            disabled={reconcileSubmitting || !!reconcilePreview?.existing_reconciliation}
            sx={{ fontFamily: "var(--font-cairo)", background: "#154278", borderRadius: "10px", width: "100%", py: 1.2, fontWeight: 700 }}
          >
            {reconcileSubmitting
              ? "جاري الرصد..."
              : reconcilePreview?.delta_amount === 0
                ? "تأكيد عدم وجود فرق"
                : "رصد التسوية"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Unit Confirm Dialog ── */}
      <Dialog open={!!deleteUnit} onClose={() => setDeleteUnit(null)} PaperProps={{ sx: { borderRadius: "20px", direction: "rtl", maxWidth: 400, width: "100%" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 800 }}>
          حذف الوحدة
          <IconButton onClick={() => setDeleteUnit(null)} sx={{ position: "absolute", left: 12, top: 12 }}><CloseOutlined /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "10px !important" }}>
          <p style={{ fontSize: 14, color: "#374151", margin: 0 }}>
            هل أنت متأكد من حذف الوحدة &quot;{deleteUnit && (deleteUnit.building_code ? `${deleteUnit.building_code} — ` : "") + (deleteUnit?.floor ? `${deleteUnit.floor} — ` : "") + (deleteUnit?.unit_code ?? "")}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
          <Button onClick={() => setDeleteUnit(null)} sx={{ fontFamily: "var(--font-cairo)", color: "#6b7280", fontWeight: 700, textTransform: "none" }}>
            إلغاء
          </Button>
          <Button onClick={handleDeleteUnit} variant="contained" disabled={deleteUnitSubmitting} sx={{ fontFamily: "var(--font-cairo)", background: "#ef4444", "&:hover": { background: "#dc2626" }, borderRadius: "10px", fontWeight: 700, textTransform: "none" }}>
            {deleteUnitSubmitting ? "جاري الحذف..." : "حذف نهائياً"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

function SortableUnitRow({
  unit, expanded, onToggleExpand, onAssign, onDelete, onEditAllocation, onReconcile, onDeleteAllocation, deletingAllocationId,
}: {
  unit: Unit;
  expanded: boolean;
  onToggleExpand: () => void;
  onAssign: () => void;
  onDelete: () => void;
  onEditAllocation: (a: UnitAllocation) => void;
  onReconcile: (a: UnitAllocation) => void;
  onDeleteAllocation: (a: UnitAllocation) => void;
  deletingAllocationId: string | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: unit.id });
  const rowStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    background: isDragging ? "#f3f4f6" : undefined,
    borderBottom: "1px solid #f5f4f0",
  };

  const allocations = unit.allocations ?? [];
  const totalAllocated = allocations.reduce((sum, a) => sum + Number(a.allocated_sqm), 0);
  const remaining = Number(unit.licensed_area) - totalAllocated;

  return (
    <>
      <tr ref={setNodeRef} style={rowStyle}>
        <td style={{ width: 32, padding: "10px 4px", textAlign: "center" }}>
          <span {...attributes} {...listeners} style={{ cursor: "grab", display: "inline-flex", color: "#9ca3af", touchAction: "none" }}>
            <DragIndicatorOutlined sx={{ fontSize: 18 }} />
          </span>
        </td>
        <td onClick={onToggleExpand} style={{ padding: "12px 14px", fontSize: 14, fontWeight: 700, color: "#111827", cursor: "pointer" }}>
          {unit.building_code && `${unit.building_code} — `}{unit.floor && `${unit.floor} — `}{unit.unit_code}
        </td>
        <td style={{ padding: "12px 14px", fontSize: 13, color: "#374151", direction: "ltr", textAlign: "right" }}>
          {unit.licensed_area.toLocaleString("ar-EG-u-nu-latn")} م²
        </td>
        <td style={{ padding: "12px 14px", fontSize: 13, color: "#154278", fontWeight: 700, direction: "ltr", textAlign: "right" }}>
          {totalAllocated.toLocaleString("ar-EG-u-nu-latn")} م²
        </td>
        <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, direction: "ltr", textAlign: "right", color: remaining < 0 ? "#ef4444" : remaining > 0 ? "#d97706" : "#16a34a" }}>
          {Math.max(0, remaining).toLocaleString("ar-EG-u-nu-latn")} م²
          {remaining < -0.01 && (
            <div style={{ fontSize: 10.5, fontWeight: 700 }}>زيادة {Math.abs(remaining).toLocaleString("ar-EG-u-nu-latn")}</div>
          )}
        </td>
        <td style={{ padding: "12px 14px", fontSize: 12.5, color: "#6b7280" }}>
          {allocations.length === 0 ? "—" : `${allocations.length} مستثمر`}
        </td>
        <td style={{ padding: "8px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "flex-end" }}>
            <IconButton size="small" title="تخصيص لمستثمر" onClick={onAssign} sx={{ color: "#9ca3af", "&:hover": { color: "#154278", background: "rgba(21,66,120,0.08)" } }}>
              <PersonAddAlt1Outlined sx={{ fontSize: 17 }} />
            </IconButton>
            {allocations.length === 0 && (
              <IconButton size="small" title="حذف الوحدة" onClick={onDelete} sx={{ color: "#9ca3af", "&:hover": { color: "#ef4444", background: "rgba(239,68,68,0.08)" } }}>
                <DeleteOutline sx={{ fontSize: 17 }} />
              </IconButton>
            )}
            <IconButton size="small" onClick={onToggleExpand} sx={{ color: "#9ca3af" }}>
              {expanded ? <ExpandLessOutlined sx={{ fontSize: 18 }} /> : <ExpandMoreOutlined sx={{ fontSize: 18 }} />}
            </IconButton>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} style={{ padding: "0 14px 14px", background: "#fbfaf8" }}>
            {allocations.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "#9ca3af", padding: "10px 4px" }}>لا يوجد تخصيصات على هذه الوحدة بعد</div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 4 }}>
                {allocations.map(a => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #f0ede6", borderRadius: 8, padding: "5px 10px", fontSize: 12 }}>
                    <span style={{ fontWeight: 700, color: "#111827" }}>{a.contract?.investor?.name ?? "—"}</span>
                    <span style={{ color: "#6b7280" }}>
                      {Number(a.allocated_sqm).toLocaleString("ar-EG-u-nu-latn")} م²
                      {unit.licensed_area > 0 && ` (${((Number(a.allocated_sqm) / Number(unit.licensed_area)) * 100).toFixed(0)}%)`}
                    </span>
                    <button onClick={() => onEditAllocation(a)} title="تعديل المساحة" style={{ border: "none", background: "none", cursor: "pointer", color: "#154278", display: "flex" }}>
                      <EditOutlined sx={{ fontSize: 14 }} />
                    </button>
                    <button onClick={() => onReconcile(a)} title="تسوية المساحة" style={{ border: "none", background: "none", cursor: "pointer", color: "#154278", display: "flex" }}>
                      <SyncAltOutlined sx={{ fontSize: 14 }} />
                    </button>
                    <button
                      onClick={() => onDeleteAllocation(a)}
                      disabled={deletingAllocationId === a.id}
                      title="إلغاء التخصيص"
                      style={{ border: "none", background: "none", cursor: "pointer", color: "#ef4444", display: "flex" }}
                    >
                      <DeleteOutline sx={{ fontSize: 14 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
