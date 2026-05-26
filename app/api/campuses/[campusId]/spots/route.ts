import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(_request: Request, { params }: { params: Promise<{ campusId: string }> }) {
  try {
    const { campusId } = await params;
    const spots = await getSpots(campusId);

    return Response.json({ spots });
  } catch (error) {
    return jsonError(error);
  }
}

async function getSpots(campusId: string) {
  try {
    return await prisma.spot.findMany({
      where: { campusId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        campusId: true,
        name: true,
        createdAt: true,
        updatedAt: true
      }
    });
  } catch (error) {
    if (process.env.NODE_ENV === "production" && !isPrismaTlsError(error)) {
      throw error;
    }

    const { data, error: supabaseError } = await createSupabaseServerClient()
      .from("Spot")
      .select("id,campusId,name,createdAt,updatedAt")
      .eq("campusId", campusId)
      .order("createdAt", { ascending: true });

    if (supabaseError) {
      throw supabaseError;
    }

    return data ?? [];
  }
}

function isPrismaTlsError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Error opening a TLS connection");
}
