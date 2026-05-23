"use client";

import { Feed } from "@/components/Feed";
import { LoginPanel } from "@/components/LoginPanel";
import type { FeedPost, UserCommentStatusItem, UserContentStatus, UserPostStatusItem } from "@/types/shitan";
import { ArrowLeft, ArrowUpRight, Clock3, GraduationCap, Loader2, MessageCircle, PlusCircle, Radio, School, ShieldCheck } from "lucide-react";
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
      if (user) loadMine(campusId);
    });
    socket.on("comment.approved", (comment: FeedPost["comments"][number] & { postId: string }) => {
      setPosts((current) =>
        current.map((post) =>
          post.id === comment.postId
            ? { ...post, comments: [...post.comments.filter((item) => item.id !== comment.id), comment] }
            : post
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
        setLoadError("没有找到这个校区。");
        return;
      }
      setCampus(campusData.campus);
      setSpots(spotData.spots ?? []);
    } catch {
      setLoadError("校区加载失败，请返回首页后重试。");
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
        setNotice(data.error ?? "我的发布记录暂时加载失败。");
        return;
      }

      setMine({
        posts: data.posts ?? [],
        comments: data.comments ?? []
      });
    } catch {
      setNotice("我的发布记录暂时加载失败。");
    } finally {
      setMineLoading(false);
    }
  }

  async function handleCommentPending() {
    setNotice("补充内容已进入审核队列，通过后才会公开显示。");
    await loadMine();
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-jade" />
      </main>
    );
  }

  if (loadError || !campus) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <section className="max-w-md rounded-xl border border-white/70 bg-white p-6 text-center shadow-soft">
          <p className="text-lg font-bold">{loadError || "校区加载失败"}</p>
          <Link href="/" className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:bg-jade">
            返回首页
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:py-7">
        <header className="flex flex-col gap-4 rounded-xl border border-white/70 bg-white/80 p-4 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="grid h-11 w-11 place-items-center rounded-lg border border-ink/10 bg-white text-ink hover:text-jade" title="返回首页">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-ink text-white">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">{campus.displayName}</h1>
              <p className="text-sm text-ink/55">
                {campus.city} · {campus.level} · {campus.ownership}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {user?.role === "admin" ? (
              <Link href="/admin" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-ink/10 bg-white px-4 text-sm font-semibold text-ink shadow-sm hover:text-jade">
                <ShieldCheck className="h-4 w-4" />
                审核后台
              </Link>
            ) : null}
            <LoginPanel user={user} onUser={setUser} />
          </div>
        </header>

        <section className="overflow-hidden rounded-xl border border-white/70 bg-white shadow-soft">
          <div>
            <div className="p-5 sm:p-6">
              <p className="inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-jade">
                <Radio className="h-3.5 w-3.5" />
                校园实时状态
              </p>
              <h2 className="mt-4 text-3xl font-bold">{campus.schoolName}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-ink/58">
                这里不做长帖社交，只收集当下可行动的信息：哪里人少、哪里爆满、哪里还有空位。状态默认 24 小时后从前台隐藏。
              </p>
              <div className="mt-5 grid gap-3 sm:max-w-sm">
                <Metric label="实时状态" value={posts.length} />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-4">
            <section className="overflow-hidden rounded-xl border border-white/70 bg-white shadow-soft">
              <div className="border-b border-ink/8 bg-[linear-gradient(135deg,#18211f_0%,#1e8a68_58%,#f4c95d_100%)] p-4 text-white">
                <p className="text-xs font-semibold text-white/70">实时状态发布</p>
                <h2 className="mt-1 text-xl font-bold">去发布页选择点位和状态</h2>
              </div>
              <div className="p-4">
                <p className="text-sm leading-6 text-ink/55">发布流程已独立成单页，进入后再选择点位、补充说明并点击状态按钮。</p>
                <Link
                  href={`/campuses/${campus.id}/publish`}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-jade px-4 text-sm font-bold text-white shadow-sm transition hover:bg-jadeDark"
                >
                  <PlusCircle className="h-4 w-4" />
                  发布实时状态
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
            {user ? <MyContentPanel mine={mine} loading={mineLoading} /> : null}
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-white/70 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <School className="h-5 w-5 text-jade" />
                <h3 className="font-bold">最新状态</h3>
              </div>
              <p className="mt-1 text-sm text-ink/55">只显示已公开且未过期的状态，默认按发布时间倒序排列。</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveSpotId("")}
                  className={`h-9 rounded-lg border px-3 text-sm font-medium ${activeSpotId ? "border-ink/10 bg-white" : "border-jade bg-mint text-jadeDark"}`}
                >
                  全部
                </button>
                {spots.map((spot) => (
                  <button
                    key={spot.id}
                    onClick={() => setActiveSpotId(spot.id)}
                    className={`h-9 rounded-lg border px-3 text-sm font-medium ${activeSpotId === spot.id ? "border-jade bg-mint text-jadeDark" : "border-ink/10 bg-white"}`}
                  >
                    {spot.name}
                  </button>
                ))}
              </div>
            </div>
            <Feed posts={posts} userReady={Boolean(user)} onCommentPending={handleCommentPending} />
          </div>
        </section>

        {notice ? <p className="rounded-xl bg-mint p-3 text-sm font-medium text-jadeDark">{notice}</p> : null}
      </div>
    </main>
  );
}

