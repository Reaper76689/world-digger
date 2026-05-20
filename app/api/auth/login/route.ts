import { cookies } from "next/headers";
import { nicknameSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { sessionCookieOptions } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nickname = nicknameSchema.parse(body.nickname);
    const adminNickname = process.env.ADMIN_NICKNAME ?? "admin";

    const user = await prisma.user.upsert({
      where: { nickname },
      update: {},
      create: {
        nickname,
        role: nickname === adminNickname ? "admin" : "user"
      }
    });

    const cookieStore = await cookies();
    cookieStore.set("shitan_session", user.id, sessionCookieOptions());

    return Response.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}
