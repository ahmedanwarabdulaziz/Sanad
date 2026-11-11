"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { PROJECT_LOCATION } from "@/lib/sanad-zayed/masterplan/data";
import { TILE_CREDIT, clamp01, createTileLayer, easeInOut, fitCanvas, MAX_LEVEL } from "./mapTiles";
import s from "./masterplan.module.css";

/** Fly-in on satellite imagery from Egypt down onto the plot, before the plan opens. */
const Z_START = 5;
const Z_END = 17.6;
const FLY_MS = 6000;
const HOLD_MS = 800;

export default function MapZoom({ onDone }: { onDone: () => void }) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const capEgypt = useRef<HTMLDivElement>(null);
    const capCity = useRef<HTMLDivElement>(null);
    const capLand = useRef<HTMLDivElement>(null);
    const pin = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const cv = canvas.current!;
        const g = cv.getContext("2d")!;
        const tiles = createTileLayer();
        tiles.warm(PROJECT_LOCATION, 14, MAX_LEVEL, 2, 3);
        let raf = 0;
        let done = false;
        const t0 = performance.now();
        const draw = (now: number) => {
            const { W, H } = fitCanvas(cv, g);
            const t = clamp01((now - t0) / FLY_MS);
            const Z = Z_START + (Z_END - Z_START) * easeInOut(t);
            tiles.draw(g, W, H, PROJECT_LOCATION, Z);
            const band = (a: number, b: number) => clamp01(Math.min((Z - a) / 0.8, (b - Z) / 0.8));
            if (capEgypt.current) capEgypt.current.style.opacity = String(band(Z_START - 1, 8.6));
            if (capCity.current) capCity.current.style.opacity = String(band(8.6, 13.2));
            if (capLand.current) capLand.current.style.opacity = String(clamp01((Z - 15.8) / 1));
            if (pin.current) {
                pin.current.style.transform = `translate(${W / 2}px, ${H / 2}px)`;
                pin.current.style.opacity = String(clamp01((Z - 14.5) / 1.2));
            }
            if (t >= 1 && !done) {
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
