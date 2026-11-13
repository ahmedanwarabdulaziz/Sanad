import type { Metadata } from "next";
import MilestoneFilm, { DrawingGallery } from "@/components/milestone-film/MilestoneFilm";

export const metadata: Metadata = {
    title: "حقّ المرحلة | سند",
    description: "عرض تفاعلي يشرح منهج سند «حقّ المرحلة»: إزاي بنختار مشاريعنا وشركاءنا، وإزاي بتتحسب كل مرحلة.",
    // draft: keep it out of search results until the film is finished
    robots: { index: false, follow: false },
};

/**
 * Review helpers while the film is being built:
 * `?gallery=1` shows every background drawing on one sheet; `?scene=N` starts the film at scene N.
 */
export default async function MilestoneFilmPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const q = await searchParams;
    if (q.gallery) return <DrawingGallery />;
    const scene = Number(typeof q.scene === "string" ? q.scene : 0);
    return <MilestoneFilm startScene={Number.isFinite(scene) ? scene : 0} />;
}
