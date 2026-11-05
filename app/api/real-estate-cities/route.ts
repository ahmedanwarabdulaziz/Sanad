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

// GET /api/real-estate-cities — every city, eligible or not, for the admin page
export async function GET() {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  const { data, error } = await submissionsDb
    .from(CITIES_TABLE)
    .select("id, name, is_eligible")
    .order("sort_order");

  if (error) {
    console.error("Cities list failed:", error);
    return NextResponse.json({ error: "فشل في تحميل المدن" }, { status: 500 });
  }
  return NextResponse.json({ cities: data });
}

// POST /api/real-estate-cities — add a city; it starts out eligible
export async function POST(request: Request) {
  const auth = await requireAuth("editor");
  if ("error" in auth) return auth.error;

  const { name: rawName } = await request.json();
  const name = cleanCityName(rawName);
  if (!name) return NextResponse.json({ error: INVALID_CITY_NAME_ERROR }, { status: 400 });

  const { data, error } = await submissionsDb
    .from(CITIES_TABLE)
    .insert({ name })
    .select("id, name, is_eligible")
    .single();

  if (error?.code === UNIQUE_VIOLATION) {
    return NextResponse.json({ error: DUPLICATE_CITY_NAME_ERROR }, { status: 409 });
  }
  if (error) {
    console.error("City create failed:", error);
    return NextResponse.json({ error: "فشل في إضافة المدينة" }, { status: 500 });
  }
  return NextResponse.json({ city: data }, { status: 201 });
}
