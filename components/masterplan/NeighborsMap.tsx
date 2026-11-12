"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { GOOGLE_MAPS_URL, NEIGHBORS, PROJECT_AREA, PROJECT_LOCATION, distanceKm, type Neighbor } from "@/lib/sanad-zayed/masterplan/data";
import { TILE_CREDIT, clamp01, createTileLayer, drawArea, easeInOut, fitCanvas, fitView, lerpView, type LatLng, type Rect, type View } from "./mapTiles";
import s from "./masterplan.module.css";
import * as J from "./journey";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const P: LatLng = PROJECT_LOCATION;
const MAJOR = NEIGHBORS.filter((n) => n.group === "major");
const NEW = NEIGHBORS.filter((n) => n.group === "new");
const M = MAJOR.length;
const TOTAL_FEDDANS = NEIGHBORS.reduce((t, n) => t + (n.feddans ?? 0), 0);
/** Rounded down to the nearest 50, for "أكثر من … فدان". */
const TOTAL_ROUND = Math.floor(TOTAL_FEDDANS / 50) * 50;

// Movie timeline (ms)
const OPEN = 4200; // settle on the triangle with the title message
const PER = 3400; // each big developer
const MOVE = 1200; // camera travel inside each slot
const T_NEW = OPEN + M * PER; // the newer projects, all together
const NEW_DUR = 5600;
const POP = 260; // stagger between new pins
const T_FINALE = T_NEW + NEW_DUR;
const FINAL_MOVE = 1500;
const T_END = T_FINALE + FINAL_MOVE;

/** -1 opening, 0..M-1 a big developer, M the new projects, M+1 finale. */
const stepAt = (t: number) => (t < OPEN ? -1 : t < T_NEW ? Math.floor((t - OPEN) / PER) : t < T_FINALE ? M : M + 1);

const areaText = (n: Neighbor) => (n.feddans ? `${n.feddansText ?? n.feddans} فدان` : "");

/** Camera position at time t (ms since the movie started). */
function cameraAt(t: number, W: number, H: number): View {
    const mobile = W < 760;
    const full: Rect = { x: 16, y: mobile ? 120 : 96, w: W - 32, h: H - (mobile ? 270 : 230) };
    // the triangle, framed above the bottom caption (opening and the new projects)
    const upper: Rect = mobile ? { x: 10, y: 110, w: W - 20, h: H * 0.56 - 110 } : { x: 16, y: 96, w: W - 32, h: H - 96 - 220 };
    const finaleArea: Rect = mobile ? { x: 0, y: 64, w: W, h: H * 0.52 - 64 } : { x: 0, y: 60, w: W - 420, h: H - 60 };
    const area = fitView(PROJECT_AREA.polygon, upper, mobile ? 0.94 : 0.9, 15.2);
    const start: View = { ...area, Z: area.Z - 1.6 };
    const pair = (i: number) => fitView([P, MAJOR[i]], full, 0.46, 15.4, mobile ? 30 : 20);
    const overview = fitView(PROJECT_AREA.polygon, finaleArea, mobile ? 0.95 : 0.86, 15);

    if (t < OPEN) return lerpView(start, area, easeInOut(Math.min(1, t / 2600)), 0);
    if (t < T_NEW) {
        const i = Math.floor((t - OPEN) / PER);
        const k = t - OPEN - i * PER;
        const from = i === 0 ? area : pair(i - 1);
        return k < MOVE ? lerpView(from, pair(i), easeInOut(k / MOVE), 0.6) : pair(i);
    }
    if (t < T_FINALE) return lerpView(pair(M - 1), area, easeInOut(Math.min(1, (t - T_NEW) / 1400)), 0.4);
    if (t < T_END) return lerpView(area, overview, easeInOut((t - T_FINALE) / FINAL_MOVE), 0);
    return overview;
}

