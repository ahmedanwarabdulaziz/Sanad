/**
 * Sanad Zayed interactive master plan: unit data.
 *
 * Geometry was traced from the architect's preliminary CAD sheets (General 0/1 and Details 0/1).
 * All coordinates are in metres, measured from the plot's top-left corner (x to the right, y down,
 * the same orientation as the drawings). Each building has a ground floor plus four identical
 * typical floors, five units per floor, so 20 distinct plans serve 50 units.
 */
import plansJson from "./plans.json";
import siteJson from "./site.json";

export type Pt = [number, number];
export type RoomType = "bed" | "liv" | "kit" | "bath" | "dress" | "balc" | "hall" | "x";

export interface Room {
    type: RoomType;
    name: string;
    poly: Pt[];
    /** Cleaned, straightened outline used for drawing; tucks under the walls. */
    fill?: Pt[];
    label: Pt;
    /** Largest clear rectangle inside the room [x0, y0, x1, y1] (furniture goes here). */
    rect?: [number, number, number, number];
    /** Approximate position of the room's door, if any. */
    door?: Pt | null;
    /** Clear internal dimensions in metres, short side first; null for corridors. */
    dims: [number, number] | null;
    area: number;
}

export interface Plan {
    floorType: 0 | 1;
    unit: string;
    drawArea: number;
    footprint: Pt[];
    rooms: Room[];
    counts: { bed: number; bath: number; balc: number; dress: number };
    /** Solid wall outlines (draw with fill-rule evenodd). */
    walls: Pt[][];
    /** Door leaves and swings from the CAD, as SVG path data. */
    doors: string[];
    /** Open façade length (m) per compass direction, plus view flags; computed from the site geometry. */
    facts: {
        facades: Record<"N" | "S" | "E" | "W", number>;
        corner: boolean;
        fountain: boolean;
        roadside: boolean;
    };
}

// ---------------------------------------------------------------- project & sales facts

/** The plot: 30°04'00.5"N 31°00'30.7"E. */
export const PROJECT_LOCATION = {
    lat: 30.0668056,
    lng: 31.0085278,
    name: "مشروع سند زايد",
    address: "شارع رقم 6، متفرع من شارع النزهة، الثروة الخضراء، الشيخ زايد",
};

