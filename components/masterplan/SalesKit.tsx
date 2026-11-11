"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
    ALLOCATION_NOTE,
    BUILDING_INFO,
    FLOOR_NAMES,
    LANDMARKS,
    PROJECT_LOCATION,
    SALES_PHONES,
    STAGES,
    UNIT_BY_ID,
    UNITS,
    directionsUrl,
    distanceKm,
    hyperOneRouteEmbedUrl,
    HYPER_ONE,
    facadeList,
    fmt,
    fmtDims,
    mapsEmbedUrl,
    unitHighlights,
    whatsappUrl,
    type Unit,
} from "@/lib/sanad-zayed/masterplan/data";
import {
    EMPTY_UNIT_ENQUIRY,
    ENQUIRY_BEST_TIMES,
    ENQUIRY_CONTACT_METHODS,
    ENQUIRY_PURPOSES,
    validateUnitEnquiry,
    type UnitEnquiry,
} from "@/lib/unitEnquiry";
import * as J from "./journey";
import base from "./masterplan.module.css";
import sales_ from "./sales.module.css";

const s = { ...base, ...sales_ } as Record<string, string>;

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export type Panel = "finder" | "compare" | "location" | "stages" | "enquiry";

// Views and tours count once per unit per visit, so reopening a unit (or React's dev double-run) doesn't inflate the stats.
const counted = new Set<string>();

/** Fire-and-forget interest counter (view / brochure / tour). */
export function track(unitId: string, event: "view" | "brochure" | "tour", source: string) {
    const key = `${unitId}:${event}`;
    if (event !== "brochure") {
        if (counted.has(key)) return;
        counted.add(key);
    }
    try {
        void fetch("/api/sanad-zayed/unit-events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ unitId, event, source }),
            keepalive: true,
        }).catch(() => undefined);
    } catch {
        /* analytics must never break the page */
    }
}

export function useSales() {
    const [panel, setPanel] = useState<Panel | null>(null);
    const [compare, setCompare] = useState<string[]>([]);
    const [enquiryUnits, setEnquiryUnits] = useState<string[]>([]);
    const toggleCompare = useCallback(
        (id: string) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-3))),
        []
    );
    const enquire = useCallback((ids: string[]) => {
        setEnquiryUnits(ids);
        setPanel("enquiry");
    }, []);
    return { panel, setPanel, compare, toggleCompare, setCompare, enquiryUnits, setEnquiryUnits, enquire };
}
export type Sales = ReturnType<typeof useSales>;

const MENU: { id: Panel; label: string; short: string; icon: string }[] = [
    { id: "finder", label: "ابحث عن وحدتك", short: "ابحث", icon: "⌕" },
    { id: "compare", label: "المقارنة", short: "قارن", icon: "⇄" },
    { id: "location", label: "الموقع", short: "الموقع", icon: "⌖" },
    { id: "stages", label: "مراحل المشروع", short: "المراحل", icon: "◷" },
    { id: "enquiry", label: "استفسر الآن", short: "استفسر", icon: "✉" },
];

export function SalesMenu({ sales, show }: { sales: Sales; show: boolean }) {
    return (
        <motion.div
            className={s.salesBar}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: show ? 1 : 0, y: show ? 0 : -12 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            style={{ pointerEvents: show ? "auto" : "none" }}
        >
            <nav className={cx(s.glass, s.menu)} aria-label="قائمة المشروع">
                {MENU.map((m) => (
                    <button
                        key={m.id}
                        className={cx(s.menuBtn, sales.panel === m.id && s.menuBtnOn, m.id === "enquiry" && s.menuBtnCta)}
                        onClick={() => {
                            if (m.id === "enquiry") sales.setEnquiryUnits(sales.compare);
                            if (sales.panel !== m.id) J.track({ type: "panel", panel: m.id });
                            sales.setPanel(sales.panel === m.id ? null : m.id);
                        }}
                    >
                        <span className={s.menuIcon}>{m.icon}</span>
                        <span className={s.menuLong}>{m.label}</span>
                        <span className={s.menuShort}>{m.short}</span>
                        {m.id === "compare" && sales.compare.length > 0 && <span className={s.badge}>{sales.compare.length}</span>}
                    </button>
                ))}
            </nav>
            <div className={s.ribbon}>
                <span className={s.ribbonDot} />
                {ALLOCATION_NOTE}
            </div>
        </motion.div>
    );
}

