import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ campusId: string }> }) {
  try {
    const { campusId } = await params;
    const campus = await prisma.campus.findUnique({
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

    if (!campus) {
      return Response.json({ error: "校区不存在" }, { status: 404 });
    }

    return Response.json({ campus });
  } catch (error) {
    return jsonError(error);
  }
}
