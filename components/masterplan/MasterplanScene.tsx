"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Sky, Stars, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
    BUILDING_INFO,
    CENTER,
    FLOOR_HEIGHT,
    ROOM_COLORS,
    SITE,
    UNITS,
    type Pt,
    type Unit,
} from "@/lib/sanad-zayed/masterplan/data";

const [CX, CY] = CENTER;
const PLINTH = 0.6;
const GOLD = new THREE.Color("#C29B40");
const baseY = (floor: number) => PLINTH + floor * FLOOR_HEIGHT;

function shapeFrom(pts: Pt[]) {
    return new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x - CX, -(y - CY))));
}

/** Facade tile: two 3 m bays per tile, one storey tall, with one window lit warm for an evening mood. */
function useFacadeTexture() {
    return useMemo(() => {
        const c = document.createElement("canvas");
        c.width = 512;
        c.height = 256;
        const g = c.getContext("2d")!;
        g.fillStyle = "#EEE6D8";
        g.fillRect(0, 0, 512, 256);
        const bay = (x0: number, lit: boolean) => {
            const grad = g.createLinearGradient(0, 50, 0, 200);
            if (lit) {
                grad.addColorStop(0, "#FFE2A8");
                grad.addColorStop(1, "#F2B864");
            } else {
                grad.addColorStop(0, "#5E7C97");
                grad.addColorStop(1, "#22364B");
            }
            g.fillStyle = "#CFC2AC";
            g.fillRect(x0 + 44, 46, 168, 160);
            g.fillStyle = grad;
            g.fillRect(x0 + 52, 54, 152, 144);
            g.fillStyle = "rgba(255,255,255,0.18)";
            g.beginPath();
            g.moveTo(x0 + 52, 54);
            g.lineTo(x0 + 120, 54);
            g.lineTo(x0 + 52, 140);
            g.fill();
            g.fillStyle = "#CFC2AC";
            g.fillRect(x0 + 126, 54, 4, 144);
            g.fillStyle = "#BFB29C";
            g.fillRect(x0 + 40, 198, 176, 10);
        };
        bay(0, false);
        bay(256, true);
        g.fillStyle = "#D6C8B0";
        g.fillRect(0, 0, 512, 16);
        g.fillStyle = "#C9BBA2";
        g.fillRect(0, 240, 512, 16);
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(1 / 6, 1 / FLOOR_HEIGHT);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        return t;
    }, []);
}

type SceneProps = {
    hoveredId: string | null;
    selectedFloor: number | null;
    selectedBuilding: "A" | "B" | null;
    onHover: (id: string | null, x?: number, y?: number) => void;
    onSelect: (id: string) => void;
    onIntroDone: () => void;
    night: boolean;
};

/** Emissive mask for the facade: only the window glass glows at night. */
function useWindowGlow() {
    return useMemo(() => {
        const c = document.createElement("canvas");
        c.width = 512;
        c.height = 256;
        const g = c.getContext("2d")!;
        g.fillStyle = "#000";
        g.fillRect(0, 0, 512, 256);
        g.fillStyle = "#FFD79A";
        g.fillRect(52, 54, 152, 144);
        g.fillStyle = "#FFE7BD";
        g.fillRect(308, 54, 152, 144);
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(1 / 6, 1 / FLOOR_HEIGHT);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
    }, []);
}

