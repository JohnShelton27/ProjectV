import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data } = await supabaseAdmin
    .from("listings")
    .select("id, slug, address, city, price, status, images, featured")
    .eq("featured", true)
    .order("price", { ascending: false });

  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value;
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, featured } = await request.json();

  if (!id || typeof featured !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("listings")
    .update({ featured })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
