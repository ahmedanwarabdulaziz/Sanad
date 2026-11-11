/**
 * Automatic, to-scale furniture layout for the unit plans (2D) and the unit tour (3D).
 * Every piece is an axis-aligned box inside the room's largest clear rectangle; the "back"
 * pieces (bed head, sofa, toilet) go against the wall farthest from the room's door.
 */
import type { Plan, Pt, Room } from "./data";

export type FurnitureKind =
    | "bed"
    | "pillow"
    | "nightstand"
    | "sofa"
    | "armchair"
    | "coffee"
    | "dining"
    | "chair"
    | "counter"
    | "sink"
    | "stove"
    | "toilet"
    | "basin"
    | "shower"
    | "wardrobe"
    | "outdoorTable"
    | "rug"
    | "tv";

export interface Piece {
    kind: FurnitureKind;
    x: number;
    y: number;
    w: number;
    h: number;
    /** Height in metres for the 3D tour. */
    z: number;
    round?: boolean;
}

type Side = "top" | "bottom" | "left" | "right";
type Rect = { x0: number; y0: number; x1: number; y1: number };

const HEIGHT: Record<FurnitureKind, number> = {
    bed: 0.5,
    pillow: 0.62,
    nightstand: 0.5,
    sofa: 0.8,
    armchair: 0.8,
    coffee: 0.42,
    dining: 0.76,
    chair: 0.9,
    counter: 0.9,
    sink: 0.92,
    stove: 0.92,
    toilet: 0.45,
    basin: 0.85,
    shower: 0.05,
    wardrobe: 2.2,
    outdoorTable: 0.7,
    rug: 0.01,
    tv: 0.55,
};

const len = (r: Rect, s: Side) => (s === "top" || s === "bottom" ? r.x1 - r.x0 : r.y1 - r.y0);
const depth = (r: Rect, s: Side) => (s === "top" || s === "bottom" ? r.y1 - r.y0 : r.x1 - r.x0);
const opposite: Record<Side, Side> = { top: "bottom", bottom: "top", left: "right", right: "left" };
const perp = (s: Side): [Side, Side] => (s === "top" || s === "bottom" ? ["left", "right"] : ["top", "bottom"]);

/** A box of `along × deep` against side `s`, centred at fraction `t` along it, `gap` m off the wall. */
function place(r: Rect, s: Side, along: number, deep: number, kind: FurnitureKind, t = 0.5, gap = 0, round = false): Piece {
    const L = len(r, s);
    const start = Math.max(0, Math.min(L - along, L * t - along / 2));
    let x: number, y: number, w: number, h: number;
    if (s === "top" || s === "bottom") {
        w = along;
        h = deep;
        x = r.x0 + start;
        y = s === "top" ? r.y0 + gap : r.y1 - gap - deep;
    } else {
        w = deep;
        h = along;
        y = r.y0 + start;
        x = s === "left" ? r.x0 + gap : r.x1 - gap - deep;
    }
    return { kind, x, y, w, h, z: HEIGHT[kind], round };
}

function sideDistance(r: Rect, s: Side, p: Pt) {
    if (s === "top") return Math.abs(p[1] - r.y0);
    if (s === "bottom") return Math.abs(p[1] - r.y1);
    if (s === "left") return Math.abs(p[0] - r.x0);
    return Math.abs(p[0] - r.x1);
}

/** The wall farthest from the door, among those long enough for `minLen` with `minDepth` room in front. */
function backWall(r: Rect, door: Pt | null, minLen: number, minDepth: number): Side | null {
    const sides: Side[] = ["top", "bottom", "left", "right"];
    const ok = sides.filter((s) => len(r, s) >= minLen && depth(r, s) >= minDepth);
    if (!ok.length) return null;
    if (!door) return ok.sort((a, b) => len(r, b) - len(r, a))[0];
    return ok.sort((a, b) => sideDistance(r, b, door) - sideDistance(r, a, door))[0];
}

