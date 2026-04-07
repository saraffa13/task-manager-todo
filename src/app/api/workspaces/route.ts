import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Workspace from "@/lib/models/Workspace";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const list = await Workspace.find({ userId }).sort({ order: 1, createdAt: 1 }).lean();
  return NextResponse.json(list.map((w) => ({ _id: String(w._id), name: w.name, order: w.order })));
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  await dbConnect();
  const count = await Workspace.countDocuments({ userId });
  const ws = await Workspace.create({ name: name.trim(), userId, order: count });
  return NextResponse.json({ _id: String(ws._id), name: ws.name, order: ws.order });
}
