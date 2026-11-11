"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { PROJECT_AREA, PROJECT_LOCATION } from "@/lib/sanad-zayed/masterplan/data";
import { TILE_CREDIT, clamp01, createTileLayer, drawArea, easeInOut, fitCanvas, MAX_LEVEL } from "./mapTiles";
import s from "./masterplan.module.css";

/**
 * Fly-in on satellite imagery: Egypt → Sheikh Zayed → a pause on the project's area (the triangle
 * draws itself) → down onto the plot, before the plan opens.
 */
const Z_START = 5;
const Z_AREA = 12.5;
const Z_END = 17.6;
const T1 = 3400; // Egypt → city
const T2 = 2000; // pause on the area
const T3 = 3000; // dive onto the plot
const HOLD_MS = 800;

/** Centre of the triangle, so the pause frames the whole area. */
const AREA_C = {
    lat: PROJECT_AREA.polygon.reduce((a, p) => a + p.lat, 0) / PROJECT_AREA.polygon.length,
    lng: PROJECT_AREA.polygon.reduce((a, p) => a + p.lng, 0) / PROJECT_AREA.polygon.length,
};

export default function MapZoom({ onDone }: { onDone: () => void }) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const capEgypt = useRef<HTMLDivElement>(null);
    const capCity = useRef<HTMLDivElement>(null);
    const capArea = useRef<HTMLDivElement>(null);
    const capLand = useRef<HTMLDivElement>(null);
    const pin = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const cv = canvas.current!;
        const g = cv.getContext("2d")!;
        const tiles = createTileLayer();
        tiles.warm(AREA_C, 11, 13, 3, 3);
        tiles.warm(PROJECT_LOCATION, 14, MAX_LEVEL, 2, 3);
        let raf = 0;
        let done = false;
        const t0 = performance.now();
        const draw = (now: number) => {
            const { W, H } = fitCanvas(cv, g);
            const t = now - t0;
            let Z: number;
            let c = { lat: PROJECT_LOCATION.lat, lng: PROJECT_LOCATION.lng };
            // zoom out a little more on phones so the whole triangle fits the narrow screen
            const zArea = Z_AREA - (W < 760 ? 0.6 : 0);
            if (t < T1) {
                const e = easeInOut(t / T1);
                Z = Z_START + (zArea - Z_START) * e;
                c = { lat: c.lat + (AREA_C.lat - c.lat) * e, lng: c.lng + (AREA_C.lng - c.lng) * e };
            } else if (t < T1 + T2) {
                Z = zArea + 0.25 * ((t - T1) / T2);
                c = AREA_C;
            } else {
                const e = easeInOut(clamp01((t - T1 - T2) / T3));
                Z = zArea + 0.25 + (Z_END - zArea - 0.25) * e;
                c = { lat: AREA_C.lat + (PROJECT_LOCATION.lat - AREA_C.lat) * e, lng: AREA_C.lng + (PROJECT_LOCATION.lng - AREA_C.lng) * e };
            }
            tiles.draw(g, W, H, c, Z);

            const pts = PROJECT_AREA.polygon.map((p) => tiles.project(p, c, Z, W / 2, H / 2));
            const reveal = clamp01((t - T1 + 500) / 1500);
            const fade = t < T1 + T2 ? clamp01((t - T1 + 700) / 500) : 1 - clamp01((t - T1 - T2) / 1400);
            drawArea(g, pts, reveal, fade, now, reveal);

            const band = (a: number, b: number) => clamp01(Math.min((Z - a) / 0.8, (b - Z) / 0.8));
            if (capEgypt.current) capEgypt.current.style.opacity = String(band(Z_START - 1, 8.6));
            if (capCity.current) capCity.current.style.opacity = String(t < T1 ? band(8.6, 30) * (1 - clamp01((t - T1 + 600) / 400)) : 0);
            if (capArea.current) capArea.current.style.opacity = String(t < T1 - 200 ? 0 : t < T1 + T2 ? clamp01((t - T1 + 200) / 500) : 1 - clamp01((t - T1 - T2) / 600));
            if (capLand.current) capLand.current.style.opacity = String(clamp01((Z - 15.8) / 1));
            if (pin.current) {
                const [px, py] = tiles.project(PROJECT_LOCATION, c, Z, W / 2, H / 2);
                pin.current.style.transform = `translate(${px}px, ${py}px)`;
                pin.current.style.opacity = String(t > T1 - 300 ? 1 : clamp01((Z - 14.5) / 1.2));
            }
            if (t >= T1 + T2 + T3 && !done) {
                done = true;
                setTimeout(onDone, HOLD_MS);
            }
            raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(raf);
    }, [onDone]);

    return (
        <motion.div
            className={s.mapScreen}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.12, filter: "blur(4px)" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
        >
            <canvas ref={canvas} className={s.mapCanvas} />
            <div className={s.mapVignette} />
            <div className={s.mapCaption} ref={capEgypt}>
                <span>جمهورية مصر العربية</span>
            </div>
            <div className={s.mapCaption} ref={capCity}>
                <span>الجيزة · مدينة الشيخ زايد</span>
            </div>
            <div className={s.mapCaption} ref={capArea}>
                <span>{PROJECT_AREA.title}</span>
                <small>{PROJECT_AREA.subtitle}</small>
            </div>
            <div className={s.mapCaption} ref={capLand} style={{ top: "auto", bottom: "17%" }}>
                <span>أرض مشروع سند زايد</span>
                <small>{PROJECT_LOCATION.address}</small>
            </div>
            <div className={s.mapMarker} ref={pin} aria-hidden="true">
                <span className={s.mapPulse} />
                <span className={s.mapDot} />
            </div>
            <button className={s.introSkip} onClick={onDone}>
                تخطي ←
            </button>
            <div className={s.mapCredit}>{TILE_CREDIT}</div>
        </motion.div>
    );
}
