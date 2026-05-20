import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { imageUrlsSchema, postTextSchema } from "@/lib/validators";

export async function GET(_request: Request, { params }: { params: Promise<{ placeId: string }> }) {
  try {
    const { placeId } = await params;
    const posts = await prisma.post.findMany({
      where: { placeId, status: "approved" },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, nickname: true, avatarUrl: true } },
        comments: {
          where: { status: "approved" },
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, nickname: true, avatarUrl: true } } }
        }
      }
    });

    return Response.json({ posts });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ placeId: string }> }) {
  try {
    const user = await requireUser();
    const { placeId } = await params;
    const body = await request.json();
    const text = postTextSchema.parse(body.text);
    const imageUrls = imageUrlsSchema.parse(body.imageUrls ?? []);

    const place = await prisma.place.findUnique({ where: { id: placeId } });
    if (!place) {
      return Response.json({ error: "地点不存在" }, { status: 404 });
    }

    const post = await prisma.post.create({
      data: {
        placeId,
        authorId: user.id,
        text,
        imageUrls,
        status: "pending"
      }
    });

    return Response.json({ post });
  } catch (error) {
    return jsonError(error);
  }
}
