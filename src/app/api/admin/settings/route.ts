import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  // Verify admin auth
  const token = request.cookies.get("admin_token")?.value;
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const entries = Object.entries(body) as [string, string][];

  for (const [key, value] of entries) {
    await supabaseAdmin
      .from("site_settings")
      .upsert({ key, value }, { onConflict: "key" });
  }

  return NextResponse.json({ success: true });
}
