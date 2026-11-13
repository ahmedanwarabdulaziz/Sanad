"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { TILE_CREDIT, clamp01, createTileLayer, drawArea, easeInOut, fitCanvas, fitView, lerpView } from "@/components/masterplan/mapTiles";
import { NEARBY_PLACES, NEIGHBORS, PROJECT_AREA, PROJECT_LOCATION, whatsappUrl } from "@/lib/sanad-zayed/masterplan/data";
import s from "./film.module.css";
import { SoundToggle, StartGate, useFilmMusic } from "@/components/film-sound/FilmSound";
import { DRAWINGS, DrawingStrokes, type Drawing, type DrawingId } from "./drawings";

/**
 * «حقّ المرحلة» — an interactive film that explains how a Sanad project is chosen, funded and
 * priced stage by stage. Built one scene at a time; every number shown is symbolic, never a real price.
 */

/** Cinematic ease: fast out, long soft landing. */
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Runs `steps` one after another: [delay ms from start, phase] pairs. With `active` false it holds the
 * first phase and waits, which is how a scene pauses for the viewer and resumes after they act.
 */
function usePhases<T extends string>(steps: [number, T][], run: number, active = true) {
    const [phase, setPhase] = useState<T>(steps[0][1]);
    useEffect(() => {
        setPhase(steps[0][1]);
        if (!active) return;
        const ids = steps.slice(1).map(([at, p]) => window.setTimeout(() => setPhase(p), at));
        return () => ids.forEach(clearTimeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [run, active]);
    return phase;
}

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/**
 * A line that rises word by word from behind an invisible edge, and leaves upward the same way.
 * Words marked with `*` are gold and get a hand-drawn underline once the line has landed.
 */
function RevealLine({ text, className, delay = 0, step = 0.11 }: { text: string; className?: string; delay?: number; step?: number }) {
    const words = text.split(" ");
    const renderWord = (w: string, i: number) => {
        const gold = w.startsWith("*");
        const word = gold ? w.slice(1) : w;
        return (
            <span key={i} className={s.mask}>
                <motion.span
                    className={gold ? s.goldWord : s.word}
                    initial={{ y: "115%" }}
                    animate={{ y: "0%", transition: { duration: 0.9, ease: EASE, delay: delay + i * step } }}
                    exit={{ y: "-115%", transition: { duration: 0.6, ease: [0.55, 0, 0.75, 0], delay: i * 0.05 } }}
                >
                    {word}
                    {gold && (
                        <motion.i
                            className={s.underline}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1, transition: { duration: 0.7, ease: EASE, delay: delay + words.length * step + 0.5 } }}
                        />
                    )}
                </motion.span>
            </span>
        );
    };
    // consecutive gold words travel together: a wrapping line never splits a gold phrase across two lines
    const groups: { gold: boolean; items: { w: string; i: number }[] }[] = [];
    words.forEach((w, i) => {
        const gold = w.startsWith("*");
        const last = groups[groups.length - 1];
        if (gold && last?.gold) last.items.push({ w, i });
        else groups.push({ gold, items: [{ w, i }] });
    });
    return (
        <div className={className}>
            {groups.map((g) =>
                g.gold && g.items.length > 1 ? (
                    <span key={g.items[0].i} className={s.goldGroup}>
                        {g.items.map(({ w, i }) => renderWord(w, i))}
                    </span>
                ) : (
                    renderWord(g.items[0].w, g.items[0].i)
                )
            )}
        </div>
    );
}

/* ---------------- Scene 0: the opening questions, then the title ---------------- */

type P0 = "dark" | "q1" | "q2" | "clear" | "title" | "en" | "brand" | "done";
const S0: [number, P0][] = [
    [0, "dark"],
    [900, "q1"],
    [2500, "q2"],
    [5600, "clear"],
    [6500, "title"],
    [7900, "en"],
    [8800, "brand"],
    [10600, "done"],
];
const ORDER0: P0[] = S0.map(([, p]) => p);
const after = (phase: P0, p: P0) => ORDER0.indexOf(phase) >= ORDER0.indexOf(p);

function SceneOpening({ run, onDone }: { run: number; onDone: () => void }) {
    const phase = usePhases(S0, run);
    useEffect(() => {
        if (phase === "done") onDone();
    }, [phase, onDone]);

    const asking = after(phase, "q1") && !after(phase, "clear");
    const titled = after(phase, "title");

    return (
        // a slow camera push-in across the whole scene
        <motion.div
            className={s.stage}
            initial={{ scale: 1 }}
            animate={{ scale: 1.06, transition: { duration: 12, ease: "linear" } }}
            // the title lifts away and blurs as the next scene comes in
            exit={{
                opacity: 0,
                y: -40,
                filter: "blur(8px)",
                transition: { duration: 0.9, ease: EASE },
            }}
        >
            <AnimatePresence mode="wait">
                {asking && (
                    <motion.div key="questions" className={s.questions} exit={{ opacity: 1 }} transition={{ duration: 0.8 }}>
                        <RevealLine text="إزاي بنختار *مشاريعنا؟" className={s.question} />
                        {after(phase, "q2") && <RevealLine text="وإزاي بنختار *شركاءنا؟" className={s.question} />}
                    </motion.div>
                )}

                {titled && (
                    <motion.div key="title" className={s.title}>
                        <span className={s.titleMask}>
                            <motion.span
                                className={s.titleAr}
                                initial={{ y: "105%", backgroundPosition: "100% 0%" }}
                                animate={{ y: "0%", backgroundPosition: "0% 0%" }}
                                // rises into place, then a single band of light passes across the gold
                                transition={{
                                    y: { duration: 1.3, ease: EASE },
                                    backgroundPosition: {
                                        duration: 1.8,
                                        ease: "easeInOut",
                                        delay: 1.1,
                                    },
                                }}
                            >
                                حقّ المرحلة
                            </motion.span>
                        </span>
                        <motion.div className={s.rule} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.2, ease: EASE, delay: 0.9 }} />
                        <motion.div
                            className={s.titleEn}
                            initial={{ opacity: 0, letterSpacing: "0.5em" }}
                            animate={after(phase, "en") ? { opacity: 1, letterSpacing: "0.08em" } : {}}
                            transition={{ duration: 1.6, ease: EASE }}
                        >
                            MilestoneRight
                        </motion.div>
                        <motion.div
                            className={s.brand}
                            initial={{ opacity: 0, y: 6 }}
                            animate={after(phase, "brand") ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 1, ease: EASE }}
                        >
                            منهج سند في الشراكة العقارية
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

/* ---------------- shared by every scene with a picture: the centred-then-settled caption ---------------- */

type BackdropState = { dim: boolean; focus: DrawingId | null };

/** True on phone-width screens; follows resizes. The server renders the wide layout. */
function useNarrow() {
    return useSyncExternalStore(
        (onChange) => {
            window.addEventListener("resize", onChange);
            return () => window.removeEventListener("resize", onChange);
        },
        () => window.innerWidth < 700,
        () => false
    );
}

/** How much larger a line is while it holds the centre: generous on wide screens, gentle on phones. */
function useCentreScale() {
    return useNarrow() ? 1.06 : 1.3;
}

/**
 * The film's caption beat: a line first appears large in the centre on its own (the picture behind it
 * goes soft), then glides down to the caption position while the picture answers it. A leaving line exits
 * where it is, so the next one always starts cleanly in the centre.
 */
function Caption({ id, text, centred, strong = false }: { id: string | null; text: string | null; centred: boolean; strong?: boolean }) {
    const big = useCentreScale();
    return (
        <div className={s.caption}>
            <AnimatePresence mode="wait">
                {id && text && (
                    <motion.div
                        key={id}
                        initial={{ scale: big, y: "0svh" }}
                        animate={{
                            scale: centred ? big : 1,
                            // a strong line is taller, so it settles a little higher to leave room for the buttons under it
                            y: centred ? "0svh" : strong ? "25svh" : "31svh",
                        }}
                        exit={{ opacity: 1 }}
                        transition={{ duration: 1.1, ease: EASE }}
                    >
                        {/* a key line of the film can be set larger than the rest */}
                        <RevealLine text={text} className={strong ? s.captionLineStrong : s.captionLine} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/** Phase helpers for scenes built on the caption beat: `l1c` = line 1 centred, `l1s` = line 1 settled. */
function beat<T extends string>(order: readonly T[], phase: T) {
    const at = (p: T) => order.indexOf(phase) >= order.indexOf(p);
    const line = /^l\d/.test(phase) ? phase.slice(0, 2) : null;
    return { at, line, centred: phase.endsWith("c") };
}

/** While a caption holds the centre, the picture stays in place, softly out of focus. */
const SOFT = { opacity: 0.7, filter: "blur(6px)" };
const SHARP = { opacity: 1, filter: "blur(0px)" };

/** The small person glyph used for partners across the film. */
function PersonGlyph({ className }: { className?: string }) {
    return (
        <svg viewBox="-12 -12 24 24" className={className} aria-hidden>
            <circle cy={-3.5} r={3.2} />
            <path d="M-6.5,8a6.5,5.5 0 0 1 13,0" />
        </svg>
    );
}

/* ---------------- the circle of people: Sanad, its partners and clients (scene 1) ---------------- */

type Person = {
    x: number;
    y: number;
    partner: boolean;
    delay: number;
    ang: number;
};
const HUB_R = 46;

/**
 * Rounds to 2 decimals. Server and browser can disagree on the last digits of Math.cos/sin,
 * which React reports as a hydration mismatch; rounded coordinates render identically on both.
 */
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Two loose rings of people around Sanad: an inner circle of 9 and an outer one of 15. */
function buildPeople(): Person[] {
    const r = rng(31);
    const out: Person[] = [];
    [
        { n: 9, R: 140, off: 0.2, start: 0 },
        { n: 15, R: 245, off: 0, start: 0.55 },
    ].forEach(({ n, R, off, start }) => {
        for (let i = 0; i < n; i++) {
            const ang = (i / n) * Math.PI * 2 + off + (r() - 0.5) * 0.25 - Math.PI / 2;
            const rad = R + (r() - 0.5) * 30;
            out.push({
                x: r2(Math.cos(ang) * rad),
                y: r2(Math.sin(ang) * rad),
                partner: r() < 0.42,
                delay: start + i * 0.07,
                ang,
            });
        }
    });
    return out;
}
const PEOPLE = buildPeople();

/** The line from Sanad's edge to a person's edge. */
function edge(p: Person) {
    const len = Math.hypot(p.x, p.y);
    return {
        hub: [r2(Math.cos(p.ang) * (HUB_R + 6)), r2(Math.sin(p.ang) * (HUB_R + 6))] as const,
        person: [r2((p.x / len) * (len - 15)), r2((p.y / len) * (len - 15))] as const,
    };
}

/** A person marker: partners are solid gold, clients are outlined. */
function PersonMark({ p }: { p: Person }) {
    return (
        <motion.g
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
                type: "spring",
                stiffness: 260,
                damping: 18,
                delay: p.delay + 0.35,
            }}
            style={{ x: p.x, y: p.y }}
        >
            <circle r={12} className={p.partner ? s.personPartner : s.personClient} />
            <circle cy={-3.5} r={3.2} className={p.partner ? s.glyphDark : s.glyphGold} />
            <path d="M-6.5,8a6.5,5.5 0 0 1 13,0" className={p.partner ? s.glyphDark : s.glyphGold} />
        </motion.g>
    );
}

function Network({ people, hub, talking, soft }: { people: boolean; hub: boolean; talking: boolean; soft: boolean }) {
    return (
        <motion.svg className={s.net} viewBox="-300 -300 600 600" aria-hidden animate={soft ? SOFT : SHARP} transition={{ duration: 0.9, ease: "easeInOut" }}>
            {/* a line from Sanad to every person, drawn as each one appears */}
            {people &&
                PEOPLE.map((p, i) => {
                    const e = edge(p);
                    return (
                        <motion.line
                            key={`l${i}`}
                            x1={e.hub[0]}
                            y1={e.hub[1]}
                            x2={e.person[0]}
                            y2={e.person[1]}
                            className={talking ? s.linkOn : s.link}
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.9, ease: EASE, delay: p.delay }}
                        />
                    );
                })}

            {/* «على تواصل دايم»: messages travel both ways along the lines */}
            {people &&
                talking &&
                PEOPLE.filter((_, i) => i % 2 === 0).map((p, i) => {
                    const e = edge(p);
                    const [a, b] = i % 3 !== 1 ? [e.hub, e.person] : [e.person, e.hub];
                    return (
                        <motion.circle
                            key={`m${i}`}
                            r={2.8}
                            className={s.message}
                            initial={{ cx: a[0], cy: a[1], opacity: 0 }}
                            animate={{
                                cx: [a[0], b[0]],
                                cy: [a[1], b[1]],
                                opacity: [0, 1, 1, 0],
                            }}
                            transition={{
                                duration: 1.5,
                                ease: "easeInOut",
                                repeat: Infinity,
                                repeatDelay: 1 + (i % 5) * 0.45,
                                delay: 0.4 + i * 0.22,
                            }}
                        />
                    );
                })}

            {people && PEOPLE.map((p, i) => <PersonMark key={`p${i}`} p={p} />)}

            {/* Sanad at the centre */}
            {hub && (
                <g>
                    <motion.circle
                        r={HUB_R}
                        className={s.hubPulse}
                        initial={{ scale: 1, opacity: 0 }}
                        animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
                        transition={{
                            duration: 2.6,
                            repeat: Infinity,
                            ease: "easeOut",
                            delay: 1,
                        }}
                    />
                    <motion.circle r={HUB_R} className={s.hub} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1, ease: EASE }} />
                    <motion.circle
                        r={HUB_R - 7}
                        className={s.hubRing}
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.4, ease: "easeInOut", delay: 0.3 }}
                    />
                    <motion.text
                        className={s.hubText}
                        textAnchor="middle"
                        dominantBaseline="central"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                    >
                        سند
                    </motion.text>
                </g>
            )}
        </motion.svg>
    );
}

/* ---------------- Scene 1: Sanad starts from people, not from a plot ---------------- */

const O1 = ["start", "l1c", "l1s", "l2c", "l2s", "l3c", "l3s", "out", "done"] as const;
type P1 = (typeof O1)[number];
const S1: [number, P1][] = [
    [0, "start"],
    [400, "l1c"],
    [2300, "l1s"],
    [4700, "l2c"],
    [6300, "l2s"],
    [9100, "l3c"],
    [10800, "l3s"],
    [14200, "out"],
    [14900, "done"],
];
const LINES1: Record<string, string> = {
    l1: "سند مش بتبدأ من *قطعة *أرض…",
    l2: "سند بتبدأ من *ناس.",
    l3: "*شركاء *وعملاء، على تواصل دايم.",
};

