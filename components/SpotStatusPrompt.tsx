"use client";

import type { FeedPost } from "@/types/shitan";
import { CheckCircle2, Clock3, Loader2, MapPin, RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";

type Spot = {
  id: string;
  name: string;
};

type StatusTag = "人少" | "一般" | "爆满" | "有空位";

const STATUS_OPTIONS: Array<{ tag: StatusTag; dot: string; className: string }> = [
  { tag: "人少", dot: "bg-emerald-300 text-emerald-300", className: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/16" },
  { tag: "一般", dot: "bg-amber-300 text-amber-300", className: "border-amber-300/30 bg-amber-300/10 text-amber-100 hover:bg-amber-300/16" },
  { tag: "爆满", dot: "bg-rose-300 text-rose-300", className: "border-rose-300/30 bg-rose-300/10 text-rose-100 hover:bg-rose-300/16" },
  { tag: "有空位", dot: "bg-sky-300 text-sky-300", className: "border-sky-300/30 bg-sky-300/10 text-sky-100 hover:bg-sky-300/16" }
];

export function SpotStatusPrompt({
  campusId,
  spot,
  posts,
  userReady,
  onUpdated
}: {
  campusId: string;
  spot: Spot;
  posts: FeedPost[];
  userReady: boolean;
  onUpdated: (post: FeedPost) => void | Promise<void>;
}) {
  const [submittingTag, setSubmittingTag] = useState<StatusTag | null>(null);
  const [message, setMessage] = useState("");
  const spotPosts = useMemo(() => posts.filter((post) => post.spotId === spot.id), [posts, spot.id]);
  const statusSummary = useMemo(() => buildStatusSummary(spotPosts, spot.name), [spot.name, spotPosts]);

  async function quickUpdate(statusTag: StatusTag) {
    if (!userReady) {
      setMessage("登录后可以一键校准这个点位的现场状态。");
      return;
    }

    setSubmittingTag(statusTag);
    setMessage("");

    try {
      const response = await fetch(`/api/campuses/${campusId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotId: spot.id, statusTag, text: "" })
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage("这次校准没有同步成功，稍后再试。");
        return;
      }

      setMessage("你刚刚帮助了附近同学，状态已经刷新。");
      await onUpdated(data.post);
    } catch {
      setMessage("网络信号不稳，稍后再更新一次。");
    } finally {
      setSubmittingTag(null);
    }
  }

  return (
    <section className="glass-card rounded-[2rem] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
            <MapPin className="h-3.5 w-3.5" />
            {spot.name}
          </p>
          <h2 className="mt-3 text-xl font-bold text-white sm:text-2xl">{statusSummary.headline}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">{statusSummary.prompt}</p>
        </div>
        <FreshnessBadge label={statusSummary.freshnessLabel} level={statusSummary.level} />
      </div>

      <div className="mt-4 grid gap-3 rounded-3xl border border-white/10 bg-slate-950/35 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Clock3 className="h-4 w-4 text-cyan-200" />
            {statusSummary.lastUpdatedLabel}
          </p>
          <p className="mt-1 text-xs text-slate-500">当前判断：{statusSummary.currentStatus}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {statusSummary.stats.map((item) => (
            <span key={item.tag} className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-slate-300">
              {item.tag} {item.count}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.tag}
            onClick={() => quickUpdate(option.tag)}
            disabled={Boolean(submittingTag)}
            className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl border px-3 text-base font-bold transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-55 ${option.className}`}
          >
            {submittingTag === option.tag ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className={`status-dot h-2.5 w-2.5 rounded-full ${option.dot}`} />}
            {option.tag}
          </button>
        ))}
      </div>

      {message ? (
        <p className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-cyan-200/20 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </p>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <RefreshCcw className="h-3.5 w-3.5" />
          状态可能已变化，看到现场就顺手校准一下。
        </p>
      )}
    </section>
  );
}

function buildStatusSummary(posts: FeedPost[], spotName: string) {
  const latestPost = posts[0] ?? null;
  const minutesSinceLatest = latestPost ? Math.max(0, Math.floor((Date.now() - new Date(latestPost.createdAt).getTime()) / 60000)) : null;
  const hourAgo = Date.now() - 60 * 60000;
  const recentPosts = posts.filter((post) => new Date(post.createdAt).getTime() >= hourAgo);
  const counts = new Map<StatusTag, number>(STATUS_OPTIONS.map((option) => [option.tag, 0]));

  for (const post of recentPosts) {
    if (isStatusTag(post.statusTag)) {
      counts.set(post.statusTag, (counts.get(post.statusTag) ?? 0) + 1);
    }
  }

  const stats = STATUS_OPTIONS.map((option) => ({
    ...option,
    count: counts.get(option.tag) ?? 0
  }));
  const winner = [...stats].sort((a, b) => b.count - a.count)[0];
  const currentStatus = recentPosts.length > 0 && winner.count > 0 ? winner.tag : "暂无可靠状态";

  if (minutesSinceLatest === null) {
    return {
      headline: "这个点位还没有实时信号",
      prompt: "你现在在附近吗？发一条状态，帮同学少跑一趟。",
      lastUpdatedLabel: "暂无更新记录",
      freshnessLabel: "等待信号",
      level: "cold" as const,
      currentStatus,
      stats
    };
  }

  return {
    headline: `${spotName}已经 ${formatMinutes(minutesSinceLatest)}没人更新了`,
    prompt: statusPrompt(minutesSinceLatest),
    lastUpdatedLabel: `最后更新：${relativeUpdateTime(minutesSinceLatest)}`,
    freshnessLabel: freshnessLabel(minutesSinceLatest),
    level: freshnessLevel(minutesSinceLatest),
    currentStatus,
    stats
  };
}

function statusPrompt(minutes: number) {
  if (minutes >= 60) return "当前状态大概率已经变化，附近同学会很需要一次新校准。";
  if (minutes >= 30) return "这条状态有点旧了，看到现场就刷新一下。";
  if (minutes >= 15) return "这里已经 15 分钟以上没人更新了，状态可能已变化。";
  return "状态还算新，也可以顺手确认一下现场情况。";
}

function isStatusTag(value: string): value is StatusTag {
  return STATUS_OPTIONS.some((option) => option.tag === value);
}

function freshnessLabel(minutes: number) {
  if (minutes < 5) return "刚刚更新";
  if (minutes < 15) return "信号较新";
  if (minutes < 30) return "可能变化";
  if (minutes < 60) return "建议更新";
  return "信号偏旧";
}

function freshnessLevel(minutes: number) {
  if (minutes < 15) return "fresh" as const;
  if (minutes < 60) return "warm" as const;
  return "cold" as const;
}

function FreshnessBadge({ label, level }: { label: string; level: "fresh" | "warm" | "cold" }) {
  const tone =
    level === "fresh"
      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
      : level === "warm"
        ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
        : "border-slate-400/20 bg-slate-400/10 text-slate-300";

  return <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${tone}`}>{label}</span>;
}

function relativeUpdateTime(minutes: number) {
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

function formatMinutes(minutes: number) {
  if (minutes < 1) return "不到 1 分钟";
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`;
}
