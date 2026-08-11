import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/requireAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function validateInvestor(body: Record<string, unknown>) {
  const errors: Record<string, string> = {};

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    errors.name = "الاسم مطلوب";
  } else if (body.name.trim().length < 2) {
    errors.name = "الاسم يجب أن يكون حرفين على الأقل";
  }

  if (body.email && typeof body.email === "string" && body.email.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
      errors.email = "البريد الإلكتروني غير صالح";
    }
  }

  if (!body.phone || typeof body.phone !== "string" || !body.phone.trim()) {
    errors.phone = "رقم الهاتف الأول مطلوب";
  } else if (!/^01[0-9]{9}$/.test(body.phone.toString().replace(/[\s\-]/g, ""))) {
    errors.phone = "رقم هاتف غير صالح — يجب أن يكون 11 رقماً ويبدأ بـ 01";
  }

  if (body.phone_2 && typeof body.phone_2 === "string" && body.phone_2.trim()) {
    if (!/^01[0-9]{9}$/.test(body.phone_2.replace(/[\s\-]/g, ""))) {
      errors.phone_2 = "رقم هاتف غير صالح — يجب أن يكون 11 رقماً ويبدأ بـ 01";
    }
  }

  if (body.national_id && typeof body.national_id === "string" && body.national_id.trim()) {
    if (!/^\d{14}$/.test(body.national_id.trim())) {
      errors.national_id = "رقم البطاقة القومية يجب أن يتكون من 14 رقماً";
    }
  }

  return errors;
}

// ── GET /api/sanad-zayed/investors/[id] ───────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from("sz_investors")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "المستثمر غير موجود" }, { status: 404 });
    }

    return NextResponse.json({ investor: data });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

// ── PATCH /api/sanad-zayed/investors/[id] ────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();

    const errors = validateInvestor(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 422 });
    }

    const { data, error } = await supabase
      .from("sz_investors")
      .update({
        name:                   body.name.trim(),
        email:                  body.email?.trim() ?? "",
        phone:                  body.phone.trim().replace(/[\s\-]/g, ""),
        phone_2:                body.phone_2?.trim().replace(/[\s\-]/g, "") ?? "",
        national_id:            body.national_id?.trim() ?? "",
        job_in_national_id:     body.job_in_national_id?.trim() ?? "",
        address_in_national_id: body.address_in_national_id?.trim() ?? "",
        notes:                  body.notes?.trim() ?? "",
        is_active:              body.is_active !== undefined ? body.is_active : true,
        updated_at:             new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ investor: data });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

// ── DELETE /api/sanad-zayed/investors/[id] ───────────────────────────
// Blocked once the investor has any real financial history — deleting them
// would either fail on the contracts FK, or (for treasury transactions,
// which are ON DELETE SET NULL) silently orphan real cash movements from
// the person they belonged to, corrupting the treasury's audit trail.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth("admin");
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;

    const [{ count: txCount }, { count: contractCount }] = await Promise.all([
      supabase.from("sz_treasury_transactions").select("id", { count: "exact", head: true }).eq("investor_id", id),
      supabase.from("sz_investor_contracts").select("id", { count: "exact", head: true }).eq("investor_id", id),
    ]);

    if ((txCount ?? 0) > 0 || (contractCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "لا يمكن حذف مستثمر له حركات مالية أو عقود مسجلة — أوقف حسابه (غير نشط) بدلاً من ذلك" },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from("sz_investors")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ message: "تم حذف المستثمر بنجاح" });
  } catch {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
