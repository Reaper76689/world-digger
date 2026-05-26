"use client";

import { LoginPanel } from "@/components/LoginPanel";
import { PostComposer } from "@/components/PostComposer";
import { ArrowLeft, Loader2, Radar, ShieldCheck } from "lucide-react";
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

export default function CampusPublishPage({ params }: { params: Promise<{ campusId: string }> }) {
  const [campusId, setCampusId] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [campus, setCampus] = useState<Campus | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const router = useRouter();

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
      setLoadError("发布雷达加载失败，返回校区后再试一次。");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublished() {
    setNotice("实时状态已发布，24 小时后会从前台自然淡出。");
    router.push(`/campuses/${campusId}`);
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
          <p className="text-lg font-bold text-white">{loadError || "发布页加载失败"}</p>
          <Link href={campusId ? `/campuses/${campusId}` : "/"} className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 hover:bg-cyan-200">
            回到校区
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 sm:px-6 lg:py-7">
        <header className="glass-panel flex flex-col gap-4 rounded-[2rem] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/campuses/${campus.id}`} className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/8 text-slate-300 transition hover:text-cyan-200" title="回到校区">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-200/20">
              <Radar className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">同步现场状态</h1>
              <p className="text-sm text-slate-400">{campus.displayName}</p>
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

        <PostComposer campusId={campus.id} spots={spots} disabled={!user} onPublished={handlePublished} />

        {notice ? <p className="rounded-2xl border border-cyan-200/20 bg-cyan-300/10 p-3 text-sm font-medium text-cyan-100">{notice}</p> : null}
      </div>
    </main>
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "请求失败");
  }
  return data;
}
