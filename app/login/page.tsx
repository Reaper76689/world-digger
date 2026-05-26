"use client";

import { AuthForm } from "@/components/LoginPanel";
import { Radar, Waves } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="app-shell px-4 py-6 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-48px)] w-full max-w-5xl items-center gap-6 lg:grid-cols-[1fr_420px]">
        <section className="glass-panel rounded-[2.5rem] p-6">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-200/20">
              <Radar className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">真探</h1>
              <p className="text-sm text-slate-400">回到校园实时雷达</p>
            </div>
          </Link>
          <div className="mt-10 max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
              <Waves className="h-3.5 w-3.5" />
              校园状态网络
            </p>
            <h2 className="mt-4 text-4xl font-bold leading-tight text-white">登录后，把你看到的现场变成有用信号。</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              账号用于发布状态、补充现场、确认“仍然属实”或标记“可能变了”。每条状态会进入校园雷达，帮助附近同学更快做决定。
            </p>
          </div>
        </section>

        <section>
          <AuthForm redirectTo="/" />
          <p className="mt-4 text-center text-sm text-slate-400">
            <Link href="/" className="font-semibold text-cyan-200 transition hover:text-cyan-100">
              先回首页看看
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
