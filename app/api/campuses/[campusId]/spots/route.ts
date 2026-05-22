import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ campusId: string }> }) {
  try {
    const { campusId } = await params;
    const spots = await prisma.spot.findMany({
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

    return Response.json({ spots });
  } catch (error) {
    return jsonError(error);
  }
}
