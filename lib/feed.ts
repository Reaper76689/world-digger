import { createSupabaseUserClient } from "@/lib/supabase";

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
  placeId: string;
  authorId: string;
  text: string;
  imageUrls: string[];
  status: string;
  createdAt: string;
};

export async function getApprovedFeedForPlace(supabase: ReturnType<typeof createSupabaseUserClient>, placeId: string) {
  const { data: posts, error } = await supabase
    .from("Post")
    .select("id,placeId,authorId,text,imageUrls,status,createdAt")
    .eq("placeId", placeId)
    .eq("status", "approved")
    .order("createdAt", { ascending: false });

  if (error) throw error;
  return hydratePosts(supabase, posts ?? []);
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
  const commentsByPost = new Map<string, DbComment[]>();
  for (const comment of (comments ?? []) as DbComment[]) {
    commentsByPost.set(comment.postId, [...(commentsByPost.get(comment.postId) ?? []), comment]);
  }

  return posts.map((post) => ({
    ...post,
    author: userMap.get(post.authorId) ?? { id: post.authorId, nickname: "未知用户", avatarUrl: null },
    comments: (commentsByPost.get(post.id) ?? []).map((comment) => ({
      ...comment,
      author: userMap.get(comment.authorId) ?? { id: comment.authorId, nickname: "未知用户", avatarUrl: null }
    }))
  }));
}
