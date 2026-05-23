"use client";

import { LoginPanel } from "@/components/LoginPanel";
import { PostComposer } from "@/components/PostComposer";
import { ArrowLeft, GraduationCap, Loader2, ShieldCheck } from "lucide-react";
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
        setLoadError("没有找到这个校区。");
        return;
      }

      setCampus(campusData.campus);
      setSpots(spotData.spots ?? []);
    } catch {
      setLoadError("发布页加载失败，请返回校区后重试。");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublished() {
    setNotice("实时状态已发布，24 小时后自动从前台隐藏。");
    router.push(`/campuses/${campusId}`);
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
          <p className="text-lg font-bold">{loadError || "发布页加载失败"}</p>
          <Link href={campusId ? `/campuses/${campusId}` : "/"} className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:bg-jade">
            返回校区
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 sm:px-6 lg:py-7">
        <header className="flex flex-col gap-4 rounded-xl border border-white/70 bg-white/80 p-4 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/campuses/${campus.id}`} className="grid h-11 w-11 place-items-center rounded-lg border border-ink/10 bg-white text-ink hover:text-jade" title="返回校区">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-ink text-white">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">发布实时状态</h1>
              <p className="text-sm text-ink/55">{campus.displayName}</p>
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

        <PostComposer campusId={campus.id} spots={spots} disabled={!user} onPublished={handlePublished} />

        {notice ? <p className="rounded-xl bg-mint p-3 text-sm font-medium text-jadeDark">{notice}</p> : null}
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
