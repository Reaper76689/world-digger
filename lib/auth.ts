import { cookies } from "next/headers";
import { createSupabaseServerClient, createSupabaseUserClient } from "@/lib/supabase";

const ACCESS_COOKIE = "shitan_access_token";
const REFRESH_COOKIE = "shitan_refresh_token";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return null;

  const userClient = createSupabaseUserClient(accessToken);
  const { data: profile } = await userClient
    .from("User")
    .select("id,email,nickname,avatarUrl,bio,status,role,createdAt,updatedAt")
    .eq("id", data.user.id)
    .maybeSingle();

  return profile;
}

export async function getCurrentAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_COOKIE)?.value ?? null;
}

export async function getCurrentSupabaseClient() {
  const accessToken = await getCurrentAccessToken();
  if (!accessToken) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return createSupabaseUserClient(accessToken);
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

export async function setAuthCookies(accessToken: string, refreshToken?: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, accessToken, sessionCookieOptions());
  if (refreshToken) {
    cookieStore.set(REFRESH_COOKIE, refreshToken, sessionCookieOptions());
  }
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
}
