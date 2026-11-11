import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { submissionsDb } from "@/lib/submissionStore";
import { ENQUIRY_STATUS_LABELS } from "@/lib/unitEnquiry";

// GET /api/sanad-zayed/unit-enquiries — list, newest first.
export async function GET() {
    const auth = await requireAuth("viewer");
    if ("error" in auth) return auth.error;
    const { data, error } = await submissionsDb.from("unit_enquiries").select("*").order("created_at", { ascending: false });
    if (error) {
        console.error("Unit enquiries list failed:", error);
        return NextResponse.json({ error: "فشل في تحميل الاستفسارات" }, { status: 500 });
    }
    return NextResponse.json({ enquiries: data });
}

// PATCH /api/sanad-zayed/unit-enquiries — { id, status?, notes? }
export async function PATCH(request: Request) {
    const auth = await requireAuth("editor");
    if ("error" in auth) return auth.error;
    const { id, status, notes } = await request.json();
    if (typeof id !== "string") return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    const update: Record<string, string> = { updated_at: new Date().toISOString() };
    if (typeof notes === "string") update.notes = notes.slice(0, 5000);
    if (status !== undefined) {
        if (!(status in ENQUIRY_STATUS_LABELS)) return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
        update.status = status;
    }
    const { data, error } = await submissionsDb.from("unit_enquiries").update(update).eq("id", id).select().single();
    if (error) {
        console.error("Unit enquiry update failed:", error);
        return NextResponse.json({ error: "فشل في حفظ التعديل" }, { status: 500 });
    }
    return NextResponse.json({ enquiry: data });
}
