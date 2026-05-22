import { getCurrentSupabaseClient, requireUser } from "@/lib/auth";
import { getApprovedFeedForCampus } from "@/lib/feed";
import { jsonError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase";
import { imageUrlsSchema, postTextSchema, spotIdSchema } from "@/lib/validators";

export async function GET(request: Request, { params }: { params: Promise<{ campusId: string }> }) {
  try {
    const { campusId } = await params;
    const { searchParams } = new URL(request.url);
    const spotId = searchParams.get("spotId");
    const posts = await getApprovedFeedForCampus(createSupabaseServerClient(), campusId, spotId);
    return Response.json({ posts });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ campusId: string }> }) {
  try {
    const user = await requireUser();
    const supabase = await getCurrentSupabaseClient();
    const { campusId } = await params;
    const body = await request.json();
    const text = postTextSchema.parse(body.text);
    const imageUrls = imageUrlsSchema.parse(body.imageUrls ?? []);
    const spotId = spotIdSchema.parse(body.spotId);

    const { data: post, error } = await supabase.rpc("submit_post", {
      p_campus_id: campusId,
      p_spot_id: spotId,
      p_text: text,
      p_image_urls: imageUrls
    });

    if (error) throw error;
    if (!post || post.authorId !== user.id) {
      throw new Error("动态提交失败");
    }

    return Response.json({ post });
  } catch (error) {
    return jsonError(error);
  }
}
