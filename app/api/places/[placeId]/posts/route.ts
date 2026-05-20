import { getApprovedFeedForPlace } from "@/lib/feed";
import { getCurrentSupabaseClient, requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase";
import { imageUrlsSchema, postTextSchema } from "@/lib/validators";

export async function GET(_request: Request, { params }: { params: Promise<{ placeId: string }> }) {
  try {
    const { placeId } = await params;
    const posts = await getApprovedFeedForPlace(createSupabaseServerClient(), placeId);
    return Response.json({ posts });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ placeId: string }> }) {
  try {
    const user = await requireUser();
    const supabase = await getCurrentSupabaseClient();
    const { placeId } = await params;
    const body = await request.json();
    const text = postTextSchema.parse(body.text);
    const imageUrls = imageUrlsSchema.parse(body.imageUrls ?? []);

    const { data: post, error } = await supabase.rpc("submit_post", {
      p_place_id: placeId,
      p_text: text,
      p_image_urls: imageUrls
    });

    if (error) throw error;
    if (!post || post.authorId !== user.id) {
      throw new Error("帖子提交失败");
    }

    return Response.json({ post });
  } catch (error) {
    return jsonError(error);
  }
}