function ScenePeople({ run, onDone, onBackdrop }: { run: number; onDone: () => void; onBackdrop: (b: BackdropState) => void }) {
    const phase = usePhases(S1, run);
    const { at, line, centred } = beat(O1, phase);
    useEffect(() => {
        if (phase === "done") onDone();
        // while the line about the plot is up, light the plot drawing; then step back for the people
        onBackdrop({
            dim: true,
            focus: phase === "l1c" || phase === "l1s" ? "plot" : null,
        });
    }, [phase, onDone, onBackdrop]);

    const talking = at("l3s");
    return (
        // the circle recedes softly (smaller, out of focus) as the next scene comes in
        <motion.div
            className={s.scene}
            exit={{
                opacity: 0,
                scale: 0.9,
                filter: "blur(10px)",
                transition: { duration: 1, ease: EASE },
            }}
        >
            <Network hub={at("l1s")} people={at("l2s")} talking={talking} soft={centred} />
            <Caption id={line} text={line ? LINES1[line] : null} centred={centred} />
            <div className={s.legendSpot}>
                <AnimatePresence>
                    {talking && !at("out") && (
                        <motion.div
                            className={s.legend}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, transition: { duration: 0.5 } }}
                            transition={{ duration: 0.8, delay: 1.2, ease: EASE }}
                        >
                            <span>
                                <i className={s.swatchPartner} /> شريك
                            </span>
                            <span>
                                <i className={s.swatchClient} /> عميل
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

/* ---------------- Scene 2: in every conversation, one shared goal ---------------- */

const O2 = ["start", "l1c", "l1s", "l2c", "l2s", "l3c", "l3s", "out", "done"] as const;
type P2 = (typeof O2)[number];
const S2: [number, P2][] = [
    [0, "start"],
    [500, "l1c"],
    [2300, "l1s"],
    [6600, "l2c"],
    [8400, "l2s"],
    [11400, "l3c"],
    [13200, "l3s"],
    [17200, "out"],
    [17900, "done"],
];
const LINES2: Record<string, string> = {
    l1: "في كل حوار مع *شركائنا…",
    l2: "وكان بيجمعهم *هدف *واحد…",
    l3: "الفكرة جت من *الشركاء… مش من *إعلان.",
};

/** What partners say, in their own words. */
const WISHES = ["نفسي في بيت أوسع لعيلتي", "عايز مكان هادي ومنظّم", "قريب من الطرق والخدمات", "وفلوسي تبقى في أمان"];

/** Where each message card sits: around the centre on wide screens, stacked on phones. */
function useWishSpots() {
    return useNarrow()
        ? [
              { x: 18, y: -165 },
              { x: -18, y: -58 },
              { x: 18, y: 50 },
              { x: -18, y: 157 },
          ]
        : [
              { x: 210, y: -110 },
              { x: -210, y: -70 },
              { x: 230, y: 60 },
              { x: -190, y: 110 },
          ];
}

/** A partner's message: first the typing dots, then their words. Merges into the centre when asked. */
function WishCard({ text, spot, delay, merged }: { text: string; spot: { x: number; y: number }; delay: number; merged: boolean }) {
    const [typed, setTyped] = useState(false);
    useEffect(() => {
        const id = window.setTimeout(() => setTyped(true), (delay + 0.9) * 1000);
        return () => clearTimeout(id);
    }, [delay]);
    return (
        <motion.div
            className={s.wish}
            layout
            initial={{ opacity: 0, scale: 0.8, x: spot.x, y: spot.y + 24 }}
            animate={merged ? { opacity: 0, scale: 0.55, x: 0, y: 0 } : { opacity: 1, scale: 1, x: spot.x, y: spot.y }}
            transition={
                merged
                    ? { duration: 0.9, ease: [0.65, 0, 0.35, 1], delay: delay * 0.15 }
                    : {
                          type: "spring",
                          stiffness: 200,
                          damping: 22,
                          delay,
                          layout: { duration: 0.4, ease: EASE },
                      }
            }
        >
            <span className={s.wishAvatar}>
                <PersonGlyph />
            </span>
            {typed ? (
                <motion.span className={s.wishText} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                    {text}
                </motion.span>
            ) : (
                <span className={s.wishDots}>
                    {[0, 1, 2].map((k) => (
                        <motion.i key={k} animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 0.9, repeat: Infinity, delay: k * 0.15 }} />
                    ))}
                </span>
            )}
        </motion.div>
    );
}

function SceneRequest({ run, onDone, onBackdrop }: { run: number; onDone: () => void; onBackdrop: (b: BackdropState) => void }) {
    const phase = usePhases(S2, run);
    const { at, line, centred } = beat(O2, phase);
    const spots = useWishSpots();
    useEffect(() => {
        if (phase === "done") onDone();
        onBackdrop({ dim: true, focus: null });
    }, [phase, onDone, onBackdrop]);

    const merged = at("l2s");
    return (
        <motion.div
            className={s.scene}
            exit={{
                opacity: 0,
                scale: 0.94,
                filter: "blur(10px)",
                transition: { duration: 1, ease: EASE },
            }}
        >
            <motion.div className={s.wishStage} animate={centred ? SOFT : SHARP} transition={{ duration: 0.9, ease: "easeInOut" }}>
                {at("l1s") && WISHES.map((w, i) => <WishCard key={w} text={w} spot={spots[i]} delay={i * 0.55} merged={merged} />)}

                {/* the one goal they share */}
                <AnimatePresence>
                    {merged && (
                        <motion.div
                            className={s.wishGold}
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: at("l3s") ? 1.04 : 1 }}
                            transition={{
                                duration: 0.9,
                                ease: EASE,
                                delay: at("l3s") ? 0 : 0.7,
                            }}
                        >
                            <motion.span
                                className={s.wishGoldMain}
                                initial={{ backgroundPosition: "100% 0%" }}
                                animate={{ backgroundPosition: "0% 0%" }}
                                transition={{ duration: 1.8, ease: "easeInOut", delay: 1.5 }}
                            >
                                بيت في مدينة جديدة
                            </motion.span>
                            <span className={s.wishGoldSub}>في القاهرة الكبرى</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* «جت من الشركاء»: the partners who asked, signed under the goal */}
                <AnimatePresence>
                    {at("l3s") && (
                        <motion.div className={s.wishFrom} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}>
                            <span className={s.wishFromFaces}>
                                {WISHES.map((w, i) => (
                                    <motion.span
                                        key={w}
                                        className={s.wishFace}
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 18,
                                            delay: 0.5 + i * 0.12,
                                        }}
                                    >
                                        <PersonGlyph />
                                    </motion.span>
                                ))}
                            </span>
                            <span>من شركائنا</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
            <Caption id={line} text={line ? LINES2[line] : null} centred={centred} />
        </motion.div>
    );
}

/* ---------------- Scene 3: from a wide search to three areas (first interaction) ---------------- */

/**
 * The areas researched, at their real positions (city centres). `out` is the round in which an area
 * was set aside: 1 = first sift, 2 = second sift, 0 = stayed for the detailed study. Sheikh Zayed first.
 * No reason is shown per area: each was measured against the partners' goal, not judged in public.
 */
type Area = { id: string; name: string; note: string; lat: number; lng: number; out: 0 | 1 | 2 };
const AREAS: Area[] = [
    { id: "zayed", name: "الشيخ زايد", note: "غرب القاهرة · على محور 26 يوليو", lat: 30.056, lng: 30.977, out: 0 },
    { id: "october", name: "6 أكتوبر", note: "غرب القاهرة · مدينة متكاملة الخدمات", lat: 29.953, lng: 30.922, out: 0 },
    { id: "fifth", name: "التجمع الخامس", note: "شرق القاهرة · مجتمع سكني مكتمل", lat: 30.005, lng: 31.434, out: 0 },
    { id: "first", name: "التجمع الأول", note: "شرق القاهرة", lat: 30.06, lng: 31.419, out: 2 },
    { id: "madinaty", name: "مدينتي", note: "شرق القاهرة", lat: 30.092, lng: 31.631, out: 2 },
    { id: "hadayek", name: "حدائق أكتوبر", note: "جنوب 6 أكتوبر", lat: 29.891, lng: 30.913, out: 1 },
    { id: "shorouk", name: "الشروق", note: "شرق القاهرة", lat: 30.145, lng: 31.64, out: 1 },
    { id: "obour", name: "العبور", note: "شمال شرق القاهرة", lat: 30.205, lng: 31.458, out: 1 },
    { id: "capital", name: "العاصمة الإدارية", note: "شرق القاهرة", lat: 30.0275, lng: 31.765, out: 1 },
];
const FINALISTS = AREAS.filter((a) => a.out === 0);
/** Tahrir Square, as the reference point for "central Cairo". */
const DOWNTOWN = { lat: 30.0444, lng: 31.2357 };

type MapProps = {
    /** the area whose study card is up */
    open: string | null;
    /** how many sifting rounds have happened (0, 1 or 2) */
    sifted: number;
    /** the camera closes in on the three finalists */
    narrowed: boolean;
    /** Sheikh Zayed steps forward, the others step back */
    picking: boolean;
    /** the camera flies in to Sheikh Zayed */
    chosen: boolean;
    /** the research sweep passes over each area */
    scanning: boolean;
    /** the finalists keep pulsing, as if asking "which one?" */
    pulsing: boolean;
};

/**
 * The real satellite map of Greater Cairo, in a frame at the centre of the film (the film's own
 * backdrop stays around it). Pins follow the map as it moves; the camera eases between framings:
 * every area → the three finalists → Sheikh Zayed.
 */
function RealMap({ open, sifted, narrowed, picking, chosen, scanning, pulsing }: MapProps) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const pins = useRef<(HTMLDivElement | null)[]>([]);
    const centre = useRef<HTMLDivElement>(null);
    // which framing the camera is heading to, and since when
    const target = useRef<{ to: 0 | 1 | 2; from: 0 | 1 | 2; at: number }>({ to: 0, from: 0, at: 0 });
    useEffect(() => {
        const to = chosen ? 2 : narrowed ? 1 : 0;
        if (to !== target.current.to) target.current = { to, from: target.current.to, at: performance.now() };
    }, [narrowed, chosen]);

    useEffect(() => {
        const cv = canvas.current!;
        const g = cv.getContext("2d")!;
        const tiles = createTileLayer();
        tiles.warm(DOWNTOWN, 9, 11, 3, 2);
        tiles.warm(AREAS[0], 12, 13, 2, 2);
        const t0 = performance.now();
        let raf = 0;
        const frame = (now: number) => {
            const { W, H } = fitCanvas(cv, g);
            const rect = { x: 0, y: 0, w: W, h: H };
            const all = fitView([...AREAS, DOWNTOWN], rect, 0.8, 12);
            const views = [all, fitView([...FINALISTS, DOWNTOWN], rect, 0.72, 12), fitView([AREAS[0]], rect, 1, all.Z + 1.7)];
            const { to, from, at } = target.current;
            let v = at ? lerpView(views[from], views[to], easeInOut(clamp01((now - at) / 2400)), to === 2 ? 0.12 : 0) : all;
            // settle in from a little further out when the map first appears
            const intro = clamp01((now - t0) / 2800);
            if (intro < 1) v = { ...v, Z: v.Z - 0.7 * (1 - easeInOut(intro)) };
            tiles.draw(g, W, H, v.c, v.Z, v.sx, v.sy);
            // darken and cool the imagery so it sits inside the film's palette
            g.fillStyle = "rgba(6, 12, 26, 0.45)";
            g.fillRect(0, 0, W, H);
            AREAS.forEach((a, i) => {
                const el = pins.current[i];
                if (!el) return;
                const [x, y] = tiles.project(a, v.c, v.Z, v.sx, v.sy);
                el.style.left = `${x}px`;
                el.style.top = `${y}px`;
            });
            if (centre.current) {
                const [x, y] = tiles.project(DOWNTOWN, v.c, v.Z, v.sx, v.sy);
                centre.current.style.left = `${x}px`;
                centre.current.style.top = `${y}px`;
            }
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, []);

    return (
        <>
            <motion.div className={s.mapFrame} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease: EASE }}>
                <canvas ref={canvas} className={s.mapCanvas} />
                <span className={s.mapCredit}>{TILE_CREDIT}</span>
            </motion.div>

            {/* pins live in a layer clipped to the frame, so areas that leave the view (when the camera flies in) disappear with it */}
            <div className={s.mapPins}>
                <motion.div
                    ref={centre}
                    className={s.mapCentreMark}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: picking ? 0 : 1 }}
                    transition={{ duration: 0.8, delay: picking ? 0 : 1.4 }}
                >
                    <i />
                    وسط القاهرة
                </motion.div>

                {AREAS.map((a, i) => {
                    const isZayed = a.id === "zayed";
                    const setAside = a.out > 0 && sifted >= a.out;
                    return (
                        <motion.div
                            key={a.id}
                            ref={(el) => {
                                pins.current[i] = el;
                            }}
                            className={cx(
                                s.pin,
                                open === a.id && s.pinOpen,
                                setAside && s.pinOut,
                                picking && !isZayed && !setAside && s.pinDim,
                                picking && isZayed && s.pinHero
                            )}
                            aria-label={a.name}
                            initial={{ opacity: 0, scale: 0 }}
                            // once the camera closes in on the three finalists, the set-aside areas leave the map
                            animate={setAside && narrowed ? { opacity: 0, scale: 0.6, transition: { duration: 0.8 } } : { opacity: 1, scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 1.3 + i * 0.14 }}
                        >
                            {(scanning || pulsing) && !setAside && !picking && (
                                <motion.span
                                    key={pulsing ? "pulse" : "scan"}
                                    className={s.pinScan}
                                    initial={{ scale: 0.6, opacity: 0 }}
                                    animate={{ scale: [0.6, 2.4], opacity: [0.9, 0] }}
                                    transition={pulsing ? { duration: 1.4, delay: i * 0.3, repeat: Infinity, repeatDelay: 0.4 } : { duration: 1.1, delay: 0.2 + i * 0.22 }}
                                />
                            )}
                            {chosen && isZayed && (
                                <motion.span className={s.pinScan} animate={{ scale: [0.8, 3], opacity: [0.9, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }} />
                            )}
                            <span className={s.pinDot}>{setAside ? "✕" : ""}</span>
                            <span className={s.pinLabel}>{a.name}</span>
                        </motion.div>
                    );
                })}
            </div>
        </>
    );
}

/** What Sanad studies in every area — the same yardstick for all of them. */
const CRITERIA = [
    { t: "الطلب على السكن", d: "هل فيه ناس فعلًا عايزة تسكن هنا، ووحدات بتتباع وتتأجر؟" },
    { t: "الخدمات", d: "مدارس ومستشفيات وأسواق قريبة وجاهزة، مش على الورق بس." },
    { t: "الطرق والوصول", d: "سهولة الوصول للشغل ولباقي القاهرة من غير مشوار طويل." },
    { t: "الأراضي المتاحة", d: "قطع أرض مناسبة لمشروع سكني، بوضع قانوني سليم." },
    { t: "فرص النمو", d: "المشروعات الجديدة حوالين المنطقة اللي بتزوّد قيمتها مع الوقت." },
];

const O3 = ["start", "l1c", "l1s", "l2c", "l2s", "l3c", "l3s", "sift2", "l4c", "l4s", "ask", "go", "l5c", "l5s", "l6c", "l6s", "l7c", "l7s", "out", "done"] as const;
type P3 = (typeof O3)[number];
const S3A: [number, P3][] = [
    [0, "start"],
    [400, "l1c"],
    [2200, "l1s"],
    [5600, "l2c"],
    [7400, "l2s"],
    [10600, "l3c"],
    [12400, "l3s"], // first sift
    [14600, "sift2"], // second sift
    [17000, "l4c"],
    [18800, "l4s"], // the camera closes in on the three
    [22000, "ask"],
];
/** After the viewer has read Sheikh Zayed's study and pressed «كمّل». */
const S3B: [number, P3][] = [
    [0, "go"],
    [500, "l5c"],
    [2300, "l5s"],
    [5000, "l6c"],
    [6800, "l6s"], // the three finalists pulse: which one?
    [9800, "l7c"],
    [11600, "l7s"], // the answer: the camera flies to Sheikh Zayed
    [17000, "out"],
    [17700, "done"],
];
const LINES3: Record<string, string> = {
    l1: "بدأنا *بحث *واسع في المدن الجديدة حوالين القاهرة…",
    l2: "وقِسنا كل منطقة بنفس *المعايير…",
    l3: "واستبعدنا اللي مش مناسب *لهدف *شركائنا…",
    l4: "لحد ما اتبقت *3 *مناطق… وبدأنا فيها *بحث *مفصّل.",
    l5: "كل منطقة ليها *مميزاتها…",
    l6: "والسؤال كان: فين *الفرصة دلوقتي؟",
    l7: "ووقع اختيارنا على *الشيخ *زايد.",
};
/** A finalist's detailed study: the five criteria checked off one by one. */
function AreaCard({ area }: { area: Area }) {
    return (
        <motion.div
            className={s.areaCard}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.25 } }}
            transition={{ duration: 0.45, ease: EASE }}
        >
            <div className={s.areaCardHead}>
                <strong>{area.name}</strong>
                <span>{area.note}</span>
            </div>
            <ul className={s.areaCardList}>
                {CRITERIA.map((c, i) => (
                    <li key={c.t}>
                        <motion.i
                            className={s.areaCheck}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.25 + i * 0.18 }}
                        >
                            ✓
                        </motion.i>
                        {c.t}
                    </li>
                ))}
            </ul>
            <motion.div className={s.areaCardFoot} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + CRITERIA.length * 0.18 }}>
                بحث مفصّل بنفس المعايير
            </motion.div>
        </motion.div>
    );
}

