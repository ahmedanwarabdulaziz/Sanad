"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { NEARBY_PLACES, PROJECT_LOCATION, directionsUrl, distanceKm, type NearbyPlace } from "@/lib/sanad-zayed/masterplan/data";
import { TILE_CREDIT, clamp01, createTileLayer, easeInOut, fitCanvas, latToY, lonToX, type LatLng } from "./mapTiles";
import s from "./masterplan.module.css";
import * as J from "./journey";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const P: LatLng = PROJECT_LOCATION;
const N = NEARBY_PLACES.length;

// Movie timeline (ms)
const OPEN = 2600; // fly onto the project
const PER = 3800; // each place
const MOVE = 1300; // camera travel inside each place's slot
const FINAL_MOVE = 1900; // pull back to the overview
const T_FINALE = OPEN + N * PER;
const T_END = T_FINALE + FINAL_MOVE;

type View = { c: LatLng; Z: number; sx: number; sy: number };
type Area = { x: number; y: number; w: number; h: number };

/** Zoom/centre that fit some points inside a screen rectangle. */
function fit(points: LatLng[], area: Area, fill: number, maxZ = 15.3, lift = 0): View {
    const z0 = 10;
    const xs = points.map((p) => lonToX(p.lng, z0));
    const ys = points.map((p) => latToY(p.lat, z0));
    const spanX = Math.max(1, Math.max(...xs) - Math.min(...xs));
    const spanY = Math.max(1, Math.max(...ys) - Math.min(...ys));
    const Z = Math.min(maxZ, z0 + Math.log2(Math.min((area.w * fill) / spanX, (area.h * fill) / spanY)));
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    return {
        c: { lat: (Math.max(...lats) + Math.min(...lats)) / 2, lng: (Math.max(...lngs) + Math.min(...lngs)) / 2 },
        Z,
        sx: area.x + area.w / 2,
        sy: area.y + area.h / 2 - lift,
    };
}

function lerpView(a: View, b: View, e: number, dip: number): View {
    return {
        c: { lat: a.c.lat + (b.c.lat - a.c.lat) * e, lng: a.c.lng + (b.c.lng - a.c.lng) * e },
        Z: a.Z + (b.Z - a.Z) * e - dip * Math.sin(Math.PI * e),
        sx: a.sx + (b.sx - a.sx) * e,
        sy: a.sy + (b.sy - a.sy) * e,
    };
}

/** Camera position at time t (ms since the movie started). */
function cameraAt(t: number, W: number, H: number): View {
    const mobile = W < 760;
    const full: Area = { x: 16, y: mobile ? 110 : 90, w: W - 32, h: H - (mobile ? 250 : 210) };
    const finaleArea: Area = mobile ? { x: 0, y: 60, w: W, h: H * 0.52 - 60 } : { x: 0, y: 60, w: W - 420, h: H - 60 };
    const start: View = { c: P, Z: 10.5, sx: W / 2, sy: H / 2 };
    const hero: View = { c: P, Z: 15.2, sx: W / 2, sy: H / 2 - (mobile ? 30 : 0) };
    const pair = (i: number) => fit([P, NEARBY_PLACES[i]], full, 0.5, 15.3, mobile ? 40 : 30);
    const overview = fit([P, ...NEARBY_PLACES], finaleArea, mobile ? 0.62 : 0.66, 15, mobile ? 0 : 20);

    if (t < OPEN) return lerpView(start, hero, easeInOut(t / OPEN), 0);
    if (t < T_FINALE) {
        const i = Math.floor((t - OPEN) / PER);
        const k = t - OPEN - i * PER;
        const from = i === 0 ? hero : pair(i - 1);
        return k < MOVE ? lerpView(from, pair(i), easeInOut(k / MOVE), 0.7) : pair(i);
    }
    if (t < T_END) return lerpView(pair(N - 1), overview, easeInOut((t - T_FINALE) / FINAL_MOVE), 0.5);
    return overview;
}

/** Which place the movie is on: -1 opening, 0..N-1 a place, N finale. */
const stepAt = (t: number) => (t < OPEN ? -1 : t < T_FINALE ? Math.floor((t - OPEN) / PER) : N);

/** "سند زايد قريبة من إيه؟" — a short film from the project to each nearby place, then all of them together. */
export default function NearbyMap({ onPlan, onHome }: { onPlan: () => void; onHome: () => void }) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const heroPin = useRef<HTMLDivElement>(null);
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
        t0.current = performance.now();
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

            const [px, py] = tiles.project(P, v.c, Z, v.sx, v.sy);
            NEARBY_PLACES.forEach((p, i) => {
                const [qx, qy] = tiles.project(p, v.c, Z, v.sx, v.sy);
                const slot = OPEN + i * PER;
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
    }, []);

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
                        <button className={s.nearReplay} onClick={replay}>
                            ↻ إعادة العرض
                        </button>
                        <p className={s.nearNote}>المسافات والأوقات حسب أفضل مسار في Google Maps في الظروف العادية، وقد تختلف حسب حركة المرور.</p>
                        <button className={s.nearCta} onClick={onPlan}>
                            استكشف المخطط التفاعلي
                        </button>
                    </motion.aside>
                )}
            </AnimatePresence>

            <div className={s.mapCredit}>{TILE_CREDIT} · المسافة والوقت: Google Maps</div>
        </motion.div>
    );
}
