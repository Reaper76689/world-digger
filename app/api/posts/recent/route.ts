import { getLatestApprovedFeed } from "@/lib/feed";
import { jsonError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 30) || 30, 50);
    const posts = await getLatestApprovedFeed(createSupabaseServerClient(), limit);
    return Response.json({ posts });
  } catch (error) {
    return jsonError(error);
  }
}
