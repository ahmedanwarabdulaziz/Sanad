"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { bbox, fmtDims, ROOM_COLORS, type Plan, type Pt, type Room } from "@/lib/sanad-zayed/masterplan/data";
import { planFurniture, type Piece } from "@/lib/sanad-zayed/masterplan/furniture";

const ring = (pts: Pt[]) => "M" + pts.map((p) => `${p[0]},${p[1]}`).join("L") + "Z";
const FONT = "var(--font-tajawal), var(--font-cairo), sans-serif";
export const WALL = "#1F2A3A";
const INK_NAME = "#1B2B40";
const INK_DIM = "#7A5B17";

function RoomLabel({ room, scale, textRotate = 0 }: { room: Room; scale: number; textRotate?: number }) {
    const b = bbox(room.fill ?? room.poly);
    const short = Math.min(b.w, b.h);
    if (room.type === "x" || (room.type === "hall" && short < 1.6)) return null;
    // One consistent type scale: large rooms, compact rooms, tiny rooms.
    const tier = short >= 2.4 ? 0 : short >= 1.3 ? 1 : 2;
    const nameSize = [0.34, 0.25, 0.19][tier] * scale;
    const dimSize = [0.25, 0.2, 0.16][tier] * scale;
    const [x, y] = room.label;
    const name = room.name.replace(/ [1-5١-٥]$/, "");
    const gap = room.dims ? dimSize * 0.62 : 0;
    return (
        <g style={{ pointerEvents: "none" }} transform={textRotate ? `rotate(${textRotate} ${x} ${y})` : undefined}>
            <text x={x} y={y - gap + nameSize * 0.32} textAnchor="middle" fontSize={nameSize} fontWeight={800} fill={INK_NAME} stroke="#FFFDF8" strokeWidth={nameSize * 0.22} paintOrder="stroke" strokeLinejoin="round" style={{ fontFamily: FONT }}>
                {name}
            </text>
            {room.dims && (
                <text x={x} y={y + gap + dimSize * 0.55} textAnchor="middle" fontSize={dimSize} fontWeight={600} fill={INK_DIM} stroke="#FFFDF8" strokeWidth={dimSize * 0.22} paintOrder="stroke" strokeLinejoin="round" style={{ fontFamily: FONT }}>
                    {fmtDims(room.dims)}
                </text>
            )}
        </g>
    );
}


const F_STROKE = "#7D8899";
const F_W = 0.022;

function PieceShape({ p }: { p: Piece }) {
    const common = { stroke: F_STROKE, strokeWidth: F_W };
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    switch (p.kind) {
        case "rug":
            return <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={0.08} fill="#FFFFFF" fillOpacity={0.35} stroke="#B9A88A" strokeWidth={0.02} strokeDasharray="0.08 0.06" />;
        case "bed":
            return <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={0.06} fill="#FFFFFF" {...common} />;
        case "pillow":
            return <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={0.08} fill="#EEF1F6" {...common} />;
        case "sofa":
        case "armchair": {
            const t = Math.min(p.w, p.h) * 0.28;
            return (
                <g>
                    <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={0.14} fill="#D5DCE7" {...common} />
                    <rect x={p.x + t} y={p.y + t} width={Math.max(0.01, p.w - 2 * t)} height={Math.max(0.01, p.h - 2 * t)} rx={0.08} fill="#E8EDF4" {...common} />
                </g>
            );
        }
        case "toilet":
            return <ellipse cx={cx} cy={cy} rx={p.w / 2} ry={p.h / 2} fill="#FFFFFF" {...common} />;
        case "basin":
            return (
                <g>
                    <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={0.05} fill="#FFFFFF" {...common} />
                    <ellipse cx={cx} cy={cy} rx={p.w * 0.32} ry={p.h * 0.3} fill="#D8EBF5" {...common} />
                </g>
            );
        case "shower":
            return (
                <g>
                    <rect x={p.x} y={p.y} width={p.w} height={p.h} fill="#E2F2F9" {...common} />
                    <path d={`M${p.x},${p.y}L${p.x + p.w},${p.y + p.h}M${p.x + p.w},${p.y}L${p.x},${p.y + p.h}`} {...common} fill="none" />
                </g>
            );
        case "sink":
            return <rect x={p.x + 0.05} y={p.y + 0.05} width={p.w - 0.1} height={p.h - 0.1} rx={0.06} fill="#D8EBF5" {...common} />;
        case "stove":
            return (
                <g fill="none" {...common}>
                    {[0.28, 0.72].flatMap((a) => [0.3, 0.7].map((b) => <circle key={`${a}${b}`} cx={p.x + p.w * a} cy={p.y + p.h * b} r={Math.min(p.w, p.h) * 0.15} />))}
                </g>
            );
        case "counter":
            return <rect x={p.x} y={p.y} width={p.w} height={p.h} fill="#ECEFF3" {...common} />;
        case "wardrobe":
            return (
                <g>
                    <rect x={p.x} y={p.y} width={p.w} height={p.h} fill="#EADFCB" {...common} />
                    <path d={`M${p.x},${p.y}L${p.x + p.w},${p.y + p.h}`} {...common} fill="none" />
                </g>
            );
        case "outdoorTable":
            return <circle cx={cx} cy={cy} r={p.w / 2} fill="#FFFFFF" {...common} />;
        case "chair":
            return <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={0.08} fill="#E7DCCB" {...common} />;
        case "tv":
            return <rect x={p.x} y={p.y + p.h * 0.3} width={p.w} height={p.h * 0.4} fill="#3A4556" />;
        default:
            return <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={0.05} fill="#E9DFD0" {...common} />;
    }
}

