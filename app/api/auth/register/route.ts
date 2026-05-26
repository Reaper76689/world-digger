import { setAuthCookies } from "@/lib/auth";
import { syncAuthProfile } from "@/lib/auth-profile";
import { jsonError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase";
import { z } from "zod";

const registerSchema = z
  .object({
    email: z.string().email(),
    password: z
      .string()
      .min(6, "密码至少 6 位")
      .regex(/[a-z]/, "密码需要包含小写字母")
      .regex(/[A-Z]/, "密码需要包含大写字母")
      .regex(/[0-9]/, "密码需要包含数字"),
    confirmPassword: z.string(),
    nickname: z.string().trim().min(2).max(24)
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: "两次输入的密码不同",
    path: ["confirmPassword"]
  });

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    const email = input.email.trim().toLowerCase();
    const adminNickname = process.env.ADMIN_NICKNAME ?? "admin";
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: { nickname: input.nickname }
      }
    });

    if (error || !data.user) {
      return Response.json({ error: error?.message ?? "注册失败" }, { status: 400 });
    }

    if (!data.session) {
      return Response.json({
        user: null,
        needsConfirmation: true
      });
    }

    const authUser = data.user;
    const session = data.session;
    const user = await syncAuthProfile({
      authUser,
      email,
      nickname: input.nickname,
      accessToken: session.access_token,
      adminNickname
    });

    await setAuthCookies(session.access_token, session.refresh_token);

    return Response.json({
      user,
      needsConfirmation: false
    });
  } catch (error) {
    return jsonError(error);
  }
}
