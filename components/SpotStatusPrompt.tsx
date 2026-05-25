"use client";

import type { FeedPost } from "@/types/shitan";
import { CheckCircle2, Clock3, Loader2, MapPin, RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";

type Spot = {
  id: string;
  name: string;
};

type StatusTag = "人少" | "一般" | "爆满" | "有空位";

const STATUS_OPTIONS: Array<{ tag: StatusTag; icon: string; className: string }> = [
  { tag: "人少", icon: "🟢", className: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" },
  { tag: "一般", icon: "🟡", className: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100" },
  { tag: "爆满", icon: "🔴", className: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100" },
  { tag: "有空位", icon: "🔵", className: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100" }
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
      setMessage("登录后可以 1 次点击更新现场状态。");
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
        setMessage(data.error ?? "更新失败，请稍后再试。");
        return;
      }

      setMessage("已更新，感谢你帮助同学了解现场情况。");
      await onUpdated(data.post);
    } catch {
      setMessage("更新失败，请检查网络后再试。");
    } finally {
      setSubmittingTag(null);
    }
  }

  return (
    <section className="rounded-xl border border-jade/15 bg-white p-4 shadow-soft sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-jadeDark">
            <MapPin className="h-3.5 w-3.5" />
            {spot.name}
          </p>
          <h2 className="mt-3 text-xl font-bold sm:text-2xl">{statusSummary.headline}</h2>
          <p className="mt-1 text-sm leading-6 text-ink/58">{statusSummary.prompt}</p>
        </div>
        <FreshnessBadge label={statusSummary.freshnessLabel} level={statusSummary.level} />
      </div>

      <div className="mt-4 grid gap-3 rounded-lg bg-stone p-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Clock3 className="h-4 w-4 text-jade" />
            {statusSummary.lastUpdatedLabel}
          </p>
          <p className="mt-1 text-xs text-ink/50">当前状态：{statusSummary.currentStatus}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {statusSummary.stats.map((item) => (
            <span key={item.tag} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/65">
              {item.icon} {item.tag} {item.count}
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
            className={`flex min-h-14 items-center justify-center gap-2 rounded-lg border px-3 text-base font-bold transition disabled:opacity-55 ${option.className}`}
          >
            {submittingTag === option.tag ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>{option.icon}</span>}
            {option.tag}
          </button>
        ))}
      </div>

      {message ? (
        <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-mint px-3 py-2 text-sm font-semibold text-jadeDark">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </p>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-xs text-ink/45">
          <RefreshCcw className="h-3.5 w-3.5" />
          不会弹窗打扰，只在你进入点位时轻提醒。
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
  const currentStatus = recentPosts.length > 0 && winner.count > 0 ? `${winner.icon} ${winner.tag}` : "暂无可靠实时状态";

  if (minutesSinceLatest === null) {
    return {
      headline: "这个地点还没有可靠实时状态",
      prompt: "你现在在附近吗？帮忙更新一下状态。",
      lastUpdatedLabel: "暂无更新记录",
      freshnessLabel: "暂无可靠实时状态",
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
  if (minutes >= 60) return "暂无可靠实时状态。你现在在附近吗？帮忙更新一下状态。";
  if (minutes >= 30) return "状态可能已变化，建议顺手更新一下。";
  if (minutes >= 15) return "你现在在附近吗？帮忙更新一下状态。";
  return "状态还算新，也可以顺手确认一下现场情况。";
}

function isStatusTag(value: string): value is StatusTag {
  return STATUS_OPTIONS.some((option) => option.tag === value);
}

function freshnessLabel(minutes: number) {
  if (minutes < 5) return "刚刚更新";
  if (minutes < 15) return "较新";
  if (minutes < 30) return "可能已变化";
  if (minutes < 60) return "建议更新";
  return "暂无可靠实时状态";
}

function freshnessLevel(minutes: number) {
  if (minutes < 15) return "fresh" as const;
  if (minutes < 60) return "warm" as const;
  return "cold" as const;
}

function FreshnessBadge({ label, level }: { label: string; level: "fresh" | "warm" | "cold" }) {
  const tone =
    level === "fresh"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : level === "warm"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-ink/10 bg-ink text-white";

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
