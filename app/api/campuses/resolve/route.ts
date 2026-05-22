import { ensureCampusWithDefaultSpots } from "@/lib/campus-resolve";
import { jsonError } from "@/lib/http";
import { campusSourceCodeSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sourceCode = campusSourceCodeSchema.parse(body.sourceCode);
    const campus = await ensureCampusWithDefaultSpots(sourceCode);

    if (!campus) {
      return Response.json({ error: "校区不存在" }, { status: 404 });
    }

    return Response.json({ campus });
  } catch (error) {
    return jsonError(error);
  }
}