/** «اشرحلي أكتر»: how Sanad studies an area, then back to the film. */
function MorePanel({ onClose }: { onClose: () => void }) {
    return (
        <motion.div className={s.more} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.div
                className={s.moreSheet}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.45, ease: EASE }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-label="إزاي بندرس أي منطقة"
            >
                <h3>إزاي بندرس أي منطقة؟</h3>
                <p>كل منطقة بتتقاس بنفس المسطرة، عشان المقارنة تبقى عادلة. وبنعملها على مرحلتين: فرز واسع لكل المناطق، وبعدين بحث مفصّل للي بيتبقى.</p>
                <ol>
                    {CRITERIA.map((c) => (
                        <li key={c.t}>
                            <strong>{c.t}</strong>
                            <span>{c.d}</span>
                        </li>
                    ))}
                </ol>
                <button className={s.btn} onClick={onClose}>
                    رجوع للفيلم
                </button>
            </motion.div>
        </motion.div>
    );
}

function SceneResearch({ run, onDone, onBackdrop }: { run: number; onDone: () => void; onBackdrop: (b: BackdropState) => void }) {
    const [unlocked, setUnlocked] = useState(false);
    const phaseA = usePhases(S3A, run);
    const phaseB = usePhases(S3B, run, unlocked);
    const phase: P3 = unlocked ? phaseB : phaseA;
    const { at, line, centred } = beat(O3, phase);
    const [more, setMore] = useState(false);

    useEffect(() => {
        if (phase === "done") onDone();
        onBackdrop({ dim: true, focus: null });
    }, [phase, onDone, onBackdrop]);

    const asking = phase === "ask";
    const sifted = at("sift2") ? 2 : at("l3s") ? 1 : 0;
    // at the pause, Sheikh Zayed's detailed study comes up on its own
    const open = asking ? "zayed" : null;

    return (
        <motion.div className={s.scene} exit={{ opacity: 1, transition: { duration: 0 } }}>
            {/* no fade on exit: scene 4 picks the map up from exactly this framing */}
            <motion.div className={s.mapBox} animate={centred || more ? SOFT : SHARP} transition={{ duration: 0.9, ease: "easeInOut" }}>
                {at("l1s") && (
                    <RealMap
                        open={open}
                        sifted={sifted}
                        narrowed={at("l4s")}
                        picking={at("l7s")}
                        chosen={at("l7s")}
                        scanning={at("l2s") && !at("l3s")}
                        pulsing={at("l6s") && !at("l7c")}
                    />
                )}

                {/* the five criteria every area is measured against */}
                <AnimatePresence>
                    {at("l2s") && !unlocked && (
                        <motion.ul className={s.chips} exit={{ opacity: 0, transition: { duration: 0.5 } }}>
                            {CRITERIA.map((c, i) => (
                                <motion.li
                                    key={c.t}
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, ease: EASE, delay: 0.2 + i * 0.15 }}
                                >
                                    {c.t}
                                </motion.li>
                            ))}
                        </motion.ul>
                    )}
                </AnimatePresence>

                <AnimatePresence>{asking && <AreaCard key="zayed" area={AREAS[0]} />}</AnimatePresence>
            </motion.div>

            <Caption id={line} text={line ? LINES3[line] : null} centred={centred} />

            {/* the pause: the film waits for the viewer */}
            <AnimatePresence>
                {asking && (
                    <motion.div className={s.ask} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.6, ease: EASE }}>
                        <div className={s.askActions}>
                            <button className={s.btnGold} onClick={() => setUnlocked(true)}>
                                كمّل
                            </button>
                            <button className={s.btn} onClick={() => setMore(true)}>
                                اشرحلي أكتر
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>{more && <MorePanel onClose={() => setMore(false)} />}</AnimatePresence>
        </motion.div>
    );
}

/* ---------------- Scene 4: why Sheikh Zayed — Al-Tharwa Al-Khadraa ---------------- */

const MAJORS = NEIGHBORS.filter((n) => n.group === "major");
/** The places a resident reaches in minutes (from the project's verified drive times). */
const SERVICES = NEARBY_PLACES.filter((p) => ["ahly", "hyper-one", "zed", "smart-village"].includes(p.id));
const AREA_CORNERS = PROJECT_AREA.corners.map((i) => PROJECT_AREA.polygon[i]);

const O4 = ["start", "l1c", "l1s", "l2c", "l2s", "l3c", "l3s", "l4c", "l4s", "l5c", "l5s", "ask", "out", "done"] as const;
type P4 = (typeof O4)[number];
const S4A: [number, P4][] = [
    [0, "start"],
    [600, "l1c"],
    [2400, "l1s"],
    [4600, "l2c"],
    [6400, "l2s"], // fly to the triangle; its outline draws itself
    [10400, "l3c"],
    [12200, "l3s"], // the three roads around it
    [15600, "l4c"],
    [17400, "l4s"], // the big developers already building there
    [21400, "l5c"],
    [23200, "l5s"], // minutes from the services
    [27200, "ask"],
];
const S4B: [number, P4][] = [
    [0, "out"],
    [800, "done"],
];
const LINES4: Record<string, string> = {
    l1: "ليه *الشيخ *زايد؟",
    l2: "لأن فيها *الثروة *الخضراء.",
    l3: "في قلب *3 *محاور رئيسية…",
    l4: "واختارها *كبار *المطورين…",
    l5: "ودقايق من *أهم *الخدمات.",
};

type ZayedMapProps = { area: boolean; roads: boolean; majors: boolean; services: boolean };

/**
 * The real map, picking up exactly where scene 3 left the camera (on Sheikh Zayed), then flying in to
 * Al-Tharwa Al-Khadraa: the triangle draws itself, its three roads are named, then the developers
 * already building inside it and the services around it appear.
 */
function ZayedMap({ area, roads, majors, services }: ZayedMapProps) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const sideLabels = useRef<(HTMLDivElement | null)[]>([]);
    const majorPins = useRef<(HTMLDivElement | null)[]>([]);
    const servicePins = useRef<(HTMLDivElement | null)[]>([]);
    const flags = useRef({ areaAt: 0, wideAt: 0 });
    useEffect(() => {
        if (area && !flags.current.areaAt) flags.current.areaAt = performance.now();
        if (services && !flags.current.wideAt) flags.current.wideAt = performance.now();
    }, [area, services]);

    useEffect(() => {
        const cv = canvas.current!;
        const g = cv.getContext("2d")!;
        const tiles = createTileLayer();
        tiles.warm(PROJECT_LOCATION, 12, 15, 3, 3);
        let raf = 0;
        const frame = (now: number) => {
            const { W, H } = fitCanvas(cv, g);
            const rect = { x: 0, y: 0, w: W, h: H };
            // scene 3's last framing, so the cut between the scenes is invisible
            const all = fitView([...AREAS, DOWNTOWN], rect, 0.8, 12);
            const zayed = fitView([AREAS[0]], rect, 1, all.Z + 1.7);
            const tri = fitView(PROJECT_AREA.polygon, rect, 0.78, 15);
            const wide = fitView([...PROJECT_AREA.polygon, ...SERVICES], rect, 0.84, 15);
            const { areaAt, wideAt } = flags.current;
            let v = zayed;
            if (areaAt) v = lerpView(zayed, tri, easeInOut(clamp01((now - areaAt) / 2600)), 0.2);
            if (wideAt) v = lerpView(tri, wide, easeInOut(clamp01((now - wideAt) / 1800)), 0);
            tiles.draw(g, W, H, v.c, v.Z, v.sx, v.sy);
            g.fillStyle = "rgba(6, 12, 26, 0.38)";
            g.fillRect(0, 0, W, H);

            const pts = PROJECT_AREA.polygon.map((p) => tiles.project(p, v.c, v.Z, v.sx, v.sy));
            if (areaAt) {
                const reveal = clamp01((now - areaAt - 1800) / 1800);
                drawArea(g, pts, reveal, 1, now, reveal * 0.55, PROJECT_AREA.corners);
            }
            // the road names, set along the triangle's sides, just outside it
            const corners = AREA_CORNERS.map((p) => tiles.project(p, v.c, v.Z, v.sx, v.sy));
            const cxA = corners.reduce((t, p) => t + p[0], 0) / 3;
            const cyA = corners.reduce((t, p) => t + p[1], 0) / 3;
            corners.forEach((a, i) => {
                const el = sideLabels.current[i];
                if (!el) return;
                const b = corners[(i + 1) % 3];
                let ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
                if (ang > 90) ang -= 180;
                if (ang < -90) ang += 180;
                const mx = (a[0] + b[0]) / 2;
                const my = (a[1] + b[1]) / 2;
                const d = Math.hypot(mx - cxA, my - cyA) || 1;
                el.style.transform = `translate(${mx + ((mx - cxA) / d) * 16}px, ${my + ((my - cyA) / d) * 16}px) translate(-50%, -50%) rotate(${ang}deg)`;
            });
            const place = (els: (HTMLDivElement | null)[], list: { lat: number; lng: number }[]) =>
                list.forEach((p, i) => {
                    const el = els[i];
                    if (!el) return;
                    const [x, y] = tiles.project(p, v.c, v.Z, v.sx, v.sy);
                    el.style.left = `${x}px`;
                    el.style.top = `${y}px`;
                });
            place(majorPins.current, MAJORS);
            place(servicePins.current, SERVICES);
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, []);

    return (
        <>
            <div className={s.mapFrame}>
                <canvas ref={canvas} className={s.mapCanvas} />
                <span className={s.mapCredit}>{TILE_CREDIT}</span>
            </div>
            <div className={s.mapPins}>
                {/* the area's name, over the triangle */}
                <AnimatePresence>
                    {area && !roads && (
                        <motion.div
                            className={s.areaName}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, transition: { duration: 0.5 } }}
                            transition={{ duration: 0.9, ease: EASE, delay: 3.2 }}
                        >
                            <strong>الثروة الخضراء</strong>
                            <span>الامتداد الشرقي للشيخ زايد</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {PROJECT_AREA.sides.map((name, i) => (
                    <motion.div
                        key={name}
                        ref={(el) => {
                            sideLabels.current[i] = el;
                        }}
                        className={s.roadLabel}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: roads && !services ? 1 : 0 }}
                        transition={{ duration: 0.7, delay: roads && !services ? i * 0.5 : 0 }}
                    >
                        {name}
                    </motion.div>
                ))}

                {MAJORS.map((n, i) => (
                    <motion.div
                        key={n.id}
                        ref={(el) => {
                            majorPins.current[i] = el;
                        }}
                        className={s.devPin}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={majors ? { opacity: services ? 0.55 : 1, scale: 1 } : { opacity: 0, scale: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 18, delay: majors && !services ? i * 0.35 : 0 }}
                    >
                        <i />
                    </motion.div>
                ))}

                {SERVICES.map((p, i) => (
                    <motion.div
                        key={p.id}
                        ref={(el) => {
                            servicePins.current[i] = el;
                        }}
                        className={s.servicePin}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={services ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 18, delay: services ? 1.4 + i * 0.35 : 0 }}
                    >
                        <i>{p.icon}</i>
                        <span>
                            <b>{p.name}</b>
                            <small>{p.driveMin} دقيقة</small>
                        </span>
                    </motion.div>
                ))}
            </div>

            {/* the developers' names, in a row under the map: their sites sit too close together to label on it */}
            <AnimatePresence>
                {majors && !services && (
                    <motion.ul className={cx(s.chips, s.devList)} exit={{ opacity: 0, transition: { duration: 0.5 } }}>
                        {MAJORS.map((n, i) => (
                            <motion.li key={n.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE, delay: 0.2 + i * 0.35 }}>
                                <b className={s.devName}>{n.name}</b>
                            </motion.li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </>
    );
}

/** «اشرحلي أكتر»: about the area, with the two interactive maps of the project. */
function AreaMore({ onClose }: { onClose: () => void }) {
    return (
        <motion.div className={s.more} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.div
                className={s.moreSheet}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.45, ease: EASE }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-label={PROJECT_AREA.about.title}
            >
                <h3>{PROJECT_AREA.about.title}</h3>
                <p>{PROJECT_AREA.about.text}</p>
                <ol>
                    {PROJECT_AREA.highlights.map((h) => (
                        <li key={h}>
                            <span>{h}</span>
                        </li>
                    ))}
                </ol>
                <div className={s.moreLinks}>
                    <a className={s.btnGold} href="/projects/sanad-zayed/masterplan?view=neighbors" target="_blank" rel="noopener">
                        جيرانك في الثروة الخضراء
                    </a>
                    <a className={s.btn} href="/projects/sanad-zayed/masterplan?view=nearby" target="_blank" rel="noopener">
                        قريبة من إيه؟
                    </a>
                </div>
                <button className={s.btnText} onClick={onClose}>
                    رجوع للفيلم
                </button>
            </motion.div>
        </motion.div>
    );
}

function SceneZayed({ run, onDone, onBackdrop }: { run: number; onDone: () => void; onBackdrop: (b: BackdropState) => void }) {
    const [unlocked, setUnlocked] = useState(false);
    const phaseA = usePhases(S4A, run);
    const phaseB = usePhases(S4B, run, unlocked);
    const phase: P4 = unlocked ? phaseB : phaseA;
    const { at, line, centred } = beat(O4, phase);
    const [more, setMore] = useState(false);
    useEffect(() => {
        if (phase === "done") onDone();
        onBackdrop({ dim: true, focus: null });
    }, [phase, onDone, onBackdrop]);

    const asking = phase === "ask";
    return (
        <motion.div className={s.scene} exit={{ opacity: 0, scale: 0.94, filter: "blur(10px)", transition: { duration: 1, ease: EASE } }}>
            <motion.div className={s.mapBox} animate={centred || more ? SOFT : SHARP} transition={{ duration: 0.9, ease: "easeInOut" }}>
                <ZayedMap area={at("l2s")} roads={at("l3s")} majors={at("l4s")} services={at("l5s")} />
            </motion.div>

            <Caption id={line} text={line ? LINES4[line] : null} centred={centred} />

            <AnimatePresence>
                {asking && (
                    <motion.div className={s.ask} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.6, ease: EASE }}>
                        <div className={s.askActions}>
                            <button className={s.btnGold} onClick={() => setUnlocked(true)}>
                                كمّل
                            </button>
                            <button className={s.btn} onClick={() => setMore(true)}>
                                اشرحلي أكتر
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>{more && <AreaMore onClose={() => setMore(false)} />}</AnimatePresence>
        </motion.div>
    );
}

/* ---------------- Scene 5: the study goes to the partners, and they approve ---------------- */

const O5 = ["start", "l1c", "l1s", "l2c", "l2s", "out", "done"] as const;
type P5 = (typeof O5)[number];
const S5: [number, P5][] = [
    [0, "start"],
    [500, "l1c"],
    [2300, "l1s"], // the study: its pages turn
    [7400, "l2c"],
    [9000, "l2s"], // the partners approve, one by one
    [14200, "out"],
    [14900, "done"],
];
const LINES5: Record<string, string> = {
    l1: "عرضنا *الدراسة على *شركائنا…",
    l2: "وبموافقة *شركائنا… *انطلقنا.",
};
/** What the study covers — the same ground the film has just walked through. */
const STUDY_SECTIONS = ["المنطقة وحدودها", "المحاور الرئيسية", "المطورين في المنطقة", "الخدمات القريبة", "فرص النمو"];
const APPROVERS = 8;

/** The outline of Al-Tharwa Al-Khadraa, drawn small on the study's cover (east–west scaled for latitude). */
const COVER_TRIANGLE = (() => {
    const pts = PROJECT_AREA.polygon;
    const k = Math.cos((30.06 * Math.PI) / 180);
    const xs = pts.map((p) => p.lng * k);
    const ys = pts.map((p) => -p.lat);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY);
    return pts.map((_, i) => `${i ? "L" : "M"}${r2(((xs[i] - minX) / span) * 100)},${r2(((ys[i] - minY) / span) * 100)}`).join("") + "Z";
})();

