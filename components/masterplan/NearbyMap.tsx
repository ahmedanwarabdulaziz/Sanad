"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { GOOGLE_MAPS_URL, NEARBY_PLACES, PROJECT_AREA, PROJECT_LOCATION, directionsUrl, distanceKm, type NearbyPlace } from "@/lib/sanad-zayed/masterplan/data";
import { TILE_CREDIT, clamp01, createTileLayer, drawArea, easeInOut, fitCanvas, fitView as fit, lerpView, type LatLng, type Rect as Area, type View } from "./mapTiles";
import s from "./masterplan.module.css";
import * as J from "./journey";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const P: LatLng = PROJECT_LOCATION;
const N = NEARBY_PLACES.length;

// Movie timeline (ms)
const OPEN = 2600; // fly onto the project
const AREA = 9000; // the project's area: border, title, highlights, then the brief about Al-Tharwa Al-Khadraa
const P0 = OPEN + AREA; // places start
const PER = 3800; // each place
const MOVE = 1300; // camera travel inside each place's slot
const FINAL_MOVE = 1900; // pull back to the overview
const T_FINALE = P0 + N * PER;
const T_END = T_FINALE + FINAL_MOVE;

/** Camera position at time t (ms since the movie started). */
function cameraAt(t: number, W: number, H: number): View {
    const mobile = W < 760;
    const full: Area = { x: 16, y: mobile ? 110 : 90, w: W - 32, h: H - (mobile ? 250 : 210) };
    const finaleArea: Area = mobile ? { x: 0, y: 60, w: W, h: H * 0.52 - 60 } : { x: 0, y: 60, w: W - 420, h: H - 60 };
    const start: View = { c: P, Z: 10.5, sx: W / 2, sy: H / 2 };
    const hero: View = { c: P, Z: 15.2, sx: W / 2, sy: H / 2 - (mobile ? 30 : 0) };
    const pair = (i: number) => fit([P, NEARBY_PLACES[i]], full, 0.5, 15.3, mobile ? 40 : 30);
    const overview = fit([P, ...NEARBY_PLACES], finaleArea, mobile ? 0.62 : 0.66, 15, mobile ? 0 : 20);

    // the area card sits at the bottom, so frame the triangle in the space above it
    const areaRegion: Area = mobile ? { x: 12, y: 96, w: W - 24, h: H * 0.4 - 96 } : { x: 16, y: 80, w: W - 32, h: H - 80 - 290 };
    const area = fit(PROJECT_AREA.polygon, areaRegion, mobile ? 0.9 : 0.85, 15);
    if (t < OPEN) return lerpView(start, hero, easeInOut(t / OPEN), 0);
    if (t < P0) return lerpView(hero, area, easeInOut(Math.min(1, (t - OPEN) / 1700)), 0.4);
    if (t < T_FINALE) {
        const i = Math.floor((t - P0) / PER);
        const k = t - P0 - i * PER;
        const from = i === 0 ? area : pair(i - 1);
        return k < MOVE ? lerpView(from, pair(i), easeInOut(k / MOVE), 0.7) : pair(i);
    }
    if (t < T_END) return lerpView(pair(N - 1), overview, easeInOut((t - T_FINALE) / FINAL_MOVE), 0.5);
    return overview;
}

/** Which place the movie is on: -1 opening, 0..N-1 a place, N finale. */
/** -1 opening, -2 the project's area, 0..N-1 a place, N finale. */
const stepAt = (t: number) => (t < OPEN ? -1 : t < P0 ? -2 : t < T_FINALE ? Math.floor((t - P0) / PER) : N);

