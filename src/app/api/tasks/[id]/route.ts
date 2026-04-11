import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Task from "@/lib/models/Task";
import { requireUserId } from "@/lib/session";
import { sanitizeAttachments } from "@/lib/attachments";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const update: Record<string, unknown> = {};
  if (typeof body.text === "string" && body.text.trim()) update.text = body.text.trim();
  if (typeof body.completed === "boolean") update.completed = body.completed;
  if ("deadline" in body) update.deadline = body.deadline ? new Date(body.deadline) : null;
  if ("attachments" in body) update.attachments = sanitizeAttachments(body.attachments);
  await dbConnect();
  const t = await Task.findOneAndUpdate({ _id: params.id, userId }, update, { new: true });
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  await deleteRecursive(params.id, userId);
  return NextResponse.json({ ok: true });
}

async function deleteRecursive(id: string, userId: string) {
  const children = await Task.find({ parentId: id, userId }).select("_id").lean();
  for (const c of children) await deleteRecursive(String(c._id), userId);
  await Task.deleteOne({ _id: id, userId });
}