/** "جيرانك في الثروة الخضراء" — the developers building inside Sanad Zayed's triangle, one film like the nearby one. */
export default function NeighborsMap({ onPlan, onHome, onNearby }: { onPlan: () => void; onHome: () => void; onNearby: () => void }) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const heroPin = useRef<HTMLDivElement>(null);
    const sideLabels = useRef<(HTMLDivElement | null)[]>([]);
    const pins = useRef<(HTMLButtonElement | null)[]>([]);
    const tags = useRef<(HTMLSpanElement | null)[]>([]);
    const card = useRef<HTMLDivElement>(null);
    const t0 = useRef(0);
    const [step, setStep] = useState(-1);
    const stepRef = useRef(-1);
    const [selected, setSelected] = useState<string | null>(null);
    const selRef = useRef<string | null>(null);
    useEffect(() => {
        selRef.current = selected;
    }, [selected]);
    useEffect(() => {
        J.track({ type: "panel", panel: "neighbors" });
    }, []);

    useEffect(() => {
        const cv = canvas.current!;
        const g = cv.getContext("2d")!;
        const tiles = createTileLayer();
        tiles.warm(P, 12, 15, 3, 3);
        MAJOR.forEach((p) => tiles.warm(p, 13, 15, 2, 2));
        let raf = 0;
        t0.current = performance.now();
        const draw = (now: number) => {
            const { W, H } = fitCanvas(cv, g);
            const t = now - t0.current;
            const st = stepAt(t);
            if (st !== stepRef.current) {
                stepRef.current = st;
                setStep(st);
            }
            const finale = st === M + 1;
            const v = cameraAt(t, W, H);
            const Z = v.Z + (t > T_END ? Math.sin((t - T_END) / 4000) * 0.04 : 0);
            tiles.draw(g, W, H, v.c, Z, v.sx, v.sy);
            g.fillStyle = "rgba(6,12,24,0.3)";
            g.fillRect(0, 0, W, H);

            // the triangle: draws itself while the title is up, then stays as the stage
            const areaPts = PROJECT_AREA.polygon.map((p) => tiles.project(p, v.c, Z, v.sx, v.sy));
            const reveal = clamp01((t - 500) / 2000);
            const inMajors = st >= 0 && st < M;
            drawArea(g, areaPts, reveal, inMajors ? 0.55 : 0.85, now, inMajors ? 0.35 : reveal * 0.6, PROJECT_AREA.corners);
            const sideOn = st === -1 ? clamp01((t - 2400) / 500) : finale ? clamp01((t - T_END) / 600) : 0;
            const cornerPts = PROJECT_AREA.corners.map((i) => areaPts[i]);
            const cxA = cornerPts.reduce((a, p) => a + p[0], 0) / cornerPts.length;
            const cyA = cornerPts.reduce((a, p) => a + p[1], 0) / cornerPts.length;
            cornerPts.forEach((a, i) => {
                const el = sideLabels.current[i];
                if (!el) return;
                const b = cornerPts[(i + 1) % cornerPts.length];
                let ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
                if (ang > 90) ang -= 180;
                if (ang < -90) ang += 180;
                const mx = (a[0] + b[0]) / 2;
                const my = (a[1] + b[1]) / 2;
                const d = Math.hypot(mx - cxA, my - cyA) || 1;
                el.style.transform = `translate(${mx + ((mx - cxA) / d) * 18}px, ${my + ((my - cyA) / d) * 18}px) rotate(${ang}deg)`;
                el.style.opacity = String(sideOn);
            });

            const [px, py] = tiles.project(P, v.c, Z, v.sx, v.sy);
            let cardShown = false;
            NEIGHBORS.forEach((n, idx) => {
                const [qx, qy] = tiles.project(n, v.c, Z, v.sx, v.sy);
                const mi = n.group === "major" ? MAJOR.indexOf(n) : -1;
                const ni = n.group === "new" ? NEW.indexOf(n) : -1;
                const current = mi >= 0 && st === mi;
                const sel = selRef.current === n.id;
                const slot = OPEN + mi * PER;
                const popAt = T_NEW + 1500 + ni * POP;

                // pin visibility
                let shown = 0;
                if (mi >= 0) shown = current ? clamp01((t - slot - MOVE * 0.4) / 450) : st > mi ? 1 : 0;
                else shown = st === M ? clamp01((t - popAt) / 300) : finale ? 1 : 0;

                // connecting line from Sanad Zayed: the current big developer, or the selected pin in the finale
                const lk = current ? clamp01((t - slot - MOVE * 0.6) / 800) : finale && sel ? 1 : 0;
                if (lk > 0) {
                    g.save();
                    g.lineCap = "round";
                    g.strokeStyle = "rgba(10,20,36,0.6)";
                    g.lineWidth = 8;
                    g.beginPath();
                    g.moveTo(px, py);
                    g.lineTo(px + (qx - px) * lk, py + (qy - py) * lk);
                    g.stroke();
                    g.strokeStyle = "#E5C77F";
                    g.lineWidth = 3.5;
                    g.setLineDash([12, 9]);
                    g.lineDashOffset = -now / 50;
                    g.shadowColor = "rgba(229,199,127,0.8)";
                    g.shadowBlur = 10;
                    g.stroke();
                    g.restore();
                }

                const el = pins.current[idx];
                if (el) {
                    el.style.transform = `translate(${qx}px, ${qy}px)`;
                    el.style.opacity = String(shown);
                    el.style.pointerEvents = finale ? "auto" : "none";
                    el.style.zIndex = sel || current ? "3" : mi >= 0 ? "2" : "1";
                }
                // new projects keep their names hidden on the busy overview: shown as they pop, and when picked
                const tag = tags.current[idx];
                if (tag && ni >= 0) {
                    const popping = st === M ? clamp01((t - popAt) / 300) * (1 - clamp01((t - popAt - 1500) / 400)) : 0;
                    tag.style.opacity = String(sel ? 1 : popping);
                }
                if (card.current && (current || (finale && sel))) {
                    cardShown = true;
                    card.current.style.transform = `translate(${qx}px, ${qy}px)`;
                    card.current.style.opacity = String(current ? clamp01((t - slot - MOVE - 250) / 450) * (1 - clamp01((t - slot - PER + 350) / 300)) : 1);
                }
            });
            if (card.current && !cardShown) card.current.style.opacity = "0";
            if (heroPin.current) {
                heroPin.current.style.transform = `translate(${px}px, ${py}px)`;
                heroPin.current.style.opacity = String(clamp01((t - 300) / 800));
            }
            raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(raf);
    }, []);

    const skip = useCallback(() => {
        t0.current = performance.now() - T_FINALE;
    }, []);
    const replay = useCallback(() => {
        setSelected(null);
        t0.current = performance.now();
    }, []);
    const pick = (id: string) => setSelected((cur) => (cur === id ? null : id));

    const finale = step === M + 1;
    const cardItem: Neighbor | null = step >= 0 && step < M ? MAJOR[step] : finale && selected ? (NEIGHBORS.find((n) => n.id === selected) ?? null) : null;

    return (
        <motion.div className={s.mapScreen} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
            <canvas ref={canvas} className={s.mapCanvas} />
            <div className={s.mapVignette} />

            {PROJECT_AREA.sides.map((name, i) => (
                <div key={name} className={s.mapMarker} ref={(el) => void (sideLabels.current[i] = el)} aria-hidden="true">
                    <span className={s.sideLabel}>{name}</span>
                </div>
            ))}

            {NEIGHBORS.map((n, i) =>
                n.group === "major" ? (
                    <button
                        key={n.id}
                        ref={(el) => void (pins.current[i] = el)}
                        className={cx(s.mapMarker, s.mapMarkerBtn)}
                        onClick={() => pick(n.id)}
                        aria-label={`${n.name} — ${n.developer}`}
                    >
                        <span className={cx(s.placeDot, s.nbMajorDot)}>{n.icon}</span>
                        <span className={cx(s.placeTag, n.labelSide && s[`placeTag_${n.labelSide}`], (step === MAJOR.indexOf(n) || selected === n.id) && s.placeTagOn)}>
                            {n.name}
                            {finale && n.feddans && <b>{n.feddansText ?? n.feddans} ف</b>}
                        </span>
                    </button>
                ) : (
                    <button
                        key={n.id}
                        ref={(el) => void (pins.current[i] = el)}
                        className={cx(s.mapMarker, s.mapMarkerBtn)}
                        onClick={() => pick(n.id)}
                        aria-label={`${n.name} — ${n.developer}`}
                    >
                        <span className={cx(s.nbDot, selected === n.id && s.nbDotOn)} />
                        <span className={cx(s.placeTag, s.nbTag, selected === n.id && s.placeTagOn)} ref={(el) => void (tags.current[i] = el)}>
                            {n.name}
                        </span>
                    </button>
                ),
            )}

            {/* Sanad Zayed */}
            <div className={s.mapMarker} ref={heroPin} aria-hidden="true">
                <span className={s.heroPulse} />
                <span className={s.heroPulse} style={{ animationDelay: "0.9s" }} />
                <span className={s.heroBadge}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/logo-mark.png" alt="" />
                </span>
                <span className={s.heroTag}>سند زايد</span>
            </div>

            {/* above the pins (their z-index is 1–3) and below the panels that come later in the DOM */}
            <div className={s.mapMarker} ref={card} style={{ zIndex: 3 }} aria-live="polite">
                {cardItem && (
                    <div className={cx(s.distCard, s.nbCard)} key={cardItem.id}>
                        <div className={s.nbCardDev}>{cardItem.developer}</div>
                        <div className={s.distPlace}>
                            {cardItem.icon} {cardItem.name}
                        </div>
                        <div className={s.distMain}>
                            {cardItem.feddans ? (
                                <>
                                    <strong>{cardItem.feddansText ?? cardItem.feddans}</strong> فدان ·{" "}
                                </>
                            ) : null}
                            {cardItem.kind}
                        </div>
                        {cardItem.note && <div className={s.distSub}>{cardItem.note}</div>}
                        <div className={s.nbCardDist}>{distanceKm(P, cardItem).toFixed(1)} كم من سند زايد</div>
                    </div>
                )}
            </div>

            {/* the message */}
            <AnimatePresence>
                {step === -1 && (
                    <motion.div
                        className={s.nbTitleCard}
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.04 }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                    >
                        <span className={s.nbTitleEyebrow}>في نفس المثلث مع سند زايد</span>
                        <strong className={s.nbTitleMain}>جيرانك في الثروة الخضراء</strong>
                        <span className={s.nbTitleSub}>كبار المطورين اختاروا نفس المنطقة</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {step >= 0 && !finale && (
                    <motion.div className={s.movieTop} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div className={s.movieTitle}>جيرانك في الثروة الخضراء</div>
                        <div className={s.movieDots}>
                            {[...MAJOR, null].map((p, i) => (
                                <span key={p?.id ?? "new"} className={cx(s.movieDot, i === step && s.movieDotOn, i < step && s.movieDotDone)} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* the newer projects, named as they appear */}
            <AnimatePresence>
                {step === M && (
                    <motion.div className={s.nbNewPanel} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.5 }}>
                        <div className={s.areaEyebrow}>وبيتبني دلوقتي</div>
                        <strong className={s.areaTitle}>{NEW.length} مشروعات جديدة حوالين سند زايد</strong>
                        <ul className={s.nbChips}>
                            {NEW.map((n, i) => (
                                <motion.li key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 + (i * POP) / 1000, duration: 0.3 }}>
                                    {n.name}
                                    <small>{n.developer}</small>
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={s.nearTop}>
                <button className={s.nearHome} onClick={onHome}>
                    → الرئيسية
                </button>
                <a className={s.nearHome} href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer">
                    📍<span className={s.nearMapsText}> الموقع على Google Maps</span>
                </a>
                {!finale && (
                    <button className={s.nearHome} onClick={skip}>
                        تخطي العرض
                    </button>
                )}
            </div>

            <AnimatePresence>
                {finale && (
                    <motion.aside
                        className={s.nearPanel}
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: 0.5, type: "spring", damping: 26, stiffness: 200 }}
                    >
                        <div className={s.nearEyebrow}>{PROJECT_AREA.subtitle}</div>
                        <h2 className={s.nearTitle}>جيرانك في الثروة الخضراء</h2>
                        <div className={s.nbStats}>
                            <div>
                                <strong>{NEIGHBORS.length}</strong>
                                <span>مشروع في نفس المثلث</span>
                            </div>
                            <div>
                                <strong>+{TOTAL_ROUND}</strong>
                                <span>فدان تطوير حواليك</span>
                            </div>
                        </div>

                        <h3 className={s.nbGroup}>كبار المطورين</h3>
                        <ul className={s.nearList}>
                            {MAJOR.map((n) => (
                                <li key={n.id}>
                                    <button className={cx(s.nearItem, selected === n.id && s.nearItemOn)} onClick={() => pick(n.id)}>
                                        <span className={s.nearIcon}>{n.icon}</span>
                                        <span className={s.nearName}>
                                            {n.name}
                                            <small>
                                                {n.developer} · {n.kind}
                                            </small>
                                        </span>
                                        <span className={s.nearTime}>
                                            <strong>{n.feddansText ?? n.feddans}</strong> فدان
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>

                        <h3 className={s.nbGroup}>مشروعات جديدة</h3>
                        <ul className={s.nbNewList}>
                            {NEW.map((n) => (
                                <li key={n.id}>
                                    <button className={cx(s.nbNewItem, selected === n.id && s.nearItemOn)} onClick={() => pick(n.id)}>
                                        <span className={s.nbNewName}>
                                            {n.name}
                                            {n.commercial && <i>تجاري</i>}
                                            <small>{n.developer}</small>
                                        </span>
                                        <span className={s.nbNewArea}>{areaText(n)}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>

                        <div className={s.nbActions}>
                            <button className={s.nearReplay} onClick={replay}>
                                ↻ إعادة العرض
                            </button>
                            <button className={s.nearReplay} onClick={onNearby}>
                                سند زايد قريبة من إيه؟
                            </button>
                        </div>
                        <p className={s.nearNote}>المساحات حسب ما أعلنته الشركات والمواقع العقارية وقد تختلف قليلًا. المسافات خط مستقيم من سند زايد.</p>
                        <button className={s.nearCta} onClick={onPlan}>
                            استكشف الوحدات
                        </button>
                    </motion.aside>
                )}
            </AnimatePresence>

            <div className={s.mapCredit}>{TILE_CREDIT}</div>
        </motion.div>
    );
}