function UnitBlock({
    unit,
    facade,
    glowMap,
    night,
    hovered,
    selectedFloor,
    selectedBuilding,
    onHover,
    onSelect,
}: {
    unit: Unit;
    facade: THREE.Texture;
    glowMap: THREE.Texture;
    night: boolean;
    hovered: boolean;
    selectedFloor: number | null;
    selectedBuilding: "A" | "B" | null;
    onHover: SceneProps["onHover"];
    onSelect: SceneProps["onSelect"];
}) {
    const mesh = useRef<THREE.Mesh>(null);
    const plan = useRef<THREE.Group>(null);
    const geom = useMemo(() => {
        const g = new THREE.ExtrudeGeometry(shapeFrom(unit.plan.footprint), { depth: FLOOR_HEIGHT - 0.04, bevelEnabled: false });
        g.rotateX(-Math.PI / 2);
        return g;
    }, [unit]);
    const mats = useMemo(() => {
        const cap = new THREE.MeshStandardMaterial({ color: "#DCD3C3", roughness: 0.9, transparent: true });
        const side = new THREE.MeshStandardMaterial({ map: facade, emissiveMap: glowMap, roughness: 0.75, metalness: 0.02, transparent: true });
        return [cap, side];
    }, [facade, glowMap]);
    const rooms = useMemo(
        () =>
            unit.plan.rooms
                .filter((r) => r.type !== "x")
                .map((r) => {
                    const g = new THREE.ShapeGeometry(shapeFrom(r.fill ?? r.poly));
                    g.rotateX(-Math.PI / 2);
                    return { g, color: ROOM_COLORS[r.type] };
                }),
        [unit]
    );

    const labelPos = useMemo(() => {
        const liv = unit.plan.rooms.find((r) => r.type === "liv");
        return liv ? liv.label : ([bboxCenter(unit.plan.footprint)[0], bboxCenter(unit.plan.footprint)[1]] as Pt);
    }, [unit]);

    const isolated = selectedFloor !== null;
    const buildingMatch = selectedBuilding === null || selectedBuilding === unit.building;
    const above = isolated && unit.floor > selectedFloor!;
    const onFloor = isolated && unit.floor === selectedFloor && buildingMatch;
    const visTarget = above ? 0 : 1;
    const vis = useRef(1);
    const glow = useRef(0);

    useFrame((_, dt) => {
        const k = 1 - Math.exp(-dt * 6);
        vis.current += (visTarget - vis.current) * k;
        glow.current += ((hovered ? 1 : 0) - glow.current) * (1 - Math.exp(-dt * 10));
        const m = mesh.current;
        if (!m) return;
        const v = vis.current;
        m.position.y = baseY(unit.floor) + (1 - v) * 8;
        m.visible = v > 0.02;
        m.raycast = v > 0.5 ? THREE.Mesh.prototype.raycast : () => null;
        const dim = !buildingMatch ? 0.35 : 1;
        mats.forEach((mt, i) => {
            const mat = mt as THREE.MeshStandardMaterial;
            mat.opacity = v * (dim < 1 ? 0.55 : 1);
            if (i === 0) {
                mat.emissive.copy(GOLD);
                mat.emissiveIntensity = glow.current * 0.55 + (onFloor ? 0.08 : 0);
                mat.color.set(onFloor ? "#2E3A4C" : night ? "#8C8A86" : "#DCD3C3");
            } else {
                // Facade: windows glow at night; hover tints the whole block gold.
                mat.emissive.set(night ? "#FFC978" : "#000000");
                mat.emissiveIntensity = night ? 0.85 : 0;
                mat.color.set(night ? "#8F94A0" : "#FFFFFF").lerp(GOLD, glow.current * 0.55);
            }
        });
        if (plan.current) {
            plan.current.visible = onFloor;
            plan.current.position.y = baseY(unit.floor) + FLOOR_HEIGHT + 0.01;
        }
    });

    const handlers = {
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            onHover(unit.id, e.nativeEvent.clientX, e.nativeEvent.clientY);
            document.body.style.cursor = "pointer";
        },
        onPointerMove: (e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            onHover(unit.id, e.nativeEvent.clientX, e.nativeEvent.clientY);
        },
        onPointerOut: () => {
            onHover(null);
            document.body.style.cursor = "";
        },
        onClick: (e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            onSelect(unit.id);
        },
    };

    return (
        <>
            <mesh ref={mesh} geometry={geom} material={mats} castShadow receiveShadow {...handlers} />
            <group ref={plan} visible={false}>
                {rooms.map((r, i) => (
                    <mesh key={i} geometry={r.g} position={[0, 0, 0]} {...handlers}>
                        <meshStandardMaterial color={r.color} roughness={0.85} polygonOffset polygonOffsetFactor={-2} />
                    </mesh>
                ))}
                <Label
                    text={unit.code}
                    position={[labelPos[0] - CX, 1.2, labelPos[1] - CY]}
                    height={1.1}
                    fontPx={44}
                />
            </group>
        </>
    );
}

