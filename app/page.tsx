"use client";

import { AmapPreview } from "@/components/AmapPreview";
import { Feed } from "@/components/Feed";
import { LoginPanel } from "@/components/LoginPanel";
import { PostComposer } from "@/components/PostComposer";
import type { FeedPost } from "@/types/shitan";
import { Compass, MapPinned, Search, ShieldCheck } from "lucide-react";
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

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceCandidate[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [searching, setSearching] = useState(false);
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

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setNotice("");
    const response = await fetch(`/api/places/search?q=${encodeURIComponent(query.trim())}`);
    const data = await response.json();
    setSearching(false);
    setResults(data.places ?? []);
    if ((data.places ?? []).length === 0) {
      setNotice("没有找到匹配地点。若未配置 AMAP_REST_KEY，当前只会返回内置示例地点。");
    }
  }

  async function openPlace(candidate: PlaceCandidate) {
    setNotice("");
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
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 lg:px-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-ink text-white">
                <Compass className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-normal">世探</h1>
                <p className="text-sm text-ink/55">按地点交换陌生人的现场信息</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {user?.role === "admin" ? (
              <Link
                href="/admin"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-ink/10 bg-white px-3 text-sm font-semibold"
              >
                <ShieldCheck className="h-4 w-4" />
                审核后台
              </Link>
            ) : null}
            <LoginPanel user={user} onUser={setUser} />
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[400px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
              <label className="text-sm font-semibold">搜索城市、学校、景点或商圈</label>
              <div className="mt-3 flex gap-2">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") search();
                  }}
                  placeholder="例如：西湖、三里屯、上海交通大学"
                  className="min-w-0 flex-1 rounded-md border border-ink/10 px-3 py-2 text-sm outline-none focus:border-jade"
                />
                <button
                  onClick={search}
                  disabled={searching}
                  className="grid h-10 w-10 place-items-center rounded-md bg-jade text-white disabled:opacity-50"
                  title="搜索地点"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
              {notice ? <p className="mt-3 text-sm text-ink/55">{notice}</p> : null}
            </div>

            <div className="space-y-2">
              {results.map((place) => (
                <button
                  key={`${place.amapPoiId ?? place.name}-${place.lat}-${place.lng}`}
                  onClick={() => openPlace(place)}
                  className="w-full rounded-lg border border-ink/10 bg-white p-4 text-left shadow-sm transition hover:border-jade"
                >
                  <p className="font-semibold">{place.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink/55">{place.address || place.city || "位置详情待补充"}</p>
                </button>
              ))}
            </div>
          </aside>

          <section className="space-y-4">
            {selectedPlace ? (
              <>
                <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-jade">
                        <MapPinned className="h-4 w-4" />
                        地点动态
                      </p>
                      <h2 className="mt-1 text-2xl font-bold">{selectedPlace.name}</h2>
                      <p className="mt-1 text-sm text-ink/55">{selectedPlace.address || selectedPlace.city}</p>
                    </div>
                    <p className="rounded-md bg-mint px-3 py-2 text-xs text-ink/60">实时订阅中</p>
                  </div>
                  <AmapPreview lat={selectedPlace.lat} lng={selectedPlace.lng} name={selectedPlace.name} />
                </div>

                <PostComposer
                  placeId={selectedPlace.id}
                  disabled={!user}
                  onPending={() => setNotice("内容已进入审核队列。")}
                />
                <Feed posts={posts} userReady={Boolean(user)} onCommentPending={() => setNotice("回复已进入审核队列。")} />
              </>
            ) : (
              <div className="flex min-h-[560px] items-center justify-center rounded-lg border border-dashed border-ink/20 bg-white/70 p-8 text-center">
                <div>
                  <MapPinned className="mx-auto h-12 w-12 text-jade" />
                  <h2 className="mt-4 text-2xl font-bold">从一个地点开始探索</h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-ink/55">
                    搜索地点后进入它的动态页，查看别人发布的实时情况，也可以提交自己的现场信息。
                  </p>
                </div>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
