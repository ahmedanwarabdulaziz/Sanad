import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; iid: string }> }
) {
  const { iid } = await params;
  const supabase = await createClient();

  const { data: image, error: fetchError } = await supabase
    .from("gallery_images")
    .select("r2_key, r2_thumb_key")
    .eq("id", iid)
    .single();

  if (fetchError || !image)
    return NextResponse.json({ error: "الصورة غير موجودة" }, { status: 404 });

  const { r2, R2_BUCKET } = await import("@/lib/r2");
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");

  await Promise.allSettled([
    r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: image.r2_key })),
    image.r2_thumb_key
      ? r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: image.r2_thumb_key }))
      : Promise.resolve(),
  ]);

  const { error } = await supabase.from("gallery_images").delete().eq("id", iid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; iid: string }> }
) {
  const { iid } = await params;
  const body = await req.json();
  const supabase = await createClient();

  // Update title if provided
  if (body.title !== undefined) {
    const { error } = await supabase
      .from("gallery_images")
      .update({ title: body.title })
      .eq("id", iid);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Replace tags if provided
  if (Array.isArray(body.tagIds)) {
    // Delete all existing pivots for this image
    await supabase.from("gallery_image_tags").delete().eq("image_id", iid);

    // Re-insert the new ones
    if (body.tagIds.length > 0) {
      const pivots = body.tagIds.map((tagId: string) => ({ image_id: iid, tag_id: tagId }));
      const { error } = await supabase.from("gallery_image_tags").insert(pivots);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
