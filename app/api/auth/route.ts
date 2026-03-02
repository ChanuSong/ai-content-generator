import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const accessPassword = process.env.ACCESS_PASSWORD;

  if (!accessPassword) {
    return NextResponse.json({ success: true });
  }

  if (password === accessPassword) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false }, { status: 401 });
}
