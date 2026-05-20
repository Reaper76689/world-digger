import { searchAmapPlaces } from "@/lib/amap";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";
    if (query.length < 1) {
      return Response.json({ places: [] });
    }

    const places = await searchAmapPlaces(query);
    return Response.json({ places });
  } catch (error) {
    return jsonError(error);
  }
}