/** Exact pin of the plot in Google Maps (opens the app on phones). */
export const GOOGLE_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${PROJECT_LOCATION.lat},${PROJECT_LOCATION.lng}`;

/**
 * The project's area: the triangle east of El-Nozha Street, between the Cairo–Alexandria desert road
 * and the 26th of July Corridor (corners near Al Ahly club, Hyper One, and the road/corridor junction).
 * Traced from Google Maps and calibrated on the Al Ahly and Hyper One pins (about ±50 m).
 */
export const PROJECT_AREA = {
    polygon: [
        { lat: 30.080821, lng: 30.976794 },
        { lat: 30.049976, lng: 31.052547 },
        { lat: 30.029977, lng: 31.022018 },
    ],
    title: "المنطقة الوحيدة المتاحة حاليًا في الشيخ زايد",
    subtitle: "بين شارع النزهة وطريق مصر إسكندرية الصحراوي ومحور 26 يوليو",
    /** Road along each side: polygon[i] → polygon[i + 1]. */
    sides: ["طريق مصر إسكندرية الصحراوي", "محور 26 يوليو", "شارع النزهة"],
    highlights: [
        "داخل كردون مدينة الشيخ زايد وتحت إشراف جهاز المدينة",
        "يحدها ثلاثة محاور رئيسية تربطها بالقاهرة والجيزة والساحل",
        "دقائق من النادي الأهلي وهايبر وان وأبراج زد والقرية الذكية",
    ],
    /**
     * Sources: news reports on the presidential decree annexing the area to Sheikh Zayed and changing
     * its use from agricultural to urban (Youm7, Sept 2017), and on regularising plots ahead of
     * completing utilities (Masrawy, Dec 2023).
     */
    about: {
        title: "عن منطقة الثروة الخضراء",
        text: "الثروة الخضراء هي الامتداد الشرقي لمدينة الشيخ زايد، ضُمّت إلى كردون المدينة بقرار جمهوري وتحوّل نشاطها من زراعي إلى عمراني، لتدخل ضمن التخطيط الرسمي لجهاز المدينة وهيئة المجتمعات العمرانية الجديدة. تتوسط المنطقة أهم محاور غرب القاهرة، ويجري توفيق أوضاعها واستكمال مرافقها وخدماتها مع انطلاق مشروعات سكنية جديدة، ما يجعلها من أسرع مناطق الشيخ زايد نموًا وأكثرها فرصًا للاستثمار.",
    },
};

export interface NearbyPlace {
    id: string;
    name: string;
    kind: string;
    icon: string;
    lat: number;
    lng: number;
    /** Google Maps' best driving route from the project, normal traffic. */
    driveKm: number;
    driveMin: number;
    via: string;
    /** Search text for the "open route in Google Maps" link. */
    query: string;
    /** Where the map label sits relative to the pin (default below), to avoid overlaps. */
    labelSide?: "down" | "up" | "left" | "right";
}

/**
 * "سند زايد قريبة من إيه؟" — places shown on the nearby map, in the order the movie visits them.
 * Coordinates are the Google Maps place pins; driveKm/driveMin/via are Google Maps' best driving
 * route from the project (looked up Nov 2026, typical traffic).
 * To add a place: copy an entry and fill it the same way.
 */
export const NEARBY_PLACES: NearbyPlace[] = [
    {
        id: "yasmeen",
        name: "كمبوند الياسمين",
        kind: "سكني",
        icon: "🏡",
        lat: 30.0474745,
        lng: 30.9949878,
        driveKm: 5.0,
        driveMin: 11,
        via: "عبر شارع النزهة",
        query: "كمبوند الياسمين الشيخ زايد",
        labelSide: "left",
    },
    {
        id: "ahly",
        name: "النادي الأهلي",
        kind: "نادي رياضي · فرع الشيخ زايد",
        icon: "⚽",
        lat: 30.0804773,
        lng: 30.9770995,
        driveKm: 5.4,
        driveMin: 11,
        via: "عبر شارع النزهة",
        query: "Al Ahly - El Sheikh Zayed",
    },
    {
        id: "hyper-one",
        name: "هايبر وان",
        kind: "تسوق",
        icon: "🛒",
        lat: 30.0301505,
        lng: 31.0218634,
        driveKm: 7.1,
        driveMin: 13,
        via: "عبر شارع النزهة",
        query: "Hyper One, Sheikh Zayed",
    },
    {
        id: "zed",
        name: "أبراج زد",
        kind: "أبراج ومول · ZED",
        icon: "🏙️",
        lat: 30.0465987,
        lng: 30.9997843,
        driveKm: 6.4,
        driveMin: 14,
        via: "عبر النزهة والعبور",
        query: "ZED Tower Mall, Sheikh Zayed",
        labelSide: "right",
    },
    {
        id: "smart-village",
        name: "القرية الذكية",
        kind: "أعمال وشركات",
        icon: "💼",
        lat: 30.0718057,
        lng: 31.0198361,
        driveKm: 15.8,
        driveMin: 19,
        via: "عبر طريق مصر إسكندرية الصحراوي",
        query: "Smart Village, Giza",
    },
];

/** Hyper One Sheikh Zayed (kept as its own constant for the location panel). */
export const HYPER_ONE = NEARBY_PLACES.find((p) => p.id === "hyper-one")!;

/** Straight-line distance in km between two points. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

export const hyperOneRouteEmbedUrl = () =>
    `https://maps.google.com/maps?saddr=${PROJECT_LOCATION.lat},${PROJECT_LOCATION.lng}&daddr=${HYPER_ONE.lat},${HYPER_ONE.lng}&hl=ar&output=embed`;

export const mapsEmbedUrl = (satellite = false) =>
    `https://maps.google.com/maps?q=${PROJECT_LOCATION.lat},${PROJECT_LOCATION.lng}&z=${satellite ? 17 : 14}&t=${satellite ? "k" : "m"}&hl=ar&output=embed`;
export const directionsUrl = (to?: string) =>
    to
        ? `https://www.google.com/maps/dir/?api=1&origin=${PROJECT_LOCATION.lat},${PROJECT_LOCATION.lng}&destination=${encodeURIComponent(to)}`
        : `https://www.google.com/maps/dir/?api=1&destination=${PROJECT_LOCATION.lat},${PROJECT_LOCATION.lng}`;

