import { searchHenanCampuses } from "@/lib/henan-campuses";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";
    return Response.json({ campuses: searchHenanCampuses(query) });
  } catch (error) {
    return jsonError(error);
  }
}
