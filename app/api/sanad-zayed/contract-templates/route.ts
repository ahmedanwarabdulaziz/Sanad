import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function cleanDefaults(input: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (input && typeof input === "object") {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (/^[a-z0-9_]+$/i.test(k) && v !== null && v !== undefined) out[k] = String(v).trim();
    }
  }
  return out;
}

// ── GET /api/sanad-zayed/contract-templates?stage_id= ─────────────────
// Without stage_id returns all templates (id, stage_id, title, updated_at).
export async function GET(request: NextRequest) {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  try {
    const stageId = new URL(request.url).searchParams.get("stage_id");

    if (stageId) {
      const { data, error } = await supabase
        .from("sz_contract_templates")
        .select("*")
        .eq("stage_id", stageId)
        .maybeSingle();
      if (error) throw error;
      return NextResponse.json({ template: data });
    }

    const { data, error } = await supabase
      .from("sz_contract_templates")
      .select("id, stage_id, title, updated_at");
    if (error) throw error;
    return NextResponse.json({ templates: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}

// ── PUT /api/sanad-zayed/contract-templates ───────────────────────────
// Creates or replaces the template of a stage.
export async function PUT(request: NextRequest) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    if (!body.stage_id) return NextResponse.json({ error: "المرحلة مطلوبة" }, { status: 422 });
    if (!body.title?.trim()) return NextResponse.json({ error: "عنوان العقد مطلوب" }, { status: 422 });
    if (!body.body?.trim()) return NextResponse.json({ error: "نص العقد مطلوب" }, { status: 422 });

    const { data, error } = await supabase
      .from("sz_contract_templates")
      .upsert(
        {
          stage_id: body.stage_id,
          title: body.title.trim(),
          subtitle: (body.subtitle ?? "").trim(),
          body: body.body,
          defaults: cleanDefaults(body.defaults),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stage_id" }
      )
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ template: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
