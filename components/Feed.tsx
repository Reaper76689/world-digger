"use client";

import type { FeedPost } from "@/types/shitan";
import { CheckCircle2, Clock3, MessageCircle, Send, TimerReset, UserCircle2, Waves } from "lucide-react";
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
      <div className="glass-card rounded-[2rem] border-dashed p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-200/20">
          <Clock3 className="h-7 w-7" />
        </div>
        <p className="mt-4 font-semibold text-white">这片区域还没有实时信号</p>
        <p className="mt-2 text-sm text-slate-400">有人更新后，会带着轻微淡入出现在这里。</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post, index) => (
        <PostCard key={post.id} post={post} userReady={userReady} onCommentPending={onCommentPending} compact={compact} index={index} />
      ))}
    </div>
  );
}

function PostCard({
  post,
  userReady,
  onCommentPending,
  compact,
  index
}: {
  post: FeedPost;
  userReady: boolean;
  onCommentPending: () => void | Promise<void>;
  compact: boolean;
  index: number;
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
      setMessage(userReady ? "" : "登录后可以帮同学判断这条状态是否还可靠。");
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
        setMessage("这次反馈没有记录成功，稍后再试。");
        return;
      }
      setCounts({
        confirmsCount: data.post.confirmsCount,
        outdatedCount: data.post.outdatedCount
      });
      setHasFeedback(true);
      setMessage(type === "confirmed" ? "收到，你确认了这条状态仍然可靠。" : "收到，这条状态会被标记为可能已变化。");
    } catch {
      setMessage("网络信号不稳，稍后再反馈一次。");
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
        setMessage("补充没有发出去，稍后再试。");
        return;
      }

      setText("");
      setMessage("补充已进入校准队列，通过后会出现在这条状态下。");
      await onCommentPending();
    } catch {
      setMessage("网络信号不稳，稍后再补充一次。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="glass-card float-card fade-in rounded-[2rem] p-4" style={{ animationDelay: `${Math.min(index * 40, 240)}ms` }}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tag={post.statusTag} />
            <span className="text-xs font-semibold text-slate-500">{relativeTime(post.createdAt)}</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {post.campus?.displayName ?? "校园"} · {post.spot?.name ?? "校内点位"}
          </p>
          <Link href={`/users/${post.author.id}`} className="mt-2 inline-flex max-w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-200/35 hover:text-cyan-100">
            {post.author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <UserCircle2 className="h-5 w-5 shrink-0" />
            )}
            <span className="truncate">{post.author.nickname}</span>
            <span className="shrink-0 rounded-full bg-cyan-300/10 px-2 py-0.5 text-[11px] text-cyan-100">{post.author.title}</span>
          </Link>
        </div>
        <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-400">{formatExpiry(post.expiresAt)}</p>
      </header>

      {post.text && post.text !== post.statusTag ? <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">{post.text}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => feedback("confirmed")}
          disabled={loading || hasFeedback}
          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-3 text-sm font-semibold text-emerald-100 transition hover:-translate-y-0.5 hover:bg-emerald-300/16 disabled:translate-y-0 disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          仍然属实 {counts.confirmsCount}
        </button>
        <button
          onClick={() => feedback("outdated")}
          disabled={loading || hasFeedback}
          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-3 text-sm font-semibold text-amber-100 transition hover:-translate-y-0.5 hover:bg-amber-300/16 disabled:translate-y-0 disabled:opacity-50"
        >
          <TimerReset className="h-4 w-4" />
          可能变了 {counts.outdatedCount}
        </button>
      </div>

      {!compact ? (
        <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/35 p-3">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-400">
            <MessageCircle className="h-4 w-4 text-cyan-200" />
            补充现场细节
          </p>
          <div className="space-y-2">
            {post.comments.map((comment) => (
              <p key={comment.id} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm leading-6 text-slate-300">
                <span className="font-semibold text-slate-100">{comment.author.nickname}：</span>
                {comment.text}
              </p>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              disabled={!userReady || loading}
              placeholder={userReady ? "补一句你看到的现场情况" : "登录后可以补充现场情况"}
              className="soft-input h-11 min-w-0 flex-1 rounded-2xl px-3 text-sm disabled:opacity-50"
            />
            <button onClick={comment} disabled={!userReady || loading || text.trim().length < 1} className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-300 text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:translate-y-0 disabled:opacity-40" title="补充">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-3 flex items-center gap-2 text-xs text-cyan-100"><Waves className="h-3.5 w-3.5" />{message}</p> : null}
    </article>
  );
}

function StatusPill({ tag }: { tag: string }) {
  const tone =
    tag === "人少"
      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
      : tag === "爆满"
        ? "border-rose-300/30 bg-rose-300/10 text-rose-100"
        : tag === "有空位"
          ? "border-sky-300/30 bg-sky-300/10 text-sky-100"
          : "border-amber-300/30 bg-amber-300/10 text-amber-100";

  return <span className={`rounded-full border px-3 py-1 text-sm font-bold transition ${tone}`}>{tag}</span>;
}

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return "刚刚更新";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

function formatExpiry(value: string) {
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return "已过期";
  const hours = Math.ceil(diff / 3600000);
  return `${hours} 小时后淡出`;
}
