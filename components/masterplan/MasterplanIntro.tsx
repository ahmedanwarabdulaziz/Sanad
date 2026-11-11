"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState, type JSX } from "react";
import s from "./masterplan.module.css";
import { ALLOCATION_NOTE } from "@/lib/sanad-zayed/masterplan/data";

const LOGO = "/images/long logo.png";
const DURATION_MS = 3600;

/** Small deterministic RNG so the linework is the same on every visit (and on server/client). */
function rng(seed: number) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

type Stroke = { d: string; gold?: boolean; w?: number; delay: number; dur: number };

/** Generic architectural linework: room plans, door swings, dimension strings, column grids, curves. */
function buildLinework(W: number, H: number): Stroke[] {
    // clear oval around the logo, sized to the screen shape
    const RX = Math.min(470, W * 0.42);
    const RY = Math.min(250, H * 0.16);
    const r = rng(20261111);
    const out: Stroke[] = [];
    const clear = (x: number, y: number, w = 0, h = 0) => {
        // keep the centre free for the logo and title
        const cx = x + w / 2 - W / 2;
        const cy = y + h / 2 - H / 2;
        return (cx * cx) / (RX * RX) + (cy * cy) / (RY * RY) > 1;
    };
    const t = () => ({ delay: r() * 1.5, dur: 1.1 + r() * 1.1 });

    // room plans
    let tries = 0;
    const target = Math.round((W * H) / 24000);
    while (out.length < target && tries < 600) {
        tries++;
        const unit = Math.min(W, H) / 900;
        const w = (120 + r() * 190) * unit;
        const h = (90 + r() * 150) * unit;
        const x = -40 + r() * (W - w + 80);
        const y = -30 + r() * (H - h + 60);
        if (!clear(x, y, w, h)) continue;
        const sx = x + w * (0.35 + r() * 0.3);
        const sy = y + h * (0.35 + r() * 0.3);
        let d = `M${x},${y}H${x + w}V${y + h}H${x}Z`;
        d += `M${sx},${y}V${y + h * (0.55 + r() * 0.45)}`;
        if (r() > 0.4) d += `M${x},${sy}H${x + w * (0.4 + r() * 0.6)}`;
        out.push({ d, ...t() });
        // door swing
        const dr = 22 + r() * 16;
        const dx = sx;
        const dy = y + h - 2;
        out.push({ d: `M${dx},${dy}L${dx},${dy - dr}A${dr},${dr} 0 0 1 ${dx + dr},${dy}`, w: 0.8, ...t() });
        // window ticks on one side
        if (r() > 0.5) {
            const wx = x + w * 0.2;
            out.push({ d: `M${wx},${y - 4}H${wx + w * 0.35}M${wx},${y + 4}H${wx + w * 0.35}`, w: 0.8, ...t() });
        }
    }
    // dimension strings
    for (let i = 0; i < 14; i++) {
        const horiz = r() > 0.5;
        const x = r() * W;
        const y = r() * H;
        const L = 140 + r() * 260;
        if (!clear(x, y, horiz ? L : 0, horiz ? 0 : L)) continue;
        const n = 2 + Math.floor(r() * 3);
        let d = horiz ? `M${x},${y}H${x + L}` : `M${x},${y}V${y + L}`;
        for (let k = 0; k <= n; k++) {
            const p = (L * k) / n;
            d += horiz ? `M${x + p - 6},${y + 6}L${x + p + 6},${y - 6}M${x + p},${y - 14}V${y + 10}` : `M${x - 6},${y + p + 6}L${x + 6},${y + p - 6}M${x - 14},${y + p}H${x + 10}`;
        }
        out.push({ d, gold: true, w: 0.9, ...t() });
    }
    // column grid bubbles
    for (let i = 0; i < 10; i++) {
        const x = r() * W;
        const y = r() > 0.5 ? 40 + r() * 60 : H - 40 - r() * 60;
        if (!clear(x, y)) continue;
        out.push({ d: `M${x + 13},${y}A13,13 0 1 1 ${x - 13},${y}A13,13 0 1 1 ${x + 13},${y}M${x},${y + 13}V${y + 120}`, w: 0.9, ...t() });
    }
    // sweeping site curves
    out.push({ d: `M-20,${H * 0.78}C${W * 0.25},${H * 0.55} ${W * 0.35},${H * 1.05} ${W * 0.62},${H * 0.86}S${W * 0.95},${H * 0.6} ${W + 20},${H * 0.7}`, gold: true, w: 1.4, delay: 0.2, dur: 2.2 });
    out.push({ d: `M-20,${H * 0.2}C${W * 0.2},${H * 0.05} ${W * 0.42},${H * 0.32} ${W * 0.7},${H * 0.12}S${W * 0.92},${H * 0.02} ${W + 20},${H * 0.16}`, w: 1.1, delay: 0.4, dur: 2.2 });
    out.push({ d: `M${W * 0.83},${H * 0.42}m-60,0a60,60 0 1,0 120,0a60,60 0 1,0 -120,0`, gold: true, w: 1, delay: 0.9, dur: 1.4 });
    return out;
}