/** "سند زايد قريبة من إيه؟" — a short film from the project to each nearby place, then all of them together. */
export default function NearbyMap({
    onPlan,
    onHome,
    onNeighbors,
    startAtEnd = false,
}: {
    onPlan: () => void;
    onHome: () => void;
    /** Opens "جيرانك في الثروة الخضراء". */
    onNeighbors: () => void;
    /** Back from the neighbours film: open on the finished overview, without the invitation. */
    startAtEnd?: boolean;
}) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const heroPin = useRef<HTMLDivElement>(null);
    const areaLabel = useRef<HTMLDivElement>(null);
    const areaHl = useRef<HTMLUListElement>(null);
    const areaAbout = useRef<HTMLParagraphElement>(null);
    const sideLabels = useRef<(HTMLDivElement | null)[]>([]);
    const placePins = useRef<(HTMLButtonElement | null)[]>([]);
    const card = useRef<HTMLDivElement>(null);
    const t0 = useRef(0);
    const [step, setStep] = useState(-1);
    useEffect(() => {
        J.track({ type: "nearby_movie", complete: false });
    }, []);
    useEffect(() => {
        if (step === N) J.track({ type: "nearby_movie", complete: true });
    }, [step]);
    const [selected, setSelected] = useState<number | null>(null);
    const stepRef = useRef(-1);
    const selRef = useRef<number | null>(null);
    useEffect(() => {
        selRef.current = selected;
    }, [selected]);

    useEffect(() => {
        const cv = canvas.current!;
        const g = cv.getContext("2d")!;
        const tiles = createTileLayer();
        [P, ...NEARBY_PLACES].forEach((p) => tiles.warm(p, 12, 15, 2, 2));
        let raf = 0;
        t0.current = performance.now() - (startAtEnd ? T_END : 0);
        const draw = (now: number) => {
            const { W, H } = fitCanvas(cv, g);
            const t = now - t0.current;
            const st = stepAt(t);
            if (st !== stepRef.current) {
                stepRef.current = st;
                setStep(st);
            }
            const v = cameraAt(t, W, H);
            const Z = v.Z + (t > T_END ? Math.sin((t - T_END) / 4000) * 0.04 : 0); // gentle breathing at rest
            tiles.draw(g, W, H, v.c, Z, v.sx, v.sy);
            g.fillStyle = "rgba(6,12,24,0.3)";
            g.fillRect(0, 0, W, H);

            // the project's area (the triangle): draws itself in its own scene, then stays as a soft highlight
            const areaPts = PROJECT_AREA.polygon.map((p) => tiles.project(p, v.c, Z, v.sx, v.sy));
            const reveal = t < OPEN ? 0 : clamp01((t - OPEN - 900) / 1900);
            const areaAlpha = t < OPEN ? 0 : t < P0 ? 1 : t < T_FINALE ? 0.5 : 0.75;
            const dim = t < OPEN ? 0 : t < P0 ? reveal : t < T_FINALE ? 0.3 : 0.45;
            drawArea(g, areaPts, reveal, areaAlpha, now, dim, PROJECT_AREA.corners);
            // road names along each side, kept upright
            const sideOn = t < OPEN ? 0 : t < P0 ? clamp01((t - OPEN - 2300) / 500) : t < T_FINALE ? 0 : clamp01((t - T_END) / 600);
            const cornerPts = PROJECT_AREA.corners.map((i) => areaPts[i]);
            const cxA = cornerPts.reduce((s2, p) => s2 + p[0], 0) / cornerPts.length;
            const cyA = cornerPts.reduce((s2, p) => s2 + p[1], 0) / cornerPts.length;
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
            if (areaLabel.current) {
                const out = 1 - clamp01((t - P0 + 450) / 450);
                areaLabel.current.style.opacity = String(t < P0 ? clamp01((t - OPEN - 2000) / 600) * out : 0);
                areaLabel.current.style.pointerEvents = "none";
                if (areaHl.current) areaHl.current.style.opacity = String(clamp01((t - OPEN - 3500) / 600));
                if (areaAbout.current) areaAbout.current.style.opacity = String(clamp01((t - OPEN - 5200) / 700));
            }

            const [px, py] = tiles.project(P, v.c, Z, v.sx, v.sy);
            NEARBY_PLACES.forEach((p, i) => {
                const [qx, qy] = tiles.project(p, v.c, Z, v.sx, v.sy);
                const slot = P0 + i * PER;
                const current = st === i;
                const visited = st > i;
                // line progress: drawn while its place is on screen; all redrawn together in the finale
                const lk = current ? clamp01((t - slot - MOVE * 0.6) / 900) : st === N ? clamp01((t - T_FINALE - FINAL_MOVE * 0.5 - i * 140) / 900) : visited ? 1 : 0;
                const hi = current || (st === N && selRef.current === i);
                if (lk > 0) {
                    const ex = px + (qx - px) * lk;
                    const ey = py + (qy - py) * lk;
                    g.save();
                    g.lineCap = "round";
                    if (hi) {
                        g.strokeStyle = "rgba(10,20,36,0.6)";
                        g.lineWidth = 9;
                        g.beginPath();
                        g.moveTo(px, py);
                        g.lineTo(ex, ey);
                        g.stroke();
                    }
                    g.strokeStyle = hi ? "#E5C77F" : st === N ? "rgba(229,199,127,0.75)" : "rgba(255,255,255,0.35)";
                    g.lineWidth = hi ? 4.5 : st === N ? 2.4 : 1.6;
                    g.setLineDash(hi ? [14, 10] : [7, 8]);
                    if (hi) {
                        g.shadowColor = "rgba(229,199,127,0.8)";
                        g.shadowBlur = 10;
                    }
                    g.beginPath();
                    g.moveTo(px, py);
                    g.lineTo(ex, ey);
                    g.stroke();
                    g.restore();
                }
                const el = placePins.current[i];
                if (el) {
                    const shown = current ? clamp01((t - slot - MOVE * 0.4) / 500) : visited || st === N ? 1 : 0;
                    el.style.transform = `translate(${qx}px, ${qy}px)`;
                    el.style.opacity = String(shown);
                    el.style.pointerEvents = st === N ? "auto" : "none";
                }
                if (card.current && (current || (st === N && selRef.current === i))) {
                    card.current.style.transform = `translate(${qx}px, ${qy}px)`;
                    card.current.style.opacity = String(current ? clamp01((t - slot - MOVE - 300) / 500) * (1 - clamp01((t - slot - PER + 350) / 300)) : 1);
                }
            });
            if (card.current && st === N && selRef.current === null) card.current.style.opacity = "0";
            if (card.current && st === -1) card.current.style.opacity = "0";
            if (heroPin.current) {
                heroPin.current.style.transform = `translate(${px}px, ${py}px)`;
                heroPin.current.style.opacity = String(clamp01((t - 600) / 900));
            }
            raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the film starts once; startAtEnd only sets where
    }, []);

    // the invitation to the neighbours film: a moment after the overview settles
    const [invite, setInvite] = useState(false);
    const invited = useRef(startAtEnd);
    useEffect(() => {
        if (step !== N || invited.current) return;
        const id = setTimeout(() => {
            invited.current = true;
            setInvite(true);
        }, FINAL_MOVE + 900);
        return () => clearTimeout(id);
    }, [step]);

    const skip = useCallback(() => {
        t0.current = performance.now() - T_FINALE;
    }, []);
    const replay = useCallback(() => {
        setSelected(null);
        t0.current = performance.now();
    }, []);

    const finale = step === N;
    const cardPlace: NearbyPlace | null = step >= 0 && step < N ? NEARBY_PLACES[step] : finale && selected !== null ? NEARBY_PLACES[selected] : null;
    const fastest = Math.min(...NEARBY_PLACES.map((p) => p.driveMin));
    const slowest = Math.max(...NEARBY_PLACES.map((p) => p.driveMin));

    return (
        <motion.div className={s.mapScreen} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
            <canvas ref={canvas} className={s.mapCanvas} />
            <div className={s.mapVignette} />

            {NEARBY_PLACES.map((p, i) => (
                <button
                    key={p.id}
                    ref={(el) => void (placePins.current[i] = el)}
                    className={cx(s.mapMarker, s.mapMarkerBtn)}
                    onClick={() => setSelected(selected === i ? null : i)}
                    aria-label={p.name}
                >
                    <span className={s.placeDot}>{p.icon}</span>
                    <span className={cx(s.placeTag, p.labelSide && s[`placeTag_${p.labelSide}`], (step === i || selected === i) && s.placeTagOn)}>
                        {p.name}
                        {finale && <b>{p.driveMin} د</b>}
                    </span>
                </button>
            ))}

            {PROJECT_AREA.sides.map((name, i) => (
                <div key={name} className={s.mapMarker} ref={(el) => void (sideLabels.current[i] = el)} aria-hidden="true">
                    <span className={s.sideLabel}>{name}</span>
                </div>
            ))}

            <div className={s.areaPanel} ref={areaLabel} style={{ opacity: 0 }}>
                <div className={s.areaEyebrow}>موقع المشروع</div>
                <strong className={s.areaTitle}>{PROJECT_AREA.title}</strong>
                <span className={s.areaSub}>{PROJECT_AREA.subtitle}</span>
                <ul className={s.areaHl} ref={areaHl} style={{ opacity: 0 }}>
                    {PROJECT_AREA.highlights.map((h) => (
                        <li key={h}>{h}</li>
                    ))}
                </ul>
                <p className={s.areaAbout} ref={areaAbout} style={{ opacity: 0 }}>
                    <b>{PROJECT_AREA.about.title}</b>
                    {PROJECT_AREA.about.text}
                </p>
            </div>

            {/* hero marker: the project */}
            <div className={s.mapMarker} ref={heroPin} aria-hidden="true">
                <span className={s.heroPulse} />
                <span className={s.heroPulse} style={{ animationDelay: "0.9s" }} />
                <span className={s.heroBadge}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/logo-mark.png" alt="" />
                </span>
                <span className={s.heroTag}>سند زايد</span>
            </div>

            <div className={s.mapMarker} ref={card} aria-live="polite">
                {cardPlace && (
                    <div className={s.distCard} key={cardPlace.id}>
                        <div className={s.distPlace}>
                            {cardPlace.icon} {cardPlace.name}
                        </div>
                        <div className={s.distMain}>
                            <strong>{cardPlace.driveMin} دقيقة</strong> · {cardPlace.driveKm.toFixed(1)} كم بالسيارة
                        </div>
                        <div className={s.distSub}>
                            {cardPlace.via} · {distanceKm(P, cardPlace).toFixed(1)} كم مسافة مباشرة
                        </div>
                    </div>
                )}
            </div>

            {/* movie titles */}
            <AnimatePresence>
                {!finale && (
                    <motion.div className={s.movieTop} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div className={s.movieTitle}>سند زايد قريبة من إيه؟</div>
                        <div className={s.movieDots}>
                            {NEARBY_PLACES.map((p, i) => (
                                <span key={p.id} className={cx(s.movieDot, i === step && s.movieDotOn, i < step && s.movieDotDone)} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {step === -1 && (
                    <motion.div className={s.mapCaption} style={{ opacity: 1, top: "auto", bottom: "16%" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <span>مشروع سند زايد</span>
                        <small>{PROJECT_LOCATION.address}</small>
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
                        transition={{ delay: 0.6, type: "spring", damping: 26, stiffness: 200 }}
                    >
                        <div className={s.nearEyebrow}>موقع متميز في قلب الشيخ زايد</div>
                        <h2 className={s.nearTitle}>سند زايد قريبة من إيه؟</h2>
                        <p className={s.nearLead}>
                            {N} وجهات رئيسية على بُعد {fastest}–{slowest} دقيقة بالسيارة.
                        </p>
                        <details className={s.nearAbout}>
                            <summary>
                                <span>{PROJECT_AREA.about.title}</span>
                                <small>{PROJECT_AREA.title}</small>
                            </summary>
                            <ul>
                                {PROJECT_AREA.highlights.map((h) => (
                                    <li key={h}>{h}</li>
                                ))}
                            </ul>
                            <p>{PROJECT_AREA.about.text}</p>
                        </details>
                        <ul className={s.nearList}>
                            {NEARBY_PLACES.map((p, i) => (
                                <li key={p.id}>
                                    <button className={cx(s.nearItem, selected === i && s.nearItemOn)} onClick={() => setSelected(selected === i ? null : i)}>
                                        <span className={s.nearIcon}>{p.icon}</span>
                                        <span className={s.nearName}>
                                            {p.name}
                                            <small>{p.kind}</small>
                                        </span>
                                        <span className={s.nearTime}>
                                            <strong>{p.driveMin}</strong> دقيقة
                                            <small>{p.driveKm.toFixed(1)} كم</small>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {selected !== null && (
                            <a className={s.nearRoute} href={directionsUrl(NEARBY_PLACES[selected].query)} target="_blank" rel="noopener noreferrer">
                                عرض المسار إلى {NEARBY_PLACES[selected].name} في Google Maps ←
                            </a>
                        )}
                        <button className={s.nbLink} onClick={onNeighbors}>
                            <span>🏘️</span>
                            <span>
                                جيرانك في الثروة الخضراء
                                <small>كبار المطورين اللي بيبنوا حوالين سند زايد</small>
                            </span>
                            <b>←</b>
                        </button>
                        <button className={s.nearReplay} onClick={replay}>
                            ↻ إعادة العرض
                        </button>
                        <p className={s.nearNote}>المسافات والأوقات حسب أفضل مسار في Google Maps في الظروف العادية، وقد تختلف حسب حركة المرور.</p>
                        <button className={s.nearCta} onClick={onPlan}>
                            استكشف الوحدات
                        </button>
                    </motion.aside>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {finale && invite && (
                    <motion.div
                        className={s.nbInvite}
                        role="dialog"
                        aria-label="جيرانك في الثروة الخضراء"
                        initial={{ opacity: 0, y: 24, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16 }}
                        transition={{ type: "spring", damping: 24, stiffness: 220 }}
                    >
                        <button className={s.nbInviteClose} onClick={() => setInvite(false)} aria-label="إغلاق">
                            ✕
                        </button>
                        <div className={s.nbInviteEyebrow}>وكمان…</div>
                        <strong className={s.nbInviteTitle}>جيرانك في الثروة الخضراء</strong>
                        <p className={s.nbInviteText}>إعمار ودرة والبابطين وغيرهم اختاروا نفس المثلث. شوف مين بيبني حواليك.</p>
                        <button
                            className={s.nbInviteGo}
                            onClick={() => {
                                setInvite(false);
                                onNeighbors();
                            }}
                        >
                            شوف جيرانك ←
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={s.mapCredit}>{TILE_CREDIT} · المسافة والوقت: Google Maps</div>
        </motion.div>
    );
}
