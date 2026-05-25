import { formatTrustRate, getUserReputation } from "@/lib/reputation";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, BadgeCheck, CheckCircle2, Clock3, GraduationCap, Radio, TimerReset, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function UserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const [user, reputation, recentPosts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        createdAt: true
      }
    }),
    getUserReputation(userId),
    prisma.post.findMany({
      where: {
        authorId: userId,
        status: "approved"
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        text: true,
        statusTag: true,
        confirmsCount: true,
        outdatedCount: true,
        createdAt: true,
        expiresAt: true,
        campus: {
          select: {
            id: true,
            displayName: true
          }
        },
        spot: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
  ]);

  if (!user) notFound();

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6 lg:py-7">
        <header className="flex flex-col gap-4 rounded-xl border border-white/70 bg-white/85 p-4 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="grid h-11 w-11 place-items-center rounded-lg border border-ink/10 bg-white text-ink hover:text-jade" title="返回首页">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-ink text-white">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">用户主页</h1>
              <p className="text-sm text-ink/55">可信度、头衔和最近发布的校园状态。</p>
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-xl border border-white/70 bg-white shadow-soft">
          <div className="bg-[linear-gradient(135deg,#18211f_0%,#1e8a68_58%,#f4c95d_100%)] p-5 text-white sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="h-16 w-16 rounded-xl border border-white/30 object-cover" />
                ) : (
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/14">
                    <UserCircle2 className="h-9 w-9" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-3xl font-bold">{user.nickname || "匿名同学"}</p>
                  <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/16 px-3 py-1 text-sm font-semibold backdrop-blur">
                    <BadgeCheck className="h-4 w-4" />
                    {reputation.title}
                  </p>
                </div>
              </div>
              <p className="text-sm text-white/70">加入于 {formatDate(user.createdAt)}</p>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="发布总数" value={reputation.postCount} />
            <Metric label="被属实次数" value={reputation.confirmedCount} />
            <Metric label="被已变化次数" value={reputation.changedCount} />
            <Metric label="可信率" value={formatTrustRate(reputation.trustRate)} />
            <Metric label="当前头衔" value={reputation.title} />
          </div>

          <div className="border-t border-ink/8 p-4">
            <p className="text-sm font-semibold text-ink/65">已获得头衔</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {reputation.titles.map((title) => (
                <span key={title} className="rounded-full border border-jade/20 bg-mint px-3 py-1 text-sm font-semibold text-jadeDark">
                  {title}
                </span>
              ))}
            </div>
            {reputation.totalFeedbackCount < 5 ? (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">评价数少于 5 次，可信率暂时显示为“数据较少”。</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-white/70 bg-white p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-jade" />
            <h2 className="font-bold">最近发布的状态</h2>
          </div>

          {recentPosts.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-ink/15 bg-stone p-5 text-sm text-ink/55">还没有公开状态。</div>
          ) : (
            <div className="mt-4 space-y-3">
              {recentPosts.map((post) => (
                <article key={post.id} className="rounded-lg border border-ink/10 bg-stone p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink/50">
                    <span className="rounded-full bg-white px-2.5 py-1 text-jadeDark">{post.statusTag}</span>
                    <span>{post.campus.displayName}</span>
                    <span>·</span>
                    <span>{post.spot.name}</span>
                    <span>·</span>
                    <span>{relativeTime(post.createdAt)}</span>
                  </div>
                  {post.text !== post.statusTag ? <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink/80">{post.text}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      属实 {post.confirmsCount}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">
                      <TimerReset className="h-3.5 w-3.5" />
                      已变化 {post.outdatedCount}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-ink/45">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatExpiry(post.expiresAt)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-stone px-3 py-3">
      <p className="text-xs text-ink/45">{label}</p>
      <p className="mt-1 break-words text-lg font-bold">{value}</p>
    </div>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}

function relativeTime(value: Date) {
  const diff = Date.now() - value.getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return "刚刚发布";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

function formatExpiry(value: Date) {
  const diff = value.getTime() - Date.now();
  if (diff <= 0) return "已过期";
  const hours = Math.ceil(diff / 3600000);
  return `${hours} 小时后过期`;
}
