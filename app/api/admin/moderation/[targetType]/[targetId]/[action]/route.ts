import { getCurrentSupabaseClient, requireAdmin } from "@/lib/auth";
import { hydratePosts } from "@/lib/feed";
import { jsonError } from "@/lib/http";
import { emitToCampus } from "@/lib/realtime";

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
    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : undefined;

    if (targetType === "post") {
      if (action !== "approve" && action !== "reject" && action !== "hide") {
        return Response.json({ error: "不支持的操作" }, { status: 400 });
      }
      const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "hidden";

      const { data: post, error } = await supabase
        .from("Post")
        .update({ status })
        .eq("id", targetId)
        .select("id,campusId,spotId,authorId,text,imageUrls,status,expiresAt,createdAt,spot:Spot(id,name)")
        .single();
      if (error) throw error;

      await recordAction(supabase, admin.id, "post", targetId, action, reason);
      if (action === "approve") {
        const normalizedPost = {
          ...post,
          spot: Array.isArray(post.spot) ? post.spot[0] : post.spot
        };
        if (new Date(post.expiresAt).getTime() > Date.now()) {
          const [hydratedPost] = await hydratePosts(supabase, [normalizedPost]);
          emitToCampus(post.campusId, "post.approved", hydratedPost);
        }
      }
      if (action === "hide") emitToCampus(post.campusId, "post.hidden", { id: post.id });
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
        .select("id,postId,authorId,text,status,createdAt,post:Post(id,campusId,expiresAt)")
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
        if (new Date(parentPost.expiresAt).getTime() > Date.now()) {
          emitToCampus(parentPost.campusId, "comment.approved", {
            id: comment.id,
            postId: parentPost.id,
            text: comment.text,
            createdAt: comment.createdAt,
            author: author ?? { id: comment.authorId, nickname: "未知用户", avatarUrl: null }
          });
        }
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
