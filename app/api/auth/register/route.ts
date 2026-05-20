import { setAuthCookies } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(6, "密码至少 6 位")
    .regex(/[a-z]/, "密码需要包含小写字母")
    .regex(/[A-Z]/, "密码需要包含大写字母")
    .regex(/[0-9]/, "密码需要包含数字"),
  confirmPassword: z.string(),
  nickname: z.string().trim().min(2).max(24)
}).refine((input) => input.password === input.confirmPassword, {
  message: "两次输入的密码不同",
  path: ["confirmPassword"]
});

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    const email = input.email.trim().toLowerCase();
    const adminNickname = process.env.ADMIN_NICKNAME ?? "admin";
    const supabase = createSupabaseServerClient();
    const emailHash = await sha256(email);
    const { data: canRequest, error: rateLimitError } = await supabase.rpc("can_request_email_confirmation", {
      email_hash: emailHash
    });

    if (rateLimitError) throw rateLimitError;
    if (!canRequest) {
      return Response.json({ error: "确认邮件已发送，请 15 分钟后再试。" }, { status: 429 });
    }

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
    const user = await prisma.$transaction(async (tx) => {
      const savedUser = await tx.user.upsert({
        where: { id: authUser.id },
        update: {
          email,
          nickname: input.nickname,
          role: input.nickname === adminNickname ? "admin" : "user"
        },
        create: {
          id: authUser.id,
          email,
          nickname: input.nickname,
          role: input.nickname === adminNickname ? "admin" : "user"
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
          userId: savedUser.id
        },
        create: {
          userId: savedUser.id,
          provider: "email",
          account: email
        }
      });

      return savedUser;
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

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
