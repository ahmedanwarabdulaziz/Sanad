import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Public PDF proxy — GET /pdf/[key]
 * [key] is a friendly token stored in the pdf_tokens table (e.g. Quote-No-123).
 * URL example: https://sanadproprojects.com/pdf/Quote-No-921
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;

    // Look up the token in the database
    const { data: row, error: dbErr } = await supabase
      .from("pdf_tokens")
      .select("bucket, storage_path")
      .eq("token", key)
      .single();

    if (dbErr || !row) {
      return NextResponse.json({ error: "الرابط غير صالح أو منتهي الصلاحية" }, { status: 404 });
    }

    // Download from Supabase Storage using service role (bypasses bucket policy)
    const { data, error } = await supabase.storage
      .from(row.bucket)
      .download(row.storage_path);

    if (error || !data) {
      return NextResponse.json({ error: "تعذر تحميل الملف" }, { status: 404 });
    }

    const arrayBuffer = await data.arrayBuffer();
    const filename = decodeURIComponent(row.storage_path.split("/").pop() || "document.pdf");

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        // Immutable — file name contains a timestamp so it never changes
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