function sub(r: Rect, s: Side, from: number, to: number): Rect {
    // slice of the rect measured inward from side s, between `from` and `to` metres
    if (s === "top") return { ...r, y0: r.y0 + from, y1: r.y0 + to };
    if (s === "bottom") return { ...r, y0: r.y1 - to, y1: r.y1 - from };
    if (s === "left") return { ...r, x0: r.x0 + from, x1: r.x0 + to };
    return { ...r, x0: r.x1 - to, x1: r.x1 - from };
}

function bedroom(r: Rect, door: Pt | null): Piece[] {
    const s = backWall(r, door, 2.2, 2.6);
    if (!s) return [];
    const L = len(r, s);
    const bw = L >= 2.9 ? 1.6 : 1.2;
    const bed = place(r, s, bw, 2.0, "bed");
    const out: Piece[] = [bed];
    // pillows
    const pw = bw >= 1.6 ? 0.62 : 0.9;
    if (bw >= 1.6) {
        out.push(place(r, s, pw, 0.32, "pillow", 0.5 - 0.42 / L, 0.08), place(r, s, pw, 0.32, "pillow", 0.5 + 0.42 / L, 0.08));
    } else out.push(place(r, s, pw, 0.32, "pillow", 0.5, 0.08));
    if (L >= bw + 1.1) {
        const off = (bw / 2 + 0.3) / L;
        out.push(place(r, s, 0.45, 0.4, "nightstand", 0.5 - off), place(r, s, 0.45, 0.4, "nightstand", 0.5 + off));
    }
    // wardrobe on the wall opposite the bed head if there is room in front of it
    const o = opposite[s];
    if (depth(r, s) >= 3.2 && len(r, o) >= 1.8) out.push(place(r, o, Math.min(2.4, len(r, o) - 0.9), 0.6, "wardrobe", door && sideDistance(r, o, door) < 1 ? 0.25 : 0.5));
    return out;
}

function lounge(r: Rect, door: Pt | null): Piece[] {
    const s = backWall(r, door, 2.4, 2.6);
    if (!s) return [];
    const out: Piece[] = [];
    const D = depth(r, s);
    const zone = D >= 5.4 ? sub(r, s, 0, D * 0.55) : r;
    const L = len(zone, s);
    const sofaL = Math.min(2.6, L - 0.6);
    out.push(place(zone, s, Math.min(3.2, L - 0.2), Math.min(2.6, depth(zone, s) - 0.2), "rug", 0.5, 0.35));
    out.push(place(zone, s, sofaL, 0.9, "sofa"));
    out.push(place(zone, s, Math.min(1.2, sofaL * 0.5), 0.6, "coffee", 0.5, 1.35));
    if (L >= sofaL + 1.9 && depth(zone, s) >= 2.6) {
        const [a, b] = perp(s);
        out.push(place(zone, a, 0.8, 0.8, "armchair", 0.55, 0.25), place(zone, b, 0.8, 0.8, "armchair", 0.55, 0.25));
    }
    const o = opposite[s];
    if (depth(zone, s) >= 3.0) out.push(place(zone, o, 1.6, 0.4, "tv", 0.5, D >= 5.4 ? 0.1 : 0));
    if (D >= 5.4) {
        const dz = sub(r, s, D * 0.6, D);
        const dl = Math.min(1.8, len(dz, s) - 1.4);
        const dd = 0.95;
        if (dl >= 1.2 && depth(dz, s) >= 2.4) {
            const midGap = (depth(dz, s) - dd) / 2;
            const table = place(dz, s, dl, dd, "dining", 0.5, midGap);
            out.push(table);
            const n = dl >= 1.6 ? 3 : 2;
            for (let i = 0; i < n; i++) {
                const t = 0.5 + ((i - (n - 1) / 2) * (dl / n)) / len(dz, s);
                out.push(place(dz, s, 0.45, 0.45, "chair", t, midGap - 0.5), place(dz, s, 0.45, 0.45, "chair", t, midGap + dd + 0.05));
            }
        }
    }
    return out;
}

