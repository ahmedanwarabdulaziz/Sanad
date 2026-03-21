import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/erp-auth/investors — list all investors
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("investors")
      .select("*")
      .order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ investors: data });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

// POST /api/erp-auth/investors — create an investor
export async function POST(request: Request) {
  try {
    const { name, phone, email, national_id, notes } = await request.json();
    if (!name) {
      return NextResponse.json({ error: "اسم المستثمر مطلوب" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("investors")
      .insert({ name, phone: phone || "", email: email || "", national_id: national_id || "", notes: notes || "" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ investor: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
