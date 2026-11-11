import type { Metadata } from "next";
import Masterplan2D from "@/components/masterplan/Masterplan2D";
import { BUILDING_INFO, FLOOR_NAMES, UNIT_BY_ID } from "@/lib/sanad-zayed/masterplan/data";

const BASE = new URL("https://www.sanadproprojects.com");
const TITLE = "سند زايد | اكتشف المشروع";
const DESC = "اكتشف مشروع سند زايد: المباني والأدوار بعرض ثلاثي الأبعاد، وتفاصيل كل وحدة بمساحاتها وتوزيع غرفها، وقربه من أهم أماكن الشيخ زايد.";

/**
 * Link previews: a shared unit link (?unit=A-1-3) shows that unit's plan card; everything else
 * shows the project card. Images are pre-rendered in public/images/sanad-zayed/og/.
 */
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
    const q = await searchParams;
    const id = typeof q.unit === "string" ? q.unit : "";
    const unit = UNIT_BY_ID[id];
    if (unit) {
        const c = unit.plan.counts;
        const title = `وحدة ${unit.code} · ${unit.area} م² · سند زايد`;
        const description = `${BUILDING_INFO[unit.building].name} · ${FLOOR_NAMES[unit.floor]} · ${c.bed} غرف نوم · ${c.bath} حمامات${unit.floor === 0 ? " · حديقة خاصة" : ""}. شاهد المسقط والأبعاد وتفاصيل الوحدة في مشروع سند زايد بالشيخ زايد.`;
        const image = { url: `/images/sanad-zayed/og/${unit.id}.jpg?v=2`, width: 1200, height: 630, alt: `مسقط الوحدة ${unit.code}` };
        return {
            metadataBase: BASE,
            title,
            description,
            openGraph: { title, description, images: [image], type: "website", locale: "ar_EG", siteName: "سند برو كابيتال" },
            twitter: { card: "summary_large_image", title, description, images: [image.url] },
        };
    }
    const image = { url: "/images/sanad-zayed/og/masterplan.jpg?v=2", width: 1200, height: 630, alt: "سند زايد · مشروع سكني في قلب الشيخ زايد" };
    return {
        metadataBase: BASE,
        title: TITLE,
        description: DESC,
        openGraph: { title: TITLE, description: DESC, images: [image], type: "website", locale: "ar_EG", siteName: "سند برو كابيتال" },
        twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: [image.url] },
    };
}

/** The single entrance: the 2D master plan, with the 3D view as an option inside it. */
export default function SanadZayedMasterplanPage() {
    return <Masterplan2D />;
}
