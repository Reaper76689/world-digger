import { getCurrentSupabaseClient, requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { commentTextSchema } from "@/lib/validators";

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const user = await requireUser();
    const supabase = await getCurrentSupabaseClient();
    const { postId } = await params;
    const body = await request.json();
    const text = commentTextSchema.parse(body.text);

    const { data: post, error: postError } = await supabase
      .from("Post")
      .select("id")
      .eq("id", postId)
      .eq("status", "approved")
      .gt("expiresAt", new Date().toISOString())
      .maybeSingle();
    if (postError) throw postError;
    if (!post) {
      return Response.json({ error: "动态不存在或未公开" }, { status: 404 });
    }

    const { data: comment, error } = await supabase
      .from("Comment")
      .insert({
        postId,
        authorId: user.id,
        text,
        status: "pending"
      })
      .select("id,postId,authorId,text,status,createdAt,updatedAt")
      .single();

    if (error) throw error;
    return Response.json({ comment });
  } catch (error) {
    return jsonError(error);
  }
}
