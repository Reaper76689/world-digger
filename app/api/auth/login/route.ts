import { setAuthCookies } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
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
    const user = await prisma.$transaction(async (tx) => {
      const savedUser = await tx.user.upsert({
        where: { id: authUser.id },
        update: {
          email,
          nickname,
          role: nickname === adminNickname ? "admin" : "user"
        },
        create: {
          id: authUser.id,
          email,
          nickname,
          role: nickname === adminNickname ? "admin" : "user"
        }
      });

      await tx.loginAccount.upsert({
        where: {
          provider_account: {
            provider: "email",
            account: email
          }
        },
        update: {
          userId: savedUser.id,
          lastLoginAt: loggedInAt
        },
        create: {
          userId: savedUser.id,
          provider: "email",
          account: email,
          lastLoginAt: loggedInAt
        }
      });

      return savedUser;
    });

    await setAuthCookies(session.access_token, session.refresh_token);

    return Response.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}
