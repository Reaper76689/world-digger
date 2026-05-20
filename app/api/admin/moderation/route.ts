import { getCurrentSupabaseClient, requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = await getCurrentSupabaseClient();
    const [{ data: posts, error: postsError }, { data: comments, error: commentsError }] = await Promise.all([
      supabase
        .from("Post")
        .select("id,placeId,authorId,text,imageUrls,status,createdAt,place:Place(id,name,address),author:User!Post_authorId_fkey(id,nickname,avatarUrl,status)")
        .eq("status", "pending")
        .order("createdAt", { ascending: true }),
      supabase
        .from("Comment")
        .select("id,postId,authorId,text,status,createdAt,post:Post(id,place:Place(id,name)),author:User!Comment_authorId_fkey(id,nickname,avatarUrl,status)")
        .eq("status", "pending")
        .order("createdAt", { ascending: true })
    ]);

    if (postsError) throw postsError;
    if (commentsError) throw commentsError;
    return Response.json({ posts: posts ?? [], comments: comments ?? [] });
  } catch (error) {
    return jsonError(error);
  }
}
