"use client";

import { motion } from "framer-motion";
import s from "./film.module.css";

/**
 * A library of architectural and structural drawings in gold hairlines, for the film's backgrounds.
 * Each drawing lives in its own local box (w × h) and is drawn in stroke by stroke; texts and rebar fade in.
 * Every number here is a generic illustration, not data from a real project.
 */

export type Stroke =
    | { kind: "main" | "thin" | "dash"; d: string }
    /** filled marks, such as reinforcement bars in a section */
    | { kind: "dot"; d: string }
    /** a label, dimension or equation; `size` is in the drawing's local units */
    | { kind: "text"; x: number; y: number; t: string; size?: number; anchor?: "start" | "middle" | "end"; strong?: boolean };

export type Drawing = { name: string; w: number; h: number; strokes: Stroke[] };

/** A circle as a path, so it can be drawn in like a line. */
export const circle = (cx: number, cy: number, r: number) => `M${cx + r},${cy}A${r},${r} 0 1 1 ${cx - r},${cy}A${r},${r} 0 1 1 ${cx + r},${cy}`;
const range = (from: number, to: number, step: number) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);
const T = (x: number, y: number, t: string, size = 11, anchor: "start" | "middle" | "end" = "middle", strong = false): Stroke => ({ kind: "text", x, y, t, size, anchor, strong });

/* ---------------- plans ---------------- */

/** A plot of land with its setback, dimensions, corner markers and a north arrow. */
const plot: Drawing = {
    name: "قطعة أرض",
    w: 330,
    h: 270,
    strokes: [
        { kind: "main", d: "M20,40L270,22L285,248L32,262Z" },
        { kind: "dash", d: "M48,64L248,50L259,226L58,238Z" },
        { kind: "thin", d: "M20,36V8M270,18V-10M20,14L270,-4M14,20L26,8M264,2L276,-10" },
        { kind: "thin", d: "M289,22H312M289,248H322M306,22L316,248M300,28L312,16M310,254L322,242" },
        { kind: "thin", d: circle(20, 40, 4) + circle(270, 22, 4) + circle(285, 248, 4) + circle(32, 262, 4) },
        { kind: "thin", d: circle(152, 146, 18) + "M152,120L160,148L152,142L144,148Z" },
        T(145, 0, "62.40"),
        T(330, 138, "54.10", 11, "start"),
        T(152, 182, "N", 10),
    ],
};

/** An apartment floor plan: double outer walls, rooms, door swings, windows and furniture. */
const apartment: Drawing = {
    name: "مسقط شقة",
    w: 300,
    h: 220,
    strokes: [
        { kind: "main", d: "M0,0H300V220H0ZM7,7H293V213H7Z" },
        { kind: "main", d: "M110,7V90M110,118V125H7M170,7V80H165M145,80H110M110,125V160" },
        { kind: "thin", d: "M110,118H82A28,28 0 0 1 110,90M165,80V100A20,20 0 0 1 145,80M293,190H265A28,28 0 0 1 293,162" },
        { kind: "thin", d: "M30,0V7M80,0V7M30,3.5H80M200,0V7M270,0V7M200,3.5H270M0,150H7M0,195H7M3.5,150V195" },
        { kind: "dash", d: "M20,20H75V75H20ZM20,34H75M25,22H45V31H25ZM50,22H70V31H50Z" },
        { kind: "dash", d: "M185,185H275V160H185ZM185,160V150H275V160" + circle(230, 80, 18) + circle(140, 40, 8) + "M14,135V206H46" },
        T(58, 104, "4.20 × 3.80", 9),
        T(232, 128, "6.10 × 5.40", 9),
    ],
};

