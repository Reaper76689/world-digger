import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { DEFAULT_SPOTS, getCampusCandidate } from "@/lib/henan-campuses";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient, createSupabaseUserClient } from "@/lib/supabase";

type CampusCandidate = NonNullable<ReturnType<typeof getCampusCandidate>>;

export async function ensureCampusWithDefaultSpots(sourceCode: string) {
  const candidate = getCampusCandidate(sourceCode);
  if (!candidate) return null;

  try {
    const campus = await prisma.campus.upsert({
      where: { sourceCode: candidate.sourceCode },
      update: {
        schoolName: candidate.schoolName,
        campusName: candidate.campusName,
        displayName: candidate.displayName,
        city: candidate.city,
        level: candidate.level,
        ownership: candidate.ownership
      },
      create: {
        schoolName: candidate.schoolName,
        campusName: candidate.campusName,
        displayName: candidate.displayName,
        city: candidate.city,
        level: candidate.level,
        ownership: candidate.ownership,
        sourceCode: candidate.sourceCode
      }
    });

    await Promise.all(
      DEFAULT_SPOTS.map((name) =>
        prisma.spot.upsert({
          where: {
            campusId_name: {
              campusId: campus.id,
              name
            }
          },
          update: {},
          create: {
            campusId: campus.id,
            name
          }
        })
      )
    );

    return campus;
  } catch (error) {
    if (process.env.NODE_ENV === "production" && !isPrismaTlsError(error)) {
      throw error;
    }

    return ensureCampusWithSupabaseFallback(candidate);
  }
}

async function ensureCampusWithSupabaseFallback(candidate: CampusCandidate) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("shitan_access_token")?.value;
  const readClient = createSupabaseServerClient();

  if (!accessToken) {
    const { data } = await readClient.from("Campus").select("*").eq("sourceCode", candidate.sourceCode).maybeSingle();
    return data;
  }

  const userClient = createSupabaseUserClient(accessToken);
  const { data: existingCampus, error: findCampusError } = await userClient
    .from("Campus")
    .select("*")
    .eq("sourceCode", candidate.sourceCode)
    .maybeSingle();

  if (findCampusError) {
    throw findCampusError;
  }

  const { data: campus, error: campusError } = existingCampus
    ? await userClient
        .from("Campus")
        .update({
          schoolName: candidate.schoolName,
          campusName: candidate.campusName,
          displayName: candidate.displayName,
          city: candidate.city,
          level: candidate.level,
          ownership: candidate.ownership
        })
        .eq("id", existingCampus.id)
        .select("*")
        .single()
    : await userClient
        .from("Campus")
        .insert({
          id: randomUUID(),
          schoolName: candidate.schoolName,
          campusName: candidate.campusName,
          displayName: candidate.displayName,
          city: candidate.city,
          level: candidate.level,
          ownership: candidate.ownership,
          sourceCode: candidate.sourceCode
        })
        .select("*")
        .single();

  if (campusError) {
    throw campusError;
  }

  for (const name of DEFAULT_SPOTS) {
    const { data: existingSpot, error: findError } = await userClient
      .from("Spot")
      .select("id")
      .eq("campusId", campus.id)
      .eq("name", name)
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (!existingSpot) {
      const { error: insertError } = await userClient.from("Spot").insert({
        id: randomUUID(),
        campusId: campus.id,
        name
      });

      if (insertError) {
        throw insertError;
      }
    }
  }

  return campus;
}

function isPrismaTlsError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Error opening a TLS connection");
}
