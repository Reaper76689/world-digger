"use client";

import { AmapPreview } from "@/components/AmapPreview";
import { Feed } from "@/components/Feed";
import { LoginPanel } from "@/components/LoginPanel";
import { PostComposer } from "@/components/PostComposer";
import type { FeedPost } from "@/types/shitan";
import { Compass, Loader2, MapPinned, Radio, Search, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";

type User = {
  id: string;
  nickname: string;
  role: "user" | "admin";
  status: string;
};

type PlaceCandidate = {
  amapPoiId?: string;
  name: string;
  address?: string;
  city?: string;
  lat: number;
  lng: number;
};

type Place = PlaceCandidate & {
  id: string;
};

const exampleQueries = ["西湖", "三里屯", "上海交通大学"];

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceCandidate[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [searching, setSearching] = useState(false);
  const [openingPlace, setOpeningPlace] = useState("");
  const [notice, setNotice] = useState("");

  const socket: Socket | null = useMemo(() => {
    if (typeof window === "undefined") return null;
    return io({ autoConnect: true });
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (!socket || !selectedPlace) return;
    socket.emit("place:join", selectedPlace.id);
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
  }, [selectedPlace, socket]);

  async function search(nextQuery = query) {
    const keyword = nextQuery.trim();
    if (!keyword) return;
    setQuery(keyword);
    setSearching(true);
    setNotice("");
    const response = await fetch(`/api/places/search?q=${encodeURIComponent(keyword)}`);
    const data = await response.json();
    setSearching(false);
    setResults(data.places ?? []);
    if ((data.places ?? []).length === 0) {
      setNotice("没有找到匹配地点。若未配置 AMAP_REST_KEY，当前只会返回内置示例地点。");
    }
  }

  async function openPlace(candidate: PlaceCandidate) {
    setNotice("");
    setOpeningPlace(candidate.name);
    const resolved = await fetch("/api/places/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(candidate)
    });
    const data = await resolved.json();
    setSelectedPlace(data.place);
    const feed = await fetch(`/api/places/${data.place.id}/posts`);
    const feedData = await feed.json();
    setPosts(feedData.posts ?? []);
    setOpeningPlace("");
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:py-7">
        <header className="flex flex-col gap-4 rounded-xl border border-white/70 bg-white/80 p-4 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-ink text-white shadow-lg shadow-ink/15">
              <Compass className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-normal">世探</h1>
              <p className="text-sm text-ink/55">打开一个地点，交换此刻正在发生的事。</p>
            </div>
          </div>
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

        <section className="space-y-5">
          <aside className="space-y-4">
            <section className="rounded-xl border border-white/70 bg-white p-4 shadow-soft">
              <div className="mb-4">
                <p className="inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-jade">
                  <Sparkles className="h-3.5 w-3.5" />
                  地点入口
                </p>
                <h2 className="mt-3 text-xl font-bold">搜索城市、学校、景点或商圈</h2>
                <p className="mt-1 text-sm leading-6 text-ink/55">选择一个地点后，右侧会变成这个地点的实时动态页。</p>
              </div>

              <div className="flex gap-2 rounded-lg border border-ink/10 bg-stone px-2 py-2 focus-within:border-jade">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") search();
                  }}
                  placeholder="例如：西湖、三里屯、上海交通大学"
                  className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
                />
                <button
                  onClick={() => search()}
                  disabled={searching}
                  className="grid h-10 w-10 place-items-center rounded-md bg-jade text-white shadow-sm transition hover:bg-jadeDark disabled:opacity-50"
                  title="搜索地点"
                >
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {exampleQueries.map((item) => (
                  <button
                    key={item}
                    onClick={() => search(item)}
                    className="rounded-full border border-ink/10 px-3 py-1.5 text-xs font-medium text-ink/60 transition hover:border-jade/40 hover:text-jade"
                  >
                    {item}
                  </button>
                ))}
              </div>
              {notice ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p> : null}
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((place) => {
                const active = selectedPlace?.amapPoiId === place.amapPoiId || selectedPlace?.name === place.name;
                return (
                  <button
                    key={`${place.amapPoiId ?? place.name}-${place.lat}-${place.lng}`}
                    onClick={() => openPlace(place)}
                    className={`group w-full rounded-xl border bg-white p-4 text-left shadow-sm transition ${
                      active ? "border-jade ring-4 ring-jade/10" : "border-ink/10 hover:border-jade/45 hover:shadow-md"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-mint text-jade">
                        {openingPlace === place.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPinned className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{place.name}</p>
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-ink/55">
                          {place.address || place.city || "位置详情待补充"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </section>
          </aside>

          <section className="min-w-0 space-y-4">
            {selectedPlace ? (
              <>
                <section className="overflow-hidden rounded-xl border border-white/70 bg-white shadow-soft">
                  <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="p-5">
                      <p className="inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-jade">
                        <Radio className="h-3.5 w-3.5" />
                        实时订阅中
                      </p>
                      <h2 className="mt-4 text-2xl font-bold sm:text-3xl">{selectedPlace.name}</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/55">{selectedPlace.address || selectedPlace.city}</p>
                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <Metric label="公开动态" value={posts.length} />
                        <Metric label="审核机制" value="发前" />
                        <Metric label="图片上限" value="4 张" />
                      </div>
                    </div>
                    <AmapPreview lat={selectedPlace.lat} lng={selectedPlace.lng} name={selectedPlace.name} compact />
                  </div>
                </section>

                <PostComposer
                  placeId={selectedPlace.id}
                  disabled={!user}
                  onPending={() => setNotice("内容已进入审核队列。")}
                />
                <Feed posts={posts} userReady={Boolean(user)} onCommentPending={() => setNotice("回复已进入审核队列。")} />
              </>
            ) : (
              <section className="flex min-h-[620px] items-center justify-center rounded-xl border border-white/70 bg-white/78 p-8 text-center shadow-soft backdrop-blur">
                <div className="max-w-md">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-xl bg-mint text-jade">
                    <MapPinned className="h-8 w-8" />
                  </div>
                  <h2 className="mt-5 text-3xl font-bold">从一个地点开始探索</h2>
                  <p className="mt-3 text-sm leading-7 text-ink/55">
                    搜索地点后进入它的动态页，查看别人发布的实时情况，也可以提交自己的现场信息。
                  </p>
                </div>
              </section>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-stone px-3 py-3">
      <p className="text-xs text-ink/45">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
