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

    const { data: place, error: placeError } = await supabase.from("Place").select("id").eq("id", placeId).maybeSingle();
    if (placeError) throw placeError;
    if (!place) {
      return Response.json({ error: "地点不存在" }, { status: 404 });
    }

    const { data: post, error } = await supabase
      .from("Post")
      .insert({
        placeId,
        authorId: user.id,
        text,
        imageUrls,
        status: "pending"
      })
      .select("id,placeId,authorId,text,imageUrls,status,createdAt,updatedAt")
      .single();

    if (error) throw error;
    return Response.json({ post });
  } catch (error) {
    return jsonError(error);
  }
}
