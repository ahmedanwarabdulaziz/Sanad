"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
} from "@mui/material";
import { DeleteOutlined, EditOutlined } from "@mui/icons-material";
import { cellSx, fieldSx, headCellSx, primaryButtonSx } from "../components/SubmissionShared";
import type { RealEstateCity } from "@/lib/realEstateCities";

const FONT = "var(--font-cairo), Cairo, sans-serif";

// No CSS direction here: the RTL plugin would flip it to ltr, and the page is already rtl.
const paperProps = { sx: { borderRadius: "8px", color: "#111827", width: "100%" } };

/** The admin's list of new cities, and which of them the public form accepts. */
export default function CitiesDialog({ onClose }: { onClose: () => void }) {
  const [cities, setCities] = useState<RealEstateCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<RealEstateCity | null>(null);

  useEffect(() => {
    fetch("/api/real-estate-cities")
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) setCities(data.cities);
        else setError(data.error);
      })
      .catch(() => setError("فشل في تحميل المدن"))
      .finally(() => setLoading(false));
  }, []);

  /** Sends one change; returns the server's answer, or null after showing what went wrong. */
  const send = async (url: string, method: string, body?: object) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body && JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) return data;
      setError(data.error);
    } catch {
      setError("تعذر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setBusy(false);
    }
    return null;
  };

  const updateCity = async (id: string, change: Partial<Pick<RealEstateCity, "name" | "is_eligible">>) => {
    const data = await send(`/api/real-estate-cities/${id}`, "PATCH", change);
    if (data) setCities((list) => list.map((city) => (city.id === id ? data.city : city)));
    return Boolean(data);
  };

  const addCity = async (e: FormEvent) => {
    e.preventDefault();
    const data = await send("/api/real-estate-cities", "POST", { name: newName });
    if (data) {
      setCities((list) => [...list, data.city]);
      setNewName("");
    }
  };

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (editing && (await updateCity(editing.id, { name: editing.name }))) setEditing(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const data = await send(`/api/real-estate-cities/${deleting.id}`, "DELETE");
    if (data) setCities((list) => list.filter((city) => city.id !== deleting.id));
    setDeleting(null);
  };

  const eligibleCount = cities.filter((city) => city.is_eligible).length;

  return (
    <>
      <Dialog open onClose={onClose} maxWidth="sm" PaperProps={paperProps}>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700 }}>المدن الجديدة المتاحة للطلبات</DialogTitle>
        <DialogContent>
          <p style={{ margin: "0 0 16px", fontFamily: FONT, fontSize: 14, color: "#4b5563" }}>
            تظهر في نموذج الطلبات العقارية المدن المحددة فقط، ويُرفض أي طلب لمدينة غيرها. الطلبات المحفوظة تحتفظ باسم
            المدينة كما قُدمت، حتى لو عُدلت المدينة أو حُذفت.
          </p>

          {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, fontFamily: FONT }}>{error}</Alert>}

          <form onSubmit={addCity} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <TextField
              size="small"
              fullWidth
              label="إضافة مدينة جديدة"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              sx={fieldSx}
            />
            <Button type="submit" variant="contained" disabled={busy || !newName.trim()} sx={{ ...primaryButtonSx, flexShrink: 0 }}>
              إضافة
            </Button>
          </form>

          {loading ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <CircularProgress sx={{ color: "#154278" }} />
            </div>
          ) : cities.length === 0 ? (
            <p style={{ textAlign: "center", padding: "24px 0", margin: 0, fontFamily: FONT, color: "#4b5563" }}>
              لا توجد مدن بعد
            </p>
          ) : (
            <>
              <p style={{ margin: "0 0 8px", fontFamily: FONT, fontSize: 13, color: "#4b5563" }}>
                {eligibleCount} متاحة من أصل {cities.length}
              </p>
              <Table size="small" aria-label="المدن الجديدة">
                <TableHead sx={{ background: "#154278" }}>
                  <TableRow>
                    <TableCell sx={{ ...headCellSx, width: 64 }}>متاحة</TableCell>
                    <TableCell sx={headCellSx}>المدينة</TableCell>
                    <TableCell sx={{ ...headCellSx, width: 96 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cities.map((city) => (
                    <TableRow key={city.id}>
                      <TableCell sx={cellSx}>
                        <Checkbox
                          size="small"
                          checked={city.is_eligible}
                          disabled={busy}
                          onChange={(e) => updateCity(city.id, { is_eligible: e.target.checked })}
                          slotProps={{ input: { "aria-label": `${city.name} متاحة للطلبات` } }}
                          sx={{ p: 0.5, "&.Mui-checked": { color: "#154278" } }}
                        />
                      </TableCell>
                      {editing?.id === city.id ? (
                        <TableCell colSpan={2} sx={cellSx}>
                          <form onSubmit={saveEdit} style={{ display: "flex", gap: 8 }}>
                            <TextField
                              size="small"
                              fullWidth
                              autoFocus
                              value={editing.name}
                              onChange={(e) => setEditing({ id: city.id, name: e.target.value })}
                              slotProps={{ htmlInput: { "aria-label": "اسم المدينة" } }}
                              sx={fieldSx}
                            />
                            <Button type="submit" variant="contained" size="small" disabled={busy || !editing.name.trim()} sx={{ ...primaryButtonSx, flexShrink: 0 }}>
                              حفظ
                            </Button>
                            <Button size="small" onClick={() => setEditing(null)} sx={{ fontFamily: FONT, color: "#4b5563", flexShrink: 0 }}>
                              إلغاء
                            </Button>
                          </form>
                        </TableCell>
                      ) : (
                        <>
                          <TableCell sx={{ ...cellSx, color: city.is_eligible ? "#111827" : "#9ca3af" }}>{city.name}</TableCell>
                          <TableCell sx={{ ...cellSx, whiteSpace: "nowrap" }}>
                            <Tooltip title="تعديل">
                              <IconButton size="small" aria-label={`تعديل ${city.name}`} onClick={() => setEditing({ id: city.id, name: city.name })}>
                                <EditOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف">
                              <IconButton size="small" aria-label={`حذف ${city.name}`} onClick={() => setDeleting(city)}>
                                <DeleteOutlined fontSize="small" color="error" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} sx={{ fontFamily: FONT, color: "#4b5563" }}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {deleting && (
        <Dialog open onClose={() => setDeleting(null)} maxWidth="xs" PaperProps={paperProps}>
          <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700 }}>حذف {deleting.name}؟</DialogTitle>
          <DialogContent sx={{ fontFamily: FONT, fontSize: 14, color: "#4b5563" }}>
            لن تظهر هذه المدينة في نموذج الطلبات بعد الآن. الطلبات المحفوظة لهذه المدينة لن تتأثر.
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setDeleting(null)} sx={{ fontFamily: FONT, color: "#4b5563" }}>إلغاء</Button>
            <Button variant="contained" color="error" disabled={busy} onClick={confirmDelete} sx={{ fontFamily: FONT, fontWeight: 600, boxShadow: "none" }}>
              حذف
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
