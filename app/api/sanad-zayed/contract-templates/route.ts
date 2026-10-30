import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";
import { TEMPLATE_VARS, DEFAULT_STAGE_VALUES, DEFAULT_TEMPLATE_BODY, DEFAULT_TEMPLATE_TITLE, DEFAULT_TEMPLATE_SUBTITLE } from "@/lib/sanad-zayed/contractTemplate";

const STAGE_KEYS = new Set(TEMPLATE_VARS.filter(v => v.source === "stage").map(v => v.key));

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

// ── PATCH /api/sanad-zayed/contract-templates ─────────────────────────
// Merges stage default values (e.g. the company representative) into the
// stage's template, creating it from the standard template when missing.
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    if (!body.stage_id) return NextResponse.json({ error: "المرحلة مطلوبة" }, { status: 422 });
    const updates = Object.fromEntries(Object.entries(cleanDefaults(body.defaults)).filter(([k]) => STAGE_KEYS.has(k)));
    if (!Object.keys(updates).length) return NextResponse.json({ error: "لا توجد بيانات للحفظ" }, { status: 422 });

    const { data: existing, error: readError } = await supabase
      .from("sz_contract_templates")
      .select("*")
      .eq("stage_id", body.stage_id)
      .maybeSingle();
    if (readError) throw readError;

    const { data, error } = existing
      ? await supabase
          .from("sz_contract_templates")
          .update({ defaults: { ...(existing.defaults ?? {}), ...updates }, updated_at: new Date().toISOString() })
          .eq("stage_id", body.stage_id)
          .select("*")
          .single()
      : await supabase
          .from("sz_contract_templates")
          .insert({
            stage_id: body.stage_id,
            title: DEFAULT_TEMPLATE_TITLE,
            subtitle: DEFAULT_TEMPLATE_SUBTITLE,
            body: DEFAULT_TEMPLATE_BODY,
            defaults: { ...DEFAULT_STAGE_VALUES, ...updates },
            updated_at: new Date().toISOString(),
          })
          .select("*")
          .single();

    if (error) throw error;
    return NextResponse.json({ template: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
