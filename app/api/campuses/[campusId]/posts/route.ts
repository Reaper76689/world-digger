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

    const spot = await findSpot(campusId, spotId);

    if (!spot) {
      return Response.json({ error: "请选择当前校区里的点位。" }, { status: 400 });
    }

    const normalizedPost = await createApprovedPost({
      supabase,
      campusId,
      spotId,
      authorId: user.id,
      text,
      imageUrls,
      statusTag
    });
    const [hydratedPost] = await hydratePosts(supabase, [normalizedPost as Parameters<typeof hydratePosts>[1][number]]);
    emitToCampus(campusId, "post.approved", hydratedPost);

    return Response.json({ post: hydratedPost });
  } catch (error) {
    return jsonError(error);
  }
}

async function findSpot(campusId: string, spotId: string) {
  try {
    return await prisma.spot.findFirst({
      where: {
        id: spotId,
        campusId
      },
      select: { id: true }
    });
  } catch (error) {
    if (process.env.NODE_ENV === "production" && !isPrismaTlsError(error)) {
      throw error;
    }

    const { data, error: supabaseError } = await createSupabaseServerClient()
      .from("Spot")
      .select("id")
      .eq("id", spotId)
      .eq("campusId", campusId)
      .maybeSingle();

    if (supabaseError) {
      throw supabaseError;
    }

    return data;
  }
}

async function createApprovedPost({
  supabase,
  campusId,
  spotId,
  authorId,
  text,
  imageUrls,
  statusTag
}: {
  supabase: Awaited<ReturnType<typeof getCurrentSupabaseClient>>;
  campusId: string;
  spotId: string;
  authorId: string;
  text: string;
  imageUrls: string[];
  statusTag: string;
}) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  try {
    const createdPost = await prisma.post.create({
      data: {
        campusId,
        spotId,
        authorId,
        text,
        imageUrls,
        statusTag,
        status: "approved",
        expiresAt
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

    return {
      ...createdPost,
      expiresAt: createdPost.expiresAt.toISOString(),
      createdAt: createdPost.createdAt.toISOString()
    };
  } catch (error) {
    if (process.env.NODE_ENV === "production" && !isPrismaTlsError(error)) {
      throw error;
    }

    const { data, error: rpcError } = await supabase.rpc("submit_post", {
      p_campus_id: campusId,
      p_spot_id: spotId,
      p_text: text,
      p_image_urls: imageUrls,
      p_status_tag: statusTag
    });

    if (rpcError) {
      throw rpcError;
    }

    const post = Array.isArray(data) ? data[0] : data;

    return {
      ...post,
      campus: null,
      spot: null
    };
  }
}

function isPrismaTlsError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Error opening a TLS connection");
}
