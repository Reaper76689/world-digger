"use client";

import { AuthForm } from "@/components/LoginPanel";
import { GraduationCap } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-48px)] w-full max-w-5xl items-center gap-6 lg:grid-cols-[1fr_420px]">
        <section className="rounded-xl border border-white/70 bg-white/80 p-6 shadow-soft backdrop-blur">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-ink text-white">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">真探</h1>
              <p className="text-sm text-ink/55">返回校园实时状态首页</p>
            </div>
          </Link>
          <div className="mt-10 max-w-xl">
            <p className="inline-flex rounded-full bg-mint px-3 py-1 text-xs font-semibold text-jade">Supabase Auth</p>
            <h2 className="mt-4 text-4xl font-bold leading-tight">登录后发布校园实时状态</h2>
            <p className="mt-4 text-sm leading-7 text-ink/60">
              账号用于发布状态、补充现场情况，以及点击“属实”和“已变化”。实时状态会直接公开，24 小时后自动从前台隐藏。
            </p>
          </div>
        </section>

        <section>
          <AuthForm redirectTo="/" />
          <p className="mt-4 text-center text-sm text-ink/55">
            <Link href="/" className="font-semibold text-jade hover:text-jadeDark">
              先回首页看看
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