function SceneApproval({ run, onDone, onBackdrop }: { run: number; onDone: () => void; onBackdrop: (b: BackdropState) => void }) {
    const phase = usePhases(S5, run);
    const { at, line, centred } = beat(O5, phase);
    useEffect(() => {
        if (phase === "done") onDone();
        onBackdrop({ dim: true, focus: null });
    }, [phase, onDone, onBackdrop]);

    const shown = at("l1s");
    const approved = at("l2s");
    return (
        <motion.div className={s.scene} exit={{ opacity: 0, scale: 0.94, filter: "blur(10px)", transition: { duration: 1, ease: EASE } }}>
            <motion.div className={s.studyStage} animate={centred ? SOFT : SHARP} transition={{ duration: 0.9, ease: "easeInOut" }}>
                {shown && (
                    <motion.div className={s.study} initial={{ opacity: 0, y: 40, rotate: -3 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 1.1, ease: EASE }}>
                        {/* the pages under the cover */}
                        <motion.i className={s.studyPage} initial={{ rotate: 0 }} animate={{ rotate: -5 }} transition={{ duration: 1, ease: EASE, delay: 0.6 }} />
                        <motion.i className={s.studyPage} initial={{ rotate: 0 }} animate={{ rotate: 4 }} transition={{ duration: 1, ease: EASE, delay: 0.75 }} />

                        <div className={cx(s.studyCover, approved && s.studyCoverOk)}>
                            <span className={s.studyKicker}>دراسة منطقة</span>
                            <strong className={s.studyTitle}>الثروة الخضراء</strong>
                            <span className={s.studySub}>الشيخ زايد</span>
                            <svg className={s.studyMap} viewBox="-10 -10 120 120" aria-hidden>
                                <motion.path
                                    d={COVER_TRIANGLE}
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 1.8, ease: "easeInOut", delay: 0.8 }}
                                />
                            </svg>
                            <ul className={s.studyList}>
                                {STUDY_SECTIONS.map((t, i) => (
                                    <motion.li key={t} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: EASE, delay: 1.6 + i * 0.4 }}>
                                        <i>{i + 1}</i>
                                        {t}
                                    </motion.li>
                                ))}
                            </ul>
                        </div>
                    </motion.div>
                )}

                {/* the partners: each one approves in turn */}
                {approved && (
                    <div className={s.approvers}>
                        {Array.from({ length: APPROVERS }, (_, i) => (
                            <motion.span
                                key={i}
                                className={s.approver}
                                initial={{ opacity: 0, y: 14, scale: 0.6 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ type: "spring", stiffness: 260, damping: 18, delay: i * 0.12 }}
                            >
                                <PersonGlyph />
                                <motion.b
                                    className={s.approverOk}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 420, damping: 16, delay: 1.2 + i * 0.28 }}
                                >
                                    ✓
                                </motion.b>
                            </motion.span>
                        ))}
                    </div>
                )}
            </motion.div>

            <Caption id={line} text={line ? LINES5[line] : null} centred={centred} />
        </motion.div>
    );
}

/* ---------------- Scene 6: the field team finds the plot (end of chapter 1) ---------------- */

/** What every offered plot was checked against, in the order the sift applies them. */
const PLOT_CHECKS = ["الموقع", "الواجهة والشارع", "المساحة", "الوضع القانوني", "السعر"];

type Candidate = { lat: number; lng: number; out: number };
/**
 * Plots on offer inside Al-Tharwa Al-Khadraa, for the sift. Their positions are illustrative (spread
 * across the triangle); the one that stays is the project's real plot. `out` is the check (1–5) that
 * set a plot aside, 0 for the plot that passed them all.
 */
const CANDIDATES: Candidate[] = (() => {
    const [a, b, c] = AREA_CORNERS;
    const r = rng(77);
    const out: Candidate[] = [];
    let tries = 0;
    while (out.length < 10 && tries < 400) {
        tries++;
        let u = r();
        let v = r();
        if (u + v > 1) {
            u = 1 - u;
            v = 1 - v;
        }
        // keep away from the corners and edges, and from the project's own plot
        if (u < 0.1 || v < 0.1 || u + v > 0.88) continue;
        const lat = a.lat + u * (b.lat - a.lat) + v * (c.lat - a.lat);
        const lng = a.lng + u * (b.lng - a.lng) + v * (c.lng - a.lng);
        if (Math.hypot(lat - PROJECT_LOCATION.lat, lng - PROJECT_LOCATION.lng) < 0.004) continue;
        if (out.some((p) => Math.hypot(lat - p.lat, lng - p.lng) < 0.0045)) continue;
        out.push({ lat: r2(lat * 1e4) / 1e4, lng: r2(lng * 1e4) / 1e4, out: Math.floor(out.length / 2) + 1 });
    }
    return [{ lat: PROJECT_LOCATION.lat, lng: PROJECT_LOCATION.lng, out: 0 }, ...out];
})();

const O6 = ["start", "l1c", "l1s", "l2c", "l2s", "l3c", "l3s", "l4c", "l5c", "ask", "out", "done"] as const;
type P6 = (typeof O6)[number];
const S6A: [number, P6][] = [
    [0, "start"],
    [500, "l1c"],
    [2300, "l1s"], // the plots on offer appear
    [5600, "l2c"],
    [7400, "l2s"], // the checks, one by one, set plots aside
    [14600, "l3c"],
    [16400, "l3s"], // the one that passed: the camera flies to it
    [21400, "l4c"], // «until this moment… not a single pound»
    [24600, "l5c"], // «so… who paid?»
    [27400, "ask"],
];
const S6B: [number, P6][] = [
    [0, "out"],
    [800, "done"],
];
const LINES6: Record<string, string> = {
    l1: "فريق سند نزل *الأرض بنفسه…",
    l2: "شاف، وقارن، واستبعد…",
    l3: "لحد ما لقى *القطعة اللي بندوّر عليها.",
    l4: "لحد اللحظة دي… ولا شريك دفع *جنيه *واحد.",
    l5: "طيب… *مين *دفع؟",
};

function PlotMap({ shown, checks, found }: { shown: boolean; checks: number; found: boolean }) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const pins = useRef<(HTMLDivElement | null)[]>([]);
    const label = useRef<HTMLDivElement>(null);
    const foundAt = useRef(0);
    useEffect(() => {
        if (found && !foundAt.current) foundAt.current = performance.now();
    }, [found]);

    useEffect(() => {
        const cv = canvas.current!;
        const g = cv.getContext("2d")!;
        const tiles = createTileLayer();
        tiles.warm(PROJECT_LOCATION, 13, 17, 3, 3);
        const t0 = performance.now();
        let raf = 0;
        const frame = (now: number) => {
            const { W, H } = fitCanvas(cv, g);
            const rect = { x: 0, y: 0, w: W, h: H };
            const tri = fitView(PROJECT_AREA.polygon, rect, 0.86, 15);
            const plot = fitView([PROJECT_LOCATION], rect, 1, 16.6);
            let v = { ...tri, Z: tri.Z - 0.5 * (1 - easeInOut(clamp01((now - t0) / 2600))) };
            if (foundAt.current) v = lerpView(tri, plot, easeInOut(clamp01((now - foundAt.current) / 2600)), 0.1);
            tiles.draw(g, W, H, v.c, v.Z, v.sx, v.sy);
            g.fillStyle = "rgba(6, 12, 26, 0.4)";
            g.fillRect(0, 0, W, H);
            const pts = PROJECT_AREA.polygon.map((p) => tiles.project(p, v.c, v.Z, v.sx, v.sy));
            drawArea(g, pts, 1, 0.55, now, 0, PROJECT_AREA.corners);
            CANDIDATES.forEach((p, i) => {
                const el = pins.current[i];
                if (!el) return;
                const [x, y] = tiles.project(p, v.c, v.Z, v.sx, v.sy);
                el.style.left = `${x}px`;
                el.style.top = `${y}px`;
                if (i === 0 && label.current) {
                    label.current.style.left = `${x}px`;
                    label.current.style.top = `${y}px`;
                }
            });
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, []);

    return (
        <>
            <motion.div className={s.mapFrame} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease: EASE }}>
                <canvas ref={canvas} className={s.mapCanvas} />
                <span className={s.mapCredit}>{TILE_CREDIT}</span>
            </motion.div>
            <div className={s.mapPins}>
                {CANDIDATES.map((p, i) => {
                    const setAside = p.out > 0 && checks >= p.out;
                    const ours = i === 0;
                    return (
                        <motion.div
                            key={i}
                            ref={(el) => {
                                pins.current[i] = el;
                            }}
                            className={cx(s.plot, setAside && s.plotOut, ours && found && s.plotOurs)}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={shown ? (setAside && found ? { opacity: 0, scale: 0.6 } : { opacity: 1, scale: 1 }) : { opacity: 0, scale: 0 }}
                            transition={{ type: "spring", stiffness: 260, damping: 18, delay: shown && !setAside && !found ? 0.4 + ((i * 7) % 11) * 0.12 : 0 }}
                        >
                            {setAside ? "✕" : ""}
                        </motion.div>
                    );
                })}
                {/* the plot, named once the camera has arrived */}
                <motion.div ref={label} className={s.plotLabel} initial={{ opacity: 0 }} animate={{ opacity: found ? 1 : 0 }} transition={{ duration: 0.8, delay: found ? 2.6 : 0 }}>
                    <strong>القطعة المطابقة</strong>
                    <span>شارع 6 · متفرع من شارع النزهة</span>
                </motion.div>
            </div>
        </>
    );
}

function ScenePlot({ run, onDone, onBackdrop }: { run: number; onDone: () => void; onBackdrop: (b: BackdropState) => void }) {
    const [unlocked, setUnlocked] = useState(false);
    const phaseA = usePhases(S6A, run);
    const phaseB = usePhases(S6B, run, unlocked);
    const phase: P6 = unlocked ? phaseB : phaseA;
    const { at, line, centred } = beat(O6, phase);
    // the checks light up one after another while «شاف، وقارن، واستبعد» is settled
    const [checks, setChecks] = useState(0);
    useEffect(() => {
        if (phase !== "l2s") return;
        const ids = PLOT_CHECKS.map((_, i) => window.setTimeout(() => setChecks(i + 1), 500 + i * 1300));
        return () => ids.forEach(clearTimeout);
    }, [phase]);
    useEffect(() => {
        if (phase === "done") onDone();
        onBackdrop({ dim: true, focus: null });
    }, [phase, onDone, onBackdrop]);

    // the closing question holds the centre over a softened map
    const hook = at("l4c");
    const asking = phase === "ask";
    return (
        <motion.div className={s.scene} exit={{ opacity: 0, scale: 0.94, filter: "blur(10px)", transition: { duration: 1, ease: EASE } }}>
            <motion.div className={s.mapBox} animate={centred || hook ? SOFT : SHARP} transition={{ duration: 0.9, ease: "easeInOut" }}>
                <PlotMap shown={at("l1s")} checks={at("l3s") ? PLOT_CHECKS.length : checks} found={at("l3s")} />

                <AnimatePresence>
                    {at("l2s") && !at("l3s") && (
                        <motion.ul className={cx(s.chips, s.devList)} exit={{ opacity: 0, transition: { duration: 0.5 } }}>
                            {PLOT_CHECKS.map((c, i) => (
                                <motion.li
                                    key={c}
                                    className={i < checks ? s.chipOn : undefined}
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, ease: EASE, delay: i * 0.12 }}
                                >
                                    {c}
                                </motion.li>
                            ))}
                        </motion.ul>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* the question stays up, in the centre, while the film waits */}
            <Caption id={asking ? "l5" : line} text={asking ? LINES6.l5 : line ? LINES6[line] : null} centred={centred || asking} />

            {/* end of chapter 1: the film waits before the money question */}
            <AnimatePresence>
                {asking && (
                    <motion.div className={s.ask} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.6, ease: EASE }}>
                        <div className={s.askActions}>
                            <button className={s.btnGold} onClick={() => setUnlocked(true)}>
                                كمّل
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

/* ================= Chapter 2: the first funding ================= */

/* ---------------- Scene 7: Sanad pays the deposit and signs the preliminary contract ---------------- */

const O7 = ["start", "l1c", "l1s", "l2c", "l2s", "l3c", "l3s", "out", "done"] as const;
type P7 = (typeof O7)[number];
const S7: [number, P7][] = [
    [0, "start"],
    [500, "l1c"],
    [2300, "l1s"], // the contract appears
    [5000, "l2c"],
    [6800, "l2s"], // the deposit, and the signature
    [10600, "l3c"],
    [12400, "l3s"], // what Sanad now owes
    [17000, "out"],
    [17700, "done"],
];
const LINES7: Record<string, string> = {
    l1: "*سند… من *محفظتها.",
    l2: "دفعت *العربون… ووقّعت *العقد *الابتدائي.",
    l3: "وبقى عليها *التزامات للمالك… ولجهاز المدينة.",
};
/** A hand-written signature, drawn in as one stroke. */
const SIGNATURE = "M4,30C14,8 22,6 24,20S20,40 30,30 44,6 50,18 52,34 62,26 74,10 82,22 90,32 100,24 112,14 122,20";

function SceneDeposit({ run, onDone, onBackdrop }: { run: number; onDone: () => void; onBackdrop: (b: BackdropState) => void }) {
    const phase = usePhases(S7, run);
    const { at, line, centred } = beat(O7, phase);
    useEffect(() => {
        if (phase === "done") onDone();
        onBackdrop({ dim: true, focus: null });
    }, [phase, onDone, onBackdrop]);

    const signed = at("l2s");
    const owing = at("l3s");
    return (
        <motion.div className={s.scene} exit={{ opacity: 0, scale: 0.94, filter: "blur(10px)", transition: { duration: 1, ease: EASE } }}>
            <motion.div className={s.studyStage} animate={centred ? SOFT : SHARP} transition={{ duration: 0.9, ease: "easeInOut" }}>
                {at("l1s") && (
                    <motion.div className={cx(s.contract, signed && s.contractSigned)} initial={{ opacity: 0, y: 40, rotate: 2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 1.1, ease: EASE }}>
                        <span className={s.contractKicker}>عقد ابتدائي</span>
                        <strong className={s.contractTitle}>شراء قطعة أرض</strong>
                        <span className={s.contractSub}>الثروة الخضراء · الشيخ زايد</span>
                        <div className={s.contractParties}>
                            <span>
                                <small>البائع</small>
                                مالك الأرض
                            </span>
                            <span>
                                <small>المشتري</small>
                                سند
                            </span>
                        </div>
                        {/* the body of the contract, as ruled lines */}
                        <svg className={s.contractLines} viewBox="0 0 200 54" aria-hidden>
                            {[6, 18, 30, 42].map((y, i) => (
                                <motion.path
                                    key={y}
                                    d={`M0,${y}H${i === 3 ? 120 : 200}`}
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.8, ease: "easeInOut", delay: 0.6 + i * 0.25 }}
                                />
                            ))}
                        </svg>

                        <AnimatePresence>
                            {signed && (
                                <motion.div className={s.deposit} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 280, damping: 18 }}>
                                    <i>✓</i>
                                    العربون مدفوع · من محفظة سند
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className={s.contractSign}>
                            <svg viewBox="0 0 126 40" aria-hidden>
                                {signed && <motion.path d={SIGNATURE} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, ease: "easeInOut", delay: 0.8 }} />}
                            </svg>
                            <span>توقيع المشتري</span>
                        </div>
                    </motion.div>
                )}

                {/* what Sanad owes from here on */}
                <AnimatePresence>
                    {owing && (
                        <motion.ul className={s.owes} exit={{ opacity: 0 }}>
                            {[
                                { t: "باقي ثمن الأرض", d: "لمالك الأرض" },
                                { t: "الرسوم والإجراءات", d: "لجهاز مدينة الشيخ زايد" },
                            ].map((o, i) => (
                                <motion.li key={o.t} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.3 + i * 0.5 }}>
                                    <b>{o.t}</b>
                                    <span>{o.d}</span>
                                </motion.li>
                            ))}
                        </motion.ul>
                    )}
                </AnimatePresence>
            </motion.div>

            <Caption id={line} text={line ? LINES7[line] : null} centred={centred} />
        </motion.div>
    );
}

