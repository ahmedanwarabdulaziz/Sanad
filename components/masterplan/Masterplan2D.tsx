"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as RPointerEvent,
  type WheelEvent as RWheelEvent,
} from "react";
import {
  BUILDING_INFO,
  DISCLAIMERS,
  FLOOR_NAMES,
  ROOM_COLORS,
  ROOM_LEGEND,
  SITE,
  UNIT_BY_ID,
  UNITS,
  bbox,
  fmt,
  type Pt,
  type Unit,
} from "@/lib/sanad-zayed/masterplan/data";
import { NorthArrow, PlanLayers } from "./UnitPlan";
import { LOGO, UnitDetails, UnitSummary, cx } from "./UnitPanels";
import { SalesMenu, SalesPanels, useSales } from "./SalesKit";
import MasterplanIntro, { type HubChoice } from "./MasterplanIntro";
import NearbyMap from "./NearbyMap";
import ContactFab from "./ContactFab";
import MetaPixel from "./MetaPixel";
import * as J from "./journey";
import MapZoom from "./MapZoom";

const MasterplanScene = dynamic(() => import("./MasterplanScene"), { ssr: false });
import s from "./masterplan.module.css";

const ring = (pts: Pt[]) =>
  "M" + pts.map((p) => `${p[0]},${p[1]}`).join("L") + "Z";
const line = (pts: Pt[]) => "M" + pts.map((p) => `${p[0]},${p[1]}`).join("L");
const rev = (a: Pt[]) => [...a].reverse();

// Site view box (metres).
const VB = { x: -6, y: -6, w: 156, h: 54 }; // extra room on the right for the floor panel
// Phones (portrait): the site is turned 90° clockwise around its centre, which also puts north at the top.
const VB_PORTRAIT = { x: 30, y: -50, w: 60, h: 142 };
const ROT = 90;

// Road surface: outer edge of the S-road up to the cul-de-sac, back along the top boundary, down the entrance.
const ROAD: Pt[] = (() => {
  const outer = SITE.outer;
  const fromCurve = outer.slice(outer.findIndex((p) => p[1] < 26)); // skip the straight sidewalk stub at the gate
  return [...fromCurve, ...SITE.top];
})();
const SIDEWALK: Pt[] = [...SITE.outer, ...rev(SITE.inner)];