/** A site plan: the plot with building footprints, trees and the road beside it. */
const site: Drawing = {
    name: "مخطط موقع",
    w: 300,
    h: 245,
    strokes: [
        { kind: "main", d: "M10,10H290V190H10Z" },
        { kind: "main", d: "M40,40H130V100H40ZM165,40H260V110H165ZM60,125H150V170H60Z" },
        { kind: "thin", d: "M40,40L130,100M130,40L40,100M165,40L260,110M260,40L165,110M60,125L150,170M150,125L60,170" },
        { kind: "dash", d: circle(190, 150, 7) + circle(215, 160, 7) + circle(240, 148, 7) + circle(265, 165, 7) + circle(25, 140, 6) },
        { kind: "thin", d: "M-30,210H330M-30,242H330" },
        { kind: "dash", d: "M-30,226H330" },
        T(85, 74, "A", 13, "middle", true),
        T(212, 79, "B", 13, "middle", true),
        T(105, 152, "C", 13, "middle", true),
    ],
};

/** A structural column grid with axis bubbles and dimension strings. */
const grid: Drawing = {
    name: "شبكة أعمدة",
    w: 300,
    h: 210,
    strokes: [
        { kind: "thin", d: "M40,30V210M140,30V210M240,30V210M0,90H290M0,170H290" },
        { kind: "main", d: circle(40, 18, 12) + circle(140, 18, 12) + circle(240, 18, 12) },
        { kind: "main", d: "M34,84H46V96H34ZM134,84H146V96H134ZM234,84H246V96H234ZM34,164H46V176H34ZM134,164H146V176H134ZM234,164H246V176H234Z" },
        { kind: "thin", d: "M40,130H240M34,136L46,124M134,136L146,124M234,136L246,124" },
        T(40, 22, "A", 11),
        T(140, 22, "B", 11),
        T(240, 22, "C", 11),
        T(90, 124, "6.00", 10),
        T(190, 124, "6.00", 10),
    ],
};

/** A stair plan: two flights, treads and the walking line. */
const stair: Drawing = {
    name: "سلم",
    w: 200,
    h: 262,
    strokes: [
        { kind: "main", d: "M20,20H180V240H20ZM100,60V240" },
        { kind: "thin", d: range(77, 230, 17).map((y) => `M20,${y}H100M100,${y}H180`).join("") },
        { kind: "thin", d: "M60,232V40H140V232M134,222L140,232L146,222" },
        T(60, 256, "UP", 10),
        T(140, 256, "17 × 28", 9),
    ],
};

/** A building section with floor levels marked on the side. */
const levels: Drawing = {
    name: "قطاع رأسي ومناسيب",
    w: 270,
    h: 320,
    strokes: [
        { kind: "main", d: "M0,300H200M30,300V40H180V300" },
        { kind: "main", d: [236, 172, 108, 40].map((y) => `M30,${y}H180M30,${y + 7}H180`).join("") },
        { kind: "thin", d: [236, 172, 108, 40].map((y) => `M55,${y + 22}H95V${y + 52}H55ZM120,${y + 22}H160V${y + 52}H120Z`).join("") },
        { kind: "thin", d: range(0, 196, 14).map((x) => `M${x},300l-8,10`).join("") },
        { kind: "thin", d: [300, 236, 172, 108, 40].map((y) => `M194,${y - 8}L200,${y}L206,${y - 8}ZM194,${y - 8}H240`).join("") },
        T(212, 288, "±0.00", 10, "start"),
        T(212, 224, "+3.20", 10, "start"),
        T(212, 160, "+6.40", 10, "start"),
        T(212, 96, "+9.60", 10, "start"),
        T(212, 28, "+12.80", 10, "start"),
    ],
};

/* ---------------- structure ---------------- */

