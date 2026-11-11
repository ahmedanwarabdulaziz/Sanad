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
