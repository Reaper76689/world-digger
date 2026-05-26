"use client";

import { Feed } from "@/components/Feed";
import { LoginPanel } from "@/components/LoginPanel";
import { SpotStatusPrompt } from "@/components/SpotStatusPrompt";
import type { FeedPost, UserCommentStatusItem, UserContentStatus, UserPostStatusItem } from "@/types/shitan";
import { Activity, ArrowLeft, ArrowUpRight, Clock3, Flame, Loader2, MessageCircle, PlusCircle, Radar, School, ShieldCheck, Signal } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";

type User = {
  id: string;
  email: string;
  nickname: string;
  role: "user" | "admin";
  status: string;
};

type Campus = {
  id: string;
  schoolName: string;
  campusName: string | null;
  displayName: string;
  city: string;
  level: string;
  ownership: string;
  sourceCode: string;
};

type Spot = {
  id: string;
  campusId: string;
  name: string;
};

type MineState = {
  posts: UserPostStatusItem[];
  comments: UserCommentStatusItem[];
};

export default function CampusPage({ params }: { params: Promise<{ campusId: string }> }) {
  const [campusId, setCampusId] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [campus, setCampus] = useState<Campus | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [activeSpotId, setActiveSpotId] = useState("");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [mine, setMine] = useState<MineState>({ posts: [], comments: [] });
  const [loading, setLoading] = useState(true);
  const [mineLoading, setMineLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");

  const socket: Socket | null = useMemo(() => {
    if (typeof window === "undefined") return null;
    return io({ autoConnect: true });
  }, []);
  const activeSpot = useMemo(() => spots.find((spot) => spot.id === activeSpotId) ?? null, [activeSpotId, spots]);
  const hotSpot = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      const name = post.spot?.name ?? "校内点位";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  }, [posts]);

  useEffect(() => {
    params.then(({ campusId: id }) => setCampusId(id));
  }, [params]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!campusId) return;
    loadCampus(campusId);
  }, [campusId]);

  useEffect(() => {
    if (!campusId) return;
    loadPosts(campusId, activeSpotId);
  }, [campusId, activeSpotId]);

  useEffect(() => {
    if (!campusId || !user) {
      setMine({ posts: [], comments: [] });
      return;
    }
    loadMine(campusId);
  }, [campusId, user]);

  useEffect(() => {
    if (!socket || !campusId) return;
    socket.emit("campus:join", campusId);
    socket.on("post.approved", (post: FeedPost) => {
      if (new Date(post.expiresAt).getTime() <= Date.now()) return;
      if (activeSpotId && post.spotId !== activeSpotId) return;
      setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
      setNotice("新的现场状态刚刚进入雷达。");
      if (user) loadMine(campusId);
    });
    socket.on("comment.approved", (comment: FeedPost["comments"][number] & { postId: string }) => {
      setPosts((current) =>
        current.map((post) =>
          post.id === comment.postId ? { ...post, comments: [...post.comments.filter((item) => item.id !== comment.id), comment] } : post
        )
      );
      if (user) loadMine(campusId);
    });
    socket.on("post.hidden", ({ id }: { id: string }) => {
      setPosts((current) => current.filter((post) => post.id !== id));
      if (user) loadMine(campusId);
    });
    return () => {
      socket.off("post.approved");
      socket.off("comment.approved");
      socket.off("post.hidden");
    };
  }, [activeSpotId, campusId, socket, user]);

  async function loadCampus(id: string) {
    setLoading(true);
    setLoadError("");

    try {
      const [campusData, spotData] = await Promise.all([
        fetchJson<{ campus?: Campus }>(`/api/campuses/${id}`),
        fetchJson<{ spots?: Spot[] }>(`/api/campuses/${id}/spots`)
      ]);
      if (!campusData.campus) {
        setLoadError("没有扫到这个校区。");
        return;
      }
      setCampus(campusData.campus);
      setSpots(spotData.spots ?? []);
    } catch {
      setLoadError("校区雷达加载失败，返回首页后再试一次。");
    } finally {
      setLoading(false);
    }
  }

  async function loadPosts(id = campusId, spotId = activeSpotId) {
    if (!id) return;
    const query = new URLSearchParams();
    if (spotId) query.set("spotId", spotId);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const data = await fetchJson<{ posts?: FeedPost[] }>(`/api/campuses/${id}/posts${suffix}`).catch(() => ({ posts: [] }));
    setPosts(data.posts ?? []);
  }

  async function loadMine(id = campusId) {
    if (!id || !user) return;
    setMineLoading(true);

    try {
      const response = await fetch(`/api/campuses/${id}/mine`);
      if (response.status === 401) {
        setMine({ posts: [], comments: [] });
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        setNotice("你的校准记录暂时没有加载出来。");
        return;
      }

      setMine({
        posts: data.posts ?? [],
        comments: data.comments ?? []
      });
    } catch {
      setNotice("你的校准记录暂时没有加载出来。");
    } finally {
      setMineLoading(false);
    }
  }

  async function handleCommentPending() {
    setNotice("补充已进入校准队列，通过后会公开显示。");
    await loadMine();
  }

  async function handleSpotStatusUpdated(post: FeedPost) {
    setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
    setNotice("你刚刚帮助了附近同学，状态已刷新。");
    if (user) await loadMine();
  }

  if (loading) {
    return (
      <main className="app-shell grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-200" />
      </main>
    );
  }

  if (loadError || !campus) {
    return (
      <main className="app-shell grid place-items-center px-4">
        <section className="glass-card max-w-md rounded-[2rem] p-6 text-center">
          <p className="text-lg font-bold text-white">{loadError || "校区加载失败"}</p>
          <Link href="/" className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 hover:bg-cyan-200">
            回到首页
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:py-7">
        <header className="glass-panel flex flex-col gap-4 rounded-[2rem] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/8 text-slate-300 transition hover:text-cyan-200" title="回到首页">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-200/20">
              <Radar className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">{campus.displayName}</h1>
              <p className="text-sm text-slate-400">
                {campus.city} · {campus.level} · {campus.ownership}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {user?.role === "admin" ? (
              <Link href="/admin" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 text-sm font-semibold text-slate-100 transition hover:text-cyan-200">
                <ShieldCheck className="h-4 w-4" />
                审核中枢
              </Link>
            ) : null}
            <LoginPanel user={user} onUser={setUser} />
          </div>
        </header>

        <section className="glass-panel overflow-hidden rounded-[2.5rem] p-5 sm:p-7">
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
            <span className="status-dot h-2 w-2 rounded-full bg-cyan-300 text-cyan-300" />
            校园雷达在线
          </p>
          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div>
              <h2 className="text-3xl font-bold text-white sm:text-5xl">{campus.schoolName}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                这里收集正在变化的现场信息。状态不会变成长期帖子，24 小时后会自然淡出，留下更接近当下的校园画面。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Metric icon={<Signal className="h-4 w-4" />} label="实时状态" value={posts.length} />
              <Metric icon={<School className="h-4 w-4" />} label="监测点位" value={spots.length} />
              <Metric icon={<Flame className="h-4 w-4" />} label="热度点" value={hotSpot?.[0] ?? "等待"} />
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-4">
            <section className="glass-card rounded-[2rem] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/70">Cast</p>
                  <h2 className="mt-2 text-xl font-bold text-white">发一条校园状态</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">不用写长内容，选点位和状态就能帮附近同学快速判断。</p>
                </div>
                <Activity className="h-6 w-6 text-cyan-200" />
              </div>
              <Link href={`/campuses/${campus.id}/publish`} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/15 transition hover:-translate-y-0.5 hover:bg-cyan-200">
                <PlusCircle className="h-4 w-4" />
                同步现场状态
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </section>
            {user ? <MyContentPanel mine={mine} loading={mineLoading} /> : null}
          </div>

          <div className="space-y-3">
            <div className="glass-card rounded-[2rem] p-4">
              <div className="flex items-center gap-2">
                <School className="h-5 w-5 text-cyan-200" />
                <h3 className="font-bold text-white">实时状态流</h3>
              </div>
              <p className="mt-1 text-sm text-slate-400">只显示已公开且未过期的状态，越新的信号越靠前。</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => setActiveSpotId("")} className={`h-10 rounded-2xl border px-3 text-sm font-semibold transition hover:-translate-y-0.5 ${activeSpotId ? "border-white/10 bg-white/5 text-slate-300" : "border-cyan-300/50 bg-cyan-300/14 text-cyan-100"}`}>
                  全部
                </button>
                {spots.map((spot) => (
                  <button key={spot.id} onClick={() => setActiveSpotId(spot.id)} className={`h-10 rounded-2xl border px-3 text-sm font-semibold transition hover:-translate-y-0.5 ${activeSpotId === spot.id ? "border-cyan-300/50 bg-cyan-300/14 text-cyan-100" : "border-white/10 bg-white/5 text-slate-300"}`}>
                    {spot.name}
                  </button>
                ))}
              </div>
            </div>
            {activeSpot ? <SpotStatusPrompt campusId={campus.id} spot={activeSpot} posts={posts} userReady={Boolean(user)} onUpdated={handleSpotStatusUpdated} /> : null}
            <Feed posts={posts} userReady={Boolean(user)} onCommentPending={handleCommentPending} />
          </div>
        </section>

        {notice ? <p className="fade-in rounded-2xl border border-cyan-200/20 bg-cyan-300/10 p-3 text-sm font-medium text-cyan-100">{notice}</p> : null}
      </div>
    </main>
  );
}

