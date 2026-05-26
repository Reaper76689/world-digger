import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(_request: Request, { params }: { params: Promise<{ campusId: string }> }) {
  try {
    const { campusId } = await params;
    const campus = await getCampus(campusId);

    if (!campus) {
      return Response.json({ error: "校区不存在" }, { status: 404 });
    }

    return Response.json({ campus });
  } catch (error) {
    return jsonError(error);
  }
}

async function getCampus(campusId: string) {
  try {
    return await prisma.campus.findUnique({
      where: { id: campusId },
      select: {
        id: true,
        schoolName: true,
        campusName: true,
        displayName: true,
        city: true,
        level: true,
        ownership: true,
        sourceCode: true,
        createdAt: true,
        updatedAt: true
      }
    });
  } catch (error) {
    if (process.env.NODE_ENV === "production" && !isPrismaTlsError(error)) {
      throw error;
    }

    const { data, error: supabaseError } = await createSupabaseServerClient()
      .from("Campus")
      .select("id,schoolName,campusName,displayName,city,level,ownership,sourceCode,createdAt,updatedAt")
      .eq("id", campusId)
      .maybeSingle();

    if (supabaseError) {
      throw supabaseError;
    }

    return data;
  }
}

function isPrismaTlsError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Error opening a TLS connection");
}
