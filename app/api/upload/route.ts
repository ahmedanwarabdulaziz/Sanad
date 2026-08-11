import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Configure R2 Client
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "لم يتم العثور على الملف" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = `expenses/${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    // Return the public URL
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${filename}`;

    return NextResponse.json({ url: publicUrl }, { status: 201 });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "فشل في رفع الملف" }, { status: 500 });
  }
}
