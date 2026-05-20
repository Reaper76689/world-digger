"use client";

import { AmapPreview } from "@/components/AmapPreview";
import { Feed } from "@/components/Feed";
import { LoginPanel } from "@/components/LoginPanel";
import { PostComposer } from "@/components/PostComposer";
import type { PlaceIntel } from "@/types/place-intel";
import type { FeedPost } from "@/types/shitan";
import { ArrowLeft, ArrowUpRight, CloudSun, Compass, ExternalLink, Flame, Loader2, Newspaper, Radio, ShieldCheck } from "lucide-react";
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

type Place = {
  id: string;
  amapPoiId?: string;
  name: string;
  address?: string;
  city?: string;
  lat: number;
  lng: number;
};

type Signal = {
  id: string;
  source: string;
  title: string;
  summary: string | null;
  url: string | null;
  heat: number;
  occurredAt: string;
};

export default function PlacePage({ params }: { params: Promise<{ placeId: string }> }) {
  const [placeId, setPlaceId] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [intel, setIntel] = useState<PlaceIntel | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const socket: Socket | null = useMemo(() => {
    if (typeof window === "undefined") return null;
    return io({ autoConnect: true });
  }, []);

  useEffect(() => {
    params.then(({ placeId: id }) => setPlaceId(id));
  }, [params]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (!placeId) return;
    loadPlace(placeId);
  }, [placeId]);

  useEffect(() => {
    if (!socket || !placeId) return;
    socket.emit("place:join", placeId);
    socket.on("post.approved", (post: FeedPost) => {
      setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
    });
    socket.on("comment.approved", (comment: FeedPost["comments"][number] & { postId: string }) => {
      setPosts((current) =>
        current.map((post) =>
          post.id === comment.postId
            ? { ...post, comments: [...post.comments.filter((item) => item.id !== comment.id), comment] }
            : post
        )
      );
    });
    socket.on("post.hidden", ({ id }: { id: string }) => {
      setPosts((current) => current.filter((post) => post.id !== id));
    });
    return () => {
      socket.off("post.approved");
      socket.off("comment.approved");
      socket.off("post.hidden");
    };
  }, [placeId, socket]);

  async function loadPlace(id: string) {
    setLoading(true);
    const placeData = await fetch(`/api/places/${id}`).then((response) => response.json());
    const nextPlace = placeData.place;
    setPlace(nextPlace);

    const query = new URLSearchParams({
      name: nextPlace.name,
      city: nextPlace.city ?? "",
      lat: String(nextPlace.lat),
      lng: String(nextPlace.lng)
    });

    const [feedData, intelData, signalData] = await Promise.all([
      fetch(`/api/places/${id}/posts`).then((response) => response.json()),
      fetch(`/api/places/intel?${query.toString()}`).then((response) => response.json()),
      fetch(`/api/places/${id}/signals`).then((response) => response.json())
    ]);

    setPosts(feedData.posts ?? []);
    setIntel(intelData.intel ?? null);
    setSignals(signalData.signals ?? []);
    setLoading(false);
  }

  if (loading || !place) {
    return (
      <main className="grid min-h-screen place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-jade" />
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:py-7">
        <header className="flex flex-col gap-4 rounded-xl border border-white/70 bg-white/80 p-4 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="grid h-11 w-11 place-items-center rounded-lg border border-ink/10 bg-white text-ink hover:text-jade" title="返回搜索">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-ink text-white">
              <Compass className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">{place.name}</h1>
              <p className="text-sm text-ink/55">{place.address || place.city || "地点详情"}</p>
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
          <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="p-5">
              <p className="inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-jade">
                <Radio className="h-3.5 w-3.5" />
                地点实时页
              </p>
              <h2 className="mt-4 text-3xl font-bold">{place.name}</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Metric label="已发布内容" value={posts.length} />
                <Metric label="实时热点" value={signals.length} />
                <Metric label="OSM 地点" value={place.amapPoiId ? "已接入" : "坐标地点"} />
              </div>
            </div>
            <AmapPreview lat={place.lat} lng={place.lng} name={place.name} compact />
          </div>
        </section>

        <PlaceIntelPanel intel={intel} place={place} />
        <HotspotsPanel signals={signals} />

        <section className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
          <PostComposer placeId={place.id} disabled={!user} onPending={() => setNotice("内容已进入审核队列。")} />
          <div className="space-y-3">
            <div className="rounded-xl border border-white/70 bg-white p-4 shadow-sm">
              <h3 className="font-bold">查看与讨论</h3>
              <p className="mt-1 text-sm text-ink/55">审核通过后的地点内容会显示在这里。你也可以回复公开动态。</p>
            </div>
            <Feed posts={posts} userReady={Boolean(user)} onCommentPending={() => setNotice("回复已进入审核队列。")} />
          </div>
        </section>

        {notice ? <p className="rounded-xl bg-mint p-3 text-sm font-medium text-jadeDark">{notice}</p> : null}
      </div>
    </main>
  );
}

