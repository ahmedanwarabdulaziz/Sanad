import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const tagIds = req.nextUrl.searchParams.getAll("tag");
  const supabase = await createClient();

  let imageIds: string[] | null = null;

  // If filtering by tags, find image IDs that have ALL specified tags
  if (tagIds.length > 0) {
    for (const tagId of tagIds) {
      const { data } = await supabase
        .from("gallery_image_tags")
        .select("image_id")
        .eq("tag_id", tagId);
      const ids = (data || []).map((r: { image_id: string }) => r.image_id);
      if (imageIds === null) {
        imageIds = ids;
      } else {
        imageIds = imageIds.filter((id) => ids.includes(id));
      }
      if (imageIds.length === 0) break;
    }
  }

  let query = supabase
    .from("gallery_images")
    .select(`
      id, r2_key, url, thumbnail_url, title, created_at,
      gallery_image_tags(
        gallery_tags(id, name, gallery_tag_groups(id, name))
      )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (imageIds !== null) {
    if (imageIds.length === 0) return NextResponse.json({ images: [] });
    query = query.in("id", imageIds);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ images: data });
}
