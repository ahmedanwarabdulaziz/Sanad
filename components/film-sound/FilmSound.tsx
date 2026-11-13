"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useSyncExternalStore } from "react";
import { filmMusic } from "@/lib/filmMusic";
import s from "./filmSound.module.css";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Re-renders when the music starts or the visitor mutes/unmutes. */
function useMusicState() {
    const muted = useSyncExternalStore(
        (fn) => filmMusic.subscribe(fn),
        () => filmMusic.muted,
        () => false
    );
    const started = useSyncExternalStore(
        (fn) => filmMusic.subscribe(fn),
        () => filmMusic.started,
        () => false
    );
    return { muted, started };
}

/** Fades the film music in while `active`, out otherwise (and out when the page goes away). */
export function useFilmMusic(active: boolean) {
    useEffect(() => {
        if (filmMusic.started) filmMusic.setActive(active);
    }, [active]);
    useEffect(() => () => filmMusic.setActive(false), []);
}

/**
 * The «ابدأ» screen at the start of every film. Pressing it is the visitor's gesture that lets the
 * browser play sound, so the film and its music begin together.
 */
export function StartGate({ open, title, subtitle, onStart }: { open: boolean; title: string; subtitle?: string; onStart: () => void }) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className={s.gate}
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.9, ease: "easeInOut" } }}
                    role="dialog"
                    aria-label={title}
                >
                    <motion.div className={s.gateCenter} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.9, ease: EASE }}>
                        <span className={s.gateMark} aria-hidden />
                        <strong className={s.gateTitle}>{title}</strong>
                        {subtitle && <span className={s.gateSub}>{subtitle}</span>}
                        {/* a round play button: a fine gold ring, a slowly turning dotted halo, the word under it */}
                        <button
                            className={s.gatePlay}
                            onClick={() => {
                                void filmMusic.start();
                                onStart();
                            }}
                            aria-label="ابدأ"
                        >
                            <span className={s.gateHalo} aria-hidden />
                            <span className={s.gateRing} aria-hidden>
                                <svg viewBox="0 0 24 24">
                                    <path d="M9.5 7.2v9.6L17 12z" />
                                </svg>
                            </span>
                            <span className={s.gateWord}>ابدأ</span>
                        </button>
                        <span className={s.gateNote}>
                            <svg viewBox="0 0 24 24" aria-hidden>
                                <path d="M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
                            </svg>
                            العرض بموسيقى
                        </span>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/**
 * A small speaker button to mute or unmute the film music; the choice is remembered. `visible` hides
 * it where no music plays (e.g. the 2D plan), so it never sits on that screen's own controls.
 */
export function SoundToggle({ className, visible = true }: { className?: string; visible?: boolean }) {
    const { muted, started } = useMusicState();
    if (!started || !visible) return null;
    return (
        <motion.button
            className={className ? `${s.toggle} ${className}` : s.toggle}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => {
                e.stopPropagation();
                filmMusic.setMuted(!muted);
            }}
            aria-label={muted ? "تشغيل الموسيقى" : "كتم الموسيقى"}
            title={muted ? "تشغيل الموسيقى" : "كتم الموسيقى"}
        >
            <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M4 9h4l5-4v14l-5-4H4z" />
                {muted ? <path d="M16 9.5l5 5M21 9.5l-5 5" /> : <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />}
            </svg>
        </motion.button>
    );
}
