import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string) || "";
  const tagIds = formData.getAll("tagIds") as string[];

  if (!file) return NextResponse.json({ error: "لم يتم إرسال ملف" }, { status: 400 });

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
  if (!allowedTypes.includes(file.type))
    return NextResponse.json({ error: "نوع الملف غير مدعوم" }, { status: 400 });

  // Max 20 MB
  if (file.size > 20 * 1024 * 1024)
    return NextResponse.json({ error: "حجم الصورة يتجاوز 20 ميجابايت" }, { status: 400 });

  const fileId = uuidv4();
  const ext = file.name.split(".").pop() || "jpg";
  const r2Key = `gallery/${projectId}/${fileId}.${ext}`;
  const r2ThumbKey = `gallery/${projectId}/thumb_${fileId}.webp`;

  const buffer = Buffer.from(await file.arrayBuffer());

  // Generate thumbnail: max 600px wide, WebP quality 80
  const thumbBuffer = await sharp(buffer)
    .resize({ width: 600, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  // Upload original + thumbnail to R2 in parallel
  await Promise.all([
    r2.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: r2Key, Body: buffer, ContentType: file.type })),
    r2.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: r2ThumbKey, Body: thumbBuffer, ContentType: "image/webp" })),
  ]);

  const publicUrl = `${R2_PUBLIC_URL}/${r2Key}`;
  const thumbnailUrl = `${R2_PUBLIC_URL}/${r2ThumbKey}`;

  const supabase = await createClient();

  // Insert image record
  const { data: imageRecord, error: imgError } = await supabase
    .from("gallery_images")
    .insert({ project_id: projectId, r2_key: r2Key, r2_thumb_key: r2ThumbKey, url: publicUrl, thumbnail_url: thumbnailUrl, title })
    .select()
    .single();

  if (imgError) {
    // Clean up R2 on DB failure
    await Promise.allSettled([
      r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: r2Key })),
      r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: r2ThumbKey })),
    ]);
    return NextResponse.json({ error: imgError.message }, { status: 500 });
  }

  // Insert image-tag pivots
  if (tagIds.length > 0) {
    const pivots = tagIds.map((tagId) => ({ image_id: imageRecord.id, tag_id: tagId }));
    await supabase.from("gallery_image_tags").insert(pivots);
  }

  return NextResponse.json({ image: imageRecord }, { status: 201 });
}
