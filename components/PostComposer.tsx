"use client";

import { Loader2, Radio } from "lucide-react";
import { useState } from "react";

const STATUS_OPTIONS = [
  { tag: "人少", dot: "bg-emerald-500", tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  { tag: "一般", dot: "bg-amber-400", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  { tag: "爆满", dot: "bg-red-500", tone: "border-red-200 bg-red-50 text-red-700" },
  { tag: "有空位", dot: "bg-sky-500", tone: "border-sky-200 bg-sky-50 text-sky-800" }
] as const;

type StatusTag = (typeof STATUS_OPTIONS)[number]["tag"];

export function PostComposer({
  campusId,
  spots,
  disabled,
  onPublished
}: {
  campusId: string;
  spots: Array<{ id: string; name: string }>;
  disabled: boolean;
  onPublished: () => void | Promise<void>;
}) {
  const [spotId, setSpotId] = useState("");
  const [statusTag, setStatusTag] = useState<StatusTag | "">("");
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [publishing, setPublishing] = useState(false);

  async function publish() {
    if (disabled || publishing) return;
    if (!spotId) {
      setMessage("先选择一个校内点位。");
      return;
    }
    if (!statusTag) {
      setMessage("再选择一个现场状态。");
      return;
    }

    setPublishing(true);
    setMessage("");

    try {
      const response = await fetch(`/api/campuses/${campusId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotId, statusTag, text })
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "发布失败，请稍后再试。");
        return;
      }

      setText("");
      setStatusTag("");
      setMessage("已发布，正在同步给浏览这个校区的同学。");
      await onPublished();
    } catch {
      setMessage("发布失败，请检查网络后重试。");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-white/70 bg-white shadow-soft">
      <div className="border-b border-ink/8 bg-[linear-gradient(135deg,#18211f_0%,#1e8a68_58%,#f4c95d_100%)] p-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-white/70">实时状态快捷发布</p>
            <p className="mt-1 text-lg font-bold">选点位，选状态，再发布</p>
          </div>
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-emerald-300" />
            <span className="h-3 w-3 rounded-full bg-amber-200" />
            <span className="h-3 w-3 rounded-full bg-red-300" />
            <span className="h-3 w-3 rounded-full bg-sky-300" />
          </div>
        </div>
      </div>
      <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-jade">
            <Radio className="h-3.5 w-3.5" />
            3 秒发布
          </p>
          <h2 className="mt-3 text-xl font-bold">现在这里是什么状态？</h2>
          <p className="mt-1 text-sm text-ink/55">选择点位和状态后，点击发布按钮才会提交。</p>
        </div>
        <span className="rounded-full bg-clay px-3 py-1 text-xs font-semibold text-ink/55">24 小时有效</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {spots.map((spot) => (
          <button
            key={spot.id}
            type="button"
            onClick={() => setSpotId(spot.id)}
            disabled={disabled || publishing}
            className={`h-10 rounded-lg border px-3 text-sm font-medium transition ${
              spotId === spot.id
                ? "border-jade bg-mint text-jadeDark"
                : "border-ink/10 bg-white text-ink/70 hover:border-jade/40 hover:text-jade"
            } disabled:opacity-40`}
          >
            {spot.name}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={160}
        disabled={disabled || publishing}
        placeholder={disabled ? "登录后发布实时状态" : "补充说明（可选）"}
        className="mt-4 min-h-20 w-full resize-none rounded-lg border border-ink/10 bg-stone p-3 text-sm leading-6 outline-none transition focus:border-jade focus:bg-white disabled:bg-ink/5"
      />

      <div className="mt-3 grid grid-cols-2 gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.tag}
            type="button"
            onClick={() => setStatusTag(option.tag)}
            disabled={disabled || publishing}
            className={`flex h-12 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-bold transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40 ${
              statusTag === option.tag ? "ring-2 ring-jade/35" : ""
            } ${option.tone}`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${option.dot}`} />
            {option.tag}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={publish}
        disabled={disabled || publishing || !spotId || !statusTag}
        className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-jade px-4 text-sm font-bold text-white shadow-sm transition hover:bg-jadeDark disabled:bg-ink/25 disabled:shadow-none"
      >
        {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
        发布
      </button>

      {message ? <p className="mt-3 rounded-lg bg-mint px-3 py-2 text-sm text-jadeDark">{message}</p> : null}
      </div>
    </section>
  );
}
