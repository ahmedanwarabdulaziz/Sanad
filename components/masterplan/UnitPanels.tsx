"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    BUILDING_INFO,
    DISCLAIMERS,
    FLOOR_NAMES,
    ROOM_COLORS,
    ROOM_LEGEND,
    UNITS,
    ALLOCATION_NOTE,
    SALES_PHONES,
    whatsappUrl,
    bathsLabel,
    bedroomsLabel,
    fmt,
    fmtDims,
    type Unit,
} from "@/lib/sanad-zayed/masterplan/data";
import UnitPlan from "./UnitPlan";
import s from "./masterplan.module.css";
import k from "./sales.module.css";
import { UnitFacts, track, type Sales } from "./SalesKit";
import { downloadBrochure } from "./brochure";
import * as J from "./journey";
import { shareUnit } from "./share";

export const LOGO = "/images/long logo.png";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function UnitSummary({ unit, rule = true }: { unit: Unit; rule?: boolean }) {
    const c = unit.plan.counts;
    return (
        <div>
            <div className={s.summaryTop}>
                <div>
                    <div className={s.eyebrow}>
                        {BUILDING_INFO[unit.building].name} · {FLOOR_NAMES[unit.floor]}
                    </div>
                    <div className={s.code}>{unit.code}</div>
                </div>
                <div>
                    <div className={s.area}>
                        {fmt(unit.area)}
                        <span className={s.areaUnit}> م²</span>
                    </div>
                    <div className={s.areaNote}>شاملة نسبة التحميل</div>
                </div>
            </div>
            {rule && <div className={s.goldRule} />}
            <div className={s.chips}>
                <span className={s.chip}>{bedroomsLabel(c.bed)}</span>
                <span className={s.chip}>{bathsLabel(c.bath)}</span>
                <span className={s.chip}>ريسبشن</span>
                {c.balc > 0 && <span className={s.chip}>{c.balc > 1 ? `${fmt(c.balc)} بلكونات` : "بلكونة"}</span>}
                {c.dress > 0 && <span className={s.chip}>غرفة ملابس</span>}
                {unit.floor === 0 && <span className={cx(s.chip, s.chipGreen)}>دور أرضي بحديقة</span>}
            </div>
        </div>
    );
}

const UnitTour = dynamic(() => import("./UnitTour"), { ssr: false });

