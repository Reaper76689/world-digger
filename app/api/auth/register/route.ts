import { setAuthCookies } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { createSupabaseServerClient, createSupabaseUserClient } from "@/lib/supabase";
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

    const userClient = createSupabaseUserClient(data.session.access_token);
    const { data: user, error: profileError } = await userClient
      .from("User")
      .upsert(
        {
          id: data.user.id,
          email,
          nickname: input.nickname,
          role: input.nickname === adminNickname ? "admin" : "user"
        },
        { onConflict: "id" }
      )
      .select("id,email,nickname,avatarUrl,bio,status,role,createdAt,updatedAt")
      .single();

    if (profileError || !user) {
      return Response.json({ error: profileError?.message ?? "用户资料同步失败" }, { status: 500 });
    }

    await setAuthCookies(data.session.access_token, data.session.refresh_token);

    return Response.json({
      user,
      needsConfirmation: false
    });
  } catch (error) {
    return jsonError(error);
  }
}
