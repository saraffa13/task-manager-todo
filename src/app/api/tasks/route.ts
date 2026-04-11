import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Task from "@/lib/models/Task";
import Workspace from "@/lib/models/Workspace";
import { requireUserId } from "@/lib/session";
import { sanitizeAttachments, serializeAttachment } from "@/lib/attachments";

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  await dbConnect();
  const query: Record<string, unknown> = { userId };
  if (workspaceId) query.workspaceId = workspaceId;
  const tasks = await Task.find(query).sort({ order: 1, createdAt: 1 }).lean();
  return NextResponse.json(
    tasks.map((t) => ({
      _id: String(t._id),
      text: t.text,
      completed: t.completed,
      workspaceId: String(t.workspaceId),
      parentId: t.parentId ? String(t.parentId) : null,
      order: t.order,
      deadline: t.deadline ? new Date(t.deadline).toISOString() : null,
      attachments: (t.attachments || []).map(serializeAttachment),
    }))
  );
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { text, workspaceId, parentId, deadline, attachments } = await req.json();
  if (!text?.trim() || !workspaceId)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  await dbConnect();
  const ws = await Workspace.findOne({ _id: workspaceId, userId });
  if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const count = await Task.countDocuments({ userId, workspaceId, parentId: parentId || null });
  const cleanAttachments = sanitizeAttachments(attachments);
  if (Array.isArray(attachments) && attachments.length !== cleanAttachments.length) {
    console.warn(
      `[tasks POST] dropped ${attachments.length - cleanAttachments.length} invalid attachment(s)`
    );
  }
  const t = await Task.create({
    text: text.trim(),
    workspaceId,
    parentId: parentId || null,
    userId,
    order: count,
    deadline: deadline ? new Date(deadline) : null,
    attachments: cleanAttachments,
  });
  if (parentId) await uncompleteAncestors(parentId, userId);
  return NextResponse.json({
    _id: String(t._id),
    text: t.text,
    completed: t.completed,
    workspaceId: String(t.workspaceId),
    parentId: t.parentId ? String(t.parentId) : null,
    order: t.order,
    deadline: t.deadline ? t.deadline.toISOString() : null,
    attachments: (t.attachments || []).map(serializeAttachment),
  });
}

async function uncompleteAncestors(taskId: string, userId: string) {
  let current = await Task.findOne({ _id: taskId, userId });
  while (current && current.completed) {
    current.completed = false;
    await current.save();
    if (!current.parentId) break;
    current = await Task.findOne({ _id: current.parentId, userId });
  }
}