function HotspotsPanel({ signals }: { signals: Signal[] }) {
  return (
    <section className="rounded-xl border border-white/70 bg-white p-4 shadow-soft">
      <div className="flex items-center gap-2">
        <Flame className="h-5 w-5 text-jade" />
        <h3 className="font-bold">地区实时热点</h3>
      </div>
      <p className="mt-1 text-sm text-ink/55">这里展示授权数据源、人工录入或官方接口导入的地区热点。暂不做未授权平台爬取。</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {signals.length ? (
          signals.map((signal) => (
            <article key={signal.id} className="rounded-xl border border-ink/10 bg-stone p-4">
              <p className="text-xs font-semibold text-jade">{signal.source} · 热度 {signal.heat}</p>
              <h4 className="mt-2 font-bold">{signal.title}</h4>
              {signal.summary ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink/60">{signal.summary}</p> : null}
              {signal.url ? (
                <a href={signal.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-jade">
                  查看来源 <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-ink/20 bg-white/70 p-6 text-sm text-ink/55 md:col-span-2 xl:col-span-3">
            暂无热点。后续可通过官方接口、授权账号或运营后台导入抖音/小红书等平台的公开授权内容。
          </div>
        )}
      </div>
    </section>
  );
}

function PlaceIntelPanel({ intel, place }: { intel: PlaceIntel | null; place: Place }) {
  const osmUrl = `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=16/${place.lat}/${place.lng}`;
  return (
    <section className="rounded-xl border border-white/70 bg-white p-4 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-bold">OpenStreetMap 地点信息与外部线索</h3>
          <p className="mt-1 text-sm text-ink/55">地点坐标、地图跳转、天气和百科公开摘要会在这里聚合。</p>
        </div>
        <a
          href={osmUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="在 OpenStreetMap 中打开此地点"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:bg-jade"
        >
          打开 OSM
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <InfoCard icon={<CloudSun className="h-5 w-5" />} title="实时天气">
          {intel?.weather ? (
            <div className="space-y-1 text-sm text-ink/70">
              <p className="text-2xl font-bold text-ink">{intel.weather.temperature ?? "--"}°C</p>
              <p>{intel.weather.summary}</p>
              <p>湿度 {intel.weather.humidity ?? "--"}%，风速 {intel.weather.windSpeed ?? "--"} km/h</p>
            </div>
          ) : (
            <p className="text-sm text-ink/55">暂时没有天气数据。</p>
          )}
        </InfoCard>
        <InfoCard icon={<Newspaper className="h-5 w-5" />} title="百科摘要">
          {intel?.wiki ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold">{intel.wiki.title}</p>
              <p className="line-clamp-4 text-sm leading-6 text-ink/60">{intel.wiki.extract}</p>
            </div>
          ) : (
            <p className="text-sm text-ink/55">没有匹配到百科摘要。</p>
          )}
        </InfoCard>
        <InfoCard icon={<ExternalLink className="h-5 w-5" />} title="外部跳转">
          <div className="space-y-2">
            {(intel?.links ?? [{ label: "OpenStreetMap", url: osmUrl }]).map((link) => (
              <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg bg-stone px-3 py-2 text-sm font-semibold text-ink hover:text-jade">
                {link.label}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            ))}
          </div>
        </InfoCard>
      </div>
    </section>
  );
}

function InfoCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-jade">
        {icon}
        <h4 className="font-semibold text-ink">{title}</h4>
      </div>
      {children}
    </article>
  );
}

function Metric({ label, value }: { label: string | number; value: string | number }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-stone px-3 py-3">
      <p className="text-xs text-ink/45">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
