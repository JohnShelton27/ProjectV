import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { path, listingSlug, referrer } = await request.json();

    if (!path) {
      return NextResponse.json({ error: "path required" }, { status: 400 });
    }

    await supabase.from("page_views").insert({
      path,
      listing_slug: listingSlug || null,
      referrer: referrer || null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // fail silently
  }
}
