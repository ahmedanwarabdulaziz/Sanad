import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createSsrClient } from "@/lib/supabase/server";

export type ErpRole = "viewer" | "editor" | "admin" | "super_admin";

interface ErpUser {
  id: string;
  auth_id: string;
  email: string;
  name: string;
  role: ErpRole;
  is_active: boolean;
}

const ROLE_RANK: Record<ErpRole, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  super_admin: 3,
};

const serviceClient = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type AuthResult = { error: NextResponse } | { user: ErpUser };

/**
 * Verifies the request's Supabase session cookie and resolves it to an
 * active erp_users row with at least the given role. Route handlers should
 * call this first and return `.error` immediately if present.
 */
export async function requireAuth(minRole: ErpRole = "viewer"): Promise<AuthResult> {
  const supabase = await createSsrClient();
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 }) };
  }

  const { data: erpUser, error: erpError } = await serviceClient
    .from("erp_users")
    .select("id, auth_id, email, name, role, is_active")
    .eq("auth_id", authUser.id)
    .single();

  if (erpError || !erpUser) {
    return { error: NextResponse.json({ error: "المستخدم غير موجود" }, { status: 403 }) };
  }

  if (!erpUser.is_active) {
    return { error: NextResponse.json({ error: "الحساب غير مفعل" }, { status: 403 }) };
  }

  if (ROLE_RANK[erpUser.role as ErpRole] < ROLE_RANK[minRole]) {
    return { error: NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 }) };
  }

  return { user: erpUser as ErpUser };
}
