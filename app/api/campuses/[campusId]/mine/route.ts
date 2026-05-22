import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { ContentStatus, ModerationActionType, ModerationTargetType } from "@prisma/client";

const visibleStatuses = [
  ContentStatus.pending,
  ContentStatus.approved,
  ContentStatus.rejected,
  ContentStatus.hidden
];

const trackedActions = [
  ModerationActionType.approve,
  ModerationActionType.reject,
  ModerationActionType.hide
];

type ModerationMeta = {
  reason: string | null;
  createdAt: Date;
};

export async function GET(_request: Request, { params }: { params: Promise<{ campusId: string }> }) {
  try {
    const user = await requireUser();
    const { campusId } = await params;

    const [posts, comments] = await Promise.all([
      prisma.post.findMany({
        where: {
          campusId,
          authorId: user.id,
          status: { in: visibleStatuses }
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          text: true,
          imageUrls: true,
          status: true,
          expiresAt: true,
          createdAt: true,
          spot: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      prisma.comment.findMany({
        where: {
          authorId: user.id,
          status: { in: visibleStatuses },
          post: {
            campusId
          }
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          text: true,
          status: true,
          createdAt: true,
          post: {
            select: {
              id: true,
              text: true
            }
          }
        }
      })
    ]);

    const moderationByTarget = await loadModerationMeta([
      ...posts.map((post) => ({ targetType: ModerationTargetType.post, targetId: post.id })),
      ...comments.map((comment) => ({ targetType: ModerationTargetType.comment, targetId: comment.id }))
    ]);

    return Response.json({
      posts: posts.map((post) => {
        const meta = moderationByTarget.get(keyFor(ModerationTargetType.post, post.id));
        return {
          ...post,
          moderationReason: needsReason(post.status) ? meta?.reason ?? null : null,
          moderatedAt: meta?.createdAt ?? null
        };
      }),
      comments: comments.map((comment) => {
        const meta = moderationByTarget.get(keyFor(ModerationTargetType.comment, comment.id));
        return {
          ...comment,
          moderationReason: needsReason(comment.status) ? meta?.reason ?? null : null,
          moderatedAt: meta?.createdAt ?? null
        };
      })
    });
  } catch (error) {
    return jsonError(error);
  }
}

async function loadModerationMeta(targets: Array<{ targetType: ModerationTargetType; targetId: string }>) {
  const result = new Map<string, ModerationMeta>();
  if (targets.length === 0) return result;

  const actions = await prisma.moderationAction.findMany({
    where: {
      action: { in: trackedActions },
      OR: targets.map((target) => ({
        targetType: target.targetType,
        targetId: target.targetId
      }))
    },
    orderBy: { createdAt: "desc" },
    select: {
      targetType: true,
      targetId: true,
      reason: true,
      createdAt: true
    }
  });

  for (const action of actions) {
    const key = keyFor(action.targetType, action.targetId);
    if (!result.has(key)) {
      result.set(key, {
        reason: action.reason,
        createdAt: action.createdAt
      });
    }
  }

  return result;
}

function keyFor(targetType: ModerationTargetType, targetId: string) {
  return `${targetType}:${targetId}`;
}

function needsReason(status: ContentStatus) {
  return status === ContentStatus.rejected || status === ContentStatus.hidden;
}
