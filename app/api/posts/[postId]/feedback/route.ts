import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { feedbackTypeSchema } from "@/lib/validators";
import { Prisma, PostFeedbackType } from "@prisma/client";

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const user = await requireUser();
    const { postId } = await params;
    const body = await request.json();
    const type = feedbackTypeSchema.parse(body.type) as PostFeedbackType;

    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        status: "approved",
        expiresAt: { gt: new Date() }
      },
      select: { id: true, authorId: true }
    });

    if (!post) {
      return Response.json({ error: "这条状态不存在或已经过期" }, { status: 404 });
    }
    if (post.authorId === user.id) {
      return Response.json({ error: "自己的状态不需要自己确认" }, { status: 400 });
    }

    try {
      await prisma.postFeedback.create({
        data: {
          postId,
          userId: user.id,
          type
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return Response.json({ error: "你已经评价过这条状态了，不能重复评价。" }, { status: 409 });
      }
      throw error;
    }

    const [confirmsCount, outdatedCount] = await Promise.all([
      prisma.postFeedback.count({ where: { postId, type: "confirmed" } }),
      prisma.postFeedback.count({ where: { postId, type: "outdated" } })
    ]);

    const updated = await prisma.post.update({
      where: { id: postId },
      data: { confirmsCount, outdatedCount },
      select: {
        id: true,
        confirmsCount: true,
        outdatedCount: true
      }
    });

    return Response.json({ post: updated });
  } catch (error) {
    return jsonError(error);
  }
}
