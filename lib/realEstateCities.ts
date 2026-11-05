// Server side only: the cities the real estate request form accepts, managed from the admin page.

import { submissionsDb } from "@/lib/submissionStore";

export const CITIES_TABLE = "real_estate_cities";

const MAX_CITY_NAME_LENGTH = 80;

export interface RealEstateCity {
  id: string;
  name: string;
  is_eligible: boolean;
}

/** Names the public form offers and its API accepts. Throws if the list can't be read. */
export async function listEligibleCityNames(): Promise<string[]> {
  const { data, error } = await submissionsDb
    .from(CITIES_TABLE)
    .select("name")
    .eq("is_eligible", true)
    .order("sort_order");
  if (error) throw new Error(`Eligible cities read failed: ${error.message}`);
  return data.map((city) => city.name);
}

/** Tidies a city name from the admin page; returns null when it can't be saved. */
export function cleanCityName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  return name && name.length <= MAX_CITY_NAME_LENGTH ? name : null;
}

export const INVALID_CITY_NAME_ERROR = `اكتب اسم المدينة (${MAX_CITY_NAME_LENGTH} حرفًا كحد أقصى)`;
export const DUPLICATE_CITY_NAME_ERROR = "هذه المدينة موجودة بالفعل";

// Postgres unique_violation: the name is already taken by another city.
export const UNIQUE_VIOLATION = "23505";
