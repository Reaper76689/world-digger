import { setAuthCookies } from "@/lib/auth";
import { syncAuthProfile } from "@/lib/auth-profile";
import { jsonError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const email = input.email.trim().toLowerCase();
    const adminNickname = process.env.ADMIN_NICKNAME ?? "admin";
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: input.password
    });

    if (error || !data.user || !data.session) {
      return Response.json({ error: error?.message ?? "登录失败" }, { status: 401 });
    }

    const authUser = data.user;
    const session = data.session;
    const nickname = String(authUser.user_metadata?.nickname || email.split("@")[0]);
    const loggedInAt = new Date();
    const user = await syncAuthProfile({
      authUser,
      email,
      nickname,
      accessToken: session.access_token,
      adminNickname,
      lastLoginAt: loggedInAt
    });

    await setAuthCookies(session.access_token, session.refresh_token);

    return Response.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}
