import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/lib/models/User";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const user = await User.findById(userId).select("email name").lean();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ email: user.email, name: user.name ?? "" });
}

export async function PATCH(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { email, name } = await req.json();
  await dbConnect();
  const update: Record<string, unknown> = {};
  if (typeof name === "string") update.name = name.trim();
  if (typeof email === "string" && email.trim()) {
    const lower = email.trim().toLowerCase();
    const existing = await User.findOne({ email: lower, _id: { $ne: userId } });
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    update.email = lower;
  }
  const user = await User.findByIdAndUpdate(userId, update, { new: true }).select("email name");
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ email: user.email, name: user.name ?? "" });
}