function Drawer({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
    return (
        <motion.aside
            className={cx(s.glass, s.drawer, wide && s.drawerWide)}
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -30, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 240 }}
        >
            <div className={s.drawerHead}>
                <h2 className={s.drawerTitle}>{title}</h2>
                <button className={s.iconBtn} onClick={onClose} aria-label="إغلاق">
                    ✕
                </button>
            </div>
            <div className={s.drawerBody}>{children}</div>
        </motion.aside>
    );
}

// ---------------------------------------------------------------- finder

function Finder({ sales, onOpenUnit }: { sales: Sales; onOpenUnit: (id: string) => void }) {
    const [beds, setBeds] = useState(0);
    const [floor, setFloor] = useState(-1);
    const [bld, setBld] = useState("");
    const [garden, setGarden] = useState(false);
    const [northOnly, setNorthOnly] = useState(false);
    const range = useMemo(() => [Math.min(...UNITS.map((u) => u.area)), Math.max(...UNITS.map((u) => u.area))], []);
    const [maxArea, setMaxArea] = useState(range[1]);
    const list = UNITS.filter(
        (u) =>
            (!beds || u.plan.counts.bed === beds) &&
            (floor < 0 || u.floor === floor) &&
            (!bld || u.building === bld) &&
            (!garden || u.floor === 0) &&
            (!northOnly || u.plan.facts.facades.N >= 3.5) &&
            u.area <= maxArea
    ).sort((a, b) => a.area - b.area);
    const chip = (on: boolean, label: string, onClick: () => void) => (
        <button key={label} className={cx(s.fchip, on && s.fchipOn)} onClick={onClick}>
            {label}
        </button>
    );
    return (
        <>
            <div className={s.fGroup}>
                <div className={s.fLabel}>غرف النوم</div>
                <div className={s.fRow}>
                    {chip(beds === 0, "الكل", () => setBeds(0))}
                    {chip(beds === 2, "غرفتان", () => setBeds(2))}
                    {chip(beds === 3, "3 غرف", () => setBeds(3))}
                </div>
            </div>
            <div className={s.fGroup}>
                <div className={s.fLabel}>الدور</div>
                <div className={s.fRow}>
                    {chip(floor < 0, "الكل", () => setFloor(-1))}
                    {[0, 1, 2, 3, 4].map((f) => chip(floor === f, f === 0 ? "أرضي" : String(f), () => setFloor(f)))}
                </div>
            </div>
            <div className={s.fGroup}>
                <div className={s.fLabel}>المبنى</div>
                <div className={s.fRow}>
                    {chip(!bld, "الكل", () => setBld(""))}
                    {chip(bld === "A", "A", () => setBld("A"))}
                    {chip(bld === "B", "B", () => setBld("B"))}
                </div>
            </div>
            <div className={s.fGroup}>
                <div className={s.fLabel}>
                    المساحة حتى <strong>{fmt(maxArea)} م²</strong>
                </div>
                <input className={s.range} type="range" min={range[0]} max={range[1]} value={maxArea} onChange={(e) => setMaxArea(Number(e.target.value))} />
            </div>
            <div className={s.fRow}>
                {chip(garden, "أرضي بحديقة", () => setGarden((v) => !v))}
                {chip(northOnly, "واجهة بحرية", () => setNorthOnly((v) => !v))}
            </div>
            <div className={s.resultHead}>{fmt(list.length)} وحدة مطابقة</div>
            <ul className={s.resultList}>
                {list.map((u) => (
                    <li key={u.id} className={s.resultItem}>
                        <button className={s.resultMain} onClick={() => onOpenUnit(u.id)}>
                            <span className={s.resultCode}>{u.code}</span>
                            <span className={s.resultMeta}>
                                {FLOOR_NAMES[u.floor]} · {u.plan.counts.bed} غرف · {u.plan.counts.bath} حمام
                            </span>
                            <span className={s.resultArea}>{fmt(u.area)} م²</span>
                        </button>
                        <button
                            className={cx(s.cmpBtn, sales.compare.includes(u.id) && s.cmpBtnOn)}
                            onClick={() => sales.toggleCompare(u.id)}
                            title="أضف للمقارنة"
                            aria-label="أضف للمقارنة"
                        >
                            ⇄
                        </button>
                    </li>
                ))}
            </ul>
        </>
    );
}