/** Landmarks; Google Maps computes the live route and drive time from the project. */
export const LANDMARKS: { name: string; query: string; kind: string }[] = [
    { name: "مول العرب", query: "Mall of Arabia, Sheikh Zayed", kind: "تسوق" },
    { name: "أركان بلازا", query: "Arkan Plaza, Sheikh Zayed", kind: "تسوق" },
    { name: "هايبر وان", query: "Hyper One, Sheikh Zayed", kind: "تسوق" },
    { name: "محور 26 يوليو", query: "26th of July Corridor, Sheikh Zayed", kind: "طرق" },
    { name: "طريق مصر الإسكندرية الصحراوي", query: "Cairo Alexandria Desert Road, Sheikh Zayed", kind: "طرق" },
    { name: "القرية الذكية", query: "Smart Village, Giza", kind: "أعمال" },
    { name: "المتحف المصري الكبير", query: "Grand Egyptian Museum", kind: "معالم" },
    { name: "مطار سفنكس الدولي", query: "Sphinx International Airport", kind: "سفر" },
];

export const SALES_PHONES = ["01100994488", "01111101753"];
/** WhatsApp in international format (Egypt). */
export const WHATSAPP = "201100994488";
export const whatsappUrl = (text: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

export const ALLOCATION_NOTE = "تخصيص الوحدات سيبدأ لمستثمرين سند حسب أولوية السداد ورغبتهم في شراء وحدات بمجرد إصدار التراخيص";

/** Mirrors the roadmap on the Sanad Zayed project page (messages ar.json → SanadZayed.roadmap / liveStatus). */
export const STAGES: { title: string; text: string; state: "done" | "now" | "next" }[] = [
    { title: "شراء الأرض", text: "استكمال إجراءات الاتفاق وسداد كامل ثمن الأرض.", state: "done" },
    { title: "نقل الملكية والتسجيل", text: "إجراءات نقل الملكية لدى جهاز مدينة الشيخ زايد تمهيدًا للتسجيل باسم الشركة.", state: "now" },
    { title: "التصميم المعماري والإنشائي وMEP", text: "إعداد التصميم الهندسي الكامل، والمخطط المعروض هنا تصميم مبدئي.", state: "next" },
    { title: "القرارات والتراخيص", text: "استخراج القرارات والاعتمادات اللازمة ثم رخصة البناء.", state: "next" },
    { title: "تخصيص الوحدات", text: "يبدأ تخصيص الوحدات لمستثمرين سند حسب أولوية السداد ورغبتهم في شراء وحدات بمجرد إصدار التراخيص.", state: "next" },
    { title: "التنفيذ حتى التسليم", text: "بدء التنفيذ مع تقارير تقدم دورية ومتابعة المراحل حتى التسليم.", state: "next" },
];

export const DIR_NAMES: Record<"N" | "S" | "E" | "W", string> = { N: "بحري (شمال)", S: "قبلي (جنوب)", E: "شرقي", W: "غربي" };

export function areaBreakdown(unit: Unit) {
    const base = unit.plan.drawArea;
    const loading = base * LOADING;
    return { base, loading, total: unit.area };
}

/** Short selling points derived from the plan and the site geometry. */
export function unitHighlights(unit: Unit): string[] {
    const f = unit.plan.facts;
    const out: string[] = [];
    if (unit.floor === 0) out.push("دور أرضي بحديقة خاصة (المساحة تُحدَّد لاحقًا)");
    if (f.facades.N >= 3.5) out.push("واجهة بحرية بتهوية طبيعية ممتازة");
    if (f.corner) out.push("وحدة ناصية بأكثر من واجهة");
    if (f.fountain) out.push("إطلالة على الميدان والنافورة");
    const liv = unit.plan.rooms.find((r) => r.type === "liv");
    const sameFloor = UNITS.filter((u) => u.floor === unit.floor);
    const livArea = (u: Unit) => u.plan.rooms.find((r) => r.type === "liv")?.area ?? 0;
    if (liv && sameFloor.every((u) => livArea(u) <= liv.area)) out.push("أكبر ريسبشن في الدور");
    if (unit.plan.counts.dress > 0) out.push("غرفة نوم رئيسية بغرفة ملابس");
    if (unit.floor >= 3) out.push("دور مرتفع بإطلالة مفتوحة");
    return out;
}

export function facadeList(unit: Unit) {
    const f = unit.plan.facts.facades;
    return (Object.keys(f) as ("N" | "S" | "E" | "W")[]).filter((d) => f[d] >= 3.5).map((d) => DIR_NAMES[d]);
}

export const fmtArea = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n);

export interface Unit {
    id: string;
    code: string;
    building: "A" | "B";
    floor: number;
    index: number;
    plan: Plan;
    /** Marketed area in m²: drawing area plus the 35% loading, rounded. */
    area: number;
}

