"use client";
import { useState, useEffect, useCallback } from "react";
import { useProject } from "../layout";
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Alert, IconButton, Chip, ToggleButton, ToggleButtonGroup
} from "@mui/material";
import { AddOutlined, DeleteOutline, SwapHorizOutlined, ReceiptOutlined, HistoryOutlined } from "@mui/icons-material";

const fieldSx = {
  "& .MuiOutlinedInput-root": { borderRadius: "12px", backgroundColor: "rgba(15,23,42,0.5)", color: "#e2e8f0", fontFamily: "var(--font-cairo)", "& fieldset": { borderColor: "rgba(148,163,184,0.15)" }, "&:hover fieldset": { borderColor: "rgba(59,130,246,0.4)" }, "&.Mui-focused fieldset": { borderColor: "#3b82f6" } },
  "& .MuiInputLabel-root": { color: "#94a3b8", fontFamily: "var(--font-cairo)", "&.Mui-focused": { color: "#60a5fa" } },
  "& .MuiInputBase-input": { textAlign: "right" },
};
const dialogSx = { "& .MuiDialog-paper": { background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "20px", color: "#e2e8f0", direction: "rtl" as const, minWidth: "min(480px, 94vw)", maxHeight: "90vh" } };
const menuSx = { PaperProps: { sx: { background: "#1e293b", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "12px", "& .MuiMenuItem-root": { fontFamily: "var(--font-cairo)", color: "#e2e8f0", "&:hover": { background: "rgba(59,130,246,0.1)" } } } } };
const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

