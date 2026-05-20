"use client";

import { LogIn, LogOut, Shield, UserRound } from "lucide-react";
import { useState } from "react";

type User = {
  id: string;
  nickname: string;
  role: "user" | "admin";
  status: string;
};

export function LoginPanel({
  user,
  onUser
}: {
  user: User | null;
  onUser: (user: User | null) => void;
}) {
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "登录失败");
      return;
    }
    onUser(data.user);
    setNickname("");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    onUser(null);
  }

  if (user) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-ink/10 bg-white px-3 py-2 shadow-sm">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-mint text-jade">
          {user.role === "admin" ? <Shield className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.nickname}</p>
          <p className="text-xs text-ink/50">{user.role === "admin" ? "管理员" : "探索者"}</p>
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

  return (
    <div className="rounded-lg border border-ink/10 bg-white p-2 shadow-sm">
      <div className="flex gap-2">
        <input
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") login();
          }}
          placeholder="输入昵称"
          className="h-10 min-w-0 flex-1 rounded-md bg-stone px-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-jade"
        />
        <button
          onClick={login}
          disabled={loading || nickname.trim().length < 2}
          className="grid h-10 w-10 place-items-center rounded-md bg-ink text-white transition hover:bg-jade disabled:opacity-40"
          title="登录"
        >
          <LogIn className="h-4 w-4" />
        </button>
      </div>
      {error ? <p className="px-1 pt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
