import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Process from "@/lib/models/Process";
import { requireUserId } from "@/lib/session";
import { sanitizeProcessTree } from "@/lib/processes";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const update: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
  if ("root" in body) update.root = sanitizeProcessTree(body.root);
  await dbConnect();
  const p = await Process.findOneAndUpdate({ _id: params.id, userId }, update, { new: true });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  await Process.deleteOne({ _id: params.id, userId });
  return NextResponse.json({ ok: true });
}
