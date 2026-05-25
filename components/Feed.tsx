"use client";

import type { FeedPost } from "@/types/shitan";
import { CheckCircle2, Clock3, MessageCircle, Send, TimerReset, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function Feed({
  posts,
  userReady,
  onCommentPending,
  compact = false
}: {
  posts: FeedPost[];
  userReady: boolean;
  onCommentPending: () => void | Promise<void>;
  compact?: boolean;
}) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink/20 bg-white/80 p-8 text-center shadow-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-mint text-jade">
          <Clock3 className="h-6 w-6" />
        </div>
        <p className="mt-4 font-semibold">暂时没有实时状态</p>
        <p className="mt-2 text-sm text-ink/55">有人发布后，会按时间倒序出现在这里。</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} userReady={userReady} onCommentPending={onCommentPending} compact={compact} />
      ))}
    </div>
  );
}

function PostCard({
  post,
  userReady,
  onCommentPending,
  compact
}: {
  post: FeedPost;
  userReady: boolean;
  onCommentPending: () => void | Promise<void>;
  compact: boolean;
}) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasFeedback, setHasFeedback] = useState(false);
  const [counts, setCounts] = useState({
    confirmsCount: post.confirmsCount,
    outdatedCount: post.outdatedCount
  });

  async function feedback(type: "confirmed" | "outdated") {
    if (!userReady || loading || hasFeedback) {
      setMessage(userReady ? "" : "登录后可以确认状态是否属实或已变化。");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/posts/${post.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type })
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "操作失败，请稍后再试。");
        return;
      }
      setCounts({
        confirmsCount: data.post.confirmsCount,
        outdatedCount: data.post.outdatedCount
      });
      setHasFeedback(true);
      setMessage("评价已记录，每条状态只能评价一次。");
    } catch {
      setMessage("操作失败，请检查网络后重试。");
    } finally {
      setLoading(false);
    }
  }

  async function comment() {
    if (loading || !userReady || text.trim().length < 1) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "补充失败，请稍后再试。");
        return;
      }

      setText("");
      setMessage("补充内容已提交审核。");
      await onCommentPending();
    } catch {
      setMessage("补充失败，请检查网络后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="rounded-xl border border-white/70 bg-white p-4 shadow-soft">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tag={post.statusTag} />
            <span className="text-xs font-semibold text-ink/45">{relativeTime(post.createdAt)}</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-ink">
            {post.campus?.displayName ?? "校园"} · {post.spot?.name ?? "校内点位"}
          </p>
          <Link
            href={`/users/${post.author.id}`}
            className="mt-2 inline-flex max-w-full items-center gap-2 rounded-lg border border-ink/10 bg-stone px-2.5 py-1.5 text-xs font-semibold text-ink/65 transition hover:border-jade/35 hover:text-jadeDark"
          >
            {post.author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <UserCircle2 className="h-5 w-5 shrink-0" />
            )}
            <span className="truncate">{post.author.nickname}</span>
            <span className="shrink-0 rounded-full bg-mint px-2 py-0.5 text-[11px] text-jadeDark">{post.author.title}</span>
          </Link>
        </div>
        <p className="rounded-full bg-clay px-3 py-1 text-xs font-semibold text-ink/55">{formatExpiry(post.expiresAt)}</p>
      </header>

      {post.text && post.text !== post.statusTag ? (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink/80">{post.text}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => feedback("confirmed")}
          disabled={loading || hasFeedback}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          ✅ 属实 {counts.confirmsCount}
        </button>
        <button
          onClick={() => feedback("outdated")}
          disabled={loading || hasFeedback}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
        >
          <TimerReset className="h-4 w-4" />
          ⏰ 已变化 {counts.outdatedCount}
        </button>
      </div>

      {!compact ? (
        <div className="mt-4 rounded-lg bg-stone p-3">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink/55">
            <MessageCircle className="h-4 w-4" />
            补充现场情况
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
              disabled={!userReady || loading}
              placeholder={userReady ? "补充一句现场情况" : "登录后补充"}
              className="h-10 min-w-0 flex-1 rounded-md border border-ink/10 bg-white px-3 text-sm outline-none transition focus:border-jade disabled:bg-ink/5"
            />
            <button
              onClick={comment}
              disabled={!userReady || loading || text.trim().length < 1}
              className="grid h-10 w-10 place-items-center rounded-md bg-jade text-white transition hover:bg-jadeDark disabled:opacity-40"
              title={loading ? "提交中" : "补充"}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-3 text-xs text-jadeDark">{message}</p> : null}
    </article>
  );
}

function StatusPill({ tag }: { tag: string }) {
  const tone =
    tag === "人少"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : tag === "爆满"
        ? "bg-red-50 text-red-700 border-red-200"
        : tag === "有空位"
          ? "bg-sky-50 text-sky-800 border-sky-200"
          : "bg-amber-50 text-amber-800 border-amber-200";

  return <span className={`rounded-full border px-3 py-1 text-sm font-bold ${tone}`}>{tag}</span>;
}

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return "刚刚发布";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

function formatExpiry(value: string) {
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return "已过期";
  const hours = Math.ceil(diff / 3600000);
  return `${hours} 小时后过期`;
}