/* ---------------- Scene 8: how each partner's share was worked out ---------------- */

/** Symbolic figures, chosen to make the arithmetic obvious. They are not the project's real numbers. */
const SHARE = { area: 5000, cost: 10000, unit: 100, units: 50, partners: 10 };
const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
/** What the first stage pays for. */
const STAGE1_ITEMS = ["شراء الأرض", "نقل الملكية", "القرار الوزاري", "التراخيص", "أتعاب إدارة سند"];
/** A line icon for each item (24 × 24): a plot, a deed with an arrow, a seal, a permitted building, a briefcase. */
const STAGE1_ICONS = [
    "M3 17 9 5l12 4-4 11Z",
    "M6 3h9l3 3v15H6ZM9 13h6m-2-2 2 2-2 2",
    "M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM9 14l-2 7 5-3 5 3-2-7",
    "M5 21V9l7-5 7 5v12ZM10 21v-5h4v5M3 21h18",
    "M4 8h16v12H4ZM9 8V5h6v3M4 13h16",
];

/** Counts from 0 up to `to` once, starting after `delay` seconds. */
function CountUp({ to, delay = 0, duration = 1.3 }: { to: number; delay?: number; duration?: number }) {
    const [n, setN] = useState(0);
    useEffect(() => {
        let raf = 0;
        const start = performance.now() + delay * 1000;
        const tick = (now: number) => {
            const t = clamp01((now - start) / (duration * 1000));
            setN(Math.round(to * (1 - Math.pow(1 - t, 3))));
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [to, delay, duration]);
    return <>{fmt(n)}</>;
}

/**
 * The first stage's cost, as a cost sheet: each item comes in on its own line with its icon and is
 * ticked off, then a rule draws under them and the total counts up. No per-item amounts: the figures
 * are symbolic, and only the total matters for the arithmetic that follows.
 */
function CostSheet() {
    const rowsDone = 0.3 + STAGE1_ITEMS.length * 0.42;
    return (
        <div className={s.costSheet}>
            <span className={s.costKicker}>تكلفة المرحلة الأولى</span>
            <ul className={s.costRows}>
                {STAGE1_ITEMS.map((t, i) => (
                    <motion.li key={t} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55, ease: EASE, delay: 0.3 + i * 0.42 }}>
                        <span className={s.costIcon}>
                            <svg viewBox="0 0 24 24" aria-hidden>
                                <motion.path d={STAGE1_ICONS[i]} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: "easeInOut", delay: 0.4 + i * 0.42 }} />
                            </svg>
                        </span>
                        <span className={s.costName}>{t}</span>
                        <i className={s.costLeader} />
                        <motion.b
                            className={s.costTick}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 420, damping: 16, delay: 0.75 + i * 0.42 }}
                        >
                            ✓
                        </motion.b>
                    </motion.li>
                ))}
            </ul>
            <motion.i className={s.costRule} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, ease: EASE, delay: rowsDone }} />
            <motion.div className={s.costTotal} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE, delay: rowsDone + 0.3 }}>
                <span>الإجمالي</span>
                <strong>
                    <CountUp to={SHARE.cost} delay={rowsDone + 0.4} />
                </strong>
            </motion.div>
        </div>
    );
}

const O8 = ["start", "l1c", "l1s", "l2c", "l2s", "l3c", "l3s", "l4c", "l4s", "l5c", "l5s", "l6c", "l6s", "ask", "out", "done"] as const;
type P8 = (typeof O8)[number];
const S8A: [number, P8][] = [
    [0, "start"],
    [500, "l1c"],
    [2300, "l1s"], // the building: its expected residential area
    [5400, "l2c"],
    [7200, "l2s"], // the first stage's cost, and what it covers
    [12800, "l3c"],
    [14600, "l3s"], // cost per metre
    [17600, "l4c"],
    [19400, "l4s"], // one 100 m² unit, and its share
    [22800, "l5c"],
    [24600, "l5s"], // 10 partners fund their units
    [27800, "l6c"],
    [29600, "l6s"], // Sanad funds the other 40
    [33800, "ask"],
];
const S8B: [number, P8][] = [
    [0, "out"],
    [800, "done"],
];
const LINES8: Record<string, string> = {
    l1: "طيب… نصيب كل شريك *اتحسب *إزاي؟",
    l2: "حسبنا تكلفة *المرحلة *الأولى كلها…",
    l3: "وقسمناها على *الأمتار…",
    l4: "فكل شريك بيدفع على قد *أمتار *وحدته.",
    l5: "*10 شركاء موّلوا وحداتهم…",
    l6: "*والـ40 *الباقيين موّلتهم *سند من محفظتها.",
};

/** Picks `n` distinct unit indexes from `pool`, scattered but the same on every visit. */
function pickUnits(pool: number[], n: number, seed: number) {
    const r = rng(seed);
    const left = [...pool];
    const out: number[] = [];
    while (out.length < n && left.length) out.push(left.splice(Math.floor(r() * left.length), 1)[0]);
    return out;
}
const ALL_UNITS = Array.from({ length: SHARE.units }, (_, i) => i);
/** The 10 units the first partners funded, scattered through the building. */
const PARTNER_UNITS = new Set(pickUnits(ALL_UNITS, SHARE.partners, 11));
/** The 5 of Sanad's units it later sells at the stage price (chapter 3). */
const RESOLD_UNITS = new Set(pickUnits(ALL_UNITS.filter((i) => !PARTNER_UNITS.has(i)), 5, 23));
/** The unit used as the worked example (one of the partners'). */
const EXAMPLE_UNIT = [...PARTNER_UNITS][3];

/** The project as a building elevation: 5 floors × 10 numbered units, each coloured by who funds it. */
function UnitBuilding({
    highlight,
    partners,
    sanad,
    resold = false,
    glowSanad = false,
}: {
    highlight: boolean;
    partners: boolean;
    sanad: boolean;
    resold?: boolean;
    /** Sanad's own units glow: it owns them, so it wants the building at its best */
    glowSanad?: boolean;
}) {
    return (
        <div className={s.building}>
            <div className={s.buildingRoof} />
            <div className={s.buildingGrid}>
                {ALL_UNITS.map((i) => {
                    const row = Math.floor(i / 10);
                    const col = i % 10;
                    const isPartner = PARTNER_UNITS.has(i);
                    const isResold = RESOLD_UNITS.has(i);
                    return (
                        <motion.span
                            key={i}
                            className={cx(
                                s.unit,
                                highlight && !partners && i === EXAMPLE_UNIT && s.unitExample,
                                partners && isPartner && s.unitPartner,
                                sanad && !isPartner && !(resold && isResold) && s.unitSanad,
                                glowSanad && !isPartner && !isResold && s.unitSanadGlow,
                                resold && isResold && s.unitResold
                            )}
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: resold && isResold ? [1, 1.25, 1] : 1 }}
                            transition={{ duration: 0.4, ease: EASE, delay: resold && isResold ? 0.4 + [...RESOLD_UNITS].indexOf(i) * 0.45 : 0.3 + (4 - row) * 0.12 + col * 0.03 }}
                        >
                            {/* numbered from the ground floor up, right to left */}
                            <b className={s.unitNo}>{(4 - row) * 10 + col + 1}</b>
                        </motion.span>
                    );
                })}
            </div>
            <div className={s.buildingGround} />
        </div>
    );
}

function ShareMore({ onClose }: { onClose: () => void }) {
    return (
        <motion.div className={s.more} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.div
                className={s.moreSheet}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.45, ease: EASE }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-label="تكلفة المتر في المرحلة الأولى"
            >
                <h3>تكلفة المتر في المرحلة الأولى</h3>
                <p>الشريك اللي بيدخل في المرحلة الأولى بيدفع تكلفة المتر، ودي بتشمل:</p>
                <ol>
                    {STAGE1_ITEMS.map((t) => (
                        <li key={t}>
                            <strong>{t}</strong>
                        </li>
                    ))}
                </ol>
                <p>المساحة اللي اتحسب عليها النصيب افتراضية لحد ما تطلع الرخصة وتتحدد مساحات الوحدات الفعلية. الأرقام في الفيلم رمزية للتوضيح بس.</p>
                <button className={s.btn} onClick={onClose}>
                    رجوع للفيلم
                </button>
            </motion.div>
        </motion.div>
    );
}

function SceneShare({ run, onDone, onBackdrop }: { run: number; onDone: () => void; onBackdrop: (b: BackdropState) => void }) {
    const [unlocked, setUnlocked] = useState(false);
    const phaseA = usePhases(S8A, run);
    const phaseB = usePhases(S8B, run, unlocked);
    const phase: P8 = unlocked ? phaseB : phaseA;
    const { at, line, centred } = beat(O8, phase);
    const [more, setMore] = useState(false);
    useEffect(() => {
        if (phase === "done") onDone();
        onBackdrop({ dim: true, focus: null });
    }, [phase, onDone, onBackdrop]);

    const asking = phase === "ask";
    // which step of the arithmetic the panel shows
    const step = at("l5s") ? 5 : at("l4s") ? 4 : at("l3s") ? 3 : at("l2s") ? 2 : at("l1s") ? 1 : 0;
    return (
        <motion.div className={s.scene} exit={{ opacity: 0, scale: 0.94, filter: "blur(10px)", transition: { duration: 1, ease: EASE } }}>
            <motion.div className={s.shareStage} animate={centred || more ? SOFT : SHARP} transition={{ duration: 0.9, ease: "easeInOut" }}>
                {/* the building steps aside while the cost sheet is up (kept mounted, so it does not rebuild) */}
                {step > 0 && (
                    <motion.div
                        className={s.buildingWrap}
                        initial={false}
                        animate={step === 2 ? { height: 0, opacity: 0 } : { height: "auto", opacity: 1 }}
                        transition={{ duration: 0.8, ease: EASE }}
                    >
                        <UnitBuilding highlight={step >= 4} partners={step >= 5} sanad={at("l6s")} />
                    </motion.div>
                )}

                <div className={s.calc}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            className={s.calcStep}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.5, ease: EASE }}
                        >
                            {step === 1 && (
                                <>
                                    <span className={s.calcLabel}>المساحة السكنية المتوقعة بعد الترخيص</span>
                                    <strong className={s.calcBig}>≈ {fmt(SHARE.area)} م²</strong>
                                </>
                            )}
                            {step === 2 && <CostSheet />}
                            {step === 3 && (
                                <span className={s.calcEq}>
                                    {fmt(SHARE.cost)} <i>÷</i> {fmt(SHARE.area)} م² <i>=</i> <b>{SHARE.cost / SHARE.area}</b> <small>للمتر</small>
                                </span>
                            )}
                            {step === 4 && (
                                <span className={s.calcEq}>
                                    وحدة {SHARE.unit} م² <i>×</i> {SHARE.cost / SHARE.area} <i>=</i> <b>{SHARE.unit * (SHARE.cost / SHARE.area)}</b> <small>نصيبها</small>
                                </span>
                            )}
                            {step === 5 && (
                                <span className={s.calcLegend}>
                                    <span>
                                        <i className={s.unitPartner} /> {SHARE.partners} وحدات · الشركاء
                                    </span>
                                    <AnimatePresence>
                                        {at("l6s") && (
                                            <motion.span initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                                                <i className={s.unitSanad} /> {SHARE.units - SHARE.partners} وحدة · سند
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </span>
                            )}
                        </motion.div>
                    </AnimatePresence>
                    {step > 0 && <span className={s.calcNote}>* أرقام رمزية للتوضيح</span>}
                </div>
            </motion.div>

            <Caption id={line} text={line ? LINES8[line] : null} centred={centred} />

            <AnimatePresence>
                {asking && (
                    <motion.div className={s.ask} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.6, ease: EASE }}>
                        <div className={s.askActions}>
                            <button className={s.btnGold} onClick={() => setUnlocked(true)}>
                                كمّل
                            </button>
                            <button className={s.btn} onClick={() => setMore(true)}>
                                اشرحلي أكتر
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>{more && <ShareMore onClose={() => setMore(false)} />}</AnimatePresence>
        </motion.div>
    );
}

/* ================= Chapter 3: حقّ المرحلة ================= */

/* ---------------- Scene 9: each completed milestone lowers the risk and raises the entry price ---------------- */

/** Symbolic per-metre entry prices (same scale as chapter 2: the first stage cost 2 per metre). */
const STAGE_PRICE = { first: 2, now: 2.5 };
/** The project's milestones, in order. `done` is how far the project has got by this scene. */
const MILESTONES = ["العقد الابتدائي", "نقل الملكية", "القرار الوزاري", "التراخيص", "البناء", "التسليم"];

const O9 = ["start", "l1c", "l1s", "l2c", "l2s", "l3c", "l3s", "l4c", "l4s", "l5c", "l5s", "l6c", "l6s", "ask", "out", "done"] as const;
type P9 = (typeof O9)[number];
const S9A: [number, P9][] = [
    [0, "start"],
    [500, "l1c"],
    [2300, "l1s"], // the milestone track: ownership transferred, decree applied for
    [6000, "l2c"],
    [7800, "l2s"], // the risk bar shrinks
    [11200, "l3c"],
    [13000, "l3s"], // the entry price steps up
    [16600, "l4c"],
    [18400, "l4s"],
    [21400, "l5c"],
    [23200, "l5s"], // the difference is named: حقّ المرحلة
    [27000, "l6c"],
    [28800, "l6s"], // Sanad sells 5 of its units at the stage price
    [33600, "ask"],
];
const S9B: [number, P9][] = [
    [0, "out"],
    [800, "done"],
];
const LINES9: Record<string, string> = {
    l1: "بعد فترة… سند *نقلت *الملكية وقدّمت على *القرار *الوزاري.",
    l2: "ومع كل مرحلة بتخلص… *المخاطرة بتقلّ.",
    l3: "فاللي بيدخل دلوقتي… بيدخل *بسعر *المرحلة *الجديدة.",
    l4: "ليه؟ لأنه دخل بعد ما *المخاطرة *قلّت.",
    l5: "والفرق ده هو *حقّ *المرحلة… لصاحب الوحدة اللي موّلها بدري.",
    l6: "وسند باعت *5 *وحدات من وحداتها… بسعر المرحلة.",
};

/**
 * The milestone track: done milestones are ticked, the current one pulses. The `big` variant is the
 * film's key moment: larger, and its fill runs exactly to the last ticked milestone as they complete.
 */
