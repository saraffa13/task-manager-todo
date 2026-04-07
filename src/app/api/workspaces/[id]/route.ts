import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Workspace from "@/lib/models/Workspace";
import Task from "@/lib/models/Task";
import { requireUserId } from "@/lib/session";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  await dbConnect();
  const ws = await Workspace.findOneAndUpdate(
    { _id: params.id, userId },
    { name: name.trim() },
    { new: true }
  );
  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ _id: String(ws._id), name: ws.name, order: ws.order });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const ws = await Workspace.findOneAndDelete({ _id: params.id, userId });
  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await Task.deleteMany({ workspaceId: params.id, userId });
  return NextResponse.json({ ok: true });
}