export type HubChoice = "plan" | "3d" | "nearby" | "enquiry";

const OPTIONS: { id: HubChoice; title: string; text: string; icon: JSX.Element; primary?: boolean }[] = [
    {
        id: "plan",
        title: "المخطط التفاعلي",
        text: "استكشف المباني والأدوار وتفاصيل كل وحدة",
        primary: true,
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 4h18v16H3z M3 10h7v10 M10 4v6 M14 4v8h7 M14 12v8" />
            </svg>
        ),
    },
    {
        id: "3d",
        title: "عرض ثلاثي الأبعاد",
        text: "جولة سينمائية حول المباني نهارًا وليلًا",
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2l9 5v10l-9 5-9-5V7z M12 12l9-5 M12 12L3 7 M12 12v10" />
            </svg>
        ),
    },
    {
        id: "nearby",
        title: "سند زايد قريبة من إيه؟",
        text: "المسافات لأهم الأماكن حول المشروع",
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z M12 12.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            </svg>
        ),
    },
    {
        id: "enquiry",
        title: "استفسر الآن",
        text: "اترك بياناتك وسيتواصل معك فريق المبيعات",
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 5h18v14H3z M3 6l9 7 9-7" />
            </svg>
        ),
    },
];

/**
 * Entrance: the logo and «سند زايد» with architectural linework drawing in around them,
 * then the options hub (plan, 3D, nearby places, enquiry).
 */
