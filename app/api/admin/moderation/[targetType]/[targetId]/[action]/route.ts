import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { emitToPlace } from "@/lib/realtime";

type Params = Promise<{
  targetType: string;
  targetId: string;
  action: string;
}>;

export async function POST(request: Request, { params }: { params: Params }) {
  try {
    const admin = await requireAdmin();
    const { targetType, targetId, action } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason : undefined;

    if (targetType === "post") {
      if (action !== "approve" && action !== "reject" && action !== "hide") {
        return Response.json({ error: "不支持的操作" }, { status: 400 });
      }
      const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "hidden";

      const post = await prisma.post.update({
        where: { id: targetId },
        data: { status },
        include: {
          author: { select: { id: true, nickname: true, avatarUrl: true } },
          comments: {
            where: { status: "approved" },
            orderBy: { createdAt: "asc" },
            include: { author: { select: { id: true, nickname: true, avatarUrl: true } } }
          }
        }
      });

      await recordAction(admin.id, "post", targetId, action, reason);
      if (action === "approve") emitToPlace(post.placeId, "post.approved", post);
      if (action === "hide") emitToPlace(post.placeId, "post.hidden", { id: post.id });
      return Response.json({ post });
    }

    if (targetType === "comment") {
      if (action !== "approve" && action !== "reject" && action !== "hide") {
        return Response.json({ error: "不支持的操作" }, { status: 400 });
      }
      const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "hidden";

      const comment = await prisma.comment.update({
        where: { id: targetId },
        data: { status },
        include: {
          author: { select: { id: true, nickname: true, avatarUrl: true } },
          post: { select: { id: true, placeId: true } }
        }
      });

      await recordAction(admin.id, "comment", targetId, action, reason);
      if (action === "approve") {
        emitToPlace(comment.post.placeId, "comment.approved", {
          ...comment,
          postId: comment.post.id
        });
      }
      return Response.json({ comment });
    }

    if (targetType === "user" && action === "ban") {
      const user = await prisma.user.update({
        where: { id: targetId },
        data: { status: "banned" }
      });
      await recordAction(admin.id, "user", targetId, "ban", reason);
      return Response.json({ user });
    }

    return Response.json({ error: "不支持的操作" }, { status: 400 });
  } catch (error) {
    return jsonError(error);
  }
}

async function recordAction(
  adminId: string,
  targetType: "post" | "comment" | "user",
  targetId: string,
  action: "approve" | "reject" | "hide" | "ban",
  reason?: string
) {
  await prisma.moderationAction.create({
    data: { adminId, targetType, targetId, action, reason }
  });
}