function Defs() {
  return (
    <defs>
      <pattern id="m2-grid" width="2" height="2" patternUnits="userSpaceOnUse">
        <path
          d="M2 0H0V2"
          fill="none"
          stroke="#5E8FC0"
          strokeOpacity="0.22"
          strokeWidth="0.04"
        />
      </pattern>
      <pattern id="m2-grass" width="3" height="3" patternUnits="userSpaceOnUse">
        <rect width="3" height="3" fill="#6E9A5A" />
        <circle cx="0.6" cy="0.8" r="0.5" fill="#76A262" />
        <circle cx="2.2" cy="2.1" r="0.7" fill="#679253" />
        <circle cx="2.4" cy="0.5" r="0.3" fill="#7BA866" />
      </pattern>
      <pattern id="m2-sand" width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="4" fill="#D9C7A6" />
        <circle cx="1" cy="1" r="0.12" fill="#CDB993" />
        <circle cx="3" cy="2.5" r="0.1" fill="#CDB993" />
      </pattern>
      <radialGradient id="m2-tree" cx="40%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#8DBB6C" />
        <stop offset="70%" stopColor="#4F7F3E" />
        <stop offset="100%" stopColor="#3C6630" />
      </radialGradient>
      <radialGradient id="m2-water" cx="45%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#BFE8F7" />
        <stop offset="100%" stopColor="#3E8FB8" />
      </radialGradient>
      <filter id="m2-blur" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="0.6" />
      </filter>
      <filter id="m2-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="0.5" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

function Site({ stage }: { stage: number }) {
  const { c, r } = SITE.roundabout;
  const fade = (d: number) => ({
    initial: { opacity: 0 },
    animate: { opacity: stage >= 1 ? 1 : 0 },
    transition: { duration: 1.1, delay: d },
  });
  return (
    <g style={{ pointerEvents: "none" }}>
      <motion.rect
        x={VB.x - 40}
        y={VB.y - 40}
        width={VB.w + 80}
        height={VB.h + 80}
        fill="url(#m2-sand)"
        {...fade(0)}
      />
      <motion.path
        d={ring(SITE.plot)}
        fill="url(#m2-grass)"
        stroke="#E9DFC9"
        strokeWidth={0.35}
        {...fade(0.1)}
      />
      <motion.g {...fade(0.25)}>
        <path d={ring(SIDEWALK)} fill="#E7DCC8" />
        <path d={ring(ROAD)} fill="#3B4048" />
        <path
          d={line(SITE.outer)}
          fill="none"
          stroke="#F4EEE2"
          strokeWidth={0.18}
        />
        <path
          d={line(SITE.top)}
          fill="none"
          stroke="#F4EEE2"
          strokeWidth={0.18}
        />
        <path
          d={line(SITE.inner)}
          fill="none"
          stroke="#CFC2AA"
          strokeWidth={0.1}
        />
        <path
          d={line(SITE.outer.slice(SITE.outer.findIndex((p) => p[1] < 26)))}
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity={0.55}
          strokeWidth={0.12}
          strokeDasharray="1.4 1.2"
          transform="translate(0 -4.4)"
        />
        <circle cx={c[0]} cy={c[1]} r={r + 0.4} fill="#E7DCC8" />
        <circle cx={c[0]} cy={c[1]} r={r - 0.2} fill="url(#m2-water)" />
        <circle cx={c[0]} cy={c[1]} r={r * 0.28} fill="#E7DCC8" />
        <path
          d={ring(SITE.annex)}
          fill="#000"
          opacity={0.2}
          transform="translate(0.5 0.7)"
          filter="url(#m2-blur)"
        />
        <path
          d={ring(SITE.annex)}
          fill="#E4DACA"
          stroke="#C9BBA2"
          strokeWidth={0.12}
        />
      </motion.g>
      {SITE.trees.map(([x, y, k], i) => (
        <motion.g
          key={i}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: stage >= 1 ? 1 : 0, opacity: stage >= 1 ? 1 : 0 }}
          transition={{
            delay: 0.5 + (i % 12) * 0.05,
            type: "spring",
            damping: 12,
            stiffness: 120,
          }}
          style={{ transformOrigin: `${x}px ${y}px`, transformBox: "view-box" }}
        >
          <circle
            cx={x + 0.5}
            cy={y + 0.7}
            r={1.75 * k}
            fill="#000"
            opacity={0.22}
            filter="url(#m2-blur)"
          />
          <circle cx={x} cy={y} r={1.75 * k} fill="url(#m2-tree)" />
        </motion.g>
      ))}
    </g>
  );
}

function UnitOnSite({
  unit,
  hot,
  dimmed,
  showLabels,
  order,
  stage,
  onEnter,
  onMove,
  onLeave,
  onClick,
  rot,
}: {
  rot: number;
  unit: Unit;
  hot: boolean;
  dimmed: boolean;
  showLabels: boolean;
  order: number;
  stage: number;
  onEnter: (e: RPointerEvent) => void;
  onMove: (e: RPointerEvent) => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const liv = unit.plan.rooms.find((r) => r.type === "liv");
  const tag = liv
    ? liv.label
    : ([bbox(unit.plan.footprint).cx, bbox(unit.plan.footprint).cy] as Pt);
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: stage >= 1 ? (dimmed ? 0.45 : 1) : 0 }}
      transition={{ duration: 0.6, delay: stage >= 2 ? 0 : 1.2 + order * 0.07 }}
    >
      <PlanLayers plan={unit.plan} labels={showLabels} textScale={0.9} textRotate={-rot} />
      <path
        d={ring(unit.plan.footprint)}
        fill={hot ? "rgba(194,155,64,0.18)" : "rgba(0,0,0,0)"}
        stroke={hot ? "#E5C77F" : "#FFFFFF"}
        strokeWidth={hot ? 0.32 : 0.12}
        filter={hot ? "url(#m2-glow)" : undefined}
        style={{ cursor: "pointer", transition: "fill .2s, stroke .2s" }}
        onPointerEnter={onEnter}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onClick={onClick}
      />
      {!showLabels && (
        <g
          style={{ pointerEvents: "none" }}
          transform={`translate(${tag[0]} ${tag[1]}) rotate(${-rot})`}
        >
          <rect
            x={-2.1}
            y={-0.62}
            width={4.2}
            height={1.24}
            rx={0.62}
            fill={hot ? "#C29B40" : "rgba(10,20,36,0.86)"}
          />
          <text
            y={0.34}
            textAnchor="middle"
            fontSize={0.9}
            fontWeight={800}
            fill={hot ? "#0A1424" : "#F3E3B5"}
            style={{ fontFamily: "var(--font-tajawal), sans-serif" }}
          >
            {unit.code}
          </text>
        </g>
      )}
    </motion.g>
  );
}

