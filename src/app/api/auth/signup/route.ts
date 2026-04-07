import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import User from "@/lib/models/User";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: "Invalid email or password (min 6 chars)" }, { status: 400 });
    }
    await dbConnect();
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    const hashed = await bcrypt.hash(password, 10);
    await User.create({ email: email.toLowerCase(), password: hashed });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[signup] error:", e);
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