export interface Site {
    tex: { x0: number; y0: number; x1: number; y1: number };
    plot: Pt[];
    roundabout: { c: Pt; r: number };
    outer: Pt[];
    inner: Pt[];
    top: Pt[];
    annex: Pt[];
    trees: [number, number, number][];
}

export const LOADING = 0.35;
export const FLOORS = 5;
export const FLOOR_HEIGHT = 3.2;

const toLatinDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

export const PLANS = Object.fromEntries(
    Object.entries(plansJson as unknown as Record<string, Plan>).map(([k, p]) => [
        k,
        { ...p, rooms: p.rooms.map((r) => ({ ...r, name: toLatinDigits(r.name) })) },
    ])
) as Record<string, Plan>;
export const SITE = siteJson as unknown as Site;

export const FLOOR_NAMES = ["الدور الأرضي", "الدور الأول", "الدور الثاني", "الدور الثالث", "الدور الرابع"];
export const FLOOR_SHORT = ["أرضي", "الأول", "الثاني", "الثالث", "الرابع"];

export const ROOM_COLORS: Record<RoomType, string> = {
    bed: "#E8D3AC",
    liv: "#F1C49A",
    kit: "#BBD5BE",
    bath: "#B5D2E6",
    dress: "#D6C3E4",
    balc: "#CBE2AA",
    hall: "#EFE8DC",
    x: "#E4DED3",
};

export const ROOM_LEGEND: { type: RoomType; label: string }[] = [
    { type: "liv", label: "ريسبشن" },
    { type: "bed", label: "غرف نوم" },
    { type: "kit", label: "مطبخ" },
    { type: "bath", label: "حمامات" },
    { type: "dress", label: "غرفة ملابس" },
    { type: "balc", label: "بلكونات" },
];

export const DISCLAIMERS = [
    "المساحات الموضحة تشمل المساحة الفعلية للوحدة مضافًا إليها البروزات ونسبة التحميل المتعارف عليها.",
    "المساحات الخضراء المخصصة لكل وحدة لم يتم تحديدها بعد في هذا المخطط.",
    "هذا المخطط مبدئي لأغراض العرض، ويخضع للتعديل لحين اعتماده من الجهات المختصة.",
    "الأبعاد الموضحة صافية وتقريبية، والصور والمجسمات توضيحية.",
];

export function unitCode(building: string, floor: number, index: number) {
    return `${building}-${floor === 0 ? "G" : floor}${String(index).padStart(2, "0")}`;
}

export const UNITS: Unit[] = (() => {
    const out: Unit[] = [];
    for (const building of ["A", "B"] as const) {
        for (let floor = 0; floor < FLOORS; floor++) {
            for (let index = 1; index <= 5; index++) {
                const plan = PLANS[`${floor === 0 ? 0 : 1}${building}${index}`];
                out.push({
                    id: `${building}-${floor}-${index}`,
                    code: unitCode(building, floor, index),
                    building,
                    floor,
                    index,
                    plan,
                    area: Math.round(plan.drawArea * (1 + LOADING)),
                });
            }
        }
    }
    return out;
})();

export const UNIT_BY_ID = Object.fromEntries(UNITS.map((u) => [u.id, u])) as Record<string, Unit>;

// All figures are shown in English (Western) digits.
const ar = new Intl.NumberFormat("en-US");
const ar2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmt = (n: number) => ar.format(n);
export const fmtDim = (n: number) => ar2.format(n);
export const fmtDims = (d: [number, number]) => `${fmtDim(d[0])} × ${fmtDim(d[1])} م`;

export function bedroomsLabel(n: number) {
    if (n === 1) return "غرفة نوم واحدة";
    if (n === 2) return "غرفتا نوم";
    return `${fmt(n)} غرف نوم`;
}
export function bathsLabel(n: number) {
    if (n === 1) return "حمام واحد";
    if (n === 2) return "حمامان";
    return `${fmt(n)} حمامات`;
}

/** Centre of the scene in drawing metres; 3D world is centred here. */
export const CENTER: Pt = [60, 21];

export function bbox(pts: Pt[]) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
    }
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

export const BUILDING_INFO = {
    A: { name: "مبنى A", center: bbox(UNITS.filter((u) => u.building === "A" && u.floor === 1).flatMap((u) => u.plan.footprint)) },
    B: { name: "مبنى B", center: bbox(UNITS.filter((u) => u.building === "B" && u.floor === 1).flatMap((u) => u.plan.footprint)) },
};
