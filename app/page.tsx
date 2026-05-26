"use client";

import { LoginPanel } from "@/components/LoginPanel";
import type { FeedPost } from "@/types/shitan";
import { Activity, ArrowUpRight, Flame, Gauge, History, Loader2, MapPin, Radar, School, Search, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type User = {
  id: string;
  email: string;
  nickname: string;
  role: "user" | "admin";
  status: string;
};

type CampusCandidate = {
  sourceCode: string;
  schoolName: string;
  campusName: string | null;
  displayName: string;
  city: string;
  level: string;
  ownership: string;
};

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CampusCandidate[]>([]);
  const [recentPosts, setRecentPosts] = useState<FeedPost[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [openingCampus, setOpeningCampus] = useState("");
  const [notice, setNotice] = useState("");
  const router = useRouter();
  const historyKey = user?.id ? `zhentan-search-history:${user.id}` : "zhentan-search-history:guest";

  const radarStats = useMemo(() => {
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const hotPosts = recentPosts.filter((post) => new Date(post.createdAt).getTime() >= hourAgo);
    const spotCounts = new Map<string, number>();
    const campusCounts = new Map<string, number>();

    for (const post of hotPosts) {
      const spotName = post.spot?.name ?? "校内点位";
      const campusName = post.campus?.displayName ?? "附近校园";
      spotCounts.set(spotName, (spotCounts.get(spotName) ?? 0) + 1);
      campusCounts.set(campusName, (campusCounts.get(campusName) ?? 0) + 1);
    }

    const hotSpots = [...spotCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const hotCampus = [...campusCounts.entries()].sort((a, b) => b[1] - a[1])[0];

    return {
      total: recentPosts.length,
      lastHour: hotPosts.length,
      hotSpots,
      hotCampus: hotCampus ? `${hotCampus[0]} · ${hotCampus[1]} 条波动` : "等待第一条校园信号"
    };
  }, [recentPosts]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    search("");
    fetch("/api/posts/recent?limit=24")
      .then((response) => response.json())
      .then((data) => setRecentPosts(data.posts ?? []))
      .catch(() => setRecentPosts([]));
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(historyKey);
      setSearchHistory(saved ? JSON.parse(saved) : []);
    } catch {
      setSearchHistory([]);
    }
  }, [historyKey]);

  function rememberSearch(keyword: string) {
    if (!keyword) return;

    setSearchHistory((current) => {
      const next = [keyword, ...current.filter((item) => item !== keyword)].slice(0, 8);
      window.localStorage.setItem(historyKey, JSON.stringify(next));
      return next;
    });
  }

  async function search(nextQuery = query) {
    if (searching) return;
    const keyword = nextQuery.trim();

    setSearching(true);
    setNotice("");

    try {
      const response = await fetch(`/api/campuses/search?q=${encodeURIComponent(keyword)}`);
      const data = await response.json();
      const campuses = data.campuses ?? [];

      setResults(campuses);
      rememberSearch(keyword);
      if (keyword && campuses.length === 0) {
        setNotice("这片雷达暂时没有扫到匹配校区，换个学校、城市或校区名再试试。");
      }
    } catch {
      setNotice("校园雷达短暂离线，稍后再扫一次。");
    } finally {
      setSearching(false);
    }
  }

  async function openCampus(candidate: CampusCandidate) {
    setNotice("");
    setOpeningCampus(candidate.sourceCode);

    try {
      const resolved = await fetch("/api/campuses/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceCode: candidate.sourceCode })
      });
      const data = await resolved.json();

      if (!resolved.ok || !data.campus?.id) {
        setNotice("这个校区信号暂时接不上，换一个结果试试。");
        return;
      }

      router.push(`/campuses/${data.campus.id}`);
    } catch {
      setNotice("进入校区失败，请检查网络后再试。");
    } finally {
      setOpeningCampus("");
    }
  }

  return (
    <main className="app-shell">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:py-7">
        <header className="glass-panel flex flex-col gap-4 rounded-[2rem] p-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-300/15 text-cyan-200 ring-1 ring-cyan-200/25">
              <Radar className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-normal text-white">真探</h1>
              <p className="text-sm text-slate-300">校园实时状态网络</p>
            </div>
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {user?.role === "admin" ? (
              <Link href="/admin" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/40 hover:text-cyan-200">
                <ShieldCheck className="h-4 w-4" />
                审核中枢
              </Link>
            ) : null}
            <LoginPanel user={user} onUser={setUser} />
          </div>
        </header>

        <section className="glass-panel relative overflow-hidden rounded-[2.5rem] p-5 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute right-[-7rem] top-[-8rem] h-80 w-80 rounded-full border border-cyan-200/20" />
          <div className="pointer-events-none absolute right-[-3rem] top-[-4rem] h-48 w-48 rounded-full border border-cyan-200/30" />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
            <div>
              <p className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                <span className="status-dot h-2 w-2 rounded-full bg-cyan-300 text-cyan-300" />
                v0.7 校园实时雷达
              </p>
              <h2 className="mt-6 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-6xl">
                看见校园正在发生什么。
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
                真探不是传统社交平台。它只捕捉此刻有用的校园状态：食堂排队、图书馆空位、快递站拥挤、教学楼动静。每一次更新，都是给附近同学的一次实时提醒。
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <div className="flex min-h-14 flex-1 items-center gap-3 rounded-3xl border border-white/10 bg-slate-950/45 px-4">
                  <Search className="h-5 w-5 shrink-0 text-cyan-200" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") search();
                    }}
                    placeholder="搜索学校、校区或城市"
                    className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </div>
                <button
                  onClick={() => search()}
                  disabled={searching}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-3xl bg-cyan-300 px-6 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:translate-y-0 disabled:opacity-50"
                >
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
                  扫描校区
                </button>
              </div>
              {notice ? <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">{notice}</p> : null}
            </div>

            <div className="glass-card rounded-[2rem] p-4">
              <div className="rounded-[1.5rem] border border-cyan-200/15 bg-slate-950/40 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/70">Live Pulse</p>
                    <p className="mt-2 text-3xl font-bold text-white">{radarStats.lastHour}</p>
                    <p className="text-sm text-slate-400">近 1 小时校园状态更新</p>
                  </div>
                  <div className="grid h-20 w-20 place-items-center rounded-full border border-cyan-200/20 bg-cyan-300/10">
                    <Activity className="h-8 w-8 text-cyan-200" />
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Metric icon={<Sparkles className="h-4 w-4" />} label="最近更新" value={`${radarStats.total} 条`} />
                  <Metric icon={<Flame className="h-4 w-4" />} label="当前热度" value={radarStats.lastHour > 8 ? "高" : radarStats.lastHour > 2 ? "升温" : "安静"} />
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <Gauge className="h-4 w-4 text-cyan-200" />
                    {radarStats.hotCampus}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="glass-card rounded-[2rem] p-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-cyan-200" />
                <h2 className="font-bold text-white">最近扫描</h2>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {searchHistory.length > 0 ? (
                  searchHistory.map((keyword) => (
                    <button
                      key={keyword}
                      onClick={() => {
                        setQuery(keyword);
                        search(keyword);
                      }}
                      className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/18"
                    >
                      {keyword}
                    </button>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-slate-400">搜索一次校区后，这里会保留你的雷达入口。</p>
                )}
              </div>
            </section>

            <section className="glass-card rounded-[2rem] p-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-cyan-200" />
                <h2 className="font-bold text-white">热门地点</h2>
              </div>
              <div className="mt-4 space-y-2">
                {radarStats.hotSpots.length > 0 ? (
                  radarStats.hotSpots.map(([spot, count]) => (
                    <div key={spot} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                      <span className="text-slate-200">{spot}</span>
                      <span className="font-semibold text-cyan-200">{count} 条</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-slate-400">还没有足够的实时波动，等同学们发出第一批信号。</p>
                )}
              </div>
            </section>
          </aside>

          <section className="grid content-start gap-3 md:grid-cols-2 xl:grid-cols-3">
            {results.map((campus, index) => (
              <button
                key={campus.sourceCode}
                onClick={() => openCampus(campus)}
                disabled={Boolean(openingCampus)}
                className="glass-card float-card fade-in h-full w-full rounded-[2rem] p-4 text-left disabled:opacity-60"
                style={{ animationDelay: `${index * 45}ms` }}
              >
                <div className="flex gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-200/20">
                    {openingCampus === campus.sourceCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <School className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{campus.displayName}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-400">
                      {campus.city} · {campus.level} · {campus.ownership}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-cyan-200">
                      进入校园雷达
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </section>
        </section>
      </div>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="flex items-center gap-2 text-xs text-slate-400">
        <span className="text-cyan-200">{icon}</span>
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}
