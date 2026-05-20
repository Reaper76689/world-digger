"use client";

import type { FeedPost } from "@/types/shitan";
import { MessageCircle, Send, UserRound } from "lucide-react";
import { useState } from "react";

export function Feed({
  posts,
  userReady,
  onCommentPending
}: {
  posts: FeedPost[];
  userReady: boolean;
  onCommentPending: () => void;
}) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink/20 bg-white/80 p-10 text-center shadow-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-mint text-jade">
          <MessageCircle className="h-6 w-6" />
        </div>
        <p className="mt-4 font-semibold">这个地点还没有公开动态</p>
        <p className="mt-2 text-sm text-ink/55">提交第一条现场信息，审核通过后它会出现在这里。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} userReady={userReady} onCommentPending={onCommentPending} />
      ))}
    </div>
  );
}

function PostCard({
  post,
  userReady,
  onCommentPending
}: {
  post: FeedPost;
  userReady: boolean;
  onCommentPending: () => void;
}) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");

  async function comment() {
    const response = await fetch(`/api/posts/${post.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (!response.ok) {
      const data = await response.json();
      setMessage(data.error ?? "回复失败");
      return;
    }
    setText("");
    setMessage("回复已提交审核。");
    onCommentPending();
  }

  return (
    <article className="rounded-xl border border-white/70 bg-white p-4 shadow-soft">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-clay text-ink/60">
            <UserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{post.author.nickname}</p>
            <p className="text-xs text-ink/45">{formatTime(post.createdAt)}</p>
          </div>
        </div>
      </header>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-ink/85">{post.text}</p>

      {post.imageUrls.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {post.imageUrls.map((image) => (
            <img key={image} src={image} alt="" className="aspect-square rounded-lg border border-ink/10 object-cover" />
          ))}
        </div>
      ) : null}

      <div className="mt-4 rounded-lg bg-stone p-3">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink/55">
          <MessageCircle className="h-4 w-4" />
          回复
        </p>
        <div className="space-y-2">
          {post.comments.map((comment) => (
            <p key={comment.id} className="rounded-md bg-white px-3 py-2 text-sm leading-6 shadow-sm">
              <span className="font-semibold">{comment.author.nickname}：</span>
              {comment.text}
            </p>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={!userReady}
            placeholder={userReady ? "补充现场情况" : "登录后回复"}
            className="h-10 min-w-0 flex-1 rounded-md border border-ink/10 bg-white px-3 text-sm outline-none transition focus:border-jade disabled:bg-ink/5"
          />
          <button
            onClick={comment}
            disabled={!userReady || text.trim().length < 1}
            className="grid h-10 w-10 place-items-center rounded-md bg-jade text-white transition hover:bg-jadeDark disabled:opacity-40"
            title="回复"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {message ? <p className="mt-2 text-xs text-jadeDark">{message}</p> : null}
      </div>
    </article>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