function MyContentPanel({ mine, loading }: { mine: MineState; loading: boolean }) {
  const total = mine.posts.length + mine.comments.length;

  return (
    <section className="glass-card rounded-[2rem] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-white">我的校准记录</h3>
          <p className="mt-1 text-sm text-slate-500">你发出的状态和补充，会在这里留下处理进度。</p>
        </div>
        <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">{loading ? "刷新中" : `${total} 条`}</span>
      </div>

      {total === 0 ? (
        <div className="mt-4 rounded-3xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-400">还没有记录。发出第一条状态后，这里会亮起来。</div>
      ) : (
        <div className="mt-4 space-y-3">
          {mine.posts.map((post) => (
            <article key={post.id} className="rounded-3xl border border-white/10 bg-white/5 p-3">
              <p className={`flex items-center gap-2 text-xs font-semibold ${statusColor(post.status)}`}>
                <Clock3 className="h-3.5 w-3.5" />
                状态 · {post.statusTag} · {statusLabel(post.status)} · {post.spot?.name ?? "校内点位"} · {formatTime(post.createdAt)}
              </p>
              {post.text !== post.statusTag ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{post.text}</p> : null}
              <p className="mt-2 text-xs text-slate-500">属实 {post.confirmsCount} · 可能变了 {post.outdatedCount}</p>
              <StatusNote status={post.status} reason={post.moderationReason} expiresAt={post.expiresAt} />
            </article>
          ))}

          {mine.comments.map((comment) => (
            <article key={comment.id} className="rounded-3xl border border-white/10 bg-white/5 p-3">
              <p className={`flex items-center gap-2 text-xs font-semibold ${statusColor(comment.status)}`}>
                <MessageCircle className="h-3.5 w-3.5" />
                补充 · {statusLabel(comment.status)} · {formatTime(comment.createdAt)}
              </p>
              <p className="mt-2 rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-2 text-sm leading-6 text-slate-300">{comment.text}</p>
              <p className="mt-2 line-clamp-2 text-xs text-slate-500">补充于：{comment.post.text}</p>
              <StatusNote status={comment.status} reason={comment.moderationReason} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function StatusNote({ status, reason, expiresAt }: { status: UserContentStatus; reason: string | null; expiresAt?: string }) {
  if (status === "approved") {
    const expired = expiresAt ? new Date(expiresAt).getTime() <= Date.now() : false;
    return <p className="mt-2 rounded-2xl border border-cyan-200/20 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100">{expired ? "已淡出实时流，保留为历史记录。" : "已进入实时流，过期前附近同学可以看到。"}</p>;
  }

  if (status === "pending") {
    return <p className="mt-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">正在等待审核，暂时不会公开显示。</p>;
  }

  if (status === "rejected") {
    return <p className="mt-2 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs text-rose-100">未通过：{reason || "管理员没有填写具体原因。"}</p>;
  }

  return <p className="mt-2 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">已隐藏：{reason || "管理员没有填写具体原因。"}</p>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 px-3 py-3">
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <span className="text-cyan-200">{icon}</span>
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function statusLabel(status: UserContentStatus) {
  if (status === "pending") return "审核中";
  if (status === "approved") return "已公开";
  if (status === "rejected") return "未通过";
  return "已隐藏";
}

function statusColor(status: UserContentStatus) {
  if (status === "approved") return "text-cyan-100";
  if (status === "rejected") return "text-rose-200";
  if (status === "hidden") return "text-amber-200";
  return "text-slate-400";
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "请求失败");
  }
  return data;
}
