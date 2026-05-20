"use client";

import { LogIn, LogOut, Shield } from "lucide-react";
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
      <div className="flex items-center gap-2 rounded-lg border border-ink/10 bg-white px-3 py-2 shadow-sm">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.nickname}</p>
          <p className="flex items-center gap-1 text-xs text-ink/50">
            {user.role === "admin" ? <Shield className="h-3 w-3" /> : null}
            {user.role === "admin" ? "管理员" : "探索者"}
          </p>
        </div>
        <button
          onClick={logout}
          className="grid h-9 w-9 place-items-center rounded-md text-ink/60 hover:bg-ink/5"
          title="退出登录"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-ink/10 bg-white p-3 shadow-sm">
      <div className="flex gap-2">
        <input
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") login();
          }}
          placeholder="输入昵称"
          className="min-w-0 flex-1 rounded-md border border-ink/10 px-3 py-2 text-sm outline-none focus:border-jade"
        />
        <button
          onClick={login}
          disabled={loading || nickname.trim().length < 2}
          className="grid h-10 w-10 place-items-center rounded-md bg-jade text-white disabled:opacity-40"
          title="登录"
        >
          <LogIn className="h-4 w-4" />
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
