import { jsonError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(_request: Request, { params }: { params: Promise<{ placeId: string }> }) {
  try {
    const { placeId } = await params;
    const supabase = createSupabaseServerClient();
    const { data: place, error } = await supabase
      .from("Place")
      .select("id,amapPoiId,name,address,city,lat,lng,createdAt,updatedAt")
      .eq("id", placeId)
      .single();

    if (error) throw error;
    return Response.json({ place });
  } catch (error) {
    return jsonError(error);
  }
}