/** A reinforced concrete column cross-section: bars, stirrup with hook, dimensions and the schedule label. */
const columnSection: Drawing = {
    name: "قطاع عمود",
    w: 200,
    h: 285,
    strokes: [
        { kind: "main", d: "M40,40H160V220H40Z" },
        { kind: "thin", d: "M52,52H148V208H52ZM52,66L66,52M56,72L70,58" },
        { kind: "dot", d: [[60, 60], [100, 60], [140, 60], [60, 130], [140, 130], [60, 200], [100, 200], [140, 200]].map(([x, y]) => circle(x, y, 5)).join("") },
        { kind: "thin", d: "M40,22H160M40,16V30M160,16V30M34,28L46,16M154,28L166,16" },
        { kind: "thin", d: "M22,40V220M16,40H30M16,220H30M16,46L28,34M16,226L28,214" },
        T(100, 12, "30", 11),
        T(10, 134, "45", 11),
        T(100, 252, "C1  —  8 Ø16", 14, "middle", true),
        T(100, 274, "Stirrups Ø8 @ 150", 10),
    ],
};

/** A column in elevation down to its footing, with stirrups, ground hatch and levels. */
const columnElevation: Drawing = {
    name: "عمود وقاعدة",
    w: 250,
    h: 330,
    strokes: [
        { kind: "main", d: "M90,0V250M130,0V250M40,250H180V290H40ZM30,290H190V302H30Z" },
        { kind: "thin", d: range(10, 240, 18).map((y) => `M92,${y}H128`).join("") },
        { kind: "thin", d: "M96,0V284M124,0V284M48,282H172" },
        { kind: "thin", d: "M0,215H220" + range(0, 216, 14).map((x) => `M${x},215l-8,10`).join("") },
        { kind: "thin", d: "M196,207L202,215L208,207ZM196,207H240M196,294L202,302L208,294ZM196,294H240" },
        T(214, 200, "±0.00", 10, "start"),
        T(214, 322, "−1.50", 10, "start"),
        T(110, 274, "F1", 12, "middle", true),
    ],
};

/** An isolated footing in plan: bottom mesh, column stub and its schedule label. */
const footing: Drawing = {
    name: "قاعدة منفصلة",
    w: 260,
    h: 236,
    strokes: [
        { kind: "main", d: "M20,20H240V200H20Z" },
        { kind: "dash", d: range(35, 185, 15).map((y) => `M28,${y}H232`).join("") + range(35, 225, 15).map((x) => `M${x},28V192`).join("") },
        { kind: "main", d: "M110,90H150V130H110Z" },
        { kind: "thin", d: "M110,90L150,130M150,90L110,130" },
        T(130, 12, "Ø16 @ 150  B.W.", 10),
        T(130, 222, "F1  2.20 × 2.20 × 0.60", 12, "middle", true),
    ],
};

/** A beam cross-section under the slab: top and bottom bars, stirrup and label. */
const beamSection: Drawing = {
    name: "قطاع كمرة",
    w: 180,
    h: 240,
    strokes: [
        { kind: "main", d: "M0,30H180M0,54H40V190H140V54H180M40,30V54M140,30V54" },
        { kind: "thin", d: "M50,40H130V180H50ZM50,54L64,40" },
        { kind: "dot", d: [[62, 52], [90, 52], [118, 52], [60, 166], [80, 166], [100, 166], [120, 166]].map(([x, y]) => circle(x, y, 5)).join("") },
        T(90, 214, "B1  25 × 60", 13, "middle", true),
        T(90, 234, "3Ø16  /  4Ø18", 10),
    ],
};

/** A simply supported beam under a uniform load, with its span and bending-moment diagram. */
const beamDiagram: Drawing = {
    name: "مخطط عزوم",
    w: 300,
    h: 215,
    strokes: [
        { kind: "main", d: "M20,80H280M20,80L10,98H30ZM280,80L270,98H290ZM268,104H292" },
        { kind: "thin", d: "M20,40H280" + range(30, 270, 24).map((x) => `M${x},40V74M${x - 4},68L${x},74L${x + 4},68`).join("") },
        { kind: "thin", d: "M20,112H280M14,118L26,106M274,118L286,106" },
        { kind: "main", d: "M20,135Q150,235 280,135" },
        { kind: "dash", d: "M20,135H280M150,135V185" },
        T(150, 30, "w = 25 kN/m", 11),
        T(150, 107, "L = 6.00 m", 10),
        T(150, 206, "Mmax = wL² / 8", 11, "middle", true),
    ],
};

