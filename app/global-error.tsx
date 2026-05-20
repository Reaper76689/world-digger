"use client";

export default function GlobalError() {
  return (
    <html lang="zh-CN">
      <body>
        <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 text-ink">
          <p className="text-sm font-semibold text-jadeDark">页面出了点问题</p>
          <h1 className="mt-3 text-3xl font-bold">请稍后再试</h1>
          <p className="mt-4 text-sm text-ink/70">刷新页面通常可以恢复。如果问题一直存在，请回到首页重新进入地点。</p>
        </main>
      </body>
    </html>
  );
}
