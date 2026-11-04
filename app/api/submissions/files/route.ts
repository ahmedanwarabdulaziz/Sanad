import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { r2, R2_BUCKET } from "@/lib/r2";

// GET /api/submissions/files?key=...&name=... — download an applicant's attachment.
// Applicants send financial documents, so these go through login rather than a public link.
export async function GET(request: Request) {
  const auth = await requireAuth("viewer");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? "";
  const name = searchParams.get("name") ?? "attachment";
  if (!/^submissions\/(project|contact|real_estate)\/[0-9a-f-]+(\.[a-zA-Z0-9]+)?$/.test(key)) {
    return NextResponse.json({ error: "ملف غير صالح" }, { status: 400 });
  }

  try {
    const object = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return new NextResponse(object.Body!.transformToWebStream(), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      },
    });
  } catch (error) {
    console.error("Submission file download failed:", error);
    return NextResponse.json({ error: "تعذر تحميل الملف" }, { status: 404 });
  }
}
