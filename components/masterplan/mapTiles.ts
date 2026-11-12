/**
 * Minimal slippy-map renderer for the satellite scenes (fly-in and "nearby" map).
 * Tiles: Esri World Imagery, credited on screen. Supports fractional zoom for smooth flights.
 */

export type LatLng = { lat: number; lng: number };

const TILE = (z: number, x: number, y: number) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
export const MAX_LEVEL = 18;
export const TILE_CREDIT = "صور القمر الصناعي: Esri, Maxar, Earthstar Geographics";

export const lonToX = (lon: number, z: number) => ((lon + 180) / 360) * 256 * 2 ** z;
export const latToY = (lat: number, z: number) => {
    const r = (lat * Math.PI) / 180;
    return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 256 * 2 ** z;
};
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function createTileLayer() {
    const cache = new Map<string, HTMLImageElement>();
    const get = (z: number, x: number, y: number) => {
        const n = 2 ** z;
        if (y < 0 || y >= n) return null;
        const xx = ((x % n) + n) % n;
        const url = TILE(z, xx, y);
        let img = cache.get(url);
        if (!img) {
            img = new Image();
            img.decoding = "async";
            img.src = url;
            cache.set(url, img);
        }
        return img.complete && img.naturalWidth ? img : null;
    };

    /** Start loading tiles around a point for a range of zoom levels. */
    const warm = (pt: LatLng, z0: number, z1: number, rx = 2, ry = 3) => {
        for (let z = z0; z <= z1; z++) {
            const cx = Math.floor(lonToX(pt.lng, z) / 256);
            const cy = Math.floor(latToY(pt.lat, z) / 256);
            for (let dx = -rx; dx <= rx; dx++) for (let dy = -ry; dy <= ry; dy++) get(z, cx + dx, cy + dy);
        }
    };

    /** Draw the map so that `center` sits at screen point (sx, sy) at fractional zoom Z. */
    const draw = (g: CanvasRenderingContext2D, W: number, H: number, center: LatLng, Z: number, sx = W / 2, sy = H / 2) => {
        g.fillStyle = "#0B1322";
        g.fillRect(0, 0, W, H);
        const top = Math.min(MAX_LEVEL, Math.floor(Z));
        // coarser levels first so there is never a hole while finer tiles load
        for (let L = Math.max(2, top - 4); L <= top; L++) {
            const sc = 2 ** (Z - L);
            const px = lonToX(center.lng, L);
            const py = latToY(center.lat, L);
            const x0 = Math.floor((px - sx / sc) / 256);
            const x1 = Math.floor((px + (W - sx) / sc) / 256);
            const y0 = Math.floor((py - sy / sc) / 256);
            const y1 = Math.floor((py + (H - sy) / sc) / 256);
            for (let x = x0; x <= x1; x++)
                for (let y = y0; y <= y1; y++) {
                    const img = get(L, x, y);
                    if (img) g.drawImage(img, sx + (x * 256 - px) * sc, sy + (y * 256 - py) * sc, 256 * sc + 0.6, 256 * sc + 0.6);
                }
        }
    };

    /** Screen position of a point when `center` is drawn at (sx, sy) with zoom Z. */
    const project = (pt: LatLng, center: LatLng, Z: number, sx: number, sy: number) =>
        [sx + lonToX(pt.lng, Z) - lonToX(center.lng, Z), sy + latToY(pt.lat, Z) - latToY(center.lat, Z)] as const;

    return { get, warm, draw, project };
}

/** A camera: `c` drawn at screen point (sx, sy) with fractional zoom Z. */
export type View = { c: LatLng; Z: number; sx: number; sy: number };
/** A screen rectangle. */
export type Rect = { x: number; y: number; w: number; h: number };

/** Zoom/centre that fit some points inside a screen rectangle (`lift` raises the centre a little). */
export function fitView(points: LatLng[], area: Rect, fill: number, maxZ = 15.3, lift = 0): View {
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

/** Camera halfway between two views; `dip` zooms out mid-flight so long moves feel like a hop. */
export function lerpView(a: View, b: View, e: number, dip: number): View {
    return {
        c: { lat: a.c.lat + (b.c.lat - a.c.lat) * e, lng: a.c.lng + (b.c.lng - a.c.lng) * e },
        Z: a.Z + (b.Z - a.Z) * e - dip * Math.sin(Math.PI * e),
        sx: a.sx + (b.sx - a.sx) * e,
        sy: a.sy + (b.sy - a.sy) * e,
    };
}

/** Sizes the canvas backing store for the device pixel ratio; returns CSS width/height. */
export function fitCanvas(cv: HTMLCanvasElement, g: CanvasRenderingContext2D) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth;
    const H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { W, H };
}

/**
 * Highlighted area: soft gold fill plus a glowing border that draws itself around the perimeter.
 * `reveal` 0..1 is how much of the border is drawn; `alpha` scales the whole highlight.
 */
export function drawArea(
    g: CanvasRenderingContext2D,
    pts: readonly (readonly [number, number])[],
    reveal: number,
    alpha: number,
    now: number,
    dim = 0,
    corners?: readonly number[]
) {
    if (alpha <= 0.01 || pts.length < 3) return;
    const W = g.canvas.width;
    const H = g.canvas.height;
    g.save();
    // spotlight: darken everything outside the area
    if (dim > 0) {
        g.save();
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.beginPath();
        g.rect(0, 0, W, H);
        g.restore();
        pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.closePath();
        g.fillStyle = `rgba(4,9,18,${0.62 * dim * alpha})`;
        g.fill("evenodd");
    }
    g.globalAlpha = alpha;
    // fill: a warm wash, stronger towards the centre
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const r = Math.max(...pts.map(([x, y]) => Math.hypot(x - cx, y - cy)));
    const k = clamp01(reveal * 1.4 - 0.4);
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(229,199,127,${0.28 * k})`);
    grad.addColorStop(1, `rgba(229,199,127,${0.1 * k})`);
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fillStyle = grad;
    g.fill();
    // corner markers
    if (k > 0) {
        for (const [x, y] of corners ? corners.map((i) => pts[i]) : pts) {
            g.beginPath();
            g.arc(x, y, 6, 0, Math.PI * 2);
            g.fillStyle = `rgba(229,199,127,${k})`;
            g.fill();
            g.lineWidth = 2;
            g.strokeStyle = `rgba(10,20,36,${k})`;
            g.stroke();
        }
    }
    // border, drawn progressively
    const segs = pts.map((p, i) => [p, pts[(i + 1) % pts.length]] as const);
    const lens = segs.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]));
    let left = lens.reduce((s, l) => s + l, 0) * reveal;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < segs.length && left > 0; i++) {
        const [a, b] = segs[i];
        const k = Math.min(1, left / lens[i]);
        g.lineTo(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k);
        left -= lens[i];
    }
    g.lineJoin = "round";
    g.lineCap = "round";
    g.strokeStyle = "rgba(10,20,36,0.55)";
    g.lineWidth = 8;
    g.stroke();
    g.strokeStyle = "#E5C77F";
    g.lineWidth = 3.5;
    g.setLineDash([16, 10]);
    g.lineDashOffset = -now / 40;
    g.shadowColor = "rgba(229,199,127,0.9)";
    g.shadowBlur = 14;
    g.stroke();
    g.restore();
}
