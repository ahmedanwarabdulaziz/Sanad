import { redirect } from "next/navigation";

/** Old address of the 2D plan; everything now lives at /projects/sanad-zayed/masterplan. */
export default async function OldMasterplan2D({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(await searchParams)) if (typeof v === "string") q.set(k, v);
    const qs = q.toString();
    redirect(`/projects/sanad-zayed/masterplan${qs ? `?${qs}` : ""}`);
}