export function FurnitureLayer({ plan }: { plan: Plan }) {
    const pieces = useMemo(() => planFurniture(plan), [plan]);
    return (
        <g style={{ pointerEvents: "none" }}>
            {pieces.map((p, i) => (
                <PieceShape key={i} p={p} />
            ))}
        </g>
    );
}

/** North arrow; north is the left side of the drawings. */
export function NorthArrow({ x, y, size, textRotate = 0 }: { x: number; y: number; size: number; textRotate?: number }) {
    return (
        <g transform={`translate(${x} ${y})`} style={{ pointerEvents: "none" }}>
            <circle r={size * 0.62} fill="#FFFFFF" fillOpacity={0.85} stroke="#C29B40" strokeWidth={size * 0.04} />
            <path d={`M${-size * 0.48},0L${size * 0.2},${-size * 0.2}L${size * 0.06},0L${size * 0.2},${size * 0.2}Z`} fill="#1F2A3A" />
            <text x={size * 0.36} y={size * 0.12} transform={textRotate ? `rotate(${textRotate} ${size * 0.36} 0)` : undefined} fontSize={size * 0.34} fontWeight={800} fill="#1F2A3A" textAnchor="middle" style={{ fontFamily: FONT }}>
                N
            </text>
        </g>
    );
}

/** The same drawing as a plain <g>, for placing every unit on the 2D site plan. */
export function PlanLayers({
    plan,
    labels,
    textScale = 1,
    furniture = false,
    textRotate = 0,
}: {
    plan: Plan;
    labels: boolean;
    textScale?: number;
    furniture?: boolean;
    textRotate?: number;
}) {
    const wallPath = useMemo(() => plan.walls.map(ring).join(""), [plan]);
    return (
        <g>
            <path d={ring(plan.footprint)} fill="#F7F3EC" />
            {plan.rooms.map((r, i) => (
                <path key={i} d={ring(r.fill ?? r.poly)} fill={r.type === "x" ? ROOM_COLORS.hall : ROOM_COLORS[r.type]} />
            ))}
            <path d={ring(plan.footprint)} fill="none" stroke="#7FB3D5" strokeWidth={0.1} />
            <path d={wallPath} fill={WALL} fillRule="evenodd" />
            <g fill="none" stroke="#4A5A70" strokeWidth={0.025}>
                {plan.doors.map((p, i) => (
                    <path key={i} d={p} />
                ))}
            </g>
            {furniture && <FurnitureLayer plan={plan} />}
            {labels && plan.rooms.map((r, i) => <RoomLabel key={i} room={r} scale={textScale} textRotate={textRotate} />)}
        </g>
    );
}

