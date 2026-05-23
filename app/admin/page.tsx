"use client";

import { LoginPanel } from "@/components/LoginPanel";
import { Check, EyeOff, ShieldAlert, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
  nickname: string;
  role: "user" | "admin";
  status: string;
};

type PendingPost = {
  id: string;
  text: string;
  statusTag: string;
  expiresAt: string;
  createdAt: string;
  author: { id: string; nickname: string; status: string };
  campus: { displayName: string; city: string };
  spot: { name: string } | null;
};

type PendingComment = {
  id: string;
  text: string;
  createdAt: string;
  author: { id: string; nickname: string; status: string };
  post: { id: string; campus: { displayName: string }; spot: { name: string } | null };
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
      setMessage("需要管理员身份。管理员昵称由 ADMIN_NICKNAME 配置。");
      return;
    }

    const data = await response.json();
    setPosts(data.posts ?? []);
    setComments(data.comments ?? []);
  }

  async function act(targetType: "post" | "comment" | "user", targetId: string, action: "approve" | "reject" | "hide" | "ban", reason?: string) {
    const response = await fetch(`/api/admin/moderation/${targetType}/${targetId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason?.trim() || undefined })
    });

    if (!response.ok) {
      const data = await response.json();
      setMessage(data.error ?? "操作失败");
      return;
    }

    setMessage("已处理");
    loadQueue();
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:py-7">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-4 rounded-xl border border-white/70 bg-white/85 p-4 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="text-sm font-semibold text-jade hover:text-jadeDark">
              返回真探
            </Link>
            <h1 className="mt-2 text-3xl font-bold">审核后台</h1>
            <p className="mt-1 text-sm text-ink/55">实时状态默认直接公开，这里主要处理补充内容和被隐藏的状态。</p>
          </div>
          <LoginPanel user={user} onUser={setUser} />
        </header>

        {user?.role !== "admin" ? (
          <section className="rounded-xl border border-white/70 bg-white p-8 shadow-soft">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-mint text-jade">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <p className="mt-4 text-lg font-semibold">请使用管理员账号登录</p>
            <p className="mt-1 text-sm text-ink/55">当前项目的管理员昵称由环境变量 ADMIN_NICKNAME 决定。</p>
          </section>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <QueueSection title="待审状态" count={posts.length}>
              {posts.map((post) => (
                <article key={post.id} className="rounded-xl border border-white/70 bg-white p-4 shadow-soft">
                  <p className="text-sm font-semibold text-jade">{post.campus.displayName}</p>
                  <p className="mt-1 text-xs text-ink/45">
                    {post.statusTag} · {post.author.nickname} · {post.spot?.name ?? "校内点位"} · {formatExpiry(post.expiresAt)}
                  </p>
                  {post.text !== post.statusTag ? <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink/85">{post.text}</p> : null}
                  <Actions
                    onApprove={() => act("post", post.id, "approve")}
                    onReject={(reason) => act("post", post.id, "reject", reason)}
                    onHide={(reason) => act("post", post.id, "hide", reason)}
                    onBan={() => act("user", post.author.id, "ban")}
                  />
                </article>
              ))}
            </QueueSection>

            <QueueSection title="待审补充" count={comments.length}>
              {comments.map((comment) => (
                <article key={comment.id} className="rounded-xl border border-white/70 bg-white p-4 shadow-soft">
                  <p className="text-sm font-semibold text-jade">{comment.post.campus.displayName}</p>
                  <p className="mt-1 text-xs text-ink/45">补充者：{comment.author.nickname} · {comment.post.spot?.name ?? "校内点位"}</p>
                  <p className="mt-3 rounded-lg bg-stone p-3 text-sm leading-6">{comment.text}</p>
                  <Actions
                    onApprove={() => act("comment", comment.id, "approve")}
                    onReject={(reason) => act("comment", comment.id, "reject", reason)}
                    onHide={(reason) => act("comment", comment.id, "hide", reason)}
                    onBan={() => act("user", comment.author.id, "ban")}
                  />
                </article>
              ))}
            </QueueSection>
          </div>
        )}

        {message ? <p className="rounded-xl bg-mint p-3 text-sm font-medium text-jadeDark">{message}</p> : null}
      </div>
    </main>
  );
}

function formatExpiry(value: string) {
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return "已过期";
  return `${Math.ceil(diff / 3600000)} 小时后过期`;
}

function QueueSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/55 shadow-sm">{count}</span>
      </div>
      <div className="space-y-3">{count === 0 ? <div className="rounded-xl border border-dashed border-ink/20 bg-white/75 p-8 text-center text-sm text-ink/55">暂无内容</div> : children}</div>
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
  onReject: (reason?: string) => void;
  onHide: (reason?: string) => void;
  onBan: () => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="mt-4 space-y-3">
      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={240}
        placeholder="拒绝或隐藏时可填写原因"
        className="min-h-20 w-full resize-none rounded-lg border border-ink/10 bg-stone p-3 text-sm leading-6 outline-none transition focus:border-jade focus:bg-white"
      />
      <div className="flex flex-wrap gap-2">
        <button onClick={onApprove} className="inline-flex h-9 items-center gap-2 rounded-lg bg-jade px-3 text-sm font-semibold text-white transition hover:bg-jadeDark">
          <Check className="h-4 w-4" />
          通过
        </button>
        <button onClick={() => onReject(reason)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-ink/10 bg-white px-3 text-sm transition hover:border-ink/25">
          <X className="h-4 w-4" />
          拒绝
        </button>
        <button onClick={() => onHide(reason)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-ink/10 bg-white px-3 text-sm transition hover:border-ink/25">
          <EyeOff className="h-4 w-4" />
          隐藏
        </button>
        <button onClick={onBan} className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm text-red-700 transition hover:bg-red-50">
          封禁用户
        </button>
      </div>
    </div>
  );
}
