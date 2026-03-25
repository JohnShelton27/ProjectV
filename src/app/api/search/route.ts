import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";

  if (q.trim().length < 2) {
    return NextResponse.json([]);
  }

  const { data } = await supabase
    .from("listings")
    .select("slug, address, city, price, images")
    .or(`address.ilike.%${q}%,city.ilike.%${q}%,zip.ilike.%${q}%`)
    .order("price", { ascending: false })
    .limit(8);

  const results = (data || []).map((r) => ({
    slug: r.slug,
    address: r.address,
    city: r.city,
    price: r.price,
    image: r.images?.[0] || null,
  }));

  return NextResponse.json(results);
}
