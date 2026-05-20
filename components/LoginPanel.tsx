"use client";

import { LogIn, LogOut, Shield, UserPlus, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type AuthUser = {
  id: string;
  email: string;
  nickname: string;
  role: "user" | "admin";
  status: string;
};

export function UserNav({
  user,
  onUser
}: {
  user: AuthUser | null;
  onUser: (user: AuthUser | null) => void;
}) {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    onUser(null);
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-jade"
      >
        <LogIn className="h-4 w-4" />
        登录 / 注册
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-ink/10 bg-white px-3 py-2 shadow-sm">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-mint text-jade">
        {user.role === "admin" ? <Shield className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{user.nickname}</p>
        <p className="truncate text-xs text-ink/50">{user.role === "admin" ? "管理员" : user.email}</p>
      </div>
      <button
        onClick={logout}
        className="grid h-9 w-9 place-items-center rounded-md text-ink/55 transition hover:bg-ink/5 hover:text-ink"
        title="退出登录"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AuthForm({ redirectTo = "/" }: { redirectTo?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    setLoading(true);
    setMessage("");
    const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, nickname })
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? (mode === "login" ? "登录失败" : "注册失败"));
      return;
    }

    if (data.needsConfirmation) {
      setMessage("注册成功，请先在邮箱中确认账号后再登录。");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="w-full rounded-xl border border-white/70 bg-white p-5 shadow-soft">
      <div className="mb-4 grid grid-cols-2 rounded-lg bg-stone p-1">
        <button
          onClick={() => setMode("login")}
          className={`h-10 rounded-md text-sm font-semibold transition ${mode === "login" ? "bg-white shadow-sm" : "text-ink/55"}`}
        >
          登录
        </button>
        <button
          onClick={() => setMode("register")}
          className={`h-10 rounded-md text-sm font-semibold transition ${mode === "register" ? "bg-white shadow-sm" : "text-ink/55"}`}
        >
          注册
        </button>
      </div>

      <div className="space-y-3">
        {mode === "register" ? (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">昵称</span>
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="例如：地图探索者"
              className="h-11 w-full rounded-lg bg-stone px-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-jade"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-1 block text-sm font-semibold">邮箱</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            className="h-11 w-full rounded-lg bg-stone px-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-jade"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold">密码</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            placeholder="至少 6 位"
            type="password"
            className="h-11 w-full rounded-lg bg-stone px-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-jade"
          />
        </label>
      </div>

      <button
        onClick={submit}
        disabled={loading || !email || password.length < 6 || (mode === "register" && nickname.trim().length < 2)}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink text-sm font-semibold text-white transition hover:bg-jade disabled:opacity-40"
      >
        {mode === "register" ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
        {loading ? "处理中..." : mode === "register" ? "创建账号" : "登录"}
      </button>

      {message ? <p className="mt-3 rounded-lg bg-mint px-3 py-2 text-sm text-jadeDark">{message}</p> : null}
    </div>
  );
}

export function LoginPanel({
  user,
  onUser
}: {
  user: AuthUser | null;
  onUser: (user: AuthUser | null) => void;
}) {
  return <UserNav user={user} onUser={onUser} />;
}