function Ground() {
    const tex = useTexture("/images/sanad-zayed/masterplan-ground.jpg", (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
    });
    const { x0, y0, x1, y1 } = SITE.tex;
    return (
        <>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
                <circleGeometry args={[420, 64]} />
                <meshStandardMaterial color="#B49D7E" roughness={1} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2 - CX, 0, (y0 + y1) / 2 - CY]} receiveShadow>
                <planeGeometry args={[x1 - x0, y1 - y0]} />
                <meshStandardMaterial map={tex} roughness={0.95} />
            </mesh>
        </>
    );
}

function Plinths() {
    // A low stone podium under each building so the blocks sit on the site instead of floating.
    const geoms = useMemo(
        () =>
            UNITS.filter((u) => u.floor === 0).map((u) => {
                const g = new THREE.ExtrudeGeometry(shapeFrom(u.plan.footprint), { depth: PLINTH, bevelEnabled: false });
                g.rotateX(-Math.PI / 2);
                return g;
            }),
        []
    );
    return (
        <>
            {geoms.map((g, i) => (
                <mesh key={i} geometry={g} castShadow receiveShadow>
                    <meshStandardMaterial color="#C8BBA5" roughness={0.9} />
                </mesh>
            ))}
        </>
    );
}

function Annex() {
    const geom = useMemo(() => {
        const g = new THREE.ExtrudeGeometry(shapeFrom(SITE.annex), { depth: 3.6, bevelEnabled: false });
        g.rotateX(-Math.PI / 2);
        return g;
    }, []);
    return (
        <mesh geometry={geom} castShadow receiveShadow>
            <meshStandardMaterial color="#D9D0C1" roughness={0.9} />
        </mesh>
    );
}

function Trees() {
    const crowns = useRef<THREE.InstancedMesh>(null);
    const trunks = useRef<THREE.InstancedMesh>(null);
    useEffect(() => {
        const m = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        const palette = ["#4E7A45", "#5F8C4F", "#3F6B3C", "#6E9858"].map((c) => new THREE.Color(c));
        SITE.trees.forEach(([x, y, s], i) => {
            const rot = new THREE.Euler(0, (i * 1.7) % 6.28, 0);
            q.setFromEuler(rot);
            m.compose(new THREE.Vector3(x - CX, 3.4 * s, y - CY), q, new THREE.Vector3(s * 1.15, s, s * 1.15));
            crowns.current?.setMatrixAt(i, m);
            crowns.current?.setColorAt(i, palette[i % palette.length]);
            m.compose(new THREE.Vector3(x - CX, 1.1 * s, y - CY), q, new THREE.Vector3(s, s, s));
            trunks.current?.setMatrixAt(i, m);
        });
        if (crowns.current) {
            crowns.current.instanceMatrix.needsUpdate = true;
            if (crowns.current.instanceColor) crowns.current.instanceColor.needsUpdate = true;
        }
        if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true;
    }, []);
    const n = SITE.trees.length;
    return (
        <>
            <instancedMesh ref={crowns} args={[undefined, undefined, n]} castShadow>
                <icosahedronGeometry args={[1.9, 1]} />
                <meshStandardMaterial roughness={0.8} flatShading />
            </instancedMesh>
            <instancedMesh ref={trunks} args={[undefined, undefined, n]} castShadow>
                <cylinderGeometry args={[0.14, 0.2, 2.2, 6]} />
                <meshStandardMaterial color="#6B4F36" roughness={1} />
            </instancedMesh>
        </>
    );
}

function Fountain() {
    const water = useRef<THREE.Mesh>(null);
    const jet = useRef<THREE.Mesh>(null);
    const { c, r } = SITE.roundabout;
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        if (water.current) (water.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35 + Math.sin(t * 2) * 0.08;
        if (jet.current) jet.current.scale.y = 1 + Math.sin(t * 3.2) * 0.12;
    });
    return (
        <group position={[c[0] - CX, 0, c[1] - CY]}>
            <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[r * 0.72, r * 0.76, 0.5, 48]} />
                <meshStandardMaterial color="#E3DACB" roughness={0.7} />
            </mesh>
            <mesh ref={water} position={[0, 0.51, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[r * 0.64, 48]} />
                <meshStandardMaterial color="#5FA8C9" emissive="#3E8FB8" emissiveIntensity={0.35} roughness={0.15} metalness={0.2} />
            </mesh>
            <mesh ref={jet} position={[0, 1.4, 0]}>
                <coneGeometry args={[0.35, 1.8, 16, 1, true]} />
                <meshStandardMaterial color="#CFEFFF" transparent opacity={0.55} emissive="#9FDCF5" emissiveIntensity={0.4} />
            </mesh>
        </group>
    );
}

