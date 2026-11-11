"use client";

import { motion } from "framer-motion";
import { BUILDING_INFO, FLOOR_NAMES, SALES_PHONES, whatsappUrl, type Unit } from "@/lib/sanad-zayed/masterplan/data";
import { track } from "./journey";
import s from "./masterplan.module.css";

/** Message that says what the visitor is looking at, so the sales reply can start from there. */
function contextMessage(unit: Unit | null, floor: number | null) {
    if (unit)
        return `مرحبًا، أنا مهتم بالوحدة ${unit.code} في مشروع سند زايد (${BUILDING_INFO[unit.building].name} · ${FLOOR_NAMES[unit.floor]} · ${unit.area} م² · ${unit.plan.counts.bed} غرف نوم). أرجو التواصل معي بالتفاصيل.`;
    if (floor !== null) return `مرحبًا، أنا مهتم بوحدات ${FLOOR_NAMES[floor]} في مشروع سند زايد. أرجو التواصل معي بالتفاصيل.`;
    return "مرحبًا، أرغب في معرفة تفاصيل مشروع سند زايد بالشيخ زايد.";
}

const WaIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
            fill="currentColor"
            d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"
        />
    </svg>
);
const CallIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
            fill="currentColor"
            d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"
        />
    </svg>
);

/** Floating WhatsApp + call buttons, always one tap away on the plan. */
export default function ContactFab({ unit, floor, show }: { unit: Unit | null; floor: number | null; show: boolean }) {
    const msg = contextMessage(unit, floor);
    return (
        <motion.div
            className={s.fab}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: show ? 1 : 0, scale: show ? 1 : 0.8 }}
            transition={{ type: "spring", damping: 20, stiffness: 260 }}
            style={{ pointerEvents: show ? "auto" : "none" }}
        >
            <a
                className={s.fabCall}
                href={`tel:${SALES_PHONES[0]}`}
                aria-label="اتصل بفريق المبيعات"
                onClick={() => track({ type: "contact", channel: "call", unit: unit?.code })}
            >
                <CallIcon />
            </a>
            <a
                className={s.fabWa}
                href={whatsappUrl(msg)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="تواصل عبر واتساب"
                onClick={() => track({ type: "contact", channel: "whatsapp", unit: unit?.code })}
            >
                <WaIcon />
                <span className={s.fabText}>{unit ? `استفسر عن ${unit.code}` : "تواصل واتساب"}</span>
            </a>
        </motion.div>
    );
}