function kitchen(r: Rect, door: Pt | null): Piece[] {
    const sides: Side[] = ["top", "bottom", "left", "right"];
    const s = sides
        .filter((x) => depth(r, x) >= 1.4)
        .sort((a, b) => len(r, b) - len(r, a) + (door ? (sideDistance(r, b, door) - sideDistance(r, a, door)) * 0.3 : 0))[0];
    if (!s) return [];
    const L = len(r, s);
    const out: Piece[] = [place(r, s, L, 0.6, "counter")];
    out.push(place(r, s, 0.6, 0.5, "sink", 0.35, 0.05), place(r, s, 0.6, 0.5, "stove", 0.72, 0.05));
    const [a, b] = perp(s);
    const leg = [a, b].sort((x, y) => (door ? sideDistance(r, y, door) - sideDistance(r, x, door) : 0))[0];
    if (depth(r, s) >= 2.2 && len(r, leg) >= 1.8) {
        const legLen = Math.min(len(r, leg) - 1.0, 2.0);
        const p = place(r, leg, legLen, 0.6, "counter", s === "top" || s === "left" ? 0 : 1);
        out.push(p);
    }
    return out;
}

function bathroom(r: Rect, door: Pt | null): Piece[] {
    const s = backWall(r, door, 0.8, 1.1);
    if (!s) return [];
    const out: Piece[] = [];
    const L = len(r, s);
    const big = L >= 1.6 && depth(r, s) >= 1.6;
    out.push(place(r, s, 0.42, 0.62, "toilet", big ? 0.25 : 0.5));
    const [a] = perp(s);
    if (len(r, a) >= 1.4) out.push(place(r, a, 0.55, 0.42, "basin", 0.75));
    if (big) out.push(place(r, s, 0.9, 0.9, "shower", 0.78));
    return out;
}

function dressing(r: Rect): Piece[] {
    const sides: Side[] = ["top", "bottom", "left", "right"];
    const s = sides.sort((a, b) => len(r, b) - len(r, a))[0];
    const out: Piece[] = [place(r, s, len(r, s), 0.55, "wardrobe")];
    if (depth(r, s) >= 1.8) out.push(place(r, opposite[s], len(r, s), 0.55, "wardrobe"));
    return out;
}

function balcony(r: Rect): Piece[] {
    const w = r.x1 - r.x0;
    const h = r.y1 - r.y0;
    if (Math.min(w, h) < 1.15 || Math.max(w, h) < 1.9) return [];
    const cx = (r.x0 + r.x1) / 2;
    const cy = (r.y0 + r.y1) / 2;
    const horiz = w >= h;
    const t: Piece = { kind: "outdoorTable", x: cx - 0.3, y: cy - 0.3, w: 0.6, h: 0.6, z: HEIGHT.outdoorTable, round: true };
    const c1: Piece = horiz
        ? { kind: "chair", x: cx - 0.85, y: cy - 0.23, w: 0.46, h: 0.46, z: HEIGHT.chair }
        : { kind: "chair", x: cx - 0.23, y: cy - 0.85, w: 0.46, h: 0.46, z: HEIGHT.chair };
    const c2: Piece = horiz ? { ...c1, x: cx + 0.39 } : { ...c1, y: cy + 0.39 };
    return [t, c1, c2];
}

export function roomFurniture(room: Room & { rect?: [number, number, number, number]; door?: Pt | null }): Piece[] {
    if (!room.rect) return [];
    const [x0, y0, x1, y1] = room.rect;
    const r: Rect = { x0, y0, x1, y1 };
    const door = room.door ?? null;
    switch (room.type) {
        case "bed":
            return bedroom(r, door);
        case "liv":
            return lounge(r, door);
        case "kit":
            return kitchen(r, door);
        case "bath":
            return bathroom(r, door);
        case "dress":
            return dressing(r);
        case "balc":
            return balcony(r);
        default:
            return [];
    }
}

export function planFurniture(plan: Plan): Piece[] {
    return plan.rooms.flatMap((r) => roomFurniture(r as Room & { rect?: [number, number, number, number]; door?: Pt | null }));
}
