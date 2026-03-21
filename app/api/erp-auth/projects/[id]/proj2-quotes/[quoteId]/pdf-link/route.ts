import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// POST — receive a PDF blob, upload to Supabase Storage, return public URL
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string }> }
) {
  try {
    const { id, quoteId } = await params;

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "لا يوجد ملف PDF" }, { status: 400 });

    const timestamp = Date.now();
    const path = `${id}/${quoteId}-${timestamp}.pdf`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("quote-pdfs")
      .upload(path, buffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from("quote-pdfs")
      .getPublicUrl(path);

    // Shorten the URL via TinyURL (free, no API key needed)
    let finalUrl = urlData.publicUrl;
    try {
      const tiny = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(urlData.publicUrl)}`);
      if (tiny.ok) finalUrl = await tiny.text();
    } catch { /* silent fallback to full URL */ }

    return NextResponse.json({ url: finalUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "خطأ في رفع الملف" }, { status: 500 });
  }
}
