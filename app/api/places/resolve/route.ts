import { jsonError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase";
import { placeInputSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const input = placeInputSchema.parse(await request.json());
    const fallbackId = input.amapPoiId ?? `${input.name}:${input.lat.toFixed(5)},${input.lng.toFixed(5)}`;
    const supabase = createSupabaseServerClient();

    const { data: existing, error: findError } = await supabase
      .from("Place")
      .select("id,amapPoiId,name,address,city,lat,lng,createdAt,updatedAt")
      .eq("amapPoiId", fallbackId)
      .maybeSingle();

    if (findError) throw findError;

    if (existing) {
      const { data: place, error } = await supabase
        .from("Place")
        .update({
          name: input.name,
          address: input.address,
          city: input.city,
          lat: input.lat,
          lng: input.lng
        })
        .eq("id", existing.id)
        .select("id,amapPoiId,name,address,city,lat,lng,createdAt,updatedAt")
        .single();
      if (error) throw error;
      return Response.json({ place });
    }

    const { data: place, error } = await supabase
      .from("Place")
      .insert({
        amapPoiId: fallbackId,
        name: input.name,
        address: input.address,
        city: input.city,
        lat: input.lat,
        lng: input.lng
      })
      .select("id,amapPoiId,name,address,city,lat,lng,createdAt,updatedAt")
      .single();

    if (error) throw error;
    return Response.json({ place });
  } catch (error) {
    return jsonError(error);
  }
}