export default function VaultsPage() {
  const { projectId } = useProject();
  const [vaults, setVaults] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { if (!success) return; const t = setTimeout(() => setSuccess(null), 4000); return () => clearTimeout(t); }, [success]);
  useEffect(() => { if (!error) return; const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t); }, [error]);

  // Add vault dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", type: "vault", user_id: "", initial_balance: "" });
  const [saving, setSaving] = useState(false);

  // Transfer dialog
  const [transferOpen, setTransferOpen] = useState(false);
  const [transfer, setTransfer] = useState({ from_vault_id: "", to_vault_id: "", amount: "", notes: "" });

  // Tx dialog
  const [txOpen, setTxOpen] = useState(false);
  const [txVault, setTxVault] = useState<any>(null);
  const [txForm, setTxForm] = useState({ type: "deposit", amount: "", notes: "" });

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // History dialog
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyVault, setHistoryVault] = useState<any>(null);
  const [historyTxs, setHistoryTxs] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const openHistory = async (v: any) => {
    setHistoryVault(v); setHistoryTxs([]); setHistoryLoading(true); setHistoryOpen(true);
    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-vaults/${v.id}/transactions`);
    const d = await res.json();
    setHistoryTxs(d.transactions || []);
    setHistoryLoading(false);
  };

  const fetchVaults = useCallback(async () => {
    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-vaults`);
    const d = await res.json();
    setVaults(d.vaults || []);
    setLoading(false);
  }, [projectId]);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/erp-auth/users");
    const d = await res.json();
    setUsers(d.users || []);
  }, []);

  useEffect(() => { fetchVaults(); fetchUsers(); }, [fetchVaults, fetchUsers]);

  // Combined transactions view
  const [allTxs, setAllTxs] = useState<any[]>([]);
  const [allTxsLoading, setAllTxsLoading] = useState(false);
  const [filterVault, setFilterVault] = useState("");

  const fetchAllTxs = useCallback(async (vaultId = "") => {
    setAllTxsLoading(true);
    const url = `/api/erp-auth/projects/${projectId}/proj2-vaults/all-transactions${vaultId ? `?vault_id=${vaultId}` : ""}`;
    const res = await fetch(url);
    const d = await res.json();
    setAllTxs(d.transactions || []);
    setAllTxsLoading(false);
  }, [projectId]);

  useEffect(() => { if (!loading) fetchAllTxs(); }, [loading, fetchAllTxs]);

  const handleAdd = async () => {
    setSaving(true);
    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-vaults`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...addForm, initial_balance: Number(addForm.initial_balance) || 0 }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); } else { setSuccess("تم إضافة الخزنة"); setAddOpen(false); fetchVaults(); }
    setSaving(false);
  };

  const handleTx = async () => {
    setSaving(true);
    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-vaults/${txVault.id}/transactions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...txForm, amount: Number(txForm.amount) }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); } else { setSuccess("تم تسجيل الحركة"); setTxOpen(false); fetchVaults(); }
    setSaving(false);
  };

  const handleTransfer = async () => {
    setSaving(true);
    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-vaults/transfer`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...transfer, amount: Number(transfer.amount) }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); } else { setSuccess("تم التحويل بنجاح"); setTransferOpen(false); fetchVaults(); }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleteSaving(true);
    const res = await fetch(`/api/erp-auth/projects/${projectId}/proj2-vaults/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); setError(d.error); } else { setSuccess("تم الحذف"); setDeleteOpen(false); fetchVaults(); }
    setDeleteSaving(false);
  };

  const totalBalance = vaults.reduce((s, v) => s + Number(v.balance), 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", fontFamily: "var(--font-cairo)" }}>الخزنة والعهد</h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0, fontFamily: "var(--font-cairo)" }}>إدارة الأرصدة والحركات المالية</p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Button variant="outlined" startIcon={<SwapHorizOutlined />} onClick={() => setTransferOpen(true)} disabled={vaults.length < 2}
            sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontSize: "13px", textTransform: "none", borderColor: "rgba(148,163,184,0.3)", color: "#e2e8f0", whiteSpace: "nowrap" }}>
            تحويل بين الخزن
          </Button>
          <Button variant="contained" startIcon={<AddOutlined />}
            onClick={() => { setAddForm({ name: "", type: "vault", user_id: "", initial_balance: "" }); setAddOpen(true); }}
            sx={{ borderRadius: "12px", fontFamily: "var(--font-cairo)", fontWeight: 600, fontSize: "13px", textTransform: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", whiteSpace: "nowrap" }}>
            إضافة خزنة
          </Button>
        </div>
      </div>

      {/* Total */}
      {vaults.length > 0 && (
        <div style={{ marginBottom: "20px", padding: "16px 20px", borderRadius: "16px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", fontSize: "14px" }}>إجمالي الأرصدة</span>
          <span style={{ fontFamily: "var(--font-cairo)", fontSize: "22px", fontWeight: 700, color: "#60a5fa" }}>{fmt(totalBalance)} <span style={{ fontSize: "13px", fontWeight: 400 }}>جنيه</span></span>
        </div>
      )}

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontFamily: "var(--font-cairo)", direction: "rtl", textAlign: "right" }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2, borderRadius: "12px", backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#86efac", fontFamily: "var(--font-cairo)", direction: "rtl", textAlign: "right" }}>{success}</Alert>}

      {loading ? <div style={{ textAlign: "center", padding: "60px 0" }}><CircularProgress sx={{ color: "#3b82f6" }} /></div>
        : vaults.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", borderRadius: "20px", background: "rgba(30,41,59,0.4)", border: "1px solid rgba(148,163,184,0.08)" }}>
            <p style={{ fontSize: "48px", margin: "0 0 12px" }}>🏦</p>
            <p style={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", fontSize: "16px" }}>لا توجد خزن أو عهد بعد</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
            {vaults.map(v => (
              <div key={v.id} style={{ padding: "20px", borderRadius: "18px", background: "rgba(30,41,59,0.5)", border: "1px solid rgba(148,163,184,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <p style={{ fontSize: "15px", fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: "var(--font-cairo)" }}>{v.name}</p>
                    <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0", fontFamily: "var(--font-cairo)" }}>
                      {v.type === "vault" ? "🏦 خزنة" : "👤 عهدة"}
                      {v.type === "custody" && v.user_id && (() => { const u = users.find((u: any) => u.id === v.user_id); return u ? ` — ${u.name}` : ""; })()}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "2px" }}>
                    <IconButton size="small" onClick={() => openHistory(v)} title="كشف الحركات"
                      sx={{ color: "#60a5fa", "&:hover": { background: "rgba(96,165,250,0.1)" } }}>
                      <HistoryOutlined sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => { setTxVault(v); setTxForm({ type: "deposit", amount: "", notes: "" }); setTxOpen(true); }} sx={{ color: "#10b981", "&:hover": { background: "rgba(16,185,129,0.1)" } }}><ReceiptOutlined sx={{ fontSize: 16 }} /></IconButton>
                    <IconButton size="small" onClick={() => { setDeleteTarget(v); setDeleteOpen(true); }} sx={{ color: "#64748b", "&:hover": { color: "#f87171", background: "rgba(248,113,113,0.1)" } }}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton>
                  </div>
                </div>
                <p style={{ fontSize: "26px", fontWeight: 700, color: Number(v.balance) >= 0 ? "#10b981" : "#ef4444", margin: 0, fontFamily: "var(--font-cairo)" }}>
                  {fmt(Number(v.balance))}
                  <span style={{ fontSize: "13px", fontWeight: 400, color: "#64748b", marginRight: "6px" }}>جنيه</span>
                </p>
              </div>
            ))}
          </div>
        )}

      {/* Combined Transactions Section */}
      <div style={{ marginTop: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px", direction: "rtl" }}>
          <p style={{ fontSize: "16px", fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: "var(--font-cairo)" }}>📋 كشف الحركات الشامل</p>
          <FormControl size="small" sx={{ minWidth: "180px", ...fieldSx }}>
            <InputLabel>فلتر الخزنة</InputLabel>
            <Select value={filterVault} onChange={e => { setFilterVault(e.target.value); fetchAllTxs(e.target.value); }} label="فلتر الخزنة" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              <MenuItem value="" sx={{ fontFamily: "var(--font-cairo)" }}>كل الخزن</MenuItem>
              {vaults.map(v => <MenuItem key={v.id} value={v.id} sx={{ fontFamily: "var(--font-cairo)" }}>{v.name}</MenuItem>)}
            </Select>
          </FormControl>
        </div>
        {allTxsLoading ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}><CircularProgress size={28} sx={{ color: "#3b82f6" }} /></div>
        ) : allTxs.length === 0 ? (
          <p style={{ textAlign: "center", color: "#475569", fontFamily: "var(--font-cairo)", fontSize: "14px", padding: "28px 0" }}>لا توجد حركات بعد</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {allTxs.map((tx: any) => {
              const typeMap: Record<string, { label: string; color: string; sign: string }> = {
                deposit: { label: "إيداع", color: "#10b981", sign: "+" },
                withdrawal: { label: "سحب", color: "#ef4444", sign: "−" },
                transfer_in: { label: "تحويل وارد", color: "#3b82f6", sign: "+" },
                transfer_out: { label: "تحويل صادر", color: "#f59e0b", sign: "−" },
              };
              const t = typeMap[tx.type] || { label: tx.type, color: "#94a3b8", sign: "" };
              return (
                <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "12px", background: "rgba(15,23,42,0.4)", border: "1px solid rgba(148,163,184,0.06)", direction: "rtl" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: t.color, background: `${t.color}18`, padding: "3px 8px", borderRadius: "8px", fontFamily: "var(--font-cairo)", whiteSpace: "nowrap", flexShrink: 0 }}>{t.label}</span>
                  <span style={{ fontSize: "12px", color: "#60a5fa", fontFamily: "var(--font-cairo)", whiteSpace: "nowrap", flexShrink: 0 }}>{tx.vault?.name || ""}</span>
                  <span style={{ fontSize: "12px", color: "#64748b", fontFamily: "var(--font-cairo)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.notes || "—"}</span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: t.color, fontFamily: "monospace", whiteSpace: "nowrap", flexShrink: 0 }}>{t.sign}{fmt(Number(tx.amount))}</span>
                  <span style={{ fontSize: "10px", color: "#475569", whiteSpace: "nowrap", flexShrink: 0 }}>{tx.created_at ? new Date(tx.created_at).toLocaleDateString("en-GB") : ""}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Vault Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>إضافة خزنة / عهدة</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <TextField label="الاسم *" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} fullWidth sx={fieldSx} />
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>النوع</InputLabel>
            <Select value={addForm.type} onChange={e => setAddForm({ ...addForm, type: e.target.value, user_id: "" })} label="النوع" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              <MenuItem value="vault">🏦 خزنة</MenuItem>
              <MenuItem value="custody">👤 عهدة</MenuItem>
            </Select>
          </FormControl>

          {addForm.type === "custody" && (
            <FormControl fullWidth sx={fieldSx} required>
              <InputLabel>المسؤول عن العهدة *</InputLabel>
              <Select value={addForm.user_id} onChange={e => setAddForm({ ...addForm, user_id: e.target.value })} label="المسؤول عن العهدة *" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
                {users.length === 0
                  ? <MenuItem disabled sx={{ fontFamily: "var(--font-cairo)", color: "#64748b" }}>لا يوجد مستخدمون</MenuItem>
                  : users.map((u: any) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)
                }
              </Select>
            </FormControl>
          )}
          <TextField label="الرصيد الافتتاحي (اختياري)" type="number" value={addForm.initial_balance} onChange={e => setAddForm({ ...addForm, initial_balance: e.target.value })} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setAddOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleAdd}
            disabled={saving || !addForm.name || (addForm.type === "custody" && !addForm.user_id)}
            variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "إضافة"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tx Dialog */}
      <Dialog open={txOpen} onClose={() => setTxOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>حركة: {txVault?.name}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <ToggleButtonGroup value={txForm.type} exclusive onChange={(_, v) => v && setTxForm({ ...txForm, type: v })} fullWidth>
            <ToggleButton value="deposit" sx={{ fontFamily: "var(--font-cairo)", color: "#10b981", "&.Mui-selected": { background: "rgba(16,185,129,0.15)", color: "#10b981" } }}>إيداع</ToggleButton>
            <ToggleButton value="withdrawal" sx={{ fontFamily: "var(--font-cairo)", color: "#f87171", "&.Mui-selected": { background: "rgba(248,113,113,0.15)", color: "#f87171" } }}>سحب</ToggleButton>
          </ToggleButtonGroup>
          <TextField label="المبلغ *" type="number" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} />
          <TextField label="ملاحظات" value={txForm.notes} onChange={e => setTxForm({ ...txForm, notes: e.target.value })} fullWidth multiline rows={2} sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setTxOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleTx} disabled={saving || !txForm.amount} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: txForm.type === "deposit" ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "#dc2626" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : txForm.type === "deposit" ? "إيداع" : "سحب"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onClose={() => setTransferOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>تحويل بين الخزن</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>من خزنة *</InputLabel>
            <Select value={transfer.from_vault_id} onChange={e => setTransfer({ ...transfer, from_vault_id: e.target.value })} label="من خزنة *" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              {vaults.map(v => <MenuItem key={v.id} value={v.id}>{v.name} — {fmt(Number(v.balance))} جنيه</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>إلى خزنة *</InputLabel>
            <Select value={transfer.to_vault_id} onChange={e => setTransfer({ ...transfer, to_vault_id: e.target.value })} label="إلى خزنة *" sx={{ color: "#e2e8f0" }} MenuProps={menuSx}>
              {vaults.filter(v => v.id !== transfer.from_vault_id).map(v => <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="المبلغ *" type="number" value={transfer.amount} onChange={e => setTransfer({ ...transfer, amount: e.target.value })} fullWidth sx={{ ...fieldSx, "& .MuiInputBase-input": { textAlign: "left", direction: "ltr" } }} />
          <TextField label="ملاحظات" value={transfer.notes} onChange={e => setTransfer({ ...transfer, notes: e.target.value })} fullWidth sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setTransferOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleTransfer} disabled={saving || !transfer.from_vault_id || !transfer.to_vault_id || !transfer.amount} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
            {saving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "تحويل"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} sx={dialogSx}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px", color: "#f87171" }}>حذف الخزنة</DialogTitle>
        <DialogContent><p style={{ fontFamily: "var(--font-cairo)", color: "#94a3b8", fontSize: "15px", margin: 0 }}>هل تريد حذف <strong style={{ color: "#e2e8f0" }}>{deleteTarget?.name}</strong>؟</p></DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إلغاء</Button>
          <Button onClick={handleDelete} disabled={deleteSaving} variant="contained" sx={{ borderRadius: "10px", fontFamily: "var(--font-cairo)", fontWeight: 600, textTransform: "none", background: "#dc2626" }}>
            {deleteSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "حذف"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} sx={{ "& .MuiDialog-paper": { background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: "20px", color: "#e2e8f0", direction: "rtl" as const, minWidth: "min(520px, 94vw)", maxHeight: "85vh" } }}>
        <DialogTitle sx={{ fontFamily: "var(--font-cairo)", fontWeight: 700, fontSize: "20px" }}>
          كشف حركات: {historyVault?.name}
        </DialogTitle>
        <DialogContent sx={{ pt: "8px !important" }}>
          {historyLoading ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}><CircularProgress sx={{ color: "#3b82f6" }} size={32} /></div>
          ) : historyTxs.length === 0 ? (
            <p style={{ textAlign: "center", color: "#64748b", fontFamily: "var(--font-cairo)", fontSize: "14px", padding: "32px 0" }}>لا توجد حركات بعد</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {historyTxs.map((tx: any) => {
                const typeMap: Record<string, { label: string; color: string; sign: string }> = {
                  deposit:      { label: "إيداع",       color: "#10b981", sign: "+" },
                  withdrawal:   { label: "سحب",         color: "#ef4444", sign: "−" },
                  transfer_in:  { label: "تحويل وارد", color: "#3b82f6", sign: "+" },
                  transfer_out: { label: "تحويل صادر", color: "#f59e0b", sign: "−" },
                };
                const t = typeMap[tx.type] || { label: tx.type, color: "#94a3b8", sign: "" };
                return (
                  <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", borderRadius: "12px", background: "rgba(15,23,42,0.4)", border: "1px solid rgba(148,163,184,0.06)", direction: "rtl" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: t.color, background: `${t.color}18`, padding: "3px 8px", borderRadius: "8px", fontFamily: "var(--font-cairo)", whiteSpace: "nowrap", flexShrink: 0 }}>{t.label}</span>
                    <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "var(--font-cairo)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.notes || "—"}</span>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: t.color, fontFamily: "monospace", whiteSpace: "nowrap", flexShrink: 0 }}>{t.sign}{fmt(Number(tx.amount))}</span>
                    <span style={{ fontSize: "10px", color: "#475569", whiteSpace: "nowrap", flexShrink: 0 }}>{tx.created_at ? new Date(tx.created_at).toLocaleDateString("en-GB") : ""}</span>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setHistoryOpen(false)} sx={{ color: "#94a3b8", fontFamily: "var(--font-cairo)", textTransform: "none" }}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
