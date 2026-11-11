"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
} from "@mui/material";
import AdminAuthenticatedLayout from "../components/AdminAuthenticatedLayout";
import {
    cellSx,
    DetailSection,
    dialogPaperProps,
    fieldSx,
    formatDateTime,
    headCellSx,
    PageHeader,
    primaryButtonSx,
    StatusChip,
    WhatsAppButton,
} from "../components/SubmissionShared";
import { ENQUIRY_STATUS_LABELS, UNIT_EVENT_LABELS, journeyLines, unitIdToCode, type EnquiryJourney } from "@/lib/unitEnquiry";

const FONT = "var(--font-cairo), Cairo, sans-serif";
const STATUS_COLORS: Record<string, string> = { NEW: "#2563eb", CONTACTED: "#d97706", INTERESTED: "#16a34a", CLOSED: "#6b7280" };

interface Enquiry {
    id: string;
    reference: string;
    status: string;
    units: string[];
    full_name: string;
    phone: string;
    email: string;
    contact_method: string;
    best_time: string;
    purpose: string;
    message: string;
    source: string;
    notes: string;
    journey?: EnquiryJourney;
    created_at: string;
}

type Totals = Record<string, Record<string, number>>;

export default function UnitEnquiriesPage() {
    const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
    const [totals, setTotals] = useState<Totals>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [selected, setSelected] = useState<Enquiry | null>(null);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const [a, b] = await Promise.all([fetch("/api/sanad-zayed/unit-enquiries"), fetch("/api/sanad-zayed/unit-events")]);
            const da = await a.json();
            const db = await b.json();
            if (!a.ok) setError(da.error);
            else setEnquiries(da.enquiries);
            if (b.ok) setTotals(db.totals);
        } catch {
            setError("فشل في تحميل البيانات");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const save = async (patch: { status?: string; notes?: string }) => {
        if (!selected) return;
        setSaving(true);
        try {
            const res = await fetch("/api/sanad-zayed/unit-enquiries", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: selected.id, ...patch }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error);
                return;
            }
            setEnquiries((list) => list.map((e) => (e.id === data.enquiry.id ? data.enquiry : e)));
            setSelected(data.enquiry);
        } finally {
            setSaving(false);
        }
    };

    const visible = enquiries.filter((e) => statusFilter === "ALL" || e.status === statusFilter);
    const ranking = useMemo(
        () =>
            Object.entries(totals)
                .map(([id, t]) => ({ id, t, score: (t.view ?? 0) + 3 * (t.brochure ?? 0) + 2 * (t.tour ?? 0) + 10 * (t.enquiry ?? 0) }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 12),
        [totals]
    );

    return (
        <AdminAuthenticatedLayout>
            <div style={{ maxWidth: "1600px", margin: "0 auto", width: "100%" }}>
                <PageHeader title="استفسارات وحدات سند زايد" subtitle="طلبات التواصل من المخطط التفاعلي، والوحدات الأكثر اهتمامًا">
                    <TextField select size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ ...fieldSx, minWidth: 180 }}>
                        <MenuItem value="ALL">كل الحالات</MenuItem>
                        {Object.entries(ENQUIRY_STATUS_LABELS).map(([k, v]) => (
                            <MenuItem key={k} value={k}>
                                {v}
                            </MenuItem>
                        ))}
                    </TextField>
                </PageHeader>

                {error && (
                    <Alert severity="error" sx={{ mb: 2, fontFamily: FONT }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {loading ? (
                    <div style={{ textAlign: "center", padding: 60 }}>
                        <CircularProgress />
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 20, alignItems: "start" }}>
                        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                            <Table>
                                <TableHead sx={{ background: "#154278" }}>
                                    <TableRow>
                                        {["التاريخ", "الاسم", "الهاتف", "الوحدات", "التواصل", "الحالة"].map((h) => (
                                            <TableCell key={h} sx={headCellSx} align="right">
                                                {h}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {visible.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center" sx={{ ...cellSx, py: 6, color: "#6b7280" }}>
                                                لا توجد استفسارات بعد
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {visible.map((e) => (
                                        <TableRow
                                            key={e.id}
                                            hover
                                            sx={{ cursor: "pointer" }}
                                            onClick={() => {
                                                setSelected(e);
                                                setNotes(e.notes);
                                            }}
                                        >
                                            <TableCell sx={cellSx} align="right">
                                                {formatDateTime(e.created_at)}
                                            </TableCell>
                                            <TableCell sx={{ ...cellSx, fontWeight: 700 }} align="right">
                                                {e.full_name}
                                            </TableCell>
                                            <TableCell sx={cellSx} align="right" dir="ltr">
                                                {e.phone}
                                            </TableCell>
                                            <TableCell sx={cellSx} align="right">
                                                {e.units.map(unitIdToCode).join("، ") || "—"}
                                            </TableCell>
                                            <TableCell sx={cellSx} align="right">
                                                {e.contact_method}
                                            </TableCell>
                                            <TableCell sx={cellSx} align="right">
                                                <StatusChip label={ENQUIRY_STATUS_LABELS[e.status] ?? e.status} color={STATUS_COLORS[e.status] ?? "#6b7280"} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <Paper sx={{ borderRadius: 2, p: 2.5, fontFamily: FONT }}>
                            <h3 style={{ margin: "0 0 4px", fontFamily: FONT, fontSize: 17 }}>الوحدات الأكثر اهتمامًا</h3>
                            <p style={{ margin: "0 0 14px", color: "#6b7280", fontSize: 12.5, fontFamily: FONT }}>
                                من تفاعل الزوار مع المخطط: المشاهدات والبروشورات والجولات والاستفسارات
                            </p>
                            {ranking.length === 0 && <div style={{ color: "#9ca3af", fontSize: 14, fontFamily: FONT }}>لا توجد بيانات بعد</div>}
                            {ranking.map((r, i) => (
                                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: i ? "1px solid #f1f1f1" : 0, fontFamily: FONT, fontSize: 13.5 }}>
                                    <strong dir="ltr">{unitIdToCode(r.id)}</strong>
                                    <span style={{ color: "#4b5563" }}>
                                        {(["view", "brochure", "tour", "enquiry"] as const)
                                            .filter((k) => r.t[k])
                                            .map((k) => `${UNIT_EVENT_LABELS[k]} ${r.t[k]}`)
                                            .join(" · ")}
                                    </span>
                                </div>
                            ))}
                        </Paper>
                    </div>
                )}

                <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth PaperProps={dialogPaperProps}>
                    {selected && (
                        <>
                            <DialogTitle sx={{ fontFamily: FONT, fontWeight: 700 }}>
                                {selected.full_name} <span style={{ color: "#6b7280", fontSize: 14 }}>({selected.reference})</span>
                            </DialogTitle>
                            <DialogContent>
                                <DetailSection
                                    title="بيانات الاستفسار"
                                    rows={[
                                        ["الوحدات", selected.units.map(unitIdToCode).join("، ") || "لم يحدد"],
                                        ["الهاتف", <span key="p" dir="ltr">{selected.phone}</span>],
                                        ["البريد الإلكتروني", selected.email || "—"],
                                        ["طريقة التواصل", selected.contact_method],
                                        ["الوقت المناسب", selected.best_time || "—"],
                                        ["الغرض", selected.purpose || "—"],
                                        ["الرسالة", selected.message || "—"],
                                        ["المصدر", selected.source === "3d" ? "المخطط ثلاثي الأبعاد" : selected.source === "2d" ? "المخطط العام" : selected.source || "—"],
                                        ["التاريخ", formatDateTime(selected.created_at)],
                                    ]}
                                />
                                {journeyLines(selected.journey).length > 0 && (
                                    <div style={{ margin: "14px 0 6px", padding: "12px 14px", borderRadius: 10, background: "#f6f3ec", border: "1px solid #e7dcc3", fontFamily: FONT }}>
                                        <div style={{ fontWeight: 700, color: "#154278", marginBottom: 6 }}>رحلة العميل على المخطط</div>
                                        <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 13.5, lineHeight: 1.9, color: "#374151" }}>
                                            {journeyLines(selected.journey).map((l) => (
                                                <li key={l}>{l}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "12px 0 16px" }}>
                                    <WhatsAppButton
                                        phone={selected.phone}
                                        text={`مرحبًا ${selected.full_name}، معك فريق سند زايد بخصوص استفسارك${selected.units.length ? ` عن الوحدات ${selected.units.map(unitIdToCode).join("، ")}` : ""}.`}
                                    />
                                    <TextField
                                        select
                                        size="small"
                                        label="الحالة"
                                        value={selected.status}
                                        disabled={saving}
                                        onChange={(e) => save({ status: e.target.value })}
                                        sx={{ ...fieldSx, minWidth: 180 }}
                                    >
                                        {Object.entries(ENQUIRY_STATUS_LABELS).map(([k, v]) => (
                                            <MenuItem key={k} value={k}>
                                                {v}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </div>
                                <TextField
                                    label="ملاحظات داخلية"
                                    multiline
                                    minRows={3}
                                    fullWidth
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    sx={fieldSx}
                                />
                            </DialogContent>
                            <DialogActions sx={{ px: 3, pb: 2 }}>
                                <Button onClick={() => setSelected(null)} sx={{ fontFamily: FONT }}>
                                    إغلاق
                                </Button>
                                <Button variant="contained" disabled={saving || notes === selected.notes} onClick={() => save({ notes })} sx={primaryButtonSx}>
                                    حفظ الملاحظات
                                </Button>
                            </DialogActions>
                        </>
                    )}
                </Dialog>
            </div>
        </AdminAuthenticatedLayout>
    );
}
