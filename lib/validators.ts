import { z } from "zod";

export const nicknameSchema = z.string().trim().min(2).max(24);
export const postTextSchema = z.string().trim().min(1).max(800);
export const commentTextSchema = z.string().trim().min(1).max(300);
export const imageUrlsSchema = z.array(z.string().url()).max(4);

export const placeInputSchema = z.object({
  amapPoiId: z.string().optional().nullable(),
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().max(240).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});
