import { setAuthCookies } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { createSupabaseServerClient, createSupabaseUserClient } from "@/lib/supabase";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nickname: z.string().trim().min(2).max(24)
});

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    const adminNickname = process.env.ADMIN_NICKNAME ?? "admin";
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
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
        email: input.email,
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