function MilestoneTrack({ done, current, big = false }: { done: number; current: number; big?: boolean }) {
    const n = MILESTONES.length;
    const fill = big ? Math.max(0, done - 1) / (n - 1) : (current + 0.5) / n;
    const finished = done >= n;
    return (
        <div className={cx(s.track, big && s.trackBig)}>
            <motion.i className={s.trackLine} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.2, ease: EASE }} />
            <motion.i
                className={s.trackFill}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: fill }}
                transition={big ? { duration: 0.9, ease: EASE } : { duration: 1.6, ease: EASE, delay: 0.8 }}
            />
            {MILESTONES.map((m, i) => (
                <motion.div
                    key={m}
                    className={cx(s.trackNode, i < done && s.trackDone, i === current && !finished && s.trackNow, big && finished && i === n - 1 && s.trackFinal)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.3 + i * 0.15 }}
                >
                    <span className={s.trackDot}>
                        {i < done ? (
                            <motion.b key="tick" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 420, damping: 15 }}>
                                ✓
                            </motion.b>
                        ) : (
                            ""
                        )}
                        {/* handover reached: a wave of light from the last milestone */}
                        {big && finished && i === n - 1 && (
                            <motion.i className={s.trackWave} animate={{ scale: [1, 3.2], opacity: [0.9, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }} />
                        )}
                    </span>
                    <span className={s.trackName}>{m}</span>
                </motion.div>
            ))}
        </div>
    );
}

function StageMore({ onClose }: { onClose: () => void }) {
    return (
        <motion.div className={s.more} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.div
                className={s.moreSheet}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.45, ease: EASE }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-label="حق المرحلة يعني إيه"
            >
                <h3>حقّ المرحلة يعني إيه؟</h3>
                <p>كل ما المشروع يعدّي مرحلة موثقة، زي نقل الملكية أو القرار الوزاري أو الترخيص، المخاطرة بتقل وقيمة الدخول بتزيد.</p>
                <ol>
                    <li>
                        <strong>اللي بيدخل بدري</strong>
                        <span>بيدفع تكلفة أقل لأنه شايل مخاطرة أكبر.</span>
                    </li>
                    <li>
                        <strong>اللي بيدخل بعد كده</strong>
                        <span>بيدفع سعر المرحلة، لأنه داخل على حاجة اتحققت واتوثقت.</span>
                    </li>
                    <li>
                        <strong>الفرق بيروح لمين؟</strong>
                        <span>لصاحب الوحدة اللي موّلها بدري وشال المخاطرة، سواء كان سند أو أي شريك.</span>
                    </li>
                    <li>
                        <strong>البيع بيتسجل عند سند</strong>
                        <span>أي شريك يقدر يبيع وحدته، بس النقل بيمر على سند عشان يبقى معروف المالك الجديد والتزاماته في المراحل الجاية.</span>
                    </li>
                </ol>
                <p>الأرقام في الفيلم رمزية للتوضيح بس.</p>
                <button className={s.btn} onClick={onClose}>
                    رجوع للفيلم
                </button>
            </motion.div>
        </motion.div>
    );
}

