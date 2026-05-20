import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 text-ink">
      <p className="text-sm font-semibold text-jadeDark">没有找到页面</p>
      <h1 className="mt-3 text-3xl font-bold">这个入口可能已经失效</h1>
      <Link className="mt-6 text-sm font-semibold text-jadeDark underline" href="/">
        回到首页
      </Link>
    </main>
  );
}
