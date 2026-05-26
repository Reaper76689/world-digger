"use client";

import { Loader2, Radio, Send, Waves } from "lucide-react";
import { useState } from "react";

const STATUS_OPTIONS = [
  { tag: "人少", dot: "bg-emerald-300 text-emerald-300", tone: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" },
  { tag: "一般", dot: "bg-amber-300 text-amber-300", tone: "border-amber-300/30 bg-amber-300/10 text-amber-100" },
  { tag: "爆满", dot: "bg-rose-300 text-rose-300", tone: "border-rose-300/30 bg-rose-300/10 text-rose-100" },
  { tag: "有空位", dot: "bg-sky-300 text-sky-300", tone: "border-sky-300/30 bg-sky-300/10 text-sky-100" }
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
      setMessage("先选一个正在观察的校园点位。");
      return;
    }
    if (!statusTag) {
      setMessage("再给这个点位打一个实时状态。");
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
        setMessage(data.error ?? "这条状态没有发出去，稍后再试一次。");
        return;
      }

      setText("");
      setStatusTag("");
      setMessage("你刚刚帮助了附近同学，状态已同步到校园雷达。");
      await onPublished();
    } catch {
      setMessage("网络信号不稳，检查后再发一次。");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <section className="glass-panel overflow-hidden rounded-[2rem]">
      <div className="border-b border-white/10 bg-gradient-to-br from-cyan-300/16 via-teal-300/10 to-slate-950/20 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
              <Waves className="h-4 w-4" />
              Signal Cast
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">发出一条现场状态</h2>
            <p className="mt-1 text-sm text-slate-400">选点位，选状态，补一句现场细节。</p>
          </div>
          <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">24 小时有效</span>
        </div>
      </div>

      <div className="p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Radio className="h-4 w-4 text-cyan-200" />
          你现在观察的是哪里？
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {spots.map((spot) => (
            <button
              key={spot.id}
              type="button"
              onClick={() => setSpotId(spot.id)}
              disabled={disabled || publishing}
              className={`h-11 rounded-2xl border px-3 text-sm font-semibold transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40 ${
                spotId === spot.id
                  ? "border-cyan-300/60 bg-cyan-300/16 text-cyan-100 shadow-lg shadow-cyan-500/10"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-200/35 hover:text-cyan-100"
              }`}
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
          placeholder={disabled ? "登录后就能把现场状态发给附近同学" : "补充一句：比如“二楼靠窗还有座”“快递站队伍到门口了”"}
          className="soft-input mt-4 min-h-24 w-full resize-none rounded-3xl p-4 text-sm leading-6 disabled:opacity-50"
        />

        <p className="mb-3 mt-4 text-sm font-semibold text-slate-200">当前状态</p>
        <div className="grid grid-cols-2 gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.tag}
              type="button"
              onClick={() => setStatusTag(option.tag)}
              disabled={disabled || publishing}
              className={`flex h-14 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-bold transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40 ${
                statusTag === option.tag ? "ring-2 ring-cyan-300/30" : ""
              } ${option.tone}`}
            >
              <span className={`status-dot h-2.5 w-2.5 rounded-full ${option.dot}`} />
              {option.tag}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={publish}
          disabled={disabled || publishing || !spotId || !statusTag}
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/15 transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:translate-y-0 disabled:bg-slate-600 disabled:text-slate-300 disabled:shadow-none"
        >
          {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          同步到校园雷达
        </button>

        {message ? <p className="mt-3 rounded-2xl border border-cyan-200/20 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">{message}</p> : null}
      </div>
    </section>
  );
}
