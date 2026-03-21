import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { data: items, error } = await supabase
      .from("proj2_items")
      .select("*, category:proj2_categories(name)")
      .eq("project_id", id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch movements to calculate stock balance
    const { data: movs } = await supabase
      .from("proj2_stock_movements")
      .select("item_id, type, quantity")
      .eq("project_id", id);
      
    if (items && movs) {
      items.forEach((it: any) => {
        let stock = 0;
        movs.forEach(m => {
          if (m.item_id === it.id) {
            stock += m.type === "in" ? Number(m.quantity) : -Number(m.quantity);
          }
        });
        it.stock_quantity = stock;
      });
    }

    return NextResponse.json({ items: items || [] });
  } catch {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.category_id || !body.name || !body.unit) {
      return NextResponse.json({ error: "جميع الحقول (المجموعة، الاسم، الوحدة) مطلوبة" }, { status: 400 });
    }

    const { data: existing } = await supabase.from("proj2_items").select("code").eq("project_id", id);
    let nextNum = 1;
    if (existing && existing.length > 0) {
       const nums = existing.map(i => {
         const match = i.code ? i.code.match(/\d+/) : null;
         return match ? parseInt(match[0]) : 0;
       });
       nextNum = Math.max(...nums) + 1;
    }
    const code = `I-${String(nextNum).padStart(3, '0')}`;

    const { data, error } = await supabase
      .from("proj2_items")
      .insert({
        project_id: id,
        category_id: body.category_id,
        code,
        name: body.name,
        unit: body.unit,
      })
      .select("*, category:proj2_categories(name)")
      .single();

    if (error) {
       if (error.code === '23505') {
           return NextResponse.json({ error: "هذا الكود مستخدم بالفعل" }, { status: 400 });
       }
       return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ item: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
