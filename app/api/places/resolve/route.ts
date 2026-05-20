import { jsonError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase";
import { placeInputSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const input = placeInputSchema.parse(await request.json());
    const supabase = createSupabaseServerClient();

    const { data: place, error } = await supabase
      .rpc("resolve_place", {
        amap_poi_id: input.amapPoiId ?? null,
        place_name: input.name,
        place_address: input.address ?? null,
        place_city: input.city ?? null,
        place_lat: input.lat,
        place_lng: input.lng
      })
      .single();

    if (error) throw error;
    return Response.json({ place });
  } catch (error) {
    return jsonError(error);
  }
}
