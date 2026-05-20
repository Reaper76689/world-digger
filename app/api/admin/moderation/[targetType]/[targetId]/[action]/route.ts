import { getCurrentSupabaseClient, requireAdmin } from "@/lib/auth";
import { hydratePosts } from "@/lib/feed";
import { jsonError } from "@/lib/http";
import { emitToPlace } from "@/lib/realtime";

type Params = Promise<{
  targetType: string;
  targetId: string;
  action: string;
}>;

export async function POST(request: Request, { params }: { params: Params }) {
  try {
    const admin = await requireAdmin();
    const supabase = await getCurrentSupabaseClient();
    const { targetType, targetId, action } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason : undefined;

    if (targetType === "post") {
      if (action !== "approve" && action !== "reject" && action !== "hide") {
        return Response.json({ error: "不支持的操作" }, { status: 400 });
      }
      const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "hidden";

      const { data: post, error } = await supabase
        .from("Post")
        .update({ status })
        .eq("id", targetId)
        .select("id,placeId,authorId,text,imageUrls,status,createdAt")
        .single();
      if (error) throw error;

      await recordAction(supabase, admin.id, "post", targetId, action, reason);
      if (action === "approve") {
        const [hydratedPost] = await hydratePosts(supabase, [post]);
        emitToPlace(post.placeId, "post.approved", hydratedPost);
      }
      if (action === "hide") emitToPlace(post.placeId, "post.hidden", { id: post.id });
      return Response.json({ post });
    }

    if (targetType === "comment") {
      if (action !== "approve" && action !== "reject" && action !== "hide") {
        return Response.json({ error: "不支持的操作" }, { status: 400 });
      }
      const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "hidden";

      const { data: comment, error } = await supabase
        .from("Comment")
        .update({ status })
        .eq("id", targetId)
        .select("id,postId,authorId,text,status,createdAt,post:Post(id,placeId)")
        .single();
      if (error) throw error;

      await recordAction(supabase, admin.id, "comment", targetId, action, reason);
      if (action === "approve") {
        const parentPost = Array.isArray(comment.post) ? comment.post[0] : comment.post;
        const { data: author } = await supabase
          .from("User")
          .select("id,nickname,avatarUrl")
          .eq("id", comment.authorId)
          .single();
        emitToPlace(parentPost.placeId, "comment.approved", {
          id: comment.id,
          postId: parentPost.id,
          text: comment.text,
          createdAt: comment.createdAt,
          author: author ?? { id: comment.authorId, nickname: "未知用户", avatarUrl: null }
        });
      }
      return Response.json({ comment });
    }

    if (targetType === "user" && action === "ban") {
      const { data: user, error } = await supabase
        .from("User")
        .update({ status: "banned" })
        .eq("id", targetId)
        .select("id,email,nickname,avatarUrl,bio,status,role,createdAt,updatedAt")
        .single();
      if (error) throw error;

      await recordAction(supabase, admin.id, "user", targetId, "ban", reason);
      return Response.json({ user });
    }

    return Response.json({ error: "不支持的操作" }, { status: 400 });
  } catch (error) {
    return jsonError(error);
  }
}

async function recordAction(
  supabase: Awaited<ReturnType<typeof getCurrentSupabaseClient>>,
  adminId: string,
  targetType: "post" | "comment" | "user",
  targetId: string,
  action: "approve" | "reject" | "hide" | "ban",
  reason?: string
) {
  const { error } = await supabase.from("ModerationAction").insert({
    adminId,
    targetType,
    targetId,
    action,
    reason
  });
  if (error) throw error;
}
