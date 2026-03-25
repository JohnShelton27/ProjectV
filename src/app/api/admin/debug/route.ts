import { NextResponse } from "next/server";

export async function GET() {
  const pw = process.env.ADMIN_PASSWORD;
  return NextResponse.json({
    hasPassword: !!pw,
    passwordLength: pw?.length ?? 0,
    firstChar: pw ? pw[0] : null,
    nodeEnv: process.env.NODE_ENV,
  });
}
