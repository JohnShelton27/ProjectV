import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";

  if (!q.trim()) {
    return NextResponse.json([]);
  }

  const { data } = await supabaseAdmin
    .from("listings")
    .select("id, slug, address, city, price, status, images, featured")
    .or(`address.ilike.%${q}%,city.ilike.%${q}%`)
    .order("price", { ascending: false })
    .limit(20);

  return NextResponse.json(data || []);
}