/**
 * Architectural unit plan: straightened room fills, solid walls with a single consistent weight,
 * the CAD's door swings, glazing along the outline, and room names with clear dimensions.
 */
export default function UnitPlan({
    plan,
    hotRoom,
    onHotRoom,
    animate = true,
    labels = true,
    textScale = 1,
    furniture = false,
    north = true,
}: {
    plan: Plan;
    hotRoom?: number | null;
    onHotRoom?: (i: number | null) => void;
    animate?: boolean;
    labels?: boolean;
    textScale?: number;
    furniture?: boolean;
    north?: boolean;
}) {
    const fb = bbox(plan.footprint);
    const pad = 0.7;
    const [localHot, setLocalHot] = useState<number | null>(null);
    const hot = hotRoom ?? localHot;
    const setHot = (i: number | null) => {
        setLocalHot(i);
        onHotRoom?.(i);
    };
    const wallPath = useMemo(() => plan.walls.map(ring).join(""), [plan]);
    const d = (i: number) => (animate ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.25 + i * 0.035, duration: 0.4 } } : {});

    return (
        <svg
            viewBox={`${fb.x0 - pad} ${fb.y0 - pad} ${fb.w + pad * 2} ${fb.h + pad * 2}`}
            style={{ width: "100%", height: "100%", display: "block" }}
            role="img"
            aria-label="مسقط الوحدة"
        >
            <defs>
                <pattern id="mp-balc" width="0.3" height="0.3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="0.3" stroke="#8FB36A" strokeWidth="0.03" />
                </pattern>
                <pattern id="mp-tile" width="0.6" height="0.6" patternUnits="userSpaceOnUse">
                    <path d="M0.6 0H0V0.6" fill="none" stroke="#000" strokeOpacity="0.06" strokeWidth="0.015" />
                </pattern>
            </defs>

            {/* soft drop shadow of the whole unit */}
            <path d={ring(plan.footprint)} fill="#000" opacity={0.08} transform="translate(0.12 0.16)" />
            <path d={ring(plan.footprint)} fill="#F7F3EC" />

            {plan.rooms.map((r, i) => {
                const pts = r.fill ?? r.poly;
                const color = r.type === "x" ? ROOM_COLORS.hall : ROOM_COLORS[r.type];
                return (
                    <motion.g key={i} {...d(i)} onMouseEnter={() => setHot(i)} onMouseLeave={() => setHot(null)}>
                        <path d={ring(pts)} fill={color} />
                        {(r.type === "bath" || r.type === "kit") && <path d={ring(pts)} fill="url(#mp-tile)" />}
                        {r.type === "balc" && <path d={ring(pts)} fill="url(#mp-balc)" />}
                        {hot === i && <path d={ring(pts)} fill="#C29B40" opacity={0.22} />}
                    </motion.g>
                );
            })}

            {/* glazing / railing along the outer edge, under the walls */}
            <path d={ring(plan.footprint)} fill="none" stroke="#7FB3D5" strokeWidth={0.1} strokeLinejoin="miter" />
            <path d={ring(plan.footprint)} fill="none" stroke="#FFFFFF" strokeWidth={0.035} strokeLinejoin="miter" />

            <motion.path
                d={wallPath}
                fill={WALL}
                fillRule="evenodd"
                {...(animate ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.6 } } : {})}
            />

            <g fill="none" stroke="#4A5A70" strokeWidth={0.025} strokeLinecap="round">
                {plan.doors.map((p, i) => (
                    <path key={i} d={p} />
                ))}
            </g>

            {furniture && (
                <motion.g {...(animate ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.55, duration: 0.5 } } : {})}>
                    <FurnitureLayer plan={plan} />
                </motion.g>
            )}

            {north && <NorthArrow x={fb.x0 + 0.1} y={fb.y0 + 0.1} size={1.1} />}

            {labels && (
                <motion.g {...(animate ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.7, duration: 0.5 } } : {})}>
                    {plan.rooms.map((r, i) => (
                        <RoomLabel key={i} room={r} scale={textScale} />
                    ))}
                </motion.g>
            )}
        </svg>
    );
}
