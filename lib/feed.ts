import { createSupabaseUserClient } from "@/lib/supabase";
import { getUserReputations } from "@/lib/reputation";

type DbUser = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
};

type DbComment = {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  status: string;
  createdAt: string;
};

type DbPost = {
  id: string;
  campusId: string;
  spotId: string;
  authorId: string;
  text: string;
  imageUrls: string[];
  statusTag: string;
  status: string;
  expiresAt: string;
  confirmsCount: number;
  outdatedCount: number;
  createdAt: string;
  campus?: {
    id: string;
    displayName: string;
    city: string;
  } | null;
  spot?: {
    id: string;
    name: string;
  } | null;
};

export async function getApprovedFeedForCampus(
  supabase: ReturnType<typeof createSupabaseUserClient>,
  campusId: string,
  spotId?: string | null
) {
  let query = supabase
    .from("Post")
    .select("id,campusId,spotId,authorId,text,imageUrls,statusTag,status,expiresAt,confirmsCount,outdatedCount,createdAt,campus:Campus(id,displayName,city),spot:Spot(id,name)")
    .eq("campusId", campusId)
    .eq("status", "approved")
    .gt("expiresAt", new Date().toISOString())
    .order("createdAt", { ascending: false });

  if (spotId) {
    query = query.eq("spotId", spotId);
  }

  const { data: posts, error } = await query;
  if (error) throw error;
  return hydratePosts(supabase, normalizePosts(posts ?? []));
}

export async function getLatestApprovedFeed(supabase: ReturnType<typeof createSupabaseUserClient>, limit = 30) {
  const { data: posts, error } = await supabase
    .from("Post")
    .select("id,campusId,spotId,authorId,text,imageUrls,statusTag,status,expiresAt,confirmsCount,outdatedCount,createdAt,campus:Campus(id,displayName,city),spot:Spot(id,name)")
    .eq("status", "approved")
    .gt("expiresAt", new Date().toISOString())
    .order("createdAt", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return hydratePosts(supabase, normalizePosts(posts ?? []));
}

export async function hydratePosts(supabase: ReturnType<typeof createSupabaseUserClient>, posts: DbPost[]) {
  const postIds = posts.map((post) => post.id);
  const authorIds = Array.from(new Set(posts.map((post) => post.authorId)));

  const [{ data: comments, error: commentsError }, { data: users, error: usersError }] = await Promise.all([
    postIds.length
      ? supabase
          .from("Comment")
          .select("id,postId,authorId,text,status,createdAt")
          .in("postId", postIds)
          .eq("status", "approved")
          .order("createdAt", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    authorIds.length
      ? supabase.from("User").select("id,nickname,avatarUrl").in("id", authorIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (commentsError) throw commentsError;
  if (usersError) throw usersError;

  const commentAuthorIds = Array.from(new Set((comments ?? []).map((comment: DbComment) => comment.authorId)));
  const missingCommentAuthorIds = commentAuthorIds.filter((id) => !authorIds.includes(id));
  let allUsers = (users ?? []) as DbUser[];

  if (missingCommentAuthorIds.length) {
    const { data: commentUsers, error: commentUsersError } = await supabase
      .from("User")
      .select("id,nickname,avatarUrl")
      .in("id", missingCommentAuthorIds);
    if (commentUsersError) throw commentUsersError;
    allUsers = [...allUsers, ...((commentUsers ?? []) as DbUser[])];
  }

  const userMap = new Map(allUsers.map((user) => [user.id, user]));
  const reputationMap = await getUserReputations(allUsers.map((user) => user.id));
  const commentsByPost = new Map<string, DbComment[]>();
  for (const comment of (comments ?? []) as DbComment[]) {
    commentsByPost.set(comment.postId, [...(commentsByPost.get(comment.postId) ?? []), comment]);
  }

  return posts.map((post) => ({
    ...post,
    author: {
      ...(userMap.get(post.authorId) ?? { id: post.authorId, nickname: "未知用户", avatarUrl: null }),
      title: reputationMap.get(post.authorId)?.title ?? "新同学"
    },
    comments: (commentsByPost.get(post.id) ?? []).map((comment) => ({
      ...comment,
      author: userMap.get(comment.authorId) ?? { id: comment.authorId, nickname: "未知用户", avatarUrl: null }
    }))
  }));
}

function normalizePosts(posts: unknown[]): DbPost[] {
  return posts.map((post) => {
    const item = post as DbPost & { spot?: DbPost["spot"] | DbPost["spot"][] };
    return {
      ...item,
      campus: Array.isArray(item.campus) ? item.campus[0] : item.campus,
      spot: Array.isArray(item.spot) ? item.spot[0] : item.spot
    };
  });
}