function bboxCenter(pts: Pt[]): Pt {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

/** Text billboard drawn to a canvas texture; always faces the camera and draws on top. */
function Label({ text, position, height, fontPx = 56 }: { text: string; position: [number, number, number]; height: number; fontPx?: number }) {
    const { tex, aspect } = useMemo(() => {
        const font = `700 ${fontPx}px Tajawal, Cairo, sans-serif`;
        const c = document.createElement("canvas");
        const g = c.getContext("2d")!;
        g.font = font;
        const w = Math.ceil(g.measureText(text).width) + fontPx * 1.2;
        const h = Math.ceil(fontPx * 1.7);
        c.width = w;
        c.height = h;
        const r = h / 2;
        g.fillStyle = "rgba(10,20,36,0.85)";
        g.strokeStyle = "rgba(194,155,64,0.85)";
        g.lineWidth = Math.max(2, fontPx / 16);
        g.beginPath();
        g.roundRect(g.lineWidth, g.lineWidth, w - g.lineWidth * 2, h - g.lineWidth * 2, r);
        g.fill();
        g.stroke();
        g.font = font;
        g.fillStyle = "#F3E3B5";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.direction = /[؀-ۿ]/.test(text) ? "rtl" : "ltr";
        g.fillText(text, w / 2, h / 2 + fontPx * 0.06);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        return { tex: t, aspect: w / h };
    }, [text, fontPx]);
    return (
        <sprite position={position} scale={[height * aspect, height, 1]} renderOrder={10}>
            <spriteMaterial map={tex} depthTest={false} transparent />
        </sprite>
    );
}

function BuildingLabels({ show }: { show: boolean }) {
    if (!show) return null;
    return (
        <>
            {(["A", "B"] as const).map((b) => {
                const c = BUILDING_INFO[b].center;
                return <Label key={b} text={BUILDING_INFO[b].name} position={[c.cx - CX, baseY(5) + 3.2, c.cy - CY]} height={2.6} />;
            })}
        </>
    );
}

/** Cinematic fly-in, then hands over to OrbitControls with a slow idle orbit until the user takes over. */
function CameraRig({ onIntroDone, selectedFloor }: { onIntroDone: () => void; selectedFloor: number | null }) {
    const { camera, size } = useThree();
    // On a tall phone screen, look along the site's length so the two buildings stack vertically.
    const tall = size.height > size.width * 1.1;
    const controls = useRef<OrbitControlsImpl>(null);
    const t = useRef(0);
    const done = useRef(false);
    const from = useMemo(() => (tall ? new THREE.Vector3(-260, 230, 40) : new THREE.Vector3(-150, 140, 170)), [tall]);
    const to = useMemo(() => (tall ? new THREE.Vector3(-128, 132, 10) : new THREE.Vector3(-74, 66, 100)), [tall]);
    const [ready, setReady] = useState(false);
    const [spin, setSpin] = useState(true);

    useEffect(() => {
        camera.position.copy(from);
        camera.lookAt(0, 6, 0);
    }, [camera, from]);

    useEffect(() => {
        // Floor isolation reads best from a steeper angle.
        if (!done.current || !controls.current) return;
        const c = controls.current;
        const target = selectedFloor === null ? 0.95 : 0.62;
        const start = c.getPolarAngle();
        const startR = camera.position.distanceTo(c.target);
        const targetR = selectedFloor === null ? Math.max(startR, 110) : 78;
        let raf = 0;
        let k = 0;
        const step = () => {
            k = Math.min(1, k + 0.035);
            const e = 1 - Math.pow(1 - k, 3);
            const a = start + (target - start) * e;
            const off = camera.position.clone().sub(c.target);
            const sph = new THREE.Spherical().setFromVector3(off);
            sph.phi = a;
            sph.radius = startR + (targetR - startR) * e;
            off.setFromSpherical(sph);
            camera.position.copy(c.target).add(off);
            c.update();
            if (k < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [selectedFloor, camera]);

    useFrame((_, dt) => {
        if (done.current) return;
        t.current = Math.min(1, t.current + dt / 4.2);
        const e = 1 - Math.pow(1 - t.current, 3);
        camera.position.lerpVectors(from, to, e);
        camera.lookAt(0, 6 * e, 0);
        if (t.current >= 1) {
            done.current = true;
            if (controls.current) {
                controls.current.target.set(0, 6, 0);
                controls.current.update();
            }
            setReady(true);
            onIntroDone();
        }
    });

    return (
        <OrbitControls
            ref={controls}
            makeDefault
            enabled={ready}
            enableDamping
            dampingFactor={0.08}
            minDistance={25}
            maxDistance={200}
            maxPolarAngle={1.32}
            minPolarAngle={0.2}
            autoRotate={ready && spin}
            autoRotateSpeed={0.35}
            onStart={() => setSpin(false)}
        />
    );
}

export default function MasterplanScene(props: SceneProps) {
    return (
        <Canvas
            shadows
            dpr={[1, 2]}
            camera={{ fov: 38, near: 1, far: 1200, position: [-150, 140, 170] }}
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
            onPointerMissed={() => props.onHover(null)}
        >
            <color attach="background" args={[props.night ? "#070C18" : "#1B2433"]} />
            <fog attach="fog" args={[props.night ? "#0B1424" : "#D7BC9C", 240, 760]} />
            {props.night ? (
                <Stars radius={300} depth={60} count={2500} factor={5} fade speed={0.6} />
            ) : (
                <Sky distance={450} sunPosition={[-120, 26, 90]} turbidity={7} rayleigh={2.2} mieCoefficient={0.006} mieDirectionalG={0.86} />
            )}
            <hemisphereLight args={[props.night ? "#5C74A8" : "#FFE7C4", props.night ? "#141A22" : "#55624F", props.night ? 0.35 : 0.75]} />
            <directionalLight
                position={[-90, 70, 60]}
                intensity={props.night ? 0.45 : 2.1}
                color={props.night ? "#A9BCFF" : "#FFD9A6"}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-left={-90}
                shadow-camera-right={90}
                shadow-camera-top={60}
                shadow-camera-bottom={-60}
                shadow-camera-near={10}
                shadow-camera-far={300}
                shadow-bias={-0.0004}
            />
            <ambientLight intensity={0.18} />
            <Scene {...props} />
            <CameraRig onIntroDone={props.onIntroDone} selectedFloor={props.selectedFloor} />
        </Canvas>
    );
}

/** Ground arrow at the plot's west edge: north is the left side of the drawings (−x). */
function NorthMarker() {
    const x = -4 - CX;
    const z = 20 - CY;
    return (
        <group position={[x, 0.12, z]}>
            <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                <circleGeometry args={[2.6, 48]} />
                <meshStandardMaterial color="#0E1B2E" transparent opacity={0.75} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.02, 0]}>
                <shapeGeometry
                    args={[
                        new THREE.Shape([new THREE.Vector2(0, 2.1), new THREE.Vector2(0.9, -1.3), new THREE.Vector2(0, -0.6), new THREE.Vector2(-0.9, -1.3)]),
                    ]}
                />
                <meshStandardMaterial color="#C29B40" emissive="#C29B40" emissiveIntensity={0.3} />
            </mesh>
            <Label text="N  شمال" position={[-3.6, 1.6, 0]} height={1.5} fontPx={48} />
        </group>
    );
}

function Scene({ hoveredId, selectedFloor, selectedBuilding, onHover, onSelect, night }: SceneProps) {
    const facade = useFacadeTexture();
    const glowMap = useWindowGlow();
    return (
        <>
            <Suspense fallback={null}>
                <Ground />
            </Suspense>
            <Plinths />
            <Annex />
            <Trees />
            <Fountain />
            {UNITS.map((u) => (
                <UnitBlock
                    key={u.id}
                    unit={u}
                    facade={facade}
                    glowMap={glowMap}
                    night={night}
                    hovered={hoveredId === u.id}
                    selectedFloor={selectedFloor}
                    selectedBuilding={selectedBuilding}
                    onHover={onHover}
                    onSelect={onSelect}
                />
            ))}
            <BuildingLabels show={selectedFloor === null} />
            <NorthMarker />
        </>
    );
}
