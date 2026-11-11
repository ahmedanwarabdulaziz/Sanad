"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { bbox, ROOM_COLORS, type Plan, type Pt } from "@/lib/sanad-zayed/masterplan/data";
import { planFurniture, type FurnitureKind } from "@/lib/sanad-zayed/masterplan/furniture";

const WALL_H = 2.1;

const signedArea = (r: Pt[]) => r.reduce((s, p, i) => s + p[0] * r[(i + 1) % r.length][1] - r[(i + 1) % r.length][0] * p[1], 0) / 2;
function pointIn(p: Pt, r: Pt[]) {
    let inside = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [xi, yi] = r[i];
        const [xj, yj] = r[j];
        if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
}

const FURN_COLORS: Partial<Record<FurnitureKind, string>> = {
    bed: "#F4F1EC",
    pillow: "#FFFFFF",
    nightstand: "#B08B62",
    sofa: "#8FA3BF",
    armchair: "#8FA3BF",
    coffee: "#8B6A4A",
    dining: "#8B6A4A",
    chair: "#C9B79C",
    counter: "#E7E9ED",
    sink: "#B9D3E3",
    stove: "#3A3F48",
    toilet: "#FFFFFF",
    basin: "#FFFFFF",
    shower: "#CDE7F2",
    wardrobe: "#C7AD86",
    outdoorTable: "#FFFFFF",
    rug: "#E9DCC6",
    tv: "#22272F",
};

function Unit3D({ plan }: { plan: Plan }) {
    const b = bbox(plan.footprint);
    const cx = b.cx;
    const cy = b.cy;
    const toShape = (r: Pt[]) => new THREE.Shape(r.map(([x, y]) => new THREE.Vector2(x - cx, -(y - cy))));

    const walls = useMemo(() => {
        // Outer rings and holes have opposite winding; attach each hole to the outer ring that contains it.
        const rings = plan.walls.filter((r) => r.length >= 3);
        const areas = rings.map(signedArea);
        const big = rings.reduce((m, _r, i) => (Math.abs(areas[i]) > Math.abs(areas[m]) ? i : m), 0);
        const outerSign = Math.sign(areas[big]);
        const outers = rings.filter((_, i) => Math.sign(areas[i]) === outerSign);
        const holes = rings.filter((_, i) => Math.sign(areas[i]) !== outerSign);
        const shapes = outers.map((o) => {
            const sh = toShape(o);
            holes.filter((h) => pointIn(h[0], o)).forEach((h) => sh.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x - cx, -(y - cy))))));
            return sh;
        });
        const g = new THREE.ExtrudeGeometry(shapes, { depth: WALL_H, bevelEnabled: false });
        g.rotateX(-Math.PI / 2);
        return g;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plan, cx, cy]);

    const floors = useMemo(
        () =>
            plan.rooms.map((r) => {
                const g = new THREE.ShapeGeometry(toShape(r.fill ?? r.poly));
                g.rotateX(-Math.PI / 2);
                return { g, color: r.type === "x" ? ROOM_COLORS.hall : ROOM_COLORS[r.type] };
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [plan]
    );
    const slab = useMemo(() => {
        const g = new THREE.ExtrudeGeometry(toShape(plan.footprint), { depth: 0.2, bevelEnabled: false });
        g.rotateX(-Math.PI / 2);
        return g;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plan]);
    const pieces = useMemo(() => planFurniture(plan), [plan]);

    return (
        <group>
            <mesh geometry={slab} position={[0, -0.2, 0]} receiveShadow>
                <meshStandardMaterial color="#E9E2D6" roughness={0.9} />
            </mesh>
            {floors.map((f, i) => (
                <mesh key={i} geometry={f.g} position={[0, 0.005, 0]} receiveShadow>
                    <meshStandardMaterial color={f.color} roughness={0.85} />
                </mesh>
            ))}
            <mesh geometry={walls} castShadow receiveShadow>
                <meshStandardMaterial color="#F7F4EE" roughness={0.8} />
            </mesh>
            {pieces.map((p, i) => {
                const h = Math.max(0.02, p.z);
                const px = p.x + p.w / 2 - cx;
                const pz = p.y + p.h / 2 - cy;
                const color = FURN_COLORS[p.kind] ?? "#D9CBB5";
                if (p.kind === "wardrobe") {
                    return (
                        <mesh key={i} position={[px, h / 2, pz]} castShadow>
                            <boxGeometry args={[p.w, h, p.h]} />
                            <meshStandardMaterial color={color} roughness={0.7} />
                        </mesh>
                    );
                }
                return (
                    <mesh key={i} position={[px, h / 2 + 0.01, pz]} castShadow receiveShadow>
                        {p.round || p.kind === "toilet" ? <cylinderGeometry args={[p.w / 2, p.w / 2, h, 24]} /> : <boxGeometry args={[p.w, h, p.h]} />}
                        <meshStandardMaterial color={color} roughness={0.6} />
                    </mesh>
                );
            })}
        </group>
    );
}

export default function UnitTour({ plan }: { plan: Plan }) {
    const b = bbox(plan.footprint);
    const r = Math.max(b.w, b.h);
    return (
        <Canvas shadows dpr={[1, 2]} camera={{ fov: 40, position: [-r * 0.75, r * 1.35, r * 0.8], near: 0.1, far: 500 }}>
            <color attach="background" args={["#E9E3D8"]} />
            <hemisphereLight args={["#FFFFFF", "#CDBFA8", 0.9]} />
            <directionalLight
                position={[-r, r * 1.6, r * 0.6]}
                intensity={1.6}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-left={-r}
                shadow-camera-right={r}
                shadow-camera-top={r}
                shadow-camera-bottom={-r}
                shadow-bias={-0.0005}
            />
            <ambientLight intensity={0.25} />
            <Unit3D plan={plan} />
            <ContactShadows position={[0, -0.21, 0]} opacity={0.35} scale={r * 2.4} blur={2.4} far={4} />
            <OrbitControls makeDefault enableDamping target={[0, 0.8, 0]} minDistance={4} maxDistance={r * 2.6} maxPolarAngle={1.42} autoRotate autoRotateSpeed={0.6} />
        </Canvas>
    );
}
