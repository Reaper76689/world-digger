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

export function UserNav({ user, onUser }: { user: AuthUser | null; onUser: (user: AuthUser | null) => void }) {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    onUser(null);
  }

  if (!user) {
    return (
      <Link href="/login" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/15 transition hover:-translate-y-0.5 hover:bg-cyan-200">
        <LogIn className="h-4 w-4" />
        登录雷达
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/8 px-3 py-2 shadow-sm backdrop-blur">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200">
        {user.role === "admin" ? <Shield className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
      </div>
      <div className="min-w-0">
        <Link href={`/users/${user.id}`} className="block truncate text-sm font-semibold text-white transition hover:text-cyan-200">
          {user.nickname}
        </Link>
        <p className="truncate text-xs text-slate-400">{user.role === "admin" ? "管理员" : "在线观察员"}</p>
      </div>
      <button onClick={logout} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-white/8 hover:text-white" title="退出登录">
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    setLoading(true);
    setMessage("");
    const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, confirmPassword, nickname })
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? (mode === "login" ? "没有接上你的账号信号。" : "账号创建失败，请再试一次。"));
      return;
    }

    if (data.needsConfirmation) {
      setMessage("账号已创建，请先到邮箱确认，再回来登录真探。");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="glass-card w-full rounded-[2rem] p-5">
      <div className="mb-4 grid grid-cols-2 rounded-2xl border border-white/10 bg-slate-950/45 p-1">
        <button onClick={() => setMode("login")} className={`h-10 rounded-xl text-sm font-semibold transition ${mode === "login" ? "bg-cyan-300 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"}`}>
          登录
        </button>
        <button onClick={() => setMode("register")} className={`h-10 rounded-xl text-sm font-semibold transition ${mode === "register" ? "bg-cyan-300 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"}`}>
          注册
        </button>
      </div>

      <div className="space-y-3">
        {mode === "register" ? (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-200">昵称</span>
            <input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="例如：图书馆巡航员" className="soft-input h-11 w-full rounded-2xl px-3 text-sm" />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-200">邮箱</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" className="soft-input h-11 w-full rounded-2xl px-3 text-sm" />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-200">密码</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            placeholder={mode === "register" ? "至少 6 位，包含数字和大小写字母" : "至少 6 位"}
            type="password"
            className="soft-input h-11 w-full rounded-2xl px-3 text-sm"
          />
        </label>

        {mode === "register" ? (
          <label className="block">
            <span className="mb-1 flex items-center justify-between gap-3 text-sm font-semibold text-slate-200">
              确认密码
              <span className="text-xs font-normal text-slate-500">用于守住你的发布身份</span>
            </span>
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
              placeholder="再输入一次密码"
              type="password"
              className={`soft-input h-11 w-full rounded-2xl px-3 text-sm ${confirmPassword && password !== confirmPassword ? "border-red-300/70" : ""}`}
            />
            {confirmPassword && password !== confirmPassword ? <span className="mt-1 block text-xs text-red-300">两次密码还没有对齐。</span> : null}
          </label>
        ) : null}
      </div>

      <button
        onClick={submit}
        disabled={
          loading ||
          !email ||
          password.length < 6 ||
          (mode === "register" && (nickname.trim().length < 2 || password !== confirmPassword || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)))
        }
        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/15 transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:translate-y-0 disabled:opacity-40"
      >
        {mode === "register" ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
        {loading ? "正在连接..." : mode === "register" ? "创建观察员账号" : "进入真探"}
      </button>

      {message ? <p className="mt-3 rounded-2xl border border-cyan-200/20 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">{message}</p> : null}
    </div>
  );
}

export function LoginPanel({ user, onUser }: { user: AuthUser | null; onUser: (user: AuthUser | null) => void }) {
  return <UserNav user={user} onUser={onUser} />;
}
