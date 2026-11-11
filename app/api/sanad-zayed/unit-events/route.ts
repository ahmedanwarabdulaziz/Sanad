import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { submissionsDb } from "@/lib/submissionStore";

const UNIT_ID = /^[AB]-[0-4]-[1-5]$/;
const EVENTS = new Set(["view", "brochure", "tour"]);

// POST /api/sanad-zayed/unit-events — anonymous interest counter from the interactive plan.
export async function POST(request: Request) {
    try {
        const { unitId, event, source } = await request.json();
        if (typeof unitId !== "string" || !UNIT_ID.test(unitId) || !EVENTS.has(event)) {
            return NextResponse.json({ ok: false }, { status: 400 });
        }
        const { error } = await submissionsDb
            .from("unit_events")
            .insert({ unit_id: unitId, event, source: typeof source === "string" ? source.slice(0, 20) : "" });
        if (error) console.error("Unit event save failed:", error);
        return NextResponse.json({ ok: !error });
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }
}

// GET /api/sanad-zayed/unit-events — per-unit totals for the admin page.
export async function GET() {
    const auth = await requireAuth("viewer");
    if ("error" in auth) return auth.error;
    const { data, error } = await submissionsDb.from("unit_events").select("unit_id, event").limit(50000);
    if (error) {
        console.error("Unit events load failed:", error);
        return NextResponse.json({ error: "فشل في تحميل الإحصائيات" }, { status: 500 });
    }
    const totals: Record<string, Record<string, number>> = {};
    for (const row of data ?? []) {
        totals[row.unit_id] ??= {};
        totals[row.unit_id][row.event] = (totals[row.unit_id][row.event] ?? 0) + 1;
    }
    return NextResponse.json({ totals });
}
