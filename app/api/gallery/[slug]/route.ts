import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Public route — no auth required, read-only
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const tagIds = req.nextUrl.searchParams.getAll("tag");

  const supabase = await createClient();

  // Resolve project by slug
  const { data: project, error: projError } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", slug)
    .single();

  if (projError || !project)
    return NextResponse.json({ error: "المشروع غير موجود" }, { status: 404 });

  const projectId = project.id;

  // Fetch tag groups + tags for filter UI
  const { data: groups } = await supabase
    .from("gallery_tag_groups")
    .select("*, gallery_tags(*)")
    .eq("project_id", projectId)
    .order("created_at");

  // Resolve image IDs matching tag filters
  let imageIds: string[] | null = null;
  if (tagIds.length > 0) {
    for (const tagId of tagIds) {
      const { data } = await supabase
        .from("gallery_image_tags")
        .select("image_id")
        .eq("tag_id", tagId);
      const ids = (data || []).map((r: { image_id: string }) => r.image_id);
      imageIds = imageIds === null ? ids : imageIds.filter((id) => ids.includes(id));
      if ((imageIds ?? []).length === 0) break;
    }
  }

  let query = supabase
    .from("gallery_images")
    .select(`
      id, url, title, created_at,
      gallery_image_tags(gallery_tags(id, name, gallery_tag_groups(id, name)))
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (imageIds !== null) {
    if (imageIds.length === 0) return NextResponse.json({ groups, images: [] });
    query = query.in("id", imageIds);
  }

  const { data: images, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ groups, images });
}
