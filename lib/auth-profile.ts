import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { createSupabaseUserClient } from "@/lib/supabase";

type SyncAuthProfileInput = {
  authUser: SupabaseAuthUser;
  email: string;
  nickname: string;
  accessToken: string;
  adminNickname: string;
  lastLoginAt?: Date;
};

export async function syncAuthProfile({
  authUser,
  email,
  nickname,
  accessToken,
  adminNickname,
  lastLoginAt
}: SyncAuthProfileInput) {
  const role = nickname === adminNickname ? "admin" : "user";

  try {
    return await prisma.$transaction(async (tx) => {
      const savedUser = await tx.user.upsert({
        where: { id: authUser.id },
        update: {
          email,
          nickname,
          role
        },
        create: {
          id: authUser.id,
          email,
          nickname,
          role
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
          ...(lastLoginAt ? { lastLoginAt } : {})
        },
        create: {
          userId: savedUser.id,
          provider: "email",
          account: email,
          ...(lastLoginAt ? { lastLoginAt } : {})
        }
      });

      return savedUser;
    });
  } catch (error) {
    if (process.env.NODE_ENV === "production" && !isPrismaTlsError(error)) {
      throw error;
    }

    const userClient = createSupabaseUserClient(accessToken);
    const { data, error: upsertError } = await userClient
      .from("User")
      .upsert(
        {
          id: authUser.id,
          email,
          nickname,
          role
        },
        { onConflict: "id" }
      )
      .select("id,email,nickname,avatarUrl,bio,status,role,createdAt,updatedAt")
      .single();

    if (upsertError) {
      throw upsertError;
    }

    return data;
  }
}

function isPrismaTlsError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Error opening a TLS connection") || message.includes("安全包中没有可用的凭证");
}
