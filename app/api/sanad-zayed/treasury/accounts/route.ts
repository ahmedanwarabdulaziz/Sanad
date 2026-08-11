import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const { account_name, account_type, custodian_name } = body;

    if (!account_name || !account_name.trim()) {
      return NextResponse.json({ error: "اسم الحساب مطلوب" }, { status: 422 });
    }

    const { data, error } = await supabase
      .from("sz_financial_accounts")
      .insert({
        account_name: account_name.trim(),
        account_type: account_type || "SAFE_CASH",
        custodian_name: custodian_name?.trim() || "",
        current_balance: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ account: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}
