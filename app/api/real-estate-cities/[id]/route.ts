import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import {
  CITIES_TABLE,
  cleanCityName,
  DUPLICATE_CITY_NAME_ERROR,
  INVALID_CITY_NAME_ERROR,
  UNIQUE_VIOLATION,
} from "@/lib/realEstateCities";
import { submissionsDb } from "@/lib/submissionStore";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/real-estate-cities/[id] — rename a city or change its eligibility.
// Saved requests keep the name they were submitted with.
export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { name: rawName, is_eligible: isEligible } = await request.json();
  const update: { updated_at: string; name?: string; is_eligible?: boolean } = {
    updated_at: new Date().toISOString(),
  };

  if (rawName !== undefined) {
    const name = cleanCityName(rawName);
    if (!name) return NextResponse.json({ error: INVALID_CITY_NAME_ERROR }, { status: 400 });
    update.name = name;
  }
  if (isEligible !== undefined) {
    if (typeof isEligible !== "boolean") {
      return NextResponse.json({ error: "قيمة غير صالحة" }, { status: 400 });
    }
    update.is_eligible = isEligible;
  }

  const { data, error } = await submissionsDb
    .from(CITIES_TABLE)
    .update(update)
    .eq("id", id)
    .select("id, name, is_eligible")
    .single();

  if (error?.code === UNIQUE_VIOLATION) {
    return NextResponse.json({ error: DUPLICATE_CITY_NAME_ERROR }, { status: 409 });
  }
  if (error) {
    console.error("City update failed:", error);
    return NextResponse.json({ error: "فشل في حفظ التعديل" }, { status: 500 });
  }
  return NextResponse.json({ city: data });
}

// DELETE /api/real-estate-cities/[id] — saved requests keep the city's name as text.
export async function DELETE(_request: Request, { params }: RouteContext) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { error } = await submissionsDb.from(CITIES_TABLE).delete().eq("id", id);

  if (error) {
    console.error("City delete failed:", error);
    return NextResponse.json({ error: "فشل في حذف المدينة" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
