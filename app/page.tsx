"use client";

import { LoginPanel } from "@/components/LoginPanel";
import { ArrowUpRight, GraduationCap, History, Loader2, Radio, School, Search, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [openingCampus, setOpeningCampus] = useState("");
  const [notice, setNotice] = useState("");
  const router = useRouter();
  const historyKey = user?.id ? `zhentan-search-history:${user.id}` : "zhentan-search-history:guest";

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    search("");
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
        setNotice("没有找到匹配校区。可以换学校名、城市或校区名试试。");
      }
    } catch {
      setNotice("校园搜索暂时不可用，请稍后再试。");
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
        setNotice(data.error ?? "校区打开失败，请换一个结果试试。");
        return;
      }

      router.push(`/campuses/${data.campus.id}`);
    } catch {
      setNotice("校区打开失败，请检查网络后重试。");
    } finally {
      setOpeningCampus("");
    }
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:py-7">
        <header className="flex flex-col gap-4 rounded-xl border border-white/70 bg-white/80 p-4 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-ink text-white shadow-lg shadow-ink/15">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-normal">真探</h1>
              <p className="text-sm text-ink/55">河南高校实时状态共享，先从一个校区开始。</p>
            </div>
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {user?.role === "admin" ? (
              <Link
                href="/admin"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-ink/10 bg-white px-4 text-sm font-semibold text-ink shadow-sm transition hover:border-jade/40 hover:text-jade"
              >
                <ShieldCheck className="h-4 w-4" />
                审核后台
              </Link>
            ) : null}
            <LoginPanel user={user} onUser={setUser} />
          </div>
        </header>

        <section className="overflow-hidden rounded-xl border border-white/70 bg-white shadow-soft">
          <div>
            <div className="bg-[linear-gradient(135deg,#18211f_0%,#1e8a68_62%,#f4c95d_100%)] px-5 py-8 text-white sm:px-8 lg:min-h-[390px]">
              <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/16 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Radio className="h-3.5 w-3.5" />
              v0.4 实时状态平台
            </p>
              <h2 className="mt-5 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">食堂排不排队，图书馆有没有座，一眼知道。</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/78">
              真探现在聚焦校园现场状态：选择校区和点位，点击“人少 / 一般 / 爆满 / 有空位”，3 秒发布，24 小时自动过期。
            </p>
              <div className="mt-6 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
              {["食堂排队", "图书馆空位", "快递站拥挤", "教学楼状态"].map((item) => (
                <div key={item} className="rounded-lg border border-white/20 bg-white/14 px-3 py-3 text-sm font-semibold backdrop-blur">
                  {item}
                </div>
              ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <section className="rounded-xl border border-white/70 bg-white p-5 shadow-soft">
            <p className="inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-jade">
              <Sparkles className="h-3.5 w-3.5" />
              选择校区
            </p>
            <h2 className="mt-3 text-2xl font-bold">进入你的校园实时页</h2>
            <p className="mt-2 text-sm leading-6 text-ink/55">食堂排队、图书馆空位、快递站拥挤程度，都用一个状态按钮快速发布。</p>

            <div className="mt-5 flex gap-2 rounded-lg border border-ink/10 bg-stone px-2 py-2 focus-within:border-jade">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") search();
                }}
                placeholder="搜索学校、校区或城市"
                className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
              />
              <button
                onClick={() => search()}
                disabled={searching}
                className="grid h-10 w-10 place-items-center rounded-md bg-jade text-white shadow-sm transition hover:bg-jadeDark disabled:opacity-50"
                title="搜索校区"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </div>

            {notice ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p> : null}
          </section>

          <section className="rounded-xl border border-white/70 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-jade" />
              <h2 className="font-bold">历史搜索</h2>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {searchHistory.length > 0 ? (
                searchHistory.map((keyword) => (
                  <button
                    key={keyword}
                    onClick={() => {
                      setQuery(keyword);
                      search(keyword);
                    }}
                    className="rounded-full border border-jade/15 bg-mint px-3 py-1.5 text-sm font-semibold text-jade transition hover:border-jade/45 hover:bg-white"
                  >
                    {keyword}
                  </button>
                ))
              ) : (
                <p className="text-sm text-ink/55">搜索学校、校区或城市后，会在这里保留最近记录。</p>
              )}
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {results.map((campus) => (
              <button
                key={campus.sourceCode}
                onClick={() => openCampus(campus)}
                disabled={Boolean(openingCampus)}
                className="group h-full w-full rounded-xl border border-ink/10 bg-white p-4 text-left shadow-sm transition hover:border-jade/45 hover:shadow-md disabled:opacity-60"
              >
                <div className="flex gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-mint text-jade">
                    {openingCampus === campus.sourceCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <School className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{campus.displayName}</p>
                    <p className="mt-1 text-sm leading-5 text-ink/55">
                      {campus.city} · {campus.level} · {campus.ownership}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-jade">
                      进入校区
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