function SceneStageRight({ run, onDone, onBackdrop }: { run: number; onDone: () => void; onBackdrop: (b: BackdropState) => void }) {
    const [unlocked, setUnlocked] = useState(false);
    const phaseA = usePhases(S9A, run);
    const phaseB = usePhases(S9B, run, unlocked);
    const phase: P9 = unlocked ? phaseB : phaseA;
    const { at, line, centred } = beat(O9, phase);
    const [more, setMore] = useState(false);
    useEffect(() => {
        if (phase === "done") onDone();
        onBackdrop({ dim: true, focus: null });
    }, [phase, onDone, onBackdrop]);

    const asking = phase === "ask";
    const selling = at("l6s");
    const max = STAGE_PRICE.now;
    return (
        <motion.div className={s.scene} exit={{ opacity: 0, scale: 0.94, filter: "blur(10px)", transition: { duration: 1, ease: EASE } }}>
            <motion.div className={s.stageRight} animate={centred || more ? SOFT : SHARP} transition={{ duration: 0.9, ease: "easeInOut" }}>
                {at("l1s") && <MilestoneTrack done={2} current={2} />}

                <AnimatePresence mode="wait">
                    {at("l2s") && !selling && (
                        <motion.div key="why" className={s.stageWhy} exit={{ opacity: 0, y: -10, transition: { duration: 0.5 } }}>
                            {/* the risk, shrinking as milestones are completed */}
                            <motion.div className={s.risk} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
                                <span className={s.riskLabel}>المخاطرة</span>
                                <span className={s.riskTrack}>
                                    <motion.i initial={{ width: "100%" }} animate={{ width: "48%" }} transition={{ duration: 2.2, ease: EASE, delay: 0.6 }} />
                                </span>
                                <span className={s.riskEnds}>
                                    <small>بداية المشروع</small>
                                    <small>دلوقتي</small>
                                </span>
                            </motion.div>

                            {/* the entry price, one bar per stage; the top of the second bar is the stage right */}
                            {at("l3s") && (
                                <motion.div className={s.prices} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
                                    {[
                                        { label: "دخول المرحلة الأولى", v: STAGE_PRICE.first },
                                        { label: "دخول المرحلة الحالية", v: STAGE_PRICE.now },
                                    ].map((b, i) => (
                                        <div key={b.label} className={s.priceCol}>
                                            <b className={s.priceValue}>
                                                {b.v} <small>للمتر</small>
                                            </b>
                                            <div className={s.priceBarBox}>
                                                <motion.div
                                                    className={s.priceBar}
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${(b.v / max) * 100}%` }}
                                                    transition={{ duration: 1, ease: EASE, delay: 0.3 + i * 0.5 }}
                                                >
                                                    {i === 1 && (
                                                        <motion.i
                                                            className={cx(s.priceRight, at("l5s") && s.priceRightOn)}
                                                            style={{ height: `${((STAGE_PRICE.now - STAGE_PRICE.first) / STAGE_PRICE.now) * 100}%` }}
                                                        />
                                                    )}
                                                </motion.div>
                                                {i === 1 && at("l5s") && (
                                                    <motion.span
                                                        className={s.priceRightTag}
                                                        style={{ bottom: `${(STAGE_PRICE.first / max) * 100}%`, height: `${((STAGE_PRICE.now - STAGE_PRICE.first) / max) * 100}%` }}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ duration: 0.6, ease: EASE, delay: 0.4 }}
                                                    >
                                                        حقّ المرحلة · {STAGE_PRICE.now - STAGE_PRICE.first}
                                                    </motion.span>
                                                )}
                                            </div>
                                            <span className={s.priceLabel}>{b.label}</span>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {selling && (
                        <motion.div key="sell" className={s.stageSell} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
                            <UnitBuilding highlight partners sanad resold />
                            <span className={s.calcLegend}>
                                <span>
                                    <i className={s.unitPartner} /> الشركاء الأوائل
                                </span>
                                <span>
                                    <i className={s.unitResold} /> بيعت بسعر المرحلة
                                </span>
                                <span>
                                    <i className={s.unitSanad} /> سند
                                </span>
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
                {at("l3s") && <span className={s.calcNote}>* أرقام رمزية للتوضيح</span>}
            </motion.div>

            <Caption id={line} text={line ? LINES9[line] : null} centred={centred} />

            <AnimatePresence>
                {asking && (
                    <motion.div className={s.ask} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.6, ease: EASE }}>
                        <div className={s.askActions}>
                            <button className={s.btnGold} onClick={() => setUnlocked(true)}>
                                كمّل
                            </button>
                            <button className={s.btn} onClick={() => setMore(true)}>
                                اشرحلي أكتر
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>{more && <StageMore onClose={() => setMore(false)} />}</AnimatePresence>
        </motion.div>
    );
}

/* ---------------- Scene 10: the licences, the consultant's bill of quantities and schedule ---------------- */

/** Symbolic cost per metre of the first construction phase (same scale as the stage prices). */
const BUILD1 = 1;
/** The construction phases on the consultant's schedule (months are an illustrative example). */
const BUILD_PHASES = [
    { t: "الحفر والأساسات", from: 0, len: 4 },
    { t: "الهيكل الخرساني", from: 3, len: 7 },
    { t: "المباني", from: 9, len: 5 },
    { t: "الكهرباء والسباكة", from: 12, len: 5 },
    { t: "التشطيبات", from: 15, len: 7 },
    { t: "التسليم", from: 22, len: 2 },
];
const MONTHS = 24;

const O10 = ["start", "l1c", "l1s", "l2c", "l2s", "l3c", "l3s", "l4c", "l4s", "l5c", "l5s", "out", "done"] as const;
type P10 = (typeof O10)[number];
const S10: [number, P10][] = [
    [0, "start"],
    [500, "l1c"],
    [2300, "l1s"], // the decree and the licences are ticked off
    [5800, "l2c"],
    [7600, "l2s"], // the consultant's sheet appears
    [10600, "l3c"],
    [12400, "l3s"], // the schedule draws itself
    [16600, "l4c"],
    [18400, "l4s"], // the first construction phase, and its cost per metre
    [22000, "l5c"],
    [23800, "l5s"], // each owner pays for their own metres
    [28000, "out"],
    [28700, "done"],
];
const LINES10: Record<string, string> = {
    l1: "وطلع *القرار *الوزاري… *والتراخيص.",
    l2: "واتعاقدنا مع *مكتب *استشاري *معتمد…",
    l3: "عمل *المقايسة… *وخطة *زمنية لكل مرحلة.",
    l4: "أول مرحلة بناء… تكلفتها *1 للمتر.",
    l5: "وكل مالك بيدفع على قد *أمتاره.",
};

/** The consultant's sheet: a Gantt chart of the construction phases, drawn bar by bar. */
function BuildSchedule({ drawn, focus, owner }: { drawn: boolean; focus: boolean; owner: boolean }) {
    return (
        <motion.div className={s.boq} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}>
            <div className={s.boqHead}>
                <span>
                    <small>مكتب استشاري معتمد</small>
                    <strong>المقايسة والخطة الزمنية</strong>
                </span>
                <i className={s.boqSeal} aria-hidden>
                    ✓
                </i>
            </div>
            <div className={s.gantt}>
                {/* the time axis, in quarters */}
                <div className={s.ganttAxis}>
                    {Array.from({ length: MONTHS / 3 + 1 }, (_, q) => (
                        <span key={q} style={{ insetInlineStart: `${((q * 3) / MONTHS) * 100}%` }}>
                            {q * 3 || ""}
                        </span>
                    ))}
                </div>
                {BUILD_PHASES.map((p, i) => (
                    <div key={p.t} className={cx(s.ganttRow, focus && i > 0 && s.ganttRowDim)}>
                        <span className={s.ganttName}>{p.t}</span>
                        <span className={s.ganttLane}>
                            <motion.i
                                className={cx(s.ganttBar, focus && i === 0 && s.ganttBarOn)}
                                style={{ insetInlineStart: `${(p.from / MONTHS) * 100}%`, width: `${(p.len / MONTHS) * 100}%` }}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: drawn ? 1 : 0 }}
                                transition={{ duration: 0.7, ease: EASE, delay: drawn ? 0.2 + i * 0.35 : 0 }}
                            />
                            {focus && i === 0 && (
                                <motion.b
                                    className={s.ganttCost}
                                    style={{ insetInlineStart: `${((p.from + p.len) / MONTHS) * 100}%` }}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.6, ease: EASE, delay: 0.4 }}
                                >
                                    {BUILD1} للمتر
                                </motion.b>
                            )}
                        </span>
                    </div>
                ))}
                <span className={s.ganttFoot}>
                    <span>* أرقام ومدد رمزية للتوضيح</span>
                    <span>شهر</span>
                </span>
            </div>
            <AnimatePresence>
                {owner && (
                    <motion.div className={s.boqOwner} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.6, ease: EASE }}>
                        <span className={s.calcEq}>
                            وحدة {SHARE.unit} م² <i>×</i> {BUILD1} <i>=</i> <b>{SHARE.unit * BUILD1}</b> <small>نصيبها في المرحلة</small>
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function SceneBuild({ run, onDone, onBackdrop }: { run: number; onDone: () => void; onBackdrop: (b: BackdropState) => void }) {
    const phase = usePhases(S10, run);
    const { at, line, centred } = beat(O10, phase);
    useEffect(() => {
        if (phase === "done") onDone();
        onBackdrop({ dim: true, focus: null });
    }, [phase, onDone, onBackdrop]);

    return (
        <motion.div className={s.scene} exit={{ opacity: 0, scale: 0.94, filter: "blur(10px)", transition: { duration: 1, ease: EASE } }}>
            <motion.div className={s.stageRight} animate={centred ? SOFT : SHARP} transition={{ duration: 0.9, ease: "easeInOut" }}>
                {at("l1s") && <MilestoneTrack done={4} current={4} />}
                {at("l2s") && <BuildSchedule drawn={at("l3s")} focus={at("l4s")} owner={at("l5s")} />}
            </motion.div>
            <Caption id={line} text={line ? LINES10[line] : null} centred={centred} />
        </motion.div>
    );
}

/* ---------------- Scene 11: what a metre has cost each owner so far, and the next stage's price ---------------- */

/** The price of a unit bought now: it already carries the land, the licences and the first build phase. */
const PRICE_NOW = 4;
type Seg = { k: "base" | "right" | "build"; v: number };
const OWNERS: { who: string; segs: Seg[] }[] = [
    { who: "شريك المرحلة الأولى", segs: [{ k: "base", v: STAGE_PRICE.first }, { k: "build", v: BUILD1 }] },
    { who: "شريك المرحلة التانية", segs: [{ k: "base", v: STAGE_PRICE.first }, { k: "right", v: STAGE_PRICE.now - STAGE_PRICE.first }, { k: "build", v: BUILD1 }] },
    { who: "اللي داخل دلوقتي", segs: [{ k: "base", v: STAGE_PRICE.first }, { k: "build", v: BUILD1 }, { k: "right", v: PRICE_NOW - STAGE_PRICE.first - BUILD1 }] },
];
const SEG_NAMES = { base: "الأرض والتراخيص", build: "أول مرحلة بناء", right: "حقّ المرحلة" };
const total = (segs: Seg[]) => segs.reduce((t, x) => t + x.v, 0);

const O11 = ["start", "l1c", "l1s", "l2c", "l2s", "l3c", "l3s", "l4c", "l4s", "ask", "out", "done"] as const;
type P11 = (typeof O11)[number];
const S11A: [number, P11][] = [
    [0, "start"],
    [500, "l1c"],
    [2300, "l1s"], // two owners' metres, built up stage by stage
    [7600, "l2c"],
    [9400, "l2s"], // the newcomer's bar
    [13400, "l3c"],
    [15200, "l3s"],
    [19000, "l4c"],
    [20800, "l4s"], // «and so on, until handover»: the track runs to the end
    [25000, "ask"],
];
const S11B: [number, P11][] = [
    [0, "out"],
    [800, "done"],
];
const LINES11: Record<string, string> = {
    l1: "يبقى المتر لحد دلوقتي كلّف…",
    l2: "واللي داخل *دلوقتي؟",
    l3: "سعر المرحلة *4… لأنه داخل على مشروع *مرخّص *وبيتبني.",
    l4: "وهكذا… مرحلة ورا مرحلة لحد *التسليم.",
};

/** `focus`: light only the shared cost ("cost": land, licences, building) or only the stage rights ("right"). */
function CostBars({ count, focus = null }: { count: number; focus?: "cost" | "right" | null }) {
    const max = PRICE_NOW;
    return (
        <div className={s.costBars}>
            {OWNERS.slice(0, count).map((o, oi) => (
                <motion.div key={o.who} className={s.costBarCol} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
                    <motion.b className={s.priceValue} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + o.segs.length * 0.5 }}>
                        {total(o.segs)} <small>للمتر</small>
                    </motion.b>
                    <div className={s.stackBox}>
                        <div className={s.stack} style={{ height: `${(total(o.segs) / max) * 100}%` }}>
                            {o.segs.map((g, gi) => (
                                <motion.i
                                    key={gi}
                                    className={cx(
                                        s.seg,
                                        g.k === "base" && s.segBase,
                                        g.k === "build" && s.segBuild,
                                        g.k === "right" && s.segRight,
                                        focus && (focus === "right") !== (g.k === "right") && s.segDim,
                                        focus && (focus === "right") === (g.k === "right") && s.segLit
                                    )}
                                    style={{ flexGrow: g.v }}
                                    initial={{ scaleY: 0 }}
                                    animate={{ scaleY: 1 }}
                                    transition={{ duration: 0.6, ease: EASE, delay: 0.2 + gi * 0.5 + (oi === 2 ? 0 : 0) }}
                                >
                                    <span>{g.v}</span>
                                </motion.i>
                            ))}
                        </div>
                    </div>
                    <span className={s.priceLabel}>{o.who}</span>
                </motion.div>
            ))}
        </div>
    );
}

function BuildMore({ onClose }: { onClose: () => void }) {
    return (
        <motion.div className={s.more} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.div
                className={s.moreSheet}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.45, ease: EASE }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-label="فلوسك بتروح فين في كل مرحلة"
            >
                <h3>فلوسك بتروح فين في كل مرحلة؟</h3>
                <ol>
                    <li>
                        <strong>مقايسة من مكتب استشاري معتمد</strong>
                        <span>كل مرحلة بناء ليها مقايسة وتكلفة وخطة زمنية واضحة قبل ما تبدأ.</span>
                    </li>
                    <li>
                        <strong>كل مالك بيدفع على قد أمتاره</strong>
                        <span>تكلفة المرحلة بتتقسم على الأمتار، فكل مالك بيدفع نصيب وحدته بالظبط.</span>
                    </li>
                    <li>
                        <strong>بتدفع لمرحلة تقدر تتأكد إنها اتنفذت</strong>
                        <span>الفلوس بتتطلب للمرحلة اللي عليها الدور، وإنت شايف المراحل اللي قبلها خلصت.</span>
                    </li>
                    <li>
                        <strong>سعر الدخول بيعكس اللي اتحقق</strong>
                        <span>اللي بيدخل متأخر بيدفع تكلفة اللي اتنفذ، زائد حق المرحلة لصاحب الوحدة اللي موّلها بدري.</span>
                    </li>
                </ol>
                <p>الأرقام والمدد في الفيلم رمزية للتوضيح بس.</p>
                <button className={s.btn} onClick={onClose}>
                    رجوع للفيلم
                </button>
            </motion.div>
        </motion.div>
    );
}

function SceneSoFar({ run, onDone, onBackdrop }: { run: number; onDone: () => void; onBackdrop: (b: BackdropState) => void }) {
    const [unlocked, setUnlocked] = useState(false);
    const phaseA = usePhases(S11A, run);
    const phaseB = usePhases(S11B, run, unlocked);
    const phase: P11 = unlocked ? phaseB : phaseA;
    const { at, line, centred } = beat(O11, phase);
    const [more, setMore] = useState(false);
    useEffect(() => {
        if (phase === "done") onDone();
        onBackdrop({ dim: true, focus: null });
    }, [phase, onDone, onBackdrop]);

    const asking = phase === "ask";
    const toEnd = at("l4s");
    // «مرحلة ورا مرحلة»: building, then handover, tick off in front of the viewer
    const [reached, setReached] = useState(4);
    useEffect(() => {
        if (!toEnd) return;
        const ids = [window.setTimeout(() => setReached(5), 1300), window.setTimeout(() => setReached(6), 2800)];
        return () => ids.forEach(clearTimeout);
    }, [toEnd]);
    return (
        <motion.div className={s.scene} exit={{ opacity: 0, scale: 0.94, filter: "blur(10px)", transition: { duration: 1, ease: EASE } }}>
            <motion.div className={s.stageRight} animate={centred || more ? SOFT : SHARP} transition={{ duration: 0.9, ease: "easeInOut" }}>
                {toEnd ? null : (
                    at("l1s") && (
                        <>
                            <CostBars count={at("l2s") ? 3 : 2} />
                            <span className={s.calcLegend}>
                                {(Object.keys(SEG_NAMES) as (keyof typeof SEG_NAMES)[]).map((k) => (
                                    <span key={k}>
                                        <i className={cx(k === "base" && s.segBase, k === "build" && s.segBuild, k === "right" && s.segRight)} /> {SEG_NAMES[k]}
                                    </span>
                                ))}
                            </span>
                            <span className={s.calcNote}>* أرقام رمزية للتوضيح</span>
                        </>
                    )
                )}
            </motion.div>

            {/* the key moment of the film: the full track, large and centred, completing stage by stage */}
            <AnimatePresence>
                {toEnd && (
                    <motion.div
                        className={s.finale}
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={centred ? { opacity: 0.7, scale: 1, filter: "blur(6px)" } : { opacity: 1, scale: 1, filter: "blur(0px)" }}
                        transition={{ duration: 0.9, ease: EASE }}
                    >
                        <MilestoneTrack big done={reached} current={Math.min(reached, MILESTONES.length - 1)} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* the closing line stays up, larger than the rest, through the pause */}
            <Caption id={asking ? "l4" : line} text={asking ? LINES11.l4 : line ? LINES11[line] : null} centred={centred} strong={line === "l4" || asking} />

            <AnimatePresence>
                {asking && (
                    <motion.div className={s.ask} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.6, ease: EASE }}>
                        <div className={s.askActions}>
                            <button className={s.btnGold} onClick={() => setUnlocked(true)}>
                                كمّل
                            </button>
                            <button className={s.btn} onClick={() => setMore(true)}>
                                اشرحلي أكتر
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>{more && <BuildMore onClose={() => setMore(false)} />}</AnimatePresence>
        </motion.div>
    );
}

/* ================= Chapter 5: comparing fairly, and who guarantees quality ================= */

/* ---------------- Scene 12: a price per metre alone vs a price per metre with Sanad ---------------- */

const O12 = ["start", "l1c", "l1s", "l2c", "l2s", "l3c", "l3s", "l4c", "l4s", "out", "done"] as const;
type P12 = (typeof O12)[number];
const S12: [number, P12][] = [
    [0, "start"],
    [500, "l1c"],
    [2300, "l1s"], // the two boxes
    [5800, "l2c"],
    [7600, "l2s"],
    [10800, "l3c"],
    [12600, "l3s"], // Sanad's box opens: where each part of the price went
    [16800, "l4c"],
    [18600, "l4s"], // the completed stages are ticked, the next ones are open to see
    [23800, "out"],
    [24500, "done"],
];
const LINES12: Record<string, string> = {
    l1: "ممكن تقارن سعر المتر عندنا… *بوحدات *تانية.",
    l2: "بس المقارنة دي مش *عادلة… لا لينا ولا لغيرنا.",
    l3: "لأن هنا… إنت *عارف *فلوسك *راحت *فين.",
    l4: "وبتدفع لمرحلة *واضحة… تقدر *تتأكد إنها اتنفذت.",
};
/** What Sanad's price per metre is made of, in order; `done` parts are already carried out. */
const OPEN_PARTS = [
    { t: "الأرض والتراخيص", done: true },
    { t: "أول مرحلة بناء", done: true },
    { t: "مراحل البناء الجاية", done: false },
    { t: "أتعاب إدارة سند", done: true },
];

function SceneCompare({ run, onDone, onBackdrop }: { run: number; onDone: () => void; onBackdrop: (b: BackdropState) => void }) {
    const phase = usePhases(S12, run);
    const { at, line, centred } = beat(O12, phase);
    useEffect(() => {
        if (phase === "done") onDone();
        onBackdrop({ dim: true, focus: null });
    }, [phase, onDone, onBackdrop]);

    const open = at("l3s");
    const ticked = at("l4s");
    return (
        <motion.div className={s.scene} exit={{ opacity: 0, scale: 0.94, filter: "blur(10px)", transition: { duration: 1, ease: EASE } }}>
            <motion.div className={s.compare} animate={centred ? SOFT : SHARP} transition={{ duration: 0.9, ease: "easeInOut" }}>
                {at("l1s") && (
                    <>
                        {/* a price per metre on its own: one number, nothing behind it to see */}
                        <motion.div className={cx(s.box, s.boxClosed)} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}>
                            <span className={s.boxTitle}>سعر المتر لوحده</span>
                            <div className={s.boxBody}>
                                <motion.b className={s.boxQ} animate={open ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.85 }} transition={open ? { duration: 2, repeat: Infinity } : {}}>
                                    ؟
                                </motion.b>
                            </div>
                            <span className={s.boxFoot}>رقم واحد… من غير تفاصيل</span>
                        </motion.div>

                        {/* Sanad's price per metre: the same kind of number, but you can see inside it */}
                        <motion.div className={cx(s.box, s.boxOpen, open && s.boxOpened)} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}>
                            <span className={s.boxTitle}>سعر المتر مع سند</span>
                            <div className={s.boxBody}>
                                <AnimatePresence mode="wait">
                                    {!open ? (
                                        <motion.b key="q" className={s.boxQ} exit={{ opacity: 0, scale: 0.6 }}>
                                            ؟
                                        </motion.b>
                                    ) : (
                                        <motion.ul key="parts" className={s.boxParts}>
                                            {OPEN_PARTS.map((p, i) => (
                                                <motion.li
                                                    key={p.t}
                                                    className={cx(ticked && p.done && s.partDone, ticked && !p.done && s.partNext)}
                                                    initial={{ opacity: 0, x: 18 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ duration: 0.5, ease: EASE, delay: 0.2 + i * 0.35 }}
                                                >
                                                    <span>{p.t}</span>
                                                    <i>{ticked ? (p.done ? "✓" : "◷") : ""}</i>
                                                </motion.li>
                                            ))}
                                        </motion.ul>
                                    )}
                                </AnimatePresence>
                            </div>
                            <span className={s.boxFoot}>{ticked ? "اللي اتنفذ قدامك… واللي جاي واضح" : "كل جزء معروف"}</span>
                        </motion.div>
                    </>
                )}
            </motion.div>
            <Caption id={line} text={line ? LINES12[line] : null} centred={centred} />
        </motion.div>
    );
}

/* ---------------- Scene 13: who guarantees the quality ---------------- */

/** The viewer's fair questions about quality. */
const QUALITY_QS = ["مواد البناء؟", "التشطيب؟", "البنية التحتية؟", "الفريق اللي هينفّذ؟"];
/** Line icons (24 × 24): a consultant's seal, a contractor's helmet, Sanad as an owner (a key). */
const GUARANTEES = [
    { t: "مكتب استشاري معتمد", d: "بيراجع كل مرحلة قبل الدفع للي بعدها", icon: "M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM9 14l-2 7 5-3 5 3-2-7" },
    { t: "مقاول بسابقة أعمال قوية", d: "مشاريع منفّذة تقدر تشوفها", icon: "M4 17h16M5 17a7 7 0 0 1 14 0M12 10V6M9 10.5 8 7M15 10.5 16 7" },
    { t: "سند… مصلحتها من مصلحتك", d: "عندها وحدات في نفس العمارة", icon: "M8 14a4 4 0 1 1 3.5-6M11.5 8H21M18 8v3M15 8v2" },
];
/** Sanad's price for a metre at this stage (same symbolic scale as before). */
const SANAD_SELL = 6;

const O13 = ["start", "l1c", "l1s", "l2c", "l2s", "l3c", "l3s", "l4c", "l4s", "l5c", "l5s", "l6c", "l6s", "l7c", "l7s", "ask", "out", "done"] as const;
type P13 = (typeof O13)[number];
const S13A: [number, P13][] = [
    [0, "start"],
    [500, "l1c"],
    [2300, "l1s"], // the questions
    [5600, "l2c"],
    [7400, "l2s"], // the questions step back; the guarantees row appears empty
    [9600, "l3c"],
    [11400, "l3s"], // 1: the consultant
    [14200, "l4c"],
    [16000, "l4s"], // 2: the contractor
    [18800, "l5c"],
    [20600, "l5s"], // 3: Sanad, an owner like you
    [23800, "l6c"],
    [25600, "l6s"], // the building: Sanad's own units light up
    [29600, "l7c"],
    [31400, "l7s"], // the price Sanad sells at tells you what your unit is worth
    [36000, "ask"],
];
const S13B: [number, P13][] = [
    [0, "out"],
    [800, "done"],
];
const LINES13: Record<string, string> = {
    l1: "طيب… *والجودة؟",
    l2: "مين *يضمن ده؟",
    l3: "*مكتب *استشاري *معتمد… بيراجع كل مرحلة.",
    l4: "*ومقاول بسابقة *أعمال *قوية.",
    l5: "*وسند نفسها… *مصلحتها *من *مصلحتك.",
    l6: "عندها وحدات عايزة تبيعها *بأحسن *سعر… فلازم تطلع *بأحسن *شكل.",
    l7: "ولو سند باعت المتر *بـ6… إنت كمان تعرف *قيمة *وحدتك.",
};

function QualityMore({ onClose }: { onClose: () => void }) {
    return (
        <motion.div className={s.more} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.div
                className={s.moreSheet}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.45, ease: EASE }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-label="الجودة مضمونة إزاي"
            >
                <h3>الجودة مضمونة إزاي؟</h3>
                <ol>
                    {GUARANTEES.map((g) => (
                        <li key={g.t}>
                            <strong>{g.t}</strong>
                            <span>{g.d}</span>
                        </li>
                    ))}
                    <li>
                        <strong>مصلحة واحدة</strong>
                        <span>سند بتبيع من وحداتها في نفس المشروع، فأي جودة أقل بتقلل قيمة وحداتها هي قبل وحداتك.</span>
                    </li>
                </ol>
                <p>الأرقام في الفيلم رمزية للتوضيح بس.</p>
                <button className={s.btn} onClick={onClose}>
                    رجوع للفيلم
                </button>
            </motion.div>
        </motion.div>
    );
}

function SceneQuality({ run, onDone, onBackdrop }: { run: number; onDone: () => void; onBackdrop: (b: BackdropState) => void }) {
    const [unlocked, setUnlocked] = useState(false);
    const phaseA = usePhases(S13A, run);
    const phaseB = usePhases(S13B, run, unlocked);
    const phase: P13 = unlocked ? phaseB : phaseA;
    const { at, line, centred } = beat(O13, phase);
    const [more, setMore] = useState(false);
    useEffect(() => {
        if (phase === "done") onDone();
        onBackdrop({ dim: true, focus: null });
    }, [phase, onDone, onBackdrop]);

    const asking = phase === "ask";
    const shown = at("l5s") ? 3 : at("l4s") ? 2 : at("l3s") ? 1 : 0;
    const building = at("l6s");
    return (
        <motion.div className={s.scene} exit={{ opacity: 0, scale: 0.94, filter: "blur(10px)", transition: { duration: 1, ease: EASE } }}>
            <motion.div className={s.stageRight} animate={centred || more ? SOFT : SHARP} transition={{ duration: 0.9, ease: "easeInOut" }}>
                <AnimatePresence mode="wait">
                    {/* the viewer's questions */}
                    {at("l1s") && !at("l2s") && (
                        <motion.ul key="qs" className={s.questionsCloud} exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.5 } }}>
                            {QUALITY_QS.map((q, i) => (
                                <motion.li key={q} initial={{ opacity: 0, y: 16, rotate: i % 2 ? 3 : -3 }} animate={{ opacity: 1, y: 0, rotate: i % 2 ? 2 : -2 }} transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.2 + i * 0.4 }}>
                                    {q}
                                </motion.li>
                            ))}
                        </motion.ul>
                    )}

                    {/* the three guarantees */}
                    {at("l2s") && !building && (
                        <motion.div key="g" className={s.guarantees} exit={{ opacity: 0, y: -10, transition: { duration: 0.5 } }}>
                            {GUARANTEES.map((g, i) => (
                                <motion.div
                                    key={g.t}
                                    className={cx(s.guarantee, i < shown && s.guaranteeOn)}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, ease: EASE, delay: i * 0.12 }}
                                >
                                    <span className={s.guaranteeIcon}>
                                        <svg viewBox="0 0 24 24" aria-hidden>
                                            {i < shown && <motion.path d={g.icon} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: "easeInOut" }} />}
                                        </svg>
                                    </span>
                                    <strong>{g.t}</strong>
                                    <span>{g.d}</span>
                                    <b className={s.guaranteeNo}>{i + 1}</b>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}

                    {/* Sanad's own units, in the same building as yours */}
                    {building && (
                        <motion.div key="b" className={s.stageSell} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
                            <UnitBuilding highlight partners sanad resold glowSanad />
                            <span className={s.calcLegend}>
                                <span>
                                    <i className={s.unitSanad} /> وحدات سند
                                </span>
                                <span>
                                    <i className={s.unitPartner} /> وحدات الشركاء
                                </span>
                                <span>
                                    <i className={s.unitResold} /> بيعت بسعر المرحلة
                                </span>
                            </span>
                            <AnimatePresence>
                                {at("l7s") && (
                                    <motion.div className={s.valueTags} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
                                        <span>
                                            سند باعت المتر بـ <b>{SANAD_SELL}</b>
                                        </span>
                                        <i>⟵</i>
                                        <span className={s.valueYours}>
                                            قيمة وحدتك ≈ <b>{SANAD_SELL}</b> للمتر
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>
                {at("l7s") && <span className={s.calcNote}>* أرقام رمزية للتوضيح</span>}
            </motion.div>

            <Caption id={line} text={line ? LINES13[line] : null} centred={centred} />

            <AnimatePresence>
                {asking && (
                    <motion.div className={s.ask} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.6, ease: EASE }}>
                        <div className={s.askActions}>
                            <button className={s.btnGold} onClick={() => setUnlocked(true)}>
                                كمّل
                            </button>
                            <button className={s.btn} onClick={() => setMore(true)}>
                                اشرحلي أكتر
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>{more && <QualityMore onClose={() => setMore(false)} />}</AnimatePresence>
        </motion.div>
    );
}

/* ================= The close ================= */

/* ---------------- Scene 14: the same cost for everyone; the only difference is when you came in ---------------- */

const O14 = ["start", "l1c", "l1s", "l2c", "l2s", "l3c", "l3s", "end"] as const;
type P14 = (typeof O14)[number];
const S14: [number, P14][] = [
    [0, "start"],
    [500, "l1c"],
    [2300, "l1s"], // the three owners' bars return
    [6600, "l2c"],
    [8400, "l2s"], // the shared cost lights up across all three
    [12200, "l3c"],
    [14000, "l3s"], // only the stage rights stay lit: the difference is when each came in
    [19500, "end"], // the end card
];
const LINES14: Record<string, string> = {
    l1: "في الآخر… كل شريك عارف *دفع *إيه… *وليه.",
    l2: "*كلنا دفعنا نفس *التكلفة…",
    l3: "*والفرق *الوحيد… *وقت *الدخول.",
};
const CONTACT_TEXT = "مرحبًا، شُفت فيلم «حق المرحلة» وعايز أعرف أكتر عن الشراكة مع سند.";

function SceneFinale({ run, onBackdrop, onRestart }: { run: number; onBackdrop: (b: BackdropState) => void; onRestart: () => void }) {
    const phase = usePhases(S14, run);
    const { at, line, centred } = beat(O14, phase);
    useEffect(() => {
        onBackdrop({ dim: phase !== "end", focus: null });
    }, [phase, onBackdrop]);

    const ending = phase === "end";
    return (
        <motion.div className={s.scene}>
            <AnimatePresence>
                {!ending && at("l1s") && (
                    <motion.div
                        key="bars"
                        className={s.stageRight}
                        animate={centred ? SOFT : SHARP}
                        exit={{ opacity: 0, scale: 0.94, filter: "blur(10px)", transition: { duration: 0.9, ease: EASE } }}
                        transition={{ duration: 0.9, ease: "easeInOut" }}
                    >
                        <CostBars count={3} focus={at("l3s") ? "right" : at("l2s") ? "cost" : null} />
                        <span className={s.calcLegend}>
                            {(Object.keys(SEG_NAMES) as (keyof typeof SEG_NAMES)[]).map((k) => (
                                <span key={k}>
                                    <i className={cx(k === "base" && s.segBase, k === "build" && s.segBuild, k === "right" && s.segRight)} /> {SEG_NAMES[k]}
                                </span>
                            ))}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {!ending && <Caption id={line} text={line ? LINES14[line] : null} centred={centred} strong={line === "l3"} />}

            {/* the end card */}
            <AnimatePresence>
                {ending && (
                    <motion.div className={s.endCard} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, ease: EASE, delay: 0.6 }}>
                        <span className={s.endTitle}>حقّ المرحلة</span>
                        <motion.i className={s.rule} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.1, ease: EASE, delay: 1.2 }} />
                        <span className={s.endEn}>MilestoneRight</span>
                        <p className={s.endLine}>تكلفة واحدة للكل… والفرق وقت الدخول.</p>
                        <motion.div className={s.endActions} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 1.8 }}>
                            <a className={s.btnGold} href={whatsappUrl(CONTACT_TEXT)} target="_blank" rel="noopener">
                                اتكلم معانا
                            </a>
                            <Link className={s.btn} href="/projects/sanad-zayed/masterplan">
                                شوف مشروع سند زايد
                            </Link>
                        </motion.div>
                        <motion.button className={s.btnText} onClick={onRestart} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4 }}>
                            شوف الفيلم من الأول
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

/* ---------------- background: blueprint grid, architectural drawings in gold hairlines, rising dust ---------------- */

/** Small deterministic RNG so generated details are identical on every visit. */
function rng(seed: number) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

type Placed = {
    id: DrawingId;
    drawing: Drawing;
    x: number;
    y: number;
    k: number;
    rot: number;
    delay: number;
    drift: number;
};

/** Lays the drawings out in the four corners, sized to the screen, keeping the centre free for the words. */
function layout(W: number, H: number): Placed[] {
    const { plot, site, apartment, grid } = DRAWINGS;
    const k = Math.min(1.15, Math.max(0.42, Math.min(W, H) / 760));
    const bar = H * 0.06;
    return [
        {
            id: "plot",
            drawing: plot,
            x: W * 0.03 - 20 * k,
            y: bar + 50,
            k,
            rot: -5,
            delay: 0.3,
            drift: 14,
        },
        {
            id: "site",
            drawing: site,
            x: W - site.w * k * 0.82,
            y: bar + 30,
            k,
            rot: 4,
            delay: 1,
            drift: 17,
        },
        {
            id: "apartment",
            drawing: apartment,
            x: W - apartment.w * k - W * 0.03 + 15 * k,
            y: H - apartment.h * k - bar - 30,
            k,
            rot: -2,
            delay: 1.6,
            drift: 15,
        },
        {
            id: "grid",
            drawing: grid,
            x: -40 * k,
            y: H - grid.h * k - bar - 10,
            k,
            rot: 0,
            delay: 2.2,
            drift: 19,
        },
    ];
}

/**
 * The drawings behind every scene. `dim` pushes them back so a scene's own picture can lead;
 * `focus` keeps one drawing lit (with a soft glow) while the others are dimmed.
 */
function Backdrop({ run, dim = false, focus = null }: { run: number; dim?: boolean; focus?: DrawingId | null }) {
    const [size, setSize] = useState<{ W: number; H: number } | null>(null);
    useEffect(() => {
        const measure = () => setSize({ W: window.innerWidth, H: window.innerHeight });
        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, []);
    const placed = useMemo(() => (size ? layout(size.W, size.H) : []), [size]);
    const dust = useMemo(() => {
        const r = rng(7);
        return Array.from({ length: 26 }, () => ({
            x: r() * 100,
            y: 30 + r() * 70,
            s: 1 + r() * 2.2,
            d: 9 + r() * 10,
            delay: r() * 8,
        }));
    }, []);
    return (
        <div className={s.backdrop} aria-hidden key={run}>
            <motion.div className={s.blueprint} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2.5 }} />
            {size && (
                <svg className={s.drawings} width={size.W} height={size.H}>
                    {placed.map((p, i) => (
                        <g key={i} transform={`translate(${p.x},${p.y}) rotate(${p.rot},${(p.drawing.w * p.k) / 2},${(p.drawing.h * p.k) / 2}) scale(${p.k})`}>
                            <motion.g
                                className={focus === p.id ? s.focused : undefined}
                                animate={{
                                    opacity: focus === p.id ? 1 : dim || focus ? 0.22 : 1,
                                }}
                                transition={{ duration: 1.2, ease: "easeInOut" }}
                            >
                                {/* each drawing floats very slightly, like paper on a table */}
                                <motion.g
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{
                                        duration: p.drift,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                    }}
                                >
                                    <DrawingStrokes drawing={p.drawing} delay={p.delay} />
                                </motion.g>
                            </motion.g>
                        </g>
                    ))}
                </svg>
            )}
            {dust.map((p, i) => (
                <motion.span
                    key={i}
                    className={s.dust}
                    style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s }}
                    animate={{ y: [0, -120], opacity: [0, 0.8, 0] }}
                    transition={{
                        duration: p.d,
                        delay: p.delay,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                />
            ))}
        </div>
    );
}

/* ---------------- review sheet: every drawing in the library (?gallery=1) ---------------- */

export function DrawingGallery() {
    const [run, setRun] = useState(0);
    const items = Object.entries(DRAWINGS);
    return (
        <div className={s.gallery}>
            <div className={s.galleryHead}>
                <h1>مكتبة الرسومات الهندسية</h1>
                <button className={s.btn} onClick={() => setRun((r) => r + 1)}>
                    إعادة الرسم
                </button>
            </div>
            <div className={s.galleryGrid} key={run}>
                {items.map(([id, d], i) => (
                    <figure key={id} className={s.galleryCard}>
                        <svg viewBox={`-40 -30 ${d.w + 80} ${d.h + 60}`}>
                            <DrawingStrokes drawing={d} delay={(i % 4) * 0.25} step={0.18} />
                        </svg>
                        <figcaption>
                            {d.name} <code>{id}</code>
                        </figcaption>
                    </figure>
                ))}
            </div>
        </div>
    );
}

/* ---------------- the film ---------------- */

const SCENES = 15;

export default function MilestoneFilm({ startScene = 0 }: { startScene?: number }) {
    const first = Math.min(Math.max(0, startScene), SCENES - 1);
    const [run, setRun] = useState(0); // restarts the whole film (backdrop included)
    const [sceneRun, setSceneRun] = useState(0); // replays just the current scene
    const [scene, setScene] = useState(first);
    const [ended, setEnded] = useState(false);
    const [backdrop, setBackdrop] = useState<BackdropState>({
        dim: first > 0,
        focus: null,
    });
    // the film waits on its «ابدأ» screen: that press lets the browser play the music with it
    const [started, setStarted] = useState(false);
    useFilmMusic(started);

    const next = useCallback(() => {
        setScene((sc) => {
            if (sc + 1 < SCENES) return sc + 1;
            setEnded(true);
            return sc;
        });
    }, []);
    const replay = () => {
        setEnded(false);
        setSceneRun((r) => r + 1);
    };
    const restart = () => {
        setEnded(false);
        setScene(0);
        setBackdrop({ dim: false, focus: null });
        setRun((r) => r + 1);
    };

    return (
        <div className={s.root}>
            {/* a soft warm light drifting behind everything */}
            <motion.div
                className={s.glow}
                animate={{ x: ["-8%", "6%", "-8%"], y: ["-4%", "5%", "-4%"] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden
            />
            <Backdrop run={run} dim={backdrop.dim} focus={backdrop.focus} />
            <div className={s.vignette} />

            {/* Sanad's mark, in gold, rising into place at the top and staying for the whole film */}
            <motion.div
                key={`logo-${run}`}
                className={s.logo}
                role="img"
                aria-label="سند"
                initial={{ opacity: 0, y: 14, clipPath: "inset(100% 0 0 0)" }}
                animate={{ opacity: 1, y: 0, clipPath: "inset(0% 0 0 0)" }}
                transition={{ duration: 1.4, ease: EASE, delay: 0.2 }}
            />

            <AnimatePresence mode="wait">
                {started && scene === 0 && <SceneOpening key={`s0-${run}-${sceneRun}`} run={run * 1000 + sceneRun} onDone={next} />}
                {started && scene === 1 && <ScenePeople key={`s1-${run}-${sceneRun}`} run={run * 1000 + sceneRun} onDone={next} onBackdrop={setBackdrop} />}
                {started && scene === 2 && <SceneRequest key={`s2-${run}-${sceneRun}`} run={run * 1000 + sceneRun} onDone={next} onBackdrop={setBackdrop} />}
                {started && scene === 3 && <SceneResearch key={`s3-${run}-${sceneRun}`} run={run * 1000 + sceneRun} onDone={next} onBackdrop={setBackdrop} />}
                {started && scene === 4 && <SceneZayed key={`s4-${run}-${sceneRun}`} run={run * 1000 + sceneRun} onDone={next} onBackdrop={setBackdrop} />}
                {started && scene === 5 && <SceneApproval key={`s5-${run}-${sceneRun}`} run={run * 1000 + sceneRun} onDone={next} onBackdrop={setBackdrop} />}
                {started && scene === 6 && <ScenePlot key={`s6-${run}-${sceneRun}`} run={run * 1000 + sceneRun} onDone={next} onBackdrop={setBackdrop} />}
                {started && scene === 7 && <SceneDeposit key={`s7-${run}-${sceneRun}`} run={run * 1000 + sceneRun} onDone={next} onBackdrop={setBackdrop} />}
                {started && scene === 8 && <SceneShare key={`s8-${run}-${sceneRun}`} run={run * 1000 + sceneRun} onDone={next} onBackdrop={setBackdrop} />}
                {started && scene === 9 && <SceneStageRight key={`s9-${run}-${sceneRun}`} run={run * 1000 + sceneRun} onDone={next} onBackdrop={setBackdrop} />}
                {started && scene === 10 && <SceneBuild key={`s10-${run}-${sceneRun}`} run={run * 1000 + sceneRun} onDone={next} onBackdrop={setBackdrop} />}
                {started && scene === 11 && <SceneSoFar key={`s11-${run}-${sceneRun}`} run={run * 1000 + sceneRun} onDone={next} onBackdrop={setBackdrop} />}
                {started && scene === 12 && <SceneCompare key={`s12-${run}-${sceneRun}`} run={run * 1000 + sceneRun} onDone={next} onBackdrop={setBackdrop} />}
                {started && scene === 13 && <SceneQuality key={`s13-${run}-${sceneRun}`} run={run * 1000 + sceneRun} onDone={next} onBackdrop={setBackdrop} />}
                {started && scene === 14 && <SceneFinale key={`s14-${run}-${sceneRun}`} run={run * 1000 + sceneRun} onBackdrop={setBackdrop} onRestart={restart} />}
            </AnimatePresence>

            <AnimatePresence>
                {ended && (
                    <motion.div className={s.endBar} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <span className={s.note}>المشهد التالي قيد الإعداد</span>
                        <button className={s.btn} onClick={replay}>
                            إعادة المشهد
                        </button>
                        <button className={s.btn} onClick={restart}>
                            من البداية
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={s.letterTop} />
            <div className={s.letterBottom} />

            <StartGate open={!started} title="حقّ المرحلة" subtitle="منهج سند في الشراكة العقارية" onStart={() => setStarted(true)} />
            <SoundToggle />
        </div>
    );
}
