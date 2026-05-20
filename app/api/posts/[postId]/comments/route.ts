import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { commentTextSchema } from "@/lib/validators";

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const user = await requireUser();
    const { postId } = await params;
    const body = await request.json();
    const text = commentTextSchema.parse(body.text);

    const post = await prisma.post.findFirst({
      where: { id: postId, status: "approved" }
    });
    if (!post) {
      return Response.json({ error: "动态不存在或未公开" }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        authorId: user.id,
        text,
        status: "pending"
      }
    });

    return Response.json({ comment });
  } catch (error) {
    return jsonError(error);
  }
}