// ---------------------------------------------------------------- compare

function Compare({ sales, onOpenUnit }: { sales: Sales; onOpenUnit: (id: string) => void }) {
    const units = sales.compare.map((id) => UNIT_BY_ID[id]).filter(Boolean);
    if (!units.length)
        return <p className={s.muted}>أضف حتى 3 وحدات للمقارنة من «ابحث عن وحدتك» أو من صفحة تفاصيل أي وحدة بزر «قارن».</p>;
    const roomDims = (u: Unit, type: string) =>
        u.plan.rooms
            .filter((r) => r.type === type && r.dims)
            .map((r) => fmtDims(r.dims!))
            .join("، ") || "—";
    const rows: [string, (u: Unit) => ReactNode][] = [
        ["المبنى / الدور", (u) => `${BUILDING_INFO[u.building].name} · ${FLOOR_NAMES[u.floor]}`],
        ["المساحة (شاملة نسبة التحميل)", (u) => <strong>{fmt(u.area)} م²</strong>],
        ["غرف النوم", (u) => fmt(u.plan.counts.bed)],
        ["الحمامات", (u) => fmt(u.plan.counts.bath)],
        ["البلكونات", (u) => fmt(u.plan.counts.balc)],
        ["الريسبشن", (u) => roomDims(u, "liv")],
        ["غرف النوم (م)", (u) => roomDims(u, "bed")],
        ["المطبخ", (u) => roomDims(u, "kit")],
        ["الواجهات", (u) => facadeList(u).join("، ") || "—"],
        ["مميزات", (u) => unitHighlights(u).join(" · ") || "—"],
    ];
    return (
        <>
            <div className={s.cmpTableWrap}>
                <table className={s.cmpTable}>
                    <thead>
                        <tr>
                            <th />
                            {units.map((u) => (
                                <th key={u.id}>
                                    <button className={s.cmpHead} onClick={() => onOpenUnit(u.id)}>
                                        {u.code}
                                    </button>
                                    <button className={s.cmpRemove} onClick={() => sales.toggleCompare(u.id)} aria-label="إزالة">
                                        ✕
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(([label, fn]) => (
                            <tr key={label}>
                                <td className={s.cmpLabel}>{label}</td>
                                {units.map((u) => (
                                    <td key={u.id}>{fn(u)}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button className={s.cta} onClick={() => sales.enquire(units.map((u) => u.id))}>
                استفسر عن هذه الوحدات
            </button>
        </>
    );
}

// ---------------------------------------------------------------- location

function Location() {
    const [view, setView] = useState<"map" | "sat" | "hyper">("hyper");
    const straight = distanceKm(PROJECT_LOCATION, HYPER_ONE);
    return (
        <>
            <div className={s.hyperCard}>
                <div className={s.hyperIcon}>🛒</div>
                <div>
                    <div className={s.hyperTitle}>
                        {HYPER_ONE.name} على بُعد <strong>{HYPER_ONE.driveMin} دقيقة</strong> فقط
                    </div>
                    <div className={s.hyperSub}>
                        {HYPER_ONE.driveKm.toFixed(1)} كم بالسيارة {HYPER_ONE.via} · {straight.toFixed(1)} كم مسافة مباشرة
                    </div>
                </div>
            </div>
            <div className={s.mapFrame}>
                <iframe
                    key={view}
                    title={view === "hyper" ? "المسار من المشروع إلى هايبر وان" : "موقع مشروع سند زايد"}
                    src={view === "hyper" ? hyperOneRouteEmbedUrl() : mapsEmbedUrl(view === "sat")}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                />
            </div>
            <div className={s.fRow} style={{ marginTop: 10 }}>
                <button className={cx(s.fchip, view === "hyper" && s.fchipOn)} onClick={() => setView("hyper")}>
                    المسار إلى {HYPER_ONE.name}
                </button>
                <button className={cx(s.fchip, view === "map" && s.fchipOn)} onClick={() => setView("map")}>
                    خريطة
                </button>
                <button className={cx(s.fchip, view === "sat" && s.fchipOn)} onClick={() => setView("sat")}>
                    قمر صناعي
                </button>
            </div>
            <p className={s.muted} style={{ margin: "6px 0 0", fontSize: 11 }}>
                المسافة والوقت حسب أفضل مسار في Google Maps في الظروف العادية، وقد يختلف الوقت حسب حركة المرور.
            </p>
            <p className={s.addr}>{PROJECT_LOCATION.address}</p>
            <a className={s.cta} href={directionsUrl()} target="_blank" rel="noopener noreferrer">
                الاتجاهات إلى المشروع
            </a>
            <div className={s.fLabel} style={{ marginTop: 18 }}>
                بالقرب من المشروع · اضغط لعرض المسار والوقت الفعلي
            </div>
            <ul className={s.landmarks}>
                {LANDMARKS.map((l) => (
                    <li key={l.name}>
                        <a href={directionsUrl(l.query)} target="_blank" rel="noopener noreferrer" className={s.landmark}>
                            <span>{l.name}</span>
                            <span className={s.lmKind}>{l.kind}</span>
                            <span className={s.lmGo}>المسار ←</span>
                        </a>
                    </li>
                ))}
            </ul>
        </>
    );
}

// ---------------------------------------------------------------- stages

function Stages() {
    return (
        <>
            <ol className={s.timeline}>
                {STAGES.map((st, i) => (
                    <motion.li
                        key={st.title}
                        className={cx(s.tlItem, st.state === "done" && s.tlDone, st.state === "now" && s.tlNow)}
                        initial={{ opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.08 * i }}
                    >
                        <span className={s.tlDot}>{st.state === "done" ? "✓" : i + 1}</span>
                        <div>
                            <div className={s.tlTitle}>
                                {st.title}
                                {st.state === "now" && <span className={s.tlBadge}>الآن</span>}
                            </div>
                            <div className={s.tlText}>{st.text}</div>
                        </div>
                    </motion.li>
                ))}
            </ol>
            <div className={s.noteBox}>{ALLOCATION_NOTE}</div>
        </>
    );
}

// ---------------------------------------------------------------- enquiry

export function EnquiryForm({ sales, source }: { sales: Sales; source: string }) {
    const [v, setV] = useState<UnitEnquiry>({ ...EMPTY_UNIT_ENQUIRY, units: sales.enquiryUnits });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
    const [ref, setRef] = useState("");
    const [serverError, setServerError] = useState("");
    const [startedAt] = useState(() => Date.now());
    const started = useRef(false);
    const markStarted = () => {
        if (started.current) return;
        started.current = true;
        J.track({ type: "enquiry_start" });
    };
    const [website, setWebsite] = useState("");
    const set = <K extends keyof UnitEnquiry>(k: K, val: UnitEnquiry[K]) => setV((x) => ({ ...x, [k]: val }));
    const toggleUnit = (id: string) => set("units", v.units.includes(id) ? v.units.filter((u) => u !== id) : [...v.units, id].slice(0, 10));

    const submit = async () => {
        const e = validateUnitEnquiry(v);
        setErrors(e);
        if (Object.keys(e).length) return;
        setState("sending");
        setServerError("");
        try {
            const res = await fetch("/api/sanad-zayed/unit-enquiry", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payload: v, startedAt, website, source, journey: J.journeySummary() }),
            });
            const data = await res.json();
            if (!res.ok) {
                setErrors(data.errors ?? {});
                setServerError(data.error ?? "تعذر الإرسال");
                setState("error");
                return;
            }
            setRef(data.reference);
            J.track({ type: "enquiry_sent", units: v.units });
            setState("done");
        } catch {
            setServerError("تعذر الإرسال، تحقق من الاتصال وحاول مرة أخرى");
            setState("error");
        }
    };

    if (state === "done")
        return (
            <motion.div className={s.doneBox} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
                <div className={s.doneIcon}>✓</div>
                <h3>شكرًا لك، وصلنا استفسارك</h3>
                <p>سيتواصل معك أحد مستشاري المبيعات قريبًا لعرض التفاصيل والأسعار وطرق السداد.</p>
                <div className={s.muted}>
                    رقم الطلب: <strong dir="ltr">{ref}</strong>
                </div>
                <div className={s.noteBox}>{ALLOCATION_NOTE}</div>
            </motion.div>
        );

    const err = (k: string) => errors[k] && <div className={s.err}>{errors[k]}</div>;
    return (
        <form
            onFocus={markStarted}
            className={s.form}
            onSubmit={(e) => {
                e.preventDefault();
                void submit();
            }}
        >
            <p className={s.muted}>الأسعار لا تُعرض على الموقع. اترك بياناتك وسيتواصل معك فريق المبيعات بكل التفاصيل.</p>
            <label className={s.fLabel}>الوحدات التي تهمك (اختياري)</label>
            <div className={s.unitPick}>
                {v.units.map((id) => (
                    <button type="button" key={id} className={cx(s.fchip, s.fchipOn)} onClick={() => toggleUnit(id)}>
                        {UNIT_BY_ID[id]?.code} ✕
                    </button>
                ))}
                <select
                    className={s.input}
                    value=""
                    onChange={(e) => e.target.value && toggleUnit(e.target.value)}
                    aria-label="أضف وحدة"
                    style={{ flex: "1 1 140px" }}
                >
                    <option value="">+ أضف وحدة</option>
                    {UNITS.filter((u) => !v.units.includes(u.id)).map((u) => (
                        <option key={u.id} value={u.id}>
                            {u.code} · {fmt(u.area)} م² · {u.plan.counts.bed} غرف
                        </option>
                    ))}
                </select>
            </div>
            {err("units")}
            <label className={s.fLabel}>الاسم بالكامل *</label>
            <input className={s.input} value={v.fullName} onChange={(e) => set("fullName", e.target.value)} autoComplete="name" />
            {err("fullName")}
            <label className={s.fLabel}>رقم الموبايل *</label>
            <input className={s.input} value={v.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" dir="ltr" placeholder="01xxxxxxxxx" autoComplete="tel" />
            {err("phone")}
            <label className={s.fLabel}>البريد الإلكتروني</label>
            <input className={s.input} value={v.email} onChange={(e) => set("email", e.target.value)} dir="ltr" type="email" autoComplete="email" />
            {err("email")}
            <div className={s.twoCol}>
                <div>
                    <label className={s.fLabel}>طريقة التواصل</label>
                    <select className={s.input} value={v.contactMethod} onChange={(e) => set("contactMethod", e.target.value)}>
                        {ENQUIRY_CONTACT_METHODS.map((m) => (
                            <option key={m}>{m}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className={s.fLabel}>الوقت المناسب</label>
                    <select className={s.input} value={v.bestTime} onChange={(e) => set("bestTime", e.target.value)}>
                        {ENQUIRY_BEST_TIMES.map((m) => (
                            <option key={m}>{m}</option>
                        ))}
                    </select>
                </div>
            </div>
            <label className={s.fLabel}>الغرض</label>
            <div className={s.fRow}>
                {ENQUIRY_PURPOSES.map((p) => (
                    <button type="button" key={p} className={cx(s.fchip, v.purpose === p && s.fchipOn)} onClick={() => set("purpose", v.purpose === p ? "" : p)}>
                        {p}
                    </button>
                ))}
            </div>
            <label className={s.fLabel}>رسالتك</label>
            <textarea className={s.input} rows={3} value={v.message} onChange={(e) => set("message", e.target.value)} />
            {err("message")}
            <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} className={s.hp} aria-hidden="true" />
            <label className={s.consent}>
                <input type="checkbox" checked={v.consent} onChange={(e) => set("consent", e.target.checked)} />
                أوافق على تواصل فريق سند معي بخصوص هذا الاستفسار
            </label>
            {err("consent")}
            {serverError && <div className={s.err}>{serverError}</div>}
            <button className={s.cta} type="submit" disabled={state === "sending"}>
                {state === "sending" ? "جارٍ الإرسال…" : "أرسل الاستفسار"}
            </button>
            <div className={s.contactRow}>
                <a href={whatsappUrl(`مرحبًا، أرغب في الاستفسار عن مشروع سند زايد${v.units.length ? ` (${v.units.map((id) => UNIT_BY_ID[id]?.code).join("، ")})` : ""}.`)} target="_blank" rel="noopener noreferrer" className={s.ctaGhost} onClick={() => J.track({ type: "contact", channel: "whatsapp" })}>
                    واتساب
                </a>
                <a href={`tel:${SALES_PHONES[0]}`} className={cx(s.ctaGhost, s.ctaCall)} dir="ltr" onClick={() => J.track({ type: "contact", channel: "call" })}>
                    {SALES_PHONES[0]}
                </a>
            </div>
        </form>
    );
}

export function SalesPanels({ sales, source, onOpenUnit }: { sales: Sales; source: string; onOpenUnit: (id: string) => void }) {
    const close = () => sales.setPanel(null);
    return (
        <AnimatePresence>
            {sales.panel === "finder" && (
                <Drawer key="finder" title="ابحث عن وحدتك" onClose={close}>
                    <Finder sales={sales} onOpenUnit={onOpenUnit} />
                </Drawer>
            )}
            {sales.panel === "compare" && (
                <Drawer key="compare" title="مقارنة الوحدات" onClose={close} wide>
                    <Compare sales={sales} onOpenUnit={onOpenUnit} />
                </Drawer>
            )}
            {sales.panel === "location" && (
                <Drawer key="location" title="موقع المشروع" onClose={close} wide>
                    <Location />
                </Drawer>
            )}
            {sales.panel === "stages" && (
                <Drawer key="stages" title="مراحل المشروع" onClose={close}>
                    <Stages />
                </Drawer>
            )}
            {sales.panel === "enquiry" && (
                <Drawer key={`enquiry-${sales.enquiryUnits.join(",")}`} title="استفسر عن الوحدات" onClose={close}>
                    <EnquiryForm sales={sales} source={source} />
                </Drawer>
            )}
        </AnimatePresence>
    );
}

/** Façades + highlights block used in the unit details (the area is shown as one total, including loading). */
export function UnitFacts({ unit }: { unit: Unit }) {
    const hl = unitHighlights(unit);
    const fac = facadeList(unit);
    return (
        <div className={s.facts}>
            {fac.length > 0 && (
                <div className={s.facades}>
                    <span className={s.fLabel}>الواجهات:</span> {fac.join(" · ")}
                </div>
            )}
            {hl.length > 0 && (
                <ul className={s.highlights}>
                    {hl.map((h) => (
                        <li key={h}>{h}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}
