import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Proxy: fetches an R2 image server-side (avoids browser CORS) and streams it back
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; iid: string }> }
) {
  const { iid } = await params;
  const supabase = await createClient();

  const { data: image, error } = await supabase
    .from("gallery_images")
    .select("url")
    .eq("id", iid)
    .single();

  if (error || !image) return NextResponse.json({ error: "not found" }, { status: 404 });

  const r2Res = await fetch(image.url);
  if (!r2Res.ok) return NextResponse.json({ error: "fetch failed" }, { status: 502 });

  const contentType = r2Res.headers.get("content-type") || "image/jpeg";
  const buffer = await r2Res.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
