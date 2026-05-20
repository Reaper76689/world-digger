import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "shitan_session";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId }
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user || user.status !== "active") {
    throw new Response("Unauthorized", { status: 401 });
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Response("Forbidden", { status: 403 });
  }
  return user;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90
  };
}
