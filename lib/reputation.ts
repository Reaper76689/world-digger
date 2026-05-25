import { prisma } from "@/lib/prisma";

export type UserReputation = {
  userId: string;
  title: string;
  titles: string[];
  postCount: number;
  confirmedCount: number;
  changedCount: number;
  totalFeedbackCount: number;
  trustRate: number | null;
};

const DEFAULT_REPUTATION: Omit<UserReputation, "userId"> = {
  title: "新同学",
  titles: ["新同学"],
  postCount: 0,
  confirmedCount: 0,
  changedCount: 0,
  totalFeedbackCount: 0,
  trustRate: null
};

type ReputationPost = {
  authorId: string;
  confirmsCount: number;
  outdatedCount: number;
  spot: {
    name: string;
  } | null;
};

export async function getUserReputation(userId: string) {
  const reputations = await getUserReputations([userId]);
  return reputations.get(userId) ?? { userId, ...DEFAULT_REPUTATION };
}

export async function getUserReputations(userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds)).filter(Boolean);
  const reputations = new Map<string, UserReputation>();

  for (const userId of uniqueUserIds) {
    reputations.set(userId, { userId, ...DEFAULT_REPUTATION });
  }

  if (uniqueUserIds.length === 0) {
    return reputations;
  }

  const posts = await prisma.post.findMany({
    where: {
      authorId: { in: uniqueUserIds },
      status: "approved"
    },
    select: {
      authorId: true,
      confirmsCount: true,
      outdatedCount: true,
      spot: {
        select: {
          name: true
        }
      }
    }
  });

  const postsByUser = new Map<string, ReputationPost[]>();
  for (const post of posts) {
    postsByUser.set(post.authorId, [...(postsByUser.get(post.authorId) ?? []), post]);
  }

  for (const userId of uniqueUserIds) {
    reputations.set(userId, buildReputation(userId, postsByUser.get(userId) ?? []));
  }

  return reputations;
}

function buildReputation(userId: string, posts: ReputationPost[]): UserReputation {
  const postCount = posts.length;
  const confirmedCount = posts.reduce((total, post) => total + post.confirmsCount, 0);
  const changedCount = posts.reduce((total, post) => total + (post.outdatedCount >= 3 ? post.outdatedCount : 0), 0);
  const totalFeedbackCount = confirmedCount + changedCount;
  const trustRate = totalFeedbackCount >= 5 ? confirmedCount / totalFeedbackCount : null;
  const canteenConfirmedCount = sumConfirmedBySpot(posts, ["食堂", "餐厅"]);
  const libraryConfirmedCount = sumConfirmedBySpot(posts, ["图书馆"]);
  const titles = resolveTitles({
    postCount,
    confirmedCount,
    trustRate,
    canteenConfirmedCount,
    libraryConfirmedCount
  });

  return {
    userId,
    title: titles[0],
    titles,
    postCount,
    confirmedCount,
    changedCount,
    totalFeedbackCount,
    trustRate
  };
}

function resolveTitles({
  postCount,
  confirmedCount,
  trustRate,
  canteenConfirmedCount,
  libraryConfirmedCount
}: {
  postCount: number;
  confirmedCount: number;
  trustRate: number | null;
  canteenConfirmedCount: number;
  libraryConfirmedCount: number;
}) {
  const titles: string[] = [];

  if (trustRate !== null && trustRate >= 0.8 && confirmedCount >= 30) titles.push("可靠情报员");
  if (confirmedCount >= 20) titles.push("实况达人");
  if (canteenConfirmedCount >= 15) titles.push("食堂雷达");
  if (libraryConfirmedCount >= 15) titles.push("图书馆守望者");
  if (postCount >= 5) titles.push("校园观察员");

  return titles.length ? titles : ["新同学"];
}

function sumConfirmedBySpot(posts: ReputationPost[], keywords: string[]) {
  return posts.reduce((total, post) => {
    const spotName = post.spot?.name ?? "";
    return keywords.some((keyword) => spotName.includes(keyword)) ? total + post.confirmsCount : total;
  }, 0);
}

export function formatTrustRate(rate: number | null) {
  if (rate === null) return "数据较少";
  return `${Math.round(rate * 100)}%`;
}