export function UnitDetails({
    unit,
    onClose,
    onNavigate,
    sales,
    source,
}: {
    unit: Unit;
    onClose: () => void;
    onNavigate: (id: string) => void;
    sales: Sales;
    source: string;
}) {
    const [hot, setHot] = useState<number | null>(null);
    const [mode, setMode] = useState<"plan" | "tour">("plan");
    const [busy, setBusy] = useState(false);
    const planBox = useRef<HTMLDivElement>(null);
    const siblings = useMemo(() => UNITS.filter((u) => u.building === unit.building && u.floor === unit.floor), [unit]);
    const idx = siblings.findIndex((u) => u.id === unit.id);
    const go = useCallback(
        (d: number) => onNavigate(siblings[(idx + d + siblings.length) % siblings.length].id),
        [idx, siblings, onNavigate]
    );
    const rooms = unit.plan.rooms.filter((r) => r.type !== "x" && r.type !== "hall");
    const inCompare = sales.compare.includes(unit.id);

    useEffect(() => {
        track(unit.id, "view", source);
        return J.beginUnitView(unit.code);
    }, [unit.id, unit.code, source]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") go(1);
            if (e.key === "ArrowRight") go(-1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [go, onClose]);

    const brochure = async () => {
        const svg = planBox.current?.querySelector("svg");
        if (!svg) return;
        setBusy(true);
        try {
            await downloadBrochure(unit, svg);
            track(unit.id, "brochure", source);
            J.track({ type: "brochure", unit: unit.code });
        } catch (e) {
            console.error("Brochure failed", e);
        } finally {
            setBusy(false);
        }
    };

    return (
        <motion.div className={s.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.div
                className={s.panel}
                initial={{ y: 40, scale: 0.97, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                transition={{ type: "spring", damping: 26, stiffness: 220 }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-label={`تفاصيل الوحدة ${unit.code}`}
            >
                <aside className={s.aside}>
                    <div className={s.asideBrand}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={LOGO} alt="سند" className={s.brandLogo} />
                        <span>مشروع سند زايد</span>
                    </div>
                    <UnitSummary unit={unit} />
                    <button
                        className={s.cta}
                        style={{ marginTop: 0 }}
                        onClick={() => {
                            onClose();
                            sales.enquire([unit.id]);
                        }}
                    >
                        استفسر عن هذه الوحدة
                    </button>
                    <div className={k.actions}>
                        <a
                            className={k.actBtn}
                            href={whatsappUrl(`مرحبًا، أرغب في معرفة تفاصيل وأسعار الوحدة ${unit.code} في مشروع سند زايد.`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => J.track({ type: "contact", channel: "whatsapp", unit: unit.code })}
                        >
                            واتساب
                        </a>
                        <a className={k.actBtn} href={`tel:${SALES_PHONES[0]}`} onClick={() => J.track({ type: "contact", channel: "call", unit: unit.code })}>
                            اتصل بنا
                        </a>
                        <button
                            className={cx(k.actBtn, inCompare && k.actBtnOn)}
                            onClick={() => {
                                if (!inCompare) J.track({ type: "compare", unit: unit.code });
                                sales.toggleCompare(unit.id);
                            }}
                        >
                            {inCompare ? "✓ في المقارنة" : "⇄ قارن"}
                        </button>
                        <button className={k.actBtn} onClick={brochure} disabled={busy || mode === "tour"}>
                            {busy ? "جارٍ التجهيز…" : "⤓ بروشور PDF"}
                        </button>
                        <button className={k.actBtn} style={{ gridColumn: "1 / -1" }} onClick={() => void shareUnit(unit)}>
                            ↗ مشاركة الوحدة مع العائلة
                        </button>
                    </div>
                    <div className={k.noteBox} style={{ marginTop: 0 }}>
                        {ALLOCATION_NOTE}
                    </div>
                    <UnitFacts unit={unit} />
                    <div>
                        <div className={s.listHead}>
                            <span>مكونات الوحدة</span>
                            <span>الأبعاد بالمتر (عرض × طول)</span>
                        </div>
                        <ul className={s.roomList}>
                            {rooms.map((r) => {
                                const i = unit.plan.rooms.indexOf(r);
                                return (
                                    <li
                                        key={i}
                                        className={cx(s.roomItem, hot === i && s.roomItemHot)}
                                        onMouseEnter={() => setHot(i)}
                                        onMouseLeave={() => setHot(null)}
                                    >
                                        <span className={s.swatchName}>
                                            <span className={s.swatch} style={{ background: ROOM_COLORS[r.type] }} />
                                            {r.name}
                                        </span>
                                        <span className={s.dims}>{r.dims ? fmtDims(r.dims) : "—"}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                    <div className={s.asideBottom}>
                        <p className={s.fineprint}>{DISCLAIMERS.join(" ")}</p>
                    </div>
                </aside>

                <section className={s.planSide}>
                    <div className={s.planBar}>
                        <div className={s.pager}>
                            <button onClick={() => go(-1)} className={s.iconBtn} aria-label="الوحدة السابقة">
                                ›
                            </button>
                            <span>
                                {fmt(idx + 1)} / {fmt(siblings.length)} · {FLOOR_NAMES[unit.floor]}
                            </span>
                            <button onClick={() => go(1)} className={s.iconBtn} aria-label="الوحدة التالية">
                                ‹
                            </button>
                        </div>
                        <div className={s.pager}>
                            <div className={k.fRow}>
                                <button className={cx(k.fchip, mode === "plan" && k.fchipOn)} onClick={() => setMode("plan")}>
                                    المسقط
                                </button>
                                <button
                                    className={cx(k.fchip, mode === "tour" && k.fchipOn)}
                                    onClick={() => {
                                        setMode("tour");
                                        track(unit.id, "tour", source);
                                        J.track({ type: "tour", unit: unit.code });
                                    }}
                                >
                                    جولة ثلاثية الأبعاد
                                </button>
                            </div>
                            <button onClick={onClose} className={s.iconBtn} aria-label="إغلاق">
                                ✕
                            </button>
                        </div>
                    </div>
                    <div className={s.planStage}>
                        <div className={s.planGlow} />
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`${unit.id}-${mode}`}
                                ref={planBox}
                                className={s.planInner}
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 30 }}
                                transition={{ duration: 0.35 }}
                                style={mode === "tour" ? { padding: 0, borderRadius: 24, overflow: "hidden" } : undefined}
                            >
                                {mode === "plan" ? (
                                    <UnitPlan plan={unit.plan} hotRoom={hot} onHotRoom={setHot} furniture={false} />
                                ) : (
                                    <UnitTour plan={unit.plan} />
                                )}
                            </motion.div>
                        </AnimatePresence>
                        {mode === "tour" && (
                            <div className={k.planTools}>
                                <span className={k.toolBtn}>اسحب للتدوير · مرّر للتكبير</span>
                            </div>
                        )}
                    </div>
                    <div className={s.legend}>
                        {ROOM_LEGEND.map((l) => (
                            <span key={l.type} className={s.legendItem}>
                                <span className={s.swatch} style={{ background: ROOM_COLORS[l.type] }} />
                                {l.label}
                            </span>
                        ))}
                    </div>
                </section>
            </motion.div>
        </motion.div>
    );
}