function MyContentPanel({ mine, loading }: { mine: MineState; loading: boolean }) {
  const total = mine.posts.length + mine.comments.length;

  return (
    <section className="rounded-xl border border-white/70 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">我的发布记录</h3>
          <p className="mt-1 text-sm text-ink/50">查看你在当前校区发布、补充和审核后的结果。</p>
        </div>
        <span className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-jade">{loading ? "刷新中" : `${total} 条`}</span>
      </div>

      {total === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-ink/15 bg-stone p-4 text-sm text-ink/55">还没有记录。发布实时状态后会先出现在这里。</div>
      ) : (
        <div className="mt-4 space-y-3">
          {mine.posts.map((post) => (
            <article key={post.id} className="rounded-lg border border-ink/10 bg-stone p-3">
              <p className={`flex items-center gap-2 text-xs font-semibold ${statusColor(post.status)}`}>
                <Clock3 className="h-3.5 w-3.5" />
                状态 · {post.statusTag} · {statusLabel(post.status)} · {post.spot?.name ?? "校内点位"} · {formatTime(post.createdAt)}
              </p>
              {post.text !== post.statusTag ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/80">{post.text}</p> : null}
              <p className="mt-2 text-xs text-ink/45">属实 {post.confirmsCount} · 已过时 {post.outdatedCount}</p>
              <StatusNote status={post.status} reason={post.moderationReason} expiresAt={post.expiresAt} />
            </article>
          ))}

          {mine.comments.map((comment) => (
            <article key={comment.id} className="rounded-lg border border-ink/10 bg-stone p-3">
              <p className={`flex items-center gap-2 text-xs font-semibold ${statusColor(comment.status)}`}>
                <MessageCircle className="h-3.5 w-3.5" />
                补充 · {statusLabel(comment.status)} · {formatTime(comment.createdAt)}
              </p>
              <p className="mt-2 rounded-md bg-white px-3 py-2 text-sm leading-6 text-ink/80">{comment.text}</p>
              <p className="mt-2 line-clamp-2 text-xs text-ink/45">补充于：{comment.post.text}</p>
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
    return <p className="mt-2 rounded-md bg-white px-3 py-2 text-xs text-jadeDark">{expired ? "已过期，保留为历史记录。" : "已公开展示，过期前其他同学可以看到。"}</p>;
  }

  if (status === "pending") {
    return <p className="mt-2 rounded-md bg-white px-3 py-2 text-xs text-ink/55">正在等待管理员审核，暂时不会公开展示。</p>;
  }

  if (status === "rejected") {
    return <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">未通过：{reason || "管理员没有填写具体原因。"}</p>;
  }

  return <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">已隐藏：{reason || "管理员没有填写具体原因。"}</p>;
}

function Metric({ label, value }: { label: string | number; value: string | number }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-stone px-3 py-3">
      <p className="text-xs text-ink/45">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
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
  if (status === "approved") return "text-jade";
  if (status === "rejected") return "text-red-700";
  if (status === "hidden") return "text-amber-800";
  return "text-ink/55";
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
