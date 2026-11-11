"use client";

/**
 * Visitor journey on the interactive plan: what a prospective buyer looked at, for how long, and
 * where they came from. Kept in this browser only (localStorage) and sent along with an enquiry so
 * the sales team calls already knowing what the buyer wants. Also forwards key moments to the
 * Meta Pixel when one is configured.
 */

export type JourneyEvent =
    | { type: "unit_view"; unit: string; ms?: number }
    | { type: "brochure"; unit: string }
    | { type: "tour"; unit: string }
    | { type: "share"; unit: string }
    | { type: "compare"; unit: string }
    | { type: "view_3d" }
    | { type: "nearby_movie"; complete: boolean }
    | { type: "panel"; panel: string }
    | { type: "contact"; channel: "whatsapp" | "call"; unit?: string }
    | { type: "enquiry_start" }
    | { type: "enquiry_sent"; units: string[] };

type Stored = JourneyEvent & { t: number; v: number };

export interface JourneySummary {
    visitorId: string;
    visits: number;
    firstSeen: string;
    lastSeen: string;
    minutes: number;
    device: "mobile" | "desktop";
    source: { referrer: string; utm: Record<string, string> } | null;
    units: { id: string; views: number; seconds: number; brochure: boolean; tour: boolean; shared: boolean }[];
    used3D: boolean;
    nearbyMovie: "none" | "partial" | "complete";
    panels: string[];
    contacts: { whatsapp: number; call: number };
}

const KEY = "sz_journey_v1";
const MAX_EVENTS = 300;

type State = { id: string; visits: number; first: number; last: number; source: JourneySummary["source"]; events: Stored[] };

function load(): State | null {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? (JSON.parse(raw) as State) : null;
    } catch {
        return null;
    }
}
function save(st: State) {
    try {
        localStorage.setItem(KEY, JSON.stringify(st));
    } catch {
        /* storage full or blocked: the journey is a nice-to-have */
    }
}

let state: State | null = null;
let visitStarted = false;

/** Call once when the page opens: starts (or resumes) the visitor record and counts the visit. */
export function startVisit() {
    if (typeof window === "undefined" || visitStarted) return;
    visitStarted = true;
    const now = Date.now();
    state = load() ?? {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(now) + Math.random().toString(16).slice(2),
        visits: 0,
        first: now,
        last: now,
        source: null,
        events: [],
    };
    state.visits += 1;
    state.last = now;
    // Keep the first source we saw (the ad or link that brought them), but refresh it if this visit has UTM tags.
    const q = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"]) {
        const v = q.get(k);
        if (v) utm[k] = v.slice(0, 120);
    }
    if (!state.source || Object.keys(utm).length) state.source = { referrer: document.referrer.slice(0, 200), utm };
    save(state);
}

export function track(e: JourneyEvent) {
    if (typeof window === "undefined") return;
    if (!state) startVisit();
    if (!state) return;
    state.events.push({ ...e, t: Date.now(), v: state.visits } as Stored);
    if (state.events.length > MAX_EVENTS) state.events = state.events.slice(-MAX_EVENTS);
    state.last = Date.now();
    save(state);
    pixelFor(e);
}

/** Starts timing a unit view; returns a function that records the view with its duration. */
const lastViewSent = new Map<string, number>();

export function beginUnitView(unit: string) {
    const t0 = Date.now();
    // one ViewContent per unit within a few seconds (reopening, or React's dev double-run)
    if (t0 - (lastViewSent.get(unit) ?? 0) > 5000) {
        lastViewSent.set(unit, t0);
        pixel("ViewContent", { content_ids: [unit], content_type: "product", content_name: unit, content_category: "Sanad Zayed unit" });
    }
    return () => {
        const ms = Date.now() - t0;
        if (ms > 800) track({ type: "unit_view", unit, ms });
    };
}

export function journeySummary(): JourneySummary | null {
    const st = state ?? load();
    if (!st) return null;
    const units = new Map<string, JourneySummary["units"][number]>();
    const u = (id: string) => {
        if (!units.has(id)) units.set(id, { id, views: 0, seconds: 0, brochure: false, tour: false, shared: false });
        return units.get(id)!;
    };
    let used3D = false;
    let nearby: JourneySummary["nearbyMovie"] = "none";
    const panels = new Set<string>();
    const contacts = { whatsapp: 0, call: 0 };
    for (const e of st.events) {
        if (e.type === "unit_view") {
            const x = u(e.unit);
            x.views += 1;
            x.seconds += Math.round((e.ms ?? 0) / 1000);
        } else if (e.type === "brochure") u(e.unit).brochure = true;
        else if (e.type === "tour") u(e.unit).tour = true;
        else if (e.type === "share") u(e.unit).shared = true;
        else if (e.type === "view_3d") used3D = true;
        else if (e.type === "nearby_movie") nearby = e.complete ? "complete" : nearby === "complete" ? nearby : "partial";
        else if (e.type === "panel") panels.add(e.panel);
        else if (e.type === "contact") contacts[e.channel] += 1;
    }
    const sorted = [...units.values()].sort((a, b) => b.seconds - a.seconds || b.views - a.views).slice(0, 15);
    return {
        visitorId: st.id,
        visits: st.visits,
        firstSeen: new Date(st.first).toISOString(),
        lastSeen: new Date(st.last).toISOString(),
        minutes: Math.round((st.last - st.first) / 60000),
        device: window.innerWidth < 760 ? "mobile" : "desktop",
        source: st.source,
        units: sorted,
        used3D,
        nearbyMovie: nearby,
        panels: [...panels],
        contacts,
    };
}

// ---------------------------------------------------------------- Meta Pixel

declare global {
    interface Window {
        fbq?: (...args: unknown[]) => void;
    }
}

export function pixel(event: string, params?: Record<string, unknown>, custom = false) {
    try {
        if (typeof window !== "undefined" && window.fbq) window.fbq(custom ? "trackCustom" : "track", event, params ?? {});
    } catch {
        /* tracking must never break the page */
    }
}

function pixelFor(e: JourneyEvent) {
    switch (e.type) {
        case "brochure":
            return pixel("DownloadBrochure", { content_ids: [e.unit] }, true);
        case "tour":
            return pixel("UnitTour3D", { content_ids: [e.unit] }, true);
        case "share":
            return pixel("ShareUnit", { content_ids: [e.unit] }, true);
        case "compare":
            return pixel("CompareUnit", { content_ids: [e.unit] }, true);
        case "view_3d":
            return pixel("View3D", {}, true);
        case "nearby_movie":
            return e.complete ? pixel("WatchNearby", {}, true) : undefined;
        case "contact":
            return pixel("Contact", { method: e.channel, content_ids: e.unit ? [e.unit] : [] });
        case "enquiry_start":
            return pixel("InitiateCheckout", { content_category: "Sanad Zayed enquiry" });
        case "enquiry_sent":
            return pixel("Lead", { content_ids: e.units, content_category: "Sanad Zayed unit" });
        default:
            return undefined;
    }
}