export default function MasterplanIntro({ onChoose, startAtMenu = false }: { onChoose: (c: HubChoice) => void; startAtMenu?: boolean }) {
    // Landscape by default; portrait phones get their own taller composition after mount.
    const [size, setSize] = useState({ W: 1600, H: 900 });
    const [menu, setMenu] = useState(startAtMenu);
    useEffect(() => {
        const raf = requestAnimationFrame(() => {
            if (window.innerHeight > window.innerWidth * 1.1) setSize({ W: 900, H: 1700 });
        });
        return () => cancelAnimationFrame(raf);
    }, []);
    const { W, H } = size;
    const strokes = useMemo(() => buildLinework(W, H), [W, H]);
    useEffect(() => {
        if (menu) return;
        const t = setTimeout(() => setMenu(true), DURATION_MS);
        return () => clearTimeout(t);
    }, [menu]);

    return (
        <motion.div
            className={s.introScreen}
            initial={{ opacity: startAtMenu ? 0 : 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.06 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            onClick={() => setMenu(true)}
            role="presentation"
        >
            <motion.svg
                className={s.introLines}
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="xMidYMid slice"
                initial={{ scale: 1.08, opacity: 0.0 }}
                animate={{ scale: 1, opacity: menu ? 0.55 : 1 }}
                transition={{ duration: menu ? 1 : 4.2, ease: "easeOut" }}
                aria-hidden="true"
            >
                <defs>
                    <pattern id="intro-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M40 0H0V40" fill="none" stroke="#6F9FD0" strokeOpacity="0.09" strokeWidth="1" />
                    </pattern>
                    <radialGradient id="intro-fade" cx="50%" cy="50%" r="60%">
                        <stop offset="0%" stopColor="#0B1730" stopOpacity="1" />
                        <stop offset="45%" stopColor="#0B1730" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="#0B1730" stopOpacity="0" />
                    </radialGradient>
                </defs>
                <rect width={W} height={H} fill="url(#intro-grid)" />
                <g key={`${W}x${H}`} fill="none" strokeLinecap="round" strokeLinejoin="round">
                    {strokes.map((st, i) => (
                        <motion.path
                            key={i}
                            d={st.d}
                            stroke={st.gold ? "#C29B40" : "#8FBFEA"}
                            strokeOpacity={st.gold ? 0.75 : 0.5}
                            strokeWidth={st.w ?? 1.1}
                            initial={{ pathLength: startAtMenu ? 1 : 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: st.dur, delay: st.delay, ease: "easeInOut" }}
                        />
                    ))}
                </g>
                <ellipse cx={W / 2} cy={H / 2} rx={Math.min(560, W * 0.5)} ry={Math.min(300, H * 0.2)} fill="url(#intro-fade)" />
            </motion.svg>

            <motion.div className={s.introCenter} layout transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
                <motion.div layout initial={{ opacity: 0, scale: 0.85, y: 10 }} animate={{ opacity: 1, scale: menu ? 0.82 : 1, y: 0 }} transition={{ delay: startAtMenu ? 0 : 0.35, duration: 1.1, ease: "easeOut" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={LOGO} alt="سند" className={s.introLogo} />
                </motion.div>
                <motion.h1
                    layout
                    className={s.introTitle}
                    style={menu ? { fontSize: "clamp(30px, 5vw, 48px)", marginTop: 14 } : undefined}
                    initial={{ opacity: 0, letterSpacing: "0.35em", filter: "blur(8px)" }}
                    animate={{ opacity: 1, letterSpacing: "0em", filter: "blur(0px)" }}
                    transition={{ delay: startAtMenu ? 0 : 0.8, duration: 1.5, ease: "easeOut" }}
                >
                    سند زايد
                </motion.h1>
                <motion.div layout className={s.introLine} initial={{ width: 0 }} animate={{ width: 240 }} transition={{ delay: startAtMenu ? 0 : 1.4, duration: 1.1 }} />
                <motion.p layout className={s.introSub} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: startAtMenu ? 0 : 1.8, duration: 0.8 }}>
                    الشيخ زايد · المخطط التفاعلي للمشروع
                </motion.p>

                {menu && (
                    <motion.div className={s.hub} initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.09, delayChildren: 0.25 } } }}>
                        <div className={s.hubGrid}>
                            {OPTIONS.map((o) => (
                                <motion.button
                                    key={o.id}
                                    className={o.primary ? `${s.hubCard} ${s.hubCardPrimary}` : s.hubCard}
                                    variants={{ hidden: { opacity: 0, y: 24, scale: 0.96 }, show: { opacity: 1, y: 0, scale: 1 } }}
                                    transition={{ type: "spring", damping: 22, stiffness: 240 }}
                                    whileHover={{ y: -4 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChoose(o.id);
                                    }}
                                >
                                    <span className={s.hubIcon}>{o.icon}</span>
                                    <span className={s.hubTitle}>{o.title}</span>
                                    <span className={s.hubText}>{o.text}</span>
                                </motion.button>
                            ))}
                        </div>
                        <motion.div className={s.hubNote} variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
                            {ALLOCATION_NOTE}
                        </motion.div>
                    </motion.div>
                )}
            </motion.div>

            {!menu && (
                <motion.button
                    className={s.introSkip}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        setMenu(true);
                    }}
                >
                    دخول ←
                </motion.button>
            )}
        </motion.div>
    );
}
