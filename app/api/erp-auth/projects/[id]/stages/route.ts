import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET — list stages for a project
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("project_stages")
      .select("*, investor_contracts(count)")
      .eq("project_id", id)
      .order("sort_order");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ stages: data });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

// POST — create a stage
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { stage_name, unit_type, base_unit_price, sort_order, total_area, management_percentage } = await request.json();

    if (!stage_name) {
      return NextResponse.json({ error: "اسم المرحلة مطلوب" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("project_stages")
      .insert({
        project_id: id,
        stage_name,
        unit_type: unit_type || "LAND_METER",
        base_unit_price: base_unit_price || 0,
        total_area: total_area || 0,
        management_percentage: management_percentage || 0,
        sort_order: sort_order || 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ stage: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