export default function Masterplan2D() {
  const [stage, setStage] = useState(0); // 0 hidden, 1 colour reveal, 2 ready
  const [phase, setPhase] = useState<"intro" | "nearby" | "map" | "site">("intro");
  const [returning, setReturning] = useState(false);
  const flown = useRef(false);
  const [portrait, setPortrait] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);
  useEffect(() => {
    J.startVisit();
  }, []);
  const [floor, setFloor] = useState<number | null>(0);
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [night, setNight] = useState(false);
  const [building, setBuilding] = useState<"A" | "B" | null>(null);
  const [hover, setHover] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const [vw, setVw] = useState(1600);
  const [dragging, setDragging] = useState(false);
  const sales = useSales();
  const openUnit = (id: string) => {
    const u = UNIT_BY_ID[id];
    if (!u) return;
    setFloor(u.floor);
    setPinned(id);
    setDetail(id);
  };
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const r = () => {
      setVw(window.innerWidth);
      setPortrait(window.innerHeight > window.innerWidth && window.innerWidth < 900);
    };
    const raf = requestAnimationFrame(() => {
      r();
      const q = new URLSearchParams(window.location.search);
      if (q.get("view") === "3d") setMode("3d");
      if (q.get("view") === "nearby") setPhase("nearby");
      const id = q.get("unit");
      if (id && UNIT_BY_ID[id]) {
        // Shared unit links skip the intro and the fly-in.
        setPhase("site");
        setStage(1);
        setFloor(UNIT_BY_ID[id].floor);
        setPinned(id);
        setDetail(id);
      }
    });
    const onR = r;
    window.addEventListener("resize", onR);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onR);
    };
  }, []);

  const floor2d = floor ?? 0;
  const floorUnits = useMemo(
    () => UNITS.filter((u) => u.floor === floor2d),
    [floor2d],
  );
  const finishMap = useCallback(() => {
    flown.current = true;
    setPhase("site");
    setStage((st) => (st === 0 ? 1 : st));
  }, []);
  // The satellite fly-in plays the first time the plan is opened; after that the plan opens directly.
  const goPlan = () => {
    if (!flown.current) setPhase("map");
    else {
      setPhase("site");
      setStage((st) => (st === 0 ? 1 : st));
    }
  };
  const onChoose = (c: HubChoice) => {
    if (c === "plan") {
      setMode("2d");
      if (floor === null) setFloor(0);
      goPlan();
    } else if (c === "3d") {
      J.track({ type: "view_3d" });
      setMode("3d");
      setFloor(null);
      goPlan();
    } else if (c === "nearby") {
      setPhase("nearby");
    } else {
      flown.current = true;
      setPhase("site");
      setStage((st) => (st === 0 ? 1 : st));
      sales.enquire([]);
    }
  };
  const goHome = () => {
    setDetail(null);
    setHover(null);
    sales.setPanel(null);
    setReturning(true);
    setPhase("intro");
  };
  useEffect(() => {
    if (stage !== 1) return;
    const t = setTimeout(() => setStage(2), 1900);
    return () => clearTimeout(t);
  }, [stage]);
  const onHover3d = useCallback((id: string | null, x?: number, y?: number) => {
    setHover(id && x !== undefined && y !== undefined ? { id, x, y } : null);
  }, []);
  const switchMode = (m: "2d" | "3d") => {
    if (m === "3d") J.track({ type: "view_3d" });
    setHover(null);
    if (m === "2d" && floor === null) setFloor(0);
    // 3D opens on the whole buildings unless a unit is being looked at.
    if (m === "3d" && !pinned) setFloor(null);
    setMode(m);
  };
  const areaRange = useMemo(() => {
    const a = UNITS.map((u) => u.area);
    return [Math.min(...a), Math.max(...a)];
  }, []);

  const vb = portrait ? VB_PORTRAIT : VB;
  const rot = portrait ? ROT : 0;

  // --- pan / zoom (view.x/y are in viewBox units, applied before scaling) ---
  const toVB = (clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    const scale = Math.max(vb.w / r.width, vb.h / r.height);
    const ox = (r.width * scale - vb.w) / 2;
    const oy = (r.height * scale - vb.h) / 2;
    return [
      vb.x - ox + (clientX - r.left) * scale,
      vb.y - oy + (clientY - r.top) * scale,
      scale,
    ] as const;
  };
  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const [px, py] = toVB(clientX, clientY);
    setView((v) => {
      const k = Math.min(6, Math.max(1, v.k * factor));
      const f = k / v.k;
      return { k, x: px - (px - v.x) * f, y: py - (py - v.y) * f };
    });
  };
  const onWheel = (e: RWheelEvent) =>
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  const onDown = (e: RPointerEvent) => {
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      vx: view.x,
      vy: view.y,
      moved: false,
    };
  };
  const onDragMove = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const [, , scale] = toVB(e.clientX, e.clientY);
    const dx = (e.clientX - d.x) * scale;
    const dy = (e.clientY - d.y) * scale;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 0.6) {
      d.moved = true;
      setDragging(true);
    }
    if (d.moved) setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
  };
  const onUp = () => {
    setDragging(false);
    setTimeout(() => (drag.current = null), 0);
  };
  const zoomBtn = (f: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, f);
  };

  const enter = useCallback(
    (id: string, e: RPointerEvent) =>
      setHover({ id, x: e.clientX, y: e.clientY }),
    [],
  );
  const showLabels = view.k >= 2.6;
  const hoverUnit = hover ? UNIT_BY_ID[hover.id] : null;
  const pinnedUnit = pinned ? UNIT_BY_ID[pinned] : null;
  const ready = stage >= 2;

  return (
    <div
      className={cx(s.root, uiHidden && s.uiHidden)}
      style={{
        background:
          mode === "2d" ? "radial-gradient(ellipse at 50% 40%, #13243D, #070E1A 75%)" : "#0B1322",
      }}
    >
      {mode === "3d" && (
        <div className={s.fill}>
          <MasterplanScene
            hoveredId={hover?.id ?? pinned ?? null}
            selectedFloor={floor}
            selectedBuilding={building}
            onHover={onHover3d}
            onSelect={setPinned}
            onIntroDone={() => undefined}
            night={night}
          />
        </div>
      )}
      {mode === "2d" && (
      <svg
        ref={svgRef}
        className={s.fill}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: "100%",
          height: "100%",
          touchAction: "none",
          cursor: dragging ? "grabbing" : "grab",
        }}
        onWheel={onWheel}
        onPointerDown={onDown}
        onPointerMove={onDragMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        <Defs />
        <rect
          x={VB.x - 200}
          y={VB.y - 200}
          width={VB.w + 400}
          height={VB.h + 400}
          fill="url(#m2-grid)"
        />
        <motion.g
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 4.5, ease: "easeOut" }}
          style={{ transformOrigin: "60px 20px", transformBox: "view-box" }}
        >
          <g
            transform={`translate(${view.x} ${view.y}) scale(${view.k})`}
            style={{
              transition: dragging ? "none" : "transform .25s ease-out",
            }}
          >
            <g transform={rot ? `rotate(${rot} 60 21)` : undefined}>
            <Site stage={stage} />
            {stage >= 1 && <NorthArrow x={-2.6} y={20.5} size={3.4} textRotate={-rot} />}
            {/* building shadows */}
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: stage >= 1 ? 0.35 : 0 }}
              transition={{ delay: 1, duration: 1 }}
              style={{ pointerEvents: "none" }}
            >
              {floorUnits.map((u) => (
                <path
                  key={u.id}
                  d={ring(u.plan.footprint)}
                  fill="#000"
                  transform="translate(0.9 1.2)"
                  filter="url(#m2-blur)"
                />
              ))}
            </motion.g>
            {floorUnits.map((u, i) => (
              <UnitOnSite
                key={u.id}
                unit={u}
                order={i}
                stage={stage}
                hot={hover?.id === u.id || pinned === u.id}
                dimmed={building !== null && building !== u.building}
                showLabels={showLabels}
                onEnter={(e) => enter(u.id, e)}
                onMove={(e) => enter(u.id, e)}
                onLeave={() => setHover(null)}
                onClick={() => {
                  if (!drag.current?.moved) setPinned(u.id);
                }}
                rot={rot}
              />
            ))}
            {(["A", "B"] as const).map((b) => {
              const c = BUILDING_INFO[b].center;
              return (
                <motion.g
                  key={b}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: stage >= 1 ? 1 : 0 }}
                  transition={{ delay: 2 }}
                  style={{ pointerEvents: "none" }}
                >
                  <g transform={`translate(${c.cx} ${c.y1 + 2.4}) rotate(${-rot})`}>
                    <rect
                      x={-4.2}
                      y={-1}
                      width={8.4}
                      height={2}
                      rx={1}
                      fill="rgba(10,20,36,0.88)"
                      stroke="#C29B40"
                      strokeWidth={0.1}
                    />
                    <text
                      y={0.5}
                      textAnchor="middle"
                      fontSize={1.3}
                      fontWeight={800}
                      fill="#F3E3B5"
                      style={{ fontFamily: "var(--font-tajawal), sans-serif" }}
                    >
                      {BUILDING_INFO[b].name}
                    </text>
                  </g>
                </motion.g>
              );
            })}
            </g>
          </g>
        </motion.g>
      </svg>
      )}

      <div className={s.vignette} />

      <AnimatePresence>
        {phase === "intro" && <MasterplanIntro key="intro" onChoose={onChoose} startAtMenu={returning} />}
        {phase === "nearby" && (
          <NearbyMap
            key="nearby"
            onHome={goHome}
            onPlan={() => {
              setMode("2d");
              if (floor === null) setFloor(0);
              goPlan();
            }}
          />
        )}
        {phase === "map" && <MapZoom key="map" onDone={finishMap} />}
      </AnimatePresence>

      <motion.header
        className={s.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : -20 }}
        transition={{ duration: 0.8 }}
      >
        <div className={cx(s.glass, s.brand)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} alt="سند" className={s.brandLogo} />
          <div className={s.brandText}>
            <div className={s.brandTitle}>سند زايد</div>
            <div className={s.brandSub}>المخطط العام</div>
          </div>
        </div>
        <div className={cx(s.glass, s.stats)}>
          <div className={s.stat}>
            <span className={s.statValue}>{fmt(UNITS.length)}</span>
            <span className={s.statLabel}>وحدة سكنية</span>
          </div>
          <div className={s.stat}>
            <span className={s.statValue}>{fmt(2)}</span>
            <span className={s.statLabel}>مبنى</span>
          </div>
          <div className={s.stat}>
            <span className={s.statValue}>أرضي + {fmt(4)}</span>
            <span className={s.statLabel}>الأدوار</span>
          </div>
          <div className={s.stat}>
            <span className={s.statValue}>
              {fmt(areaRange[0])} – {fmt(areaRange[1])}
            </span>
            <span className={s.statLabel}>المساحات (م²)</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className={cx(s.glass, s.modeSwitch)} role="tablist" aria-label="طريقة العرض">
            <button
              role="tab"
              aria-selected={mode === "2d"}
              className={cx(s.modeBtn, mode === "2d" && s.modeBtnOn)}
              onClick={() => switchMode("2d")}
            >
              2D
            </button>
            <button
              role="tab"
              aria-selected={mode === "3d"}
              className={cx(s.modeBtn, mode === "3d" && s.modeBtnOn)}
              onClick={() => switchMode("3d")}
            >
              3D
            </button>
          </div>
          <button className={cx(s.glass, s.backLink)} onClick={goHome}>
            الرئيسية
          </button>
          <Link
            href="/projects/sanad-zayed"
            className={cx(s.glass, s.backLink, s.hideMobile)}
          >
            عن المشروع ←
          </Link>
        </div>
      </motion.header>

      <div className={s.navWrap}>
        <motion.nav
          className={cx(s.glass, s.nav)}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: ready ? 1 : 0, x: ready ? 0 : 30 }}
          transition={{ duration: 0.8, delay: 0.15 }}
        >
          <div className={s.navLabel}>اختر الدور</div>
          {mode === "3d" && (
            <button
              className={cx(s.navBtn, floor === null && s.navBtnOn)}
              onClick={() => setFloor(null)}
            >
              كل الأدوار
            </button>
          )}
          {[4, 3, 2, 1, 0].map((f) => (
            <button
              key={f}
              className={cx(s.navBtn, floor === f && s.navBtnOn)}
              onClick={() => setFloor(f)}
            >
              {FLOOR_NAMES[f]}
            </button>
          ))}
          <div className={s.navDivider} />
          <div className={s.navLabel}>المبنى</div>
          <div className={s.bldGrid}>
            {([null, "A", "B"] as const).map((b) => (
              <button
                key={b ?? "all"}
                className={cx(s.navBtn, building === b && s.navBtnOn)}
                onClick={() => setBuilding(b)}
              >
                {b ?? "الكل"}
              </button>
            ))}
          </div>
          {mode === "3d" ? (
            <>
              <div className={s.navDivider} />
              <div className={s.navLabel}>الإضاءة</div>
              <div className={s.bldGrid} style={{ gridTemplateColumns: "1fr 1fr" }}>
                <button className={cx(s.navBtn, !night && s.navBtnOn)} onClick={() => setNight(false)}>
                  نهار
                </button>
                <button className={cx(s.navBtn, night && s.navBtnOn)} onClick={() => setNight(true)}>
                  ليل
                </button>
              </div>
            </>
          ) : (
          <>
          <div className={s.navDivider} />
          <div className={s.navLabel}>التكبير</div>
          <div className={s.bldGrid}>
            <button
              className={s.navBtn}
              onClick={() => zoomBtn(1.4)}
              aria-label="تكبير"
            >
              +
            </button>
            <button
              className={s.navBtn}
              onClick={() => setView({ k: 1, x: 0, y: 0 })}
              aria-label="إعادة الضبط"
            >
              ⟲
            </button>
            <button
              className={s.navBtn}
              onClick={() => zoomBtn(1 / 1.4)}
              aria-label="تصغير"
            >
              −
            </button>
          </div>
          </>
          )}
        </motion.nav>
      </div>

      <motion.div
        className={s.footer}
        initial={{ opacity: 0 }}
        animate={{ opacity: ready && !sales.panel ? 1 : 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className={s.legend} style={{ padding: 0 }}>
          {ROOM_LEGEND.map((l) => (
            <span key={l.type} className={s.legendItem}>
              <span
                className={s.swatch}
                style={{ background: ROOM_COLORS[l.type] }}
              />
              {l.label}
            </span>
          ))}
        </div>
        <div className={cx(s.glass, s.hint)}>
          {mode === "2d"
            ? "مرّر على أي وحدة لعرض ملخصها · اضغط عليها للتفاصيل · كبّر لرؤية مسميات الغرف"
            : "مرّر على أي وحدة لعرض ملخصها · اضغط عليها للتفاصيل · اسحب للتدوير"}
        </div>
        <p className={s.disclaimer}>{DISCLAIMERS.slice(0, 3).join(" · ")}</p>
      </motion.div>

      <AnimatePresence>
        {hoverUnit && hover && !pinned && !detail && (
          <motion.div
            key="hover"
            className={cx(s.glass, s.hoverCard)}
            style={{
              left: Math.min(hover.x + 18, vw - 330),
              top: Math.max(12, hover.y - 150),
            }}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
          >
            <UnitSummary unit={hoverUnit} />
            <div className={s.hoverHint}>اضغط على الوحدة لعرض التفاصيل</div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pinnedUnit && !detail && !sales.panel && !uiHidden && (
          <motion.div
            key={pinnedUnit.id}
            className={cx(s.glass, s.pinCard)}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
          >
            <button
              onClick={() => setPinned(null)}
              className={cx(s.iconBtn, s.pinClose)}
              aria-label="إغلاق"
            >
              ✕
            </button>
            <UnitSummary unit={pinnedUnit} />
            <button onClick={() => setDetail(pinnedUnit.id)} className={s.cta}>
              عرض تفاصيل الوحدة
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detail && (
          <UnitDetails
            key="detail"
            unit={UNIT_BY_ID[detail]}
            onClose={() => setDetail(null)}
            onNavigate={(id) => {
              setDetail(id);
              setPinned(id);
            }}
            sales={sales}
            source="2d"
          />
        )}
      </AnimatePresence>

      <SalesMenu sales={sales} show={ready && !uiHidden} />

      <ContactFab
        unit={detail ? UNIT_BY_ID[detail] : pinnedUnit}
        floor={floor}
        show={
          phase === "site" &&
          ready &&
          !detail &&
          // on phones, step aside while the unit card or a menu panel is open at the bottom
          !(vw < 720 && (pinnedUnit !== null || sales.panel !== null))
        }
      />
      <MetaPixel />

      {ready && !detail && (
        <button
          className={cx(s.uiToggle, uiHidden && s.uiToggleOn)}
          onClick={() => {
            setUiHidden((h) => !h);
            setHover(null);
            if (!uiHidden) sales.setPanel(null);
          }}
          aria-pressed={uiHidden}
          aria-label={uiHidden ? "إظهار القوائم" : "إخفاء القوائم"}
        >
          <span className={s.uiToggleIcon}>{uiHidden ? "☰" : "⤢"}</span>
          <span className={s.uiToggleText}>{uiHidden ? "إظهار القوائم" : "إخفاء القوائم"}</span>
        </button>
      )}
      <SalesPanels sales={sales} source="2d" onOpenUnit={openUnit} />
    </div>
  );
}
