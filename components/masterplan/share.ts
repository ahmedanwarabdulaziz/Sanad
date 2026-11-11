"use client";

import { FLOOR_NAMES, type Unit } from "@/lib/sanad-zayed/masterplan/data";
import { track } from "./journey";

export const unitShareUrl = (unit: Unit) => `${window.location.origin}/projects/sanad-zayed/masterplan?unit=${unit.id}`;

/**
 * Shares a unit link. Uses the phone's share sheet when available (WhatsApp, Messenger, …);
 * otherwise opens WhatsApp with the link typed. The link shows a preview card with the unit's plan.
 */
export async function shareUnit(unit: Unit): Promise<"shared" | "whatsapp" | "cancelled"> {
    const url = unitShareUrl(unit);
    const text = `وحدة ${unit.code} في مشروع سند زايد · ${unit.area} م² · ${unit.plan.counts.bed} غرف نوم · ${FLOOR_NAMES[unit.floor]}`;
    track({ type: "share", unit: unit.code });
    try {
        if (navigator.share) {
            await navigator.share({ title: `سند زايد · ${unit.code}`, text, url });
            return "shared";
        }
    } catch (e) {
        if ((e as Error)?.name === "AbortError") return "cancelled";
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, "_blank", "noopener,noreferrer");
    return "whatsapp";
}
