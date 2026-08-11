import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── PUT /api/sanad-zayed/units/reorder ──────────────────────────────────
// Body: { ids: string[] } — the unit ids for one stage, in their new display
// order. Persists sort_order = array index for each.
export async function PUT(request: NextRequest) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    if (ids.length === 0) return NextResponse.json({ error: "لا توجد وحدات لإعادة الترتيب" }, { status: 422 });

    await Promise.all(
      ids.map((id, index) =>
        supabase.from("sz_units").update({ sort_order: index }).eq("id", id)
      )
    );

    return NextResponse.json({ message: "تم حفظ الترتيب" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
