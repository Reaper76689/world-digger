import { getCurrentSupabaseClient, requireUser } from "@/lib/auth";
import { getApprovedFeedForCampus, hydratePosts } from "@/lib/feed";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { emitToCampus } from "@/lib/realtime";
import { createSupabaseServerClient } from "@/lib/supabase";
import { imageUrlsSchema, postTextSchema, spotIdSchema, statusTagSchema } from "@/lib/validators";

export async function GET(request: Request, { params }: { params: Promise<{ campusId: string }> }) {
  try {
    const { campusId } = await params;
    const { searchParams } = new URL(request.url);
    const spotId = searchParams.get("spotId");
    const posts = await getApprovedFeedForCampus(createSupabaseServerClient(), campusId, spotId);
    return Response.json({ posts });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ campusId: string }> }) {
  try {
    const user = await requireUser();
    const supabase = await getCurrentSupabaseClient();
    const { campusId } = await params;
    const body = await request.json();
    const statusTag = statusTagSchema.parse(body.statusTag);
    const extraText = postTextSchema.parse(body.text ?? "");
    const text = extraText || statusTag;
    const imageUrls = imageUrlsSchema.parse(body.imageUrls ?? []);
    const spotId = spotIdSchema.parse(body.spotId);

    const spot = await prisma.spot.findFirst({
      where: {
        id: spotId,
        campusId
      },
      select: { id: true }
    });

    if (!spot) {
      return Response.json({ error: "请选择当前校区里的点位。" }, { status: 400 });
    }

    const createdPost = await prisma.post.create({
      data: {
        campusId,
        spotId,
        authorId: user.id,
        text,
        imageUrls,
        statusTag,
        status: "approved",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      },
      include: {
        campus: {
          select: {
            id: true,
            displayName: true,
            city: true
          }
        },
        spot: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const normalizedPost = {
      ...createdPost,
      expiresAt: createdPost.expiresAt.toISOString(),
      createdAt: createdPost.createdAt.toISOString()
    };
    const [hydratedPost] = await hydratePosts(supabase, [normalizedPost]);
    emitToCampus(campusId, "post.approved", hydratedPost);

    return Response.json({ post: hydratedPost });
  } catch (error) {
    return jsonError(error);
  }
}
