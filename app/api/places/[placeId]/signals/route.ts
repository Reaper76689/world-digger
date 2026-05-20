import { getCurrentSupabaseClient, requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase";
import { z } from "zod";

const signalSchema = z.object({
  source: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(300).optional().nullable(),
  url: z.string().url().optional().nullable(),
  heat: z.number().int().min(1).max(100).optional()
});

export async function GET(_request: Request, { params }: { params: Promise<{ placeId: string }> }) {
  try {
    const { placeId } = await params;
    const supabase = createSupabaseServerClient();
    const { data: signals, error } = await supabase
      .from("PlaceSignal")
      .select("id,placeId,source,title,summary,url,heat,occurredAt,createdAt")
      .eq("placeId", placeId)
      .order("heat", { ascending: false })
      .order("occurredAt", { ascending: false })
      .limit(12);

    if (error) throw error;
    return Response.json({ signals: signals ?? [] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ placeId: string }> }) {
  try {
    await requireUser();
    const supabase = await getCurrentSupabaseClient();
    const { placeId } = await params;
    const input = signalSchema.parse(await request.json());

    const { data: signal, error } = await supabase
      .from("PlaceSignal")
      .insert({
        placeId,
        source: input.source,
        title: input.title,
        summary: input.summary,
        url: input.url,
        heat: input.heat ?? 1
      })
      .select("id,placeId,source,title,summary,url,heat,occurredAt,createdAt")
      .single();

    if (error) throw error;
    return Response.json({ signal });
  } catch (error) {
    return jsonError(error);
  }
}