/** A page of structural design equations, like calculation notes. */
const formulas: Drawing = {
    name: "معادلات تصميم",
    w: 300,
    h: 240,
    strokes: [
        { kind: "dash", d: range(40, 240, 40).map((y) => `M0,${y}H300`).join("") },
        { kind: "thin", d: "M0,0V240" },
        T(14, 28, "σ = P / A", 15, "start", true),
        T(14, 68, "M = w · L² / 8", 15, "start", true),
        T(14, 108, "Pu = 0.35 fcu Ac + 0.67 fy As", 13, "start", true),
        T(14, 148, "As = Mu / (0.87 fy d)", 13, "start", true),
        T(14, 188, "δ = 5 w L⁴ / 384 E I", 13, "start", true),
        T(14, 228, "fcu = 30 N/mm²    fy = 360 N/mm²", 11, "start"),
    ],
};

/** The title block found in the corner of every engineering sheet. */
const titleBlock: Drawing = {
    name: "إطار اللوحة",
    w: 300,
    h: 120,
    strokes: [
        { kind: "main", d: "M0,0H300V120H0Z" },
        { kind: "thin", d: "M0,40H180M0,80H180M180,0V120M180,60H300" },
        T(90, 26, "SANAD", 15, "middle", true),
        T(90, 65, "STRUCTURAL — COLUMNS", 10),
        T(90, 105, "DWG No.  S-01", 10),
        T(240, 35, "SCALE 1:50", 10),
        T(240, 95, "REV.  A", 10),
    ],
};

/** Section and detail markers, the way drawings point to one another. */
const callouts: Drawing = {
    name: "علامات القطاعات",
    w: 220,
    h: 110,
    strokes: [
        { kind: "main", d: circle(40, 50, 24) + "M16,50H64" },
        { kind: "thin", d: "M64,50H110M110,42L124,50L110,58Z" },
        { kind: "main", d: circle(180, 50, 20) },
        { kind: "dash", d: circle(180, 50, 30) },
        T(40, 44, "A", 13, "middle", true),
        T(40, 66, "S-02", 8),
        T(180, 55, "3", 14, "middle", true),
    ],
};

export const DRAWINGS = { plot, apartment, site, grid, stair, levels, columnSection, columnElevation, footing, beamSection, beamDiagram, formulas, titleBlock, callouts };
export type DrawingId = keyof typeof DRAWINGS;

const LINE_CLASS = { main: s.lnMain, thin: s.lnThin, dash: s.lnDash };

/** Renders one drawing's strokes, drawing them in one after another from `delay` (seconds). */
export function DrawingStrokes({ drawing, delay = 0, step = 0.28 }: { drawing: Drawing; delay?: number; step?: number }) {
    return (
        <>
            {drawing.strokes.map((st, j) => {
                const at = delay + j * step;
                if (st.kind === "text")
                    return (
                        <motion.text
                            key={j}
                            x={st.x}
                            y={st.y}
                            textAnchor={st.anchor ?? "middle"}
                            fontSize={st.size ?? 11}
                            className={st.strong ? s.lnTextStrong : s.lnText}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: at + 0.6 }}
                        >
                            {st.t}
                        </motion.text>
                    );
                if (st.kind === "dot" || st.kind === "dash")
                    return (
                        <motion.path
                            key={j}
                            d={st.d}
                            className={st.kind === "dot" ? s.lnDot : s.lnDash}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1.2, delay: at + 0.5 }}
                        />
                    );
                return (
                    <motion.path
                        key={j}
                        d={st.d}
                        className={LINE_CLASS[st.kind]}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{
                            pathLength: { duration: 2.2, ease: "easeInOut", delay: at },
                            opacity: { duration: 0.3, delay: at },
                        }}
                    />
                );
            })}
        </>
    );
}
