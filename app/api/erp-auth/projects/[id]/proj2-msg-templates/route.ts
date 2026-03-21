import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const DEFAULTS: Record<string, string> = {
  quote_whatsapp: `مرحباً {{اسم_العميل}}،\n\nيسعدنا تواصلكم مع شركة سند برو كابيتال للمشروعات.\nعرض السعر رقم: {{رقم_العرض}}\nالإجمالي: {{الإجمالي}} ج.م\n\n📄 رابط عرض السعر:\n{{رابط_PDF}}\n\nنسعد بخدمتكم،\nإدارة المبيعات\n01100994488`,
  invoice_whatsapp: `مرحباً {{اسم_العميل}}،\n\nيسعدنا تواصلكم مع شركة سند برو كابيتال للمشروعات.\nفاتورة البيع رقم: {{رقم_الفاتورة}}\nالإجمالي: {{الإجمالي}} ج.م\n\n📄 رابط الفاتورة:\n{{رابط_PDF}}\n\nنسعد بخدمتكم،\nإدارة المبيعات\n01100994488`,
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await supabase
    .from("proj2_message_templates")
    .select("type, content")
    .eq("project_id", id);

  const result: Record<string, string> = { ...DEFAULTS };
  (data || []).forEach((row: any) => { result[row.type] = row.content; });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { type, content } = await req.json();
  if (!type || !content) return NextResponse.json({ error: "type و content مطلوبان" }, { status: 400 });

  const { error } = await supabase
    .from("proj2_message_templates")
    .upsert({ project_id: id, type, content, updated_at: new Date().toISOString() }, { onConflict: "project_id,type" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
