"use client";

import { LoginPanel } from "@/components/LoginPanel";
import { Check, EyeOff, ShieldAlert, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type User = {
  id: string;
  nickname: string;
  role: "user" | "admin";
  status: string;
};

type PendingPost = {
  id: string;
  text: string;
  imageUrls: string[];
  createdAt: string;
  author: { id: string; nickname: string; status: string };
  place: { name: string; address: string | null };
};

type PendingComment = {
  id: string;
  text: string;
  createdAt: string;
  author: { id: string; nickname: string; status: string };
  post: { id: string; place: { name: string } };
};

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [comments, setComments] = useState<PendingComment[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (user?.role === "admin") loadQueue();
  }, [user]);

  async function loadQueue() {
    const response = await fetch("/api/admin/moderation");
    if (!response.ok) {
      setMessage("需要管理员身份。默认管理员昵称为 admin，可用 ADMIN_NICKNAME 修改。");
      return;
    }
    const data = await response.json();
    setPosts(data.posts ?? []);
    setComments(data.comments ?? []);
  }

  async function act(targetType: "post" | "comment" | "user", targetId: string, action: "approve" | "reject" | "hide" | "ban") {
    const response = await fetch(`/api/admin/moderation/${targetType}/${targetId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    if (!response.ok) {
      const data = await response.json();
      setMessage(data.error ?? "操作失败");
      return;
    }
    setMessage("已处理。");
    loadQueue();
  }

  return (
    <main className="min-h-screen px-4 py-5">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="text-sm text-jade">
              返回世探
            </Link>
            <h1 className="mt-2 text-3xl font-bold">审核后台</h1>
            <p className="mt-1 text-sm text-ink/55">处理待公开的地点动态和回复。</p>
          </div>
          <LoginPanel user={user} onUser={setUser} />
        </header>

        {user?.role !== "admin" ? (
          <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
            <ShieldAlert className="h-9 w-9 text-jade" />
            <p className="mt-3 font-semibold">请使用管理员昵称登录</p>
            <p className="mt-1 text-sm text-ink/55">本地默认管理员昵称是 admin。</p>
          </div>
        ) : (
          <>
            <QueueSection title={`待审动态 ${posts.length}`}>
              {posts.map((post) => (
                <article key={post.id} className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
                  <p className="text-sm text-ink/50">{post.place.name} · {post.author.nickname}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{post.text}</p>
                  {post.imageUrls.length > 0 ? (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {post.imageUrls.map((image) => (
                        <img key={image} src={image} alt="" className="aspect-square rounded-md object-cover" />
                      ))}
                    </div>
                  ) : null}
                  <Actions
                    onApprove={() => act("post", post.id, "approve")}
                    onReject={() => act("post", post.id, "reject")}
                    onHide={() => act("post", post.id, "hide")}
                    onBan={() => act("user", post.author.id, "ban")}
                  />
                </article>
              ))}
            </QueueSection>

            <QueueSection title={`待审回复 ${comments.length}`}>
              {comments.map((comment) => (
                <article key={comment.id} className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
                  <p className="text-sm text-ink/50">{comment.post.place.name} · {comment.author.nickname}</p>
                  <p className="mt-2 text-sm">{comment.text}</p>
                  <Actions
                    onApprove={() => act("comment", comment.id, "approve")}
                    onReject={() => act("comment", comment.id, "reject")}
                    onHide={() => act("comment", comment.id, "hide")}
                    onBan={() => act("user", comment.author.id, "ban")}
                  />
                </article>
              ))}
            </QueueSection>
          </>
        )}

        {message ? <p className="rounded-lg bg-mint p-3 text-sm text-ink/70">{message}</p> : null}
      </div>
    </main>
  );
}

function QueueSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Actions({
  onApprove,
  onReject,
  onHide,
  onBan
}: {
  onApprove: () => void;
  onReject: () => void;
  onHide: () => void;
  onBan: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button onClick={onApprove} className="inline-flex h-9 items-center gap-2 rounded-md bg-jade px-3 text-sm font-semibold text-white">
        <Check className="h-4 w-4" />
        通过
      </button>
      <button onClick={onReject} className="inline-flex h-9 items-center gap-2 rounded-md border border-ink/10 px-3 text-sm">
        <X className="h-4 w-4" />
        拒绝
      </button>
      <button onClick={onHide} className="inline-flex h-9 items-center gap-2 rounded-md border border-ink/10 px-3 text-sm">
        <EyeOff className="h-4 w-4" />
        隐藏
      </button>
      <button onClick={onBan} className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm text-red-700">
        封禁用户
      </button>
    </div>
  );
}
