import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** Generate a short random token, e.g. "xk9mpqr2" */
function shortToken() {
  return Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6);
}

// POST — receive PDF blob, upload to Supabase Storage, return a short proxy URL
// on the app's own domain (/api/pdf/xk9mpqr2) so the link is not Supabase CDN.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; saleId: string }> }
) {
  try {
    const { id, saleId } = await params;

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "لا يوجد ملف PDF" }, { status: 400 });

    const storagePath = `${id}/${saleId}-${Date.now()}.pdf`;
    const bucket = "quote-pdfs";
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, buffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    // Insert a short token into the pdf_tokens table
    const token = shortToken();
    const { error: dbErr } = await supabase
      .from("pdf_tokens")
      .insert({ token, bucket, storage_path: storagePath });

    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

    const origin = (process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin).replace(/\/$/, "");
    return NextResponse.json({ url: `${origin}/api/pdf/${token}` });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "خطأ في رفع الملف" }, { status: 500 });
  }
}
