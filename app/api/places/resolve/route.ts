import { prisma } from "@/lib/prisma";
import { placeInputSchema } from "@/lib/validators";
import { jsonError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const input = placeInputSchema.parse(await request.json());
    const fallbackId = input.amapPoiId ?? `${input.name}:${input.lat.toFixed(5)},${input.lng.toFixed(5)}`;

    const place = await prisma.place.upsert({
      where: { amapPoiId: fallbackId },
      update: {
        name: input.name,
        address: input.address,
        city: input.city,
        lat: input.lat,
        lng: input.lng
      },
      create: {
        amapPoiId: fallbackId,
        name: input.name,
        address: input.address,
        city: input.city,
        lat: input.lat,
        lng: input.lng
      }
    });

    return Response.json({ place });
  } catch (error) {
    return jsonError(error);
  }
}
