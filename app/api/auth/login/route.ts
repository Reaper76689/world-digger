import { setAuthCookies } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { createSupabaseServerClient, createSupabaseUserClient } from "@/lib/supabase";
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

    const nickname = String(data.user.user_metadata?.nickname || email.split("@")[0]);
    const userClient = createSupabaseUserClient(data.session.access_token);
    const { data: user, error: profileError } = await userClient
      .from("User")
      .upsert(
        {
          id: data.user.id,
          email,
          nickname,
          role: nickname === adminNickname ? "admin" : "user"
        },
        { onConflict: "id" }
      )
      .select("id,email,nickname,avatarUrl,bio,status,role,createdAt,updatedAt")
      .single();

    if (profileError || !user) {
      return Response.json({ error: profileError?.message ?? "用户资料同步失败" }, { status: 500 });
    }

    await setAuthCookies(data.session.access_token, data.session.refresh_token);

    return Response.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}
