import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();
    const [posts, comments] = await Promise.all([
      prisma.post.findMany({
        where: { status: "pending" },
        orderBy: { createdAt: "asc" },
        include: {
          place: true,
          author: { select: { id: true, nickname: true, avatarUrl: true, status: true } }
        }
      }),
      prisma.comment.findMany({
        where: { status: "pending" },
        orderBy: { createdAt: "asc" },
        include: {
          post: { include: { place: true } },
          author: { select: { id: true, nickname: true, avatarUrl: true, status: true } }
        }
      })
    ]);

    return Response.json({ posts, comments });
  } catch (error) {
    return jsonError(error);
  }
}
